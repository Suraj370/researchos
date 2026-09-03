import type {
  CompetitorAnalysis,
  CompetitorSynthesis,
  ExtractedFact,
  FeatureAnalysis,
  PositioningInsight,
  PricingAnalysis,
} from "@/lib/analysis-types";

/** Pure assembly - no AI, no I/O. Combines the four analysis activities' outputs into the fixed CompetitorAnalysis shape. */
export function mergeCompetitorAnalysis(
  researchId: string,
  competitor: string,
  facts: ExtractedFact[],
  synthesis: CompetitorSynthesis,
  pricing: PricingAnalysis,
  features: FeatureAnalysis[],
  positioning: PositioningInsight
): CompetitorAnalysis {
  return {
    researchId,
    competitor,
    overview: synthesis.overview,
    pricing,
    features,
    targetCustomers: positioning.targetCustomers,
    positioning: {
      summary: positioning.interpretation,
      differentiators: positioning.differentiators.map((d) => d.fact),
    },
    strengths: synthesis.strengths,
    weaknesses: synthesis.weaknesses,
    keyFacts: facts.map((fact) => ({ fact: fact.fact, sourceIds: fact.sourceIds })),
  };
}
