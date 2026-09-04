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

// ---------------------------------------------------------------------------
// Phase 5A - per-competitor child workflow
// ---------------------------------------------------------------------------

/** Input to competitorResearchWorkflow - only what one competitor's research needs, nothing cross-competitor. */
export interface CompetitorResearchInput {
  researchId: string;
  competitor: string;
  researchRequest: string;
  objectives: string[];
  searchCategories: SearchCategory[];
  /** This competitor's slice of the parent's plan.initialQueries - seeds the child's first search round. */
  initialQueries: PlannedSearch[];
}

/**
 * Outcome of one competitor's research. "failed" is only ever set by the parent
 * after catching a child workflow failure - the child itself never returns
 * "failed", it lets unrecoverable errors propagate so Temporal records a real
 * workflow failure (see competitor-research.workflow.ts).
 */
export type CompetitorResearchStatus = "completed" | "limit_reached" | "failed";

export interface CompetitorResearchResult {
  researchId: string;
  competitor: string;
  status: CompetitorResearchStatus;
  sourceCount: number;
  iterations: number;
  searchesExecuted: number;
  missingAreas: string[];
  analysisCompleted: boolean;
  error?: string;
}

/** Live per-competitor status query result for competitorResearchWorkflow - reuses AgentState rather than a parallel model. */
export interface CompetitorResearchStatusUpdate {
  researchId: string;
  competitor: string;
  agent: AgentState;
}

/** What the parent can honestly know about a competitor without signals: its last-settled state, not live intra-run phase. */
export type CompetitorProgressStatus = "pending" | "researching" | "completed" | "limit_reached" | "failed";

export interface CompetitorProgress {
  competitor: string;
  status: CompetitorProgressStatus;
  sourceCount: number;
}

/**
 * Overall research outcome once every competitor's child workflow has settled.
 * Distinct from the Temporal workflow's own execution status (which stays
 * "completed" even here - the parent workflow itself never fails just because
 * a competitor did; that isolation is the point of Phase 5A).
 */
export type ResearchAgentOutcome = "completed" | "completed_with_failures" | "limit_reached" | "failed";
