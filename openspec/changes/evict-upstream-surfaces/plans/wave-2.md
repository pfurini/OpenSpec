# Wave 2 plan — profiles die, the constant rules, bundle pruned (C1, C4, C7, C5-full)

Wave map source: `tasks.md` (## Wave 2). Value: install-all runs on an owned enumeration;
profiles and anti-methodology skills are gone. Acceptance:
`pnpm run rebaseline:skills && pnpm test` green; init integration asserts installed set ==
`WORKFLOW_SKILLS`. This is the breaking-change atomic slice: constant + consumers + bundle
prune + their test migrations land in this single wave; the whole suite is only guaranteed
green at the wave boundary, each cycle's scoped Validate is green at its own commit.

## Mandatory Reading

| Pri | File | Lines | Why |
|---|---|---|---|
| P0 | `src/core/shared/skill-generation.ts` | 44–65 | `getSkillTemplates` entries to PRUNE (ff/onboard/propose) and filter param to REMOVE |
| P0 | `src/core/init.ts` | 38–41, 61–83, 126–129, 138–140, 187–197, 501–559, 588–668 | Profile plumbing to DELETE; `generateSkills`/`displaySuccessMessage` to retarget at the full template set |
| P0 | `src/core/update.ts` | whole file | Profile/migration/drift plumbing to DELETE; keep version gating + missing-skill convergence (spec: "Update installs missing workflow skills") |
| P0 | `src/commands/config.ts` | 22–24, 27–200, 243–258, 443–589 | Profile flow + helpers + list annotation to DELETE |
| P0 | `openspec/changes/evict-upstream-surfaces/specs/cli-init/spec.md`, `specs/cli-update/spec.md`, `specs/cli-config/spec.md`, `specs/global-config/spec.md` | all | The contract this wave proves |
| P1 | `src/core/profile-sync-drift.ts` | 43–104 | The missing-skill half of the drift check survives conceptually — reimplement against `WORKFLOW_SKILLS` dir names (missing only; never flag extra/unknown dirs) |
| P1 | `test/core/init.test.ts` | 80–115, 321–330, 385–540 | Tests to MIGRATE (full-set expectations) or DELETE (profile-override tests) |
| P1 | `test/core/update.test.ts` | 1–40, 142–190, 1245–1360 | Same; the global-config mock keeps `profile` keys — harmless, they're now ignored |
| P1 | `src/core/global-config.ts`, `src/core/config-schema.ts` | all | C5 extension: retire `profile`/`workflows`; schema + KNOWN_TOP_LEVEL_KEYS + DEFAULT_CONFIG trims |
| P1 | `scripts/rebaseline-skill-hashes.mjs` | 58–92 | Mirror lists: prune ff/onboard/propose rows in lockstep with the parity test |
| P2 | `test/commands/config.test.ts`, `test/commands/config-profile.test.ts`, `test/core/config-schema.test.ts` | all | config-profile.test.ts dies whole; the others migrate off profile keys |

## Patterns to Mirror

Enumeration guard shape (new `test/core/workflow-skills.test.ts`) — the tasks.md coverage
map names this file; assert three-way parity:

```ts
const bundleDirs = (await fs.readdir(path.join(projectRoot, 'schemas', 'skills'))).sort();
expect([...WORKFLOW_SKILLS].sort()).toEqual(bundleDirs);
expect(getSkillTemplates().map((e) => e.dirName).sort()).toEqual(bundleDirs);
```

Install-all call — SOURCE: `src/core/init.ts:514-517` becomes:

```ts
const skillTemplates = getSkillTemplates();
```

## Files to Change

- CREATE `src/core/workflow-skills.ts` — C1: `export const WORKFLOW_SKILLS: readonly string[]`
  (the 10 post-prune `schemas/skills/` dir names, explicit list)
- CREATE `test/core/workflow-skills.test.ts` — enumeration guard (constant ↔ bundle ↔ templates)
- DELETE `schemas/skills/openspec-onboard/`, `openspec-propose/`, `openspec-ff-change/` — C7
- DELETE `src/core/templates/workflows/onboard.ts`, `propose.ts`, `ff-change.ts` — C7 factories
- DELETE `src/core/profiles.ts`, `src/core/profile-sync-drift.ts` — C4
- DELETE `src/core/migration.ts` — deviation, see below
- DELETE `test/core/profiles.test.ts`, `test/core/profile-sync-drift.test.ts`,
  `test/core/migration.test.ts`, `test/commands/config-profile.test.ts`
- UPDATE `src/core/templates/skill-templates.ts` — drop 3 re-exports
- UPDATE `src/core/shared/skill-generation.ts` — drop 3 entries; remove `workflowFilter` param
- UPDATE `src/core/init.ts`, `src/core/update.ts`, `src/commands/config.ts`,
  `src/cli/index.ts`, `src/core/completions/command-registry.ts` — C4 trims
- UPDATE `src/core/global-config.ts`, `src/core/config-schema.ts` — C5 full retired list;
  `Profile` type and `profile`/`workflows` fields die
- UPDATE `test/core/init.test.ts`, `test/core/update.test.ts`, `test/commands/config.test.ts`,
  `test/core/config-schema.test.ts`, `test/core/global-config.test.ts`,
  `test/core/shared/skill-generation.test.ts` — migrate to full-set/no-profile expectations
- UPDATE `test/core/templates/skill-templates-parity.test.ts` + `scripts/rebaseline-skill-hashes.mjs` — prune rows
- UPDATE `test/cli-e2e/eviction-contract.test.ts` — flip tracer tests 2–5 live (see deviations)

## Cycles

- [x] **Cycle 1 — C1+C7: the constant, the guard, the prune**
  - **Behavior**: enumeration guard (design decision 1); bundle prune (decision 2)
  - **Test layer**: unit (`test/core/workflow-skills.test.ts`, per coverage map)
  - **RED**: guard test asserting the three-way parity above — fails (module absent,
    bundle still has 13 dirs)
  - **GREEN**: `workflow-skills.ts` with the 10 names; delete the 3 skill dirs + 3 factory
    files; trim `skill-templates.ts`, `getSkillTemplates` (entries + drop the
    `workflowFilter` param and its filtering tests); prune parity test + rebaseline mirror;
    run `pnpm run rebaseline:skills` (per-factory hashes: expect "already up to date");
    migrate `test/core/shared/skill-generation.test.ts` off filter cases and
    propose/onboard/ff expectations.
  - **Gotcha**: init/update still compile (they pass a workflows array to a now-parameterless
    function only after their own trim in cycle 2 — so in THIS cycle keep the param as
    accepted-but-ignored is NOT allowed; instead trim the `getSkillTemplates` call sites in
    init/update to no-arg IN THIS CYCLE to keep the tree compiling, leaving the rest of
    their profile plumbing for cycle 2). Full-suite init/update tests go temporarily red
    here (propose/onboard skills no longer installable) — restored by cycle 2's migrations.
  - **Validate**: `pnpm exec vitest run test/core/workflow-skills.test.ts test/core/shared/skill-generation.test.ts test/core/templates/skill-templates-parity.test.ts`
  - **Commits**: `test:` then `feat:`

- [x] **Cycle 2 — C4: profiles die; init/update/config converge on install-all**
  - **Behavior**: cli-init "No workflow subset selection" + "Global config cannot restrict
    the skill set"; cli-update "Update installs missing workflow skills"; cli-config
    "Profile Configuration Flow" REMOVED (absence)
  - **Test layer**: integration (`test/core/init.test.ts`, `test/core/update.test.ts`,
    `test/commands/config.test.ts`) + tracer flips (tests 2 and 5)
  - **RED**: flip tracer `config and init help have no profile surface` and
    `init installs exactly the full workflow skill set...` live; rewrite the init/update/
    config suites' profile expectations to full-set expectations (they fail against live
    code); add update integration: delete one skill dir from a converged project, run
    update, expect it reinstalled with no subset prompt.
  - **GREEN**: delete `profiles.ts`, `profile-sync-drift.ts`, `migration.ts` + their tests +
    `config-profile.test.ts`; trim init.ts (profile option/override, migrateIfNeeded call,
    profile reads in generateSkills/displaySuccessMessage — getting-started always shows
    `/openspec-new-change`), update.ts (migration call, profile/desiredWorkflows,
    removeUnselectedSkillDirs, extra-workflows + old-core notes; replace
    getToolsNeedingProfileSync/hasCanonicalProfileDrift with a missing-skill check over
    `WORKFLOW_SKILLS` dir names — missing only, never extra), config.ts (profile subcommand
    + helpers + list annotation), cli/index.ts (`--profile`), completions registry (init
    `--profile` flag, config `profile` subcommand).
  - **Gotcha**: update's smart detection must still trigger on a missing skill when versions
    match — that is the spec scenario, not profile drift; keep the check, retarget it.
    `.agents/skills` may hold user-authored skills: never treat unknown dirs as drift.
  - **Validate**: `pnpm exec vitest run test/core/init.test.ts test/core/update.test.ts test/commands/config.test.ts test/cli-e2e/eviction-contract.test.ts`
  - **Commits**: `test:` then `refactor:`

- [x] **Cycle 3 — C5 full: `profile`/`workflows` join the retired list**
  - **Behavior**: global-config "Retired key cleanup" — full explicit list; "Config file
    format" + "Existing config preservation" (trimmed suite)
  - **Test layer**: unit (`test/core/global-config.test.ts`) + tracer flips (tests 3 and 4)
  - **RED**: extend the retired-keys describe block to all three keys; migrate the legacy
    profile-expectation tests (defaults no longer inject `profile: 'core'`; round-trip
    drops `profile`/`workflows`); flip tracer config tests live.
  - **GREEN**: `RETIRED_KEYS = ['telemetry', 'profile', 'workflows']`; remove `Profile`
    type + `profile`/`workflows` from `GlobalConfig` and `DEFAULT_CONFIG` and the
    schema-evolution re-injection; config-schema.ts: drop the two fields from the zod
    schema, `DEFAULT_CONFIG`, and `KNOWN_TOP_LEVEL_KEYS`; migrate
    `test/core/config-schema.test.ts` expectations.
  - **Gotcha**: `openspec config reset` writes `DEFAULT_CONFIG` — after this cycle that is
    `{ featureFlags: {} }`; config.test.ts may assert the old shape. `config set profile x`
    must now fail as unknown key (KNOWN_TOP_LEVEL_KEYS no longer lists it) — that is the
    desired absence behavior.
  - **Validate**: `pnpm exec vitest run test/core/global-config.test.ts test/core/config-schema.test.ts test/commands/config.test.ts test/cli-e2e/eviction-contract.test.ts`
  - **Commits**: `test:` then `feat:`

Wave acceptance: `pnpm run rebaseline:skills && pnpm test` green; the tracer is now fully
live (all five contract tests unmarked).

## Documented deviations

- **`migration.ts` dies here (wave 2), not wave 3**: design decision 3 assigned it to C6,
  but its only purpose is migrating users INTO the profile system (it writes the
  `profile`/`workflows` keys this very wave retires, and it imports `profiles.ts` +
  `profile-sync-drift.ts`, both deleted here). Keeping it compiling one more wave would
  mean stubbing dead machinery. Wave 3 shrinks to legacy-cleanup only.
- **Tracer flips 2–5 happen here**: same mechanism as wave 1's flip — the wave that makes
  a tracer test's assertions pass must unmark it or the suite goes red. Wave 4 verifies
  the tracer is fully live rather than performing the unmarking.
- **`getSkillTemplates` loses its `workflowFilter` parameter**: with profiles gone no
  caller filters; keeping the param would preserve a subset mechanism the spec explicitly
  removes ("no profile- or configuration-driven subsetting").
