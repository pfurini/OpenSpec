# Deferred capability: specialized review steps (WHAT-review + HOW-review)

Status: **deferred / to-discuss.** Captured from the PRP analysis conversation. A dimension
OpenSpec hasn't covered: dedicated, multi-dimension **review** steps, each dimension ideally a
focused subagent — applied at two distinct layers, kept separate by the WHAT/HOW line.

## What it is

Two review gates, mirroring our WHAT/HOW separation:

1. **WHAT-review** — reviews **proposal + specs** (the WHAT). Dimensions: is the problem real /
   evidenced? scope bounded? non-goals explicit? capabilities right (new vs modified)? acceptance
   **falsifiable** (no vibe words — the `shape-spec` gate we added)? spec-smell vs intent (the
   furiai PRD rubric)? requirement testability?
2. **HOW-review** — reviews the **design + tasks** (the HOW; tasks = the executable plan that
   maps to "plans" in other frameworks). Dimensions: architecture soundness, decomposition /
   bounded units / clean interfaces, dependency + parallelism correctness, error handling / silent
   failures, type design, test coverage, security, performance, simplification.

Pattern: a **panel of focused subagents**, each owning one dimension, run in parallel (or a
pipeline), findings synthesized — adversarial where it helps.

## The core discipline: distill WHAT-review from HOW-review

Most existing review skills review a **single plan file that mixes WHAT + HOW** (a PRD-plan, a
PRP, a "plan.md"). We must **split the dimensions**: pull the WHAT dimensions out for the
proposal/specs gate, the HOW dimensions out for the design/tasks gate. Don't import a mixed
"plan review" wholesale — extract and sort its dimensions by layer.

## Where it fits in OpenSpec

```
explore → proposal/specs → [WHAT-review gate] → design → tasks → [HOW-review gate] → harness
```

- WHAT-review is the analog of the PRD-validation rubric, one layer down (specs, not PRD).
- HOW-review is the analog of plan/code review, but on the *plan* (design + tasks), pre-implementation
  — catching design/decomposition defects before the harness spends worktrees on them.

## Inspiration sources (verified paths — to scout deeply together)

**Multi-dimension review panels (the pattern):**
- **gstack** (`.agents/skills/`): the review army — `gstack-plan-ceo-review/` (strategy/scope ≈
  WHAT), `gstack-plan-eng-review/` (architecture ≈ HOW), `gstack-plan-design-review/` &
  `gstack-design-review/` (design/UX), `gstack-plan-devex-review/`, `gstack-review/` (PR/code ≈
  HOW), and `gstack-autoplan/` (the **CEO→design→eng pipeline** — a sequenced multi-dim review).
  Each `*-review` is a distinct dimension → distill which are WHAT vs HOW.
- **PRPs-agentic-eng** (`plugins/prp-core/`): `commands/prp-review-agents.md` + the agent panel
  `agents/{code-reviewer,comment-analyzer,pr-test-analyzer,silent-failure-hunter,type-design-analyzer,code-simplifier,docs-impact-agent}`
  — almost all **HOW/code** dimensions (good HOW-review seed). (We also have these as
  `pr-review-toolkit:*` agents in-session.)

**WHAT-layer review:**
- **furiai** (`skills/`): `writing-prds/prd-validation-rubric.md` (scoreable WHAT gate +
  spec-smell linter), `challenge-spec/` (adversarial spec challenge).
- **claudekit** (`skills/`): `plan-review-experience/` (UX/outcome ≈ WHAT-ish), `shape-spec/`
  (the falsifiable-WHAT rigor we already borrowed); session skills `review-spec`, `senior-review`.

**HOW-layer review:**
- **claudekit** (`skills/`): `plan-review/`, `plan-review-architecture/`, `verification-gate/`.
- **gsd-core** (`commands/gsd/`): `plan-review-convergence.md`, `code-review.md`, `eval-review.md`,
  `audit-milestone.md`, `audit-fix.md`. **gsd-pi** (`src/resources/skills/`): `review/`,
  `security-review/`, `verify-before-complete/`.

## Open items to discuss together

- **Subagents vs tokensave-first rule:** review needs to *read code* — reconcile the panel
  pattern with our standing "no Explore agents for code research" rule (panels reason over a
  provided diff/artifacts, not open-ended code search — may be fine, but settle it).
- **How many dimensions, and which are load-bearing?** Avoid a bloated panel; pick the few that
  actually catch defects at each layer.
- **Gate or advisory?** Does WHAT-review *block* design until specs pass, or just report? Likewise
  HOW-review before the harness runs. (Ties to the per-unit/integration validation gates in
  `phase-graph-unified-model.md` — those are *execution* gates; these are *plan* gates.)
- **Adversarial verification:** borrow the "N skeptics try to refute each finding" pattern to
  cut false positives.
- **Artifact:** review report as a note (`openspec/reviews/<name>.md`?) or inline?
- **Distillation work itself:** the first real task is to read the mixed-plan reviewers above and
  produce the **WHAT-dimension list** and **HOW-dimension list** — do this together first.

## Relation to existing notes
- `product-discovery-prd-phase.md` (PRD validation = WHAT-review at the intent layer)
- `phase-graph-unified-model.md` (HOW-review gates the plan before the harness consumes it;
  distinct from the per-unit/integration *execution* gates)
- Builds on the `shape-spec` falsifiability gate already in explore/specs.
