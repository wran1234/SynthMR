import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudyOwner } from "@/lib/require-study-owner";
import { asNextResponse } from "@/lib/require-study-owner";
import { rateLimit, studiesLimitKey, LIMITS } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceId } = await params;
    const { user, study } = await requireStudyOwner(req, sourceId);

    const lim = await rateLimit(studiesLimitKey(user.id), LIMITS.STUDIES_WINDOW_SEC, LIMITS.STUDIES_MAX);
    if (!lim.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: lim.retryAfterSeconds },
        { status: 429, headers: lim.retryAfterSeconds ? { "Retry-After": String(lim.retryAfterSeconds) } : undefined }
      );
    }

    const newStudy = await prisma.study.create({
      data: {
        userId: user.id,
        ideaText: study.ideaText,
        geography: study.geography,
        industry: study.industry,
        pricePoints: study.pricePoints,
        targetAudienceJson: study.targetAudienceJson ?? undefined,
        status: "draft",
      },
    });
    return NextResponse.json(newStudy);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("[api/studies/[id]/duplicate] POST failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to duplicate study" }, { status: 500 });
  }
}
