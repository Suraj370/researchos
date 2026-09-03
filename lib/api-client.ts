import { orpc } from "@/lib/orpc-client"
import type { ResearchRecord, ResearchSource, ResearchStatusUpdate } from "@/lib/temporal-types"
import type { CompetitiveComparison, CompetitorAnalysis } from "@/lib/analysis-types"

export interface StartResearchResponse {
  researchId: string
  workflowId: string
}

export async function startResearch(title: string, query: string): Promise<StartResearchResponse> {
  return orpc.research.create({ title, query })
}

export async function fetchResearchList(): Promise<ResearchRecord[]> {
  return orpc.research.list()
}

export async function fetchResearchStatus(researchId: string): Promise<ResearchStatusUpdate> {
  return orpc.research.getStatus({ id: researchId })
}

export async function fetchResearchSources(researchId: string): Promise<ResearchSource[]> {
  return orpc.research.getSources({ id: researchId })
}

export interface ResearchAnalysisResponse {
  analyses: CompetitorAnalysis[]
  comparison: CompetitiveComparison | null
}

export async function fetchResearchAnalysis(researchId: string): Promise<ResearchAnalysisResponse> {
  return orpc.research.getAnalysis({ id: researchId })
}
