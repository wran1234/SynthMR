import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyAuth } from "@/lib/api-v1";
import { ApiV1RunSchema } from "@/lib/api-schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKeyAuth(req, "runs:read");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const run = await prisma.studyRun.findUnique({
    where: { id },
    include: { study: { select: { userId: true } } },
  });
  if (!run || run.study.userId !== authResult.auth.userId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(
    ApiV1RunSchema.parse({
      id: run.id,
      studyId: run.studyId,
      status: run.status,
      sampleSize: run.sampleSize,
      populationMode: run.populationMode,
      populationSize: run.populationSize,
      audienceLabel: run.audienceLabel,
      jobId: run.jobId,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt ? run.startedAt.toISOString() : null,
      finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    })
  );
}
