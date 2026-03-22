/**
 * Population storage: manifest in Postgres, bulk data as JSONL.
 * Default: ~/synthmr-data/populations (outside repo). Override with DATA_DIR or POPULATION_DATA_DIR.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";
import { finished } from "node:stream/promises";
import { jsonrepair } from "jsonrepair";
import { logInfo, logWarn } from "./logger";
import { generatePersona, generateAudiencePersona, getIncomeQuartile, generatePersonaInStratum, getAllStratumKeys, getAgeBucketWeights } from "./personaGenerator";
import type { AgeBucket } from "./types";
import { US_STATES } from "./types";
import type { Persona } from "./types";
import type { TargetAudience } from "./types";

/** Coarse US state population share (approx). Sum = 1. Used for weighted stratum allocation. */
const STATE_WEIGHTS: Record<string, number> = {
  CA: 0.12, TX: 0.09, FL: 0.065, NY: 0.06, PA: 0.038, IL: 0.038, OH: 0.035, GA: 0.032, NC: 0.032, MI: 0.03,
  NJ: 0.028, VA: 0.026, WA: 0.023, AZ: 0.022, MA: 0.021, TN: 0.021, IN: 0.02, MO: 0.019, MD: 0.019, CO: 0.018,
  WI: 0.018, MN: 0.017, SC: 0.015, AL: 0.015, LA: 0.014, KY: 0.014, OR: 0.013, OK: 0.012, CT: 0.011, UT: 0.01,
  IA: 0.0097, NV: 0.0095, AR: 0.0093, MS: 0.0091, KS: 0.0089, NM: 0.0064, NE: 0.0059, ID: 0.0055, WV: 0.0054,
  HI: 0.0043, NH: 0.0042, ME: 0.004, RI: 0.0032, MT: 0.0033, DE: 0.003, SD: 0.0027, ND: 0.0023, AK: 0.0022,
  VT: 0.0019, WY: 0.0017,
};
const _stateWeightExplicitSum = Object.values(STATE_WEIGHTS).reduce((a, b) => a + b, 0);
const _stateWeightMissing = US_STATES.filter((s) => !(s in STATE_WEIGHTS)).length;
const STATE_WEIGHTS_DEFAULT = _stateWeightMissing > 0 ? (1 - _stateWeightExplicitSum) / _stateWeightMissing : 0;

/** Global income quartile distribution (share per Q1–Q4). Non-uniform, sum = 1. */
const INCOME_QUARTILE_WEIGHTS = [0.28, 0.27, 0.25, 0.2];

/** Income quartile weights by age bucket (each row sums to 1). Younger skew lower income. */
const INCOME_QUARTILE_WEIGHTS_BY_AGE: Record<AgeBucket, [number, number, number, number]> = {
  "18-24": [0.35, 0.3, 0.22, 0.13],
  "25-34": [0.3, 0.3, 0.25, 0.15],
  "35-44": [0.25, 0.28, 0.27, 0.2],
  "45-54": [0.22, 0.26, 0.28, 0.24],
  "55-64": [0.24, 0.26, 0.26, 0.24],
  "65+": [0.28, 0.28, 0.24, 0.2],
};

function getStateWeight(state: string): number {
  return STATE_WEIGHTS[state] ?? STATE_WEIGHTS_DEFAULT;
}

/** Income weight for a stratum: use age-dependent table when available, else global. Deterministic. */
function getIncomeWeightForStratum(ageBucket: AgeBucket, incomeQ: number): number {
  const row = INCOME_QUARTILE_WEIGHTS_BY_AGE[ageBucket];
  if (row && incomeQ >= 1 && incomeQ <= 4) return row[incomeQ - 1];
  return INCOME_QUARTILE_WEIGHTS[incomeQ - 1] ?? 0.25;
}

/** Compute weight for a stratum key "incomeQ_ageBucket_state". Deterministic. */
function getStratumWeight(stratumKey: string, ageWeights: Record<AgeBucket, number>): number {
  const parts = stratumKey.split("_");
  if (parts.length < 3) return 1;
  const state = parts[parts.length - 1];
  const ageBucket = parts.slice(1, -1).join("_") as AgeBucket;
  const incomeQ = parseInt(parts[0], 10);
  if (!Number.isFinite(incomeQ) || incomeQ < 1 || incomeQ > 4) return 0;
  const wState = getStateWeight(state);
  const wAge = (ageWeights[ageBucket] ?? 0) / 100;
  const wIncome = getIncomeWeightForStratum(ageBucket, incomeQ);
  return wState * wAge * wIncome;
}

/** Deterministic tie-breaker for allocation: hash(seed:stratumKey) in [0,1). */
function stratumTieBreakHash(seed: string, stratumKey: string): number {
  const seedrandom = require("seedrandom") as (s: string) => () => number;
  return seedrandom(`${seed}:${stratumKey}`)();
}

/**
 * Allocate sampleSize across strata by weighted largest-remainder. Deterministic for same seed.
 * Ties broken by hash(seed:stratumKey) to avoid alphabetical bias.
 * Returns Map of stratumKey -> count (only strata with count > 0).
 */
function allocateWeightedStrata(
  stratumKeys: string[],
  sampleSize: number,
  seed: string
): Map<string, number> {
  const ageWeights = getAgeBucketWeights();
  const weights = stratumKeys.map((k) => getStratumWeight(k, ageWeights));
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) {
    const even = Math.floor(sampleSize / stratumKeys.length);
    const rem = sampleSize % stratumKeys.length;
    const out = new Map<string, number>();
    stratumKeys.forEach((k, i) => out.set(k, even + (i < rem ? 1 : 0)));
    return out;
  }
  const expected = weights.map((w) => (sampleSize * w) / sumW);
  const floors = expected.map((e) => Math.floor(e));
  const remainder = sampleSize - floors.reduce((a, b) => a + b, 0);
  const fractional = expected.map((e, i) => ({
    i,
    frac: e - Math.floor(e),
    key: stratumKeys[i],
    tieBreak: stratumTieBreakHash(seed, stratumKeys[i]),
  }));
  fractional.sort((a, b) => {
    if (b.frac !== a.frac) return b.frac - a.frac;
    return a.tieBreak - b.tieBreak;
  });
  const counts = [...floors];
  for (let r = 0; r < remainder; r++) {
    counts[fractional[r].i]++;
  }
  const out = new Map<string, number>();
  stratumKeys.forEach((k, i) => {
    if (counts[i] > 0) out.set(k, counts[i]);
  });
  return out;
}

const DATA_BASE = process.env.DATA_DIR ?? path.join(os.homedir(), "synthmr-data");
const POPULATION_DATA = process.env.POPULATION_DATA_DIR ?? path.join(DATA_BASE, "populations");

/** Version string for direct-sample cache key; bump to invalidate caches. */
const DIRECT_SAMPLE_POPULATION_VERSION = "direct_v1";

const DIRECT_SAMPLE_CACHE_LOCK_RETRIES = 60;
const DIRECT_SAMPLE_CACHE_LOCK_WAIT_MS = 150;

function getDirectSampleCacheTtlDays(): number {
  const v = parseInt(process.env.DIRECT_SAMPLE_CACHE_TTL_DAYS ?? "14", 10);
  return Number.isNaN(v) || v < 0 ? 14 : v;
}

/** Cache is valid only if final file exists and is non-empty (avoids partial reads). */
function isDirectSampleCacheValid(cachePath: string): boolean {
  try {
    if (!fs.existsSync(cachePath)) return false;
    const stat = fs.statSync(cachePath);
    return stat.size > 0;
  } catch {
    return false;
  }
}

/** Compute cache key for direct sample reuse. Deterministic. */
function computeDirectSampleCacheKey(
  geography: string,
  seed: string,
  sampleSize: number,
  populationMode: "general" | "audience_specific",
  audienceKey: string | null
): string {
  const payload = [geography, seed, String(sampleSize), DIRECT_SAMPLE_POPULATION_VERSION, populationMode, audienceKey ?? ""].join("\0");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16);
}

function getDirectSampleCachePath(cacheKey: string): string {
  return path.join(POPULATION_DATA, `pop_direct_cache_${cacheKey}.jsonl`);
}

function getDirectSampleLockPath(cacheKey: string): string {
  return path.join(POPULATION_DATA, `pop_direct_cache_${cacheKey}.lock`);
}

/** Acquire file-based lock (mkdir). Returns true when acquired. Retries then gives up. */
async function acquireDirectSampleLock(cacheKey: string): Promise<boolean> {
  ensureDir(POPULATION_DATA);
  const lockPath = getDirectSampleLockPath(cacheKey);
  for (let i = 0; i < DIRECT_SAMPLE_CACHE_LOCK_RETRIES; i++) {
    try {
      fs.mkdirSync(lockPath, { recursive: false });
      return true;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") throw err;
    }
    await new Promise((r) => setTimeout(r, DIRECT_SAMPLE_CACHE_LOCK_WAIT_MS));
  }
  return false;
}

function releaseDirectSampleLock(cacheKey: string): void {
  const lockPath = getDirectSampleLockPath(cacheKey);
  try {
    if (fs.existsSync(lockPath)) fs.rmdirSync(lockPath);
  } catch {
    // ignore
  }
}

/**
 * Delete direct-sample cache files and lock dirs older than DIRECT_SAMPLE_CACHE_TTL_DAYS.
 * Also removes orphan .jsonl.tmp and .lock dirs for the same cache keys.
 * Returns counts of deleted cache files, tmp files, and lock dirs.
 */
export function cleanupDirectSampleCache(): { deletedCache: number; deletedTmp: number; deletedLocks: number } {
  if (!fs.existsSync(POPULATION_DATA)) {
    return { deletedCache: 0, deletedTmp: 0, deletedLocks: 0 };
  }
  const ttlDays = getDirectSampleCacheTtlDays();
  const cutoffMs = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
  let deletedCache = 0;
  let deletedTmp = 0;
  let deletedLocks = 0;
  const entries = fs.readdirSync(POPULATION_DATA, { withFileTypes: true });
  const cacheFileRe = /^pop_direct_cache_[a-f0-9]+\.jsonl(\.tmp)?$/;
  const lockDirRe = /^pop_direct_cache_[a-f0-9]+\.lock$/;

  for (const e of entries) {
    const fullPath = path.join(POPULATION_DATA, e.name);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs >= cutoffMs) continue;

      if (e.isFile() && cacheFileRe.test(e.name)) {
        fs.unlinkSync(fullPath);
        if (e.name.endsWith(".jsonl.tmp")) deletedTmp++;
        else deletedCache++;
      } else if (e.isDirectory() && lockDirRe.test(e.name)) {
        fs.rmdirSync(fullPath);
        deletedLocks++;
      }
    } catch {
      // skip on permission or other error
    }
  }

  if (deletedCache + deletedTmp + deletedLocks > 0) {
    logInfo("Direct sample cache cleanup", { deletedCache, deletedTmp, deletedLocks });
  }
  return { deletedCache, deletedTmp, deletedLocks };
}

/** Read metrics: lines read, repaired via jsonrepair, skipped (null). */
export type ReadMetrics = { linesRead: number; linesRepaired: number; linesSkipped: number };

const MAX_SKIP_PCT = 0.001;
const MAX_SKIP_ABS = 50;

function getPopulationSize(): number {
  const v = parseInt(process.env.POPULATION_SIZE ?? "200000", 10);
  return Number.isNaN(v) || v < 1 ? 200000 : v;
}

function shouldReusePopulation(): boolean {
  return process.env.POPULATION_REUSE !== "false";
}

export type PopulationManifest = {
  runId: string;
  seed: string;
  path: string;
  size: number;
  createdAt: string;
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const STALE_TMP_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Remove stale .tmp files: any *.jsonl.tmp where final *.jsonl exists, or *.jsonl.tmp older than 10 minutes.
 * Logs only when deletions > 0.
 */
export function cleanupStalePopulationTmpFiles(popDir: string): void {
  if (!fs.existsSync(popDir)) return;
  const entries = fs.readdirSync(popDir, { withFileTypes: true });
  const now = Date.now();
  let deleted = 0;
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".jsonl.tmp")) continue;
    const tmpPath = path.join(popDir, e.name);
    const finalPath = tmpPath.slice(0, -4); // remove .tmp
    const finalExists = fs.existsSync(finalPath);
    const stat = fs.statSync(tmpPath);
    const ageMs = now - stat.mtimeMs;
    if (finalExists || ageMs >= STALE_TMP_AGE_MS) {
      fs.unlinkSync(tmpPath);
      deleted++;
    }
  }
  if (deleted > 0) logInfo("Cleaned up stale tmp files", { count: deleted });
}

/** Validate last 5 non-empty lines of a JSONL file parse as JSON. Returns false if any line fails. */
function validateLastLines(filepath: string, lastN: number = 5): boolean {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.trim().split(/\r?\n/).filter((l) => l.trim());
  const toCheck = lines.slice(-lastN);
  if (toCheck.length === 0) return false;
  for (const line of toCheck) {
    try {
      JSON.parse(line);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Write population to finalPath using atomic write: write to .tmp, flush, rename, then validate last 5 lines.
 * Never reuses .tmp (removes existing .tmp if present). On validation failure, deletes final file and throws.
 */
async function writePopulationAtomic<T>(
  finalPath: string,
  writeFn: (stream: fs.WriteStream) => T | Promise<T>
): Promise<T> {
  cleanupStalePopulationTmpFiles(path.dirname(finalPath));
  const tmpPath = finalPath + ".tmp";
  if (fs.existsSync(tmpPath)) {
    fs.unlinkSync(tmpPath);
  }
  const stream = fs.createWriteStream(tmpPath, { flags: "w" });
  try {
    const result = await Promise.resolve(writeFn(stream));
    stream.end();
    await finished(stream);
    fs.renameSync(tmpPath, finalPath);
    if (!validateLastLines(finalPath, 5)) {
      fs.unlinkSync(finalPath);
      throw new Error("Population file validation failed: last 5 lines did not parse as JSON");
    }
    logInfo("Population write complete, validated", {});
    return result;
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw err;
  }
}

/** Get path for population file by geography + size. Reusable key for lookup. */
export function getPopulationFilePath(geography: string, populationSize: number): string {
  ensureDir(POPULATION_DATA);
  const safe = geography.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `pop_${safe}_${populationSize}.jsonl`;
  return path.join(POPULATION_DATA, filename);
}

/**
 * Get or create population manifest. If POPULATION_REUSE and file exists for geography+size, returns path.
 * Otherwise generates population and returns path. Seed for generation is deterministic: geo_{geography}_size_{size}.
 */
export async function getOrCreatePopulation(runId: string, geography: string): Promise<string> {
  const populationSize = getPopulationSize();
  const filepath = getPopulationFilePath(geography, populationSize);

  if (shouldReusePopulation() && fs.existsSync(filepath)) {
    return path.resolve(filepath);
  }

  const seed = `geo_${geography}_size_${populationSize}`;
  ensureDir(POPULATION_DATA);

  await writePopulationAtomic(filepath, (stream) => {
    for (let i = 0; i < populationSize; i++) {
      const persona = generatePersona(seed, i);
      stream.write(JSON.stringify(persona) + "\n");
      if ((i + 1) % 100000 === 0) {
        logInfo("Population write progress", { written: i + 1, total: populationSize });
      }
    }
  });

  return path.resolve(filepath);
}

/** @deprecated Use getOrCreatePopulation. Kept for backward compatibility. */
export async function writePopulation(runId: string, _seed: string): Promise<string> {
  return getOrCreatePopulation(runId, "US");
}

const MAX_ACCEPT_ATTEMPTS = 10;

function getAudiencePopulationSizeDefault(): number {
  const v = parseInt(process.env.AUDIENCE_POPULATION_SIZE_DEFAULT ?? "100000", 10);
  return Number.isNaN(v) || v < 1 ? 100000 : v;
}

function getAudiencePopulationSizeMax(): number {
  const v = parseInt(process.env.AUDIENCE_POPULATION_SIZE_MAX ?? "500000", 10);
  return Number.isNaN(v) || v < 1 ? 500000 : v;
}

function getFastSampleThreshold(): number {
  const v = parseInt(process.env.FAST_SAMPLE_THRESHOLD ?? "1000", 10);
  return Number.isNaN(v) || v < 0 ? 1000 : v;
}

export type GetOrCreatePopulationForRunParams = {
  runId: string;
  geography: string;
  seed: string;
  populationMode: "general" | "audience_specific";
  populationSize: number | null;
  targetAudienceJson: TargetAudience | null | undefined;
  /** When set and sampleSize <= FAST_SAMPLE_THRESHOLD, use direct sampled generation (no full population file). */
  sampleSize: number;
};

export type GetOrCreatePopulationForRunResult = {
  manifestPath: string;
  populationSize: number;
  populationMode: "general" | "audience_specific";
  audienceLabel: string | null;
  /** When true, manifest is the sample itself; caller should read manifest as sample, not run sampleStratifiedSeeded. */
  directSample?: boolean;
  /** "full" | "direct" for UI and analytics. */
  populationMethod?: "full" | "direct";
  /** e.g. "direct_v1" for reproducibility. */
  populationVersion?: string | null;
};

/**
 * Generate only the required sample (weighted stratified) and write to outputPath.
 * Used when sampleSize <= FAST_SAMPLE_THRESHOLD. Allocates by state × age × income weights.
 */
async function generateDirectSampleGeneral(
  geography: string,
  seed: string,
  sampleSize: number,
  outputPath: string
): Promise<{ manifestPath: string }> {
  ensureDir(POPULATION_DATA);
  const genSeed = `geo_${geography}_${seed}`;

  const stratumKeys = getAllStratumKeys();
  const allocated = allocateWeightedStrata(stratumKeys, sampleSize, genSeed + ":alloc");

  await writePopulationAtomic(outputPath, (stream) => {
    let written = 0;
    for (const stratumKey of stratumKeys) {
      const count = allocated.get(stratumKey) ?? 0;
      for (let i = 0; i < count; i++) {
        const persona = generatePersonaInStratum(genSeed, stratumKey, i);
        persona.id = `p_${genSeed.slice(0, 12)}_${written}`;
        persona.soulSeed = `${genSeed}:soul:${written}`;
        stream.write(JSON.stringify(persona) + "\n");
        written++;
      }
    }
    if (written > 0) {
      logInfo("Direct sample written", { count: written, method: "weighted_stratified" });
    }
    return { written };
  });

  return { manifestPath: path.resolve(outputPath) };
}

/**
 * Generate only the required audience-matched sample and write to outputPath.
 */
async function generateDirectSampleAudience(
  seed: string,
  sampleSize: number,
  targetAudienceJson: TargetAudience,
  outputPath: string
): Promise<{ manifestPath: string }> {
  ensureDir(POPULATION_DATA);
  const genSeed = `${seed}:aud`;

  await writePopulationAtomic(
    outputPath,
    (stream) => {
      let count = 0;
      let index = 0;
      let retries = 0;
      while (count < sampleSize) {
        let persona: Persona = generateAudiencePersona(genSeed, index, targetAudienceJson);
        let matched = personaMatchesAudience(persona, targetAudienceJson, false);
        let attempt = 0;
        for (; !matched && attempt < MAX_ACCEPT_ATTEMPTS; attempt++) {
          persona = generateAudiencePersona(genSeed, index + (attempt + 1) * 100000, targetAudienceJson);
          matched = personaMatchesAudience(persona, targetAudienceJson, false);
        }
        if (!matched) {
          persona = generateAudiencePersona(genSeed, index + (MAX_ACCEPT_ATTEMPTS + 1) * 100000, targetAudienceJson);
          matched = personaMatchesAudience(persona, targetAudienceJson, true);
        }
        if (attempt > 0) retries += attempt;
        persona.id = `p_${genSeed.slice(0, 8)}_${count}`;
        persona.soulSeed = `${genSeed}:soul:${count}`;
        stream.write(JSON.stringify(persona) + "\n");
        count++;
        index++;
      }
      logInfo("Direct audience sample written", { count, retries });
      return { count };
    }
  );

  return { manifestPath: path.resolve(outputPath) };
}

/**
 * Read a direct-sample manifest (one persona per line) into an array.
 * Use when getOrCreatePopulationForRun returned directSample: true.
 */
export async function readDirectSampleManifest(manifestPath: string): Promise<Persona[]> {
  const absPath = path.isAbsolute(manifestPath) ? manifestPath : path.join(process.cwd(), manifestPath);
  const personas: Persona[] = [];
  const metrics: ReadMetrics = { linesRead: 0, linesRepaired: 0, linesSkipped: 0 };

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: fs.createReadStream(absPath), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      const p = parsePersonaLine(line, metrics);
      if (p) personas.push(p);
    });
    rl.on("close", () => {
      checkReadMetrics(manifestPath, metrics);
      resolve(personas);
    });
    rl.on("error", reject);
  });
}

/**
 * Get or create population for a run. General mode reuses pop_{geo}_{size}.jsonl.
 * Audience-specific creates pop_aud_{runId}.jsonl with only matching personas.
 * When sampleSize <= FAST_SAMPLE_THRESHOLD, uses direct sampled generation (no full population file).
 */
export async function getOrCreatePopulationForRun(
  params: GetOrCreatePopulationForRunParams
): Promise<GetOrCreatePopulationForRunResult> {
  const { runId, geography, seed, populationMode, targetAudienceJson, sampleSize } = params;
  const fastThreshold = getFastSampleThreshold();
  const useFastPath = sampleSize <= fastThreshold;

  if (populationMode === "general" || !targetAudienceJson?.label || targetAudienceJson.label.toLowerCase() === "general population") {
    if (useFastPath) {
      const cacheKey = computeDirectSampleCacheKey(geography, seed, sampleSize, "general", null);
      const cachePath = getDirectSampleCachePath(cacheKey);
      if (isDirectSampleCacheValid(cachePath)) {
        return {
          manifestPath: path.resolve(cachePath),
          populationSize: sampleSize,
          populationMode: "general",
          audienceLabel: null,
          directSample: true,
          populationMethod: "direct",
          populationVersion: DIRECT_SAMPLE_POPULATION_VERSION,
        };
      }
      const acquired = await acquireDirectSampleLock(cacheKey);
      try {
        if (acquired && isDirectSampleCacheValid(cachePath)) {
          return {
            manifestPath: path.resolve(cachePath),
            populationSize: sampleSize,
            populationMode: "general",
            audienceLabel: null,
            directSample: true,
            populationMethod: "direct",
            populationVersion: DIRECT_SAMPLE_POPULATION_VERSION,
          };
        }
        const outPath = acquired ? cachePath : path.join(POPULATION_DATA, `pop_direct_${geography}_${runId.slice(-12)}.jsonl`);
        const { manifestPath } = await generateDirectSampleGeneral(geography, seed, sampleSize, outPath);
        return {
          manifestPath,
          populationSize: sampleSize,
          populationMode: "general",
          audienceLabel: null,
          directSample: true,
          populationMethod: "direct",
          populationVersion: DIRECT_SAMPLE_POPULATION_VERSION,
        };
      } finally {
        if (acquired) releaseDirectSampleLock(cacheKey);
      }
    }
    const manifestPath = await getOrCreatePopulation(runId, geography);
    const populationSize = getPopulationSize();
    return { manifestPath, populationSize, populationMode: "general", audienceLabel: null, populationMethod: "full", populationVersion: null };
  }

  if (useFastPath) {
    const audienceKey = targetAudienceJson.label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const cacheKey = computeDirectSampleCacheKey(geography, seed, sampleSize, "audience_specific", audienceKey);
    const cachePath = getDirectSampleCachePath(cacheKey);
    if (isDirectSampleCacheValid(cachePath)) {
      return {
        manifestPath: path.resolve(cachePath),
        populationSize: sampleSize,
        populationMode: "audience_specific",
        audienceLabel: targetAudienceJson.label,
        directSample: true,
        populationMethod: "direct",
        populationVersion: DIRECT_SAMPLE_POPULATION_VERSION,
      };
    }
    const acquired = await acquireDirectSampleLock(cacheKey);
    try {
      if (acquired && isDirectSampleCacheValid(cachePath)) {
        return {
          manifestPath: path.resolve(cachePath),
          populationSize: sampleSize,
          populationMode: "audience_specific",
          audienceLabel: targetAudienceJson.label,
          directSample: true,
          populationMethod: "direct",
          populationVersion: DIRECT_SAMPLE_POPULATION_VERSION,
        };
      }
      const outPath = acquired ? cachePath : path.join(POPULATION_DATA, `pop_aud_direct_${geography}_${audienceKey}_${runId.slice(-12)}.jsonl`);
      const { manifestPath } = await generateDirectSampleAudience(seed, sampleSize, targetAudienceJson, outPath);
      return {
        manifestPath,
        populationSize: sampleSize,
        populationMode: "audience_specific",
        audienceLabel: targetAudienceJson.label,
        directSample: true,
        populationMethod: "direct",
        populationVersion: DIRECT_SAMPLE_POPULATION_VERSION,
      };
    } finally {
      if (acquired) releaseDirectSampleLock(cacheKey);
    }
  }

  const populationSize = Math.min(
    getAudiencePopulationSizeMax(),
    params.populationSize ?? getAudiencePopulationSizeDefault()
  );
  const audienceKey = targetAudienceJson.label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  ensureDir(POPULATION_DATA);
  const filename = `pop_aud_${geography}_${audienceKey}_${populationSize}_${runId.slice(-12)}.jsonl`;
  const filepath = path.join(POPULATION_DATA, filename);

  if (shouldReusePopulation() && fs.existsSync(filepath)) {
    return {
      manifestPath: path.resolve(filepath),
      populationSize,
      populationMode: "audience_specific",
      audienceLabel: targetAudienceJson.label,
      populationMethod: "full",
      populationVersion: null,
    };
  }

  const result = await writePopulationAtomic(
    filepath,
    (stream) => {
      let accepted = 0;
      let retries = 0;
      const sanityCheckSample: Persona[] = [];
      let count = 0;
      let index = 0;

      while (count < populationSize) {
        let persona: Persona = generateAudiencePersona(`${seed}:aud`, index, targetAudienceJson);
        let attempt = 0;
        let matched = personaMatchesAudience(persona, targetAudienceJson, false);

        for (; !matched && attempt < MAX_ACCEPT_ATTEMPTS; attempt++) {
          persona = generateAudiencePersona(`${seed}:aud`, index + (attempt + 1) * 100000, targetAudienceJson);
          matched = personaMatchesAudience(persona, targetAudienceJson, false);
        }
        if (!matched) {
          persona = generateAudiencePersona(`${seed}:aud`, index + (MAX_ACCEPT_ATTEMPTS + 1) * 100000, targetAudienceJson);
          matched = personaMatchesAudience(persona, targetAudienceJson, true);
        }
        if (attempt > 0) retries += attempt;
        persona.id = `p_${seed.slice(0, 8)}_${count}`;
        persona.soulSeed = `${seed}:soul:${count}`;
        stream.write(JSON.stringify(persona) + "\n");
        if (count < 1000) sanityCheckSample.push(persona);
        accepted++;
        count++;
        index++;
        if (count % 50000 === 0) logInfo("Audience population progress", { count, total: populationSize });
      }

      const rate = accepted > 0 ? (accepted / (accepted + retries)) * 100 : 100;
      logInfo("Audience population complete", { accepted, retries, acceptanceRate: rate.toFixed(1) });
      const failed = sanityCheckSample.filter((p) => !personaMatchesAudience(p, targetAudienceJson, true));
      if (failed.length > 0) {
        logWarn("Audience sanity check failures", { failed: failed.length, checked: sanityCheckSample.length });
      } else if (sanityCheckSample.length > 0) {
        logInfo("Audience sanity check passed", { checked: sanityCheckSample.length });
      }
      return { accepted };
    }
  );

  return {
    manifestPath: path.resolve(filepath),
    populationSize: result.accepted,
    populationMode: "audience_specific",
    audienceLabel: targetAudienceJson.label,
    populationMethod: "full",
    populationVersion: null,
  };
}


/** Check if persona matches target audience. When relaxKeywords=true, skip keyword check (for retry fallback). */
export function personaMatchesAudience(
  p: Persona,
  aud: TargetAudience | null | undefined,
  relaxKeywords?: boolean
): boolean {
  if (!aud || !aud.label || aud.label.toLowerCase() === "general population") return true;
  if (aud.ageRange && (aud.ageRange[0] != null || aud.ageRange[1] != null)) {
    const min = aud.ageRange[0] ?? 0;
    const max = aud.ageRange[1] ?? 150;
    if (p.age < min || p.age > max) return false;
  }
  if (aud.incomeRange && (aud.incomeRange[0] != null || aud.incomeRange[1] != null)) {
    const min = aud.incomeRange[0] ?? 0;
    const max = aud.incomeRange[1] ?? 999999999;
    if (p.incomeAnnual < min || p.incomeAnnual > max) return false;
  }
  if (!relaxKeywords && aud.keywords && aud.keywords.length > 0) {
    const text = [p.painPoints.join(" "), p.channels.join(" "), p.ageBucket].join(" ").toLowerCase();
    const match = aud.keywords.some((k) => text.includes(String(k).toLowerCase()));
    if (!match) return false;
  }
  return true;
}

/** Stream population file and return line indices of personas matching target audience. Does NOT load full file into memory. */
export async function filterPopulationByAudience(
  manifestPath: string,
  targetAudience: TargetAudience | null | undefined
): Promise<number[]> {
  if (!targetAudience || !targetAudience.label || targetAudience.label.toLowerCase() === "general population") {
    return []; // empty = no filter, use full population
  }
  const absPath = path.isAbsolute(manifestPath) ? manifestPath : path.join(process.cwd(), manifestPath);
  const matchingIndices: number[] = [];
  let lineIndex = 0;
  const metrics: ReadMetrics = { linesRead: 0, linesRepaired: 0, linesSkipped: 0 };

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: fs.createReadStream(absPath), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      const p = parsePersonaLine(line, metrics);
      if (p && personaMatchesAudience(p, targetAudience)) matchingIndices.push(lineIndex);
      lineIndex++;
    });
    rl.on("close", () => {
      checkReadMetrics(manifestPath, metrics);
      resolve(matchingIndices);
    });
    rl.on("error", reject);
  });
}

/** Stratum key: income quartile × age bucket × state. */
function getStratumKey(p: Persona): string {
  const q = getIncomeQuartile(p.incomeAnnual);
  return `${q}_${p.ageBucket}_${p.state}`;
}

/** Parse a single JSONL line to Persona; use jsonrepair on failure. Returns null if unrecoverable. Updates metrics when provided. */
export function parsePersonaLine(line: string, metrics?: ReadMetrics): Persona | null {
  if (metrics) metrics.linesRead++;
  try {
    return JSON.parse(line) as Persona;
  } catch {
    try {
      const p = JSON.parse(jsonrepair(line)) as Persona;
      if (metrics) metrics.linesRepaired++;
      return p;
    } catch {
      if (metrics) metrics.linesSkipped++;
      return null;
    }
  }
}

function checkReadMetrics(manifestPath: string, metrics: ReadMetrics): void {
  const skippedPct = metrics.linesRead > 0 ? metrics.linesSkipped / metrics.linesRead : 0;
  logInfo("Population read metrics", { read: metrics.linesRead, repaired: metrics.linesRepaired, skipped: metrics.linesSkipped, skippedPct: (skippedPct * 100).toFixed(2) });
  if (metrics.linesSkipped > MAX_SKIP_ABS || skippedPct > MAX_SKIP_PCT) {
    throw new Error(
      `Population file has too many unparseable lines (skipped=${metrics.linesSkipped}, ${(skippedPct * 100).toFixed(2)}%). Delete and regenerate: ${manifestPath}`
    );
  }
}

/** Stream a population JSONL file and return read metrics (for checkPopulation script). */
export function streamPopulationFileMetrics(manifestPath: string): Promise<ReadMetrics> {
  const absPath = path.isAbsolute(manifestPath) ? manifestPath : path.join(process.cwd(), manifestPath);
  const metrics: ReadMetrics = { linesRead: 0, linesRepaired: 0, linesSkipped: 0 };
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: fs.createReadStream(absPath), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      parsePersonaLine(line, metrics);
    });
    rl.on("close", () => resolve(metrics));
    rl.on("error", reject);
  });
}

/** Two-pass stratified sample. Optional filterIndices: only sample from those line indices (e.g. from filterPopulationByAudience). */
export function sampleStratifiedSeeded(
  manifestPath: string,
  K: number,
  seed: string,
  filterIndices?: Set<number> | number[] | null
): Promise<Persona[]> {
  const seedrandom = require("seedrandom") as (s: string) => () => number;
  const rng = seedrandom(seed);
  const filterSet = filterIndices && (Array.isArray(filterIndices) ? filterIndices.length > 0 : filterIndices.size > 0)
    ? new Set(Array.isArray(filterIndices) ? filterIndices : filterIndices)
    : null;

  const absPath = path.isAbsolute(manifestPath) ? manifestPath : path.join(process.cwd(), manifestPath);

  const metrics: ReadMetrics = { linesRead: 0, linesRepaired: 0, linesSkipped: 0 };

  return new Promise<Persona[]>((resolve, reject) => {
    const strata = new Map<string, number[]>();
    let lineIndex = 0;

    const rl = readline.createInterface({ input: fs.createReadStream(absPath), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      const include = !filterSet || filterSet.has(lineIndex);
      if (include) {
        const p = parsePersonaLine(line, metrics);
        if (p) {
          const key = getStratumKey(p);
          if (!strata.has(key)) strata.set(key, []);
          strata.get(key)!.push(lineIndex);
        }
      }
      lineIndex++;
    });
    rl.on("close", () => {
      const keys = Array.from(strata.keys());
      const perStratum = Math.max(1, Math.floor(K / keys.length));
      const selectedIndices = new Set<number>();

      for (const key of keys) {
        const indices = strata.get(key)!;
        const take = Math.min(perStratum, indices.length);
        const shuffled = [...indices].sort(() => rng() - 0.5);
        for (let i = 0; i < take; i++) selectedIndices.add(shuffled[i]);
      }

      let need = K - selectedIndices.size;
      if (need > 0) {
        const allIndices = Array.from(strata.values()).flat();
        const remaining = allIndices.filter((i) => !selectedIndices.has(i));
        for (let i = 0; i < need && i < remaining.length; i++) {
          const idx = Math.floor(rng() * remaining.length);
          selectedIndices.add(remaining.splice(idx, 1)[0]);
        }
      }

      const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
      const result: Persona[] = [];
      let currentIndex = 0;
      let resultIdx = 0;

      const rl2 = readline.createInterface({ input: fs.createReadStream(absPath), crlfDelay: Infinity });
      rl2.on("line", (line) => {
        if (!line.trim()) return;
        if (resultIdx < sortedIndices.length && currentIndex === sortedIndices[resultIdx]) {
          const p = parsePersonaLine(line, metrics);
          if (p) result.push(p);
          resultIdx++;
        }
        currentIndex++;
      });
      rl2.on("close", () => {
        checkReadMetrics(manifestPath, metrics);
        resolve(result.slice(0, K));
      });
      rl2.on("error", reject);
    });
    rl.on("error", reject);
  });
}

export type Stratum = { incomeQ: number; ageBucket: string; state: string };
