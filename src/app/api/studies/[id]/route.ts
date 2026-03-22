import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudyOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { study } = await requireStudyOwner(req, id);
    return NextResponse.json(study);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Get study failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await requireStudyOwner(req, id);

    await prisma.$transaction(async (tx) => {
      await tx.study.delete({ where: { id } });
      await tx.auditLog.create({
        data: { userId: user.id, action: "study_delete", resourceType: "study", resourceId: id },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Delete study failed", { studyId: (await params).id });
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
