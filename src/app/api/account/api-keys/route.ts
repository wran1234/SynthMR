import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { createApiKey, API_SCOPES } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string()).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });
    return NextResponse.json({
      scopesCatalog: API_SCOPES,
      keys: keys.map((k) => ({
        ...k,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
        revokedAt: k.revokedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to load API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const parsed = CreateApiKeySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const scopes = parsed.data.scopes.filter((s) => API_SCOPES.includes(s as (typeof API_SCOPES)[number]));
    if (scopes.length === 0) {
      return NextResponse.json({ error: "At least one valid scope is required" }, { status: 400 });
    }

    const created = await createApiKey(user.id, parsed.data.name, scopes);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "api_key_create",
        resourceType: "api_key",
        resourceId: created.id,
      },
    });
    return NextResponse.json({
      id: created.id,
      keyPrefix: created.keyPrefix,
      key: created.rawKey,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
