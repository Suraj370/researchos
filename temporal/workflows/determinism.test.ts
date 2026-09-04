import { describe, expect, it } from "vitest";
import { bundleWorkflowCode } from "@temporalio/worker";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundles the real worker entry point (both researchAgentWorkflow and the
 * Phase 5A competitorResearchWorkflow) exactly as worker.ts does. Temporal's
 * webpack-based bundler targets the workflow sandbox, which does not shim
 * Node-only modules (fs, pg, the openai/exa-js clients, etc.) - so this fails
 * loudly if workflow code (directly or via a transitive import) ever pulls in
 * a non-deterministic or I/O-performing module that belongs in an Activity
 * instead. It does not catch every possible determinism violation (e.g. a
 * bare Math.random() call using only globals still bundles fine and is only
 * caught at runtime by the workflow sandbox), but it is a fast, real check on
 * every import in the module graph.
 */
describe("workflow bundle determinism", () => {
  it("bundles the worker's workflow entry point without pulling in non-workflow-safe modules", async () => {
    await expect(
      bundleWorkflowCode({
        workflowsPath: path.join(__dirname, "index.ts"),
      }),
    ).resolves.toBeDefined();
  }, 30_000);
});
