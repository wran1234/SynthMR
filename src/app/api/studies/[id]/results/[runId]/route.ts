import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRunOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { logError } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: studyId, runId } = await params;
    const { run } = await requireRunOwner(req, runId, studyId);

    const agg = await prisma.aggregate.findFirst({ where: { studyRunId: run.id } });
    if (!agg) {
      return NextResponse.json({ error: "Results not found" }, { status: 404 });
    }
    return NextResponse.json(agg.results as object);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/studies/[id]/results/[runId]] GET failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to get results" }, { status: 500 });
  }
}
