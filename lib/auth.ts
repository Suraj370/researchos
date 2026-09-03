import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { getDb } from "@/lib/db/client"
import * as authSchema from "@/lib/db/auth-schema"

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema: authSchema }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
})
