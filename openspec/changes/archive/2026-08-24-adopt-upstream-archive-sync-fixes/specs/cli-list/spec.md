## MODIFIED Requirements

### Requirement: Command Execution

The command SHALL scan and analyze either active changes or specs based on the selected mode.

#### Scenario: Scanning for changes (default)

- **WHEN** `openspec list` is executed without flags
- **THEN** scan the `openspec/changes/` directory for change directories
- **AND** exclude the `archive/` subdirectory from results
- **AND** parse each change's `tasks.md` file to count task completion

#### Scenario: Scanning for specs

- **WHEN** `openspec list --specs` is executed
- **THEN** scan the `openspec/specs/` directory for capabilities at any folder depth
- **AND** read each capability's `spec.md`
- **AND** parse requirements to compute requirement counts

#### Scenario: Nested specs listed by path id

- **GIVEN** a spec at `openspec/specs/platform/session/spec.md` (paths built with the platform's separators on disk)
- **WHEN** `openspec list --specs` is executed
- **THEN** the spec is listed with id `platform/session`, using `/` separators on every platform
