import { RecentWorkflows } from "@/components/dashboard/recent-workflows"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ResearchInput } from "@/components/research/research-input"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
          Research
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Run and monitor durable AI research workflows.
        </p>
      </div>

      <ResearchInput />

      <StatsCards />

      <RecentWorkflows />
    </div>
  )
}
