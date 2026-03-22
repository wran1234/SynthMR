export type AgeBucket = "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+";

export type PersonaTraits = {
  frugal: number;
  impulsive: number;
  privacySensitive: number;
  noveltySeeking: number;
};

export type Persona = {
  id: string;
  age: number;
  ageBucket: AgeBucket;
  gender: string;
  state: string;
  metroType: string;
  householdSize: number;
  incomeAnnual: number;
  discretionaryMonthly: number;
  debtStress: number;
  traits: PersonaTraits;
  painPoints: string[];
  channels: string[];
  /** Deterministic seed for first soul materialization; only in population/sampled data. */
  soulSeed?: string;
  /** Optional hash of current soul content; only for sampled personas with materialized soul. */
  soulHash?: string;
};

export const AGE_BUCKETS: AgeBucket[] = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

export const PAIN_POINTS_TAXONOMY = [
  "time_poor",
  "budget_constrained",
  "decision_fatigue",
  "trust_issues",
  "information_overload",
  "fear_of_missing_out",
  "status_anxiety",
  "convenience_seeker",
  "quality_uncertainty",
  "support_concerns",
  "integration_complexity",
  "privacy_concerns",
  "subscription_fatigue",
  "brand_loyalty",
  "price_sensitivity",
] as const;

export const CHANNELS = ["tiktok", "instagram", "youtube", "google", "reddit", "email"] as const;

export interface TargetAudience {
  label: string;
  ageRange?: [number, number];
  incomeRange?: [number, number];
  education?: string[];
  employment?: string[];
  keywords?: string[];
}

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];
