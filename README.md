# SynthMR – Synthetic Market Research

MVP web app that lets you enter a business idea and price points, then simulates market research using a synthetic population and AI-driven survey responses. Outputs target segments and willingness-to-pay.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js route handlers
- **DB**: PostgreSQL (Docker) + Prisma ORM
- **Jobs**: Redis + BullMQ (Docker)
- **LLM**: OpenAI-compatible API (env-configured; no vendor lock-in)

## Prerequisites

- Node.js 18+
- Docker and Docker Compose (for Postgres and Redis)

## Setup

### 1. Start Postgres and Redis

```bash
docker compose up -d
```

### 2. Install dependencies and env

```bash
npm install
cp .env.example .env
# Edit .env and set LLM_BASE_URL, LLM_API_KEY, LLM_MODEL (e.g. OpenAI or any compatible API)
```

> Security warning: never commit `.env`. Keep secrets only in local `.env` for development and use platform-managed secrets in production.

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to **Login** if not signed in.

### 5. Auth (email + password)

Sign-in uses **email and password** (no OAuth or magic links). On first use:

1. Open **Login** and switch to the **Register** tab.
2. Enter email, password (min 10 characters), and optional name.
3. Click **Create account**. You are signed in and redirected to the dashboard.
4. Use **Login** tab to sign in later. Sessions are stored in the database and use httpOnly cookies; optional `SESSION_DAYS=30` in `.env` controls expiry.

### 6. Start the background worker (required to run studies)

In a **second terminal**:

```bash
npm run worker
```

Keep this running while you run studies. The worker generates the synthetic population, samples personas, calls the LLM for survey responses, and aggregates results.

## Run a study

1. **Sign in** (Login with email and password, or Register to create an account).
2. Go to **New Study**.
3. Enter your **business idea** (e.g. “A subscription app that curates weekly meal plans for busy parents”).
4. Set **Geography** (US only for MVP) and optional **Industry**.
5. Enter **3 price points** (e.g. 9, 19, 49).
6. Optionally set **Sample size** (100–2000; default 250; MAX_SAMPLE_SIZE env caps for safety).
7. Click **Run Study**.
8. You’re redirected to the study page; the run is **queued** then **running**. Progress is shown.
9. When the run **completes**, the dashboard shows:
   - Purchase probability by price (chart)
   - Top 5 segments (with size estimate, purchase probability per price, objections, messaging angle)
   - Key objections
   - Next experiments

## Study management

SynthMR is **single-user**: all studies and runs belong to you. No teams or organizations.

- **Studies list** ([`/studies`](http://localhost:3000/studies)): View all your studies with **search** (by idea text), **sort** (newest / oldest), and **filter** by status (running / completed / failed). Each card shows title, created date, target audience, population mode, sample size, and status. Use **New Study** to go to the creation form.
- **Study detail** (`/studies/[id]`): **Duplicate study** creates a new study with the same config (idea, geography, industry, target audience, population mode, price points, sample size); runs and results are not copied. **Delete study** removes the study and all its runs and results (with confirmation).
- **Run history**: On the study page, a table lists each run (run id, started/finished time, sample size, population mode/size, status). You can **View results**, **Rerun** (same parameters), or **Delete run** (removes that run’s responses and aggregates; the study remains). Delete run is confirmed in a dialog.

All endpoints enforce ownership: you can only access, duplicate, delete, or rerun your own studies and runs.

## Saved audience presets

On the **New Study** page, under **Target audience**:

- **Preset** dropdown includes built-in options (General population, College students, etc.) and a **Saved** group populated from your saved presets.
- **Save current audience as preset**: Enter a name and click **Save preset**. The current audience (built-in, custom, or a previously saved preset) is stored and appears under **Saved** for reuse. Presets are per-user and private.

API: `GET /api/presets` (list), `POST /api/presets` (create; body: `name`, `targetAudienceJson`), `DELETE /api/presets/[id]` (delete). All require sign-in and enforce ownership.

## Env vars

See `.env.example` for the full list with inline documentation. Variables are categorized as:

**Required (all environments):**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (Docker uses host port 5433: `postgresql://synthmr:synthmr@localhost:5433/synthmr`) |
| `LLM_API_KEY` | API key for the LLM provider |

**Required in production (defaults work for local dev):**

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string for BullMQ job queue |
| `DATA_DIR` | `~/synthmr-data` | Base directory for population data; populations go in `DATA_DIR/populations` |

**Recommended in production (optional everywhere):**

| Variable | Description |
|----------|-------------|
| `DATA_ENCRYPTION_KEY_V1` | 32-byte key (base64 or hex) for AES-256-GCM encryption at rest. Generate: `openssl rand -base64 32`. If unset, data stored in plaintext. |
| `CRON_SECRET` | If set, `GET /api/cron/cleanup` requires `Authorization: Bearer <CRON_SECRET>` |
| `WORKER_HEALTH_TOKEN` | If set, secures `GET /api/worker-health` in production |

**Optional (all have sensible defaults):**

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base URL |
| `LLM_MODEL` | `gpt-4o-mini` | Model name |
| `LLM_CONCURRENCY` | `5` | Max concurrent LLM calls |
| `POPULATION_SIZE` | `200000` | Population size (set to 1000000 for full runs) |
| `POPULATION_REUSE` | `true` | Reuse existing population file for same geography+size |
| `MAX_SAMPLE_SIZE` | `500` | Cap on sample size per run |
| `SOUL_UPDATE_MODE` | `off` | `off`, `rare`, or `on` (full) |
| `SESSION_DAYS` | `30` | Session cookie expiry in days |
| `DATA_RETENTION_DAYS` | `90` | Delete runs older than N days |
| `RUN_TIMEOUT_MINUTES` | `30` | Worker marks run failed if it exceeds this |

**Env validation**: On startup in production, the app validates that required vars (`DATABASE_URL`, `LLM_API_KEY`, `REDIS_URL`, `DATA_DIR`) are set. Recommended vars (`DATA_ENCRYPTION_KEY_V1`, `CRON_SECRET`, `WORKER_HEALTH_TOKEN`) trigger a warning if missing but do not block startup. In local dev, only `DATABASE_URL` and `LLM_API_KEY` are validated. Auth is email/password with DB-backed sessions; no OAuth or email provider required.

**Rate limiting** (Redis-based): Job polling is limited to 120 requests/min per user; study create/run to 30/min per user. When exceeded, the API returns `429` with `{ error: "rate_limited", retryAfterSeconds }` and a `Retry-After` header. The study page backs off on 429 and uses adaptive polling (2s during active phases, 4s when aggregating or progress stalls).

## Production (Fly.io)

Deploy web and worker to Fly.io with managed Postgres (Neon/Supabase), Upstash Redis, and a Fly volume for persistent run data.

### One app, two processes

- **Web**: Next.js (`node server.js`) — HTTP on port 8080.
- **Worker**: BullMQ (`npm run worker`) — processes study jobs; uses persistent volume at `/data`.

Same codebase and image; `fly.toml` defines `[processes]` and mounts the volume for both web and worker.

### Deploy steps

1. **Create the app** (if not already):
   ```bash
   fly launch --no-deploy
   ```
   Set app name (e.g. `synthmr`) and region. You can edit `app` in `fly.toml` instead.

2. **Create persistent volume** (used by web + worker; same region as app):
   ```bash
   fly volumes create synthmr_data --size 10 --region <region>
   ```
  Use the same region as your app (e.g. `ord`, `lax`). The volume is mounted at `/data` for **both web and worker** processes (see `[[mounts]]` in `fly.toml`). Set `DATA_DIR=/data` (already in `fly.toml` [env]).

3. **Secrets and env**  
   Set secrets (sensitive) with `fly secrets set`; non-sensitive can go in `fly.toml` [env]. See **Production env checklist** below.

4. **Deploy**:
   ```bash
   fly deploy
   ```
   This builds the image, runs **Prisma migrations** via `release_command`, then starts web and worker machines. Migrations run once per deploy in a temporary VM (no volume); they only need `DATABASE_URL`.

5. **Run migrations manually** (optional, if you need to run them outside deploy):
   ```bash
   fly ssh console
   npm run migrate:deploy
   exit
   ```

### Production env checklist

Set these via `fly secrets set` (or `[env]` in `fly.toml` for non-secrets):

**Required secrets** (fatal if missing):

| Secret / env | Description |
|--------------|-------------|
| `DATABASE_URL` | Postgres URL (Neon or Supabase connection string) |
| `REDIS_URL` | Redis URL (e.g. Upstash Redis) |
| `DATA_DIR` | `/data` (set in fly.toml; mounted for both web and worker) |
| `LLM_API_KEY` | LLM API key |

**Recommended secrets** (warn if missing, startup continues):

| Secret / env | Description |
|--------------|-------------|
| `DATA_ENCRYPTION_KEY_V1` | 32-byte key (base64/hex) for encryption at rest. Strongly recommended. Optional `DATA_ENCRYPTION_KEY_V2` for rotation. |
| `CRON_SECRET` | Secures `GET /api/cron/cleanup` |
| `WORKER_HEALTH_TOKEN` | Secures `GET /api/worker-health` |

**Optional** (have sensible defaults):

| Secret / env | Default | Description |
|--------------|---------|-------------|
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base URL |
| `LLM_MODEL` | `gpt-4o-mini` | Model name |
| `RUN_TIMEOUT_MINUTES` | `30` | Worker run timeout |
| `DATA_RETENTION_DAYS` | `90` | Cleanup job retention |
| `SESSION_DAYS` | `30` | Session expiry in days |

Ensure any **file paths stored in the DB** (e.g. population paths) are **absolute and under `DATA_DIR`** so both web and worker can resolve them on Fly.

### Production checklist

Before going live, verify:

- Required secrets are set via Fly secrets (`DATABASE_URL`, `REDIS_URL`, `LLM_API_KEY`, `DATA_DIR`) and `.env` is not present on servers.
- Recommended secrets are set for hardened security (`DATA_ENCRYPTION_KEY_V1`, `CRON_SECRET`, `WORKER_HEALTH_TOKEN`). Missing recommended vars will log warnings but not block startup.
- `DATA_DIR` volume is mounted at `/data` for both `web` and `worker` processes.
- `npx prisma migrate deploy` succeeds during release.
- `GET /api/health` and `GET /api/ready` return healthy statuses.
- Dev-only debug routes are disabled in production (`/api/debug/session` returns 404).

Run:

```bash
npm run doctor
```

### Health and status

- **`/api/health`** — Public; no auth. Returns DB/Redis (and optional worker) status. Used by Fly HTTP checks and load balancers.
- **`/status`** — Requires sign-in; full status dashboard.

## Security

- **Encryption at rest**: When `DATA_ENCRYPTION_KEY_V1` is set (32 bytes, base64 or 64-char hex), sensitive fields are encrypted with AES-256-GCM before being stored: `Study.ideaText`, `Study.targetAudienceJson`, `Aggregate.results`, `AudiencePreset.targetAudienceJson`. Decryption is applied transparently when reading via the Prisma layer. Generate a key: `openssl rand -base64 32`.
- **Data retention**: `DATA_RETENTION_DAYS` (default 90) controls how long run data is kept. A daily cleanup job (e.g. `GET /api/cron/cleanup` with optional `Authorization: Bearer <CRON_SECRET>`) deletes study runs (and their responses/aggregates) older than the retention period. Run it via cron or a scheduler.
- **Ownership**: All study, run, preset, and export APIs enforce per-user ownership; users can only access or delete their own data. Account deletion (`DELETE /api/account` with body `{ "confirm": true }`) removes the user and all associated data (studies, runs, presets, audit logs).
- **Logs**: Application and worker logs do not include idea text, persona JSON, or survey answers; error messages that might contain sensitive content are redacted.
- **Audit**: Key actions (study create/delete, run start/delete) are recorded in `AuditLog` for accountability.
- **CSRF**: Login and register use a double-submit cookie (CSRF token in cookie + `x-csrf-token` header). Session cookie is httpOnly and SameSite=lax.

## Project layout

```
SynthMR/
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── jobs/[jobId]/route.ts   # Job status (polling)
│   │   │   ├── presets/
│   │   │   │   ├── route.ts            # GET / POST presets
│   │   │   │   └── [id]/route.ts       # DELETE preset
│   │   │   └── studies/
│   │   │       ├── route.ts            # GET (list) / POST (create)
│   │   │       ├── [id]/route.ts       # GET / DELETE study
│   │   │       ├── [id]/duplicate/route.ts  # POST duplicate study
│   │   │       ├── [id]/run/route.ts   # Start study run (enqueue job)
│   │   │       ├── [id]/runs/[runId]/route.ts  # DELETE run
│   │   │       └── [id]/results/[runId]/route.ts  # Get run results
│   │   ├── page.tsx                    # New Study form (with presets)
│   │   ├── studies/page.tsx            # Studies list (search, sort, filter)
│   │   ├── studies/[id]/page.tsx       # Study detail, run history, duplicate/delete
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── llm.ts                     # OpenAI-compatible LLM adapter
│   │   ├── types.ts                   # Persona, age buckets, etc.
│   │   ├── personaGenerator.ts        # Seeded synthetic population
│   │   ├── populationStore.ts         # Write/read JSONL + stratified sample
│   │   ├── surveyGenerator.ts         # Generate survey from idea
│   │   ├── simulateResponses.ts       # LLM survey + pricing per persona
│   │   └── aggregateResults.ts        # Segments, WTP curve, objections
│   └── queue/
│       ├── connection.ts
│       ├── client.ts                  # BullMQ queue
│       └── worker.ts                  # Study run job processor
├── data/
│   └── populations/                  # JSONL files (created at runtime)
├── .env.example
└── README.md
```

## Scripts

- **Check population file**: Stream a JSONL and print read/repaired/skipped metrics. Healthy files show `repaired=0 skipped=0`.
  ```bash
  npm run check-population -- /path/to/pop.jsonl
  ```
  Or: `npx tsx scripts/checkPopulation.ts /path/to/pop.jsonl`

- **Doctor (hygiene + production safety)**:
  ```bash
  npm run doctor
  ```
  Checks `.env` hygiene, required env presence, `DATA_DIR` availability, debug route production guard, and Fly mount assumptions.

## Secret rotation note (if a secret is leaked)

1. Revoke/rotate at provider first (LLM, DB, Redis, SMTP, etc.).
2. Update Fly secrets immediately:
   ```bash
   fly secrets set DATABASE_URL=... REDIS_URL=... LLM_API_KEY=... DATA_ENCRYPTION_KEY_V1=...
   ```
3. Redeploy:
   ```bash
   fly deploy
   ```
4. Invalidate active sessions if auth/session material may be impacted.
5. Audit logs and recent deploys for exposure window.

## Notes

- **Population**: Personas generated deterministically; default size 200k (POPULATION_SIZE). POPULATION_REUSE reuses files for same geography+size. Path stored in Postgres. (default `~/synthmr-data/populations`, outside the repo). Only the file path is stored in Postgres. Use `.cursorignore` and keep population data outside the project so Cursor doesn’t index huge files.
- **Sampling**: Up to 2000 (capped by MAX_SAMPLE_SIZE, default 500). Default sample 250. Stratified by income, age, state.
- **LLM**: One call per persona, compact prompts (~4k chars), LLM_CONCURRENCY=5. Retries on 429/5xx. SOUL_UPDATE_MODE=off by default.
- **Cost**: Default sample 250, 10-question survey. Use gpt-4o-mini for affordable runs.

## Agent API

SynthMR provides an API-first layer for AI agents under `/api/v1/*`.

### API keys

- Create/revoke keys in **Account** page.
- Keys are shown once at creation.
- Only a key hash is stored server-side.
- Use either:
  - `Authorization: Bearer smk_...`
  - `x-api-key: smk_...`

### Endpoints

- `POST /api/v1/studies`
- `GET /api/v1/studies/:id`
- `POST /api/v1/studies/:id/runs`
- `GET /api/v1/runs/:id`
- `GET /api/v1/runs/:id/results`
- `POST /api/v1/runs/:id/chat`

### Webhooks

Manage webhook endpoints in **Account** page.

Events:

- `run.completed`
- `run.failed`

Deliveries are signed with HMAC SHA-256:

- Header: `X-SynthMR-Signature: sha256=<hex>`
- Retries: up to 3 attempts per delivery

### OpenAPI

- `GET /api/openapi.json`

### Quickstart + Playground

- `GET /agents` — Agent Quickstart with copyable cURL/TS/Python examples
- `GET /agents/playground` — interactive API Playground (requires `ENABLE_API_PLAYGROUND=true`)

### SDK starter

- `sdk/typescript/index.ts`
- `sdk/typescript/README.md`

### Example curl

```bash
curl -X POST "https://your-synthmr-domain.com/api/v1/studies" \
  -H "Authorization: Bearer smk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaText": "AI pricing copilot for indie SaaS",
    "geography": "US",
    "industry": "SaaS",
    "pricePoints": [19,39,79]
  }'
```

```bash
curl -X POST "https://your-synthmr-domain.com/api/v1/studies/<studyId>/runs" \
  -H "Authorization: Bearer smk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"sampleSize":250}'
```

## Agent Integrations

### ChatGPT Custom Action (OpenAPI)

1. Point your Custom Action/OpenAPI import to:
   - `https://your-synthmr-domain.com/api/openapi.json`
2. Configure auth header:
   - `Authorization: Bearer <API_KEY>`
3. Use actions in sequence:
   - create study -> start run -> poll run -> fetch results -> chat run

### LangChain-style wrapper

- TypeScript starter: `sdk/typescript/langchain-tool.ts`
- Python starter: `sdk/python/langchain_tool.py`

These wrappers expose tool-friendly functions:

- `create_study`
- `start_run`
- `get_results`
- `chat_run`

### n8n-style workflow

1. HTTP Request node: `POST /api/v1/studies`
2. HTTP Request node: `POST /api/v1/studies/:id/runs`
3. Either:
   - Poll `GET /api/v1/runs/:id` until terminal status, or
   - Subscribe webhook and wait for `run.completed` event
4. Fetch `GET /api/v1/runs/:id/results`
5. Optional: `POST /api/v1/runs/:id/chat` for follow-up analysis

### Webhook signature verification example

Node.js:

```ts
import crypto from "crypto";

function verifySynthmrSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}
```

## Agent Platform Integration

### ChatGPT Custom Action checklist

1. Copy OpenAPI URL:
   - `https://your-synthmr-domain.com/api/openapi.json`
2. Configure auth:
   - `Authorization: Bearer YOUR_API_KEY`
3. Paste your API key from `/account`.
4. Test this flow:
   - `POST /api/v1/studies` -> `POST /api/v1/studies/:id/runs` -> `GET /api/v1/runs/:id/results`

### MCP / tool discovery endpoints

- `GET /api/tools/manifest` — tool list with descriptions, required scopes, input/output schemas.
- `GET /api/tools/schema` — stable machine-readable tool schema export.

### Minimal curl quickstart

```bash
curl -X POST "https://your-synthmr-domain.com/api/v1/studies" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaText":"AI pricing copilot for indie SaaS",
    "geography":"US",
    "industry":"SaaS",
    "pricePoints":[19,39,79]
  }'
```

## Troubleshooting

- **“Job not found”**: Ensure the worker is running (`npm run worker`).
- **LLM errors**: Check `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` in `.env`.
- **DB connection**: Ensure `docker compose up` has started Postgres and that `DATABASE_URL` matches.
- **Cursor slow or indexing forever**: (1) Open the `SynthMR/` folder only, not a parent. (2) Use `.cursorignore` (see repo root) so `data/`, `*.jsonl`, `node_modules`, etc. aren’t indexed. (3) Set `DATA_DIR` to a path outside the repo (e.g. `~/synthmr-data`) so 1M JSONL files aren’t inside the project. Restart Cursor (Cmd+Q, reopen) after adding `.cursorignore`.
