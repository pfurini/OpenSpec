# Pipeline collapse — the thinker owns the formalization (design→tasks first, explore→specs next)

Status: **decisions grounded 2026-06-16 (brainstorm, this session); HOW-side build NOT started.**
This is the guiding build contract for collapsing the planning pipeline so the fragile
design→tasks conversion stops leaking fidelity. **Do the HOW side first** (design + tasks),
**collect feedback during the build**, then a later agent applies the same pattern to the WHAT
side (explore + specs) using §8's learnings. Supersedes the "rewrite `design.ts` in isolation"
framing in `prompt-adherence-and-design-rewrite.md` §2.

Tags: **[LOCKED]** decided this session · **[OPEN]** settle during the build · **[DEFERRED]** WHAT side.

## 1. The problem — the conversion is the bottleneck, not the prose

The harness-critical path is `proposal → design → tasks.md (wave map) → autonomous execution`. The
fragile joint is **design → tasks**: the design decomposes work into **components** (units:
purpose/interface/depends-on + a slice-composition *hint*), but the wave map needs **vertical,
value-ordered slices** ("waves"). That component→wave leap is a real HOW decision — wave-0 tracer,
value ordering, atomic breaking-change slicing, test-layer per scenario — yet it is made in the
`tasks` step, which is labelled **"MECHANICAL ONLY — tasks makes NO design decisions"**
(`schema.yaml:134`), downstream of the thinking, with **no thinker and no user in the loop**. A
single error there silently corrupts the whole autonomous run. The label is the bug: a judgment-heavy
transformation pretending to be mechanical.

## 2. The unifying insight — the same shape on both sides

Lining up WHAT and HOW, the pipeline has one repeated three-part shape:

| | Thinker produces (informal) | Real formalizer (judgment-heavy, treated as "mechanical") | Near-copy ceremony hop |
|---|---|---|---|
| **WHAT** | capabilities + scope — *exploration note* | **specs**: capabilities → testable `Requirement`/`Scenario` blocks | **proposal**: note → proposal.md |
| **HOW** | components + slice-hint — *design note* | **tasks**: components → vertical waves | **design.md**: note → design.md |

Evidence (grounded in the prompts, this session):
- **The note ≈ the artifact (ceremony hop).** `design-notes.md` (design.ts step 5) and `design.md`
  (`schema.yaml:93`) have **identical section lists** (Context · Goals/Non-Goals · Decisions ·
  Components & Dependencies · Data model/API · Data flow · Testing approach · Risks · Migration ·
  Open Questions). The transcription transforms ~no content — it only adds a drift point on the
  contract. Same on the WHAT side: proposal.md re-houses the note's sections ~verbatim.
- **The "mechanical" step does the real work.** The exploration note holds **capabilities (named),
  not scenarios** (explore.ts) — the `specs` step *authors* the falsifiable `Requirement`/`Scenario`
  blocks. Likewise `tasks` *authors* the wave slicing. Both are formalization, not transcription.

## 3. The principle [LOCKED]

> **The thinker owns the formalization (the real, judgment-heavy work, where it has full context and
> a human in the loop); the ceremony artifact collapses; the remaining transcription becomes
> genuinely mechanical.**

## 4. Decisions locked this session

1. **[LOCKED] Option A — wave decomposition moves INTO design.** `/opsx:design` (the interactive HOW
   thinker) decides the wave skeleton *with the user*: the waves, each wave's observable-value goal,
   ordering + dependencies, the wave-0 tracer, the component→wave mapping, and (already) the
   test-layer per scenario. The fragile decision moves to where judgment + a human gate exist.
2. **[LOCKED] Collapse design — eliminate `design-notes.md` (choice a).** `/opsx:design` writes
   `design.md` **directly** (after the shape-approval gate it already has). No separate note. The one
   thing the note uniquely held — **parked design seeds** (HOW ideas deferred to a *future* change) —
   goes into a clearly-labelled section of `design.md` (or back to the exploration note); it is not a
   reason to keep a shadow file. Load-bearing decisions already persist as ADRs.
3. **[LOCKED] `tasks` stays a separate step but becomes genuinely mechanical.** It transcribes
   design.md's wave skeleton into the `tasks.md` format (checkbox-per-wave, coverage-map table) and
   does the one thing that is legitimately mechanical-but-repo-coupled: **ground the named-test paths**
   against the actual repo layout. It decides nothing. (User accepted a separate tasks step *because*
   it becomes mechanical.)
4. **[LOCKED] design.md is the single source of the contract.** It owns the *decision* (which waves,
   what each proves, order, tracer); tasks.md owns the *execution format* (ticks, table, grounded
   paths). No second source of truth — tasks transcribes, never re-decides.
5. **[LOCKED] Sequence: HOW first, then WHAT, feedback-bridged.** Build + validate the design→tasks
   collapse; accumulate learnings (§8); a later agent applies the identical pattern to explore→specs.
   The WHAT-side symmetric collapse is **[DEFERRED]**, not dropped.
6. **[LOCKED] `continue`'s HOW-side role shrinks** to flow-orchestration + the mechanical tail
   (tasks transcription, gates). It stops re-thinking design.

## 5. The HOW-side build plan (do this now)

Touch points (prompts + schema, not just the skill):
- **`design.ts`** (the multi-file `/opsx:design` skill — already multi-file as of the §8 work in
  `multi-file-skill-generation.md`): make it (a) interview the **wave skeleton** as part of the HOW,
  (b) write `design.md` directly at its write step, (c) end with a **hard schema-completeness
  self-review** (it now owns the artifact, so it owns the gate the transcription pass used to provide),
  (d) add the parked-seeds destination. The borrowed-depth restructure (the original "design.ts
  rewrite") lands here as `references/` content — but the lever is **structure for adherence**, not
  relocating prose (see `prompt-adherence-and-design-rewrite.md` §1: the failure was under-reading).
- **`design` artifact** (`schema.yaml:76`): change role from "transcribe the note" to "design.md is
  authored by `/opsx:design`; this artifact validates presence + completeness (incl. the wave
  skeleton + the test-layer-per-scenario contract)." Add the **Wave Skeleton / Build Sequence**
  section to the design.md spec.
- **`tasks` artifact** (`schema.yaml:124`): strip the judgment (wave slicing, value ordering,
  breaking-change detection move UP into design); keep transcription + named-test-path grounding +
  the open-questions triage as a *gap detector* ("design didn't settle X → STOP, back to design").
- **`continue` / flow-to-gate** (`continue-change.ts` + schema `continueMode`): the gate that stopped
  on missing `design-notes.md` now keys on `design.md`; continue resumes at the mechanical `tasks`
  step. Verify flow-to-gate still stops correctly for human wave-map approval.
- **Parity / tests**: design.ts is bundle-parity-guarded (`EXPECTED_BUNDLE_TREE_HASHES`); re-harvest
  on every edit. Add coverage for the new design.md completeness gate and the mechanical tasks
  transcription.

## 6. Open implementation questions [OPEN — settle during the build, record in §8]

- **Wave-skeleton representation in design.md.** Exact section shape so `tasks` can transcribe it
  losslessly (waves, value goal, component→wave map, order, tracer, acceptance command). Avoid
  duplicating the coverage map that already lives in Testing Approach.
- **Graph mechanics.** If `/opsx:design` writes a *graph artifact* directly, does that break the
  pure-thinker rule / artifact-graph assumptions (`change-records-and-thinking-layer.md` §2)? Decide
  whether design.md stays a graph artifact authored by the command, and how `openspec status`/
  instructions treat it.
- **JIT wave-plan unaffected?** `wavePlan` (`schema.yaml:230`) consumes tasks.md per wave — confirm
  the richer design.md → leaner tasks.md split doesn't starve it of anything.
- **Completeness gate teeth.** What exactly the design self-review must assert (every scenario has a
  layer; every wave has acceptance; no dodged decision in Open Questions) so it actually replaces the
  transcription pass's implicit check.

## 7. Relation to existing notes

- `task-machinery-and-wave-execution.md` — the wave model / three grains / wave-plan instruction this
  reshapes the *authoring* of. Decisions 7–8 (TDD wave map) unchanged; this changes *who writes the
  skeleton* (design, not tasks).
- `executable-plans-and-feedback-loop.md` — the self-sufficiency standard for the wave/plan content;
  this is the structural half (where the decision is made).
- `plan-validation-and-recovery.md` — anti-brittleness; collapsing the lossy hop reduces one class of
  brittleness this note also targets. Cross-pollinate.
- `multi-file-skill-generation.md` §8 — the now-built mechanism that lets design.ts carry restructured
  depth as `references/`.
- `prompt-adherence-and-design-rewrite.md` §1–§2 — the under-reading diagnosis (structure > content)
  and the original rewrite ask, now subsumed here.

## 8. Feedback log — learnings to carry into the explore→specs refactor [LIVING; finalize at end]

Two dimensions, accumulated *during* the HOW build, then summarized for the next agent so the WHAT
collapse avoids the same mistakes:

1. **Conversion fidelity.** Run the redesigned design→tasks on the lexup v1 testbed
   (`account-profile-self-service`); judge whether the wave map produced is faithful, executable, and
   needs no silent decisions. Record where fidelity was won/lost.
2. **Build-time learnings.** Anything that arises or breaks while we implement — schema-graph friction,
   gate teeth, representation choices, parity churn, prompt-adherence regressions — captured as it
   happens.

_(empty — fill during the build)_

## 9. [DEFERRED] The WHAT-side application — for the next agent

Once §8 is summarized, apply the §3 principle symmetrically:
- **`explore` owns the specs/scenarios** — author the falsifiable `Requirement`/`Scenario` blocks in
  the interactive WHAT step (where the context + user are), not in a downstream "mechanical" `specs`
  pass.
- **`proposal.md` collapses to a thin generated summary** (or is written directly), the way design.md
  collapses the design note.
- **`continue`'s WHAT-side role shrinks** to orchestration + the mechanical tail.
Carry §8's fidelity + build learnings in so the WHAT collapse doesn't repeat the HOW mistakes. Keep
the asymmetry honest until then: HOW is collapsed, WHAT still runs note→proposal→specs.
