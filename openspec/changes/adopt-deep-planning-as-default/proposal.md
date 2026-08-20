# Proposal: adopt-deep-planning-as-default

> Primary input: `openspec/explorations/make-this-fork-mine.md` (ownership map; this is
> change 2 of its five-change eviction plan). Row 1 (`evict-upstream-surfaces`) landed
> 2026-08-13.

## Why

This fork's owned product is the deep-planning workflow, yet a fresh `openspec init` still
writes `schema: spec-driven` into the project config, every unconfigured project silently
resolves upstream's workflow, and `schemas/spec-driven/` still ships as a built-in schema
that `--schema`, `openspec schema fork`, and docs present as the default choice. The
ownership map calls this "the product lie still in the tree": the CLI defaults to a
workflow this fork does not develop, and its presence splits the dogfooding surface
between the workflow we own and the one we merely inherited.

## What Changes

- **BREAKING**: the default workflow schema flips from `spec-driven` to `deep-planning` at
  every default-resolution point: `openspec init` writes `schema: deep-planning` into new
  project configs, and change creation / root selection / planning-home / metadata
  fallbacks resolve `deep-planning` when no schema is named.
- **BREAKING**: `schemas/spec-driven/` is removed from the package. `--schema spec-driven`,
  `openspec schema fork spec-driven`, and project configs naming `spec-driven` fail schema
  resolution with the standard not-found error listing available schemas. No migration
  shim (fork policy: this fork supports projects created by the current architecture only).
- `openspec schemas` / `openspec schema which` listings and examples no longer carry
  `spec-driven`; their examples use `deep-planning` as the built-in schema.
- The `new change` progress spinner reports the schema the change is actually created
  with (project-config resolution included), instead of the machine-level default.
- Docs stop presenting `spec-driven` as the default or "the" workflow (minimal truthful
  pass; the full docs rewrite remains ownership-map row 5, and `website/` stays out of
  scope here).
- Baseline specs that assert `spec-driven` as the default, or use it as the example
  built-in schema, are updated via this change's delta specs.

## Capabilities

### New Capabilities

None — this change only modifies and retires.

### Modified Capabilities

- `config-loading`: the fallback schema when no config names one becomes `deep-planning`.
- `cli-artifact-workflow`: the default-schema scenario resolves `deep-planning`.
- `schema-resolution`: examples and the change-creation default scenario use
  `deep-planning`; `spec-driven` is no longer a package built-in.
- `schema-which-command`: examples use `deep-planning` as the built-in schema.
- `schema-fork-command`: examples fork from `deep-planning`.
- `rules-injection`: the unknown-artifact warning example names `deep-planning`.

## Constraints

- Compatibility: explicit `--schema <name>` for any *other* resolvable schema keeps
  working unchanged; project-local and user-override schemas are unaffected (resolution
  order untouched).
- Compatibility: a project config naming the removed `spec-driven` schema fails with the
  standard resolution error that lists available schemas — no silent fallback to
  `deep-planning`.
- Operational: the test suite stays green after every wave; tests of evicted behavior are
  deleted with the eviction, never before (ownership-map rule).
- Operational: no new TS plumbing and no skill edits — the parity wall
  (`test/core/templates/skill-templates-parity.test.ts`) is untouched.
- Cross-platform: no new path handling; any touched path code keeps using `path.join` /
  `path.resolve` (repo rule).

## Impact

- **Code**: default-schema constants and fallbacks in `src/commands/workflow/shared.ts`,
  `src/utils/change-metadata.ts`, `src/utils/change-utils.ts`, `src/core/root-selection.ts`,
  `src/core/init.ts`, `src/core/planning-home.ts`, `src/core/openspec-root.ts`,
  `src/core/artifact-graph/instruction-loader.ts` (comment/example strings);
  `src/commands/workflow/new-change.ts` (spinner message).
- **Deleted**: `schemas/spec-driven/` (schema.yaml + templates).
- **Tests**: ~28 files reference `spec-driven` — name-only usages repointed to
  `deep-planning` (or test-local schema names); default-asserting tests updated to the new
  default; not-found coverage added for configs naming the removed schema.
- **Specs**: delta specs for the six modified capabilities listed above.
- **Docs**: minimal pass over `docs/cli.md`, `docs/opsx.md`, `docs/concepts.md`,
  `docs/customization.md`, `docs/migration-guide.md`, `docs/glossary.md`, `docs/faq.md`,
  `docs/multi-language.md`, `docs/troubleshooting.md`, `docs/commands.md` — only statements
  asserting `spec-driven` as default / the workflow.
- **Out of scope**: `website/` content, marketing taglines using "spec-driven development"
  as a generic industry term (row 5), package rename (row 3), stores-surface trim (row 4).
