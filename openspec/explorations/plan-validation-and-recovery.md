# Plan validation & failure recovery (the anti-brittleness capability)

Status: **brainstorm SEED, captured 2026-06-14, not started.** This note is the
re-priming record for the session that should design plan validation + failure recovery
for the opsx wave harness. Written after a live harness run on lexup
`account-profile-self-service` surfaced three consecutive *design-quality* defects, each
only at execution, each forcing a hand-fix + restart. The harness mechanics are now solid;
this note is about the layer above: **catching bad plans before they cost a run, and
recovering from the ones that slip through.**

Tags: **[CONFIRMED]** user-ratified · **[REC]** Claude's recommendation, re-confirmable ·
**[OPEN]** undecided. Most of this note is **[OPEN]** by design — it frames the brainstorm.

## 1. The trigger: the "tied to a perfect plan" treadmill [CONFIRMED diagnosis]

Running the harness end-to-end on lexup `account-profile-self-service` (claude-terminal,
static tiers, one-cycle-per-iteration loop) surfaced THREE consecutive defects — each a
*design/wave-map quality* problem, not a harness-mechanics bug, each discovered only at
execution, each requiring a human hand-fix + restart-from-scratch:

1. **Slicing.** Wave 1 reshaped an existing API (`me.setName({name})` → `{firstName,lastName}`)
   whose only caller (onboarding) was reworked in a *later* wave (3). The reshape left
   onboarding's existing test red → wave-1 gate failed. A breaking reshape of an existing API
   must ship atomically with all its callers AND their tests.
2. **Grounding.** The tasks pass invented e2e test paths (`apps/web/playwright/<x>.spec.ts`)
   when lexup's specs live under `playwright/tests/`, and named a spec file that doesn't exist.
   Ungrounded invented paths.
3. **Test-layer / skill conflict.** The coverage map routed an MDXEditor editor-INTERACTION
   scenario ("bold applied via toolbar") to the **component** layer, contradicting the project
   test-strategy skill (editor interaction → e2e; jsdom can't drive Lexical selection). The
   implementer correctly followed the coverage map (the authoritative transcribed layer) over
   the skill → jsdom `getBoundingClientRect` crash.

**The diagnosis (user-confirmed):** the harness self-fixes **code** bugs (impl iterations,
change-gate fix loop) but has **no reconciliation for structural / plan defects**. A
structural defect → gate red → `assert-waves-complete` halts → restart. Non-trivial plans
*always* carry such defects, so the harness is currently **tied to a near-perfect plan** —
a hand-patch-one-defect-per-run treadmill. The user's framing: *"with this finer separation
of execution units without a proper reconciliation path, aren't we tied to a perfect design
plan, otherwise nothing but trivial reaches the end?"* — correct.

Two clarifications that reframe (not dismiss) it:
- **The fine granularity is NOT the fragility.** Cycle seams are robust — commit-per-cycle,
  state on disk, resumable. The fragile seam is the **plan/gate level**: when a gate reveals
  the plan was structurally wrong, there is no recovery. Planning rigidity, not execution
  granularity.
- **It's a fast-fail loop, not perfect-or-nothing.** The harness *caught* all three defects
  with precise diagnoses. The pain is the lack of **recovery** (restart-from-scratch +
  hand-fix), not detection.

## 2. What's already built (don't re-invent) [CONFIRMED]

In lexup `.archon/workflows/opsx-wave-harness.yaml` + this repo's `deep-planning` schema:
- **`smoke` node** — claude-terminal, *best-effort* structured output, checks the change
  package's concrete claims (paths/symbols/repro) vs the codebase; `abort-if-stale` cancels on
  stale. Caught defect #2 (path) + a stale-worktree reuse. Did NOT catch #1 (slicing) or #3
  (test-layer) — it checks claims-vs-code, not slicing or layer consistency.
- **`classify` node** — emits `risk` + `security_critical` → which reviewers run. The existing
  classification-gating precedent.
- **`assert-waves-complete`** — halts the change-gate unless `progress.complete == total` (no
  partial-change PR). Worked: refused at 1/5 and 2/5.
- **post-PR review chain** — review-scope → review-classify (haiku) → code-review + 4
  conditional reviewers → synthesize → self-fix → simplify (the experimental fix-issue pattern).
- **3 new `deep-planning` schema rules** (committed this session): atomic-slicing,
  behavior-change-includes-its-test, ground-named-test-paths. These are *authoring-time prose
  guards* — necessary but model-judgment + fail-open; they did not (and can't alone) guarantee
  the class is gone.

The gap: validation is **same-model, best-effort, pre-execution-only, and not slicing- or
layer-aware**; recovery is **absent** for structural failures.

## 3. The two axes [REC framing]

Anti-brittleness has two complementary halves — decide both:

- **Validation (pre-execution): catch bad plans before they cost a run.** Cheaper; catches the
  common classes (slicing, grounding, test-layer). Likely removes most brittleness on its own.
- **Reconciliation (mid-execution): recover from defects that slip through.** Higher build cost;
  the real unlock for "zero human turns" on non-trivial changes.

Lean: **validation first** (cheaper, high coverage), reconciliation second. But they compose.

## 4. The open design questions (the brainstorm) [OPEN]

### 4.1 Where does validation live?
- **Pre-execution wave-map validation** (before human approval, or as a run-start gate) —
  prime candidate; the killer defects are all wave-map-level.
- **Per-wave JIT-plan checker** (before each impl, gsd-plan-checker style) — catches
  plan-self-sufficiency issues per wave.
- **Both**, at different grains?

### 4.2 What does it check?
Beyond `smoke`'s claims-vs-code: slicing atomicity (breaking change + callers + their tests in
one wave), grounding (paths/symbols exist AND match repo conventions — grep an existing peer),
**test-layer consistency with the project test-strategy skill** (the skill is authoritative for
layer choice — flag when the coverage map contradicts it), every-wave-green feasibility, design
Open-Questions, the 3 schema rules. Open: is the test-strategy skill an *input to design's layer
decision* (so they can't drift) rather than a post-hoc check?

### 4.3 Cross-model / adversarial?
A different model (codex — available archon provider, SDK-enforced structured output) catches
the authoring model's blind spots; same-model review shares them. gsd's plan-checker is
same-model; **cross-model is stronger**. `smoke` is same-model best-effort — an upgrade target.
Open: one cross-model adversary, or a small panel with distinct lenses (slicing / grounding /
test-layer)?

### 4.4 Classification-gating
Scale validation depth with risk/size/novelty (like the review chain + `task-machinery` §6)?
Trivial changes skip the deep adversarial pass; risky/large/novel get the full panel. Reuses
the existing `classify` precedent.

### 4.5 Recovery / reconciliation (the deeper half)
When validation OR a gate finds a defect, what happens?
- **(a) wave-level self-fix loop** — `gate-wN` is one-shot today; give it a bounded fix loop so
  *code* failures don't halt; only structural ones escalate.
- **(b) replan-on-failure** — a planner node re-reads the failure + diff and adjusts the failed
  wave's plan (absorb the missed migration / re-route the test layer), logged as a documented
  deviation (§4.3). The real reconciliation; `planner ⪰ implementer` exists exactly so the
  strong model does this structural reasoning.
- **(c) resume-not-restart** — re-plan the failed wave + continue, vs today's
  restart-from-scratch (expensive iteration; also: a failed run leaves a worktree the next run
  *reuses* — a clean-worktree precondition is part of this).
- **(d) adaptive human gate** (§4.3 post-v1) — unresolvable fork → push to the human, timeout →
  log-and-continue.
Open: how far does autonomous replan go before it must stop-and-ask? (Re-slicing is a design
decision — locked as human territory. Where's the line between "absorb a missed migration"
(safe) and "re-slice the change" (human)?)

### 4.6 Build order vs the v1 proof [OPEN]
Does the validator/reconciliation gate the v1 done-condition, or is it post-v1 hardening? The
README defers "adversarial cross-model wave-plan review" to hardening — but the treadmill shows
the v1 proof can't reach a green PR on a non-trivial change *without* at least validation. Likely
re-prioritize validation ahead of (or into) the v1 critical path.

## 5. Relation to other notes
- `specialized-review-steps.md` — WHAT/HOW review *panels* + dimensions + classification-gating.
  That note is about reviewing CODE/specs; this note is about validating the PLAN and recovering.
  Overlap in the panel/dimension/cross-model machinery — reuse it.
- `prompt-adherence-and-design-rewrite.md` §3 + `executable-plans-and-feedback-loop.md` §2 —
  the **grounding-lint** mechanism (`openspec lint`, Files-to-Change-exist, design Open-Questions
  gate). Mechanical, deterministic, fail-closed validation — the cheap complement to an
  adversarial AI pass. Some checks here (paths exist, slicing) may belong in the lint, not an
  agent.
- `task-machinery-and-wave-execution.md` §6 (classification → verification depth), §4.3
  (documented-deviation), §6.5 (failure/escalation), §5.2 (where in the A′ DAG nodes slot in).
- `research-grounding-capability.md` — pre-execution grounding for gray areas; a *prevention*
  cousin (handle unknowns before they bite) to this note's *detection/recovery*.

## 6. Deliverable of the brainstorm
Settle 4.1–4.6 into this note (promote SEED → settled), then update the README index + cross-refs
in `task-machinery` §6/§5.2 and `specialized-review-steps`. Likely splits into: a mechanical
grounding-lint layer (deterministic), a cross-model adversarial wave-map validator
(classification-gated), and a reconciliation policy (self-fix → replan → resume → human gate).
