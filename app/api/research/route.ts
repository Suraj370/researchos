import { NextRequest, NextResponse } from "next/server";

import { startResearchWorkflow } from "../../../temporal/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body as { query?: unknown })?.query;

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "`query` is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  const researchId = crypto.randomUUID();

  const { workflowId } = await startResearchWorkflow({
    researchId,
    query,
  });

  return NextResponse.json({ researchId, workflowId });
}
