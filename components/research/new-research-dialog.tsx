"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { startResearch } from "@/lib/api-client"
import { useWorkflowStore } from "@/lib/workflow-store"

const EMPTY_FORM = { title: "", objective: "", instructions: "" }

export function NewResearchDialog() {
  const { addWorkflow } = useWorkflowStore()
  const [isOpen, setIsOpen] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canSubmit = form.title.trim() && form.objective.trim()

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { researchId, workflowId } = await startResearch(form.title.trim(), form.objective.trim())

      addWorkflow({
        title: form.title.trim(),
        objective: form.objective.trim(),
        instructions: form.instructions.trim(),
        researchId,
        temporalWorkflowId: workflowId,
      })

      setForm(EMPTY_FORM)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start research")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button>
        <Plus data-icon="inline-start" />
        New Research
      </Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>New research</DialogTitle>
          <DialogDescription>
            Start a durable research workflow. You can monitor its progress once
            it begins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Research title
            </label>
            <Input
              aria-label="Research title"
              value={form.title}
              onChange={(event) =>
                setForm((f) => ({ ...f, title: event.target.value }))
              }
              placeholder="Payment provider comparison"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Research objective
            </label>
            <Textarea
              aria-label="Research objective"
              value={form.objective}
              onChange={(event) =>
                setForm((f) => ({ ...f, objective: event.target.value }))
              }
              placeholder="Compare Stripe, Adyen, and Paddle for a SaaS startup."
              className="min-h-20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Research instructions
            </label>
            <Textarea
              aria-label="Research instructions"
              value={form.instructions}
              onChange={(event) =>
                setForm((f) => ({ ...f, instructions: event.target.value }))
              }
              placeholder="Optional guidance for the research agent."
              className="min-h-16"
            />
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button onPress={handleSubmit} isDisabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Starting..." : "Start Research"}
          </Button>
        </DialogFooter>
      </Dialog>
    </DialogTrigger>
  )
}
