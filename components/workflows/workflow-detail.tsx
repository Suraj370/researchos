"use client"

import * as React from "react"
import { ArrowLeft, Pause, Play, XCircle } from "lucide-react"

import { Button, LinkButton } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityLog } from "@/components/workflows/activity-log"
import { AgentActivityPanel } from "@/components/workflows/agent-activity-panel"
import { StatusBadge } from "@/components/workflows/workflow-status"
import { WorkflowProgress } from "@/components/workflows/workflow-progress"
import { WorkflowTimeline } from "@/components/workflows/workflow-timeline"
import { useWorkflowActions } from "@/components/workflows/use-workflow-actions"
import { SourceTable } from "@/components/sources/source-table"
import { useResearchStatus } from "@/lib/use-research-status"
import { useWorkflowStore } from "@/lib/workflow-store"
import type { Workflow } from "@/lib/types"

export function WorkflowDetail({ workflow }: { workflow: Workflow }) {
  const { canPause, canResume, canCancel, pause, resume, cancel } =
    useWorkflowActions(workflow)
  const { completeWorkflow } = useWorkflowStore()
  const { status: temporalStatus, error: temporalError } = useResearchStatus(
    workflow.temporalWorkflowId
  )

  React.useEffect(() => {
    if (temporalStatus?.status === "completed" && workflow.status !== "completed") {
      completeWorkflow(workflow.id, temporalStatus.message)
    }
  }, [temporalStatus, workflow.id, workflow.status, completeWorkflow])

  const completedSteps = workflow.steps.filter(
    (step) => step.status === "completed"
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LinkButton href="/workflows" variant="ghost" size="icon-sm">
              <ArrowLeft />
              <span className="sr-only">Back to workflows</span>
            </LinkButton>
            <h1 className="font-heading text-xl font-semibold tracking-wide uppercase">
              {workflow.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 pl-1">
            <div>
              <p className="text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                Workflow ID
              </p>
              <p className="font-mono text-sm">{workflow.id}</p>
            </div>
            <StatusBadge status={workflow.status} />
          </div>
          {workflow.temporalWorkflowId && (
            <p className="pl-1 font-mono text-xs text-muted-foreground">
              Temporal:{" "}
              {temporalError
                ? temporalError
                : (temporalStatus?.message ?? "Connecting…")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canPause && (
            <Button variant="outline" size="sm" onPress={pause}>
              <Pause data-icon="inline-start" />
              Pause
            </Button>
          )}
          {canResume && (
            <Button variant="outline" size="sm" onPress={resume}>
              <Play data-icon="inline-start" />
              Resume
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" size="sm" onPress={cancel}>
              <XCircle data-icon="inline-start" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <WorkflowProgress
            progress={workflow.progress}
            completedSteps={completedSteps}
            totalSteps={workflow.steps.length}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs defaultSelectedKey="timeline">
          <TabsList variant="line" aria-label="Workflow detail sections">
            <TabsTrigger id="timeline">Timeline</TabsTrigger>
            <TabsTrigger id="activity">Activity log</TabsTrigger>
            <TabsTrigger id="sources">
              Sources ({workflow.sources.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent id="timeline">
            <Card>
              <CardContent>
                <WorkflowTimeline steps={workflow.steps} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent id="activity">
            <ActivityLog activities={workflow.activities} />
          </TabsContent>
          <TabsContent id="sources">
            <Card>
              <SourceTable sources={workflow.sources} variant="workflow" />
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-6">
          {workflow.agentActivity && (
            <AgentActivityPanel agentActivity={workflow.agentActivity} />
          )}
        </div>
      </div>
    </div>
  )
}
