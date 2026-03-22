/**
 * Redis distributed lock to prevent duplicate job execution across Fly instances.
 * Uses SET key value NX EX ttl. Release explicitly when done to free the lock early.
 */

import { connection } from "../queue/connection";

const LOCK_VALUE = "1";

/**
 * Acquire a distributed lock. Returns true if acquired, false if already held.
 * @param key - Lock key (e.g. job:{runId})
 * @param ttlSeconds - Lock TTL in seconds; lock auto-expires if not released
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await connection.set(key, LOCK_VALUE, "EX", ttlSeconds, "NX");
  return result === "OK";
}

/**
 * Release a lock by deleting the key. Safe to call even if we didn't hold the lock.
 */
export async function releaseLock(key: string): Promise<void> {
  await connection.del(key);
}
