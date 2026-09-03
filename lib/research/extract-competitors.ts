/**
 * Deterministic MVP competitor extraction. No LLM involved - Phase 3 will
 * replace/augment this with GPT-4.1 nano. Keep this pure (no I/O) so it can run
 * directly in workflow code without an Activity.
 */

const EXCLUDED_TOKENS = new Set([
  "compare",
  "comparing",
  "versus",
  "vs",
  "and",
  "or",
  "for",
  "the",
  "a",
  "an",
  "as",
  "to",
  "in",
  "on",
  "of",
  "with",
  "saas",
  "startup",
  "startups",
  "company",
  "companies",
  "provider",
  "providers",
  "payment",
  "payments",
  "b2b",
  "b2c",
  "best",
  "top",
  "between",
]);

/** Extracts explicitly-named competitors from a query like "Compare Stripe, Adyen, and Paddle". */
export function extractExplicitCompetitors(query: string): string[] {
  const segments = query
    .split(/,|(?:\s+(?:and|vs\.?|versus|&)\s+)/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const competitors: string[] = [];

  for (const segment of segments) {
    const words = segment.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^A-Za-z0-9&'-]/g, "");
      if (!clean) continue;
      if (!/^[A-Z]/.test(clean)) break;

      const key = clean.toLowerCase();
      if (EXCLUDED_TOKENS.has(key)) continue;

      if (!seen.has(key)) {
        seen.add(key);
        competitors.push(clean);
      }
      break;
    }
  }

  return competitors;
}
