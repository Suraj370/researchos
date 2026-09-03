import { Bot } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { WorkflowAgentActivity } from "@/lib/types"

export function AgentActivityPanel({
  agentActivity,
}: {
  agentActivity: WorkflowAgentActivity
}) {
  const hasIteration = agentActivity.iteration !== undefined && agentActivity.maxIterations !== undefined
  const hasMissingAreas = agentActivity.missingAreas && agentActivity.missingAreas.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Bot className="size-4 text-muted-foreground" />
            Agent activity
          </span>
          {hasIteration && (
            <span className="font-mono text-xs font-normal tracking-normal text-muted-foreground normal-case">
              Iteration {agentActivity.iteration} / {agentActivity.maxIterations}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-foreground">{agentActivity.currentStatus}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {agentActivity.taskLabel}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {agentActivity.progress}%
            </span>
          </div>
          <Progress
            value={agentActivity.progress}
            aria-label={agentActivity.taskLabel}
          />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Current task
          </span>
          <p className="text-sm text-foreground">{agentActivity.taskDescription}</p>
        </div>

        {agentActivity.lastDecision && (
          <div className="space-y-1 border-t border-border pt-4">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Latest agent decision
            </span>
            <p className="text-sm text-foreground">{agentActivity.lastDecision}</p>
          </div>
        )}

        {hasMissingAreas && (
          <div className="space-y-1.5 border-t border-border pt-4">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Missing information
            </span>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {agentActivity.missingAreas?.map((area) => <li key={area}>{area}</li>)}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {agentActivity.itemsLabel}
          </span>
          <span className="font-mono text-sm tabular-nums">
            {agentActivity.itemsProcessed} / {agentActivity.itemsTotal}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
