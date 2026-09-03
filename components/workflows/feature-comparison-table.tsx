import { Check } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CompetitiveComparison } from "@/lib/analysis-types"

export function FeatureComparisonTable({ comparison }: { comparison: CompetitiveComparison }) {
  if (comparison.featureComparison.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No comparable features found.</p>
  }

  return (
    <Table aria-label="Feature comparison">
      <TableHeader>
        <TableHead isRowHeader>Feature</TableHead>
        {comparison.competitors.map((competitor) => (
          <TableHead key={competitor} className="text-center">
            {competitor}
          </TableHead>
        ))}
      </TableHeader>
      <TableBody>
        {comparison.featureComparison.map((row) => (
          <TableRow key={row.feature}>
            <TableCell className="text-sm font-medium text-foreground">{row.feature}</TableCell>
            {comparison.competitors.map((competitor) => (
              <TableCell key={competitor} className="text-center">
                {row.competitors[competitor] ? (
                  <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
