/**
 * BullMQ worker: processes study runs (generate population, sample, survey, aggregate).
 * Population reuse, LLM concurrency, soul update mode, progress every 10.
 * On start: validates env + volume, resumes stuck runs to pending, then processes jobs.
 * Distributed lock (job:{runId}) prevents duplicate execution across Fly instances.
 * Max 3 attempts per job; then run marked failed.
 */

import { Worker, Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { connection } from "./connection";
import { STUDY_QUEUE_NAME, type StudyJobPayload } from "./client";
import { prisma } from "../lib/prisma";
import { getLlmConfig, type LlmUsage } from "../lib/llm";
import { computeCostCents } from "../lib/llm-cost";
import { getOrCreatePopulationForRun, sampleStratifiedSeeded, filterPopulationByAudience, readDirectSampleManifest, cleanupDirectSampleCache } from "../lib/populationStore";
import { generateSurvey } from "../lib/surveyGenerator";
import { simulateOne } from "../lib/simulateResponses";
import { aggregateResults, type ResponseRecord } from "../lib/aggregateResults";
import type { Persona } from "../lib/types";
import {
  ensurePersonaFolder,
  readSoulMd,
  writeSoulMd,
  readMemoryEvents,
  appendMemoryEvent,
} from "../lib/personaStore";
import {
  generateInitialSoulMd,
  maybeUpdateSoul,
  extractSoulThemes,
  shouldUpdateSoul,
} from "../lib/soulEngine";
import { connection as redis } from "./connection";
import { resumeStuckRuns } from "../lib/cleanup";
import { safeErrorMessage } from "../lib/log-safe";
import { logInfo, logError, logWarn } from "../lib/logger";
import { acquireLock, releaseLock } from "../lib/redis-lock";
import { validateProductionEnv, warnIfDotEnvPresentInProduction } from "../lib/env-check";
import { validateDataDir } from "../lib/volume-check";
import { setLoggerProcessType } from "../lib/logger";
import { deliverRunWebhook } from "../lib/webhooks";

const MAX_SAMPLE_SIZE =
  parseInt(process.env.MAX_SAMPLE_SIZE ?? "500", 10) || 500;

const MAX_LLM_CALLS_PER_RUN = Math.max(1, parseInt(process.env.MAX_LLM_CALLS_PER_RUN ?? "5000", 10) || 5000);

const RUN_TIMEOUT_MINUTES = Math.max(5, parseInt(process.env.RUN_TIMEOUT_MINUTES ?? "30", 10) || 30);
const RUN_LOCK_TTL_SEC = 30 * 60;
const WORKER_HEARTBEAT_KEY = "synthmr:worker:heartbeat";
const WORKER_HEARTBEAT_TTL = 90;

const WORKER_CONCURRENCY = Math.max(1, Math.min(20, parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10) || 5));

const SIM_BATCH_SIZE = Math.max(5, Math.min(50, parseInt(process.env.SIM_BATCH_SIZE ?? "25", 10) || 25));

async function processStudyRun(job: Job<StudyJobPayload>) {
  const { studyRunId, studyId, ideaText, geography, industry, pricePoints, seed, sampleSize, targetAudienceJson, populationMode, populationSize: jobPopulationSize } =
    job.data;

  logInfo("Job started", { jobId: job.id, runId: studyRunId, sampleSize });
  const owner = await prisma.study.findUnique({
    where: { id: studyId },
    select: { userId: true },
  });

  const lockKey = `job:${studyRunId}`;
  const acquired = await acquireLock(lockKey, RUN_LOCK_TTL_SEC);
  if (!acquired) {
    logWarn("Job already locked by another instance, skipping duplicate execution", { runId: studyRunId });
    return;
  }
  try {
  const run = await prisma.studyRun.findUnique({ where: { id: studyRunId }, select: { startedAt: true, llmCallsUsed: true } });
  if (run && run.llmCallsUsed >= MAX_LLM_CALLS_PER_RUN) {
    const msg = `Run already at LLM budget (${run.llmCallsUsed} >= ${MAX_LLM_CALLS_PER_RUN}).`;
    await prisma.studyRun.update({
      where: { id: studyRunId },
      data: { status: "failed", errorMessage: msg, finishedAt: new Date() },
    });
    logWarn("Run skipped: LLM budget already reached", { runId: studyRunId, llmCallsUsed: run.llmCallsUsed });
    return;
  }
  if (run?.startedAt) {
    const elapsedMs = Date.now() - run.startedAt.getTime();
    if (elapsedMs > RUN_TIMEOUT_MINUTES * 60 * 1000) {
      const msg = `Run exceeded timeout (${RUN_TIMEOUT_MINUTES} min).`;
      await prisma.studyRun.update({
        where: { id: studyRunId },
        data: { status: "failed", errorMessage: msg, finishedAt: new Date() },
      });
      logError("Run timeout", { runId: studyRunId });
      return;
    }
  }

  if (sampleSize > MAX_SAMPLE_SIZE) {
    const msg = `Sample size ${sampleSize} exceeds MAX_SAMPLE_SIZE (${MAX_SAMPLE_SIZE}). Set MAX_SAMPLE_SIZE in env to allow larger samples.`;
    logError("Sample size exceeds limit", { runId: studyRunId });
    await prisma.studyRun.update({
      where: { id: studyRunId },
      data: { status: "failed", errorMessage: msg, finishedAt: new Date() },
    });
    throw new Error(msg);
  }

  let startedAt: Date | null = null;
  const surveyStartTimes: number[] = [];

  const terminalStatuses = ["completed", "failed", "limit_reached"];
  const updateStatus = async (status: string, errorMessage?: string) => {
    if (status !== "pending" && !startedAt) startedAt = new Date();
    await prisma.studyRun.update({
      where: { id: studyRunId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        startedAt: startedAt ?? undefined,
        finishedAt: terminalStatuses.includes(status) ? new Date() : undefined,
      },
    });
  };

  /**
   * Atomic reserve of one LLM call slot. Safe under WORKER_CONCURRENCY and multiple instances.
   * Returns false when budget exhausted; caller must stop LLM work and finalize (no throw).
   */
  const reserveLlmBudgetSlot = async (): Promise<boolean> => {
    const rows = await prisma.$queryRaw<Array<{ llmCallsUsed: number }>>(
      Prisma.sql`UPDATE "StudyRun" SET "llmCallsUsed" = "llmCallsUsed" + 1 WHERE id = ${studyRunId} AND "llmCallsUsed" < ${MAX_LLM_CALLS_PER_RUN} RETURNING "llmCallsUsed"`
    );
    if (rows.length === 0) {
      logInfo("LLM budget exhausted; finalizing partial run", { runId: studyRunId });
      return false;
    }
    return true;
  };

  /**
   * Atomic reserve up to n LLM call slots. Returns number actually reserved (0 to n).
   * If 0 slots remain and n > 0, caller should finalize with limit_reached.
   */
  const reserveBudgetSlots = async (n: number): Promise<number> => {
    if (n <= 0) return 0;
    const reserved = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ llmCallsUsed: number }>>(
        Prisma.sql`SELECT "llmCallsUsed" FROM "StudyRun" WHERE id = ${studyRunId} FOR UPDATE`
      );
      if (!rows.length || rows[0].llmCallsUsed >= MAX_LLM_CALLS_PER_RUN) return 0;
      const toAdd = Math.min(n, MAX_LLM_CALLS_PER_RUN - rows[0].llmCallsUsed);
      await tx.$executeRaw(
        Prisma.sql`UPDATE "StudyRun" SET "llmCallsUsed" = "llmCallsUsed" + ${toAdd} WHERE id = ${studyRunId}`
      );
      return toAdd;
    });
    if (reserved === 0 && n > 0) logInfo("LLM budget exhausted; no slots reserved", { runId: studyRunId });
    return reserved;
  };

  const llmModel = getLlmConfig().model;

  /** Add token and cost usage after an LLM call. */
  const addLlmUsage = async (usage: LlmUsage | undefined): Promise<void> => {
    if (!usage) return;
    const totalTokens = usage.promptTokens + usage.completionTokens;
    if (totalTokens <= 0) return;
    const costCents = computeCostCents(llmModel, usage.promptTokens, usage.completionTokens);
    await prisma.$executeRaw`
      UPDATE "StudyRun"
      SET "llmTokensUsed" = "llmTokensUsed" + ${totalTokens},
          "llmCostCents" = "llmCostCents" + ${costCents}
      WHERE id = ${studyRunId}
    `;
  };

  /** Finalize run with current responses and set terminal status (limit_reached or completed). */
  const finalizeRun = async (
    responses: ResponseRecord[],
    status: "limit_reached" | "completed"
  ): Promise<void> => {
    await updateStatus("aggregating");
    const resultsWithMeta = {
      ...aggregateResults(responses, pricePoints, populationSizeForAggregate),
      metadata: {
        targetAudience: targetAudienceJson?.label ?? null,
        filteredPoolSize: (job.data.populationMode ?? "general") === "audience_specific" ? null : filteredPoolSize,
        sampleSize: sampledCount,
        populationMode: job.data.populationMode ?? "general",
        populationSize: populationSizeForAggregate,
      },
    };
    await prisma.aggregate.upsert({
      where: { studyRunId },
      create: { studyRunId, results: resultsWithMeta as object },
      update: { results: resultsWithMeta as object },
    });
    await job.updateProgress(100);
    await updateStatus(status);
    if (owner?.userId) {
      await deliverRunWebhook({
        userId: owner.userId,
        event: status === "completed" || status === "limit_reached" ? "run.completed" : "run.failed",
        payload: {
          runId: studyRunId,
          studyId,
          status,
          sampleSize: sampledCount,
        },
      });
    }
  };

  let populationSizeForAggregate: number;
  let filteredPoolSize: number | null = null;
  let sampledCount = 0;

  try {
    logInfo("Phase: generating_population", { runId: studyRunId });
    await updateStatus("generating_population");
    const popResult = await getOrCreatePopulationForRun({
      runId: studyRunId,
      geography,
      seed,
      populationMode: populationMode ?? "general",
      populationSize: jobPopulationSize ?? null,
      targetAudienceJson: targetAudienceJson ?? null,
      sampleSize,
    });
    const { manifestPath, populationSize: popSize, populationMode: mode, audienceLabel, directSample, populationMethod, populationVersion } = popResult;
    populationSizeForAggregate = popSize;
    logInfo("Population ready", { runId: studyRunId, mode, size: popSize, directSample: directSample ?? false });
    await prisma.studyRun.update({
      where: { id: studyRunId },
      data: {
        populationManifestPath: manifestPath,
        populationMethod: populationMethod ?? null,
        populationVersion: populationVersion ?? null,
      },
    });

    await updateStatus("sampling");
    let sample: Persona[];
    if (directSample) {
      sample = await readDirectSampleManifest(manifestPath);
      sampledCount = sample.length;
      logInfo("Direct sample loaded", { runId: studyRunId, count: sample.length });
    } else {
      let filterSet: Set<number> | null = null;
      if (mode === "audience_specific") {
        logInfo("Sampling audience-specific", { runId: studyRunId, sampleSize });
      } else if (targetAudienceJson?.label && targetAudienceJson.label.toLowerCase() !== "general population") {
        const filterIndices = await filterPopulationByAudience(manifestPath, targetAudienceJson);
        if (filterIndices.length === 0) {
          const msg = "Target audience matched 0 personas. Try broader age/income range or General population.";
          logError(msg, { runId: studyRunId });
          await updateStatus("failed", msg);
          throw new Error(msg);
        }
        if (filterIndices.length < sampleSize) {
          logWarn("Audience filter truncated", { runId: studyRunId, filtered: filterIndices.length, requested: sampleSize });
        }
        logInfo("Sampling from audience", { runId: studyRunId, sample: Math.min(sampleSize, filterIndices.length), pool: filterIndices.length });
        filterSet = new Set(filterIndices);
        filteredPoolSize = filterSet.size;
      } else {
        logInfo("Sampling general population", { runId: studyRunId, sampleSize });
      }
      sample = await sampleStratifiedSeeded(manifestPath, sampleSize, seed + ":sample", filterSet);
      sampledCount = sample.length;
      logInfo("Sampling done", { runId: studyRunId, count: sample.length });
    }

    await updateStatus("surveying");
    if (!(await reserveLlmBudgetSlot())) {
      await finalizeRun([], "limit_reached");
      return;
    }
    const surveyResult = await generateSurvey(ideaText, industry, targetAudienceJson ?? null);
    await addLlmUsage(surveyResult.usage);
    const questions = surveyResult.questions;
    await prisma.survey.create({
      data: {
        studyRunId,
        questions: questions as object,
      },
    });

    const responses: ResponseRecord[] = [];
    const total = sample.length;
    let budgetExhausted = false;

    const existingResponses = await prisma.response.findMany({
      where: { studyRunId },
      select: { personaId: true, answers: true, buys: true, objections: true, valueScore: true },
    });
    const existingResponseMap = new Map(
      existingResponses.map((r) => [r.personaId, r])
    );
    const existingResponsePersonaIds = new Set(existingResponseMap.keys());
    logInfo("Idempotency: loaded existing response count", { runId: studyRunId, count: existingResponses.length });

    for (let batchStart = 0; batchStart < sample.length; batchStart += SIM_BATCH_SIZE) {
      const batch = sample.slice(batchStart, batchStart + SIM_BATCH_SIZE);
      const toProcess = batch.filter((p) => !existingResponsePersonaIds.has(p.id));
      const skippedInBatch = batch.filter((p) => existingResponsePersonaIds.has(p.id));

      for (const persona of skippedInBatch) {
        const dir = ensurePersonaFolder(persona);
        const existing = existingResponseMap.get(persona.id)!;
        const finalSoul = readSoulMd(persona.id);
        const soulThemes = finalSoul ? extractSoulThemes(finalSoul, 6) : [];
        responses.push({
          personaId: persona.id,
          persona,
          answers: existing.answers as Record<string, unknown>,
          buys: existing.buys as Record<string, boolean>,
          objections: Array.isArray(existing.objections) ? (existing.objections as string[]) : [],
          valueScore: existing.valueScore ?? null,
          soulThemes,
        });
        await prisma.sampledPersona.upsert({
          where: { studyRunId_personaId: { studyRunId, personaId: persona.id } },
          create: { studyRunId, personaId: persona.id, localPath: dir, soulVersion: 1 },
          update: {},
        });
      }

      if (toProcess.length > 0) {
        const reserved = await reserveBudgetSlots(toProcess.length);
        if (reserved === 0) {
          budgetExhausted = true;
          break;
        }
        const toProcessThisBatch = toProcess.slice(0, reserved);
        if (reserved < toProcess.length) budgetExhausted = true;

        for (let idx = 0; idx < toProcessThisBatch.length; idx++) {
          const persona = toProcessThisBatch[idx];
          const i = batchStart + idx;
          const t0 = Date.now();
          const dir = ensurePersonaFolder(persona);
          let soulMd = readSoulMd(persona.id);
          if (!soulMd) {
            soulMd = generateInitialSoulMd(persona);
            writeSoulMd(persona.id, soulMd, 1);
          }

          const result = await simulateOne(
            ideaText,
            pricePoints,
            questions,
            persona,
            soulMd,
            targetAudienceJson ?? null
          );
          await addLlmUsage(result.usage);
          surveyStartTimes.push(Date.now() - t0);

          const doSoulUpdate = shouldUpdateSoul(batchStart + idx, false);
          let soulVersion = 1;
          let updateResult: {
            updated: boolean;
            newContent: string | null;
            reason: string;
            memoryEvent: { observation: string; evidence: string; impact: string };
            usage?: LlmUsage;
          } | null = null;

          if (doSoulUpdate) {
            if (!(await reserveLlmBudgetSlot())) {
              budgetExhausted = true;
            } else {
              const memoryEvents = readMemoryEvents(persona.id).map((e) => ({
                observation: e.observation,
                evidence: e.evidence,
                impact: e.impact,
              }));
              updateResult = await maybeUpdateSoul(
                persona,
                soulMd,
                memoryEvents,
                result.answers as Record<string, unknown>,
                studyRunId
              );
              await addLlmUsage(updateResult.usage);
              appendMemoryEvent(persona.id, {
                type: "survey",
                studyRunId,
                observation: updateResult.memoryEvent.observation,
                evidence: updateResult.memoryEvent.evidence,
                impact: updateResult.memoryEvent.impact,
              });
              if (updateResult.updated && updateResult.newContent) {
                soulVersion = 2;
                writeSoulMd(persona.id, updateResult.newContent, soulVersion);
              }
            }
          }

          const sampled = await prisma.sampledPersona.upsert({
            where: { studyRunId_personaId: { studyRunId, personaId: persona.id } },
            create: {
              studyRunId,
              personaId: persona.id,
              localPath: dir,
              soulVersion,
            },
            update: { soulVersion, localPath: dir },
          });

          if (updateResult?.updated && updateResult.newContent) {
            await prisma.soulEdit.create({
              data: {
                sampledPersonaId: sampled.id,
                fromVersion: 1,
                toVersion: 2,
                reason: updateResult.reason,
              },
            });
          }

          const finalSoul = readSoulMd(persona.id);
          const soulThemes = finalSoul ? extractSoulThemes(finalSoul, 6) : [];

          const shortAnswers = Object.fromEntries(
            Object.entries(result.answers).map(([k, v]) => {
              if (typeof v === "string" && v.length > 200) return [k, v.slice(0, 200) + "…"];
              if (Array.isArray(v)) return [k, v.map((x) => (typeof x === "string" && x.length > 100 ? x.slice(0, 100) + "…" : x))];
              return [k, v];
            })
          );
          await prisma.response.create({
            data: {
              studyRunId,
              personaId: persona.id,
              answers: shortAnswers as object,
              buys: result.buys as object,
              objections: result.objections as object,
              valueScore: result.valueScore,
            },
          });

          responses.push({
            personaId: persona.id,
            persona,
            answers: result.answers,
            buys: result.buys,
            objections: result.objections,
            valueScore: result.valueScore,
            soulThemes,
          });
          existingResponsePersonaIds.add(persona.id);
        }
      }

      await job.updateProgress(Math.round((80 * responses.length) / total));
      if (batchStart + batch.length < sample.length && surveyStartTimes.length > 0 && (batchStart / SIM_BATCH_SIZE) % 2 === 1) {
        const avgMs = surveyStartTimes.reduce((a, b) => a + b, 0) / surveyStartTimes.length;
        logInfo("Survey progress", { runId: studyRunId, progress: `${responses.length}/${total}`, avgMs: Math.round(avgMs) });
      }
      if (budgetExhausted) break;
    }

    const avgLatency =
      surveyStartTimes.length > 0
        ? surveyStartTimes.reduce((a, b) => a + b, 0) / surveyStartTimes.length
        : 0;
    const runAfterSurvey = await prisma.studyRun.findUnique({ where: { id: studyRunId }, select: { llmCallsUsed: true } });
    logInfo("Survey done", {
      runId: studyRunId,
      avgLatencyMs: Math.round(avgLatency),
      llmCallsUsed: runAfterSurvey?.llmCallsUsed ?? 0,
    });

    if (budgetExhausted) {
      await finalizeRun(responses, "limit_reached");
      return;
    }
    await finalizeRun(responses, "completed");
  } catch (err) {
    const message = safeErrorMessage(err);
    const attempts = job.opts.attempts ?? 3;
    const isLastAttempt = (job.attemptsMade ?? 0) + 1 >= attempts;
    logError("Study run failed", { runId: studyRunId, attempt: (job.attemptsMade ?? 0) + 1, attempts, isLastAttempt });
    if (isLastAttempt) {
      await updateStatus("failed", message);
      if (owner?.userId) {
        await deliverRunWebhook({
          userId: owner.userId,
          event: "run.failed",
          payload: {
            runId: studyRunId,
            studyId,
            status: "failed",
            error: message,
          },
        });
      }
    }
    throw err;
  }
  } finally {
    await releaseLock(lockKey);
  }
}

const worker = new Worker<StudyJobPayload>(STUDY_QUEUE_NAME, processStudyRun, {
  connection,
  concurrency: WORKER_CONCURRENCY,
});

worker.on("completed", (job) => {
  logInfo("Job completed", { jobId: job?.id });
});

worker.on("failed", (job, err) => {
  logError("Job failed", {
    jobId: job?.id,
    runId: job?.data?.studyRunId,
    message: err?.message,
    attemptsMade: job?.attemptsMade,
    willRetry: (job?.attemptsMade ?? 0) < (job?.opts.attempts ?? 3),
  });
});

(async () => {
  setLoggerProcessType("worker");
  validateProductionEnv();
  warnIfDotEnvPresentInProduction();
  validateDataDir();
  logInfo("Worker startup: validating env and volume done", {});

  const resumed = await resumeStuckRuns();
  if (resumed > 0) {
    logWarn("Worker startup: resumed stuck runs to pending", { count: resumed });
  } else {
    logInfo("Worker startup: no stuck runs to resume", {});
  }

  const cacheCleanup = cleanupDirectSampleCache();
  if (cacheCleanup.deletedCache + cacheCleanup.deletedTmp + cacheCleanup.deletedLocks > 0) {
    logInfo("Worker startup: direct sample cache cleanup", cacheCleanup);
  }

  await redis.set(WORKER_HEARTBEAT_KEY, "1", "EX", WORKER_HEARTBEAT_TTL);
  setInterval(() => {
    redis.set(WORKER_HEARTBEAT_KEY, "1", "EX", WORKER_HEARTBEAT_TTL).catch(() => {});
  }, 30_000);
})();

logInfo("Worker started", {
  MAX_SAMPLE_SIZE,
  MAX_LLM_CALLS_PER_RUN,
  RUN_TIMEOUT_MINUTES,
  WORKER_CONCURRENCY,
  SIM_BATCH_SIZE,
});

process.on("SIGTERM", async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});
