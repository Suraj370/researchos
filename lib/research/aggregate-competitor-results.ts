import type { CompetitorResearchResult, ResearchAgentOutcome } from "@/lib/agent-types";

/**
 * Pure aggregation of per-competitor child workflow outcomes into one overall
 * research outcome. Kept out of workflow code so it's unit-testable without a
 * Temporal test environment, same rationale as decideLoopContinuation.
 *
 * Rules (checked in order):
 * - every competitor failed                -> "failed"
 * - at least one failed, but not all       -> "completed_with_failures"
 * - none failed, at least one limit_reached -> "limit_reached"
 * - none failed, all completed             -> "completed"
 */
export function aggregateCompetitorOutcome(results: CompetitorResearchResult[]): ResearchAgentOutcome {
  if (results.length === 0) return "failed";

  const failed = results.filter((result) => result.status === "failed");
  if (failed.length === results.length) return "failed";
  if (failed.length > 0) return "completed_with_failures";
  if (results.some((result) => result.status === "limit_reached")) return "limit_reached";
  return "completed";
}
