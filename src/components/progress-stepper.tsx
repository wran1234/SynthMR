"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

const STEPS = [
  "pending",
  "generating_population",
  "sampling",
  "surveying",
  "aggregating",
  "completed",
] as const;

const STEP_LABELS: Record<string, string> = {
  pending: "Queued",
  generating_population: "Generating population",
  sampling: "Sampling",
  surveying: "Surveying",
  aggregating: "Aggregating",
  completed: "Completed",
};

export function ProgressStepper({ current, failed }: { current: string; failed?: boolean }) {
  const isPartial = current === "limit_reached";
  const effectiveCurrent = isPartial ? "completed" : current;
  const idx = STEPS.indexOf(effectiveCurrent as (typeof STEPS)[number]);
  const currentIndex = idx >= 0 ? idx : 0;

  return (
    <nav aria-label="Progress" className="flex items-center gap-1 overflow-x-auto py-2">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex || effectiveCurrent === "completed";
        const isCurrent = step === effectiveCurrent && !failed && !isPartial;
        const isFailed = failed && step === effectiveCurrent;
        return (
          <div key={step} className="flex flex-1 min-w-0 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone && "border-emerald-500 bg-emerald-500 text-white",
                  isCurrent && "border-indigo-500 bg-indigo-50 text-indigo-600",
                  isFailed && "border-red-500 bg-red-50 text-red-600",
                  !isDone && !isCurrent && !isFailed && "border-slate-200 bg-white"
                )}
              >
                {isDone && step !== "completed" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step === "completed" && isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-center text-xs font-medium",
                  isCurrent && "text-indigo-600 dark:text-indigo-400",
                  isFailed && "text-red-600 dark:text-red-400",
                  isDone && !isCurrent && "text-slate-500 dark:text-slate-400",
                  !isDone && !isCurrent && !isFailed && "text-slate-400 dark:text-slate-500"
                )}
              >
                {step === "completed" && isDone && isPartial ? "Partial" : STEP_LABELS[step] ?? step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 flex-1 min-w-[12px] rounded",
                  i < currentIndex ? "bg-emerald-500" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
