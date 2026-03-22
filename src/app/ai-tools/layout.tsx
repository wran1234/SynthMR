import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "AI Tools Discovery | SynthMR",
  "Discover SynthMR as a synthetic market research tool and agent market validation API with OpenAPI, tools manifest, API key auth, and webhook support.",
  "/ai-tools",
  [
    "AI market research API",
    "synthetic market research tool",
    "agent market validation API",
    "market research for AI agents",
  ]
);

export default function AiToolsLayout({ children }: { children: ReactNode }) {
  return children;
}

