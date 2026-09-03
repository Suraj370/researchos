"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Waypoints } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canSubmit = token && password.length >= 8

  async function handleSubmit() {
    if (!canSubmit || !token) return

    setIsSubmitting(true)
    setError(null)

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (resetError) {
      setError(resetError.message ?? "Failed to reset password")
      setIsSubmitting(false)
      return
    }

    router.push("/sign-in")
  }

  if (!token) {
    return (
      <CardContent>
        <p className="text-sm text-destructive">
          This reset link is missing or invalid. Request a new one from the sign-in page.
        </p>
      </CardContent>
    )
  }

  return (
    <>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            New password
          </label>
          <Input
            type="password"
            aria-label="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
            placeholder="At least 8 characters"
            autoFocus
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
      <CardFooter>
        <Button onPress={handleSubmit} isDisabled={!canSubmit || isSubmitting} className="w-full">
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </CardFooter>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <Waypoints className="size-4" />
          </span>
          <CardTitle>Set a new password</CardTitle>
        </CardHeader>
        <React.Suspense fallback={<CardContent className="text-sm text-muted-foreground">Loading…</CardContent>}>
          <ResetPasswordForm />
        </React.Suspense>
      </Card>
    </div>
  )
}
