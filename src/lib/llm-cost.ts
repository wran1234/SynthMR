/**
 * LLM cost in integer cents. Pricing per 1M tokens (input, output) in cents.
 * Avoids floating point; use integer arithmetic only.
 */

export type ModelPricing = {
  inputCentsPer1M: number;
  outputCentsPer1M: number;
};

/** Default pricing by model (OpenAI list prices; override via env or config if needed). */
const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "gpt-4o-mini": { inputCentsPer1M: 15, outputCentsPer1M: 60 },   // $0.15/1M in, $0.60/1M out
  "gpt-4o": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },      // $2.50/1M in, $10/1M out
  "gpt-4-turbo": { inputCentsPer1M: 100, outputCentsPer1M: 300 },
  "gpt-3.5-turbo": { inputCentsPer1M: 50, outputCentsPer1M: 150 },
};

const FALLBACK_PRICING: ModelPricing = { inputCentsPer1M: 15, outputCentsPer1M: 60 };

/**
 * Compute cost in cents from token counts. Integer-only; no floating point.
 */
export function computeCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  if (promptTokens <= 0 && completionTokens <= 0) return 0;
  const p = DEFAULT_PRICING[model] ?? FALLBACK_PRICING;
  const cents =
    Math.floor((promptTokens * p.inputCentsPer1M) / 1_000_000) +
    Math.floor((completionTokens * p.outputCentsPer1M) / 1_000_000);
  return Math.max(0, cents);
}
