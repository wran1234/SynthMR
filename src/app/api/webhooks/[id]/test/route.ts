import { NextRequest, NextResponse } from "next/server";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { deliverWebhookToEndpoint } from "@/lib/webhooks";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint || endpoint.userId !== user.id || endpoint.revokedAt) {
      return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 });
    }

    const ok = await deliverWebhookToEndpoint({
      endpointId: endpoint.id,
      url: endpoint.url,
      secret: endpoint.secret,
      event: "run.completed",
      payload: {
        runId: "test_run_123",
        studyId: "test_study_123",
        status: "completed",
        sampleSize: 250,
        synthetic: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "webhook_test_send",
        resourceType: "webhook",
        resourceId: endpoint.id,
      },
    });

    return NextResponse.json({ ok });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to send test webhook" }, { status: 500 });
  }
}
