import { NextRequest, NextResponse } from "next/server";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== user.id) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "api_key_revoke",
        resourceType: "api_key",
        resourceId: id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
