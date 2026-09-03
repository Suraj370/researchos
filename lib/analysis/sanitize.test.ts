import { describe, expect, it } from "vitest";

import { sanitizeKeyFacts, sanitizeSourceIds } from "./sanitize";

describe("sanitizeSourceIds", () => {
  it("keeps only sourceIds present in the valid set", () => {
    const validIds = new Set(["a", "b"]);
    expect(sanitizeSourceIds(["a", "c", "b"], validIds)).toEqual(["a", "b"]);
  });

  it("dedupes repeated ids", () => {
    const validIds = new Set(["a"]);
    expect(sanitizeSourceIds(["a", "a"], validIds)).toEqual(["a"]);
  });

  it("returns an empty array when nothing is valid (hallucinated ids)", () => {
    const validIds = new Set(["a"]);
    expect(sanitizeSourceIds(["x", "y"], validIds)).toEqual([]);
  });
});

describe("sanitizeKeyFacts", () => {
  it("drops facts whose sourceIds all get sanitized away", () => {
    const validIds = new Set(["a"]);
    const facts = [
      { fact: "supported", sourceIds: ["a"] },
      { fact: "hallucinated", sourceIds: ["z"] },
    ];
    expect(sanitizeKeyFacts(facts, validIds)).toEqual([{ fact: "supported", sourceIds: ["a"] }]);
  });
});
