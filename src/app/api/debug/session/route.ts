import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const SESSION_COOKIE_NAME = "synthmr_session";

/**
 * Dev-only diagnostic endpoint.
 * Never expose this in production; the handler hard-returns 404 when NODE_ENV=production.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ hasCookie: false });
  }

  const user = await getSessionUser();
  const tokenPrefix = token.slice(0, 6);

  return NextResponse.json({
    hasCookie: true,
    tokenPrefix,
    userFound: !!user,
    ...(user && { userId: user.id }),
  });
}
