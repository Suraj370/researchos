import { Connection, QueryNotRegisteredError, WorkflowClient } from "@temporalio/client";

import { RESEARCH_TASK_QUEUE } from "../lib/temporal-types";
import type { ResearchInput, ResearchStatusUpdate } from "../lib/temporal-types";
import {
  getResearchStatusQuery,
  researchWorkflow,
} from "./workflows/research.workflow";

let clientPromise: Promise<WorkflowClient> | null = null;

async function getClient(): Promise<WorkflowClient> {
  if (!clientPromise) {
    clientPromise = Connection.connect({ address: "localhost:7233" }).then(
      (connection) => new WorkflowClient({ connection, namespace: "default" }),
    );
  }
  return clientPromise;
}

export async function startResearchWorkflow(
  input: ResearchInput,
): Promise<{ workflowId: string }> {
  const client = await getClient();

  const workflowId = `research-${input.researchId}`;

  await client.start(researchWorkflow, {
    taskQueue: RESEARCH_TASK_QUEUE,
    workflowId,
    args: [input],
  });

  return { workflowId };
}

export async function getResearchStatus(
  workflowId: string,
): Promise<ResearchStatusUpdate> {
  const client = await getClient();
  const handle = client.getHandle(workflowId);

  try {
    return await handle.query(getResearchStatusQuery);
  } catch (err) {
    if (err instanceof QueryNotRegisteredError) {
      // The workflow hasn't registered its query handler yet (very early race),
      // or it already completed and was evicted from the worker's sticky cache
      // before we could query it. Disambiguate via the execution status.
      const description = await handle.describe();
      if (description.status.name === "COMPLETED") {
        const result = await handle.result();
        return {
          researchId: result.researchId,
          status: "completed",
          message: result.message,
        };
      }

      return {
        researchId: workflowId.replace(/^research-/, ""),
        status: "initializing",
        message: "Research workflow starting",
      };
    }
    throw err;
  }
}
