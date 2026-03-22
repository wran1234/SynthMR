"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function Dropdown({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback(
    (v: boolean) => {
      onOpenChange?.(v);
      if (controlledOpen === undefined) setInternalOpen(v);
    },
    [controlledOpen, onOpenChange]
  );
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
  asChild,
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) return null;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    ctx.setOpen(!ctx.open);
  };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; className?: string }>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
        handleClick(e);
      },
      className: cn((children as React.ReactElement<{ className?: string }>).props.className, className),
    });
  }
  return (
    <button type="button" onClick={handleClick} className={cn("outline-none", className)} aria-expanded={ctx.open}>
      {children}
    </button>
  );
}

export function DropdownContent({
  children,
  className,
  align = "right",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  const ctx = React.useContext(DropdownContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const dropdownCtx = ctx;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) dropdownCtx.setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ctx?.open, ctx]);

  if (!ctx?.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  children,
  className,
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const ctx = React.useContext(DropdownContext);
  const close = () => ctx?.setOpen(false);
  const handleClick = () => {
    onClick?.();
    close();
  };
  if (href) {
    return (
      <a
        href={href}
        className={cn(
          "block w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
          className
        )}
        onClick={close}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cn(
        "block w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-slate-200 dark:border-slate-700" />;
}
