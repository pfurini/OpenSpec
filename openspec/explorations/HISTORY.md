# History — one timeline, with pointers

The single historical record. Everything the old exploration notes contained is either
carried forward (NORTH-STAR, BACKLOG, ledger-and-evals) or archived in git. To read any
deleted file: `git log --oneline -- openspec/explorations/<file>` then
`git show <sha>:openspec/explorations/<file>`. The corpus was pruned in the
"explorations cleanup" commit of 2026-08-24; its parent commit holds the full set.

## Timeline

| When | What happened |
| --- | --- |
| 2026-06-10..24 | The `feat/explore-what-brainstorming` era (109 commits). Built: WHAT/HOW separation (explore + design as pure thinkers, `continue` transcribes), the `deep-planning` schema, `tasks.md` as a value-ordered TDD wave map, the JIT `wave-plan` endpoint, ADR/glossary memory layer, multi-file skill authoring. Harness on **Archon** ran a real change (lexup) end to end to draft PR #114: 3 of 4 bars met (green-gated, 0 human turns, per-wave TDD trail); bar 4 (zero undocumented deviations on a clean run) never proven. |
| 2026-06-23 | Upstream shipped the breaking **stores** architecture (#1190), colliding with feat's workspace model. |
| 2026-06-24..27 | **Option B port**: adopt stores as the base, replay feat's genuinely-new work on top → the `personal` branch. Skills-only: `src/core/command-generation/` (27 adapters) deleted. |
| 2026-06-28 | RECONSTRUCTION.md written (full story + the 17 decisions); GH#1 opened (spec-baseline reconciliation). |
| 2026-07-03..07 | Direction brainstorm: ownership floor = content (schemas + skills, not fork code); backbone = **ledger + retro**, not more machinery; steered vs automated phases; compensator annotations; the 20-item ranked backlog (START-HERE) + PLAIN-WORDS. |
| 2026-08-13 | `evict-upstream-surfaces` landed (telemetry, feedback, profiles, 3 skills). **ADR-0001 fork-sovereignty accepted**: no merge/rebase, shopping trips only. |
| 2026-08-20 | `adopt-deep-planning-as-default`: spec-driven schema evicted entirely; deep-planning is the only built-in. |
| 2026-08-21 | Package renamed `@pfurini/openspec` (bin stays `openspec`). Stores-surface trim discarded (kept whole). `make-this-fork-mine.md` refreshed. |
| 2026-08-21..22 | **First upstream shopping trip** (183 commits, fork point `65a7233f`): inventory + verdicts in `ops/upstream-shopping-2026-08.md`. **Translation layer designed** (§B2): canonical dialect = Pi; per-target adapter modules; emit matrix `.pi`/`.claude`/`.cursor`/`.agents`; Cursor dedupe experiment run (dedupes by name, `.agents` > `.cursor`, `.claude`/`.codex` not read despite docs). |
| 2026-08-22..24 | A1 adoption sweep (archive/sync fixes) run on Opus and archived (`adopt-upstream-archive-sync-fixes`). **The concept pivot** ratified: three pillars (process breadth; gradual automation with escalation; own the harness), **Archon parked**, factory rebuilt on Pi + `pi-dynamic-workflows`, ledger v2 (store-homed, three tiers), second brain named as a future consumer. Corpus pruned to 7 files. |

## The 17 locked decisions — survival status after the pivot

Full original text: `RECONSTRUCTION.md` §4 (in git). Do not re-litigate the SURVIVES rows.

| # | Decision | Status |
| --- | --- | --- |
| 1 | WHAT/HOW separation; thinkers think, `continue` transcribes | SURVIVES |
| 2 | Unit of work = right-sized change (coarsest that fits one run) | SURVIVES |
| 3 | Intra-change execution = A′ unrolled wave slots (Archon YAML) | RETIRED with Archon; execution shape to be redesigned on `pi-dynamic-workflows` (wave semantics survive via #7/#8) |
| 4 | ADRs/glossary project-owned, prompt-level lifecycle | SURVIVES |
| 5 | Git owns truth; Linear = outbound-only projection | SURVIVES (parked) |
| 6 | All agent compute on owned hardware; model choice owned | SURVIVES, strengthened (we own the harness itself now) |
| 7 | Task machinery is TDD; wave map; tests-last is a defect | SURVIVES |
| 8 | Three grains: commit = cycle, session = wave, run = change | SURVIVES |
| 9 | Planner ⪰ implementer, always | SURVIVES |
| 10 | Dynamic model routing = post-v1; static tiers first | SURVIVES |
| 11 | No parallel code-writing inside a change | SURVIVES |
| 12 | Project skills enter as recorded artifact references | SURVIVES |
| 13 | Mid-run forks = documented deviations, no interruption | SUPERSEDED by the escalation design (categorical triggers + timeouts; irreversible blocks forever) — interruption is now a feature, not a violation |
| 14 | Wave growth within K=10 allowed but flagged | SURVIVES |
| 15 | Test-layer routing: principle in OpenSpec, table per project | SURVIVES |
| 16 | Harness workflow OpenSpec-canonical, installed into `.archon/` | RETIRED in that form; reborn as the OpenSpec **Pi extension** (NORTH-STAR pillar 3) |
| 17 | impl-tier = complexity rubric + escalation; never small | SURVIVES |

## Pointer map — where deleted content went

| Deleted file | Its living successor |
| --- | --- |
| `ops/PLAIN-WORDS.md` | `NORTH-STAR.md` |
| `ops/RECONSTRUCTION.md` | this file (condensed); full text in git |
| `ops/START-HERE.md` | `BACKLOG.md` (items renumbered, sources cited) |
| `ops/process-disciplines-handoff.md` | seam catalog stays a shopping source: BACKLOG track D cites its sections via git |
| `ops/superpowers-openspec-sync.md` | superseded — superpowers is in `.refs/`, re-shopped in track D; its "do NOT port" verdicts copied to BACKLOG |
| `task-machinery-and-wave-execution.md` | decisions table above; Archon build/run trail (§10–§16) is historical, in git |
| `phase-graph-unified-model.md` | change-DAG concept survives in BACKLOG track F |
| `executable-plans-and-feedback-loop.md` | absorbed earlier into wave-plan instruction; historical |
| `design-tasks-pipeline-collapse.md` | shipped (design writes design.md directly); fidelity check owed → BACKLOG |
| `change-records-and-thinking-layer.md` | §4 shipped (ADR layer); small parked items → BACKLOG |
| `prompt-adherence-and-design-rewrite.md` | open threads → BACKLOG (lint wiring, adherence enforcement) |
| `plan-validation-and-recovery.md` | seed carried → BACKLOG track F |
| `specialized-review-steps.md` | carried → BACKLOG tracks D/F |
| `product-discovery-prd-phase.md` | promoted → BACKLOG track D (idea validation) |
| `research-grounding-capability.md` | promoted → BACKLOG track D |
| `linear-github-sync.md` | one line in BACKLOG "later" |
| `archived/multi-file-skill-generation.md` | shipped 2026-06-15; historical |

## Standing "do NOT port" verdicts (from the superpowers map, kept binding)

Superpowers' single-main-agent doctrine, its thick per-step plan format, and its
per-task manual review gate do not port — deliberate OpenSpec choices, not gaps.
