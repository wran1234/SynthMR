import type { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import type { SessionUser } from "@/lib/session";

/** Require an authenticated user; throws 401 Response if not logged in. Use in API routes. */
export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await getSessionUserFromRequest(req);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Return the thrown Response for use in route handlers: if (err instanceof Response) return err; */
export function asNextResponse(res: unknown): Response | null {
  if (res instanceof Response) return res;
  return null;
}
