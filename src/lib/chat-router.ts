import crypto from "crypto";

export type CanonicalIntent =
  | "SIMULATE_DECISION"
  | "EXEC_SUMMARY"
  | "BEST_NEXT_ACTION"
  | "BEST_PRICE"
  | "BIGGEST_RISK"
  | "CONFIDENCE_SCORE"
  | "WTP_PRICE_EXPLAIN"
  | "OBJECTIONS_SUMMARY_AND_MITIGATE"
  | "SEGMENT_TARGET_FIRST"
  | "SEGMENT_MESSAGE_AND_EXPERIMENT"
  | "NEXT_EXPERIMENTS_PRIORITIZE"
  | "FALLBACK";

export const CHAT_ROUTER_VERSION = "router_v1";
const SIM_SIGMOID_ALPHA = 0.12; // Larger => steeper conversion drop when price exceeds max_price.

export type CanonicalResult = {
  canonicalQuestion: string;
  canonicalIntent: CanonicalIntent;
  canonicalArgs: Record<string, string | number | null>;
};

type WtpPoint = { price: number; probabilityPct: number; count: number };
type Segment = {
  id: string | null;
  name: string | null;
  sizeEstimate: number | null;
  purchaseProbabilityByPrice: Record<string, number>;
  topObjections: string[];
  recommendedMessaging: string | null;
  topSoulThemes: string[];
};
type PersonaSim = {
  id: string;
  segmentName: string;
  max_price: number;
};

export type ParsedContext = {
  study: Record<string, unknown>;
  run: Record<string, unknown>;
  wtpCurve: WtpPoint[];
  segments: Segment[];
  personas: PersonaSim[];
  objections: string[];
  nextExperiments: string[];
};

function normalizeMoney(s: string): string {
  return s.replace(/\$?\s*(\d+(?:\.\d+)?)/g, (_, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return `$${Number.isInteger(n) ? n : Number(n.toFixed(2)).toString().replace(/\.00$/, "")}`;
  });
}

function normalizeNumericPrice(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Number.isInteger(n) ? n : Number(n.toFixed(2));
}

function extractSimulationPrice(raw: string): number | null {
  const s = raw.toLowerCase();
  const byDollar = s.match(/\$\s*(\d+(?:\.\d+)?)/)?.[1];
  if (byDollar != null) return normalizeNumericPrice(Number(byDollar));
  const byVerb = s.match(/\b(?:price(?:\s+is)?|simulate\s+price|charge|charging)\s+\$?\s*(\d+(?:\.\d+)?)/)?.[1];
  if (byVerb != null) return normalizeNumericPrice(Number(byVerb));
  const any = s.match(/\b(\d+(?:\.\d+)?)\b/)?.[1];
  if (any != null) return normalizeNumericPrice(Number(any));
  return null;
}

function cleanSegmentName(s: string | null): string | null {
  if (!s) return null;
  const v = s.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").trim();
  return v.length > 0 ? v : null;
}

function extractSimulationSegmentName(raw: string): string | null {
  const s = raw.toLowerCase();
  const p1 = s.match(/\bfor\s+segment\s+(.+?)(?:$|\b(?:at|with|price|when|and)\b)/)?.[1] ?? null;
  if (p1) return cleanSegmentName(p1);
  const p2 = s.match(/\bfor\s+(.+?)\s+segment\b/)?.[1] ?? null;
  if (p2) return cleanSegmentName(p2);
  const p3 = s.match(/\btargeting\s+(.+?)(?:$|\b(?:at|with|price|and)\b)/)?.[1] ?? null;
  if (p3) return cleanSegmentName(p3);
  return null;
}

export function canonicalizeQuestion(question: string): CanonicalResult {
  const q0 = question
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\w\s$.'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const q = normalizeMoney(q0);

  const moneyMatch = q.match(/\$(\d+(?:\.\d+)?)/);
  const normalizedPrice = moneyMatch ? normalizeNumericPrice(Number(moneyMatch[1])) : null;

  if (
    q.includes("what happens if price is") ||
    q.includes("simulate price") ||
    q.includes("if i charge") ||
    q.includes("what if i change price")
  ) {
    const simPrice = extractSimulationPrice(q0);
    const simSegment = extractSimulationSegmentName(q0);
    return {
      canonicalQuestion: q,
      canonicalIntent: "SIMULATE_DECISION",
      canonicalArgs: { price: simPrice, segmentName: simSegment },
    };
  }

  if (q.includes("summary") || q.includes("executive summary") || q.includes("exec summary")) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "EXEC_SUMMARY",
      canonicalArgs: {},
    };
  }

  if (
    q.includes("what should i do next") ||
    q.includes("best next action") ||
    q.includes("next best action")
  ) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "BEST_NEXT_ACTION",
      canonicalArgs: {},
    };
  }

  if ((q.includes("best price") || q.includes("optimal price")) && !q.includes("segment")) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "BEST_PRICE",
      canonicalArgs: {},
    };
  }

  if (q.includes("biggest risk") || q.includes("largest risk") || q.includes("main risk")) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "BIGGEST_RISK",
      canonicalArgs: {},
    };
  }

  if (q.includes("confidence")) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "CONFIDENCE_SCORE",
      canonicalArgs: {},
    };
  }

  if (
    q.includes("price") ||
    q.includes("wtp") ||
    q.includes("willingness") ||
    q.includes("conversion")
  ) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "WTP_PRICE_EXPLAIN",
      canonicalArgs: { price: normalizedPrice },
    };
  }

  if (q.includes("objection") || q.includes("mitigate") || q.includes("barrier")) {
    const quoted = q.match(/"([^"]+)"/)?.[1] ?? null;
    return {
      canonicalQuestion: q,
      canonicalIntent: "OBJECTIONS_SUMMARY_AND_MITIGATE",
      canonicalArgs: { objectionText: quoted },
    };
  }

  if ((q.includes("segment") && q.includes("target")) || q.includes("target first")) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "SEGMENT_TARGET_FIRST",
      canonicalArgs: {},
    };
  }

  if (
    (q.includes("segment") && q.includes("message")) ||
    q.includes("first experiment") ||
    q.includes("best message")
  ) {
    const segmentName = q.includes("segment:") ? q.split("segment:")[1]?.trim() ?? null : null;
    return {
      canonicalQuestion: q,
      canonicalIntent: "SEGMENT_MESSAGE_AND_EXPERIMENT",
      canonicalArgs: { segmentName },
    };
  }

  if (q.includes("next experiment") || q.includes("priorit") || q.includes("highest-priority")) {
    return {
      canonicalQuestion: q,
      canonicalIntent: "NEXT_EXPERIMENTS_PRIORITIZE",
      canonicalArgs: {},
    };
  }

  return {
    canonicalQuestion: q,
    canonicalIntent: "FALLBACK",
    canonicalArgs: {},
  };
}

export function parseContextPack(contextPack: string): ParsedContext {
  const sections = new Map<string, string>();
  const names = [
    "STUDY",
    "RUN",
    "WTP_CURVE",
    "SEGMENTS (JSON)",
    "PERSONAS",
    "OBJECTIONS",
    "NEXT_EXPERIMENTS",
    "SYNTHETIC_DISCLAIMER",
  ];
  const lines = contextPack.split("\n");
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of lines) {
    if (names.includes(line.trim())) {
      if (current) sections.set(current, buf.join("\n").trim());
      current = line.trim();
      buf = [];
    } else if (current) {
      buf.push(line);
    }
  }
  if (current) sections.set(current, buf.join("\n").trim());

  const readJson = <T>(name: string, fallback: T): T => {
    const raw = sections.get(name);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    study: readJson<Record<string, unknown>>("STUDY", {}),
    run: readJson<Record<string, unknown>>("RUN", {}),
    wtpCurve: readJson<WtpPoint[]>("WTP_CURVE", []),
    segments: readJson<Segment[]>("SEGMENTS (JSON)", []),
    personas: readJson<PersonaSim[]>("PERSONAS", []),
    objections: readJson<string[]>("OBJECTIONS", []),
    nextExperiments: readJson<string[]>("NEXT_EXPERIMENTS", []),
  };
}

function formatResponse(answer: string, evidence: string[], nextAction: string): string {
  return `Answer:\n${answer}\n\nEvidence used:\n- ${evidence.join("\n- ")}\n\nSuggested next action:\n${nextAction}`;
}

export function buildTemplateResponse(
  intent: CanonicalIntent,
  args: Record<string, string | number | null>,
  ctx: ParsedContext
): string | null {
  const topSegment = ctx.segments[0] ?? null;
  const bestWtp =
    ctx.wtpCurve.length > 0
      ? ctx.wtpCurve.reduce((best, cur) => (cur.probabilityPct > best.probabilityPct ? cur : best), ctx.wtpCurve[0])
      : null;
  const biggestObjection = ctx.objections[0] ?? null;
  const nextAction = ctx.nextExperiments[0] ?? "Run a focused follow-up experiment on the strongest signal.";

  if (intent === "SIMULATE_DECISION") {
    const priceArg = typeof args.price === "number" ? args.price : null;
    const fallbackPrice = bestWtp?.price ?? null;
    const price = priceArg ?? fallbackPrice;
    const requestedSegment =
      typeof args.segmentName === "string" && args.segmentName.trim().length > 0
        ? args.segmentName.trim().toLowerCase()
        : null;
    if (price == null || !Number.isFinite(price)) {
      return formatResponse(
        "From WTP_CURVE and PERSONAS, simulation needs a valid target price but none was provided.",
        ["WTP_CURVE", "PERSONAS"],
        "Ask again with a specific price, e.g. 'simulate price $49'."
      );
    }

    const personas = ctx.personas ?? [];
    if (!personas.length) {
      return formatResponse(
        "From PERSONAS, simulation data is unavailable in this context snapshot.",
        ["PERSONAS"],
        "Reload results and ask again."
      );
    }

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));
    const probFor = (maxPrice: number, targetPrice: number) =>
      clamp(0.02, 0.85, sigmoid(SIM_SIGMOID_ALPHA * (maxPrice - targetPrice)));

    const segStats = new Map<string, { n: number; convSum: number; geCount: number }>();
    let convSumOverall = 0;
    let geOverall = 0;
    for (const p of personas) {
      const prob = probFor(p.max_price, price);
      convSumOverall += prob;
      if (p.max_price >= price) geOverall++;
      const seg = segStats.get(p.segmentName) ?? { n: 0, convSum: 0, geCount: 0 };
      seg.n += 1;
      seg.convSum += prob;
      if (p.max_price >= price) seg.geCount += 1;
      segStats.set(p.segmentName, seg);
    }
    const nOverall = personas.length;
    const convPer100Overall = (convSumOverall / nOverall) * 100;
    const revenuePer100Overall = price * convPer100Overall;

    const ranked = Array.from(segStats.entries())
      .map(([name, s]) => ({
        name,
        conversionsPer100: (s.convSum / s.n) * 100,
        gePct: (s.geCount / s.n) * 100,
        n: s.n,
      }))
      .sort((a, b) => b.conversionsPer100 - a.conversionsPer100);
    const bestSeg = ranked[0] ?? null;
    const top3 = ranked.slice(0, 3);

    let segmentLine = "";
    if (requestedSegment) {
      const match =
        ranked.find((s) => s.name.toLowerCase().includes(requestedSegment)) ?? null;
      if (match) {
        const segRevenuePer100 = price * match.conversionsPer100;
        segmentLine = `\nSegment-only (${match.name}): conversion per 100 visitors = ${match.conversionsPer100.toFixed(1)}, expected revenue per 100 visitors = $${segRevenuePer100.toFixed(2)}.\nOverall comparison: conversion per 100 visitors = ${convPer100Overall.toFixed(1)}, expected revenue per 100 visitors = $${revenuePer100Overall.toFixed(2)}.`;
      } else {
        segmentLine = `\nSegment-only: requested segment "${requestedSegment}" was not found; using overall metrics for recommendation.`;
      }
    }

    const whyOverall = (geOverall / nOverall) * 100;
    const whyBest = bestSeg ? bestSeg.gePct : 0;
    const top3Text =
      top3.length > 0
        ? top3.map((s, i) => `${i + 1}) ${s.name}: ${s.conversionsPer100.toFixed(1)} conversions / 100`).join("\n")
        : "No segment performance available.";

    const recommendation =
      convPer100Overall >= 45
        ? `Price $${price} appears strong for conversion; prioritize validation at this point.`
        : `Price $${price} may be aggressive; test a lower adjacent price point to improve conversion.`;

    const answer = [
      `Predicted conversion per 100 visitors: ${convPer100Overall.toFixed(1)}`,
      `Expected revenue per 100 visitors: $${revenuePer100Overall.toFixed(2)}`,
      `Top 3 segments with conversions_per_100:\n${top3Text}`,
      `Best segment: ${bestSeg?.name ?? "N/A"}`,
      `Why: ${whyOverall.toFixed(1)}% of personas have max_price >= $${price} overall; ${whyBest.toFixed(1)}% within the best segment.${segmentLine}`,
      `Recommendation: ${recommendation}`,
    ].join("\n\n");
    return formatResponse(answer, ["PERSONAS", "SEGMENTS (JSON)", "WTP_CURVE"], `Run an A/B price test at $${price} and one nearby price to validate conversion and revenue per 100 visitors.`);
  }

  if (intent === "EXEC_SUMMARY") {
    const summary = `From WTP_CURVE and SEGMENTS (JSON), the run indicates a directional opportunity with strongest conversion near ${bestWtp ? `$${bestWtp.price}` : "the tested best-performing price"} and a leading segment of ${topSegment?.name ?? "the top-ranked segment"}.`;
    return [
      "Summary:",
      summary,
      "",
      `Top segment: ${topSegment?.name ?? "Not available"}`,
      `Best price: ${bestWtp ? `$${bestWtp.price} (${bestWtp.probabilityPct.toFixed(1)}%)` : "Not available"}`,
      `Biggest objection: ${biggestObjection ?? "Not available"}`,
      `Next action: ${nextAction}`,
      "",
      "Evidence used:",
      "- SEGMENTS (JSON)",
      "- WTP_CURVE",
      "- OBJECTIONS",
      "- NEXT_EXPERIMENTS",
    ].join("\n");
  }

  if (intent === "BEST_NEXT_ACTION") {
    const answer = `From NEXT_EXPERIMENTS, the highest-ROI next action is: ${nextAction}`;
    return formatResponse(answer, ["NEXT_EXPERIMENTS", "WTP_CURVE"], "Execute this action first, then compare conversion movement against the current best price.");
  }

  if (intent === "BEST_PRICE") {
    if (!bestWtp) {
      return formatResponse(
        "From WTP_CURVE, best price is not available in this run.",
        ["WTP_CURVE"],
        "Run or reload results to populate the WTP curve."
      );
    }
    const answer = `From WTP_CURVE, best price is $${bestWtp.price} with ${bestWtp.probabilityPct.toFixed(1)}% purchase probability (count=${bestWtp.count}).`;
    return formatResponse(answer, ["WTP_CURVE"], `Prioritize a validation test around $${bestWtp.price} in the next run.`);
  }

  if (intent === "BIGGEST_RISK") {
    const risk = biggestObjection ?? "insufficient objections data";
    const answer = `From OBJECTIONS, the biggest current risk is "${risk}". This can reduce conversion if left unaddressed.`;
    return formatResponse(answer, ["OBJECTIONS", "SEGMENTS (JSON)"], "Create one mitigation message specifically targeting this risk and test it in the next experiment.");
  }

  if (intent === "CONFIDENCE_SCORE") {
    const probs = ctx.wtpCurve.map((p) => p.probabilityPct / 100);
    const n = ctx.wtpCurve.length;
    const mean = n > 0 ? probs.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 0 ? probs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n : 0;
    const personaCount = ctx.wtpCurve.length > 0 ? Math.max(...ctx.wtpCurve.map((p) => p.count)) : 0;
    const agreementRate = Math.max(0, Math.min(1, 1 - Math.sqrt(variance)));
    const countScore = Math.min(1, personaCount / 300);
    const confidence = Math.round((0.45 * agreementRate + 0.35 * (1 - Math.min(1, variance * 4)) + 0.2 * countScore) * 100);
    const answer = `Confidence score: ${confidence}/100 (higher is better).`;
    return [
      "Answer:",
      answer,
      "",
      "Evidence used:",
      "- WTP_CURVE",
      "- SEGMENTS (JSON)",
      "- OBJECTIONS",
      "- NEXT_EXPERIMENTS",
      "",
      `Suggested next action: If confidence < 70, increase sample size and run a focused follow-up test on the best price/segment.`,
      "",
      `Computation details: personaCount≈${personaCount}, variance=${variance.toFixed(4)}, agreementRate=${(agreementRate * 100).toFixed(1)}%.`,
    ].join("\n");
  }

  if (intent === "WTP_PRICE_EXPLAIN") {
    const requested = typeof args.price === "number" ? args.price : null;
    const point =
      requested != null
        ? ctx.wtpCurve.find((p) => p.price === requested) ?? null
        : ctx.wtpCurve.reduce((best, cur) => (cur.probabilityPct > best.probabilityPct ? cur : best), ctx.wtpCurve[0] ?? null);
    if (!point) return null;
    const answer =
      requested != null
        ? `From WTP_CURVE, purchase probability at $${point.price} is ${point.probabilityPct.toFixed(1)}% (count=${point.count}).`
        : `From WTP_CURVE, the strongest conversion appears at $${point.price} (${point.probabilityPct.toFixed(1)}%, count=${point.count}).`;
    return formatResponse(answer, ["WTP_CURVE"], `Run a focused follow-up test around $${point.price}.`);
  }

  if (intent === "OBJECTIONS_SUMMARY_AND_MITIGATE") {
    const target = typeof args.objectionText === "string" ? args.objectionText.toLowerCase() : null;
    const top = ctx.objections.slice(0, 3);
    if (!top.length) return null;
    const chosen = target ? ctx.objections.find((o) => o.toLowerCase().includes(target)) ?? top[0] : top[0];
    const answer = `From OBJECTIONS, top objections include ${top.join("; ")}. A mitigation for "${chosen}" is to add targeted proof and risk-reversal language in messaging.`;
    return formatResponse(answer, ["OBJECTIONS", "SEGMENTS (JSON)"], "Test one objection-focused message variant in the next experiment.");
  }

  if (intent === "SEGMENT_TARGET_FIRST") {
    const seg = ctx.segments[0];
    if (!seg) return null;
    const answer = `From SEGMENTS (JSON), prioritize "${seg.name ?? seg.id ?? "Segment 1"}" first because it is currently ranked highest by size/fit.`;
    return formatResponse(answer, ["SEGMENTS (JSON)"], "Build first campaign copy for this segment and validate with a narrow follow-up run.");
  }

  if (intent === "SEGMENT_MESSAGE_AND_EXPERIMENT") {
    const requested = typeof args.segmentName === "string" ? args.segmentName.toLowerCase() : null;
    const seg =
      requested != null
        ? ctx.segments.find((s) => (s.name ?? "").toLowerCase().includes(requested)) ?? ctx.segments[0]
        : ctx.segments[0];
    if (!seg) return null;
    const answer = `From SEGMENTS (JSON), for "${seg.name ?? seg.id ?? "top segment"}" use this message direction: ${seg.recommendedMessaging ?? "emphasize value and trust"}; top objections are ${(seg.topObjections ?? []).slice(0, 2).join("; ") || "not specified"}.`;
    return formatResponse(answer, ["SEGMENTS (JSON)", "OBJECTIONS"], "Run one message A/B test for this segment and compare conversion by price point.");
  }

  if (intent === "NEXT_EXPERIMENTS_PRIORITIZE") {
    const top = ctx.nextExperiments.slice(0, 3);
    if (!top.length) return null;
    const answer = `From NEXT_EXPERIMENTS, top priorities are: ${top.join(" | ")}.`;
    return formatResponse(answer, ["NEXT_EXPERIMENTS", "WTP_CURVE"], "Execute the first experiment, then re-run and compare movement in WTP curve and objections.");
  }

  return null;
}

function stableArgsJson(args: Record<string, string | number | null>): string {
  const keys = Object.keys(args).sort();
  const obj: Record<string, string | number | null> = {};
  for (const k of keys) obj[k] = args[k];
  return JSON.stringify(obj);
}

export function buildCanonicalCacheKey(params: {
  runId: string;
  aggregateHash: string;
  canonicalIntent: CanonicalIntent;
  canonicalArgs: Record<string, string | number | null>;
}): string {
  const raw = `${params.runId}|${params.aggregateHash}|${CHAT_ROUTER_VERSION}|${params.canonicalIntent}|${stableArgsJson(params.canonicalArgs)}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}
