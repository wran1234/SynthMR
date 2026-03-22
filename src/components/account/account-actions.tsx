"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, KeyRound, Trash2, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import { API_SCOPE_PRESETS } from "@/lib/api-key";

export function ExportDataButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? "synthmr-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported", { description: "Your download has started." });
    } catch {
      toast.error("Export failed", { description: "Could not export your data." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Exporting…" : "Export My Data"}
    </Button>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      toast.success("Account deleted");
      router.push("/");
      window.location.href = "/";
    } catch (e) {
      toast.error("Could not delete account", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/50" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete my account
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="Delete account" onClose={() => setConfirmOpen(false)}>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Permanently delete your account and all your data (studies, runs, presets)? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete my account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const DEFAULT_EVENTS = ["run.completed", "run.failed"];

export function ApiKeysPanel() {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keys, setKeys] = useState<
    Array<{
      id: string;
      name: string;
      keyPrefix: string;
      scopes: string[];
      createdAt: string;
      lastUsedAt: string | null;
      revokedAt: string | null;
    }>
  >([]);
  const [name, setName] = useState("Agent Key");
  const [scopePreset, setScopePreset] = useState<keyof typeof API_SCOPE_PRESETS>("Full agent access");
  const [newKey, setNewKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/api-keys");
      const data = await res.json();
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Agent Key",
          scopes: API_SCOPE_PRESETS[scopePreset],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create key");
      setNewKey(data.key ?? null);
      if (data.key) localStorage.setItem("synthmr_last_api_key", data.key);
      toast.success("API key created");
      await load();
    } catch (e) {
      toast.error("Failed to create API key", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("API key revoked");
      await load();
    } catch {
      toast.error("Failed to revoke API key");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div id="api-keys-panel" className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <KeyRound className="h-4 w-4" />
        API Keys
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        API keys authenticate agent calls to `/api/v1/*`. Key values are shown once.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Docs:{" "}
        <Link href="/agents" className="underline">
          Agent Quickstart
        </Link>
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="Key name"
        />
        <select
          value={scopePreset}
          onChange={(e) => setScopePreset(e.target.value as keyof typeof API_SCOPE_PRESETS)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          {Object.keys(API_SCOPE_PRESETS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={create} disabled={creating}>
          {creating ? "Creating…" : "Create key"}
        </Button>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
        Scopes for <span className="font-medium">{scopePreset}</span>: {API_SCOPE_PRESETS[scopePreset].join(", ")}
      </div>
      {newKey && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="font-semibold">Copy this key now (shown once):</p>
          <code className="block break-all pt-1">{newKey}</code>
        </div>
      )}
      <div className="space-y-2">
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-slate-500">No API keys yet.</p>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {k.name} <span className="text-slate-400">({k.keyPrefix}…)</span>
                </p>
                <p className="text-slate-500">Created {new Date(k.createdAt).toLocaleString()}</p>
                <p className="text-slate-500">Scopes: {k.scopes.join(", ")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => revoke(k.id)} disabled={!!k.revokedAt}>
                {k.revokedAt ? "Revoked" : "Revoke"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function WebhooksPanel() {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [endpoints, setEndpoints] = useState<
    Array<{ id: string; url: string; events: string[]; createdAt: string; revokedAt: string | null }>
  >([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/webhooks");
      const data = await res.json();
      setEndpoints(Array.isArray(data.endpoints) ? data.endpoints : []);
    } catch {
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!url.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/account/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events: DEFAULT_EVENTS }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create webhook");
      setNewSecret(data.secret ?? null);
      setUrl("");
      toast.success("Webhook endpoint created");
      await load();
    } catch (e) {
      toast.error("Failed to create webhook", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/account/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Webhook revoked");
      await load();
    } catch {
      toast.error("Failed to revoke webhook");
    }
  }

  async function sendTest(id: string) {
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Test failed");
      toast.success("Test webhook sent");
    } catch (e) {
      toast.error("Webhook test failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Webhook className="h-4 w-4" />
        Webhooks
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Events: <code>run.completed</code>, <code>run.failed</code>.
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="https://your-agent.example/webhooks/synthmr"
        />
        <Button size="sm" onClick={create} disabled={creating}>
          {creating ? "Creating…" : "Add webhook"}
        </Button>
      </div>
      {newSecret && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Signing secret (shown once):</p>
          <code className="block break-all pt-1">{newSecret}</code>
        </div>
      )}
      <div className="space-y-2">
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : endpoints.length === 0 ? (
          <p className="text-xs text-slate-500">No webhook endpoints yet.</p>
        ) : (
          endpoints.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
              <div className="max-w-[75%]">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">{e.url}</p>
                <p className="text-slate-500">Events: {e.events.join(", ")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => sendTest(e.id)} disabled={!!e.revokedAt}>
                  Send test
                </Button>
                <Button size="sm" variant="outline" onClick={() => revoke(e.id)} disabled={!!e.revokedAt}>
                  {e.revokedAt ? "Revoked" : "Revoke"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
