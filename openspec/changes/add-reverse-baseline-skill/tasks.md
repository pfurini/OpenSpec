## 1. CLI: `openspec reverse scan` (deterministic inventory)

- [x] 1.1 Add `src/core/reverse/inventory.ts` — walk the working tree honoring `.gitignore` + a
      vendored/generated ignore set; classify files as source/test/doc; detect language by extension
- [x] 1.2 Add capability-heuristic that proposes groupings from top-level modules/dirs and
      cross-checks against existing `openspec/specs/` to avoid duplicating known capabilities
- [x] 1.3 Add `src/commands/reverse.ts` exporting `registerReverseCommand(rootProgram)` that builds a
      `.command('reverse')` group with a `scan` subcommand (`--path`, `--json`); import and call it in
      `src/cli/index.ts`, mirroring `registerSpecCommand` (`src/commands/spec.ts`)
- [x] 1.4 Register `reverse` (and its subcommands/flags) in `src/core/completions/command-registry.ts`
      so shell completions cover it
- [x] 1.5 Emit a stable JSON report (file inventory, intent sources, candidate capabilities, counts);
      human-readable default output
- [x] 1.6 Guarantee read-only behavior (no writes, no network); add tests for ignore rules,
      classification, and JSON shape

## 2. CLI: `openspec reverse scaffold <capability>`

- [x] 2.1 Create canonical `openspec/specs/<capability>/spec.md` skeleton (Purpose placeholder,
      `## Requirements`, draft banner comment)
- [x] 2.2 Make it idempotent; refuse to overwrite an existing non-empty spec without `--force`
- [x] 2.3 Validate capability name (slug rules) and report actionable errors
- [x] 2.4 Add tests for create, idempotent re-run, `--force`, and refuse-to-clobber paths

## 3. Skill authoring: `schemas/skills/openspec-reverse/`

- [x] 3.1 Author `SKILL.md` (frontmatter `name: openspec-reverse` MUST equal dir name; description,
      license, compatibility, metadata)
- [x] 3.2 Write the Flow: preflight CLI check → `reverse scan` → present capability map via
      `AskUserQuestion` → per-capability test-first extraction → `reverse scaffold` → write draft →
      `openspec validate`
- [x] 3.3 Encode signal priority (tests → docs/ADRs/README → code) and the draft/confirmed-only/
      no-fabrication guardrails from the design's Non-Goals
- [ ] 3.4 Add `references/*.md` for the extraction heuristics and altitude guidance if the body grows
      past a single readable file (use `<!--bundle:start-->`/`<!--bundle:end-->` markers)

## 4. Register the skill in the generated catalog

- [x] 4.1 Add `src/core/templates/workflows/reverse.ts` thin factory (`loadSkillSource('openspec-reverse', …)`)
- [x] 4.2 Re-export `getReverseSkillTemplate` from `src/core/templates/skill-templates.ts`
- [x] 4.3 Add registry entry in `getSkillTemplates()` (`dirName: 'openspec-reverse', workflowId: 'reverse'`)
- [x] 4.4 Add `'openspec-reverse'` to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`
- [x] 4.5 Run `pnpm run rebaseline:skills`; verify parity test green; commit updated test file
 Docs

- [ ] 5.1 Document the brownfield baselining workflow (scan → ratify-per-capability → validate)
- [ ] 5.2 State the non-goals (not authoritative, not idempotent across LLM runs, confirmed-only)
- [ ] 5.3 Cross-link from `docs/concepts.md` brownfield section and `README.md`

## 6. Validation

- [ ] 6.1 `pnpm run build` then `pnpm test` green
- [ ] 6.2 `openspec validate add-reverse-baseline-skill --strict` passes for this change
- [ ] 6.3 Manual end-to-end dry run against a small brownfield fixture repo; confirm drafts validate
