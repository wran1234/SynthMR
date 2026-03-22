"use client";

import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { UserMenu } from "./user-menu";

type NavAuthProps = {
  user: SessionUser | null;
};

export function NavAuth({ user }: NavAuthProps) {
  if (user) {
    return <UserMenu user={user} />;
  }
  return (
    <Link href="/login">
      <span className="rounded-2xl border border-slate-200 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
        Login
      </span>
    </Link>
  );
}
