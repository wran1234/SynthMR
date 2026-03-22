/**
 * Prompt budget: truncate content to stay within token/char limits.
 * Target ~4k chars for total prompt.
 */

const DEFAULT_MAX_CHARS = 4000;

/**
 * Truncate string to maxLen, with ellipsis if truncated.
 */
export function truncate(text: string, maxLen: number = 400): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 3) + "...";
}

/**
 * Build soul summary from soul markdown. Max 1200 chars.
 * Extracts: values, money philosophy, decision style, product biases.
 */
export function soulSummary(soulMd: string, maxChars: number = 1200): string {
  if (!soulMd?.trim()) return "";
  const sections = ["Core Values", "Money Philosophy", "Decision Style", "Product Biases", "Identity Anchors"];
  const parts: string[] = [];
  for (const section of sections) {
    const re = new RegExp(`## ${section}[^#]*`, "i");
    const m = soulMd.match(re);
    if (m) {
      const text = m[0]
        .replace(/^## .+$/m, "")
        .trim()
        .replace(/\n+/g, " ")
        .slice(0, 200);
      if (text) parts.push(`${section}: ${text}`);
    }
  }
  const joined = parts.join("\n");
  return truncate(joined, maxChars);
}

/**
 * Ensure total prompt stays under budget. Returns trimmed content.
 */
export function budgetPrompt(parts: { role: string; content: string }[], maxTotalChars: number = DEFAULT_MAX_CHARS): { role: string; content: string }[] {
  const total = parts.reduce((sum, p) => sum + p.content.length, 0);
  if (total <= maxTotalChars) return parts;
  const over = total - maxTotalChars;
  const last = parts[parts.length - 1];
  if (last && last.content.length > over) {
    return [
      ...parts.slice(0, -1),
      { ...last, content: truncate(last.content, last.content.length - over) },
    ];
  }
  return parts;
}
