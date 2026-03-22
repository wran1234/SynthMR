"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SegmentDetail = {
  id: string;
  name: string;
  sizeEstimate: number;
  purchaseProbabilityByPrice: Record<string, number>;
  topObjections: string[];
  recommendedMessaging: string;
  topSoulThemes?: string[];
  rules?: { ageBucket?: string; incomeQ?: number; painPoint?: string; channel?: string };
};

export function SegmentDetailsPanel({
  segment,
  isPrimary,
  className,
}: {
  segment: SegmentDetail | null;
  isPrimary?: boolean;
  className?: string;
}) {
  if (!segment) {
    return (
      <Card className={cn("sticky top-24", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a segment to view details.</p>
        </CardContent>
      </Card>
    );
  }

  const painPoint = segment.rules?.painPoint ?? segment.name.split(",").find((s) => s.trim().includes("_"))?.trim();
  const channel = segment.rules?.channel ?? segment.name.split(",").pop()?.trim();

  return (
    <Card className={cn("sticky top-24", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {isPrimary && <Badge variant="default" className="text-xs">Primary</Badge>}
          {painPoint && (
            <Badge variant="outline" className="text-xs capitalize dark:border-slate-600">
              {painPoint.replace(/_/g, " ")}
            </Badge>
          )}
          {channel && (
            <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-200">
              {channel}
            </span>
          )}
        </div>
        <CardTitle className="text-base font-semibold dark:text-slate-100">{segment.name}</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Est. size {segment.sizeEstimate.toLocaleString()} · {(segment.sizeEstimate / 1_000_000 * 100).toFixed(2)}% of population
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 text-sm">
        <div>
          <p className="mb-1 font-medium text-slate-800 dark:text-slate-200">Purchase probability by price</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(segment.purchaseProbabilityByPrice).map(([price, prob]) => (
              <span key={price} className="rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">
                {price}: {Math.round(prob * 100)}%
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 font-medium text-slate-800 dark:text-slate-200">Recommended messaging</p>
          <p className="text-slate-700 dark:text-slate-300">{segment.recommendedMessaging}</p>
        </div>
        {segment.topObjections?.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-slate-800 dark:text-slate-200">Objections</p>
            <ul className="list-inside list-disc space-y-0.5 text-slate-700 dark:text-slate-300">
              {segment.topObjections.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {(segment.topSoulThemes?.length ?? 0) > 0 && (
          <div>
            <p className="mb-1 font-medium text-slate-800 dark:text-slate-200">Soul themes</p>
            <div className="flex flex-wrap gap-1">
              {segment.topSoulThemes!.slice(0, 6).map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs dark:bg-slate-600 dark:text-slate-200">
                  {t.slice(0, 36)}{t.length > 36 ? "…" : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
