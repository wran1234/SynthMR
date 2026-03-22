import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TRADITIONAL_TIMELINE = [
  "Recruit panel or agency (1–2 weeks)",
  "Design survey & get approvals (3–7 days)",
  "Field survey (1–2 weeks)",
  "Clean data & run analysis (3–5 days)",
  "Synthesize and present (2–3 days)",
];

const SYNTHMR_TIMELINE = [
  "Define idea & audience (2 min)",
  "Generate population & survey (1 min)",
  "Run simulation (2–5 min)",
  "Review WTP, segments, objections (instant)",
];

const VALUE_PROPS = [
  {
    title: "Pricing clarity",
    description: "See willingness-to-pay by price point so you can set a price that converts.",
    icon: TrendingUp,
  },
  {
    title: "Segments that matter",
    description: "Identify who’s most likely to buy and how they differ from the rest.",
    icon: Target,
  },
  {
    title: "Real objections",
    description: "Surface top barriers and objections so you can fix messaging before launch.",
    icon: MessageSquare,
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Define your idea & audience",
    description: "Describe your product or concept and choose your target market. We generate a synthetic population and survey questions.",
  },
  {
    step: 2,
    title: "Simulate responses",
    description: "AI personas answer your survey and react to price points. Each persona has consistent values and constraints.",
  },
  {
    step: 3,
    title: "Get insights in minutes",
    description: "See willingness-to-pay curves, segments, top objections, and recommended next experiments—no real users required.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What is synthetic market research?",
    a: "We simulate a target population and use AI to generate survey responses and purchase intent. You get directional insights in minutes instead of waiting for a panel.",
  },
  {
    q: "How accurate is it?",
    a: "Results are directional and best used for prioritization and hypothesis formation. Validate key findings with real users before major decisions.",
  },
  {
    q: "What’s the difference between Free and Pro?",
    a: "Free includes a smaller sample size per run. Pro allows larger samples and is intended for teams running multiple studies.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. You can copy results as JSON and use the report view. Account export is available in Account settings.",
  },
  {
    q: "Why should I use this instead of a real panel?",
    a: "Use SynthMR first to test many ideas and price points quickly. Once you narrow down, run a traditional study to validate with real users.",
  },
];

const REGISTER_URL = `/login?tab=register&callbackUrl=${encodeURIComponent("/studies/new")}`;

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Sticky landing nav */}
      <nav
        className="sticky top-14 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-10"
        aria-label="Landing navigation"
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="shrink-0 font-semibold tracking-tight text-slate-900 dark:text-slate-50"
          >
            SynthMR
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a
              href="#how-it-works"
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              How it works
            </a>
            <a
              href="#example-output"
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              Example output
            </a>
            <a
              href="#pricing"
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300">
                Sign in
              </Button>
            </Link>
            <Link href={REGISTER_URL}>
              <Button className="btn-primary gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mb-24 text-center">
        <h1 className="text-display max-w-4xl mx-auto sm:text-4xl">
          Stop losing 2–6 weeks on market research. Validate in minutes.
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
          Traditional panels take weeks to recruit, field, and analyze. SynthMR runs a synthetic population and gives you willingness-to-pay, segments, and objections in under 10 minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={REGISTER_URL}>
            <Button
              size="lg"
              className="btn-primary h-12 gap-2 px-8 text-base font-semibold"
            >
              <Sparkles className="h-5 w-5" />
              Start free — no credit card
            </Button>
          </Link>
          <a
            href="#example-output"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            See example output
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Free tier · Up to 300 respondents per run
        </p>
      </section>

      {/* What market research really costs */}
      <section className="mb-24">
        <h2 className="text-section-title text-center mb-10">
          What market research really costs
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-panel flex flex-col rounded-xl border border-slate-200/80 p-6 dark:border-slate-700/80">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Traditional</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Recruit panel, field survey, analyze. Typical timeline:
            </p>
            <ul className="mt-4 space-y-2">
              {TRADITIONAL_TIMELINE.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              Total: 2–6 weeks per idea
            </p>
          </div>
          <div className="card-panel flex flex-col rounded-xl border-2 border-blue-200/80 bg-blue-50/30 p-6 dark:border-blue-800/60 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">SynthMR</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Define idea, run simulation, get report. Typical timeline:
            </p>
            <ul className="mt-4 space-y-2">
              {SYNTHMR_TIMELINE.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-blue-100/80 px-3 py-2 text-sm font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              Save weeks per idea — test many ideas instead of one
            </p>
          </div>
        </div>
      </section>

      {/* Validate more ideas — value props */}
      <section className="mb-24">
        <h2 className="text-section-title text-center mb-4">
          Validate more ideas
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          Get the insights you need to prioritize what to build and how to price it.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="card-panel flex flex-col rounded-xl border border-slate-200/80 p-6 dark:border-slate-700/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                {title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 flex-1">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mb-24">
        <h2 className="text-section-title text-center mb-10">How it works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="card-panel flex flex-col rounded-xl border border-slate-200/80 p-6 dark:border-slate-700/80"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                {item.step}
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 flex-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Example output mock */}
      <section id="example-output" className="mb-24">
        <h2 className="text-section-title text-center mb-10">Example output</h2>
        <div className="card-panel overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <FileText className="h-4 w-4" />
              Willingness to pay · Segments · Top objections · Messaging
            </div>
          </div>
          <div className="p-6">
            {/* WTP curve placeholder */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-800/30">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                Willingness-to-pay by price point
              </p>
              <div className="flex h-32 items-end justify-between gap-1">
                {[40, 55, 70, 65, 48, 32, 18].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-blue-500/70 dark:bg-blue-400/60 transition-opacity hover:opacity-90"
                    style={{ height: `${h}%` }}
                    title={`$${(i + 1) * 10}`}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>$10</span>
                <span>$70</span>
              </div>
            </div>
            {/* Segments / objections / message cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Top segment
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                  Age 25–44 · Income Q2 · time_poor
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Highest purchase intent at $29
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Top objection
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  &quot;Need to see reviews first&quot;
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Recommended message
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  Emphasize speed and trust signals for this segment
                </p>
              </div>
            </div>
          </div>
          <p className="border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Example output. Your results depend on your idea and audience.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mb-24">
        <h2 className="text-section-title text-center mb-10">Pricing</h2>
        <div className="grid gap-6 md:grid-cols-2 md:max-w-3xl md:mx-auto">
          <div className="card-panel flex flex-col rounded-xl border-2 border-slate-200 p-6 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Free</h3>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">$0</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Up to 300 respondents per run. Perfect to try the product.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                Synthetic population & survey
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                WTP curve & segments
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                Export & report view
              </li>
            </ul>
            <Link href={REGISTER_URL} className="mt-6 block">
              <Button className="btn-primary w-full">Start free</Button>
            </Link>
          </div>
          <div className="card-panel flex flex-col rounded-xl border-2 border-blue-200 bg-blue-50/30 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Pro</h3>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">Soon</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Up to 1,000 respondents per run. For teams and heavier use.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                Everything in Free
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                Larger sample size
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                Priority support
              </li>
            </ul>
            <Button variant="secondary" className="mt-6 w-full" disabled>
              Join waitlist
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-24">
        <h2 className="text-section-title text-center mb-10">FAQ</h2>
        <div className="container-narrow space-y-6">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.q}
              className="card-panel rounded-xl border border-slate-200/80 p-5 dark:border-slate-700/80"
            >
              <h3 className="font-semibold text-slate-900 dark:text-slate-50">{item.q}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mb-16 text-center">
        <div className="card-panel rounded-2xl border border-slate-200/80 bg-slate-50/50 py-12 dark:border-slate-700/80 dark:bg-slate-800/30">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
            Save weeks. Validate in minutes.
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Start a study in under 10 minutes. No credit card required.
          </p>
          <Link href={REGISTER_URL} className="mt-6 inline-block">
            <Button size="lg" className="btn-primary gap-2 px-8">
              <Sparkles className="h-5 w-5" />
              Start free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            SynthMR · Synthetic market research
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <Link
              href="/login"
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              Sign in
            </Link>
            <Link
              href={REGISTER_URL}
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
