import { ResearchInput } from "@/components/research/research-input"

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
          Research
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe what you want to research. ResearchFlow will run it as a
          durable, resumable workflow.
        </p>
      </div>
      <ResearchInput />
    </div>
  )
}
