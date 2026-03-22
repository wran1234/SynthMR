import Link from "next/link";
import { RelatedAgentLinks } from "@/components/docs/related-links";
import { DOCS_LAST_UPDATED, publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "Docs Home | SynthMR Agent API",
  "AI market research API documentation hub for agent systems, including authentication, OpenAPI, tools manifest, webhooks, and integration examples.",
  "/docs",
  [
    "AI market research API",
    "synthetic market research tool",
    "agent market validation API",
    "market research for AI agents",
  ]
);

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">SynthMR Documentation Hub</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          SynthMR is an AI-powered synthetic market research API that enables agents and developers to conduct rapid, cost-effective market validation studies. Generate realistic market data, analyze customer preferences, and gather strategic insights—all powered by advanced language models simulating authentic user responses.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: {DOCS_LAST_UPDATED}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quick Start</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Get up and running with SynthMR in four steps:</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">1. Create an API Key</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Generate your API key in the dashboard settings. You'll use this to authenticate all API requests.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">2. Create a Study</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">POST to <code className="text-sm font-mono text-slate-700 dark:text-slate-300">/api/v1/studies</code> with your product idea, target audience, and price points.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">3. Start a Run</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">POST to <code className="text-sm font-mono text-slate-700 dark:text-slate-300">/api/v1/studies/:id/runs</code> to begin synthetic market research with your desired sample size.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">4. Retrieve Results</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">GET <code className="text-sm font-mono text-slate-700 dark:text-slate-300">/api/v1/runs/:id/results</code> to access your study results including WTP curves, customer segments, and objections.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Documentation</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link href="/docs/agent-api" className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors dark:border-slate-700 dark:hover:border-slate-600">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Agent API Documentation</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Complete reference for all core API endpoints including studies, runs, results, and chat endpoints.</p>
          </Link>
          <Link href="/docs/authentication" className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors dark:border-slate-700 dark:hover:border-slate-600">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Authentication</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Learn how to authenticate requests using API keys and manage access scopes and key rotation.</p>
          </Link>
          <Link href="/docs/openapi" className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors dark:border-slate-700 dark:hover:border-slate-600">
            <p className="font-semibold text-slate-900 dark:text-slate-100">OpenAPI Specification</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Machine-readable OpenAPI schema for integrating SynthMR into API clients and code generators.</p>
          </Link>
          <Link href="/docs/webhooks" className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors dark:border-slate-700 dark:hover:border-slate-600">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Webhooks</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Receive real-time notifications when runs complete or fail, with signed webhook payloads.</p>
          </Link>
          <Link href="/docs/examples" className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors dark:border-slate-700 dark:hover:border-slate-600">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Examples & Code Samples</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Practical examples showing how to integrate SynthMR into your applications and workflows.</p>
          </Link>
        </div>
      </div>

      <RelatedAgentLinks />
    </div>
  );
}

