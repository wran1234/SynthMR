import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connection } from "@/queue/connection";
import { studyQueue } from "@/queue/client";

const WORKER_HEARTBEAT_KEY = "synthmr:worker:heartbeat";
const WORKER_HEARTBEAT_TTL = 90;

export async function GET() {
  const result: {
    database: "ok" | "error";
    redis: "ok" | "error";
    worker: "ok" | "offline" | "unknown";
    queueLength: number;
  } = {
    database: "error",
    redis: "error",
    worker: "unknown",
    queueLength: 0,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = "ok";
  } catch {
    result.database = "error";
  }

  try {
    await connection.ping();
    result.redis = "ok";

    const heartbeat = await connection.get(WORKER_HEARTBEAT_KEY);
    result.worker = heartbeat ? "ok" : "offline";

    const counts = await studyQueue.getJobCounts();
    result.queueLength =
      (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
  } catch {
    result.redis = "error";
  }

  const ok =
    result.database === "ok" && result.redis === "ok";
  return NextResponse.json(result, {
    status: ok ? 200 : 503,
  });
}

export const dynamic = "force-dynamic";
