import { ORPCError, os } from "@orpc/server"

import { auth } from "@/lib/auth"
import type { ORPCContext } from "./context"

const base = os.$context<ORPCContext>()

export const publicProcedure = base

/** Requires a valid Better Auth session. Injects `context.session` (never null downstream). */
export const protectedProcedure = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers })

  if (!session) {
    throw new ORPCError("UNAUTHORIZED")
  }

  return next({ context: { session } })
})
