import { Progress } from "@/components/ui/progress"

export function WorkflowProgress({
  progress,
  completedSteps,
  totalSteps,
}: {
  progress: number
  completedSteps: number
  totalSteps: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Research progress
        </span>
        <span className="font-mono text-sm tabular-nums">{progress}%</span>
      </div>
      <Progress value={progress} aria-label="Research progress" />
      <p className="text-xs text-muted-foreground">
        {completedSteps} of {totalSteps} steps completed
      </p>
    </div>
  )
}
