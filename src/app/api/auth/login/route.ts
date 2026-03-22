import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, authLimitKey, LIMITS } from "@/lib/rate-limit";
import { USER_MESSAGES } from "@/lib/errors";

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const lim = await rateLimit(authLimitKey(ip), LIMITS.AUTH_WINDOW_SEC, LIMITS.AUTH_MAX);
    if (!lim.allowed) {
      return NextResponse.json(
        { error: USER_MESSAGES.rateLimited, retryAfterSeconds: lim.retryAfterSeconds },
        { status: 429, headers: lim.retryAfterSeconds ? { "Retry-After": String(lim.retryAfterSeconds) } : undefined }
      );
    }
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: USER_MESSAGES.invalidInput }, { status: 400 });
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token, expiresAt);
    return res;
  } catch {
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
