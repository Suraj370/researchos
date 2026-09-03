/**
 * Canonicalizes a feature name purely for comparison-table grouping - "Payment Links",
 * "payment links", and "Create payment links" all group under one row. The
 * original display name (from analyzeFeatures) is preserved elsewhere; this
 * key is only used to decide which features are "the same" across competitors.
 */
export function normalizeFeatureKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(create|add|manage|enable|support for|support)\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/s$/, "");
}
