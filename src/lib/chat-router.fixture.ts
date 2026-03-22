import { canonicalizeQuestion } from "./chat-router";

type Fixture = {
  prompt: string;
  expectedIntent: string;
  expectedPrice: number | null;
  expectedSegmentName: string | null;
};

const FIXTURES: Fixture[] = [
  {
    prompt: "simulate price $59",
    expectedIntent: "SIMULATE_DECISION",
    expectedPrice: 59,
    expectedSegmentName: null,
  },
  {
    prompt: "what happens if price is 59.0",
    expectedIntent: "SIMULATE_DECISION",
    expectedPrice: 59,
    expectedSegmentName: null,
  },
  {
    prompt: "if I charge 59 targeting value seekers",
    expectedIntent: "SIMULATE_DECISION",
    expectedPrice: 59,
    expectedSegmentName: "value seekers",
  },
  {
    prompt: "what if I change price to 49 for segment budget-conscious families",
    expectedIntent: "SIMULATE_DECISION",
    expectedPrice: 49,
    expectedSegmentName: "budget-conscious families",
  },
];

/**
 * Unit-test-like fixture runner for quick sanity checks.
 * Returns errors list; empty list means all fixtures passed.
 */
export function runChatRouterFixtures(): string[] {
  const errors: string[] = [];
  for (const f of FIXTURES) {
    const r = canonicalizeQuestion(f.prompt);
    const price = (r.canonicalArgs.price as number | null) ?? null;
    const segmentName = (r.canonicalArgs.segmentName as string | null) ?? null;
    if (r.canonicalIntent !== f.expectedIntent) {
      errors.push(`Intent mismatch for "${f.prompt}": got ${r.canonicalIntent}, expected ${f.expectedIntent}`);
    }
    if (price !== f.expectedPrice) {
      errors.push(`Price mismatch for "${f.prompt}": got ${String(price)}, expected ${String(f.expectedPrice)}`);
    }
    if (segmentName !== f.expectedSegmentName) {
      errors.push(
        `Segment mismatch for "${f.prompt}": got ${String(segmentName)}, expected ${String(f.expectedSegmentName)}`
      );
    }
  }
  return errors;
}
