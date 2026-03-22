import { NextRequest, NextResponse } from "next/server";
import { studyQueue } from "@/queue/client";
import { prisma } from "@/lib/prisma";
import { requireJobOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { rateLimit, jobsLimitKey, LIMITS } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { user, run } = await requireJobOwner(req, jobId);

    const lim = await rateLimit(jobsLimitKey(user.id), LIMITS.JOBS_WINDOW_SEC, LIMITS.JOBS_MAX);
    if (!lim.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: lim.retryAfterSeconds },
        { status: 429, headers: lim.retryAfterSeconds ? { "Retry-After": String(lim.retryAfterSeconds) } : undefined }
      );
    }

    let progress: number | undefined;
    if (run) {
      try {
        const job = await studyQueue.getJob(jobId);
        if (job) progress = job.progress as number | undefined;
      } catch {
        // job may not exist yet
      }
      return NextResponse.json({
        jobId,
        status: run.status,
        studyRunId: run.id,
        errorMessage: run.errorMessage,
        progress,
      });
    }

    const job = await studyQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const jobPayload = job.data as { studyId?: string };
    if (jobPayload.studyId) {
      const study = await prisma.study.findUnique({
        where: { id: jobPayload.studyId },
        select: { userId: true },
      });
      if (study?.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const state = await job.getState();
    return NextResponse.json({
      jobId,
      status: state === "completed" ? "completed" : state === "failed" ? "failed" : "running",
      progress: job.progress,
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/jobs/[jobId]] GET failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to get job status" }, { status: 500 });
  }
}
