# Pipeline collapse — the thinker owns the formalization (design→tasks first, explore→specs next)

Status: **decisions grounded 2026-06-16; HOW-side build DONE 2026-06-16 (this session) — suite green (1725). Conversion-fidelity validation on lexup still owed (manual run, §8).**
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

### 8.1 Build-time learnings (HOW side — 2026-06-16) [carry into explore→specs]

**Files touched** (TDD; suite 1712→1725, +13 contract tests; build clean; `dist/` untracked):
`schemas/deep-planning/schema.yaml` (design artifact → gate; tasks → mechanical; top description),
`schemas/deep-planning/templates/design.md` (+ Wave Skeleton section), `schemas/skills/openspec-design/`
(`SKILL.md` + `references/flow.md` — writes design.md directly, wave-skeleton concept+procedure,
self-review teeth, parked-seeds), `design.ts` (descriptions), `continue-change.ts` (gate wording ×2),
`shared-prime.ts` (thinking-records line), new `test/core/templates/design-tasks-collapse.test.ts`,
re-harvested all three parity maps.

1. **Q2 graph mechanics — RESOLVED, no engine change.** Artifact done-ness is **pure file presence**
   (`state.ts:detectCompleted` → `outputs.ts:artifactOutputExists` over the artifact's `generates`
   glob). So `/opsx:design` writing `design.md` directly makes the `design` artifact `done`; continue's
   flow-to-gate sees `done` (not `ready`) and skips straight to `tasks`. When `design.md` is **absent**,
   `design` is `ready`, continue reads its instruction = the STOP gate. The "pure thinker" rule is
   **prompt-level only** — the engine doesn't care who writes design.md. design.md stays an ordinary
   graph artifact. **WHAT-side parallel:** the same is true for `specs` (`generates: specs/**/*.md`) — if
   explore authors specs directly, presence = done, and the `specs` step becomes a gate, not a writer.
   **Engine-proven** (scratch deep-planning change, real `openspec` CLI, not the harness): proposal+specs
   and **no** `design.md` → `design=ready`, `tasks=blocked`, `instructions design` returns the GATE text;
   drop in a `design.md` → `design=done`, `tasks=ready`, `instructions tasks` returns the
   mechanical-transcription text. The flow-to-gate stop is proven, not inferred.

2. **Q4 keystone — completeness CANNOT be gated at the artifact-instruction layer.** Because presence =
   done, once `design.md` exists the `design` artifact instruction is **never read** by continue. So the
   note's wish ("this artifact validates presence + completeness") is mechanically impossible there. Teeth
   relocated to **two** places: (a) `/opsx:design` step-8 self-review = **primary** (it owns the artifact);
   (b) the mechanical `tasks` transcription = **secondary** gap-detector (transcribing surfaces any missing
   layer/acceptance/dodged-OQ → STOP → back to design). The `design` instruction collapsed to an
   **unconditional** gate message (deleted the "if exists, transcribe" branch — it had no reader).
   **WHAT-side parallel:** put the specs-completeness teeth in explore's self-review + a downstream
   gap-detector, NOT in the `specs` artifact instruction.

3. **Judgment must RELOCATE, not vanish (the actual fidelity work).** Cut the old `tasks` instruction
   along the **judgment/format** line. *Moved UP into the design skill* (SKILL.md "Sequence the build" +
   flow.md step 3): wave model definition, value-ordering, wave-0 tracer, TDD-first, **atomic
   breaking-change slicing**, **scope-reduction ban** — all *which-scenario-in-which-wave* HOW decisions.
   *Kept in `tasks`* (legitimate transcription format): one-checkbox-per-wave, coverage-map columns,
   named-test-path grounding, Open-Questions gap-detector. Litmus applied after: nothing left in `tasks`
   makes a reasonable engineer choose a user-visible outcome. **WHAT-side parallel:** the `specs` step's
   real judgment (falsifiability, SHALL/MUST, *authoring* Requirement/Scenario blocks) must move into
   explore; `specs` keeps only the delta-format + one-spec-per-capability transcription.

4. **One home for the artifact's shape, or you add drift instead of removing it.** design.md's section
   spec was **triplicated**: `templates/design.md` + the `design` artifact instruction + the skill. Resolved:
   the **skill (flow.md step 5)** is the author's home (it lists sections incl. Wave Skeleton); the **schema
   instruction stopped enumerating sections** (gate only); the **template stays a synced skeleton** (added
   Wave Skeleton). Rule: when the thinker authors the artifact, the schema artifact instruction MUST drop
   its section list or it silently drifts from the skill.

5. **Mechanism limit — nested reference markers leak in `full` mode.** `<!--reference:relPath-->` is only
   resolved when it appears in **SKILL.md**: `renderFullInstructions` (full mode) rewrites SKILL.md markers
   to pointers and writes each reference file **raw**, so a marker placed *inside* a reference (e.g. flow.md)
   leaks verbatim into the emitted file. (`flatten` happens to resolve it, order-dependently, because refs
   inline sequentially.) ⇒ **all markers live in SKILL.md.** This forced the relocated wave-model teaching
   into **SKILL.md (concept) + flow.md (procedure)** rather than a third `references/` file. Smoke-verified:
   full → `SKILL.md`+`references/flow.md`, flatten → one `SKILL.md`, no marker leak, Wave Skeleton present
   in both, zero `design-notes.md`. **WHAT-side caveat:** if explore→specs wants multiple references, add
   each marker in SKILL.md, not nested — or build real nested-marker support first.

6. **Q1 representation + Q3 (wavePlan) — lossless, format unchanged.** design.md gets a `## Wave Skeleton /
   Build Sequence` section, one sub-block per wave: value goal · components (component→wave map) · **proves
   scenarios** · depends-on · acceptance command · stamps · skills · wave-0 tracer flag. **Interfaces stay
   in the Components table; layers stay in Testing Approach** (no duplication). `tasks` reconstructs the
   coverage map by **joining** proves-scenarios × Testing-Approach-layer and looks up interfaces from the
   Components table. Verified every `tasks.md` per-wave field has a single design.md source ⇒ transcription
   is lossless ⇒ **`tasks.md` format is unchanged ⇒ `wavePlan` (Q3) is untouched.** The losslessness check
   *is* the Q3 guarantee.

7. **Parity churn map (for the re-harvest).** `shared-prime.ts` is injected into **explore + design** only
   (not new/onboard/propose) → editing it moved `getExploreSkillTemplate` + `getOpsxExploreCommandTemplate`
   + `openspec-explore` generated, plus both design entries. design edits moved the design fn/command/
   generated/bundle(full+flatten). The continue gate-wording moved `getContinueChangeSkillTemplate` +
   `getOpsxContinueCommandTemplate` + `openspec-continue-change` generated. All re-harvested via a one-off
   `tsx` script (stableStringify+sha256 over the factories / `buildSkillArtifacts`). Batch all template
   edits, harvest once, then `vitest run` — don't chase moving hashes.

### 8.2 Conversion fidelity (item 1) — OWED, manual run

Could **not** run here: the lexup harness uses the claude-terminal TUI, which stalls under Claude Code
(README protocol). **Hand to the user:** on lexup `account-profile-self-service`, run `/opsx:design`
(should now interview the wave skeleton + write `design.md` directly, no `design-notes.md`) then
`/opsx:continue` (should mechanically transcribe the Wave Skeleton → `tasks.md`, grounding test paths,
deciding nothing). Judge: is the wave map faithful, executable, and free of silent decisions vs. the
pre-collapse output? Record win/loss here before the explore→specs (§9) refactor starts — that refactor
depends on this fidelity read.

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
