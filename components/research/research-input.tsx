"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useWorkflowStore } from "@/lib/workflow-store"

function deriveTitle(objective: string) {
  const trimmed = objective.trim()
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
}

export function ResearchInput() {
  const router = useRouter()
  const { addWorkflow } = useWorkflowStore()
  const [objective, setObjective] = React.useState("")
  const [instructions, setInstructions] = React.useState("")

  function handleStart() {
    const trimmed = objective.trim()
    if (!trimmed) return

    const workflow = addWorkflow({
      title: deriveTitle(trimmed),
      objective: trimmed,
      instructions: instructions.trim(),
    })

    setObjective("")
    setInstructions("")
    router.push(`/workflows/${workflow.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What would you like to research?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      <CardFooter className="justify-end">
        <Button onPress={handleStart} isDisabled={!objective.trim()}>
          Start Research
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}
