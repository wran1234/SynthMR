import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRunContextPack } from "@/lib/chat-context";
import { chat, chatStreamResult, getLlmConfig } from "@/lib/llm";
import { computeCostCents } from "@/lib/llm-cost";
import { getRedisClient } from "@/lib/rate-limit";
import { buildCanonicalCacheKey, buildTemplateResponse, canonicalizeQuestion, parseContextPack } from "@/lib/chat-router";

type RunWithStudy = {
  id: string;
  studyId: string;
  status: string;
  sampleSize: number;
  populationMethod: string | null;
  populationVersion: string | null;
  study: {
    ideaText: string;
    geography: string;
    industry: string | null;
    pricePoints: number[];
    targetAudienceJson: unknown;
  };
};

type ContextSnapshot = {
  schemaVersion: "chat_context_snapshot_v1";
  builtAt: string;
  populationVersion: string | null;
  aggregateVersion: { id: string; createdAt: string } | null;
  aggregateHash: string | null;
  contextPack: string;
};

type ChatMessageView = { id: string; role: string; content: string; createdAt: string };

function mapMessages(messages: Array<{ id: string; role: string; content: string; createdAt: Date }>): ChatMessageView[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
}

function parseSnapshot(snapshot: unknown): ContextSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const s = snapshot as Record<string, unknown>;
  if (typeof s.contextPack !== "string") return null;
  return {
    schemaVersion: "chat_context_snapshot_v1",
    builtAt: typeof s.builtAt === "string" ? s.builtAt : new Date().toISOString(),
    populationVersion: typeof s.populationVersion === "string" ? s.populationVersion : null,
    aggregateVersion:
      s.aggregateVersion && typeof s.aggregateVersion === "object"
        ? {
            id: typeof (s.aggregateVersion as Record<string, unknown>).id === "string" ? ((s.aggregateVersion as Record<string, unknown>).id as string) : "",
            createdAt:
              typeof (s.aggregateVersion as Record<string, unknown>).createdAt === "string"
                ? ((s.aggregateVersion as Record<string, unknown>).createdAt as string)
                : "",
          }
        : null,
    aggregateHash: typeof s.aggregateHash === "string" ? s.aggregateHash : null,
    contextPack: s.contextPack,
  };
}

function getChatCacheTtlDays(): number {
  const v = parseInt(process.env.CHAT_CACHE_TTL_DAYS ?? "14", 10);
  return Number.isNaN(v) || v < 1 ? 14 : Math.min(90, v);
}

function toSnapshot(
  run: RunWithStudy,
  aggregate: { id: string; createdAt: Date; results: Prisma.JsonValue } | null
): ContextSnapshot {
  const results = (aggregate?.results ?? {}) as {
    wtpCurve?: Array<{ price: number; probability: number; count: number }>;
    segments?: Array<{
      id?: string;
      name?: string;
      sizeEstimate?: number;
      purchaseProbabilityByPrice?: Record<string, number>;
      topObjections?: string[];
      recommendedMessaging?: string;
      topSoulThemes?: string[];
    }>;
    topObjections?: string[];
    nextExperiments?: string[];
  };
  return {
    schemaVersion: "chat_context_snapshot_v1",
    builtAt: new Date().toISOString(),
    populationVersion: run.populationVersion ?? null,
    aggregateVersion: aggregate
      ? { id: aggregate.id, createdAt: aggregate.createdAt.toISOString() }
      : null,
    aggregateHash: aggregate
      ? crypto.createHash("sha256").update(JSON.stringify(aggregate.results ?? {})).digest("hex")
      : null,
    contextPack: buildRunContextPack({
      ideaText: run.study.ideaText,
      geography: run.study.geography,
      industry: run.study.industry ?? null,
      pricePoints: run.study.pricePoints,
      targetAudienceJson: run.study.targetAudienceJson,
      sampleSize: run.sampleSize,
      populationMethod: run.populationMethod ?? null,
      populationVersion: run.populationVersion ?? null,
      status: run.status,
      results: results ?? {},
    }),
  };
}

async function getCachedChatAnswer(cacheKey: string): Promise<string | null> {
  const redis = getRedisClient();
  const raw = await redis.get(`chatresp:${cacheKey}`);
  return raw ?? null;
}

async function setCachedChatAnswer(cacheKey: string, answer: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`chatresp:${cacheKey}`, answer, "EX", getChatCacheTtlDays() * 24 * 60 * 60);
}

export async function getOrCreateThread(studyId: string, runId: string, userId: string, runForSnapshot?: RunWithStudy) {
  const existing = await prisma.chatThread.findFirst({
    where: { studyId, studyRunId: runId, userId },
    include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  if (existing) return existing;
  let contextSnapshot: Prisma.InputJsonValue | null = null;
  if (runForSnapshot) {
    const aggregate = await prisma.aggregate.findFirst({
      where: { studyRunId: runForSnapshot.id },
      select: { id: true, createdAt: true, results: true },
    });
    contextSnapshot = toSnapshot(runForSnapshot, aggregate ?? null) as Prisma.InputJsonValue;
  }
  return prisma.chatThread.create({
    data: { studyId, studyRunId: runId, userId, contextSnapshot: contextSnapshot ?? undefined },
    include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
}

async function ensureThreadWithSnapshot(run: RunWithStudy, userId: string) {
  let thread = await prisma.chatThread.findFirst({
    where: { studyId: run.studyId, studyRunId: run.id, userId },
    include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  const existingSnapshot = thread ? parseSnapshot(thread.contextSnapshot) : null;
  if (thread && existingSnapshot) {
    return { thread, snapshot: existingSnapshot };
  }

  const aggregate = await prisma.aggregate.findFirst({
    where: { studyRunId: run.id },
    select: { id: true, createdAt: true, results: true },
  });
  const snapshot = toSnapshot(run, aggregate ?? null);

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: {
        studyId: run.studyId,
        studyRunId: run.id,
        userId,
        contextSnapshot: snapshot as Prisma.InputJsonValue,
      },
      include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
  } else {
    thread = await prisma.chatThread.update({
      where: { id: thread.id },
      data: { contextSnapshot: snapshot as Prisma.InputJsonValue },
      include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
  }
  return { thread, snapshot };
}

async function findIdempotentResponse(threadId: string, clientMessageId: string) {
  const existingUser = await prisma.chatMessage.findFirst({
    where: { threadId, role: "user", clientMessageId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!existingUser) return null;
  const assistant = await prisma.chatMessage.findFirst({
    where: {
      threadId,
      role: "assistant",
      createdAt: { gte: existingUser.createdAt },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!assistant) {
    return { kind: "missing_assistant" as const, messages: mapMessages(messages) };
  }
  return { kind: "reused" as const, assistant, messages: mapMessages(messages) };
}

export async function processChatTurn(params: {
  run: RunWithStudy;
  userId: string;
  message: string;
  clientMessageId?: string;
}) {
  const { run, userId, message, clientMessageId } = params;
  const llmModel = getLlmConfig().model;
  const { thread, snapshot } = await ensureThreadWithSnapshot(run, userId);

  if (clientMessageId) {
    const idempotent = await findIdempotentResponse(thread.id, clientMessageId);
    if (idempotent?.kind === "reused") {
      return {
        ok: true as const,
        reused: true,
        threadId: thread.id,
        assistantMessage: {
          id: idempotent.assistant.id,
          role: idempotent.assistant.role,
          content: idempotent.assistant.content,
          createdAt: idempotent.assistant.createdAt.toISOString(),
        },
        messages: idempotent.messages,
      };
    }
    if (idempotent?.kind === "missing_assistant") {
      return {
        ok: false as const,
        status: 409,
        error: "A matching user message exists but the assistant response is not available yet. Please retry shortly.",
        messages: idempotent.messages,
      };
    }
  }

  if (!snapshot.aggregateVersion) {
    return {
      ok: false as const,
      status: 409,
      error:
        "This run has no aggregate results yet. Chat needs Aggregate output (WTP/segments/objections). Retry loading results, then retry chat.",
      missing: ["aggregate.results"],
    };
  }

  const contextPack = snapshot.contextPack;
  const parsed = parseContextPack(contextPack);
  const canonical = canonicalizeQuestion(message);
  const aggregateHash = snapshot.aggregateHash ?? snapshot.aggregateVersion.id;
  const cacheKey = buildCanonicalCacheKey({
    runId: run.id,
    aggregateHash,
    canonicalIntent: canonical.canonicalIntent,
    canonicalArgs: canonical.canonicalArgs,
  });
  const cached = await getCachedChatAnswer(cacheKey);

  const history = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 20,
  });

  const systemPrompt = `You are SynthMR Analyst. You help users understand their synthetic market research results.
Use ONLY the provided context sections: STUDY, RUN, WTP_CURVE, SEGMENTS (JSON), OBJECTIONS, NEXT_EXPERIMENTS.
If the answer is missing from those sections, explicitly say it is not available in this run's results.
In every answer, cite section names explicitly, e.g. "From WTP_CURVE..." or "From SEGMENTS (JSON)...".
Keep responses concise and actionable. Do not claim real-world certainty; these are synthetic results.
Never expose secrets, environment values, internal file paths, or other users' data.`;

  const messagesForLlm: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Context from this run:\n\n${contextPack}` },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  let assistantContent: string;
  let usage: { promptTokens: number; completionTokens: number } | undefined;
  if (cached) {
    assistantContent = cached;
    usage = undefined;
  } else {
    const templated = buildTemplateResponse(canonical.canonicalIntent, canonical.canonicalArgs, parsed);
    if (templated) {
      assistantContent = templated;
      usage = undefined;
      await setCachedChatAnswer(cacheKey, assistantContent);
    } else {
      const llm = await chat(messagesForLlm, { temperature: 0.3, maxTokens: 1024 });
      assistantContent = llm.content;
      usage = llm.usage;
      await setCachedChatAnswer(cacheKey, assistantContent);
    }
  }
  const promptTokens = usage?.promptTokens ?? 0;
  const completionTokens = usage?.completionTokens ?? 0;
  const totalTokens = promptTokens + completionTokens;
  const costCents = computeCostCents(llmModel, promptTokens, completionTokens);

  try {
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { threadId: thread.id, role: "user", content: message, clientMessageId: clientMessageId ?? null },
      }),
      prisma.chatMessage.create({
        data: { threadId: thread.id, role: "assistant", content: assistantContent },
      }),
    ]);
  } catch (err) {
    if (
      clientMessageId &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const idempotent = await findIdempotentResponse(thread.id, clientMessageId);
      if (idempotent?.kind === "reused") {
        return {
          ok: true as const,
          reused: true,
          threadId: thread.id,
          assistantMessage: {
            id: idempotent.assistant.id,
            role: idempotent.assistant.role,
            content: idempotent.assistant.content,
            createdAt: idempotent.assistant.createdAt.toISOString(),
          },
          messages: idempotent.messages,
        };
      }
    }
    throw err;
  }

  const updatedMessages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const lastAssistant = [...updatedMessages].reverse().find((m) => m.role === "assistant");
  if (totalTokens > 0 || costCents > 0) {
    await prisma.studyRun.update({
      where: { id: run.id },
      data: {
        llmTokensUsed: { increment: totalTokens },
        llmCostCents: { increment: costCents },
      },
    });
  }
  await prisma.auditLog.create({
    data: {
      userId,
      action: "chat_message",
      resourceType: "run",
      resourceId: run.id,
    },
  });

  return {
    ok: true as const,
    reused: false,
    threadId: thread.id,
    assistantMessage: lastAssistant
      ? {
          id: lastAssistant.id,
          role: lastAssistant.role,
          content: lastAssistant.content,
          createdAt: lastAssistant.createdAt.toISOString(),
        }
      : null,
    messages: mapMessages(updatedMessages),
  };
}

export async function processChatTurnStream(params: {
  run: RunWithStudy;
  userId: string;
  message: string;
  clientMessageId?: string;
  onToken: (token: string) => Promise<void> | void;
}) {
  const { run, userId, message, clientMessageId, onToken } = params;
  const llmModel = getLlmConfig().model;
  const { thread, snapshot } = await ensureThreadWithSnapshot(run, userId);

  if (clientMessageId) {
    const idempotent = await findIdempotentResponse(thread.id, clientMessageId);
    if (idempotent?.kind === "reused") {
      return {
        ok: true as const,
        reused: true,
        threadId: thread.id,
        assistantMessage: {
          id: idempotent.assistant.id,
          role: idempotent.assistant.role,
          content: idempotent.assistant.content,
          createdAt: idempotent.assistant.createdAt.toISOString(),
        },
        messages: idempotent.messages,
      };
    }
    if (idempotent?.kind === "missing_assistant") {
      return {
        ok: false as const,
        status: 409,
        error: "A matching user message exists but the assistant response is not available yet. Please retry shortly.",
        messages: idempotent.messages,
      };
    }
  }

  if (!snapshot.aggregateVersion) {
    return {
      ok: false as const,
      status: 409,
      error:
        "This run has no aggregate results yet. Chat needs Aggregate output (WTP/segments/objections). Retry loading results, then retry chat.",
      missing: ["aggregate.results"],
    };
  }

  const contextPack = snapshot.contextPack;
  const parsed = parseContextPack(contextPack);
  const canonical = canonicalizeQuestion(message);
  const aggregateHash = snapshot.aggregateHash ?? snapshot.aggregateVersion.id;
  const cacheKey = buildCanonicalCacheKey({
    runId: run.id,
    aggregateHash,
    canonicalIntent: canonical.canonicalIntent,
    canonicalArgs: canonical.canonicalArgs,
  });
  const cached = await getCachedChatAnswer(cacheKey);

  const history = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 20,
  });

  const systemPrompt = `You are SynthMR Analyst. You help users understand their synthetic market research results.
Use ONLY the provided context sections: STUDY, RUN, WTP_CURVE, SEGMENTS (JSON), OBJECTIONS, NEXT_EXPERIMENTS.
If the answer is missing from those sections, explicitly say it is not available in this run's results.
In every answer, cite section names explicitly, e.g. "From WTP_CURVE..." or "From SEGMENTS (JSON)...".
Keep responses concise and actionable. Do not claim real-world certainty; these are synthetic results.
Never expose secrets, environment values, internal file paths, or other users' data.`;

  const messagesForLlm: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Context from this run:\n\n${contextPack}` },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  let userMsgId: string | null = null;
  try {
    const createdUser = await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "user", content: message, clientMessageId: clientMessageId ?? null },
    });
    userMsgId = createdUser.id;
  } catch (err) {
    if (
      clientMessageId &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const idempotent = await findIdempotentResponse(thread.id, clientMessageId);
      if (idempotent?.kind === "reused") {
        return {
          ok: true as const,
          reused: true,
          threadId: thread.id,
          assistantMessage: {
            id: idempotent.assistant.id,
            role: idempotent.assistant.role,
            content: idempotent.assistant.content,
            createdAt: idempotent.assistant.createdAt.toISOString(),
          },
          messages: idempotent.messages,
        };
      }
      if (idempotent?.kind === "missing_assistant") {
        return {
          ok: false as const,
          status: 409,
          error: "A matching user message exists but the assistant response is not available yet. Please retry shortly.",
          messages: idempotent.messages,
        };
      }
    }
    throw err;
  }

  let assistantContent = "";
  try {
    let streamedUsage: { promptTokens: number; completionTokens: number } | undefined;
    if (cached) {
      assistantContent = cached;
      await onToken(assistantContent);
      streamedUsage = undefined;
    } else {
      const templated = buildTemplateResponse(canonical.canonicalIntent, canonical.canonicalArgs, parsed);
      if (templated) {
        assistantContent = templated;
        await onToken(assistantContent);
        streamedUsage = undefined;
        await setCachedChatAnswer(cacheKey, assistantContent);
      } else {
        const streamed = await chatStreamResult(
          messagesForLlm,
          async (token) => {
            assistantContent += token;
            await onToken(token);
          },
          { temperature: 0.3, maxTokens: 1024 }
        );
        streamedUsage = streamed.usage;
        await setCachedChatAnswer(cacheKey, assistantContent);
      }
    }
    const promptTokens = streamedUsage?.promptTokens ?? 0;
    const completionTokens = streamedUsage?.completionTokens ?? 0;
    const totalTokens = promptTokens + completionTokens;
    const costCents = computeCostCents(llmModel, promptTokens, completionTokens);
    const assistantMsg = await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "assistant", content: assistantContent },
    });
    if (totalTokens > 0 || costCents > 0) {
      await prisma.studyRun.update({
        where: { id: run.id },
        data: {
          llmTokensUsed: { increment: totalTokens },
          llmCostCents: { increment: costCents },
        },
      });
    }
    await prisma.auditLog.create({
      data: {
        userId,
        action: "chat_message",
        resourceType: "run",
        resourceId: run.id,
      },
    });
    const updatedMessages = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return {
      ok: true as const,
      reused: false,
      threadId: thread.id,
      assistantMessage: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        createdAt: assistantMsg.createdAt.toISOString(),
      },
      messages: mapMessages(updatedMessages),
    };
  } catch (err) {
    if (userMsgId) {
      await prisma.chatMessage.delete({ where: { id: userMsgId } }).catch(() => {});
    }
    throw err;
  }
}
