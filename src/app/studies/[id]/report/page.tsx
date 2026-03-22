"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";

type Study = {
  id: string;
  ideaText: string;
  geography: string;
  industry: string | null;
  pricePoints: number[];
  targetAudienceJson?: { label: string } | null;
  createdAt: string;
  runs: Array<{ id: string; sampleSize: number }>;
};

type AggregateResults = {
  wtpCurve: Array<{ price: number; probability: number; count: number }>;
  metadata?: {
    targetAudience?: string | null;
    filteredPoolSize?: number | null;
    populationMode?: string;
    populationSize?: number;
  };
  segments: Array<{
    name: string;
    sizeEstimate: number;
    purchaseProbabilityByPrice: Record<string, number>;
    topObjections: string[];
    recommendedMessaging: string;
    topSoulThemes?: string[];
  }>;
  topObjections: string[];
  nextExperiments: string[];
};

export default function ReportPage() {
  const params = useParams();
  const studyId = params.id as string;
  const [study, setStudy] = useState<Study | null>(null);
  const [results, setResults] = useState<AggregateResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studyId) return;
    fetch(`/api/studies/${studyId}`)
      .then((r) => r.json())
      .then((data) => {
        setStudy(data);
        const run = data?.runs?.[0];
        if (run?.id) {
          return fetch(`/api/studies/${studyId}/results/${run.id}`).then((res) => (res.ok ? res.json() : null));
        }
        return null;
      })
      .then((data) => setResults(data ?? null))
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [studyId]);

  const run = study?.runs?.[0];
  const createdDate = study?.createdAt ? new Date(study.createdAt).toLocaleDateString(undefined, { dateStyle: "long" }) : "";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  if (!study) {
    return (
      <EmptyState
        icon={FileText}
        title="Study not found"
        description="This report is not available. The study may have been deleted."
        action={
          <Link href="/dashboard">
            <Button>New Study</Button>
          </Link>
        }
      />
    );
  }

  if (!results) {
    return (
      <EmptyState
        icon={FileText}
        title="No results yet"
        description="Run the study and wait for it to complete to generate a report."
        action={
          <Link href={`/studies/${studyId}`}>
            <Button>Back to study</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/studies/${studyId}`}
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to study
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card dark:border-slate-700 dark:bg-slate-800 print:border print:shadow-none">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          SynthMR Research Report
        </h1>
        <p className="mt-2 text-slate-700 dark:text-slate-300">{study.ideaText}</p>
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <dt className="text-slate-500 dark:text-slate-400">Geography</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{study.geography}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Industry</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{study.industry ?? "—"}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Date</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{createdDate}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Sample size</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{run?.sampleSize ?? "—"} personas</dd>
          {(results.metadata?.populationMode || results.metadata?.populationSize != null) && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Population</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {results.metadata?.populationMode === "audience_specific" ? "Audience-specific" : "General"}
                {results.metadata?.populationSize != null ? ` (${(results.metadata.populationSize / 1000).toFixed(0)}k)` : ""}
              </dd>
            </>
          )}
          {(results.metadata?.targetAudience ?? study.targetAudienceJson?.label) &&
            (results.metadata?.targetAudience ?? study.targetAudienceJson?.label)?.toLowerCase() !== "general population" && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Target audience</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">
                  {results.metadata?.targetAudience ?? study.targetAudienceJson?.label}
                  {results.metadata?.filteredPoolSize != null &&
                    ` (filtered pool: ${(results.metadata.filteredPoolSize / 1000).toFixed(0)}k)`}
                </dd>
              </>
            )}
        </dl>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Willingness to pay</h2>
          <table className="mt-2 w-full table-auto text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600">
                <th className="pb-2 text-left font-medium text-slate-700 dark:text-slate-300">Price</th>
                <th className="pb-2 text-right font-medium text-slate-700 dark:text-slate-300">Purchase probability</th>
              </tr>
            </thead>
            <tbody>
              {results.wtpCurve?.map((row) => (
                <tr key={row.price} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="py-2 text-slate-900 dark:text-slate-100">${row.price}</td>
                  <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                    {Math.round(row.probability * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Top 5 segments</h2>
          <ul className="mt-2 space-y-4">
            {results.segments?.slice(0, 5).map((seg, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-600">
                <p className="font-medium text-slate-900 dark:text-slate-100">{seg.name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Est. size {seg.sizeEstimate.toLocaleString()} · {Object.entries(seg.purchaseProbabilityByPrice).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(", ")}
                </p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{seg.recommendedMessaging}</p>
                {seg.topSoulThemes?.length ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Soul themes: {seg.topSoulThemes.slice(0, 3).join("; ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Key objections</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {results.topObjections?.slice(0, 10).map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Next experiments</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {results.nextExperiments?.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-xs text-slate-500 dark:text-slate-400">
          Generated by SynthMR · Synthetic research—validate with real users.
        </p>
      </article>
    </div>
  );
}
