import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { logError } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const preset = await prisma.audiencePreset.findUnique({ where: { id } });
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }
    if (preset.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.audiencePreset.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/presets/[id]] DELETE failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}
