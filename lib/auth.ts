import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { getDb } from "@/lib/db/client"
import * as authSchema from "@/lib/db/auth-schema"

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // No transactional email provider is configured yet, so the reset link
      // is logged server-side instead of emailed. Wire a real provider (e.g.
      // Resend) here before relying on this in production.
      console.log(`[auth] Password reset requested for ${user.email}: ${url}`)
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
})
