import type { ResearchInput, ResearchResult } from "../../lib/temporal-types";

export async function initializeResearch(
  input: ResearchInput,
): Promise<ResearchResult> {
  return {
    researchId: input.researchId,
    status: "initialized",
    message: "Research workflow initialized",
  };
}
