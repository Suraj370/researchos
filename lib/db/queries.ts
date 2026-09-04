import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "./client";
import { competitiveComparisons, competitorAnalyses, research, researchSources } from "./schema";
import type {
  NormalizedSource,
  ResearchRecord,
  ResearchSource,
  ResearchWorkflowStatus,
  SourceType,
} from "@/lib/temporal-types";
import type { CompetitiveComparison, CompetitorAnalysis } from "@/lib/analysis-types";
import type { CompetitorResearchResult, ResearchAgentOutcome, ResearchPlan } from "@/lib/agent-types";

export async function createResearchRecord(input: {
  id: string;
  title: string;
  query: string;
  userId: string;
}): Promise<void> {
  const db = getDb();
  await db
    .insert(research)
    .values({ id: input.id, title: input.title, query: input.query, userId: input.userId })
    .onConflictDoNothing();
}

/** The given user's research records, newest first, with each one's stored source count. */
export async function listResearch(userId: string): Promise<ResearchRecord[]> {
  const db = getDb();

  const [records, sourceCounts] = await Promise.all([
    db.select().from(research).where(eq(research.userId, userId)).orderBy(desc(research.createdAt)),
    db
      .select({
        researchId: researchSources.researchId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(researchSources)
      .groupBy(researchSources.researchId),
  ]);

  const countByResearchId = new Map(sourceCounts.map((row) => [row.researchId, row.count]));

  return records.map((row) => ({
    id: row.id,
    title: row.title,
    query: row.query,
    status: row.status as ResearchWorkflowStatus,
    sourcesCount: countByResearchId.get(row.id) ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/**
 * The owning user's id for a research record, or null if it exists but is
 * unowned (pre-auth legacy data), or undefined if no such record exists.
 * Used to authorize access before returning any research-scoped data.
 */
export async function getResearchOwnerId(id: string): Promise<string | null | undefined> {
  const db = getDb();
  const [row] = await db.select({ userId: research.userId }).from(research).where(eq(research.id, id)).limit(1);
  return row ? row.userId : undefined;
}

export async function updateResearchStatus(id: string, status: string): Promise<void> {
  const db = getDb();
  await db.update(research).set({ status, updatedAt: new Date() }).where(eq(research.id, id));
}

export async function saveResearchPlan(id: string, plan: ResearchPlan): Promise<void> {
  const db = getDb();
  await db.update(research).set({ plan, updatedAt: new Date() }).where(eq(research.id, id));
}

export interface AgentSummary {
  outcome: ResearchAgentOutcome;
  iterations: number;
  searchesExecuted: number;
  missingAreas: string[];
}

/** Persists the agent loop's final outcome alongside the terminal status - reuses the research table, no new model. */
export async function saveAgentSummary(id: string, summary: AgentSummary): Promise<void> {
  const db = getDb();
  await db
    .update(research)
    .set({
      agentOutcome: summary.outcome,
      iterations: summary.iterations,
      searchesExecuted: summary.searchesExecuted,
      missingAreas: summary.missingAreas,
      updatedAt: new Date(),
    })
    .where(eq(research.id, id));
}

/** Full per-competitor breakdown (including failures) - preserved durably so child-level detail isn't discarded once the workflow completes. */
export async function saveCompetitorResults(id: string, results: CompetitorResearchResult[]): Promise<void> {
  const db = getDb();
  await db.update(research).set({ competitorResults: results, updatedAt: new Date() }).where(eq(research.id, id));
}

/** Inserts normalized sources, skipping any that already exist for this research (research_id, url). Returns the number of newly-stored rows. */
export async function insertResearchSources(sources: NormalizedSource[]): Promise<number> {
  if (sources.length === 0) return 0;

  const db = getDb();
  const rows = await db
    .insert(researchSources)
    .values(sources)
    .onConflictDoNothing({
      target: [researchSources.researchId, researchSources.url],
    })
    .returning({ id: researchSources.id });

  return rows.length;
}

export interface GetResearchSourcesFilters {
  competitor?: string;
  category?: string;
}

export async function getResearchSources(
  researchId: string,
  filters: GetResearchSourcesFilters = {}
): Promise<ResearchSource[]> {
  const db = getDb();
  const conditions = [eq(researchSources.researchId, researchId)];
  if (filters.competitor) conditions.push(eq(researchSources.competitor, filters.competitor));
  if (filters.category) conditions.push(eq(researchSources.searchCategory, filters.category));

  const rows = await db
    .select()
    .from(researchSources)
    .where(and(...conditions))
    .orderBy(desc(researchSources.relevanceScore));

  return rows.map((row) => ({
    id: row.id,
    researchId: row.researchId,
    competitor: row.competitor,
    title: row.title,
    url: row.url,
    domain: row.domain,
    snippet: row.snippet ?? undefined,
    publishedDate: row.publishedDate ?? undefined,
    relevanceScore: row.relevanceScore ?? undefined,
    sourceType: row.sourceType as SourceType,
    searchCategory: row.searchCategory as ResearchSource["searchCategory"],
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Upserts one competitor's analysis (research_id, competitor) is unique - re-runs replace the old analysis. */
export async function upsertCompetitorAnalysis(analysis: CompetitorAnalysis): Promise<void> {
  const db = getDb();
  await db
    .insert(competitorAnalyses)
    .values({
      researchId: analysis.researchId,
      competitor: analysis.competitor,
      analysis,
    })
    .onConflictDoUpdate({
      target: [competitorAnalyses.researchId, competitorAnalyses.competitor],
      set: { analysis, updatedAt: new Date() },
    });
}

export async function getCompetitorAnalyses(researchId: string): Promise<CompetitorAnalysis[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(competitorAnalyses)
    .where(eq(competitorAnalyses.researchId, researchId));

  return rows.map((row) => row.analysis);
}

export async function upsertCompetitiveComparison(comparison: CompetitiveComparison): Promise<void> {
  const db = getDb();
  await db
    .insert(competitiveComparisons)
    .values({ researchId: comparison.researchId, comparison })
    .onConflictDoUpdate({
      target: competitiveComparisons.researchId,
      set: { comparison, updatedAt: new Date() },
    });
}

export async function getCompetitiveComparison(researchId: string): Promise<CompetitiveComparison | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(competitiveComparisons)
    .where(eq(competitiveComparisons.researchId, researchId))
    .limit(1);

  return row?.comparison ?? null;
}
