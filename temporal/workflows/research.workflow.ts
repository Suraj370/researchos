import { defineQuery, proxyActivities, setHandler } from "@temporalio/workflow";

import {
  GET_RESEARCH_STATUS_QUERY,
} from "../../lib/temporal-types";
import type {
  ResearchInput,
  ResearchResult,
  ResearchStatusUpdate,
} from "../../lib/temporal-types";
import type * as activities from "../activities/research.activities";

const { initializeResearch } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 3,
  },
});

export const getResearchStatusQuery = defineQuery<ResearchStatusUpdate>(
  GET_RESEARCH_STATUS_QUERY,
);

export async function researchWorkflow(
  input: ResearchInput,
): Promise<ResearchResult> {
  let status: ResearchStatusUpdate = {
    researchId: input.researchId,
    status: "initializing",
    message: "Research workflow starting",
  };

  setHandler(getResearchStatusQuery, () => status);

  const result = await initializeResearch(input);

  status = {
    researchId: result.researchId,
    status: "completed",
    message: result.message,
  };

  return result;
}
