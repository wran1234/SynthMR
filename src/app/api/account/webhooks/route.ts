import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, events: true, createdAt: true, revokedAt: true },
    });
    return NextResponse.json({
      eventsCatalog: WEBHOOK_EVENTS,
      endpoints: endpoints.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        revokedAt: e.revokedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to load webhooks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const parsed = CreateWebhookSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const events = parsed.data.events.filter((e) => WEBHOOK_EVENTS.includes(e as (typeof WEBHOOK_EVENTS)[number]));
    if (events.length === 0) {
      return NextResponse.json({ error: "At least one valid event is required" }, { status: 400 });
    }
    const secret = generateWebhookSecret();
    const created = await prisma.webhookEndpoint.create({
      data: {
        userId: user.id,
        url: parsed.data.url,
        events,
        secret,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "webhook_create",
        resourceType: "webhook",
        resourceId: created.id,
      },
    });

    return NextResponse.json({
      id: created.id,
      url: created.url,
      events: created.events,
      secret,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to create webhook endpoint" }, { status: 500 });
  }
}
