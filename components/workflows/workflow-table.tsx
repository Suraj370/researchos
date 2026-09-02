"use client"

import Link from "next/link"
import { ArrowRight, MoreHorizontal, Pause, Play, XCircle } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button, LinkButton } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/workflows/workflow-status"
import { useWorkflowActions } from "@/components/workflows/use-workflow-actions"
import type { Workflow } from "@/lib/types"

function WorkflowRowActions({ workflow }: { workflow: Workflow }) {
  const { canPause, canResume, canCancel, pause, resume, cancel } =
    useWorkflowActions(workflow)

  return (
    <div className="flex items-center justify-end gap-1">
      <LinkButton href={`/workflows/${workflow.id}`} variant="ghost" size="icon-sm">
        <ArrowRight />
        <span className="sr-only">View workflow</span>
      </LinkButton>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal />
          <span className="sr-only">Workflow actions</span>
        </Button>
        <DropdownMenu aria-label="Workflow actions" placement="bottom end">
          <DropdownMenuItem href={`/workflows/${workflow.id}`}>
            View workflow
          </DropdownMenuItem>
          {(canPause || canResume || canCancel) && <DropdownMenuSeparator />}
          {canPause && (
            <DropdownMenuItem onAction={pause}>
              <Pause />
              Pause workflow
            </DropdownMenuItem>
          )}
          {canResume && (
            <DropdownMenuItem onAction={resume}>
              <Play />
              Resume workflow
            </DropdownMenuItem>
          )}
          {canCancel && (
            <DropdownMenuItem variant="destructive" onAction={cancel}>
              <XCircle />
              Cancel workflow
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </DropdownMenuTrigger>
    </div>
  )
}

export function WorkflowTable({ workflows }: { workflows: Workflow[] }) {
  return (
    <Table aria-label="Workflows">
      <TableHeader>
        <TableHead isRowHeader>Research</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Sources</TableHead>
        <TableHead>Started</TableHead>
        <TableHead>Duration</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableHeader>
      <TableBody>
        {workflows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              No workflows match your filters.
            </TableCell>
          </TableRow>
        )}
        {workflows.map((workflow) => (
          <TableRow key={workflow.id}>
            <TableCell className="max-w-72 whitespace-normal">
              <Link
                href={`/workflows/${workflow.id}`}
                className="text-sm font-medium text-foreground hover:underline hover:underline-offset-2"
              >
                {workflow.title}
              </Link>
              {workflow.objective !== workflow.title && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {workflow.objective}
                </p>
              )}
            </TableCell>
            <TableCell>
              <StatusBadge status={workflow.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {workflow.sourcesCount} sources
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {workflow.startedLabel}
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">
              {workflow.durationLabel}
            </TableCell>
            <TableCell>
              <WorkflowRowActions workflow={workflow} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
