"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";

type Study = {
  id: string;
  ideaText: string;
  geography: string;
  industry: string | null;
  status: string;
  createdAt: string;
  targetAudienceJson?: { label: string } | null;
  runs: Array<{
    id: string;
    status: string;
    sampleSize: number;
    populationMode?: string;
    populationSize?: number | null;
    audienceLabel?: string | null;
  }>;
};

export default function StudiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (sort === "oldest") params.set("sort", "oldest");
    if (statusFilter) params.set("status", statusFilter);
    const q = params.toString();
    fetch(`/api/studies${q ? `?${q}` : ""}`)
      .then((r) => r.json())
      .then((data) => setStudies(Array.isArray(data) ? data : []))
      .catch(() => setStudies([]))
      .finally(() => setLoading(false));
  }, [search, sort, statusFilter]);

  function updateUrl() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (sort === "oldest") params.set("sort", "oldest");
    if (statusFilter) params.set("status", statusFilter);
    const q = params.toString();
    router.replace(q ? `/studies?${q}` : "/studies", { scroll: false });
  }

  const title = (s: Study) => s.ideaText.split(/\s+/).slice(0, 6).join(" ") + (s.ideaText.split(/\s+/).length > 6 ? "…" : "");
  const lastRun = (s: Study) => s.runs?.[0];
  const statusBadge = (s: Study) => {
    const run = lastRun(s);
    const st = run?.status ?? s.status;
    if (st === "completed") return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</Badge>;
    if (st === "failed") return <Badge variant="destructive">Failed</Badge>;
    if (st === "limit_reached") return <Badge variant="secondary">Partial</Badge>;
    if (["pending", "generating_population", "sampling", "surveying", "aggregating", "running"].includes(st)) return <Badge variant="secondary">Running</Badge>;
    return <Badge variant="outline">{s.status}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">Studies</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create and manage synthetic market research studies.</p>
        </div>
        <Link href="/studies/new">
          <Button className="shadow-sm transition-opacity hover:opacity-95">
            <Plus className="h-4 w-4" />
            New Study
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by idea text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={updateUrl}
            onKeyDown={(e) => e.key === "Enter" && updateUrl()}
            className="pl-9"
          />
        </div>
        <Select value={sort} onChange={(e) => { setSort(e.target.value); updateUrl(); }} className="w-40">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); updateUrl(); }} className="w-40">
          <option value="">All statuses</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900/50">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="mt-2 h-4 w-1/4 rounded" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : !Array.isArray(studies) || studies.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || statusFilter ? "No studies match your filters" : "No studies yet"}
          description={search || statusFilter ? "Try different search or filters." : "Create your first study to run synthetic market research."}
          action={
            <Link href="/studies/new">
              <Button><Plus className="h-4 w-4" /> New Study</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Array.isArray(studies) ? studies : []).map((s) => {
            const run = lastRun(s);
            return (
              <Link key={s.id} href={`/studies/${s.id}`}>
                <Card className="card-elevated h-full border-slate-200/80 transition-shadow duration-200 dark:border-slate-700/80">
                  <CardContent className="p-5">
                    <p className="font-medium leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">{title(s)}</p>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {statusBadge(s)}
                      {s.targetAudienceJson?.label && s.targetAudienceJson.label.toLowerCase() !== "general population" && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {s.targetAudienceJson.label}
                        </Badge>
                      )}
                      {run && (
                        <>
                          <Badge variant="outline">
                            {run.populationMode === "audience_specific" ? "Audience" : "General"}
                            {run.populationSize != null ? ` ${(run.populationSize / 1000).toFixed(0)}k` : ""}
                          </Badge>
                          <span className="text-xs text-slate-500">n={run.sampleSize}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
