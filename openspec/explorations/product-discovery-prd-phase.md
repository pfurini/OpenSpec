# Deferred capability: product-discovery / PRD phase (BEFORE explore)

Status: **deferred / to-discuss.** Captured from the PRP analysis conversation. The bigger of
the two net-new capabilities — a new command (or set) that sits **before** `/opsx:explore`.

## What it is

A **problem-first, intent-before-solution** discovery phase that validates *whether and why*
to build, before any WHAT/HOW work. Its one output that really matters: a **REAL PRD** — intent,
not spec — that a downstream `explore` consumes as its starting point.

The discipline (from furiai's `writing-prds`, the target quality bar): a PRD captures
**problem + customer's job + a *falsifiable* outcome + the four product risks** (value /
usability / feasibility / viability), established **before** any solution. The named feature is
a *candidate*, not the requirement. There's a hard **gate**: no solution/implementation language
until the intent layer passes (TDD's iron-law analogy). Falsifiability test for the outcome:
*"could a competent peer reasonably argue the opposite target?"* — no "fast / intuitive / better."

## Why it's net-new (and why it's not just "explore")

OpenSpec starts at `explore`, which is the **engineering WHAT** (we deliberately made it
engineering-flavored via the `shape-spec` borrow — it rejects founder framings). Discovery is a
**different, earlier lens**: product intent, demand reality, riskiest-assumption-first. It answers
"is this worth building, for whom, measured how" — *upstream* of "what should the system do."

Pipeline this implies:

```
discovery (PRD: intent + falsifiable outcome + risks)
   → explore (engineering WHAT)  → proposal/specs  → design → tasks → harness
```

The PRD is **optional depth**: a ticket-sized, already-evidenced change skips straight to
explore. Discovery is for genuinely new product bets, not every change.

## The key output: a validated PRD

Not a spec. furiai's `writing-prds` explicitly **fails spec-shaped docs** (FR-lists, data
models, schemas, JSON, NFR tables = spec smell) and non-falsifiable metrics, via a scoreable
rubric (`prd-validation-rubric.md`). Format escalates lightest-first: lean 1-pager → Shape Up
pitch → PR/FAQ. The validation gate "always fires" — including on a PRD a spec-first tool emitted.

## Inspiration sources (verified paths — to scout deeply together)

- **furiai** (`skills/`): `writing-prds/SKILL.md` (the discipline) + `writing-prds/prd-validation-rubric.md`
  (the scoreable gate + spec-smell linter — **the output quality bar**); `challenge-spec/`
  (adversarial intent challenge). NOTE: `writing-prds` is already installed as a session skill.
- **gstack** (`.agents/skills/`): `gstack-office-hours/` — **the very first one** (user's words):
  YC Office Hours, two modes. Startup mode = six forcing questions (demand reality, status quo,
  desperate specificity, narrowest wedge, observation, future-fit); saves a design doc; runs
  *before* the plan reviews. The discovery front-door.
- **PRPs-agentic-eng** (`plugins/prp-core/commands/prp-prd.md`): problem-first interview with
  research grounding → a PRD. BUT it overloads the PRD with technical approach + implementation
  phases (the WHAT/HOW contamination we already flagged) — borrow the *discovery* front, leave
  the phases/technical out of the PRD.
- **gsd-core** (`commands/gsd/`): `ns-ideate.md`, `new-project.md`, `sketch.md`, `surface.md`,
  and the front of `discuss-phase.md`.

## Open items to discuss together

- **One command or several?** discovery / office-hours-style interview vs PRD-writer vs
  PRD-validator (rubric) — one phase or a small set?
- **The intent→engineering handoff:** how does a validated PRD feed `explore`? PRD's
  falsifiable outcome → explore's WHAT + the `shape-spec` constraints/acceptance we already added.
  Avoid re-asking what the PRD settled.
- **Where the PRD lives:** `openspec/prds/<name>.md`? Does it become a tracked artifact, or a
  thinking-record (shadow layer) like exploration notes? Does it gate proposal creation?
- **Product vs engineering framing tension:** discovery is the product lens; explore is
  engineering. Keep them distinct phases, don't blur — and keep discovery strictly opt-in.
- **Adopt the rubric directly?** Vendor/port `prd-validation-rubric.md` as OpenSpec's PRD gate?

## Relation to existing notes
- `research-grounding-capability.md` (discovery's grounding engine — demand/market evidence)
- `specialized-review-steps.md` (a PRD-validation rubric is a WHAT-review at the intent layer)
- `phase-graph-unified-model.md` (a big PRD feature → an initiative of changes downstream)
