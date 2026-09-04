import { pgTable, text, timestamp, uuid, real, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

import type { CompetitiveComparison, CompetitorAnalysis } from "@/lib/analysis-types";
import type { CompetitorResearchResult, ResearchPlan } from "@/lib/agent-types";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const research = pgTable("research", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled research"),
  query: text("query").notNull(),
  status: text("status").notNull().default("initializing"),
  // Nullable: rows created before auth existed have no owner and are simply
  // invisible to every user's scoped queries rather than being deleted.
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  // Agent metadata (Phase 4) - all nullable, populated once the agent loop finishes.
  plan: jsonb("plan").$type<ResearchPlan>(),
  agentOutcome: text("agent_outcome"),
  iterations: integer("iterations"),
  searchesExecuted: integer("searches_executed"),
  missingAreas: jsonb("missing_areas").$type<string[]>(),
  // Phase 5A: full per-competitor child workflow breakdown, including failures -
  // durable so child-level detail isn't discarded once the parent workflow completes.
  competitorResults: jsonb("competitor_results").$type<CompetitorResearchResult[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchSources = pgTable(
  "research_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    researchId: text("research_id")
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
    competitor: text("competitor").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    snippet: text("snippet"),
    publishedDate: text("published_date"),
    relevanceScore: real("relevance_score"),
    sourceType: text("source_type").notNull().default("unknown"),
    searchCategory: text("search_category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("research_sources_research_id_url_idx").on(table.researchId, table.url)]
);

export const competitorAnalyses = pgTable(
  "competitor_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    researchId: text("research_id")
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
    competitor: text("competitor").notNull(),
    analysis: jsonb("analysis").notNull().$type<CompetitorAnalysis>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("competitor_analyses_research_id_competitor_idx").on(table.researchId, table.competitor)]
);

export const competitiveComparisons = pgTable("competitive_comparisons", {
  researchId: text("research_id")
    .primaryKey()
    .references(() => research.id, { onDelete: "cascade" }),
  comparison: jsonb("comparison").notNull().$type<CompetitiveComparison>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
