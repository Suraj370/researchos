import { describe, expect, it } from "vitest";

import { buildCompetitorWorkflowId, slugifyCompetitor } from "./competitor-workflow-id";

describe("buildCompetitorWorkflowId", () => {
  it("is deterministic - the same researchId and competitor always produce the same id", () => {
    const first = buildCompetitorWorkflowId("r1", "Notion");
    const second = buildCompetitorWorkflowId("r1", "Notion");
    expect(first).toBe(second);
  });

  it("produces different ids for different competitors in the same research", () => {
    const notion = buildCompetitorWorkflowId("r1", "Notion");
    const airtable = buildCompetitorWorkflowId("r1", "Airtable");
    const monday = buildCompetitorWorkflowId("r1", "Monday");

    expect(new Set([notion, airtable, monday]).size).toBe(3);
  });

  it("produces different ids for the same competitor in different research runs", () => {
    expect(buildCompetitorWorkflowId("r1", "Notion")).not.toBe(buildCompetitorWorkflowId("r2", "Notion"));
  });

  it("follows the research-<id>-competitor-<slug> shape", () => {
    expect(buildCompetitorWorkflowId("abc123", "Notion")).toBe("research-abc123-competitor-notion");
  });
});

describe("slugifyCompetitor", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugifyCompetitor("Monday.com")).toBe("monday-com");
  });

  it("collapses runs of non-alphanumeric characters and trims edges", () => {
    expect(slugifyCompetitor("  Notion!! Inc.  ")).toBe("notion-inc");
  });

  it("falls back to a safe placeholder for a name with no alphanumeric characters", () => {
    expect(slugifyCompetitor("!!!")).toBe("competitor");
  });
});
