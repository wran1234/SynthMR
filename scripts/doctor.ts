import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const errors: string[] = [];
const warnings: string[] = [];
const notes: string[] = [];

function ok(msg: string) {
  notes.push(`OK: ${msg}`);
}

function warn(msg: string) {
  warnings.push(`WARN: ${msg}`);
}

function fail(msg: string) {
  errors.push(`FAIL: ${msg}`);
}

function fileText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function checkGitIgnoreEnv() {
  const gitignorePath = path.join(ROOT, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fail(".gitignore is missing.");
    return;
  }
  const text = fs.readFileSync(gitignorePath, "utf8");
  if (!text.includes(".env")) {
    fail(".gitignore does not include .env.");
  } else {
    ok(".gitignore includes .env.");
  }
}

function checkEnvNotTracked() {
  try {
    execSync("git ls-files --error-unmatch .env", { cwd: ROOT, stdio: "pipe" });
    fail(".env is tracked by git. Remove it from git history/index immediately.");
  } catch {
    ok(".env is not tracked by git.");
  }
}

function checkRequiredEnv() {
  const required = ["DATABASE_URL", "REDIS_URL", "DATA_ENCRYPTION_KEY_V1", "LLM_API_KEY"];
  const missing = required.filter((k) => {
    const v = process.env[k];
    return !v || !v.trim();
  });

  if (process.env.NODE_ENV === "production") {
    if (missing.length > 0) fail(`Missing required production env vars: ${missing.join(", ")}`);
    else ok("Required production env vars are present.");
  } else if (missing.length > 0) {
    warn(`Missing env vars (set before production deploy): ${missing.join(", ")}`);
  } else {
    ok("Required env vars present.");
  }
}

function checkDataDir() {
  const dataDir = process.env.DATA_DIR ?? "/data";
  if (fs.existsSync(dataDir)) {
    const stat = fs.statSync(dataDir);
    if (!stat.isDirectory()) fail(`DATA_DIR exists but is not a directory: ${dataDir}`);
    else ok(`DATA_DIR exists: ${dataDir}`);
  } else {
    warn(`DATA_DIR does not exist at runtime: ${dataDir}`);
  }
}

function checkDebugRouteGuard() {
  const rel = "src/app/api/debug/session/route.ts";
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    ok("Debug session route does not exist.");
    return;
  }
  const text = fileText(rel);
  const hasProdGuard = text.includes('process.env.NODE_ENV === "production"');
  const hasSafeStatus = text.includes("status: 404") || text.includes("status: 403");
  if (!hasProdGuard || !hasSafeStatus) {
    fail("Debug session route exists but production guard looks unsafe.");
  } else {
    ok("Debug session route is guarded in production.");
  }
}

function checkFlyMounts() {
  const rel = "fly.toml";
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    warn("fly.toml missing; skipping Fly mount check.");
    return;
  }
  const text = fileText(rel);
  const mountIncludesWeb = text.includes('processes = ["web", "worker"]') || (text.includes("processes = [") && text.includes('"web"') && text.includes('"worker"'));
  if (!mountIncludesWeb) {
    warn("Fly volume mount may not include both web and worker processes.");
  } else {
    ok("Fly volume mount includes web + worker.");
  }
}

function main() {
  console.log("SynthMR doctor: repository hygiene + production safety checks\n");
  checkGitIgnoreEnv();
  checkEnvNotTracked();
  checkRequiredEnv();
  checkDataDir();
  checkDebugRouteGuard();
  checkFlyMounts();

  for (const line of notes) console.log(line);
  for (const line of warnings) console.warn(line);
  for (const line of errors) console.error(line);

  console.log(
    `\nSummary: ${notes.length} ok, ${warnings.length} warning(s), ${errors.length} error(s).`
  );

  if (errors.length > 0) process.exit(1);
}

main();
