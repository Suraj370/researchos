import { PHASE_STEPS } from "@/lib/workflow-phases"
import { formatRelativeTime } from "@/lib/format-relative-time"
import type { ResearchRecord } from "@/lib/temporal-types"
import type { Workflow, WorkflowStatus } from "@/lib/types"

/** Adapts a Postgres-backed research record into the shape the existing (mock-data-era) UI expects. */
export function adaptResearchRecord(record: ResearchRecord): Workflow {
  const isCompleted = record.status === "completed"
  const isFailed = record.status === "failed"
  const status: WorkflowStatus = isCompleted ? "completed" : isFailed ? "failed" : "running"

  return {
    id: record.id,
    title: record.title,
    objective: record.query,
    researchId: record.id,
    status,
    sourcesCount: record.sourcesCount,
    startedLabel: formatRelativeTime(new Date(record.createdAt)),
    durationLabel: "—",
    progress: isCompleted ? 100 : isFailed ? 0 : 50,
    // A completed run genuinely passed through every phase. A failed run's
    // per-phase history isn't retained once terminal, so leave steps neutral
    // rather than falsely claiming success - the live status line still
    // surfaces the real failure reason from Temporal when the page is open.
    steps: PHASE_STEPS.map((phase) => ({
      id: phase.id,
      name: phase.name,
      status: isCompleted ? "completed" : "pending",
    })),
    activities: [],
    sources: [],
    agentActivity: undefined,
  }
}
