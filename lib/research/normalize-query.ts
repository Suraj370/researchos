/** Normalizes a search query for duplicate-detection purposes only (not for display). */
export function normalizeQueryForDedup(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}
