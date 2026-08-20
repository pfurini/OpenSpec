## MODIFIED Requirements

### Requirement: Schema Selection

The system SHALL support custom schema selection for workflow commands.

#### Scenario: Default schema

- **WHEN** user runs workflow commands without `--schema`
- **THEN** the system uses the "deep-planning" schema

#### Scenario: Custom schema

- **WHEN** user runs `openspec status --change <id> --schema tdd`
- **THEN** the system uses the specified schema for artifact graph

#### Scenario: Unknown schema

- **WHEN** user specifies an unknown schema
- **THEN** the system displays an error listing available schemas
