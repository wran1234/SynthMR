#!/usr/bin/env npx tsx
/**
 * Check a population JSONL file: stream with parsePersonaLine metrics and print summary.
 * Usage: npx tsx scripts/checkPopulation.ts /path/to/pop.jsonl
 */

import * as path from "path";
import { streamPopulationFileMetrics } from "../src/lib/populationStore";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/checkPopulation.ts <path-to-pop.jsonl>");
  process.exit(1);
}

const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
streamPopulationFileMetrics(absPath)
  .then((m) => {
    const skippedPct = m.linesRead > 0 ? (m.linesSkipped / m.linesRead) * 100 : 0;
    console.log("read=%d repaired=%d skipped=%d (skippedPct=%.2f%%)", m.linesRead, m.linesRepaired, m.linesSkipped, skippedPct);
    if (m.linesRepaired === 0 && m.linesSkipped === 0) {
      console.log("OK: healthy file (no repairs or skips).");
    } else if (m.linesSkipped > 0) {
      console.warn("WARN: some lines were skipped; consider regenerating the population file.");
    } else {
      console.log("OK: all lines parsed (some repaired via jsonrepair).");
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
