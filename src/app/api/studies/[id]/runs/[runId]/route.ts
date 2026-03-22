import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRunOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: _studyId, runId } = await params;
    const { user, run } = await requireRunOwner(req, runId, _studyId);

    await prisma.$transaction(async (tx) => {
      await tx.studyRun.delete({ where: { id: run.id } });
      await tx.auditLog.create({
        data: { userId: user.id, action: "run_delete", resourceType: "run", resourceId: runId },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Delete run failed", { runId: (await params).runId });
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
