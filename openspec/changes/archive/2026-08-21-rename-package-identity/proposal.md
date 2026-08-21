# Proposal: rename-package-identity

> Primary input: `openspec/explorations/make-this-fork-mine.md` (ownership map; this is
> change 3 of its five-change eviction plan). Name decision settled 2026-08-21: npm
> scope is `pfurini`; product name and bin stay OpenSpec. The 2026-08-20 naming-clearance
> full-rebrand funnel is out of scope.

## Why

The published package still identifies as `@fission-ai/openspec`, so every install command,
badge, and pack-guard in this tree points at an npm name this fork does not own and cannot
publish. The ownership map already ratified renaming to an owned scope with the bin
unchanged; the missing decision was the scope itself. That is now `pfurini`.

## What Changes

- **BREAKING**: the npm package name becomes `@pfurini/openspec`. Install, update, and
  uninstall commands in the tree (`npm` / `pnpm` / `yarn` / `bun`) use that name. The
  previous `@fission-ai/openspec` name is not aliased, deprecated, or redirected from this
  repo — this fork has never published under it.
- The CLI bin stays `openspec`. The product name stays OpenSpec. No other identifier
  (GitHub org, website package `@fission-ai/openspec-website`, Discord, social, Nix
  `github:` flake URL) is renamed in this change.
- `package.json` `homepage` and `repository` point at `pfurini/OpenSpec` (the origin this
  package actually ships from). Historical changelog commit/PR links to Fission-AI stay.
- The pack-version release guard resolves the packed CLI through the new scoped path.
- Current-facing install docs (README, `docs/installation.md` and the other install
  snippets, website npm URL + homepage install command, `AGENTS.md` parenthetical,
  `CHANGELOG.md` heading, changeset example) use `@pfurini/openspec`.

## Capabilities

### New Capabilities

- `package-identity`: the published npm name, bin, and install contract for this fork.

### Modified Capabilities

None — no existing spec currently requires `@fission-ai/openspec`.

## Constraints

- **Compatibility**: the `openspec` bin name, its flags, and its output contract are
  unchanged. After installing `@pfurini/openspec`, `openspec --version` still prints the
  `package.json` version. Falsifier: any test or script that invokes the `openspec` binary
  by that name fails for a name reason.
- **Performance**: None.
- **Security & Compliance**: None.
- **Operational**: `@pfurini/openspec` is unpublished on the npm registry at change start
  (verified 2026-08-21, 404). Publishing is out of this change; the tree must be
  publishable under that name (public scoped package, `publishConfig.access: public`).
  Full test suite green at completion. No skill-bundle edits, so the parity wall is
  untouched. Cross-platform: any packed-install path in the release guard uses
  `path.join`, never a hardcoded slash.

## Impact

- **Code / package metadata**: `package.json` `name` (and lockfile), `homepage`,
  `repository`; `scripts/pack-version-check.mjs`; `.changeset/config.json` `repo` (future
  changelog GitHub links); `.changeset/README.md` example.
- **Docs (install-identity only)**: `README.md`, `AGENTS.md`, `CHANGELOG.md` heading,
  `docs/installation.md`, `docs/getting-started.md`, `docs/faq.md`, `docs/cli.md`,
  `docs/troubleshooting.md`, `docs/how-commands-work.md`, `docs/README.md`.
- **Website**: `website/lib/shared.ts` npm URL; `website/app/(home)/page.tsx` install
  command. GitHub `user` / Discord / X stay.
- **Out of scope (ownership-map row 5 and naming-clearance)**: README rewrite as the
  fork's front page; GitHub org rewrite of in-product "Learn more" / issue URLs;
  `flake.nix` homepage; `website` gitConfig; website package name; full product rebrand;
  historical changelog Fission-AI links; archived change documents.
