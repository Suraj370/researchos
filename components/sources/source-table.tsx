import Link from "next/link"

import { cn } from "@/lib/utils"
import type { ResearchSource } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type SourceTableRow = ResearchSource & {
  workflowId?: string
  workflowTitle?: string
}

const SOURCE_STATUS_CONFIG: Record<
  ResearchSource["status"],
  { label: string; className: string }
> = {
  analyzed: { label: "Analyzed", className: "text-emerald-600 dark:text-emerald-400" },
  analyzing: { label: "Analyzing", className: "text-amber-600 dark:text-amber-400" },
  queued: { label: "Queued", className: "text-muted-foreground" },
  failed: { label: "Failed", className: "text-destructive" },
}

const TYPE_LABEL: Record<ResearchSource["type"], string> = {
  primary: "Primary",
  secondary: "Secondary",
  reference: "Reference",
}

function SourceStatusLabel({ status }: { status: ResearchSource["status"] }) {
  const config = SOURCE_STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        "text-[0.625rem] font-semibold tracking-widest uppercase",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

export function SourceTable({
  sources,
  variant = "workflow",
}: {
  sources: SourceTableRow[]
  variant?: "workflow" | "global"
}) {
  return (
    <Table aria-label={variant === "global" ? "Sources" : "Workflow sources"}>
      <TableHeader>
        <TableHead isRowHeader>Source</TableHead>
        <TableHead>Domain</TableHead>
        {variant === "global" ? (
          <TableHead>Research</TableHead>
        ) : (
          <TableHead>Type</TableHead>
        )}
        <TableHead>Relevance</TableHead>
        {variant === "global" && <TableHead>Added</TableHead>}
        <TableHead>Status</TableHead>
      </TableHeader>
      <TableBody>
        {sources.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={variant === "global" ? 6 : 5}
              className="h-24 text-center text-muted-foreground"
            >
              No sources found.
            </TableCell>
          </TableRow>
        )}
        {sources.map((source) => (
          <TableRow key={source.id}>
            <TableCell className="max-w-72 truncate text-sm font-medium text-foreground">
              {source.title}
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">
              {source.domain}
            </TableCell>
            {variant === "global" ? (
              <TableCell className="text-sm text-muted-foreground">
                {source.workflowId ? (
                  <Link
                    href={`/workflows/${source.workflowId}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {source.workflowTitle}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
            ) : (
              <TableCell className="text-sm text-muted-foreground">
                {TYPE_LABEL[source.type]}
              </TableCell>
            )}
            <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
              {source.relevance}%
            </TableCell>
            {variant === "global" && (
              <TableCell className="text-sm text-muted-foreground">
                {source.addedAt}
              </TableCell>
            )}
            <TableCell>
              <SourceStatusLabel status={source.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
