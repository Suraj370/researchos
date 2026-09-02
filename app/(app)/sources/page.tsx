"use client"

import * as React from "react"
import { Check, Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SourceTable } from "@/components/sources/source-table"
import { useWorkflowStore } from "@/lib/workflow-store"
import type { SourceType } from "@/lib/types"

const TYPE_OPTIONS: { label: string; value: SourceType | "all" }[] = [
  { label: "All types", value: "all" },
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Reference", value: "reference" },
]

export default function SourcesPage() {
  const { workflows } = useWorkflowStore()
  const [search, setSearch] = React.useState("")
  const [type, setType] = React.useState<SourceType | "all">("all")

  const allSources = workflows.flatMap((workflow) =>
    workflow.sources.map((source) => ({
      ...source,
      id: `${workflow.id}:${source.id}`,
      workflowId: workflow.id,
      workflowTitle: workflow.title,
    }))
  )

  const filtered = allSources.filter((source) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query ||
      source.title.toLowerCase().includes(query) ||
      source.domain.toLowerCase().includes(query)
    const matchesType = type === "all" || source.type === type
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
          Sources
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All sources collected across your research workflows.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search sources"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sources..."
            className="pl-6"
          />
        </div>

        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <SlidersHorizontal data-icon="inline-start" />
            {TYPE_OPTIONS.find((o) => o.value === type)?.label}
          </Button>
          <DropdownMenu aria-label="Filter by type" placement="bottom start">
            {TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onAction={() => setType(option.value)}
              >
                <Check
                  className={type === option.value ? "opacity-100" : "opacity-0"}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      <Card>
        <SourceTable sources={filtered} variant="global" />
      </Card>
    </div>
  )
}
