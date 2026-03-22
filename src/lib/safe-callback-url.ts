/**
 * Return a same-origin safe callback URL for redirects. Prevents open redirects.
 * Only allows path starting with "/" or absolute URL with same origin as baseUrl.
 * Returns "/" if invalid or missing. Safe to use in Edge (middleware).
 */
export function getSafeCallbackUrl(callbackUrl: string | null | undefined, baseUrl: string): string {
  const base = baseUrl.trim();
  if (!callbackUrl || typeof callbackUrl !== "string") return "/";
  const raw = callbackUrl.trim();
  if (!raw) return "/";
  try {
    if (raw.startsWith("/")) {
      const path = raw.split("?")[0];
      const search = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
      if (!path.startsWith("//")) return path + search;
      return "/";
    }
    const parsed = new URL(raw, base);
    const baseOrigin = new URL(base).origin;
    if (parsed.origin !== baseOrigin) return "/";
    return parsed.pathname + parsed.search || "/";
  } catch {
    return "/";
  }
}
