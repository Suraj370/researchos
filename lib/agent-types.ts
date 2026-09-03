import type { SearchCategory } from "@/lib/temporal-types";

/** GPT-authored research plan. Categories are drawn from the existing fixed
 * SearchCategory set (reused from Phase 2/3) so downstream analysis - which
 * filters facts by these exact category values - keeps working unmodified. */
export interface ResearchPlan {
  competitors: string[];
  objectives: string[];
  searchCategories: SearchCategory[];
  initialQueries: PlannedSearch[];
}

export interface PlannedSearch {
  competitor: string;
  category: SearchCategory;
  query: string;
  objective: string;
}

export interface ResearchDecision {
  sufficient: boolean;
  reason: string;
  searches: PlannedSearch[];
  missingAreas: string[];
}

export interface ResearchEvaluation {
  sufficient: boolean;
  coverageScore: number;
  missingAreas: string[];
  explanation: string;
}

/** Deterministic coverage math - the "hard constraints" half of evaluateResearch, computed without any LLM call. */
export interface CoverageStats {
  competitorsResearched: number;
  competitorsTotal: number;
  categoriesCovered: number;
  categoriesTotal: number;
  usableSources: number;
  sourcesPerCompetitor: Record<string, number>;
  categoriesWithEvidence: Record<string, SearchCategory[]>;
  duplicateSearchCount: number;
  sourceLimitReached: boolean;
}

export type AgentPhase =
  | "planning"
  | "searching"
  | "evaluating"
  | "completed"
  | "limit_reached"
  | "failed";

/** Compact, live agent state - never holds raw page content, only counts/labels. */
export interface AgentState {
  iteration: number;
  maxIterations: number;
  phase: AgentPhase;
  searchesExecuted: number;
  sourcesCollected: number;
  currentTask: string;
  lastDecision?: string;
  missingAreas: string[];
}

export interface ResearchAgentResult {
  researchId: string;
  status: "completed" | "limit_reached";
  competitors: string[];
  sourceCount: number;
  iterations: number;
  searchesExecuted: number;
  missingAreas: string[];
}

export const AGENT_LIMITS = {
  MAX_RESEARCH_ITERATIONS: 5,
  MAX_SEARCHES_PER_ITERATION: 8,
  MAX_TOTAL_SEARCHES: 30,
  MAX_SOURCES_PER_RESEARCH: 100,
} as const;
