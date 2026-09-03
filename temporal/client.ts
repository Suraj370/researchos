import { Connection, QueryNotRegisteredError, WorkflowClient } from "@temporalio/client";

import { RESEARCH_TASK_QUEUE } from "../lib/temporal-types";
import type { ResearchInput, ResearchStatusUpdate } from "../lib/temporal-types";
import { extractFailureMessage } from "../lib/temporal-failure";
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
    if (!(err instanceof QueryNotRegisteredError)) {
      throw err;
    }

    // The workflow hasn't registered its query handler yet (very early race),
    // or it already reached a terminal state and was evicted from the worker's
    // sticky cache before we could query it. Disambiguate via execution status.
    const researchId = workflowId.replace(/^research-/, "");
    const description = await handle.describe();

    if (description.status.name === "COMPLETED") {
      const result = await handle.result();
      return { researchId: result.researchId, status: "completed", message: result.message };
    }

    if (description.status.name !== "RUNNING" && description.status.name !== "CONTINUED_AS_NEW") {
      let message = `Workflow ${description.status.name.toLowerCase()}`;
      try {
        await handle.result();
      } catch (resultErr) {
        message = extractFailureMessage(resultErr) ?? message;
      }
      return { researchId, status: "failed", message };
    }

    return { researchId, status: "initializing", message: "Research workflow starting" };
  }
}
