"use client"

import * as React from "react"

import { generateWorkflowId, INITIAL_WORKFLOWS } from "@/lib/mock-data"
import type { NewResearchInput, Workflow, WorkflowStatus } from "@/lib/types"

interface WorkflowStoreValue {
  workflows: Workflow[]
  addWorkflow: (input: NewResearchInput) => Workflow
  setWorkflowStatus: (id: string, status: WorkflowStatus) => void
  completeWorkflow: (id: string, message: string) => void
}

const WorkflowStoreContext = React.createContext<WorkflowStoreValue | null>(null)

export function WorkflowStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [workflows, setWorkflows] = React.useState<Workflow[]>(INITIAL_WORKFLOWS)

  const addWorkflow = React.useCallback((input: NewResearchInput) => {
    const workflow: Workflow = {
      id: generateWorkflowId(),
      title: input.title,
      objective: input.objective,
      instructions: input.instructions || undefined,
      temporalWorkflowId: input.temporalWorkflowId,
      status: "running",
      sourcesCount: 0,
      startedLabel: "Just now",
      durationLabel: "—",
      progress: 4,
      steps: [
        {
          id: "plan",
          name: "Research plan generated",
          status: "running",
          timestamp: "now",
          description: "Breaking the objective down into research steps.",
        },
        { id: "queries", name: "Search queries generated", status: "pending" },
        { id: "gather", name: "Gathering sources", status: "pending" },
        { id: "compare", name: "Comparing findings", status: "pending" },
        { id: "fact-check", name: "Fact checking", status: "pending" },
        { id: "report", name: "Generate final report", status: "pending" },
      ],
      activities: [
        { id: "a1", timestamp: "now", event: "workflow.started" },
      ],
      sources: [],
      agentActivity: {
        currentStatus: "Generating a research plan for the objective.",
        taskLabel: "Planning",
        taskDescription: "Breaking the objective into concrete research steps.",
        sourcesProcessed: 0,
        sourcesTotal: 0,
        progress: 4,
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

  const completeWorkflow = React.useCallback((id: string, message: string) => {
    setWorkflows((current) =>
      current.map((workflow) => {
        if (workflow.id !== id || workflow.status === "completed") return workflow

        return {
          ...workflow,
          status: "completed",
          progress: 100,
          durationLabel:
            workflow.durationLabel === "—" ? "< 1s" : workflow.durationLabel,
          steps: workflow.steps.map((step) => ({
            ...step,
            status: "completed",
          })),
          activities: [
            ...workflow.activities,
            {
              id: `a${workflow.activities.length + 1}`,
              timestamp: "now",
              event: "workflow.completed",
              detail: message,
            },
          ],
          agentActivity: workflow.agentActivity
            ? {
                ...workflow.agentActivity,
                currentStatus: message,
                taskLabel: "Completed",
                taskDescription: message,
                progress: 100,
              }
            : workflow.agentActivity,
        }
      })
    )
  }, [])

  const value = React.useMemo(
    () => ({ workflows, addWorkflow, setWorkflowStatus, completeWorkflow }),
    [workflows, addWorkflow, setWorkflowStatus, completeWorkflow]
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
