import { NextResponse } from "next/server";
import crypto from "crypto";

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? "csrf_token";

/** GET: set CSRF cookie and return token. Call from login/register page on mount so the client has a token to send in x-csrf-token header. */
export async function GET() {
  const token = crypto.randomBytes(24).toString("hex");
  const res = NextResponse.json({ token });
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
