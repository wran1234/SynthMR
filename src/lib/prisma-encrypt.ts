/**
 * Prisma extension: encrypt sensitive fields on write, decrypt on read.
 * Study.ideaText, Study.targetAudienceJson, Aggregate.results, AudiencePreset.targetAudienceJson.
 * When DATA_ENCRYPTION_KEY is not set, no transformation is applied.
 */

import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, isEncryptionEnabled } from "./crypto";

function encryptJson(val: unknown): string | unknown {
  if (!isEncryptionEnabled()) return val as string;
  if (val === null || val === undefined) return val;
  return encrypt(JSON.stringify(val));
}

function decryptJson(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    return JSON.parse(decrypt(val));
  }
  return val;
}

function transformStudyOut(study: { ideaText?: string; targetAudienceJson?: unknown } | null): void {
  if (!study) return;
  if (study.ideaText && (study.ideaText.startsWith("enc:") || study.ideaText.startsWith("{"))) {
    study.ideaText = decrypt(study.ideaText);
  }
  if (study.targetAudienceJson !== undefined && study.targetAudienceJson !== null) {
    study.targetAudienceJson = decryptJson(study.targetAudienceJson) as typeof study.targetAudienceJson;
  }
}

function transformStudyIn(data: { ideaText?: string; targetAudienceJson?: unknown }): void {
  if (data.ideaText && typeof data.ideaText === "string") {
    (data as { ideaText: string }).ideaText = encrypt(data.ideaText);
  }
  if (data.targetAudienceJson !== undefined && data.targetAudienceJson !== null) {
    (data as { targetAudienceJson: string }).targetAudienceJson = encryptJson(data.targetAudienceJson) as string;
  }
}

function transformAggregateOut(agg: { results?: unknown } | null): void {
  if (!agg || agg.results === undefined) return;
  agg.results = decryptJson(agg.results);
}

function transformAggregateIn(data: { results?: unknown }): void {
  if (data.results !== undefined && data.results !== null) {
    (data as { results: string }).results = encryptJson(data.results) as string;
  }
}

function transformPresetOut(preset: { targetAudienceJson?: unknown } | null): void {
  if (!preset || preset.targetAudienceJson === undefined) return;
  preset.targetAudienceJson = decryptJson(preset.targetAudienceJson) as typeof preset.targetAudienceJson;
}

function transformPresetIn(data: { targetAudienceJson?: unknown }): void {
  if (data.targetAudienceJson !== undefined && data.targetAudienceJson !== null) {
    (data as { targetAudienceJson: string }).targetAudienceJson = encryptJson(data.targetAudienceJson) as string;
  }
}

function transformWebhookOut(
  webhook: { secret?: string } | null
): void {
  if (!webhook || webhook.secret === undefined || webhook.secret === null) return;
  if (typeof webhook.secret === "string") {
    webhook.secret = decrypt(webhook.secret);
  }
}

function transformWebhookIn(data: { secret?: string }): void {
  if (data.secret !== undefined && data.secret !== null && typeof data.secret === "string") {
    data.secret = encrypt(data.secret);
  }
}

export function withEncryption(client: PrismaClient): PrismaClient {
  if (!isEncryptionEnabled()) return client;

  return client.$extends({
    name: "encryption",
    query: {
      study: {
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result) transformStudyOut(result);
          return result;
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          if (result) transformStudyOut(result);
          return result;
        },
        async findMany({ args, query }) {
          const results = await query(args);
          results.forEach(transformStudyOut);
          return results;
        },
        async create({ args, query }) {
          transformStudyIn(args.data);
          const result = await query(args);
          transformStudyOut(result);
          return result;
        },
        async update({ args, query }) {
          if (args.data && typeof args.data === "object") transformStudyIn(args.data as { ideaText?: string; targetAudienceJson?: unknown });
          const result = await query(args);
          transformStudyOut(result);
          return result;
        },
      },
      aggregate: {
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result) transformAggregateOut(result);
          return result;
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          if (result) transformAggregateOut(result);
          return result;
        },
        async findMany({ args, query }) {
          const results = await query(args);
          results.forEach(transformAggregateOut);
          return results;
        },
        async create({ args, query }) {
          transformAggregateIn(args.data);
          const result = await query(args);
          transformAggregateOut(result);
          return result;
        },
        async update({ args, query }) {
          if (args.data && typeof args.data === "object") transformAggregateIn(args.data as { results?: unknown });
          const result = await query(args);
          transformAggregateOut(result);
          return result;
        },
      },
      audiencePreset: {
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result) transformPresetOut(result);
          return result;
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          if (result) transformPresetOut(result);
          return result;
        },
        async findMany({ args, query }) {
          const results = await query(args);
          results.forEach(transformPresetOut);
          return results;
        },
        async create({ args, query }) {
          transformPresetIn(args.data);
          const result = await query(args);
          transformPresetOut(result);
          return result;
        },
        async update({ args, query }) {
          if (args.data && typeof args.data === "object") transformPresetIn(args.data as { targetAudienceJson?: unknown });
          const result = await query(args);
          transformPresetOut(result);
          return result;
        },
      },
      webhookEndpoint: {
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result) transformWebhookOut(result);
          return result;
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          if (result) transformWebhookOut(result);
          return result;
        },
        async findMany({ args, query }) {
          const results = await query(args);
          results.forEach(transformWebhookOut);
          return results;
        },
        async create({ args, query }) {
          if (args.data && typeof args.data === "object") transformWebhookIn(args.data as { secret?: string });
          const result = await query(args);
          transformWebhookOut(result);
          return result;
        },
        async update({ args, query }) {
          if (args.data && typeof args.data === "object") transformWebhookIn(args.data as { secret?: string });
          const result = await query(args);
          transformWebhookOut(result);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
