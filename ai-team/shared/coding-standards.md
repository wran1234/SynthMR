# SynthMR — Coding Standards

## Language and Framework Conventions

- **Language**: TypeScript (strict mode). All new files must be `.ts` or `.tsx`.
- **Framework**: Next.js 14 with App Router. Use server components by default; add `"use client"` only when client interactivity is required.
- **Runtime**: Node.js. The worker runs via `tsx` directly.
- **Package manager**: npm (lockfile committed).

## TypeScript Rules

- Enable strict mode. No `any` types except where interfacing with untyped external data (mark with `// eslint-disable-next-line` and a comment explaining why).
- Use `type` for object shapes, `interface` only when extension is expected.
- Prefer explicit return types on exported functions.
- Use Zod schemas for all API input validation. Do not rely on TypeScript types alone at runtime boundaries.
- Use `as const` for constant arrays and string unions (see `types.ts` patterns).

## API Design Rules

- All API routes live in `src/app/api/`. Follow Next.js App Router conventions (`route.ts` with exported HTTP method handlers).
- Validate all request bodies with Zod. Return `400` with a clear error message on validation failure.
- Use `requireAuth()` or `requireApiKey()` on all protected routes. Never skip auth checks.
- Use `requireStudyOwner()` for study-scoped routes to enforce ownership.
- Return consistent JSON shape: `{ data: ... }` on success, `{ error: string }` on failure.
- Use appropriate HTTP status codes: 200 (success), 201 (created), 400 (bad input), 401 (unauthenticated), 403 (forbidden), 404 (not found), 429 (rate limited), 500 (server error).
- Apply rate limiting via `rateLimit()` on public-facing and mutation endpoints.
- Log errors with structured logger (`logError`, `logInfo`, `logWarn` from `src/lib/logger.ts`). Never use `console.log` in production code.

## Database Access Patterns

- Use Prisma Client for all database operations. No raw SQL except for atomic operations that Prisma cannot express (e.g., `UPDATE ... RETURNING`).
- Always scope queries by `userId` to enforce tenant isolation.
- Use `@@index` annotations in schema for frequently queried fields.
- For large JSON fields (Response.answers, Aggregate.results), keep payloads under 100KB where possible.
- Use transactions (`prisma.$transaction`) for multi-step mutations that must be atomic.
- Run migrations via `prisma migrate dev` locally, `prisma migrate deploy` in production. Never use `db push` in production.

## Naming Conventions

- **Files**: kebab-case for all files (`survey-generator.ts`, `rate-limit.ts`). Exception: existing camelCase files (`surveyGenerator.ts`) — do not rename without migration.
- **Variables/Functions**: camelCase (`generateSurvey`, `sampleSize`).
- **Types/Interfaces**: PascalCase (`Persona`, `StudyJobPayload`).
- **Constants**: SCREAMING_SNAKE_CASE for env-derived config (`MAX_SAMPLE_SIZE`, `WORKER_CONCURRENCY`).
- **Database models**: PascalCase singular (`Study`, `StudyRun`, `Response`).
- **API routes**: kebab-case URL segments (`/api/account/api-keys`).
- **Components**: PascalCase files and exports (`KPICard`, `NavAuth`).

## Testing Expectations

- New features should include at minimum one happy-path test and one error-path test.
- Fixtures go in adjacent `.fixture.ts` files (see `chat-router.fixture.ts`).
- Test LLM-dependent code by mocking the `chat` / `chatWithLimit` functions.
- Scripts in `scripts/` serve as integration/validation tooling (`doctor.ts`, `validate-prod.ts`).

## Migration Safety Rules

- Never drop columns or tables in a single migration. Use a two-phase approach: (1) stop writing, (2) drop in a subsequent release.
- Always add new columns as nullable or with a default value.
- Test migrations against a copy of production data before deploying.
- Name migration files descriptively (Prisma auto-generates timestamps).

## Error Handling

- Wrap async operations in try/catch. Use `safeErrorMessage()` from `log-safe.ts` to sanitize error messages before logging or returning to clients.
- Never expose internal error details (stack traces, DB errors) to API responses.
- Use the `AppError` class from `errors.ts` for domain-specific errors with HTTP status codes.

## Commit Guidelines

- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`
- Scope: module name (`worker`, `auth`, `studies`, `ui`, `api`, `db`)
- Keep commits atomic: one logical change per commit.
- Example: `feat(worker): add batch processing for persona simulation`
