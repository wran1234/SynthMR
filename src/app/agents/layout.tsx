import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "Agent API Quickstart | SynthMR",
  "AI market research API quickstart for external agent systems, including OpenAPI, tools manifest, API key auth, and synthetic market research workflows.",
  "/agents",
  [
    "AI market research API",
    "synthetic market research tool",
    "agent market validation API",
    "market research for AI agents",
  ]
);

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return children;
}

