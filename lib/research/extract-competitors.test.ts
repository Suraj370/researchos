import { describe, expect, it } from "vitest";

import { extractExplicitCompetitors } from "./extract-competitors";

describe("extractExplicitCompetitors", () => {
  it("extracts a comma-and-and separated list", () => {
    expect(extractExplicitCompetitors("Compare Stripe, Adyen, and Paddle for a SaaS startup.")).toEqual([
      "Stripe",
      "Adyen",
      "Paddle",
    ]);
  });

  it("extracts a two-item vs list", () => {
    expect(extractExplicitCompetitors("Stripe vs Adyen for enterprise payments")).toEqual([
      "Stripe",
      "Adyen",
    ]);
  });

  it("ignores common stopwords like SaaS and Compare", () => {
    expect(extractExplicitCompetitors("Compare Notion and Airtable for SaaS startups")).toEqual([
      "Notion",
      "Airtable",
    ]);
  });

  it("dedupes repeated names", () => {
    expect(extractExplicitCompetitors("Stripe vs Stripe")).toEqual(["Stripe"]);
  });

  it("returns an empty array when there is no explicit capitalized list", () => {
    expect(extractExplicitCompetitors("what are the best payment processors for startups")).toEqual([]);
  });
});
