import type { ResearchStatusUpdate } from "@/lib/temporal-types"

export interface StartResearchResponse {
  researchId: string
  workflowId: string
}

export async function startResearch(query: string): Promise<StartResearchResponse> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Failed to start research")
  }

  return response.json()
}

export async function fetchResearchStatus(
  workflowId: string,
): Promise<ResearchStatusUpdate> {
  const response = await fetch(`/api/research/${workflowId}`)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Failed to fetch research status")
  }

  return response.json()
}
