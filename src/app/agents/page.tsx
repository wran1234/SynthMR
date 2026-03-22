"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCS_LAST_UPDATED } from "@/lib/public-site";

type Lang = "curl" | "ts" | "py";

function SnippetBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span className="text-xs text-slate-500">Example</span>
        <Button size="sm" variant="outline" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs text-slate-800 dark:text-slate-200">{code}</pre>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate font-mono text-xs text-slate-800 dark:text-slate-200">{value}</p>
      </div>
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export default function AgentsPage() {
  const [lang, setLang] = useState<Lang>("curl");
  const [apiKey, setApiKey] = useState("YOUR_API_KEY");
  const [hasLocalKey, setHasLocalKey] = useState(false);
  const baseUrl = "https://your-synthmr-domain.com";
  const openapiUrl = `${baseUrl}/api/openapi.json`;
  const manifestUrl = `${baseUrl}/api/tools/manifest`;
  const schemaUrl = `${baseUrl}/api/tools/schema`;

  useEffect(() => {
    const existing = localStorage.getItem("synthmr_last_api_key");
    if (existing?.trim()) {
      setApiKey(existing.trim());
      setHasLocalKey(true);
    }
  }, []);

  const snippets = useMemo(() => {
    if (lang === "curl") {
      return {
        createStudy: `curl -X POST "${baseUrl}/api/v1/studies" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"ideaText":"AI pricing copilot for indie SaaS","geography":"US","industry":"SaaS","pricePoints":[19,39,79]}'`,
        startRun: `curl -X POST "${baseUrl}/api/v1/studies/<studyId>/runs" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"sampleSize":250}'`,
        pollRun: `curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/runs/<runId>"`,
        getResults: `curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/runs/<runId>/results"`,
        chat: `curl -X POST "${baseUrl}/api/v1/runs/<runId>/chat" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"What price point should we test first?"}'`,
      };
    }
    if (lang === "ts") {
      return {
        createStudy: `import { SynthmrClient } from "@/sdk/typescript/index";

const client = new SynthmrClient({ baseUrl: "${baseUrl}", apiKey: "${apiKey}" });
const { study } = await client.createStudy({
  ideaText: "AI pricing copilot for indie SaaS",
  geography: "US",
  industry: "SaaS",
  pricePoints: [19, 39, 79],
});`,
        startRun: `const { run } = await client.startRun(String(study.id), { sampleSize: 250 });`,
        pollRun: `const runStatus = await client.getRun(String(run.id));`,
        getResults: `const results = await client.getResults(String(run.id));`,
        chat: `const chat = await fetch("${baseUrl}/api/v1/runs/" + run.id + "/chat", {
  method: "POST",
  headers: { "Authorization": "Bearer ${apiKey}", "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Summarize top objections and fixes." }),
}).then((r) => r.json());`,
      };
    }
    return {
      createStudy: `from sdk.python.client import SynthmrClient

client = SynthmrClient(base_url="${baseUrl}", api_key="${apiKey}")
study = client.create_study(
    idea_text="AI pricing copilot for indie SaaS",
    geography="US",
    industry="SaaS",
    price_points=[19, 39, 79],
)`,
      startRun: `run = client.start_run(study["study"]["id"], sample_size=250)`,
      pollRun: `run_status = client.get_run(run["run"]["id"])`,
      getResults: `results = client.get_results(run["run"]["id"])`,
      chat: `answer = client.chat_run(run["run"]["id"], "What price point should we test first?")`,
    };
  }, [lang, apiKey, baseUrl]);

  const jsonBodies = {
    createStudy: JSON.stringify(
      {
        ideaText: "AI pricing copilot for indie SaaS",
        geography: "US",
        industry: "SaaS",
        pricePoints: [19, 39, 79],
      },
      null,
      2
    ),
    startRun: JSON.stringify({ sampleSize: 250 }, null, 2),
    getResults: JSON.stringify({ runId: "cuid_run_id" }, null, 2),
    chat: JSON.stringify({ message: "What price point should we test first?" }, null, 2),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agent Quickstart</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Use SynthMR as an API-first platform for AI agents, workflows, and developer tooling.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: {DOCS_LAST_UPDATED}</p>
        {hasLocalKey ? (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Using your latest key locally for examples.</p>
        ) : (
          <div className="mt-3">
            <Link href="/account#api-keys-panel">
              <Button size="sm">Create API key</Button>
            </Link>
          </div>
        )}
      </div>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">What SynthMR is</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>
            SynthMR is an AI market research API focused on synthetic market research and agent market validation API workflows.
          </p>
          <p>
            It helps agent systems test pricing, segments, objections, and message strategy with structured outputs.
          </p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">What agents can do with SynthMR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>- Programmatically create studies and runs</p>
          <p>- Poll or subscribe to webhooks for lifecycle updates</p>
          <p>- Pull aggregate results for downstream decisions</p>
          <p>- Ask follow-up chat questions using run context</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Best use cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>- Pricing experiment planning for SaaS teams</p>
          <p>- Workflow automation in n8n, MCP clients, and LangChain</p>
          <p>- Pre-launch validation before spending on slower research channels</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Why use SynthMR instead of generic research tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>- Explicit agent contracts with OpenAPI + tools manifest</p>
          <p>- API key scopes, ownership checks, and audit logging</p>
          <p>- Fast iteration loop designed for automated agent pipelines</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Structured workflow for agent systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>1) Discover tools via `/api/tools/manifest` and `/api/tools/schema`.</p>
          <p>2) Authenticate with API key scope presets.</p>
          <p>3) Create study, start run, and receive status updates.</p>
          <p>4) Pull results and ask follow-up chat questions.</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Connect SynthMR to your agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyRow label="OpenAPI URL" value={openapiUrl} />
          <CopyRow label="Authorization Header" value="Authorization: Bearer YOUR_API_KEY" />
          <CopyRow label="Base API URL" value={`${baseUrl}/api/v1`} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ChatGPT Custom Action", "Import OpenAPI and add Bearer auth."],
              ["MCP-compatible client", "Use tools manifest + schema for tool discovery."],
              ["LangChain / Python agent", "Use starter wrappers in sdk folder."],
              ["n8n / Zapier workflows", "Create study -> run -> poll or webhook."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">ChatGPT Custom Action Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <p>1) Copy OpenAPI URL</p>
          <CopyRow label="OpenAPI URL" value={openapiUrl} />
          <p>2) Add Bearer auth</p>
          <CopyRow label="Auth Header Format" value="Authorization: Bearer YOUR_API_KEY" />
          <p>3) Paste your API key</p>
          <CopyRow label="Example Header Value" value={`Authorization: Bearer ${apiKey}`} />
          <p>4) Test create study and get results</p>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Quickstart Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>1) Create an API key in <Link href="/account" className="underline">Account</Link></p>
          <p>2) Create a study via <code>/api/v1/studies</code></p>
          <p>3) Start a run via <code>/api/v1/studies/:id/runs</code></p>
          <p>4) Poll run status or receive webhooks</p>
          <p>5) Ask follow-up questions via <code>/api/v1/runs/:id/chat</code></p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scope note: these examples require the corresponding API key scopes (read-only vs runner vs full access).
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant={lang === "curl" ? "default" : "outline"} onClick={() => setLang("curl")}>cURL</Button>
        <Button variant={lang === "ts" ? "default" : "outline"} onClick={() => setLang("ts")}>JavaScript / TypeScript</Button>
        <Button variant={lang === "py" ? "default" : "outline"} onClick={() => setLang("py")}>Python</Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Create Study</h2>
        <SnippetBlock code={snippets.createStudy} />
        <SnippetBlock code={jsonBodies.createStudy} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Run Study</h2>
        <SnippetBlock code={snippets.startRun} />
        <SnippetBlock code={jsonBodies.startRun} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Fetch Results</h2>
        <SnippetBlock code={snippets.pollRun} />
        <SnippetBlock code={snippets.getResults} />
        <SnippetBlock code={jsonBodies.getResults} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Chat With Results</h2>
        <SnippetBlock code={snippets.chat} />
        <SnippetBlock code={jsonBodies.chat} />
      </div>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Agent Tool Discovery Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyRow label="Manifest Endpoint" value={manifestUrl} />
          <CopyRow label="Tool Schema Endpoint" value={schemaUrl} />
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Integration Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p><strong>401 Unauthorized</strong> -&gt; check API key and Authorization header format.</p>
          <p><strong>403 Forbidden</strong> -&gt; check API key scopes and plan limits.</p>
          <p><strong>429 Rate limited</strong> -&gt; retry with backoff and honor Retry-After.</p>
          <p><strong>404 Not found</strong> -&gt; verify resource id and ownership for this API key.</p>
          <p><strong>Webhook signature mismatch</strong> -&gt; verify HMAC secret and raw request body.</p>
        </CardContent>
      </Card>
    </div>
  );
}
