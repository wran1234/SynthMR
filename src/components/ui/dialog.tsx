"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
};

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void; title?: string }
>(({ className, children, onClose, title, ...props }, ref) => (
  <div
    ref={ref}
    role="dialog"
    aria-modal="true"
    className={cn(
      "relative z-50 grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-0 shadow-xl",
      className
    )}
    onClick={(e) => e.stopPropagation()}
    {...props}
  >
    {(title || onClose) && (
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto -mr-2">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )}
    {children}
  </div>
));

DialogContent.displayName = "DialogContent";

export { Dialog, DialogContent };
