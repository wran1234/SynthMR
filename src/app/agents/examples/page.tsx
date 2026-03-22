"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Lang = "python" | "javascript" | "curl";

function Snippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span className="text-xs text-slate-500">Example</span>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs text-slate-800 dark:text-slate-200">{code}</pre>
    </div>
  );
}

export default function AgentExamplesPage() {
  const [lang, setLang] = useState<Lang>("curl");
  const [apiKey, setApiKey] = useState("YOUR_API_KEY");
  const baseUrl = "https://your-synthmr-domain.com";

  useEffect(() => {
    const existing = localStorage.getItem("synthmr_last_api_key");
    if (existing?.trim()) setApiKey(existing.trim());
  }, []);

  const code = useMemo(() => {
    if (lang === "python") {
      return `from sdk.python.client import SynthmrClient

client = SynthmrClient(base_url="${baseUrl}", api_key="${apiKey}")
study = client.create_study(
    idea_text="AI pricing copilot for indie SaaS",
    geography="US",
    industry="SaaS",
    price_points=[19, 39, 79],
)
run = client.start_run(study["study"]["id"], sample_size=250)
results = client.get_results(run["run"]["id"])
answer = client.chat_run(run["run"]["id"], "What price should we test first?")`;
    }
    if (lang === "javascript") {
      return `import { SynthmrClient } from "@/sdk/typescript/index";

const client = new SynthmrClient({ baseUrl: "${baseUrl}", apiKey: "${apiKey}" });
const { study } = await client.createStudy({
  ideaText: "AI pricing copilot for indie SaaS",
  geography: "US",
  industry: "SaaS",
  pricePoints: [19, 39, 79],
});
const { run } = await client.startRun(study.id, { sampleSize: 250 });
const results = await client.getResults(run.id);
const chat = await client.chatRun(run.id, "What price should we test first?");`;
    }
    return `curl -X POST "${baseUrl}/api/v1/studies" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"ideaText":"AI pricing copilot for indie SaaS","geography":"US","industry":"SaaS","pricePoints":[19,39,79]}'

curl -X POST "${baseUrl}/api/v1/studies/<studyId>/runs" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"sampleSize":250}'

curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/runs/<runId>/results"`;
  }, [lang, apiKey]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agent Examples</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Ready-to-use examples for Python, JavaScript, and cURL.
        </p>
      </div>
      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={lang === "curl" ? "default" : "outline"} onClick={() => setLang("curl")}>curl</Button>
          <Button variant={lang === "javascript" ? "default" : "outline"} onClick={() => setLang("javascript")}>JavaScript</Button>
          <Button variant={lang === "python" ? "default" : "outline"} onClick={() => setLang("python")}>Python</Button>
        </CardContent>
      </Card>
      <Snippet code={code} />
    </div>
  );
}
