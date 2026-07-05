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

## The lens (2026-07-05 re-rank)

This backlog was re-ranked after a direction brainstorm (session of 2026-07-03/05). The decisions
that drive the new order:

1. **Ownership floor = content only.** The owned asset is the process pack (schemas + skills),
   portable across engines and doors. Fork code (CLI machinery, `shared-prime.ts` seams) is a
   means: prefer content-sized ports over parity-wall engineering wherever the discipline can live
   in skill/schema text.
2. **The backbone is the ledger + retro, not the FALSIFY_RITUAL spine.** Metric = **cost per
   shipped change including rework**, with steering minutes priced in. Gate-time "accepted" is
   denominator data only (~99% acceptance ⇒ zero information); quality arrives late and is
   back-filled as **regret events** by a first-class retro phase. The routing table (phase →
   model class → door) is a slow oracle fed by this data.
3. **Steered vs automated phases.** Inception (ideation/diagnostic/PRD), per-change WHAT, and
   per-change HOW stay interactive on frontier-class rented models through flat-rate doors.
   Everything else automates on the cheapest class that clears the bar — empirically, per ledger.
4. **Every ported discipline carries a compensator annotation**: one line naming the model
   failure mode it compensates and its retirement condition. Keeps the harness an inventory of
   testable compensators, not a pile of convictions.
5. **Scale target is own + client repos** → guest-mode footprint and per-project routing overlays
   (allowed providers first, then cheapest) become requirements, not options.
6. Reviews: automated with escalation, policy per phase; review loops with stop conditions,
   multi-angle + adversarial, ≥2 model families (diversity floor — don't let price-routing
   collapse cross-family disagreement).

---

## Backlog (recommended order)

| # | Unit | Source | Lands in | Size | Done when |
|---|---|---|---|---|---|
| 1 | **Ledger v0**: record shapes for gate events / run outcomes / **regret events** (stable artifact IDs); skill-exit logging convention at every schema gate; adopt toktrack or ccusage for door token/cost data (snapshot before Claude Code's 30-day deletion); join script | session 2026-07-05 | openspec skills (exit steps) + `ledger.jsonl` per project + small join script | M | Every schema-gated artifact landing writes a gate event; regret/run-outcome shapes are schema'd; a query answers "cost of change X so far, by phase and door". |
| 2 | **Retro phase**: per-change retro at archive (reads transcripts, deviation log, adjudicated findings → emits regret events with blame class WHAT/HOW/exec/process + lesson entries); per-milestone UAT retro emitting seam-catalog-format findings | session 2026-07-05; mechanizes the provisioner-retro method | new retro skill + hook in `openspec-archive-change` | M | Archiving offers/requires the retro; regrets land in the ledger, lessons in the project store; output validates against a schema. Part of ledger v0 in spirit — without back-fill the ledger is just a spend tracker. |
| 3 | **Compensator annotations**: every gate/ritual/discipline in ported skills states the model failure mode it compensates + retirement condition; rule recorded for all future ports | session 2026-07-05 | authoring rule + one-line sweep over existing skills | S | Each discipline in the skill suite carries the annotation; the rule is written where future ports will see it. |
| 4 | Receiving-review **adjudication** (verify-don't-perform) + severity-gated convergence (adjudicated P0/P1→0, cap, stall-escalate) — **now also classifies each finding by originating phase and logs to ledger** | sync §1.6, proc §2.F.6 + lens #2 | openspec `verify-change` (+ review loop) | M | verify-change triages confirmed/refuted/already-fixed/wont-fix, converges on adjudicated severity, and every confirmed finding carries an origin class feeding the ledger. |
| 5 | code-complete ≠ proven: "unproven until executed" state + runbook + flagged PR | sync §2.C | superpowers `finishing-a-development-branch` | S | Gated-proof branches close as code-complete/capstone-UNPROVEN with a runbook. (Same insight as regret events, applied to branches — cheap, aligned.) |
| 6 | **Falsification content pass** (merges old #1 + the content of old #3): entity-state checklist (`#5b`), claim-type→falsifier routing table, cold-start, de-risk-wave-before-dependents, oracle-per-wave, "review is not the falsifier" — **as skill/schema text, no `shared-prime.ts` seam** | sync §2.A, proc §2.A/C/D/F, trimmed per lens #1 | openspec `design`/`apply`/`verify` skill text + `schema.yaml`; superpowers `brainstorming` | M | The routing table + checklist appear in the relevant skills; design.md requires register/cold-start/de-risk/oracle-per-wave; each addition carries its compensator annotation; no new TS plumbing. |
| 7 | Multi-lens **independent** design review (coverage / architecture / experience / codex), scored, `[both]`-consensus, skip-with-rationale — findings logged by origin; ≥2 model families | sync §1.2 + lens #6 | openspec `design` (review gate) | M | Independent multi-lens review before handoff; lenses selected by change shape; findings consolidated, ranked, origin-logged. |
| 8 | Per-wave rollback + irreversible→flag; one-pass confidence score — score recorded to ledger as a leading proxy, validated against regrets at retro | sync §1.4/1.5 + lens #2 | openspec `design` self-review | S | Design self-review emits a confidence score into the ledger; risky waves carry rollback or flagged reshape. |
| 9 | **First instrumented dogfood**: GH issue #1 spec-baseline reconciliation driven through the full workflow (`/openspec-new-change` → … → archive + retro) with ledger v0 live — may double as the owed 4/4 clean-run proof | GH issue #1 + session 2026-07-05 | openspec `openspec/specs/` + `changes/` | M | Issue #1 acceptance criteria checked; `openspec validate --all` clean; the change has a complete ledger trail incl. retro. |
| 10 | `apply-change` enrichment: self-review + done=exercised + falsification self-check | sync §1.7 | openspec `apply-change` | S | Manual apply carries the self-review checklist, negative-path/outside-harness check, boundary self-check. |
| 11 | **Inception diagnostic import**: office-hours-style forcing-questions skill (anti-sycophancy rules, premise gate, pushback patterns), schema-gated output feeding a PRD seed | session 2026-07-05; mine gstack `office-hours` | new openspec inception skill + schema | M | Runs as an interactive studio phase; output validates against a schema the PRD step consumes. Schedule by need: next project inception. |
| 12 | Four guard patterns: parity→round-trip · fire-the-guard · complete-sweep→enumeration · blast-radius | sync §2.B | superpowers `executing-plans` + `writing-plans` | S | Each pattern named in the relevant self-review/done-check. (Filler-sized; do anytime.) |
| 13 | GSD maturity-tiered research-gating (gray-area enumeration → depth tier) | sync §2.D | superpowers `brainstorming` grilling | S | *(optional)* Grilling gates a research pass by gray-area maturity. |
| 14 | **Workflow tiers**: `light` schema (proposal-with-tasks, 2 artifacts) + `logbook` path (zero upfront ceremony — post-hoc ledger event + record entry + spec/doc reconciliation check, for just-do-it work like UI fixes in Cursor) + triage rule in `openspec-new-change` (contract-touch → ≥light; multi-session/irreversible → deep-planning; else logbook). Misclassification is measurable: retro traces regrets to tier-too-light → rule tightens. Extends decision 17's classification muscle to workflow selection. Fast-forward for `light` comes free from `flow-to-gate` with no gated artifacts — no bypass skill (the pruned `ff-change`/`propose` are NOT the model; see evict-upstream-surfaces design, Parked Seeds). | session 2026-07-06 | two new schemas + `openspec-new-change` skill text + ledger conventions | M | All three tiers exist; the triage rule lives in the skill; a logbook entry costs <1 min and still lands a ledger event. |

**Deferred (unchanged gate — decision 16 + now also awaiting ledger data):**
- Emitted-harness hardening (old #9, proc §2.H) — factory-side; revisit when the harness workflow
  is canonicalized and the ledger shows where runs actually fail.
- Review sub-DAG provider-routed (old #10, proc §2.F.8) — same gate.
- Base-ref freshness before worktree (old #11, sync §1.9) — same gate.

**Recommended path:** #1–#3 as one wave (**the measurement spine** — everything after it becomes
self-measuring), then #4–#6 (instrumentation-bearing disciplines), then #9 as the first fully
instrumented end-to-end dogfood. #7/#8/#10 slot in around it; #11 waits for a real inception;
#12/#13 are idle-time fillers.

**Demotions, explicitly:** old #3 (`FALSIFY_RITUAL` as a `shared-prime.ts` seam) is retired as an
engineering unit — its *content* survives as #6, but the single-seam TS plumbing violates the
content-only ownership floor for no measured benefit. Old #1 is absorbed into #6. The old
"#1/#2 first to learn the loop" rationale is superseded: the loop to learn now is
*instrument → run → retro*, not *port → rebaseline*.

**Don't port (settled — see sync §3):** superpowers' single-main-agent doctrine, its thick per-step
plan format, its per-task manual review gate onto the harness, and any CLI-coupled OpenSpec feature
into superpowers. These are deliberate divergences, not gaps. **Added:** don't deepen fork code
where content suffices; don't let price-routing drop review loops below two model families.
