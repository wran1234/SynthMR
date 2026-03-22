/**
 * Data retention cleanup: delete study runs (and cascaded data) older than DATA_RETENTION_DAYS.
 * Run daily via cron or a scheduled job. GET /api/cron/cleanup or similar can call runCleanup().
 */

import { prisma } from "./prisma";

const STUCK_STATUSES = ["generating_population", "sampling", "surveying", "aggregating"];

export function getRetentionDays(): number {
  const v = parseInt(process.env.DATA_RETENTION_DAYS ?? "90", 10);
  return Number.isNaN(v) || v < 1 ? 90 : Math.min(365, v);
}

/**
 * Reset runs that were stuck (worker crashed) to pending so they can be retried.
 * Call this when worker starts.
 */
export async function resumeStuckRuns(): Promise<number> {
  const result = await prisma.studyRun.updateMany({
    where: { status: { in: STUCK_STATUSES } },
    data: { status: "pending" },
  });
  return result.count;
}

/**
 * Delete study runs (and their responses, aggregates, survey, sampledPersonas) older than retention.
 * Also cleans direct-sample cache files older than DIRECT_SAMPLE_CACHE_TTL_DAYS.
 * Uses finishedAt or createdAt for age.
 */
export async function runCleanup(): Promise<{ deletedRuns: number; directSampleCache: { deletedCache: number; deletedTmp: number; deletedLocks: number } }> {
  const { cleanupDirectSampleCache } = await import("./populationStore");
  const directSampleCache = cleanupDirectSampleCache();

  const days = getRetentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const oldRuns = await prisma.studyRun.findMany({
    where: {
      OR: [
        { finishedAt: { lt: cutoff } },
        { finishedAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });

  let deletedRuns = 0;
  for (const run of oldRuns) {
    await prisma.studyRun.delete({ where: { id: run.id } });
    deletedRuns++;
  }

  return { deletedRuns, directSampleCache };
}
