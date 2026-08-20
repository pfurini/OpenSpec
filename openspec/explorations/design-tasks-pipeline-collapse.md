# Pipeline collapse — the thinker owns the formalization (design→tasks first, explore→specs next)

> **HOW side SHIPPED 2026-06-16. WHAT side still deferred.** This is the playbook for
> collapsing explore→specs the same way, not a "do the HOW build now" ticket.
>
> **In the tree today:** `openspec-design` interviews the wave skeleton and writes
> `design.md` directly (no `design-notes.md`). The `design` schema instruction is a GATE
> (file presence = done). Completeness lives in design's self-review + the `tasks` step as
> a gap-detector — it cannot live on the artifact instruction. `openspec-continue-change`
> transcribes the Wave Skeleton into `tasks.md` (path grounding, no judgment). Skill names
> are `openspec-design` / `openspec-continue-change` (`design.ts` is a thin
> `loadSkillSource` wrapper).
>
> **Still open:** §8.2 conversion-fidelity read on a real deep-planning change; §9 WHAT
> collapse (explore still produces a note; continue still authors proposal + specs).

Status: **HOW landed 2026-06-16; refreshed 2026-08-17.** WHAT collapse **[DEFERRED]**.
Supersedes the "rewrite `design.ts` in isolation" framing in
`prompt-adherence-and-design-rewrite.md` §2.

## Current state (as of 2026-08-17)

| Piece | Status |
|---|---|
| Principle (§3) + locked HOW decisions (§4) | Still the contract |
| HOW build (§5) | **Done** — `schemas/deep-planning/` + `schemas/skills/openspec-design/` |
| §6 implementation questions | **Settled in §8.1** |
| §8.1 build learnings | **The playbook for §9** — read before touching explore/specs |
| §8.2 conversion fidelity | **Owed** — any real deep-planning change; not lexup/claude-terminal |
| §9 explore→specs | **Deferred** — same principle, not built |

---

## 1. The problem — the conversion is the bottleneck, not the prose [2026-06-16; HOW fixed]

The harness-critical path is `proposal → design → tasks.md (wave map) → autonomous execution`.
The fragile joint **was** **design → tasks**: design decomposed work into **components**, but
the wave map needs **vertical, value-ordered slices**. That leap is a HOW decision, yet it
lived in the `tasks` step, labelled mechanical, with no thinker and no user in the loop.

**HOW today:** that judgment lives in `openspec-design`; `tasks` really is mechanical
transcription. The same shape still holds on the **WHAT** side: explore holds named
capabilities, and the `specs` step still *authors* the falsifiable `Requirement`/`Scenario`
blocks.

## 2. The unifying insight — the same shape on both sides

One repeated three-part shape. **HOW row = pre-collapse (now fixed). WHAT row = still current.**

| | Thinker produces (informal) | Real formalizer (judgment-heavy, treated as "mechanical") | Near-copy ceremony hop |
|---|---|---|---|
| **WHAT** (still) | capabilities + scope — *exploration note* | **specs**: capabilities → testable `Requirement`/`Scenario` blocks | **proposal**: note → proposal.md |
| **HOW** (was) | components + slice-hint — *design note* | **tasks**: components → vertical waves | **design.md**: note → design.md |

Pre-collapse evidence (2026-06-16):
- `design-notes.md` and `design.md` had **identical section lists**. Transcription added a
  drift point, not content. Same on the WHAT side today: proposal.md re-houses the note ~verbatim.
- The "mechanical" step did the real work. Explore still holds **capabilities, not scenarios**;
  `specs` still authors the blocks.

## 3. The principle [LOCKED]

> **The thinker owns the formalization (the real, judgment-heavy work, where it has full context and
> a human in the loop); the ceremony artifact collapses; the remaining transcription becomes
> genuinely mechanical.**

## 4. Decisions locked 2026-06-16 (HOW implemented)

1. **[LOCKED, LANDED] Option A — wave decomposition lives IN design.** `openspec-design`
   decides the wave skeleton *with the user*: waves, observable-value goal, ordering +
   dependencies, wave-0 tracer, component→wave mapping, test-layer per scenario.
2. **[LOCKED, LANDED] No `design-notes.md`.** `openspec-design` writes `design.md` directly
   after the shape-approval gate. Parked design seeds go in a labelled section of `design.md`
   (or back to the exploration note). Load-bearing decisions persist as ADRs.
3. **[LOCKED, LANDED] `tasks` stays a separate step and is genuinely mechanical.** Transcribes
   the wave skeleton into `tasks.md` and grounds named-test paths against the repo. Decides
   nothing.
4. **[LOCKED, LANDED] `design.md` is the single source of the HOW contract.** It owns the
   decision; `tasks.md` owns the execution format. Tasks transcribes, never re-decides.
5. **[LOCKED] Sequence: HOW first, then WHAT, feedback-bridged.** HOW is done. WHAT-side
   symmetric collapse is **[DEFERRED]**, not dropped — apply §8.1, then §9.
6. **[LOCKED, LANDED] `continue`'s HOW-side role** is flow-orchestration + the mechanical
   tail (tasks transcription, gates). It does not re-think design.

## 5. HOW-side build (done 2026-06-16)

All of these landed in `schemas/deep-planning/` + `schemas/skills/openspec-design/` +
`test/core/templates/design-tasks-collapse.test.ts`. Not a queue.

- Skill interviews the wave skeleton, writes `design.md` directly, self-reviews completeness,
  records parked seeds. `design.ts` is a thin factory over that dir.
- `design` artifact instruction is a GATE (do not write). Template has **Wave Skeleton /
  Build Sequence**. Completeness is *not* enforced at this instruction — see §8.1.2.
- `tasks` instruction: transcription + path grounding + Open-Questions gap-detector.
- `continue` / `flow-to-gate` keys on `design.md` presence.
- Parity: `EXPECTED_BUNDLE_TREE_HASHES` covers the design bundle.

## 6. Implementation questions — settled in §8.1

| Question | Resolution |
|---|---|
| Wave-skeleton representation | `## Wave Skeleton / Build Sequence`, one sub-block per wave (§8.1.6) |
| Graph mechanics | Presence = done; no engine change; "pure thinker" is prompt-level (§8.1.1) |
| JIT `wavePlan` starved? | No — `tasks.md` format unchanged, lossless join (§8.1.6) |
| Completeness gate teeth | Design self-review (primary) + tasks gap-detector (secondary). Cannot live on the `design` artifact instruction (§8.1.2) |

## 7. Relation to existing notes

- `task-machinery-and-wave-execution.md` — wave model / three grains / wave-plan. This note
  changed *who writes the skeleton* (design, not tasks).
- `executable-plans-and-feedback-loop.md` — self-sufficiency of wave/plan content.
- `plan-validation-and-recovery.md` — collapsing the lossy hop removes one brittleness class;
  validator/replan still open.
- `archived/multi-file-skill-generation.md` — mechanism that let design carry depth as
  `references/`.
- `prompt-adherence-and-design-rewrite.md` §1–§2 — under-reading diagnosis; rewrite subsumed here.

## 8. Feedback log — carry into explore→specs

Two dimensions. (2) is done. (1) is still owed.

1. **Conversion fidelity** — still unpaid. See §8.2.
2. **Build-time learnings** — captured 2026-06-16 in §8.1. Mandatory reading for §9.

### 8.1 Build-time learnings (HOW side — 2026-06-16) [carry into explore→specs]

**Files touched** (TDD; suite 1712→1725, +13 contract tests):
`schemas/deep-planning/schema.yaml`, `schemas/deep-planning/templates/design.md`,
`schemas/skills/openspec-design/` (`SKILL.md` + `references/flow.md`), `design.ts`,
`continue-change.ts`, `shared-prime.ts`, `test/core/templates/design-tasks-collapse.test.ts`,
three parity maps.

1. **Q2 graph mechanics — RESOLVED, no engine change.** Artifact done-ness is **pure file presence**
   (`state.ts:detectCompleted` → `outputs.ts:artifactOutputExists` over the artifact's `generates`
   glob). So `openspec-design` writing `design.md` directly makes the `design` artifact `done`; continue's
   flow-to-gate sees `done` (not `ready`) and skips straight to `tasks`. When `design.md` is **absent**,
   `design` is `ready`, continue reads its instruction = the STOP gate. The "pure thinker" rule is
   **prompt-level only** — the engine doesn't care who writes design.md. design.md stays an ordinary
   graph artifact. **WHAT-side parallel:** the same is true for `specs` (`generates: specs/**/*.md`) — if
   explore authors specs directly, presence = done, and the `specs` step becomes a gate, not a writer.
   **Engine-proven** (scratch deep-planning change, real `openspec` CLI): proposal+specs
   and **no** `design.md` → `design=ready`, `tasks=blocked`, `instructions design` returns the GATE text;
   drop in a `design.md` → `design=done`, `tasks=ready`, `instructions tasks` returns the
   mechanical-transcription text.

2. **Q4 keystone — completeness CANNOT be gated at the artifact-instruction layer.** Because presence =
   done, once `design.md` exists the `design` artifact instruction is **never read** by continue. So
   "this artifact validates presence + completeness" is mechanically impossible there. Teeth
   relocated to **two** places: (a) `openspec-design` step-8 self-review = **primary**;
   (b) the mechanical `tasks` transcription = **secondary** gap-detector (missing
   layer/acceptance/dodged-OQ → STOP → back to design). The `design` instruction is an
   **unconditional** gate. **WHAT-side parallel:** put specs-completeness teeth in explore's
   self-review + a downstream gap-detector, NOT in the `specs` artifact instruction.

3. **Judgment must RELOCATE, not vanish.** Cut the old `tasks` instruction along the
   **judgment/format** line. *Moved UP into the design skill* (SKILL.md "Sequence the build" +
   flow.md step 3): wave model, value-ordering, wave-0 tracer, TDD-first, **atomic
   breaking-change slicing**, **scope-reduction ban**. *Kept in `tasks`*: one-checkbox-per-wave,
   coverage-map columns, named-test-path grounding, Open-Questions gap-detector.
   **WHAT-side parallel:** the `specs` step's real judgment (falsifiability, SHALL/MUST,
   *authoring* Requirement/Scenario blocks) must move into explore; `specs` keeps only the
   delta-format + one-spec-per-capability transcription.

4. **One home for the artifact's shape.** design.md's section spec was **triplicated**:
   template + artifact instruction + skill. Resolved: the **skill (flow.md step 5)** is the
   author's home; the **schema instruction is gate-only**; the **template stays a synced
   skeleton**. Rule: when the thinker authors the artifact, the schema artifact instruction
   MUST drop its section list or it silently drifts from the skill.

5. **Mechanism limit — nested bundle markers leak in `full` mode.** Markers
   (`<!--bundle:start-->` / path includes) are only resolved when they appear in **SKILL.md**.
   `renderFullInstructions` writes each reference file **raw**, so a marker *inside* a
   reference (e.g. flow.md) leaks. ⇒ **all markers live in SKILL.md.** Wave-model teaching
   therefore sits in **SKILL.md (concept) + flow.md (procedure)**, not a third reference.
   **WHAT-side caveat:** if explore→specs wants multiple references, put each marker in
   SKILL.md, not nested — or build nested-marker support first. (`flatten` is vestigial; every
   `skillsDir` tool is `full`.)

6. **Q1 representation + Q3 (`wavePlan`) — lossless, format unchanged.** design.md gets a
   `## Wave Skeleton / Build Sequence` section, one sub-block per wave: value goal ·
   components · **proves scenarios** · depends-on · acceptance command · stamps · skills ·
   wave-0 tracer flag. **Interfaces stay in the Components table; layers stay in Testing
   Approach.** `tasks` reconstructs the coverage map by **joining** proves-scenarios ×
   Testing-Approach-layer. Every `tasks.md` per-wave field has a single design.md source ⇒
   **`tasks.md` format is unchanged ⇒ `wavePlan` is untouched.**

7. **Parity churn.** `shared-prime.ts` injects into **explore + design**. Editing it moves
   those two factories + generated skills. Design edits move the design hashes +
   `EXPECTED_BUNDLE_TREE_HASHES`. Continue gate-wording moves the continue factory.
   (Command-generation templates named in the 2026-06-16 harvest are **gone** — skills-only.)
   Batch template edits, harvest once (`pnpm run rebaseline:skills`), then `pnpm test`.

### 8.2 Conversion fidelity — still owed

Not blocked on lexup or Claude Code. On **any real deep-planning change** (START-HERE #9
dogfood can absorb this):

1. Run `openspec-design` — should interview the wave skeleton and write `design.md` directly.
2. Run `openspec-continue-change` — should transcribe Wave Skeleton → `tasks.md`, ground test
   paths, decide nothing.

Judge: is the wave map faithful, executable, and free of silent decisions? Record win/loss
**here** before §9 starts — that refactor depends on this read.

## 9. [DEFERRED] The WHAT-side application — for the next agent

Read §8.1 first. Then apply §3 symmetrically:

- **`explore` owns the specs/scenarios** — author the falsifiable `Requirement`/`Scenario`
  blocks in the interactive WHAT step, not in a downstream "mechanical" `specs` pass.
- **`proposal.md` collapses to a thin generated summary** (or is written directly), the way
  `design.md` collapsed the design note.
- **`continue`'s WHAT-side role shrinks** to orchestration + the mechanical tail.

Keep the asymmetry honest until then: HOW is collapsed, WHAT still runs note→proposal→specs.
