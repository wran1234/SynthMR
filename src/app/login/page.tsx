"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSafeCallbackUrl } from "@/lib/safe-callback-url";

const CSRF_HEADER_NAME = "x-csrf-token";

type Tab = "login" | "register";

const MIN_PASSWORD_LENGTH = 10;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") ?? "/dashboard";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = baseUrl ? getSafeCallbackUrl(rawCallback, baseUrl) : "/dashboard";
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(tabParam === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfReady, setCsrfReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCsrfToken(data.token ?? null);
        setCsrfReady(true);
      })
      .catch(() => setCsrfReady(true));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      toast.error("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        toast.error(data.error ?? "Login failed");
        return;
      }
      toast.success("Signed in");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong");
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      toast.error("Enter email and password");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        toast.error(data.error ?? "Registration failed");
        return;
      }
      toast.success("Account created");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong");
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to SynthMR</CardTitle>
          <CardDescription>Create and run synthetic market research studies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === "login" ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === "register" ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}
            >
              Register
            </button>
          </div>

          {csrfReady && !csrfToken && (
            <p className="text-sm text-amber-700 dark:text-amber-300">Could not load security token. Refresh the page and try again.</p>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" disabled={loading || !csrfToken} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-name">Name (optional)</Label>
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password (min {MIN_PASSWORD_LENGTH} characters)</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={loading || !csrfToken} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
