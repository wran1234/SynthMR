import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "Agent Integration Examples | SynthMR",
  "Python, JavaScript, and curl examples for the SynthMR Agent API, including create study, start run, fetch results, and chat over run outputs.",
  "/agents/examples",
  [
    "AI market research API",
    "agent market validation API",
    "market research for AI agents",
    "synthetic market research tool",
  ]
);

export default function AgentsExamplesLayout({ children }: { children: ReactNode }) {
  return children;
}

