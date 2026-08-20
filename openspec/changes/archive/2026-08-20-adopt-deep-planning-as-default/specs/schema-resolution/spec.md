## MODIFIED Requirements

### Requirement: Project-local schema resolution

The system SHALL resolve schemas from the project-local directory (`./openspec/schemas/<name>/`) with highest priority when a `projectRoot` is provided.

#### Scenario: Project-local schema takes precedence over user override

- **WHEN** a schema named "my-workflow" exists at `./openspec/schemas/my-workflow/schema.yaml`
- **AND** a schema named "my-workflow" exists at `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** the system SHALL return the project-local path

#### Scenario: Project-local schema takes precedence over package built-in

- **WHEN** a schema named "deep-planning" exists at `./openspec/schemas/deep-planning/schema.yaml`
- **AND** "deep-planning" is a package built-in schema
- **AND** `getSchemaDir("deep-planning", projectRoot)` is called
- **THEN** the system SHALL return the project-local path

#### Scenario: Falls back to user override when no project-local schema

- **WHEN** no schema named "my-workflow" exists at `./openspec/schemas/my-workflow/`
- **AND** a schema named "my-workflow" exists at `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** the system SHALL return the user override path

#### Scenario: Falls back to package built-in when no project-local or user schema

- **WHEN** no schema named "deep-planning" exists at `./openspec/schemas/deep-planning/`
- **AND** no schema named "deep-planning" exists at `~/.local/share/openspec/schemas/deep-planning/`
- **AND** "deep-planning" is a package built-in schema
- **AND** `getSchemaDir("deep-planning", projectRoot)` is called
- **THEN** the system SHALL return the package built-in path

#### Scenario: Backward compatibility when projectRoot not provided

- **WHEN** `getSchemaDir("my-workflow")` is called without a `projectRoot` parameter
- **THEN** the system SHALL only check user override and package built-in locations
- **AND** the system SHALL NOT check project-local location

### Requirement: Schema info includes project source

The system SHALL indicate `source: 'project'` for project-local schemas in `listSchemasWithInfo()` results.

#### Scenario: Project-local schema shows project source

- **WHEN** a schema named "team-flow" exists at `./openspec/schemas/team-flow/schema.yaml`
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** the schema info for "team-flow" SHALL have `source: 'project'`

#### Scenario: User override schema shows user source

- **WHEN** a schema named "my-custom" exists only at `~/.local/share/openspec/schemas/my-custom/`
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** the schema info for "my-custom" SHALL have `source: 'user'`

#### Scenario: Package built-in schema shows package source

- **WHEN** "deep-planning" exists only as a package built-in
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** the schema info for "deep-planning" SHALL have `source: 'package'`

### Requirement: Use config schema as default for new changes

The system SHALL use the schema field from `openspec/config.yaml` as the default when creating new changes without explicit `--schema` flag and no planning-home default applies.

#### Scenario: Create change without --schema flag and config exists

- **WHEN** user runs `openspec new change foo`, no planning-home default applies, and config contains `schema: "tdd"`
- **THEN** system creates change with schema "tdd"

#### Scenario: Create change without --schema flag and no config

- **WHEN** user runs `openspec new change foo`, no planning-home default applies, and no config file exists
- **THEN** system creates change with default schema "deep-planning"

#### Scenario: Create change with explicit --schema flag

- **WHEN** user runs `openspec new change foo --schema custom` and config contains `schema: "tdd"`
- **THEN** system creates change with schema "custom" (CLI flag overrides config)

### Requirement: Resolve schema with updated precedence order

The system SHALL resolve the schema for a change using the following precedence order: CLI flag, change metadata, planning-home default, project config, hardcoded default.

#### Scenario: CLI flag is provided

- **WHEN** user runs command with `--schema custom`
- **THEN** system uses "custom" regardless of change metadata or config

#### Scenario: Change metadata specifies schema

- **WHEN** change has `.openspec.yaml` with `schema: bound` and config has `schema: tdd`
- **THEN** system uses "bound" from change metadata

#### Scenario: Only project config specifies schema

- **WHEN** no CLI flag, change metadata, or planning-home default exists, but config has `schema: tdd`
- **THEN** system uses "tdd" from project config

#### Scenario: No schema specified anywhere

- **WHEN** no CLI flag, change metadata, planning-home default, or project config
- **THEN** system uses hardcoded default "deep-planning"

### Requirement: Provide helpful error message for invalid schema

The system SHALL display schema error with fuzzy match suggestions, list of available schemas, and fix instructions.

#### Scenario: Schema name with typo (close match)

- **WHEN** config contains `schema: "dep-planning"` (typo)
- **THEN** error message includes "Did you mean: deep-planning (built-in)" as suggestion

#### Scenario: Schema name with no close matches

- **WHEN** config contains `schema: "completely-wrong"`
- **THEN** error message shows list of all available built-in and project-local schemas

#### Scenario: Error message includes fix instructions

- **WHEN** config references invalid schema
- **THEN** error message includes "Fix: Edit openspec/config.yaml and change 'schema: X' to a valid schema name"

#### Scenario: Error distinguishes built-in vs project-local schemas

- **WHEN** error lists available schemas
- **THEN** output clearly labels each as "built-in" or "project-local"
