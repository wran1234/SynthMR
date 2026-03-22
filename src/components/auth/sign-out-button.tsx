"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
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

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className="w-full sm:w-auto"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
