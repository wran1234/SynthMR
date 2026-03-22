/**
 * Production environment validation. Run on server and worker startup.
 * Required vars cause a fatal exit if missing.
 * Recommended vars log a warning but allow startup.
 */

import * as fs from "fs";
import * as path from "path";
import { logFatal, logWarn } from "./logger";

/**
 * Required in ALL environments (dev + production).
 * Missing any of these is a fatal error in production.
 */
const REQUIRED_VARS = [
  "DATABASE_URL",
  "LLM_API_KEY",
] as const;

/**
 * Required only in production. Fatal if missing when NODE_ENV=production.
 */
const REQUIRED_PRODUCTION_VARS = [
  "REDIS_URL",
  "DATA_DIR",
] as const;

/**
 * Recommended in production. Warns if missing but does NOT block startup.
 * DATA_ENCRYPTION_KEY_V1 — encryption at rest is strongly recommended but opt-in.
 * CRON_SECRET — secures cleanup endpoint; recommended but not required.
 * WORKER_HEALTH_TOKEN — secures worker health endpoint; recommended but not required.
 */
const RECOMMENDED_PRODUCTION_VARS = [
  "DATA_ENCRYPTION_KEY_V1",
  "CRON_SECRET",
  "WORKER_HEALTH_TOKEN",
] as const;

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    const value = process.env[key];
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
      missing.push(key);
    }
  }
  for (const key of REQUIRED_PRODUCTION_VARS) {
    const value = process.env[key];
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    logFatal("Missing required environment variables", { missing });
    process.exit(1);
  }

  // Warn about recommended but non-fatal vars
  const missingRecommended: string[] = [];
  for (const key of RECOMMENDED_PRODUCTION_VARS) {
    const value = process.env[key];
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
      missingRecommended.push(key);
    }
  }
  if (missingRecommended.length > 0) {
    logWarn("Recommended production environment variables are not set", {
      missing: missingRecommended,
      action: "Set these for hardened production security. See .env.example for details.",
    });
  }
}

export function warnIfDotEnvPresentInProduction(): void {
  if (process.env.NODE_ENV !== "production") return;
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    logWarn("Unsafe production setup: .env file exists on server", {
      path: envPath,
      action: "Use platform secrets and remove .env from deployed image/runtime.",
    });
  }
}

export function warnIfWebDataDirMissing(): void {
  if (process.env.NODE_ENV !== "production") return;
  const dataDir = process.env.DATA_DIR;
  if (!dataDir || !dataDir.trim()) return;

  const resolved = path.resolve(dataDir);
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      logWarn("Web runtime DATA_DIR is not a directory", {
        DATA_DIR: resolved,
        action: "Ensure Fly volume is mounted at /data for web process if file-backed endpoints are used.",
      });
    }
  } catch {
    logWarn("Web runtime DATA_DIR missing (possible unmounted volume)", {
      DATA_DIR: resolved,
      action: "Mount Fly volume for web process or disable filesystem-backed web endpoints.",
    });
  }
}
