# Handoff: bake battle-tested execution disciplines into OpenSpec deep-planning

**Purpose.** This is the **umbrella brief** for a dedicated session that hardens the OpenSpec
deep-planning workflow with disciplines distilled from *real autonomous/semi-autonomous harness
runs* — not theory. It **absorbs** the earlier falsification-disciplines port (now Seam-group 1
below) and adds two more sources: the **Coolify provisioner execution
retro** (12 evidence-anchored learnings) and the **GSD research-gating + adversarial-review
mechanisms**. It is built to **absorb future seams** reconstructed from other execution records
(see §6).

**The meta-thesis.** Every escaped defect in these runs was a **claim that was generated from
reasoning/corpus memory and never falsified at the earliest feasible point**, then deferred to a
phase that couldn't catch it (review reaches the same wrong conclusion on plausible prose) or ran
too late (post-merge CI / the live capstone). The fix is the same across all three sources:
**front-load verification, route it by claim type, name the surfaces that have no executable
oracle, and add a cross-model adversarial gate where in-model review is structurally blind.** All
of it is **gated on integration-surface density** — a pure app-logic change covered by tests
skips it; the test is the falsifier.

**This is not new ceremony for simple work.** Each seam states its proportionality trigger.

---

## 1. Provenance (where each discipline was earned)

| Source | What it is | Artifact |
|---|---|---|
| **lexup `feat-image-build-versioning` track** | Birthplace (per transcript reconstruction) of the falsification disciplines — the "every escaped defect was an un-falsified claim" lesson | superpowers commits `ddcfcdb`, `5dd63dd` (2026-06-26) → Seam-group 1 (§2.A/C/D/F) |
| **Coolify provisioner Phase-2 retro** | 12 learnings from executing a plan task-by-task then surviving 4 external review passes (29 findings) | `…/lexup-new/docs/superpowers/retros/2026-06-28-provisioner-process-learnings.md` |
| **GSD / gsd-core** | Research-gating (gray-area enumeration, maturity-tiered depth) + a fully-mechanized cross-model adversarial plan review | GSD transcripts (mechanism in §2.B and §2.F.2); **re-confirm tokens against GSD source at implementation** |
| **OpenSpec deep-planning** (the target) | The schema + skills these seams land in | `schemas/deep-planning/schema.yaml`, `schemas/skills/` |

**Read first for the OpenSpec mechanics:** §7 (the skill machinery — artifact model,
skills-are-hashed-markdown, seams, bundle markers, the `pnpm run rebaseline:skills` parity wall —
and the full files-to-touch table).

---

## 2. The seam catalog (the heart)

Organized by OpenSpec phase. Each seam: **principle → mechanism → encode-in → source**. Tags:
`[FALSIFY]` already specified in the falsification handoff (carry it in); `[RETRO]` new from the
provisioner retro; `[GSD]` new from GSD; `[VALIDATES]` confirms an existing OpenSpec design rather
than changing it.

### A. The shared spine — `FALSIFY_RITUAL` seam

**Principle.** Route each load-bearing claim to its one cheap falsifier, at the earliest point
that falsifier is available. Review is *not* the falsifier for boundary/logic claims.

**Mechanism — the routing table (carry in verbatim, enriched):**

| Claim type | Cheap falsifier | Earliest point |
|---|---|---|
| External system/tool/platform behavior | read the authoritative doc/source, or a ≤5-min spike — **cite it** | design (cite) → a de-risk wave (spike) |
| Internal logic / a gate / invariant | **trace the concrete failure scenario** — "walk the path where it must fire; does it?" | design |
| A fact about this repo | **grep/read it** — never assert from memory | design |
| Surface completeness (env, URLs, ingress) | **enumerate from the schema/data-flow**, cross-ref existing ground truth | design |
| Cold-start / first run | ask "what is the very first run, before this exists?" + a first-run spike | design → de-risk wave |
| **Contract of an external API** `[RETRO #5a]` | verify **all four dimensions** against the controller/source, not the schema doc: **route · request encoding · response shape · runtime validation** | design → de-risk wave |
| No-oracle surface (CI/release/infra-as-config) | classify oracle presence; schedule a real-run **dry-run**; mark *unproven until executed* | de-risk wave / apply |

**Encode-in.** New `FALSIFY_RITUAL` seam in `shared-prime.ts` (mirrors `PRIME_RITUAL`), injected
into `openspec-design`, `openspec-apply-change`/`continue-change`, `openspec-verify-change`.
**Proportionality:** applies only when the change touches external systems, no-oracle surfaces, or
stateful bootstrap — "scales with integration-surface density, not feature size."
**Source.** `[FALSIFY]` + `[RETRO #5/#5a]`.

> **Nuance that must survive the port** (from genesis): (i) **a spike must precede the design
> choice it validates** — a spike that runs *after* the plan committed the action is too late;
> (ii) **"best practice" gets no confidence bonus** — it must prove it applies to *this* platform;
> (iii) the honest residual: the goal is the *earliest feasible* falsification, not "before any
> execution" (a Phase-0 spike is early execution).

> **Sharpening (2026-06-29, provisioner Phase-3): verify entity STATE, not just SHAPE — and the
> blind-spot that this guards against `[RETRO #5b]`.** "Verify the contract" is too soft: it lets
> you verify the dimensions you *anticipated* and silently skip the rest. For **every external
> entity the code reads or keys on** (a DB row, an API resource, a config record), run an explicit
> **adversarial state checklist against the SoT *before* writing the lookup/guard**:
> **nullable? unique? empty? duplicate? missing? stale?** A field *existing* is not its *contract*;
> a `.find()`-by-name is only safe if name is *verified* unique. Construct the adversarial input
> (null / duplicate / empty) as a **test fixture** — happy-path fakes encode the very assumption you
> must doubt (§5a). *Evidence:* 3 of 4 Phase-3 bugs were exactly this — null-destination fail-open,
> duplicate same-name apps, non-unique Postgres anchor — and every answer was in clone files already
> open; the miss was the *questions*, not access.
>
> **The meta-lesson (why this is its own rule):** *verify-before-implement is only as strong as the
> completeness of the boundary-fact list*, and **the same blind spot that writes the naive code also
> scopes its verification** to the dimensions it anticipated. So **incomplete-but-present
> verification feels like rigor** (retro #12's false-precision) — arguably worse than none. This is
> the structural reason retro #1/#7 make **cross-model review a *required complementary* gate, never
> a substitute**: it does not share the author's blind spot, so it asks the state questions the
> author didn't — in Phase-3 it caught exactly the three the author's own (real but incomplete)
> verification could not. Encode the checklist in design's boundary register **and** in apply's
> per-entity pre-lookup self-check; keep the cross-model gate as the backstop the checklist cannot
> replace.

### B. `openspec-explore` / `openspec-design` — research-gating (the WHAT/HOW grey areas)

**Principle.** A HOW-decision with two or more genuinely viable options is a *gray area* that
earns investigation **before** it is locked — proportional to its maturity/uncertainty.

**Mechanism `[GSD]`.** A discuss/interview step enumerates gray areas (each = a decision with ≥2
viable options, "no padding with filler alternatives"). Each gray area gets research depth from a
**maturity tier** — `full` (3–5 options, immature/novel area) · `standard` (2–4) ·
`minimal_decisive` (2 options, decisive rec) — *instead of a numeric confidence gate*. Research
output is a comparison table (Option · Pros · Cons · **Complexity = impact-surface × risk, never
time** · **conditional** recommendation "Rec if X"), consulting docs/web/project-communities, and
is written as **locked input** the design must honor. This is the *research-step-when-it-deserves-it*
the user asked for ("more or less what gsd-core already does").

**Encode-in.** `openspec-design`'s interview ("stress-test with concrete scenarios" is the host);
optionally seed in `openspec-explore` for WHAT-side unknowns. The deep-planning notion of
**Open Questions → triage at the tasks gate** already exists — this adds the *research backing*
before they're triaged, and the maturity tier as the depth dial. **Proportionality:** skip for
phases with no HOW ambiguity (GSD's `skip_discuss` for "backend/pipeline" steps).
**Source.** `[GSD]` + the user's own "research step when a wave deserves it."

### C. `openspec-design` — the design artifact gates

1. **Boundary-assumptions register** `[FALSIFY]`. A table in `design.md`: *claim · type · how
   verified (cite/spike/grep/enumerate) · status*. **Nothing ships as "assumed."** ⚠ rows route
   to a de-risk wave. (Same shape as lexup `3145f41e`.) For every external entity the design reads or
   keys on, the register row must answer the **entity-state checklist** (§2.A `[RETRO #5b]`):
   nullable? unique? empty? duplicate? missing? stale? — a bare "the field exists" is an incomplete,
   false-rigor row.
2. **Cold-start / first-run section** `[FALSIFY]` `[RETRO #3]`. For stateful/registered things,
   design the first run, not just steady state. **Fold the retro's "new-package / new-integration
   manual touchpoints" here**: integration creation has steps invisible to local build/test
   (registry wiring, dependency declaration, build-graph membership, guard-allowlist scope) —
   enumerate them as first-run facts.
3. **Invariant register + mechanical guards** `[RETRO #4/#11]`. For each load-bearing invariant,
   name it *and* its oracle. An invariant **no behavioral gate can see** (file hygiene, a symmetry
   law) gets a **cheap mechanical guard** (e.g. a NUL/non-printable scan). **Every guard you
   author** is traced to the exact input it must reject, with a **fire-the-guard test** that feeds
   the bad input and asserts it fires (a guard that only "reads right" is unproven — this is the
   scenario-trace rule applied to authored guards).
4. **Parity invariants → one shared function + one round-trip property test** `[RETRO #2]`. When
   two sides must agree (desired vs live, encode vs decode, request vs read-back), build the shared
   function + the round-trip property test the *first* time, before any reviewer flags an instance.
   Lands in design's Testing Approach + the project test-strategy skill.
5. **Detail-by-stability gate** `[RETRO #12]` `[VALIDATES]`. `design.md` is **thick** on what is
   stable and costly to rediscover (invariants, ADRs/decisions, the risk register, the wave
   skeleton + ordering rationale, the test/gate strategy) and **thin** on volatile implementation
   specifics. **No unverified signatures, field-lists, or code bodies in design/specs** — "a
   signature in a spec is a guess presented as a contract." A fact earns a place only if **verified
   and stable** (an ADR, a passing spike). *This independently re-derives OpenSpec's thin-`tasks.md`
   + JIT `wave-plan` architecture — strong external validation; encode it as an explicit gate.*

**Encode-in.** `schemas/skills/openspec-design/references/flow.md` (the "write `design.md`" step) +
a Guardrails pointer in `openspec-design/SKILL.md`. **Source.** as tagged.

### D. `openspec-design` wave skeleton — de-risk + oracle classification

1. **De-risk wave before the waves that depend on it** `[FALSIFY]`. Undischarged ⚠ boundary
   assumptions become a de-risk step that runs **first** (the wave-skeleton analog of writing-plans'
   "Phase 0"). A spike's result reshapes the skeleton, so it precedes it.
2. **Oracle classification per wave** `[FALSIFY]` `[RETRO #8]`. Each wave already names an
   "acceptance command that proves it green." Classify that oracle: a wave whose surface has **no
   executable oracle** (CI/workflow/release/infra/Dockerfiles/compose/dependency-graph behavior) is
   labelled *unproven until executed* and gets a **dry-run** acceptance step — *not* a review
   sign-off. "Done = exercised outside the harness," broadened to those surfaces.

### E. Execution (`apply` / `wave-plan`) — JIT boundary verification + the open tension

1. **Verify boundary facts at wave kickoff, JIT** `[RETRO #5/#12]`. "Boundary facts to verify
   before coding" is a **required per-wave deliverable**, verified against the source-of-truth *at
   the wave's start* (grep the clone, run the dry-run, read the config) — never assumed discharged
   by a months-old spike. Treat an un-verified integration fact as a blocker.

   > **⚠ OPEN DESIGN TENSION (decide in the session).** `schemas/deep-planning/schema.yaml`'s
   > `wavePlan` instruction currently says the JIT planner is **"Plan only, never implement… no
   > probes, no test runs, no library spelunking"** and must capture fragility as a *Gotcha*, not
   > solve it. But Retro #5/#12 want boundary facts *verified* JIT. These collide. Resolution
   > options: **(a)** the **implementer** verifies boundary facts at the start of the wave's first
   > cycle (keeps the planner pure); **(b)** a new lightweight **"wave kickoff"** step verifies
   > read-only boundary facts (grep/dry-run, no code writing) then hands to the planner;
   > **(c)** the planner is allowed *read-only* SoT probes (grep/clone-read/dry-run) but still no
   > code/test writing. Recommend (a) or (c). This is a genuine schema decision — surface it.

2. **"exists ≠ contract; fakes ≠ contract proof"** `[RETRO #5a]`. For any client/adapter against an
   external API, unit tests with fakes are **non-evidence of the contract** (they test your
   assumption against itself). Real proof = read the controller (request parse + response build) or
   a **live probe of each method** (throwaway resources), early — don't defer the whole contract to
   one capstone. **Per-entity state check `[RETRO #5b]`:** before any lookup/guard over an external
   entity, run the §2.A adversarial state checklist (nullable? unique? empty? duplicate? missing?
   stale?) against the SoT, and add the adversarial fixture — never key a `.find()` on a field whose
   uniqueness you have not *verified*.

3. **Documented-deviation honesty** `[VALIDATES]`. Already in the schema (`wavePlan` HARD RULES) —
   reinforce: a mid-run fork the design didn't settle is logged with rationale, never silently
   picked; end-review flags only undocumented ones.

### F. Review (`openspec-verify-change`) — cross-model adversarial gate

1. **Review is not the falsifier** `[FALSIFY]`. `verify-change` confirms artifact-fit/consistency;
   it does **not** falsify a boundary/logic claim — those must have been discharged in design. A
   verify pass that "looks right" is not proof for a no-oracle surface.
2. **Cross-model adversarial review = a required, risk-gated, per-phase gate** `[RETRO #1/#7]`
   `[GSD]`. In-model reviewers share the author's blind spots; they verify "does it match the task"
   but under-detect emergent/cross-module failure modes. For security/infra/data-critical changes,
   a cross-model pass is **required**, run **per high-risk wave** (mid-stream), not only at the end
   (findings compound). **Mechanism from GSD** (directly portable):
   - **skip-self rule** — don't let the same model grade its own homework;
   - **severity-tagged** concerns (HIGH/MEDIUM/LOW); **2+-reviewer consensus** = top priority;
   - a machine-readable **convergence contract**: each round emits `CYCLE_SUMMARY: current_high=N`;
     loop plan→review→replan until `N==0` or `cycle>=MAX`; **stall detection** warns if HIGH stops
     decreasing;
   - metered reviewer (e.g. codex usage limits) → request **one exhaustive pass with explicit depth
     instructions**, not many shallow rounds; and **poll for `{success | known-failure}`**, bailing
     on the failure/throttle signal `[RETRO #6]`.
   This operationalizes the `plan-validation-and-recovery.md` SEED (on `feat`) and the user's own
   ask for "an adversarial plan validation step… with another agent like codex."
3. **advisor-before-design + cross-model-after-impl are complementary** `[RETRO #7]`. The advisor
   catches *design-time* (wrong shape) bugs pre-code; the cross-model pass catches
   *integration/emergent* (wrong interaction) bugs post-code. Name both as distinct checkpoints.
4. **Trace a finding to all enforcement points of the same contract** `[RETRO #10]`. When a finding
   is about a pipeline/contract with multiple enforcement points (build → pin → gate → consume),
   fix **all** of them in one pass — don't let the reviewer walk you down the chain one gate at a
   time. Lands in the receiving-review discipline.

5. **Two complementary review lenses + two venues — layer, don't pick `[RETRO #5b/run-2026-06-29]`.**
   Empirically (provisioner Phase-3) the **local Codex CLI** review and the **GitHub Codex PR bot**
   caught *different* findings. They are complementary **by construction**, not accident:
   - **Local adversarial lens** (superpowers `requesting-code-review` → `scripts/codex-review`):
     prompt framing = "break confidence, default to skepticism," broad attack surface, reviews
     spec/plan/**and** code, willing to flag design/boundary weaknesses. Holistic.
   - **Codex-native lens** — the **exact** prompt the codex binary uses, read from source
     (`openai/codex:codex-rs/prompts/templates/review/rubric.md`, exported as `REVIEW_PROMPT`; the
     diff-scope instruction is a separate per-target string in `prompts/src/review_request.rs`).
     Surgical and **not secret**. The real rubric (more rigorous than the blog's "6 criteria"
     summary): **8 bug-qualification guidelines** — meaningfully impacts accuracy/perf/security/
     maintainability · discrete & actionable · rigor matches the rest of the codebase · **introduced
     in the commit (pre-existing not flagged)** · author would fix if aware · **no unstated
     assumptions** · **"not enough to speculate… must identify the parts provably affected"** · not
     an intentional change — plus **8 comment guidelines** (honest severity, ≤1 paragraph, state the
     scenarios/inputs the bug needs, no flattery), **"prefer outputting no findings"** when nothing
     qualifies, **P0–P3** tags, and a **strict JSON schema** (`findings[]` + `overall_correctness`
     verdict). Reads project `AGENTS.md` "Review guidelines" as overrides.

   Even with the *same* prompt the two venues differ (cloud model version, whole-PR + full-repo
   context + thread-resume + delta-scoping vs local per-task diff on stdin), so **the prompt is
   necessary-not-sufficient — keep both**. Recommended layering:
   - **Per wave (local, cheap):** adversarial `codex-review` on the wave's diff (catch early, before
     misses compound — RETRO #1).
   - **Pre-PR (local, exhaustive):** run **both lenses** (adversarial + a patch-bug lens aligned to
     `review_prompt.md`), ideally across **2 providers in parallel** (read-only fan-out — allowed
     within a change per decision 11; literal models override tiers — set in the archon workflow).
   - **On PR (the bot):** open PR → auto-trigger `@codex review` → wait for inline comments → triage.
     Free recall (different model + whole-repo context) you can't fully replicate locally.
   *Action items:* port `review_prompt.md`'s 6-criteria framing into the local patch-bug lens; add a
   project `AGENTS.md` "Review guidelines" block; decide provider-parallelism + cycle budget in the
   workflow. (A later pass reads recent superpowers commits to harvest more — see §6.)

6. **Accounting for reviewer bias — "an LLM asked to find something will find something" `[run-2026-06-29]`.**
   This is real and structural (demand characteristics + sycophancy toward the task + severity/nit
   inflation), so a review loop must be engineered around it — you **cannot** use "found nothing" as
   the termination signal (it rarely fires, and pressure to keep going inflates severity). The five
   controls, in order:
   - **(a) Make "no finding" the easy path in the prompt.** Both lenses already do — codex-native's
     "prefer no finding over a weak finding / don't pad / introduced-by-this-change / concrete
     failure mode / author-would-fix-if-told," and the superpowers prompt's "if it looks safe, say
     so directly and **return no findings** / material only / one strong over several weak."
     Preserve and strengthen these; an empty review is an **expected, permitted outcome**.
   - **(b) Each finding is a falsifiable *claim*, not a verdict** (§2.F.1: review is not the
     falsifier). It must carry file:line + a **concrete failure scenario / repro**; one that can't
     be made concrete is discarded. This filters the "I must find something" fabrications at the
     source.
   - **(c) Adjudication absorbs the bias (decisive) — verify-don't-perform (§2.I.6d).** A finding is
     triaged, never auto-applied: **confirmed-with-repro / refuted-with-evidence / already-fixed /
     won't-fix (intentional or out-of-scope)**. A fabricated finding dies at triage with a one-line
     refutation. The loop counts only **adjudicated-real P0/P1**, never raw finding count.
   - **(d) Terminate on adjudicated-severity convergence, bounded.** Loop exits when **open
     adjudicated P0/P1 == 0** *or* a hard **cycle cap** (cost/speed) is hit; **stall-detection** (if
     the open-P0/P1 count stops dropping → human-escalate: either a genuinely broken change to
     re-scope, or reviewer noise). After round 1, passes verify **resolution of prior P0/P1** with
     **capped new-discovery** — else findings monotonically grow (provisioner saw Codex 8→7→11/round
     as each pass added depth, not signal).
   - **(e) Union for recall, consensus for precision, and track it.** A finding from **≥2 independent
     reviewers** (codex + another provider) is high-signal; a **singleton** is a candidate that must
     clear triage on its own merits (suspicious if a second reviewer saw the same code and stayed
     silent). **Log each lens's precision** (fraction of its findings surviving triage) over time —
     a chronically-low-precision lens gets down-weighted or its prompt tightened, and this is how you
     decide *empirically* whether a given lens/venue earns its cost.

   *Net rule:* converge on **zero open adjudicated P0/P1**, capped cycles, stall→human; findings are
   claims falsified at triage; "found nothing" is permitted and made easy — **never** the loop's
   termination contract. *Lands in:* `openspec-verify-change` + the emitted archon review fan-out
   (provider-parallelism, cycle cap, the precision ledger).

7. **Cost discipline — the review loop must NOT live on the PR `[run-2026-06-29]`.** A PR-side
   `@codex review` loop forces a **push per fix batch**, and each push re-runs the **full CI matrix**
   — GH Action minutes are **not free** (separate cost from the bot's metered cloud compute; the loop
   burns *both*). Resolution has two independent levers; use both:
   - **(a) Loop LOCALLY, push once.** Two facts make this clean (both verified from source
     2026-06-29):
     - **`openai/codex-action` is a thin `codex exec` wrapper** (`src/runCodexExec.ts`): it adds only
       sandboxing/privilege-drop and runs `codex exec --sandbox <mode> [--model] [--config
       model_reasoning_effort]` with your prompt on stdin. It has **no review prompt, no review mode,
       no SHA-cache, no delta-scoping** (grep confirms). The "review" is entirely the **workflow YAML
       you write** — the README's own example reviews the **full `base...head` diff** via a prompt.
       So a codex-action-style review is **100% reproducible locally**:
       `git diff <base>...HEAD | codex exec --sandbox read-only <review-prompt>` — nothing hidden.
     - **The review intelligence is fully open + local** (verified in `openai/codex` source). The
       native `codex` review is `Op::Review` over a **`ReviewTarget`** — `UncommittedChanges`
       (staged+unstaged+untracked) · `BaseBranch` (full `git diff <merge-base>` = base...HEAD) ·
       `Commit{sha}` · `Custom` — with `REVIEW_PROMPT` (= `rubric.md`) as the system prompt and the
       model running `git diff` itself. It is **full-per-target, never incremental** (no
       delta-since-last-review exists in the CLI). So you reproduce it **exactly** two ways: run
       `codex` native review with a `ReviewTarget`, **or** `git diff <merge-base>...HEAD | codex exec
       --sandbox read-only "<rubric.md + target instruction>"`. Add `rubric.md` as a prompt template
       to `scripts/codex-review`, pin the model family, loop (§2.F.6) over the full diff **locally —
       zero pushes, zero CI**.

     What is **NOT** locally reproducible is the **hosted *Codex cloud* code review** that `@codex
     review` actually triggers (a *separate, closed* product from both codex-action and the CLI — the
     README distinguishes them). Only its **exact model snapshot** and its **cloud incremental/
     SHA-cache orchestration** are server-side; the *prompt and rubric are identical* to what you run
     locally. So the residual gap is small and bounded.
     So don't anchor on "exact"; the achievable goal is **front-load locally so the cloud bot
     collapses to ONE final confirmation pass.** Push once at convergence → open/ready the PR → a
     single `@codex review` (its whole-repo context catches the residual) → at most one more fix+push.
     Pay **1–2 CI runs, not N**.
     - *Comment-scope caveat:* the manual `@codex review` (cloud) scope is officially unspecified, and
       community evidence (`openai/codex` issue #8696, "review-cost snowballing") shows cost scaling
       with **total PR size** → likely a **full re-review** each time. A comment-driven loop snowballs
       bot tokens *and* CI. The local loop sidesteps both; reserve the cloud bot for the single
       confirmation pass.
   - **(b) Gate CI for the unavoidable pushes.** (i) **Draft PR + `ready_for_review`** — workflows
     `on: pull_request: types: [opened, synchronize, reopened, ready_for_review]` + a job guard
     `if: github.event.pull_request.draft == false`; loop on the draft (CI skipped), mark ready → CI
     runs once. (ii) **`concurrency: { group: <ref>, cancel-in-progress: true }`** — a new push
     cancels the superseded run; always-on, free. (iii) **`[skip ci]`** in intermediate fix commits
     (GH Actions skips that push; the Codex **App** still sees the new SHA and re-reviews — it is not
     an Actions workflow); final commit omits it. (iv) **Self-hosted runners → minutes are FREE** and
     this **aligns with decision 6** (all compute on own hardware) — the cleanest dissolution of the
     constraint, fitting the existing Archon-on-own-hardware architecture.
   *Recommendation:* local loop (a) as the default; draft+`ready_for_review` and concurrency-cancel
   as standing CI defaults; self-hosted runners if the constraint should disappear entirely. *Decide
   in the archon workflow:* where the local loop runs (read-only review fan-out + local fix turns)
   and the CI-trigger policy. *Lands in:* the emitted harness + the target repo's CI config + a
   project `AGENTS.md` "Review guidelines" block.

8. **One primitive + two lenses locally; decompose into nodes for Archon — separate PROMPT from
   INVOCATION `[arch-2026-06-29]`.** Two design rules that govern how the review seam is built and
   ported:
   - **Local: one review primitive, two prompt templates (lenses), zero loop-scripts.** The
     adversarial lens and the `rubric.md` lens share identical plumbing (`codex exec` + prompt + diff
     + output schema) — the rubric lens is just another `--lens` template on the existing
     `scripts/codex-review`, **not a second script**. The loop (call → adjudicate → converge →
     iterate) is **control flow, not a script** — it lives in the skill, then the DAG (decision 3:
     control flow belongs in the DAG, not the prompt). Two *lenses* (complementary recall), one
     primitive, no loop-script.
   - **Archon port: don't port the script — decompose it; the codex CLI never appears in a node.**
     The local `codex exec` call was only the testbed invocation. In Archon the codex **provider** is
     managed by the **Agent SDK** (tier/provider routing — decisions 10/16), so the workflow must
     **separate the portable PROMPT from the provider INVOCATION**:
     (i) diff assembly → a **`bash`/`script` node** emitting the diff as `$node.output`;
     (ii) the review → a **`prompt` node** whose body is `rubric.md` / the adversarial template and
     whose `output_format` is the findings schema — **provider/model routed by Archon**, never a
     `codex exec`/`codex review` call inside the node (which also lets the *same* prompt run on a
     second provider for the consensus pass);
     (iii) loop + adjudication + convergence → **DAG topology** (`when:`-gated review→adjudicate→fix
     nodes or a `loop` node; `current_high=N` exit).
     The **portable asset is prompt + schema + loop-topology, OpenSpec-owned** (decision 16) and
     emitted into the workflow — *not* the bash plumbing. One adaptation: `rubric.md` says "run `git
     diff {sha}`" (agentic reviewer); when ported either **pre-supply the diff** from the bash node
     (trim that line — pure, cheap, deterministic) **or** give the node **repo/tool access** (agentic
     review that explores the wider repo — recovers part of the cloud bot's whole-repo-context recall
     for the end-of-change pass). *Lands in:* OpenSpec review-prompt assets + the emitted A′ workflow.

### G. Close-out (`verify-change` / `archive`) — code-complete ≠ proven

**Principle `[RETRO #9]`.** A change whose final proof is **gated** (credentials, prod access,
hard-to-reverse) must not be presented as "done." Close it as **code-complete / capstone-UNPROVEN**
with a **durable runbook artifact** (exact commands + the unproven-until-executed facts) and a
**PR body flagged capstone-pending**. Never let the finishing step imply "proven" when only
"code-complete" is true.

### H. Harness-execution seeds (mined from the v1 testbed + per-issue autonomous runs) `[HARNESS]`

These are **lower-altitude, operational** learnings from real wave-harness runs
(`account-profile-self-service` v1 testbed + the `fix-issue-*` / `account-menu` runs). They are
**seeds, not finished seams** — calibrate each against the live harness before encoding. Several
harden the **emitted harness workflow** (decision 16: OpenSpec canonicalizes + CLI-installs the
workflow) rather than the skill prompts. Each: signal → earlier catch → lands-in → provenance.

1. **Gate integrity & scope `[HARNESS/design]`.** (a) *No vacuous pass:* `pnpm check` reported
   green having linted **0 files** (worktree path-exclude) across all four issue runs — a gate that
   executed against zero targets must **fail**, not pass. (b) *Gate-scope ⊗ cross-wave breaking
   change:* a breaking signature change (`setName {name}→{firstName,lastName}`) whose only caller
   was assigned to a **later** wave still broke **Wave 1**, because the wave gate was a **repo-wide**
   `vitest run` + `turbo check-types`. When the gate is repo-wide, a breaking change must co-locate
   **all** its callers in the same wave **or** mandate an explicit compat-shim cycle — the
   wave-boundary rule must be checked against **gate scope**. (c) *Whole-suite gating leaks scope:*
   a repo-wide gate forced fixing a **pre-existing, out-of-scope** failing e2e to go green — declare
   whether a gate is wave-scoped or repo-wide, and route out-of-scope failures to a waiver, not a fix.
   *Lands in:* `openspec-design` wave skeleton (gate-scope declaration) + the emitted gate runner.
   *Provenance:* v1 D-W1-1, all four issue runs.

2. **Resume/retry idempotency `[HARNESS/apply]`.** Side-effecting steps re-ran across resume/retry:
   duplicate `chore(wave): wave-N gate passed` commits (waves 2–4), an already-implemented fix
   **re-dispatched** as a fresh implementation phase, and a worktree **deleted under a live node**
   (cwd silently reset mid-run). Every side-effecting step (commit, implement, gate-close) needs an
   **"already done?" idempotency guard**, and the harness must detect **worktree liveness** each
   turn (re-provision or hard-fail, never silently lose cwd). *Lands in:* emitted harness (resume/
   worktree lifecycle) + `apply` entry guard. *Provenance:* v1 wave-gate dup, issue-112 re-entry,
   issue-40 worktree loss.

3. **Review-dispatch preconditions & completeness `[VERIFY]`.** (a) Review/scope-classifier nodes
   fired with **no input** — an empty diff ("no code to review") and "PR scope unavailable"; gate
   review on a **non-empty, available diff** precondition. (b) Fan-out synthesis ran on a **missing
   agent output** ("`docs-impact-findings.md` doesn't exist… proceed with 4 of 5") — the coordinator
   must detect empty/missing outputs and decide **rerun vs documented-skip**, never silently
   synthesize a partial. (c) Per-file security review spent **~60% of passes on test-only files** its
   own rubric excludes — **classify the diff** and skip/ batch guaranteed-empty metered passes (the
   harness already does this for other review lenses; extend it to security). *Lands in:*
   `openspec-verify-change` + the emitted review fan-out. *Provenance:* issue-40, v1, feat run.

4. **Deviation-audit & waiver calibration `[VERIFY/HARNESS]`** — extends the documented-deviation
   rule (decision 13). (a) The run-report flagged legitimate **post-wave phases** (full-change
   gate-fix, review self-fix, `/simplify`) as **undocumented deviations** — its *only* failure class
   was a false positive — because only wave executors write `progress.md`. Downstream phases must
   also append a progress/changelog entry, and the audit must **whitelist known post-wave phases**.
   (b) Narrow the deviation trigger to **code-mutating commits** (suppress doc/no-op noise). (c)
   **Waivers keyed by run-id**, and **re-validate (don't blind re-waive)** when the current diff
   touches the waived area; no empty commit to re-assert an existing waiver. *Lands in:*
   `openspec-verify-change` run-report + the emitted harness state contract. *Provenance:* v1
   run-report, account-profile-v2, issue-40.

5. **Emitted-harness hardening checklist `[HARNESS]`** (for the decision-16 generator). (a)
   **Never interpolate raw model output into a shell gate** — `"$node.output"` in a bash command is
   RCE, and worktrees copy `.env`/secrets, so injection lands privileged; pass via argv/stdin/env and
   sanitize before use. (b) **Assert per-node model floors** — when the top-level provider default
   flipped to cursor, the critical `implement` node silently **inherited the weaker model** (lost its
   `opus[1m]` override); heavy nodes must carry explicit provider+model, CI-guarded against
   inheritance. (c) **Force `context: fresh` across a provider boundary** — a node resuming
   cursor→claude-terminal **hangs** otherwise. (d) **Resolve the artifact root once and thread it
   forward** — a stale hardcoded workspace namespace (`…/pfurini/lexup-new/…` vs `…/lexup/lexup-new/…`)
   silently broke cross-phase "plan context not found" handoff; never hardcode the workspace root in
   phase templates. *Provenance:* issue-40 (a,b,c), issue-106/112 (d).

> **Minor refinement (fold into the existing rule, not a new seam):** the schema's
> "ground every named-test path against the repo" rule should resolve paths against the **test
> runner's discovery globs**, not just `ls` — a wave named `playwright/account-profile.spec.ts` while
> the config only discovers `tests/*.spec.ts` would be **silently never run** (v1 D-W0-1).

> **Negative findings (reported for completeness):** mining surfaced **no** novel signals on
> cost/timeout/token-budget, mandatory-reading delivery, or fired orchestration/stall events — those
> markers were all injected skill-text or test-output noise. The harness's retry/escalation/stall
> machinery (baseline I/F) held.

### I. Manual / human-gated run seeds (mined from the superpowers `claude-worktrees` feature runs) `[MANUAL]`

From eight **manual** (human-in-the-loop superpowers) feature runs — legal-acceptance-hardening,
email-authoring, admin-user-management, blog-platform, admin-proxy-gate, stripe-cover-sync,
gated-avatar, admin-nav. A different failure profile from §2.H: these surfaced a **new discipline
class — reconciling against existing reality** — that the falsification baseline (which verifies
*new* behavior) does not cover. **Seeds, calibrate before encoding.** Note: seeds 1–3 matter
**more** for the *autonomous* harness than for the manual runs they came from — there is no human
to challenge the agent mid-run, and one run proved **in-session awareness has no durability** (the
same conformance defects recurred *after* being explicitly discussed → it must be a gate, not prose).

> **Trust-calibration thesis (the load-bearing caveat for the harness).** The reliable agent
> failure on a brownfield repo is *not "can't make it work" — it's "doesn't integrate with what
> already exists"*; code compiles, renders, and passes the agent's own tests while violating
> existing patterns and guards — and this gets **worse as the codebase grows**. Therefore:
> **fire-and-forget of a whole feature on a growing brownfield is where the failure bites hardest**
> (autonomous-harness skepticism is correct); **scoped unit + discovery-up-front + adversarial
> review at the end is genuinely useful.** The durable fix is the **harness and its guards, not the
> agent's good intentions** — "I've learned" is not credible; the same defaults return next session
> unless the harness changes. (Distilled by the user in `~/Desktop/Appunti AI/Claude Code —
> brownfield failure modes & workflow.md`, from the blog-platform session.)

1. **Conformance / brownfield-reuse gate `[DESIGN/APPLY]` (HIGH).** The implementer "optimizes for
   *produces-working-output*, and conformance is invisible to that signal" — so it **reinvents
   existing components/controls/patterns**, ships at the wrong altitude, and even **regresses
   existing wanted behavior**. Before writing any control/logic: (a) **search existing surfaces**
   (shared UI package → app components → sibling features → registries) and **reuse-or-justify**;
   (b) **placement matrix** — generic → shared package, feature-only → app, cross-domain helper →
   neutral `lib/` (never reach into another module's helper); (c) when a spec/ADR implies **removing**
   behavior, **confirm against git history** that it wasn't an intended existing feature (the *spec*
   can be the defect — don't just re-read the ADR); (d) trust the **authoritative** config in a
   monorepo (the package `components.json` with 30 registries, not the root's 1) before building what
   may already exist. Record the **reuse decision** in design/specs, not just the new behavior.
   *Provenance:* blog-platform, legal-acceptance (S3/S6), admin-user-mgmt.
   *Novelty:* entirely outside the baseline, which only ever verifies *new* behavior.

2. **Required-skills manifest — mechanically loaded + subagent-propagated `[APPLY]` (HIGH,
   corroborated in 3 runs).** A skill named in prose (tasks.md `skills:` refs) is **not loaded**: the
   agent wrote a test before pulling the project test-strategy skill, and **spawned subagents do not
   inherit project skills** — the human had to hand-patch "forward the lexup-* skills to the
   subagents" every run. Make it a per-task **required-skills manifest** that `apply` loads
   **mechanically, bound to action triggers** ("about to write a test" → load test-strategy) and
   **injects into every implementer/reviewer subagent prompt**. *Provenance:* admin-user-mgmt,
   email-authoring, admin-proxy-gate. *Novelty:* sharpens the schema's prose-level `skills:` refs —
   the gap is mechanical loading + subagent inheritance, not the reference itself.

3. **Carry-forward lives in the consumer's required-read, captured immediately `[WAVE-PLAN]`.** A
   constraint placed only in a side **handoff** doc the next agent may skim **gets dropped** — it
   must be written into the **next phase's plan file** (the mandatory-read surface). And deviations/
   in-flight decisions/new-facts must be logged **the moment they happen, never deferred** to
   session end; split an oversized plan into **per-phase files** to avoid a read-cutoff dropping the
   tail. *Provenance:* legal-acceptance (S2/S5). *Novelty:* baseline has waivers + progress logging,
   not the *enforcement-location* principle (put the constraint where the consumer is forced to read
   it) or plan-size-as-read-hazard. **Directly applies to this very handoff** — its seeds are inert
   until they land in the skills the implementer is forced to read.

4. **Finish / archive realities `[ARCHIVE]`.** Recurring friction at branch close-out, none in the
   baseline (which covers only worktree liveness/cleanup): (a) **branch base/target/naming preflight**
   — branching a feature off `main` instead of `dev` opened the PR against the wrong base **and lost
   commits that lived only on `dev`**; (b) **base-divergence merge strategy** — when origin advanced
   during the work, decide **rebase-local vs squash-on-PR** (GH "no conflicts" is the decider); (c)
   **post-merge review-residue loop** — late Codex/PR-bot findings after merge → triage into tracked
   bug issues; (d) **cross-PR / file-overlap coordination** — a shared-file fix (`.husky`) applied to
   two live PRs at once; check file-overlap before fixing issues "in parallel." *Provenance:*
   legal-acceptance (S1), admin-proxy (base-divergence), admin-user-mgmt (post-merge), shared-file.

5. **Blast-radius checks + enumeration guards `[VERIFY]`.** (a) A rename's blast radius **spans test
   tiers** — a `data-testid` rename passed unit tests but red-failed Playwright e2e twice; **grep all
   tiers**, not the one you're editing. (b) **Inverse of fire-the-guard:** a new lint/import-ban
   guard must be **vetted against existing *valid* usages** before adding (one would have broken a
   legitimate existing import) — a guard has a false-positive blast radius as well as a must-fire
   input. (c) **Complete-the-sweep → enumeration guard:** when fixing a *class* of issue across
   sites, **enumerate ALL sites first** (grep — don't fix the ones you happen to see; one run added
   a server gate to 4 of 5 admin pages, missed the `[id]` route, caught only by external review),
   then add a **mechanical enumeration guard** (e.g. a `tests/architecture` test that enumerates
   every `app/admin/**/page.tsx` and asserts each calls the required gate) so the future N+1 site
   fails automatically. This is RETRO #10 (fix-all-enforcement-points) **plus a permanent backstop**,
   and it prefers extending existing guard families over new AGENTS.md prose. *Provenance:*
   legal-acceptance (S7/S8), blog-platform (the 4-of-5 sweep miss).

6. **Execution-mode & gate honesty `[APPLY/VERIFY/ARCHIVE]`.** (a) **Continuous "don't pause" mode
   removes the boundary where requirement churn surfaces** — a human changed a settled design *after*
   the subagent was dispatched (too late to steer); keep phase-boundary gates and surface
   style/token-reuse decisions **before** dispatch even in continuous mode (relates to the v1
   no-mid-run-interruption contract — documented-deviation handles *agent* forks, not *human* churn).
   (b) **A gate is satisfied only by a tool-result, not narration** — an agent narrated "getting the
   advisor's review" without actually invoking it; treat an announced gate as unsatisfied until its
   result returns. (c) **Milestone-end learning-harvest gate** (the discipline this brief embodies):
   harvest the handoff → **classify each learning vs existing docs** (already-encoded / encoded-but-
   weak / missing) → name a destination (agent-rule vs which skill) → **human adjudicates**. (d)
   **Receiving review = verify, don't perform:** for each external finding, restate → **verify
   against the codebase** → confirm or push back with technical reasoning → fix one at a time → test
   each. No "you're absolutely right," no blind implementation — some findings are valid and some are
   already fixed, and **both outcomes are only known by checking** (pairs with the provisioner §5a
   push-back-with-evidence). *Provenance:* email-authoring (churn + announce-not-fire),
   legal-acceptance (harvest gate, S4), blog-platform (verify-don't-perform).

> **Validation (not changes):** these runs independently **validated** OpenSpec's spec(WHAT)/
> design(HOW) split (a human had to audit superpowers because its "spec" conflates WHAT with
> implementation tips — OpenSpec's split removes that audit) and the value of **mandatory-read
> artifacts** over advisory handoffs (seed 3).
> **Negative finding:** no novel signals on cost/timeout/token-budget; the inline-vs-subagent choice
> was a contextual user preference (distrust of subagents on 1M-context), not a generalizable seam.

---

## 3. Proportionality, restated (so simple changes stay simple)

All of §2 is conditional on **external systems / no-oracle surfaces (CI/release/infra) / stateful
bootstrap / cross-module contracts**. A pure app-logic change covered by tests skips the falsify
register, the de-risk wave, the cross-model gate, and the contract checks — the test is the
falsifier. OpenSpec's design skill already preaches "adaptive depth"; phrase every gate in that
idiom (GSD's `skip_discuss`, the schema's existing proportionality) so it never inflates simple work.

---

## 4. Acceptance criteria for the OpenSpec change(s)

- The `FALSIFY_RITUAL` routing exists **once** (shared seam) and is referenced by design +
  apply/continue + verify, not copy-pasted; it includes the **API-contract four-dimensions** row
  **and the entity-state checklist** (nullable/unique/empty/duplicate/missing/stale, §2.A `[RETRO #5b]`).
- `openspec-design` requires, for integration-heavy changes: a **Boundary-assumptions register**, a
  **Cold-start/first-run** section (incl. new-integration manual touchpoints), an **invariant
  register with mechanical guards + fire-the-guard tests**, and routes ⚠ assumptions to a
  **de-risk wave before dependents**.
- The wave skeleton **classifies each wave's oracle**; no-oracle surfaces are *unproven until
  executed* (dry-run acceptance), not review-signed-off.
- A **detail-by-stability gate** rejects unverified signatures/field-lists/code in design/specs.
- The **JIT boundary-verification tension (§2.E.1)** is resolved with an explicit schema decision.
- `openspec-verify-change` states it is **not** the falsifier, and defines a **risk-gated
  cross-model adversarial gate** with the GSD mechanism (skip-self, severity, 2+ consensus,
  `current_high=N` convergence + stall detection, exhaustive-metered-pass, poll-for-failure).
- A **research-gating** step backs gray-area HOW-decisions with maturity-tiered investigation.
- A **code-complete-vs-proven** close-out state + runbook deliverable exists for gated-proof changes.
- Everything is **gated on integration-surface density**; simple changes are untouched.
- `pnpm run rebaseline:skills && pnpm test` is green; the parity test is committed with the edits.

---

## 5. Relationship to existing artifacts

- **Absorbed** `falsification-disciplines-handoff.md` — Seam-group 1 (A, C.1–2, D, F.1) was that
  handoff; its OpenSpec-anatomy primer and file recipe are folded into §7, and the standalone is
  deleted (2026-07-03).
- **Operationalizes** `openspec/explorations/plan-validation-and-recovery.md` (a SEED on the `feat`
  branch) — §2.F.2 is the concrete mechanism that note was missing.
- **Validates** the deep-planning schema's thin-`tasks.md` + JIT `wave-plan` design (§2.C.5) and its
  documented-deviation rule (§2.E.3) — these are reinforcements, not changes.
- **Pairs with GH issue #1** (spec-baseline reconciliation): if the seams are built as a tracked
  OpenSpec change, dogfood it through `/openspec-new-change → … → /openspec-archive-change`, and the
  reconciliation and these disciplines land on the same pass.
- See `RECONSTRUCTION.md` for the full fork/methodology context these seams extend.

---

## 6. Candidate future sources (the "reconstruct later" backlog)

This brief is **extensible** — more seams will come from other execution records.

**Mined (2026-06-29):**
- **§2.H** — the **v1 harness testbed** (`archon-task-harness-account-profile`) + per-issue
  autonomous runs (`archon-task-fix-issue-40 / -103 / -105 / -106 / -112`, `account-profile-v2`,
  `feat-user-account-menu`).
- **§2.I** — eight **manual** superpowers `claude-worktrees` runs (legal-acceptance-hardening,
  email-authoring, admin-user-management, blog-platform, admin-proxy-gate, stripe-cover-sync,
  gated-avatar, admin-nav).
All filtered hard against the §2 baseline; only genuinely-novel, high-value signals kept (negative
findings recorded inline).

**Not yet mined (next passes), append to §2 with a `[source]` tag:**

- `…lexup-new--claude-worktrees-feat-image-build-versioning` — the falsification-genesis track
  itself (already distilled into Seam-group 1, but may hold un-captured execution detail).
- Future retros under `…/lexup-new/docs/superpowers/retros/` — distill the same way the provisioner
  retro was (evidence → process change → encode-in), then fold the seams here.

**Also mined (2026-06-29):** the user's own distillation `~/Desktop/Appunti AI/Claude Code —
brownfield failure modes & workflow.md` (the blog-platform session) — corroborated §2.I.1 and
contributed the **enumeration-guard** (§2.I.5c), **verify-don't-perform** (§2.I.6d), and the
**trust-calibration thesis** (§2.I preamble).

**Method for each:** extract the escaped-defect/failure-mode list → ask "what cheap falsifier or
gate, at what phase, would have caught this earliest?" → map to an OpenSpec phase/skill seam →
append to §2 with a `[source]` tag. Keep the proportionality discipline: only seams that pay for
themselves on integration-heavy changes.

---

## 7. Implementation workflow (skill machinery + the parity wall — do not skip)

### OpenSpec skill machinery (know this before editing)

- **Artifact model.** A change advances `proposal → specs → design → tasks` (`DEFAULT_ARTIFACTS` in
  `src/commands/schema.ts`): explore/proposal/specs = the WHAT, `design.md` + the wave skeleton =
  the HOW + plan, tasks/apply = execution, `verify-change` = review.
- **Skills are authored markdown, hashed for drift.** Source of truth is
  `schemas/skills/<name>/SKILL.md` (YAML frontmatter + body) `+ references/*.md` `+ optional
  scripts/` — **not** TS string literals. The factory `src/core/templates/workflows/<name>.ts` is a
  thin `loadSkillSource('<name>', { …seams })` wrapper that reads the body and injects seams
  (`design.ts` / `openspec-design` is the reference pair).
- **Seams:** `${PRIME_RITUAL}` / `${…}` are interpolated at load (defined in
  `src/core/templates/workflows/shared-prime.ts`) — the DRY mechanism for cross-skill content. Emit
  a seam **heading-less** so each host SKILL.md supplies its own heading.
- **Bundle markers:** `<!--bundle:start--> … <!--bundle:end-->` wrap a block that references a
  bundled `references/*.md`; on flatten the block is replaced inline by that file's content. **Path
  rule:** outside a bundle block, never write a raw `references/…` path (it dangles when flattened) —
  refer descriptively ("the Flow, step 2"). Frontmatter `name` MUST equal the directory name.

### The edit workflow (every skill edit)

1. Edit `schemas/skills/<name>/SKILL.md` (and/or `references/*.md`, and/or a seam in
   `shared-prime.ts`).
2. `pnpm run rebaseline:skills` (rebuilds `dist/`, recomputes the three baseline hash maps in
   `test/core/templates/skill-templates-parity.test.ts`).
3. `pnpm test` — confirm green.
4. Commit the **regenerated parity test alongside** the skill change.

Run `pnpm run build` before focused CLI/integration tests if `dist/` may be stale. Decide at session
start: run this as OpenSpec's **own** dogfooded change (`/openspec-new-change`) vs direct skill edits
— the dogfood applies these very disciplines to their own change.

### Files to touch

The full seam set (the falsification spine §2.A + the new seams §2.B–G) touches:

| Seam(s) | File(s) |
|---|---|
| Shared spine `FALSIFY_RITUAL` (+ contract-dimensions row) | `src/core/templates/workflows/shared-prime.ts`; inject in `design.ts`, `apply-change.ts`/`continue-change.ts`, `verify-change.ts` |
| Research-gating (§2.B) | `schemas/skills/openspec-design/SKILL.md` (interview) + `references/flow.md`; optional seed in `openspec-explore/SKILL.md` |
| Design artifact gates — boundary register, cold-start+touchpoints, invariant register + guard-trace, parity, detail-by-stability (§2.C) | `schemas/skills/openspec-design/references/flow.md` (the "write design.md" step) + Guardrails pointer in `openspec-design/SKILL.md`; consider a `references/DESIGN-FORMAT.md` for the new sections |
| De-risk wave + **oracle classification** (§2.D) | `schemas/skills/openspec-design/references/flow.md` (wave skeleton) **and** `schemas/deep-planning/schema.yaml` (`design` + `tasks` instructions) |
| **JIT boundary-verification decision (§2.E.1 — the open tension)** | `schemas/deep-planning/schema.yaml` (`wavePlan` and/or `apply` instruction) — the schema edit that resolves who probes; + `openspec-apply-change/SKILL.md` |
| exists≠contract / fakes≠proof, fix-all-enforcement-points (§2.E.2, §2.F.4) | `schemas/skills/openspec-apply-change/SKILL.md` + `openspec-continue-change/SKILL.md` |
| Review-not-falsifier + **cross-model adversarial gate** (§2.F) | `schemas/skills/openspec-verify-change/SKILL.md` + `src/core/templates/workflows/verify-change.ts` |
| Code-complete-vs-proven close-out + runbook (§2.G) | `schemas/skills/openspec-archive-change/SKILL.md` (+ `verify-change` for the status line) |
| Parity-property-test rule (§2.C.4) | **target repo's** test-strategy skill (e.g. `lexup-testing`), not OpenSpec — note as a project-skill convention |
| *(optional)* WHAT-phase register seed | `schemas/skills/openspec-propose/` + `openspec-new-change/` — only if the WHAT phase should carry a light boundary-register seed; design is the home, keep explore/propose light |
| Parity wall (always) | `test/core/templates/skill-templates-parity.test.ts` — regenerated by `rebaseline:skills`, committed with the edits |

Schema-instruction edits (`schema.yaml`) do **not** trip the skill-parity wall, but they change the
served `instructions`/`wave-plan` output — cover them with the artifact-workflow tests.
