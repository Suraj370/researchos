import { describe, expect, it } from "vitest";

import { buildCompetitiveComparison } from "./build-comparison";
import type { CompetitorAnalysis } from "@/lib/analysis-types";

function analysis(overrides: Partial<CompetitorAnalysis>): CompetitorAnalysis {
  return {
    researchId: "research_1",
    competitor: "Stripe",
    overview: "",
    pricing: { summary: "", model: "", details: [] },
    features: [],
    targetCustomers: [],
    positioning: { summary: "", differentiators: [] },
    strengths: [],
    weaknesses: [],
    keyFacts: [],
    ...overrides,
  };
}

describe("buildCompetitiveComparison", () => {
  it("groups differently-named-but-equivalent features into one row", () => {
    const comparison = buildCompetitiveComparison("research_1", [
      analysis({ competitor: "Stripe", features: [{ name: "Payment Links", description: "", sourceIds: [] }] }),
      analysis({ competitor: "Adyen", features: [{ name: "payment links", description: "", sourceIds: [] }] }),
      analysis({ competitor: "Paddle", features: [] }),
    ]);

    expect(comparison.featureComparison).toHaveLength(1);
    expect(comparison.featureComparison[0].competitors).toEqual({ Stripe: true, Adyen: true });
  });

  it("builds per-competitor pricing/positioning/strengths/weaknesses maps", () => {
    const comparison = buildCompetitiveComparison("research_1", [
      analysis({
        competitor: "Stripe",
        pricing: { summary: "2.9% + 30c", model: "pay-as-you-go", details: [] },
        strengths: ["Strong docs"],
        weaknesses: ["Complex enterprise pricing"],
      }),
    ]);

    expect(comparison.competitors).toEqual(["Stripe"]);
    expect(comparison.pricingComparison.Stripe.summary).toBe("2.9% + 30c");
    expect(comparison.strengthsComparison.Stripe).toEqual(["Strong docs"]);
    expect(comparison.weaknessesComparison.Stripe).toEqual(["Complex enterprise pricing"]);
  });
});
