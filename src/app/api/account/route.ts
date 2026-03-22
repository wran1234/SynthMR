import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";

const DeleteAccountSchema = z.object({ confirm: z.literal(true) });

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const parsed = DeleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: USER_MESSAGES.confirmRequired }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: user.id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Account delete failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
