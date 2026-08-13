# Wave 1 plan — telemetry + feedback eviction (C2, C3, C5-telemetry-only)

Wave map source: `tasks.md` (## Wave 1). Value: the CLI stops phoning home and the
feedback command is gone. Acceptance: `pnpm test` green; `openspec --help` lacks
`feedback`; no telemetry writes in integration run.

## Mandatory Reading

| Pri | File | Lines | Why |
|---|---|---|---|
| P0 | `src/cli/index.ts` | 19, 45, 119–140, 452–465 | Telemetry hook lines and feedback registration to DELETE; the `preAction` hook must survive (it applies `--no-color`) |
| P0 | `src/core/global-config.ts` | 115–166 | `getGlobalConfig`/`saveGlobalConfig` to extend with retired-key stripping (`telemetry` only this wave) |
| P0 | `test/core/global-config.test.ts` | 17–43, 137–168 | Unit-test conventions to EXTEND (XDG temp dir, beforeEach/afterEach env save-restore) |
| P0 | `test/cli-e2e/eviction-contract.test.ts` | all | Tracer: flip test 1 (`root help has no feedback entry`) live this wave; add the no-telemetry-writes absence test here |
| P1 | `src/telemetry/index.ts` | 46–63, 115–137 | Why the RED absence test fails pre-deletion: `trackCommand` → `getOrCreateAnonymousId` persists `telemetry.anonymousId` unless CI/DNT/opt-out env is set |
| P1 | `src/core/completions/command-registry.ts` | 446–458 | Feedback completion entry to DELETE |
| P1 | `test/core/templates/skill-templates-parity.test.ts` | 13, 37, 97, 108 | Feedback factory references to DELETE (hash entries are per-factory; removing one does not invalidate the others — no rebaseline needed) |
| P1 | `scripts/rebaseline-skill-hashes.mjs` | 58–92 | Mirror list: delete `getFeedbackSkillTemplate` from `FUNCTION_FACTORY_NAMES` (feedback never appears in `SKILL_FACTORY_ENTRIES`) |
| P2 | `openspec/changes/evict-upstream-surfaces/specs/telemetry/spec.md`, `specs/cli-feedback/spec.md` | all | The REMOVED requirements this wave proves by absence |

## Patterns to Mirror

Unit-test XDG isolation — SOURCE: `test/core/global-config.test.ts:155-168`

```ts
process.env.XDG_CONFIG_HOME = tempDir;
const configDir = path.join(tempDir, 'openspec');
const configPath = path.join(configDir, 'config.json');
fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(configPath, JSON.stringify({ featureFlags: { testFlag: true } }));
const config = getGlobalConfig();
```

e2e env injection — SOURCE: `test/cli-e2e/eviction-contract.test.ts` (`seedConfigHome` +
`runCLI(..., { env: { XDG_CONFIG_HOME: configHome } })`).

## Files to Change

- DELETE `src/telemetry/` (index.ts, config.ts) — C2, the whole subsystem
- DELETE `test/telemetry/` (index.test.ts, config.test.ts) — tests belong exclusively to the evicted surface
- DELETE `src/commands/feedback.ts` — C3
- DELETE `test/commands/feedback.test.ts` — C3 tests
- DELETE `src/core/templates/workflows/feedback.ts` — C3 skill template factory
- DELETE `schemas/skills/feedback/` — C3 bundled skill source
- UPDATE `src/cli/index.ts` — remove telemetry import + hook bodies (keep `--no-color` preAction), remove postAction hook, remove FeedbackCommand import + `feedback` command registration
- UPDATE `src/core/templates/skill-templates.ts` — remove `getFeedbackSkillTemplate` re-export
- UPDATE `src/core/completions/command-registry.ts` — remove the `feedback` entry
- UPDATE `test/core/templates/skill-templates-parity.test.ts` — remove feedback import, hash entry, factory-map entry
- UPDATE `scripts/rebaseline-skill-hashes.mjs` — remove `getFeedbackSkillTemplate` from `FUNCTION_FACTORY_NAMES`
- UPDATE `package.json` — `pnpm remove posthog-node` (proposal security constraint: no HTTP client outside user-initiated paths)
- UPDATE `src/core/global-config.ts` — strip retired key `telemetry` on read and write (explicit list, seeded for wave-2 extension)
- UPDATE `test/core/global-config.test.ts` — new retired-key tests (telemetry only)
- UPDATE `test/cli-e2e/eviction-contract.test.ts` — flip help/feedback tracer test live; add no-telemetry-writes absence test

## Cycles

- [x] **Cycle 1 — C2: the CLI writes no telemetry state**
  - **Behavior**: telemetry REMOVED ×9 (absence). Observable: running any command with
    telemetry-enabling env (no CI/DO_NOT_TRACK/OPENSPEC_TELEMETRY opt-outs) leaves no
    `telemetry` object in the isolated global config, and stdout carries no first-run
    notice.
  - **Test layer**: cli-e2e absence assertion (coverage map row: telemetry REMOVED →
    `eviction-contract.test.ts` + W1 acceptance)
  - **RED**: add live (non-`.fails`) test to `eviction-contract.test.ts`: seed an
    XDG home WITHOUT a telemetry key, run `openspec config path` with
    `env: { XDG_CONFIG_HOME, CI: '', DO_NOT_TRACK: '', OPENSPEC_TELEMETRY: '' }`,
    assert the config file (if rewritten) has no `telemetry` key and stdout lacks
    `anonymous usage stats`. Fails today: `trackCommand` persists `anonymousId`.
  - **GREEN**: delete `src/telemetry/` + `test/telemetry/`; trim `src/cli/index.ts`
    (import line 45, notice+track lines in preAction, whole postAction hook);
    `pnpm remove posthog-node`.
  - **Gotcha**: keep the preAction hook — `--no-color` handling lives there. The
    legacy-path merge in the deleted `src/telemetry/config.ts` was the only reader of
    `~/.config/openspec` outside XDG; its death is silent.
  - **Validate**: `pnpm exec vitest run test/cli-e2e/eviction-contract.test.ts`
  - **Commits**: `test:` (RED absence test) then `refactor:` (deletion)

- [x] **Cycle 2 — C3: feedback command gone**
  - **Behavior**: cli-feedback REMOVED ×7 (absence). Observable: `openspec --help` has
    no `feedback` entry; the completions registry offers none.
  - **Test layer**: cli-e2e absence (tracer test 1 goes live)
  - **RED**: flip `it.fails('root help has no feedback entry')` →
    `it('root help has no feedback entry')` in the tracer. Fails today.
  - **GREEN**: delete `src/commands/feedback.ts`, `test/commands/feedback.test.ts`,
    `schemas/skills/feedback/`, `src/core/templates/workflows/feedback.ts`; trim
    `src/cli/index.ts` registration + import, `skill-templates.ts` export,
    `command-registry.ts` entry, parity test + rebaseline script feedback rows.
  - **Gotcha**: parity hashes are per-factory — removing the feedback rows does NOT
    require `pnpm run rebaseline:skills` (that ritual belongs to wave 2's prune).
    `schemas/skills/openspec-onboard/SKILL.md` mentions feedback; leave it — that dir
    dies in wave 2 and skills' content is out of this wave's scope.
  - **Validate**: `pnpm exec vitest run test/cli-e2e/eviction-contract.test.ts test/core/templates/skill-templates-parity.test.ts test/commands/completion.test.ts`
  - **Commits**: `test:` (tracer flip) then `refactor:` (deletion)

- [x] **Cycle 3 — C5 (telemetry key only): global config strips `telemetry`**
  - **Behavior**: global-config "Retired key cleanup" scenarios, restricted to the
    `telemetry` key this wave (design decision 4: `profile`/`workflows` stay live until
    wave 2 stops reading them).
  - **Test layer**: unit (`test/core/global-config.test.ts`)
  - **RED**: new `describe('retired keys')` block: (a) config containing
    `telemetry: {...}` + unknown keeper loads without the `telemetry` key, keeper intact,
    no console.error; (b) `saveGlobalConfig` of an object carrying `telemetry` writes a
    file without it, other fields intact.
  - **GREEN**: in `global-config.ts`, add
    `const RETIRED_KEYS = ['telemetry'] as const;` (wave 2 appends
    `'profile', 'workflows'`) and strip those keys from the parsed object in
    `getGlobalConfig` and from a shallow copy in `saveGlobalConfig` (signatures
    unchanged — the interface contract in tasks.md).
  - **Gotcha**: strip AFTER the defaults merge in `getGlobalConfig` (the parsed file's
    keys ride in via spread). Do not touch the `profile` default re-injection yet.
  - **Validate**: `pnpm exec vitest run test/core/global-config.test.ts`
  - **Commits**: `test:` then `feat:`

Wave acceptance: `pnpm test` green; tracer tests 2–5 still `.fails` (config/init profile
surface and the retired `profile`/`workflows` keys survive until wave 2 by design).

## Documented deviations

- Tracer test 1 flips live in THIS wave, not wave 4: wave 1's deletion makes its inner
  assertions pass, which would fail an `it.fails` marker. Wave 4's "remove tracer
  markers" applies to whatever markers remain by then (anticipated in the wave-0 plan).
