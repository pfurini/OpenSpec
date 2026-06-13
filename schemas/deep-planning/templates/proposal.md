## Why

<!-- Explain the motivation for this change. What problem does this solve? Why now? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities, modifications, or removals. -->

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier. Each creates specs/<name>/spec.md -->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `<existing-name>`: <what requirement is changing>

## Constraints

<!-- The given limits the solution must respect (handed to you by the world - distinct from
     ADRs, which record what the team decided). Group them and make each falsifiable - a number
     or named rule, not an adjective ("p95 < 200ms at 1k RPS", not "fast"). Write `None` for a
     group that genuinely has none; send unknowns to design's open questions, don't guess. -->

- **Compatibility**: <e.g. must not break the existing admin write path | None>
- **Performance**: <e.g. p95 < 200ms at 1k RPS | None>
- **Security & Compliance**: <e.g. PII never logged; writes go through the auth hook | None>
- **Operational**: <e.g. zero-downtime migration; feature-flag gated | None>

## Impact

<!-- Affected code, APIs, dependencies, systems -->
