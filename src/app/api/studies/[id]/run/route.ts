import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStudyOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { requireEmailVerified } from "@/lib/require-email-verified";
import { rateLimit, studiesLimitKey, LIMITS } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";
import { studyQueue, type StudyJobPayload, type TargetAudienceJson } from "@/queue/client";

const SAMPLE_SIZE_MIN = 100;
const SAMPLE_SIZE_MAX = 2000;
const SAMPLE_SIZE_DEFAULT = 250;

const MAX_SAMPLE_SIZE_FREE = Math.max(100, parseInt(process.env.MAX_SAMPLE_SIZE_FREE ?? "300", 10) || 300);
const MAX_SAMPLE_SIZE_PRO = Math.max(300, parseInt(process.env.MAX_SAMPLE_SIZE_PRO ?? "1000", 10) || 1000);

/** Server-side cap (legacy); also enforce plan-based limits. */
function getMaxSampleSize(): number {
  const v = parseInt(process.env.MAX_SAMPLE_SIZE ?? "500", 10);
  return Number.isNaN(v) || v < 1 ? 500 : v;
}

function getMaxSampleSizeForPlan(plan: string | null): number {
  if (plan === "pro" || plan === "enterprise") return Math.min(MAX_SAMPLE_SIZE_PRO, getMaxSampleSize());
  return Math.min(MAX_SAMPLE_SIZE_FREE, getMaxSampleSize());
}

const AUDIENCE_POP_SIZE_DEFAULT = parseInt(process.env.AUDIENCE_POPULATION_SIZE_DEFAULT ?? "100000", 10) || 100000;
const AUDIENCE_POP_SIZE_MAX = parseInt(process.env.AUDIENCE_POPULATION_SIZE_MAX ?? "500000", 10) || 500000;

const StartRunSchema = z.object({
  sampleSize: z.number().min(SAMPLE_SIZE_MIN).max(SAMPLE_SIZE_MAX).optional(),
  populationMode: z.enum(["general", "audience_specific"]).optional(),
  populationSize: z.number().min(10000).max(AUDIENCE_POP_SIZE_MAX).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studyId } = await params;
    const { user, study } = await requireStudyOwner(req, studyId);
    requireEmailVerified(user);

    const lim = await rateLimit(studiesLimitKey(user.id), LIMITS.STUDIES_WINDOW_SEC, LIMITS.STUDIES_MAX);
    if (!lim.allowed) {
      return NextResponse.json(
        { error: USER_MESSAGES.rateLimited, retryAfterSeconds: lim.retryAfterSeconds },
        { status: 429, headers: lim.retryAfterSeconds ? { "Retry-After": String(lim.retryAfterSeconds) } : undefined }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } });
    const plan = dbUser?.plan ?? null;
    const maxForPlan = getMaxSampleSizeForPlan(plan);

    const body = await req.json().catch(() => ({}));
    const parsed = StartRunSchema.safeParse({
      sampleSize: body.sampleSize != null ? Number(body.sampleSize) : SAMPLE_SIZE_DEFAULT,
      populationMode: body.populationMode,
      populationSize: body.populationSize != null ? Number(body.populationSize) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: USER_MESSAGES.invalidInput }, { status: 400 });
    }

    const requestedSize = Math.max(SAMPLE_SIZE_MIN, parsed.data.sampleSize ?? SAMPLE_SIZE_DEFAULT);
    const sampleSize = Math.min(SAMPLE_SIZE_MAX, requestedSize);
    if (sampleSize > maxForPlan) {
      return NextResponse.json(
        {
          error: `Sample size ${sampleSize} exceeds your plan limit (${maxForPlan}). Free: up to ${MAX_SAMPLE_SIZE_FREE}; Pro: up to ${MAX_SAMPLE_SIZE_PRO}.`,
        },
        { status: 400 }
      );
    }

    const targetAudienceJson = (() => {
      const t = study.targetAudienceJson as TargetAudienceJson | null | undefined;
      return t && typeof t === "object" && "label" in t && typeof t.label === "string" ? t : undefined;
    })();
    const isGeneralAudience = !targetAudienceJson?.label || targetAudienceJson.label.toLowerCase() === "general population";
    const requestedAudienceSpecific = parsed.data.populationMode === "audience_specific";
    const populationMode = (requestedAudienceSpecific && !isGeneralAudience ? "audience_specific" : "general") as "general" | "audience_specific";
    let populationSize: number | null = null;
    if (populationMode === "audience_specific") {
      const raw = parsed.data.populationSize ?? AUDIENCE_POP_SIZE_DEFAULT;
      populationSize = Math.min(AUDIENCE_POP_SIZE_MAX, Math.max(10000, raw));
    }
    const audienceLabel = populationMode === "audience_specific" && targetAudienceJson?.label ? targetAudienceJson.label : null;

    const seed = `study_${studyId}_${Date.now()}`;

    const studyRun = await prisma.studyRun.create({
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
        studyRunId: studyRun.id,
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
      { jobId: studyRun.id }
    );

    const jobIdStr = typeof job.id === "string" ? job.id : String(job.id);

    await prisma.$transaction(async (tx) => {
      await tx.studyRun.update({
        where: { id: studyRun.id },
        data: { jobId: jobIdStr },
      });
      await tx.study.update({
        where: { id: studyId },
        data: { status: "running" },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "run_start", resourceType: "run", resourceId: studyRun.id },
      });
    });

    return NextResponse.json({
      studyRunId: studyRun.id,
      jobId: job.id,
      status: "pending",
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Start run failed", { studyId: (await params).id });
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
