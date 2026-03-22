"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Play,
  FileText,
  BarChart3,
  Users,
  AlertCircle,
  Target,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { TargetAudience } from "@/lib/types";

type SavedPreset = {
  id: string;
  name: string;
  targetAudienceJson: TargetAudience;
  createdAt?: string;
};

const TARGET_AUDIENCE_PRESETS: (TargetAudience & { id: string })[] = [
  { id: "general", label: "General population" },
  { id: "young_professionals", label: "Young professionals", ageRange: [25, 44], keywords: ["career", "tech"] },
  { id: "parents", label: "Parents", ageRange: [28, 50], keywords: ["family", "kids"] },
  { id: "seniors", label: "Seniors", ageRange: [55, 75], keywords: ["retirement", "health"] },
];

const ALL_SAMPLE_SIZES = [100, 250, 500, 1000, 2000];
const DEFAULT_PRICE_POINTS = [9, 19, 49];

export default function NewStudyPage() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [geography, setGeography] = useState("US");
  const [industry, setIndustry] = useState("");
  const [pricePoints, setPricePoints] = useState<[number, number, number]>(
    DEFAULT_PRICE_POINTS as [number, number, number]
  );
  const [sampleSize, setSampleSize] = useState(500);
  const [targetPreset, setTargetPreset] = useState("general");
  const [populationMode, setPopulationMode] = useState<"general" | "audience_specific">("general");
  const [populationSizeAudience, setPopulationSizeAudience] = useState(100000);
  const [targetCustom, setTargetCustom] = useState<TargetAudience>({ label: "Custom audience" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [maxSampleSize, setMaxSampleSize] = useState(500);
  const [userPlan, setUserPlan] = useState("free");

  useEffect(() => {
    fetch("/api/limits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.maxSampleSize) {
          setMaxSampleSize(data.maxSampleSize);
          setUserPlan(data.plan ?? "free");
          // Clamp sample size if current selection exceeds limit
          setSampleSize((prev) => Math.min(prev, data.maxSampleSize));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSavedPresets(Array.isArray(data) ? data : []))
      .catch(() => setSavedPresets([]));
  }, []);

  function getCurrentTargetAudience(): TargetAudience | undefined {
    if (targetPreset.startsWith("saved_")) {
      const id = targetPreset.replace(/^saved_/, "");
      const p = savedPresets.find((s) => s.id === id);
      return p?.targetAudienceJson;
    }
    if (targetPreset === "custom") return targetCustom;
    const built = TARGET_AUDIENCE_PRESETS.find((p) => p.id === targetPreset);
    return built ? { label: built.label, ageRange: built.ageRange, incomeRange: built.incomeRange, education: built.education, employment: built.employment, keywords: built.keywords } : TARGET_AUDIENCE_PRESETS[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const audience = getCurrentTargetAudience();
      const isGeneralAudience = !audience?.label || audience.label.toLowerCase() === "general population";
      const createRes = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: ideaText.trim(),
          geography,
          industry: industry.trim() || null,
          pricePoints,
          targetAudienceJson: audience ?? undefined,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        if (createRes.status === 429) {
          throw new Error(data.error === "rate_limited" ? "Rate limited. Please try again later." : "Too many requests.");
        }
        throw new Error(data.error?.message ?? "Failed to create study");
      }
      const study = await createRes.json();
      const runBody: { sampleSize: number; populationMode?: string; populationSize?: number } = { sampleSize };
      if (populationMode === "audience_specific" && !isGeneralAudience) {
        runBody.populationMode = "audience_specific";
        runBody.populationSize = populationSizeAudience;
      }
      const runRes = await fetch(`/api/studies/${study.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runBody),
      });
      if (!runRes.ok) {
        const runData = await runRes.json().catch(() => ({}));
        throw new Error(runData.error ?? "Failed to start run");
      }
      const { studyRunId, jobId } = await runRes.json();
      toast.success("Study created", { description: "Redirecting to your study…" });
      router.push(`/studies/${study.id}?run=${studyRunId}&jobId=${jobId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePreset() {
    const audience = targetPreset === "custom" ? targetCustom : getCurrentTargetAudience();
    if (!audience || !presetName.trim()) {
      toast.error("Enter a preset name");
      return;
    }
    setSavingPreset(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: presetName.trim(), targetAudienceJson: audience }),
      });
      if (!res.ok) throw new Error("Failed to save preset");
      const created = await res.json();
      setSavedPresets((prev) => [{ ...created, targetAudienceJson: audience }, ...prev]);
      setTargetPreset(`saved_${created.id}`);
      setPresetName("");
      toast.success("Preset saved");
    } catch {
      toast.error("Could not save preset");
    } finally {
      setSavingPreset(false);
    }
  }

  return (
    <div className="container-app space-y-10 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">New Study</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Define your idea and audience to run synthetic market research.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="card-elevated border-slate-200/80 dark:border-slate-700/80">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Study setup
              </CardTitle>
              <CardDescription>Describe your concept and choose your target audience and run settings.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ideaText">Business idea</Label>
                  <Textarea
                    id="ideaText"
                    placeholder="e.g. A subscription meal kit focused on busy parents who want healthy dinners in under 30 minutes."
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    rows={4}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="geography">Geography</Label>
                    <Select
                      id="geography"
                      value={geography}
                      onChange={(e) => setGeography(e.target.value)}
                    >
                      <option value="US">US</option>
                      <option value="UK">UK</option>
                      <option value="CA">CA</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry (optional)</Label>
                    <Input
                      id="industry"
                      placeholder="e.g. Consumer, SaaS"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target audience</Label>
                  <Select
                    value={targetPreset}
                    onChange={(e) => setTargetPreset(e.target.value)}
                  >
                    {TARGET_AUDIENCE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                    {savedPresets.length > 0 && (
                      <optgroup label="Saved">
                        {savedPresets.map((p) => (
                          <option key={p.id} value={`saved_${p.id}`}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom">Custom</option>
                  </Select>

                  {targetPreset === "custom" && (
                    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="space-y-2">
                        <Label htmlFor="customLabel">Audience label</Label>
                        <Input
                          id="customLabel"
                          value={targetCustom.label}
                          onChange={(e) => setTargetCustom((c) => ({ ...c, label: e.target.value }))}
                          placeholder="e.g. Fitness enthusiasts"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Age range (optional)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={18}
                              max={100}
                              placeholder="Min"
                              value={targetCustom.ageRange?.[0] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                setTargetCustom((c) => ({ ...c, ageRange: [Number.isFinite(v) ? v : 18, c.ageRange?.[1] ?? 65] as [number, number] }));
                              }}
                            />
                            <span className="text-slate-500">–</span>
                            <Input
                              type="number"
                              min={18}
                              max={100}
                              placeholder="Max"
                              value={targetCustom.ageRange?.[1] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                setTargetCustom((c) => ({ ...c, ageRange: [c.ageRange?.[0] ?? 18, Number.isFinite(v) ? v : 65] as [number, number] }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[180px] flex-1 space-y-2">
                          <Label htmlFor="presetName">Save as preset</Label>
                          <Input
                            id="presetName"
                            placeholder="Preset name"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="default"
                          onClick={handleSavePreset}
                          disabled={savingPreset || !presetName.trim()}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {savingPreset ? "Saving…" : "Save preset"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {targetPreset !== "custom" && (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1 space-y-2">
                        <Label htmlFor="presetNameAlt">Save current as preset</Label>
                        <Input
                          id="presetNameAlt"
                          placeholder="Preset name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="default"
                        onClick={handleSavePreset}
                        disabled={savingPreset || !presetName.trim()}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {savingPreset ? "Saving…" : "Save preset"}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Population mode</Label>
                  <div className="flex gap-6">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="populationMode"
                        checked={populationMode === "general"}
                        onChange={() => setPopulationMode("general")}
                        className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">General</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="populationMode"
                        checked={populationMode === "audience_specific"}
                        onChange={() => setPopulationMode("audience_specific")}
                        className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">Audience-specific</span>
                    </label>
                  </div>
                  {populationMode === "audience_specific" && (
                    <div className="mt-2 max-w-[200px] space-y-2">
                      <Label htmlFor="populationSizeAudience">Population size</Label>
                      <Input
                        id="populationSizeAudience"
                        type="number"
                        min={10000}
                        max={500000}
                        step={10000}
                        value={populationSizeAudience}
                        onChange={(e) => setPopulationSizeAudience(parseInt(e.target.value, 10) || 100000)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Price points (3 values, $)</Label>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <Input
                        key={i}
                        type="number"
                        min={1}
                        step={1}
                        placeholder={String(DEFAULT_PRICE_POINTS[i])}
                        value={pricePoints[i] || ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          const next = [...pricePoints] as [number, number, number];
                          next[i] = Number.isFinite(v) && v > 0 ? v : (DEFAULT_PRICE_POINTS[i] as number);
                          setPricePoints(next);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleSize">Sample size</Label>
                  <Select
                    id="sampleSize"
                    value={String(sampleSize)}
                    onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
                  >
                    {ALL_SAMPLE_SIZES.map((n) => (
                      <option key={n} value={n} disabled={n > maxSampleSize}>
                        {n} personas{n > maxSampleSize ? ` (requires ${n <= 1000 ? "Pro" : "Enterprise"} plan)` : ""}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your plan ({userPlan}) allows up to {maxSampleSize} personas per run.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    "Creating…"
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Create & run study
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <p>We generate a synthetic population, sample personas, and run a simulated survey at your price points.</p>
              <p>You get a WTP curve, segments, top objections, and recommended messaging—all in minutes.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                What you&apos;ll get
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <ul className="list-inside list-disc space-y-1">
                <li>Willingness-to-pay curve</li>
                <li>Segments with purchase probability by price</li>
                <li>Top objections and recommended messaging</li>
                <li>Optional persona-level drill-down</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sample output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
{`WTP curve:    $9 → 45%  $19 → 28%  $49 → 12%
Segments:     Value seekers, Quality-first, …
Objections:   "Price too high", "Need more info"
Messaging:    Emphasize time savings & quality`}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
