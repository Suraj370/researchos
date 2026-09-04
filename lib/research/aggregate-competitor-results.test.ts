import { describe, expect, it } from "vitest";

import { aggregateCompetitorOutcome } from "./aggregate-competitor-results";
import type { CompetitorResearchResult } from "@/lib/agent-types";

function result(overrides: Partial<CompetitorResearchResult> = {}): CompetitorResearchResult {
  return {
    researchId: "r1",
    competitor: "Notion",
    status: "completed",
    sourceCount: 10,
    iterations: 1,
    searchesExecuted: 5,
    missingAreas: [],
    analysisCompleted: true,
    ...overrides,
  };
}

describe("aggregateCompetitorOutcome", () => {
  it("is 'completed' when every competitor completed", () => {
    const results = [
      result({ competitor: "Notion" }),
      result({ competitor: "Airtable" }),
      result({ competitor: "Monday" }),
    ];
    expect(aggregateCompetitorOutcome(results)).toBe("completed");
  });

  it("is 'completed_with_failures' when some competitors failed but not all", () => {
    const results = [
      result({ competitor: "Notion", status: "completed" }),
      result({ competitor: "Airtable", status: "failed", analysisCompleted: false, error: "boom" }),
      result({ competitor: "Monday", status: "completed" }),
    ];
    expect(aggregateCompetitorOutcome(results)).toBe("completed_with_failures");
  });

  it("is 'failed' when every competitor failed", () => {
    const results = [
      result({ competitor: "Notion", status: "failed", analysisCompleted: false }),
      result({ competitor: "Airtable", status: "failed", analysisCompleted: false }),
    ];
    expect(aggregateCompetitorOutcome(results)).toBe("failed");
  });

  it("is 'limit_reached' when nothing failed but at least one competitor hit its limit", () => {
    const results = [
      result({ competitor: "Notion", status: "completed" }),
      result({ competitor: "Airtable", status: "limit_reached" }),
    ];
    expect(aggregateCompetitorOutcome(results)).toBe("limit_reached");
  });

  it("prioritizes completed_with_failures over limit_reached when both are present", () => {
    const results = [
      result({ competitor: "Notion", status: "limit_reached" }),
      result({ competitor: "Airtable", status: "failed", analysisCompleted: false }),
    ];
    expect(aggregateCompetitorOutcome(results)).toBe("completed_with_failures");
  });

  it("treats an empty result list as failed rather than throwing", () => {
    expect(aggregateCompetitorOutcome([])).toBe("failed");
  });
});
