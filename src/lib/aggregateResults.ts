/**
 * Aggregate responses: purchase probability by price, top segments, objections, next experiments.
 * Segments: rule-based (age bucket + income bucket + top pain point + channel).
 */

import type { Persona } from "./types";
import { getIncomeQuartile } from "./personaGenerator";

export type ResponseRecord = {
  personaId: string;
  persona?: Persona;
  answers: Record<string, unknown>;
  buys: Record<string, boolean>;
  objections: string[];
  valueScore: number | null;
  /** Themes extracted from soul.md for this persona (values/fears etc.). */
  soulThemes?: string[];
};

export type Segment = {
  id: string;
  name: string;
  rules: { ageBucket?: string; incomeQ?: number; painPoint?: string; channel?: string };
  sizeEstimate: number; // proportion of population
  purchaseProbabilityByPrice: Record<string, number>;
  topObjections: string[];
  recommendedMessaging: string;
  /** Top soul themes (values/fears patterns) across personas in this segment. */
  topSoulThemes: string[];
};

export type WtpCurve = { price: number; probability: number; count: number }[];

export type AggregatedResults = {
  wtpCurve: WtpCurve;
  segments: Segment[];
  topObjections: string[];
  nextExperiments: string[];
};

function countBy<T>(arr: T[], keyFn: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of arr) {
    const k = keyFn(t);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function aggregateResults(
  responses: ResponseRecord[],
  pricePoints: number[],
  populationSize: number
): AggregatedResults {
  const n = responses.length;
  if (n === 0) {
    return {
      wtpCurve: pricePoints.map((p) => ({ price: p, probability: 0, count: 0 })),
      segments: [],
      topObjections: [],
      nextExperiments: [
        "Increase sample size for more reliable segments",
        "Add follow-up survey for non-buyers",
      ],
    };
  }

  const wtpCurve: WtpCurve = pricePoints.map((price) => {
    const key = `$${price}`;
    const bought = responses.filter((r) => r.buys[key]).length;
    return { price, probability: bought / n, count: bought };
  });

  const objectionCounts = new Map<string, number>();
  for (const r of responses) {
    for (const o of r.objections) {
      const norm = o.trim().toLowerCase().slice(0, 80);
      objectionCounts.set(norm, (objectionCounts.get(norm) ?? 0) + 1);
    }
  }
  const topObjections = Array.from(objectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text]) => text);

  const segments = buildSegments(responses, pricePoints, n, populationSize);

  const nextExperiments: string[] = [];
  const bestPrice = wtpCurve.reduce((best, cur) => (cur.probability > best.probability ? cur : best), wtpCurve[0]);
  nextExperiments.push(`Test price $${bestPrice.price} in a follow-up study`);
  if (topObjections.length > 0) {
    nextExperiments.push(`Address top objection in messaging: "${topObjections[0]}"`);
  }
  nextExperiments.push("Run A/B test on segment-specific messaging");

  return {
    wtpCurve,
    segments,
    topObjections,
    nextExperiments,
  };
}

function buildSegments(
  responses: ResponseRecord[],
  pricePoints: number[],
  sampleSize: number,
  populationSize: number
): Segment[] {
  type SegmentKey = string;
  const segmentData = new Map<
    SegmentKey,
    { responses: ResponseRecord[]; ageBucket?: string; incomeQ?: number; painPoint?: string; channel?: string }
  >();

  for (const r of responses) {
    const p = r.persona;
    if (!p) continue;
    const incomeQ = getIncomeQuartile(p.incomeAnnual);
    const painPoint = p.painPoints[0] ?? "unknown";
    const channel = p.channels[0] ?? "unknown";
    const key: SegmentKey = `${p.ageBucket}_${incomeQ}_${painPoint}_${channel}`;
    if (!segmentData.has(key)) {
      segmentData.set(key, {
        responses: [],
        ageBucket: p.ageBucket,
        incomeQ,
        painPoint,
        channel,
      });
    }
    segmentData.get(key)!.responses.push(r);
  }

  const segments: Segment[] = [];
  const sorted = Array.from(segmentData.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.responses.length - a.responses.length)
    .slice(0, 5);

  for (let i = 0; i < sorted.length; i++) {
    const { key, responses: segResponses, ageBucket, incomeQ, painPoint, channel } = sorted[i];
    const sizeEstimate = (segResponses.length / sampleSize) * populationSize;
    const purchaseProbabilityByPrice: Record<string, number> = {};
    for (const price of pricePoints) {
      const k = `$${price}`;
      const prob = segResponses.filter((r) => r.buys[k]).length / segResponses.length;
      purchaseProbabilityByPrice[k] = Math.round(prob * 100) / 100;
    }
    const objCounts = new Map<string, number>();
    for (const r of segResponses) {
      for (const o of r.objections) {
        const t = o.trim().toLowerCase().slice(0, 60);
        objCounts.set(t, (objCounts.get(t) ?? 0) + 1);
      }
    }
    const topObjections = Array.from(objCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    const recommendedMessaging = `Target ${ageBucket} income Q${incomeQ}; emphasize solutions for "${painPoint}"; reach via ${channel}.`;

    const soulThemeCounts = new Map<string, number>();
    for (const r of segResponses) {
      for (const t of r.soulThemes ?? []) {
        const norm = t.trim().toLowerCase().slice(0, 120);
        soulThemeCounts.set(norm, (soulThemeCounts.get(norm) ?? 0) + 1);
      }
    }
    const topSoulThemes = Array.from(soulThemeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);

    segments.push({
      id: `seg_${i + 1}`,
      name: `Segment ${i + 1}: ${ageBucket}, Q${incomeQ}, ${painPoint}, ${channel}`,
      rules: { ageBucket, incomeQ, painPoint, channel },
      sizeEstimate: Math.round(sizeEstimate),
      purchaseProbabilityByPrice,
      topObjections,
      recommendedMessaging,
      topSoulThemes,
    });
  }

  return segments;
}
