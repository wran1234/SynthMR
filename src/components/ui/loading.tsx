import { Skeleton } from "@/components/skeleton";

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}
