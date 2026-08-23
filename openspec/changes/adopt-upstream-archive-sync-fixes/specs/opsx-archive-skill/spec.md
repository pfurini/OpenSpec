## MODIFIED Requirements

### Requirement: OPSX Archive Skill

The system SHALL provide an `/opsx:archive` skill that archives completed changes in the experimental workflow.

#### Scenario: Archive a change with all artifacts complete

- **WHEN** agent executes `/opsx:archive` with a change name
- **AND** all artifacts in the schema are complete
- **AND** all tasks are complete
- **THEN** the agent moves the change to `openspec/changes/archive/` under its target name (the change name, date-prefixed only when it is not already — see Archive Process)
- **AND** displays success message with archived location

#### Scenario: Change selection prompt

- **WHEN** agent executes `/opsx:archive` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows only active changes (excludes archive/)

### Requirement: Archive Process

The skill SHALL move the change to the archive folder under a date-prefixed name, never stacking a second date prefix on a change name that already carries one.

#### Scenario: Successful archive

- **WHEN** archiving a change
- **THEN** create `archive/` directory if it doesn't exist
- **AND** generate target name as `YYYY-MM-DD-<change-name>` using current date
- **AND** move entire change directory to archive location
- **AND** preserve `.openspec.yaml` file in archived change

#### Scenario: Change name already carries a date prefix

- **WHEN** the change name already starts with a `YYYY-MM-DD-` prefix
- **THEN** use the change name as the target name unchanged
- **AND** never produce a double-dated name like `2026-08-23-2026-08-01-<name>`

#### Scenario: Archive already exists

- **WHEN** target archive directory already exists
- **THEN** fail with error message
- **AND** suggest renaming existing archive or using different date
