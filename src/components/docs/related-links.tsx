import Link from "next/link";

export function RelatedAgentLinks() {
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
      <p className="font-semibold text-slate-900 dark:text-slate-100">Related links</p>
      <ul className="mt-2 space-y-1 text-slate-700 dark:text-slate-300">
        <li><Link href="/api/openapi.json" className="underline">/api/openapi.json</Link></li>
        <li><Link href="/api/tools/manifest" className="underline">/api/tools/manifest</Link></li>
        <li><Link href="/ai-tools" className="underline">/ai-tools</Link></li>
        <li><Link href="/agents" className="underline">/agents</Link></li>
        <li><Link href="/agents/examples" className="underline">/agents/examples</Link></li>
      </ul>
    </div>
  );
}

