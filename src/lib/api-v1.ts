import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateApiKey, requireApiKeyScope, type ApiScope, type ApiAuth } from "@/lib/api-key";
import { LIMITS, apiKeyRequestsLimitKey, apiKeyRunCreateLimitKey, rateLimit } from "@/lib/rate-limit";

export async function requireApiKeyAuth(
  req: NextRequest,
  scope: ApiScope
): Promise<
  | { ok: true; auth: ApiAuth }
  | { ok: false; response: NextResponse }
> {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized API key" }, { status: 401 }) };
  }
  const reqRate = await rateLimit(
    apiKeyRequestsLimitKey(auth.apiKeyId),
    LIMITS.API_KEY_REQ_WINDOW_SEC,
    LIMITS.API_KEY_REQ_MAX
  );
  if (!reqRate.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSeconds: reqRate.retryAfterSeconds },
        { status: 429 }
      ),
    };
  }
  if (!requireApiKeyScope(auth, scope)) {
    return { ok: false, response: NextResponse.json({ error: "Insufficient API key scope" }, { status: 403 }) };
  }
  return { ok: true, auth };
}

export async function enforceApiKeyRunCreateLimit(apiKeyId: string): Promise<NextResponse | null> {
  const runRate = await rateLimit(
    apiKeyRunCreateLimitKey(apiKeyId),
    LIMITS.API_KEY_RUN_CREATE_WINDOW_SEC,
    LIMITS.API_KEY_RUN_CREATE_MAX
  );
  if (!runRate.allowed) {
    return NextResponse.json(
      { error: "Run creation rate limit exceeded", retryAfterSeconds: runRate.retryAfterSeconds },
      { status: 429 }
    );
  }
  return null;
}
