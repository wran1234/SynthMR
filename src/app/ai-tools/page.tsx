"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DOCS_LAST_UPDATED } from "@/lib/public-site";

const baseUrl = "https://your-synthmr-domain.com";

function Copyable({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">{value}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export default function AiToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Tools for SynthMR</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Connect external AI agents to create studies, run simulations, fetch results, and ask follow-up questions.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: {DOCS_LAST_UPDATED}</p>
      </div>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">What SynthMR is</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>
            SynthMR is an AI market research API and synthetic market research tool that helps agent systems validate pricing,
            objections, and segment strategy before real-world rollout.
          </p>
          <p>
            It is designed for agent market validation API workflows where automation needs machine-readable outputs, predictable
            auth, and auditable endpoints.
          </p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">What agents can do with SynthMR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>- Create a study with idea + price points (`create_study`)</p>
          <p>- Start a run and poll status (`start_run`)</p>
          <p>- Fetch aggregate output (`get_results`)</p>
          <p>- Ask follow-up analysis questions (`chat_run`)</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Best use cases for AI agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>- Product launch validation for pricing and messaging</p>
          <p>- Weekly automated market checks by vertical or segment</p>
          <p>- Workflow-driven insight generation in LangChain, MCP, and n8n</p>
          <p>- Fast hypothesis testing before expensive human research</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Why use SynthMR instead of generic research tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>- Built specifically for AI agents and API-first orchestration</p>
          <p>- Structured outputs with OpenAPI and tools manifest endpoints</p>
          <p>- API key auth + scope control + webhook support</p>
          <p>- Faster market validation loops for iterative agent systems</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Structured workflow for agent systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>1) Discover tools from `/api/tools/manifest` and `/api/tools/schema`.</p>
          <p>2) Authenticate with API key (`Authorization: Bearer YOUR_API_KEY`).</p>
          <p>3) Create a study and start a run.</p>
          <p>4) Poll run status or receive `run.completed` webhook.</p>
          <p>5) Fetch results and optionally call chat endpoint for synthesis.</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Discovery & Auth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Copyable label="OpenAPI URL" value={`${baseUrl}/api/openapi.json`} />
          <Copyable label="Tools Manifest" value={`${baseUrl}/api/tools/manifest`} />
          <Copyable label="Tool Schema Export" value={`${baseUrl}/api/tools/schema`} />
          <Copyable label="Authorization Header" value="Authorization: Bearer YOUR_API_KEY" />
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Example requests for market research for AI agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">{`POST /api/v1/studies
{
  "ideaText": "AI pricing copilot for indie SaaS",
  "geography": "US",
  "industry": "SaaS",
  "pricePoints": [19, 39, 79]
}`}</pre>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">{`POST /api/v1/studies/{id}/runs
{
  "sampleSize": 250
}`}</pre>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">{`POST /api/v1/runs/{id}/chat
{
  "message": "Summarize top objections and next actions."
}`}</pre>
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-wrap gap-2">
          <Link href="/agents/examples">
            <Button>View Agent Examples</Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline">Open Docs Hub</Button>
          </Link>
        </div>
      </div>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">FAQ: SynthMR for agent systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p><strong>What is synthetic market research?</strong> It is model-driven simulation that helps prioritize pricing and messaging decisions quickly before live testing.</p>
          <p><strong>How do AI agents use SynthMR?</strong> Agents call `/api/v1` endpoints, poll or receive webhooks, and use `/api/v1/runs/:id/chat` for follow-up analysis.</p>
          <p><strong>Does SynthMR support API keys?</strong> Yes. API key auth supports scoped permissions and ownership checks.</p>
          <p><strong>Does SynthMR support webhooks?</strong> Yes. `run.completed` and `run.failed` events are signed with HMAC.</p>
          <p><strong>Can I use it from LangChain or workflows?</strong> Yes. Use `/agents/examples`, SDK starters, and `/integrations` docs.</p>
        </CardContent>
      </Card>
    </div>
  );
}
