"use client"

import * as React from "react"
import { Calendar, Check, Filter, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NewResearchDialog } from "@/components/research/new-research-dialog"
import { WorkflowTable } from "@/components/workflows/workflow-table"
import { useWorkflowStore } from "@/lib/workflow-store"
import type { WorkflowStatus } from "@/lib/types"

const STATUS_OPTIONS: { label: string; value: WorkflowStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Waiting", value: "waiting" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
]

const DATE_OPTIONS: { label: string; value: "all" | "today" | "yesterday" | "older" }[] = [
  { label: "Any time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Older", value: "older" },
]

function matchesDate(startedLabel: string, filter: string) {
  if (filter === "all") return true
  const label = startedLabel.toLowerCase()
  if (filter === "today") {
    return (
      label.includes("min ago") ||
      label.includes("hour") ||
      label.includes("just now") ||
      label.includes("sec ago")
    )
  }
  if (filter === "yesterday") return label.includes("yesterday")
  if (filter === "older") return label.includes("days ago") || label.includes("week")
  return true
}

export default function WorkflowsPage() {
  const { workflows } = useWorkflowStore()
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<WorkflowStatus | "all">("all")
  const [date, setDate] = React.useState<"all" | "today" | "yesterday" | "older">("all")

  const filtered = workflows.filter((workflow) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query ||
      workflow.title.toLowerCase().includes(query) ||
      workflow.objective.toLowerCase().includes(query)
    const matchesStatus = status === "all" || workflow.status === status
    return matchesSearch && matchesStatus && matchesDate(workflow.startedLabel, date)
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
            Workflows
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All research workflows, past and present.
          </p>
        </div>
        <NewResearchDialog />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search workflows"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workflows..."
            className="pl-6"
          />
        </div>

        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <Filter data-icon="inline-start" />
            {STATUS_OPTIONS.find((o) => o.value === status)?.label}
          </Button>
          <DropdownMenu aria-label="Filter by status" placement="bottom start">
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onAction={() => setStatus(option.value)}
              >
                <Check
                  className={status === option.value ? "opacity-100" : "opacity-0"}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>

        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <Calendar data-icon="inline-start" />
            {DATE_OPTIONS.find((o) => o.value === date)?.label}
          </Button>
          <DropdownMenu aria-label="Filter by date" placement="bottom start">
            {DATE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onAction={() => setDate(option.value)}
              >
                <Check
                  className={date === option.value ? "opacity-100" : "opacity-0"}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      <Card>
        <WorkflowTable workflows={filtered} />
      </Card>
    </div>
  )
}
