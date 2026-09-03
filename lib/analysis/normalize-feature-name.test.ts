import { describe, expect, it } from "vitest";

import { normalizeFeatureKey } from "./normalize-feature-name";

describe("normalizeFeatureKey", () => {
  it("groups differently-cased and differently-phrased names together", () => {
    const key = normalizeFeatureKey("Payment Links");
    expect(normalizeFeatureKey("payment links")).toBe(key);
    expect(normalizeFeatureKey("Create payment links")).toBe(key);
  });

  it("treats unrelated feature names as different", () => {
    expect(normalizeFeatureKey("Payment Links")).not.toBe(normalizeFeatureKey("Subscription Billing"));
  });
});
