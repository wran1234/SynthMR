import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  });
}
