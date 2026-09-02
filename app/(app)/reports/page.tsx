import { ReportCard } from "@/components/reports/report-card"
import { REPORTS } from "@/lib/mock-data"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated research reports from completed workflows.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  )
}
