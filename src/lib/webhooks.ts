import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logWarn } from "@/lib/logger";

export const WEBHOOK_EVENTS = ["run.completed", "run.failed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

type DeliveryHeaders = Record<string, string>;

function sign(secret: string, body: string): string {
  const digest = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

function parseEvents(events: unknown): string[] {
  if (!Array.isArray(events)) return [];
  return events.filter((e): e is string => typeof e === "string");
}

async function postWithRetry(
  url: string,
  body: string,
  headers: DeliveryHeaders,
  maxAttempts: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
      if (res.ok) return true;
    } catch {
      // fall through retry
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  return false;
}

export async function deliverWebhookToEndpoint(params: {
  endpointId: string;
  url: string;
  secret: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}): Promise<boolean> {
  const body = JSON.stringify({
    event: params.event,
    data: params.payload,
    sentAt: new Date().toISOString(),
  });
  const signature = sign(params.secret, body);
  const ok = await postWithRetry(params.url, body, {
    "Content-Type": "application/json",
    "X-SynthMR-Signature": signature,
    "X-SynthMR-Event": params.event,
    "X-SynthMR-Endpoint-Id": params.endpointId,
  });
  return ok;
}

export async function deliverRunWebhook(params: {
  userId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { userId, event, payload } = params;
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, url: true, secret: true, events: true },
  });

  for (const endpoint of endpoints) {
    const allowed = parseEvents(endpoint.events);
    if (!allowed.includes(event)) continue;

    const ok = await deliverWebhookToEndpoint({
      endpointId: endpoint.id,
      url: endpoint.url,
      secret: endpoint.secret,
      event,
      payload,
    });
    if (!ok) {
      logWarn("Webhook delivery failed after retries", {
        endpointId: endpoint.id,
        userId,
        event,
      });
    }
  }
}
