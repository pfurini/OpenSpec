# Wave 3 plan — legacy eviction (C6)

Wave map source: `tasks.md` (## Wave 3). Value: init/update carry no historical-install
machinery. Acceptance: `pnpm test` green; init/update integration shows no legacy
prompts/output. Note: `migration.ts` already died in wave 2 (documented deviation there);
this wave is legacy-cleanup only.

## Mandatory Reading

| Pri | File | Lines | Why |
|---|---|---|---|
| P0 | `src/core/init.ts` | 24–30, 118–121, 171–225 | Legacy imports, `handleLegacyCleanup` call + both private methods to DELETE |
| P0 | `src/core/update.ts` | 28–35, 90–91, 190–204, ~330–470 | Legacy imports, `handleLegacyCleanup`/`performLegacyCleanup`/`upgradeLegacyTools`, `newlyConfiguredTools` plumbing to DELETE |
| P0 | `openspec/changes/evict-upstream-surfaces/specs/legacy-cleanup/spec.md` | all | The six REMOVED requirements proven by absence |
| P0 | `openspec/changes/evict-upstream-surfaces/specs/cli-update/spec.md` | "No legacy cleanup interaction" | The one ADDED scenario this wave proves |
| P1 | `test/core/update.test.ts` | describes `legacy cleanup` (762+), `legacy tool upgrade` | Suites to DELETE; two wave-2 tests inside `legacy tool upgrade` reuse the legacy-upgrade entry path and must be re-based on a configured tool instead |
| P1 | `test/core/init.test.ts` | 423–441 | Legacy auto-cleanup test to REPLACE with an absence test |

## Patterns to Mirror

Absence assertion over console output — SOURCE: `test/core/update.test.ts` "should not
show new tool message..." (calls-scan pattern):

```ts
const calls = consoleSpy.mock.calls.map(call => call.map(arg => String(arg)).join(' '));
expect(calls.some(call => call.toLowerCase().includes('legacy'))).toBe(false);
```

## Files to Change

- DELETE `src/core/legacy-cleanup.ts`, `test/core/legacy-cleanup.test.ts`
- UPDATE `src/core/init.ts` — drop legacy imports, the `handleLegacyCleanup` call and
  both private methods; `--force` stays registered (proposal constraint: kept commands
  keep their flags) but its description is reworded to its now-null effect
- UPDATE `src/core/update.ts` — drop legacy imports and the legacy branch of `execute`
  (`newlyConfiguredTools` collapses to nothing; the "Getting started" block for legacy
  upgrades goes with it); `upgradeLegacyTools`/`performLegacyCleanup`/`handleLegacyCleanup`
  deleted
- UPDATE `src/cli/index.ts` + `src/core/completions/command-registry.ts` — reword init
  `--force` description (kept flag, truthful text)
- UPDATE `test/core/init.test.ts`, `test/core/update.test.ts` — replace legacy suites
  with absence tests; re-base the two wave-2 tests that entered through the legacy path

## Cycles

- [x] **Cycle 1 — C6: legacy machinery dies, absence proven**
  - **Behavior**: legacy-cleanup REMOVED ×6 (absence); cli-update "No legacy cleanup
    interaction" (integration: legacy artifacts present → no detection output, no prompt,
    files untouched)
  - **Test layer**: integration (`test/core/init.test.ts`, `test/core/update.test.ts`)
  - **RED**: add absence tests — seed a legacy artifact (`CLAUDE.md` with OpenSpec
    markers, legacy command dirs), run init/update, assert the artifact is untouched and
    no output line mentions legacy cleanup. These fail while the machinery lives.
  - **GREEN**: delete `legacy-cleanup.ts` + its test file; trim init/update; migrate the
    two legacy-path wave-2 tests to configured-tool setups; delete the legacy describes.
  - **Gotcha**: update's `--force` keeps its force-refresh meaning — only init's `--force`
    goes inert (kept for surface compatibility, description reworded). `confirmMock` in
    init.test.ts must no longer be invoked at all — assert that where cheap.
  - **Validate**: `pnpm exec vitest run test/core/init.test.ts test/core/update.test.ts`,
    then `pnpm test`
  - **Commits**: `test:` then `refactor:`

## Documented deviations

- **init `--force` becomes inert but stays registered**: the proposal's compatibility
  constraint pins kept commands' flags; the flag's only behavior (legacy auto-cleanup)
  is evicted, so the description is reworded to say it has no effect. Removing the flag
  outright would violate the constraint; keeping the old description would make help lie.
- `migration.ts` deletion happened in wave 2 (see wave-2 plan) — nothing to do here.
