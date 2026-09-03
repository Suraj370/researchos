"use client"

import * as React from "react"
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
import { authClient, useSession } from "@/lib/auth-client"

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

function ProfileCard() {
  const { data: session } = useSession()
  const user = session?.user

  const [name, setName] = React.useState("")
  const [loadedName, setLoadedName] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  // Sync the editable field from the session once it loads, without
  // clobbering further edits on re-render (React's recommended pattern for
  // deriving state from an async prop - see "Adjusting state when a prop
  // changes" in the React docs).
  if (user && user.name !== loadedName) {
    setLoadedName(user.name)
    setName(user.name)
  }

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)
    setError(null)
    setSaved(false)

    const { error: updateError } = await authClient.updateUser({ name: name.trim() })

    setIsSaving(false)

    if (updateError) {
      setError(updateError.message ?? "Failed to update profile")
      return
    }

    setSaved(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your identity across ResearchFlow workspaces.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Name
            </label>
            <Input
              aria-label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Email
            </label>
            <Input aria-label="Email" value={user?.email ?? ""} disabled />
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        {saved ? (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">Profile updated.</p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onPress={handleSave} isDisabled={!name.trim() || isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const canSubmit = currentPassword && newPassword.length >= 8

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })

    setIsSubmitting(false)

    if (changeError) {
      setError(changeError.message ?? "Failed to change password")
      return
    }

    setCurrentPassword("")
    setNewPassword("")
    setSuccess(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password used to sign in.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Current password
          </label>
          <Input
            type="password"
            aria-label="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            New password
          </label>
          <Input
            type="password"
            aria-label="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        {error ? <p className="text-xs text-destructive sm:col-span-2">{error}</p> : null}
        {success ? (
          <p className="text-xs text-emerald-600 sm:col-span-2 dark:text-emerald-400">
            Password changed. Your other sessions have been signed out.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onPress={handleSubmit} isDisabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </CardFooter>
    </Card>
  )
}

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

      <ProfileCard />
      <PasswordCard />

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
