# Task machinery rework + wave execution model (the TDD harness synthesis)

Status: **brainstorm SETTLED 2026-06-12, implementation NOT started.** This note is the
re-priming record for the session that pivoted from "build the vertical slice" (README
step 1) to "fix the task-generation machinery first" — the harness consumes what the
task-builder emits, so the writing pass moved ahead of the harness in the build order.
**The user has more seeds to expand — this design is open at the edges, not final.**

Each item below is tagged: **[CONFIRMED]** user-ratified · **[REC]** Claude's
recommendation, unchallenged — treat as default, re-confirmable · **[OPEN]** undecided.

## 0. Relation to other notes (what this supersedes)

- `phase-graph-unified-model.md` → **"Intra-change execution … leaning C (Ralph)" is
  SUPERSEDED** by §5 here (A′ unrolled wave slots; the dispatch/Ralph loop was rejected
  for phase control). Its "Model routing" section is amended by §6 (dynamic substitution
  is a committed prerequisite, not an option). Everything else (change DAG, two gates,
  right-sizing, capability axis) stands and is assumed here.
- `executable-plans-and-feedback-loop.md` → §1's content spec (Mandatory Reading,
  Patterns-to-Mirror, per-task Validate, NO_PRIOR_KNOWLEDGE_TEST) now lands in the
  **wave-plan instruction** (§4.3), not in a fattened tasks.md. The "fatten tasks.md or
  sibling artifact" open item is RESOLVED: neither — two-level queue (§4.1). §3's report
  loop is extended with routing calibration (§6.4).
- README step 1 ("vertical slice needs NO new OpenSpec code") is **REVERSED** — see §9.

## 1. The trigger: two defects in the current tasks output

Observed in lexup `account-profile-self-service/tasks.md` (step-0 output, 26 checkboxes
in 11 component groups):

1. **Not TDD** — tests are group 11, dead last; even within groups it's impl-then-test
   (1.1 add file → 1.2 unit-test it). [CONFIRMED defect]
2. **Too coarse** — component-grained groups are acceptable *only if* each wave gets its
   own plan pass, because discoveries during a wave invalidate later plans anyway.
   [CONFIRMED — user's hypothesis, validated by the corpus: every looped framework
   (gsd, PRP, archon-dev) plans coarse upfront + fine just-in-time per slice]

Subtlety: naively flipping to "write all tests first" lands in mattpocock's
**horizontal-slice anti-pattern** (bulk tests against imagined behavior). The fix is
vertical: one behavior → red → green → refactor → next.

## 2. Framework corpus (re-read for grounding; paths are the source of truth)

| Source | Path | Load-bearing takeaway |
|---|---|---|
| superpowers writing-plans | `~/Developer/ai/superpowers/skills/writing-plans/SKILL.md` | zero-context standard; no-placeholders; self-review: criterion → cheapest-verification map |
| superpowers TDD | `~/Developer/ai/superpowers/skills/test-driven-development/` | Iron Law; verify-RED mandatory (failure *reason* matters); testing-anti-patterns.md (never test mocks; no test-only prod methods) |
| mattpocock TDD | `~/Developer/ai/mattpocock-skills/skills/engineering/tdd/` | horizontal-slice anti-pattern; tracer bullet; test public interfaces; mock only system boundaries |
| PRP prp-plan | `~/Developer/ai/PRPs-agentic-eng/.claude/commands/prp-core/prp-plan.md` | context payload (Mandatory Reading P0/P1/P2, Patterns-to-Mirror w/ SOURCE, MIRROR/GOTCHA/VALIDATE per task, NOT-building, confidence score). **PRP itself is NOT TDD** (its tests are task 8/8) — take payload, reject ordering |
| gsd | `~/Developer/ai/gsd-core/agents/gsd-planner.md`, `gsd-plan-checker.md`, `gsd-core/references/tdd.md` | plans-are-prompts; ~50% context budget; per-task Files/Action/Verify/Done; **Nyquist rule** (every task has automated verify; Wave 0 creates missing scaffolds); **scope-reduction prohibition** ("v1/for now/simplified" = blocker, split instead); adversarial plan-checker (13 dims, blocker/warning, max-3 revision loop); TDD commit gates (`test:` before `feat:`); planner authority limits (only 3 legit split reasons: context cost, missing info, dependency conflict) |
| claudekit | `~/Developer/ai/claudekit/skills/write-plan/SKILL.md`, `test-first/SKILL.md`, `plan-review/SKILL.md` | flat-list honesty; `Acceptance: test X passes AND running Y shows Z`; **evidence rule: paste red AND green runner output or it didn't happen**; two-reviewer plan review with skip-rationale discipline |
| lexup-testing | `/Users/paolof/Developer/Projects/lexup/lexup-new/.agents/skills/lexup-testing/SKILL.md` | the test-layer routing table (§7); real DB/auth, mock allowlist, mechanically-enforced bans |
| archon-piv-loop | `~/Developer/ai/archon/.archon/workflows/defaults/archon-piv-loop.yaml` | lean implement loop (select+implement+validate+commit ONLY); plan/review/PR as separate nodes |
| archon experimental fix-issue | `~/Developer/ai/archon/.archon/workflows/experimental/archon-fix-github-issue-experimental.yaml` | classify (scope + needs_external_research, haiku, `allowed_tools: []`); **smoke-validate** (verify the claims skip-decisions rest on; "vibes aren't a reliable foundation for skipping work"); `when:` skip-gates on reviewers; `trigger_rule: none_failed_min_one_success`; no-parens `&&`-binds-tighter idiom; PR-body file discipline |

ralph-dag (`defaults/archon-ralph-dag.yaml`) = rejected as donor: mega-prompt loop does
selection+impl+validation+tracking+**PR** in one prompt. [CONFIRMED "okaish but not great"]

## 3. The three grains (the core model correction)

A user challenge ("30 iterations is crazy") exposed a conflation. Decoupled: [CONFIRMED]

| Grain | Unit | Carries |
|---|---|---|
| **Commit / state** | TDD cycle | atomic commit = cycle code + its checkbox tick; bisect/revert grain |
| **Fresh agent session** | **Wave** | one session executes all of a wave's cycles (they share context: same component, files, plan); priming tax paid once per wave |
| **Workflow run / worktree / PR** | Change | unchanged from phase-graph model |

Corpus agreement: gsd executes one *plan* (2-3 tasks) per fresh subagent with per-task
commits — gsd's plan ≈ our wave. ralph's *story* ≈ our wave (not our checkbox).
Budget for the lexup change: ~5 waves → ~7-10 fresh sessions in ONE run.
A fresh session per fine task = superpowers' subagent-per-task = interactive-session
machinery, wrong for an autonomous harness. [CONFIRMED]

## 4. The artifact model

### 4.1 Two-level work queue [REC]

- **`tasks.md` = the wave map** (change-level queue). Checkboxes at *wave* grain.
  Per wave: goal (observable value), components touched, interfaces (from design),
  dependencies, `size`/`risk` stamps, skill refs, acceptance command(s).
  Wave 0 = tracer bullet (failing E2E happy-path) + missing test scaffolds (Nyquist).
  Vertical slices, value-ordered. Scope-reduction language banned (gsd list).
  Plus the **scenario → layer → named-test coverage map** (day one — it IS the TDD
  backbone; our falsifiable WHEN/THEN scenarios are the behavior blocks).
- **`plans/wave-N.md` = the executable queue** (wave-level), generated JIT in-run,
  **committed** to the change dir (fresh-context iterations + resume + cold-handoff all
  need it on disk; `$ARTIFACTS_DIR` would orphan state). One checkbox = one
  red-green-refactor cycle, each carrying behavior (from spec scenarios), test layer,
  Mirror (file:line), Gotcha, Validate command, Mandatory Reading incl. skill paths.
- prd.json/tasks.json fork: **dead at both levels** — wave map is human-grain; within a
  wave, 3-8 cycles pre-ordered by the JIT planner → checkboxes suffice.
- `openspec instructions apply --json` survives as the pull manifest (parses whatever
  `apply.tracks` points at → wave-grain progress; contextFiles already lists
  proposal/specs/design/tasks absolute paths). `change package --json` still not needed.

### 4.2 Wave checkbox semantics [REC, unratified]

Tick = **wave gate passed** (not "cycles done") — makes tasks.md progress trustworthy
for the orchestrator. Cycle ticks live in the wave plan, riding each cycle's commit.

### 4.3 The wave-plan instruction [REC]

OpenSpec-owned, schema-versioned, served as
`openspec instructions wave-plan --change X --wave N` (same pattern as
`apply.instruction`) so the harness prompt stays thin and there's no prompt duplication.
Carries: the executable-plans §1 payload spec, Nyquist self-check, scope-reduction ban,
no-placeholders, the JIT planner's bounded discretion (transcribes design+specs into
cycles; design decisions stay settled upstream; may split a wave — see §5 growth policy).

### 4.4 progress.md + evidence [REC]

Committed in change dir. Per cycle: pasted RED output + GREEN output (claudekit evidence
rule — doubles as the behavior-preservation proof the implementation-report wants),
files changed, learnings; `## Codebase Patterns` section as cross-session memory (ralph).

## 5. Workflow architecture: A′ — unrolled wave slots [provisionally CONFIRMED]

User: "not sure I completely buy the static allocated nodes, but maybe it can be a
solution" — provisionally accepted after the two objections below were resolved.

### 5.1 Why the alternatives died

- **Dispatch loop** (one loop node, iteration types plan/execute/gate routed by disk
  state): REJECTED. Two fatal flaws: (1) a loop node has ONE static `model:` → planner
  chained to implementer tier, violating the **planner ≻ implementer invariant**
  [CONFIRMED user requirement: "Planner should always be a stronger model than the
  implementer"]; (2) control flow becomes a model decision instead of deterministic DAG
  structure [CONFIRMED concern].
- **Wave-as-run** (B): satisfies the invariant, no slot ceiling, but needs the
  not-yet-built orchestrator + unverified sequential-runs-on-one-worktree mechanics.
  **Status: the trajectory** once the change-DAG orchestrator exists (driving waves =
  same machinery one level down). Slots lift into B nearly verbatim (each slot is a
  self-contained plan→implement→gate unit).

### 5.2 The shape

K statically-unrolled slots (K ≈ 6), `when:`-gated; Archon's own "static shape, dynamic
routing" idiom. Generated once from a template (it's change-independent), linted with
`archon validate workflows`, reused for every change.

```
pull (bash)            instructions apply --json manifest + deps install
classify+smoke (haiku, allowed_tools: []) — confirm/override wave-map stamps; smoke-
                       validate change-package claims vs codebase (stale design → abort)
[slot N=1..K]:
  recount-wN (bash)    re-reads tasks.md AFTER gate-w(N-1) → current wave count
  plan-wN (prompt)     model: $classify.output.wN_planner — JIT wave plan, fresh,
                       when: "$recount-wN.output.wave_count >= N"
  impl-wN (loop)       model: $classify.output.wN_impl — lean ralph: cycles, commit per
                       cycle; max_iterations ~3 (recovery grain — a wave normally
                       finishes in one session; resume = re-enter, first unchecked cycle)
  gate-wN (bash)       wave acceptance (scoped tests + static checks); tick wave
change-gate (loop)     full suite + coverage:gate + Playwright; fix-loop, max ~3
create-pr (prompt)     draft PR (experimental's discipline: .pr-number capture, body
                       file in $ARTIFACTS_DIR, never repo root)
review-scope → review-classify (haiku, structured) → conditional reviewers
                       (when: by scope/risk stamps; security-critical forces reviewers
                       ON regardless of size) → synthesize → self-fix → simplify
report                 unit report + assessment-vs-reality (incl. routing calibration §6.4)
```

S waves: plan+execute merged in one session [REC]. M/L: separate plan node so the
committed plan exists before execution.

### 5.3 Dynamic growth — VERIFIED in Archon source

`when:` is evaluated **lazily at node-ready time** against accumulated node outputs
(`packages/workflows/src/dag-executor.ts:3030-3068` — trigger rule first :3031, then
when: :3063-3068; unparseable when: skips **fail-closed** :3070). DAG *shape* is
load-time static; execution decisions are runtime. With per-slot `recount` nodes reading
disk after the previous gate, the wave map can legitimately grow 3→4 (or shrink) mid-run
within K. **Growth policy [CONFIRMED]: only plan nodes (planner tier) may append/split
waves; implement loops never invent scope. Overflowing K = mechanical right-sizing
signal → abort + report "change too big" → split the change.** The K ceiling stays a
feature (right-sizing enforcement); the rigidity below it is gone.

### 5.4 No parallel waves inside a change [CONFIRMED — "ok you convinced me"]

Archon runs same-layer nodes concurrently, but all nodes of a run share ONE worktree.
Parallel code-writing there breaks mechanically: (1) one git index —
`.git/index.lock` collisions, interleaved history kills cycle-commit atomicity;
(2) shared single-writer state files (tasks.md, progress.md, wave plans) — lost
updates on exactly the resume-state carriers; (3) test infra exclusivity (one Postgres,
port 3100, coverage runs). Genuinely independent waves (file-disjoint, test-disjoint,
independently valuable) = the split litmus firing → **sibling changes** in the change
DAG (own worktrees — parallelism already designed there). Vertical-slice waves are
dependent by construction (same property that makes JIT planning meaningful).
Intra-run parallelism stays for read-only fan-outs only (reviewers, classify, research).
Pressure valve if empirics demand finer parallel grain: un-defer the parent/child
HOW-slice fallback (phase-graph note). (gsd does parallel plans in one checkout via
declared files_modified disjointness — known counter-design; it accepts the contention
we're designing out.)

## 6. Classification & model routing — DYNAMIC end-to-end [CONFIRMED requirement]

User: "I don't want static models." No hardcoded `model:` tiers in the workflow YAML.

### 6.1 The vector (not a scalar)

Per wave: **complexity → model tier** (planner & implementer); **risk
(security/data-criticality) → verification depth** (which reviewers/gates run — NOT a
bigger implement model); **novelty → research need** (experimental's
`needs_external_research`). Classifier instruction enforces the invariant:
implementer tier ≤ planner tier, always.

### 6.2 Where classification happens [REC]

Stamped per wave in the wave map at tasks time (design knows complexity; free,
human-reviewed) = **prior**; runtime classify node confirms/overrides against actual
code state = **posterior**; **escalation-on-failure** corrects both (cycle fails gate
twice → next iteration one tier up). "Classification predicts, escalation measures."

### 6.3 Archon upstream features — COMMITTED prerequisites (user builds; Archon is local)

1. **Variable substitution on `model:`/`provider:`** — today `resolveModelSpec` consumes
   `node.model` raw (`dag-executor.ts:480`); must pass through substitution first.
   BLOCKING: without it no dynamic routing exists.
2. **`<next-model>` per-iteration loop directive** (parsed like `<promise>`) — for
   **in-slot escalation** only; demoted from phase-control duty.

Tier→provider/model mapping lives in **Archon config** (user-owned) — this is what
connects routing to the locked compute-locality decision (small tier → local
ollama/Pi; all compute own-hardware). [OPEN design question, decide when speccing the
substitution feature: how classifier output reaches N slots — flat fields
(`w3_planner`, `w3_impl`) work with `$node.output.field` substitution; nested paths
(`waves[3].planner`) need richer path support. Settle BEFORE writing the workflow YAML.]

### 6.4 Calibration loop [REC]

Unit report records predicted tier vs actual (iterations, gate failures, tokens) →
calibrates the classifier over time (gsd's "estimate in context-window cost", empirical).

## 7. Test-layer routing & TDD discipline [CONFIRMED direction]

TDD-eligibility is NOT "unit-testable or skip". Layer routing per lexup-testing — for
each spec scenario, the **cheapest layer that genuinely proves it** ("proves" dominates
"cheap"): pure logic → unit; API procedures → integration with real DB+auth BY DEFAULT
(no service-extraction for testability); UI custom components → component tests; hooks
→ renderHook; **multi-page/gate/redirect flows → Playwright FIRST**, not unit piles.
Red-green is layer-independent (a failing E2E spec is still RED).

- One checkbox = one red-green-refactor cycle; cycle discipline (write test → watch fail
  for the right reason → minimal green → refactor → commit) lives in the **executor
  prompt**, not as sub-checkboxes. Mechanical/non-TDD tasks (config, glue, wiring)
  marked as standard tasks with a verify command.
- **E2E scoping convention [REC]:** wave gates run unit+integration+component scoped to
  the wave; **Playwright only in the change gate**. The wave-0 tracer E2E is committed
  red without tripping lexup's mechanically-enforced `.skip` ban (it's simply not in
  wave gates); PR stays draft until change gate green. Also dodges worktree-Playwright
  env risk for intermediate waves.
- TDD ordering **structurally dissolves the premature-complete trap** (phase-graph open
  item): tests exist from each wave's start, so gates are meaningful from wave 1.

## 8. Project skills as workflow backbone [CONFIRMED direction]

Principle: **skills enter as recorded references in artifacts, not session memory**
(cold-handoff safe).

- **Resolution [REC]:** discovery proposes (glob `.agents/skills/*/SKILL.md` +
  `.claude/skills/`, match descriptions to change capabilities — gsd-planner does
  this), `openspec/config.yaml` optional `skills:` block pins/adds/excludes (override
  wins), **exploration note records the resolved set** as ground-truth references.
  Then mechanical flow: design cites per component → wave map `skills:` per wave
  (scoped, not blanket) → JIT plan Mandatory Reading (P0-ranked file paths).
- **Delivery:** skills-as-mandatory-reading = the portable contract (every provider).
  Archon native `skills:` field is Claude-only per skill docs; whether loops honor it is
  UNVERIFIED (`LOOP_NODE_AI_FIELDS` neighborhood — `agents:` stripped, `model:`
  survives) → verification list.
- **Closure:** skill rules with mechanical enforcement (lexup: Biome noFocusedTests, the
  mock-allowlist arch test) are already the gate — nothing to do. Unenforced rules
  become **review dimensions** (review-classify routes "wave touched tests" → check diff
  against lexup-testing bans). Same file: plan input AND review rubric.

## 9. Build order — REVERSED from README step 1 [CONFIRMED]

Old claim "vertical slice needs NO new OpenSpec code" is dead — running the slice
against old-format tasks.md would validate machinery already decided obsolete.

1. **Deep-planning schema + command rework** (OpenSpec code):
   - tasks instruction/template → wave map (§4.1: TDD ordering, wave 0 tracer, stamps,
     skill refs, coverage map, acceptance commands, scope-reduction ban).
   - **design de-parallelization** (the fossil — user caught it): "Build sequence &
     parallelism" → "Build sequence & slice composition" (dependency map survives;
     "independent ⇒ parallelizable" re-routes to: independently-valuable → split signal
     surfaced in the interview; not-separately-valuable → ordering freedom). Surfaces:
     `src/core/templates/workflows/design.ts:78,81,101,111,168,180`;
     `schemas/deep-planning/schema.yaml:8,98,133`;
     `schemas/deep-planning/templates/design.md:26-27`. Design's Testing-approach
     section sharpened to feed layer routing; explore/design gain the skills-discovery +
     ground-truth-references step.
   - New **wave-plan instruction** (§4.3) + `instructions wave-plan` endpoint.
   - Parity-test re-harvest (`test/core/templates/skill-templates-parity.test.ts`).
2. **Regenerate lexup's change** through the reworked pipeline (cold-handoff protocol)
   — doubles as the writing-pass acceptance test.
3. **Author the A′ workflow** in lexup `.archon/workflows/` (slot template, generated
   once). First validation pass runs everything on one strong tier (baseline before the
   routing comparison — NOT a dropped feature).
4. **Run the slice** end-to-end on the regenerated change.
- **Parallel track (Archon, user-owned):** the two routing features (§6.3) + their open
  syntax question — before the workflow YAML targets routing.

## 10. Verification checklist (before/while authoring)

- [ ] Archon `.env` stripping vs change-gate needs (Postgres, Better-Auth env,
      Playwright browsers, `.env.e2e`) — security model docs / live test.
- [ ] `skills:` on loop nodes (`LOOP_NODE_AI_FIELDS`).
- [ ] `archon workflow event emit` availability from lexup (ralph uses `bun run cli` in
      Archon's own repo).
- [ ] Skipped-slot joins: `trigger_rule` so skipped `plan-w5..K` don't block
      change-gate (`none_failed` family; experimental proves the pattern).
- [ ] Wave-as-run mechanics (only if/when B): sequential runs on one branch/worktree.
- [ ] Task-tool sub-delegation with cheaper model inside Archon nodes (noted variant,
      unverified, not load-bearing).

## 11. Facts verified this session (with refs)

- `openspec instructions apply --change X --json` emits: changeDir, schemaName,
  contextFiles (proposal/specs/design/tasks abs paths), progress {total,complete,
  remaining}, tasks[] {id, description, done} — the pull manifest exists today.
- lexup testbed: `.archon/` exists (config.yaml + workflows/archon-fix-bug.yaml);
  change `account-profile-self-service` 4/4 artifacts, 26 tasks/11 groups (old format).
- Archon `when:` lazy runtime evaluation: `dag-executor.ts:3030-3068`; fail-closed
  parse :3070. Loop static `model:` honored; dynamic injection absent
  (`resolveModelSpec`, `dag-executor.ts:480`); `agents:` stripped on loops.
- Old README step-1 forks RESOLVED: change-package = stitched CLI (one command);
  work queue = two-level checkboxes (§4.1).
