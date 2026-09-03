"use client"

import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { LinkButton } from "@/components/ui/button"
import { WorkflowTable } from "@/components/workflows/workflow-table"
import { useWorkflowStore } from "@/lib/workflow-store"

export function RecentWorkflows() {
  const { workflows, isLoading } = useWorkflowStore()

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Recent workflows</CardTitle>
        <CardAction>
          <LinkButton href="/workflows" variant="outline" size="sm">
            View all
          </LinkButton>
        </CardAction>
      </CardHeader>
      <WorkflowTable workflows={workflows.slice(0, 4)} isLoading={isLoading} />
    </Card>
  )
}
