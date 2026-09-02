import { NextRequest, NextResponse } from "next/server";

import { getResearchStatus } from "../../../../temporal/client";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;

  try {
    const status = await getResearchStatus(workflowId);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: `No research workflow found for id "${workflowId}"` },
      { status: 404 },
    );
  }
}
