import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CompetitorResearchInput } from "../../lib/agent-types";
import { competitorResearchWorkflow } from "./competitor-research.workflow";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASK_QUEUE = "test-competitor-research";

// All Activities the workflow calls, as plain vi.fn() mocks whose behavior is
// set per-test via mockImplementation/mockResolvedValue. No OpenAI/Exa/DB calls -
// nothing in this file requires OPENAI_API_KEY, EXA_API_KEY, or DATABASE_URL.
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

function defaultAnalysisMocks() {
  getStoredSources.mockResolvedValue([]);
  extractFacts.mockResolvedValue([]);
  analyzeCompetitor.mockResolvedValue({ overview: "ok", strengths: [], weaknesses: [] });
  analyzePricing.mockResolvedValue({ summary: "ok", model: "ok", details: [] });
  analyzeFeatures.mockResolvedValue([]);
  analyzePositioning.mockResolvedValue({ targetCustomers: [], facts: [], interpretation: "ok", differentiators: [] });
  storeCompetitorAnalysis.mockResolvedValue(undefined);
  normalizeSources.mockResolvedValue([]);
  storeResearchResults.mockResolvedValue({ storedCount: 0 });
}

function baseInput(overrides: Partial<CompetitorResearchInput> = {}): CompetitorResearchInput {
  return {
    researchId: "r1",
    competitor: "Notion",
    researchRequest: "Compare Notion and Airtable",
    objectives: ["Compare pricing"],
    searchCategories: ["pricing"],
    initialQueries: [],
    ...overrides,
  };
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

describe("competitorResearchWorkflow", () => {
  it("returns status 'completed' once evaluateResearch reports sufficient evidence", async () => {
    defaultAnalysisMocks();
    evaluateResearch.mockResolvedValue({
      sufficient: true,
      coverageScore: 1,
      missingAreas: [],
      explanation: "enough evidence",
    });

    const result = await testEnv.client.workflow.execute(competitorResearchWorkflow, {
      workflowId: `test-completed-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [baseInput()],
    });

    expect(result.status).toBe("completed");
    expect(result.competitor).toBe("Notion");
    expect(result.analysisCompleted).toBe(true);
    expect(evaluateResearch).toHaveBeenCalledTimes(1);
    expect(decideNextSearches).not.toHaveBeenCalled();
  }, 30_000);

  it("returns status 'limit_reached' when evidence never becomes sufficient and searches propose nothing new", async () => {
    defaultAnalysisMocks();
    evaluateResearch.mockResolvedValue({
      sufficient: false,
      coverageScore: 0.2,
      missingAreas: ["Notion pricing"],
      explanation: "still thin",
    });
    // Every proposed search repeats the same query, so dedupeSearches strips it
    // to empty and the loop stops via the "nothing left to search" path.
    decideNextSearches.mockResolvedValue({
      sufficient: false,
      reason: "need more",
      searches: [{ competitor: "Notion", category: "pricing", query: "notion pricing", objective: "x" }],
      missingAreas: ["Notion pricing"],
    });

    const result = await testEnv.client.workflow.execute(competitorResearchWorkflow, {
      workflowId: `test-limit-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [
        baseInput({
          initialQueries: [{ competitor: "Notion", category: "pricing", query: "notion pricing", objective: "x" }],
        }),
      ],
    });

    expect(result.status).toBe("limit_reached");
    expect(result.missingAreas).toContain("Notion pricing");
  }, 30_000);

  it("recovers from a transient Activity failure via Temporal's own retry policy, not custom retry code", async () => {
    defaultAnalysisMocks();
    evaluateResearch
      .mockRejectedValueOnce(new Error("transient network blip"))
      .mockResolvedValueOnce({ sufficient: true, coverageScore: 1, missingAreas: [], explanation: "ok" });

    const result = await testEnv.client.workflow.execute(competitorResearchWorkflow, {
      workflowId: `test-retry-${Date.now()}`,
      taskQueue: TASK_QUEUE,
      args: [baseInput()],
    });

    expect(result.status).toBe("completed");
    expect(evaluateResearch).toHaveBeenCalledTimes(2);
  }, 30_000);

  it("fails the workflow (does not silently return 'completed') once Activities exhaust their retries", async () => {
    defaultAnalysisMocks();
    evaluateResearch.mockRejectedValue(new Error("permanently broken"));

    await expect(
      testEnv.client.workflow.execute(competitorResearchWorkflow, {
        workflowId: `test-exhausted-${Date.now()}`,
        taskQueue: TASK_QUEUE,
        args: [baseInput()],
      }),
    ).rejects.toThrow();

    // AGENT_ACTIVITY_OPTIONS allows 3 attempts.
    expect(evaluateResearch).toHaveBeenCalledTimes(3);
  }, 30_000);
});
