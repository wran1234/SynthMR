/**
 * OpenAI-compatible LLM adapter.
 * Configure via env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL.
 * Retries on 429/5xx with exponential backoff.
 * Use chatWithLimit for concurrency-safe calls.
 */

import { withLimit } from "./concurrency";

const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

/** Token counts when the provider includes usage (e.g. OpenAI). */
export type LlmUsage = { promptTokens: number; completionTokens: number };

export type LlmResult = { content: string; usage?: LlmUsage };

function chunkText(text: string, chunkSize: number = 32): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));
  return chunks;
}

async function chatInternal(
  messages: Message[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LlmResult> {
  const url = `${BASE_URL.replace(/\/$/, "")}/chat/completions`;
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const content = data.choices?.[0]?.message?.content;
        if (content == null) throw new Error("LLM response missing content");
        const usage: LlmUsage | undefined =
          data.usage != null && typeof data.usage.prompt_tokens === "number" && typeof data.usage.completion_tokens === "number"
            ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
            : undefined;
        return { content, usage };
      }

      const status = res.status;
      const errText = await res.text();
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw new Error(`LLM API error ${status}: ${errText}`);
      }

      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      if (attempt > 0) {
        const { logWarn } = require("./logger");
        logWarn("LLM retry", { attempt, maxRetries: MAX_RETRIES, status, backoffMs: backoff });
      }
      await sleep(backoff);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt === MAX_RETRIES) throw lastErr;
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await sleep(backoff);
    }
  }

  throw lastErr ?? new Error("LLM request failed");
}

/**
 * Single LLM call with retry/backoff. No concurrency limit.
 */
export async function chat(
  messages: Message[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LlmResult> {
  return chatInternal(messages, options);
}

/**
 * LLM call with concurrency limit (LLM_CONCURRENCY). Use for batch persona simulation.
 */
export async function chatWithLimit(
  messages: Message[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LlmResult> {
  return withLimit(() => chatInternal(messages, options));
}

async function* parseOpenAiSse(res: Response): AsyncGenerator<string, void, unknown> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || !line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const token = data.choices?.[0]?.delta?.content;
        if (typeof token === "string" && token.length > 0) yield token;
      } catch {
        // Ignore malformed chunks.
      }
    }
  }
}

async function parseOpenAiSseWithUsage(
  res: Response,
  onToken: (token: string) => Promise<void> | void
): Promise<LlmResult> {
  if (!res.body) return { content: "" };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let usage: LlmUsage | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || !line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        return { content, usage };
      }
      try {
        const data = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const token = data.choices?.[0]?.delta?.content;
        if (typeof token === "string" && token.length > 0) {
          content += token;
          await onToken(token);
        }
        if (
          data.usage &&
          typeof data.usage.prompt_tokens === "number" &&
          typeof data.usage.completion_tokens === "number"
        ) {
          usage = {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          };
        }
      } catch {
        // Ignore malformed chunks.
      }
    }
  }
  return { content, usage };
}

/**
 * Streaming chat tokens. Uses provider streaming when available.
 * Falls back to chunked full response streaming if provider doesn't support stream mode.
 */
export async function* chatStream(
  messages: Message[],
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string, void, unknown> {
  const url = `${BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      yield* parseOpenAiSse(res);
      return;
    }
    // Provider may ignore stream=true and return a normal JSON completion.
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    for (const part of chunkText(content, 32)) yield part;
    return;
  }

  const status = res.status;
  const errText = await res.text();
  const mightNotSupportStream = status === 400 || status === 404 || status === 422 || status === 501;
  if (mightNotSupportStream) {
    const fallback = await chatInternal(messages, options);
    for (const part of chunkText(fallback.content, 32)) yield part;
    return;
  }
  throw new Error(`LLM API error ${status}: ${errText}`);
}

/**
 * Stream tokens via callback and return final content + usage.
 * Uses provider SSE when available, with fallback to non-stream completion.
 */
export async function chatStreamResult(
  messages: Message[],
  onToken: (token: string) => Promise<void> | void,
  options?: { temperature?: number; maxTokens?: number }
): Promise<LlmResult> {
  const url = `${BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return parseOpenAiSseWithUsage(res, onToken);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    for (const part of chunkText(content, 32)) await onToken(part);
    const usage: LlmUsage | undefined =
      data.usage != null && typeof data.usage.prompt_tokens === "number" && typeof data.usage.completion_tokens === "number"
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined;
    return { content, usage };
  }

  const status = res.status;
  const errText = await res.text();
  const mightNotSupportStream = status === 400 || status === 404 || status === 422 || status === 501;
  if (mightNotSupportStream) {
    const fallback = await chatInternal(messages, options);
    for (const part of chunkText(fallback.content, 32)) await onToken(part);
    return fallback;
  }
  throw new Error(`LLM API error ${status}: ${errText}`);
}

export function getLlmConfig(): { baseUrl: string; model: string; hasKey: boolean } {
  return {
    baseUrl: BASE_URL,
    model: MODEL,
    hasKey: !!API_KEY,
  };
}
