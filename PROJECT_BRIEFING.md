# SynthMR – Project Briefing for Senior Technical Product Manager

**Generated from codebase analysis. Based only on actual code—no invented features.**

---

# 1. Executive Summary

| Attribute | Value |
|-----------|-------|
| **Project name** | SynthMR (Synthetic Market Research) |
| **One-sentence description** | MVP web app that lets users enter a business idea and price points, then simulates market research using a synthetic population and AI-driven survey responses, outputting willingness-to-pay curves, segments, and objections. |
| **Problem it solves** | Validating product-market fit and pricing without running real surveys—replacing or augmenting traditional market research with AI-simulated personas. |
| **Target users** | Founders, product managers, and marketers who want quick, low-cost validation of business ideas and price sensitivity. |
| **Core value proposition** | Get WTP curves, segment insights, and objection analysis in minutes instead of weeks, at a fraction of traditional survey cost. |
| **Current completion status** | ~75% (core study flow works end-to-end; billing, onboarding, and production hardening incomplete). |

---

# 2. Product Overview

## Main Features (Implemented)

- **Auth** – Email + password (register/login/logout), httpOnly session cookies, CSRF protection
- **New Study** – Business idea, geography (US only), optional industry, 3 price points, target audience (presets or custom), population mode (general vs audience-specific), sample size
- **Population modes** – General (200K–1M personas from env) or audience-specific (10K–500K filtered personas)
- **Saved presets** – Custom target audiences saved per user and reused across studies
- **Run study** – Jobs enqueued via BullMQ; worker processes: generate population → sample → survey (LLM) → aggregate
- **Progress** – Job polling via `/api/jobs/[jobId]`; progress every 10 personas
- **Results** – WTP curve by price, top 5 segments (age + income + pain point + channel), objections, recommended messaging, next experiments
- **Study management** – List with search/sort/filter; duplicate study; delete study; delete run
- **Account** – Profile, export data, delete account
- **Status page** – System health (DB, Redis, worker)

## Planned Features (Detectable in Code)

- **Billing** – `User.stripeCustomerId`, `plan`, `planStatus` present; no billing logic
- **Geography** – US only (UK/CA in UI dropdown but likely not fully supported)
- **Persona drill-down** – Soul/persona viewing exists; UX may be limited

## User Flow (Step-by-Step)

1. **Signup** – Visit `/login` → Register tab → Email, password (min 10 chars), optional name → Create account
2. **Login** – Email + password → Redirect to callbackUrl or `/dashboard`
3. **New Study** – `/studies/new` → Idea, geography, industry, price points, target audience, sample size → Create & run
4. **Run** – Job queued → Redirect to `/studies/[id]?run=...` → Poll job status
5. **Results** – WTP chart, segments, objections, messaging recommendations
6. **Study management** – Search/sort/filter at `/studies`; duplicate or delete from study detail

## Screens and Purpose

| Route | Purpose |
|-------|---------|
| `/` | Root redirect |
| `/login` | Auth (Login / Register tabs) |
| `/register` | Redirect to `/login?tab=register` |
| `/dashboard` | Overview: total studies, runs, success rate, recent studies |
| `/studies` | List studies with search, sort, filter |
| `/studies/new` | Create study form |
| `/studies/[id]` | Study detail, run history, results, duplicate/delete |
| `/studies/[id]/report` | Report view |
| `/account` | Profile, export, delete account |
| `/status` | System health |

---

# 3. Technical Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Framer Motion, Lucide React, next-themes, Sonner (toasts) |
| **Backend** | Next.js API routes (App Router) |
| **Database** | PostgreSQL (pgvector/pg16 via Docker) + Prisma ORM |
| **Jobs** | Redis 7 + BullMQ |
| **LLM** | OpenAI-compatible API (env: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) |
| **Auth** | Email/password, Argon2, DB-backed sessions (AuthSession), httpOnly cookie `synthmr_session` |
| **Infra** | Docker Compose (local), Fly.io (production) |

## Frameworks and Major Libraries

- **next** 14.2.18, **react** 18.3
- **@prisma/client**, **bullmq**, **ioredis**
- **argon2** (password hashing), **zod** (validation), **jsonrepair** (LLM output)
- **recharts**, **framer-motion**, **sonner**

## Data Flow

1. **Study creation** – POST `/api/studies` → DB (Study) → POST `/api/studies/[id]/run` → BullMQ job
2. **Worker** – Fetches job → `getOrCreatePopulationForRun` (JSONL on disk) → `sampleStratifiedSeeded` → `generateSurvey` (LLM) → `simulateOne` per persona (LLM) → `aggregateResults` → DB (Response, Aggregate)
3. **Client** – Polls `/api/jobs/[jobId]` for progress; fetches results from `/api/studies/[id]/results/[runId]`

## Authentication

- Email + password (Argon2)
- DB-backed sessions: `AuthSession` stores SHA256(tokenHash)
- Cookie: `synthmr_session`, httpOnly, SameSite=lax, path=/
- CSRF: double-submit cookie; GET `/api/auth/csrf` returns token; POST auth requires `x-csrf-token` header

## API Structure

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/csrf`
- **User**: `GET /api/me`
- **Studies**: `GET/POST /api/studies`, `GET/DELETE /api/studies/[id]`, `POST /api/studies/[id]/duplicate`, `POST /api/studies/[id]/run`, `DELETE /api/studies/[id]/runs/[runId]`, `GET /api/studies/[id]/results/[runId]`
- **Jobs**: `GET /api/jobs/[jobId]`
- **Presets**: `GET/POST /api/presets`, `DELETE /api/presets/[id]`
- **Account**: `DELETE /api/account`, `GET /api/account/export`
- **Health**: `GET /api/health`, `GET /api/ready`
- **Cron**: `GET /api/cron/cleanup` (optional Bearer)

## Folder Structure

```
src/
├── app/
│   ├── api/          # Route handlers (auth, studies, jobs, presets, account, cron, health)
│   ├── dashboard/    # Dashboard page
│   ├── login/        # Auth page (Login/Register tabs)
│   ├── register/     # Redirect to login
│   ├── studies/      # List, [id], new, [id]/report
│   ├── account/      # Account page
│   ├── status/       # Status page
│   └── layout.tsx
├── lib/
│   ├── llm.ts              # OpenAI-compatible adapter, retries, concurrency limit
│   ├── surveyGenerator.ts  # Generate survey from idea (LLM)
│   ├── simulateResponses.ts # Simulate persona response (LLM)
│   ├── aggregateResults.ts # Segments, WTP, objections
│   ├── personaGenerator.ts # Synthetic persona attributes
│   ├── populationStore.ts  # JSONL population, stratified sampling
│   ├── soulEngine.ts       # Persona “soul” (values, fears)
│   ├── session.ts, password.ts, require-auth.ts, csrf.ts
│   ├── rate-limit.ts       # Redis-based rate limiting
│   ├── redis-lock.ts       # Distributed locks
│   └── logger.ts, env-check.ts, etc.
├── queue/
│   ├── connection.ts  # Redis connection
│   ├── client.ts      # BullMQ queue definition
│   └── worker.ts      # Job processor
└── components/        # UI (Button, Card, etc., auth, account)
```

---

# 4. Database Design

## Database Type

PostgreSQL 16 (pgvector image; vector use not evident in current code).

## Schema Overview

| Table | Purpose |
|-------|---------|
| **User** | id, email, name, passwordHash, stripeCustomerId, plan, planStatus |
| **AuthSession** | DB-backed sessions (tokenHash, userId, expiresAt) |
| **Account, Session, VerificationToken** | Legacy OAuth-style tables; unused by current auth |
| **AuditLog** | study_create, study_delete, run_start, run_delete |
| **AudiencePreset** | User-saved target audiences |
| **Study** | ideaText, geography, industry, pricePoints, targetAudienceJson, status |
| **StudyRun** | seed, populationManifestPath, populationMode, sampleSize, status, jobId |
| **SampledPersona** | Links run to persona folders on disk |
| **SoulEdit** | Soul update history |
| **Survey** | Generated questions (JSON) |
| **Response** | answers, buys (per price), objections, valueScore |
| **Aggregate** | results (segments, WTP curve, objections, next experiments) |

## Relationships

- User → Studies, AudiencePresets, AuthSessions, AuditLogs
- Study → StudyRuns
- StudyRun → Survey, Response[], Aggregate[], SampledPersona[]

## Performance Risks

- No pagination on study list (take 100)
- Search with encryption enabled: in-memory filter over full result set
- Large JSON blobs in Response.answers, Aggregate.results
- Population JSONL on disk can reach hundreds of MB for 1M personas

---

# 5. AI / LLM Integration (CRITICAL)

## LLM Provider(s)

OpenAI-compatible API. Configured via `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. No vendor lock-in.

## Where LLM Is Used

| Location | Purpose |
|----------|---------|
| `surveyGenerator.ts` | Generate survey questions from business idea (6–14 MC, 2–3 open-ended, 2–3 pricing) |
| `simulateResponses.ts` | Simulate one persona: answers, buys per price, objections, valueScore |

## Prompt Structure

- **Survey** – Idea + optional audience; outputs JSON with questions
- **Simulation** – Persona card, soul summary, survey, pricing; outputs JSON with answers, buys, objections, valueScore
- Retries on 429/5xx with exponential backoff
- Concurrency-limited via `LLM_CONCURRENCY` (default 5)

## Data Pipeline

1. Worker generates survey (1 LLM call per run)
2. Worker loops over sampled personas; `simulateOne` per persona (N LLM calls)
3. Raw LLM output parsed with jsonrepair; normalized to schema; retry on parse failure

## Weaknesses

- No output validation beyond schema parse
- No prompt versioning or A/B testing
- No cost tracking or budget limits per user/study
- Single retry path; no fallback model
- Persona soul updates (SOUL_UPDATE_MODE) add extra LLM calls; complexity in soulEngine

---

# 6. Infrastructure & Deployment

## Local Dev Setup

1. `docker compose up -d` (Postgres 5433, Redis 6379)
2. `npm install`, `cp .env.example .env`
3. `npx prisma migrate dev`
4. `npm run dev` (web) + `npm run worker` (worker in second terminal)

## Production Readiness

- Fly.io config (`fly.toml`): web + worker processes, volume on worker, health checks
- Standalone build (`output: "standalone"`)
- `validateProductionEnv()` checks `DATABASE_URL`, `REDIS_URL`, `DATA_ENCRYPTION_KEY_V1`, `DATA_DIR`, `LLM_API_KEY`—exits if missing
- Release command: `npx prisma migrate deploy`

## Docker Usage

- Docker Compose for Postgres and Redis only
- App runs via `npm run dev` or `node server.js`; not in Docker locally
- Fly.io uses Dockerfile for production image

## Environment Variables Required

| Variable | Required | Purpose |
|----------|----------|---------|
| DATABASE_URL | Yes | Postgres |
| REDIS_URL | Yes | Redis |
| LLM_BASE_URL | Yes | LLM API |
| LLM_API_KEY | Yes | LLM API |
| LLM_MODEL | Yes | Model name |
| DATA_DIR | Production | Run data (e.g. /data on Fly) |
| DATA_ENCRYPTION_KEY_V1 | Production (env-check) | Encryption at rest |

## Deployment Blockers

- `DATA_ENCRYPTION_KEY_V1` required in prod but not in .env.example as required
- Worker must have persistent volume; manual volume creation on Fly
- Single worker process; no horizontal scaling of worker

---

# 7. Current Problems / Technical Debt

| Category | Issue |
|----------|-------|
| **CSP** | Production CSP includes `https://accounts.google.com`; OAuth not implemented |
| **Env mismatch** | env-check requires `DATA_ENCRYPTION_KEY_V1`, `DATA_DIR`; .env.example shows optional |
| **Sample size** | UI allows up to 2000; `MAX_SAMPLE_SIZE` defaults to 500; unclear messaging to user |
| **Worker concurrency** | BullMQ worker `concurrency: 1`; one job at a time globally |
| **Billing** | Schema ready; no Stripe or plan logic |
| **Account export** | Build logs show "Account export failed"; possible runtime error |
| **Legacy tables** | Account, Session, VerificationToken unused; add migration noise |
| **Search with encryption** | DB search disabled; in-memory filter over studies |
| **No monitoring** | No APM, no error tracking service, logs to stdout only |

---

# 8. Scalability Analysis

## 100 Users

- **Likely fine** – Single Postgres, single Redis, single worker
- Rate limits (auth 20/min, studies 30/min, jobs 120/min) sufficient

## 1,000 Users

- **Risks** – Worker becomes bottleneck; queue backlog; LLM cost grows
- Postgres may need connection pooling
- Population JSONL reuse helps; disk I/O still a concern

## 10,000 Users

- **Will break** – Single worker cannot handle load
- No horizontal scaling of worker
- No read replicas for Postgres
- Redis single instance
- No CDN for static assets
- LLM cost and rate limits become critical

## Bottlenecks

1. **Worker** – One job at a time; each job = N LLM calls (N = sample size)
2. **LLM** – Concurrency cap 5; 500 personas = 500 sequential-ish calls
3. **Population generation** – Large JSONL writes; no caching across runs beyond reuse
4. **DB** – Single connection pool; no read replicas

---

# 9. Security Analysis

## Auth

- Passwords hashed with Argon2
- Session tokens hashed (SHA256) before storage
- CSRF on login/register
- httpOnly, SameSite=lax cookies
- Rate limiting on auth endpoints (20/min by IP)

## API Security

- Protected routes require session cookie
- Ownership checks (study/run/preset) enforce user isolation
- Rate limits on studies (30/min), jobs (120/min)

## Secrets Handling

- Env vars; no hardcoded secrets in repo
- `DATA_ENCRYPTION_KEY_V1` used for optional AES-256-GCM on sensitive fields

## Risks

- No brute-force protection beyond rate limit
- No account lockout
- API keys in env; no vault
- No audit of sensitive actions beyond AuditLog (no alerting)

---

# 10. Product Maturity Assessment

**Classification: MVP**

**Why:**

- Core flow (study → run → results) works end-to-end
- Auth, studies, jobs, presets implemented
- Single-user/single-tenant; no teams or orgs
- No billing, no onboarding, no analytics
- Production deploy possible but requires manual env/secrets setup
- Monitoring and observability minimal
- Not scaling-ready (single worker, no horizontal scaling)

**Not prototype** – Auth, DB, jobs, UI are production-grade patterns.

**Not production-ready** – Missing monitoring, billing, onboarding; env-check vs .env.example mismatch.

---

# 11. Missing Critical Components

| Component | Status |
|-----------|--------|
| **Logging** | Structured JSON logger; no centralized aggregation |
| **Error tracking** | None (e.g. Sentry) |
| **Monitoring** | None (APM, metrics) |
| **Onboarding** | None |
| **Billing** | Schema ready; no Stripe or plan logic |
| **Permissions** | Single-user; no roles or teams |
| **Backups** | None in app; relies on DB/infra |
| **Feature flags** | None |
| **A/B testing** | None |
| **Usage analytics** | None |

---

# 12. Code Quality Assessment

| Dimension | Score (1–10) | Explanation |
|-----------|--------------|-------------|
| **Structure** | 8 | Clear separation: app (routes), lib (logic), queue (worker). Consistent API patterns. |
| **Maintainability** | 7 | TypeScript, Zod, Prisma. Some duplicated logic; soulEngine is complex. |
| **Scalability** | 5 | Monolithic worker; no horizontal scaling; no caching layer. |
| **Readability** | 8 | Descriptive names, consistent style, moderate comments. |

---

# 13. Business Readiness Assessment

| Question | Answer |
|----------|--------|
| **Can onboard real users?** | Partially. Registration works; no onboarding flow, no email verification, no invite/approval. |
| **Can handle paying customers?** | No. Billing schema exists; no Stripe, no plans, no usage metering. |
| **Can scale safely?** | No. Single worker; no auto-scaling; no cost controls; LLM spend unmanaged. |

---

# 14. Architecture Diagram (Text)

```
┌─────────────┐     ┌──────────────────────────────────────────────┐
│   Browser   │     │              Next.js (App Router)             │
│  (React)    │────▶│  Pages: /login, /dashboard, /studies, /account│
└─────────────┘     │  API: /api/auth/*, /api/studies/*, /api/jobs  │
       │            └───────────────────────┬──────────────────────┘
       │                                    │
       │            ┌───────────────────────▼──────────────────────┐
       │            │              PostgreSQL (Prisma)              │
       │            │  User, Study, StudyRun, Response, Aggregate   │
       │            └───────────────────────┬──────────────────────┘
       │                                    │
       │            ┌───────────────────────▼──────────────────────┐
       │            │                   Redis                       │
       │            │  BullMQ queue, rate limits, locks, heartbeat  │
       │            └───────────────────────┬──────────────────────┘
       │                                    │
       │            ┌───────────────────────▼──────────────────────┐
       │            │              BullMQ Worker                    │
       │            │  Population → Sample → Survey → Simulate → Agg│
       │            └───────────────────────┬──────────────────────┘
       │                                    │
       │            ┌───────────────────────▼──────────────────────┐
       │            │         OpenAI-compatible LLM API             │
       │            │  Survey generation, persona simulation        │
       │            └──────────────────────────────────────────────┘
       │
       └───────────────────────────────────────────────────────────
                              User
```

---

# 15. Absolute Top 10 Improvements to Make Next

1. **Fix env-check vs .env.example** – Align production required vars; document `DATA_ENCRYPTION_KEY_V1` and `DATA_DIR` clearly.
2. **Add error tracking** – Integrate Sentry (or similar) for API and worker errors.
3. **Worker horizontal scaling** – Increase BullMQ worker concurrency or run multiple workers; design for N workers.
4. **Sample size UX** – Show `MAX_SAMPLE_SIZE` in UI; disable/gray out options above cap; explain limits.
5. **Remove or implement CSP Google refs** – Either remove `accounts.google.com` from CSP or implement OAuth.
6. **Implement billing** – Wire Stripe to `User.stripeCustomerId`; add plans and usage metering for studies/runs.
7. **Add monitoring** – Prometheus metrics or Fly metrics for queue depth, job duration, LLM call count.
8. **Fix account export** – Resolve "Account export failed" (build log); ensure export API works.
9. **LLM cost controls** – Per-user or per-study budget; alert or block when exceeded.
10. **Database connection pooling** – Use PgBouncer or Prisma connection limits for production load.

---

# 16. Explain This Project Like a Startup Pitch

**SynthMR** is synthetic market research. You describe your product idea and price points. We generate a fake population of hundreds of thousands of personas, sample a few hundred, and use AI to simulate how they’d answer a survey and whether they’d buy at each price. In minutes you get a willingness-to-pay curve, customer segments, top objections, and messaging angles—without running real surveys.

It’s for founders and PMs who want quick, cheap validation. Instead of paying for panels and waiting weeks, you get directionally useful insights in one sitting. We’re early: core flow works, but billing, scaling, and production hardening are still ahead.
