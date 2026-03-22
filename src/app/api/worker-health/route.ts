import { NextRequest, NextResponse } from "next/server";
import { studyQueue } from "@/queue/client";

const isProduction = process.env.NODE_ENV === "production";
const WORKER_HEALTH_TOKEN = process.env.WORKER_HEALTH_TOKEN ?? "";

/**
 * Worker health: queue depth and job counts for monitoring/ops.
 * In production requires Authorization: Bearer <WORKER_HEALTH_TOKEN> if WORKER_HEALTH_TOKEN is set.
 * If token is set in prod and missing/wrong, returns 403. If token is required but unset in prod, returns 403.
 */
export async function GET(req: NextRequest) {
  if (isProduction) {
    if (!WORKER_HEALTH_TOKEN) {
      return NextResponse.json({ error: "Worker health not configured" }, { status: 403 });
    }
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== WORKER_HEALTH_TOKEN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const counts = await studyQueue.getJobCounts();
    return NextResponse.json({
      queueLength: (counts.waiting ?? 0) + (counts.delayed ?? 0),
      active: counts.active ?? 0,
      waiting: counts.waiting ?? 0,
      failed: counts.failed ?? 0,
      completed: counts.completed ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Queue unavailable", queueLength: null, active: null, failed: null },
      { status: 503 }
    );
  }
}
