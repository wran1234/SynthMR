import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { rateLimit, studiesLimitKey, LIMITS } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";

export const dynamic = "force-dynamic";

const TargetAudienceSchema = z.object({
  label: z.string().max(200),
  ageRange: z.tuple([z.number(), z.number()]).optional(),
  incomeRange: z.tuple([z.number(), z.number()]).optional(),
  education: z.array(z.string()).optional(),
  employment: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
}).optional().nullable();

const CreateStudySchema = z.object({
  ideaText: z.string().min(1).max(10000),
  geography: z.string().default("US"),
  industry: z.string().max(200).optional().nullable(),
  pricePoints: z.array(z.number().positive()).length(3),
  targetAudienceJson: TargetAudienceSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const lim = await rateLimit(studiesLimitKey(user.id), LIMITS.STUDIES_WINDOW_SEC, LIMITS.STUDIES_MAX);
    if (!lim.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: lim.retryAfterSeconds },
        { status: 429, headers: lim.retryAfterSeconds ? { "Retry-After": String(lim.retryAfterSeconds) } : undefined }
      );
    }
    const body = await req.json();
    const parsed = CreateStudySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: USER_MESSAGES.invalidInput, details: parsed.error.flatten() }, { status: 400 });
    }
    const { ideaText, geography, industry, pricePoints, targetAudienceJson } = parsed.data;

    const study = await prisma.$transaction(async (tx) => {
      const s = await tx.study.create({
        data: {
          userId: user.id,
          ideaText,
          geography,
          industry: industry ?? null,
          pricePoints,
          targetAudienceJson: targetAudienceJson ?? undefined,
          status: "draft",
        },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "study_create", resourceType: "study", resourceId: s.id },
      });
      return s;
    });

    return NextResponse.json(study);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Study creation failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";
    const statusFilter = searchParams.get("status") ?? ""; // running | completed | failed

    const where: { userId: string; ideaText?: { contains: string; mode: "insensitive" }; status?: string } = {
      userId: user.id,
    };
    const { isEncryptionEnabled } = await import("@/lib/crypto");
    if (search.length > 0 && !isEncryptionEnabled()) {
      where.ideaText = { contains: search, mode: "insensitive" };
    }
    if (["running", "completed", "failed"].includes(statusFilter)) {
      where.status = statusFilter;
    }

    let studies = await prisma.study.findMany({
      where,
      orderBy: { createdAt: sort },
      take: 100,
      include: { runs: { orderBy: { createdAt: "desc" } } },
    });
    if (search.length > 0 && isEncryptionEnabled()) {
      const lower = search.toLowerCase();
      studies = studies.filter((s) => s.ideaText.toLowerCase().includes(lower));
    }
    return NextResponse.json(studies);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("List studies failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
