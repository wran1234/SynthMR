/**
 * Safe logging: never log idea text, persona JSON, survey answers, or other PII/sensitive content.
 * Use mask() for values that might be sensitive; use redacted error messages in catch blocks.
 */

export function mask(value: string | undefined | null, maxVisible = 0): string {
  if (value == null || value === "") return "[empty]";
  if (maxVisible <= 0) return "[redacted]";
  if (value.length <= maxVisible) return "[redacted]";
  return value.slice(0, maxVisible) + "…[redacted]";
}

/** Use for error messages that might contain user/survey content. */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (/idea|persona|survey|answer|objection/i.test(msg)) return "Operation failed (see server logs)";
    return msg;
  }
  return "Unknown error";
}
