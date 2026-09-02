import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { WorkflowStatus, WorkflowStepStatus } from "@/lib/types"

interface StatusConfig {
  label: string
  dotClassName: string
  textClassName: string
}

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, StatusConfig> = {
  running: {
    label: "Running",
    dotClassName: "bg-amber-500",
    textClassName: "text-amber-600 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    dotClassName: "bg-emerald-500",
    textClassName: "text-emerald-600 dark:text-emerald-400",
  },
  waiting: {
    label: "Waiting",
    dotClassName: "bg-primary",
    textClassName: "text-primary",
  },
  failed: {
    label: "Failed",
    dotClassName: "bg-destructive",
    textClassName: "text-destructive",
  },
  cancelled: {
    label: "Cancelled",
    dotClassName: "bg-muted-foreground",
    textClassName: "text-muted-foreground",
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: WorkflowStatus
  className?: string
}) {
  const config = WORKFLOW_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.625rem] font-semibold tracking-widest uppercase",
        config.textClassName,
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          config.dotClassName,
          status === "running" && "animate-pulse"
        )}
      />
      {config.label}
    </span>
  )
}

const STEP_ICONS: Record<
  WorkflowStepStatus,
  { icon: LucideIcon; className: string; spin?: boolean }
> = {
  completed: { icon: CheckCircle2, className: "text-emerald-500" },
  running: { icon: Loader2, className: "text-amber-500", spin: true },
  pending: { icon: Circle, className: "text-muted-foreground/40" },
  failed: { icon: XCircle, className: "text-destructive" },
}

export function StepStatusIcon({
  status,
  className,
}: {
  status: WorkflowStepStatus
  className?: string
}) {
  const config = STEP_ICONS[status]
  const Icon = config.icon

  return (
    <Icon
      className={cn(
        "size-4",
        config.className,
        config.spin && "animate-spin",
        className
      )}
    />
  )
}
