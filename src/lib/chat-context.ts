/**
 * Build a structured context pack for the Results Chatbot LLM.
 * Keeps payload small and explicitly sectioned for citeable responses.
 */

type WtpPoint = { price: number; probability: number; count: number };
type Segment = {
  id?: string;
  name?: string;
  sizeEstimate?: number;
  purchaseProbabilityByPrice?: Record<string, number>;
  topObjections?: string[];
  recommendedMessaging?: string;
  topSoulThemes?: string[];
};
type PersonaSim = {
  id: string;
  segmentName: string;
  max_price: number;
};
type AggregateResultsLike = {
  wtpCurve?: WtpPoint[];
  segments?: Segment[];
  topObjections?: string[];
  nextExperiments?: string[];
};

export type RunContextInput = {
  ideaText: string;
  geography: string;
  industry: string | null;
  pricePoints: number[];
  targetAudienceJson: unknown;
  sampleSize: number;
  populationMethod: string | null;
  populationVersion: string | null;
  status: string;
  results: AggregateResultsLike;
};

const DISCLAIMER =
  "[IMPORTANT] These results are from SYNTHETIC market research (simulated respondents). Do not claim real-world certainty. Recommend validating key findings with real users.";

/** Build a single sectioned context string for the analyst LLM. */
export function buildRunContextPack(input: RunContextInput): string {
  const { ideaText, geography, industry, pricePoints, targetAudienceJson, sampleSize, populationMethod, populationVersion, status, results } = input;

  const targetAudience =
    targetAudienceJson && typeof targetAudienceJson === "object" && "label" in (targetAudienceJson as Record<string, unknown>)
      ? (targetAudienceJson as { label?: string }).label ?? "General"
      : "General";

  const wtpCurve = (results.wtpCurve ?? []).map((p) => ({
    price: p.price,
    probabilityPct: Number((p.probability * 100).toFixed(2)),
    count: p.count,
  }));
  const segments = (results.segments ?? []).slice(0, 5).map((s) => ({
    id: s.id ?? null,
    name: s.name ?? null,
    sizeEstimate: s.sizeEstimate ?? null,
    purchaseProbabilityByPrice: s.purchaseProbabilityByPrice ?? {},
    topObjections: (s.topObjections ?? []).slice(0, 3),
    recommendedMessaging: s.recommendedMessaging ?? null,
    topSoulThemes: (s.topSoulThemes ?? []).slice(0, 5),
  }));
  const personas: PersonaSim[] = (() => {
    const maxPersonas = 50;
    if (!segments.length) return [];
    const weights = segments.map((s) => Math.max(1, Number(s.sizeEstimate ?? 1)));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const alloc = weights.map((w) => Math.max(1, Math.round((w / totalW) * maxPersonas)));
    const out: PersonaSim[] = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const probs = s.purchaseProbabilityByPrice ?? {};
      const prices = Object.keys(probs)
        .map((k) => Number(k.replace(/^\$/, "")))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
      let maxPrice = prices[0] ?? 0;
      for (const p of prices) {
        const v = Number(probs[`$${p}`] ?? 0);
        if (v >= 0.5) maxPrice = p;
      }
      if (prices.length > 0 && maxPrice === 0) {
        maxPrice = prices.reduce((best, cur) => (Number(probs[`$${cur}`] ?? 0) > Number(probs[`$${best}`] ?? 0) ? cur : best), prices[0]);
      }
      for (let n = 0; n < alloc[i] && out.length < maxPersonas; n++) {
        out.push({
          id: `ps_${i}_${n}`,
          segmentName: s.name ?? `Segment ${i + 1}`,
          max_price: maxPrice,
        });
      }
      if (out.length >= maxPersonas) break;
    }
    return out;
  })();

  const sections: string[] = [
    "STUDY",
    JSON.stringify(
      {
        ideaText: `${ideaText.slice(0, 500)}${ideaText.length > 500 ? "…" : ""}`,
        geography,
        industry,
        pricePoints,
        targetAudience,
      },
      null,
      2
    ),
    "RUN",
    JSON.stringify(
      {
        status,
        sampleSize,
        populationMethod,
        populationVersion,
      },
      null,
      2
    ),
    "WTP_CURVE",
    JSON.stringify(wtpCurve, null, 2),
    "SEGMENTS (JSON)",
    JSON.stringify(segments, null, 2),
    "PERSONAS",
    JSON.stringify(personas, null, 2),
    "OBJECTIONS",
    JSON.stringify((results.topObjections ?? []).slice(0, 10), null, 2),
    "NEXT_EXPERIMENTS",
    JSON.stringify((results.nextExperiments ?? []).slice(0, 8), null, 2),
    "SYNTHETIC_DISCLAIMER",
    DISCLAIMER,
  ];

  return sections.join("\n\n");
}
