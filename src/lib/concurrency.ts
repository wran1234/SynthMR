/**
 * LLM concurrency limiting via semaphore.
 * Uses env LLM_CONCURRENCY (default 5).
 */

const LIMIT = Math.max(1, parseInt(process.env.LLM_CONCURRENCY ?? "5", 10) || 5);

let running = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (running < LIMIT) {
    running++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  running++; // take the slot released by the woken task
}

function release(): void {
  running = Math.max(0, running - 1);
  if (waiters.length > 0) waiters.shift()!();
}

/**
 * Run fn with concurrency limit. Ensures at most LLM_CONCURRENCY calls run in parallel.
 */
export async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
