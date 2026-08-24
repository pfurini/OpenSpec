## ADDED Requirements

### Requirement: Scenario Preservation

The sync SHALL refuse a whole-block replacement - a MODIFIED requirement, or an ADDED requirement whose name already exists in the main spec - whose block omits scenarios the main spec still carries, so applying a change can never silently drop scenario content.

#### Scenario: MODIFIED block drops a scenario

- **GIVEN** a main spec requirement carrying a scenario the MODIFIED block does not contain
- **WHEN** syncing the change
- **THEN** refuse the operation, naming every missing scenario
- **AND** change no files

#### Scenario: ADDED block over an existing requirement drops a scenario

- **GIVEN** a main spec requirement carrying a scenario
- **WHEN** the delta ADDs a requirement with the same name whose block does not contain that scenario
- **THEN** refuse the operation, naming every missing scenario
- **AND** change no files

#### Scenario: Duplicate scenario names are counted per instance

- **GIVEN** a main spec requirement carrying N scenarios with the same name and a MODIFIED block carrying fewer than N
- **WHEN** syncing the change
- **THEN** report the dropped instances (matching is per instance, not per unique name)

#### Scenario: Scenario headers inside fenced code are ignored

- **GIVEN** `####` headers that appear only inside fenced code blocks, on either side of the comparison
- **WHEN** comparing scenarios
- **THEN** ignore them (they are examples, not scenarios)

### Requirement: Content Preservation Warnings

The sync SHALL warn whenever an operation would silently discard authored content instead of dropping it without a word.

#### Scenario: Note absorbed into a removed or replaced requirement

- **GIVEN** a requirement block whose body carries a trailing section under a heading the sync does not recognize (for example a `# Note` written below the scenarios)
- **WHEN** a delta removes or replaces that block without retaining the trailing section
- **THEN** warn, naming the heading
- **AND** suggest moving it above `## Requirements` or under its own requirement to keep it

#### Scenario: Delta Purpose ignored for an existing spec

- **GIVEN** a delta spec with a `## Purpose` section that differs from the existing main spec's Purpose
- **WHEN** syncing the change
- **THEN** keep the main spec's Purpose unchanged
- **AND** warn that the delta Purpose was ignored and the main spec must be edited directly

### Requirement: Canonical Output Formatting

Rebuilt main specs SHALL keep canonical Markdown spacing, so syncing never reformats a well-formatted spec.

#### Scenario: Blank lines around the Requirements header

- **WHEN** a main spec is rebuilt
- **THEN** exactly one blank line separates `## Requirements` from the content before it and from the first requirement after it
- **AND** runs of more than one blank line are collapsed to one

#### Scenario: End-of-file canonicalization

- **WHEN** a main spec is rebuilt
- **THEN** the file ends with exactly one trailing newline

#### Scenario: Sync is byte-stable

- **GIVEN** a well-formatted main spec whose deltas are already applied
- **WHEN** syncing runs again
- **THEN** the file content is byte-for-byte unchanged

## MODIFIED Requirements

### Requirement: Delta Reconciliation Logic

The agent SHALL reconcile main specs with delta specs using the delta operation headers.

#### Scenario: ADDED requirements

- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** the requirement does not exist in main spec
- **THEN** add the requirement to main spec

#### Scenario: ADDED requirement already exists

- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** a requirement with the same name already exists in main spec
- **THEN** update the existing requirement to match the delta version
- **AND** apply the Scenario Preservation guard first (a block that omits scenarios the main spec still carries is refused, not applied)

#### Scenario: ADDED requirement already synced

- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** a requirement with the same name and identical content already exists in main spec
- **THEN** treat the operation as already applied (a no-op, not a conflict)

#### Scenario: MODIFIED requirements

- **WHEN** delta contains `## MODIFIED Requirements` with a requirement
- **AND** the requirement exists in main spec
- **THEN** replace the requirement in main spec with the delta version

#### Scenario: MODIFIED requirement already synced

- **WHEN** delta contains `## MODIFIED Requirements` with a requirement whose content is already identical in main spec
- **THEN** treat the operation as already applied and count it as zero

#### Scenario: REMOVED requirements

- **WHEN** delta contains `## REMOVED Requirements` with a requirement name
- **AND** the requirement exists in main spec
- **THEN** remove the requirement from main spec

#### Scenario: REMOVED requirement already gone

- **WHEN** delta contains `## REMOVED Requirements` with a requirement name
- **AND** no requirement with that name exists in main spec
- **AND** no requirement differing only in letter case or interior whitespace exists either
- **THEN** treat it as already removed, with a warning (a no-op, not a failure)

#### Scenario: REMOVED near-miss is a typo, not a no-op

- **WHEN** delta contains `## REMOVED Requirements` with a requirement name
- **AND** main spec carries a requirement whose name differs only in letter case or interior whitespace
- **THEN** fail, naming the exact header to match

#### Scenario: RENAMED requirements

- **WHEN** delta contains `## RENAMED Requirements` with FROM:/TO: format
- **AND** the FROM requirement exists in main spec
- **THEN** rename the requirement to the TO name

#### Scenario: RENAMED already synced

- **WHEN** delta contains a rename whose FROM requirement is gone from main spec
- **AND** the TO requirement is present
- **AND** no near-miss variant of the FROM name remains
- **THEN** treat the rename as already applied (a no-op, not a failure)

#### Scenario: Rename contradicted by a removal

- **WHEN** the same delta names a requirement in `## RENAMED Requirements` (as FROM) and in `## REMOVED Requirements`, including spellings that differ only in case or interior whitespace
- **THEN** fail, reporting the cross-section conflict

#### Scenario: New capability spec

- **WHEN** delta spec exists for a capability not in main specs
- **THEN** create new main spec file at `openspec/specs/<capability>/spec.md`

#### Scenario: New capability carries the delta's Purpose

- **WHEN** creating a new main spec for a capability
- **AND** the delta spec has a non-empty `## Purpose` section
- **THEN** the new main spec uses that Purpose instead of a TBD placeholder
- **AND** fall back to the placeholder (with a warning) when carrying the Purpose over would leave the new spec unreadable

### Requirement: Skill Output

The skill SHALL provide clear feedback on what was applied.

#### Scenario: Show applied changes

- **WHEN** reconciliation completes successfully
- **THEN** display summary of changes per capability:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
- **AND** count only operations that changed the file (already-synced operations count as zero)

#### Scenario: No changes needed

- **WHEN** main specs already match delta specs
- **THEN** display "Specs already in sync - no changes needed"

#### Scenario: Warnings are surfaced

- **WHEN** reconciliation produced non-blocking warnings (already-removed no-ops, ignored delta Purpose, dropped-note warnings)
- **THEN** display each warning alongside the summary
