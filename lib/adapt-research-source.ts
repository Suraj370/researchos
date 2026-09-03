import type { ResearchSource as TemporalResearchSource } from "@/lib/temporal-types"
import type { ResearchSource as MockResearchSource, SourceType } from "@/lib/types"

const SOURCE_TYPE_MAP: Record<TemporalResearchSource["sourceType"], SourceType> = {
  primary: "primary",
  secondary: "secondary",
  unknown: "reference",
}

/** Adapts a real, DB-backed research source into the shape the existing (mock-data-era) SourceTable UI expects. */
export function adaptResearchSource(source: TemporalResearchSource): MockResearchSource {
  return {
    id: source.id,
    title: source.title,
    domain: source.domain,
    type: SOURCE_TYPE_MAP[source.sourceType],
    relevance: Math.round((source.relevanceScore ?? 0) * 100),
    status: "analyzed",
    addedAt: new Date(source.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }
}
