import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRunOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { readSoulVersion, listSoulVersions } from "@/lib/personaStore";
import { logError } from "@/lib/logger";

// This route reads persona soul files from DATA_DIR, so production web processes must mount /data.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: studyId, runId } = await params;
    const personaId = req.nextUrl.searchParams.get("personaId");
    const versionParam = req.nextUrl.searchParams.get("version");
    const version = versionParam ? parseInt(versionParam, 10) : 0;

    if (!personaId) {
      return NextResponse.json({ error: "personaId required" }, { status: 400 });
    }

    const { run } = await requireRunOwner(req, runId, studyId);

    const sampled = await prisma.sampledPersona.findFirst({
      where: { studyRunId: runId, personaId },
    });
    if (!sampled) {
      return NextResponse.json({ error: "Persona not in this run" }, { status: 404 });
    }

    const versionList = listSoulVersions(personaId);
    const content = readSoulVersion(personaId, version);
    if (content === null && version === 0) {
      return NextResponse.json({ error: "Soul not found" }, { status: 404 });
    }
    if (content === null) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({
      personaId,
      version: version <= 0 ? (versionList.length ? versionList[versionList.length - 1] : 1) : version,
      versions: [0, ...versionList],
      content,
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/.../personas/soul] GET failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to get soul" }, { status: 500 });
  }
}
