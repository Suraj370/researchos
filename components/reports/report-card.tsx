import { FileText } from "lucide-react"

import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ResearchReport } from "@/lib/types"

export function ReportCard({ report }: { report: ResearchReport }) {
  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{report.title}</CardTitle>
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
        </div>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{report.sourceCount} sources</span>
        <span>{report.createdLabel}</span>
      </CardContent>
      <CardFooter>
        <LinkButton
          href={report.workflowId ? `/workflows/${report.workflowId}` : "/reports"}
          variant="outline"
          size="sm"
          className="w-full"
        >
          View report
        </LinkButton>
      </CardFooter>
    </Card>
  )
}
