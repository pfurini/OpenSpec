# Backlog — ranked work, by track

The to-do list. Pick a unit, ship it, tick it. Sources marked "(git: <old file> §X)" refer
to deleted files — read them via the recipe in `HISTORY.md`.

**Edit surface reminder:** any `schemas/skills/**` edit breaks the parity wall by design →
`pnpm run rebaseline:skills && pnpm test`, commit the regenerated test with the change.

## Track A — upstream adoption (IN FLIGHT)

Working doc: `ops/upstream-shopping-2026-08.md` (stays in `ops/` until the sweeps finish,
then gets archived into HISTORY). Method: module-end-state analysis; PR rows are a
coverage checklist.

- [x] A1 archive/sync fixes (`adopt-upstream-archive-sync-fixes`, archived 2026-08-24)
- [ ] A2 validate/parser fixes
- [ ] A3 stores/schema-resolution fixes
- [ ] A4 completions/CLI polish + config key guards + dependabot + deps/security pass
- [ ] C1+C2 prose-lesson audit over `schemas/skills/` + `schemas/deep-planning/`
- [ ] #1062 runtime-context feature: proper read, then verdict

## Track B — translation layer (`.agents` + adapters; design DONE)

One change, fully specified by shopping doc §B2: AI_TOOLS prune (keep pi, claude, cursor,
agents) + emit matrix + `legacySkillsDirs`/`detectionPaths`/`requiresIdeRestart` + the
four adapter modules + kill the `flatten` export. Then #1300 (`allowed-tools`) for
claude+pi. Implementation details to settle inside the change: per-adapter transform
lists, `openspec-*` prune namespace, parity-wall extension, artifact-kind seam.

## Track C — finish the eviction (make-this-fork-mine row 5 + residue)

- [ ] Docs rewrite: README as the fork's front page; evict/rewrite `docs/` (the README
      still sells upstream's product). Consider moving NORTH-STAR/HISTORY/BACKLOG out of
      `openspec/explorations/` then — this folder doubles as the explore skill's output
      dir and `openspec list --explorations` lists these files as if they were notes.
- [ ] GH#1 spec-baseline reconciliation (instrumented dogfood once ledger v0 exists)
- [ ] Branch hygiene: verify `feat/explore-what-brainstorming` is fully absorbed, then
      delete it and `backup/feat-pre-merge`
- [ ] `CHANGELOG.md` and remaining upstream release residue

## Track D — process breadth (pillar 1; the refs shopping trip)

First unit: **inventory `.refs/`** (11 repos) against the named gaps — guided+structured
brainstorming; idea validation (market/user); architecture/library/stack validation;
WHAT→HOW improvements — same verdict discipline as the upstream trip, one doc, ratified.
Then synthesis changes, one process step at a time. Carried items that belong here:

- [ ] Inception diagnostic: forcing-questions interactive skill, anti-sycophancy,
      premise gate; opens with the blind-spot inversion (git: START-HERE #11, #18)
- [ ] Reactable-options discipline in explore/design interviews: present taste forks as
      concrete options to react to, not open questions (git: START-HERE #17)
- [ ] Workflow tiers: `light` schema + `logbook` path + triage rule in new-change; regret
      data validates the triage (git: START-HERE #14)
- [ ] Comprehension gate at verify/archive: explainer + quiz-or-waive, logged (git:
      START-HERE #16)
- [ ] Falsification content pass: claim-type→falsifier routing, entity-state checklist,
      oracle-per-wave — as skill/schema text only (git: START-HERE #6; seam catalog
      §2.A/C/D at ops/process-disciplines-handoff.md)
- [ ] Compensator annotations rule: every ported discipline names the model failure mode
      it compensates + retirement condition (git: START-HERE #3)
- [ ] WHAT-collapse fidelity check owed from the design→tasks collapse (git:
      design-tasks-pipeline-collapse §8.2)
- [ ] Research-grounding capability + product-discovery/PRD phase (promoted from parked;
      feed the inception/validation synthesis)

## Track E — ledger + evals (pillar 3's measuring arm; design in `ledger-and-evals.md`)

1. [ ] Ledger v0: schema freeze (receipts/regrets/escalations, join keys) — **gated on
       reading the second-brain materials** (Paolo to share)
2. [ ] Native capture: Pi extension emitting semconv-named events; store-homed with
       local-first journal fallback; `openspec ledger record` CLI for other harnesses
3. [ ] Retro skill (the detective): post-change adjudication, regret writing, blame
       classes; taxonomy bootstrap from existing logs/incidents first
4. [ ] Semantic evals: schema-derived rubrics as advisory judges; calibrate against
       regrets before any blocking power
5. [ ] Token governor at Pi's model-call layer: pre-request budget enforcement fed by
       ledger data — never via a gateway (see ledger-and-evals "Ecosystem research").
       `pi-dynamic-workflows` already ships run/phase/agent budgets; the governor
       generalizes budget enforcement to ALL Pi model calls, not just workflow runs.
6. [ ] Later, receipts permitting: OTLP export + backend bake-off (L2/L3 shortlist:
       Laminar vs Opik — see ledger-and-evals); promptfoo regression walls (L4) once
       skills stabilize
7. [ ] Ledger experiments once live: skill-granularity counterfactual; WHAT-freshness
       retro pass (git: START-HERE #19, #20); retro-vs-Ollie calibration benchmark
       (non-sensitive project only)

## Track F — the factory on Pi (pillar 2; after D has its first wins and E1–E3 exist)

- [ ] Static spine on `pi-dynamic-workflows` — **substrate verified 2026-08-24:
      code-mode scripts, not declarative graphs** (the Claude Code model; deterministic
      vm sandbox, journaled replay). The unbypassable spine = a human-authored SAVED
      workflow script (the entry point; the LLM never writes it); dynamic branches =
      LLM-authored child workflows invoked via `workflow()`/`agent()` only at the call
      sites the spine offers. Ledger step identity: journal replay is POSITIONAL, so
      every spine step carries an explicit `label`/`phase` mapped to its schema-step id
      — never rely on call order. Wave semantics per HISTORY decisions 7/8/9/14/17.
- [ ] Escalation mechanism: categorical triggers, timeout policy, irreversible = block
      forever (NORTH-STAR pillar 2). Substrate exists: `checkpoint()` is a journaled
      human gate (`kind` confirm/input/select, `timeoutMs` + `default` = the
      proceed-after-timeout path; irreversible gates omit `timeoutMs`). Design the
      policy, then map it onto the primitive.
- [ ] **Fork `pi-dynamic-workflows` and make it ours** (leaning ratified 2026-08-24;
      formal decision at Track F start — consistent with the fork-sovereignty
      pattern). **Investigated 2026-08-24 (source-verified):** "subagents" = every
      `agent()` call = a fresh in-process `AgentSession` via Pi's `createAgentSession`
      embedding API. The 3.2 `noExtensions` mitigation exists because a per-subagent
      loader re-ran EVERY extension factory (N subagents = N factory runs) and
      factories arming timers/listeners rooted sessions forever — upstream pi's
      dispose() emitted no `session_shutdown`. **Our Pi fork fixed this in core:
      commit `8775f8223` (2026-08-05, "emit session_shutdown on the SDK dispose path
      via shutdown()") + hardening `5c097d75a` — fork-only, NOT in upstream pi
      (verified against `earendil-works/main`).** That core fix is what makes a forked
      extension safe to re-open: deterministic plan — (1) curated worker toolset via
      the supported `options.tools`/toolset/agentType seam (export tool factories from
      hashline-edit-pro, tokensave, …); (2) when workers need real extensions: Pi
      core's loader ALREADY exposes the seams (`extensionFactories` for curated inline
      extensions, `extensionsOverride`, `skillsOverride`, `additionalSkillPaths`) —
      likely NO core change needed; keep orchestration extensions out to preserve
      anti-recursion. Caveat dispositions (settled 2026-08-24): agentType `skills:`
      field — honor it in the fork via per-agentType loaders + `skillsOverride`
      (O(#agentTypes) loaders, leak-safe thanks to `8775f8223`); agentType `mcp:` —
      keep ignored but warn-on-use (curated toolset covers real needs); `context:
      fork` degradation in workers — KEEP by design (the spine owns fan-out; nested
      delegation would multiply cost — decision 11 + anti-recursion), but route the
      degradation diagnostic into the run journal/receipts so it is observed, never
      silent. Shipped substrate to reuse:
      `verify`/`judgePanel`/`gate`/`completenessCheck` (review + adjudication loops),
      run/phase/agent token budgets + measured per-agent cost (governor slice +
      receipts source), worktree isolation, model tiers.
- [ ] Wave-mode apply skill: teach `openspec-apply-change` the wave-map flow (git:
      START-HERE #15)
- [ ] Receiving-review adjudication + severity-gated convergence, findings feed the
      ledger (git: START-HERE #4; seam catalog §2.F)
- [ ] Multi-lens independent design review, ≥2 model families (git: START-HERE #7)
- [ ] Plan-validation + reconciliation ladder (git: plan-validation-and-recovery)
- [ ] Change-DAG orchestration across parallel changes (git: phase-graph-unified-model)

## Later / parked

Second brain integration (ledger is one converging stream; own initiative). Linear
outbound sync. `openspec lint` → hook/CI wiring and adherence enforcement (git:
prompt-adherence-and-design-rewrite). Small parked items from change-records §5.

## Recommended path

Finish Track A sweeps → Track B change (unblocks skills work on clean tool surface) →
Track D refs inventory (the next big interactive session) in parallel with Track E 1–3
(the measurement spine) → first instrumented dogfood (GH#1) → Track F.
