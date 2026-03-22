"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  ArrowLeft,
  Copy,
  CopyPlus,
  DollarSign,
  FileText,
  MessageCircle,
  Send,
  Trash2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressStepper } from "@/components/progress-stepper";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { Select } from "@/components/ui/select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SegmentDetailsPanel } from "@/components/segment-details-panel";
import { cn } from "@/lib/utils";

type Study = {
  id: string;
  ideaText: string;
  geography: string;
  industry: string | null;
  pricePoints: number[];
  targetAudienceJson?: { label: string } | null;
  status: string;
  createdAt: string;
  runs: Array<{
    id: string;
    status: string;
    errorMessage: string | null;
    sampleSize: number;
    jobId: string | null;
    populationMode?: string;
    populationSize?: number | null;
    audienceLabel?: string | null;
    populationMethod?: string | null;
    populationVersion?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt: string;
  }>;
};

type JobStatus = {
  jobId: string;
  status: string;
  studyRunId: string;
  errorMessage?: string | null;
  progress?: number;
};

type SegmentType = {
  id: string;
  name: string;
  sizeEstimate: number;
  purchaseProbabilityByPrice: Record<string, number>;
  topObjections: string[];
  recommendedMessaging: string;
  topSoulThemes?: string[];
  rules?: { ageBucket?: string; incomeQ?: number; painPoint?: string; channel?: string };
};

type AggregateResults = {
  wtpCurve: Array<{ price: number; probability: number; count: number }>;
  segments: SegmentType[];
  topObjections: string[];
  nextExperiments: string[];
  metadata?: {
    targetAudience?: string | null;
    filteredPoolSize?: number | null;
    sampleSize?: number;
    populationMode?: string;
    populationSize?: number;
  };
};

const SUGGESTED_CHAT_QUESTIONS = [
  "What price point maximizes revenue?",
  "Summarize the top 3 objections and how to overcome each.",
  "Which segment should we target first and why?",
  "Draft a landing page headline for the top segment.",
  "What follow-up experiment should we run next?",
  "Compare the value seekers vs quality-first segments.",
  "What positioning would reduce the biggest objection?",
];

export default function StudyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studyId = params.id as string;
  const runId = searchParams.get("run");
  const jobIdParam = searchParams.get("jobId");

  const [study, setStudy] = useState<Study | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [results, setResults] = useState<AggregateResults | null>(null);
  const [resultsLoadError, setResultsLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runIdForResults, setRunIdForResults] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Array<{ personaId: string; soulVersion: number }>>([]);
  const [soulModal, setSoulModal] = useState<{ personaId: string; content: string; versions: number[] } | null>(null);
  const [soulVersion, setSoulVersion] = useState<number>(0);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [segmentDetailsOpen, setSegmentDetailsOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [liveUpdating, setLiveUpdating] = useState(false);
  const [deleteStudyConfirm, setDeleteStudyConfirm] = useState(false);
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [rerunRunId, setRerunRunId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: string; content: string; createdAt: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatContextWarning, setChatContextWarning] = useState<string | null>(null);
  const [chatStreamingText, setChatStreamingText] = useState("");

  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    fetch(`/api/studies/${studyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setStudy(data);
        if (!runId && data.runs?.[0]) {
          const firstRun = data.runs[0];
          if (firstRun.status === "completed" || firstRun.status === "limit_reached") fetchResults(firstRun.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [studyId, runId]);

  const jobIdToPoll = jobIdParam ?? study?.runs?.[0]?.jobId ?? null;
  const runIdToPoll = runId ?? study?.runs?.[0]?.id ?? null;

  useEffect(() => {
    if (!jobIdToPoll || !runIdToPoll || !studyId) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastProgress: number | undefined;
    let delayMs = 2000;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/jobs/${jobIdToPoll}`);
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          const retrySec = data.retryAfterSeconds ?? Number(res.headers.get("Retry-After")) ?? 60;
          delayMs = Math.max(4000, Math.min(60000, retrySec * 1000));
          setLiveUpdating(true);
          timeoutId = setTimeout(poll, delayMs);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setJobStatus({
          jobId: data.jobId ?? jobIdToPoll,
          status: data.status,
          studyRunId: data.studyRunId ?? runIdToPoll,
          errorMessage: data.errorMessage,
          progress: data.progress,
        });
        if (data.status === "completed" || data.status === "limit_reached") {
          setLiveUpdating(false);
          fetchResults(data.studyRunId ?? runIdToPoll);
          return;
        }
        if (data.status === "failed") {
          setLiveUpdating(false);
          return;
        }
        setLiveUpdating(true);
        const status = data.status as string;
        const progressStalled = data.progress != null && lastProgress != null && data.progress === lastProgress;
        lastProgress = data.progress;
        if (status === "aggregating" || progressStalled) {
          delayMs = 4000;
        } else if (["generating_population", "sampling", "surveying", "pending", "running"].includes(status)) {
          delayMs = 2000;
        }
        timeoutId = setTimeout(poll, delayMs);
      } catch {
        if (!cancelled) {
          timeoutId = setTimeout(poll, delayMs);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [studyId, jobIdToPoll, runIdToPoll]);

  function fetchResults(studyRunId: string) {
    fetch(`/api/studies/${studyId}/results/${studyRunId}`)
      .then(async (r) => {
        if (r.ok) return r.json();
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error ?? "Results are not available yet for this run.");
      })
      .then((data) => {
        setResultsLoadError(null);
        setResults(data);
        if (data) setRunIdForResults(studyRunId);
      })
      .catch((e: unknown) => {
        setResults(null);
        setRunIdForResults(studyRunId);
        setResultsLoadError(e instanceof Error ? e.message : "Results are not available yet for this run.");
      });
  }

  useEffect(() => {
    if (!runIdForResults || !studyId) return;
    fetch(`/api/studies/${studyId}/runs/${runIdForResults}/personas`)
      .then((r) => (r.ok ? r.json() : { personas: [] }))
      .then((data) => setPersonas(data.personas ?? []))
      .catch(() => setPersonas([]));
  }, [runIdForResults, studyId]);

  function openSoulModal(personaId: string, version: number = 0) {
    if (!runIdForResults || !studyId) return;
    fetch(`/api/studies/${studyId}/runs/${runIdForResults}/personas/soul?personaId=${encodeURIComponent(personaId)}&version=${version}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSoulModal({ personaId, content: data.content, versions: data.versions ?? [0] });
        setSoulVersion(version <= 0 ? (data?.version ?? 1) : version);
      })
      .catch(() => setSoulModal(null));
  }

  function changeSoulVersion(personaId: string, version: number) {
    if (!runIdForResults || !studyId) return;
    setSoulVersion(version);
    fetch(`/api/studies/${studyId}/runs/${runIdForResults}/personas/soul?personaId=${encodeURIComponent(personaId)}&version=${version}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSoulModal((prev) => (prev ? { ...prev, content: data.content } : null));
      })
      .catch(() => {});
  }

  async function retryRun(sampleSizeNum?: number) {
    if (!studyId || retrying) return;
    setRetrying(true);
    try {
      const runRes = await fetch(`/api/studies/${studyId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleSize: sampleSizeNum ?? study?.runs?.[0]?.sampleSize ?? 500 }),
      });
      if (!runRes.ok) throw new Error("Failed to start run");
      const { studyRunId, jobId } = await runRes.json();
      toast.success("Retry queued", { description: "A new run has been queued. Redirecting…" });
      window.location.href = `/studies/${studyId}?run=${studyRunId}&jobId=${jobId}`;
    } catch {
      toast.error("Retry failed", { description: "Could not start a new run." });
      setRetrying(false);
    }
  }

  async function handleDuplicate() {
    if (!studyId || duplicating) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to duplicate");
      const newStudy = await res.json();
      toast.success("Study duplicated", { description: "Redirecting to the new study." });
      router.push(`/studies/${newStudy.id}`);
    } catch {
      toast.error("Duplicate failed", { description: "Could not duplicate study." });
      setDuplicating(false);
    }
  }

  async function handleDeleteStudy() {
    if (!studyId) return;
    try {
      const res = await fetch(`/api/studies/${studyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Study deleted");
      router.push("/studies");
    } catch {
      toast.error("Delete failed", { description: "Could not delete study." });
    } finally {
      setDeleteStudyConfirm(false);
    }
  }

  async function handleDeleteRun(runIdToDelete: string) {
    try {
      const res = await fetch(`/api/studies/${studyId}/runs/${runIdToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete run");
      toast.success("Run deleted");
      setStudy((prev) => prev ? { ...prev, runs: prev.runs.filter((r) => r.id !== runIdToDelete) } : null);
      if (runIdForResults === runIdToDelete) {
        setResults(null);
        setRunIdForResults(null);
      }
    } catch {
      toast.error("Delete failed", { description: "Could not delete run." });
    } finally {
      setDeleteRunId(null);
    }
  }

  async function handleRerun(r: Study["runs"][0]) {
    if (rerunRunId || retrying) return;
    setRerunRunId(r.id);
    setRetrying(true);
    try {
      const body: { sampleSize: number; populationMode?: string; populationSize?: number } = { sampleSize: r.sampleSize };
      if (r.populationMode === "audience_specific") {
        body.populationMode = "audience_specific";
        if (r.populationSize != null) body.populationSize = r.populationSize;
      }
      const runRes = await fetch(`/api/studies/${studyId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!runRes.ok) throw new Error("Failed to start run");
      const { studyRunId, jobId } = await runRes.json();
      toast.success("Rerun queued", { description: "Redirecting…" });
      window.location.href = `/studies/${studyId}?run=${studyRunId}&jobId=${jobId}`;
    } catch {
      toast.error("Rerun failed", { description: "Could not start run." });
    } finally {
      setRerunRunId(null);
      setRetrying(false);
    }
  }

  function toggleSegment(id: string) {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if ((jobStatus?.status === "completed" || jobStatus?.status === "limit_reached") && jobStatus.studyRunId) {
      fetchResults(jobStatus.studyRunId);
    }
  }, [jobStatus?.status, jobStatus?.studyRunId, studyId]);

  useEffect(() => {
    if (results?.segments?.length && selectedSegmentId === null) {
      setSelectedSegmentId(results.segments[0].id);
    }
  }, [results?.segments, selectedSegmentId]);

  useEffect(() => {
    if (!studyId || !runIdForResults) return;
    const runForChat = study?.runs?.find((r) => r.id === runIdForResults);
    if (runForChat?.status !== "completed" && runForChat?.status !== "limit_reached") return;
    let cancelled = false;
    setChatMessages([]);
    setChatContextWarning(null);
    setChatLoading(true);
    fetch(`/api/studies/${studyId}/runs/${runIdForResults}/chat`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.contextMessage === "string" && data.contextMessage) {
          setChatContextWarning(data.contextMessage);
        }
        if (!data?.messages) return;
        setChatMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studyId, runIdForResults, study?.runs]);

  const run = study?.runs?.[0];
  const runForResults = study?.runs?.find((r) => r.id === runIdForResults);
  const isRunning =
    jobStatus?.status === "pending" ||
    jobStatus?.status === "running" ||
    jobStatus?.status === "generating_population" ||
    jobStatus?.status === "sampling" ||
    jobStatus?.status === "surveying" ||
    jobStatus?.status === "aggregating" ||
    study?.status === "running";
  const failed = jobStatus?.status === "failed";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!study) {
    return (
      <EmptyState
        icon={FileText}
        title="Study not found"
        description="This study may have been removed or the link is incorrect. Start a new research run from the dashboard."
        action={
          <Link href="/studies/new">
            <Button>New Study</Button>
          </Link>
        }
      />
    );
  }

  const studyTitle = study.ideaText.split(/\s+/).slice(0, 6).join(" ") + (study.ideaText.split(/\s+/).length > 6 ? "…" : "");
  const createdDate = study.createdAt ? new Date(study.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";

  const bestPrice = results?.wtpCurve?.reduce((best, cur) => (cur.probability > best.probability ? cur : best), results?.wtpCurve?.[0]);
  const bestSegment = results?.segments?.[0];

  function copyResults() {
    if (!results) return;
    const json = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(json).then(
      () => toast.success("Results copied", { description: "Aggregate results JSON copied to clipboard." }),
      () => toast.error("Copy failed", { description: "Could not copy to clipboard." })
    );
  }

  const selectedSegment = results?.segments?.find((s) => s.id === selectedSegmentId) ?? results?.segments?.[0] ?? null;

  function createClientMessageId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async function handleSendChat(messageOverride?: string) {
    const msg = (messageOverride ?? chatInput).trim();
    if (!msg || !studyId || !runIdForResults || chatSending) return;
    setChatSending(true);
    setChatInput("");
    setChatStreamingText("");
    const clientMessageId = createClientMessageId();
    const optimisticUser = {
      id: `tmp_user_${clientMessageId}`,
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticUser]);
    try {
      const res = await fetch(`/api/studies/${studyId}/runs/${runIdForResults}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, clientMessageId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (typeof data?.error === "string") {
          setChatContextWarning(data.error);
        }
        toast.error(data?.error ?? "Failed to send");
        setChatInput(msg);
        setChatMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          const event = lines.find((l) => l.startsWith("event:"))?.replace("event:", "").trim();
          const dataLine = lines.find((l) => l.startsWith("data:"))?.replace("data:", "").trim() ?? "{}";
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine);
          } catch {
            payload = {};
          }
          if (event === "delta" && typeof payload.text === "string") {
            setChatStreamingText((prev) => prev + payload.text);
          } else if (event === "error") {
            const errText = typeof payload.error === "string" ? payload.error : "Failed to send";
            setChatContextWarning(errText);
            toast.error(errText);
          } else if (event === "done") {
            if (Array.isArray(payload.messages)) {
              setChatContextWarning(null);
              setChatMessages(payload.messages as Array<{ id: string; role: string; content: string; createdAt: string }>);
              setChatStreamingText("");
            }
          }
        }
      }
    } catch {
      toast.error("Failed to send");
      setChatInput(msg);
      setChatMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setChatStreamingText("");
      setChatSending(false);
    }
  }

  function sendSuggestedQuestion(question: string) {
    if (chatSending) return;
    setChatInput(question);
    void handleSendChat(question);
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Studies", href: "/studies" },
          { label: studyTitle || "Study" },
        ]}
        className="text-slate-600 dark:text-slate-400"
      />

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/studies"
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Studies
          </Link>
          <Link href="/studies/new" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            New Study
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
            <CopyPlus className="h-4 w-4" />
            Duplicate study
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50" onClick={() => setDeleteStudyConfirm(true)}>
            <Trash2 className="h-4 w-4" />
            Delete study
          </Button>
        </div>
      </motion.div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{studyTitle}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{study.geography}</Badge>
          {study.industry && <Badge variant="outline">{study.industry}</Badge>}
          {run != null && (
            <Badge variant="outline">
              Population: {(results?.metadata?.populationMode ?? run.populationMode) === "audience_specific" ? "Audience-specific" : "General"}
              {(results?.metadata?.populationSize ?? run.populationSize) != null ? ` (${((results?.metadata?.populationSize ?? run.populationSize)! / 1000).toFixed(0)}k)` : ""}
            </Badge>
          )}
          {(results?.metadata?.targetAudience ?? study.targetAudienceJson?.label) &&
            (results?.metadata?.targetAudience ?? study.targetAudienceJson?.label)?.toLowerCase() !== "general population" && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                Target: {results?.metadata?.targetAudience ?? study.targetAudienceJson?.label}
                {results?.metadata?.filteredPoolSize != null && (
                  <span className="text-slate-500">
                    (filtered pool: {(results.metadata.filteredPoolSize / 1000).toFixed(0)}k)
                  </span>
                )}
              </Badge>
            )}
          {createdDate && <span className="text-sm text-slate-500 dark:text-slate-400">{createdDate}</span>}
          {results && (
            <>
              <Link href={`/studies/${studyId}/report`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  View report
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-1" onClick={copyResults}>
                <Copy className="h-3.5 w-3.5" />
                Copy results
              </Button>
            </>
          )}
        </div>
      </motion.header>

      {/* Status + Stepper */}
      <Card className="card-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Run status</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {jobStatus?.status === "completed" || run?.status === "completed" ? "Completed" : jobStatus?.status === "limit_reached" || run?.status === "limit_reached" ? "Partial" : isRunning ? "Running" : "Queued"}
            {(run?.populationMethod || run?.populationVersion) && (
              <span className="ml-2 text-slate-400 dark:text-slate-500">
                · Population: {run.populationMethod === "direct" && run.populationVersion ? run.populationVersion : run.populationMethod ?? "full"}
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ProgressStepper current={jobStatus?.status ?? run?.status ?? "pending"} failed={failed} />
            {isRunning && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {jobStatus?.status === "generating_population"
                      ? "Generating population"
                      : jobStatus?.status === "sampling"
                        ? "Sampling"
                        : jobStatus?.status === "surveying"
                          ? "Simulating responses"
                          : jobStatus?.status === "aggregating"
                            ? "Analyzing results"
                            : jobStatus?.status === "pending"
                              ? "Queued"
                              : "Processing…"}
                  </span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-400">
                    {jobStatus?.progress != null ? `${jobStatus.progress}%` : "0%"}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 wtp-bar"
                    initial={{ width: 0 }}
                    animate={{ width: `${jobStatus?.progress ?? 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This may take several minutes.
                  {liveUpdating && <span className="ml-1 font-medium text-indigo-600 dark:text-indigo-400">Live updating…</span>}
                </p>
              </div>
            )}
            {failed && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">Run failed</p>
                    <p className="mt-1 text-sm text-red-700">{jobStatus?.errorMessage ?? "Unknown error"}</p>
                    <Button variant="destructive" size="sm" className="mt-3" onClick={() => retryRun()} disabled={retrying}>
                      <Play className="mr-1 h-3 w-3" />
                      Retry Run
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Run History */}
      {study.runs.length > 0 && (
        <Card className="card-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Run history</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">View results or rerun with the same parameters.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-400">Run</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-400">Started</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-400">Finished</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-400">Sample</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-400">Population</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                    <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {study.runs.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-600 dark:text-slate-400">{r.id.slice(-8)}</td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{r.startedAt ? new Date(r.startedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{r.finishedAt ? new Date(r.finishedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                      <td className="py-2 pr-4">n={r.sampleSize}</td>
                      <td className="py-2 pr-4">
                        {r.populationMode === "audience_specific" ? `Audience ${r.populationSize != null ? (r.populationSize / 1000).toFixed(0) + "k" : ""}` : "General"}
                        {r.populationVersion && <span className="text-slate-400 dark:text-slate-500"> · {r.populationVersion}</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={r.status === "completed" ? "default" : r.status === "limit_reached" ? "secondary" : r.status === "failed" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {r.status === "limit_reached" ? "Partial" : r.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {(r.status === "completed" || r.status === "limit_reached") && (
                            <Link href={`/studies/${studyId}?run=${r.id}`}>
                              <Button variant="ghost" size="sm">View results</Button>
                            </Link>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleRerun(r)} disabled={retrying || !!rerunRunId}>
                            <Play className="h-3.5 w-3.5" />
                            Rerun
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteRunId(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running skeletons */}
      {isRunning && !results && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {/* Summary section */}
            <div>
              <h2 className="text-section-title mb-4">Summary</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="card-panel">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Recommended price</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {bestPrice ? `$${bestPrice.price}` : "—"}
                    </p>
                    {bestPrice && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {Math.round(bestPrice.probability * 100)}% purchase probability
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="card-panel">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Market size estimate</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {results.metadata?.populationSize != null
                        ? `${(results.metadata.populationSize / 1_000_000).toFixed(2)}M`
                        : run?.populationSize != null
                          ? `${(run.populationSize / 1_000_000).toFixed(2)}M`
                          : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Population · n={results.metadata?.sampleSize ?? run?.sampleSize ?? "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="card-panel">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Conversion estimate</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {bestPrice ? `${Math.round(bestPrice.probability * 100)}%` : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      At recommended price
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* WTP chart — large and prominent */}
            <div>
              <h2 className="text-section-title mb-4">Willingness to pay</h2>
              <Card className="card-panel">
                <CardContent className="pt-6">
                  {(!results.wtpCurve || results.wtpCurve.length === 0) ? (
                    <div className="empty-state h-80">
                      <p className="text-sm text-slate-500 dark:text-slate-400">No chart data yet.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-body-muted mb-4">Purchase probability at each price point</p>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={results.wtpCurve} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(226 232 240)" />
                            <XAxis dataKey="price" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`} domain={[0, 1]} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const pct = Math.round(Number(payload[0].value) * 100);
                                return (
                                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Price</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${label}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">Probability: {pct}%</p>
                                  </div>
                                );
                              }}
                            />
                            <Bar
                              dataKey="probability"
                              fill="rgb(79, 70, 229)"
                              radius={[6, 6, 0, 0]}
                              className="wtp-bar cursor-pointer"
                              onClick={(entry) => {
                                const price = (entry as { price?: number; payload?: { price?: number } })?.payload?.price;
                                if (typeof price === "number") {
                                  sendSuggestedQuestion(`From WTP_CURVE, explain what purchase probability at $${price} implies and whether we should test this price next.`);
                                }
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Sample size: {run?.sampleSize ?? "—"} personas
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Insights: key insights + top objections */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="card-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-section-title">Key insights</CardTitle>
                  <p className="text-body-muted mt-0.5">Suggested next experiments</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                    {results.nextExperiments?.slice(0, 5).map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--accent))]" />
                        {item}
                      </li>
                    ))}
                    {(!results.nextExperiments || results.nextExperiments.length === 0) && (
                      <li className="text-slate-500 dark:text-slate-400">No insights yet.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
              <Card className="card-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-section-title">Top objections</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                    {results.topObjections?.slice(0, 8).map((o, i) => (
                      <li key={i} className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--accent))]" />
                        {o}
                        </div>
                        <button
                          type="button"
                          onClick={() => sendSuggestedQuestion(`From OBJECTIONS, analyze this objection and suggest one concrete mitigation: "${o}"`)}
                          className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Ask
                        </button>
                      </li>
                    ))}
                    {(!results.topObjections || results.topObjections.length === 0) && (
                      <li className="text-slate-500 dark:text-slate-400">No objections data.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Segments: cards layout + details panel */}
            <div>
              <h2 className="text-section-title mb-4">Segments</h2>
              <p className="text-body-muted mb-4">Select a segment to view details</p>
            </div>
            <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {results.segments?.map((seg, idx) => {
                  const isPrimary = idx === 0;
                  const isSelected = seg.id === selectedSegmentId;
                  const painPoint = seg.rules?.painPoint ?? seg.name.split(",").find((s) => s.trim().includes("_"))?.trim();
                  const channel = seg.rules?.channel ?? seg.name.split(",").pop()?.trim();
                  return (
                    <motion.button
                      key={seg.id}
                      type="button"
                      layout
                      onClick={() => {
                        setSelectedSegmentId(seg.id);
                        if (typeof window !== "undefined" && window.innerWidth < 1024) setSegmentDetailsOpen(true);
                      }}
                      className={cn(
                        "card-panel flex flex-col items-start rounded-xl border px-4 py-4 text-left transition-all duration-200",
                        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2",
                        isSelected && "ring-2 ring-[rgb(var(--accent))] ring-offset-2 dark:ring-offset-slate-900",
                        isPrimary && !isSelected && "border-indigo-200 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-900/20",
                        !isPrimary && !isSelected && "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {isPrimary && (
                          <Badge variant="default" className="text-xs">Primary</Badge>
                        )}
                        {painPoint && (
                          <Badge variant="outline" className="text-xs capitalize dark:border-slate-600">
                            {painPoint.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {channel && (
                          <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                            {channel}
                          </span>
                        )}
                      </div>
                      <span className="mt-2 block font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{seg.name}</span>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Est. {seg.sizeEstimate.toLocaleString()} · {Object.entries(seg.purchaseProbabilityByPrice).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(", ")}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendSuggestedQuestion(`From SEGMENTS (JSON), summarize this segment and recommend the best message + first experiment: ${seg.name}`);
                        }}
                        className="mt-3 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Ask about this segment
                      </button>
                    </motion.button>
                  );
                })}
              </div>
              <div className="hidden lg:sticky lg:top-6 lg:self-start">
                <SegmentDetailsPanel
                  segment={selectedSegment}
                  isPrimary={!!(selectedSegment && results.segments?.[0]?.id === selectedSegment.id)}
                />
              </div>
            </div>

            {/* Mobile: segment details dialog (only visible when segmentDetailsOpen; desktop uses sticky panel) */}
            <Dialog open={segmentDetailsOpen} onOpenChange={setSegmentDetailsOpen}>
              {selectedSegment && (
                <DialogContent
                  className="max-h-[85vh] overflow-y-auto p-0 dark:border-slate-700 dark:bg-slate-900"
                  title="Segment details"
                  onClose={() => setSegmentDetailsOpen(false)}
                >
                  <div className="p-4">
                    <SegmentDetailsPanel
                      segment={selectedSegment}
                      isPrimary={results?.segments?.[0]?.id === selectedSegment.id}
                    />
                    <Button className="mt-4 w-full" onClick={() => setSegmentDetailsOpen(false)}>
                      Close
                    </Button>
                  </div>
                </DialogContent>
              )}
            </Dialog>

            {/* Sample personas */}
            {personas.length > 0 && (
              <Card className="card-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-section-title">Sample personas</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="mb-4 text-sm text-slate-500">View soul (values, fears, motivations) for each sampled persona.</p>
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-4 py-3 text-left font-medium text-slate-700">Persona ID</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-700">Soul version</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personas.map((p) => (
                            <tr key={p.personaId} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3 font-mono text-slate-700">{p.personaId}</td>
                              <td className="px-4 py-3 text-slate-500">v{p.soulVersion}</td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" onClick={() => openSoulModal(p.personaId)}>
                                  <Sparkles className="mr-1 h-3 w-3" />
                                  View soul
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next experiments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next experiments</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-slate-700">
                  {results.nextExperiments?.map((e, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {e}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Results chatbot — only when viewing a completed/limit_reached run */}
            {runIdForResults && (runForResults?.status === "completed" || runForResults?.status === "limit_reached") && (
              <Card className="card-panel card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    Chat about these results
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Ask questions about WTP, segments, objections, or next steps. Answers are based only on this run&apos;s results.
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    This analysis is synthetic; validate with real research before major decisions.
                  </p>
                  {chatContextWarning && (
                    <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                      {chatContextWarning}
                    </p>
                  )}
                  {chatLoading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading chat…</div>
                  ) : (
                    <>
                      <ScrollArea className="h-[280px] w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="space-y-4">
                          {chatMessages.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Your AI research analyst is ready. Ask a question or tap a prompt below to explore your results.</p>
                          )}
                          {chatMessages.map((m) => (
                            <div
                              key={m.id}
                              className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                                m.role === "user"
                                  ? "ml-auto bg-[rgb(var(--accent))] text-[rgb(var(--accent-foreground))]"
                                  : "mr-auto border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            </div>
                          ))}
                          {chatStreamingText && (
                            <div className="mr-auto max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                              <p className="whitespace-pre-wrap">{chatStreamingText}</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {SUGGESTED_CHAT_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => sendSuggestedQuestion(q)}
                            disabled={chatSending}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          placeholder="Ask about results…"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          disabled={chatSending}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            void handleSendChat();
                          }}
                          disabled={!chatInput.trim() || chatSending}
                          className="btn-primary gap-1.5 px-4"
                        >
                          {chatSending ? (
                            <span className="text-sm">Sending…</span>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {(jobStatus?.status === "completed" || jobStatus?.status === "limit_reached") && !results && (
        <EmptyState
          icon={Activity}
          title={resultsLoadError ? "Results are unavailable for this run" : "Loading results…"}
          description={
            resultsLoadError
              ? `${resultsLoadError} You can retry loading results or start a rerun if this persists.`
              : "Aggregating segments and WTP. This should only take a moment."
          }
          action={
            runIdToPoll ? (
              <Button variant="outline" onClick={() => fetchResults(runIdToPoll)}>
                Retry loading results
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Soul modal */}
      <Dialog open={!!soulModal} onOpenChange={(open) => !open && setSoulModal(null)}>
        {soulModal && (
          <DialogContent className="max-h-[85vh] flex flex-col p-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Soul: {soulModal.personaId}</h2>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500">Version</label>
                <Select
                  value={soulVersion}
                  onChange={(e) => changeSoulVersion(soulModal.personaId, parseInt(e.target.value, 10))}
                  className="w-28"
                >
                  {soulModal.versions.map((v) => (
                    <option key={v} value={v}>
                      {v === 0 ? "Current" : `v${v}`}
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setSoulModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 max-h-[60vh] px-6 py-4">
              <MarkdownViewer content={soulModal.content} className="prose prose-slate max-w-none" />
            </ScrollArea>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete study confirm */}
      <Dialog open={deleteStudyConfirm} onOpenChange={setDeleteStudyConfirm}>
        <DialogContent title="Delete study" onClose={() => setDeleteStudyConfirm(false)}>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Delete this study and all its runs and results? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteStudyConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteStudy}>Delete study</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete run confirm */}
      <Dialog open={!!deleteRunId} onOpenChange={(open) => !open && setDeleteRunId(null)}>
        <DialogContent title="Delete run" onClose={() => setDeleteRunId(null)}>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Delete this run and its results? The study will remain.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteRunId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteRunId && handleDeleteRun(deleteRunId)}>Delete run</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
