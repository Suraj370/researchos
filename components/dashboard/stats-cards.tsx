"use client"

import { CheckCircle2, Database, FileText, Workflow as WorkflowIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { REPORTS } from "@/lib/mock-data"
import { useWorkflowStore } from "@/lib/workflow-store"

export function StatsCards() {
  const { workflows } = useWorkflowStore()

  const stats = [
    {
      label: "Active Workflows",
      value: workflows.filter((w) => w.status === "running" || w.status === "waiting").length,
      icon: WorkflowIcon,
    },
    {
      label: "Completed Research",
      value: workflows.filter((w) => w.status === "completed").length,
      icon: CheckCircle2,
    },
    {
      label: "Sources Analyzed",
      value: workflows.reduce((sum, w) => sum + w.sourcesCount, 0),
      icon: Database,
    },
    {
      label: "Reports Generated",
      value: REPORTS.length,
      icon: FileText,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
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
