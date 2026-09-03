import { describe, expect, it } from "vitest";

import { decideLoopContinuation } from "./agent-loop";

const BASE = {
  iteration: 1,
  maxIterations: 5,
  sufficient: false,
  totalSearches: 5,
  maxTotalSearches: 30,
  sourcesCollected: 10,
  maxSources: 100,
};

describe("decideLoopContinuation", () => {
  it("stops as completed when the agent judges evidence sufficient", () => {
    expect(decideLoopContinuation({ ...BASE, sufficient: true })).toEqual({
      stop: true,
      outcome: "completed",
    });
  });

  it("keeps going when nothing is sufficient and no limit is hit", () => {
    expect(decideLoopContinuation(BASE)).toEqual({ stop: false, outcome: null });
  });

  it("stops as limit_reached at the max iteration count", () => {
    expect(decideLoopContinuation({ ...BASE, iteration: 5, maxIterations: 5 })).toEqual({
      stop: true,
      outcome: "limit_reached",
    });
  });

  it("stops as limit_reached once the total search budget is exhausted", () => {
    expect(decideLoopContinuation({ ...BASE, totalSearches: 30, maxTotalSearches: 30 })).toEqual({
      stop: true,
      outcome: "limit_reached",
    });
  });

  it("stops as limit_reached once the source cap is reached", () => {
    expect(decideLoopContinuation({ ...BASE, sourcesCollected: 100, maxSources: 100 })).toEqual({
      stop: true,
      outcome: "limit_reached",
    });
  });

  it("prefers completed over limit_reached when both would technically apply", () => {
    expect(
      decideLoopContinuation({ ...BASE, sufficient: true, iteration: 5, maxIterations: 5 }),
    ).toEqual({ stop: true, outcome: "completed" });
  });
});
