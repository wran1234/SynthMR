# Experiment & Feature Proposals

New feature ideas and growth experiments proposed by AI agents. The Project Lead reviews and selects proposals for implementation.

Proposals are added by the Product Strategist and Growth Experimenter. The Project Lead converts selected proposals into engineering tasks via the experiment-to-task pipeline.

---

# Feature Proposals

## FP-001: Comparative Study Mode — Run Multiple Ideas Side by Side

**Opportunity**: Users currently run one study at a time and must manually compare results across separate studies. There is no built-in way to test competing ideas against the same population.

**User Problem**: Founders and PMs often have 2–3 variations of a product concept and want to know which resonates best. Running separate studies and mentally comparing results is error-prone and time-consuming.

**Proposed Feature**: Add a "Compare" mode where a user submits 2–3 idea variants with the same audience and price points. The system runs them against the same sampled population and produces a side-by-side comparison view: WTP curves overlaid, segment overlap analysis, and a "winner" recommendation with confidence intervals.

**Expected Impact**:
- User value: Dramatically faster concept validation; reduces decision paralysis
- Business value: Higher engagement per session; natural upsell for larger sample sizes
- Scale: Large

**Complexity**:
- Engineering effort: Medium — reuses existing survey/simulation pipeline; needs new comparison aggregation logic and a comparison results page
- Design effort: Medium — comparison chart layout, winner callout component
- Dependencies: None beyond current infrastructure

**Priority**: P1

**Evidence / Rationale**: Comparative testing is the #1 use case for real market research. Every competing tool (Wynter, UserTesting) emphasizes comparisons. SynthMR's synthetic approach makes this uniquely cheap to deliver since the same population can be reused.

**Success Metric**: 30% of active users create at least one comparative study within 30 days of launch.

---

## FP-002: Study Templates — Pre-Built Research Scenarios

**Opportunity**: The study creation page requires users to write a business idea from scratch. New users face a blank textarea with no guidance on what makes a good study input.

**User Problem**: First-time users don't know how to frame their business idea for optimal LLM analysis. They write vague descriptions ("an app for food"), get mediocre results, and churn.

**Proposed Feature**: Add a template gallery on the New Study page with 8–12 pre-built scenarios: "SaaS pricing validation," "Consumer app concept test," "B2B feature prioritization," "Marketplace supply/demand test," etc. Each template pre-fills ideaText with a well-structured example, sets appropriate audience/industry defaults, and includes a brief explanation of what insights to expect.

**Expected Impact**:
- User value: Reduces time-to-first-study; improves result quality through better inputs
- Business value: Higher activation rate; reduces first-session churn
- Scale: Medium

**Complexity**:
- Engineering effort: Low — static data, UI changes to new study page only
- Design effort: Low — template card grid, pre-fill logic
- Dependencies: None

**Priority**: P1

**Evidence / Rationale**: The dashboard empty state already nudges users to "Create your first study," but provides no scaffolding. Templates are the standard onboarding pattern for tools like Typeform, Notion, and Figma.

**Success Metric**: Users who select a template complete their first study at 2x the rate of users who start from blank.

---

## FP-003: Shareable Study Reports — Public Report Links

**Opportunity**: Study results are locked behind authentication. Users cannot share findings with team members, investors, or stakeholders without giving them account access.

**User Problem**: A founder runs a study and wants to share the WTP curve and segment analysis with a co-founder or investor. Currently they must screenshot or manually copy data. This is a dead end for collaboration and viral growth.

**Proposed Feature**: Add a "Share" button on the study results page that generates a read-only public link (UUID-based, no auth required). The link shows a polished report view with WTP charts, segments, objections, and messaging recommendations. Include a "Powered by SynthMR" footer with a CTA to sign up.

**Expected Impact**:
- User value: Easy sharing with stakeholders; professional-looking reports
- Business value: Viral growth loop — every shared report is a SynthMR ad; attribution drives sign-ups
- Scale: Large

**Complexity**:
- Engineering effort: Medium — new public route, UUID token generation, report rendering without auth
- Design effort: Medium — polished report layout for external consumption
- Dependencies: Report page (`/studies/[id]/report`) already exists; extend it

**Priority**: P1

**Evidence / Rationale**: Shareable outputs are the primary growth loop for tools like Loom, Miro, and Canva. SynthMR's report-centric output is perfectly suited for this. The report page already exists — it just needs a public access layer.

**Success Metric**: 15% of completed studies generate a share link; 5% of share link visitors sign up within 7 days.

---

## FP-004: Persona Deep-Dive — Interactive Persona Explorer

**Opportunity**: Study results show aggregate segments but individual personas are opaque. The "soul" system generates rich persona profiles that are not surfaced in the UI.

**User Problem**: Users want to understand *why* specific segments behave the way they do. Aggregate data says "25–34 year olds in urban areas are price-sensitive" but users want to read the actual reasoning: what are their fears, values, and decision-making patterns? This depth differentiates synthetic research from a simple spreadsheet.

**Proposed Feature**: Add a Persona Explorer panel on the study results page. Users can click a segment to see sampled personas within it, each with their soul profile (values, fears, motivations), survey answers, and purchase decision reasoning. Include filtering by segment, price point response, and objection type.

**Expected Impact**:
- User value: Deep qualitative insight; feels like reading real interview transcripts
- Business value: Major differentiator; drives "aha moments" that convert trial users to paying
- Scale: Large

**Complexity**:
- Engineering effort: Medium — persona data exists in disk/DB; needs API endpoint and UI component
- Design effort: High — persona card design, filter interactions, segment drill-down UX
- Dependencies: `personaStore.ts` and `soulEngine.ts` already generate this data

**Priority**: P2

**Evidence / Rationale**: The soul engine is SynthMR's most unique technical asset but its output is invisible to users. Surfacing it creates a "wow" moment that no competitor can easily replicate.

**Success Metric**: Users who access Persona Explorer view 3x more study detail pages; NPS/satisfaction score increase for studies where explorer is used.

---

## FP-005: Study Run History Comparison — Track Idea Evolution

**Opportunity**: Users can rerun studies with the same parameters, but there is no way to compare results across runs to track how changes in idea description or audience affect outcomes.

**User Problem**: A PM refines their product pitch over several iterations and reruns the study each time. They want to see: "Did changing the value prop from 'saves time' to 'reduces stress' improve WTP at the $19 price point?" Currently they must open two tabs and manually compare.

**Proposed Feature**: Add a "Compare Runs" view on the study detail page. Users select 2–3 runs and see a diff-style comparison: WTP curves overlaid with delta annotations, segment shifts highlighted, objection frequency changes, and a natural-language summary of what changed and why (generated by the chat LLM using both run results as context).

**Expected Impact**:
- User value: Makes iterative research actionable; directly answers "did my change help?"
- Business value: Increases runs-per-study (engagement); demonstrates ongoing value of the platform
- Scale: Medium

**Complexity**:
- Engineering effort: Medium — aggregation comparison logic, chart overlay, LLM-generated diff summary
- Design effort: Medium — comparison layout, delta indicators
- Dependencies: Chat system already exists for LLM-based analysis of results

**Priority**: P2

**Evidence / Rationale**: The study detail page already shows run history in a table. The data for comparison already exists. This is a high-value feature built on existing infrastructure with relatively low incremental effort.

**Success Metric**: 20% of studies with 2+ runs use the comparison view; average runs-per-study increases by 40%.

---

# Growth Experiments

## EXP-001: Guided First Study — Replace Empty Dashboard with Interactive Wizard

**Experiment Name**: First-Study Wizard

**Hypothesis**: If we replace the empty dashboard state with a 3-step interactive wizard (pick a template → customize → run), then first-study completion rate will increase by 40%, because users currently drop off at the blank New Study page due to uncertainty about what to enter.

**Variants**:
- Control: Current empty dashboard with "New Study" button that links to `/studies/new`
- Treatment: Inline 3-step wizard on dashboard: (1) pick from 4 idea templates, (2) adjust audience and price points with smart defaults, (3) one-click run

**Success Metric**:
- Primary: First-study completion rate (% of new users who complete at least one study run within first session) — target: +40% relative improvement
- Secondary: Time-to-first-study (minutes from registration to first run start) — target: <5 minutes
- Guardrail: Study result quality (measured by non-empty segments in aggregate) — must not decrease

**Implementation Plan**:
1. Create a `FirstStudyWizard` client component in `src/components/`
2. Modify `src/app/dashboard/page.tsx` to render wizard when `totalStudies === 0`
3. Wizard step 1: Template selection grid (4 pre-built scenarios with icons)
4. Wizard step 2: Editable idea text, pre-filled audience, price points with sliders
5. Wizard step 3: Confirm and run (calls existing study create + run APIs)
6. Track wizard start, step completion, and study creation events

**Estimated Impact**:
- Reach: 100% of new users
- Confidence: High — empty-state wizards are a proven activation pattern
- Effort: Medium

**Duration**: 2 weeks after implementation (measure 50+ new user cohort)

**Rollback Plan**: Remove wizard component; revert dashboard to current empty state.

---

## EXP-002: Results Email Summary — Send Key Findings When Study Completes

**Experiment Name**: Completion Email

**Hypothesis**: If we send an email with key study findings (top WTP price, best segment, top objection) when a study completes, then 7-day return rate will increase by 25%, because users currently must remember to check back for results and many don't return.

**Variants**:
- Control: No email; user sees results only by returning to the app
- Treatment: Automated email with 3 key metrics, a chart preview (static image), and a CTA link to full results

**Success Metric**:
- Primary: 7-day return rate (% of users who visit the app within 7 days of study completion) — target: +25% relative improvement
- Secondary: Results page views per completed study — target: +30%
- Guardrail: Unsubscribe rate — must stay below 5%

**Implementation Plan**:
1. Add email sending infrastructure (Resend or AWS SES via env config)
2. Add `emailOptIn` field to User model (default true, nullable migration)
3. Extend webhook delivery in `src/lib/webhooks.ts` to trigger email on `run.completed`
4. Create email template with key metrics extracted from Aggregate.results
5. Add unsubscribe link and preference toggle in Account page

**Estimated Impact**:
- Reach: 100% of users who complete a study
- Confidence: Medium — requires email infrastructure not yet built
- Effort: High

**Duration**: 3 weeks after implementation (measure 100+ completed study cohort)

**Rollback Plan**: Disable email sending; remove webhook trigger. No data loss.

---

## EXP-003: Social Proof Banner — Show Aggregate Platform Stats on Landing

**Experiment Name**: Social Proof Stats

**Hypothesis**: If we display aggregate platform statistics ("X studies run, Y personas simulated, Z insights generated") on the login/register page, then registration conversion will increase by 20%, because social proof reduces uncertainty for new visitors evaluating whether to try the tool.

**Variants**:
- Control: Current login/register page with no platform statistics
- Treatment: Add a subtle stats bar below the registration form: "Join [N] researchers. [M] studies completed. [K]M personas simulated."

**Success Metric**:
- Primary: Registration conversion rate (% of login page visitors who complete registration) — target: +20% relative improvement
- Secondary: Time-on-page before registration — target: decrease (faster decision)
- Guardrail: Login page load time — must not increase by more than 100ms

**Implementation Plan**:
1. Create a `/api/stats/public` endpoint that returns cached, rounded platform totals (total users, total studies, total personas sampled) — no auth required
2. Cache stats in Redis with 1-hour TTL to avoid DB load
3. Add a `PlatformStats` component to `src/app/login/page.tsx` and `src/app/register/page.tsx`
4. Style consistent with existing design system (muted text, subtle divider)

**Estimated Impact**:
- Reach: 100% of unauthenticated visitors
- Confidence: Medium — depends on having enough stats to be impressive
- Effort: Low

**Duration**: 2 weeks (measure 200+ visitor cohort)

**Rollback Plan**: Remove stats component from login/register pages; delete API endpoint.

---

## EXP-004: Quick Rerun with Twist — One-Click Variant Testing

**Experiment Name**: Rerun with Twist

**Hypothesis**: If we add a "Rerun with a twist" button on the study results page that lets users modify one variable (price points OR audience OR idea wording) and instantly rerun, then runs-per-user will increase by 50%, because the current rerun flow requires navigating back to study creation and re-entering all parameters.

**Variants**:
- Control: Current "Rerun" button that reruns with identical parameters
- Treatment: "Rerun with a twist" button that opens an inline editor showing current parameters with one highlighted for modification, plus a "What if I..." prompt suggestion

**Success Metric**:
- Primary: Runs per user per week — target: +50% relative improvement
- Secondary: Studies with 2+ runs (%) — target: +30%
- Guardrail: Run success rate — must not decrease

**Implementation Plan**:
1. Add a `RerunWithTwist` client component to the study detail page (`src/app/studies/[id]/page.tsx`)
2. Component shows current study config in an editable card with one field highlighted (rotate: price points → audience → idea text)
3. "What if I charged $29 instead of $19?" style prompt auto-generated from current config
4. Submit calls existing `/api/studies/[id]/run` with modified parameters
5. After completion, link to FP-005 (run comparison) if available, or show delta summary

**Estimated Impact**:
- Reach: 100% of users who complete at least one study
- Confidence: High — reduces friction on highest-value action
- Effort: Medium

**Duration**: 2 weeks (measure 50+ users with completed studies)

**Rollback Plan**: Remove the twist component; revert to standard rerun button.

---

## EXP-005: Chat Prompt Starters — Reduce Blank-Chat Abandonment

**Experiment Name**: Chat Prompt Starters

**Hypothesis**: If we show 4 suggested prompt starters in the chat interface ("What's my best price point?", "Who's my ideal customer?", "What are the top objections?", "How should I position this?"), then chat engagement rate will increase by 60%, because users currently see an empty chat box after viewing results and don't know what to ask.

**Variants**:
- Control: Current empty chat input with placeholder text
- Treatment: 4 clickable prompt starter chips above the chat input, contextually generated from the study results

**Success Metric**:
- Primary: Chat engagement rate (% of users who view results AND send at least one chat message) — target: +60% relative improvement
- Secondary: Messages per chat session — target: +2 additional messages on average
- Guardrail: Chat response quality (no increase in nonsensical or off-topic responses) — spot check

**Implementation Plan**:
1. Modify the chat component that renders on study results pages
2. When chat thread is empty, render 4 prompt chips based on Aggregate.results: best price point question, segment question, objection question, positioning question
3. Clicking a chip fills the chat input and auto-sends
4. After first message, chips disappear (standard chat UX)
5. Chip text generated from aggregate metadata (e.g., "Why do 45–54 year olds object to $49?")

**Estimated Impact**:
- Reach: 100% of users who view study results
- Confidence: High — prompt starters are proven in ChatGPT, Perplexity, and similar tools
- Effort: Low

**Duration**: 1 week (measure 30+ users who view results)

**Rollback Plan**: Remove prompt chips; revert to current empty chat state.
