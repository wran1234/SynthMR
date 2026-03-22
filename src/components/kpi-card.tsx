"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "./ui/card";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, className }: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
