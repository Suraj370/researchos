# ResearchOS

An AI-powered competitive research tool. Give it a query, and it autonomously researches every competitor in parallel — searching the web, evaluating its own coverage, and deciding whether to dig deeper — then hands back structured, comparable analyses.

## Problem

Competitive research is slow and shallow when done by hand: a person has to search for each competitor, read through scattered sources, judge whether they've found enough, and manually normalize what they found into something comparable. Doing this well for even a handful of competitors is a multi-hour task, and it's hard to parallelize without losing consistency.

Naively automating it with a single long LLM call doesn't hold up either — real research is multi-step (search, evaluate, search again, analyze), it fans out across many competitors that should run independently, and any one of those steps can fail or time out. A plain request/response API has no good way to survive that.

## Solution

ResearchOS turns a single query into a durable, autonomous research run:

1. A user submits a query from the dashboard.
2. The system discovers the relevant competitors and drafts a research plan.
3. **Each competitor is researched in parallel** by its own agent loop: search the web (Exa) → evaluate whether coverage is sufficient (LLM) → decide what to search next (LLM) → repeat, until the loop is satisfied or hits its limits.
4. Each competitor's findings are extracted into structured facts and analyzed for pricing, features, and positioning.
5. All competitor analyses are merged into a single cross-competitor comparison.
6. Results are persisted and shown in the dashboard as sources, reports, and workflow runs — live, while the run is still in progress.

## Approach

The core engineering bet is **Temporal** for orchestration, not a bespoke job queue or a single fragile LLM call:

- A **parent workflow** (`researchAgentWorkflow`) discovers competitors, builds the plan, and fans out one **child workflow** per competitor in parallel — so one competitor failing doesn't take down the run.
- Each **child workflow** (`competitorResearchWorkflow`) runs the agentic evaluate → decide → search loop as durable, retryable activities, then analyzes its findings.
- The frontend never talks to the workflow engine directly — it goes through an **oRPC API**, gated by **Better Auth** sessions, which starts workflows and polls their status.
- All research output — sources, per-competitor analyses, and the final comparison — is written to **Postgres via Drizzle**, so the UI can read it back independent of whether the run is still active.

See the full architecture diagram: **[docs/architecture.html](docs/architecture.html)** (open in a browser — it's interactive, with guided views for the request path, the parallel fan-out, and the agentic research loop).

## Development

```bash
pnpm install
docker compose up -d        # Postgres
temporal server start-dev   # Temporal dev server, separately
pnpm db:migrate
pnpm dev                    # Next.js app
pnpm dev:worker             # Temporal worker (separate terminal)
```

## Adding UI components

```bash
npx shadcn@latest add button
```

```tsx
import { Button } from "@/components/ui/button";
```
