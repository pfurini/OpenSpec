## Context

<!-- Background and current state, cited by path:line. Constraints. Relevant ADRs (reference, don't re-argue). -->

## Goals / Non-Goals

**Goals:**
<!-- What this design aims to achieve -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions

<!-- Key technical choices and rationale (why X over Y?). Reference ADRs for load-bearing ones. -->

## Components & Dependencies

<!-- The decomposition. THIS IS THE CONTRACT the downstream task builder consumes.
     Each unit: purpose (one line), interface (inputs/outputs), depends-on (other units / existing modules). -->

| Component | Purpose | Interface | Depends on |
|-----------|---------|-----------|------------|
| `<unit>`  | <one line> | <inputs/outputs> | <units / modules> |

**Build sequence & parallelism:**
<!-- Which units are independent (parallelizable) vs ordered (must follow a dependency). -->

## Data Model / API Shapes

<!-- Concrete enough that an implementer makes no design decisions. -->

## Data Flow & Error Handling

<!-- The happy path, and what happens when each step fails. -->

## Testing Approach

<!-- What to cover at unit / integration / e2e, tied to the spec scenarios. -->

## Risks / Trade-offs

<!-- Known risks and trade-offs. [Risk] -> Mitigation -->

## Migration / Rollback

<!-- Steps to deploy and how to undo, if this touches data, infra, or shared state. -->

## Open Questions

<!-- Outstanding decisions or unknowns to resolve. -->
