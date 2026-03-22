import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRunOwner, asNextResponse } from "@/lib/require-study-owner";
import { rateLimitSliding } from "@/lib/rate-limit";
import { getOrCreateThread, processChatTurn } from "@/lib/chat-service";
import { logError } from "@/lib/logger";

const CHAT_RATE_LIMIT_PER_MIN = 30;
const CHAT_RATE_LIMIT_WINDOW_SEC = 60;

const ALLOWED_RUN_STATUSES = ["completed", "limit_reached"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: studyId, runId } = await params;
    const { user, run } = await requireRunOwner(req, runId, studyId);

    if (!ALLOWED_RUN_STATUSES.includes(run.status)) {
      return NextResponse.json(
        { error: "Chat is only available for completed or partial runs." },
        { status: 400 }
      );
    }

    let thread = await prisma.chatThread.findFirst({
      where: { studyRunId: run.id, userId: user.id },
      include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });

    if (!thread) {
      await getOrCreateThread(run.studyId, run.id, user.id, run);
      thread = await prisma.chatThread.findFirst({
        where: { studyRunId: run.id, userId: user.id },
        include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
      });
      if (!thread) {
        return NextResponse.json({ error: "Failed to initialize chat thread" }, { status: 500 });
      }
    }
    const snapshot = thread.contextSnapshot as
      | { aggregateVersion?: { id?: string | null } | null }
      | null;
    const contextReady = !!snapshot?.aggregateVersion?.id;

    return NextResponse.json({
      threadId: thread.id,
      messages: thread.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      contextReady,
      contextMessage: contextReady ? null : "Aggregate results are missing for this run. Retry loading results, then try chat again.",
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/studies/.../chat] GET failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: studyId, runId } = await params;
    const { user, run } = await requireRunOwner(req, runId, studyId);

    if (!ALLOWED_RUN_STATUSES.includes(run.status)) {
      return NextResponse.json(
        { error: "Chat is only available for completed or partial runs." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const clientMessageId =
      typeof body.clientMessageId === "string" && body.clientMessageId.trim().length > 0
        ? body.clientMessageId.trim()
        : undefined;
    if (!message || message.length > 8000) {
      return NextResponse.json(
        { error: "Message is required and must be at most 8000 characters." },
        { status: 400 }
      );
    }

    const rate = await rateLimitSliding(
      `chat:${user.id}:${run.id}`,
      CHAT_RATE_LIMIT_WINDOW_SEC,
      CHAT_RATE_LIMIT_PER_MIN
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute.", retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429 }
      );
    }

    const outcome = await processChatTurn({
      run,
      userId: user.id,
      message,
      clientMessageId,
    });
    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error, missing: (outcome as { missing?: string[] }).missing, messages: outcome.messages },
        { status: outcome.status }
      );
    }
    return NextResponse.json({
      assistantMessage: outcome.assistantMessage,
      messages: outcome.messages,
      reused: outcome.reused,
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/studies/.../chat] POST failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
