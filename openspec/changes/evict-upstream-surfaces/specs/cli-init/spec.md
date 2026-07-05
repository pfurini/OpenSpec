# cli-init — delta

## ADDED Requirements

### Requirement: Full workflow skill set installation
The command SHALL install the complete set of workflow skills bundled with the CLI for each selected AI tool, with no profile- or configuration-driven subsetting. The installed set is owned by a single enumeration whose parity with the bundle is enforced by an automated guard (see design.md); it is not configurable at install time.

#### Scenario: No workflow subset selection
- **WHEN** `openspec init` runs, interactively or non-interactively
- **THEN** it offers no prompt, flag, or configuration for selecting a subset of workflow skills
- **AND** every bundled workflow skill is installed for each selected tool

#### Scenario: Global config cannot restrict the skill set
- **WHEN** `~/.config/openspec/config.json` contains a retired `profile` or `workflows` key
- **THEN** `openspec init` installs the full workflow skill set regardless of those values
