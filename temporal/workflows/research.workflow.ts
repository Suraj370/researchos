import { defineQuery, proxyActivities, setHandler } from "@temporalio/workflow";

import { GET_RESEARCH_STATUS_QUERY, RESEARCH_SEARCH_CATEGORIES } from "../../lib/temporal-types";
import type {
  ResearchInput,
  ResearchResult,
  ResearchStatusUpdate,
  SearchCategory,
} from "../../lib/temporal-types";
import { extractFailureMessage } from "../../lib/temporal-failure";
import { mergeCompetitorAnalysis } from "../../lib/analysis/merge-analysis";
import { buildCompetitiveComparison } from "../../lib/analysis/build-comparison";
import type { CompetitorAnalysis } from "../../lib/analysis-types";
import type * as initActivities from "../activities/research.activities";
import type * as competitorActivities from "../activities/competitors.activities";
import type * as exaActivities from "../activities/exa.activities";
import type * as normalizeActivities from "../activities/normalize.activities";
import type * as storeActivities from "../activities/store.activities";
import type * as analysisActivities from "../activities/analysis.activities";
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

const { storeResearchResults, getStoredSources, storeCompetitorAnalysis, storeCompetitiveComparison, completeResearch, markResearchFailed } =
  proxyActivities<typeof storeActivities>({
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

export const getResearchStatusQuery = defineQuery<ResearchStatusUpdate>(GET_RESEARCH_STATUS_QUERY);

const CATEGORY_QUERY_HINTS: Record<SearchCategory, string> = {
  pricing: "pricing",
  features: "features",
  products: "products",
  customers: "target customers",
  positioning: "competitors",
};

interface SearchTask {
  competitor: string;
  category: SearchCategory;
}

/** Caps how many Exa searches run at once - genuinely parallel, but bounded. */
const SEARCH_CONCURRENCY = 6;

/** Caps how many competitors' AI-analysis pipelines run at once. */
const ANALYSIS_CONCURRENCY = 3;

export async function researchWorkflow(input: ResearchInput): Promise<ResearchResult> {
  let status: ResearchStatusUpdate = {
    researchId: input.researchId,
    status: "initializing",
    message: "Research workflow starting",
  };
  setHandler(getResearchStatusQuery, () => status);

  try {
    await initializeResearch(input);

    status = { researchId: input.researchId, status: "searching", message: "Discovering competitors" };
    const { competitors } = await searchCompetitors({
      researchId: input.researchId,
      query: input.query,
    });

    const tasks: SearchTask[] = [];
    for (const competitor of competitors) {
      for (const category of RESEARCH_SEARCH_CATEGORIES) {
        tasks.push({ competitor, category });
      }
    }

    const batches: SourceToNormalize[] = [];
    for (let i = 0; i < tasks.length; i += SEARCH_CONCURRENCY) {
      const batch = tasks.slice(i, i + SEARCH_CONCURRENCY);

      status = {
        researchId: input.researchId,
        status: "searching",
        message: `Searching ${batch.map((task) => `${task.competitor} ${task.category}`).join(", ")}`,
      };

      const batchResults = await Promise.all(
        batch.map(async (task) => {
          const results = await searchExa({
            researchId: input.researchId,
            competitor: task.competitor,
            query: `${task.competitor} ${CATEGORY_QUERY_HINTS[task.category]}`,
          });
          return { competitor: task.competitor, category: task.category, results };
        }),
      );

      batches.push(...batchResults);
    }

    const totalRawResults = batches.reduce((sum, batch) => sum + batch.results.length, 0);
    status = {
      researchId: input.researchId,
      status: "normalizing",
      message: `Normalizing ${totalRawResults} sources`,
    };
    const normalized = await normalizeSources({ researchId: input.researchId, batches });

    status = {
      researchId: input.researchId,
      status: "storing",
      message: `Storing ${normalized.length} unique sources`,
    };
    const { storedCount } = await storeResearchResults({
      researchId: input.researchId,
      sources: normalized,
    });

    status = { researchId: input.researchId, status: "analyzing", message: "Preparing competitive analysis" };
    const storedSources = await getStoredSources({ researchId: input.researchId });

    const analyses: CompetitorAnalysis[] = [];
    for (let i = 0; i < competitors.length; i += ANALYSIS_CONCURRENCY) {
      const competitorBatch = competitors.slice(i, i + ANALYSIS_CONCURRENCY);

      status = {
        researchId: input.researchId,
        status: "analyzing",
        message: `Analyzing ${competitorBatch.join(", ")}`,
      };

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

    await completeResearch({ researchId: input.researchId });
    status = { researchId: input.researchId, status: "completed", message: "Research completed" };

    return {
      researchId: input.researchId,
      status: "completed",
      message: "Research completed",
      competitors,
      sourceCount: storedCount,
      analyzedCount: analyses.length,
    };
  } catch (err) {
    const message = extractFailureMessage(err) ?? "Research workflow failed";
    status = { researchId: input.researchId, status: "failed", message };
    await markResearchFailed({ researchId: input.researchId }).catch(() => undefined);
    throw err;
  }
}
