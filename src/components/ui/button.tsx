import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          variant === "default" && "bg-indigo-600 text-white shadow-soft hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md dark:bg-indigo-500 dark:hover:bg-indigo-600",
          variant === "secondary" && "bg-slate-100 text-slate-900 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-soft dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600",
          variant === "outline" && "border border-slate-200 bg-transparent hover:border-slate-300 hover:bg-slate-50 hover:shadow-soft dark:border-slate-600 dark:hover:bg-slate-700",
          variant === "ghost" && "hover:bg-slate-100 dark:hover:bg-slate-800",
          variant === "destructive" && "bg-red-600 text-white shadow-soft hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md dark:bg-red-700 dark:hover:bg-red-600",
          size === "sm" && "h-8 px-3 text-sm",
          size === "default" && "h-10 px-4 py-2 text-sm",
          size === "lg" && "h-11 px-6 text-base",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
