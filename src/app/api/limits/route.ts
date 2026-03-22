import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_SAMPLE_SIZE_FREE = Math.max(100, parseInt(process.env.MAX_SAMPLE_SIZE_FREE ?? "300", 10) || 300);
const MAX_SAMPLE_SIZE_PRO = Math.max(300, parseInt(process.env.MAX_SAMPLE_SIZE_PRO ?? "1000", 10) || 1000);

function getMaxSampleSize(): number {
  const v = parseInt(process.env.MAX_SAMPLE_SIZE ?? "500", 10);
  return Number.isNaN(v) || v < 1 ? 500 : v;
}

function getMaxSampleSizeForPlan(plan: string | null): number {
  if (plan === "pro" || plan === "enterprise") return Math.min(MAX_SAMPLE_SIZE_PRO, getMaxSampleSize());
  return Math.min(MAX_SAMPLE_SIZE_FREE, getMaxSampleSize());
}

/**
 * GET /api/limits — returns plan-based limits for the current user.
 * Used by the New Study page to disable sample sizes above the cap.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });

  const plan = dbUser?.plan ?? "free";
  const maxSampleSize = getMaxSampleSizeForPlan(plan);

  return NextResponse.json({
    plan,
    maxSampleSize,
    maxSampleSizeFree: MAX_SAMPLE_SIZE_FREE,
    maxSampleSizePro: MAX_SAMPLE_SIZE_PRO,
  });
}
