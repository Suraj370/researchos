"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { startResearch } from "@/lib/api-client"
import { useWorkflowStore } from "@/lib/workflow-store"

export function ResearchInput() {
  const router = useRouter()
  const { addWorkflow } = useWorkflowStore()
  const [title, setTitle] = React.useState("")
  const [objective, setObjective] = React.useState("")
  const [instructions, setInstructions] = React.useState("")
  const [isStarting, setIsStarting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canSubmit = title.trim() && objective.trim()

  async function handleStart() {
    const trimmedTitle = title.trim()
    const trimmedObjective = objective.trim()
    if (!trimmedTitle || !trimmedObjective) return

    setIsStarting(true)
    setError(null)

    try {
      const { researchId, workflowId } = await startResearch(trimmedTitle, trimmedObjective)

      const workflow = addWorkflow({
        title: trimmedTitle,
        objective: trimmedObjective,
        instructions: instructions.trim(),
        researchId,
        temporalWorkflowId: workflowId,
      })

      setTitle("")
      setObjective("")
      setInstructions("")
      router.push(`/workflows/${workflow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start research")
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What would you like to research?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Research title
          </label>
          <Input
            aria-label="Research title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Payment provider comparison"
          />
        </div>
        <Textarea
          aria-label="Research objective"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder="Compare Stripe, Adyen, and Paddle for a SaaS startup."
          className="min-h-24 text-base md:text-base"
        />
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Instructions (optional)
          </label>
          <Textarea
            aria-label="Research instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Focus on transaction fees, payout speed, and support for usage-based billing."
            className="min-h-16"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-4">
        {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
        <Button onPress={handleStart} isDisabled={!canSubmit || isStarting}>
          {isStarting ? "Starting..." : "Start Research"}
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}
