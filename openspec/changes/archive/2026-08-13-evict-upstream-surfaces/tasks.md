# Wave map: evict-upstream-surfaces

Transcribed from design.md's Wave Skeleton. Coverage map joins design's Testing Approach
(Scenario → Layer) with the skeleton (Scenario → Wave); named tests are grounded on the repo's
`test/{core,commands,cli-e2e}` conventions.

| Scenario | Layer | Named test | Wave |
|---|---|---|---|
| global-config: Config file format | unit | `test/core/global-config.test.ts` (existing, trimmed) | 1 |
| global-config: Existing config preservation | unit | `test/core/global-config.test.ts` | 1 |
| global-config: Retired keys load silently | unit | `test/core/global-config.test.ts` | 2 |
| global-config: Retired keys dropped on write | unit | `test/core/global-config.test.ts` | 2 |
| global-config: Unknown-but-not-retired keys preserved | unit | `test/core/global-config.test.ts` | 2 |
| cli-init: No workflow subset selection | integration | `test/core/init.test.ts` | 2 |
| cli-init: Global config cannot restrict the skill set | integration | `test/core/init.test.ts` | 2 |
| cli-update: Update installs missing workflow skills | integration | `test/core/update.test.ts` | 2 |
| cli-update: No legacy cleanup interaction | integration | `test/core/update.test.ts` | 3 |
| cli-config: Profile Configuration Flow (REMOVED — absence) | integration | `test/commands/config.test.ts` | 2 |
| Enumeration guard (design decision 1) | unit | `test/core/workflow-skills.test.ts` (new) | 2 |
| telemetry REMOVED ×9 (absence) | absence assertions | `test/cli-e2e/eviction-contract.test.ts` (tracer) + W1 acceptance | 1 |
| cli-feedback REMOVED ×7 (absence) | absence assertions | `test/cli-e2e/eviction-contract.test.ts` + W1 acceptance | 1 |
| legacy-cleanup REMOVED ×6 (absence) | absence assertions | `test/cli-e2e/eviction-contract.test.ts` + W3 acceptance | 3 |

## Wave 0

- [x] The end-state eviction contract exists as one executable test, committed expected-fail (tracer)
- components: `test/cli-e2e/eviction-contract.test.ts` (vitest `.fails` markers): help contains no `feedback`/profile entries; global config with all three retired keys loads silently and writes clean; init installs exactly `WORKFLOW_SKILLS`
- interfaces: — (test-only wave; asserts future public surface)
- depends-on: —
- acceptance: `pnpm test` (green — tracer marked expected-fail)
- stamps: `size:S` `risk:low` `plannerTier:large` `implTier:medium`
- skills: —

## Wave 1

- [x] The CLI stops phoning home and the feedback command is gone
- components: C2 telemetry eviction (delete `src/telemetry/` + CLI entry call sites); C3 feedback eviction (delete `src/commands/feedback.ts`, CLI registration, `schemas/skills/feedback/`); C5 global-config cleanup (telemetry key only)
- interfaces: C2 — (deletion); C3 — (deletion); C5 `getGlobalConfig()` / `saveGlobalConfig()` unchanged signatures
- depends-on: Wave 0
- acceptance: `pnpm test` green; `openspec --help` lacks `feedback`; no telemetry writes in integration run
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: —

## Wave 2

- [x] Install-all runs on an owned enumeration; profiles and anti-methodology skills are gone
- components: C1 `workflow-skills.ts` + enumeration-guard test; C4 profile eviction (delete `profiles.ts` + `profile-sync-drift.ts`; trim `config.ts`, `init.ts`, `update.ts` to consume C1); C7 bundle pruning (`openspec-onboard/`, `openspec-propose/`, `openspec-ff-change/`) + parity rebaseline; C5 retired-key drop extended to `profile`/`workflows`
- interfaces: C1 exports `WORKFLOW_SKILLS: readonly string[]`; C4 init/update call `WORKFLOW_SKILLS`; C7 `pnpm run rebaseline:skills`; C5 `getGlobalConfig()` / `saveGlobalConfig()` unchanged signatures
- depends-on: Wave 1
- acceptance: `pnpm run rebaseline:skills && pnpm test` green; init integration asserts installed set == `WORKFLOW_SKILLS`
- stamps: `size:M` `risk:med` `implTier:large`
- skills: —

## Wave 3

- [x] init/update carry no historical-install machinery
- components: C6 legacy eviction (delete `legacy-cleanup.ts` + `migration.ts`; trim init/update legacy paths)
- interfaces: C6 — (deletion)
- depends-on: Wave 2
- acceptance: `pnpm test` green; init/update integration shows no legacy prompts/output
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: —

## Wave 4

- [x] Docs tell no lies about removed commands and the contract test is live
- components: C8 docs sweep (`docs/cli.md`, `docs/commands.md`); remove tracer `.fails` markers
- interfaces: C8 — (docs + test-marker edits only)
- depends-on: Wave 3
- acceptance: `pnpm test` green with tracer live; grep of `docs/cli.md` + `docs/commands.md` finds no `feedback`/profile/telemetry command references
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: —

Archive-time step (not a wave; from design decision 5): delete
`openspec/specs/{telemetry,cli-feedback,legacy-cleanup}/` by explicit list, then
`openspec validate --all` green; ADR-0001 promotes to `accepted` on archive.
