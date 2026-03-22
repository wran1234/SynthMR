/**
 * Global structured logger. Use instead of console.log/error/warn.
 * Levels: info, warn, error, fatal. Includes timestamp, Fly metadata (hostname, process type), and optional context.
 */

import * as os from "os";

type LogContext = {
  userId?: string;
  studyId?: string;
  runId?: string;
  [key: string]: unknown;
};

let processType: string | null = null;

/** Set process type for Fly (e.g. "web" or "worker"). Call from worker startup and instrumentation. */
export function setLoggerProcessType(type: string): void {
  processType = type;
}

function getFlyMetadata(): Record<string, string> {
  const hostname = process.env.FLY_ALLOC_ID ?? process.env.HOSTNAME ?? os.hostname();
  const pt = processType ?? process.env.FLY_PROCESS_GROUP ?? "app";
  return { hostname, processType: pt };
}

function formatPayload(level: string, message: string, context?: LogContext): string {
  const ts = new Date().toISOString();
  const meta = getFlyMetadata();
  const base = { timestamp: ts, level, message, ...meta };
  const payload = context ? { ...base, ...context } : base;
  return JSON.stringify(payload);
}

export function logInfo(message: string, context?: LogContext): void {
  const out = formatPayload("info", message, context);
  console.log(out);
}

export function logWarn(message: string, context?: LogContext): void {
  const out = formatPayload("warn", message, context);
  console.warn(out);
}

export function logError(message: string, context?: LogContext): void {
  const out = formatPayload("error", message, context);
  console.error(out);
}

export function logFatal(message: string, context?: LogContext): void {
  const out = formatPayload("fatal", message, context);
  console.error(out);
}
