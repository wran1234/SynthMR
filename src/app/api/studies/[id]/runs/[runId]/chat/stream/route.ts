import { NextRequest } from "next/server";
import { requireRunOwner } from "@/lib/require-study-owner";
import { rateLimitSliding } from "@/lib/rate-limit";
import { processChatTurnStream } from "@/lib/chat-service";

const CHAT_RATE_LIMIT_PER_MIN = 30;
const CHAT_RATE_LIMIT_WINDOW_SEC = 60;
const ALLOWED_RUN_STATUSES = ["completed", "limit_reached"];

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const push = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(sse(event, payload)));
      };
      try {
        const { id: studyId, runId } = await params;
        const { user, run } = await requireRunOwner(req, runId, studyId);
        if (!ALLOWED_RUN_STATUSES.includes(run.status)) {
          push("error", { error: "Chat is only available for completed or partial runs." });
          controller.close();
          return;
        }

        const body = await req.json().catch(() => ({}));
        const message = typeof body.message === "string" ? body.message.trim() : "";
        const clientMessageId =
          typeof body.clientMessageId === "string" && body.clientMessageId.trim().length > 0
            ? body.clientMessageId.trim()
            : undefined;
        if (!message || message.length > 8000) {
          push("error", { error: "Message is required and must be at most 8000 characters." });
          controller.close();
          return;
        }

        const rate = await rateLimitSliding(
          `chat:${user.id}:${run.id}`,
          CHAT_RATE_LIMIT_WINDOW_SEC,
          CHAT_RATE_LIMIT_PER_MIN
        );
        if (!rate.allowed) {
          push("error", { error: "Rate limit exceeded. Try again in a minute.", retryAfterSeconds: rate.retryAfterSeconds });
          controller.close();
          return;
        }

        const outcome = await processChatTurnStream({
          run,
          userId: user.id,
          message,
          clientMessageId,
          onToken: async (token) => {
            push("delta", { text: token });
          },
        });
        if (!outcome.ok) {
          push("error", { error: outcome.error, missing: (outcome as { missing?: string[] }).missing });
          if (outcome.messages) push("done", { messages: outcome.messages });
          controller.close();
          return;
        }
        push("done", { messages: outcome.messages, reused: outcome.reused });
        controller.close();
      } catch (err) {
        push("error", { error: "Failed to stream chat response." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
