# SynthMR — Architecture

## Overall System Architecture

SynthMR is a monolithic Next.js application with a separate BullMQ worker process. The frontend and API share the same codebase. Background processing (LLM calls, population generation) runs in a dedicated worker connected via Redis.

```
Browser (React) → Next.js App Router (Pages + API Routes)
                       ↓                    ↓
                  PostgreSQL (Prisma)    Redis (BullMQ)
                                             ↓
                                     BullMQ Worker
                                         ↓
                                 OpenAI-compatible LLM API
```

## Tech Stack

| Layer        | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend    | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS  |
| UI Libs     | Recharts, Framer Motion, Lucide React, Sonner, next-themes   |
| Backend     | Next.js API routes (App Router)                               |
| Database    | PostgreSQL 16 (pgvector image) + Prisma ORM                  |
| Jobs        | Redis 7 + BullMQ                                              |
| LLM         | OpenAI-compatible API (configurable base URL, key, model)     |
| Auth        | Email/password, Argon2, DB-backed sessions, httpOnly cookies  |
| Validation  | Zod                                                           |
| Infra       | Docker Compose (local), Fly.io (production)                   |

## Backend Structure

### API Routes (`src/app/api/`)

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/csrf`
- **Studies**: CRUD at `/api/studies`, `/api/studies/[id]`, run at `/api/studies/[id]/run`
- **Results**: `/api/studies/[id]/results/[runId]`
- **Jobs**: `/api/jobs/[jobId]` (polling)
- **Presets**: `/api/presets` (audience presets)
- **Account**: `/api/account` (profile, export, delete), `/api/account/api-keys`, `/api/account/webhooks`
- **Public API v1**: `/api/v1/studies`, `/api/v1/runs` (API key auth)
- **Health**: `/api/health`, `/api/ready`, `/api/worker-health`
- **Chat**: `/api/studies/[id]/runs/[runId]/chat` and `/chat/stream`

### Core Library (`src/lib/`)

- `llm.ts` — OpenAI-compatible adapter with retry, backoff, concurrency limiting, streaming
- `surveyGenerator.ts` — LLM-based survey generation from business idea
- `simulateResponses.ts` — LLM-based persona survey simulation
- `aggregateResults.ts` — Segment analysis, WTP curves, objection aggregation
- `personaGenerator.ts` — Synthetic persona attribute generation
- `populationStore.ts` — JSONL population management, stratified sampling
- `soulEngine.ts` — Persona "soul" (values, fears, motivations) generation and evolution
- `session.ts`, `password.ts`, `require-auth.ts` — Auth infrastructure
- `csrf.ts`, `csrf-client.ts` — CSRF protection
- `rate-limit.ts` — Redis-based rate limiting
- `redis-lock.ts` — Distributed locks
- `api-key.ts` — API key creation and validation
- `webhooks.ts` — Webhook delivery
- `chat-service.ts`, `chat-router.ts`, `chat-context.ts` — Chat functionality
- `prisma-encrypt.ts` — Optional AES-256-GCM encryption at rest
- `logger.ts` — Structured JSON logging

### Queue System (`src/queue/`)

- `connection.ts` — Redis connection for BullMQ
- `client.ts` — Queue definition and job enqueue
- `worker.ts` — Job processor: population → sample → survey → simulate → aggregate

## Frontend Structure

### Pages (`src/app/`)

- `/` — Root (redirect)
- `/login`, `/register` — Auth pages
- `/dashboard` — Overview with KPIs
- `/studies` — Study list with search/sort/filter
- `/studies/new` — Study creation form
- `/studies/[id]` — Study detail, run history, results
- `/studies/[id]/report` — Report view
- `/account` — Profile management
- `/status` — System health
- `/agents` — Agent playground
- `/docs` — API documentation pages

### Components (`src/components/`)

- `ui/` — Base components: Button, Card, Dialog, Input, Select, Badge, etc.
- `auth/` — NavAuth, UserMenu, SignOutButton
- `account/` — AccountActions
- `agents/` — PlaygroundClient
- Top-level: Breadcrumbs, KPICard, MarkdownViewer, ProgressStepper, SegmentDetailsPanel, Skeleton, ThemeProvider, ThemeToggle

## Database Layer

### ORM: Prisma with PostgreSQL

### Key Models

- **User** — id, email, name, passwordHash, stripe fields (plan, planStatus)
- **AuthSession** — DB-backed sessions (tokenHash, expiresAt)
- **Study** — ideaText, geography, industry, pricePoints, targetAudienceJson, status
- **StudyRun** — seed, populationMode, sampleSize, status, jobId, LLM usage tracking
- **Survey** — Generated questions (JSON)
- **Response** — answers, buys (per price), objections, valueScore
- **Aggregate** — Final results (segments, WTP, objections, experiments)
- **SampledPersona** — Links run to persona folders on disk
- **SoulEdit** — Soul update history
- **ChatThread / ChatMessage** — Conversational interface for results
- **ApiKey** — Hashed API keys with scopes
- **WebhookEndpoint** — User-configured webhooks
- **AudiencePreset** — Saved target audiences
- **AuditLog** — Action audit trail

### Relationships

- User → Studies, AudiencePresets, AuthSessions, AuditLogs, ChatThreads, ApiKeys, WebhookEndpoints
- Study → StudyRuns, ChatThreads
- StudyRun → Survey, Responses, Aggregates, SampledPersonas, ChatThreads

## Data Flow

1. **Study creation**: `POST /api/studies` → DB insert → `POST /api/studies/[id]/run` → BullMQ job enqueued
2. **Worker processing**: Fetch job → generate/reuse population (JSONL) → stratified sample → generate survey (1 LLM call) → simulate each persona (N LLM calls) → aggregate results → DB write
3. **Client polling**: Poll `/api/jobs/[jobId]` for progress → fetch results from `/api/studies/[id]/results/[runId]`
4. **Chat**: User sends message → context snapshot of study results loaded → LLM streaming response

## Deployment

- **Local**: `docker compose up -d` (Postgres + Redis), `npm run dev` + `npm run worker`
- **Production**: Fly.io with Dockerfile, web + worker processes, persistent volume for worker data
- **Release**: `npx prisma migrate deploy` as release command
