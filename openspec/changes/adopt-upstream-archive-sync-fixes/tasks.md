Each `## Wave N` is one fresh-session vertical slice, proven test-first. The single
`- [ ]` per wave is the only progress tick and means "wave gate passed".

## Carried-over Open Questions

- Whether the deferred hardening (fingerprints/claims/rollback) and #1499 path confinement become one `adopt-upstream-archive-hardening` change or two — decided at the next shopping-doc pass; no wave here depends on it.
- Whether A4's #1361 switches the archive date to local time — this change keeps UTC; no wave here depends on it.

## Coverage map

| Scenario | Layer | Named test | Wave |
| ---------- | ------- | ------------ | ------ |
| cli-archive/Validation failure abort | e2e | `test/cli-e2e/archive-exit-code.test.ts` (new) | 0 |
| cli-archive/Spec preparation failure abort | e2e | `test/cli-e2e/archive-exit-code.test.ts` (new) | 0 |
| cli-archive/Rebuilt spec validation abort | e2e | `test/cli-e2e/archive-exit-code.test.ts` (new) | 0 |
| cli-archive/Performing archive | integration | `test/core/archive.test.ts` (extend: destination-before-merge ordering) | 0 |
| cli-archive/Date prefix for undated change names | integration | `test/core/archive.test.ts` (extend) | 0 |
| cli-archive/Change name already carries a date prefix | integration | `test/core/archive.test.ts` (extend) | 0 |
| cli-archive/Archive already exists | integration | `test/core/archive.test.ts` (existing, extend: no-spec-writes assertion) | 0 |
| cli-archive/Successful archive | integration | `test/core/archive.test.ts` (existing) | 0 |
| specs-sync-skill/ADDED requirements | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/ADDED requirement already exists | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/ADDED requirement already synced | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/MODIFIED requirements | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/MODIFIED requirement already synced | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/REMOVED requirements | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/REMOVED requirement already gone | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/REMOVED near-miss is a typo, not a no-op | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/RENAMED requirements | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/RENAMED already synced | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/Rename contradicted by a removal | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/New capability spec | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/New capability carries the delta's Purpose | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/Note absorbed into a removed or replaced requirement | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/Delta Purpose ignored for an existing spec | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/Blank lines around the Requirements header | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/End-of-file canonicalization | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/Sync is byte-stable | unit | `test/core/specs-apply.test.ts` (new) | 1 |
| specs-sync-skill/Show applied changes | integration | `test/core/archive.test.ts` (extend; same engine as Display Output) | 1 |
| specs-sync-skill/No changes needed | integration | `test/core/archive.test.ts` (extend) | 1 |
| specs-sync-skill/Warnings are surfaced | integration | `test/core/archive.test.ts` (extend) | 1 |
| cli-archive/Showing delta application | integration | `test/core/archive.test.ts` (extend: applied-only counts) | 1 |
| cli-archive/All operations already synced | integration | `test/core/archive.test.ts` (extend) | 1 |
| cli-archive/Non-blocking merge warnings | integration | `test/core/archive.test.ts` (extend: `--json` warnings array) | 1 |
| specs-sync-skill/MODIFIED block drops a scenario | unit | `test/core/specs-apply.test.ts` (extend) | 2 |
| specs-sync-skill/Duplicate scenario names are counted per instance | unit | `test/core/parsers/requirement-blocks.test.ts` (extend) | 2 |
| specs-sync-skill/Scenario headers inside fenced code are ignored | unit | `test/core/parsers/requirement-blocks.test.ts` (extend) | 2 |
| cli-validate/MODIFIED omits a current scenario | integration | `test/core/validation.test.ts` (extend) | 2 |
| cli-validate/Comparison follows renames | integration | `test/core/validation.test.ts` (extend) | 2 |
| cli-validate/Duplicate names and fenced headers | integration | `test/core/validation.test.ts` (extend) | 2 |
| cli-validate/Missing baseline stays silent | integration | `test/core/validation.test.ts` (extend) | 2 |
| cli-archive/Declared retirement of an emptied capability | integration | `test/core/archive.test.ts` (extend) | 3 |
| cli-archive/Retirement not declared is never a dead end | integration | `test/core/archive.test.ts` (extend) | 3 |
| cli-archive/Spec holds content the merge cannot account for | integration | `test/core/archive.test.ts` (extend) | 3 |
| cli-archive/Marker that cannot be honored | integration + unit | `test/core/archive.test.ts` + `test/utils/change-metadata.test.ts` (extend) | 3 |
| cli-archive/No retirement without validation | integration | `test/core/archive.test.ts` (extend) | 3 |
| cli-archive/Already-empty spec is not retired | integration | `test/core/archive.test.ts` (extend) | 3 |
| cli-archive/Nested capability delta | integration | `test/core/archive.test.ts` (extend) | 4 |
| cli-archive/Flat layout unchanged | integration | `test/core/archive.test.ts` (existing suite stays green) | 4 |
| cli-spec/Listing nested specs | e2e | `test/cli-e2e/spec-nested.test.ts` (new) | 4 |
| cli-spec/Showing and validating a nested spec | e2e | `test/cli-e2e/spec-nested.test.ts` (new) | 4 |
| cli-spec/Root-level spec.md is not a spec | e2e | `test/cli-e2e/spec-nested.test.ts` (new) | 4 |
| cli-view/Nested specs listed by path id | integration | `test/core/view.test.ts` (extend) | 4 |
| cli-list/Scanning for changes (default) | integration | `test/core/list.test.ts` (existing) | 4 |
| cli-list/Scanning for specs | integration | `test/core/list.test.ts` (extend) | 4 |
| cli-list/Nested specs listed by path id | integration | `test/core/list.test.ts` (extend) | 4 |
| cli-archive/Interactive selection | integration | `test/core/archive.test.ts` (existing) | 5 |
| cli-archive/Direct selection | integration | `test/core/archive.test.ts` (existing) | 5 |
| cli-archive/No terminal available for selection | integration | `test/core/archive.test.ts` (extend: stubbed `isTTY`) | 5 |
| cli-archive/Selection input ends without an answer | integration | `test/core/archive.test.ts` (extend) | 5 |
| cli-archive/Displaying confirmation | integration | `test/core/archive.test.ts` (existing) | 5 |
| cli-archive/Handling confirmation response | integration | `test/core/archive.test.ts` (existing) | 5 |
| cli-archive/User declines confirmation | integration | `test/core/archive.test.ts` (existing) | 5 |
| cli-archive/Confirmation cannot be answered | unit + integration | `test/utils/interactive.test.ts` + `test/core/archive.test.ts` (extend) | 5 |
| cli-archive/Plain prompts on redirected streams | unit | `test/utils/interactive.test.ts` (extend) | 5 |
| opsx-archive-skill/Archive a change with all artifacts complete | unit | `test/core/templates/skill-templates-parity.test.ts` (re-baseline) | 6 |
| opsx-archive-skill/Successful archive | unit | `test/core/templates/skill-templates-parity.test.ts` (re-baseline) | 6 |
| opsx-archive-skill/Change name already carries a date prefix | unit | `test/core/workflow-skills.test.ts` (extend: prose asserts the guard) | 6 |

## Wave 0

- [ ] `openspec archive 2026-08-01-foo --yes` archives as `2026-08-01-foo` (no double date) and a validation failure exits 1 — one failing e2e test first, committed RED
- components: `core/archive.ts` (prefix guard, exit codes)
- interfaces: `ARCHIVE_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}-/`; `process.exitCode = 1` at every abort that returns without archiving
- depends-on: —
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: `test/AGENTS.md`
- acceptance: `pnpm run build && pnpm exec vitest run test/core/archive.test.ts test/cli-e2e/archive-exit-code.test.ts`

## Wave 1

- [ ] Re-archiving already-synced deltas is a warned no-op; rebuilt specs are byte-stable, keep blank lines/EOF, carry delta Purpose, and warn before dropping notes; `applySpecs` deleted
- components: `parsers/code-fence.ts`, `parsers/requirement-blocks.ts` (fence masks, `foldRequirementName`), `core/specs-apply.ts` rework
- interfaces: `buildCodeFenceMask(lines) → boolean[]`; `foldRequirementName(name) → string`; `buildUpdatedSpec(update, changeName, {silent?}) → { rebuilt, counts, warnings, noRequirementBlocks, unaccountedContent }` (applied counts); `buildSpecSkeleton(name, change, purpose?)`; `extractPurposeSection(content) → string | undefined`
- depends-on: Wave 0
- stamps: `size:L` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`
- acceptance: `pnpm exec vitest run test/core/specs-apply.test.ts test/core/archive.test.ts`

## Wave 2

- [ ] A MODIFIED block that drops a scenario fails validate at authoring time and archive at apply time, with the missing names listed
- components: `parsers/requirement-blocks.ts` (`parseScenarioBlocks`, `findMissingCurrentScenarios`), `core/specs-apply.ts` (refusal), `core/validation/validator.ts` + callers (`mainSpecsDir`)
- interfaces: `findMissingCurrentScenarios(current, incoming) → string[]`; `validateChangeDeltaSpecs(dir, {mainSpecsDir?})`
- depends-on: Wave 1
- stamps: `size:M` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`
- acceptance: `pnpm exec vitest run test/core/specs-apply.test.ts test/core/parsers/requirement-blocks.test.ts test/core/validation.test.ts`

## Wave 3

- [ ] An emptied capability with `retire_capabilities: true` archives by deleting its spec with a recovery hint; without the marker the abort names the way out
- components: `utils/change-metadata.ts` (schema key + marker reader), `core/specs-apply.ts` (`retireSpec`, `pruneEmptyDirs`, `unaccountedContent`), `core/archive.ts` (outcome decision, hint ladder, warnings)
- interfaces: `readRetireCapabilitiesMarker(dir) → { declared, invalidReason? }`; `retire_capabilities?: boolean` in `ChangeMetadataSchema`; `retireSpec(update, mainSpecsDir, opts) → { retired }`; `ArchiveResult.warnings?: string[]`
- depends-on: Wave 1
- stamps: `size:L` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`
- acceptance: `pnpm exec vitest run test/core/archive.test.ts test/utils/change-metadata.test.ts`

## Wave 4

- [ ] `specs/<area>/<capability>/spec.md` parses, validates, archives, lists, and shows under id `<area>/<capability>`
- components: `utils/spec-discovery.ts`, `SpecUpdate.id`, wiring in `core/specs-apply.ts`, `core/archive.ts` detection loop, `core/parsers/change-parser.ts`, `core/list.ts`, `core/view.ts`, `commands/spec.ts`
- interfaces: `discoverSpecFiles(root) → { id, specFile }[]` (ids `/`-joined, code-point sorted); `SpecUpdate { id, source, target, exists }`
- depends-on: Wave 1
- stamps: `size:M` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`
- acceptance: `pnpm run build && pnpm exec vitest run test/utils/spec-discovery.test.ts test/core/list.test.ts test/core/view.test.ts test/cli-e2e/spec-nested.test.ts test/core/archive.test.ts`

## Wave 5

- [ ] With no TTY or an EOF'd stdin, archive never spews escapes or exits 0 silently — it names the exact rerun command with the caller's flags; piped `y\n` still works
- components: `utils/interactive.ts` (`confirmPrompt`, `isNonInteractivePromptError`), `core/archive.ts` (`confirmOrBlock`, `rerunFlags`, portable quoting, picker TTY guard)
- interfaces: `confirmPrompt({message, default}, {input?, output?}) → Promise<boolean>`; `isNonInteractivePromptError(e) → boolean`
- depends-on: Wave 0
- stamps: `size:M` `risk:low` `implTier:medium`
- skills: `test/AGENTS.md`
- acceptance: `pnpm exec vitest run test/utils/interactive.test.ts test/core/archive.test.ts`

## Wave 6

- [ ] Generated archive skills instruct the date-prefix guard; parity wall green
- components: `schemas/skills/openspec-archive-change/SKILL.md`, `schemas/skills/openspec-bulk-archive-change/SKILL.md`
- interfaces: prose only (no code surface)
- depends-on: Wave 0
- stamps: `size:S` `risk:low` `implTier:low`
- skills: `AGENTS.md` (parity-hash gotcha)
- acceptance: `pnpm run rebaseline:skills && pnpm test`
