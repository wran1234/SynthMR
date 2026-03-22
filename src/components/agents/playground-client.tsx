"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const ENDPOINT_OPTIONS = [
  { value: "/api/v1/studies", method: "POST" },
  { value: "/api/v1/studies/:id", method: "GET" },
  { value: "/api/v1/studies/:id/runs", method: "POST" },
  { value: "/api/v1/runs/:id", method: "GET" },
  { value: "/api/v1/runs/:id/results", method: "GET" },
  { value: "/api/v1/runs/:id/chat", method: "POST" },
] as const;

export function PlaygroundClient() {
  const [endpoint, setEndpoint] = useState<string>(ENDPOINT_OPTIONS[0].value);
  const [body, setBody] = useState(`{\n  "ideaText": "AI pricing copilot",\n  "geography": "US",\n  "industry": "SaaS",\n  "pricePoints": [19, 39, 79]\n}`);
  const [apiKey, setApiKey] = useState("YOUR_API_KEY");
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [headersUsed, setHeadersUsed] = useState<Record<string, string>>({});

  useEffect(() => {
    const existing = localStorage.getItem("synthmr_last_api_key");
    if (existing?.trim()) setApiKey(existing.trim());
  }, []);

  const selectedMethod = useMemo(
    () => ENDPOINT_OPTIONS.find((o) => o.value === endpoint)?.method ?? "POST",
    [endpoint]
  );

  async function sendRequest() {
    setSending(true);
    try {
      const parsedBody = body.trim() ? JSON.parse(body) : {};
      const res = await fetch("/api/agents/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, method: selectedMethod, apiKey, body: parsedBody }),
      });
      const data = await res.json().catch(() => ({}));
      setResponse(JSON.stringify(data, null, 2));
      setHeadersUsed({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      });
    } catch (e) {
      setResponse(
        JSON.stringify(
          { error: e instanceof Error ? e.message : "Invalid request" },
          null,
          2
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agent API Playground</h1>
      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={endpoint} onChange={(e) => setEndpoint(e.target.value)}>
              {ENDPOINT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.method} {o.value}
                </option>
              ))}
            </Select>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="YOUR_API_KEY"
            />
          </div>
          <textarea
            className="h-56 w-full rounded-md border border-slate-300 p-3 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button onClick={sendRequest} disabled={sending}>
            {sending ? "Sending..." : "Send Request"}
          </Button>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Headers Used</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto text-xs">{JSON.stringify(headersUsed, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card className="card-panel">
        <CardHeader>
          <CardTitle className="text-base">Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto text-xs">{response || "{ }"}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
