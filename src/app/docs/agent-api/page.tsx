import { RelatedAgentLinks } from "@/components/docs/related-links";
import { DOCS_LAST_UPDATED, publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "Agent API Documentation | SynthMR",
  "Agent market validation API docs for SynthMR: create studies, start runs, fetch results, and chat over synthetic market research outputs.",
  "/docs/agent-api",
  [
    "AI market research API",
    "agent market validation API",
    "synthetic market research tool",
    "market research for AI agents",
  ]
);

export default function AgentApiDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agent API Documentation</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The SynthMR agent market validation API supports full synthetic market research workflows from study creation to results chat. Use these endpoints to run market validation studies, retrieve results, and interact with findings through natural language.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: {DOCS_LAST_UPDATED}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Authentication</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">All API requests require authentication using a Bearer token with your API key. Include the API key in the <code className="text-sm font-mono text-slate-700 dark:text-slate-300">Authorization</code> header:</p>
        <pre className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>Authorization: Bearer smr_YOUR_API_KEY</code>
        </pre>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">API keys start with the prefix <code className="text-sm font-mono text-slate-700 dark:text-slate-300">smr_</code> and are generated in your dashboard settings. See the <a href="/docs/authentication" className="underline text-slate-700 dark:text-slate-300">Authentication docs</a> for more details.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Core Endpoints</h2>

        <div className="mt-4 space-y-8">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">POST /api/v1/studies</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Create a new market research study with a product idea and target market parameters.</p>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Request Body</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "ideaText": "string (required)",
  "geography": "US" | "UK" | "CA" (optional),
  "industry": "string (optional)",
  "pricePoints": [number, number, number] (required),
  "targetAudience": {
    "label": "string",
    "ageRange": "18-25" | "26-35" | ... (optional),
    "incomeRange": "$0-50k" | "$50k-100k" | ... (optional),
    "keywords": ["string", ...] (optional)
  } (optional)
}`}</code>
            </pre>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Example:</strong> Create a study for a productivity app targeting professionals aged 26-45 in the US.</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "ideaText": "AI productivity app for developers",
  "geography": "US",
  "industry": "Software",
  "pricePoints": [9.99, 19.99, 29.99],
  "targetAudience": {
    "label": "Software Developers",
    "ageRange": "26-35",
    "keywords": ["coding", "automation", "efficiency"]
  }
}`}</code>
            </pre>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Response:</strong> Returns the created study object with <code className="text-sm font-mono text-slate-700 dark:text-slate-300">id</code>, <code className="text-sm font-mono text-slate-700 dark:text-slate-300">createdAt</code>, and other metadata.</p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">POST /api/v1/studies/:id/runs</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Start a new run (market research execution) for an existing study with specified parameters.</p>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Request Body</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "sampleSize": 100-2000 (optional, default: 500),
  "populationMode": "general" | "audience_specific" (optional),
  "populationSize": 10000-500000 (optional)
}`}</code>
            </pre>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Example:</strong> Run the study with 750 participants from a general population.</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "sampleSize": 750,
  "populationMode": "general"
}`}</code>
            </pre>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Response:</strong> Returns a run object with <code className="text-sm font-mono text-slate-700 dark:text-slate-300">id</code>, <code className="text-sm font-mono text-slate-700 dark:text-slate-300">status</code> (typically <code className="text-sm font-mono text-slate-700 dark:text-slate-300">"pending"</code> or <code className="text-sm font-mono text-slate-700 dark:text-slate-300">"running"</code>), and <code className="text-sm font-mono text-slate-700 dark:text-slate-300">startedAt</code> timestamp.</p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">GET /api/v1/runs/:id/results</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Retrieve the results of a completed run, including pricing curves, customer segments, objections, and recommendations.</p>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Query Parameters</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">None</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Response:</strong> Returns a results object with the following structure:</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "runId": "string",
  "results": {
    "wtpCurve": [
      { price: number, adoptionRate: number },
      ...
    ],
    "segments": [
      {
        id: string,
        name: string,
        size: number,
        characteristics: string[]
      },
      ...
    ],
    "topObjections": [
      { objection: string, frequency: number },
      ...
    ],
    "nextExperiments": [string, ...],
    "metadata": {
      sampleSize: number,
      completedAt: string,
      duration: number
    }
  }
}`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">POST /api/v1/runs/:id/chat</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chat with the study results using natural language. Ask questions about findings, segments, pricing, objections, and recommendations.</p>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Request Body</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "message": "string (required)"
}`}</code>
            </pre>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Example:</strong> Ask about pricing strategy.</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "message": "What price point maximizes revenue while maintaining adoption?"
}`}</code>
            </pre>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Response:</strong> Returns an answer object with natural language response and citations:</p>
            <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
              <code>{`{
  "answer": "string",
  "citations": ["string", ...],
  "structured": {
    "threadId": "string",
    "reused": boolean
  }
}`}</code>
            </pre>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Rate Limits</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Rate limits are applied on a per-plan basis. Contact support for details on your specific plan's limits. Rate limit information is returned in response headers:</p>
        <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678891200`}</code>
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Error Handling</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">All errors follow a standard JSON format:</p>
        <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`{
  "error": "string describing the error"
}`}</code>
        </pre>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Common HTTP status codes:</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li><code className="text-sm font-mono text-slate-700 dark:text-slate-300">400</code> - Bad Request: Invalid request parameters</li>
          <li><code className="text-sm font-mono text-slate-700 dark:text-slate-300">401</code> - Unauthorized: Missing or invalid API key</li>
          <li><code className="text-sm font-mono text-slate-700 dark:text-slate-300">403</code> - Forbidden: Insufficient permissions for this resource</li>
          <li><code className="text-sm font-mono text-slate-700 dark:text-slate-300">404</code> - Not Found: Resource does not exist</li>
          <li><code className="text-sm font-mono text-slate-700 dark:text-slate-300">429</code> - Too Many Requests: Rate limit exceeded</li>
          <li><code className="text-sm font-mono text-slate-700 dark:text-slate-300">500</code> - Internal Server Error: Server-side issue</li>
        </ul>
      </div>

      <RelatedAgentLinks />
    </div>
  );
}

