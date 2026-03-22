# SynthMR — Continuous Product Improvement Loop

## Purpose

This document defines the repeating process by which the AI team observes product state, generates improvement ideas, tests them through experiments, and feeds results back into the next cycle.

The loop follows: **Observe → Analyze → Hypothesize → Experiment → Implement → Learn → Repeat.**

---

## Loop Structure

### Phase 1: Observe (Data Insight Agent)

**Trigger**: After any task moves to `done.md`, after any experiment concludes, or during weekly strategy review.

**Actions**:
1. Read `ai-team/board/done.md` to analyze recently completed work
2. Read `ai-team/experiments/results.md` to analyze experiment outcomes
3. Inspect the codebase for signals: error patterns, TODO density, test coverage gaps
4. Review product architecture for emerging bottlenecks or scaling risks

**Output**: Insight reports written to `ai-team/experiments/results.md` (if experiment-related) or presented during the weekly strategy review.

---

### Phase 2: Analyze (Data Insight Agent → Product Strategist)

**Trigger**: After Phase 1 produces new insights.

**Actions**:
1. Data Insight Agent summarizes findings with evidence and confidence levels
2. Product Strategist reads insights and identifies product opportunities
3. Product Strategist cross-references with `project-context.md` goals and `backlog.md` priorities

**Output**: Identified opportunity areas documented as input for Phase 3.

---

### Phase 3: Hypothesize (Product Strategist + Growth Experimenter)

**Trigger**: After Phase 2 identifies opportunities.

**Actions**:
1. Product Strategist generates feature proposals using the FP-XXX format
2. Growth Experimenter designs experiments using the EXP-XXX format
3. Both write proposals to `ai-team/experiments/proposals.md`
4. Proposals must include: problem statement, expected impact, success metrics, and complexity estimate

**Output**: New entries in `ai-team/experiments/proposals.md`.

---

### Phase 4: Select (Project Lead)

**Trigger**: New proposals exist in `proposals.md`, or during weekly strategy review.

**Actions**:
1. Project Lead reviews all proposals in `proposals.md`
2. Evaluates each by: value-to-effort ratio, alignment with current priorities, risk, and dependencies
3. Selects the highest-value proposal for implementation
4. Moves the selected proposal from `proposals.md` → `active.md`
5. Creates an engineering task using `task-template.md`
6. Assigns the task to the appropriate agent(s)
7. Adds the task to `board/in-progress.md`

**Constraints**:
- Only ONE experiment may be active at a time (unless explicitly overridden)
- Only the Project Lead may convert proposals to tasks

**Output**: One active experiment in `active.md`, one engineering task in `in-progress.md`.

---

### Phase 5: Implement (Senior Engineer / Designer)

**Trigger**: Task assigned by Project Lead.

**Actions**:
1. Assigned agent reads the task specification, coding standards, and architecture docs
2. Implements the feature or experiment following the acceptance criteria
3. Produces an implementation report using the standard output format
4. Hands off to QA for review

**Output**: Implementation report, code changes, handoff to QA.

---

### Phase 6: Validate (QA Reviewer)

**Trigger**: Implementation report submitted.

**Actions**:
1. QA Reviewer tests against acceptance criteria
2. Verifies no regressions
3. Approves or rejects with specific fix requirements

**Output**: QA review report. If approved, task moves toward done.

---

### Phase 7: Learn (Data Insight Agent)

**Trigger**: QA approves; experiment is live or feature is deployed.

**Actions**:
1. If experiment: monitor success metrics for the defined duration
2. Collect results and compare against hypothesis thresholds
3. Write experiment result to `ai-team/experiments/results.md`
4. Move experiment from `active.md` to `results.md`
5. Move engineering task from `in-progress.md` to `done.md`
6. Summarize key learnings and unexpected findings

**Output**: Experiment result entry in `results.md`, task completion in `done.md`.

---

### Phase 8: Repeat

**Trigger**: Phase 7 completes.

**Actions**:
1. Learnings from Phase 7 feed into the next Phase 1 observation cycle
2. Product Strategist and Growth Experimenter read new results
3. New proposals generated based on updated understanding
4. The loop continues

---

## System Rules

1. **Only the Project Lead may convert experiments into engineering tasks.** Product agents propose; the lead decides.
2. **Only one experiment may run at a time** unless explicitly approved by the Project Lead for concurrent testing.
3. **All experiments must define success metrics** with specific thresholds before implementation begins.
4. **Experiment results must be recorded** in `results.md` before new iterations of the same experiment begin. No "just try again" without learning.
5. **Engineers and Designers follow shared documentation.** No ad-hoc changes outside the task scope.
6. **All decisions are recorded** in board files and experiment files for institutional memory.

---

## File Locations

| File | Purpose | Maintained By |
|------|---------|--------------|
| `ai-team/experiments/proposals.md` | New ideas waiting for selection | Product Strategist, Growth Experimenter |
| `ai-team/experiments/active.md` | Currently running experiment | Project Lead |
| `ai-team/experiments/results.md` | Completed experiments with outcomes | Data Insight Agent |
| `ai-team/board/backlog.md` | Engineering task queue | Project Lead |
| `ai-team/board/in-progress.md` | Active engineering task | Project Lead |
| `ai-team/board/done.md` | Completed engineering tasks | Project Lead |
