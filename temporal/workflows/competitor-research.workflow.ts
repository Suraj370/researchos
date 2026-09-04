import { defineQuery, proxyActivities, setHandler } from "@temporalio/workflow";

import { AGENT_LIMITS } from "../../lib/agent-types";
import type {
  AgentState,
  CompetitorResearchInput,
  CompetitorResearchResult,
  CompetitorResearchStatusUpdate,
  PlannedSearch,
} from "../../lib/agent-types";
import { extractFailureMessage } from "../../lib/temporal-failure";
import { mergeCompetitorAnalysis } from "../../lib/analysis/merge-analysis";
import { normalizeQueryForDedup } from "../../lib/research/normalize-query";
import { dedupeSearches, capSearches } from "../../lib/research/dedupe-searches";
import { decideLoopContinuation } from "../../lib/research/agent-loop";
import type { SourceToNormalize } from "../../lib/research/normalize-sources";
import {
  AGENT_ACTIVITY_OPTIONS,
  ANALYSIS_ACTIVITY_OPTIONS,
  EXA_SEARCH_ACTIVITY_OPTIONS,
  NORMALIZE_ACTIVITY_OPTIONS,
  STORE_ACTIVITY_OPTIONS,
} from "../lib/activity-options";
import type * as exaActivities from "../activities/exa.activities";
import type * as normalizeActivities from "../activities/normalize.activities";
import type * as storeActivities from "../activities/store.activities";
import type * as analysisActivities from "../activities/analysis.activities";
import type * as agentActivities from "../activities/agent.activities";

const { searchExa } = proxyActivities<typeof exaActivities>(EXA_SEARCH_ACTIVITY_OPTIONS);
const { normalizeSources } = proxyActivities<typeof normalizeActivities>(NORMALIZE_ACTIVITY_OPTIONS);

const { storeResearchResults, getStoredSources, storeCompetitorAnalysis } = proxyActivities<typeof storeActivities>(
  STORE_ACTIVITY_OPTIONS,
);

const { extractFacts, analyzeCompetitor, analyzePricing, analyzeFeatures, analyzePositioning } =
  proxyActivities<typeof analysisActivities>(ANALYSIS_ACTIVITY_OPTIONS);

const { decideNextSearches, evaluateResearch } = proxyActivities<typeof agentActivities>(AGENT_ACTIVITY_OPTIONS);

export const getCompetitorResearchStatusQuery = defineQuery<CompetitorResearchStatusUpdate>(
  "getCompetitorResearchStatus",
);

/** Caps how many Exa searches run at once within a single round - genuinely parallel, but bounded. */
const SEARCH_CONCURRENCY = 6;

/**
 * Owns the entire research lifecycle for ONE competitor: seed searches, the
 * same evaluate/decide/search agent loop as Phase 4 (reused, not duplicated),
 * then the same Phase 3 analysis pipeline (reused) scoped to this competitor.
 *
 * Failure model: unrecoverable Activity failures are NOT caught here - they
 * propagate so Temporal records a genuine workflow failure. The parent
 * (research.workflow.ts) is responsible for catching that and isolating it
 * from the other competitors' results. This workflow only ever *returns* a
 * "completed" or "limit_reached" result; "failed" is constructed by the parent.
 */
export async function competitorResearchWorkflow(
  input: CompetitorResearchInput,
): Promise<CompetitorResearchResult> {
  const competitors = [input.competitor];

  const executedQueries = new Set<string>();
  let totalSearches = 0;
  let sourcesCollected = 0;
  let iteration = 0;
  let missingAreas: string[] = [];
  let lastDecisionReason: string | undefined;

  let agentState: AgentState = {
    iteration: 0,
    maxIterations: AGENT_LIMITS.MAX_RESEARCH_ITERATIONS,
    phase: "planning",
    searchesExecuted: 0,
    sourcesCollected: 0,
    currentTask: "Starting competitor research",
    missingAreas: [],
  };
  setHandler(getCompetitorResearchStatusQuery, () => ({
    researchId: input.researchId,
    competitor: input.competitor,
    agent: agentState,
  }));

  function setAgentState(phase: AgentState["phase"], currentTask: string) {
    agentState = {
      iteration,
      maxIterations: AGENT_LIMITS.MAX_RESEARCH_ITERATIONS,
      phase,
      searchesExecuted: totalSearches,
      sourcesCollected,
      currentTask,
      lastDecision: lastDecisionReason,
      missingAreas,
    };
  }

  async function runSearchRound(searches: PlannedSearch[]): Promise<void> {
    const batches: SourceToNormalize[] = [];

    for (let i = 0; i < searches.length; i += SEARCH_CONCURRENCY) {
      const batch = searches.slice(i, i + SEARCH_CONCURRENCY);

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
    const initialSearches = dedupeSearches(input.initialQueries, executedQueries).slice(
      0,
      AGENT_LIMITS.MAX_TOTAL_SEARCHES,
    );
    if (initialSearches.length > 0) {
      setAgentState("searching", "Running initial searches");
      await runSearchRound(initialSearches);
    }

    let outcome: "completed" | "limit_reached" = "limit_reached";

    for (iteration = 1; iteration <= AGENT_LIMITS.MAX_RESEARCH_ITERATIONS; iteration++) {
      setAgentState("evaluating", `Evaluating research coverage (iteration ${iteration})`);
      const evaluation = await evaluateResearch({
        researchId: input.researchId,
        query: input.researchRequest,
        competitors,
        categories: input.searchCategories,
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

      setAgentState("searching", `Deciding next searches (iteration ${iteration})`);
      const decision = await decideNextSearches({
        researchId: input.researchId,
        query: input.researchRequest,
        competitors,
        categories: input.searchCategories,
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

    setAgentState("evaluating", `Analyzing ${input.competitor}`);
    const storedSources = await getStoredSources({ researchId: input.researchId });
    const competitorSources = storedSources.filter((source) => source.competitor === input.competitor);

    const facts = await extractFacts({
      researchId: input.researchId,
      competitor: input.competitor,
      sources: competitorSources,
    });

    const [synthesis, pricing, features, positioning] = await Promise.all([
      analyzeCompetitor({ researchId: input.researchId, competitor: input.competitor, facts }),
      analyzePricing({ competitor: input.competitor, sources: competitorSources, facts }),
      analyzeFeatures({ competitor: input.competitor, facts }),
      analyzePositioning({ competitor: input.competitor, facts }),
    ]);

    const analysis = mergeCompetitorAnalysis(
      input.researchId,
      input.competitor,
      facts,
      synthesis,
      pricing,
      features,
      positioning,
    );
    await storeCompetitorAnalysis(analysis);

    setAgentState(outcome, outcome === "completed" ? "Research completed" : "Research limit reached");

    return {
      researchId: input.researchId,
      competitor: input.competitor,
      status: outcome,
      sourceCount: sourcesCollected,
      iterations: iteration,
      searchesExecuted: totalSearches,
      missingAreas,
      analysisCompleted: true,
    };
  } catch (err) {
    const message = extractFailureMessage(err) ?? `Research failed for ${input.competitor}`;
    agentState = { ...agentState, phase: "failed", currentTask: message };
    throw err;
  }
}
