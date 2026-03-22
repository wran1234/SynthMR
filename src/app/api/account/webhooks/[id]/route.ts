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
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint || endpoint.userId !== user.id) {
      return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 });
    }

    await prisma.webhookEndpoint.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "webhook_revoke",
        resourceType: "webhook",
        resourceId: id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to revoke webhook endpoint" }, { status: 500 });
  }
}
