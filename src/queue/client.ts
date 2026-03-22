import { Queue } from "bullmq";
import { connection } from "./connection";

export const STUDY_QUEUE_NAME = "synthmr-study";

const JOB_ATTEMPTS = 3;

export const studyQueue = new Queue(STUDY_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
  },
});

export type TargetAudienceJson = {
  label: string;
  ageRange?: [number, number];
  incomeRange?: [number, number];
  education?: string[];
  employment?: string[];
  keywords?: string[];
} | null;

export type StudyJobPayload = {
  studyRunId: string;
  studyId: string;
  ideaText: string;
  geography: string;
  industry: string | null;
  pricePoints: number[];
  seed: string;
  sampleSize: number;
  targetAudienceJson?: TargetAudienceJson;
  populationMode?: "general" | "audience_specific";
  populationSize?: number | null;
  audienceLabel?: string | null;
};
