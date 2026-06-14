# Task machinery rework + wave execution model (the TDD harness synthesis)

Status: **brainstorm SETTLED 2026-06-12, implementation NOT started.** This note is the
re-priming record for the session that pivoted from "build the vertical slice" (README
step 1) to "fix the task-generation machinery first" — the harness consumes what the
task-builder emits, so the writing pass moved ahead of the harness in the build order.
**The user has more seeds to expand — this design is open at the edges, not final.**

Each item below is tagged: **[CONFIRMED]** user-ratified · **[REC]** Claude's
recommendation, unchallenged — treat as default, re-confirmable · **[OPEN]** undecided.

## V1 target calibration (2026-06-13)

This note is the active build contract for the engineering harness proof. The target is
not a product-discovery, workspace, Linear, or research implementation.

V1 done-condition (falsifiable — replaces the earlier "≥50% steering reduction" vibe):
given the human-approved `tasks.md` wave map for lexup's `account-profile-self-service`,
the harness runs to a **green-gated, mergeable draft PR with ZERO human turns between
wave-map approval and PR** — change gate (full suite + coverage + E2E) green, every wave
carries a TDD trail (per-cycle `test:`→`feat:` commits with pasted RED+GREEN), and the
report lists zero undocumented deviations. Steering-reduction vs a manual baseline is a
secondary observation, not the pass/fail bar.

End-goal note: the harness should become provider/project-agnostic; lexup is only the v1
testbed. Distill lexup's good practices into general mechanisms — never hardcode lexup
specifics into OpenSpec (§12).

V1 should prove:
- OpenSpec can produce a `tasks.md` wave map good enough for the user to approve once,
  then let Archon execute autonomously.
- `plans/wave-N.md` files are generated just-in-time by the harness. Human approval of
  every wave plan is not part of v1; adversarial cross-model wave-plan review is a later
  hardening step.
- **Static per-node model tiers** (planner node strong, implementer node a fixed lower
  tier, via Archon config tier keywords) — satisfies the planner ⪰ implementer invariant
  structurally and needs NO new Archon feature. **Dynamic, per-wave model selection is
  DEFERRED** to a later hardening step, off the v1 critical path (decided 2026-06-13). The
  full routing design (portable tier hints in `tasks.md` → config mapping → runtime
  route/classify/finalize) is preserved in §6 as the post-v1 target; tier hints may still
  be written into `tasks.md` (cheap, forward-compatible) but v1 does not act on them for
  model choice.
- Verify/review are in the initial workflow, but classification-gated like Archon's
  experimental fix-issue workflow (risk → verification depth; this gating SURVIVES the
  routing deferral — it gates *which reviewers run*, not model selection).
- Research follows after v1; PRD/product discovery is a separate future initiative.

## 0. Relation to other notes (what this supersedes)

- `phase-graph-unified-model.md` → **"Intra-change execution … leaning C (Ralph)" is
  SUPERSEDED** by §5 here (A′ unrolled wave slots; the dispatch/Ralph loop was rejected
  for phase control). Its "Model routing" section is amended by §6 (dynamic substitution
  is the **post-v1** target; v1 uses static per-node tiers, no new Archon feature — see §6
  banner). Everything else (change DAG, two gates,
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
| **Commit / state** | TDD cycle (**LOCKED 2026-06-13**) | atomic commit = cycle code + its checkbox tick, `test:`→`feat:` per cycle; the per-cycle git trail is the *independent* proof TDD held (tests not backfilled). **NO per-wave batching.** Matches ralph's native per-task commit grain — removes a batching step, adds no machinery |
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

#### 4.1a Wave-map markdown format — SETTLED 2026-06-13 (step-1 implementation)

The format had to satisfy a hard parser constraint: `parseTasksFile`
(`src/commands/workflow/instructions.ts:233`) counts **every** `- [ ]`/`- [x]` line as a
task (regex `^[-*]\s*\[([ xX])\]\s*(.+)$` — bracket anchored immediately after the bullet).
So per-wave detail and the coverage map must use NO checkboxes. Settled encoding:

- **One `## Wave N` heading per wave** (`## Wave 0` = tracer). Headings carry no checkbox.
- **Exactly ONE `- [ ]` per wave**, the first line under the heading, carrying the wave's
  observable-value goal. This is the only tick point → `instructions apply --json`
  `progress.total` == wave count, `tasks[].description` == per-wave goal (verified by a
  regression test: N wave lines → progress.total = N). **Tick semantics = "wave gate
  passed"** (§4.2), recorded in the template comment, not the label.
- **Per-wave detail = plain `-` bullets** (`components:`, `interfaces:`, `depends-on:`,
  `acceptance:`) — no `[`, so they never match the regex. **Stamps = inline backtick
  tags** on a `stamps:` bullet: `` `size:M` `risk:high` `plannerTier:large` `implTier:medium` ``
  (tier hints written now are cheap + forward-compatible; v1 doesn't act on them for model
  choice — README #10). `skills:` bullet lists skill SKILL.md paths (incl. the project
  test-strategy skill).
  - **`implTier` heuristic [UN-PARKED 2026-06-14 — the size/risk confusion below is the FAILURE
    MODE; §13 gives the multi-dimensional rubric + predict-then-escalate model that supersedes it].**
    Empirical finding from the step-2 artifact:
    the planner set Wave 4's `implTier:small` because `risk:low`, conflating two different
    axes. **`implTier` = implementation difficulty *under a detailed JIT plan* (ambiguity,
    sharp edges, debugging likelihood) — NOT blast-radius `risk`.** A wave can be `risk:low`
    (admin-only, reuses settled primitives) yet `implTier`-hard. Rule: **floor `implTier` at
    `medium` for any wave touching UI/component tests, real-DB integration harnesses, or
    known-fragile libraries** (lexup: MDXEditor — `ssr:false`/`'use no memo'`, `userEvent`
    async, render-count Vitest↔prod divergence), regardless of `risk`; only pure-logic /
    mechanical-wiring waves use `small`. Consistency check that catches the error: two waves of
    the same difficulty class must share `implTier` (Wave 2 and Wave 4 both reuse `BioEditor` +
    component tests → both `medium`; the artifact had W2 `medium`, W4 `small` — the tell).
    Bite in v1: static tiers have **no escalation**, so a too-low `implTier` on a thrash-prone
    wave runs self-fix ×3 then stop-and-ask → directly threatens the zero-human-turns bar.
    (Hand-fixed Wave 4 → `implTier:medium` in the lexup artifact 2026-06-13.)
- **Coverage map = one markdown table** (`| Scenario | Layer | Named test | Wave |`) — pipes,
  no checkboxes. The **layer column is TRANSCRIBED from design's Testing Approach**, never
  decided here (mirrors the MECHANICAL-ONLY guard: an unresolved layer is a design gap →
  STOP, back to design). The **named-test column is the only new thing** the tasks pass adds.
- Scope-reduction language banned (gsd list): no "v1/for now/simplified/MVP/just" as a way
  to silently shrink a scenario.

#### 4.1b Project test-strategy skill contract — SETTLED 2026-06-13

The wave-plan instruction (and design's Testing Approach) carry only the **principle**
("for each spec scenario, the cheapest layer that genuinely *proves* it; *proves* dominates
*cheap*"). The concrete per-scenario **table** comes from a project-provided **"test-strategy"
skill** (lexup-testing = first instance), keeping OpenSpec general (§12). v1 contract (no
structured schema — referenced by path, cold-handoff safe):
- A standard project skill: `.agents/skills/<name>/SKILL.md` or `.claude/skills/<name>/SKILL.md`,
  discoverable by the design skills-discovery step.
- Front-matter `name` + `description`; the description must identify it as the test-strategy /
  testing skill so discovery can match it to the change's testing concerns.
- Body holds: a **scenario-class → test-layer** mapping table, the **mock allowlist** (what may
  be mocked vs what must be real), and any **mechanically-enforced bans** (e.g. no `.skip`).
- Recorded as a **ground-truth reference** by design (into the design note), then cited by
  path in the wave map's per-wave `skills:` refs and surfaced by the wave-plan instruction as
  Mandatory Reading. OpenSpec does NOT auto-detect or parse it in v1.

#### 4.1c Open-Questions gate at the design→tasks boundary — A DONE 2026-06-13, B+C parked

The risk: design.md's `## Open Questions` section can carry an unresolved item into the wave
map. There is **no mechanical gate** — the artifact graph only checks `design.md` exists,
`openspec validate` checks format, neither reads design prose (matches executable-plans §2's
"nothing checks design is grounded"). The v1 human gate is approval of `tasks.md`, but Open
Questions live in `design.md` — different file from the gate, so a carried item is invisible
to the approver. The section conflates **three** cases with different blocking semantics:
dodged HOW decision (defect → block always), genuine in-scope unknown (autonomous **blocker** —
the run can't fetch external info; legitimate **steering point** under HITL), out-of-scope/
non-goal (safe to carry). Note the under-count the old prompt had: a *genuine* in-scope unknown
is also a blocker in autonomous mode, not just dodged ones.

- **A (DONE 2026-06-13, prompt-only):** the `tasks` instruction now triages every Open Question
  (dodged → STOP; in-scope-unknown → STOP; out-of-scope → echo verbatim under a
  `## Carried-over Open Questions` heading at the top of tasks.md, plain `-` bullets, no
  checkboxes) so the wave-map approver SEES carried items. Closes the structural leak with zero
  code. Still model-judgment + fail-open — hygiene, not a guarantee.
- **B+C (PARKED — do after the step-2 writing-pass test closes):**
  - **C — split the section structurally:** replace "Open Questions" with **"Out of scope /
    non-goals"** (never blocks) + **"Unresolved — needs human"** (always a blocker). Removes the
    conflation at the root; a dodged decision then has no ambiguous home to hide in. Touches
    design.ts + design schema instruction + design.md template (the last two not parity-hashed;
    design.ts is — re-harvest).
  - **B — mechanical fail-closed gate:** the grounding-lint sketched in executable-plans §2 (or
    an extended `openspec validate`): non-empty "Unresolved — needs human" → fail unless an
    explicit override; the harness `classify+smoke`/pull node aborts before planning instead of
    trusting the tasks-builder model. This is what actually makes the v1 "zero human turns after
    approval" claim safe.
  - **Mode-awareness falls out:** same detection, different reaction — hard abort in autonomous
    v1, push-to-channel steering prompt under HITL — mirroring the documented-deviation →
    adaptive-gate split (§4.3). Extending the fork policy from *mid-run* back to the *design
    boundary*, not new machinery.
  - **Generalize the validation mechanism:** B is the first case of a broader grounding-lint
    (executable-plans §2) — Files-to-Change paths exist, cited patterns still match, every task
    has a verify command, no circular deps. Build B as the first rule of that mechanism, not a
    one-off.

### 4.2 Wave checkbox semantics [REC, unratified]

Tick = **wave gate passed** (not "cycles done") — makes tasks.md progress trustworthy
for the orchestrator. Cycle ticks live in the wave plan. Each cycle tick rides its own
commit (`test:`→`feat:`); cycle ticks are **NEVER** batched into a wave commit — the
per-cycle git trail is the independent verification that TDD held and tests weren't
backfilled (**LOCKED 2026-06-13**; reverses the earlier per-wave allowance, and since
ralph commits per task natively this removes a step rather than adding one).

### 4.3 The wave-plan instruction [REC]

OpenSpec-owned, schema-versioned, served as
`openspec instructions wave-plan --change X --wave N` (same pattern as
`apply.instruction`) so the harness prompt stays thin and there's no prompt duplication.
Carries: the executable-plans §1 payload spec, Nyquist self-check, scope-reduction ban,
no-placeholders, the JIT planner's bounded discretion (transcribes design+specs into
cycles; design decisions stay settled upstream; may split a wave — see §5 growth policy).

**Documented-deviation rule [CONFIRMED 2026-06-13]:** because v1 has no mid-run human
interruption, if the JIT planner hits a design fork NOT settled by upstream design, it
records the decision + rationale as a *documented deviation* in progress.md and the final
report (never silently). End-of-run review treats documented deviations as intentional and
flags only undocumented ones — this is what keeps the no-interruption contract safe rather
than silent-drift-prone, and it is the only honest answer to "what happens when wave 3
discovers the wave-4 plan was wrong in a judgment way."

**Post-v1 evolution [CONFIRMED direction 2026-06-13]: adaptive human gates.** A later
version layers an *optional* mid-run human gate on top: on a high-risk / low-confidence
fork the workflow pushes the question to a channel the user watches (e.g. a Telegram
channel) and waits; if the user does not reply within a timeout (e.g. 30 min), the gate
**falls back to the documented-deviation rule** (log + continue). This adds an
opportunistic human-steering channel without sacrificing autonomy — a no-reply run still
completes to PR. v1 ships the fallback behavior only; the gate + push + timeout is the next
version.

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
  chained to implementer tier, violating the **planner ⪰ implementer invariant**
  [CONFIRMED user requirement (corrected 2026-06-13): "Planner should always be at least
  as strong as the implementer — equal tier is fine, implementer never stronger than the
  planner"]; (2) control flow becomes a model decision instead of deterministic DAG
  structure [CONFIRMED concern].
- **Wave-as-run** (B): satisfies the invariant, no slot ceiling, but needs the
  not-yet-built orchestrator + unverified sequential-runs-on-one-worktree mechanics.
  **Status: the trajectory** once the change-DAG orchestrator exists (driving waves =
  same machinery one level down). Slots lift into B nearly verbatim (each slot is a
  self-contained plan→implement→gate unit).

### 5.2 The shape

K statically-unrolled slots (**K = 10**, set 2026-06-13), `when:`-gated; Archon's own "static shape, dynamic
routing" idiom. Generated once from a template (it's change-independent), linted with
`archon validate workflows`, reused for every change.

```
pull (bash)            instructions apply --json manifest + deps install
classify+smoke         V1: classifier confirms/overrides RISK stamps (→ which reviewers
                       run) + smoke-validate change-package claims vs codebase (stale
                       design → abort). Model tiers are STATIC in v1 (see §6 banner).
                       Post-v1: also route tier hints → concrete provider/model fields.
[slot N=1..K]:
  recount-wN (bash)    re-reads tasks.md AFTER gate-w(N-1) → current wave count
  plan-wN (prompt)     model: <strong tier, STATIC in v1> — JIT wave plan, fresh,
                       when: "$recount-wN.output.wave_count >= N"
                       (post-v1: model/provider from the classify+smoke node's route
                       output, e.g. $classify.output.wN_planner_*)
  impl-wN (loop)       model: <fixed lower tier, STATIC in v1> — lean ralph: execute
                       cycles; commit per cycle (test:→feat:); max_iterations ~3
                       (recovery grain — a wave normally finishes in one session;
                       resume = re-enter, first unchecked cycle)
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
within K. **Growth policy [CONFIRMED, K=10 set 2026-06-13]: only plan nodes (planner tier)
may append/split waves; implement loops never invent scope. Overflowing K=10 = the change
was mis-sized → abort + report the wave boundary where it overflowed → a HUMAN re-scopes at
design time.** The remedy is re-scoping, NOT an automatic sibling split: vertical waves are
dependent by construction (§5.4), so they have no valid sibling boundary to split along —
>10 dependent waves means "this should have been a smaller change or a different
decomposition," a design-time human judgment. The K ceiling stays a feature (right-sizing
enforcement); the rigidity below it is gone.

**Growth within K is allowed but never silent [CONFIRMED 2026-06-13]:** every wave the
planner appends or splits beyond the human-approved count is **flagged in the final
report**. The approved wave count is a *floor*, not a frozen shape — but changes to it
surface at review time, not buried in the diff. (Pairs with the documented-deviation rule
§4.3: scope growth is just another deviation that must be recorded.)

### 5.4 No parallel waves inside a change [CONFIRMED — "ok you convinced me"]

Archon runs same-layer nodes concurrently, but all nodes of a run share ONE worktree.
Parallel code-writing there breaks mechanically: (1) one git index —
`.git/index.lock` collisions, interleaved history kills commit atomicity (cycle ideal,
wave-grain v1);
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

## 6. Classification & model routing — DYNAMIC is the POST-V1 target [amended 2026-06-13]

User (original): "I don't want static models." That remains the end-state goal and the
whole of this section is the design for it. **V1 DEFERRAL (2026-06-13): dynamic, per-wave
model selection is OUT of v1.** V1 ships **static per-node tiers** — plan-wN on a strong
config tier, impl-wN on a fixed lower config tier — using Archon's config tier keywords,
which Archon honors on prompt AND loop nodes today (verified 2026-06-13 against source:
`schemas/dag-node.ts:392-394` excludes model/provider from the loop-ignored set +
`dag-executor.ts:3166-3199` loop dispatch resolves & forwards them — see §11),
so **v1 needs no new Archon feature**. The planner ⪰ implementer invariant is preserved by
that static assignment. The ONLY piece of this section live in v1 is **risk →
verification-depth** classification (§6.1 — gates which reviewers run via `when:`,
independent of model choice). Everything else here (tier-hint routing, route/classify/
finalize, the §6.3 substitution features, §6.5 tier-escalation, §6.4 calibration) is the
post-v1 hardening design, kept intact below. Tier hints may still be written into `tasks.md`
now (cheap, forward-compatible); v1 simply does not act on them for model choice.

### 6.1 The vector (not a scalar)

Per wave: **complexity → model tier** (planner & implementer); **risk
(security/data-criticality) → verification depth** (which reviewers/gates run — NOT a
bigger implement model); **novelty → research need** (experimental's
`needs_external_research`). These are portable stamps/tier hints, not concrete
provider/model names. The classifier instruction enforces the invariant: implementer tier
≤ planner tier, always.

### 6.2 Where routing happens [CONFIRMED]

`tasks.md` stamps each wave at tasks time (design knows complexity; free, human-reviewed)
= **prior**. It may include explicit tier hints such as `plannerTier: large`,
`implTier: medium`, but it should not normally name concrete providers/models.

Runtime routing is two-step:
1. **Route defaults** parse `tasks.md` and Archon config to turn stamps/tier hints into
   default concrete provider/model fields.
2. **Classify + finalize** confirms/overrides those defaults against actual code state =
   **posterior**, then emits the final flat provider/model fields consumed by workflow
   nodes.

If the classifier is unavailable or emits invalid output, the finalizer falls back to the
deterministic route defaults unless the input is structurally unsafe. Escalation-on-failure
corrects both prior and posterior (gate failure → next attempt one tier up). "Tasks predict;
classification refines; escalation measures."

### 6.3 Archon upstream features — COMMITTED prerequisites (user builds; Archon is local)

1. **Variable substitution on `model:`/`provider:`** — today `resolveModelSpec` consumes
   `node.model` raw (`dag-executor.ts:480`); must pass through substitution first.
   Was BLOCKING; **no longer blocks v1** (static tiers). Load-bearing only when dynamic
   routing is built post-v1.
2. **`<next-model>` per-iteration loop directive** (parsed like `<promise>`) — for
   **in-slot escalation** only; demoted from phase-control duty.

Tier→provider/model mapping lives in **Archon config** (user-owned) — this is what
connects routing to the locked compute-locality decision (small tier → local
ollama/Pi; all compute own-hardware). **V1 routing contract [CONFIRMED]: use flat final
route output fields** such as `w3_planner_provider`, `w3_planner_model`,
`w3_impl_provider`, `w3_impl_model`. These final route fields are derived from
`tasks.md` defaults plus classifier overrides. Nested paths (`waves[3].planner`) can wait
until after the proof.

### 6.4 Calibration loop [REC]

Unit report records predicted tier vs actual (iterations, gate failures, tokens) →
calibrates the classifier over time (gsd's "estimate in context-window cost", empirical).

### 6.5 Failure and escalation policy [CONFIRMED; v1 path amended 2026-06-13]

For v1, do not plan human interruption checkpoints. After the user approves the wave map,
the harness runs autonomously until final report unless it is mechanically stuck.

V1 failure path (static tiers — no dynamic tier-escalation available):
1. If a wave/gate fails, run one self-fix loop (max ~3 iterations) at the same tier.
2. If still failing, stop and ask the user with 2-3 options and a recommendation.

Post-v1 (once dynamic routing lands), insert tier-escalation ahead of the self-fix loop:
escalate to a stronger configured tier and retry; only then self-fix; then ask. Further
expansion: at the top tier, try a different provider at the same tier before asking
(e.g. Opus → Codex/GPT-5.5), if the routing config supports it.

## 7. Test-layer routing & TDD discipline [CONFIRMED direction]

**Home of the routing table [CONFIRMED 2026-06-13]:** the wave-plan instruction carries
only the general **principle** — "for each spec scenario, the cheapest layer that genuinely
proves it; *proves* dominates *cheap*". The concrete per-scenario layer **table** comes
from a **project-provided "test-strategy" skill** (lexup-testing is the first instance),
resolved like any other project skill (§8) — NOT baked into OpenSpec. This keeps OpenSpec
general from day one; the lexup table below is illustrative of the contract, not a
hardcoded default.

TDD-eligibility is NOT "unit-testable or skip". The lexup-testing instance of the table:
pure logic → unit; API procedures → integration with real DB+auth BY DEFAULT
(no service-extraction for testability); UI custom components → component tests; hooks
→ renderHook; **multi-page/gate/redirect flows → Playwright FIRST**, not unit piles.
Red-green is layer-independent (a failing E2E spec is still RED).

- One checkbox = one red-green-refactor cycle; cycle discipline (write test → watch fail
  for the right reason → minimal green → refactor → mark complete; **commit per cycle**
  (`test:`→`feat:`), LOCKED) lives in the **executor prompt**, not as sub-checkboxes.
  Mechanical/non-TDD tasks (config, glue, wiring) marked as standard tasks with a verify
  command.
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

1. ✅ **DONE 2026-06-13.** **Deep-planning schema + command rework** (OpenSpec code):
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
   - **Project test-strategy skill contract** (the §7 decision): the wave-plan instruction
     holds the layer-routing *principle* only; the concrete table is consumed from a
     project-provided "test-strategy" skill (lexup-testing = first instance). Define the
     contract (what fields/shape the skill must expose) here so OpenSpec stays general.
   - New **wave-plan instruction** (§4.3) + `instructions wave-plan` endpoint.
   - Parity-test re-harvest (`test/core/templates/skill-templates-parity.test.ts`).
2. ✅ **PASSED 2026-06-13.** **Regenerate lexup's change** through the reworked pipeline
   (cold-handoff protocol) — doubles as the writing-pass acceptance test. Result: 5-wave TDD
   map, coverage-map layers transcribed verbatim from design's Testing Approach, wave-grain
   progress (5=5), per-wave stamps+skills (all cited skills real), no scope-reduction, design
   Open Questions "None", ADR registry in sync (`lint --adr` clean, no dup ADR), glossary
   unpolluted — the three earlier-round defects did not recur. Proves the writing pass; not
   harness execution. (Minor noted deviation: filtered Playwright runs in wave gates vs the §7
   change-gate-only [REC].)
3. **Author the A′ workflow** in lexup `.archon/workflows/` (slot template, generated
   once) with **static per-node tiers** (planner strong, implementer fixed lower, via
   Archon config tier keywords). Dynamic routing is NOT required for the v1 proof; static
   `model:` on prompt + loop nodes works today with no new Archon feature.
4. **Run the slice** end-to-end on the regenerated change at the static tiers.
- **Deferred track (post-v1, Archon, user-owned):** the two routing features (§6.3) +
  their open syntax question — no longer blocks v1; pick up when hardening static→dynamic.

## 10. Verification checklist — RESOLVED against Archon source 2026-06-13

All blocking items verified against `~/Developer/ai/archon` source (file:line refs below).
Refs are pinned to source, not the skill docs (the skill docs had a stale spot — fixed, see
§11). Nothing here blocks step-3 authoring.

- [x] **`.env` stripping vs change-gate — RESOLVED (NOT a blocker).** `stripCwdEnv()`
      (`packages/paths/src/strip-cwd-env.ts:41`) deletes from Archon's `process.env` ONLY the
      keys present in the four Bun-auto-loaded CWD files (`.env`, `.env.local`,
      `.env.development`, `.env.production`). It does NOT touch `~/.archon/.env`,
      `<cwd>/.archon/.env`, or per-codebase env vars. The change-gate gets its env via two
      channels: **(a)** `worktree.copyFiles: ['.env', '.env.e2e', …]` in lexup's
      `.archon/config.yaml` copies gitignored files into the fresh worktree (git worktrees
      hold only TRACKED files — `packages/isolation/src/worktree-copy.ts`; the example entry
      is literally `.env`); a `bun run test` spawned by a **bash** node then auto-loads the
      copied `.env` (bash nodes do NOT get `--no-env-file` — only script/Claude subprocesses
      do, security.md §"Target repo `.env` isolation" items 2-4). **(b)** vars that must live
      in `process.env` go in `<cwd>/.archon/.env` (trusted, passes to subprocesses) or
      per-codebase env vars (`codebase_env_vars` DB / config `env:`) — **never** `<cwd>/.env`
      (the only untrusted source, stripped at boot). Playwright browser binaries live in a
      global cache (worktree-independent); `node_modules` is gitignored → the `pull` node must
      run install. (Lexup setup TODO captured here, not an OpenSpec concern: set `copyFiles`
      for the gate's gitignored env files; put Postgres URL / Better-Auth secret in
      `<cwd>/.archon/.env`.)
- [x] **`skills:` on loop nodes — IGNORED (verified).** `model`/`provider` are the ONLY AI
      fields excluded from `LOOP_NODE_AI_FIELDS` (`packages/workflows/src/schemas/dag-node.ts:392-394`);
      `skills` is in the ignored set, silently dropped with a `loop_node_ai_fields_ignored`
      warning (`loader.ts:112-128`). Consequence (already the §8 decision): impl-wN delivers
      skills as **mandatory-reading paths in the loop prompt body**, never via a node `skills:`
      field. Now forced, not optional. (`hooks`/`mcp`/`output_format`/`allowed_tools` likewise
      ignored on loops → gates go in `until_bash` + prompt, not node fields.)
- [x] **`archon workflow event emit` from lexup — RESOLVED (works, repo-agnostic).**
      `archon workflow event emit --run-id <uuid> --type <event-type> [--data <json>]` is a
      top-level CLI command (`packages/cli/src/cli.ts:640-681` → `workflowEventEmitCommand`,
      `packages/cli/src/commands/workflow.ts:1829`). It writes via `createWorkflowStore()` →
      the GLOBAL store at `~/.archon/archon.db` (`packages/core/src/db/connection.ts:40`; or
      `DATABASE_URL` Postgres), keyed by run-id (FK to `remote_agent_workflow_runs`). NOT
      cwd-bound, so emitting from a lexup worktree reaches the same DB the run lives in.
      **Best-effort / non-throwing** — if the DB is unreachable the event is dropped (logged),
      so it never fails a bash node but isn't guaranteed delivered. The ralph `bun run cli
      workflow event emit` form is just archon's dev-repo invocation of the same command; from
      lexup use the installed binary `archon workflow event emit`. `$WORKFLOW_ID` supplies the
      run-id inside nodes.
- [x] **Skipped-slot joins — RESOLVED.** `trigger_rule: none_failed_min_one_success` on
      change-gate lets skipped `plan-w5..K`/`impl`/`gate` slots NOT block it (skipped ≠ failed
      ≠ success). Documented (workflow-dag.md Trigger Rules; parameter-matrix silent-failure
      #10) and is the experimental fix-issue pattern. Use `all_done` only for run-regardless
      cleanup/report nodes.
- [ ] Wave-as-run mechanics (only if/when trajectory B): sequential runs on one
      branch/worktree. **Deferred — not a v1 concern** (A′ is the v1 shape).
- [ ] Task-tool sub-delegation (`agents:` inline map) with cheaper model inside Archon nodes.
      **Verified to EXIST** (per-agent `model`+`skills`, parameter-matrix §"Inline agents"),
      **not load-bearing** for v1 — left as a noted variant.

## 11. Facts verified this session (with refs)

- `openspec instructions apply --change X --json` emits: changeDir, schemaName,
  contextFiles (proposal/specs/design/tasks abs paths), progress {total,complete,
  remaining}, tasks[] {id, description, done} — the pull manifest exists today.
- lexup testbed: `.archon/` exists (config.yaml + workflows/archon-fix-bug.yaml);
  change `account-profile-self-service` 4/4 artifacts, 26 tasks/11 groups (old format).
- Archon `when:` lazy runtime evaluation: `dag-executor.ts:3030-3068`; fail-closed
  parse :3070.
- Old README step-1 forks RESOLVED: change-package = stitched CLI (one command);
  work queue = two-level checkboxes (§4.1).

### Verified 2026-06-13 (Archon source, this session — the §6 static-tier spine)

- **Loop `model:`/`provider:` ARE honored at runtime (tier keywords too) — source-confirmed,
  load-bearing for v1.** `LOOP_NODE_AI_FIELDS` explicitly EXCLUDES `model`+`provider`
  (`packages/workflows/src/schemas/dag-node.ts:392-394`, with a comment saying the executor
  forwards them per iteration). Loop dispatch (`packages/workflows/src/dag-executor.ts:3166-3199`)
  calls `resolveNodeProviderAndModel(node,…)` (def ~:466-533) which reads `node.model` (:480) →
  `resolveModelSpec(aiProfile, node.model)` (tier-keyword `large`/`medium`/`small` → Archon
  config tiers) → resolved spec flows into every iteration's `sendQuery` via `resolvedOptions`.
  Provider likewise (`node.provider ?? workflowProvider`, used for `getAgentProvider`).
  **Last hop — the one that actually decides it (closed after an adversarial check):**
  `resolveNodeProviderAndModel` returns `{ provider, model, options }` as siblings, and the loop
  dispatch (`:3167`) destructures only `{ provider, options }`, DROPPING the sibling `model`.
  Harmless, because the resolved model is ALSO embedded in `options`: `if (model)
  baseOptions.model = model` (`:600`) → `options = { ...baseOptions, nodeConfig, assistantConfig }`
  (`:642-646`) → loop `resolvedOptions` → `iterationOptions = { ...resolvedOptions, abortSignal }`
  (`:2167-2170`) → `aiClient.sendQuery(…, iterationOptions)`. So `iterationOptions.model` = the
  per-node resolved tier; the loop runs at impl-wN's tier, NOT the workflow fallback. The dropped
  sibling is redundant, not the carrier.
  **So v1's static per-node tiers (plan-wN prompt @strong, impl-wN loop @lower) work with NO
  new Archon feature.** ⚠️ The earlier ref `resolveModelSpec, dag-executor.ts:480` was the
  per-node path; `resolveModelSpec` itself is imported from `model-validation` and called at
  `executor.ts:477` (workflow-level) + `dag-executor.ts:482` (per-node). The OLD note line
  "dynamic injection absent" was MISLEADING — per-node static `model:` (incl. on loops) IS the
  injection point; what's deferred is *classifier-driven* substitution (§6.3), not the field.
- **Skill docs FIXED 2026-06-13.** The Archon skill refs (`workflow-dag.md`,
  `parameter-matrix.md`) AND the canonical `packages/docs-web/.../guides/loop-nodes.md` all
  wrongly said loop `model`/`provider` were "silently ignored." Corrected + committed on the
  archon repo branch `feat/claude-terminal-provider` (commit `7f5327b`). The README
  "known stale spots" caveat is now obsolete for this fact.
- **Env / `.env` model:** `stripCwdEnv()` strips ONLY CWD `.env*` keys
  (`packages/paths/src/strip-cwd-env.ts:41`); `worktree.copyFiles` injects gitignored files
  into worktrees (`packages/isolation/src/worktree-copy.ts`); managed env via
  `<cwd>/.archon/.env` + `codebase_env_vars`. See §10 for the change-gate consequence.
- **`workflow event emit`** = top-level CLI, global store `~/.archon/archon.db`, repo-agnostic,
  best-effort. See §10.

## 12. Generality vs the lexup testbed [CONFIRMED direction 2026-06-13]

End goal = a general, provider/project-agnostic harness; lexup is just today's testbed.
Rule: **distill lexup's good practices into general mechanisms; never hardcode lexup
specifics into OpenSpec.** Where the current design leans too narrow, and the fix:

- **Test-layer routing table (§7) is stack-specific** (Next/tRPC/Postgres/Better-Auth/
  Playwright). The *principle* — "for each scenario, the cheapest layer that genuinely
  proves it; proves dominates cheap" — is general and belongs in the wave-plan instruction.
  lexup's concrete table is the **first instance of a general "project test-strategy" skill
  contract**, supplied by the project (the lexup-testing skill), NOT baked into OpenSpec.
  **[DECIDED 2026-06-13 — this is the v1 choice; define the project test-strategy skill
  contract as part of the schema rework, §9.1.]**
- **Gate commands** are already project-detected (lockfile→runner, project CLAUDE.md) — keep.
  The change-gate's `coverage:gate`/Playwright/Postgres specifics are lexup's; they come
  from the change's declared gate commands, not from OpenSpec.
- **Mechanical-enforcement closure (§8)** ("enforced rules are the gate; unenforced become
  review dimensions") is general; lexup's Biome/mock-allowlist are just the instances.
- **Archon coupling is intentional** (locked decision 6 — own-hardware compute). The
  portable seam is already clean: OpenSpec emits artifacts + `instructions --json`/
  `instructions wave-plan` (portable); the workflow YAML is the Archon adapter. Generality
  to another runtime later = a new adapter over the same OpenSpec contract, not a re-arch.
- **Ecosystem assumptions** (JS/TS lockfile detection, `.agents/skills`/`.claude/skills`
  globs) are fine for v1; multi-ecosystem project-detection (Python/uv, Rust/cargo) is a
  deferred generalization, not a v1 concern.

## 13. Execution grain & impl-tier prediction (2026-06-14 exploration)

Captured from a design conversation while debugging the lexup harness run. Two questions:
"is one-cycle-per-iteration the right grain?" and "can we predict per-wave complexity well
enough to run impl on a cheaper/FASTER model?" Both **[CONFIRMED direction]**, details below.

### 13.1 Execution grain — one cycle per iteration is right, but it's adaptive [CONFIRMED]

The impl loop runs ONE red-green-refactor cycle per fresh iteration (not a whole wave in one
turn). This is right, and we have empirical proof of the alternative failing:

- **Whole-wave-in-one-turn was the ORIGINAL design and it DIED**: impl-w1 hit claude-terminal's
  15-min turn cap (14m37s, killed mid-cycle-3). One-cycle-per-iteration was the fix.
- **Why one-cycle wins** (the deciding axes): context rot (a whole-wave turn accumulates every
  cycle's reads + test output → crosses sonnet's ~50% degradation point on multi-cycle waves);
  turn cap (each cycle is a short turn); TDD purity; observability. Resumability is a TIE — it
  comes from the per-cycle COMMIT grain, which both approaches share.
- **The principled defense (not just a context hack): coherence lives in the PLAN, not the
  execution.** The planner (strong model) pre-orders + relates all cycles; the implementer runs
  one bounded, fresh, rot-free cycle. Whole-wave conflates planning-coherence with execution and
  forces the weaker implementer to hold the whole-wave model in a bloating context. One-cycle
  puts the coherence burden where the strong model already is (matches planner ⪰ implementer).
- **Not fundamental — provider-tuned.** The 15-min wall is claude-terminal's; 200k is sonnet's.
  The true rule is "the largest coherent chunk that fits one context window (≤~50%) AND the turn
  budget." On a larger-context / no-turn-cap engine the viable chunk grows. **Adaptive-grain
  refinement (deferred):** size:S (1-cycle) waves MAY merge plan+execute into one step (§5.2
  seed) — handoff removal, NOT a downshift. One-cycle stays the safe default; re-derive the grain
  if the execution engine changes.

### 13.2 Plan and impl stay SEPARATE nodes — do NOT merge [CONFIRMED]

Considered merging plan+impl into one node. Rejected. Keep them separate (current shape), for
three reasons, strongest first:
1. **The plan node is a context-compression boundary.** Planning is exploration-heavy (reads
   design+specs+codebase+skills → distills `plans/wave-N.md`). Merging makes impl run in that
   bloated context → rot sooner. Separated, impl starts FRESH from the compressed plan. A context
   win independent of model tier.
2. **Separation decouples plan-quality from impl-cost.** Plan stays large ALWAYS; impl tier is
   tuned independently. Merging forces all-or-nothing — a downshift would hit the plan too (the
   "mediocre plan + mediocre impl" risk). Separation protects the plan.
3. **The plan→impl seam is the insertion point** for a plan-validation gate / replan-on-failure
   (see `plan-validation-and-recovery.md`). Merge it away and you lose it.

Also: **keep impl as a LOOP** (don't make it a single non-loop node) — a non-loop impl of a
multi-cycle wave re-imports the turn-cap + rot failures. The loop generalizes (S-wave = loop with
one iteration ≈ single shot).

### 13.3 impl-tier prediction: a multi-dimensional rubric + predict-then-escalate [CONFIRMED]

Supersedes the parked §4.1a heuristic. Goal: run impl on a cheaper/**faster** model where safe.
The §4.1a failure was the INPUT — `size`/`risk` are bad proxies. But difficulty itself IS
approximable by a strong authoring model (opus, stronger soon) reading design+specs+codebase+
skills — senior engineers estimate "1-pointer vs gnarly" routinely.

**The reframe that makes it safe: you don't need PERFECT prediction — just good-enough to put
MOST waves on the fast model first-try, with ESCALATION as the backstop for the misses.** Perfect
prediction is impossible (some difficulty only surfaces at runtime — the MDXEditor jsdom crash was
only understood by running probes). Good-enough prior + escalate-on-thrash is very achievable, and
that is the bar. (This is exactly §6.2's prior→posterior→escalation: tasks predict, classification
refines, escalation measures — this section makes the PRIOR good.)

**The rubric dimensions** (predict IMPL difficulty — NOT size, NOT risk):
1. **Library/framework fragility** — touches a flagged-hard lib under test (MDXEditor/Lexical/
   jsdom…)? The project test-strategy skill already catalogs these — feed it in.
2. **Test layer** — pure unit = easy; real-DB integration + e2e = hard (fixtures, timing, flake).
3. **Pattern availability** — strong mirror to copy-adapt = easy; net-new, no precedent = hard
   (the plan's "Patterns to Mirror" is the signal).
4. **Behavioral pinning / ambiguity** — fully-specified behavior + exact acceptance = easy; sharp
   edges (concurrency, async timing, state machines, judgment calls) = hard.
5. **Algorithmic complexity** — "wire two things" vs "implement a non-trivial algorithm".

**Home:** a project-agnostic "complexity-classification" skill (the 5 dimensions) + the project
test-strategy skill's fragility catalog; applied by the tasks/design step to stamp `implTier`.
**Grain:** per-wave tier = the MAX-difficulty cycle in the wave (one gnarly cycle pulls the wave
up). Per-cycle routing (`<next-model>` loop directive, §6.3) is a later refinement.
**Trustworthy over time via two mechanisms:** the escalation backstop (turns imperfect prediction
into safe), and the §6.4 calibration loop (record predicted-tier vs actual iterations/gate-fails/
escalations → tune the rubric; a wave class that keeps escalating gets re-stamped harder — the
prior LEARNS).

**Sequencing caveat [REC]:** downshift only pays off once PLAN quality is solid — a mediocre plan
thrashes any tier, and you can't tell plan-failure from tier-failure. While plan quality is still
being hardened, run impl=large to isolate the variable; introduce rubric-driven impl tier +
escalation once plans run clean. The rubric is the right architecture either way; this is just
when to flip it on.

**Tier floors [CONFIRMED 2026-06-14]:**
- **impl ∈ {medium, large} — never small.** Haiku-class (small) models are not reliable for
  autonomous TDD implementation (the per-cycle protocol is instruction-following + tool-discipline
  as much as code-gen; small models skip steps, mis-commit, thrash on real-test debugging).
  Sonnet (medium) is the practical floor; haiku stays for GLUE only (classify, review-classify).
  **Bonus:** this collapses the impl rubric to a BINARY decision — `medium` (default) vs `large`
  (a hard-difficulty signal from §13.3 fires) — which is materially more reliable to classify than
  the 3-way split that helped sink §4.1a, AND serves the "faster" goal (medium/sonnet fast by
  default, large only when earned). Escalation ladder: `medium → large` (on thrash) → self-fix at
  large → stop-and-ask / cross-provider (§6.5).
- **plan = large, constant — and likely permanent, not just "for now."** Planning is the
  highest-leverage step (a bad plan thrashes ANY impl tier) and a tiny cost fraction (one node vs
  N impl cycles), so downshifting it buys little and risks much. The dynamic tier lever lives on
  **impl only**, where the volume + speed payoff are. Revisit plan-downshift post-proof at most.

## 14. change-gate structure bug — the agent must NOT run the gate in-turn [CONFIRMED bug 2026-06-14]

**Symptom:** a live run reached all 5 waves green (assert 5/5) then the change-gate FAILED with
`claude-terminal turn exceeded 900000ms`. Raising `turnTimeoutMs` to 30 min is a band-aid, not the
fix — the structure is wrong.

**Root cause:** the change-gate loop prompt has the AGENT run the FULL gate
(`check-types && test && coverage:gate && test:e2e`) as Bash tool calls *inside its own turn*, to
see failures and fix them. So the slow, deterministic gate (full vitest + coverage + Playwright
e2e) executes inside the agent turn and blows the per-turn cap. This violates Archon good-practice
#1 ("use deterministic nodes for deterministic work; never make the AI run a check a computer can
run"). The `until_bash` completion check re-runs the same gate — so it runs twice, and the
expensive run is in the worst place (the capped agent turn). The wave gates (`gate-wN`) do NOT have
this bug — they are bash nodes; only the change-gate (a loop with an AI agent) does.

**The fix [REC — user's proposal, do immediately after the current run completes]:** separate
"agent fixes" from "gate runs". The gate execution moves OUT of the agent turn:
- **`until_bash` (or a preceding bash step) RUNS the gate** — deterministic, NOT subject to the
  agent turn cap (it has its own/bash timeout, which can be generous). On failure it CAPTURES the
  failures to a file (e.g. `$ARTIFACTS_DIR/gate-failures.txt`).
- **The agent loop prompt FIXES ONLY** — it reads `$ARTIFACTS_DIR/gate-failures.txt` and fixes
  those specific failures; it MUST NOT run the full suite itself. Each agent turn is now bounded
  (just fixing reported failures) → no turn-cap blowup.
- **Loop:** agent fixes (reads failure file) → `until_bash` re-runs the gate + re-captures →
  exit 0 = done, else next iteration with the fresh failure file.
- **First-iteration nuance:** the gate must run ONCE before the agent has anything to fix — either
  a bash gate-run node before the loop (writes the initial failure file), or the prompt no-ops on
  iteration 1 when the file is absent and lets `until_bash` produce it.
- **Implementation constraint (verified):** the loop does NOT expose `until_bash` output to the
  next iteration's prompt — only `$LOOP_USER_INPUT` / `$LOOP_PREV_OUTPUT` exist
  (`dag-executor.ts:1647-1648,2476-2477`). So failures MUST be passed via a file the prompt reads,
  not an until_bash-output variable.

**Generalizes:** any loop where the agent runs a slow full-suite/e2e command in-turn has this
trap. The principle — deterministic test runs belong in bash; the agent only fixes — should be the
default shape for ALL gate/fix loops. (The impl loop is fine: its per-cycle tests are single-file
scoped + one-cycle-per-iteration, so each turn stays short.)
