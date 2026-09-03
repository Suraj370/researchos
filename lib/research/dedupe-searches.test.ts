import { describe, expect, it } from "vitest";

import { capSearches, dedupeSearches } from "./dedupe-searches";
import type { PlannedSearch } from "@/lib/agent-types";

function search(overrides: Partial<PlannedSearch> = {}): PlannedSearch {
  return {
    competitor: "Notion",
    category: "pricing",
    query: "Notion pricing official",
    objective: "Find official pricing",
    ...overrides,
  };
}

describe("dedupeSearches", () => {
  it("drops a search whose normalized query was already executed", () => {
    const alreadyExecuted = new Set(["notion pricing official"]);
    const result = dedupeSearches([search()], alreadyExecuted);
    expect(result).toEqual([]);
  });

  it("drops duplicate queries within the same proposed batch, keeping the first", () => {
    const proposed = [search({ objective: "first" }), search({ objective: "second" })];
    const result = dedupeSearches(proposed, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].objective).toBe("first");
  });

  it("keeps genuinely new searches", () => {
    const proposed = [search({ query: "Notion enterprise pricing" })];
    const result = dedupeSearches(proposed, new Set(["notion pricing official"]));
    expect(result).toHaveLength(1);
  });
});

describe("capSearches", () => {
  const searches = Array.from({ length: 10 }, (_, i) => search({ query: `query ${i}` }));

  it("caps to the per-iteration max", () => {
    expect(capSearches(searches, 3, 100)).toHaveLength(3);
  });

  it("caps to the remaining budget when smaller than the per-iteration max", () => {
    expect(capSearches(searches, 8, 2)).toHaveLength(2);
  });

  it("returns nothing when the budget is exhausted", () => {
    expect(capSearches(searches, 8, 0)).toEqual([]);
  });

  it("never returns a negative-length slice for a negative budget", () => {
    expect(capSearches(searches, 8, -5)).toEqual([]);
  });
});
