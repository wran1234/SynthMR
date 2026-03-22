import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyAuth } from "@/lib/api-v1";
import { ApiV1ResultsResponseSchema } from "@/lib/api-schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKeyAuth(req, "results:read");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const run = await prisma.studyRun.findUnique({
    where: { id },
    include: { study: { select: { userId: true } } },
  });
  if (!run || run.study.userId !== authResult.auth.userId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const aggregate = await prisma.aggregate.findFirst({ where: { studyRunId: run.id } });
  if (!aggregate) {
    return NextResponse.json({ error: "Results not available yet" }, { status: 404 });
  }

  return NextResponse.json(
    ApiV1ResultsResponseSchema.parse({
      runId: run.id,
      results: aggregate.results,
    })
  );
}
