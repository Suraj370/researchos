import { ScrollArea } from "@/components/ui/scroll-area"
import type { WorkflowActivity } from "@/lib/types"

export function ActivityLog({ activities }: { activities: WorkflowActivity[] }) {
  return (
    <ScrollArea className="h-72 border border-border bg-muted/30">
      <div className="p-3 font-mono text-xs leading-relaxed">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 py-0.5">
            <span className="shrink-0 text-muted-foreground">
              {activity.timestamp}
            </span>
            <span className="text-foreground">{activity.event}</span>
            {activity.detail && (
              <span className="text-primary">{activity.detail}</span>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
