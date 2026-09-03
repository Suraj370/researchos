import { CheckCircle2, XCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CompetitorAnalysis } from "@/lib/analysis-types"

function BulletList({
  items,
  icon: Icon,
  iconClassName,
}: {
  items: string[]
  icon: typeof CheckCircle2
  iconClassName: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Insufficient evidence.</p>
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-foreground">
          <Icon className={`mt-0.5 size-3.5 shrink-0 ${iconClassName}`} />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function CompetitorAnalysisCard({ analysis }: { analysis: CompetitorAnalysis }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{analysis.competitor}</CardTitle>
        <Badge variant="secondary">{analysis.keyFacts.length} facts</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm leading-relaxed text-foreground">{analysis.overview}</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Strengths
            </p>
            <BulletList
              items={analysis.strengths}
              icon={CheckCircle2}
              iconClassName="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Weaknesses
            </p>
            <BulletList items={analysis.weaknesses} icon={XCircle} iconClassName="text-destructive" />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Pricing</p>
          <p className="text-sm text-foreground">{analysis.pricing.summary}</p>
          {analysis.pricing.model !== analysis.pricing.summary && (
            <p className="text-xs text-muted-foreground">Model: {analysis.pricing.model}</p>
          )}
          {analysis.pricing.details.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {analysis.pricing.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Positioning
          </p>
          <p className="text-sm text-foreground">{analysis.positioning.summary}</p>
          {analysis.positioning.differentiators.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {analysis.positioning.differentiators.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        {analysis.targetCustomers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Target customers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.targetCustomers.map((customer) => (
                <Badge key={customer} variant="outline" className="rounded-none border border-border px-2 py-1">
                  {customer}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
