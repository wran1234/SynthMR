# Done

Completed tasks with summaries. Maintained by the Project Lead.

---

## TASK-001: Align Environment Variable Configuration
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Split monolithic `REQUIRED_VARS` into three tiers (Required, Required-Production, Recommended). Expanded `env.ts` Zod schema from 3 fields to 30+. Restructured `.env.example` with clear category headers. Updated README production checklist. TypeScript compiles clean.
**Files Changed**: `src/lib/env-check.ts`, `src/lib/env.ts`, `.env.example`, `README.md`

---

## TASK-004: Add Sample Size Validation UX
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Created `/api/limits` endpoint that returns plan-based sample size caps. Updated New Study page to fetch limits on mount, disable options above cap, and show plan context text. Users on free plan see 300 limit; pro sees 1000.
**Files Changed**: `src/app/api/limits/route.ts` (new), `src/app/studies/new/page.tsx`

---

## TASK-005: Remove Legacy OAuth Tables
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Removed `Account`, `Session`, and `VerificationToken` models from Prisma schema. Removed relation fields from User model. Added migration note comment. SynthMR uses custom `AuthSession` with Argon2 — legacy NextAuth tables were unused.
**Files Changed**: `prisma/schema.prisma`

---

## LAUNCH-001: Production Logging Cleanup
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Replaced all 11 `console.log`/`console.warn` calls in `populationStore.ts` with structured `logInfo`/`logWarn`. Fixed `console.warn` in `llm.ts`. Fixed `console.error` in `audit.ts` and 8 API route files. Dashboard dev-only `console.log` removed.
**Files Changed**: `src/lib/populationStore.ts`, `src/lib/llm.ts`, `src/lib/audit.ts`, `src/app/dashboard/page.tsx`, plus 8 API route files

---

## LAUNCH-002: Dashboard Usage Stats
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Replaced "Billing coming soon" placeholder with real monthly usage stats. Dashboard now queries `StudyRun` aggregate for current month's `llmTokensUsed`, `llmCostCents`, and run count. Displays "X runs" with token/cost details.
**Files Changed**: `src/app/dashboard/page.tsx`

---

## LAUNCH-003: Build & Typecheck Scripts
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Added `typecheck` (`tsc --noEmit`) and `preflight` (`npm run typecheck && npm run build`) scripts to `package.json` for CI/CD and pre-deploy verification.
**Files Changed**: `package.json`

---

## LAUNCH-004: Comprehensive API Documentation
**Completed**: 2026-03-10
**Agent**: Senior Engineer
**Summary**: Expanded all docs pages from skeletal placeholders to comprehensive documentation. Main hub now has Quick Start guide. Agent API docs cover all 4 endpoints with request/response examples. Webhooks page documents events, signatures, retry policy. Created new Authentication docs page explaining API keys, scopes, and rotation.
**Files Changed**: `src/app/docs/page.tsx`, `src/app/docs/agent-api/page.tsx`, `src/app/docs/webhooks/page.tsx`, `src/app/docs/authentication/page.tsx` (new)

---

## LAUNCH-005: Chat Prompt Starters
**Completed**: 2026-03-10
**Agent**: Senior Engineer + Growth Experimenter
**Summary**: Upgraded chat prompt starters from 5 generic questions to 7 actionable, market-research-focused prompts. Added "Draft a landing page headline", "Compare segments", and "What positioning would reduce the biggest objection". Updated empty state text to be more inviting.
**Files Changed**: `src/app/studies/[id]/page.tsx`
