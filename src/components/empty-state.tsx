"use client";

import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "empty-state",
        "flex flex-col items-center justify-center py-12 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30",
        className
      )}
    >
      <div className="rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
