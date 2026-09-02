export type WorkflowStatus =
  | "running"
  | "completed"
  | "waiting"
  | "failed"
  | "cancelled"

export type WorkflowStepStatus = "completed" | "running" | "pending" | "failed"

export interface WorkflowStep {
  id: string
  name: string
  status: WorkflowStepStatus
  timestamp?: string
  duration?: string
  description?: string
}

export interface WorkflowActivity {
  id: string
  timestamp: string
  event: string
  detail?: string
}

export type SourceStatus = "analyzed" | "analyzing" | "queued" | "failed"
export type SourceType = "primary" | "secondary" | "reference"

export interface ResearchSource {
  id: string
  title: string
  domain: string
  type: SourceType
  relevance: number
  status: SourceStatus
  addedAt: string
}

export interface WorkflowAgentActivity {
  currentStatus: string
  taskLabel: string
  taskDescription: string
  sourcesProcessed: number
  sourcesTotal: number
  progress: number
}

export interface Workflow {
  id: string
  title: string
  objective: string
  instructions?: string
  status: WorkflowStatus
  sourcesCount: number
  startedLabel: string
  durationLabel: string
  progress: number
  steps: WorkflowStep[]
  activities: WorkflowActivity[]
  sources: ResearchSource[]
  agentActivity?: WorkflowAgentActivity
}

export interface ResearchReport {
  id: string
  title: string
  description: string
  category: string
  status: "ready" | "generating"
  sourceCount: number
  createdLabel: string
  workflowId?: string
}

export interface NewResearchInput {
  title: string
  objective: string
  instructions: string
}
