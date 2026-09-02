export interface ResearchInput {
  researchId: string;
  query: string;
}

export interface ResearchResult {
  researchId: string;
  status: "initialized";
  message: string;
}

export type ResearchWorkflowStatus = "initializing" | "completed";

export interface ResearchStatusUpdate {
  researchId: string;
  status: ResearchWorkflowStatus;
  message: string;
}

export const RESEARCH_TASK_QUEUE = "researchflow";
export const GET_RESEARCH_STATUS_QUERY = "getResearchStatus";
