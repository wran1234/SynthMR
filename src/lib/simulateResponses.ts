/**
 * One LLM call per persona: answers, buy/no-buy at each price, objections, value score.
 * Compact prompts: persona card (no raw JSON), soul summary (max 1200 chars), survey Q+options only.
 * Prompt budget ~4k chars.
 */

import { jsonrepair } from "jsonrepair";
import { chatWithLimit, type LlmUsage } from "./llm";
import { z } from "zod";
import { truncate, soulSummary } from "./promptBudget";
import type { Persona } from "./types";
import type { SurveyQuestion } from "./surveyGenerator";

const ResponseSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  buys: z.record(z.string(), z.boolean()),
  objections: z.array(z.string()).max(2),
  valueScore: z.number().min(1).max(10),
});

export type SimulatedResponse = z.infer<typeof ResponseSchema>;

export type SimulatedResponseWithUsage = SimulatedResponse & { usage?: LlmUsage };

const PROMPT_MAX_CHARS = 4000;

/** Compact persona card: age, gender, state, income, discretionary, debtStress, top 3 traits, top 3 painPoints, top 2 channels, subscriptionFriendliness. */
function personaCard(p: Persona): string {
  const traits = [["frugal", p.traits.frugal], ["impulsive", p.traits.impulsive], ["privacy", p.traits.privacySensitive], ["novelty", p.traits.noveltySeeking]]
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([n, v]) => `${n}=${v}`)
    .join(", ");
  const pain = p.painPoints.slice(0, 3).join(", ");
  const ch = p.channels.slice(0, 2).join(", ");
  const subFriendly = p.painPoints.includes("subscription_fatigue") ? "low" : "med";
  return `age=${p.age} gender=${p.gender} state=${p.state} income=$${p.incomeAnnual} disc=$${p.discretionaryMonthly}/mo debtStress=${p.debtStress} traits(${traits}) pain(${pain}) channels(${ch}) subFriendliness=${subFriendly}`;
}

function personaContext(p: Persona, soulMd?: string | null): string {
  let block = `Persona (answer consistently): ${personaCard(p)}`;
  if (soulMd?.trim()) {
    const summary = soulSummary(soulMd, 1200);
    if (summary) block += `\nSoul: ${summary}`;
  }
  block += "\nRules: Do not contradict income/budget. High price vs discretionary→less likely to buy.";
  return truncate(block, 800);
}

export async function simulateOne(
  ideaText: string,
  pricePoints: number[],
  questions: SurveyQuestion[],
  persona: Persona,
  soulMd?: string | null,
  targetAudience?: { label: string } | null
): Promise<SimulatedResponseWithUsage> {
  const questionsText = questions
    .map((q) => (q.options ? `${q.id}. ${q.text} [${q.options.join(", ")}]` : `${q.id}. ${q.text} (1 sentence)`))
    .join("\n");
  const idea = truncate(ideaText, 300);
  const pricesKey = pricePoints.map((p) => `$${p}`).join(", ");

  const audienceLine =
    targetAudience?.label && targetAudience.label.toLowerCase() !== "general population"
      ? `\nThis persona belongs to target audience: ${targetAudience.label}. Respond only from perspective of this audience.\n`
      : "";

  const prompt = `Simulate one survey response. Idea: ${idea}
${audienceLine}
${personaContext(persona, soulMd)}

Survey (answer as persona):
${truncate(questionsText, 1200)}

Pricing (would they buy at each price?): ${pricesKey}. Budget $${persona.discretionaryMonthly}/mo.
The persona may choose to not purchase at any price (all buys false is valid).

Output JSON only:
{"answers":{"q1":"..."},"buys":{"$9":true,"$19":false,"$49":false},"objections":["...","..."],"valueScore":7}
Example: not interested at any price → "buys":{"$9":false,"$19":false,"$49":false}
Max 2 objections. No markdown.`;

  const fullPrompt = truncate(prompt, PROMPT_MAX_CHARS);

  const result = await chatWithLimit(
    [{ role: "user", content: fullPrompt }],
    { temperature: 0.4, maxTokens: 512 }
  );

  const raw = extractJson(result.content);
  const normalized = normalizeSimulatedResponse(raw, pricePoints);
  const parsed = ResponseSchema.safeParse(normalized);
  if (parsed.success) {
    return { ...parsed.data, usage: result.usage };
  }

  const retryResult = await chatWithLimit(
    [{ role: "user", content: fullPrompt + "\nOutput valid JSON only. Include answers, buys (true/false for each price; all false allowed if they would not purchase at any price), objections (max 2), valueScore (1-10)." }],
    { temperature: 0.2, maxTokens: 512 }
  );
  const raw2 = extractJson(retryResult.content);
  const normalized2 = normalizeSimulatedResponse(raw2, pricePoints);
  const parsed2 = ResponseSchema.parse(normalized2);
  const combinedUsage: LlmUsage | undefined =
    result.usage || retryResult.usage
      ? {
          promptTokens: (result.usage?.promptTokens ?? 0) + (retryResult.usage?.promptTokens ?? 0),
          completionTokens: (result.usage?.completionTokens ?? 0) + (retryResult.usage?.completionTokens ?? 0),
        }
      : undefined;
  return { ...parsed2, usage: combinedUsage };
}

/** Coerce LLM output to schema: cap objections at 2, default valueScore 1-10, fill buys, normalize answers. */
function normalizeSimulatedResponse(raw: unknown, pricePoints: number[]): unknown {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const answersRaw = o.answers && typeof o.answers === "object" && !Array.isArray(o.answers) ? (o.answers as Record<string, unknown>) : {};
  const answers: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(answersRaw)) {
    if (Array.isArray(v)) {
      answers[k] = v.map((x) => String(x)).slice(0, 10);
    } else if (v !== undefined && v !== null) {
      answers[k] = String(v).slice(0, 500);
    }
  }
  const buysRaw = o.buys && typeof o.buys === "object" && !Array.isArray(o.buys) ? (o.buys as Record<string, boolean>) : {};
  const buys: Record<string, boolean> = {};
  for (const p of pricePoints) {
    const key = `$${p}`;
    buys[key] = buysRaw[key] === true;
  }
  const objectionsRaw = Array.isArray(o.objections) ? o.objections : [];
  const objections = objectionsRaw
    .filter((x): x is string => typeof x === "string")
    .map((s) => String(s).trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 2);
  let valueScore = typeof o.valueScore === "number" && Number.isFinite(o.valueScore) ? o.valueScore : 5;
  valueScore = Math.max(1, Math.min(10, Math.round(valueScore)));
  return { answers, buys, objections, valueScore };
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
