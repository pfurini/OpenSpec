## MODIFIED Requirements

### Requirement: Validate artifact IDs during instruction loading

The system SHALL validate artifact IDs in rules against the schema when instructions are loaded and emit warnings for unknown IDs.

#### Scenario: All artifact IDs are valid

- **WHEN** instructions loaded and config has `rules: { proposal: [...], specs: [...] }` for schema with those artifacts
- **THEN** no validation warnings are emitted

#### Scenario: Unknown artifact ID in rules

- **WHEN** instructions loaded and config has `rules: { unknownartifact: [...] }`
- **THEN** warning emitted: "Unknown artifact ID in rules: 'unknownartifact'. Valid IDs for schema 'deep-planning': design, proposal, specs, tasks"

#### Scenario: Multiple unknown artifact IDs

- **WHEN** instructions loaded and config has multiple unknown artifact IDs
- **THEN** separate warning emitted for each unknown artifact ID

#### Scenario: Validation warnings shown once per session

- **WHEN** instructions loaded multiple times in same CLI session
- **THEN** each unique validation warning is shown only once (cached)
