import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { studyQueue, type StudyJobPayload, type TargetAudienceJson } from "@/queue/client";
import { requireApiKeyAuth, enforceApiKeyRunCreateLimit } from "@/lib/api-v1";
import { ApiV1CreateRunResponseSchema } from "@/lib/api-schemas";

const SAMPLE_SIZE_MIN = 100;
const SAMPLE_SIZE_MAX = 2000;
const SAMPLE_SIZE_DEFAULT = 250;
const MAX_SAMPLE_SIZE_FREE = Math.max(100, parseInt(process.env.MAX_SAMPLE_SIZE_FREE ?? "300", 10) || 300);
const MAX_SAMPLE_SIZE_PRO = Math.max(300, parseInt(process.env.MAX_SAMPLE_SIZE_PRO ?? "1000", 10) || 1000);
const AUDIENCE_POP_SIZE_DEFAULT = parseInt(process.env.AUDIENCE_POPULATION_SIZE_DEFAULT ?? "100000", 10) || 100000;
const AUDIENCE_POP_SIZE_MAX = parseInt(process.env.AUDIENCE_POPULATION_SIZE_MAX ?? "500000", 10) || 500000;

function getMaxSampleSize(): number {
  const v = parseInt(process.env.MAX_SAMPLE_SIZE ?? "500", 10);
  return Number.isNaN(v) || v < 1 ? 500 : v;
}

function getMaxSampleSizeForPlan(plan: string | null): number {
  if (plan === "pro" || plan === "enterprise") return Math.min(MAX_SAMPLE_SIZE_PRO, getMaxSampleSize());
  return Math.min(MAX_SAMPLE_SIZE_FREE, getMaxSampleSize());
}

const StartRunSchema = z.object({
  sampleSize: z.number().min(SAMPLE_SIZE_MIN).max(SAMPLE_SIZE_MAX).optional(),
  populationMode: z.enum(["general", "audience_specific"]).optional(),
  populationSize: z.number().min(10000).max(AUDIENCE_POP_SIZE_MAX).optional(),
});

function mapRun(run: {
  id: string;
  studyId: string;
  status: string;
  sampleSize: number;
  populationMode: string;
  populationSize: number | null;
  audienceLabel: string | null;
  jobId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}) {
  return {
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
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKeyAuth(req, "runs:write");
  if (!authResult.ok) return authResult.response;

  const runLimitResponse = await enforceApiKeyRunCreateLimit(authResult.auth.apiKeyId);
  if (runLimitResponse) return runLimitResponse;

  const { id: studyId } = await params;
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study || study.userId !== authResult.auth.userId) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authResult.auth.userId },
    select: { plan: true },
  });
  const maxForPlan = getMaxSampleSizeForPlan(dbUser?.plan ?? null);

  const parsed = StartRunSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestedSize = Math.max(SAMPLE_SIZE_MIN, parsed.data.sampleSize ?? SAMPLE_SIZE_DEFAULT);
  const sampleSize = Math.min(SAMPLE_SIZE_MAX, requestedSize);
  if (sampleSize > maxForPlan) {
    return NextResponse.json(
      { error: `Sample size ${sampleSize} exceeds plan limit (${maxForPlan}).` },
      { status: 400 }
    );
  }

  const targetAudienceJson = (() => {
    const t = study.targetAudienceJson as TargetAudienceJson | null | undefined;
    return t && typeof t === "object" && "label" in t && typeof t.label === "string" ? t : undefined;
  })();
  const isGeneralAudience = !targetAudienceJson?.label || targetAudienceJson.label.toLowerCase() === "general population";
  const requestedAudienceSpecific = parsed.data.populationMode === "audience_specific";
  const populationMode = (requestedAudienceSpecific && !isGeneralAudience ? "audience_specific" : "general") as
    | "general"
    | "audience_specific";
  let populationSize: number | null = null;
  if (populationMode === "audience_specific") {
    const raw = parsed.data.populationSize ?? AUDIENCE_POP_SIZE_DEFAULT;
    populationSize = Math.min(AUDIENCE_POP_SIZE_MAX, Math.max(10000, raw));
  }
  const audienceLabel =
    populationMode === "audience_specific" && targetAudienceJson?.label ? targetAudienceJson.label : null;
  const seed = `study_${studyId}_${Date.now()}`;

  const run = await prisma.studyRun.create({
    data: {
      studyId,
      seed,
      sampleSize,
      populationMode,
      populationSize,
      audienceLabel,
      status: "pending",
    },
  });

  const job = await studyQueue.add(
    "run",
    {
      studyRunId: run.id,
      studyId,
      ideaText: study.ideaText,
      geography: study.geography,
      industry: study.industry,
      pricePoints: study.pricePoints,
      seed,
      sampleSize,
      targetAudienceJson,
      populationMode,
      populationSize: populationSize ?? undefined,
      audienceLabel: audienceLabel ?? undefined,
    } satisfies StudyJobPayload,
    { jobId: run.id }
  );

  const jobIdStr = typeof job.id === "string" ? job.id : String(job.id);
  await prisma.$transaction([
    prisma.studyRun.update({ where: { id: run.id }, data: { jobId: jobIdStr } }),
    prisma.study.update({ where: { id: studyId }, data: { status: "running" } }),
    prisma.auditLog.create({
      data: {
        userId: authResult.auth.userId,
        action: "api_run_start",
        resourceType: "run",
        resourceId: run.id,
      },
    }),
  ]);

  const hydratedRun = await prisma.studyRun.findUniqueOrThrow({ where: { id: run.id } });
  return NextResponse.json(ApiV1CreateRunResponseSchema.parse({ run: mapRun(hydratedRun) }));
}
