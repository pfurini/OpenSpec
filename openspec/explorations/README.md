# Explorations index — handoff entry point

**Start here.** This directory is the durable design record for the deep-planning /
harness work on branch `feat/explore-what-brainstorming`. An implementing session should
read this index, then ONLY the note(s) for its chosen track — not the whole corpus.

Two families of files:
- **Ours (this effort)** — the notes in the table below (the harness track's build contract is
  `task-machinery-and-wave-execution.md`; read its §13–§16 first for current state).
- **Upstream** (`workspace-*.md`, `explore-workflow-ux.md`) — inherited context; read only
  if a track touches workspaces/initiatives.

## The notes, by role

| Note | Role | Status |
|---|---|---|
| `task-machinery-and-wave-execution.md` | **The current build contract (read FIRST for the active track).** TDD wave model (3 grains, commit-per-cycle, two-level queue, JIT wave plans), A′ unrolled-slot workflow, static per-node tiers (planner ⪰ implementer), test-layer routing via project skill, skills backbone, K=10, documented-deviation rule. **§13–§16 = the 2026-06-14 build+run findings** (execution grain, impl-tier rubric + tier floors, change-gate + tail restructure, the canonical-source decision). Supersedes phase-graph's intra-change section + parts of executable-plans | **Harness AUTHORED + ran END-TO-END 2026-06-14 → green-gated draft PR (PR #114), 0 human turns.** One v1 bar open (zero undocumented deviations → tail restructure §14/§15). Read §13–§16 for current state |
| `phase-graph-unified-model.md` | **The architecture.** OpenSpec↔Archon harness model: unit = right-sized change; change DAG (orchestrator) + task DAG; validation gates; build order; size ceiling. *Intra-change execution + model routing sections superseded — see task-machinery note* | Core model **CONFIRMED**; intra-change parts superseded |
| `executable-plans-and-feedback-loop.md` | Content spec for the rich task-builder (self-sufficiency standard, ralph `prd.json` convergence) + implementation report / feedback loop. *§1 now lands in the wave-plan instruction; "fatten tasks.md" item resolved — see task-machinery note* | Partially absorbed into task-machinery note |
| `change-records-and-thinking-layer.md` | Amendment model, shadow-layer caveat, ADR/glossary layer (§4 LANDED), small parked items (§5) | Mixed: §4 shipped, rest deferred |
| `multi-file-skill-generation.md` | **Kill single-file flattening.** OpenSpec's skill/command emitter produces single-file `SKILL.md` only, which flattened rich multi-file source skills into a sentence. Scope (ratified): opsx skills become multi-file (SKILL.md + references/ + scripts/), per-tool capability-gated degradation; NOT a user-facing skill generator. Prerequisite for the `design.ts` quality rewrite. | Captured 2026-06-13; **build after step-2** |
| `prompt-adherence-and-design-rewrite.md` | **Open threads from the 2026-06-13 session.** The under-read prime diagnosis (3 discipline failures = adherence not missing-instructions; fix = enforcement/observability, not more prose; bisection still owed); the user-requested `design.ts` rewrite (pending: name-the-borrows vs gap-analysis; depends on multi-file gen); parked: lint→hook/CI wiring, deterministic command-flow enforcement, B/C lint rules, implTier heuristic. | Captured 2026-06-13; not started |
| `specialized-review-steps.md` | WHAT-review vs HOW-review panels, dimensions distilled from gstack/PRP/claudekit/furiai. Full panel deferred; v1 harness still includes classification-gated verify/review. | Deferred except v1 harness gates |
| `plan-validation-and-recovery.md` | **Anti-brittleness: plan validation + failure recovery.** Cross-model wave-map validation (slicing/grounding/test-layer) + reconciliation (self-fix→replan→resume→human gate). Captured from 3 live design-defect failures (the "tied to a perfect plan" treadmill). Frames the brainstorm; mostly OPEN. | Brainstorm SEED 2026-06-14; not started |
| `research-grounding-capability.md` | Parallel specialized research (external + codebase) at grounding points | Deferred; next priority after v1 harness |
| `product-discovery-prd-phase.md` | Problem-first discovery → real PRD, BEFORE explore | Deferred; out of scope for this initiative |
| `linear-github-sync.md` | v1: outbound push to Linear (configurable mapping, ids in metadata). Future vision: Linear as driver (Agents API = protocol-not-runtime; all compute on own hardware) | Buildable later; out of scope for this initiative |
| `explore-workflow-ux.md` | Earlier explore UX thinking (pre-dates this effort) | Historical |

## Current v1 target (2026-06-13) — STATUS 2026-06-14: 3-of-4 bars met

**Progress 2026-06-14:** the harness was authored (A′ workflow + generator in lexup) and ran
end-to-end → a **green-gated draft PR (PR #114) with zero human turns**. Of the four
done-condition bars below, three are met: green-gated PR ✅, zero human turns ✅, per-wave TDD
trail ✅. The fourth — **zero undocumented deviations** — is OPEN: the tail nodes (change-gate /
self-fix / simplify) mutate code without logging to progress.md. Fix = the §14/§15 tail
restructure in `task-machinery-and-wave-execution.md` §16.4; then a clean re-run should pass all
four. (Also decided 2026-06-14: the harness workflow should be **OpenSpec-canonical, CLI-installed**
— see decision 16 + task-machinery §16.3.)

This initiative is the **engineering harness proof**, not the product-discovery,
workspace, Linear, or research initiative.

The target is an Archon-backed semi-autonomous harness. **V1 done-condition (falsifiable,
2026-06-13):** given the human-approved `tasks.md` wave map for lexup's
`account-profile-self-service`, the harness reaches a **green-gated, mergeable draft PR
with ZERO human turns between wave-map approval and PR** — change gate (full suite +
coverage + E2E) green, every wave shows a TDD trail (per-cycle `test:`→`feat:` commits with
pasted RED+GREEN), report lists zero undocumented deviations. Steering-reduction vs a manual
baseline is a secondary observation, not the pass/fail bar. (End goal is a general,
provider/project-agnostic harness; lexup is the v1 testbed — distill its conventions into
general mechanisms, don't hardcode them.)

V1 operating contract:
- Human approves **`tasks.md` wave map only** before code starts.
- `plans/wave-N.md` files are generated just-in-time by the harness, not manually approved.
  A later hardening pass may add adversarial cross-model plan review.
- No planned mid-run interruptions in v1. The harness runs autonomously after wave-map
  approval and reports uncertainty/deviations at the end.
- Dynamic provider/model routing is **deferred** (post-v1 hardening). V1 uses **static
  per-node tiers** (planner node strong, implementer node fixed lower, via Archon config
  tier keywords) — satisfies planner ⪰ implementer structurally, needs NO new Archon
  feature. The full routing design (portable stamps in `tasks.md` → config mapping →
  runtime route/classify/finalize) is preserved as the post-v1 target; tier hints may be
  written now but v1 doesn't act on them for model choice. (Amended 2026-06-13.)
- Verify/review are part of v1, but classification-gated like Archon's experimental
  fix-issue workflow.
- Research is the next capability after v1. PRD/product discovery, Linear, and workspace
  coordination are explicitly parked for later initiatives.

## Decisions locked (do not re-litigate)

1. WHAT/HOW separation: explore=WHAT, design=HOW; both pure thinkers; `continue` transcribes.
2. Unit of work = a **right-sized change** (coarsest fitting one workflow run); worktree
   parallelism = the change DAG; capability axis primary; parent/child HOW-slicing deferred.
3. Intra-change execution = **A′ unrolled wave slots** (static slot triplets,
   `when:`-gated, disk wave queue), not the old single Ralph/dispatch loop. The Ralph
   pattern survives as donor for durable work queues/progress, not as the workflow shape.
4. ADRs/glossary are **project-owned** (`docs/adr/`, root `GLOSSARY.md`), prompt-level
   lifecycle (`proposed` → archive promotes to `accepted` via `change:` front-matter link).
5. Git owns content truth; Linear (v1) is outbound-only projection.
6. All agent compute on own hardware; model choice owned (Archon tiers, local via Pi/ollama).
7. Task machinery is TDD: `tasks.md` is the wave map, and each `plans/wave-N.md`
   checkbox is one red-green-refactor cycle. Spec scenarios are the behavior blocks;
   wave 0 = tracer bullet. Tests-last task lists are a defect.
8. Three grains: **commit = TDD cycle (LOCKED 2026-06-13** — per-cycle `test:`→`feat:`
   commits are the independent TDD evidence trail; NO per-wave batching; matches ralph's
   native per-task commit grain); fresh session = wave; run/worktree/PR = change.
9. **Planner ⪰ implementer, always** (planner tier ≥ implementer tier — equal is allowed,
   implementer is NEVER stronger than the planner) — structural, per-node; killed the
   single-loop dispatch design. Preserved via STATIC per-node tiers in
   v1 (planner node strong, impl node fixed lower); via classifier output post-v1.
10. **Dynamic routing = POST-V1 target** (amended 2026-06-13): the eventual end-state is no
    static models in workflow YAML — `model:`/`provider:` resolved at runtime by route
    defaults from `tasks.md` stamps + Archon config, with classifier overrides (Archon
    substitution feature, user-built). **V1 uses static per-node tiers** and defers the
    substitution feature off the critical path. The risk → verification-depth classification
    (which reviewers run) still ships in v1 — it gates reviewers, not model choice.
11. No parallel code-writing inside a change (one worktree: git index, single-writer
    state files, test-infra exclusivity). Independence between waves = split signal →
    sibling changes. Intra-run parallelism = read-only fan-outs only.
12. Project skills enter as recorded artifact references (explore → design → wave →
    Mandatory Reading), never as session memory.
13. **Mid-run design forks = documented deviations** (2026-06-13): no human interruption in
    v1; the JIT planner logs any unsettled fork + rationale to progress.md/report, end-review
    flags only *undocumented* ones. Post-v1 evolution: optional adaptive human gate (push to a
    Telegram channel, ~30-min timeout → fall back to log-and-continue). See task-machinery §4.3.
14. **Autonomous wave-growth within K is allowed but flagged** (2026-06-13): the approved wave
    count is a floor; any appended/split wave surfaces in the final report, never silently.
    K=10; overflow = mis-sized change → human re-scopes (no auto-sibling-split). task-machinery §5.3.
15. **Test-layer routing = principle in OpenSpec, table in a project skill** (2026-06-13): the
    wave-plan instruction holds the "cheapest layer that proves it" principle; the concrete
    per-scenario table comes from a project "test-strategy" skill (lexup-testing = first
    instance), keeping OpenSpec general from day one. task-machinery §7.
16. **Harness workflow is OpenSpec-canonical, CLI-installed** (2026-06-14): the A′ workflow YAML
    + its generator are project-agnostic and live in **OpenSpec** (this repo), installed into a
    target's `.archon/workflows/` via the CLI — exactly like commands and skills. Hand-authoring
    in lexup was the testbed bootstrap, not the home. Project specifics (gate commands, tier
    mapping, `copyFiles`, test-strategy skill) stay in the target's config/skills; the emitted
    workflow references them, parameterized. Extends decision-12 generality: the Archon adapter
    (the workflow YAML) is now OpenSpec-owned + installed, not copied per project. task-machinery §16.3.
17. **impl-tier = multi-dimensional prediction + escalation; tier floors** (2026-06-14): per-wave
    `implTier` is predicted by a 5-dimension complexity rubric (library fragility / test layer /
    pattern availability / behavioral pinning / algorithmic complexity — NOT size or risk), with
    escalation as the backstop. **impl ∈ {medium, large}, never small** (haiku = glue only);
    **plan = large, constant**. task-machinery §13.3.

## What is code vs notes (already shipped on this branch)

Shipped (OpenSpec code, on branch): interactive `/opsx:design` (interview discipline, ADR floor),
enriched `/opsx:explore` (one-sentence gate, given-constraints, glossary seeding), shared prime
ritual (`shared-prime.ts`), ADR lifecycle in archive, `deep-planning` schema (Constraints
section, falsifiability gate, flow-to-gate continueMode, MECHANICAL-ONLY tasks, wave-map tasks +
`instructions wave-plan`, the 2026-06-14 hardening rules: atomic-slicing,
behavior-change-includes-its-test, ground-named-test-paths), `openspec list --explorations`,
ADR registry (`openspec adr index`) + `lint --adr`. Suite ~1700 (2026-06-14 changes are
prompt/schema content, no OpenSpec test-count change).

**NOT yet OpenSpec code (lives in the lexup testbed, to be canonicalized — decision 16):** the
A′ harness workflow (`opsx-wave-harness.gen.mjs` + `.yaml`), the lexup `.archon/config.yaml`
wiring, and the lexup-testing skill grounding. These ran the v1 proof but must move into OpenSpec
as an emitted/installed artifact (task-machinery §16.3). archon-side (separate repo, branch
`feat/claude-terminal-provider`): `claude-terminal` tier-defaults + loop-`model:` doc fix.

## Recommended next steps (in order)

0. ✅ **DONE (2026-06-12, 100% pass under the cold-handoff protocol).** Verified live:
   archive moved all 5 artifacts; ADR-0037 re-derived through the interview and promoted
   (`change:` link, `accepted` + date); proposal Constraints grouped + falsifiable with an
   HONEST "None" (no fabrication); specs vibe-word-clean; tasks zero deferred decisions;
   design fed a spec-wording fix back to the WHAT properly. lexup reverted to pre-test
   state afterward (the change is active again, planning artifacts regenerated and valid).
   ~~Acceptance tests on lexup (~30 min, validates shipped prompt work):~~
   (a) run `/opsx:design` on a real change — expect one-question-at-a-time interview,
   ADR-worthy decisions confirmed with the user, nothing deferred to tasks;
   (b) design→archive ADR lifecycle — ADR written to `docs/adr/` with `change:` +
   `status: proposed`, archive flips it to `accepted`.
   **Setup (account-profile-self-service):** keep the exploration note + `.openspec.yaml`
   + ADR-0036; delete the stale `proposal.md`, `specs/`, `design-notes.md` (pre-dates the
   interview work) and `docs/adr/ADR-0037-*` (minted unilaterally, old format). Archive
   dry-run: git-checkpoint first, confirm the incomplete-tasks warning, **DECLINE spec
   sync** (feature is unimplemented), verify ADR flip + move, then `git reset --hard`.
   **Cold-handoff protocol — `/clear` at every command boundary, never mid-interview:**
   artifacts must carry ALL state (the architecture's central claim; Archon consumers are
   fresh-context by design). Warm sessions produce FALSE PASSES (the model remembers what
   the note should have carried). Bisection rule: cold-fail + warm-pass = artifact/prime
   gap; fails both = prompt gap.
1. **REVERSED (2026-06-12) — task machinery BEFORE the slice.** The old "vertical slice
   first, needs NO new OpenSpec code" is dead: the slice would validate task output we've
   decided is defective (tests-last, too coarse). New order — read
   `task-machinery-and-wave-execution.md` §9 for the full checklist:
   1. ✅ **DONE (2026-06-13).** Deep-planning schema + command rework (wave-map tasks, design
      de-parallelization, wave-plan instruction + `instructions wave-plan` endpoint, skills
      wiring, parity re-harvest). Plus: proposal Constraints carried into propose+template;
      design Open-Questions triage at the tasks boundary; ADR registry (`openspec adr index`)
      + drift `openspec lint --adr` + prime forcing-function. All on branch, suite 1700.
   2. ✅ **PASSED (2026-06-13) — writing-pass acceptance test, cold-handoff regeneration of
      lexup `account-profile-self-service`.** Verified live: 5-wave TDD map (W0 failing-E2E
      tracer + scaffold; value-ordered vertical slices); one `- [ ]` per wave → `apply --json`
      progress.total=5; coverage-map layers transcribed **verbatim** from design's Testing
      Approach (perfect scenario-by-scenario fidelity); per-wave stamps + skills (all 5 cited
      skills exist, not fabricated); NO scope-reduction language; design Open Questions "None"
      (no carried-over, no dodged); proposal Constraints grouped+falsifiable; slice-composition
      (not parallelism). **The three earlier-round defects did NOT recur:** no duplicate ADR
      (only ADR-0037), `lint --adr` clean (registry in sync), glossary unpolluted. One noted
      deviation (not a fail): wave gates run filtered Playwright (§7 [REC] was "change gate
      only") — defensible for proving the tracer RED→GREEN. Proves the writing pass only —
      NOT harness execution (steps 3–4: no Archon/tiers/code).
   3. ✅ **DONE 2026-06-14.** Authored the A′ workflow (generator + `opsx-wave-harness.yaml`)
      in lexup `.archon/workflows/`; validated + wiring-proven. task-machinery §16.
   4. ✅ **DONE 2026-06-14 (near-pass).** Ran the slice end-to-end → green-gated draft PR
      (PR #114), all 5 waves green, zero human turns. One v1 bar open (zero undocumented
      deviations) → the §14/§15 tail restructure (task-machinery §16.4) is the next build.
   Deferred track (post-v1, user-owned, in Archon): substitution on `model:`/`provider:` +
   `<next-model>` loop directive — no longer blocks v1; pick up when hardening static→dynamic.
2. **Inter-change graph:** implement `add-change-stacking-awareness`
   (spec: `openspec/changes/add-change-stacking-awareness/` — upstream-authored, check
   upstream for in-flight implementation first). The orchestration contract.
3. Then per the phase-graph build order: validation gates → right-sizing/split;
   capability tracks (review steps, discovery, research grounding, Linear v1) slot in
   independently. (Task-DAG formalization is absorbed by the wave model.)

## Open stack after the 2026-06-14 harness run (ordered map for the next session)

Steps 1-4 of the harness track are DONE: schema/command rework **shipped**, writing-pass
**PASSED**, A′ workflow **authored**, slice **ran end-to-end to a draft PR** (PR #114, 0 human
turns). The harness mechanically works; the open work is the tail restructure + then hardening.

1. **Tail restructure — the one open v1 bar (zero undocumented deviations) + turn-cap robustness.**
   Single coherent change; full punch list in `task-machinery-and-wave-execution.md` §16.4
   (details §14 + §15): change-gate runs tests in bash / agent only fixes; review/self-fix off
   `gh pr` → base diff; reorder `waves → simplify → review → self-fix → change-gate → create-pr →
   post-review-comments → report`; tail nodes log to progress.md; change-gate flags out-of-scope
   reds; add `post-review-comments`. Then re-run → expect all four done-condition bars green.
2. **Make the harness OpenSpec-canonical, CLI-installed** (decision 16; task-machinery §16.3).
   The workflow YAML + generator live in lexup today (the testbed); they belong in OpenSpec,
   emitted/installed like commands + skills, with project specifics (gate commands, tiers,
   copyFiles, test-strategy skill) staying in the target. Pairs naturally with the multi-file
   skill generation track (same emit/install machinery).
3. **impl-tier rubric + escalation** (task-machinery §13.3) — the cheaper/faster-impl lever:
   5-dimension complexity classifier → `implTier` ∈ {medium, large}; escalate on thrash;
   calibration loop. Flip on once plan quality is solid (do after the clean re-run).
4. **Plan-validation + reconciliation** (`plan-validation-and-recovery.md`, SEED) — the
   anti-brittleness capability (cross-model wave-map validation + self-fix→replan→resume→human
   gate). The next major capability after the harness reaches a clean pass.
5. **Multi-file skill generation** (`multi-file-skill-generation.md`) → then the **`design.ts`
   rewrite** (`prompt-adherence-and-design-rewrite.md` §2, after the **bisection** §1).
6. **`openspec lint` → hook/CI wiring** + **B/C grounding-lint rules**
   (`prompt-adherence-and-design-rewrite.md` §3); **deterministic command-flow enforcement**.

Shipped 2026-06-14 (pushed): the lexup harness (generator + `opsx-wave-harness.yaml` + config +
lexup-testing grounding); archon `claude-terminal` tier-defaults + loop-`model:` doc fix
(`feat/claude-terminal-provider`); OpenSpec schema hardening rules (atomic-slicing,
behavior-change-includes-its-test, ground-named-test-paths); notes §13–§16 +
`plan-validation-and-recovery.md`. Earlier (2026-06-13, suite 1700): wave-map +
`instructions wave-plan`; Constraints carry-through; Open-Questions triage; ADR registry + drift.

## Implementation-session protocol (tribal knowledge — read before coding)

- **Repo**: `/Users/paolof/Developer/ai/OpenSpec`, branch `feat/explore-what-brainstorming`
  (fork pfurini/OpenSpec). Commit + push each milestone.
- **Prompt templates** live in `src/core/templates/workflows/*.ts` (skill + command bodies,
  often duplicated per file — use `replace_all` and VERIFY both bodies got the edit).
- **Parity test**: any template change breaks
  `test/core/templates/skill-templates-parity.test.ts` (SHA-256 hashes). Re-harvest by
  computing hashes with the same stableStringify+sha256 (tsx script) and updating
  `EXPECTED_FUNCTION_HASHES` + `EXPECTED_GENERATED_SKILL_CONTENT_HASHES`.
- **Suite**: `npx vitest run` (1665 tests); build: `npm run build`.
- **Testbed**: lexup at `/Users/paolof/Developer/Projects/lexup/lexup-new`
  (`openspec/config.yaml` → `schema: deep-planning`; active change
  `account-profile-self-service`). Propagate prompts with
  `node ./bin/openspec.js update --force <lexup-path>` (NO --force = skipped on unchanged
  version stamp). Schema YAML is NOT propagated — it resolves at runtime from this repo's
  `schemas/deep-planning/schema.yaml` because lexup runs this dev binary.
- **Harness (lexup testbed, TO CANONICALIZE — decision 16):** the A′ workflow lives at lexup
  `.archon/workflows/opsx-wave-harness.{gen.mjs,yaml,stub.yaml}` (generator + emitted real + stub).
  Regenerate: `node opsx-wave-harness.gen.mjs [--k N] [--mode real|stub]`. Validate:
  `archon validate workflows opsx-wave-harness`. The run loads config from the **worktree** cwd
  (`executor.ts:383`); `--resume` matches the run's `working_path` exactly, so resume from the
  worktree dir or via run-id (`archon workflow run opsx-wave-harness --resume`). Wave gates =
  bash; change-gate + impl = loops. lexup config: `assistant: claude-terminal` (REPO key is
  `assistant:`, not `defaultAssistant:`), `copyFiles: [.env, apps/web/.env]`,
  `turnTimeoutMs: 1800000`. Standalone CLI needs `DATABASE_URL` in `~/.archon/.env` to use
  Postgres (else SQLite). The next build moves all this into OpenSpec as an installable artifact.
- **Archon source of truth**: harness execution facts are pinned in task-machinery §10–§11
  (loop-`model:` honored, env model, `event emit`, trigger rules) and the §13–§16 build/run
  findings. Verify capability claims against `~/Developer/ai/archon/packages/workflows/src/`.
- **Archon**: `/Users/paolof/Developer/ai/archon` — skills at `.claude/skills/archon`
  (runtime) and `.claude/skills/archon-dev` (their dev workflow); stock workflows at
  `.archon/workflows/defaults/` (ralph-dag is the Ralph reference). Verify capability claims
  against `packages/workflows/src/`. (The loop-`model:`-is-ignored stale spot was FIXED
  2026-06-13 — archon commit `7f5327b`, branch `feat/claude-terminal-provider` — in the skill
  refs AND docs-web. Loop `model:`/`provider:` ARE honored; tier keywords resolve.)
- **Step-3 prerequisites VERIFIED against Archon source 2026-06-13** (all in
  `task-machinery-and-wave-execution.md` §10-§11, source-pinned, do not re-litigate): loop
  `model:`/`provider:` honored (static per-node tiers work, no new Archon feature); `skills:`
  on loop nodes ignored → deliver as prompt-body mandatory reading; `archon workflow event
  emit` is a repo-agnostic top-level CLI writing to the global `~/.archon/archon.db`; `.env`
  reaches the change-gate via `worktree.copyFiles` + `<cwd>/.archon/.env` (cwd `.env` is
  stripped at boot); skipped-slot joins use `trigger_rule: none_failed_min_one_success`.
