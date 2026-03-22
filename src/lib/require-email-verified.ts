import type { SessionUser } from "@/lib/session";
import { USER_MESSAGES } from "./errors";

/**
 * Require the user to have a verified email for sensitive actions (run study, create preset).
 * Throws a 403 Response if email is not verified. With email/password auth we set emailVerified on register; optional check.
 */
export function requireEmailVerified(user: SessionUser): void {
  if (user.emailVerified != null) return;
  throw new Response(
    JSON.stringify({ error: USER_MESSAGES.emailNotVerified }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
