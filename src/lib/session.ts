import { cookies } from "next/headers";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "synthmr_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS) || 30;
const SECURE = process.env.NODE_ENV === "production";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: Date | null;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expiresAt: Date): { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge?: number; expires?: Date } {
  return {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}

/** Create a session for the user; returns the token and expiresAt. Caller must set the cookie on the response. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authSession.create({
    data: { userId, tokenHash, expiresAt },
  });
  return { token, expiresAt };
}

/** Set the session cookie on a NextResponse. Call after createSession. */
export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
}

/** Get the current user from the request cookie (API routes). Returns null if no valid session. */
export async function getSessionUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    emailVerified: session.user.emailVerified,
  };
}

/** Get the current user from cookies() (Server Components, e.g. layout). Returns null if no valid session. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    emailVerified: session.user.emailVerified,
  };
}

/** Destroy the session for the request and return headers to clear the cookie. */
export async function destroySession(req: NextRequest): Promise<{ clearCookie: true }> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.authSession.deleteMany({ where: { tokenHash } }).catch(() => {});
  }
  return { clearCookie: true };
}

/** Build a response that clears the session cookie. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
