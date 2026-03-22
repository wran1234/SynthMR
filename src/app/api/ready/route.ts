/**
 * Fly readiness: DB + Redis. Returns 200 when ready to serve traffic, 503 otherwise.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connection } from "@/queue/connection";

export async function GET() {
  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // db not ready
  }

  try {
    await connection.ping();
    redisOk = true;
  } catch {
    // redis not ready
  }

  const ready = dbOk && redisOk;
  return NextResponse.json(
    { ready, database: dbOk ? "ok" : "error", redis: redisOk ? "ok" : "error" },
    { status: ready ? 200 : 503 }
  );
}

export const dynamic = "force-dynamic";
