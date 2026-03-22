"use client";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/** Get CSRF token from cookie (client-side). Cookie is set by middleware on /login, /register and is not httpOnly. */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Headers to add to fetch for state-changing requests (POST/PUT/DELETE) that require CSRF. */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}
