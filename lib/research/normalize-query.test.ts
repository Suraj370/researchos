import { describe, expect, it } from "vitest";

import { normalizeQueryForDedup } from "./normalize-query";

describe("normalizeQueryForDedup", () => {
  it("treats differently-cased and differently-spaced queries as equal", () => {
    const key = normalizeQueryForDedup("Notion Pricing Official");
    expect(normalizeQueryForDedup("notion pricing official")).toBe(key);
    expect(normalizeQueryForDedup("  Notion   pricing   official  ")).toBe(key);
  });

  it("treats different queries as different", () => {
    expect(normalizeQueryForDedup("Notion pricing")).not.toBe(normalizeQueryForDedup("Airtable pricing"));
  });
});
