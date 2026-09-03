import type { ExtractedFact } from "@/lib/analysis-types";
import type { ResearchSource } from "@/lib/temporal-types";

/** Renders sources into a compact, source-ID-tagged text block for the model's context window. */
export function formatSourcesForPrompt(sources: ResearchSource[]): string {
  if (sources.length === 0) return "(no sources)";

  return sources
    .map((source) => {
      const lines = [
        `[${source.id}] (${source.searchCategory}) ${source.title} — ${source.domain}`,
      ];
      if (source.snippet) lines.push(source.snippet);
      return lines.join("\n");
    })
    .join("\n\n");
}

/** Renders extracted facts into a compact, source-ID-tagged text block. */
export function formatFactsForPrompt(facts: ExtractedFact[]): string {
  if (facts.length === 0) return "(no facts)";

  return facts
    .map((fact) => `- [${fact.category}] ${fact.fact} (sources: ${fact.sourceIds.join(", ")})`)
    .join("\n");
}
