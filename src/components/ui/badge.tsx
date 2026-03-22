import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
        variant === "default" && "bg-indigo-100 text-indigo-800",
        variant === "secondary" && "bg-slate-100 text-slate-700",
        variant === "outline" && "border border-slate-200 text-slate-700",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "destructive" && "bg-red-100 text-red-800",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
