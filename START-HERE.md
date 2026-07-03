# Start here — the operating index

The three companion docs are **reference, not a to-do**. This file is the to-do: a ranked backlog of
independently-shippable units. Pick one, ship it, tick it, repeat.

**Reference (read one row's source, not the whole doc):**
- `RECONSTRUCTION.md` — what the deep-planning fork is and why (history, 17 decisions, current state).
- `process-disciplines-handoff.md` — the seam catalog (§2.A–I) + acceptance criteria (§4) + file map (§5).
- `superpowers-openspec-sync.md` — the bidirectional port/sync verdicts (which way each item flows, and why some don't).

**The loop:** pick one unit below → paste its source row as a one-paragraph proposal → ship it →
check its "Done when" → move on. One seam is a task; the catalog is a backlog. Don't try to do the catalog.

**Two edit surfaces, different friction:**
- **superpowers** = plain markdown skills, no build gate. Cheapest to change.
- **openspec** = authored `schemas/skills/**` behind a **parity wall**: after any edit run
  `pnpm run rebaseline:skills && pnpm test` and commit the regenerated parity test with it (see
  `process-disciplines-handoff.md` §7). `schema.yaml` edits skip the parity wall but change served
  output — cover with the artifact-workflow tests.

---

## Backlog (recommended order)

| # | Unit | Source | Lands in | Size | Done when |
|---|---|---|---|---|---|
| 1 | Entity-state checklist (`#5b`): nullable? unique? empty? duplicate? missing? stale? | sync §2.A | superpowers `brainstorming` (+ `executing-plans` self-review) | S | The falsification skill lists the state checklist per external entity read/keyed-on; a fixture asserts the bad input. |
| 2 | Four guard patterns: parity→round-trip test · fire-the-guard test · complete-sweep→enumeration guard · blast-radius (rename spans tiers / new-guard false-positive) | sync §2.B | superpowers `executing-plans` + `writing-plans` | S | Each pattern named in the relevant self-review/done-check. |
| 3 | **`FALSIFY_RITUAL` spine** (routing table incl. contract-4-dim + `#5b`) + de-risk wave + cold-start + per-wave oracle classification + "review is not the falsifier" | proc §2.A/C/D/F, files §5 | openspec `shared-prime.ts` → `design`/`apply`/`verify` + `schema.yaml` | L | Seam exists once, referenced by design+apply+verify (not copy-pasted); design.md requires the register + cold-start + de-risk-wave-before-dependents + oracle-per-wave; rebaseline + parity green. |
| 4 | Multi-lens **independent** design review (coverage always / architecture / experience / codex), scored, `[both]`-consensus, skip-with-rationale | sync §1.2 | openspec `design` (a review gate) | M | Design has an independent multi-lens review before handoff; lenses selected by change shape; findings consolidated + ranked. |
| 5 | Receiving-review **adjudication** (verify-don't-perform) + severity-gated convergence (adjudicated P0/P1→0, cap, stall-escalate) | sync §1.6, proc §2.F.6 | openspec `verify-change` (+ review loop) | M | `verify-change` triages each finding confirmed/refuted/already-fixed/wont-fix and converges on adjudicated severity, not raw count. |
| 6 | Per-wave rollback + irreversible→flag; one-pass confidence score | sync §1.4/1.5 | openspec `design` self-review | S | Design self-review emits a confidence score; risky waves carry a rollback or a flagged reshape. |
| 7 | `apply-change` enrichment: self-review + done=exercised + falsification self-check | sync §1.7 | openspec `apply-change` | S | Manual apply carries the self-review checklist, negative-path/outside-harness check, and the boundary self-check. |
| 8 | code-complete ≠ proven: "unproven until executed" state + runbook + flagged PR | sync §2.C | superpowers `finishing-a-development-branch` | S | Gated-proof branches close as code-complete/capstone-UNPROVEN with a runbook. |
| 9 | Emitted-harness hardening: fail-gate-on-0-targets · resume idempotency · no model-output-in-shell · per-node model floor · `context:fresh` across providers · resolve artifact-root once | proc §2.H | emitted Archon A′ workflow (needs decision 16) | L | The emitted workflow encodes each §2.H seed; a run can't vacuous-pass, double-commit, or inject via a gate. |
| 10 | Review sub-DAG: `bash`(diff) → `prompt`(rubric/adversarial + schema) → adjudicate → converge, provider-routed | proc §2.F.8 | emitted Archon workflow | M | The review loop runs as DAG nodes with no `codex` CLI call inside a node; prompt is portable, provider is Archon-routed. |
| 11 | Base-ref freshness before worktree | sync §1.9 | harness worktree-create node | S | Worktree creation fetches origin, warns unpushed, FF-behind, asks on diverged. |
| 12 | Spec-baseline reconciliation (retire 9 stale specs · add wave-plan/deep-planning + stores-skill trails · triage 4 active changes · fix 2 validate failures) | GH issue #1 | openspec `openspec/specs/` + `changes/` | M | Issue #1's acceptance criteria all checked; `openspec validate --all` clean. |
| 13 | GSD maturity-tiered research-gating (gray-area enumeration → depth tier) | sync §2.D | superpowers `brainstorming` grilling | S | *(optional)* Grilling gates a research pass by gray-area maturity. |

**Recommended path:** #1 and #2 first (small, reverse, no parity wall — learn the loop end-to-end),
then **#3** (the backbone everything composes with), then #4–#5. #9–#11 wait on the harness
canonicalization (decision 16). #12 is deferrable hygiene, delegable on its own.

**Don't port (settled — see sync §3):** superpowers' single-main-agent doctrine, its thick per-step
plan format, its per-task manual review gate onto the harness, and any CLI-coupled OpenSpec feature
into superpowers. These are deliberate divergences, not gaps.
