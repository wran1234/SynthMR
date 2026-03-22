"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ui/error";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[App Error]", error?.message ?? error);
  }, [error]);

  return <ErrorFallback error={error} reset={reset} />;
}
