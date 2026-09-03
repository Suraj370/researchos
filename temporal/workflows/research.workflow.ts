import { defineQuery, proxyActivities, setHandler } from "@temporalio/workflow";

import { GET_RESEARCH_STATUS_QUERY } from "../../lib/temporal-types";
import type { ResearchInput, ResearchResult, ResearchStatusUpdate } from "../../lib/temporal-types";
import { extractFailureMessage } from "../../lib/temporal-failure";
import { mergeCompetitorAnalysis } from "../../lib/analysis/merge-analysis";
import { buildCompetitiveComparison } from "../../lib/analysis/build-comparison";
import { normalizeQueryForDedup } from "../../lib/research/normalize-query";
import { dedupeSearches, capSearches } from "../../lib/research/dedupe-searches";
import { decideLoopContinuation } from "../../lib/research/agent-loop";
import { AGENT_LIMITS } from "../../lib/agent-types";
import type { AgentState, PlannedSearch } from "../../lib/agent-types";
import type { CompetitorAnalysis } from "../../lib/analysis-types";
import type * as initActivities from "../activities/research.activities";
import type * as competitorActivities from "../activities/competitors.activities";
import type * as exaActivities from "../activities/exa.activities";
import type * as normalizeActivities from "../activities/normalize.activities";
import type * as storeActivities from "../activities/store.activities";
import type * as analysisActivities from "../activities/analysis.activities";
import type * as agentActivities from "../activities/agent.activities";
import type { SourceToNormalize } from "../../lib/research/normalize-sources";

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

const { searchExa } = proxyActivities<typeof exaActivities>({
  startToCloseTimeout: "45 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "20 seconds",
    maximumAttempts: 4,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
});

const { normalizeSources } = proxyActivities<typeof normalizeActivities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 3,
  },
});

const {
  storeResearchResults,
  getStoredSources,
  storeResearchPlan,
  storeCompetitorAnalysis,
  storeCompetitiveComparison,
  storeAgentSummary,
  completeResearch,
  markResearchFailed,
} = proxyActivities<typeof storeActivities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 4,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
});

const { extractFacts, analyzeCompetitor, analyzePricing, analyzeFeatures, analyzePositioning } =
  proxyActivities<typeof analysisActivities>({
    startToCloseTimeout: "90 seconds",
    retry: {
      initialInterval: "2 seconds",
      backoffCoefficient: 2,
      maximumInterval: "30 seconds",
      maximumAttempts: 3,
      nonRetryableErrorTypes: ["NonRetryableError"],
    },
  });

const { createResearchPlan, decideNextSearches, evaluateResearch } = proxyActivities<typeof agentActivities>({
  startToCloseTimeout: "90 seconds",
  retry: {
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
});

export const getResearchStatusQuery = defineQuery<ResearchStatusUpdate>(GET_RESEARCH_STATUS_QUERY);

/** Caps how many Exa searches run at once within a single round - genuinely parallel, but bounded. */
const SEARCH_CONCURRENCY = 6;

/** Caps how many competitors' AI-analysis pipelines run at once. */
const ANALYSIS_CONCURRENCY = 3;

export async function researchAgentWorkflow(input: ResearchInput): Promise<ResearchResult> {
  let status: ResearchStatusUpdate = {
    researchId: input.researchId,
    status: "initializing",
    message: "Research workflow starting",
  };
  setHandler(getResearchStatusQuery, () => status);

  // Compact, workflow-local agent state - never holds raw page content.
  const executedQueries = new Set<string>();
  let totalSearches = 0;
  let sourcesCollected = 0;
  let iteration = 0;
  let missingAreas: string[] = [];
  let lastDecisionReason: string | undefined;

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
        iteration,
        maxIterations: AGENT_LIMITS.MAX_RESEARCH_ITERATIONS,
        phase: agentPhase,
        searchesExecuted: totalSearches,
        sourcesCollected,
        currentTask,
        lastDecision: lastDecisionReason,
        missingAreas,
      },
    };
  }

  /** Executes a batch of searches (bounded concurrency), normalizes and stores the results, and updates running totals. */
  async function runSearchRound(searches: PlannedSearch[]): Promise<void> {
    const batches: SourceToNormalize[] = [];

    for (let i = 0; i < searches.length; i += SEARCH_CONCURRENCY) {
      const batch = searches.slice(i, i + SEARCH_CONCURRENCY);

      setStatus(
        "searching",
        `Searching ${batch.map((task) => `${task.competitor} ${task.category}`).join(", ")}`,
        "searching",
        `Searching ${batch.length} ${batch.length === 1 ? "query" : "queries"}`,
      );

      const batchResults = await Promise.all(
        batch.map(async (task) => {
          const results = await searchExa({
            researchId: input.researchId,
            competitor: task.competitor,
            query: task.query,
          });
          return { competitor: task.competitor, category: task.category, results };
        }),
      );

      batches.push(...batchResults);
    }

    for (const search of searches) {
      executedQueries.add(normalizeQueryForDedup(search.query));
    }
    totalSearches += searches.length;

    const normalized = await normalizeSources({ researchId: input.researchId, batches });
    const { storedCount } = await storeResearchResults({ researchId: input.researchId, sources: normalized });
    sourcesCollected += storedCount;
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

    const initialSearches = dedupeSearches(plan.initialQueries, executedQueries).slice(
      0,
      AGENT_LIMITS.MAX_TOTAL_SEARCHES,
    );
    if (initialSearches.length > 0) {
      await runSearchRound(initialSearches);
    }

    let outcome: "completed" | "limit_reached" | null = null;

    for (iteration = 1; iteration <= AGENT_LIMITS.MAX_RESEARCH_ITERATIONS; iteration++) {
      setStatus(
        "evaluating",
        `Evaluating research coverage (iteration ${iteration})`,
        "evaluating",
        "Evaluating research coverage",
      );
      const evaluation = await evaluateResearch({
        researchId: input.researchId,
        query: input.query,
        competitors,
        categories: plan.searchCategories,
        executedSearchCount: totalSearches,
        uniqueSearchCount: executedQueries.size,
        iteration,
      });
      missingAreas = evaluation.missingAreas;

      const continuation = decideLoopContinuation({
        iteration,
        maxIterations: AGENT_LIMITS.MAX_RESEARCH_ITERATIONS,
        sufficient: evaluation.sufficient,
        totalSearches,
        maxTotalSearches: AGENT_LIMITS.MAX_TOTAL_SEARCHES,
        sourcesCollected,
        maxSources: AGENT_LIMITS.MAX_SOURCES_PER_RESEARCH,
      });

      if (continuation.stop) {
        outcome = continuation.outcome ?? "limit_reached";
        break;
      }

      setStatus(
        "searching",
        `Deciding next searches (iteration ${iteration})`,
        "searching",
        "Deciding what to search next",
      );
      const decision = await decideNextSearches({
        researchId: input.researchId,
        query: input.query,
        competitors,
        categories: plan.searchCategories,
        previousQueries: Array.from(executedQueries),
        missingAreas,
        iteration,
        maxIterations: AGENT_LIMITS.MAX_RESEARCH_ITERATIONS,
      });
      lastDecisionReason = decision.reason;

      const deduped = dedupeSearches(decision.searches, executedQueries);
      const remainingBudget = AGENT_LIMITS.MAX_TOTAL_SEARCHES - totalSearches;
      const nextSearches = capSearches(deduped, AGENT_LIMITS.MAX_SEARCHES_PER_ITERATION, remainingBudget);

      if (nextSearches.length === 0) {
        outcome = "limit_reached";
        break;
      }

      await runSearchRound(nextSearches);
    }

    if (outcome === null) {
      outcome = "limit_reached";
    }

    setStatus(
      "analyzing",
      `Research ${outcome === "completed" ? "sufficient" : "limit reached"} - preparing competitive analysis`,
      outcome,
      "Preparing competitive analysis",
    );
    const storedSources = await getStoredSources({ researchId: input.researchId });

    const analyses: CompetitorAnalysis[] = [];
    for (let i = 0; i < competitors.length; i += ANALYSIS_CONCURRENCY) {
      const competitorBatch = competitors.slice(i, i + ANALYSIS_CONCURRENCY);

      setStatus(
        "analyzing",
        `Analyzing ${competitorBatch.join(", ")}`,
        "evaluating",
        `Analyzing ${competitorBatch.join(", ")}`,
      );

      const batchAnalyses = await Promise.all(
        competitorBatch.map(async (competitor) => {
          const competitorSources = storedSources.filter((source) => source.competitor === competitor);

          const facts = await extractFacts({
            researchId: input.researchId,
            competitor,
            sources: competitorSources,
          });

          const [synthesis, pricing, features, positioning] = await Promise.all([
            analyzeCompetitor({ researchId: input.researchId, competitor, facts }),
            analyzePricing({ competitor, sources: competitorSources, facts }),
            analyzeFeatures({ competitor, facts }),
            analyzePositioning({ competitor, facts }),
          ]);

          const analysis = mergeCompetitorAnalysis(
            input.researchId,
            competitor,
            facts,
            synthesis,
            pricing,
            features,
            positioning,
          );

          await storeCompetitorAnalysis(analysis);
          return analysis;
        }),
      );

      analyses.push(...batchAnalyses);
    }

    if (analyses.length > 1) {
      const comparison = buildCompetitiveComparison(input.researchId, analyses);
      await storeCompetitiveComparison(comparison);
    }

    await storeAgentSummary({
      researchId: input.researchId,
      summary: { outcome, iterations: iteration, searchesExecuted: totalSearches, missingAreas },
    });
    await completeResearch({ researchId: input.researchId });

    const finalMessage =
      outcome === "completed"
        ? "Research completed"
        : `Research completed with limit reached (${sourcesCollected} sources across ${totalSearches} searches)`;

    setStatus("completed", finalMessage, outcome, finalMessage);

    return {
      researchId: input.researchId,
      status: "completed",
      message: finalMessage,
      competitors,
      sourceCount: sourcesCollected,
      analyzedCount: analyses.length,
      agent: { outcome, iterations: iteration, searchesExecuted: totalSearches, missingAreas },
    };
  } catch (err) {
    const message = extractFailureMessage(err) ?? "Research workflow failed";
    status = { researchId: input.researchId, status: "failed", message };
    await markResearchFailed({ researchId: input.researchId }).catch(() => undefined);
    throw err;
  }
}
