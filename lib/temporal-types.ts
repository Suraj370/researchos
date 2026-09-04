import type { AgentState, CompetitorProgress, ResearchAgentOutcome } from "./agent-types";

export interface ResearchInput {
  researchId: string;
  query: string;
}

/** A research record as read back from the database (list view). */
export interface ResearchRecord {
  id: string;
  title: string;
  query: string;
  status: ResearchWorkflowStatus;
  sourcesCount: number;
  createdAt: string;
  updatedAt: string;
}

export const RESEARCH_SEARCH_CATEGORIES = [
  "pricing",
  "features",
  "products",
  "customers",
  "positioning",
] as const;

export type SearchCategory = (typeof RESEARCH_SEARCH_CATEGORIES)[number];

export type SourceType = "primary" | "secondary" | "unknown";

/** A source as normalized from an Exa search result, before it has been stored. */
export interface NormalizedSource {
  researchId: string;
  competitor: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  publishedDate?: string;
  relevanceScore?: number;
  sourceType: SourceType;
  searchCategory: SearchCategory;
}

/** A source as read back from the database. */
export interface ResearchSource extends NormalizedSource {
  id: string;
  createdAt: string;
}

export type ResearchWorkflowStatus =
  | "initializing"
  | "planning"
  | "searching"
  | "evaluating"
  | "normalizing"
  | "storing"
  | "analyzing"
  | "completed"
  | "failed";

/** Real, phase-appropriate progress counts (e.g. "12 of 45 searches", "45 of 45 sources stored"). */
export interface ResearchStatusProgress {
  label: string;
  completed: number;
  total: number;
}

export interface ResearchStatusUpdate {
  researchId: string;
  status: ResearchWorkflowStatus;
  message: string;
  progress?: ResearchStatusProgress;
  agent?: AgentState;
  /** Per-competitor last-settled progress once parallel child research has started. */
  competitors?: CompetitorProgress[];
}

export interface ResearchResult {
  researchId: string;
  status: "completed" | "failed";
  message: string;
  competitors: string[];
  sourceCount: number;
  analyzedCount: number;
  agent?: {
    outcome: ResearchAgentOutcome;
    iterations: number;
    searchesExecuted: number;
    missingAreas: string[];
  };
}

export const RESEARCH_TASK_QUEUE = "researchflow";
export const GET_RESEARCH_STATUS_QUERY = "getResearchStatus";
