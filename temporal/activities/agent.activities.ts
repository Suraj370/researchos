import { z } from "zod";

import { parseStructured } from "../lib/openai-structured";
import { getResearchSources } from "../../lib/db/queries";
import { computeCoverageStats } from "../../lib/research/coverage";
import { normalizeQueryForDedup } from "../../lib/research/normalize-query";
import {
  formatCoverageStatsForPrompt,
  formatMissingAreasForPrompt,
  formatPreviousSearchesForPrompt,
} from "../../lib/research/format-agent-context";
import { AGENT_LIMITS } from "../../lib/agent-types";
import type { PlannedSearch, ResearchDecision, ResearchEvaluation, ResearchPlan } from "../../lib/agent-types";
import { RESEARCH_SEARCH_CATEGORIES } from "../../lib/temporal-types";
import type { SearchCategory } from "../../lib/temporal-types";

const GROUNDING_RULE =
  "Base every judgment only on the information explicitly provided below. Never assume evidence exists " +
  "that isn't reflected in it, and never invent competitors, facts, or coverage that wasn't given to you.";

const MAX_INITIAL_QUERIES = 20;

const plannedSearchSchema = z.object({
  competitor: z.string(),
  category: z.enum(RESEARCH_SEARCH_CATEGORIES),
  query: z.string(),
  objective: z.string(),
});

// ---------------------------------------------------------------------------
// createResearchPlan
// ---------------------------------------------------------------------------

export interface CreateResearchPlanInput {
  researchId: string;
  query: string;
  competitors: string[];
}

const researchPlanResponseSchema = z.object({
  competitors: z.array(z.string()),
  objectives: z.array(z.string()),
  searchCategories: z.array(z.enum(RESEARCH_SEARCH_CATEGORIES)),
  initialQueries: z.array(plannedSearchSchema),
});

export async function createResearchPlan(input: CreateResearchPlanInput): Promise<ResearchPlan> {
  const systemPrompt =
    `You are a competitive research planner. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    "- Only use the competitors provided - do not invent new ones or drop the ones given.\n" +
    `- searchCategories must be chosen only from: ${RESEARCH_SEARCH_CATEGORIES.join(", ")}. Prioritize the ` +
    "categories most relevant to the request; you don't have to include all of them.\n" +
    "- initialQueries should be concrete, targeted search queries, e.g. \"Notion pricing official\" - roughly " +
    "2-3 well-chosen categories per competitor, not an exhaustive grid.\n" +
    "- objectives is a short list of what this research needs to determine, based on the request.";

  const userPrompt = `Research request: ${input.query}\n\nDiscovered competitors: ${input.competitors.join(", ")}`;

  const result = await parseStructured(researchPlanResponseSchema, "research_plan", systemPrompt, userPrompt);

  const knownCompetitors = new Set(input.competitors);
  const planCompetitors = result.competitors.filter((competitor) => knownCompetitors.has(competitor));
  const competitors = planCompetitors.length > 0 ? planCompetitors : input.competitors;

  if (competitors.length === 0) {
    throw new Error("createResearchPlan produced no valid competitors");
  }

  const initialQueries = result.initialQueries
    .filter((search) => knownCompetitors.has(search.competitor))
    .slice(0, MAX_INITIAL_QUERIES);

  return {
    competitors,
    objectives: result.objectives,
    searchCategories: result.searchCategories.length > 0 ? result.searchCategories : [...RESEARCH_SEARCH_CATEGORIES],
    initialQueries,
  };
}

// ---------------------------------------------------------------------------
// decideNextSearches
// ---------------------------------------------------------------------------

export interface DecideNextSearchesInput {
  researchId: string;
  query: string;
  competitors: string[];
  categories: SearchCategory[];
  previousQueries: string[];
  missingAreas: string[];
  iteration: number;
  maxIterations: number;
}

const researchDecisionResponseSchema = z.object({
  sufficient: z.boolean(),
  reason: z.string(),
  searches: z.array(plannedSearchSchema),
  missingAreas: z.array(z.string()),
});

export async function decideNextSearches(input: DecideNextSearchesInput): Promise<ResearchDecision> {
  const sources = await getResearchSources(input.researchId);
  const uniqueQueries = new Set(input.previousQueries.map(normalizeQueryForDedup));
  const stats = computeCoverageStats({
    sources,
    competitors: input.competitors,
    categories: input.categories,
    executedSearchCount: input.previousQueries.length,
    uniqueSearchCount: uniqueQueries.size,
    maxSources: AGENT_LIMITS.MAX_SOURCES_PER_RESEARCH,
  });

  const systemPrompt =
    `You are a competitive research agent deciding what to search next. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    "- If evidence looks sufficient for a solid comparison across all competitors, set sufficient=true and searches=[].\n" +
    "- Otherwise, propose specific, targeted searches that would fill the gaps (e.g. if pricing evidence is weak " +
    'for a competitor, propose "<competitor> pricing official").\n' +
    `- category must be one of: ${RESEARCH_SEARCH_CATEGORIES.join(", ")}.\n` +
    '- Do not repeat a query already listed under "Already searched" below.\n' +
    "- Prefer official/primary sources when proposing a query.\n" +
    `- Propose at most ${AGENT_LIMITS.MAX_SEARCHES_PER_ITERATION} searches.`;

  const userPrompt =
    `Research request: ${input.query}\n` +
    `Competitors: ${input.competitors.join(", ")}\n` +
    `Iteration: ${input.iteration} of ${input.maxIterations}\n\n` +
    `Coverage so far:\n${formatCoverageStatsForPrompt(stats)}\n\n` +
    `Already searched:\n${formatPreviousSearchesForPrompt(input.previousQueries)}\n\n` +
    `Known missing areas:\n${formatMissingAreasForPrompt(input.missingAreas)}`;

  const result = await parseStructured(researchDecisionResponseSchema, "research_decision", systemPrompt, userPrompt);

  const knownCompetitors = new Set(input.competitors);

  return {
    sufficient: result.sufficient,
    reason: result.reason,
    searches: (result.searches as PlannedSearch[])
      .filter((search) => knownCompetitors.has(search.competitor))
      .slice(0, AGENT_LIMITS.MAX_SEARCHES_PER_ITERATION),
    missingAreas: result.missingAreas,
  };
}

// ---------------------------------------------------------------------------
// evaluateResearch
// ---------------------------------------------------------------------------

export interface EvaluateResearchInput {
  researchId: string;
  query: string;
  competitors: string[];
  categories: SearchCategory[];
  executedSearchCount: number;
  uniqueSearchCount: number;
  iteration: number;
}

const researchEvaluationResponseSchema = z.object({
  sufficient: z.boolean(),
  coverageScore: z.number().min(0).max(1),
  missingAreas: z.array(z.string()),
  explanation: z.string(),
});

export async function evaluateResearch(input: EvaluateResearchInput): Promise<ResearchEvaluation> {
  const sources = await getResearchSources(input.researchId);
  const stats = computeCoverageStats({
    sources,
    competitors: input.competitors,
    categories: input.categories,
    executedSearchCount: input.executedSearchCount,
    uniqueSearchCount: input.uniqueSearchCount,
    maxSources: AGENT_LIMITS.MAX_SOURCES_PER_RESEARCH,
  });

  const systemPrompt =
    `You evaluate whether competitive research evidence is sufficient. ${GROUNDING_RULE}\n\n` +
    "Rules:\n" +
    "- Judge sufficiency from the coverage stats only - a sufficient comparison needs usable evidence for " +
    "pricing and at least a couple of other categories, across ALL competitors.\n" +
    "- coverageScore is a number from 0 to 1 reflecting how complete the evidence is.\n" +
    '- missingAreas should name specific gaps, e.g. "Airtable enterprise pricing", not just "pricing".\n' +
    "- If evidence is thin for any competitor, sufficient must be false.";

  const userPrompt =
    `Research request: ${input.query}\n` +
    `Competitors: ${input.competitors.join(", ")}\n` +
    `Iteration: ${input.iteration}\n\n` +
    `Coverage stats:\n${formatCoverageStatsForPrompt(stats)}`;

  const result = await parseStructured(
    researchEvaluationResponseSchema,
    "research_evaluation",
    systemPrompt,
    userPrompt,
  );

  // Deterministic hard constraint - never trust "sufficient" if any competitor has zero sources at all,
  // regardless of what the model concluded from the (necessarily lossy) coverage summary.
  const allCompetitorsHaveEvidence = stats.competitorsResearched === stats.competitorsTotal;
  const sufficient = result.sufficient && allCompetitorsHaveEvidence && stats.usableSources > 0;

  const zeroEvidenceCompetitors = input.competitors.filter(
    (competitor) => (stats.sourcesPerCompetitor[competitor] ?? 0) === 0,
  );

  const missingAreas = sufficient
    ? []
    : Array.from(
        new Set([
          ...result.missingAreas,
          ...zeroEvidenceCompetitors.map((competitor) => `${competitor}: no evidence yet`),
        ]),
      );

  return {
    sufficient,
    coverageScore: result.coverageScore,
    missingAreas,
    explanation: result.explanation,
  };
}
