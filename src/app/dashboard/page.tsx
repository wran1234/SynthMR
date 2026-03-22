import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Sparkles, TrendingUp, Zap } from "lucide-react";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  // Session validated — userId available for queries below

  const userId = user.id;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [studies, runCounts, monthlyUsage] = await Promise.all([
    prisma.study.findMany({
      where: { userId },
      include: { runs: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.studyRun.groupBy({
      by: ["status"],
      where: { study: { userId } },
      _count: true,
    }),
    prisma.studyRun.aggregate({
      where: {
        study: { userId },
        createdAt: { gte: monthStart },
      },
      _sum: { llmTokensUsed: true, llmCostCents: true },
      _count: true,
    }),
  ]);

  const totalStudies = await prisma.study.count({ where: { userId } });
  const totalRuns = runCounts.reduce((s, r) => s + r._count, 0);
  const completedRuns = runCounts.find((r) => r.status === "completed")?._count ?? 0;
  const partialRuns = runCounts.find((r) => r.status === "limit_reached")?._count ?? 0;
  const successRate = totalRuns > 0 ? Math.round(((completedRuns + partialRuns) / totalRuns) * 100) : 0;

  const aggregates = await prisma.aggregate.findMany({
    where: { studyRun: { study: { userId } } },
    select: { results: true },
  });

  const monthlyTokens = monthlyUsage._sum.llmTokensUsed ?? 0;
  const monthlyCostCents = monthlyUsage._sum.llmCostCents ?? 0;
  const monthlyRuns = monthlyUsage._count ?? 0;

  let avgPurchaseProb: number | null = null;
  const probs: number[] = [];
  for (const a of aggregates) {
    const res = a.results as { wtpCurve?: Array<{ probability: number }> } | null;
    if (res?.wtpCurve?.length) {
      const max = Math.max(...res.wtpCurve.map((p) => p.probability));
      probs.push(max);
    }
  }
  if (probs.length > 0) {
    avgPurchaseProb = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 100);
  }

  const recentStudies = studies.slice(0, 10);

  function studyTitle(s: { ideaText: string }) {
    return s.ideaText.split(/\s+/).slice(0, 6).join(" ") + (s.ideaText.split(/\s+/).length > 6 ? "…" : "");
  }

  function lastRunDate(s: (typeof recentStudies)[0]) {
    const run = s.runs?.[0];
    if (!run?.finishedAt && !run?.startedAt) return "—";
    const d = run.finishedAt ?? run.startedAt;
    return d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";
  }

  function studyStatus(s: (typeof recentStudies)[0]) {
    const run = s.runs?.[0];
    const st = run?.status ?? s.status;
    if (st === "completed") return "Completed";
    if (st === "limit_reached") return "Partial";
    if (st === "failed") return "Failed";
    if (["pending", "generating_population", "sampling", "surveying", "aggregating", "running"].includes(st)) return "Running";
    return st;
  }

  return (
    <div className="space-y-10">
      {/* Page header + primary CTA */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display">Dashboard</h1>
          <p className="mt-1 text-body-muted">Your research workspace at a glance.</p>
        </div>
        <Link href="/studies/new" className="shrink-0">
          <Button className="btn-primary h-11 gap-2 px-6 text-sm font-semibold shadow-md">
            <Sparkles className="h-4 w-4" />
            New Study
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Studies run</CardTitle>
            <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="stat-value">{totalStudies}</p>
          </CardContent>
        </Card>
        <Card className="card-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total runs</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="stat-value">{totalRuns}</p>
          </CardContent>
        </Card>
        <Card className="card-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Success rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value">{successRate}%</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {completedRuns} completed, {partialRuns} partial
            </p>
          </CardContent>
        </Card>
        <Card className="card-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Usage this month</CardTitle>
            <Zap className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="stat-value">{monthlyRuns} {monthlyRuns === 1 ? "run" : "runs"}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {monthlyTokens > 0
                ? `${(monthlyTokens / 1000).toFixed(1)}k tokens · $${(monthlyCostCents / 100).toFixed(2)}`
                : "No token usage yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent studies table */}
      <Card className="card-panel">
        <CardHeader className="pb-4">
          <CardTitle className="text-section-title">Recent studies</CardTitle>
          <CardDescription>Create a new study or open one to view runs and results.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentStudies.length === 0 ? (
            <div className="empty-state">
              <FileText className="h-10 w-10 text-slate-400 dark:text-slate-500" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">Create your first study</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Run synthetic market research on your business idea.
              </p>
              <Link href="/studies/new" className="mt-5">
                <Button className="btn-primary gap-2">
                  <Sparkles className="h-4 w-4" />
                  New Study
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Last run</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentStudies.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/studies/${s.id}`}
                            className="font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                          >
                            {studyTitle(s)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              studyStatus(s) === "Completed"
                                ? "default"
                                : studyStatus(s) === "Failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs font-medium"
                          >
                            {studyStatus(s)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{lastRunDate(s)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/studies/${s.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href="/studies"
                className="mt-4 inline-flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                View all studies →
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
