import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyAuth } from "@/lib/api-v1";
import { ApiV1StudySchema } from "@/lib/api-schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKeyAuth(req, "studies:read");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      ideaText: true,
      geography: true,
      industry: true,
      pricePoints: true,
      targetAudienceJson: true,
      status: true,
      createdAt: true,
    },
  });
  if (!study || study.userId !== authResult.auth.userId) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  return NextResponse.json(
    ApiV1StudySchema.parse({
      id: study.id,
      ideaText: study.ideaText,
      geography: study.geography,
      industry: study.industry,
      pricePoints: study.pricePoints,
      targetAudience: study.targetAudienceJson ?? null,
      status: study.status,
      createdAt: study.createdAt.toISOString(),
    })
  );
}
