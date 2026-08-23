# Design — adopt-upstream-archive-sync-fixes

## Context

- Our archive/sync module is byte-identical to the fork point except `src/core/list.ts` (+65 lines,
  unrelated). The upstream window `65a7233f..1ebddd17` rewrote it heavily: `src/core/archive.ts`
  +1803, `src/core/specs-apply.ts` +959, parsers +648, plus new files `code-fence.ts`,
  `requirement-text.ts`, `spec-discovery.ts`, `date.ts`.
- Method (ratified for A1 and later sweeps): the §A1 PR rows are a **coverage checklist**, not
  implementation units. This design re-implements the **module end-state** behaviors in our idiom;
  ADR-0001 (`docs/adr/ADR-0001-fork-sovereignty.md`) forbids pulling diffs.
- Current defects this closes (audited in our tree): the three human-mode abort points in
  `src/core/archive.ts` return without setting a non-zero exit code; `getArchiveDate()` always
  prepends a date; the rebuild join in `src/core/specs-apply.ts` glues `## Requirements` to its
  neighbors and writes no canonical EOF; ADDED/REMOVED/RENAMED throw on already-synced deltas;
  MODIFIED silently drops scenarios; a delta `## Purpose` never reaches a new main spec; discovery
  is flat-only everywhere; prompts leak `@inquirer` errors and ANSI escapes on non-TTY streams;
  an emptied capability dead-ends the archive.
- `applySpecs` (`src/core/specs-apply.ts:391`) has no callers in `src/` or `test/` — dead code in
  our tree too (upstream deleted it).

## Goals / Non-Goals

**Goals:**

- Land every behavior contracted by this change's delta specs (`specs/*/spec.md`), test-first.
- Keep the merge engine byte-stable on already-synced, well-formatted specs.
- Record the per-row audit ledger below as the change's bookkeeping source.

**Non-Goals (explicitly deferred, NOT closed — revisit as their own rows):**

- **Concurrency hardening** from upstream's end-state: content fingerprinting, archive claim
  locks, spec snapshots with rollback, verified copy-then-remove `moveDirectory`, and the
  displaced-file (`deferDelete`) retirement protocol. Reference: upstream `src/core/archive.ts` @
  `1ebddd17`. Deferred to a future `adopt-upstream-archive-hardening` row in the shopping doc.
- **Path-confinement machinery** (#1499): `resolveTrustedSpecPath`, `sourceRoot`/`targetRoot`
  trust fields, the `assertPathWithin` sprinkling in `spec.ts`/`change.ts`. Deferred with the same
  pointer. `discoverSpecFiles` here stays minimal (no trust roots).
- `#1361` local dates (A4), `#1399` `skip_specs` wiring and `hasAnyFileUnder` (A2), `#1521`
  fence-aware validator scenario counting, `#1281` requirement-reader unification (A2). The marker
  reader built here is generic so A2 can wire `skip_specs` without drift.
- Upstream's test suites (7.5k lines) — we write our own; they are read for intent only.

## Upstream row ledger (§A1 coverage — per-row outcome)

| Row | Outcome | Lands in |
| --- | --- | --- |
| #1311 exit code | ADOPT — covered by module analysis | Wave 0 |
| #1316 date-prefix dedup | ADOPT | Wave 0 |
| #1388 template date prefix | ADOPT (skill-side twin; reproduces in our rewritten skills) | Wave 6 |
| #1637 blank lines / #1528 EOF | ADOPT — one combined rebuild form | Wave 1 |
| #1376 already-synced specs / #1386 RENAMED no-op / #1437 REMOVED no-op + `warnings[]` | ADOPT — folded into one idempotent-merge end-state | Wave 1 |
| #1431 delta Purpose | ADOPT incl. masking guards (`maskHtmlComments`, `readableOverview`, `MIN_PURPOSE_LENGTH` warning) | Wave 1 |
| #1252 → #1391 → #1475 scenario drift | SUPERSEDED — intermediate states; folded into the consolidated comparison | Wave 2 |
| #1482 report dropped scenarios | ADOPT — consolidated end-state (`findMissingCurrentScenarios`, shared archive+validate) | Wave 2 |
| #1490 note-salvage warning | ADOPT (`firstForeignTail` warning) | Wave 1 |
| #1484 retire emptied capability / #1699 never dead-end | ADOPT — validator-decided retirement + marker + hint ladder | Wave 3 |
| #1355 / #1508 nested spec paths | ADOPT — recursive `discoverSpecFiles` wired through parse/apply/archive/list/view/spec | Wave 4 |
| #1483 flag guidance / #1603 no ANSI on non-TTY | ADOPT — `confirmPrompt` + blocked-error guidance + TTY guard on the picker | Wave 5 |

Not A1 but touched by the module: `applySpecs` deleted (dead); `SpecUpdate` gains `id` (needed by
nested ids and honest messages).

## Decisions

1. **Module end-state, not PR replay.** Several rows stack in the same functions; replaying would
   port intermediate states. Alternative (per-PR ports) rejected by the ratified method.
2. **Extract `buildCodeFenceMask` to `src/core/parsers/code-fence.ts`.** `requirement-blocks.ts`
   and `spec-structure.ts` need fence masking without importing `MarkdownParser` (avoids a cycle);
   `MarkdownParser` delegates to it. Alternative — exporting the static method — keeps the cycle
   risk and a parser-class dependency for plain-function callers.
3. **Scenario comparison lives in `requirement-blocks.ts`** (`parseScenarioBlocks`,
   `findMissingCurrentScenarios`, `foldRequirementName`), matching ANY non-fenced `####` header —
   parity with the validator's scenario notion. The validator's own `countScenarios` regex is NOT
   touched here (fence-aware counting is #1521/A2). One comparison shared by archive and validate
   so they can never disagree.
4. **Generic boolean marker reader** in `src/utils/change-metadata.ts`
   (`readBooleanMarker(changeDir, key)`), public wrapper only for `retire_capabilities` now.
   Marker honored only when the metadata parses, the schema name is listed AND resolves; anything
   else is `{ declared: false, invalidReason }` with control characters stripped. Alternative — a
   retirement-specific reader — invites exactly the drift the shared contract prevents when A2
   wires `skip_specs`.
5. **Retirement is decided by the validator, not block counts.** `isRetirableSpec(name, rebuilt)`
   = invalid AND every ERROR is `SPEC_NO_REQUIREMENTS`. The block parser and the validator
   genuinely disagree about what a requirement is; asking the validator makes "this spec could not
   have been written anyway" true by construction. Retire only when: marker declared AND honored,
   validation not skipped, this run removed something (`counts.removed > 0`), the spec exists, and
   `unaccountedContent` is empty.
6. **Whole-file unaccounted-content audit** (`contentTheMergeCannotName`): every non-blank line
   must be the title, Purpose, the `## Requirements` header, or a requirement's own parts (header,
   statement, scenario bullets); setext/HTML headings and post-scenario bullets count as authored
   content. Fails safe: unclassifiable ⇒ refuse. Rationale: upstream burned seven review rounds on
   subset audits; we take the final shape directly.
7. **Simple safety ordering instead of snapshots** (hardening deferred): settle archive name →
   check destination *before* any write → build + validate ALL rebuilt specs → write updates →
   retirements last (unlink + bounded `pruneEmptyDirs`) → move change dir. A mid-sequence failure
   leaves earlier writes applied — identical to today's behavior, stated honestly.
   `pruneEmptyDirs` bounds by real paths and never follows symlinked dirs.
8. **Retirement hint ladder** on the "no requirements" abort: marker missing + clean ⇒ name
   `retire_capabilities: true`; marker missing + unaccounted content ⇒ name the content (the
   marker would not help); marker declared + refused ⇒ name the blocking lines; always append the
   invalid-marker reason when one exists. Never a bare rejection (#1699).
9. **`confirmPrompt` in `src/utils/interactive.ts`:** TTY⨯TTY ⇒ `@inquirer` confirm; otherwise a
   `readline` plain-line reader (no ANSI), mirroring inquirer's y/n parsing, EOF ⇒ an
   `ExitPromptError`-shaped rejection. `isNonInteractivePromptError` classifies failed prompts
   (never SIGINT). Archive wraps prompts in `confirmOrBlock` → `ArchiveBlockedError` whose hint is
   `rerunFlags` (caller's own `--skip-specs`/`--no-validate` + `--yes`). Piped answers keep
   working. Shell-quoting of arbitrary change names in hints: double-quote only names safe in
   every shell, else a `<change-name>` placeholder (upstream's portable-quoting insight, minus
   nothing — it is small and correct).
10. **`buildUpdatedSpec` end-state:** returns `{ rebuilt, counts, warnings, noRequirementBlocks,
    unaccountedContent }` where `counts` are **applied** operations; no-op rules per the
    specs-sync-skill delta (identical-content ADDED/MODIFIED, missing REMOVED, early-synced
    RENAMED — each with the folded near-miss guard); rebuild form
    `[before, header, body, after].filter(≠'').join('\n\n')` collapsed + `trimEnd() + '\n'`.
    Zero-total specs are not rewritten. `applySpecs` is deleted, not extended.
11. **`discoverSpecFiles` (minimal)** in `src/utils/spec-discovery.ts`: recursive walk, dot
    entries skipped, symlinked directories not followed, in-capability symlinked `spec.md`
    accepted via `stat`, dangling links skipped, root-level `spec.md` ignored, ENOENT ⇒ `[]`, any
    other error thrown (silent drops recreate the #1353 data-loss class), ids joined with `/`,
    code-point sort. No trust-root checks (deferred with #1499).
12. **Retirement report keeps the simple path form:** root-relative POSIX path +
    `git checkout HEAD -- <path>` hint. Upstream's case-collision/symlink `resolvedPath` nuance
    goes with the deferred hardening.
13. **Skill prose (#1388):** both archive skills state "date-prefix only when the name is not
    already dated"; parity wall re-baselined via `pnpm run rebaseline:skills`.

## Components & Dependencies

| Component | Purpose | Interface | Depends on | Skills |
| ----------- | --------- | ----------- | ------------ | -------- |
| `parsers/code-fence.ts` | shared fence mask | `buildCodeFenceMask(lines) → boolean[]` | — | `test/AGENTS.md` |
| `parsers/requirement-blocks.ts` (ext.) | fence-aware extraction, folds, scenario comparison | `foldRequirementName`, `parseScenarioBlocks`, `findMissingCurrentScenarios(current, incoming) → string[]` | code-fence | `test/AGENTS.md` |
| `utils/spec-discovery.ts` | recursive spec discovery | `discoverSpecFiles(root) → {id, specFile}[]` | — | `test/AGENTS.md` |
| `utils/change-metadata.ts` (ext.) | marker contract | `readRetireCapabilitiesMarker(dir) → {declared, invalidReason?}`; `retire_capabilities` in `ChangeMetadataSchema` | resolver | `test/AGENTS.md` |
| `utils/interactive.ts` (ext.) | escape-free prompts | `confirmPrompt(prompt, io?) → boolean`; `isNonInteractivePromptError(e) → boolean` | — | `test/AGENTS.md` |
| `core/specs-apply.ts` (rework) | idempotent merge + retirement primitive | `buildUpdatedSpec` (shape in Decisions 10), `retireSpec(update, mainSpecsDir, opts) → {retired}`, `buildSpecSkeleton(name, change, purpose?)`, `extractPurposeSection` | requirement-blocks, code-fence, spec-discovery | `test/AGENTS.md` |
| `core/archive.ts` (rework) | flow: exit codes, name guard, ordering, prompts, retirement wiring, warnings | `ArchiveResult` + `warnings?: string[]`; `SpecUpdate` + `id` | specs-apply, interactive, change-metadata | `test/AGENTS.md` |
| `core/validation/validator.ts` (ext.) | authoring-time loss check | `validateChangeDeltaSpecs(dir, {mainSpecsDir?})` | requirement-blocks | `test/AGENTS.md` |
| callers: `commands/change.ts`, `commands/validate.ts` | pass `mainSpecsDir` | — | validator | — |
| `core/parsers/change-parser.ts`, `core/list.ts`, `core/view.ts`, `commands/spec.ts` | nested ids | discovery-based iteration | spec-discovery | `test/AGENTS.md` |
| `schemas/skills/openspec-{archive,bulk-archive}-change/SKILL.md` | #1388 prose | — | — | `AGENTS.md` (parity gotcha) |

**Slice composition:** code-fence → requirement-blocks → {specs-apply, validator}; spec-discovery
and interactive are leaves; archive.ts consumes everything. Nested discovery (Wave 4) and
non-interactive UX (Wave 5) are independently valuable and unordered w.r.t. each other — split
signal noted, kept in this change because they share the archive.ts rework and the audit.

## Data Model / API Shapes

- `SpecUpdate { id: string; source: string; target: string; exists: boolean }` — `id` is the
  capability path relative to the specs root, `/`-joined on every platform.
- `buildUpdatedSpec(update, changeName, {silent?}) → { rebuilt: string; counts: {added, modified,
  removed, renamed}; warnings: string[]; noRequirementBlocks: boolean; unaccountedContent:
  string[] }`.
- `MetadataMarker { declared: boolean; invalidReason?: string }`.
- `retireSpec(update, mainSpecsDir, {silent?, displayPath?}) → { retired: boolean }`; ENOENT ⇒
  `{retired: false}`; other failures rethrow with the path and a fix-by-hand hint.
- `ArchiveResult { change, archivedAs, path, specsUpdated, totals?, warnings? }`.
- `ARCHIVE_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}-/` guards the name.
- `confirmPrompt({message, default}, {input?, output?})`.

## Data Flow & Error Handling

Archive happy path: resolve change → validate (fail ⇒ print + `exitCode=1`, nothing written) →
settle `archiveName` (prefix guard) → destination-exists check (fail ⇒ blocked error, nothing
written) → `findSpecUpdates` (recursive) → build ALL rebuilt specs (any failure ⇒ abort,
`exitCode=1`, nothing written; user may still decline updates and archive) → confirm (EOF ⇒
blocked error with rerun hint) → validate every rebuilt spec (failure ⇒ hint ladder, `exitCode=1`,
nothing written) → write non-zero-total updates → retire marked, emptied capabilities (unlink +
prune; failure ⇒ rethrow with path guidance; earlier writes remain, as today) → move directory
(EPERM/EXDEV fallback copy unchanged) → print/return result with warnings. JSON mode substitutes
`ArchiveBlockedError` diagnostics for every prompt and abort; exit codes identical.

## Testing Approach

| Spec scenario | Test layer | Why this layer |
| --------------- | ----------- | ---------------- |
| cli-archive / Failure Exit Status (all 3) | cli-e2e (`test/cli-e2e/`, compiled CLI) | real process exit codes; in-process `process.exitCode` can lie |
| cli-archive / Archive Process (all 5) | integration (`test/core/archive.test.ts`, temp dirs) | proves flow ordering incl. destination-before-merge |
| cli-archive / Capability Retirement (all 7) | integration (archive.test.ts) | marker + validator + fs deletion interplay is the contract |
| cli-archive / Nested Delta Spec Discovery (2) | integration | end-to-end merge into nested main path |
| cli-archive / Change Selection: No terminal available; Selection input ends | integration with stubbed `isTTY`/streams | picker guard + EOF classification without a pty |
| cli-archive / Confirmation: cannot be answered; Plain prompts | unit (`confirmPrompt` with injected streams) + integration (guidance text) | reader parsing is pure; hint composition needs the flow |
| cli-archive / Display Output (3) | integration (stdout capture + `--json`) | counts/warnings surface at the flow level |
| specs-sync-skill / Delta Reconciliation Logic (all, incl. no-ops, near-misses, cross-section, Purpose carry) | unit (`buildUpdatedSpec`, `test/core/specs-apply*.test.ts`) | pure content-in/content-out engine |
| specs-sync-skill / Scenario Preservation (3) | unit (`findMissingCurrentScenarios` + `buildUpdatedSpec`) | pure comparison; multiplicity and fences are input shapes |
| specs-sync-skill / Content Preservation Warnings (2) | unit | warnings are part of the return value |
| specs-sync-skill / Canonical Output Formatting (3, incl. byte-stable) | unit (idempotence: rebuild twice, assert bytes) | formatting is deterministic output |
| specs-sync-skill / Skill Output (3) | proven by the cli-archive Display Output integration rows (same engine) | agent skill delegates to the same engine |
| cli-validate / Scenario-loss detection (4) | integration (`validateChangeDeltaSpecs` with temp change+specs) | validator wiring incl. `mainSpecsDir` option |
| cli-spec / Nested Spec Discovery (3) | cli-e2e (spec command reads cwd) | command resolves ids against a real tree |
| cli-view / Nested specs listed by path id | integration (`ViewCommand.execute(tmp)`) | dashboard rendering over a temp tree |
| cli-list / Command Execution (3) | integration (`ListCommand`) | listing over a temp tree |
| opsx-archive-skill (3) | unit: generated-skill content assertions + parity re-baseline | prose contract lives in generated artifacts |

## Wave Skeleton / Build Sequence

### Wave 0 - Dated change names archive round-trip · TRACER

- value: `openspec archive 2026-08-01-foo --yes` archives as `2026-08-01-foo` (no double date) and a validation failure exits 1 — one failing e2e test first
- components: `core/archive.ts` (prefix guard, exit codes)
- proves scenarios: Change name already carries a date prefix; Date prefix for undated change names; Failure Exit Status (all 3)
- depends-on: —
- acceptance: `pnpm run build && pnpm exec vitest run test/core/archive.test.ts test/cli-e2e/archive-exit-code.test.ts`
- stamps: `size:S` `risk:low` `implTier:medium`
- skills: `test/AGENTS.md`

### Wave 1 - Idempotent, format-stable merge engine

- value: re-archiving already-synced deltas is a warned no-op; rebuilt specs are byte-stable, keep blank lines/EOF, carry delta Purpose, and warn before dropping notes; `applySpecs` deleted
- components: `parsers/code-fence.ts`, `requirement-blocks.ts` (fence masks, `foldRequirementName`), `specs-apply.ts` rework (Decisions 10, #1431 guards, `firstForeignTail`)
- proves scenarios: all specs-sync-skill Delta Reconciliation Logic + Content Preservation Warnings + Canonical Output Formatting; cli-archive Display Output (all 3)
- depends-on: Wave 0
- acceptance: `pnpm exec vitest run test/core/specs-apply.test.ts test/core/archive.test.ts`
- stamps: `size:L` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`

### Wave 2 - Scenario loss refused everywhere

- value: a MODIFIED block that drops a scenario fails validate at authoring time and archive at apply time, with the missing names listed
- components: `requirement-blocks.ts` (`parseScenarioBlocks`, `findMissingCurrentScenarios`), `specs-apply.ts` (refusal), `validator.ts` + callers (`mainSpecsDir`)
- proves scenarios: specs-sync-skill Scenario Preservation (3); cli-validate Scenario-loss detection (4)
- depends-on: Wave 1
- acceptance: `pnpm exec vitest run test/core/specs-apply.test.ts test/core/validation`
- stamps: `size:M` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`

### Wave 3 - Capability retirement without dead ends

- value: an emptied capability with `retire_capabilities: true` archives by deleting its spec with a recovery hint; without the marker the abort names the way out
- components: `change-metadata.ts` (schema key + marker reader), `specs-apply.ts` (`retireSpec`, `pruneEmptyDirs`, `unaccountedContent`), `archive.ts` (outcome decision, hint ladder, warnings)
- proves scenarios: cli-archive Capability Retirement (all 7); Non-blocking merge warnings (retirement note)
- depends-on: Wave 1
- acceptance: `pnpm exec vitest run test/core/archive.test.ts test/utils/change-metadata.test.ts`
- stamps: `size:L` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`

### Wave 4 - Nested spec paths everywhere

- value: `specs/<area>/<capability>/spec.md` parses, validates, archives, lists, and shows under id `<area>/<capability>`
- components: `utils/spec-discovery.ts`, `SpecUpdate.id`, wiring in `specs-apply.ts`, `archive.ts` detection loop, `change-parser.ts`, `list.ts`, `view.ts`, `commands/spec.ts`
- proves scenarios: cli-archive Nested Delta Spec Discovery (2); cli-spec Nested Spec Discovery (3); cli-view Nested specs listed by path id; cli-list Command Execution (3)
- depends-on: Wave 1
- acceptance: `pnpm run build && pnpm exec vitest run test/utils/spec-discovery.test.ts test/core/list.test.ts test/core/view.test.ts test/cli-e2e/spec-nested.test.ts`
- stamps: `size:M` `risk:med` `implTier:medium`
- skills: `test/AGENTS.md`

### Wave 5 - Non-interactive archive that says what to do

- value: with no TTY or an EOF'd stdin, archive never spews escapes or exits 0 silently — it names the exact rerun command with the caller's flags; piped `y\n` still works
- components: `utils/interactive.ts` (`confirmPrompt`, `isNonInteractivePromptError`), `archive.ts` (`confirmOrBlock`, `rerunFlags`, portable quoting, picker TTY guard)
- proves scenarios: cli-archive Change Selection (No terminal; Selection input ends); Confirmation Behavior (cannot be answered; Plain prompts)
- depends-on: Wave 0
- acceptance: `pnpm exec vitest run test/utils/interactive.test.ts test/core/archive.test.ts`
- stamps: `size:M` `risk:low` `implTier:medium`
- skills: `test/AGENTS.md`

### Wave 6 - Skills stop instructing double dates

- value: generated archive skills instruct the date-prefix guard; parity wall green
- components: `schemas/skills/openspec-archive-change/SKILL.md`, `schemas/skills/openspec-bulk-archive-change/SKILL.md`
- proves scenarios: opsx-archive-skill (all 3)
- depends-on: Wave 0 (CLI behavior the prose describes)
- acceptance: `pnpm run rebaseline:skills && pnpm test`
- stamps: `size:S` `risk:low` `implTier:low`
- skills: `AGENTS.md` (parity-hash gotcha)

## Risks / Trade-offs

- [Parity-hash wall trips on Wave 6] → run `pnpm run rebaseline:skills`, commit the regenerated
  test file with the prose change (by design).
- [No rollback if a write fails mid-sequence] → unchanged from today; ordering (validate-all
  before write-any, retire last) minimizes the window. Full rollback is the deferred hardening.
- [Windows] → all new paths via `path.join`; ids normalized to `/` only at the id boundary;
  `moveDirectory` fallback untouched. Tests build expectations with `path.join`
  (`test/AGENTS.md`).
- [Behavioral break: previously-throwing already-synced deltas now no-op] → intended (#1376 class);
  warnings keep the signal.
- [SHALL/MUST softening seen in upstream validator (#1502)] → NOT adopted here (A2 row); our
  validator's severity model is untouched, so no golden-output churn.

## Migration / Rollback

No data or infra. `retire_capabilities` is additive, opt-in metadata; existing changes and
archives are unaffected. Revert = revert the commits; deleted specs are recoverable from git by
construction.

## Open Questions

None blocking. Deferred-and-tracked (answers change nothing here): whether the deferred hardening
and #1499 confinement become one `adopt-upstream-archive-hardening` change or two (decided at the
next shopping-doc pass); whether A4's #1361 switches the archive date to local time (this change
keeps UTC).
