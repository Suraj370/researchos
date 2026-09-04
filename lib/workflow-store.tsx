"use client"

import * as React from "react"

import { fetchResearchList } from "@/lib/api-client"
import { adaptResearchRecord } from "@/lib/adapt-research-record"
import { PHASE_PROGRESS, PHASE_STEPS } from "@/lib/workflow-phases"
import type { NewResearchInput, ResearchSource, Workflow, WorkflowAgentActivity, WorkflowStatus } from "@/lib/types"
import type { ResearchStatusUpdate } from "@/lib/temporal-types"

/** Overlays a status update's real item-progress counts and agent-loop state onto agentActivity, if it carried any. */
function mergeAgentInfo(
  agentActivity: WorkflowAgentActivity,
  status: ResearchStatusUpdate
): WorkflowAgentActivity {
  let next = agentActivity

  if (status.progress) {
    next = {
      ...next,
      itemsLabel: status.progress.label,
      itemsProcessed: status.progress.completed,
      itemsTotal: status.progress.total,
    }
  }

  if (status.agent) {
    next = {
      ...next,
      iteration: status.agent.iteration,
      maxIterations: status.agent.maxIterations,
      missingAreas: status.agent.missingAreas,
      lastDecision: status.agent.lastDecision,
    }
  }

  return next
}

interface WorkflowStoreValue {
  workflows: Workflow[]
  isLoading: boolean
  addWorkflow: (input: NewResearchInput) => Workflow
  setWorkflowStatus: (id: string, status: WorkflowStatus) => void
  applyResearchStatus: (id: string, status: ResearchStatusUpdate) => void
  setWorkflowSources: (id: string, sources: ResearchSource[]) => void
}

const WorkflowStoreContext = React.createContext<WorkflowStoreValue | null>(null)

export function WorkflowStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [workflows, setWorkflows] = React.useState<Workflow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    fetchResearchList()
      .then((records) => {
        if (cancelled) return
        const fetched = records.map(adaptResearchRecord)
        setWorkflows((current) => {
          const known = new Set(current.map((workflow) => workflow.id))
          return [...current, ...fetched.filter((workflow) => !known.has(workflow.id))]
        })
      })
      .catch(() => {
        // Non-fatal - the UI just starts empty if history can't be loaded.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const addWorkflow = React.useCallback((input: NewResearchInput) => {
    const workflow: Workflow = {
      id: input.researchId,
      title: input.title,
      objective: input.objective,
      instructions: input.instructions || undefined,
      researchId: input.researchId,
      temporalWorkflowId: input.temporalWorkflowId,
      status: "running",
      sourcesCount: 0,
      startedLabel: "Just now",
      durationLabel: "—",
      progress: PHASE_PROGRESS.initializing,
      steps: PHASE_STEPS.map((phase, index) => ({
        id: phase.id,
        name: phase.name,
        status: index === 0 ? "running" : "pending",
        timestamp: index === 0 ? "now" : undefined,
        description: index === 0 ? "Research workflow starting" : undefined,
      })),
      activities: [{ id: "a1", timestamp: "now", event: "workflow.started" }],
      sources: [],
      agentActivity: {
        currentStatus: "Research workflow starting",
        taskLabel: "Initializing",
        taskDescription: "Setting up the research workflow.",
        itemsLabel: "Sources processed",
        itemsProcessed: 0,
        itemsTotal: 0,
        progress: PHASE_PROGRESS.initializing,
      },
    }

    setWorkflows((current) => [workflow, ...current])
    return workflow
  }, [])

  const setWorkflowStatus = React.useCallback(
    (id: string, status: WorkflowStatus) => {
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === id ? { ...workflow, status } : workflow
        )
      )
    },
    []
  )

  const applyResearchStatus = React.useCallback((id: string, status: ResearchStatusUpdate) => {
    setWorkflows((current) =>
      current.map((workflow) => {
        if (workflow.id !== id) return workflow
        if (workflow.status === "completed" || workflow.status === "failed") return workflow

        if (status.status === "completed") {
          return {
            ...workflow,
            status: "completed",
            progress: 100,
            durationLabel: workflow.durationLabel === "—" ? "< 1s" : workflow.durationLabel,
            steps: workflow.steps.map((step) => ({ ...step, status: "completed" })),
            activities: [
              ...workflow.activities,
              {
                id: `a${workflow.activities.length + 1}`,
                timestamp: "now",
                event: "workflow.completed",
                detail: status.message,
              },
            ],
            agentActivity: workflow.agentActivity
              ? mergeAgentInfo(
                  {
                    ...workflow.agentActivity,
                    currentStatus: status.message,
                    taskLabel: "Completed",
                    taskDescription: status.message,
                    progress: 100,
                  },
                  status
                )
              : workflow.agentActivity,
          }
        }

        if (status.status === "failed") {
          return {
            ...workflow,
            status: "failed",
            steps: workflow.steps.map((step) =>
              step.status === "running" ? { ...step, status: "failed", description: status.message } : step
            ),
            activities: [
              ...workflow.activities,
              {
                id: `a${workflow.activities.length + 1}`,
                timestamp: "now",
                event: "workflow.failed",
                detail: status.message,
              },
            ],
            agentActivity: workflow.agentActivity
              ? { ...workflow.agentActivity, currentStatus: status.message, taskLabel: "Failed" }
              : workflow.agentActivity,
          }
        }

        const phaseIndex = PHASE_STEPS.findIndex((phase) => phase.id === status.status)
        if (phaseIndex === -1) return workflow

        const stepDescription =
          status.agent && (status.status === "searching" || status.status === "evaluating")
            ? `${status.message} (iteration ${status.agent.iteration} of ${status.agent.maxIterations})`
            : status.message

        const currentStep = workflow.steps[phaseIndex]
        if (currentStep?.status === "running" && currentStep.description === stepDescription) {
          return workflow
        }

        const progress = PHASE_PROGRESS[status.status]

        return {
          ...workflow,
          progress,
          steps: workflow.steps.map((step, index) => {
            if (index < phaseIndex) return step.status === "completed" ? step : { ...step, status: "completed" }
            if (index === phaseIndex) return { ...step, status: "running", description: stepDescription }
            return step.status === "pending" ? step : { ...step, status: "pending", description: undefined }
          }),
          activities: [
            ...workflow.activities,
            {
              id: `a${workflow.activities.length + 1}`,
              timestamp: "now",
              event: status.status,
              detail: stepDescription,
            },
          ],
          agentActivity: workflow.agentActivity
            ? mergeAgentInfo(
                {
                  ...workflow.agentActivity,
                  currentStatus: status.message,
                  taskLabel: PHASE_STEPS[phaseIndex].name,
                  taskDescription: status.message,
                  progress,
                },
                status
              )
            : workflow.agentActivity,
        }
      })
    )
  }, [])

  const setWorkflowSources = React.useCallback((id: string, sources: ResearchSource[]) => {
    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === id
          ? { ...workflow, sources, sourcesCount: sources.length }
          : workflow
      )
    )
  }, [])

  const value = React.useMemo(
    () => ({ workflows, isLoading, addWorkflow, setWorkflowStatus, applyResearchStatus, setWorkflowSources }),
    [workflows, isLoading, addWorkflow, setWorkflowStatus, applyResearchStatus, setWorkflowSources]
  )

  return (
    <WorkflowStoreContext value={value}>{children}</WorkflowStoreContext>
  )
}

export function useWorkflowStore() {
  const context = React.useContext(WorkflowStoreContext)
  if (!context) {
    throw new Error("useWorkflowStore must be used within a WorkflowStoreProvider")
  }
  return context
}

export function useWorkflow(id: string) {
  const { workflows } = useWorkflowStore()
  return workflows.find((workflow) => workflow.id === id)
}
