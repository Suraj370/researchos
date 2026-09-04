import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { researchAgentWorkflow } from "./research.workflow";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASK_QUEUE = "test-research-agent";
const COMPETITORS = ["Notion", "Airtable", "Monday"];

// All Activities transitively used by researchAgentWorkflow AND competitorResearchWorkflow
// (the parent starts real Child Workflow executions of the real competitor-research.workflow.ts
// code against this same mocked activity set) - no OpenAI/Exa/DB calls anywhere in this file.
const initializeResearch = vi.fn();
const searchCompetitors = vi.fn();
const createResearchPlan = vi.fn();
const storeResearchPlan = vi.fn();
const storeCompetitiveComparison = vi.fn();
const storeAgentSummary = vi.fn();
const storeCompetitorResults = vi.fn();
const getStoredCompetitorAnalyses = vi.fn();
const completeResearch = vi.fn();
const markResearchFailed = vi.fn();

const searchExa = vi.fn();
const normalizeSources = vi.fn();
const storeResearchResults = vi.fn();
const getStoredSources = vi.fn();
const storeCompetitorAnalysis = vi.fn();
const extractFacts = vi.fn();
const analyzeCompetitor = vi.fn();
const analyzePricing = vi.fn();
const analyzeFeatures = vi.fn();
const analyzePositioning = vi.fn();
const decideNextSearches = vi.fn();
const evaluateResearch = vi.fn();

function defaultMocks() {
  initializeResearch.mockResolvedValue({ ok: true });
  searchCompetitors.mockResolvedValue({ competitors: COMPETITORS });
  createResearchPlan.mockResolvedValue({
    competitors: COMPETITORS,
    objectives: ["Compare pricing"],
    searchCategories: ["pricing"],
    initialQueries: [],
  });
  storeResearchPlan.mockResolvedValue(undefined);
  storeCompetitiveComparison.mockResolvedValue(undefined);
  storeAgentSummary.mockResolvedValue(undefined);
  storeCompetitorResults.mockResolvedValue(undefined);
  getStoredCompetitorAnalyses.mockResolvedValue([]);
  completeResearch.mockResolvedValue(undefined);
  markResearchFailed.mockResolvedValue(undefined);

  getStoredSources.mockResolvedValue([]);
  extractFacts.mockResolvedValue([]);
  analyzeCompetitor.mockResolvedValue({ overview: "ok", strengths: [], weaknesses: [] });
  analyzePricing.mockResolvedValue({ summary: "ok", model: "ok", details: [] });
  analyzeFeatures.mockResolvedValue([]);
  analyzePositioning.mockResolvedValue({ targetCustomers: [], facts: [], interpretation: "ok", differentiators: [] });
  storeCompetitorAnalysis.mockResolvedValue(undefined);
  normalizeSources.mockResolvedValue([]);
  storeResearchResults.mockResolvedValue({ storedCount: 5 });
  decideNextSearches.mockResolvedValue({ sufficient: true, reason: "n/a", searches: [], missingAreas: [] });
  evaluateResearch.mockResolvedValue({ sufficient: true, coverageScore: 1, missingAreas: [], explanation: "ok" });
}

let testEnv: TestWorkflowEnvironment;
let worker: Worker;
let workerRunPromise: Promise<void>;

beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  worker = await Worker.create({
    connection: testEnv.nativeConnection,
    taskQueue: TASK_QUEUE,
    workflowsPath: path.join(__dirname, "index.ts"),
    activities: {
      initializeResearch,
      searchCompetitors,
      createResearchPlan,
      storeResearchPlan,
      storeCompetitiveComparison,
      storeAgentSummary,
      storeCompetitorResults,
      getStoredCompetitorAnalyses,
      completeResearch,
      markResearchFailed,
      searchExa,
      normalizeSources,
      storeResearchResults,
      getStoredSources,
      storeCompetitorAnalysis,
      extractFacts,
      analyzeCompetitor,
      analyzePricing,
      analyzeFeatures,
      analyzePositioning,
      decideNextSearches,
      evaluateResearch,
    },
  });
  workerRunPromise = worker.run();
}, 60_000);

afterAll(async () => {
  worker?.shutdown();
  await workerRunPromise?.catch(() => undefined);
  await testEnv?.teardown();
}, 30_000);

afterEach(() => {
  vi.resetAllMocks();
});

describe("researchAgentWorkflow - parallel competitor Child Workflows", () => {
  it("starts one Child Workflow per competitor, each seeing only its own competitor (TEST 1 + 2)", async () => {
    defaultMocks();

    await testEnv.client.workflow.execute(researchAgentWorkflow, {
      workflowId: `test-fanout-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [{ researchId: "r-fanout", query: "Compare Notion, Airtable, and Monday" }],
    });

    // One evaluateResearch call per competitor (each child does exactly one
    // iteration since evaluateResearch always resolves sufficient:true).
    expect(evaluateResearch).toHaveBeenCalledTimes(3);
    const seenCompetitors = evaluateResearch.mock.calls.map((call) => call[0].competitors);
    for (const competitors of seenCompetitors) {
      // Every call's competitor list has exactly one entry - its own, never a sibling's.
      expect(competitors).toHaveLength(1);
    }
    expect(new Set(seenCompetitors.map((c) => c[0]))).toEqual(new Set(COMPETITORS));
  }, 30_000);

  it("starts every child before awaiting any of them - concurrent, not sequential (TEST 3)", async () => {
    defaultMocks();

    // Barrier: every evaluateResearch call blocks until all 3 competitors have
    // arrived. If the parent awaited child A to completion before starting
    // child B (the "await notion(); await airtable(); await monday();"
    // anti-pattern), child B would never call evaluateResearch at all while
    // child A is stuck waiting on the barrier - so a sequential implementation
    // hangs here and the test times out. A concurrent implementation resolves
    // quickly. No sleeps, no timing assumptions.
    const arrived = new Set<string>();
    let resolveBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      resolveBarrier = resolve;
    });
    evaluateResearch.mockImplementation(async (input: { competitors: string[] }) => {
      arrived.add(input.competitors[0]);
      if (arrived.size === COMPETITORS.length) resolveBarrier();
      await barrier;
      return { sufficient: true, coverageScore: 1, missingAreas: [], explanation: "ok" };
    });

    await testEnv.client.workflow.execute(researchAgentWorkflow, {
      workflowId: `test-parallel-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [{ researchId: "r-parallel", query: "Compare Notion, Airtable, and Monday" }],
    });

    expect(arrived).toEqual(new Set(COMPETITORS));
  }, 30_000);

  it("aggregates to 'completed' when every competitor completes (TEST 4)", async () => {
    defaultMocks();

    const result = await testEnv.client.workflow.execute(researchAgentWorkflow, {
      workflowId: `test-all-success-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [{ researchId: "r-success", query: "Compare Notion, Airtable, and Monday" }],
    });

    expect(result.status).toBe("completed");
    expect(result.agent?.outcome).toBe("completed");
  }, 30_000);

  it("isolates one competitor's failure: aggregates 'completed_with_failures' without discarding the successful results, and without restarting them (TEST 5 + 7)", async () => {
    defaultMocks();
    evaluateResearch.mockImplementation(async (input: { competitors: string[] }) => {
      if (input.competitors[0] === "Airtable") {
        throw new Error("Airtable evaluation permanently broken");
      }
      return { sufficient: true, coverageScore: 1, missingAreas: [], explanation: "ok" };
    });

    const result = await testEnv.client.workflow.execute(researchAgentWorkflow, {
      workflowId: `test-partial-failure-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [{ researchId: "r-partial", query: "Compare Notion, Airtable, and Monday" }],
    });

    // The parent workflow itself did NOT fail.
    expect(result.status).toBe("completed");
    expect(result.agent?.outcome).toBe("completed_with_failures");

    // The full per-competitor breakdown, captured via the mocked store Activity,
    // shows Notion and Monday genuinely completed (not re-run, not discarded)
    // and Airtable alone recorded as failed with its error preserved.
    expect(storeCompetitorResults).toHaveBeenCalledTimes(1);
    const results = storeCompetitorResults.mock.calls[0][0].results;
    const byCompetitor = Object.fromEntries(results.map((r: { competitor: string }) => [r.competitor, r]));

    expect(byCompetitor.Notion.status).toBe("completed");
    expect(byCompetitor.Monday.status).toBe("completed");
    expect(byCompetitor.Airtable.status).toBe("failed");
    expect(byCompetitor.Airtable.error).toMatch(/Airtable evaluation permanently broken/);

    // Airtable's evaluateResearch was retried per AGENT_ACTIVITY_OPTIONS (3
    // attempts) but Notion/Monday's succeeded on their first and only call -
    // proving the failure and its retries stayed scoped to Airtable's own
    // child workflow rather than restarting the whole research.
    const callsByCompetitor = evaluateResearch.mock.calls.reduce((acc: Record<string, number>, call) => {
      const competitor = call[0].competitors[0];
      acc[competitor] = (acc[competitor] ?? 0) + 1;
      return acc;
    }, {});
    expect(callsByCompetitor.Notion).toBe(1);
    expect(callsByCompetitor.Monday).toBe(1);
    expect(callsByCompetitor.Airtable).toBe(3);
  }, 30_000);

  it("aggregates to 'failed' only when every competitor fails", async () => {
    defaultMocks();
    evaluateResearch.mockRejectedValue(new Error("nothing works"));

    const result = await testEnv.client.workflow.execute(researchAgentWorkflow, {
      workflowId: `test-all-failed-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [{ researchId: "r-all-failed", query: "Compare Notion, Airtable, and Monday" }],
    });

    expect(result.status).toBe("completed");
    expect(result.agent?.outcome).toBe("failed");
  }, 30_000);
});
