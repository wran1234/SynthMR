# SynthMR — Weekly AI Strategy Review

## Purpose

A structured weekly review process where the AI team analyzes progress, evaluates experiments, identifies friction, and generates new proposals. The review ensures the product improvement loop runs continuously rather than stalling between tasks.

---

## Schedule

Run once per week. The review follows a fixed agenda and produces concrete outputs.

---

## Review Agenda

### 1. Completed Work Review (5 min)

**Owner**: Data Insight Agent

**Actions**:
- Read `ai-team/board/done.md` for tasks completed since last review
- Summarize what was shipped and its expected impact
- Note any tasks that took longer than expected or revealed unexpected complexity

**Output**: Brief summary of shipped work with any emerging patterns.

---

### 2. Experiment Results Review (10 min)

**Owner**: Data Insight Agent

**Actions**:
- Read `ai-team/experiments/results.md` for recently concluded experiments
- For each completed experiment:
  - Was the hypothesis confirmed, rejected, or inconclusive?
  - What was the primary metric result vs. target?
  - Were there unexpected side effects?
  - What follow-up is recommended?
- Read `ai-team/experiments/active.md` for in-flight experiment status

**Output**: Experiment result summaries with follow-up recommendations written to `results.md`.

---

### 3. Product Friction Identification (10 min)

**Owner**: Data Insight Agent + Product Strategist

**Actions**:
- Analyze the codebase for friction signals:
  - Error handling patterns that suggest user-facing failures
  - Empty states or dead ends in the UI flow
  - API endpoints with missing validation or unclear error messages
  - Features that exist but are not surfaced in the UI
- Cross-reference with `project-context.md` to identify gaps vs. stated product goals
- Identify the top 3 friction points

**Output**: Friction report with evidence and severity ranking.

---

### 4. New Feature Ideas (10 min)

**Owner**: Product Strategist

**Actions**:
- Based on insights from steps 1–3, generate 1–3 new feature proposals
- Check `ai-team/experiments/proposals.md` and `ai-team/board/backlog.md` for duplicates
- Write new proposals in FP-XXX format

**Output**: New entries in `ai-team/experiments/proposals.md`.

---

### 5. New Growth Experiments (10 min)

**Owner**: Growth Experimenter

**Actions**:
- Based on insights from steps 1–3, design 1–2 new experiments
- Focus on the highest-friction user journey step identified in step 3
- Write experiments in EXP-XXX format

**Output**: New entries in `ai-team/experiments/proposals.md`.

---

### 6. Priority Stack Ranking (5 min)

**Owner**: Project Lead

**Actions**:
- Review all proposals in `proposals.md` (both existing and newly added)
- Stack-rank by value-to-effort ratio, considering:
  - Alignment with current product priorities from `project-context.md`
  - Dependencies on backlog items
  - Risk level
  - Current product stage (MVP → production SaaS transition)
- Select the next proposal to convert into an engineering task (if current task is near completion)

**Output**: Updated priority ordering in `proposals.md`. Optional: next task selected and moved to `active.md`.

---

## Review Output Template

After each weekly review, append this summary to `ai-team/experiments/results.md`:

```
## Weekly Review: [YYYY-MM-DD]

**Tasks Completed Since Last Review**: [count]
- [TASK-XXX]: [one-line summary]

**Experiments Concluded**: [count]
- [EXP-XXX]: [outcome — Confirmed/Rejected/Inconclusive]

**Top Friction Points Identified**:
1. [Friction point with evidence]
2. [Friction point with evidence]
3. [Friction point with evidence]

**New Proposals Generated**: [count]
- [FP-XXX / EXP-XXX]: [title]

**Next Experiment Selected**: [FP-XXX / EXP-XXX] or "None — current experiment still active"

**Key Insight**: [One sentence capturing the most important learning this week]
```

---

## Rules

1. The review must happen even if no tasks were completed. Inactivity is itself a signal worth analyzing.
2. All outputs must be written to the appropriate files — not just discussed.
3. The Project Lead has final authority on priority decisions.
4. The review should be concise. If a topic requires deep analysis, schedule it as a follow-up task rather than extending the review.
