/**
 * Defense against citation hallucination: a small/cheap model can cite a
 * sourceId that was never in its context. Every activity runs its model
 * output through this before returning, so "traceable to source IDs" is
 * actually guaranteed, not just prompted for.
 */
export function sanitizeSourceIds(sourceIds: string[], validIds: ReadonlySet<string>): string[] {
  return Array.from(new Set(sourceIds.filter((id) => validIds.has(id))));
}

export function sanitizeKeyFacts<T extends { sourceIds: string[] }>(
  facts: T[],
  validIds: ReadonlySet<string>
): T[] {
  return facts
    .map((fact) => ({ ...fact, sourceIds: sanitizeSourceIds(fact.sourceIds, validIds) }))
    .filter((fact) => fact.sourceIds.length > 0);
}
