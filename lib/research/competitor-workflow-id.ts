/**
 * Deterministic slug for a competitor name - used only to build a Temporal
 * child workflow ID, never for display. No randomness, safe for workflow code.
 */
export function slugifyCompetitor(competitor: string): string {
  const slug = competitor
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "competitor";
}

/**
 * Deterministic child workflow ID for one competitor's research within a research
 * request - same (researchId, competitor) always produces the same ID, preventing
 * accidental duplicate child workflows on retry/replay.
 */
export function buildCompetitorWorkflowId(researchId: string, competitor: string): string {
  return `research-${researchId}-competitor-${slugifyCompetitor(competitor)}`;
}
