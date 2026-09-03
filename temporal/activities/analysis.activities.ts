import { z } from "zod";

import { parseStructured } from "../lib/openai-structured";
import { formatFactsForPrompt, formatSourcesForPrompt } from "../../lib/analysis/format-context";
import { sanitizeKeyFacts, sanitizeSourceIds } from "../../lib/analysis/sanitize";
import { ANALYSIS_CATEGORIES, INSUFFICIENT_EVIDENCE, NOT_PUBLICLY_AVAILABLE } from "../../lib/analysis-types";
import type {
  CompetitorSynthesis,
  ExtractedFact,
  FeatureAnalysis,
  PositioningInsight,
  PricingAnalysis,
} from "../../lib/analysis-types";
import type { ResearchSource } from "../../lib/temporal-types";

const GROUNDING_RULE =
  "Only use the information explicitly provided below. Never invent, guess, or rely on outside " +
  "knowledge about this company. If the material does not support a field, say so explicitly.";

// ---------------------------------------------------------------------------
// extractFacts
// ---------------------------------------------------------------------------

export interface ExtractFactsInput {
  researchId: string;
  competitor: string;
  sources: ResearchSource[];
}

const extractedFactSchema = z.object({
  fact: z.string(),
  sourceIds: z.array(z.string()),
  category: z.enum(ANALYSIS_CATEGORIES),
});

const extractFactsResponseSchema = z.object({ facts: z.array(extractedFactSchema) });

export async function extractFacts(input: ExtractFactsInput): Promise<ExtractedFact[]> {
  if (input.sources.length === 0) return [];

  const validIds = new Set(input.sources.map((source) => source.id));

  const systemPrompt =
    `You extract structured, source-traceable facts about a company from web search results. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    "- Every fact must cite the sourceId(s) (from the [brackets]) it came from.\n" +
    "- Do not infer, estimate, or combine unrelated sources into a new claim.\n" +
    `- Valid categories are: ${ANALYSIS_CATEGORIES.join(", ")}.\n` +
    "- If a category has no supporting information in the sources, simply omit facts for it.\n" +
    "- Keep each fact short and specific (one claim per fact).";

  const userPrompt =
    `Competitor: ${input.competitor}\n\nSources:\n${formatSourcesForPrompt(input.sources)}\n\n` +
    `Extract all supportable facts about ${input.competitor} from the sources above.`;

  const result = await parseStructured(extractFactsResponseSchema, "extracted_facts", systemPrompt, userPrompt);

  return result.facts
    .map((fact) => ({ ...fact, sourceIds: sanitizeSourceIds(fact.sourceIds, validIds) }))
    .filter((fact) => fact.sourceIds.length > 0);
}

// ---------------------------------------------------------------------------
// analyzeCompetitor
// ---------------------------------------------------------------------------

export interface AnalyzeCompetitorInput {
  researchId: string;
  competitor: string;
  facts: ExtractedFact[];
}

const analyzeCompetitorResponseSchema = z.object({
  overview: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export async function analyzeCompetitor(input: AnalyzeCompetitorInput): Promise<CompetitorSynthesis> {
  if (input.facts.length === 0) {
    return { overview: INSUFFICIENT_EVIDENCE, strengths: [], weaknesses: [] };
  }

  const systemPrompt =
    `You synthesize a competitor overview from pre-extracted, source-traceable facts. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    "- Base every statement only on the facts provided.\n" +
    "- Strengths and weaknesses must be directly supported by specific facts - never generic filler like " +
    '"Great company" or "Very expensive" unless a fact actually supports that conclusion.\n' +
    "- If there is not enough evidence for strengths or weaknesses, return an empty array.\n" +
    `- If there is not enough evidence to write even a basic overview, set overview to exactly "${INSUFFICIENT_EVIDENCE}".`;

  const userPrompt = `Competitor: ${input.competitor}\n\nFacts:\n${formatFactsForPrompt(input.facts)}`;

  return parseStructured(analyzeCompetitorResponseSchema, "competitor_analysis", systemPrompt, userPrompt);
}

// ---------------------------------------------------------------------------
// analyzePricing
// ---------------------------------------------------------------------------

export interface AnalyzePricingInput {
  competitor: string;
  sources: ResearchSource[];
  facts: ExtractedFact[];
}

const pricingAnalysisResponseSchema = z.object({
  summary: z.string(),
  model: z.string(),
  details: z.array(z.string()),
});

export async function analyzePricing(input: AnalyzePricingInput): Promise<PricingAnalysis> {
  const pricingSources = input.sources.filter((source) => source.searchCategory === "pricing");
  const pricingFacts = input.facts.filter((fact) => fact.category === "pricing");

  if (pricingSources.length === 0 && pricingFacts.length === 0) {
    return { summary: INSUFFICIENT_EVIDENCE, model: INSUFFICIENT_EVIDENCE, details: [] };
  }

  const systemPrompt =
    `You extract structured pricing intelligence for a company from facts and sources. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    `- If enterprise or custom pricing is not explicitly published, do NOT estimate it - use "${NOT_PUBLICLY_AVAILABLE}".\n` +
    "- Never hallucinate specific prices, percentages, or fees that are not explicitly present below.\n" +
    `- If there is not enough pricing information at all, set summary and model to "${INSUFFICIENT_EVIDENCE}" and leave details empty.\n` +
    "- List concrete pricing facts (fees, minimums, regional differences, constraints) as separate detail entries.";

  const userPrompt =
    `Competitor: ${input.competitor}\n\n` +
    `Pricing-related facts:\n${formatFactsForPrompt(pricingFacts)}\n\n` +
    `Pricing-related sources:\n${formatSourcesForPrompt(pricingSources)}`;

  return parseStructured(pricingAnalysisResponseSchema, "pricing_analysis", systemPrompt, userPrompt);
}

// ---------------------------------------------------------------------------
// analyzeFeatures
// ---------------------------------------------------------------------------

export interface AnalyzeFeaturesInput {
  competitor: string;
  facts: ExtractedFact[];
}

const featureAnalysisSchema = z.object({
  name: z.string(),
  description: z.string(),
  sourceIds: z.array(z.string()),
});

const analyzeFeaturesResponseSchema = z.object({ features: z.array(featureAnalysisSchema) });

export async function analyzeFeatures(input: AnalyzeFeaturesInput): Promise<FeatureAnalysis[]> {
  const featureFacts = input.facts.filter((fact) => fact.category === "features" || fact.category === "products");
  if (featureFacts.length === 0) return [];

  const validIds = new Set(featureFacts.flatMap((fact) => fact.sourceIds));

  const systemPrompt =
    `You extract a structured list of product features from pre-extracted facts. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    "- Only include features explicitly supported by the facts.\n" +
    "- Every feature must cite the sourceId(s) supporting it.\n" +
    'Use clear, consistent, Title Case feature names (e.g. "Payment Links", not "payment links" or ' +
    '"create payment links") so the same feature is named the same way every time.\n' +
    "- Do not invent features that are not mentioned in the facts.";

  const userPrompt = `Competitor: ${input.competitor}\n\nFacts:\n${formatFactsForPrompt(featureFacts)}`;

  const result = await parseStructured(analyzeFeaturesResponseSchema, "feature_analysis", systemPrompt, userPrompt);

  return sanitizeKeyFacts(result.features, validIds);
}

// ---------------------------------------------------------------------------
// analyzePositioning
// ---------------------------------------------------------------------------

export interface AnalyzePositioningInput {
  competitor: string;
  facts: ExtractedFact[];
}

const keyFactSchema = z.object({ fact: z.string(), sourceIds: z.array(z.string()) });

const analyzePositioningResponseSchema = z.object({
  targetCustomers: z.array(z.string()),
  facts: z.array(keyFactSchema),
  interpretation: z.string(),
  differentiators: z.array(keyFactSchema),
});

export async function analyzePositioning(input: AnalyzePositioningInput): Promise<PositioningInsight> {
  const positioningFacts = input.facts.filter(
    (fact) =>
      fact.category === "positioning" || fact.category === "targetCustomers" || fact.category === "differentiators",
  );

  if (positioningFacts.length === 0) {
    return { targetCustomers: [], facts: [], interpretation: INSUFFICIENT_EVIDENCE, differentiators: [] };
  }

  const validIds = new Set(positioningFacts.flatMap((fact) => fact.sourceIds));

  const systemPrompt =
    "You analyze a company's market positioning from pre-extracted facts. You must clearly separate FACT " +
    "from INTERPRETATION.\n\n" +
    "- \"facts\": things explicitly stated in the provided facts, each with sourceIds - these are claims, not your opinion.\n" +
    '- "interpretation": your own reading of what those facts imply about positioning - write it as analysis, ' +
    "not as a claim of fact (e.g. \"Positioning appears focused on...\").\n" +
    "- \"differentiators\" and \"targetCustomers\" must be explicitly supported by the facts.\n" +
    `- If there is not enough evidence, set interpretation to "${INSUFFICIENT_EVIDENCE}" and leave the arrays empty.\n` +
    `${GROUNDING_RULE}`;

  const userPrompt = `Competitor: ${input.competitor}\n\nFacts:\n${formatFactsForPrompt(positioningFacts)}`;

  const result = await parseStructured(
    analyzePositioningResponseSchema,
    "positioning_analysis",
    systemPrompt,
    userPrompt,
  );

  return {
    targetCustomers: result.targetCustomers,
    facts: sanitizeKeyFacts(result.facts, validIds),
    interpretation: result.interpretation,
    differentiators: sanitizeKeyFacts(result.differentiators, validIds),
  };
}
