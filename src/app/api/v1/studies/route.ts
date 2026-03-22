import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiKeyAuth } from "@/lib/api-v1";
import { ApiV1CreateStudyResponseSchema } from "@/lib/api-schemas";

const CreateStudySchema = z.object({
  ideaText: z.string().min(1).max(10000),
  geography: z.string().default("US"),
  industry: z.string().max(200).nullable().optional(),
  pricePoints: z.array(z.number().positive()).length(3),
  targetAudience: z.unknown().nullable().optional(),
});

function mapStudy(study: {
  id: string;
  ideaText: string;
  geography: string;
  industry: string | null;
  pricePoints: number[];
  targetAudienceJson: unknown;
  status: string;
  createdAt: Date;
}) {
  return {
    id: study.id,
    ideaText: study.ideaText,
    geography: study.geography,
    industry: study.industry,
    pricePoints: study.pricePoints,
    targetAudience: study.targetAudienceJson ?? null,
    status: study.status,
    createdAt: study.createdAt.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiKeyAuth(req, "studies:write");
  if (!authResult.ok) return authResult.response;

  const parsed = CreateStudySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const created = await prisma.study.create({
    data: {
      userId: authResult.auth.userId,
      ideaText: parsed.data.ideaText,
      geography: parsed.data.geography,
      industry: parsed.data.industry ?? null,
      pricePoints: parsed.data.pricePoints,
      targetAudienceJson: (parsed.data.targetAudience ?? undefined) as Prisma.InputJsonValue | undefined,
      status: "draft",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authResult.auth.userId,
      action: "api_study_create",
      resourceType: "study",
      resourceId: created.id,
    },
  });

  const response = { study: mapStudy(created) };
  return NextResponse.json(ApiV1CreateStudyResponseSchema.parse(response));
}
