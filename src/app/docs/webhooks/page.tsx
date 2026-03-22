import { RelatedAgentLinks } from "@/components/docs/related-links";
import { DOCS_LAST_UPDATED, publicMetadata } from "@/lib/public-site";

export const metadata = publicMetadata(
  "Webhooks Documentation | SynthMR",
  "Webhook documentation for SynthMR AI market research API, including run.completed and run.failed events, retries, and signature verification.",
  "/docs/webhooks",
  [
    "AI market research API",
    "webhook support",
    "agent market validation API",
    "market research for AI agents",
  ]
);

export default function WebhooksDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Webhook Integration Documentation</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          SynthMR supports signed webhooks so agent frameworks can consume run lifecycle updates without tight polling loops. Webhooks enable real-time notifications when market research studies complete or fail, allowing seamless integration into automated workflows.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: {DOCS_LAST_UPDATED}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Webhook Overview</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Configure your webhook endpoint URL in your dashboard settings. SynthMR will POST events to this URL when significant state changes occur. Each event includes a cryptographic signature you can verify to ensure the webhook came from SynthMR.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Events</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">SynthMR currently supports the following webhook events:</p>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100"><code className="text-sm font-mono text-slate-700 dark:text-slate-300">run.completed</code></p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Triggered when a market research run finishes successfully and results are ready for retrieval.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100"><code className="text-sm font-mono text-slate-700 dark:text-slate-300">run.failed</code></p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Triggered when a run fails due to an error or system issue. The payload includes error details.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payload Structure</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">All webhooks follow this JSON structure:</p>
        <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`{
  "event": "run.completed" | "run.failed",
  "data": {
    "runId": "string",
    "studyId": "string",
    "status": "completed" | "failed",
    "finishedAt": "ISO 8601 timestamp",
    "error": "error message (only for run.failed)"
  }
}`}</code>
        </pre>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><strong>Example run.completed event:</strong></p>
        <pre className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`{
  "event": "run.completed",
  "data": {
    "runId": "run_abc123",
    "studyId": "study_xyz789",
    "status": "completed",
    "finishedAt": "2026-03-10T15:30:45Z"
  }
}`}</code>
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Signature Verification</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Each webhook request includes an <code className="text-sm font-mono text-slate-700 dark:text-slate-300">X-SynthMR-Signature</code> header containing an HMAC SHA-256 signature. Verify this signature to ensure the webhook came from SynthMR and has not been tampered with.
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">The signature is computed as: <code className="text-sm font-mono text-slate-700 dark:text-slate-300">sha256(webhook_secret + request_body)</code> and provided in hexadecimal format.</p>

        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Node.js Verification Example</p>
        <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono dark:border-slate-700 dark:bg-slate-900">
          <code>{`const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler:
const signature = req.headers['x-synthmr-signature'];
const bodyString = JSON.stringify(req.body);
const secret = process.env.WEBHOOK_SECRET;

if (verifyWebhookSignature(bodyString, signature, secret)) {
  // Process webhook
  console.log('Webhook verified:', req.body);
} else {
  // Reject webhook
  res.status(401).json({ error: 'Invalid signature' });
}`}</code>
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Retry Policy</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          If your webhook endpoint does not respond with a 2xx status code, SynthMR will retry delivery up to 3 times using exponential backoff:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Attempt 1:</strong> Immediate delivery</li>
          <li><strong>Attempt 2:</strong> Retry after 5 seconds</li>
          <li><strong>Attempt 3:</strong> Retry after 25 seconds</li>
        </ul>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          If all retries fail, the webhook is marked as failed. We recommend responding with 2xx status codes as quickly as possible and processing the webhook asynchronously to avoid timeout issues.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Best Practices</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Always verify signatures:</strong> Never process webhooks without verifying the signature first.</li>
          <li><strong>Respond quickly:</strong> Return a 2xx status code immediately without processing. Use async jobs to handle the actual work.</li>
          <li><strong>Handle duplicates:</strong> Webhooks may be delivered more than once. Use the <code className="text-sm font-mono text-slate-700 dark:text-slate-300">runId</code> to deduplicate.</li>
          <li><strong>Monitor failures:</strong> Track failed webhook deliveries in your logs and dashboard to catch integration issues early.</li>
          <li><strong>Use HTTPS:</strong> Always configure your webhook endpoint with HTTPS to protect sensitive data in transit.</li>
        </ul>
      </div>

      <RelatedAgentLinks />
    </div>
  );
}

