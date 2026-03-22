"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorFallback]", error?.message ?? error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50/50 p-8 dark:border-red-800 dark:bg-red-950/20">
      <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
      <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Something went wrong</h2>
      <p className="text-center text-sm text-red-700 dark:text-red-300 max-w-md">
        {error?.message ?? "An unexpected error occurred."}
      </p>
      <Button variant="outline" onClick={reset} className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/30">
        Try again
      </Button>
    </div>
  );
}
