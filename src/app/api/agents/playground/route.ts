import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserFromRequest } from "@/lib/session";
import { authenticateRawApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  endpoint: z.string().startsWith("/api/v1/"),
  method: z.enum(["GET", "POST"]),
  apiKey: z.string().min(1),
  body: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_API_PLAYGROUND !== "true") {
    return NextResponse.json({ error: "Playground disabled" }, { status: 404 });
  }

  const user = await getSessionUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const auth = await authenticateRawApiKey(parsed.data.apiKey);
  if (!auth || auth.userId !== user.id) {
    return NextResponse.json({ error: "Invalid API key for this user" }, { status: 403 });
  }

  const url = new URL(parsed.data.endpoint, req.nextUrl.origin);
  const res = await fetch(url.toString(), {
    method: parsed.data.method,
    headers: {
      Authorization: `Bearer ${parsed.data.apiKey}`,
      "Content-Type": "application/json",
    },
    body: parsed.data.method === "GET" ? undefined : JSON.stringify(parsed.data.body ?? {}),
  });

  const responseJson = await res.json().catch(() => ({}));

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "api_playground_call",
      resourceType: "api",
      resourceId: parsed.data.endpoint,
    },
  });

  return NextResponse.json({
    status: res.status,
    endpoint: parsed.data.endpoint,
    method: parsed.data.method,
    data: responseJson,
  });
}
