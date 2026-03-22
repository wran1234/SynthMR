import type { NextRequest } from "next/server";
import type { Study, StudyRun } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import type { SessionUser } from "@/lib/session";

type StudyWithRuns = Study & { runs: StudyRun[] };
type RunWithStudy = StudyRun & { study: Study };

export async function requireStudyOwner(req: NextRequest, studyId: string): Promise<{ user: SessionUser; study: StudyWithRuns }> {
  const user = await requireUser(req);
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: { runs: { orderBy: { createdAt: "desc" } } },
  });
  if (!study) {
    throw new Response(JSON.stringify({ error: "Study not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (study.userId !== user.id) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { user, study: study as StudyWithRuns };
}

export async function requireRunOwner(
  req: NextRequest,
  runId: string,
  studyId?: string
): Promise<{ user: SessionUser; run: RunWithStudy }> {
  const user = await requireUser(req);
  const run = await prisma.studyRun.findFirst({
    where: studyId ? { id: runId, studyId } : { id: runId },
    include: { study: true },
  });
  if (!run) {
    throw new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (run.study.userId !== user.id) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { user, run };
}

export async function requireJobOwner(req: NextRequest, jobId: string): Promise<{ user: SessionUser; run?: RunWithStudy }> {
  const user = await requireUser(req);
  const run = await prisma.studyRun.findUnique({
    where: { jobId },
    include: { study: true },
  });
  if (run) {
    if (run.study.userId !== user.id) {
      throw new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return { user, run };
  }
  return { user };
}

export { asNextResponse };
