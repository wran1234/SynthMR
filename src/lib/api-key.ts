import crypto from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const API_SCOPES = [
  "studies:read",
  "studies:write",
  "runs:read",
  "runs:write",
  "results:read",
  "chat:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export type ApiAuth = {
  userId: string;
  apiKeyId: string;
  keyName: string;
  scopes: string[];
};

export const API_SCOPE_PRESETS: Record<string, ApiScope[]> = {
  "Read-only": ["studies:read", "runs:read", "results:read"],
  "Study runner": ["studies:read", "studies:write", "runs:read", "runs:write", "results:read"],
  "Full agent access": [...API_SCOPES],
};

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function parseScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) return [];
  return scopes.filter((s): s is string => typeof s === "string");
}

function generateRawApiKey(): string {
  const token = crypto.randomBytes(24).toString("hex");
  return `smk_${token}`;
}

export async function createApiKey(userId: string, name: string, scopes: string[]) {
  const rawKey = generateRawApiKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      scopes: scopes,
    },
  });
  return {
    id: apiKey.id,
    rawKey,
    keyPrefix: apiKey.keyPrefix,
    createdAt: apiKey.createdAt,
  };
}

function readRawKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const xApiKey = req.headers.get("x-api-key")?.trim();
  return xApiKey || null;
}

export async function authenticateRawApiKey(rawKey: string): Promise<ApiAuth | null> {
  const keyHash = hashKey(rawKey);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      name: true,
      scopes: true,
      revokedAt: true,
    },
  });
  if (!key || key.revokedAt) return null;
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    userId: key.userId,
    apiKeyId: key.id,
    keyName: key.name,
    scopes: parseScopes(key.scopes),
  };
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiAuth | null> {
  const rawKey = readRawKey(req);
  if (!rawKey) return null;
  const auth = await authenticateRawApiKey(rawKey);
  if (!auth) return null;

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: "api_key_used",
      resourceType: "api_key",
      resourceId: auth.apiKeyId,
    },
  });
  return auth;
}

export function requireApiKeyScope(auth: ApiAuth, scope: ApiScope): boolean {
  return auth.scopes.includes(scope);
}
