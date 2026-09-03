import type { CoverageStats } from "@/lib/agent-types";
import type { ResearchSource, SearchCategory } from "@/lib/temporal-types";

export interface ComputeCoverageInput {
  sources: Pick<ResearchSource, "competitor" | "searchCategory">[];
  competitors: string[];
  categories: SearchCategory[];
  executedSearchCount: number;
  uniqueSearchCount: number;
  maxSources: number;
}

/** Pure, deterministic coverage math - the "hard constraints" half of research evaluation. No LLM involved. */
export function computeCoverageStats(input: ComputeCoverageInput): CoverageStats {
  const sourcesPerCompetitor: Record<string, number> = {};
  const categoriesWithEvidence: Record<string, SearchCategory[]> = {};

  for (const competitor of input.competitors) {
    sourcesPerCompetitor[competitor] = 0;
    categoriesWithEvidence[competitor] = [];
  }

  for (const source of input.sources) {
    sourcesPerCompetitor[source.competitor] = (sourcesPerCompetitor[source.competitor] ?? 0) + 1;

    const covered = categoriesWithEvidence[source.competitor] ?? [];
    if (!covered.includes(source.searchCategory)) {
      covered.push(source.searchCategory);
    }
    categoriesWithEvidence[source.competitor] = covered;
  }

  const competitorsResearched = input.competitors.filter(
    (competitor) => (sourcesPerCompetitor[competitor] ?? 0) > 0
  ).length;

  const categoriesCovered = Object.values(categoriesWithEvidence).reduce(
    (sum, categories) => sum + categories.length,
    0
  );
  const categoriesTotal = input.competitors.length * input.categories.length;

  return {
    competitorsResearched,
    competitorsTotal: input.competitors.length,
    categoriesCovered,
    categoriesTotal,
    usableSources: input.sources.length,
    sourcesPerCompetitor,
    categoriesWithEvidence,
    duplicateSearchCount: Math.max(0, input.executedSearchCount - input.uniqueSearchCount),
    sourceLimitReached: input.sources.length >= input.maxSources,
  };
}
