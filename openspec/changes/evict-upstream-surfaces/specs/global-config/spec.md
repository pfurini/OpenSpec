# global-config — delta

## MODIFIED Requirements

### Requirement: Global configuration storage
The system SHALL store global configuration in `~/.config/openspec/config.json` as valid JSON that users can read and modify.

#### Scenario: Config file format
- **WHEN** storing configuration
- **THEN** the system writes valid JSON that can be read and modified by users

#### Scenario: Existing config preservation
- **WHEN** writing configuration to an existing config file
- **THEN** the system preserves all existing fields of the current schema

## ADDED Requirements

### Requirement: Retired key cleanup
The system SHALL ignore the retired keys `telemetry`, `profile`, and `workflows` when reading global configuration, and SHALL remove exactly those keys on the next configuration write. Retired keys are matched by this explicit list, not by pattern.

#### Scenario: Config with retired keys loads silently
- **WHEN** `config.json` contains any of `telemetry`, `profile`, or `workflows`
- **THEN** `getGlobalConfig()` returns the configuration without error, warning, or prompt
- **AND** the retired keys are absent from the returned configuration

#### Scenario: Retired keys dropped on write
- **WHEN** the system writes the global configuration
- **AND** the file on disk contains `telemetry`, `profile`, or `workflows`
- **THEN** the written file contains none of those three keys
- **AND** all other existing fields are preserved

#### Scenario: Unknown-but-not-retired keys still preserved
- **WHEN** `config.json` contains a field that is neither in the current schema nor in the retired-key list
- **THEN** the field is preserved on read and write (per Config Schema Evolution)
