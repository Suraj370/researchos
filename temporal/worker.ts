import path from "node:path";
import { fileURLToPath } from "node:url";

import { NativeConnection, Worker } from "@temporalio/worker";

import { RESEARCH_TASK_QUEUE } from "../lib/temporal-types";
import * as activities from "./activities/research.activities";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const connection = await NativeConnection.connect({
    address: "localhost:7233",
  });

  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: RESEARCH_TASK_QUEUE,
    workflowsPath: path.join(__dirname, "workflows", "research.workflow.ts"),
    activities,
  });

  console.log(`Temporal worker started, listening on task queue "${RESEARCH_TASK_QUEUE}"`);

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
