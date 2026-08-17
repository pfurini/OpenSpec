# Reconstruction: the deep-planning fork — what we built and why

**Status:** reconstruction record, assembled 2026-06-28 from the structured trail (commit
bodies + the `feat` design journal) and the conversation transcripts. It exists because the
current `personal` branch deliberately **deferred the `openspec/` artifact tree**, so the rich
design record that lives on `feat/explore-what-brainstorming` is invisible on the branch we
work from today — the *why* of the latest work survives only in commit messages. This file
stitches the three layers together: the **methodology** (feat), the **upstream-divergence port**
(personal), and the **forward roadmap**.

**How to read:** §1 is the one-paragraph story. §2 is the mission in the user's own words. §3–§5
are what was built and decided. §6 is the upstream port. §7 is current state. §8 is the road
ahead. §9 is the pointer map (where the durable record actually lives).

---

## 1. The story in one paragraph

We forked OpenSpec (`pfurini/OpenSpec` ← `Fission-AI/OpenSpec`) to build a **deep-planning
methodology** that carries a change from *product discovery → a real PRD → exploring the WHAT →
designing the HOW → a not-too-detailed initial plan → autonomous plan/implement/verify (PIV)
waves run by a harness*. The core engineering was done on `feat/explore-what-brainstorming`
(109 commits, Jun 10–24): a **WHAT/HOW separation** of thinking skills, a `deep-planning` schema
whose `tasks.md` is a value-ordered **TDD wave map**, a just-in-time `wave-plan` endpoint, an
ADR/glossary memory layer, and an Archon-backed harness that ran a change end-to-end to a draft
PR. Mid-flight (Jun 23) upstream shipped a **breaking "stores" architecture** that replaced the
very workspace/initiative model `feat` had been building on. Rather than let the fork diverge
forever, we chose to **adopt the stores base and replay feat's genuinely-new work onto it**
(the "Option B" port → the `personal` branch, 13 commits, Jun 24–27, **skills-only**). The
harness is *built and mechanically working* but its clean-run proof is still owed; product
discovery, PRD, Linear sync, research-grounding, and a falsification-disciplines pass are all
parked as named follow-ups.

---

## 2. The mission, in the user's own words

> *"I still want the full pipeline proved, I dont want to manually write waves plans. Let we
> build first the tasks/waves production, then we'll see what comes after."* — 2026-06-13

> *"Interview me until you have 95% confidence about what I actually want, not what I think I
> should want."* — 2026-06-13 (the discovery-quality bar)

> *"It should become general enough at the end, but the project I can test it on is lexup
> today… several decisions I've backed in the lexup skills are just good practice in general
> (they just need to be distilled)."* — 2026-06-13 (generalize, but prove on a real project)

> *"before adding more seeds, I want to ground the work practically now."* — 2026-06-13

**Priorities the work consistently optimizes for:**
1. **End-to-end autonomy actually working** before adding scope ("ground before expanding").
2. **Terseness as a correctness measure, not style** — *"more fluff you add and more noise can
   cause drift."* Prompts/skills are kept terse to prevent agent drift.
3. **Adversarial gates and honest failure flags** over speed — the user asked for *"a plan
   validation step… better if it is an adversarial one with another agent like codex"* (this is
   the seed that later became the falsification-disciplines brief; see §8).
4. **Distilling project-specific (lexup) good practice into general, installable tooling.**
5. **Cost/speed tuning via complexity classification** — a cheaper/faster implementer model —
   *but never at the expense of plan quality* ("impl tier never small; planning always large").

**North stars:** a provider/project-agnostic harness; the harness workflow living in OpenSpec as
the **canonical source**, installed into targets via the CLI "like commands and skills"; all
agent compute on owned hardware. Product discovery, PRD, and Linear-as-driver are explicitly
*later* initiatives — this effort is "the **engineering harness proof**, not the product-discovery
/ workspace / Linear / research initiative."

---

## 3. The deep-planning methodology — the spine

The methodology is encoded in `schemas/deep-planning/schema.yaml` (the single self-documenting
source) and the skill suite in `schemas/skills/`. The flow:

| Phase | Skill | Produces | Nature |
|---|---|---|---|
| **WHAT** | `openspec-explore` | `openspec/explorations/<name>.md` (exploration note) | Pure thinker; one-sentence gate, given-constraints, falsifiability |
| Transcribe | `openspec-continue-change` | `proposal.md` → `specs/**` | **Mechanical** (`continueMode: flow-to-gate` batches both, stops at the design gate) |
| **HOW** | `openspec-design` | `design.md` + **wave skeleton** + ADRs | Pure thinker; interviews the user, gates them on the wave-map shape |
| Transcribe | `openspec-continue-change` | `tasks.md` (TDD wave map) | **Mechanical** transcription of the wave skeleton + repo-grounding of test paths |
| **Execute** | `openspec-apply-change` + `wave-plan` endpoint | per-wave JIT `plans/wave-N.md`, code | Autonomous, harness-driven; red-green-refactor, commit-per-cycle |
| **Verify/Archive** | `openspec-verify-change`, `openspec-archive-change`, `openspec-sync-specs` | spec baseline updates | Review + promotion |

**The load-bearing ideas:**
- **WHAT/HOW are separate pure thinkers; `continue` only transcribes.** The thinker owns the
  formalization — the `design→tasks` conversion was identified as the fidelity bottleneck, so
  `openspec-design` now decides the wave skeleton *with the user* and writes `design.md`
  directly; `tasks` is genuine transcription, not judgment (`design-tasks-pipeline-collapse.md`).
- **`tasks.md` is a value-ordered TDD wave map.** Each wave is a vertical slice with independent
  observable value (not a horizontal layer); wave 0 is a committed-RED tracer bullet; one
  checkbox per wave; a coverage map routes each scenario to its cheapest proving test layer.
- **The JIT `wave-plan` endpoint** (`openspec instructions wave-plan --change X --wave N`) turns
  one wave into a self-sufficient plan a *fresh-context* agent can implement using only the plan
  + the files it names ("no prior-knowledge" standard). Humans approve the **wave map only**;
  wave plans are generated at run time, not pre-approved (v1).
- **Falsifiability everywhere:** proposals carry *given* Constraints (each a number/named rule,
  not an adjective); specs ban vibe words; the wave planner enforces a "Nyquist self-check"
  (every cycle has an automated Validate command).
- **Durable memory layer:** project-owned ADRs (`docs/adr/`) + root `GLOSSARY.md`, a
  machine-generated ADR registry (`openspec adr index`), and `openspec lint --adr` grounding.
- **Documented-deviation rule:** v1 runs with no mid-run human gate; the JIT planner logs any
  unsettled design fork + rationale; end-review flags only *undocumented* ones. That is what
  keeps the no-interruption contract honest.

---

## 4. The 17 locked decisions (condensed)

Full text + provenance: `openspec/explorations/README.md` on `feat` ("Decisions locked"). The
spine:

1. **WHAT/HOW separation**; both pure thinkers; `continue` transcribes.
2. **Unit of work = a right-sized change** — the *coarsest* unit that fits one workflow run
   cleanly (not the smallest). Split only when too big or a genuinely independent capability.
3. **Intra-change execution = A′ unrolled wave slots** (static per-wave plan→implement→gate
   triplets, `when:`-gated), *not* a single Ralph/dispatch loop.
4. **ADRs/glossary are project-owned**, prompt-level lifecycle (`proposed` → archive promotes to
   `accepted`).
5. Git owns content truth; **Linear (v1) is outbound-only** projection.
6. **All agent compute on owned hardware**; model choice owned (Archon tiers, local via Pi/ollama).
7. **Task machinery is TDD**: wave map + per-cycle red-green-refactor; tests-last is a defect.
8. **Three grains:** commit = one TDD cycle; fresh session = one wave; run/worktree/PR = one change.
9. **Planner ⪰ implementer, always** (implementer is never the stronger model).
10. **Dynamic model routing = post-v1**; v1 uses static per-node tiers.
11. **No parallel code-writing inside a change** (one worktree). Independence between waves = the
    signal to split into sibling changes.
12. Project skills enter as recorded artifact references, never session memory.
13. **Mid-run design forks = documented deviations** (no human interruption in v1).
14. **Autonomous wave-growth within K=10 is allowed but flagged** (never silent).
15. **Test-layer routing = principle in OpenSpec, concrete table in a project "test-strategy" skill.**
16. **The harness workflow is OpenSpec-canonical, CLI-installed** (lexup was the testbed
    bootstrap, not the home) — *still pending build*.
17. **impl-tier = multi-dimensional complexity prediction + escalation**; impl ∈ {medium, large}
    never small, plan = large constant.

---

## 5. What shipped as code on `feat`

Interactive `openspec-design` (interview discipline, ADR floor); enriched `openspec-explore`
(one-sentence gate, given-constraints, glossary seeding); the shared prime ritual
(`shared-prime.ts`); ADR lifecycle in archive; the `deep-planning` schema (Constraints section,
falsifiability gate, `flow-to-gate` continueMode, MECHANICAL-ONLY tasks, wave-map tasks +
`instructions wave-plan`, plus the 2026-06-14 hardening: atomic-slicing, behavior-change-
includes-its-test, ground-named-test-paths); `openspec list --explorations`; the ADR registry
(`openspec adr index`) + `lint --adr`; and the **multi-file skill authoring** model
(`schemas/skills/<name>/` directories with `references/` + bundle markers, replacing TS string
literals). The **`openspec-reverse`** brownfield baseline skill landed late on `feat` (Jun 22)
and is the one shipped feature with a complete OpenSpec change trail.

The harness itself (the A′ Archon workflow, lexup `.archon` wiring, the `lexup-testing` skill)
ran the v1 proof but lives in the **lexup testbed** pending canonicalization into OpenSpec
(decision 16). Archon-side fixes (loop transient-retry, loop model-escalation, gate
env-isolation) landed in the separate `archon` repo.

---

## 6. The upstream divergence and the Option B port (the `personal` branch)

**What happened.** On **2026-06-23** upstream landed `a0decbe feat(stores)!: replace workspaces
and initiatives with stores (#1190)` — a 235-file breaking change swapping the
`workspace`+`initiative`+`context-store` model for **`store`+`workset`+`context`+`doctor`** (a
*store* = a standalone planning git repo; code repos declare read-only *references*; nothing
syncs). `feat` (Jun 10–24) had been building straight past this — 109 ahead / 6 behind, where the
6 incoming commits *were* the stores migration. A blind merge produced an incoherent tree
registering **both** command surfaces and was aborted.

**The decision.** Reframed as an *architecture fork, not a conflict job*. Three options:
- **A** — keep feat as-is, cherry-pick only safe upstream fixes. *Divergence keeps growing.*
- **B** — adopt stores as the base, deliberately replay feat's genuinely-new work on top.
  *Most work, but produces a coherent, upstream-aligned branch.*
- **C** — reject stores; feat's architecture wins permanently. *Only viable if never tracking
  upstream.*

The tie-breaker question: *"is this branch meant to eventually go back to upstream, or is it your
own long-lived fork?"* The user chose **B** (verbatim: *"Abort the merge, let's go with option
B"*) — re-converge onto upstream to stop the drift.

**How it was executed** (commits `3ab80b6`→`13b4f45` on `personal`, all skills-only):
- **L1** — additive, no-coupling slice: `src/core/reverse/`, `adr/`, `lint/` + the 14 authored
  `schemas/skills/` SKILL.md sources; scrubbed dead `workspace-planning` STOP guards.
- **L2** — replace personal's `generateSkillContent`/command-generation model with feat's
  authored-SKILL.md engine; **delete `src/core/command-generation/` (27 adapters)**; bring the
  `deep-planning` schema.
- **L3** — command surface, the **wave-plan endpoint** (grafted off feat's deleted initiative
  model), and **full delivery-config removal**.
- **L4** — rebaseline the skill-parity hash wall; drop the obsolete workspace-planning guard test.
- Plus completeness reconciliation (`continueMode` emit, `list --explorations`, welcome hints),
  restoring `AGENTS.md`, the `/opsx:` → `/openspec-<skill>` doc sweep, and bringing back +
  archiving the reverse change (syncing its specs into the baseline).

**Constraints imposed:** skills-only (canonical `.agents/skills/` store, Claude symlinked, every
other tool reads natively, no per-tool command files); delivery removed atomically; keep the
deep-planning schema + all skills + wave-plan; defer the larger reverse work to a GH issue.
Final suite green (~1693 tests); `personal` pushed to origin at `13b4f45`.

---

## 7. Current state (2026-06-28)

- **Branch `personal`** is the working line, in sync with `origin/personal` at `13b4f45`. Working
  tree is clean except this file and a `.gitignore` edit (ignoring the generated `.agents/` store).
- **The harness is built and mechanically working** — it ran a lexup change end-to-end to draft
  PR #114, meeting 3 of 4 bars (green-gated, 0 human turns, per-wave TDD trail). **The 4th bar —
  zero undocumented deviations on a clean 4/4-green run — is built but NOT yet proven.** No
  cursor-era run has gone fully green to a PR. *This is the immediate open milestone.*
- **Cursor is the default provider** (economic lever); plan + code-review pinned to claude-terminal
  opus; impl on cursor with opus escalation-on-stall; deterministic `pnpm check` guardrails against
  weak-model reward-hacking.
- **The design record (`openspec/explorations/`, 13 notes + index) exists only on `feat`.** On
  `personal` the `openspec/` tree was deferred, so the methodology's *why* is not visible on the
  branch we ship from — the gap this document and issue #1 exist to close.

---

## 8. The road ahead — two tracked open items + parked initiatives

**Open, tracked:**

1. **GH issue #1 (OPEN): reconcile the `openspec/` spec baseline with the skills-only-on-stores
   port.** The port deferred the artifact tree, so the dogfooded baseline (38 specs / 83 archived
   changes inherited largely from upstream) now contradicts shipped code. *Reverse slice = DONE*
   (cli-reverse + reverse-baseline-skill specs synced via archive). *Remaining:* retire
   command-generation / delivery / per-tool-command specs; add missing specs for `wave-plan`, the
   `deep-planning` schema, and the stores-aware skill model; triage 4 obsolete active changes
   (`add-tool-command-surface-capabilities`, `fix-opencode-commands-directory`,
   `unify-template-generation-pipeline`, `simplify-skill-installation`). Recommended path: drive
   it *through the workflow itself* (`/openspec-new-change` → … → `/openspec-archive-change`) as
   the next dogfood.

2. **`process-disciplines-handoff.md` (this folder, un-started)** — the umbrella process brief
   (it folds the earlier falsification-disciplines brief in as Seam-group 1). It
   ports battle-tested execution disciplines into OpenSpec deep-planning from three sources: the
   superpowers **falsification** disciplines (shared `FALSIFY_RITUAL` claim-type→falsifier routing
   into `openspec-design` / `apply` / `verify-change`); the **Coolify provisioner retro** (12
   learnings → ~9 seams: API-contract four-dimensions, invariant register + mechanical guards,
   detail-by-stability validating the JIT wave-plan, code-complete≠proven close-out, etc.); and
   **GSD** (maturity-tiered research-gating + a mechanized cross-model adversarial review — the
   disciplined form of the user's own "adversarial plan validation with codex" ask). It carries a
   files-to-touch map (incl. the OpenSpec skill machinery in §7) and a §6 backlog of un-mined
   execution records. No skill code changed yet. `START-HERE.md` is the ranked backlog over it.

**Parked for later initiatives** (deliberately out of scope for the harness proof): product-
discovery / PRD phase; Linear-as-driver sync; parallel research-grounding capability;
plan-validation-and-recovery (anti-brittleness); and the still-pending **decision 16** —
canonicalizing the harness workflow into OpenSpec as a CLI-installed artifact.

---

## 9. Pointer map — where the durable record actually lives

| Record | Location | Branch |
|---|---|---|
| The methodology spine (self-documenting) | `schemas/deep-planning/schema.yaml` | `personal` + `feat` |
| The skill suite (authored source) | `schemas/skills/<name>/SKILL.md` (+ `references/`) | `personal` + `feat` |
| The design journal (13 notes + index, 17 locked decisions) | `openspec/explorations/` (READ the README first) | `personal` + `feat` (restored `a7d546d`) |
| The harness build/run trail (§13–§16) | `openspec/explorations/task-machinery-and-wave-execution.md` | `personal` + `feat` |
| The architecture model | `openspec/explorations/phase-graph-unified-model.md` | `personal` + `feat` |
| The port reasoning (Option B, layers L1–L4) | commit bodies `3ab80b6`→`13b4f45` | `personal` |
| Spec-baseline reconciliation tracker | GitHub `pfurini/OpenSpec#1` | — |
| The operating index (ranked backlog) | `openspec/explorations/ops/START-HERE.md` | `personal` |
| The next-session brief (umbrella — process disciplines) | `openspec/explorations/ops/process-disciplines-handoff.md` (absorbs the falsification brief) | `personal` |
| The Superpowers → OpenSpec port map | `openspec/explorations/ops/superpowers-openspec-sync.md` | `personal` |
| The provisioner execution retro (a mined source) | `…/lexup-new/docs/superpowers/retros/2026-06-28-provisioner-process-learnings.md` | lexup repo |
| This reconstruction | `openspec/explorations/ops/RECONSTRUCTION.md` | `personal` |
| The plain-words explainer (for humans) | `openspec/explorations/ops/PLAIN-WORDS.md` | `personal` |

**Caveat on this file:** §3–§5 and §7 are sourced from the `feat` design journal and may lag the
journal's own README for the harness's live state — treat
`openspec/explorations/task-machinery-and-wave-execution.md` §13–§16 (on `feat`) as authoritative
for harness run status; treat the commit bodies as authoritative for the port.
