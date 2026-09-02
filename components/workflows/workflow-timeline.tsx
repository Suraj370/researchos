import { cn } from "@/lib/utils"
import type { WorkflowStep } from "@/lib/types"
import { StepStatusIcon } from "@/components/workflows/workflow-status"

function StepMeta({ step }: { step: WorkflowStep }) {
  if (step.status === "completed" && step.duration) {
    return (
      <span className="text-xs text-muted-foreground">
        Completed in {step.duration}
      </span>
    )
  }
  if (step.status === "failed") {
    return (
      <span className="text-xs font-medium text-destructive">Failed</span>
    )
  }
  if (step.status === "running") {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        In progress
      </span>
    )
  }
  return null
}

export function WorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <StepStatusIcon status={step.status} />
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "my-1 w-px flex-1",
                  step.status === "completed" ? "bg-emerald-500/30" : "bg-border"
                )}
              />
            )}
          </div>
          <div className={cn("flex-1 pb-6", index === steps.length - 1 && "pb-0")}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.status === "pending"
                    ? "text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {step.name}
              </span>
              {step.timestamp && (
                <span className="font-mono text-xs text-muted-foreground">
                  {step.timestamp}
                </span>
              )}
              <StepMeta step={step} />
            </div>
            {step.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
