import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSafeCallbackUrl } from "@/lib/safe-callback-url";

const CSRF_COOKIE_NAME = "csrf_token";

function generateCsrfToken(): string {
  const arr = new Uint8Array(24);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_COOKIE_NAME = "synthmr_session";
const PUBLIC_PATHS = ["/login", "/register"];
const AUTH_API_PREFIX = "/api/auth/";

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith(AUTH_API_PREFIX)) return true;
  return false;
}

// "/" is public (landing); only app routes require auth
function isProtectedPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/account" || pathname === "/status") return true;
  if (pathname === "/studies" || pathname.startsWith("/studies/")) return true;
  if (pathname.startsWith("/api/studies")) return true;
  if (pathname.startsWith("/api/jobs")) return true;
  if (pathname.startsWith("/api/presets")) return true;
  if (pathname.startsWith("/api/account")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // On GET /login or /register, set CSRF cookie if not present (double-submit; not httpOnly so client can send in header)
  if (request.method === "GET" && (pathname === "/login" || pathname === "/register")) {
    const res = NextResponse.next();
    if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
      res.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
      });
    }
    return res;
  }

  if (!isProtectedPath(pathname)) return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) return NextResponse.next();

  const baseUrl = request.nextUrl.origin;
  const rawCallback = pathname + request.nextUrl.search;
  const safeCallback = getSafeCallbackUrl(rawCallback, baseUrl);
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", safeCallback);
  return NextResponse.redirect(loginUrl);
}

// Run on protected paths and on /login, /register (for CSRF cookie). /api/auth/* is excluded so auth routes are public.
export const config = {
  matcher: ["/", "/dashboard", "/account", "/status", "/login", "/register", "/studies", "/studies/:path*", "/api/studies", "/api/studies/:path*", "/api/jobs/:path*", "/api/presets", "/api/presets/:path*", "/api/account", "/api/account/:path*"],
};
