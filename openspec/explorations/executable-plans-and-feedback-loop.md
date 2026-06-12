# Deferred capability: executable plans + the implementation feedback loop

Status: **partially absorbed (2026-06-12)** — §1's content spec now lands in the
**wave-plan instruction** and the "fatten tasks.md or sibling artifact" open item is
RESOLVED (neither: two-level queue — wave map + committed JIT `plans/wave-N.md`); §3's
report gains routing calibration. See `task-machinery-and-wave-execution.md` §4/§6.4.
Original status: **deferred / to-discuss.** Captured from the archon-dev analysis (the workflow Archon
uses to plan and ship its own features — `archon/.claude/skills/archon-dev/`, esp.
`cookbooks/plan.md` and `cookbooks/implement.md`). This is the concrete **content spec for the
deferred rich task-builder** (phase-graph build-order #4) plus a post-execution feedback loop
OpenSpec lacks entirely.

## 1. The self-sufficiency standard (what tasks must contain to be harness-consumable)

archon-dev's plan gate: **NO_PRIOR_KNOWLEDGE_TEST** — *"could an agent unfamiliar with this
codebase implement using ONLY the plan?"* Our `tasks.md` says "reference specs and design",
which works for an interactive session but NOT for an autonomous worktree run that starts
cold. For the Archon model (one run per change, fresh context), the plan must carry its own
context. What archon-dev's plan artifact has that our design+tasks don't:

- **Mandatory Reading table** — P0/P1/P2 files with line ranges + *why* ("pattern to MIRROR",
  "types to IMPORT", "tests to EXTEND"). The implementing agent reads these before any task.
- **Patterns to Mirror** — *actual copy-pasted code snippets* with `SOURCE: file:lines`, not
  descriptions. (Implement phase re-verifies them and adapts if they drifted — anti-stale.)
- **Files to Change table** — CREATE/UPDATE/DELETE + justification, validated to exist.
- **Per-task fields** — each task carries: Action, Details, **Mirror** (file:lines),
  Imports, **Gotcha**, **Validate** (a per-task executable command). Tasks are atomic and
  independently verifiable.
- **Leveled Validation Commands** — type-check → lint → unit → full → db → manual; detected
  from the project (lockfile → runner), not hardcoded. = the per-unit gate declaration.
- **Confidence score** (1-10 for one-pass implementation success) + Complexity — later
  compared against reality (see §3).

Mapping into OpenSpec: these are *extensions to the tasks artifact* (or a sibling
`plan`-grade artifact) emitted by design+task-builder. The deep-planning `tasks` instruction
already demands dependency ordering; this adds the **context payload** that makes a task
list executable cold.

## 2. Plan pre-flight validation (grounding lint — anti-drift)

Before saving, archon-dev validates the plan itself: every Files-to-Change path exists (or
parent dir for CREATE), every cited pattern still matches the codebase, every task has a
validation step, acceptance criteria testable, no circular task deps. OpenSpec's `openspec
validate` checks spec *format*; nothing checks that design/tasks are *grounded in the actual
codebase*. This is a natural `openspec` check (or a HOW-review dimension — see
`specialized-review-steps.md`) and the same drift concern as the shadow-layer note.

## 3. The implementation report + assessment-vs-reality (the closed loop)

archon-dev's implement phase ends with a **report artifact** (`reports/<slug>-report.md`):
- **Assessment vs Reality** — predicted vs actual complexity/confidence, with reasoning.
- **Deviations from plan** — documented with WHAT/WHY (deviation ≠ silent divergence).
- Validation results, files changed, tests written, open items.
- Plan archived to `plans/completed/`; source PRD's phase table flipped to `complete`.

Then **review reads the report**: documented deviations are treated as *intentional* and only
*undocumented* deviations get flagged. That's a closed feedback loop OpenSpec doesn't have —
`apply` ticks checkboxes but emits no report; `archive` doesn't compare predicted vs actual;
nothing distinguishes intentional deviation from drift.

Report enrichment (from claudekit's incremental-shipping "refactor with evidence"): refactor
tasks carry **before/after evidence in the report** — test-suite output captured before and
after the structural change, plus perf numbers when the code is hot-path ("perf not measured;
cold path" stated explicitly otherwise). Behavior preservation is proved by deltas in the
artifact, never claimed.

Mapping into OpenSpec / the harness model:
- The unit workflow's final node writes the **unit report** into `$ARTIFACTS_DIR` (and/or the
  change dir) — the orchestrator's merge decision and the integration gate consume it.
- `apply` (interactive path) gains a lightweight report step; `archive` gains the
  assessment-vs-reality comparison (cheap retro signal that improves future estimates).
- HOW-review (the deferred review step) becomes **artifact-aware**: read plan + report first;
  flag only undocumented deviations.

## 4. Smaller borrows worth noting

- **Per-cookbook "suggest the next step" chaining** (research→investigate→prd→plan→implement→
  commit→pr) — OpenSpec's `continue` does this via the artifact graph; the borrow is the
  *handoff sentence* each command ends with (we already do this in explore/design — keep it).
- **Artifact taxonomy** (`prds/ plans/ plans/completed/ reports/ reviews/ research/ debug/`)
  — OpenSpec has `changes/ explorations/`; if research-grounding and review steps land, their
  artifacts need homes (`openspec/research/`, `openspec/reviews/` — or project-owned dirs,
  per the ADR/glossary location lesson).
- **Project detection over hardcoding** (lockfile → runner; read the repo's CLAUDE.md for
  conventions) — already our style; keep it for gate-command detection.

## Convergent evidence: Archon's ralph `prd.json` (added 2026-06)

Archon's stock `archon-ralph-dag` consumes a work-queue file whose story schema is, almost
field-for-field, this note's §1: `id`, `title`, `description` (user-story form),
`acceptanceCriteria[]`, `technicalNotes`, `dependsOn[]`, `priority`, `passes` (durable
completion state), `notes`. Its loop protocol also implements §3 live: per-task validation
before a per-task commit, `progress.txt` appended per iteration with **Files changed /
criteria verified / Learnings**, and a `## Codebase Patterns` section that future
fresh-context iterations read first. The harness consumer's contract for the rich
task-builder therefore already exists — design the tasks output to satisfy it.
(See `phase-graph-unified-model.md` → "Intra-change execution".)

## Open items to discuss together

- Where does the context payload live: fatten `tasks.md`, or a distinct executable-plan
  artifact between design and tasks? (Schema change either way; affects deep-planning.)
  **Sharpened by the ralph evidence:** the harness path wants a prd.json-shaped
  `tasks.json` (machine work queue with dependsOn/acceptance/state); the human path wants
  `tasks.md`. One source, two views — or JSON generated at handoff. Undecided.
- Are Mandatory Reading / Patterns-to-Mirror produced by `/opsx:design` (it already reads the
  code) or by the task-builder pass? Design already cites `path:line` — the delta is snippets
  + per-task wiring.
- Report format + home for the harness path vs the interactive `apply` path — one format?
- Does assessment-vs-reality feed anything automatic (e.g. right-sizing calibration for the
  split litmus in `phase-graph-unified-model.md`), or stay a human retro signal?

## Relation to existing notes
- `phase-graph-unified-model.md` — §1 is the content spec for build-order #4 (task DAG →
  Archon nodes); §3's unit report feeds the orchestrator's merge + integration gate.
- `specialized-review-steps.md` — §2 plan-lint is a HOW-review dimension; §3 makes HOW-review
  artifact-aware.
- `change-records-and-thinking-layer.md` — §2 is the same anti-drift concern, applied to plans.
