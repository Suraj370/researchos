import { normalizeSources as normalize } from "../../lib/research/normalize-sources";
import type { SourceToNormalize } from "../../lib/research/normalize-sources";
import type { NormalizedSource } from "../../lib/temporal-types";

export interface NormalizeSourcesInput {
  researchId: string;
  batches: SourceToNormalize[];
}

/** Converts raw Exa results into our internal source format and dedupes by URL. Pure/CPU-only, but kept as an Activity per the architecture. */
export async function normalizeSources(input: NormalizeSourcesInput): Promise<NormalizedSource[]> {
  return normalize(input.researchId, input.batches);
}
