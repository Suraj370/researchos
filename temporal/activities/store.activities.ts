import {
  getResearchSources,
  insertResearchSources,
  updateResearchStatus,
  upsertCompetitiveComparison,
  upsertCompetitorAnalysis,
} from "../../lib/db/queries";
import { NonRetryableError } from "../lib/errors";
import type { NormalizedSource, ResearchSource } from "../../lib/temporal-types";
import type { CompetitiveComparison, CompetitorAnalysis } from "../../lib/analysis-types";

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

export async function storeCompetitiveComparison(comparison: CompetitiveComparison): Promise<void> {
  try {
    await upsertCompetitiveComparison(comparison);
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
