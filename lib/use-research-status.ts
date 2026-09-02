"use client"

import * as React from "react"

import { fetchResearchStatus } from "@/lib/api-client"
import type { ResearchStatusUpdate } from "@/lib/temporal-types"

const POLL_INTERVAL_MS = 1500

export function useResearchStatus(workflowId: string | undefined) {
  const [status, setStatus] = React.useState<ResearchStatusUpdate | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!workflowId) {
      setStatus(null)
      setError(null)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const next = await fetchResearchStatus(workflowId as string)
        if (cancelled) return
        setStatus(next)
        setError(null)
        if (next.status !== "completed") {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch research status")
        timer = setTimeout(poll, POLL_INTERVAL_MS * 2)
      }
    }

    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [workflowId])

  return { status, error }
}
