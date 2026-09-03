export const ANALYSIS_CATEGORIES = [
  "overview",
  "products",
  "pricing",
  "features",
  "targetCustomers",
  "positioning",
  "differentiators",
] as const;

export type AnalysisCategory = (typeof ANALYSIS_CATEGORIES)[number];

/** One atomic, source-traceable fact extracted from raw sources. Never invented. */
export interface ExtractedFact {
  fact: string;
  sourceIds: string[];
  category: AnalysisCategory;
}

export interface KeyFact {
  fact: string;
  sourceIds: string[];
}

export interface PricingAnalysis {
  summary: string;
  model: string;
  details: string[];
}

export interface FeatureAnalysis {
  name: string;
  description: string;
  sourceIds: string[];
}

export interface PositioningAnalysis {
  summary: string;
  differentiators: string[];
}

/**
 * analyzePositioning's own working output. Keeps FACT explicitly separate from
 * INTERPRETATION per Phase 3 spec section 7, before being folded into the
 * fixed CompetitorAnalysis.positioning shape.
 */
export interface PositioningInsight {
  targetCustomers: string[];
  facts: KeyFact[];
  interpretation: string;
  differentiators: KeyFact[];
}

export interface CompetitorSynthesis {
  overview: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorAnalysis {
  researchId: string;
  competitor: string;

  overview: string;

  pricing: PricingAnalysis;

  features: FeatureAnalysis[];

  targetCustomers: string[];

  positioning: PositioningAnalysis;

  strengths: string[];

  weaknesses: string[];

  keyFacts: KeyFact[];
}

export interface FeatureComparisonRow {
  feature: string;
  competitors: Record<string, boolean>;
}

export interface CompetitiveComparison {
  researchId: string;
  competitors: string[];
  pricingComparison: Record<string, PricingAnalysis>;
  featureComparison: FeatureComparisonRow[];
  positioningComparison: Record<string, PositioningAnalysis>;
  strengthsComparison: Record<string, string[]>;
  weaknessesComparison: Record<string, string[]>;
}

export const INSUFFICIENT_EVIDENCE = "Insufficient evidence.";
export const NOT_PUBLICLY_AVAILABLE = "Not publicly available.";
