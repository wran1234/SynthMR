import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "SynthMR Docs Hub | AI Market Research API",
  "Documentation hub for the SynthMR synthetic market research tool and agent market validation API: OpenAPI, authentication, tools manifest, webhooks, and examples.",
  "/docs",
  [
    "AI market research API",
    "synthetic market research tool",
    "agent market validation API",
    "market research for AI agents",
  ]
);

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}

