## ADDED Requirements

### Requirement: Nested Spec Discovery

Spec commands SHALL discover specs at any folder depth under `openspec/specs/`, identifying each spec by its capability path relative to the specs root, written with `/` separators on every platform.

#### Scenario: Listing nested specs

- **GIVEN** a spec at `openspec/specs/platform/session/spec.md` (paths built with the platform's separators on disk)
- **WHEN** running `openspec spec list`
- **THEN** include it with id `platform/session`
- **AND** order the list deterministically by code-point comparison of ids, independent of the process locale

#### Scenario: Showing and validating a nested spec

- **WHEN** running `openspec spec show platform/session` or `openspec spec validate platform/session`
- **THEN** resolve the id to `openspec/specs/platform/session/spec.md` and operate on it exactly as on a flat spec

#### Scenario: Root-level spec.md is not a spec

- **GIVEN** a file at `openspec/specs/spec.md` (directly in the specs root, outside any capability folder)
- **WHEN** running `openspec spec list`
- **THEN** do not list it (specs live in capability folders)
