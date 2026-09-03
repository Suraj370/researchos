"use client"

import * as React from "react"

import { fetchResearchStatus } from "@/lib/api-client"
import type { ResearchStatusUpdate } from "@/lib/temporal-types"

const POLL_INTERVAL_MS = 1500

const TERMINAL_STATUSES = new Set(["completed", "failed"])

export function useResearchStatus(researchId: string | undefined) {
  const [status, setStatus] = React.useState<ResearchStatusUpdate | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!researchId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const next = await fetchResearchStatus(researchId as string)
        if (cancelled) return
        setStatus(next)
        setError(null)
        if (!TERMINAL_STATUSES.has(next.status)) {
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
  }, [researchId])

  return { status, error }
}
