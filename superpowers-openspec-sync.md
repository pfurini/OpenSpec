# Superpowers ↔ OpenSpec sync map

Bidirectional analysis of the **superpowers** `personal`-branch changes (20 commits since
`896224c`, the `upstream/main` merge-base — excluding the just-committed `060b2dd`) against
**OpenSpec**'s deep-planning skills + schema. Companion to `process-disciplines-handoff.md` and
`RECONSTRUCTION.md`.

**Method.** Each item is scored on two axes so the verdict is precise, not binary:

- **OpenSpec state** — **(a)** actually *encoded* in `schemas/skills/*` or `schema.yaml`; **(b)**
  *specced* in `process-disciplines-handoff.md` but **not yet encoded** (verdict = "execute the
  handoff," not "done"); **(c)** *untouched*.
- **Destination** (forward ports route to one of three, not "OpenSpec" monolithically) —
  **THINK** (`openspec-explore` / `openspec-design`), **SCHEMA** (the `deep-planning` artifact
  contract / `wave-plan`), **HARNESS** (the emitted Archon workflow / `apply` execution).

**Reverse filter** (OpenSpec → superpowers): syncs back only if **general / harness-agnostic /
zero-dependency**; anything Archon- / wave-harness- / deep-planning-schema- / CLI-coupled does not.

---

## 0. Already cross-pollinated — do NOT re-litigate

- **ADR-FORMAT.md / GLOSSARY-FORMAT.md** — bidirectionally aligned (superpowers `1d828ba` pulled
  OpenSpec's refinements; OpenSpec's `references/*` already carry them). State **(a)** both sides.
- **Brainstorming thinking content** — `grilling.md` (recommend-an-answer / root-before-leaves /
  check-code-before-asking), `spec-format.md` (falsifiable constraints, ban vibe words),
  `codebase-grounding.md` (read-don't-recall, `file:line`) are **already encoded** in
  `openspec-explore` + `openspec-design` (the interview disciplines, "Pin the given constraints,"
  "check the code before you ask," Context cited by `path:line`). State **(a)**. *Not a port gap.*
- **The local review loop + bias-accounting + rubric lens** — already synced superpowers-side in
  `060b2dd` (itself a reverse-sync from this session's OpenSpec review work). Excluded by request.

---

## 1. superpowers → OpenSpec / harness

| # | superpowers mechanism (commit) | OpenSpec state | Destination | Verdict |
|---|---|---|---|---|
| 1 | **Falsification spine** — claim-type→falsifier routing, boundary-assumptions register, cold-start, oracle classification, "review is not the falsifier" (`ddcfcdb`, `5dd63dd`) | **(b)** — adjacent pieces encoded (falsifiable constraints, stress-test scenarios, check-the-code, per-scenario test layers), but the routing table / register / cold-start / oracle-classification are **not** | THINK + SCHEMA + HARNESS | **PORT — execute the handoff** (§2.A/C/D/F). The single highest-value forward port. |
| 2 | **Multi-lens independent plan review** — coverage (always) / architecture (conditional) / experience (conditional) / codex, scored 0–10, consolidated `[both]`-consensus, skip-with-rationale (`a955187`, `c33b684`) | **(c)** — `openspec-design` has only a **self**-review (Flow step 8); no *independent* design/plan review exists | THINK (a design-review gate) + HARNESS (§2.F fan-out) | **PORT — strong.** This is the deferred "specialized-review panel." The three lenses transcribe almost directly onto `design.md` (coverage↔design sections, architecture↔Components/Data-flow, experience↔consumer surface). |
| 3 | **De-risk-first spike (Phase 0) + cold-start tasks** — spike *before* the plan commits; first-run/bootstrap tasks (`6ab9557` writing-plans) | **(b)** — partially (wave-0 tracer exists, but not a boundary-assumption de-risk wave nor a cold-start section) | SCHEMA (design wave skeleton) | **PORT via handoff** (§2.A/D de-risk wave before dependents; §2.C cold-start). |
| 4 | **Risks-and-Rollback** — per-task one-line rollback; irreversible → `NOT POSSIBLE` + flag for architecture review (`6ab9557`) | **(a) partial** — `design.md` has change-level Risks/Migration-Rollback, but not *per-wave* rollback nor the irreversible→flag rule | SCHEMA (design Wave Skeleton / Risks) | **PORT (light).** Add per-wave rollback annotation + irreversible→flag; the arch-review hook pairs with #2. |
| 5 | **One-pass confidence score** in self-review (`6ab9557`) | **(c)** — design self-review has 8 completeness checks, no confidence score | THINK (design self-review) | **PORT (light).** Cheap calibration signal; "below ~7, close the gap now." |
| 6 | **receiving-code-review discipline** — verify-before-implement, VERIFY = the *type-appropriate falsifier*, no performative agreement, push-back-with-reasoning, YAGNI-check, one-at-a-time (`a869862` lineage) | **(b)** — specced as adjudication / verify-don't-perform (§2.F.6, §2.I.6d); **not** in `verify-change` | HARNESS (review loop) + THINK (verify-change) | **PORT — high.** The bias-sink for the review loop. `verify-change` today has no *reception* discipline at all. |
| 7 | **executing-plans execution discipline** — self-review (completeness/quality/discipline/testing/falsification), simplify pass, done=exercised (negative paths + outside-harness + cross-check-ask), progress ledger, model-selection, systematic-debugging routing, throwaway-isolation, reviewer-prompt-construction (no pre-judging / copy constraints verbatim) (`3fffdea`, `f9f0dcb`, `96ab466`, `9c8e7c7`) | **split** — wave-plan instruction encodes self-sufficiency/Mirror/Validate/no-scope/behavior-includes-test/documented-deviation **(a)**; review-gate/simplify/ledger/idempotency are **(b)** (§2.F/§2.H); `apply-change` manual skill is **thin (c)** | mostly HARNESS; some THINK (`apply-change`) | **ROUTE, don't bulk-port** (see §3). Autonomous-execution discipline → harness (§2.F/§2.H). Enrich manual `apply-change` with **self-review + done=exercised + falsification self-check** only; leave review-gate/ledger/model-selection to the harness. |
| 8 | **Pre-flight plan-conflict scan + undischarged-boundary-assumption blocker** (`3fffdea`) | **(a) partial** — tasks-transcription STOPs on design gaps; **(b)** for the boundary-assumption blocker (= #1) | THINK (`apply-change`) | **PORT (light)** — a pre-execution scan in `apply-change`; the boundary half is subsumed by #1. |
| 9 | **base-ref freshness before worktree** — fetch origin, warn unpushed, FF behind, ask on diverged (`d98033d`) | **(c)** — Archon owns worktree lifecycle; not expressed | HARNESS (worktree-create node) + §2.I.4 | **PORT to harness**, not a skill. Pairs with the finish/branch-base seed (§2.I.4). |
| 10 | **codebase-grounding artifact format** — present-tense, ≤300 lines, 5 sections, "hand-to-teammate" test (`d28a55b`) | **(a) partial** — OpenSpec says "check the code / Context `path:line`" but doesn't formalize the artifact | THINK (explore/design Prime) | **OPTIONAL (light).** Minor formalization; OpenSpec's grounding is already a stance. Low priority. |

---

## 2. OpenSpec → superpowers (sync back)

All pass the reverse filter (general / harness-agnostic / zero-dependency). These are disciplines
**discovered OpenSpec-side this session** (provisioner retro, GSD, the review architecture) that
sharpen superpowers' *own* skills without importing any OpenSpec-novel machinery.

| # | OpenSpec-side discipline (origin) | superpowers state | Destination (superpowers) | Verdict |
|---|---|---|---|---|
| A | **Entity-state checklist `[RETRO #5b]`** — nullable? unique? empty? duplicate? missing? stale? per external entity, before the lookup/guard (provisioner Phase-3) | absent — `brainstorming` falsification verifies *shape*, not *state* | `brainstorming` (falsification) + `executing-plans` (Step 2 self-review) | **SYNC BACK — strong.** Directly sharpens the discipline superpowers itself authored; "verify the contract" was too soft. |
| B | **General retro guards** — parity → round-trip property test; mechanical guard for invariants no behavioral gate sees + **fire-the-guard test**; complete-the-sweep → **enumeration guard**; blast-radius (rename spans tiers / new-guard false-positive) (provisioner retro) | partial — `executing-plans` has done=exercised + no-oracle; lacks the four guard patterns | `executing-plans` (done-check) + `writing-plans` (Risks/spike) | **SYNC BACK.** Generic engineering disciplines, zero-dependency. |
| C | **code-complete ≠ proven** — "unproven until executed" branch state + runbook + flagged PR (provisioner #9) | partial — superpowers has no-oracle "unproven until run"; not the close-out state/runbook | `finishing-a-development-branch` | **SYNC BACK (light).** |
| D | **Maturity-tiered research-gating** — gray-area enumeration (≥2 viable options) → research at a depth tier (full / standard / minimal_decisive); conditional recs (GSD) | partial — `grilling` interviews, but no explicit research-depth dial | `brainstorming` (grilling) | **SYNC BACK (optional).** Fits grilling; medium value. |
| E | **Bias-accounting tail** — terminate on *adjudicated* severity not raw count; union-for-recall / consensus-for-precision; per-lens precision tracking (§2.F.6) | **partially synced** in `060b2dd` (loop + adjudication core); the precision-ledger / union-vs-consensus framing not yet | `requesting-code-review` / `review-loop.md` | **MOSTLY DONE; remainder optional.** |

---

## 3. Does NOT cross — architectural divergence (with why)

These look like gaps but are **deliberate** — porting them would fight each framework's design.

- **superpowers' single-main-agent doctrine** ("main agent writes; only read-only delegated",
  `96ab466`) → **does not go to the harness.** OpenSpec's harness is autonomous, *multi-session-
  per-wave*; the wave model *requires* fresh-context sub-sessions writing code. The doctrine is
  right for superpowers (harness-agnostic manual execution) and fine for OpenSpec's *manual*
  `apply-change`, but it contradicts the autonomous wave-harness. Keep them separate.
- **superpowers' thick plan format** (Global Constraints + bite-sized steps + **complete code in
  every step**, `writing-plans`) → **superseded, do not port.** OpenSpec deliberately split this
  into a *thin* `tasks.md` wave map + a JIT `wave-plan` that carries the code-level detail at
  execution time (the "detail-by-stability" decision, §2.C.5 — itself validated by the provisioner
  retro). Porting the thick format would un-do that choice.
- **superpowers' per-task review-gate on the *manual* path** → **route to the harness, don't bloat
  `apply-change`.** OpenSpec's manual apply is intentionally light; the per-wave review gate is a
  harness concern (§2.F). Enrich the manual skill only with self-contained self-review (item #7).
- **CLI-coupled OpenSpec features** (ADR registry / `openspec adr index`, the `change:` lifecycle,
  `instructions wave-plan`, the schema machinery) → **never sync to superpowers** — it is
  zero-dependency by charter (superpowers' own CHANGELOG records declining these).

---

## 4. Recommended sequence

**Forward (superpowers → OpenSpec), by leverage:**
1. **#1 Falsification spine** — execute `process-disciplines-handoff.md` §2.A/C/D/F (it already
   has the file map). Everything else composes with it.
2. **#2 Multi-lens independent design/plan review** — the biggest genuine *gap* (OpenSpec has only
   self-review). Lands as a design-review gate + the §2.F harness fan-out.
3. **#6 receiving-review adjudication** into `verify-change` + the review loop (the bias-sink).
4. **#3/#4/#5** (de-risk wave, per-wave rollback, confidence) — light design enrichments.
5. **#7 routed** — harness execution discipline (§2.F/§2.H) + a light `apply-change` self-review.
6. **#9 base-ref freshness** — harness worktree node.

**Reverse (OpenSpec → superpowers), by leverage:**
1. **A — entity-state checklist** (sharpens superpowers' own falsification).
2. **B — the four guard patterns** into executing-plans/writing-plans.
3. **C / D / E** — light / optional.

**The asymmetry to remember:** superpowers is strong on *execution + review discipline* (its
`executing-plans` / `receiving-code-review` are far richer than OpenSpec's `apply-change` /
`verify-change`); OpenSpec is strong on *the thinking-to-wave-skeleton contract* (`explore` /
`design` / the schema) and the *autonomous harness*. The ports flow accordingly: execution/review
discipline superpowers→OpenSpec (routed to the harness, not the manual skills); the entity-state
and guard refinements OpenSpec→superpowers.
