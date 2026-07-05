# Design: evict-upstream-surfaces

## Context

This is change 1 of the five-change eviction plan in
`openspec/explorations/make-this-fork-mine.md`. The fork is a personal hard fork
(ADR-0001, minted with this change); upstream-facing surfaces are removed, not deprecated —
there is no external user base to stage removals for.

Current state, evidence-cited:

- Telemetry is live: `src/telemetry/`, and `~/.config/openspec/config.json` carries a
  `telemetry.anonymousId`. The `global-config` baseline spec bakes telemetry fields into the
  storage contract (`openspec/specs/global-config/spec.md:8`).
- `openspec feedback` posts to upstream's channel (`src/commands/feedback.ts`); the bundle ships
  a `feedback` skill (`schemas/skills/feedback/`).
- Profile machinery spans `src/core/profiles.ts` (ALL_WORKFLOWS/CORE_WORKFLOWS/getProfileWorkflows),
  `src/core/profile-sync-drift.ts`, `src/core/global-config.ts:10` (`Profile` type), and the
  `openspec config` profile flow (`src/commands/config.ts:26-33`). Its dependents are exactly
  `config.ts`, `init.ts`, `update.ts` (verified via code graph).
- Legacy machinery: `src/core/legacy-cleanup.ts` (dependents: `init.ts:202,241`,
  `update.ts:472,526`) and `src/core/migration.ts` (sole dependent: `init.ts`).
- The bundle (`schemas/skills/`) contains 14 skill dirs, including four upstream-era ones this
  change prunes or evicts: `feedback`, `openspec-onboard`, `openspec-propose`,
  `openspec-ff-change`. `openspec-bulk-archive-change` stays (neutral utility, user-ratified).

Constraints: the proposal's Constraints section (help-diff-by-removal-only, skills' CLI
invocations untouched, stale global-config keys load silently, suite green, parity rebaseline in
the pruning wave).

## Goals / Non-Goals

**Goals:** delete the four surfaces; converge init/update on a single owned skill-set
enumeration; make the global config self-cleaning; retire the three baseline specs; keep every
wave whole-suite green.

**Non-Goals:** fixing the stale Skill Generation enumeration in the `cli-init` baseline spec
(GH#1); the default-schema flip and `spec-driven` eviction (change 2); package rename (change 3);
stores-surface trim (change 4); docs rewrite beyond the minimal sweep (change 5).

## Decisions

1. **`WORKFLOW_SKILLS` constant + enumeration guard** (user-confirmed). New
   `src/core/workflow-skills.ts` exports the installed skill set as an explicit list; a guard
   test asserts the list exactly equals the `schemas/skills/` directory contents. Honors the
   project rule "explicit list lookup, not pattern matching" while killing list↔bundle drift.
   Rejected: runtime bundle scan (pattern-matching, emergent surface).
2. **Prune `onboard`, `propose`, `ff-change`; keep `bulk-archive`** (user-confirmed).
   `propose`/`ff-change` are one-shot generators that bypass the design gate — anti-methodology;
   `onboard` is upstream new-user teaching. Fast-forward for lighter tiers is a *schema*
   property (`flow-to-gate` with no gated artifacts), not a bypass skill — see Parked Seeds.
3. **`migration.ts` dies with `legacy-cleanup.ts`** (evidence-decided): sole dependent is
   `init.ts`, which is being trimmed in the same wave.
4. **Retired-key dropping is staged with machinery death** (atomicity): wave 1 drops only
   `telemetry`; wave 2 extends the drop-list to `profile`/`workflows` in the same wave that
   stops reading them. Dropping them earlier would flip init to the wrong subset mid-change.
5. **Baseline spec retirement is an explicit archive-time step**: the sync machinery deletes
   REMOVED requirements but not emptied spec directories; the archive step deletes
   `openspec/specs/{telemetry,cli-feedback,legacy-cleanup}/` by explicit list, verified by
   `openspec validate --all`.
6. **No deprecation, no migration wizard**: stale config keys are ignored on read and dropped on
   write, silently (per spec). A personal fork does not prompt its one user.
7. **ADR-0001 fork-sovereignty** records the umbrella strategy (adopt ideas, never diffs);
   tagged `change: evict-upstream-surfaces`, promoted on archive.

## Components & Dependencies

| # | Unit | Purpose | Interface | Depends on |
|---|---|---|---|---|
| C1 | `workflow-skills.ts` + guard test | Single source of truth for the installed skill set | exports `WORKFLOW_SKILLS: readonly string[]` | `schemas/skills/` contents (post-prune) |
| C2 | Telemetry eviction | Delete `src/telemetry/` + call sites in CLI entry | — (deletion) | none |
| C3 | Feedback eviction | Delete `src/commands/feedback.ts`, CLI registration, `schemas/skills/feedback/` | — (deletion) | none |
| C4 | Profile eviction | Delete `profiles.ts` + `profile-sync-drift.ts`; trim `config.ts` (profile flow), `init.ts`, `update.ts` to consume C1 | init/update call `WORKFLOW_SKILLS` | C1 |
| C5 | Global-config cleanup | Drop retired keys on write, ignore on read (`global-config.ts`, `config-schema.ts`) | `getGlobalConfig()` / `saveGlobalConfig()` unchanged signatures | staged with C2 (telemetry key) and C4 (profile/workflows keys) |
| C6 | Legacy eviction | Delete `legacy-cleanup.ts` + `migration.ts`; trim init/update legacy paths | — (deletion) | C4 (touches same files; ordered after to avoid double-trim conflicts) |
| C7 | Bundle pruning + rebaseline | Remove 3 skill dirs; regenerate parity test | `pnpm run rebaseline:skills` | C1 (guard must assert post-prune set) |
| C8 | Docs sweep + closure | Remove feedback/telemetry/profile mentions from `docs/cli.md`, `docs/commands.md`; un-mark tracer | — | C2–C7 |

Slice composition: C2/C3 are independent of everything (cleanest first cut). C1+C4+C7 form one
atomic slice (the constant, its consumers, and the bundle it mirrors must land together).
C6 is separable but touches the same files as C4 — ordered after, same reason breaking changes
slice atomically. No sibling-change splits: nothing here is independently valuable outside this
eviction.

Governing skills: no project test-strategy skill exists; testing conventions follow the existing
suite (vitest, `tests/**` mirroring `src/**`).

## Testing Approach

Layer per scenario (REMOVED-requirement scenarios are proven by *absence assertions* in the
wave acceptance + tracer, not by new suites):

| Spec scenario | Layer |
|---|---|
| global-config: Config file format / Existing config preservation | unit (existing suite, trimmed) |
| global-config: Retired keys load silently / dropped on write / unknown-keys preserved | unit |
| cli-init: No workflow subset selection | integration (run init, assert installed set == `WORKFLOW_SKILLS`) |
| cli-init: Global config cannot restrict the skill set | integration (seed config with retired keys, run init) |
| cli-update: Update installs missing workflow skills | integration |
| cli-update: No legacy cleanup interaction | integration (absence: no prompt, no detection output) |
| cli-config: Profile flow REMOVED | integration absence (`openspec config` help/actions contain no profile entry) |
| telemetry/cli-feedback/legacy-cleanup REMOVED (22 reqs) | absence assertions: W1/W3 acceptance + tracer (help-diff, no telemetry writes, no legacy prompts) |
| Enumeration guard (design decision 1) | unit (list == readdir of `schemas/skills/`) |

## Wave Skeleton / Build Sequence

**W0 — tracer (RED)** · size S · risk low · planner=large, impl=medium
- Value: the end-state contract exists as one executable test, committed expected-fail.
- Builds: `tests/eviction-contract.test.ts` (vitest `.fails` markers): help contains no
  `feedback`/profile entries; global config with all three retired keys loads silently and
  writes clean; init installs exactly `WORKFLOW_SKILLS`.
- Proves: nothing yet (tracer). Depends on: —.
- Acceptance: `pnpm test` green (tracer marked expected-fail).

**W1 — telemetry + feedback eviction** · size S · risk low · impl=medium
- Value: the CLI stops phoning home; feedback command gone.
- Builds: C2, C3, C5 (telemetry key only).
- Proves: all `telemetry` (9) + `cli-feedback` (7) REMOVED scenarios; global-config MODIFIED
  storage scenarios.
- Depends on: W0. Acceptance: `pnpm test` green; `openspec --help` lacks `feedback`; no
  telemetry writes in integration run.

**W2 — profiles die, the constant rules, bundle pruned** · size M · risk medium · impl=large
- Value: install-all on an owned enumeration; anti-methodology skills gone from the bundle.
- Builds: C1, C4, C7, C5 (profile/workflows keys — same wave the machinery stops reading them).
- Proves: cli-config REMOVED scenario; cli-init ADDED scenarios (both); cli-update ADDED
  scenarios (both); global-config retired-key scenarios (full list); enumeration guard.
- Depends on: W1 (C5 mechanism exists). Acceptance:
  `pnpm run rebaseline:skills && pnpm test` green; init integration asserts exact set.
- Breaking-change atomicity: profiles deletion + init/update/config trims + their existing
  tests migrate in this single wave.

**W3 — legacy eviction** · size S · risk low · impl=medium
- Value: init/update carry no historical-install machinery.
- Builds: C6.
- Proves: all `legacy-cleanup` (6) REMOVED scenarios (absence).
- Depends on: W2 (same files, ordered). Acceptance: `pnpm test` green; init/update integration
  shows no legacy prompts/output.

**W4 — closure** · size S · risk low · impl=medium
- Value: docs tell no lies about removed commands; the contract test goes live.
- Builds: C8 (docs sweep; remove tracer `.fails` markers).
- Proves: tracer green for the full end-state contract.
- Depends on: W3. Acceptance: `pnpm test` green with tracer live; grep of `docs/cli.md` +
  `docs/commands.md` finds no `feedback`/profile/telemetry command references.

Archive-time step (not a wave): delete the three baseline spec dirs (decision 5), then
`openspec validate --all` green; ADR-0001 promotes to `accepted` on archive.

## Risks / Trade-offs

- **Hidden telemetry call sites** in CLI entry hooks — mitigated by W1 grep + the suite; the
  security constraint (no non-user-initiated network) is asserted at W4.
- **Parity rebaseline churn** (W2) — the regenerated parity test must be committed in the same
  commit as the prune, or CI is red between commits.
- **Init/update trims collide across W2/W3** — accepted; ordered waves on the same files, whole
  suite green at each boundary.

## Migration / Rollback

No user migration (decision 6). Rollback: each wave is independently revertable
(`git revert` of the wave's commits); W2 revert restores profiles + bundle + parity test as one
unit.

## Open Questions

None.

## Parked Design Seeds

- **Light-tier fast-forward is schema-shaped**: `flow-to-gate` with no gated artifacts gives the
  `light` schema one-invocation artifact creation — the capability `ff-change`/`propose` faked at
  the skill layer, now structural. Feed into backlog #14 (`ops/START-HERE.md`). `candidate ADR`
  when the tier lands.
- **Bundle as installed surface**: after C1/C7, "what does this fork install" has one answer.
  Future skill additions must touch `WORKFLOW_SKILLS` + bundle + rebaseline together — the guard
  makes forgetting impossible.
