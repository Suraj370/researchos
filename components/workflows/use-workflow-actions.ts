"use client"

import { useWorkflowStore } from "@/lib/workflow-store"
import type { Workflow } from "@/lib/types"

export function useWorkflowActions(workflow: Pick<Workflow, "id" | "status">) {
  const { setWorkflowStatus } = useWorkflowStore()

  const canPause = workflow.status === "running"
  const canResume = workflow.status === "waiting"
  const canCancel = workflow.status === "running" || workflow.status === "waiting"

  return {
    canPause,
    canResume,
    canCancel,
    pause: () => setWorkflowStatus(workflow.id, "waiting"),
    resume: () => setWorkflowStatus(workflow.id, "running"),
    cancel: () => setWorkflowStatus(workflow.id, "cancelled"),
  }
}
