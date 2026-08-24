# OpenSpec Test Guidance

Applies to tests under `test/`.

## Running Tests

- Focused file: `pnpm exec vitest run test/path/to/file.test.ts`
- Focused case: `pnpm exec vitest run test/path/to/file.test.ts -t "case name"`
- Full suite: `pnpm test`
- Everything at once: `pnpm run gate` (build + full suite + lint, stops at the first failure).

## Tests That Spawn the Compiled CLI

Tests that exercise the CLI run `dist/cli/index.js`, not `src/`, so a stale `dist/` would let them
pass against code that no longer exists. Nothing about that is left to memory:

- Reach the CLI only through `test/helpers/run-cli.ts` (`runCLI`). Importing it is what marks a
  file as CLI-dependent.
- The global setup (`vitest.setup.ts`) inspects the files the run resolved to. If any of them
  imports that helper, it rebuilds `dist/` when the entry point is missing or older than any build
  input (`src/`, `tsconfig.json`, `build.js`) — focused runs included. A failing build fails the run.
- Runs with no such file skip the check, so unit-test loops stay fast and never trigger a build.
- `runCLI` re-verifies freshness in the worker and throws a message naming the fix, covering runs
  that bypass the global setup. It never builds there: parallel workers would race over `dist/`.

Freshness logic lives in `test/helpers/dist-freshness.ts`.

## Cross-Platform Paths

- Do not hard-code Unix path separators in CLI output expectations unless the implementation intentionally emits POSIX paths.
- For filesystem paths, build expected values with `path.join(...)`, `path.relative(...)`, or `FileSystemUtils.joinPath(...)`.
- For human-readable output, either assert a deliberately normalized display format or normalize both actual and expected strings before comparing, for example with `FileSystemUtils.toPosixPath()` to convert backslashes to forward slashes for cross-platform consistency.
- When touching path behavior, add coverage that would fail on Windows path separators.

## Path Canonicalization

Path identity is a recurring CI failure mode: Windows short/long paths, symlink or
junction aliases, and case-insensitive file systems can spell the same existing
directory differently.

When asserting existing filesystem paths as identities, canonicalize both actual
and expected paths first. Prefer `FileSystemUtils.canonicalizeExistingPath()` in
project code and `fs.realpathSync.native()` in test-only expectations.

Add an alias-path regression when touching path identity logic. If preserving
user-typed path spelling is intentional, assert it separately from identity comparisons.
