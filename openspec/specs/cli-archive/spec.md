# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following OpenSpec conventions.

## Command Syntax
```bash
openspec archive [change-name] [--yes|-y]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)

## Requirements

### Requirement: Change Selection

The command SHALL support both interactive and direct change selection methods.

#### Scenario: Interactive selection

- **WHEN** no change-name is provided
- **THEN** display interactive list of available changes (excluding archive/)
- **AND** allow user to select one

#### Scenario: Direct selection

- **WHEN** change-name is provided
- **THEN** use that change directly
- **AND** validate it exists

#### Scenario: No terminal available for selection

- **GIVEN** stdin or stdout is not a TTY
- **WHEN** no change-name is provided
- **THEN** do not render the interactive picker (no ANSI escape sequences are written)
- **AND** fail with guidance naming the rerun command `openspec archive <change-name>` carrying the flags the caller already passed plus `--yes`
- **AND** exit with a non-zero status code

#### Scenario: Selection input ends without an answer

- **WHEN** the interactive list is shown and stdin closes without an answer (EOF)
- **THEN** fail with the same rerun guidance instead of reporting "No change selected" with a success exit code
- **AND** exit with a non-zero status code

### Requirement: Task Completion Check

The command SHALL verify task completion status before archiving to prevent premature archival.

#### Scenario: Incomplete tasks found

- **WHEN** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display all incomplete tasks to the user
- **AND** prompt for confirmation to continue
- **AND** default to "No" for safety

#### Scenario: All tasks complete

- **WHEN** all tasks are complete OR no tasks.md exists
- **THEN** proceed with archiving without prompting

### Requirement: Archive Process

The archive operation SHALL follow a structured process to safely move changes to the archive.

#### Scenario: Performing archive

- **WHEN** archiving a change
- **THEN** execute these steps:
  1. Determine the target archive name (see the date-prefix scenarios below)
  2. Check that the target archive does not already exist, before any main spec is modified
  3. Create archive/ directory if it doesn't exist
  4. Update main specs from the change's future state specs (see Spec Update Process below)
  5. Move the entire change directory to the archive location

#### Scenario: Date prefix for undated change names

- **WHEN** the change name does not already start with a `YYYY-MM-DD-` prefix
- **THEN** generate the target name as `YYYY-MM-DD-[change-name]` using the current date

#### Scenario: Change name already carries a date prefix

- **WHEN** the change name already starts with a `YYYY-MM-DD-` prefix
- **THEN** archive it under its existing name
- **AND** never stack a second date prefix

#### Scenario: Archive already exists

- **WHEN** target archive already exists
- **THEN** fail with error message before any main spec is modified
- **AND** do not overwrite existing archive

#### Scenario: Successful archive

- **WHEN** move succeeds
- **THEN** display success message with archived name and list of updated specs

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL apply delta changes to main specs to reflect the deployed reality.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** parse and apply delta changes as defined in openspec-conventions
- **AND** validate all operations before applying

#### Scenario: Validating delta changes

- **WHEN** processing delta changes
- **THEN** perform validations as specified in openspec-conventions
- **AND** if validation fails, show specific errors and abort

#### Scenario: Conflict detection

- **WHEN** applying deltas would create duplicate requirement headers
- **THEN** abort with error message showing the conflict
- **AND** suggest manual resolution

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied.

#### Scenario: Displaying confirmation

- **WHEN** prompting for confirmation
- **THEN** display a summary listing every affected capability id, each marked `create` (no main spec yet) or `update` (existing main spec):

  ```
  Specs to update:
    cli-archive: update
    platform/session: create
  ```

- **AND** ask `Proceed with spec updates?`

#### Scenario: Handling confirmation response

- **WHEN** waiting for user confirmation
- **THEN** default to "Yes" (declining requires an explicit "n" or "no"); declining never destroys anything, because it skips the spec sync rather than acting
- **AND** skip confirmation when `--yes` or `-y` flag is provided

#### Scenario: User declines confirmation

- **WHEN** user declines the confirmation
- **THEN** skip the spec updates and proceed with the archive of the change directory
- **AND** display message: "Skipping spec updates. Proceeding with archive."

#### Scenario: Confirmation cannot be answered

- **WHEN** a confirmation is required and stdin closes without an answer (EOF)
- **THEN** abort with a message naming the decision that needed an answer
- **AND** include the rerun command with the caller's own flags preserved (for example `--skip-specs`, `--no-validate`) plus `--yes`
- **AND** exit with a non-zero status code

#### Scenario: Plain prompts on redirected streams

- **GIVEN** stdin or stdout is not a TTY
- **WHEN** a yes/no confirmation is required
- **THEN** ask with a single plain-text line containing no ANSI escape sequences
- **AND** accept one piped answer line (for example `printf 'y\n' | openspec archive ...`), matching `y`/`yes` and `n`/`no` prefixes case-insensitively and taking the default for any other input

### Requirement: Error Conditions

The command SHALL handle various error conditions gracefully.

#### Scenario: Handling errors

- **WHEN** errors occur
- **THEN** handle the following conditions:
  - Missing openspec/changes/ directory
  - Change not found
  - Archive target already exists
  - File system permissions issues

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all spec update operations and proceeds directly to archiving.

#### Scenario: Skipping spec updates with flag

- **WHEN** executing `openspec archive <change> --skip-specs`
- **THEN** skip spec discovery and update confirmation
- **AND** proceed directly to moving the change to archive
- **AND** display a message indicating specs were skipped

### Requirement: Non-blocking confirmation

The archive operation SHALL proceed when the user declines spec updates instead of cancelling the entire operation.

#### Scenario: User declines spec update confirmation

- **WHEN** the user declines spec update confirmation
- **THEN** skip spec updates
- **AND** continue with the archive operation
- **AND** display a success message indicating specs were not updated

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations.

#### Scenario: Showing delta application

- **WHEN** applying delta changes
- **THEN** display for each spec:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
- **AND** count only operations that changed the file (operations already reflected in the main spec count as zero)
- **AND** use standard output symbols (+ ~ - →) as defined in openspec-conventions:

  ```
  Applying changes to specs/user-auth/spec.md:
    + 2 added
    ~ 3 modified
    - 1 removed
    → 1 renamed
  ```

#### Scenario: All operations already synced

- **WHEN** every delta operation is already reflected in the main specs
- **THEN** write no spec files
- **AND** report zero totals and state that specs were already in sync

#### Scenario: Non-blocking merge warnings

- **WHEN** the spec merge produces non-blocking warnings (for example a REMOVED requirement that was already gone, or a retired capability's deleted file)
- **THEN** display each warning in human-readable output
- **AND** include the warnings in the JSON result under a `warnings` array when `--json` is used

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity.

#### Scenario: Pre-archive validation

- **WHEN** executing `openspec archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: Force archive without validation

- **WHEN** executing `openspec archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation

### Requirement: Failure Exit Status

The command SHALL exit with a non-zero status code whenever it aborts without completing the archive, in human-readable output as well as JSON output.

#### Scenario: Validation failure abort

- **WHEN** pre-archive validation fails and the command aborts
- **THEN** the process exit code is non-zero

#### Scenario: Spec preparation failure abort

- **WHEN** building the updated specs fails and the command aborts
- **THEN** the process exit code is non-zero
- **AND** no main spec file has been modified

#### Scenario: Rebuilt spec validation abort

- **WHEN** a rebuilt spec fails validation and the command aborts
- **THEN** the process exit code is non-zero
- **AND** no main spec file has been modified

### Requirement: Capability Retirement

When a change's deltas remove the last requirement a capability has, and the change declares `retire_capabilities: true` in its `.openspec.yaml`, the archive SHALL retire the capability by deleting its main spec instead of aborting on a spec it cannot write.

#### Scenario: Declared retirement of an emptied capability

- **GIVEN** a change whose REMOVED entries delete every requirement an existing capability has
- **AND** the change's `.openspec.yaml` declares `retire_capabilities: true`
- **WHEN** archiving the change
- **THEN** delete the capability's main spec file
- **AND** remove any directories the deletion leaves empty, never removing the specs root itself and never following a symlinked directory
- **AND** report the deleted path and how to recover the file from version control

#### Scenario: Retirement not declared is never a dead end

- **GIVEN** the same change without `retire_capabilities: true` in its `.openspec.yaml`
- **WHEN** archiving the change
- **THEN** abort without modifying any file (the rebuilt spec has no requirements)
- **AND** the abort message names `retire_capabilities: true` in `.openspec.yaml` as the way to retire the capability and rerun

#### Scenario: Spec holds content the merge cannot account for

- **GIVEN** the emptied spec still contains non-blank content outside its title, its `## Purpose` section, the `## Requirements` header, and its requirement blocks (for example a hand-written `### Notes` section)
- **WHEN** archiving the change, with or without the marker declared
- **THEN** refuse the retirement without modifying the spec
- **AND** quote the unaccounted lines so the author can move them into `## Purpose` or a requirement, or delete the spec deliberately

#### Scenario: Marker that cannot be honored

- **GIVEN** `retire_capabilities` appears in `.openspec.yaml` but the file is not valid change metadata (unparseable YAML, a failing metadata shape, or a schema name that does not resolve)
- **WHEN** archiving the change
- **THEN** treat the marker as not declared
- **AND** state why the marker could not be honored

#### Scenario: No retirement without validation

- **WHEN** archiving with `--no-validate`
- **THEN** never retire a capability (write behavior is unchanged from before this feature)

#### Scenario: Already-empty spec is not retired

- **GIVEN** a capability whose main spec already had no requirements before this change
- **AND** the change's deltas remove nothing from it
- **WHEN** archiving the change
- **THEN** do not delete the spec (the pre-existing abort behavior is unchanged)

### Requirement: Nested Delta Spec Discovery

The archive SHALL discover delta specs at any folder depth under the change's `specs/` directory and merge each one into the main spec at the same relative path.

#### Scenario: Nested capability delta

- **GIVEN** a change with a delta spec at `specs/platform/session/spec.md` (paths built with the platform's separators on disk)
- **WHEN** archiving the change
- **THEN** the delta merges into the main spec at `openspec/specs/platform/session/spec.md`
- **AND** the capability is reported by its path id `platform/session`, with `/` separators on every platform

#### Scenario: Flat layout unchanged

- **GIVEN** a change with delta specs only at `specs/<capability>/spec.md`
- **WHEN** archiving the change
- **THEN** discovery and merge behave exactly as before

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use
