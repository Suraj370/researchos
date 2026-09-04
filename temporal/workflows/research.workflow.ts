import {
  defineQuery,
  executeChild,
  proxyActivities,
  setHandler,
  workflowInfo,
  ParentClosePolicy,
} from "@temporalio/workflow";

import { GET_RESEARCH_STATUS_QUERY } from "../../lib/temporal-types";
import type { ResearchInput, ResearchResult, ResearchStatusUpdate } from "../../lib/temporal-types";
import { extractFailureMessage } from "../../lib/temporal-failure";
import { buildCompetitiveComparison } from "../../lib/analysis/build-comparison";
import { aggregateCompetitorOutcome } from "../../lib/research/aggregate-competitor-results";
import { buildCompetitorWorkflowId } from "../../lib/research/competitor-workflow-id";
import { AGENT_LIMITS } from "../../lib/agent-types";
import type { AgentState, CompetitorProgress, CompetitorResearchInput, CompetitorResearchResult, PlannedSearch } from "../../lib/agent-types";
import type * as initActivities from "../activities/research.activities";
import type * as competitorActivities from "../activities/competitors.activities";
import type * as storeActivities from "../activities/store.activities";
import type * as agentActivities from "../activities/agent.activities";
import { AGENT_ACTIVITY_OPTIONS, STORE_ACTIVITY_OPTIONS } from "../lib/activity-options";
import { competitorResearchWorkflow } from "./competitor-research.workflow";

const { initializeResearch } = proxyActivities<typeof initActivities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 3,
  },
});

const { searchCompetitors } = proxyActivities<typeof competitorActivities>({
  startToCloseTimeout: "45 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "20 seconds",
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
});

const {
  storeResearchPlan,
  storeCompetitiveComparison,
  storeAgentSummary,
  storeCompetitorResults,
  getStoredCompetitorAnalyses,
  completeResearch,
  markResearchFailed,
} = proxyActivities<typeof storeActivities>(STORE_ACTIVITY_OPTIONS);

const { createResearchPlan } = proxyActivities<typeof agentActivities>(AGENT_ACTIVITY_OPTIONS);

export const getResearchStatusQuery = defineQuery<ResearchStatusUpdate>(GET_RESEARCH_STATUS_QUERY);

export async function researchAgentWorkflow(input: ResearchInput): Promise<ResearchResult> {
  let status: ResearchStatusUpdate = {
    researchId: input.researchId,
    status: "initializing",
    message: "Research workflow starting",
  };
  setHandler(getResearchStatusQuery, () => status);

  let sourcesCollected = 0;
  let totalSearches = 0;
  let missingAreas: string[] = [];
  let competitorProgress: CompetitorProgress[] = [];

  function setStatus(
    phase: ResearchStatusUpdate["status"],
    message: string,
    agentPhase: AgentState["phase"],
    currentTask: string,
  ) {
    status = {
      researchId: input.researchId,
      status: phase,
      message,
      progress: { label: "Sources collected", completed: sourcesCollected, total: sourcesCollected },
      agent: {
        iteration: 0,
        maxIterations: AGENT_LIMITS.MAX_RESEARCH_ITERATIONS,
        phase: agentPhase,
        searchesExecuted: totalSearches,
        sourcesCollected,
        currentTask,
        missingAreas,
      },
      competitors: competitorProgress,
    };
  }

  /**
   * Starts one competitor's Child Workflow and waits for it, in isolation from
   * every other competitor: a rejection here (the child exhausted its Activity
   * retries and failed) is caught right here and turned into a "failed" result
   * instead of propagating - that's what stops one bad competitor from taking
   * down the whole research. Never awaited sequentially by the caller; see the
   * Promise.all over this function below, which starts every child before any
   * of them are awaited.
   */
  async function runCompetitorChild(
    competitor: string,
    childInput: CompetitorResearchInput,
  ): Promise<CompetitorResearchResult> {
    try {
      const result = await executeChild(competitorResearchWorkflow, {
        workflowId: buildCompetitorWorkflowId(input.researchId, competitor),
        // Inherit the parent's own task queue rather than hardcoding the
        // production constant - keeps child dispatch consistent with wherever
        // this parent execution is actually running (including in tests).
        taskQueue: workflowInfo().taskQueue,
        parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_TERMINATE,
        args: [childInput],
      });
      return result;
    } catch (err) {
      const message = extractFailureMessage(err) ?? `Research failed for ${competitor}`;
      return {
        researchId: input.researchId,
        competitor,
        status: "failed",
        sourceCount: 0,
        iterations: 0,
        searchesExecuted: 0,
        missingAreas: [],
        analysisCompleted: false,
        error: message,
      };
    }
  }

  try {
    await initializeResearch(input);

    setStatus("planning", "Discovering competitors", "planning", "Discovering competitors");
    const { competitors } = await searchCompetitors({
      researchId: input.researchId,
      query: input.query,
    });

    setStatus("planning", "Creating research plan", "planning", "Deciding what to research");
    const plan = await createResearchPlan({
      researchId: input.researchId,
      query: input.query,
      competitors,
    });
    await storeResearchPlan({ researchId: input.researchId, plan });

    const initialQueriesByCompetitor = new Map<string, PlannedSearch[]>();
    for (const query of plan.initialQueries) {
      const existing = initialQueriesByCompetitor.get(query.competitor) ?? [];
      existing.push(query);
      initialQueriesByCompetitor.set(query.competitor, existing);
    }

    competitorProgress = competitors.map((competitor) => ({ competitor, status: "pending", sourceCount: 0 }));
    setStatus(
      "searching",
      `Researching ${competitors.length} competitors in parallel`,
      "searching",
      `Starting ${competitors.length} competitor child workflows`,
    );

    // Fan out: .map() calls runCompetitorChild for every competitor, which calls
    // executeChild, before any of those calls is awaited - so every child
    // workflow start is requested in the same workflow task, achieving genuine
    // concurrency (not "await notion(); await airtable(); await monday();").
    // Each settling child updates its own entry as soon as it resolves, so the
    // live status reflects real progress rather than a single end-of-run jump.
    const competitorResults = await Promise.all(
      competitors.map((competitor) =>
        runCompetitorChild(competitor, {
          researchId: input.researchId,
          competitor,
          researchRequest: input.query,
          objectives: plan.objectives,
          searchCategories: plan.searchCategories,
          initialQueries: initialQueriesByCompetitor.get(competitor) ?? [],
        }).then((result) => {
          competitorProgress = competitorProgress.map((entry) =>
            entry.competitor === competitor
              ? { competitor, status: result.status, sourceCount: result.sourceCount }
              : entry,
          );
          setStatus(
            "searching",
            `${competitor} ${result.status}`,
            "searching",
            `Researching ${competitors.length} competitors in parallel`,
          );
          return result;
        }),
      ),
    );

    sourcesCollected = competitorResults.reduce((sum, result) => sum + result.sourceCount, 0);
    totalSearches = competitorResults.reduce((sum, result) => sum + result.searchesExecuted, 0);
    missingAreas = competitorResults.flatMap((result) => result.missingAreas);
    const outcome = aggregateCompetitorOutcome(competitorResults);

    await storeCompetitorResults({ researchId: input.researchId, results: competitorResults });

    setStatus(
      "analyzing",
      "Building competitive comparison",
      outcome === "completed" || outcome === "limit_reached" ? outcome : "evaluating",
      "Aggregating competitor analyses",
    );
    const analyzedCompetitors = competitorResults.filter((result) => result.analysisCompleted);
    const analyses = await getStoredCompetitorAnalyses({ researchId: input.researchId });

    if (analyses.length > 1) {
      const comparison = buildCompetitiveComparison(input.researchId, analyses);
      await storeCompetitiveComparison(comparison);
    }

    const maxIterations = competitorResults.reduce((max, result) => Math.max(max, result.iterations), 0);
    await storeAgentSummary({
      researchId: input.researchId,
      summary: { outcome, iterations: maxIterations, searchesExecuted: totalSearches, missingAreas },
    });
    await completeResearch({ researchId: input.researchId });

    const failedCount = competitorResults.length - analyzedCompetitors.length;
    const finalMessage =
      outcome === "completed"
        ? "Research completed"
        : outcome === "completed_with_failures"
          ? `Research completed with ${failedCount} of ${competitorResults.length} competitors failing`
          : outcome === "limit_reached"
            ? `Research completed with limit reached (${sourcesCollected} sources across ${totalSearches} searches)`
            : "Research failed for all competitors";

    setStatus("completed", finalMessage, "completed", finalMessage);

    return {
      researchId: input.researchId,
      status: "completed",
      message: finalMessage,
      competitors,
      sourceCount: sourcesCollected,
      analyzedCount: analyzedCompetitors.length,
      agent: { outcome, iterations: maxIterations, searchesExecuted: totalSearches, missingAreas },
    };
  } catch (err) {
    const message = extractFailureMessage(err) ?? "Research workflow failed";
    status = { researchId: input.researchId, status: "failed", message };
    await markResearchFailed({ researchId: input.researchId }).catch(() => undefined);
    throw err;
  }
}
