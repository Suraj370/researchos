import { describe, expect, it } from "vitest";

import { mergeCompetitorAnalysis } from "./merge-analysis";
import type { ExtractedFact } from "@/lib/analysis-types";

describe("mergeCompetitorAnalysis", () => {
  it("assembles the fixed CompetitorAnalysis shape from the four activity outputs", () => {
    const facts: ExtractedFact[] = [
      { fact: "Stripe charges 2.9% + 30c per transaction.", sourceIds: ["s1"], category: "pricing" },
    ];

    const analysis = mergeCompetitorAnalysis(
      "research_1",
      "Stripe",
      facts,
      { overview: "Payments platform.", strengths: ["Strong docs"], weaknesses: [] },
      { summary: "Percentage + fixed fee.", model: "Pay-as-you-go", details: ["2.9% + 30c"] },
      [{ name: "Payment Links", description: "Shareable checkout links.", sourceIds: ["s1"] }],
      {
        targetCustomers: ["Online businesses"],
        facts: [{ fact: "Targets online businesses.", sourceIds: ["s1"] }],
        interpretation: "Developer-centric positioning.",
        differentiators: [{ fact: "Strong API", sourceIds: ["s1"] }],
      }
    );

    expect(analysis).toEqual({
      researchId: "research_1",
      competitor: "Stripe",
      overview: "Payments platform.",
      pricing: { summary: "Percentage + fixed fee.", model: "Pay-as-you-go", details: ["2.9% + 30c"] },
      features: [{ name: "Payment Links", description: "Shareable checkout links.", sourceIds: ["s1"] }],
      targetCustomers: ["Online businesses"],
      positioning: { summary: "Developer-centric positioning.", differentiators: ["Strong API"] },
      strengths: ["Strong docs"],
      weaknesses: [],
      keyFacts: [{ fact: "Stripe charges 2.9% + 30c per transaction.", sourceIds: ["s1"] }],
    });
  });
});
