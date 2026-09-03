import { normalizeQueryForDedup } from "./normalize-query";
import type { PlannedSearch } from "@/lib/agent-types";

/**
 * Drops any proposed search whose normalized query was already executed
 * (this run) or appears more than once in the same proposed batch.
 */
export function dedupeSearches(
  proposed: PlannedSearch[],
  alreadyExecuted: ReadonlySet<string>
): PlannedSearch[] {
  const seen = new Set<string>();
  const result: PlannedSearch[] = [];

  for (const search of proposed) {
    const key = normalizeQueryForDedup(search.query);
    if (!key || alreadyExecuted.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(search);
  }

  return result;
}

/** Caps a batch of searches to the per-iteration limit and whatever budget remains overall. */
export function capSearches(
  searches: PlannedSearch[],
  maxPerIteration: number,
  remainingBudget: number
): PlannedSearch[] {
  const limit = Math.max(0, Math.min(maxPerIteration, remainingBudget));
  return searches.slice(0, limit);
}
