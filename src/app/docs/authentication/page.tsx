import { RelatedAgentLinks } from "@/components/docs/related-links";
import { DOCS_LAST_UPDATED, publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "Authentication | SynthMR",
  "API authentication documentation for SynthMR: learn how to generate and manage API keys, configure access scopes, and rotate credentials for secure API access.",
  "/docs/authentication",
  [
    "API authentication",
    "API key management",
    "bearer token authentication",
    "API security",
  ]
);

export default function AuthenticationDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Authentication</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          SynthMR supports two authentication methods: session-based authentication for web UI access and API key-based authentication for programmatic access. This guide focuses on API key authentication used for agent integrations and application APIs.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: {DOCS_LAST_UPDATED}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Authentication Methods</h2>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Session-Based Authentication</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Used when accessing the SynthMR web dashboard. Credentials are managed through browser cookies and sessions. No action required from developers.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">API Key Authentication</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Used for programmatic access via REST API. API keys are Bearer tokens passed in the <code className="text-sm font-mono text-slate-700 dark:text-slate-300">Authorization</code> header. Required for agent integrations and backend services.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">API Key Generation</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          To generate a new API key for programmatic access:
        </p>
        <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>1. Open Dashboard:</strong> Log in to your SynthMR account and navigate to the dashboard.</li>
          <li><strong>2. Settings:</strong> Click on "Settings" or your account profile icon in the top navigation.</li>
          <li><strong>3. API Keys:</strong> Select "API Keys" from the settings menu.</li>
          <li><strong>4. Create Key:</strong> Click "Create New Key" and provide a descriptive name (e.g., "Production API" or "Agent Integration").</li>
          <li><strong>5. Copy Key:</strong> The new API key will be displayed once. Copy it and store it securely—you won't be able to view it again.</li>
        </ol>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">API Key Format & Security</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          API keys follow this format:
        </p>
        <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>smr_[random-base64-encoded-bytes]</code>
        </pre>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Example: <code className="text-sm font-mono text-slate-700 dark:text-slate-300">smr_i7Xm9kL2pQ4rT6vW8yZ1aB3cD5eF7gH9</code>
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          API keys are sensitive credentials and should be treated like passwords. Store them securely using environment variables or a secrets management system—never hardcode them in your source code or version control.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Using API Keys</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Include your API key in the Authorization header of all API requests:
        </p>
        <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>Authorization: Bearer smr_YOUR_API_KEY</code>
        </pre>

        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">cURL Example</p>
        <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`curl -X POST https://api.synthmr.com/api/v1/studies \\
  -H "Authorization: Bearer smr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ideaText": "AI productivity app",
    "pricePoints": [9.99, 19.99, 29.99]
  }'`}</code>
        </pre>

        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">JavaScript/Node.js Example</p>
        <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`const apiKey = process.env.SYNTHMR_API_KEY;

const response = await fetch('https://api.synthmr.com/api/v1/studies', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ideaText: 'AI productivity app',
    pricePoints: [9.99, 19.99, 29.99]
  })
});

const data = await response.json();`}</code>
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Access Scopes</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          API keys can be configured with specific scopes to limit what actions they can perform. Current available scopes:
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100"><code className="font-mono">studies:write</code></p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Create and modify studies</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100"><code className="font-mono">runs:write</code></p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Create and manage study runs</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100"><code className="font-mono">results:read</code></p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Read and retrieve study results</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100"><code className="font-mono">chat:write</code></p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Chat with and ask questions about results</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Key Rotation & Revocation</h2>

        <div className="mt-4 space-y-4">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Rotating Keys</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              To rotate API keys securely:
            </p>
            <ol className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><strong>1.</strong> Create a new API key from the settings page.</li>
              <li><strong>2.</strong> Update your application to use the new key.</li>
              <li><strong>3.</strong> Test the new key to ensure it works.</li>
              <li><strong>4.</strong> Return to settings and revoke the old key.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Revoking Keys</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              If a key is compromised or no longer needed, revoke it immediately from the API Keys settings page. Revoked keys cannot be reactivated—you must generate a new key if needed.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Best Practices</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Store securely:</strong> Use environment variables, secrets management systems (AWS Secrets Manager, HashiCorp Vault), or cloud provider secret stores.</li>
          <li><strong>Rotate regularly:</strong> Rotate API keys quarterly or whenever a team member leaves.</li>
          <li><strong>Use HTTPS:</strong> Always use HTTPS for API requests to protect keys in transit.</li>
          <li><strong>Limit scope:</strong> Create keys with minimal necessary permissions using access scopes.</li>
          <li><strong>Monitor usage:</strong> Check the API Keys page for unexplained activity or new keys you didn't create.</li>
          <li><strong>Revoke immediately:</strong> If a key is accidentally committed to version control, revoke it immediately.</li>
          <li><strong>Use descriptive names:</strong> Name your keys by their purpose (e.g., "Production Agent", "Testing") to track usage.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Error Handling</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Common authentication errors:
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">401 Unauthorized</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Missing or invalid API key. Verify the Authorization header is present and correctly formatted.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">403 Forbidden</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">API key lacks required scope for the requested action. Check your key's permissions.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">429 Too Many Requests</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Rate limit exceeded. Wait before retrying. Check X-RateLimit headers for details.</p>
          </div>
        </div>
      </div>

      <RelatedAgentLinks />
    </div>
  );
}
