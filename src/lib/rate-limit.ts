import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: 3 });
  }
  return redis;
}

export function getRedisClient(): IORedis {
  return getRedis();
}

/** Fixed-window rate limit. Returns { allowed, retryAfterSeconds } (retryAfter only when !allowed). */
export async function rateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const r = getRedis();
  const fullKey = `ratelimit:${key}`;
  const multi = r.multi();
  multi.incr(fullKey);
  multi.ttl(fullKey);
  const [, [incr, ttl]] = (await multi.exec()) ?? [];
  const count = Number(incr ?? 0);
  const currentTtl = Number(ttl ?? -1);
  if (currentTtl === -1) {
    await r.expire(fullKey, windowSeconds);
  }
  const retryAfter = currentTtl > 0 ? currentTtl : windowSeconds;
  if (count > maxRequests) {
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  return { allowed: true };
}

/**
 * Sliding-window rate limit using two adjacent fixed windows and weighted carry-over.
 * Backed by Redis INCR + EXPIRE so it works across web instances.
 */
export async function rateLimitSliding(
  key: string,
  windowSeconds: number,
  maxRequests: number,
  nowMs: number = Date.now()
): Promise<{ allowed: boolean; retryAfterSeconds?: number; countApprox: number }> {
  const r = getRedis();
  const windowMs = windowSeconds * 1000;
  const currentWindow = Math.floor(nowMs / windowMs);
  const previousWindow = currentWindow - 1;
  const elapsedInWindowMs = nowMs - currentWindow * windowMs;
  const previousWeight = 1 - elapsedInWindowMs / windowMs;

  const currentKey = `ratelimit:${key}:${currentWindow}`;
  const previousKey = `ratelimit:${key}:${previousWindow}`;

  // Increment current bucket atomically and ensure TTL survives restarts.
  const multi = r.multi();
  multi.incr(currentKey);
  multi.expire(currentKey, windowSeconds * 2);
  await multi.exec();

  const [currentRaw, previousRaw] = await r.mget(currentKey, previousKey);
  const currentCount = Number(currentRaw ?? 0);
  const previousCount = Number(previousRaw ?? 0);
  const countApprox = currentCount + previousCount * previousWeight;

  if (countApprox > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - elapsedInWindowMs) / 1000));
    return { allowed: false, retryAfterSeconds, countApprox };
  }
  return { allowed: true, countApprox };
}

/** Rate limit key for auth (by IP). */
export function authLimitKey(ip: string): string {
  return `auth:${ip.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
}

/** Rate limit key for jobs (by userId). */
export function jobsLimitKey(userId: string): string {
  return `jobs:${userId}`;
}

/** Rate limit key for study create/run (by userId). */
export function studiesLimitKey(userId: string): string {
  return `studies:${userId}`;
}

/** Rate limit key for API-key request volume. */
export function apiKeyRequestsLimitKey(apiKeyId: string): string {
  return `apikey:req:${apiKeyId}`;
}

/** Rate limit key for API-key run creation volume. */
export function apiKeyRunCreateLimitKey(apiKeyId: string): string {
  return `apikey:runcreate:${apiKeyId}`;
}

export const LIMITS = {
  AUTH_WINDOW_SEC: 60,
  AUTH_MAX: 20,
  JOBS_WINDOW_SEC: 60,
  JOBS_MAX: 120,
  STUDIES_WINDOW_SEC: 60,
  STUDIES_MAX: 30,
  API_KEY_REQ_WINDOW_SEC: 60,
  API_KEY_REQ_MAX: 120,
  API_KEY_RUN_CREATE_WINDOW_SEC: 60,
  API_KEY_RUN_CREATE_MAX: 20,
} as const;
