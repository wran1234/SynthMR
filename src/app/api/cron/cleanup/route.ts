import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/lib/cleanup";
import { logError } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/cleanup — run data retention cleanup (delete runs older than DATA_RETENTION_DAYS).
 * Call from a cron job. Optional: pass Authorization: Bearer <CRON_SECRET> to restrict access.
 */
export async function GET(req: NextRequest) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { deletedRuns, directSampleCache } = await runCleanup();
    return NextResponse.json({ ok: true, deletedRuns, directSampleCache });
  } catch (err) {
    logError("[api/cron/cleanup] cleanup failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
