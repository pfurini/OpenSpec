# Design: adopt-deep-planning-as-default

## Context

The fork's owned workflow is `deep-planning` (`schemas/deep-planning/`), but the runtime
default is still upstream's `spec-driven`, hardcoded in eight places:
`src/commands/workflow/shared.ts:71` (`DEFAULT_SCHEMA`), `src/utils/change-metadata.ts:197`,
`src/utils/change-utils.ts:7`, `src/core/root-selection.ts:57,118`,
`src/core/init.ts:40`, `src/core/planning-home.ts:20` (`REPO_DEFAULT_SCHEMA`),
`src/core/openspec-root.ts:17` (`DEFAULT_OPENSPEC_SCHEMA`). The built-in schema ships at
`schemas/spec-driven/` (schema.yaml + 4 templates). ~28 test files and 6 baseline specs
reference it — most as a *name-only* example of "a built-in schema", a few as genuine
default-behavior assertions. ADR-0001 (fork sovereignty) and ownership-map row 2 govern;
row 1 (`evict-upstream-surfaces`) already proved the eviction pattern.

Known adjacent bug (found while planning): `new-change.ts:120` prints the spinner with
`root.defaultSchema` (the machine default) before project-config resolution, so it can
announce a different schema than the change is created with.

## Goals / Non-Goals

**Goals:**

- `deep-planning` is the single built-in workflow schema and the default everywhere a
  default is resolved.
- `schemas/spec-driven/` is gone; naming it fails loudly with the standard resolution
  error.
- Suite green at every wave boundary; no spec-driven-dependent test survives wave 1.

**Non-Goals:**

- No migration shim or special-case error for `spec-driven`-named project configs.
- No docs rewrite (row 5), no `website/` changes, no package rename (row 3), no stores
  trim (row 4). Marketing taglines using "spec-driven development" as a generic term stay.
- No skill or schema-content edits (parity wall untouched).

## Decisions

1. **Flip constants, not plumbing.** All eight default points are literal constants or
   one-line fallbacks; each flips to `'deep-planning'`. No new resolution logic — the
   existing project → user → package order is untouched.
2. **Example-name swaps over test deletion.** Tests that use `spec-driven` merely as "a
   built-in schema name" (schema fork/which/resolution cases, fixtures) are repointed to
   `deep-planning`, preserving their coverage of override mechanics. Only tests whose
   *subject* is spec-driven-specific content die — current survey found none; if one
   surfaces during implementation it is deleted in the same cycle that removes its subject.
3. **Spinner honesty in the same wave as the flip.** `new-change.ts` announces
   `result.schema` (post-resolution) instead of `root.defaultSchema`. One-line change, same
   behavior cluster, no new wave.
4. **Standard not-found error is the migration path.** A config naming `spec-driven` gets
   the existing "schema not found, available: …" error. No fork-specific branch.
5. **Docs: surgical, not rewritten.** Only sentences asserting `spec-driven` as the
   default / the workflow are corrected (to `deep-planning` or removed). Everything else
   waits for row 5.

## Components & Dependencies

| Component | Purpose | Interface | Depends on | Skills |
| ----------- | --------- | ----------- | ------------ | -------- |
| Default flip | Make `deep-planning` the fallback at all 8 resolution points + honest spinner | edited constants; `new-change.ts` message | — | — |
| Test repoint | Free the suite from spec-driven's existence | edited test files + `test/helpers/openspec-fixtures.ts` | Default flip (wave 0 lands first so repointed fixture tests resolve) | — |
| Schema eviction | Delete `schemas/spec-driven/`; prove not-found behavior | `git rm` + resolution error-path tests | Test repoint | — |
| Truth sweep | Delta specs + docs stop asserting the old default | 6 delta specs; ~10 docs files | Schema eviction (docs/specs must describe the post-eviction surface) | — |

**Slice composition:** strictly ordered chain — flip → repoint → evict → sweep. Each wave
leaves the suite green, so the chain is four small green steps, not one big-bang deletion.
No independently valuable unit here (nothing ships alone except the flip), so no sibling
changes.

## Data Model / API Shapes

No new shapes. The only behavioral deltas: the string `deep-planning` replaces
`spec-driven` at default-resolution points, and `openspec schemas` output loses one entry.

## Data Flow & Error Handling

Happy path: unconfigured project / fresh init → config or fallback names `deep-planning` →
resolver finds the built-in → workflow proceeds. Failure paths: config names removed
`spec-driven` → existing resolver not-found error listing available schemas (covered by a
new test); `--schema spec-driven` → same error at flag validation (`validateSchemaExists`).

## Testing Approach

| Spec scenario | Test layer | Why this layer |
| --------------- | ----------- | ---------------- |
| config-loading: fallback schema when config names none | unit (`change-metadata`, `change-utils`, `root-selection`, `planning-home` tests) | pure function of constants |
| cli-artifact-workflow: default schema resolves deep-planning | integration (`artifact-workflow`, `workflow.integration` tests) | exercises resolution + instruction loading together |
| cli-init writes `schema: deep-planning` | integration (`init.test.ts` existing assertion, updated) | observable file output |
| schema-resolution/which/fork with deep-planning as built-in example | unit/integration (existing suites, repointed) | same mechanics, new name |
| removed-schema config fails listing available schemas | integration (new case in `resolver`/`schema` tests) | proves the error path a user of an old config actually hits |

## Wave Skeleton / Build Sequence

### Wave 0 — deep-planning is the default · TRACER

- value: an unconfigured project and a fresh `openspec init` resolve `deep-planning`; the
  `new change` spinner announces the actually-resolved schema.
- components: Default flip
- proves scenarios: config-loading fallback; cli-init config write; cli-artifact-workflow
  default; spinner honesty
- depends-on: —
- acceptance: `pnpm run build && ./node_modules/.bin/vitest run` green (with
  spec-driven still on disk, proving the flip alone breaks nothing)
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: —

### Wave 1 — suite no longer depends on spec-driven

- value: `grep -rn "spec-driven" test/` yields only intentional references (none expected
  after this wave); the fixture helper writes `schema: deep-planning`.
- components: Test repoint
- proves scenarios: schema-resolution/which/fork example swaps (test side)
- depends-on: Wave 0
- acceptance: full suite green; zero unintentional spec-driven references in `test/`
- stamps: `size:M` `risk:low` `implTier:medium`
- skills: —

### Wave 2 — spec-driven evicted from the package

- value: `schemas/spec-driven/` deleted; `openspec schemas` omits it; naming it fails with
  the available-schemas error, proven by a new not-found test.
- components: Schema eviction
- proves scenarios: removed-schema config error path
- depends-on: Wave 1
- acceptance: full suite green; `node ./bin/openspec.js schemas` lists only `deep-planning`
- stamps: `size:S` `risk:med` `implTier:medium`
- skills: —

### Wave 3 — specs and docs tell the truth

- value: the six baseline-spec delta files are in the change; `docs/` contains no statement
  presenting spec-driven as default/the workflow; `openspec validate --all` clean.
- components: Truth sweep
- proves scenarios: all six modified-capability deltas
- depends-on: Wave 2
- acceptance: `node ./bin/openspec.js validate --all` clean; `grep -rn "spec-driven" docs/`
  yields only historical/generic mentions
- stamps: `size:M` `risk:low` `implTier:medium`
- skills: —

## Risks / Trade-offs

- [A test asserting spec-driven *content* (not just the name) surfaces mid-wave 1] →
  delete it in the cycle that evicts its subject, per ownership-map rule; the survey says
  none exist.
- [Some default point is reached by a path the eight greps missed (dynamic string)] → wave 0
  acceptance includes the full suite; integration tests exercise real resolution paths.
- [Docs sweep scope creep into row 5] → decision 5 caps edits to default/workflow
  assertions only.

## Migration / Rollback

No data or shared state. Rollback = revert the wave commits. Projects created between the
flip and a rollback would carry `schema: deep-planning` in config — valid under both
defaults, so no rollback hazard.

## Open Questions

None blocking. (For the record: marketing taglines and `website/` are row 5 by ownership-map
decision, not open here.)
