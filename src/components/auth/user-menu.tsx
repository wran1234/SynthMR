"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, CreditCard, LogOut, User } from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  user: { name?: string | null; email?: string | null; image?: string | null };
};

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
      router.refresh();
    }
  }

  const displayName = user.name ?? user.email ?? "User";

  return (
    <Dropdown>
      <DropdownTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors",
          "hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
        )}
      >
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-600"
            width={32}
            height={32}
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200">
            <User className="h-4 w-4" />
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">
          {displayName}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
      </DropdownTrigger>
      <DropdownContent align="right" className="min-w-[200px]">
        <DropdownItem href="/account" className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          Account
        </DropdownItem>
        <DropdownItem href="#" className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <CreditCard className="h-4 w-4" />
          Billing
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">Soon</span>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-700 dark:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
