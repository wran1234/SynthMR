import crypto from "crypto";
import type { NextRequest } from "next/server";

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? "csrf_token";
const CSRF_HEADER_NAME = process.env.CSRF_HEADER_NAME ?? "x-csrf-token";

/** Verify that the request has a valid CSRF token (header matches cookie). Returns false if invalid. */
export function verifyCsrf(req: NextRequest): boolean {
  const headerToken = req.headers.get(CSRF_HEADER_NAME)?.trim();
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value?.trim();
  if (!headerToken || !cookieToken || headerToken.length !== 48 || cookieToken.length !== 48) return false;
  const a = Buffer.from(headerToken, "hex");
  const b = Buffer.from(cookieToken, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
