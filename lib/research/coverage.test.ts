import { describe, expect, it } from "vitest";

import { computeCoverageStats } from "./coverage";

describe("computeCoverageStats", () => {
  it("counts sources per competitor and categories covered", () => {
    const stats = computeCoverageStats({
      sources: [
        { competitor: "Notion", searchCategory: "pricing" },
        { competitor: "Notion", searchCategory: "pricing" },
        { competitor: "Notion", searchCategory: "features" },
        { competitor: "Airtable", searchCategory: "pricing" },
      ],
      competitors: ["Notion", "Airtable", "Monday"],
      categories: ["pricing", "features", "products", "customers", "positioning"],
      executedSearchCount: 10,
      uniqueSearchCount: 8,
      maxSources: 100,
    });

    expect(stats.competitorsResearched).toBe(2);
    expect(stats.competitorsTotal).toBe(3);
    expect(stats.usableSources).toBe(4);
    expect(stats.sourcesPerCompetitor).toEqual({ Notion: 3, Airtable: 1, Monday: 0 });
    expect(stats.categoriesWithEvidence.Notion).toEqual(["pricing", "features"]);
    expect(stats.categoriesWithEvidence.Monday).toEqual([]);
    expect(stats.categoriesCovered).toBe(3); // Notion: pricing+features, Airtable: pricing
    expect(stats.duplicateSearchCount).toBe(2); // 10 executed - 8 unique
  });

  it("flags the source limit as reached once usable sources hit the max", () => {
    const stats = computeCoverageStats({
      sources: [{ competitor: "Notion", searchCategory: "pricing" }],
      competitors: ["Notion"],
      categories: ["pricing"],
      executedSearchCount: 1,
      uniqueSearchCount: 1,
      maxSources: 1,
    });

    expect(stats.sourceLimitReached).toBe(true);
  });

  it("never reports a negative duplicate count", () => {
    const stats = computeCoverageStats({
      sources: [],
      competitors: ["Notion"],
      categories: ["pricing"],
      executedSearchCount: 0,
      uniqueSearchCount: 0,
      maxSources: 100,
    });

    expect(stats.duplicateSearchCount).toBe(0);
  });
});
