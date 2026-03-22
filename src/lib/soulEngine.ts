/**
 * Soul engine: generate initial soul.md from persona (template), and maybeUpdateSoul from survey learnings.
 * Soul updates must not contradict immutable persona fields; versions are logged.
 */

import { jsonrepair } from "jsonrepair";
import { chat, type LlmUsage } from "./llm";
import { z } from "zod";
import type { Persona } from "./types";

const IMMUTABLE_KEYS = [
  "age",
  "ageBucket",
  "gender",
  "state",
  "metroType",
  "householdSize",
  "incomeAnnual",
  "discretionaryMonthly",
  "debtStress",
] as const;

/** Generate initial soul.md from persona using a template (no LLM). Deterministic from persona + soulSeed. */
export function generateInitialSoulMd(persona: Persona): string {
  const { age, gender, state, metroType, householdSize, incomeAnnual, discretionaryMonthly, debtStress, traits, painPoints, channels } = persona;

  const moneyPhilosophy =
    debtStress > 6
      ? "Avoid new debt; prioritize paying down existing debt. Skeptical of non-essential spending."
      : discretionaryMonthly < 300
        ? "Very careful with discretionary spend. Every purchase is considered."
        : traits.frugal > 6
          ? "Values saving; prefers value and longevity over novelty."
          : "Willing to spend on things that clearly improve daily life; dislikes waste.";

  const decisionStyle =
    traits.impulsive > 6
      ? "Tends to decide quickly; can be swayed by limited-time offers. Does some research but not deep."
      : traits.impulsive < 4
        ? "Deliberative; researches options and reads reviews. Relies on social proof and recommendations."
        : "Mixed: researches for bigger purchases, quicker on small ones.";

  const trustProfile =
    traits.privacySensitive > 6
      ? "High skepticism toward data collection and targeted ads. Prefers brands with clear privacy policies."
      : "Moderate trust; will try new brands with good reviews. Some concern about overspending on subscriptions.";

  const lifestyle = [];
  if (painPoints.includes("time_poor")) lifestyle.push("Time-poor; convenience matters.");
  if (painPoints.includes("budget_constrained")) lifestyle.push("Budget-conscious; price-sensitive.");
  if (householdSize >= 3) lifestyle.push("Household and dependents factor into decisions.");
  if (painPoints.includes("convenience_seeker")) lifestyle.push("Values convenience and simplicity.");
  if (lifestyle.length === 0) lifestyle.push("No major lifestyle constraints noted.");

  const productBiases = [];
  if (traits.privacySensitive > 5) productBiases.push("Privacy-sensitive; wary of apps that over-collect data.");
  if (painPoints.includes("subscription_fatigue")) productBiases.push("Subscription fatigue; prefers one-time or flexible options.");
  if (painPoints.includes("brand_loyalty")) productBiases.push("Some brand loyalty; prefers known brands unless value is clear.");

  const neverDo = [];
  if (debtStress > 7) neverDo.push("Take on new recurring charges without a clear budget line.");
  if (traits.frugal > 7) neverDo.push("Impulse-buy without a use case.");
  if (traits.privacySensitive > 7) neverDo.push("Share more personal data than necessary.");

  return `# Soul

## Core Values (ranked)
1. Practicality and value
2. ${debtStress > 5 ? "Financial security" : "Quality of life"}
3. ${traits.noveltySeeking > 5 ? "Novelty and variety" : "Stability and predictability"}

## Primary Motivations
- ${incomeAnnual < 50000 ? "Making ends meet while finding small wins" : "Getting the most out of limited time and budget"}
- Improving daily routines without adding complexity

## Primary Fears / Anxieties
- ${debtStress > 5 ? "Slipping into debt or missing payments" : "Wasting money on things that don't deliver"}
- Making a purchase that doesn't fit their life

## Money Philosophy
${moneyPhilosophy}

## Identity Anchors
- Sees self as ${traits.frugal > 6 ? "careful with money" : "practical spender"}
- ${age < 35 ? "Younger consumer" : age < 55 ? "Mid-life priorities" : "Focused on value and simplicity"}; ${state}, ${metroType}

## Decision Style
${decisionStyle}

## Trust / Skepticism Profile
${trustProfile}

## Lifestyle Constraints
${lifestyle.join(" ")}

## Product Biases
${productBiases.length ? productBiases.join(" ") : "No strong product biases."}

## Never Do / Taboo List
${neverDo.length ? neverDo.map((x) => `- ${x}`).join("\n") : "- No specific taboos."}

## Changelog Summary
- v1: Initial soul from persona (template). Demographics: ${age}, ${gender}, ${state}; income ~$${incomeAnnual}, discretionary ~$${discretionaryMonthly}/mo.
`.trim();
}

const SoulUpdateSchema = z.object({
  should_update: z.boolean(),
  replacement: z.string().optional(),
  reason: z.string(),
  new_memory_event: z.object({
    observation: z.string(),
    evidence: z.string(),
    impact: z.string(),
  }),
});

export type SoulUpdateMode = "off" | "rare" | "on";

function getSoulUpdateMode(): SoulUpdateMode {
  const v = (process.env.SOUL_UPDATE_MODE ?? "off").toLowerCase();
  if (v === "on" || v === "rare" || v === "off") return v;
  return "off";
}

/** Whether soul update should run at all for this persona. */
export function shouldUpdateSoul(
  personaIndex: number,
  answersContradictSoul: boolean
): boolean {
  const mode = getSoulUpdateMode();
  if (mode === "off") return false;
  if (mode === "on") return true;
  // rare: only if contradiction OR every 50 personas
  if (answersContradictSoul) return true;
  return (personaIndex + 1) % 50 === 0;
}

export type SoulUpdateResult = {
  updated: boolean;
  newContent: string | null;
  reason: string;
  memoryEvent: { observation: string; evidence: string; impact: string };
  error?: string;
};

/** Check if proposed soul text contradicts immutable persona fields. */
function contradictsImmutable(persona: Persona, soulText: string): string | null {
  const lower = soulText.toLowerCase();
  if (persona.incomeAnnual < 40000 && (lower.includes("wealthy") || lower.includes("high income") || lower.includes("affluent"))) {
    return "Soul claims wealth but incomeAnnual is low";
  }
  if (persona.discretionaryMonthly < 200 && lower.includes("comfortable discretionary") && lower.includes("spend freely")) {
    return "Soul claims comfortable spending but discretionary budget is low";
  }
  const ageMismatch = soulText.match(/\b(\d{2})\s*(?:years?\s*old|yo|age)/i);
  if (ageMismatch && Math.abs(parseInt(ageMismatch[1], 10) - persona.age) > 5) {
    return "Soul age contradicts persona age";
  }
  return null;
}

/**
 * Decide whether to update soul from new survey answers; if so, produce replacement and memory event.
 * Returns result with updated flag, new content (if updated), reason, and memory event to append.
 */
export type SoulUpdateResultWithUsage = SoulUpdateResult & { usage?: LlmUsage };

export async function maybeUpdateSoul(
  persona: Persona,
  soulMd: string,
  memoryEvents: Array<{ observation: string; evidence: string; impact: string }>,
  newSurveyAnswers: Record<string, unknown>,
  studyRunId: string
): Promise<SoulUpdateResultWithUsage> {
  const answersStr = JSON.stringify(newSurveyAnswers, null, 0).slice(0, 1500);
  const recentMemory = memoryEvents.slice(-5).map((e) => `- ${e.observation} (${e.evidence})`).join("\n");

  const prompt = `You are updating a "soul" document for a synthetic persona based on new survey responses.
Keep replacement under 1200 chars; preserve structure.

Immutable persona facts (DO NOT contradict these in the soul):
- Age: ${persona.age}, Gender: ${persona.gender}, State: ${persona.state}
- Income: $${persona.incomeAnnual}/year, Discretionary: $${persona.discretionaryMonthly}/month, Debt stress: ${persona.debtStress}
- Household: ${persona.householdSize}, Metro: ${persona.metroType}

Current soul (markdown):
---
${soulMd.slice(0, 1500)}
---

Recent memory events:
${recentMemory || "(none)"}

New survey answers from this study run:
${answersStr}

If the new answers reveal something meaningful that should be reflected in the soul (e.g. a new value, fear, or constraint), set should_update to true and provide a replacement soul markdown in "replacement" (max 1200 chars). Keep the same structure. Only add or refine; do not contradict the immutable facts above.
If nothing meaningful to add, set should_update to false and leave "replacement" empty. Always provide "reason" and "new_memory_event" (observation, evidence, impact) for this interaction.

Output valid JSON only:
{"should_update": boolean, "replacement": "full markdown or omit", "reason": "...", "new_memory_event": {"observation": "...", "evidence": "...", "impact": "..."}}`;

  const result = await chat([{ role: "user", content: prompt }], { temperature: 0.3, maxTokens: 1536 });
  const raw = extractJson(result.content);
  const parsed = SoulUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    const retryResult = await chat(
      [{ role: "user", content: prompt + "\n\nPrevious output was invalid JSON. Try again with valid JSON only." }],
      { temperature: 0.2, maxTokens: 4096 }
    );
    const retryRaw = extractJson(retryResult.content);
    const retryParsed = SoulUpdateSchema.parse(retryRaw);
    const base = applySoulUpdate(persona, soulMd, retryParsed, studyRunId);
    const usage: LlmUsage | undefined =
      result.usage || retryResult.usage
        ? {
            promptTokens: (result.usage?.promptTokens ?? 0) + (retryResult.usage?.promptTokens ?? 0),
            completionTokens: (result.usage?.completionTokens ?? 0) + (retryResult.usage?.completionTokens ?? 0),
          }
        : undefined;
    return { ...base, usage };
  }

  const base = applySoulUpdate(persona, soulMd, parsed.data, studyRunId);
  return { ...base, usage: result.usage };
}

function applySoulUpdate(
  persona: Persona,
  soulMd: string,
  data: z.infer<typeof SoulUpdateSchema>,
  _studyRunId: string
): SoulUpdateResult {
  const memoryEvent = data.new_memory_event;
  if (!data.should_update || !data.replacement?.trim()) {
    return { updated: false, newContent: null, reason: data.reason, memoryEvent };
  }

  const err = contradictsImmutable(persona, data.replacement);
  if (err) {
    return {
      updated: false,
      newContent: null,
      reason: data.reason,
      memoryEvent,
      error: err,
    };
  }

  const replacement = (data.replacement ?? "").trim().slice(0, 1200);
  return {
    updated: true,
    newContent: replacement,
    reason: data.reason,
    memoryEvent,
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}") + 1;
  if (start === -1 || end <= start) throw new Error("No JSON object in response");
  let jsonStr = trimmed.slice(start, end).replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(jsonrepair(jsonStr));
  }
}

/** Extract short "soul themes" (values/fears phrases) from soul markdown for segment display. */
export function extractSoulThemes(soulMd: string, maxBullets: number = 5): string[] {
  const themes: string[] = [];
  const sections = ["Core Values", "Primary Motivations", "Primary Fears", "Money Philosophy", "Identity Anchors", "Never Do"];
  for (const section of sections) {
    const re = new RegExp(`## ${section}[^#]*`, "i");
    const m = soulMd.match(re);
    if (m) {
      const text = m[0]
        .replace(/^## .+$/m, "")
        .trim()
        .split(/\n/)
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
      themes.push(...text.slice(0, 2));
    }
  }
  return themes.slice(0, maxBullets);
}
