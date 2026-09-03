import type { ResearchInput } from "../../lib/temporal-types";

export interface InitializeResearchResult {
  researchId: string;
  status: "initialized";
  message: string;
}

export async function initializeResearch(
  input: ResearchInput,
): Promise<InitializeResearchResult> {
  return {
    researchId: input.researchId,
    status: "initialized",
    message: "Research workflow initialized",
  };
}
