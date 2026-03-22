/**
 * Build-time production validation: env vars, Prisma schema, encryption key length.
 * Run: npm run validate:prod (optionally with .env: node -e "require('fs').readFileSync('.env','utf8').split('\n').forEach(l=>{const [k,...v]=l.split('='); if(k&&v.length) process.env[k.trim()]=v.join('=').trim().replace(/^["']|["']$/g,'')}); require('child_process').execSync('npx tsx scripts/validate-prod.ts',{stdio:'inherit'})")
 * Or set env vars and run: npx tsx scripts/validate-prod.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "DATA_ENCRYPTION_KEY_V1",
  "DATA_DIR",
  "LLM_API_KEY",
];

const KEY_LENGTH_BYTES = 32;
const BASE64_LENGTH_32 = 44; // ceil(32*8/6)
const HEX_LENGTH_32 = 64;

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function validateEnv(): void {
  loadEnvFile();
  const missing = REQUIRED_ENV.filter((k) => {
    const v = process.env[k];
    return v === undefined || (typeof v === "string" && v.trim() === "");
  });
  if (missing.length > 0) {
    console.error("[validate:prod] Missing required env:", missing.join(", "));
    process.exit(1);
  }
}

function validateEncryptionKey(): void {
  const raw = process.env.DATA_ENCRYPTION_KEY_V1?.trim();
  if (!raw) return;
  let len: number;
  if (raw.length === HEX_LENGTH_32 && /^[0-9a-fA-F]+$/.test(raw)) {
    len = Buffer.from(raw, "hex").length;
  } else {
    try {
      len = Buffer.from(raw, "base64").length;
    } catch {
      console.error("[validate:prod] DATA_ENCRYPTION_KEY_V1 is not valid base64 or 64-char hex");
      process.exit(1);
    }
  }
  if (len !== KEY_LENGTH_BYTES) {
    console.error(`[validate:prod] DATA_ENCRYPTION_KEY_V1 must be ${KEY_LENGTH_BYTES} bytes (base64 or hex), got ${len}`);
    process.exit(1);
  }
}

function validatePrisma(): void {
  execSync("npx prisma validate", { stdio: "inherit" });
}

function main() {
  validateEnv();
  validateEncryptionKey();
  validatePrisma();
  console.log("[validate:prod] All checks passed.");
}

main();
