## Purpose

Define the agent skill that drafts an OpenSpec **baseline** (initial `openspec/specs/<capability>/spec.md`
set) from a brownfield codebase, optimized for faithful drafts under human review rather than
autonomous correctness.

## ADDED Requirements

### Requirement: Reverse baseline skill
The system SHALL provide an `openspec-reverse` skill that drafts baseline specs from an existing
codebase, is installed alongside the other OpenSpec skills via `init`/`update`, and is referenced
by its tool-agnostic skill name (invoked via the agent's Skill tool).

#### Scenario: Inventory before extraction
- **WHEN** the agent runs the `openspec-reverse` skill
- **THEN** the agent SHALL first run `openspec reverse scan` to obtain the file inventory and
  candidate capability map
- **AND** SHALL NOT begin drafting requirements before the inventory is available

#### Scenario: Human ratifies the capability map
- **WHEN** the candidate capability map is available
- **THEN** the agent SHALL present it for confirmation (e.g. via the question prompt tool)
- **AND** SHALL NOT auto-select or silently finalize capability boundaries

#### Scenario: Capability-at-a-time extraction
- **WHEN** the user confirms one or more capabilities to baseline
- **THEN** the agent SHALL draft, scaffold, write, and validate specs one capability at a time
- **AND** SHALL NOT emit a whole-repo spec set in a single unreviewed pass

### Requirement: Signal priority for inference
The agent SHALL prefer intent-bearing sources over raw implementation code when inferring requirements.

#### Scenario: Tests and docs lead, code fills gaps
- **WHEN** drafting requirements for a capability
- **THEN** the agent SHALL derive behavior primarily from tests, then README/`docs/**`/ADRs
- **AND** SHALL use implementation code only to fill gaps not covered by tests or docs

### Requirement: Draft framing and no fabrication
Generated specs SHALL be marked as drafts requiring review, and the agent SHALL NOT invent intent it
cannot confirm.

#### Scenario: Draft banner on output
- **WHEN** the agent writes a generated baseline spec
- **THEN** the file SHALL carry a draft-baseline marker indicating human review is required

#### Scenario: Unconfirmed behavior is recorded, not fabricated
- **WHEN** the agent cannot confirm whether a behavior is intended from tests, docs, or code
- **THEN** the agent SHALL record it as an explicit open question in the draft
- **AND** SHALL NOT promote it to a `SHALL` requirement

#### Scenario: Possible-bug behavior is flagged
- **WHEN** current code behavior may be a bug rather than intended behavior
- **THEN** the agent SHALL flag it for the reviewer
- **AND** SHALL NOT silently codify it as a requirement

#### Scenario: Capability with nothing confirmable is skipped
- **WHEN** the agent cannot confirm a single requirement for a capability (only open questions)
- **THEN** the agent SHALL NOT write a spec file for that capability
- **AND** SHALL carry its open questions into the completion summary as not-baselined

### Requirement: Validate generated baselines
The agent SHALL validate each generated capability spec before reporting completion.

#### Scenario: Validation per capability
- **WHEN** a capability draft is written
- **THEN** the agent SHALL run `openspec validate` on the result
- **AND** SHALL surface validation failures for that capability before proceeding
