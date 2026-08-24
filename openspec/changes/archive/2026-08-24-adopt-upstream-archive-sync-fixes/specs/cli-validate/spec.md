## ADDED Requirements

### Requirement: Scenario-loss detection for MODIFIED requirements

Validating a change SHALL report MODIFIED requirement blocks that omit scenarios the current main spec still carries, using the same comparison the archive merge enforces, so the loss is caught at authoring time instead of at archive time.

#### Scenario: MODIFIED omits a current scenario

- **GIVEN** a change delta whose `## MODIFIED Requirements` block omits a scenario the main spec requirement still carries
- **WHEN** running `openspec validate <change>`
- **THEN** report an error listing each missing scenario name
- **AND** instruct the author to copy the scenarios into the MODIFIED block (a MODIFIED requirement replaces the whole block)

#### Scenario: Comparison follows renames

- **GIVEN** the same delta renames requirement A to B and modifies B
- **WHEN** running `openspec validate <change>`
- **THEN** compare the MODIFIED block against A's scenarios in the main spec (renames apply before modifications)

#### Scenario: Duplicate names and fenced headers

- **WHEN** comparing scenarios
- **THEN** count duplicate scenario names per instance (N copies in the main spec need N in the MODIFIED block)
- **AND** ignore `####` headers that appear only inside fenced code blocks on either side

#### Scenario: Missing baseline stays silent

- **GIVEN** the capability's main spec, or the named requirement, does not exist yet (for example a sister change still in flight)
- **WHEN** running `openspec validate <change>`
- **THEN** report no scenario-loss issue for it (a missing baseline is a different failure, and archive is the gate for it)
