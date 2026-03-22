/**
 * Deterministic synthetic population generator.
 * Supports optional audience constraints for audience-specific populations.
 */

import seedrandom from "seedrandom";
import type { AgeBucket, Persona, PersonaTraits } from "./types";
import type { TargetAudience } from "./types";
import { AGE_BUCKETS, CHANNELS, PAIN_POINTS_TAXONOMY, US_STATES } from "./types";

const BUCKET_AGES: Record<AgeBucket, [number, number]> = {
  "18-24": [18, 24],
  "25-34": [25, 34],
  "35-44": [35, 44],
  "45-54": [45, 54],
  "55-64": [55, 64],
  "65+": [65, 85],
};

export function ageToBucket(age: number): AgeBucket {
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}

// Approximate US distribution by age bucket (percent). Used for generation and for direct-sample stratum weights.
const AGE_DIST: Record<AgeBucket, number> = {
  "18-24": 12,
  "25-34": 17,
  "35-44": 16,
  "45-54": 16,
  "55-64": 17,
  "65+": 22,
};

/** Export age-bucket weights for stratum allocation (sum to 100). */
export function getAgeBucketWeights(): Record<AgeBucket, number> {
  return { ...AGE_DIST };
}

const GENDERS = ["male", "female", "non_binary"];
const GENDER_WEIGHTS = [0.49, 0.5, 0.01];

const METRO_TYPES = ["urban", "suburban", "rural"];
const METRO_WEIGHTS = [0.31, 0.55, 0.14];

function weightedChoice<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let u = rng() * total;
  for (let i = 0; i < items.length; i++) {
    u -= weights[i];
    if (u <= 0) return items[i];
  }
  return items[items.length - 1];
}

function choice<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function normal(rng: () => number, mean: number, std: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Get age bucket from index so distribution matches AGE_DIST (stratified by bucket). */
function getAgeBucketForIndex(rng: () => number, index: number): AgeBucket {
  return weightedChoice(rng, AGE_BUCKETS, AGE_BUCKETS.map((b) => AGE_DIST[b]));
}

export type AudienceConstraints = {
  ageRange?: [number, number];
  incomeRange?: [number, number];
  keywords?: string[];
};

/** Generate a single persona. Optional overrides and constraints for audience-specific generation. */
export function generatePersona(
  seed: string,
  index: number,
  overrides?: Partial<Persona>,
  constraints?: AudienceConstraints
): Persona {
  const rng = seedrandom(`${seed}:${index}`);

  let age: number;
  let ageBucket: AgeBucket;

  if (constraints?.ageRange && (constraints.ageRange[0] != null || constraints.ageRange[1] != null)) {
    const min = constraints.ageRange[0] ?? 18;
    const max = constraints.ageRange[1] ?? 85;
    age = Math.floor(min + rng() * (max - min + 1));
    age = clamp(18, age, 85);
    ageBucket = ageToBucket(age);
  } else {
    ageBucket = getAgeBucketForIndex(rng, index);
    const [ageMin, ageMax] = BUCKET_AGES[ageBucket];
    age = Math.floor(ageMin + rng() * (ageMax - ageMin + 1));
  }

  const gender = weightedChoice(rng, GENDERS, GENDER_WEIGHTS);
  const state = choice(rng, US_STATES);
  const metroType = weightedChoice(rng, METRO_TYPES, METRO_WEIGHTS);

  const householdMean = age < 35 ? 2.5 : age < 55 ? 3.2 : 2.0;
  const householdSize = Math.max(1, Math.round(normal(rng, householdMean, 1.2)));

  let incomeAnnual: number;
  if (constraints?.incomeRange && (constraints.incomeRange[0] != null || constraints.incomeRange[1] != null)) {
    const min = constraints.incomeRange[0] ?? 15000;
    const max = constraints.incomeRange[1] ?? 450000;
    const raw = min + rng() * (max - min);
    incomeAnnual = Math.round(raw / 1000) * 1000;
    incomeAnnual = clamp(15000, incomeAnnual, 450000);
  } else {
    const incomeBase = 45000 + (age - 30) * 800;
    const incomeMetro = metroType === "urban" ? 1.25 : metroType === "suburban" ? 1.1 : 0.85;
    const incomeRaw = clamp(15000, normal(rng, incomeBase * incomeMetro, 35000), 450000);
    incomeAnnual = Math.round(incomeRaw / 1000) * 1000;
  }

  const debtStress = clamp(0, normal(rng, 5 - (incomeAnnual / 50000) * 0.5, 2), 10);
  const discretionaryPct = 0.2 - debtStress * 0.015;
  const discretionaryMonthly = Math.round((incomeAnnual / 12) * discretionaryPct);

  const traits: PersonaTraits = {
    frugal: clamp(0, normal(rng, 5 - discretionaryMonthly / 200, 2), 10),
    impulsive: clamp(0, normal(rng, 4, 2), 10),
    privacySensitive: clamp(0, normal(rng, 5, 2), 10),
    noveltySeeking: clamp(0, normal(rng, 5 + (age < 35 ? 1.5 : 0), 2), 10),
  };

  // Pain points: if keywords, bias toward matching taxonomy terms
  const keywords = constraints?.keywords?.map((k) => String(k).toLowerCase()) ?? [];
  const matchingPainPoints = keywords.length
    ? PAIN_POINTS_TAXONOMY.filter((pp) => keywords.some((k) => pp.toLowerCase().includes(k) || k.includes(pp.toLowerCase().replace(/_/g, " "))))
    : [];
  const nPain = 2 + Math.floor(rng() * 4);
  let painPoints: string[];
  if (matchingPainPoints.length > 0) {
    const shuffled = [...PAIN_POINTS_TAXONOMY].sort(() => rng() - 0.5);
    const preferred = [...matchingPainPoints].sort(() => rng() - 0.5).slice(0, Math.min(2, matchingPainPoints.length));
    const rest = shuffled.filter((p) => !preferred.includes(p));
    painPoints = [...preferred, ...rest.slice(0, nPain - preferred.length)].slice(0, nPain);
  } else {
    const shuffled = [...PAIN_POINTS_TAXONOMY].sort(() => rng() - 0.5);
    painPoints = shuffled.slice(0, nPain);
  }

  const matchingChannels = keywords.length
    ? CHANNELS.filter((ch) => keywords.some((k) => ch.toLowerCase().includes(k)))
    : [];
  const nChannels = 2 + Math.floor(rng() * 3);
  let channels: string[];
  if (matchingChannels.length > 0) {
    const rest = CHANNELS.filter((c) => !matchingChannels.includes(c));
    const takeFromMatch = Math.min(1, matchingChannels.length);
    channels = [...matchingChannels.slice(0, takeFromMatch), ...rest.sort(() => rng() - 0.5).slice(0, nChannels - takeFromMatch)].slice(0, nChannels);
  } else {
    const chanShuffled = [...CHANNELS].sort(() => rng() - 0.5);
    channels = chanShuffled.slice(0, nChannels);
  }

  const id = overrides?.id ?? `p_${seed.slice(0, 8)}_${index}`;
  const soulSeed = overrides?.soulSeed ?? `${seed}:soul:${index}`;

  return {
    id,
    soulSeed,
    age,
    ageBucket,
    gender,
    state,
    metroType,
    householdSize,
    incomeAnnual,
    discretionaryMonthly,
    debtStress: Math.round(debtStress * 10) / 10,
    traits,
    painPoints,
    channels,
    ...overrides,
  };
}

/** Generate a persona guaranteed to match targetAudienceJson (age/income/keywords). Used for audience-specific population. */
export function generateAudiencePersona(
  seed: string,
  index: number,
  targetAudience: TargetAudience
): Persona {
  const constraints: AudienceConstraints = {
    ageRange: targetAudience.ageRange,
    incomeRange: targetAudience.incomeRange,
    keywords: targetAudience.keywords,
  };
  return generatePersona(seed, index, undefined, constraints);
}

/** Iterate over N personas with seed (for streaming write). */
export function* streamPersonas(seed: string, N: number): Generator<Persona, void, unknown> {
  for (let i = 0; i < N; i++) {
    yield generatePersona(seed, i);
  }
}

/** Compute income quartile 1-4 for stratification. */
export function getIncomeQuartile(incomeAnnual: number): number {
  if (incomeAnnual < 35000) return 1;
  if (incomeAnnual < 65000) return 2;
  if (incomeAnnual < 110000) return 3;
  return 4;
}

/** Income bounds [min, max] per quartile for stratum-constrained generation. */
export const INCOME_QUARTILE_BOUNDS: [number, number][] = [
  [15000, 35000],   // Q1
  [35000, 65000],   // Q2
  [65000, 110000],  // Q3
  [110000, 450000], // Q4
];

/** Stratum key format: "incomeQ_ageBucket_state" e.g. "2_25-34_CA". */
export type StratumKey = string;

/** All stratum keys for direct sampled generation (incomeQ × ageBucket × state). */
export function getAllStratumKeys(): StratumKey[] {
  const keys: StratumKey[] = [];
  for (let q = 1; q <= 4; q++) {
    for (const ageBucket of AGE_BUCKETS) {
      for (const state of US_STATES) {
        keys.push(`${q}_${ageBucket}_${state}`);
      }
    }
  }
  return keys;
}

/**
 * Generate a persona that falls in the given stratum (deterministic).
 * Stratum key format: "incomeQ_ageBucket_state" e.g. "2_25-34_CA".
 */
export function generatePersonaInStratum(seed: string, stratumKey: StratumKey, index: number): Persona {
  const parts = stratumKey.split("_");
  if (parts.length < 3) {
    const fallback = generatePersona(seed, index);
    return fallback;
  }
  const state = parts[parts.length - 1];
  const ageBucket = parts.slice(1, -1).join("_") as AgeBucket;
  const incomeQ = parseInt(parts[0], 10);
  if (!Number.isFinite(incomeQ) || incomeQ < 1 || incomeQ > 4 || !BUCKET_AGES[ageBucket]) {
    return generatePersona(seed, index);
  }
  const [ageMin, ageMax] = BUCKET_AGES[ageBucket];
  const [incomeMin, incomeMax] = INCOME_QUARTILE_BOUNDS[incomeQ - 1];
  const constraints: AudienceConstraints = {
    ageRange: [ageMin, ageMax],
    incomeRange: [incomeMin, incomeMax],
  };
  return generatePersona(`${seed}:stratum:${stratumKey}`, index, { state }, constraints);
}
