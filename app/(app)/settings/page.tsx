import { Bot, Search, Waypoints } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const INTEGRATIONS = [
  {
    name: "Temporal",
    description: "Durable execution for research workflows.",
    icon: Waypoints,
  },
  {
    name: "Exa",
    description: "Neural search for sourcing research material.",
    icon: Search,
  },
  {
    name: "LLM provider",
    description: "Powers the research and reporting agents.",
    icon: Bot,
  },
]

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and workspace preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your identity across ResearchFlow workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Name
              </label>
              <Input aria-label="Name" defaultValue="Ada Researcher" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Email
              </label>
              <Input aria-label="Email" defaultValue="ada@researchflow.dev" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button size="sm">Save changes</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect the services that power your research workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                  <integration.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Not connected</Badge>
                <Button variant="outline" size="sm" isDisabled>
                  Connect
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
