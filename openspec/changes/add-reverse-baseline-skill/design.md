# Design — Reverse-engineer a spec baseline from a brownfield codebase

## Context

OpenSpec specs are **behavioral intent**: capability → `### Requirement:` (SHALL statements) →
`#### Scenario:` (WHEN/THEN). Code is **mechanism**: it states what the system *currently does*,
including bugs and accidental behavior. Recovering the former from the latter is inference, and the
inference is lossy. This design optimizes for *faithful drafts under human review*, not autonomous
correctness, and encodes the honest limits as non-goals rather than hiding them.

## Goals

- Get a brownfield repo from "no specs" to a **reviewable draft baseline** quickly.
- Maximize faithfulness within the limits of inference (test-first, confirmed-only, per-capability).
- Keep the deterministic parts deterministic (inventory, scaffolding, validation) and isolate the
  judgment to an agent skill.

## Non-Goals (explicit limits)

- **Not authoritative.** Output is a draft; every file is banner-marked and requires human ratification.
- **Not idempotent across runs.** LLM extraction is non-deterministic; re-running yields different
  drafts. Only the *deterministic* helpers (`scan`, `scaffold`) are idempotent.
- **No autonomous whole-repo dump.** Extraction is gated per capability by a human.
- **Does not invent intent.** Behavior the skill cannot confirm from tests/docs/code is recorded as
  an open question (`> TODO(reverse): …`), never fabricated into a requirement.
- **Does not distinguish bugs from intent.** Where current behavior may be a bug, the skill flags it
  for the reviewer instead of silently codifying it as a SHALL.

## Decision 1 — Skill (agent-driven), not a monolithic command

The core work is "read code/tests/docs and infer intent," which requires model judgment — the same
reason `openspec-sync-specs` is an agent skill. A pure TS command would have to embed an LLM call and
would lose the conversational, capability-at-a-time ratification loop that makes output trustworthy.

So: an **agent skill** does the inference; **deterministic CLI helpers** do the mechanical work the
skill must not improvise (file enumeration, capability heuristics, scaffolding, validation). This
split keeps the trustworthy parts reproducible and the fuzzy part reviewable.

## Decision 2 — Test-first signal priority

Faithfulness hinges on the source signal. Priority order:

1. **Tests** — executable, intent-bearing, already encode edge cases and error paths. Best oracle.
2. **README / `docs/**` / ADRs** — state the WHY and intended behavior in prose.
3. **Implementation code** — fallback only; richest in detail but most contaminated by HOW and bugs.

The skill leads each capability from tests/docs and uses code to fill gaps, not the reverse.

## Decision 3 — Capability-at-a-time with human ratification

`reverse scan` proposes a heuristic capability map (top-level modules/dirs, cross-checked against
existing `openspec/specs/`). The skill presents it via `AskUserQuestion`; the human confirms/edits
boundaries before any extraction. Then each capability is drafted, scaffolded, written, and validated
individually. This bounds context (large repos don't fit in one pass) and gives the human a natural
review checkpoint per unit.

## Decision 4 — `reverse scan` is read-only and deterministic

`scan` walks the working tree honoring `.gitignore` plus a vendored/generated ignore set
(`node_modules`, `dist`, `vendor`, `*.generated.*`, lockfiles, etc.), classifies files as
source/test/doc, detects language by extension, and emits JSON: file inventory, detected intent
sources, and candidate capability groupings with rough file counts. No network, no LLM, no writes —
safe to run repeatedly and in CI.

## Decision 5 — `reverse scaffold` owns file creation; the skill owns content

The skill never hand-rolls the file skeleton. `scaffold <capability>` writes a canonical
`openspec/specs/<capability>/spec.md` with a Purpose placeholder, a `## Requirements` section, and a
draft banner comment. It is idempotent and refuses to clobber an existing non-empty spec without
`--force`. The skill then fills requirements/scenarios and runs `openspec validate`.

## Key risks (carried from the feasibility discussion)

| Risk | Mitigation |
|---|---|
| Codifying bugs as requirements | Flag uncertain/"is-this-intended?" behavior for the reviewer; never silent SHALL. |
| Wrong altitude (mirrors code / too coarse) | Test-first framing + per-capability human ratification; banner invites altitude edits. |
| Capability decomposition is subjective | Heuristic map is a *proposal*; human confirms boundaries before extraction. |
| Context limits on large repos | `scan` chunks by capability; skill processes one unit at a time. |
| Cross-chunk inconsistency / dedup | Validate after each capability; skill checks against already-written specs before adding. |
| Non-reproducibility | Scoped as a non-goal; only deterministic helpers are idempotent. |
| Noise (dead/vendored/generated code) | `scan` ignore set + `.gitignore`; flagged file classes excluded from signal. |

## Open questions

- Should `scan`'s capability heuristic be pluggable per language/ecosystem, or a single generic
  top-level-module heuristic for v1? (Lean: generic for v1.)
- Do we wrap `openspec validate` as `openspec reverse validate`, or just call the existing command?
  (Lean: reuse existing `openspec validate`; no new surface.)
