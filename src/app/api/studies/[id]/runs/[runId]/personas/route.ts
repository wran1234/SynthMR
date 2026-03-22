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
    await requireRunOwner(req, runId, studyId);

    const sampled = await prisma.sampledPersona.findMany({
      where: { studyRunId: runId },
      take: 10,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      personas: sampled.map((s) => ({ personaId: s.personaId, soulVersion: s.soulVersion })),
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/studies/.../personas] GET failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to list personas" }, { status: 500 });
  }
}
