# Wave 0 plan — tracer: the end-state eviction contract as one expected-fail test

Wave map source: `openspec/changes/evict-upstream-surfaces/tasks.md` (## Wave 0).
This wave is test-only: it commits `test/cli-e2e/eviction-contract.test.ts` with vitest
`.fails` markers so the whole suite stays green while the contract is red. No production
code changes. Wave 4 removes the `.fails` markers.

## Mandatory Reading

| Pri | File | Lines | Why |
|---|---|---|---|
| P0 | `test/cli-e2e/basic.test.ts` | 1–60, 127–166 | e2e conventions to MIRROR: `runCLI`, temp-dir fixtures, help assertions, init `--tools` invocation |
| P0 | `test/helpers/run-cli.ts` | 75–148 | `runCLI(args, {cwd, env})` contract — env is merged over `process.env`, so `XDG_CONFIG_HOME` can be injected per call |
| P0 | `openspec/changes/evict-upstream-surfaces/specs/global-config/spec.md` | all | Retired-key scenarios the tracer asserts (`telemetry`, `profile`, `workflows` — explicit list) |
| P0 | `openspec/changes/evict-upstream-surfaces/specs/cli-init/spec.md` | all | "installs full set", "global config cannot restrict" scenarios |
| P1 | `src/core/global-config.ts` | 34–55, 115–150 | Why the config assertions fail today (defaults re-inject `profile`); `XDG_CONFIG_HOME` is honored on all platforms |
| P1 | `src/core/shared/skill-generation.ts` | 44–65 | dirName ↔ workflowId mapping that determines the installed skill dir names |
| P1 | `openspec/changes/evict-upstream-surfaces/design.md` | 105–113 (W0 skeleton) | Exact tracer scope — do not exceed it |

No project test-strategy skill exists (design.md, "Governing skills"); conventions come
from the existing suite (vitest, `test/cli-e2e` for spawned-CLI journeys).

## Patterns to Mirror

Help assertion + CLI spawn — SOURCE: `test/cli-e2e/basic.test.ts:40-46`

```ts
it('shows help output', async () => {
  const result = await runCLI(['--help']);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Usage: openspec');
  expect(result.stderr).toBe('');
});
```

Temp-dir + init invocation — SOURCE: `test/cli-e2e/basic.test.ts:151-166` (trimmed)

```ts
const result = await runCLI(['init', '--tools', 'claude'], { cwd: emptyProjectDir });
expect(result.exitCode).toBe(0);
expect(result.stdout).toContain('OpenSpec Setup Complete');
```

Per-call env injection — SOURCE: `test/helpers/run-cli.ts:82-91` (env spread means
`{ env: { XDG_CONFIG_HOME: dir } }` isolates the global config per test).

## The end-state contract (what the tracer asserts)

1. **Help diff by removal only** (proposal Constraints): `openspec --help` has no
   `feedback` command entry; `openspec config --help` has no `profile` subcommand;
   `openspec init --help` has no `--profile` option.
2. **Global config self-cleans**: a `config.json` containing all three retired keys
   (`telemetry`, `profile`, `workflows`) plus a keeper field loads without warning and
   without the retired keys; the next write (`openspec config set`) drops exactly those
   three keys and preserves everything else (including unknown-but-not-retired keys).
3. **Init installs exactly the full workflow skill set** regardless of retired
   `profile`/`workflows` values in global config. The end-state set is the post-prune
   bundle (design C1/C7): the 14 current `schemas/skills/` dirs minus `feedback`,
   `openspec-onboard`, `openspec-propose`, `openspec-ff-change`:

```ts
const EXPECTED_SKILLS = [
  'openspec-apply-change',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-continue-change',
  'openspec-design',
  'openspec-explore',
  'openspec-new-change',
  'openspec-reverse',
  'openspec-sync-specs',
  'openspec-verify-change',
] as const;
```

The list is literal (not imported from `WORKFLOW_SKILLS`) because
`src/core/workflow-skills.ts` does not exist until Wave 2 and the tracer must compile
in Wave 0. Wave 2's enumeration-guard test owns constant↔bundle parity; the tracer
owns the observable install surface. (Deviation from a strict reading of "init installs
exactly `WORKFLOW_SKILLS`" — documented here; the sets are identical by construction.)

## Files to Change

- CREATE `test/cli-e2e/eviction-contract.test.ts` — the tracer; sibling of
  `basic.test.ts` (parent dir exists).

## Cycles

- [x] **Cycle 1 — tracer file, committed expected-fail** (this whole wave is one RED
  commit; there is no GREEN until later waves)
  - **Behavior**: the three contract clusters above (spec scenarios: cli-feedback/
    telemetry REMOVED absence via help + config write; global-config Retired-key
    scenarios; cli-init "No workflow subset selection" + "Global config cannot restrict
    the skill set")
  - **Test layer**: cli-e2e absence assertions (per tasks.md coverage map row
    "telemetry REMOVED ×9 / cli-feedback REMOVED ×7 → `test/cli-e2e/eviction-contract.test.ts`")
  - **Mirror**: `test/cli-e2e/basic.test.ts:40-46,127-166`; `test/helpers/run-cli.ts:82-91`
  - **Structure**: one `describe('eviction contract (tracer)')`, five `it.fails(...)`
    tests:
    1. `openspec --help` stdout does NOT contain `feedback`
    2. `openspec config --help` stdout does NOT contain `profile`; `openspec init --help`
       stdout does NOT contain `--profile`
    3. load-silently: seed `$XDG_CONFIG_HOME/openspec/config.json` with
       `{ telemetry: {anonymousId: 'tracer'}, profile: 'core', workflows: ['explore'], featureFlags: {keep: true}, tracerKeeper: 'stays' }`;
       run `openspec config list --json`; expect exit 0, stderr `''`, parsed stdout has
       none of the three retired keys and still has `featureFlags.keep` and `tracerKeeper`
    4. write-clean: same seed; run `openspec config set featureFlags.tracer true`; re-read
       the seeded file; expect none of the three retired keys, `featureFlags.tracer === true`,
       `tracerKeeper` preserved
    5. init-full-set: temp project dir + seeded config (retired `profile: 'core'`,
       `workflows: ['explore']`); run `openspec init --tools claude` with
       `env: { XDG_CONFIG_HOME: cfgDir }`; expect sorted readdir of
       `<project>/.agents/skills/` to equal `EXPECTED_SKILLS`
  - **Gotchas**:
    - `it.fails` passes while the assertions fail and goes RED the moment the behavior
      lands — waves 1–3 must NOT unmark them; only Wave 4 does. If a wave makes one of
      these pass early, that specific `it.fails` will start failing the suite — that is
      the designed signal to flip just that marker live in the wave that earned it
      (note it in that wave's plan if it happens).
    - Every `runCLI` call in tests 3–5 must carry `XDG_CONFIG_HOME` pointing at a temp
      dir — otherwise the test reads/writes the developer's real
      `~/.config/openspec/config.json`.
    - `src/telemetry/config.ts:37-39` has a legacy-path fallback reading
      `~/.config/openspec/config.json` directly (ignores XDG). It only merges telemetry
      fields when the seeded config lacks them — test 3/4 seed `telemetry.anonymousId`
      but NOT `noticeSeen`, so seed `noticeSeen: true` as well to keep the real home
      config out of the picture.
    - init in a bare temp dir may hit the store/root guards — mirror `basic.test.ts`'s
      `empty-project` pattern (plain empty dir works there; keep `cwd` inside the temp
      root).
    - Use the `tempRoots` + `afterAll` cleanup pattern from `basic.test.ts:17-37`.
  - **Validate**: `pnpm exec vitest run test/cli-e2e/eviction-contract.test.ts` (all
    tests green because `.fails` inverts), then `pnpm test` for the wave acceptance.
  - **Commit**: `test: add expected-fail eviction-contract tracer (wave 0)`

## Documented deviations

- **Pre-existing suite red, fixed to unblock acceptance**: `pnpm test` was already
  failing at the wave-0 baseline — `test/specs/source-specs-normalization.test.ts`
  rejects the archive-placeholder Purpose text left in `openspec/specs/cli-reverse/spec.md`
  and `openspec/specs/reverse-baseline-skill/spec.md` (both from archiving
  `add-reverse-baseline-skill`). Unrelated to this change, but every wave's acceptance
  is "whole suite green", so the two Purpose sections were filled with real summaries
  in a standalone `chore:` commit before the tracer commit. No requirement content
  was touched.
