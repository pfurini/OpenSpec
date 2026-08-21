## ADDED Requirements

### Requirement: Published package name is `@pfurini/openspec`

The package this repository publishes to npm SHALL be named `@pfurini/openspec`.

#### Scenario: Package manifest name

- **WHEN** a reader inspects the root `package.json` `name` field
- **THEN** the value is `@pfurini/openspec`

#### Scenario: Install from npm

- **WHEN** a user installs the published package with `npm install -g @pfurini/openspec`
- **THEN** the install target is this fork's package, not `@fission-ai/openspec`

### Requirement: CLI binary remains `openspec`

The installed CLI SHALL be invoked as `openspec`. The product name SHALL remain OpenSpec.

#### Scenario: Bin field

- **WHEN** a reader inspects the root `package.json` `bin` field
- **THEN** it maps the command name `openspec` to the CLI entry script

#### Scenario: Version after scoped install

- **WHEN** `@pfurini/openspec` is installed and the user runs `openspec --version`
- **THEN** the printed version equals the `version` field in the root `package.json`

### Requirement: Release pack guard follows the scoped install path

The packed-tarball version check SHALL locate the installed CLI using a cross-platform path under the `@pfurini/openspec` package directory.

#### Scenario: Packed CLI version matches manifest

- **WHEN** the pack-version check packs the current tree and installs the tarball into a temp project
- **THEN** it runs the installed CLI `--version` via `path.join` segments `node_modules`, `@pfurini`, `openspec`, `bin`, `openspec.js`
- **AND** that version equals the root `package.json` `version`

### Requirement: Current-facing install docs name `@pfurini/openspec`

Install, update, and uninstall instructions that tell a user which npm package to use SHALL name `@pfurini/openspec`.

#### Scenario: README and installation docs

- **WHEN** a user follows the install, update, or uninstall commands in `README.md` or `docs/installation.md`
- **THEN** every npm/pnpm/yarn/bun package argument in those commands is `@pfurini/openspec`

#### Scenario: Website npm link and homepage install

- **WHEN** a user follows the website homepage install command or the shared npm package URL
- **THEN** both name `@pfurini/openspec`

### Requirement: Package metadata points at this fork

The npm package metadata SHALL identify `pfurini/OpenSpec` as the source repository.

#### Scenario: Homepage and repository fields

- **WHEN** a reader inspects the root `package.json` `homepage` and `repository.url` fields
- **THEN** both refer to `https://github.com/pfurini/OpenSpec` (git clone URL may omit `.git`)
