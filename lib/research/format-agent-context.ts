import type { CoverageStats, PlannedSearch } from "@/lib/agent-types";

/** Compact - just the query text, not full results, per the cost-control rule against resending large content. */
export function formatPreviousSearchesForPrompt(queries: string[]): string {
  if (queries.length === 0) return "(none yet)";
  return queries.map((query) => `- ${query}`).join("\n");
}

export function formatMissingAreasForPrompt(missingAreas: string[]): string {
  if (missingAreas.length === 0) return "(none identified yet)";
  return missingAreas.map((area) => `- ${area}`).join("\n");
}

export function formatCoverageStatsForPrompt(stats: CoverageStats): string {
  const perCompetitor = Object.entries(stats.sourcesPerCompetitor)
    .map(([competitor, count]) => `${competitor}: ${count} sources, categories covered: ${
      (stats.categoriesWithEvidence[competitor] ?? []).join(", ") || "none"
    }`)
    .join("\n");

  return (
    `Competitors researched: ${stats.competitorsResearched}/${stats.competitorsTotal}\n` +
    `Category coverage: ${stats.categoriesCovered}/${stats.categoriesTotal}\n` +
    `Usable sources: ${stats.usableSources}\n` +
    `Duplicate searches so far: ${stats.duplicateSearchCount}\n\n` +
    perCompetitor
  );
}

export function formatPlannedSearchesForPrompt(searches: PlannedSearch[]): string {
  if (searches.length === 0) return "(none)";
  return searches
    .map((search) => `- [${search.competitor} / ${search.category}] "${search.query}" - ${search.objective}`)
    .join("\n");
}
