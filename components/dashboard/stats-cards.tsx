import { CheckCircle2, Database, FileText, Workflow as WorkflowIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { DASHBOARD_STATS } from "@/lib/mock-data"

const STATS = [
  {
    label: "Active Workflows",
    value: DASHBOARD_STATS.activeWorkflows,
    icon: WorkflowIcon,
  },
  {
    label: "Completed Research",
    value: DASHBOARD_STATS.completedResearch,
    icon: CheckCircle2,
  },
  {
    label: "Sources Analyzed",
    value: DASHBOARD_STATS.sourcesAnalyzed,
    icon: Database,
  },
  {
    label: "Reports Generated",
    value: DASHBOARD_STATS.reportsGenerated,
    icon: FileText,
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {stat.label}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
                {stat.value.toLocaleString()}
              </p>
            </div>
            <stat.icon className="size-4 text-muted-foreground/50" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
