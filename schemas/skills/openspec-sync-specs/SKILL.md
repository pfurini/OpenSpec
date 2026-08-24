---
name: openspec-sync-specs
description: Sync delta specs from a change to main specs. Use when the user wants to update main specs with changes from a delta spec, without archiving the change.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Sync delta specs from a change to main specs.

${STORE_SELECTION_GUIDANCE}

This is an **agent-driven** operation - you will read delta specs and directly edit main specs to apply the changes. Each delta operation is applied whole: a `## MODIFIED Requirements` block replaces the entire requirement block in the main spec, so the delta must already carry every scenario that requirement keeps.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have delta specs (under `specs/` directory).

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Resolve change context**

   Run:
   ```bash
   openspec status --change "<name>" --json
   ```

3. **Find delta specs**

   Use `artifactPaths.specs.existingOutputPaths` from the status JSON as the list of delta spec files.

   Each delta spec file contains sections like:
   - `## ADDED Requirements` - New requirements to add
   - `## MODIFIED Requirements` - Changes to existing requirements
   - `## REMOVED Requirements` - Requirements to remove
   - `## RENAMED Requirements` - Requirements to rename (FROM:/TO: format)

   If no delta specs found, inform user and stop.

4. **For each delta spec, apply changes to main specs**

   For each repo-local capability delta spec path returned by the CLI:

   a. **Read the delta spec** to understand the intended changes

   b. **Read the main spec** at `openspec/specs/<capability>/spec.md` (may not exist yet)

   c. **Apply changes intelligently**:

      **ADDED Requirements:**
      - If requirement doesn't exist in main spec → add it
      - If requirement already exists → update it to match (treat as implicit MODIFIED)

      **MODIFIED Requirements:**
      - Find the requirement in main spec
      - Replace the whole requirement block with the delta version - requirement description and all scenarios
      - The delta block MUST repeat every scenario the requirement keeps, plus the new or edited ones. Omitting a scenario the main spec still carries is refused: `openspec validate` errors and `openspec archive` aborts without touching files, naming each missing scenario
      - Scenarios are matched per instance, so N same-named scenarios in the main spec need N in the delta
      - If the delta block is already byte-identical to the main spec, it is a no-op (already synced) and counts as zero

      **REMOVED Requirements:**
      - Remove the entire requirement block from main spec
      - If no requirement with that name exists, it was already removed - a no-op with a warning, not a failure. A name differing only in letter case or interior whitespace is treated as a typo and fails, naming the exact header to match

      **RENAMED Requirements:**
      - Find the FROM requirement, rename to TO
      - If FROM is gone and TO is already present, the rename landed in an earlier sync - a no-op with a warning

   d. **Create new main spec** if capability doesn't exist yet:
      - Create `openspec/specs/<capability>/spec.md`
      - Use the delta spec's `## Purpose` for the new spec's Purpose section. A Purpose too brief to be readable falls back to the `TBD - ...` placeholder with a warning
      - For a capability that already has a main spec, the delta's Purpose is ignored (with a warning) - edit the main spec's Purpose directly
      - Add Requirements section with the ADDED requirements

5. **Show summary**

   After applying all changes, summarize:
   - Which capabilities were updated
   - What changes were made (requirements added/modified/removed/renamed), counting only operations that changed the file - already-synced operations count as zero
   - Every warning raised along the way (already-removed or already-renamed no-ops, an ignored delta Purpose, a Purpose that fell back to the placeholder, content the merge could not keep)
   - If nothing changed, say "Specs already in sync - no changes needed"

**Delta Spec Format Reference**

```markdown
## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL do the existing thing, now also handling A.

#### Scenario: Existing case (copied verbatim from the main spec)
- **WHEN** user does M
- **THEN** system does N

#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

**Key Principle: MODIFIED Is a Wholesale Replacement**

A MODIFIED block replaces the requirement block, it does not merge into it:
- Copy everything you keep - the requirement statement and every scenario that survives - then add or edit on top
- Dropping a scenario is never silent: the validator and archive refuse the sync and list each scenario you would have lost
- A deliberate removal is a real edit - drop the scenario from the delta block only when the requirement genuinely no longer covers it

**Output On Success**

```
## Specs Synced: <change-name>

Updated main specs:

**<capability-1>**:
- Added requirement: "New Feature"
- Modified requirement: "Existing Feature" (added 1 scenario)

**<capability-2>**:
- Created new spec file (Purpose carried from the delta)
- Added requirement: "Another Feature"

Warnings:
- <capability-1> - REMOVED requirement "Old Feature" is already gone from the main spec (no-op).

Main specs are now updated. The change remains active - archive when implementation is complete.
```

**Guardrails**
- Read both delta and main specs before making changes
- Preserve existing content the delta does not operate on; inside a MODIFIED block, preservation means copying it into the block
- If something is unclear, ask for clarification
- Show what you're changing as you go
- The operation should be idempotent - running twice should give same result
- A change whose deltas empty a capability entirely can retire that capability's spec file, but only when the change declares `retire_capabilities: true` in its `.openspec.yaml`; without the marker, syncing refuses and names the way out
