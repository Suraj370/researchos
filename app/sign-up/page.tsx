"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Waypoints } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canSubmit = name.trim() && email.trim() && password.length >= 8

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    const { error: signUpError } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    })

    if (signUpError) {
      setError(signUpError.message ?? "Failed to sign up")
      setIsSubmitting(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <Waypoints className="size-4" />
          </span>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Name
            </label>
            <Input
              aria-label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Researcher"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Email
            </label>
            <Input
              type="email"
              aria-label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Password
            </label>
            <Input
              type="password"
              aria-label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
              placeholder="At least 8 characters"
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button onPress={handleSubmit} isDisabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/sign-in" className="text-foreground underline underline-offset-4">
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
