# Task machinery rework + wave execution model (the TDD harness synthesis)

Status (2026-06-15): **harness BUILT + runs end-to-end.** PR #114 (claude-terminal,
pre-restructure) hit 3/4 bars with 0 human turns; since then the tail restructure (§14/§15 →
§16.5), the cursor switch (§16.6), and the reward-hack guardrails (§16.10) all shipped, and the
supporting archon fixes landed (§16.7–§16.9). **The one bar still unproven: zero undocumented
deviations on a clean 4/4-green run** — no cursor-era run has yet gone fully green to a PR. The
build/run trail lives in **§13** (execution grain, plan/impl separation, impl-tier rubric +
escalation), **§14/§15** (change-gate + tail structure, BUILT in §16.5), and **§16** (the dated
build chronology + the canonical-source decision: the workflow belongs in OpenSpec, not
hand-authored per-project). Read §13–§16 first for current state.

Tags: **[CONFIRMED]** user-ratified · **[REC]** Claude's default, re-confirmable · **[OPEN]**
undecided · **[BUILT §x]** shipped, see cross-ref.

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
  - **`implTier` heuristic → SUPERSEDED by §13.3.** A step-2 artifact set Wave 4 `implTier:small`
    from `risk:low`, conflating implementation difficulty with blast-radius risk. That failure mode
    motivated the multi-dimensional rubric + predict-then-escalate model in §13.3 (impl ∈ {medium,
    large}, never small); see there for the current design.
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
                       (when: by scope/risk stamps; security-critical forces ON only the
                       SAFETY-relevant reviewers — error-handling + test-coverage — NOT
                       comment-quality/docs-impact, which gate on their own diff vote;
                       amended 2026-06-14) → synthesize → self-fix → simplify
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
3. ✅ **DONE 2026-06-14.** **Authored the A′ workflow** via a generator
   (`opsx-wave-harness.gen.mjs` → `opsx-wave-harness.yaml`, K=10 slots, claude-terminal
   provider, tier keywords). `archon validate workflows` clean; wiring proven by a bash-only
   stub run (slots fire/skip on the numeric `when:` over bash-JSON dot-notation; join via
   `none_failed_min_one_success`). See §16. Static per-node tiers (plan large / impl medium);
   the loop-`model:` honored fact is §11.
4. ✅ **DONE 2026-06-14 (near-pass).** **Ran the slice end-to-end** → green-gated draft PR
   (PR #114), all 5 waves green, zero human turns. Surfaced + fixed a chain of real defects
   (claude-terminal config gap, setName cross-wave slicing, e2e path grounding, MDXEditor jsdom
   test-layer, the one-cycle turn-cap fix, the change-gate turn-cap §14). Left the 4th bar (zero
   undocumented deviations) open → motivated the §14/§15 tail restructure.
5. ✅ **BUILT 2026-06-14/15 (§16.5–§16.10).** Tail restructure, cursor-default switch, and
   reward-hack guardrails shipped; supporting archon fixes landed. **Still open:** a clean
   4/4-green validating run on cursor (none yet).
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

### 13.3 impl-tier prediction: a multi-dimensional rubric + predict-then-escalate [CONFIRMED; escalation half BUILT §16.8, rubric still PENDING]

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

## 14. change-gate structure bug — the agent must NOT run the gate in-turn [BUILT §16.5]

**Symptom:** a live run reached all 5 waves green then the change-gate FAILED with `claude-terminal
turn exceeded 900000ms`. Raising `turnTimeoutMs` was a band-aid; the structure was wrong.

**Root cause:** the change-gate loop prompt had the AGENT run the FULL gate
(`check-types && test && coverage:gate && test:e2e`) as Bash calls *inside its own turn*. So the
slow deterministic gate (vitest + coverage + Playwright e2e) executed in the agent turn and blew the
per-turn cap — violating "deterministic work belongs in deterministic nodes." The wave gates
(`gate-wN`) never had this (they're bash nodes); only the change-gate (an AI loop) did.

**Fix (BUILT — §16.5 has the as-built unrolled-slot shape):** separate "gate runs" from "agent
fixes". A bash node RUNS the gate (own/generous timeout, not the agent cap) and CAPTURES failures to
`$ARTIFACTS_DIR/gate-failures.txt`; the agent prompt FIXES ONLY (reads that file, never runs the
suite) → each turn is bounded. Implementation constraint that shaped the build: the loop does NOT
expose `until_bash` output to the next prompt (only `$LOOP_USER_INPUT`/`$LOOP_PREV_OUTPUT` —
`dag-executor.ts:1647-1648,2476-2477`), and `until_bash` is hardcapped at 120s (too short for e2e),
so the gate became **unrolled bash gate-run + agent fix slots**, not a loop (§16.5).

**Generalizes:** any loop where the agent runs a slow full-suite/e2e command in-turn has this trap —
deterministic test runs belong in bash; the agent only fixes. (The impl loop is fine: per-cycle
tests are single-file scoped, one cycle per iteration, so each turn stays short.)

## 15. Review/fix/simplify tail — structure fixes [BUILT §16.5]

The first full end-to-end run reached a draft PR (PR #114, zero human turns) — but the report
flagged the v1 **failure class**: undocumented deviations. Root cause was the TAIL (change-gate,
self-fix, simplify): these nodes mutate code but the §4.3/§4.4 logging discipline was only wired
into the wave impl loop, so their commits were undocumented by construction. Four fixes, all in the
tail, built together as one restructure (§16.5):

### 15.1 Tail nodes MUST log to progress.md [CONFIRMED bug]
Observed post-wave-4-gate commits with NO progress.md entry: `61ed62d3` (change-gate added unit
tests, likely to hit coverage:gate 80%), `d799ba60` (change-gate fixed a red e2e), `82271794`
(self-fix review findings), `a3254070` (simplify). The report flags undocumented deviations as the
ONLY failure class (§4.3), so these fail the run even though a PR was produced. **Fix:** change-gate,
self-fix, and simplify each append a progress.md entry (what changed + why) on every mutation —
same documented-deviation discipline the impl loop already follows. Then the end-review sees them
as intentional.

### 15.2 change-gate scope-awareness — flag, don't fix, out-of-scope reds [CONFIRMED bug]
`d799ba60` is worse than undocumented: the change-gate FIXED a **pre-existing, out-of-scope** test
(admin role-assignment e2e the change never touched) to force the full suite green — scope creep.
**Fix:** the change-gate fixes only failures **caused by this change**; pre-existing/unrelated reds
are **flagged + reported** (a wait-for-toast flake in an unrelated e2e is not this change's job),
not silently fixed. Distinguishing "caused by this change" = failure in a file the diff touches, or
a test that passed on the base branch. (Also: if coverage:gate forces adding tests beyond the wave
plans (`61ed62d3`), that signals the WAVES under-covered — a wave-plan gap to surface, not just a
silent top-up.)

### 15.3 Gate must verify the FINAL shipped code (gate-after-mutation) [DECIDED → (b)]
self-fix + simplify mutate code AFTER the change-gate, so the draft PR would ship code the gate
never verified — the gate must run after the last mutation. Considered (a) re-gate after a draft PR
(reuses PR-oriented review defaults, costs a second full gate) vs **(b) diff-based review, single
gate last** — chosen. Key realization: the PR-coupling in archon's review defaults is incidental, not
essential — the review chain already flows through `$ARTIFACTS_DIR/review/*.md` artifacts, and the PR
was used only as the diff source (`gh pr diff` → `git diff $BASE_BRANCH...HEAD`) and a comment target
(`gh pr comment` — pure publishing). So review/self-fix forked to base-diff with inline
comment-posting dropped; a `post-review-comments` node AFTER create-pr batch-posts the saved
artifacts. **Order:** `waves → simplify → review → self-fix → change-gate → create-pr →
post-review-comments → report` — simplify first among mutators (§15.4), create-pr last (PR = verified
code, one gate). (A real open PR is needed only for the FUTURE capability of reviewing CI failures /
external PR comments — a separate node, not the internal chain.)

### 15.4 Simplify placement [CONFIRMED 2026-06-14]
A **single simplify** suffices (GSD-style per-phase/per-wave is more granular than needed) — but it
runs **BEFORE review**, not at the end. simplify is the broadest mutator (refactors across the whole
diff) and can incidentally introduce bugs; review + self-fix must run AFTER it so its output is
covered. Mutator risk order: **simplify (broadest) → review → self-fix (narrowest, targeted) →
change-gate**. Never after the gate.

## 16. Harness build + the canonical-source decision (2026-06-14)

### 16.1 What was built (and where it lives NOW — the testbed, not the home)
The A′ harness was authored in the **lexup** testbed at
`/Users/paolof/Developer/Projects/lexup/lexup-new/.archon/`:
- `workflows/opsx-wave-harness.gen.mjs` — the **generator/template** (the note's "generated once
  from a template" §5.2). Parameterized on `--k` (slot count) and `--mode real|stub`. Emits the
  YAML; stub mode is a bash-only wiring probe.
- `workflows/opsx-wave-harness.yaml` — the real workflow (K=10, ~58 nodes): the full A′ shape
  (pull → classify → smoke → 10×[recount·plan·impl(loop)·gate] → assert-waves-complete →
  change-gate → create-pr → review chain → report). `provider: claude-terminal`, tiers
  plan=`large` / impl=`medium` / classifiers=`small`, one-cycle-per-iteration impl loop
  (`max_iterations:15`, `fresh_context:true`), per-cycle `vitest run <file>` (no coverage).
- `workflows/opsx-wave-harness.stub.yaml` — the wiring probe (regenerable).
- `config.yaml` — `assistant: claude-terminal` (the REPO key is `assistant:`, NOT
  `defaultAssistant:` — that was a real bug; §see below), `worktree.copyFiles: [.env,
  apps/web/.env]`, `turnTimeoutMs: 900000` (the 30-min band-aid for §14 was removed once the
  gate moved to bash — §16.5).
- `.agents/skills/lexup-testing/SKILL.md` — grounding added: MDXEditor/Lexical-under-jsdom →
  e2e (in the "What to test where" table AND a fragility note), per-cycle `vitest run` (no
  coverage).

Archon-side (branch `feat/claude-terminal-provider`): `tier-defaults.json` gained a
`claude-terminal` entry (small→haiku, medium→sonnet, large→opus; user later set large→
`claude-opus-4-6[1m]`); the stale loop-`model:`-ignored docs were fixed (commit `7f5327b`).

### 16.2 claude-terminal config gaps closed [CONFIRMED 2026-06-14]
- **Tiers:** claude-terminal wasn't in `tier-defaults.json` → tier keywords threw. Added it
  (mirrors claude). `buildAiProfile` uses `config.assistant` as defaultProvider.
- **Repo config key:** a REPO `.archon/config.yaml` selects its provider via **`assistant:`**;
  only the GLOBAL `~/.archon/config.yaml` uses `defaultAssistant:`. The repo had
  `defaultAssistant:` → silently ignored → fell back to builtin `claude`. Fixed to `assistant:`.
- **DB:** the standalone CLI uses SQLite (`~/.archon/archon.db`) unless `DATABASE_URL` is set;
  the user's Postgres needed `DATABASE_URL` in `~/.archon/.env`. (The run config is loaded from
  the **worktree** cwd — `executor.ts:383 loadConfig(workingCwd)` — so a `--resume` reads the
  worktree's config; and `--resume` matches the run's `working_path` exactly, so resume must be
  invoked from the worktree dir or via run-id.)

### 16.3 The canonical-source decision [CONFIRMED 2026-06-14] — workflow lives in OpenSpec, CLI-installed
The harness workflow YAML + its generator are **project-agnostic** and must live in **OpenSpec
(this repo) as the canonical source**, installed into a target repo's `.archon/workflows/` via the
CLI — **exactly like commands and skills are emitted/installed today**. Hand-authoring them in
lexup was the testbed bootstrap, NOT the home. This extends §12 (OpenSpec emits portable artifacts;
the workflow YAML is the Archon *adapter*) — now the adapter itself is OpenSpec-owned and installed,
not copied per project.

What this implies for the build:
- OpenSpec owns the generator/template (the source of `opsx-wave-harness.yaml`), alongside the
  command + skill emitters in `src/core/templates/`.
- `openspec update`/install writes the harness workflow into the target's `.archon/workflows/`
  (capability-gated per tool, like the multi-file skill generation note).
- **Project-specific bits stay in the project, not hardcoded:** gate commands (`pnpm test`,
  `coverage:gate`, `test:e2e`), tier mapping, `copyFiles`, the test-strategy skill — all come from
  the target's `config.yaml` / skills. The emitted workflow references them, parameterized. This is
  the §12 generality rule applied to the workflow itself: distill lexup's shape into a general,
  installable harness; never bake lexup specifics into it.
- Open question for the build session: how much is a static emitted YAML vs a generator the CLI
  runs at install time (K, provider, tiers as install params). The lexup `.gen.mjs` is the
  prototype of the latter.

### 16.4 Tail-restructure punch list → SUPERSEDED by §16.5
The five-item punch list (gate-in-bash, fork review/self-fix to base-diff, reorder tail, progress.md
logging + scope-awareness, post-review-comments node) was BUILT — all five shipped, see §16.5 for the
as-built detail. (Post-clean-run hardening remains: impl-tier rubric §13.3, then the
plan-validation/reconciliation seed `plan-validation-and-recovery.md`.)

### 16.5 Tail restructure — BUILT [2026-06-14, lexup dev `84a0ea2a`]
All five §16.4 items are implemented in the lexup generator (`opsx-wave-harness.gen.mjs`,
regenerated + `archon validate … ok`). The build forced ONE mechanism change from §14's letter
(but not its principle), recorded below so it's not re-litigated.

**The forced pivot — change-gate is UNROLLED bash slots, not a loop (§14 mechanism amended):**
§14 proposed `until_bash` (or a preceding bash step) runs the gate. The empirical constraint:
the archon loop's ONLY per-iteration deterministic hook is `until_bash`, and its timeout is
**hardcoded to 120s** (`dag-executor.ts:2470` `SUBPROCESS_DEFAULT_TIMEOUT`, no `node.timeout`
override) — too short for the full vitest+coverage+Playwright e2e gate. A loop therefore CANNOT
re-run a slow gate per iteration (until_bash too short; the agent running it = the original §14
bug; loop exhaustion `state:'failed'`). So the change-gate is the harness's own unrolled-slot
idiom (§13.1) — the "preceding bash step" the note also sanctioned:
- `gate-run-i` (i=0..G; G=`GATE_FIX_ATTEMPTS`=2 ⇒ 3 verifying runs) — a **bash node** with a
  configurable `timeout: 1800000`. Runs check-types · test · coverage:gate · test:e2e, captures
  each failure to `$ARTIFACTS_DIR/gate-failures.txt`, writes green/red to `gate-status`, and emits
  a **single pure-JSON line** `{"green":"true|false"}` on stdout (all diagnostics → stderr, so
  `$gate-run-i.output.green` parses). Always `exit 0` (a node failure must not abort the run).
- `gate-fix-i` (i=0..G-1) — an **agent prompt** gated `when: $gate-run-i.output.green == 'false'`.
  Reads gate-failures.txt and FIXES ONLY (never runs the suite — that was the bug). A green run
  when-skips the next fix and **cascade-skips** later runs (verified). `create-pr` depends on ALL
  gate nodes with `trigger_rule: all_done`, so it fires after a cascade-skipped tail.
- This keeps §14's PRINCIPLE intact (deterministic gate in bash, agent only fixes, short turns) —
  only the loop→unroll mechanism changed. The 30-min turnTimeoutMs band-aid is gone (config back
  to 900s).
- **Archon follow-up (out of scope here):** if `until_bash` honored `node.timeout`, the elegant
  single loop would work — worth an archon issue. Recorded here, not actioned this session.

**Items 2–5 as built:**
- (2/3) Forked review/self-fix/simplify to base-diff + pnpm + artifact-only (no inline `gh pr
  comment`), emitted as `opsx-*` commands **from the generator** (single source — decision 16;
  `writeCommands()` writes `.archon/commands/opsx-*.md` on every regen, alongside the YAML).
  Reviewers read `scope.md` + `diff.patch`; the findings-filename contract
  (`*-findings.md` → synthesize `consolidated-review.md` → self-fix `fix-report.md`) is unbroken.
  Tail order = `assert-waves-complete → simplify → review-scope → review-classify → {code-review +
  4 when-gated reviewers} → synthesize(one_success) → self-fix → gate-run/fix×3 → create-pr →
  post-review-comments → report`.
- (4) simplify / self-fix / change-gate each append a progress.md entry **atomically with** the
  mutating commit. change-gate fixes only IN-SCOPE reds (heuristic: failing path ∈
  `git diff --name-only`) and WAIVES + documents out-of-scope reds. **create-pr-on-red is a
  deliberate policy:** a still-red gate still ships a DRAFT PR for human triage; the **report**
  (not a node failure) judges the gate across FOUR terminal states — GREEN / RED-all-waived
  (acceptable) / RED-unfixed-in-scope (bar failure) / INCOMPLETE (gate-status reads "running" or is
  missing → a gate-run was killed before finishing, e.g. a 30-min timeout → bar failure,
  not a silent pass) — so a waiver isn't miscounted. Each gate-run writes a "running"
  sentinel to gate-status at start (overwritten with green/red on completion), so a kill
  leaves an unambiguous INCOMPLETE marker rather than a stale green (verified by a
  SIGTERM-mid-run simulation).
  **Deviation criterion (precise):** the bar flags a commit that modifies SOURCE/TEST files
  without a matching progress.md entry — NOT the harness's own bookkeeping (`docs(plan):` =
  plans/ only, `chore(wave):` = tasks.md only, per-cycle impl commits log inline). The naive
  "any commit lacking a log" would spuriously red the bar on a clean run (~2K bookkeeping commits
  at K-wave scale) — only the tail mutators count.
- (5) `post-review-comments` (bash, after create-pr) batch-posts `consolidated-review.md` +
  `fix-report.md` + `simplify-report.md` via `gh pr comment --body-file`; never fails the run.

**Verification done this session:** `archon validate … ok`; `bash -n` clean on all 26 generated
bash blocks; findings-filename contract checked across producers/consumers; the **stub probe ran
end-to-end** and confirmed the live dependency graph — gate cascade (run-0 red→fix-0 fires;
run-1 green→fix-1 skips; run-2 cascade-skips; create-pr fires via all_done) and reviewer
when-gating (comment-quality + docs-impact skip). The real slice was then run by the user on
cursor (§16.6+); those runs surfaced the §16.7–§16.9 fixes but **no run has yet reached a clean
4/4-green PR** — that validating run remains the open milestone.

### 16.6 Cursor as default provider — the economic lever [2026-06-15, lexup dev `c1cb2175`]
Introduced the **cursor** provider as the workflow default to cut cost/latency, keeping only the
two highest-leverage REASONING nodes on claude-terminal opus. Provider map now:
- **Default = cursor** (`provider: cursor`, `model: composer-2.5`). Bulk of the harness — impl
  loop, change-gate fix turns, the review chain (review-scope + reviewers + synthesize), self-fix,
  simplify, create-pr, report — runs on cursor.
- **claude-terminal opus** on the two reasoning nodes via per-node `provider:` override: **plan-wN**
  (`claude-opus-4-6[1m]`, effort high — coherence lives in the plan, §13.1) and **code-review**
  (`opus`, effort high — the quality gate).
- **claude-terminal haiku** on the three glue nodes — classify / smoke / review-classify (literal
  `model: haiku` + `provider: claude-terminal` + `allowed_tools`). These are trivial read-only
  JSON-classification tasks: haiku is the right-sized cheap tier, and claude-terminal (unlike
  cursor) honors `allowed_tools`, so they keep their read-only sandbox.
- **Escalation ladder on the change-gate fix turns:** `gate-fix-0` runs on the cursor default
  (composer-2.5); the LAST attempt (`gate-fix-1`, generalized as `i === GATE_FIX_ATTEMPTS-1`)
  escalates to **claude-terminal opus** + effort high. It only fires when every cheaper attempt
  already failed → the residual reds are the hard ones, warranting the strong model on the code
  that ships (§6.5/§13.3 escalate-on-thrash; the unrolled gate structure gives this nearly free).
  **self-fix stays on cursor** — it applies fixes that code-review (opus) already reasoned out
  (execution against findings, like impl against a plan §13.1), and the change-gate backstops it;
  opus there would pay twice for the same thinking.

**The mechanism that makes this work (non-obvious, cost a full investigation):** tier keywords
(`small`/`medium`/`large`) resolve against the aiProfile built from **`config.assistant`** (still
`claude-terminal`) — `buildAiProfile(provider)` only emits tier aliases for THAT provider
(model-validation.ts). So a tier `model:` ALWAYS pins to config.assistant's provider, regardless
of the workflow/node `provider:` field; worse, a workflow-level tier model + `provider: cursor`
trips the conflict check (executor.ts:482) and silently reverts the WHOLE workflow to
claude-terminal. **The fix is to use LITERAL model ids, never tiers:** `resolveModelSpec` returns
a literal unchanged (pass-through), so `composer-2.5` / `opus` / `claude-opus-4-6[1m]` stay on
whatever `provider:` is set. This is exactly how the pre-existing `archon-fix-bug.yaml` does it
(provider cursor + literal composer-2.5; per-node claude-terminal + literal opus). **No
`config.assistant` change needed** — the switch is entirely in the workflow. Consequences encoded
in the generator: the `cmd()` helper gained provider/model/effort emission (real-mode only, for
code-review). NOTE on glue: an interim version dropped their `model`+`allowed_tools` to inherit the
cursor default, but that (a) upgraded trivial JSON tasks from haiku to composer-2.5 and (b) lost
the tool sandbox (cursor ignores `allowed_tools` → validate warnings). Reverted: glue is pinned to
claude-terminal haiku with `allowed_tools` restored (see provider map above).

**The bet [user decision 2026-06-15]:** impl + gate-fix on cursor **composer-2.5** overrides
§13.3's "sonnet is the autonomous-TDD floor / don't downshift impl until plans run clean." The
user chose the full cost play now; composer-2.5 is Cursor's agentic coding model (plausibly
adequate for the per-cycle TDD protocol) but UNPROVEN in this harness. Watch the first real run for
impl thrash / gate-fix quality — if it thrashes, the §13.3 fallback is to pin impl+gate-fix back to
`provider: claude-terminal` + literal `sonnet` while keeping the cheap nodes on cursor. Prereq:
`CURSOR_API_KEY` in `~/.archon/.env` (present). Verified: `archon validate … ok`, stub probe green.

### 16.7 First cursor run (83a7bf8e) — two findings [2026-06-15]
The first cursor run aborted at wave 4 and surfaced one real STRUCTURAL bug plus one robustness gap.

**(1) FIXED — create-pr shipped a PR for an ABORTED run [lexup dev `27f10f6f`].** Sequence:
`impl-w4` hit a `cursor_error` → wave 4 incomplete → `assert-waves-complete` correctly **failed**
("incomplete: 4/5 waves") → the whole tail (simplify → review chain → self-fix → ALL gate nodes)
correctly cascade-**skipped** — **but `create-pr` ran anyway** and shipped PR #116 for the partial
change (then post-review-comments + report ran too). Root cause: `create-pr.trigger_rule: all_done`
counts a SKIPPED dep as "done" (`checkTriggerRule` dag-executor.ts:691 — `all_done` = every dep not
pending/running), so the abort cascade (every gate node skipped) satisfied it. `all_done` was chosen
to tolerate the LEGIT green-early gate cascade (gate-run-0 done, later attempts skipped) but it can't
tell that from the abort cascade. **Fix: `one_success`** (fires iff ≥1 dep `completed`). gate-run-0
exits 0 whenever the pipeline reaches it, so "a gate node completed" == "the change-gate ran":
ships the PR when the gate ran (green or red — the triage policy) and on the green-early cascade, but
SKIPS create-pr + post-review-comments + report when the pipeline aborted upstream. (`assert-waves-
complete` keeps `all_done` — it MUST run to DETECT incompleteness; it's the detector, not a shipper.)
Empirically verified with a forced-abort stub probe: create-pr + downstream skip. **General lesson:**
`all_done` on a SHIPPING/terminal node is a foot-gun — it fires on abort cascades; use `one_success`
(or `none_failed_min_one_success`) for "run iff the upstream actually produced something."

**(2) FIXED — a single transient `cursor_error` killed the impl loop on iteration 1.** `impl-w4`
failed not from thrash but from one provider-side SDK error on its first iteration. Root cause was
CLASSIFICATION: loops already go through the 2× retry wrapper, but an opaque `cursor_error`/"run
error" classified UNKNOWN → not retried (distinct from §13.3 escalate-on-thrash, which is about
capability, not flakiness). **Archon patch landed (A1 + B)** (`docs/plans/loop-transient-error-
retry.md`): loops now own per-iteration retry inside `executeLoopNode` (`dag-executor.ts:2126`) with
structural `errorSubtype` retryability + FATAL precedence preserved. The resumed run progressed past
the blip.

### 16.8 impl escalation (b) + max_iterations calibration [2026-06-15]
**max_iterations counts EVERY iteration (one TDD cycle each), not retries/failures.** Calibration
from run 83a7bf8e: actual iterations per wave = `impl-w0=1, w1=10, w2=6, w3=9, w4=8` vs the fixed cap
`15`. Wave-1 had 10 cycles → exactly 10 iterations (zero retries — cursor composer-2.5 did each cycle
first-try). So **15 is NOT "too much"** (peak 10/15, only 5 headroom; arguably tight for the biggest
waves) — but a FIXED cap is mis-shaped because wave sizes vary 1→10 cycles: too loose for small waves
(a stuck 1-cycle wave burns all 15 before failing), tight for large ones. A completing wave exits on
`COMPLETE` early, so the cap is invisible on the success path — it only bites the thrash/failure path.

**Decision: don't tune the number — make the thrash trigger PROGRESS-based.** The loop's real progress
unit is the per-cycle git commit. So escalation/abort should fire on STALL (no new commit for K
consecutive iterations), which is size-independent: a 10-cycle wave committing each iteration is
healthy; a wave stuck for 3 iterations is thrashing regardless of size. Keep `max_iterations` ~15-18
as a generous hard backstop, not the primary trigger.

**(b) escalation-on-thrash = an archon loop feature** (not workflow-unrolled — archon has no
`on_failure` trigger, and impl is a single loop). Spec written: `archon repo
docs/plans/loop-model-escalation.md` — adds a loop `escalate: { model, provider, effort, stall_after }`
block; on stall (git-commit-based) the loop swaps to the fallback model (claude-terminal opus) for the
remaining budget; composes with the (B) per-iteration retry (retry = transient/same model; escalate =
capability/stronger model). Telemetry `loop_node_escalated` feeds the §13.3 calibration prior. Harness
consumer (separate, later): `impl-wN` loop gains `escalate: {provider: claude-terminal, model: opus,
effort: high, stall_after: 3}`. **Timing: build after a clean run confirms whether composer even needs
it** (no thrash observed yet; §13.3 — don't escalate before plans run clean).

> **[LANDED 2026-06-15]** Archon shipped the feature (loop schema `escalate: {model, provider, effort,
> stall_after:default 3}`, `packages/workflows/src/schemas/loop.ts:36`; git-commit stall detection in
> `executeLoopNode`). Spec marked implemented. **Consumer wired** (lexup dev `334cb13d`): every
> `impl-wN` loop now emits `escalate: {provider: claude-terminal, model: opus, effort: high,
> stall_after: 3}`. Decided to wire it now rather than wait for an observed thrash — it's a pure
> backstop (a healthy wave never escalates; max_iterations 15 unchanged), so the downside is nil and it
> closes the abort-on-stall failure mode that run 83a7bf8e hit (impl-w4 cursor_error → abort).

### 16.9 Gate-runner env leak — archon DATABASE_URL poisons e2e [FIXED 2026-06-15, lexup dev `785d5093`]
The resumed run's change-gate e2e kept failing: `[setup]` storageState seeding → `send-verification-
otp` HTTP 500 (`relation "verification" does not exist`). Root cause (diagnosed live by the gate-fix
node, which correctly WAIVED it as out-of-scope per §15.2 — not a code defect): the gate's bash env
inherits **archon's own `DATABASE_URL`** (from `~/.archon/.env`, archon's Postgres). lexup's e2e loads
its DB via `dotenv -e .env.e2e --`, and **dotenv-cli does not override an already-set shell var**, so
the leaked url wins → `next start` (Playwright webServer) connects to the unmigrated archon DB → OTP
500. vitest steps load their own env (green), so only e2e (which shells out to `next start`) was hit.
**Fix:** run the e2e step as `env -u DATABASE_URL pnpm test:e2e` in `gateCapture()` so `.env.e2e`
populates it cleanly (scoped to e2e). This validates the §15.2 design end-to-end: the gate-fix node
correctly distinguished an infra/out-of-scope red (waive, don't hack) from an in-scope one, and the
create-pr `one_success` change means a waived-red gate still ships the PR (state b). **Archon
follow-up:** archon should not leak its internal `DATABASE_URL` (and other archon-private env) into
target-repo gate/bash commands at all — a general env-isolation fix (mirror of the existing
target→archon `.env` strip, but the other direction). **Spec written:** `archon repo
docs/plans/gate-env-isolation.md` — root cause is `loadArchonEnv` (`override:true`) → `process.env`
→ the three target-command env sites spread it (`dag-executor.ts:1680/1855/2563`). Fix = strip an
archon-internal-infra **denylist** (charter: `DATABASE_URL`) from bash/script/until_bash command env
via a `buildTargetCommandEnv` helper. Denylist NOT blanket-strip: managed creds (GitHub token used by
`post-review-comments`'s `gh pr comment`, provider keys) also live in `~/.archon/.env` and must keep
flowing. Provider-subprocess env isolation is a separate (credential-aware) patch. Hand to an archon
agent; pairs with the loop-escalation spec.

> **[LANDED 2026-06-15]** Archon shipped it: `ARCHON_INTERNAL_ENV_KEYS` denylist (conservative —
> `DATABASE_URL` only) + `buildTargetCommandEnv` helper (`packages/paths/src/archon-internal-env.ts`),
> applied at the three target-command env sites (`dag-executor.ts:1683/1860/~2708`); managed creds
> (GitHub token for `gh pr comment`) still flow. Spec marked implemented. **Consumer follow-up
> (DONE, lexup dev `a02c8682`):** the harness's `env -u DATABASE_URL pnpm test:e2e` gate workaround was
> removed — the archon strip makes it redundant, so the gate is now just `step e2e pnpm test:e2e` and
> `.env.e2e` populates `DATABASE_URL` cleanly. Removed eagerly (lean gate) rather than waiting for a
> fresh run to re-confirm; the archon-side test suite already covers the strip.

### 16.10 Guardrails vs reward-hacking — deterministic lint wall + anti-hack steering [BUILT 2026-06-15, lexup dev `e9460246`]
**Problem.** A real run surfaced a cursor review finding: a **synchronous `XMLHttpRequest` in a
ProfileSection component**, used to bypass the oRPC client (`useMutation`) and force a flaky e2e
green. This is the canonical weak-model failure mode: the model optimizes the *local* objective (a
green test) by violating a *global* architecture rule. Prompt adherence alone can't be trusted for
weak/cheap models — we need a deterministic wall plus steering.

**The lever hierarchy (two layers, deterministic first):**
1. **Deterministic wall (the hero) — lint in the change-gate.** `gateCapture()` now runs
   `step check pnpm check` **first** (cheapest step, surfaces a bypass before the expensive
   suite+e2e). `pnpm check` = `ultracite check` (read-only). A data-layer bypass / suppressed rule /
   weakened test is caught regardless of what the prompt said. **Gate stays a VERIFIER, not a
   mutator** — decided against `pnpm fix` in the gate: a mutating gate reports green partly because
   it just edited *uncommitted* code (lost or accidentally shipped), and breaks gate-slot idempotency
   (run-0→fix→run-1 deltas would come from the gate, not the agent). For the reward-hack case `fix`
   buys nothing anyway — `noRestrictedGlobals` is not auto-fixable. Split: **agents run `pnpm fix` in
   their own cycle** (impl + gate-fix prompts) so commits are clean; the gate `check`s read-only.
   Lint is NOT added to the per-wave gate (it has no self-heal loop → a lint miss would hard-abort the
   run); only the change-gate, where the gate-fix loop can remediate.
2. **Domain rule expressed in Biome (`biome.json` `noRestrictedGlobals`).** Bans `XMLHttpRequest`
   **globally** (absent repo-wide — verified `git grep` → zero hits, no legit use, kills the exact
   sync-XHR trick) and `fetch` scoped to `apps/web/src/components/**` via an override (enforce oRPC in
   components), with `video-player.tsx`'s streaming download as the sole sanctioned exception
   (`!`-excluded; the `packages/ui` legit fetch is already outside biome's `files.includes`). Fits the
   repo's existing `noRestrictedImports` boundary-enforcement philosophy. **Gotcha (caught by
   advisor):** Biome's options-form `noRestrictedGlobals` **REPLACES** the rule config, it does not
   deep-merge — ultracite's preset sets a bare `noRestrictedGlobals: "error"` whose Biome default deny
   set is `["event","error"]`. Specifying `deniedGlobals` silently dropped those repo-wide (a *missing*
   error, invisible to a clean `pnpm check`). Fix: re-list `event`+`error` in **both** maps. Verified:
   probe component flags XHR/fetch/event/error; `video-player.tsx` clean; full `pnpm check` exit 0
   (563 files). The "must use oRPC" *semantic* rule is NOT expressible in stock Biome (would need
   GritQL/eslint) — `noRestrictedGlobals` is the deterministic proxy; the rest stays plan+review.
3. **Anti-reward-hack steering (prompts, generator).** Added an **INVIOLABLE RULES** block to the
   impl loop + an equivalent guard to `GATE_FIX_PROMPT`: never bypass the mandated data layer (raw
   fetch/XHR), never suppress a check (`biome-ignore` / disabled rule / `@ts-ignore` / `.skip`/`.only`),
   a test verifies BEHAVIOR (fix a flake's synchronization, don't weaken the assertion or mangle prod
   code), and **if you can't go green without breaking a rule, STOP and log a documented deviation — a
   flagged red is correct; a rule-breaking green is a defect.** `plan-wN` gets **pre-commitment**: name
   the exact mechanism per cycle (e.g. "oRPC `profile.update` via useMutation") and never *plan* a
   bypass/suppression — a vague cycle invites an improvised shortcut.

**Why this composes:** the lint wall removes the *possibility* of the bypass shipping; the test-fix
steering removes the *pressure* that motivated it (the model is told the honest red is the correct
outcome). Layer 1 is project-agnostic (any repo with a lint gate); layer 2 is lexup-domain.
**Open:** the semantic "use oRPC" rule still rides on plan+review, not lint — a GritQL/eslint plugin
could make it deterministic later (not built; tracked here).
