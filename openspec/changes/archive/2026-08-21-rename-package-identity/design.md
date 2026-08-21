# Design: rename-package-identity

## Context

Root `package.json:2` names the package `@fission-ai/openspec`. The bin (`package.json:29-31`)
is already `openspec`. `scripts/pack-version-check.mjs:56,83` hardcodes that scoped path
for the packed-install version guard. Current-facing install commands and the website npm
URL still tell users to install `@fission-ai/openspec`. `homepage` / `repository` still
point at `Fission-AI/OpenSpec` even though `origin` is `pfurini/OpenSpec`. ADR-0001 (fork
sovereignty) is the only accepted ADR and does not constrain the npm name. Ownership-map
row 3 (`openspec/explorations/make-this-fork-mine.md`) is the brief; the 2026-08-20
naming-clearance full-rebrand funnel is out of scope.

## Goals / Non-Goals

**Goals:**

- Published name is `@pfurini/openspec`; bin and product name stay OpenSpec.
- Pack-version guard follows the new scoped install path, derived from `package.json` `name`.
- Current-facing install/update/uninstall docs, README, website npm URL, `AGENTS.md`,
  changelog heading, and changeset example name `@pfurini/openspec`.
- `package.json` `homepage` / `repository` and `.changeset/config.json` `repo` point at
  `pfurini/OpenSpec`.

**Non-Goals:**

- No alias, deprecation, or redirect of `@fission-ai/openspec` (this fork never published
  under it).
- No product rebrand, bin rename, website package rename (`@fission-ai/openspec-website`),
  GitHub org rewrite of in-product "Learn more" / issue URLs, `flake.nix` homepage,
  Discord/X, README rewrite (row 5), or historical Fission-AI changelog/archive links.

## Decisions

1. **Mechanical identity swap, no alias.** One name in the manifest. Install docs follow.
2. **Pack-guard path is derived from `pkg.name`.** Split a scoped name on `/`, then
   `path.join('node_modules', ...parts, 'bin', 'openspec.js')`. Rejected: keep hardcoding
   `@pfurini/openspec` (two sources of truth, same bug class as today).
3. **`homepage` / `repository` / changeset `repo` retarget origin.** These are npm/publish
   metadata for the package this repo ships, not a product rename. Historical changelog
   commit/PR URLs stay on Fission-AI.
4. **No new ADR.** Rename, not an architectural trade-off. ADR-0001 already records fork
   sovereignty.

## Components & Dependencies

| Component | Purpose | Interface | Depends on | Skills |
| ----------- | --------- | ----------- | ------------ | -------- |
| Identity tracer | Prove the published name contract exists as an automated test | `test/package-identity.test.ts` reads root `package.json` | — | — |
| Manifest + pack guard | Make the package the test describes | `package.json` `name`/`homepage`/`repository`; lockfile name fields; `scripts/pack-version-check.mjs` derives bin path from `pkg.name` | Identity tracer | — |
| Install-surface retarget | Current-facing install docs and publish metadata tell the same name | listed docs, website npm URL + homepage command, `AGENTS.md`, `CHANGELOG.md` heading, `.changeset/*`, ownership-map row 3 | Manifest + pack guard | — |

**Slice composition:** ordered chain tracer → manifest → docs. Nothing independently
valuable enough to split into a sibling change.

## Data Model / API Shapes

No new runtime types. The identity tuple is:

- `name`: `@pfurini/openspec`
- `bin.openspec`: `./bin/openspec.js` (unchanged)
- `homepage`: `https://github.com/pfurini/OpenSpec`
- `repository.url`: `https://github.com/pfurini/OpenSpec`
- `publishConfig.access`: `public` (unchanged)

Pack-guard bin relative path, given `pkg.name === '@pfurini/openspec'`:

```
path.join('node_modules', '@pfurini', 'openspec', 'bin', 'openspec.js')
```

## Data Flow & Error Handling

Happy path: `pnpm run check:pack-version` reads `package.json`, packs, installs the
tarball into a temp project, runs the derived bin path with `--version`, compares to
`pkg.version`. Failure: mismatch or missing bin → script exits non-zero (existing
behavior). No new error classes.

## Testing Approach

| Spec scenario | Test layer | Why this layer |
| --------------- | ----------- | ---------------- |
| Package manifest name | unit (`test/package-identity.test.ts`) | file is the contract |
| Bin field | unit (same file) | `package.json` `bin` map |
| Version after scoped install | integration (`pnpm run check:pack-version`) | packed tarball + installed CLI, the path a publish actually ships |
| Packed CLI version matches manifest / scoped install path | integration (`pnpm run check:pack-version`) | proves derivation and `path.join` |
| README and installation docs | grep acceptance (wave 1) | static strings; a suite test would duplicate the file list |
| Website npm link and homepage install | grep acceptance (wave 1) | same |
| Homepage and repository fields | unit (`test/package-identity.test.ts`) | file is the contract |

## Wave Skeleton / Build Sequence

### Wave 0 — published-name tracer exists · TRACER

- value: `test/package-identity.test.ts` asserts root `package.json` `name` is
  `@pfurini/openspec`, `bin.openspec` is set, and `homepage`/`repository.url` refer to
  `https://github.com/pfurini/OpenSpec`. Committed RED.
- components: Identity tracer
- proves scenarios: Package manifest name; Bin field; Homepage and repository fields
- depends-on: —
- acceptance: `pnpm exec vitest run test/package-identity.test.ts` fails on the name
  assertion (expected RED)
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: —

### Wave 1 — tree publishes as `@pfurini/openspec`

- value: the tracer is green; pack-version check locates the CLI under
  `@pfurini/openspec`; current-facing install commands name `@pfurini/openspec`; leftover
  `@fission-ai/openspec` survives only in archive/exploration history and Fission-AI
  changelog commit/PR URLs.
- components: Manifest + pack guard; Install-surface retarget
- proves scenarios: Version after scoped install; Packed CLI version matches manifest;
  README and installation docs; Website npm link and homepage install
- depends-on: Wave 0
- acceptance: `pnpm exec vitest run test/package-identity.test.ts` green; `pnpm run check:pack-version` green; `rg -n '@fission-ai/openspec' --glob '!openspec/changes/archive/**' --glob '!openspec/explorations/**' --glob '!CHANGELOG.md' --glob '!package-lock.json'` yields zero matches (package-lock name fields are updated in this wave; if the lockfile is left otherwise stale, its `name` fields still match)
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: —

## Risks / Trade-offs

- [Stale `package-lock.json` (version 1.2.0, still lists removed deps) vs pnpm as the
  real lockfile] → update only the `name` fields; do not regenerate. pnpm-lock.yaml has
  no package-name field at the importer root.
- [A live install string is missed] → wave 1 acceptance grep over the non-history tree.
- [Publishing still needs an npm login to the `pfurini` org/user] → out of this change;
  `publishConfig.access: public` already set.

## Migration / Rollback

No data migration. Users who followed the old documented install command were pointed at
upstream's package, not this fork. Rollback = revert the wave commits. First publish of
`@pfurini/openspec` is a later operational step, not this change.

## Open Questions

None.
