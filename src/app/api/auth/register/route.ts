import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, authLimitKey, LIMITS } from "@/lib/rate-limit";
import { USER_MESSAGES } from "@/lib/errors";

const MIN_PASSWORD_LENGTH = 10;

const RegisterSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  name: z.string().max(200).optional(),
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
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: USER_MESSAGES.invalidInput, details: msg }, { status: 400 });
    }
    const { email, password, name } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token, expiresAt);
    return res;
  } catch {
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
