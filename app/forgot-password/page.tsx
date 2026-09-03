"use client"

import * as React from "react"
import { Waypoints } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  async function handleSubmit() {
    if (!email.trim()) return

    setIsSubmitting(true)
    setError(null)

    const { error: requestError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    })

    setIsSubmitting(false)

    if (requestError) {
      setError(requestError.message ?? "Failed to request a password reset")
      return
    }

    setSent(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <Waypoints className="size-4" />
          </span>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        {sent ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="text-foreground">{email.trim()}</span>, a reset
              link has been sent. In local development, check the terminal running{" "}
              <code className="font-mono text-xs">npm run dev</code> for the link.
            </p>
          </CardContent>
        ) : (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Email
                </label>
                <Input
                  type="email"
                  aria-label="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button onPress={handleSubmit} isDisabled={!email.trim() || isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <a href="/sign-in" className="text-foreground underline underline-offset-4">
                  Back to sign in
                </a>
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}
