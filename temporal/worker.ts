import { config } from "dotenv";

config({ path: ".env.local" });

import path from "node:path";
import { fileURLToPath } from "node:url";

import { NativeConnection, Worker } from "@temporalio/worker";

import { RESEARCH_TASK_QUEUE } from "../lib/temporal-types";
import * as initActivities from "./activities/research.activities";
import * as competitorActivities from "./activities/competitors.activities";
import * as exaActivities from "./activities/exa.activities";
import * as normalizeActivities from "./activities/normalize.activities";
import * as storeActivities from "./activities/store.activities";
import * as analysisActivities from "./activities/analysis.activities";

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
    activities: {
      ...initActivities,
      ...competitorActivities,
      ...exaActivities,
      ...normalizeActivities,
      ...storeActivities,
      ...analysisActivities,
    },
  });

  console.log(`Temporal worker started, listening on task queue "${RESEARCH_TASK_QUEUE}"`);

  if (!process.env.EXA_API_KEY) {
    console.warn("EXA_API_KEY is not set - research workflows will fail until it's added to .env.local");
  }
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set - research workflows will fail until it's added to .env.local");
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set - the analysis phase will fail until it's added to .env.local");
  }

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
