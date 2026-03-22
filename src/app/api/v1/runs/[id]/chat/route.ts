import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKeyAuth } from "@/lib/api-v1";
import { processChatTurn } from "@/lib/chat-service";
import { ApiV1ChatResponseSchema } from "@/lib/api-schemas";

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
});

const ALLOWED_RUN_STATUSES = ["completed", "limit_reached"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKeyAuth(req, "chat:write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const run = await prisma.studyRun.findUnique({
    where: { id },
    include: {
      study: {
        select: {
          userId: true,
          ideaText: true,
          geography: true,
          industry: true,
          pricePoints: true,
          targetAudienceJson: true,
        },
      },
    },
  });
  if (!run || run.study.userId !== authResult.auth.userId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (!ALLOWED_RUN_STATUSES.includes(run.status)) {
    return NextResponse.json(
      { error: "Chat is only available for completed or partial runs." },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await processChatTurn({
    run: {
      id: run.id,
      studyId: run.studyId,
      status: run.status,
      sampleSize: run.sampleSize,
      populationMethod: run.populationMethod,
      populationVersion: run.populationVersion,
      study: {
        ideaText: run.study.ideaText,
        geography: run.study.geography,
        industry: run.study.industry,
        pricePoints: run.study.pricePoints,
        targetAudienceJson: run.study.targetAudienceJson,
      },
    },
    userId: authResult.auth.userId,
    message: parsed.data.message,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = ApiV1ChatResponseSchema.parse({
    answer: result.assistantMessage?.content ?? "",
    citations: ["STUDY", "RUN", "WTP_CURVE", "SEGMENTS (JSON)", "OBJECTIONS", "NEXT_EXPERIMENTS"],
    structured: {
      threadId: result.threadId,
      reused: result.reused,
    },
  });
  return NextResponse.json(response);
}
