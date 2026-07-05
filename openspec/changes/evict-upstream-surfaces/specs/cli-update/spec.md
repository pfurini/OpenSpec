# cli-update — delta

## ADDED Requirements

### Requirement: Full workflow skill set convergence
The command SHALL converge each configured tool to the complete set of bundled workflow skills, with no profile-drift detection and no legacy-layout cleanup interaction.

#### Scenario: Update installs missing workflow skills
- **WHEN** `openspec update` runs in a project where a configured tool is missing one or more bundled workflow skills
- **THEN** the missing skills are installed so the tool has the full set
- **AND** no prompt asks the user to choose a workflow subset

#### Scenario: No legacy cleanup interaction
- **WHEN** `openspec update` runs in any supported project
- **THEN** it performs no legacy-artifact detection and shows no legacy-cleanup confirmation
