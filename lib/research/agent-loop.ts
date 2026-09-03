export interface LoopContinuationInput {
  iteration: number;
  maxIterations: number;
  sufficient: boolean;
  totalSearches: number;
  maxTotalSearches: number;
  sourcesCollected: number;
  maxSources: number;
}

export interface LoopContinuationDecision {
  stop: boolean;
  outcome: "completed" | "limit_reached" | null;
}

/**
 * Pure control-flow decision for the agent loop - deliberately kept out of
 * workflow code so it's unit-testable without a Temporal test environment.
 * The workflow just calls this after each evaluation round.
 */
export function decideLoopContinuation(input: LoopContinuationInput): LoopContinuationDecision {
  if (input.sufficient) return { stop: true, outcome: "completed" };
  if (input.totalSearches >= input.maxTotalSearches) return { stop: true, outcome: "limit_reached" };
  if (input.sourcesCollected >= input.maxSources) return { stop: true, outcome: "limit_reached" };
  if (input.iteration >= input.maxIterations) return { stop: true, outcome: "limit_reached" };
  return { stop: false, outcome: null };
}
