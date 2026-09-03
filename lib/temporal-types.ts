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
  | "searching"
  | "normalizing"
  | "storing"
  | "analyzing"
  | "completed"
  | "failed";

export interface ResearchStatusUpdate {
  researchId: string;
  status: ResearchWorkflowStatus;
  message: string;
}

export interface ResearchResult {
  researchId: string;
  status: "completed" | "failed";
  message: string;
  competitors: string[];
  sourceCount: number;
  analyzedCount: number;
}

export const RESEARCH_TASK_QUEUE = "researchflow";
export const GET_RESEARCH_STATUS_QUERY = "getResearchStatus";
