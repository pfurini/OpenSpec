## MODIFIED Requirements

### Requirement: Specifications Display

The dashboard SHALL display specifications sorted by requirement count.

#### Scenario: Specs listing with counts

- **WHEN** specifications exist in the project
- **THEN** system shows specs sorted by requirement count (descending) with count labels

#### Scenario: Specs with parsing errors

- **WHEN** a spec file cannot be parsed
- **THEN** system includes it with 0 requirement count

#### Scenario: Nested specs listed by path id

- **GIVEN** a spec at `openspec/specs/platform/session/spec.md` (paths built with the platform's separators on disk)
- **WHEN** the dashboard is rendered
- **THEN** the spec appears with id `platform/session`, using `/` separators on every platform
- **AND** its requirements are counted like any flat spec's
