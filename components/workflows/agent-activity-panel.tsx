import { Bot } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { WorkflowAgentActivity } from "@/lib/types"

export function AgentActivityPanel({
  agentActivity,
}: {
  agentActivity: WorkflowAgentActivity
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          Agent activity
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

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Sources processed
          </span>
          <span className="font-mono text-sm tabular-nums">
            {agentActivity.sourcesProcessed} / {agentActivity.sourcesTotal}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
