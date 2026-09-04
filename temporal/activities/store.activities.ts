import {
  getCompetitorAnalyses,
  getResearchSources,
  insertResearchSources,
  saveAgentSummary,
  saveCompetitorResults,
  saveResearchPlan,
  updateResearchStatus,
  upsertCompetitiveComparison,
  upsertCompetitorAnalysis,
} from "../../lib/db/queries";
import type { AgentSummary } from "../../lib/db/queries";
import { NonRetryableError } from "../lib/errors";
import type { NormalizedSource, ResearchSource } from "../../lib/temporal-types";
import type { CompetitiveComparison, CompetitorAnalysis } from "../../lib/analysis-types";
import type { CompetitorResearchResult, ResearchPlan } from "../../lib/agent-types";

function wrapDbError(err: unknown): never {
  if (err instanceof Error && /DATABASE_URL/.test(err.message)) {
    throw new NonRetryableError(err.message);
  }
  throw err;
}

export interface StoreResearchResultsInput {
  researchId: string;
  sources: NormalizedSource[];
}

export interface StoreResearchResultsResult {
  storedCount: number;
}

/** Persists normalized sources. The only Activities in this file are what write to Postgres. */
export async function storeResearchResults(
  input: StoreResearchResultsInput,
): Promise<StoreResearchResultsResult> {
  try {
    const storedCount = await insertResearchSources(input.sources);
    return { storedCount };
  } catch (err) {
    wrapDbError(err);
  }
}

export async function getStoredSources(input: { researchId: string }): Promise<ResearchSource[]> {
  try {
    return await getResearchSources(input.researchId);
  } catch (err) {
    wrapDbError(err);
  }
}

export async function storeCompetitorAnalysis(analysis: CompetitorAnalysis): Promise<void> {
  try {
    await upsertCompetitorAnalysis(analysis);
  } catch (err) {
    wrapDbError(err);
  }
}

/** Reads back every competitor analysis stored so far for a research - used by the parent to build the comparison once all child workflows have finished. */
export async function getStoredCompetitorAnalyses(input: { researchId: string }): Promise<CompetitorAnalysis[]> {
  try {
    return await getCompetitorAnalyses(input.researchId);
  } catch (err) {
    wrapDbError(err);
  }
}

export async function storeCompetitorResults(input: {
  researchId: string;
  results: CompetitorResearchResult[];
}): Promise<void> {
  try {
    await saveCompetitorResults(input.researchId, input.results);
  } catch (err) {
    wrapDbError(err);
  }
}

export async function storeCompetitiveComparison(comparison: CompetitiveComparison): Promise<void> {
  try {
    await upsertCompetitiveComparison(comparison);
  } catch (err) {
    wrapDbError(err);
  }
}

export async function storeResearchPlan(input: { researchId: string; plan: ResearchPlan }): Promise<void> {
  try {
    await saveResearchPlan(input.researchId, input.plan);
  } catch (err) {
    wrapDbError(err);
  }
}

export async function storeAgentSummary(input: { researchId: string; summary: AgentSummary }): Promise<void> {
  try {
    await saveAgentSummary(input.researchId, input.summary);
  } catch (err) {
    wrapDbError(err);
  }
}

export async function completeResearch(input: { researchId: string }): Promise<void> {
  await updateResearchStatus(input.researchId, "completed");
}

export async function markResearchFailed(input: { researchId: string }): Promise<void> {
  await updateResearchStatus(input.researchId, "failed").catch(() => {
    // Best-effort - the workflow already knows it failed and will surface that via its status query.
  });
}
