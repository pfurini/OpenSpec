## Purpose

Define the deterministic `openspec reverse` helper commands that the reverse-baseline skill
orchestrates: a read-only repo inventory (`scan`) and an idempotent spec scaffolder (`scaffold`).

## ADDED Requirements

### Requirement: Reverse scan inventory
The system SHALL provide `openspec reverse scan` that produces a read-only inventory of the codebase
and a candidate capability map without invoking any language model.

#### Scenario: Read-only inventory
- **WHEN** the user runs `openspec reverse scan`
- **THEN** the command SHALL enumerate source, test, and doc files for the working tree
- **AND** SHALL NOT write files or make network requests

#### Scenario: Ignore vendored and generated files
- **WHEN** scanning the working tree
- **THEN** the command SHALL honor `.gitignore`
- **AND** SHALL exclude a vendored/generated ignore set (e.g. dependency, build-output, and
  generated files) from the inventory

#### Scenario: Candidate capability map
- **WHEN** the inventory is produced
- **THEN** the command SHALL propose candidate capability groupings with approximate file counts
- **AND** SHALL cross-check against existing `openspec/specs/` so already-specified capabilities are
  marked rather than duplicated

#### Scenario: Machine-readable output
- **WHEN** the user passes `--json`
- **THEN** the command SHALL emit a stable structured report consumable by the skill
- **AND** SHALL otherwise print a human-readable summary

### Requirement: Reverse scaffold spec skeleton
The system SHALL provide `openspec reverse scaffold <capability>` that creates a canonical baseline
spec skeleton idempotently.

#### Scenario: Create skeleton
- **WHEN** the user runs `openspec reverse scaffold <capability>` and no spec exists for it
- **THEN** the command SHALL create `openspec/specs/<capability>/spec.md` with a Purpose placeholder,
  a `## Requirements` section, and a draft-baseline marker

#### Scenario: Idempotent re-run
- **WHEN** the command runs again for a capability whose spec already exists and is empty/skeleton-only
- **THEN** the result SHALL be unchanged (no duplication)

#### Scenario: Refuse to clobber existing content
- **WHEN** an `openspec/specs/<capability>/spec.md` already exists with non-skeleton content
- **AND** `--force` is not provided
- **THEN** the command SHALL refuse to overwrite it and report actionable guidance

#### Scenario: Invalid capability name
- **WHEN** the provided capability name violates capability slug rules
- **THEN** the command SHALL fail before writing and report the naming requirement
