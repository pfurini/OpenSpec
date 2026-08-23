## Why

The 2026-08 upstream shopping trip (`openspec/explorations/ops/upstream-shopping-2026-08.md`,
section A1) identified a cluster of archive / spec-sync correctness fixes upstream landed after
our fork point. Most are data-loss-class bugs in engine code we KEEP (`archive.ts`,
`specs-apply.ts`, the spec parsers, the validator, spec discovery): a capability retirement that
dead-ends, scenarios silently dropped on sync, delta Purpose lost when a new main spec is created,
non-idempotent re-archiving that fails on already-synced deltas, stacked date prefixes, mangled
blank lines and EOF, a wrong archive exit code, ANSI escapes leaking into redirected output, and
nested spec paths that are not discovered recursively. ADR-0001 forbids merging upstream; we
re-implement the ideas that reproduce in our diverged tree.

## What Changes

Adopt, in our idiom, the A1 archive/spec-sync fixes **that reproduce in our tree**. Each upstream
PR is a reference to read, then audit against our code (we evicted spec-driven, telemetry, profiles,
command-generation and rewrote the skills + schema, so some rows will not reproduce). Rows that do
not apply are recorded as "not applicable on audit" in `design.md`, not force-ported.

Candidate rows (audit verdict per row lands in `design.md`):

- Never dead-end a capability retirement (#1699); let a change retire a capability it empties (#1484).
- Scenario-drift check made fence-aware and multiplicity-aware (#1475, #1391/#1252).
- Report scenarios a MODIFIED requirement would drop (#1482).
- Warn before archiving deletes a note next to a requirement (#1490).
- Keep the delta spec's Purpose when creating a new main spec (#1431).
- Treat already-synced RENAMED / early-synced REMOVED / already-synced ADDED deltas as no-ops
  (#1386, #19d41714/#1437, #1376) — idempotent re-archiving.
- Don't stack a second date prefix on archive names (#1316; template twin #1388).
- Preserve blank lines around `## Requirements` when syncing (#1637); canonicalize rebuilt spec EOF (#1528).
- Correct the `archive` exit code on validation failure (#1311).
- Tell the caller which flag to pass in non-interactive archive (#1483); no ANSI escapes to a
  redirected (non-TTY) stdout (#1603).
- Discover and preserve nested spec paths recursively across parse, apply, and archive (#1355/#1508).

Behavior changes to authored skills under `schemas/skills/**` (e.g. sync-specs guidance) trip the
parity-hash wall **by design** and require `pnpm run rebaseline:skills`.

## Capabilities

### New Capabilities

- None. Every row is a correctness fix to existing behavior.

### Modified Capabilities

- `cli-archive`: retirement handling, idempotent re-archiving, date-prefix dedup, exit code,
  non-interactive guidance, non-TTY output, nested spec discovery.
- `specs-sync-skill`: scenario-drift/loss reporting, Purpose preservation, blank-line/EOF
  canonicalization, no-op handling of already-synced deltas.
- `cli-validate`: report scenarios a MODIFIED requirement would drop.
- `cli-spec`, `cli-view`, `cli-list`: recursive nested-spec-path discovery (only the rows that
  reproduce; audited).
- `opsx-archive-skill`: stop instructing a second date prefix on already-dated change names
  (#1388, the skill-side twin of #1316; confirmed on audit in our rewritten archive skills).

## Constraints

- **Compatibility**: Must not regress existing archive/sync/validate behavior. No merge or diff
  pull from upstream (ADR-0001) — re-implement in our idiom. Every edit under `schemas/skills/**`
  must be followed by `pnpm run rebaseline:skills` and a committed parity-test update, or
  `test/core/templates/skill-templates-parity.test.ts` fails.
- **Performance**: None (interactive CLI paths; no throughput target).
- **Security & Compliance**: None.
- **Operational**: Cross-platform (macOS/Linux/Windows) — all path handling via
  `path.join`/`path.resolve`, no hardcoded separators in code or test expectations. Run
  `pnpm run build` before CLI/integration-focused tests (they exercise `dist/`).

## Impact

- Code: `src/core/archive.ts`, `src/core/specs-apply.ts`, `src/core/parsers/` (requirement-blocks,
  spec-structure, change-parser), `src/core/validation/validator.ts`, `src/utils/spec-discovery.ts`,
  `src/utils/interactive.ts`, `src/core/view.ts`, `src/core/list.ts`, `src/commands/spec.ts` —
  scoped by the per-row audit.
- Skills: `schemas/skills/openspec-sync-specs/`, possibly `openspec-archive-change` /
  `openspec-bulk-archive-change` (guidance text only).
- Tests: new/updated vitest suites for each adopted fix; parity-hash re-baseline.
- No new runtime dependencies expected.
