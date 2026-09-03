"use client"

import { useParams } from "next/navigation"

import { LinkButton } from "@/components/ui/button"
import { WorkflowDetail } from "@/components/workflows/workflow-detail"
import { useWorkflow, useWorkflowStore } from "@/lib/workflow-store"

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>()
  const workflow = useWorkflow(params.id)
  const { isLoading } = useWorkflowStore()

  if (!workflow && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground">Loading workflow…</p>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-sm font-medium">Workflow not found</p>
        <p className="text-sm text-muted-foreground">
          This workflow may have been removed.
        </p>
        <LinkButton href="/workflows" variant="outline" size="sm">
          Back to workflows
        </LinkButton>
      </div>
    )
  }

  return <WorkflowDetail workflow={workflow} />
}
