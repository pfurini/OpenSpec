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

<!-- The decomposition. THIS IS THE CONTRACT the downstream wave map consumes.
     Each unit: purpose (one line), interface (inputs/outputs), depends-on (other units /
     existing modules), and the project skills that govern it (by SKILL.md path - the
     ground-truth references the wave map and JIT plans cite as Mandatory Reading). -->

| Component | Purpose | Interface | Depends on | Skills |
|-----------|---------|-----------|------------|--------|
| `<unit>`  | <one line> | <inputs/outputs> | <units / modules> | `<path/to/SKILL.md>` |

**Slice composition:**
<!-- The dependency edges between units, and for each capability: independently valuable
     (a split signal - flag it) vs simply unordered (ordering freedom). NOT "parallelizable":
     code-writing in one change is single-worktree/serial; separately-valuable work is a
     sibling change, not a parallel unit. This map seeds the wave map's ordering. -->

## Data Model / API Shapes

<!-- Concrete enough that an implementer makes no design decisions. -->

## Data Flow & Error Handling

<!-- The happy path, and what happens when each step fails. -->

## Testing Approach

<!-- DECIDE the test layer per spec scenario here (transcribed verbatim into the tasks
     coverage map - tasks decides nothing). Cheapest layer that genuinely PROVES the
     scenario; proves dominates cheap. Apply the project test-strategy skill's table if one
     exists. Multi-page/gate/redirect flows -> e2e, not unit piles. -->

| Spec scenario | Test layer | Why this layer |
|---------------|-----------|----------------|
| `<scenario>`  | unit/integration/component/e2e | <what it proves> |

## Risks / Trade-offs

<!-- Known risks and trade-offs. [Risk] -> Mitigation -->

## Migration / Rollback

<!-- Steps to deploy and how to undo, if this touches data, infra, or shared state. -->

## Open Questions

<!-- Outstanding decisions or unknowns to resolve. -->
