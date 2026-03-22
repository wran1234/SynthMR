/**
 * Runs on Next.js server startup (Node.js runtime only).
 * Validates production env and sets logger process type for Fly.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const {
    validateProductionEnv,
    warnIfDotEnvPresentInProduction,
    warnIfWebDataDirMissing,
  } = await import("./lib/env-check");
  const { setLoggerProcessType } = await import("./lib/logger");
  setLoggerProcessType("web");
  validateProductionEnv();
  warnIfDotEnvPresentInProduction();
  warnIfWebDataDirMissing();
}
