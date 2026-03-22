import { z } from "zod";

export const ApiErrorSchema = z.object({
  error: z.string(),
});

export const ApiV1StudySchema = z.object({
  id: z.string(),
  ideaText: z.string(),
  geography: z.string(),
  industry: z.string().nullable(),
  pricePoints: z.array(z.number()),
  targetAudience: z.unknown().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

export const ApiV1RunSchema = z.object({
  id: z.string(),
  studyId: z.string(),
  status: z.string(),
  sampleSize: z.number(),
  populationMode: z.string(),
  populationSize: z.number().nullable(),
  audienceLabel: z.string().nullable(),
  jobId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});

export const ApiV1CreateStudyResponseSchema = z.object({
  study: ApiV1StudySchema,
});

export const ApiV1CreateRunResponseSchema = z.object({
  run: ApiV1RunSchema,
});

export const ApiV1ResultsResponseSchema = z.object({
  runId: z.string(),
  results: z.unknown(),
});

export const ApiV1ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()).optional(),
  structured: z.record(z.unknown()).optional(),
});
