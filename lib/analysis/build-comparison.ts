import { normalizeFeatureKey } from "./normalize-feature-name";
import type { CompetitiveComparison, CompetitorAnalysis, FeatureComparisonRow } from "@/lib/analysis-types";

/** Pure aggregation - no AI, no I/O. Builds the cross-competitor comparison from already-computed analyses. */
export function buildCompetitiveComparison(
  researchId: string,
  analyses: CompetitorAnalysis[]
): CompetitiveComparison {
  const competitors = analyses.map((a) => a.competitor);

  const pricingComparison: CompetitiveComparison["pricingComparison"] = {};
  const positioningComparison: CompetitiveComparison["positioningComparison"] = {};
  const strengthsComparison: CompetitiveComparison["strengthsComparison"] = {};
  const weaknessesComparison: CompetitiveComparison["weaknessesComparison"] = {};

  const featureRows = new Map<string, FeatureComparisonRow>();

  for (const analysis of analyses) {
    pricingComparison[analysis.competitor] = analysis.pricing;
    positioningComparison[analysis.competitor] = analysis.positioning;
    strengthsComparison[analysis.competitor] = analysis.strengths;
    weaknessesComparison[analysis.competitor] = analysis.weaknesses;

    for (const feature of analysis.features) {
      const key = normalizeFeatureKey(feature.name);
      if (!key) continue;

      const row = featureRows.get(key) ?? { feature: feature.name, competitors: {} };
      row.competitors[analysis.competitor] = true;
      featureRows.set(key, row);
    }
  }

  return {
    researchId,
    competitors,
    pricingComparison,
    featureComparison: Array.from(featureRows.values()),
    positioningComparison,
    strengthsComparison,
    weaknessesComparison,
  };
}
