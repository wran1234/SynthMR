import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";

async function getHealth() {
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    const data = await res.json();
    return { ok: res.ok, ...data };
  } catch {
    return { ok: false, database: "error", redis: "error", worker: "unknown", queueLength: 0 };
  }
}

export default async function StatusPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/status");

  const health = await getHealth();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        ← Dashboard
      </Link>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">System status</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current health of SynthMR services.</p>

        <dl className="mt-6 space-y-4">
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Overall</dt>
            <dd>
              <span className={health.ok ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                {health.ok ? "Healthy" : "Degraded"}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Database</dt>
            <dd className={health.database === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {health.database === "ok" ? "Online" : "Error"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Redis</dt>
            <dd className={health.redis === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {health.redis === "ok" ? "Online" : "Error"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Worker</dt>
            <dd className={health.worker === "ok" ? "text-green-600 dark:text-green-400" : health.worker === "offline" ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}>
              {health.worker === "ok" ? "Online" : health.worker === "offline" ? "Offline" : "Unknown"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Queue length</dt>
            <dd className="text-slate-700 dark:text-slate-300">{health.queueLength ?? 0}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
