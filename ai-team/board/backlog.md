# Backlog

Prioritized tasks for SynthMR. Only the Project Lead may add, reorder, or remove tasks.

---

## TASK-002: Add Error Tracking with Sentry (P0)
**Priority**: P0 — Critical
**Agent**: Senior Engineer
**Goal**: Integrate Sentry (or equivalent) for error tracking in both the Next.js web process and the BullMQ worker. Unhandled errors, API errors, and worker job failures should be captured with context.
**Acceptance Criteria**:
- [ ] Sentry SDK installed and initialized for Next.js (server + client)
- [ ] Worker process initializes Sentry independently
- [ ] API route errors are captured with request context
- [ ] Worker job failures include runId and studyId in Sentry context
- [ ] Source maps uploaded for production builds
- [ ] Environment variable `SENTRY_DSN` added to `.env.example`

---

## TASK-003: Implement Study List Pagination (P1)
**Priority**: P1 — High
**Agent**: Senior Engineer
**Goal**: The study list API currently returns up to 100 studies with no pagination. Add cursor-based pagination to `GET /api/studies` and update the frontend to support infinite scroll or page navigation.
**Acceptance Criteria**:
- [ ] API supports `cursor` and `limit` query parameters
- [ ] Response includes `nextCursor` when more results exist
- [ ] Frontend loads studies incrementally (not all at once)
- [ ] Search and filter work with pagination
- [ ] Existing study list functionality is not broken

---

## TASK-006: Implement Billing Foundation with Stripe (P1)
**Priority**: P1 — High
**Agent**: Senior Engineer
**Goal**: Wire the existing `User.stripeCustomerId`, `plan`, and `planStatus` fields to actual Stripe integration. Implement customer creation, plan selection, and basic usage metering for study runs.
**Acceptance Criteria**:
- [ ] Stripe SDK installed and configured via env vars
- [ ] New users get a Stripe customer created on registration
- [ ] Account page shows current plan and billing portal link
- [ ] Study creation checks plan limits (e.g., max studies per month)
- [ ] Webhook endpoint for Stripe events (subscription updates)
- [ ] Free tier allows limited usage without payment

---

## TASK-007: Add Structured Monitoring and Metrics (P1)
**Priority**: P1 — High
**Agent**: Senior Engineer
**Goal**: Add application metrics for queue depth, job duration, LLM call latency, and error rates. Expose a `/metrics` endpoint compatible with Prometheus or use Fly.io built-in metrics.
**Acceptance Criteria**:
- [ ] Key metrics tracked: queue depth, job processing time, LLM call count, LLM latency, error count
- [ ] Metrics accessible via endpoint or logging
- [ ] Worker heartbeat and health visible in metrics
- [ ] No performance regression from metrics collection

---

## TASK-008: Fix Account Data Export (P1)
**Priority**: P1 — High
**Agent**: Senior Engineer
**Goal**: Build logs show "Account export failed". Diagnose and fix the `GET /api/account/export` route so users can successfully export their data as required for compliance.
**Acceptance Criteria**:
- [ ] Export endpoint returns complete user data (studies, runs, responses)
- [ ] Export format is JSON with clear structure
- [ ] Large exports handle pagination or streaming
- [ ] Export works for users with zero studies
- [ ] Export works for users with many studies (50+)

---

## TASK-009: Implement User Onboarding Flow (P2)
**Priority**: P2 — Medium
**Agent**: Designer + Senior Engineer
**Goal**: New users land on the dashboard with no guidance. Design and implement an onboarding flow that guides users through creating their first study.
**Acceptance Criteria**:
- [ ] Design spec for onboarding steps and UI
- [ ] First-time user sees onboarding on dashboard
- [ ] Onboarding can be dismissed and does not reappear
- [ ] Onboarding links to study creation with helpful defaults
- [ ] Works in both light and dark mode

---

## TASK-010: Add LLM Cost Controls Per User (P2)
**Priority**: P2 — Medium
**Agent**: Senior Engineer
**Goal**: Implement per-user LLM cost tracking and budget limits. Users should be able to see their LLM usage and the system should prevent runaway costs.
**Acceptance Criteria**:
- [ ] User model tracks cumulative LLM cost
- [ ] Account page displays LLM usage summary
- [ ] Configurable per-plan budget limit
- [ ] Study run fails gracefully when user budget exhausted
- [ ] Admin can view total platform LLM spend
