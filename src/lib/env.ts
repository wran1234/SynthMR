import { z } from "zod";

const requiredString = z.string().min(1, "required");

/**
 * Zod schema for environment variables.
 * Required vars fail validation if missing (app cannot function without them).
 * Optional vars have sensible defaults or are feature flags.
 */
const EnvSchema = z.object({
  // --- Required (all environments) ---
  DATABASE_URL: requiredString,
  LLM_API_KEY: requiredString,

  // --- Required in production, optional in dev (defaults exist for local dev) ---
  REDIS_URL: z.string().min(1).optional(),             // default: redis://localhost:6379
  DATA_DIR: z.string().min(1).optional(),               // default: ~/synthmr-data

  // --- LLM configuration (defaults provided) ---
  LLM_BASE_URL: z.string().url().optional(),            // default: https://api.openai.com/v1
  LLM_MODEL: z.string().min(1).optional(),              // default: gpt-4o-mini
  LLM_CONCURRENCY: z.string().optional(),               // default: 5

  // --- Session ---
  SESSION_DAYS: z.string().optional(),                  // default: 30

  // --- Population ---
  POPULATION_SIZE: z.string().optional(),               // default: 200000
  POPULATION_REUSE: z.string().optional(),              // default: true
  POPULATION_DATA_DIR: z.string().optional(),           // overrides DATA_DIR/populations
  AUDIENCE_POPULATION_SIZE_DEFAULT: z.string().optional(),
  AUDIENCE_POPULATION_SIZE_MAX: z.string().optional(),
  FAST_SAMPLE_THRESHOLD: z.string().optional(),         // default: 1000
  DIRECT_SAMPLE_CACHE_TTL_DAYS: z.string().optional(),  // default: 14

  // --- Sampling ---
  MAX_SAMPLE_SIZE: z.string().optional(),               // default: 500
  MAX_SAMPLE_SIZE_FREE: z.string().optional(),          // default: 300
  MAX_SAMPLE_SIZE_PRO: z.string().optional(),           // default: 1000
  MAX_LLM_CALLS_PER_RUN: z.string().optional(),        // default: 5000

  // --- Worker ---
  WORKER_CONCURRENCY: z.string().optional(),            // default: 5
  SIM_BATCH_SIZE: z.string().optional(),                // default: 25
  RUN_TIMEOUT_MINUTES: z.string().optional(),           // default: 30
  WORKER_HEALTH_TOKEN: z.string().optional(),           // production recommended

  // --- Features ---
  SOUL_UPDATE_MODE: z.enum(["off", "rare", "on"]).optional(), // default: off
  FULL_SURVEY: z.string().optional(),                   // default: false
  CHAT_CACHE_TTL_DAYS: z.string().optional(),           // default: 14

  // --- Security (production recommended) ---
  DATA_ENCRYPTION_KEY_V1: z.string().optional(),        // AES-256-GCM key for encryption at rest
  DATA_ENCRYPTION_KEY_V2: z.string().optional(),        // rotation key
  DATA_RETENTION_DAYS: z.string().optional(),           // default: 90
  CRON_SECRET: z.string().optional(),                   // secures /api/cron/cleanup

  // --- CSRF ---
  CSRF_COOKIE_NAME: z.string().optional(),
  CSRF_HEADER_NAME: z.string().optional(),

  // --- App ---
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ENABLE_API_PLAYGROUND: z.string().optional(),
});

let validated: z.infer<typeof EnvSchema> | null = null;

export function getEnv(): z.infer<typeof EnvSchema> {
  if (validated) return validated;
  const result = EnvSchema.safeParse(process.env);
  if (result.success) {
    validated = result.data;
    return validated;
  }
  const first = result.error.flatten().fieldErrors;
  const msg = Object.entries(first)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("; ");
  throw new Error(`Env validation failed: ${msg}`);
}
