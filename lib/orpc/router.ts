import { z } from "zod"
import { ORPCError } from "@orpc/server"

import { protectedProcedure } from "./procedures"
import { startResearchWorkflow, getResearchStatus } from "@/temporal/client"
import {
  createResearchRecord,
  listResearch,
  getResearchOwnerId,
  getResearchSources,
  getCompetitorAnalyses,
  getCompetitiveComparison,
} from "@/lib/db/queries"

function deriveTitleFromQuery(query: string): string {
  const trimmed = query.trim()
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
}

/** Throws NOT_FOUND for both "doesn't exist" and "belongs to someone else" - never confirms another user's research exists. */
async function assertOwnership(id: string, userId: string): Promise<void> {
  const ownerId = await getResearchOwnerId(id)
  if (ownerId === undefined || ownerId !== userId) {
    throw new ORPCError("NOT_FOUND", { message: `No research found for id "${id}"` })
  }
}

export const router = {
  research: {
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).optional(),
          query: z.string().trim().min(1),
        })
      )
      .handler(async ({ input, context }) => {
        const researchId = crypto.randomUUID()
        const title = input.title ?? deriveTitleFromQuery(input.query)

        await createResearchRecord({
          id: researchId,
          title,
          query: input.query,
          userId: context.session.user.id,
        })

        const { workflowId } = await startResearchWorkflow({ researchId, query: input.query })

        return { researchId, workflowId }
      }),

    list: protectedProcedure.handler(async ({ context }) => {
      return listResearch(context.session.user.id)
    }),

    getStatus: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input, context }) => {
        await assertOwnership(input.id, context.session.user.id)
        return getResearchStatus(`research-${input.id}`)
      }),

    getSources: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          competitor: z.string().optional(),
          category: z.string().optional(),
        })
      )
      .handler(async ({ input, context }) => {
        await assertOwnership(input.id, context.session.user.id)
        return getResearchSources(input.id, { competitor: input.competitor, category: input.category })
      }),

    getAnalysis: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input, context }) => {
        await assertOwnership(input.id, context.session.user.id)
        const [analyses, comparison] = await Promise.all([
          getCompetitorAnalyses(input.id),
          getCompetitiveComparison(input.id),
        ])
        return { analyses, comparison }
      }),
  },
}

export type Router = typeof router
