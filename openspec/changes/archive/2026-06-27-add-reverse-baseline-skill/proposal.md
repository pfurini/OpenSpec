## Why

OpenSpec is "brownfield-first" only in the sense that *delta* specs make it cheap to describe
**changes** to existing behavior. There is no path to establish the **baseline** — the initial
`openspec/specs/<capability>/spec.md` set — from a codebase that was never built with OpenSpec.
Today users either hand-author every spec from scratch or skip baselining entirely, which means
deltas have nothing to diff against.

The common request is "reverse-engineer specs from my existing code." That is fundamentally an
**inference** task (recover intended behavior — the WHAT — from code that only encodes the HOW),
not a parsing task. It cannot be a fully deterministic command, and it cannot be trusted as
authoritative output. But we can deliver a high-value **draft baseline generator**: an agent-driven
skill that produces reviewable spec drafts, backed by deterministic CLI helpers for the mechanical
parts (repo inventory, scaffolding, validation).

The explicit goal is a **reviewable first draft a human ratifies**, not "point it at a repo and
trust the specs."

## What Changes

### 1. Add the `openspec-reverse` agent skill

A new agent-driven skill that orchestrates baseline extraction:

- Runs `openspec reverse scan` to inventory the repo and get a candidate capability map.
- Works **one capability at a time** with explicit human ratification (no big-bang whole-repo dump).
- Prioritizes **intent sources over raw code**: tests (executable statements of intent), then
  README/`docs/**`/ADRs, then implementation code as the fallback signal.
- Drafts `### Requirement:` / `#### Scenario:` blocks at behavioral altitude, scaffolds the file via
  `openspec reverse scaffold`, writes the draft, and validates it with `openspec validate`.
- Marks every generated file as a **DRAFT BASELINE requiring review**, and records what it could not
  determine rather than inventing requirements.

### 2. Add the `openspec reverse` CLI command namespace (deterministic helpers, no LLM)

- `openspec reverse scan` — read-only repo inventory. Enumerates source/test files (respecting
  `.gitignore` and a vendored/generated ignore set), detects languages, locates existing intent
  sources, and proposes heuristic capability groupings. Emits a structured (`--json`) report the
  skill consumes.
- `openspec reverse scaffold <capability>` — idempotently create an `openspec/specs/<capability>/spec.md`
  skeleton (Purpose placeholder + `## Requirements` + draft banner). Never overwrites existing
  non-empty specs without `--force`.

### 3. Register the skill in the generated catalog

Add `openspec-reverse` to `SKILL_NAMES` and the template registry so it is installed/updated
alongside the other OpenSpec skills, authored as a directory under `schemas/skills/openspec-reverse/`,
and re-baselined in the skill-template parity hashes.

### 4. Document the brownfield baselining workflow

Add docs explaining the scan → ratify-per-capability → validate loop, and stating the non-goals
(not authoritative, not idempotent across LLM runs, codifies-only-what-is-confirmed) so expectations
are set.

## Capabilities

### New Capabilities

- `reverse-baseline-skill`: The agent skill contract for draft baseline extraction — test-first
  signal priority, capability-at-a-time human ratification, draft framing, and validation.
- `cli-reverse`: The deterministic `openspec reverse scan` / `openspec reverse scaffold` helper
  commands the skill orchestrates.

## Impact

- `schemas/skills/openspec-reverse/SKILL.md` (+ `references/*.md`) — authored skill source.
- `src/core/templates/workflows/reverse.ts` — thin `loadSkillSource('openspec-reverse', …)` factory.
- `src/core/templates/skill-templates.ts` — re-export the new factory.
- `src/core/shared/skill-generation.ts` — add the registry entry (`workflowId: 'reverse'`).
- `src/core/shared/tool-detection.ts` — add `openspec-reverse` to `SKILL_NAMES`.
- `src/commands/reverse.ts` (new) + `src/cli/index.ts` registration (commander) — `scan` / `scaffold`
  subcommands.
- `src/core/completions/command-registry.ts` — register `reverse` for shell completions.
- `src/core/reverse/` (new) — deterministic inventory + capability-heuristic + scaffold logic.
- `docs/` — brownfield baselining workflow + non-goals.
- `test/core/templates/skill-templates-parity.test.ts` — re-baselined hashes (`pnpm run rebaseline:skills`).
- `test/commands/reverse.test.ts`, `test/core/reverse/*.test.ts` — CLI + inventory coverage.
