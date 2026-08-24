# CLI inventory and PRD — input for the rebuild decision

**Status:** inventory + requirements. Written 2026-08-24 against branch `personal`
@ `4c2b35f5`. Part 3 tags reviewed and confirmed with Paolo the same day; changes from
that review: FR-82/83 swapped to bash-first, FR-65 → NEVER, §3.10 OpenIntent rename
batch added. No verdict on the rebuild itself.

**Method.** Part 1 walks `src/cli/index.ts`, every `register*Command` module, and the
completions command registry (`src/core/completions/command-registry.ts`), then the engine
(`src/core/*`) for non-command surfaces. Part 2 is `ops/upstream-shopping-2026-08.md`
plus a fresh `git fetch upstream` — upstream main has exactly **one** non-merge commit
since `1ebddd17`: `f1b521df` (docs-site rebuild, all under `website/`). Part 3 derives
functional requirements with boarding tags.

**Tag legend (Part 3):**

- **ADOPT-NOW** — Paolo uses it today or the process needs it. Each notes PORT candidate
(existing module boards mostly as-is) vs FRESH (needs design).
- **LATER** — idea worth keeping, not boarding now.
- **NEVER** — Windows/PowerShell, tools outside the pi/claude/cursor/agents stance,
telemetry-class surface, publishing machinery.
- Dependency marks: **[LEDGER]** (store-homed receipts, Track E), **[TRACK-B]**
(adapters/translation layer), **[TRACK-F]** (workflow engine / factory on Pi).

Standing constraint (Track E1, restated): the stores/context/doctor **command** surface is
LATER pending the ledger-home design session, but store-aware **plumbing inside engine
modules is PORT-with-engine** — it is not separable, and removing it would be rework.

---

# Part 1 — CURRENT SURFACE

## 1.0 Global CLI behavior (cross-cutting)


| Surface                       | What it does                                                                                                                                                                                                                                                 | Engine touched              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `--no-color` (global)         | Sets `NO_COLOR=1` via a `preAction` hook                                                                                                                                                                                                                     | none                        |
| `--version` / `-V`            | Version from `package.json` via `createRequire`                                                                                                                                                                                                              | none                        |
| `failWithError` JSON contract | Every `--json` failure prints exactly one JSON document on stdout: the command's null-shape payload plus a `status: [asStatus(...)]` array; exit code 1. Human mode prints `ora().fail` plus a pasteable `Fix:` line when the error carries `diagnostic.fix` | `commands/shared-output.ts` |
| Hidden `--store-path <path>`  | Registered (hidden) on every store-aware command purely to reject deliberately: "register the path with `openspec store register` and use `--store <id>`"                                                                                                    | `root-selection`            |
| Hidden removed flags          | `new change --initiative` / `--areas` registered hidden so users get a "no longer supported" explanation instead of a Commander unknown-option error                                                                                                         | none                        |
| `getCommandPath`              | Nested command path helper (`change show` → `change:show`) used by completions                                                                                                                                                                               | `completions`               |
| Store banner                  | Human-mode `emitStoreRootBanner` when a store root is selected; `withStoreFlag` keeps every follow-up hint pasteable inside the store                                                                                                                        | `root-selection`            |


`bin/openspec.js` is the bin shim; `build.js` compiles via `tsc`; `scripts/postinstall.js`
still runs on install (prints setup tips — upstream #1704 moved this into the CLI;
ours has not). `package.json` still carries changeset release scripts
(`release`, `release:ci`, `check:pack-version`) — publishing residue.

## 1.1 Commands, subcommands, flags

Positional arguments in `[]` are optional, `<>` required. "Store-aware" = accepts
`--store <id>` and resolves its root through `resolveRootForCommand`.

### `init [path]`

Flags: `--tools <tools>` ("all", "none", or comma list of tool IDs), `--force` (no-op,
kept for compatibility). Hidden deprecated alias: `**experimental**` with `--tool <id>`,
`--no-interactive`.
Does: validates/creates target dir; detects present tools (`available-tools.ts` scans
`skillsDir` / `detectionPaths`); interactive multi-select or `--tools` parsing; creates
`openspec/` structure (`changes/`, `specs/`, `explorations/`); writes `config.yaml`
(schema default `deep-planning`); generates the 10 workflow skills into the canonical
`.agents/skills/` store plus per-tool symlinks; extend mode when `openspec/` already
exists; refuses to init inside a config-only store-pointer dir (`classifyOpenSpecDir`).
Engine: `core/init.ts`, `core/config.ts` (AI_TOOLS), `available-tools.ts`,
`shared/tool-detection.ts`, `shared/skill-install.ts`, `shared/skill-generation.ts`,
`templates/`, `workflow-skills.ts`, `project-config.ts`, `planning-home.ts`,
`prompts/searchable-multi-select.ts`, `ui/welcome-screen.ts`.

### `update [path]`

Flags: `--force`.
Does: per-tool version check of installed skills (frontmatter version vs package
version); shows an update plan; regenerates stale skills; refreshes the canonical
`.agents/skills` store even when no per-tool dir exists (`updateCanonicalStore`);
detects newly-appeared tool dirs and hints to re-run init.
Engine: `core/update.ts` plus the same skill-generation stack as init.

### `list`

Flags: `--specs`, `--changes` (default), `--explorations`, `--sort <recent|name>`,
`--json`, `--store <id>`. Store-aware.
Does: lists active changes with task progress and relative mtime; specs with
requirement counts; **explorations mode** lists `openspec/explorations/*.md` notes
split pending vs linked-to-a-change (the explore skill's output dir).
Engine: `core/list.ts`, `parsers/markdown-parser.ts`, `utils/spec-discovery.ts`,
`utils/task-progress.ts`, `root-selection.ts`.

### `view`

No flags. Interactive dashboard summarizing specs + changes. Engine: `core/view.ts`,
same parsers as list. Not store-aware (hardcodes `.`).

### `change` group — **deprecated** (prints warning on every use)

- `change show [name]` — `--json`, `--deltas-only`, `--requirements-only` (deprecated
alias), `--no-interactive`.
- `change list` — `--json`, `--long`.
- `change validate [name]` — `--strict`, `--json`, `--no-interactive`.
All delegate to `commands/change.ts` → same engines as top-level `show`/`list`/
`validate`. Known repo-local debt: `change.ts:207` hardcodes
`openspec/specs` as scenario-loss baseline instead of the store-aware root
(recorded in the A1 follow-ups).

### `archive [change-name]`

Flags: `-y/--yes`, `--skip-specs`, `--no-validate` (requires confirmation), `--json`,
`--store <id>`. Store-aware.
Does: validates the change (strict), confirms task completion, merges delta specs
into main specs via the delta-merge engine, moves the change dir to
`openspec/changes/archive/YYYY-MM-DD-<name>` (no double date prefix), retirement
handling (`retire_capabilities`), scenario-loss refusal, `ArchiveBlockedError`
rerun hints naming the exact flag, non-TTY plain output. All 15 A1 upstream rows
landed here 2026-08-23.
Engine: `core/archive.ts`, `core/specs-apply.ts` (delta merge:
ADDED/MODIFIED/REMOVED/RENAMED, fence-aware, idempotent no-ops, Purpose
preservation, canonical spec rebuild), `validation/`, `parsers/`,
`change-metadata/`, `root-selection.ts`, `utils/task-progress.ts`.

### `spec` group

- `spec show [spec-id]` — `--json`, `--requirements`, `--no-scenarios`,
`-r/--requirement <id>`, `--no-interactive`.
- `spec list` — `--json`, `--long`.
- `spec validate [spec-id]` — `--strict`, `--json`, `--no-interactive`.
Engine: `commands/spec.ts`, `utils/spec-discovery.ts` (recursive nested spec paths,
A1 #1355), `parsers/`, `validation/`, `converters/json-converter.ts`.

### `validate [item-name]` (top-level)

Flags: `--all`, `--changes`, `--specs`, `--type <change|spec>`, `--strict`, `--json`,
`--concurrency <n>` (env `OPENSPEC_CONCURRENCY`, default 6), `--no-interactive`,
`--store <id>`. Store-aware.
Does: validates a named item (interactive picker on ambiguity), or bulk with bounded
concurrency; JSON report per item.
Engine: `commands/validate.ts`, `validation/validator.ts` (+ `constants.ts`,
`types.ts`), `parsers/change-parser.ts` + `requirement-blocks.ts` +
`spec-structure.ts` + `code-fence.ts`, `root-selection.ts`. Known debt: the
validator's private `findDeltaSpecFiles()` walk is not unified onto
`discoverSpecFiles` (A1 follow-up).

### `show [item-name]` (top-level)

Flags: `--json`, `--type <change|spec>`, `--no-interactive`, change-only
`--deltas-only` / `--requirements-only`, spec-only `--requirements`,
`--no-scenarios`, `-r/--requirement <id>`, `--store <id>`; `allowUnknownOption(true)`
passes extras through. Store-aware.
Engine: `commands/show.ts`, `converters/json-converter.ts`, parsers, root-selection.

### `completion` group + `__complete <type>` (hidden)

- `completion generate [shell]` — outputs script to stdout.
- `completion install [shell]` — `--verbose`; writes script + configures shell profile.
- `completion uninstall [shell]` — `-y/--yes`.
- `__complete <type>` — machine-readable dynamic data (change IDs, spec IDs, schema
names, shells) consumed by the generated scripts; silent failure by design.
Shells: **zsh, bash, fish, powershell** (generator + installer per shell).
Engine: `commands/completion.ts`, `core/completions/` (command-registry.ts is the
declarative source for static completions; factory, 4 generators, 4 installers,
templates, completion-provider for dynamic data), `utils/shell-detection.ts`.

### `status`

Flags: `--change <id>`, `--schema <name>`, `--json`, `--store <id>`. Store-aware.
Does: artifact completion status for a change (which artifacts exist, which are
unlocked, which blocked, schema-aware).
Engine: `commands/workflow/status.ts`, `artifact-graph/` (graph, state,
instruction-loader `formatChangeStatus`), `change-metadata/`, root-selection.

### `instructions [artifact]`

Flags: `--change <id>`, `--schema <name>`, `--wave <n>` (wave-plan only; 0 = tracer
bullet), `--json`, `--store <id>`. Store-aware.
Does: three endpoints in one command —

1. `instructions <artifact-id>` — enriched creation instructions for an artifact:
  schema instruction text + template + dependency status + project `context` +
   `rules` from `config.yaml` + referenced-stores XML block.
2. `instructions apply` — implementation instructions for working through tasks.md
  (task list parsed with completion state, referenced-stores markdown section).
3. `instructions wave-plan --wave N` — just-in-time planner prompt for one wave of
  the TDD wave map.

This is the primary agent-facing endpoint: every workflow skill shells out to it.
Engine: `commands/workflow/instructions.ts`, `artifact-graph/instruction-loader.ts`
(+ graph/state/outputs/resolver), `project-config.ts`, `references.ts`
(`assembleReferenceIndex`), `root-selection.ts`, `planning-home.ts`.

### `templates`

Flags: `--schema <name>`, `--json`. Shows resolved template paths for all artifacts
in a schema. Engine: `commands/workflow/templates.ts`, `artifact-graph/resolver.ts`.

### `schemas`

Flags: `--json`. Lists available schemas with descriptions + artifact lists from all
three resolution tiers. Engine: `commands/workflow/schemas.ts`,
`artifact-graph/resolver.ts` (`listSchemasWithInfo`).

### `new change <name>`

Flags: `--description <text>`, `--goal <text>`, `--schema <name>`, `--json`,
`--store <id>`; hidden rejections `--initiative`, `--areas`. Store-aware.
Does: creates `openspec/changes/<name>/` with README.md and `.openspec.yaml`
metadata (schema, created date, optional goal); validates kebab-case name; resolved
schema announced (not the machine default).
Engine: `commands/workflow/new-change.ts`, `change-metadata/schema.ts` (zod:
schema, created, goal, affected_areas, `retire_capabilities`, initiative link),
`utils/change-metadata.ts`, root-selection, planning-home.

### `store` group (see LATER-pending-ledger tag in Part 3)

- `store setup [id]` — `--path <dir>`, `--init-git`/`--no-init-git`,
`--remote <url>`, `--json`. Creates or re-registers a store: dir creation,
`openspec/` skeleton, `store.yaml` identity metadata, optional git init + first
commit, nested-git-repo guard, created-path ledger with rollback.
- `store register [path]` — `--id <id>`, `--yes`, `--json`. Registers an existing
dir; can create identity metadata on confirm.
- `store unregister <id>` — `--json`. Forgets registration, files untouched.
- `store remove <id>` — `--yes`, `--json`. Unregisters AND deletes the local folder
(safe-delete assertion first).
- `store list` / `ls` — `--json`.
- `store doctor [id]` — `--json`. Per-store inspection: registry entry vs on-disk
metadata identity, root health, git state, canonical vs observed remote.
Engine: `core/store/` — `operations.ts` (setup/register/cleanup/inspect, ~1200
lines), `registry.ts` (machine-level registry in the global data dir), `foundation.ts`
(store.yaml identity), `git.ts` (init/commit/remote probes), `errors.ts`;
`global-config.ts` for the data dir.

### `context`

Flags: `--json`, `--store <id>`, `--code-workspace <path>` (+ `--force`). Store-aware.
Does: prints the working context for the resolved root — root provenance, project
config summary, declared references with health, working-set members; optionally
writes a VS Code `.code-workspace` file for the set.
Engine: `commands/context.ts`, `commands/shared-gather.ts`, `core/working-set.ts`,
`core/references.ts`, `core/relationship-health.ts`, root-selection.

### `doctor`

Flags: `--json`, `--store <id>`. Store-aware.
Does: relationship health for the resolved root: config parse problems, store
pointer validity, declared references resolvable/registered/cloned, store metadata
state, actionable fixes per entry.
Engine: `commands/doctor.ts`, `core/relationship-health.ts`, `project-config.ts`,
`core/store/`, root-selection.

### `workset` group (purely local, personal views)

- `workset create [name]` — `--member <path|name=path>` (repeatable, first =
primary), `--tool <id>`, `--json`; interactive prompts otherwise.
- `workset list` / `ls` — `--json`.
- `workset open <name>` — `--tool <id>` (one-off override).
- `workset remove <name>` — `--yes`, `--json`.
Does: saves named multi-folder views in the global data dir (locked JSON state
file), generates `.code-workspace` files, opens them with a detected tool.
Opener table: **code, cursor, claude, codex** (built-in; global config can merge
overrides; CLI-agent style openers currently behind a kill-switch, only
workspace-file style tools open). PATH scan honors win32 PATHEXT.
Engine: `commands/workset.ts` + `workset-input.ts` + `workset-prompts.ts`,
`core/worksets.ts`, `core/openers.ts`, `core/file-state.ts` (locked state file),
`core/id.ts`, `global-config.ts`.

### `reverse` group (brownfield)

- `reverse scan` — `--path <dir>`, `--json`. Read-only codebase inventory proposing
a candidate capability map.
- `reverse scaffold <capability>` — `--path <dir>`, `--purpose <text>`, `--force`.
Idempotent draft baseline spec skeleton for one capability.
Engine: `core/reverse/` (inventory.ts, capabilities.ts, scaffold.ts). Serves the
`openspec-reverse` skill.

### `lint`

Flags: `--adr` (only rule today), `--adr-dir <path>` (default `docs/adr`), `--json`.
Deterministic grounding-lint runner; single rule: ADR registry drift.
Engine: `core/lint/` (run.ts, rules/adr-registry.ts, types.ts), `core/adr/`.

### `adr index`

Flags: `--dir <path>`, `--check` (exit non-zero on drift), `--force` (overwrite a
registry lacking the generated marker), `--json`.
Generates/verifies the ADR registry from ADR file frontmatter.
Engine: `core/adr/` (scan.ts, parse.ts, registry.ts).

### `config` group (global config)

Group flag: `--scope <global>` (only value). Subcommands: `path`; `list --json`;
`get <key>`; `set <key> <value> --string --allow-unknown`; `unset <key>`;
`reset --all -y`; `edit` (opens `$EDITOR`).
Schema: only known top-level key is `**featureFlags**` (booleans); passthrough for
unknown keys; `RETIRED_KEYS = ['telemetry','profile','workflows']` ignored on read,
stripped on write. Type coercion (bool/number/JSON containers).
Engine: `commands/config.ts`, `core/global-config.ts` (config in
`~/.config/openspec` with legacy + Windows APPDATA fallbacks; separate global
*data* dir for registry/worksets with LOCALAPPDATA fallback), `config-schema.ts`.

### `schema` group

- `schema which [name]` — `--json`, `--all`. Shows resolution source per schema.
- `schema validate [name]` — `--json`, `--verbose`. Structure + template checks.
- `schema fork <source> [name]` — `--json`, `--force`. Copies a schema into
`openspec/schemas/` for customization.
- `schema init <name>` — `--json`, `--description`, `--artifacts <csv>`,
`--default`/`--no-default`, `--force`. New project-local schema from
`DEFAULT_ARTIFACTS` (proposal → specs → design → tasks).
Engine: `commands/schema.ts`, `artifact-graph/resolver.ts` + `schema.ts` (YAML
parse/validation), `project-config.ts` (default-schema write).

## 1.2 Non-command surfaces

**Init/update flow internals.** Tool detection (`available-tools.ts` scanning
`skillsDir`/`detectionPaths`, e.g. GitHub Copilot's 7 detection paths); extend mode
(re-init adds tools without touching existing config); `--tools` grammar
(all/none/csv with validation and unknown-tool errors); success summary with
per-tool created/refreshed/failed buckets; welcome screen UI.

**Skill generation + parity wall.** Authored source: `schemas/skills/<name>/`
(SKILL.md frontmatter+body, `references/*.md`, optional `scripts/`) for the 10
workflow skills (`WORKFLOW_SKILLS` enumeration: apply-change, archive-change,
bulk-archive-change, continue-change, design, explore, new-change, reverse,
sync-specs, verify-change). `shared/skill-bundle.ts` loads bundles
(`loadSkillSource`), handles `<!--bundle:start/end-->` markers, `${...}` seams
(`PRIME_RITUAL` in `shared-prime.ts`, `STORE_SELECTION_GUIDANCE` in
`store-selection.ts`), and exposes `flattenSkillBody`/`renderFullInstructions`
(the `flatten` export is slated to die, Track B). `shared/skill-generation.ts`
(`generateSkillContent`/`buildSkillArtifacts`) emits the file set;
`templates/skill-templates.ts` + thin per-skill factories in
`templates/workflows/*.ts`. **Placement** (`shared/skill-install.ts`): skills are
written ONCE to the canonical `.agents/skills/<name>/` store; tools verified to
follow symlinks get per-skill symlinks (`SYMLINK_TOOL_IDS = ['claude']`, i.e.
`.claude/skills/<name>` → `../../.agents/skills/<name>`). Note: this canonical-store

- symlink model is what Track B's per-adapter emit matrix replaces. **Parity wall:**
`test/core/templates/skill-templates-parity.test.ts` pins SHA-256 hashes of every
generated artifact; `pnpm run rebaseline:skills`
(`scripts/rebaseline-skill-hashes.mjs`) recomputes from `dist/`.

**Schema resolution.** Three tiers, first hit wins: project
(`openspec/schemas/<name>/`) → user override (global config dir `schemas/`) →
package built-in (`schemas/` in the npm package). Only built-in: `deep-planning`
(schema.yaml with per-artifact `instruction` blocks, `continueMode: flow-to-gate`,
templates dir). `artifact-graph/resolver.ts` + `schema.ts` (zod-validated YAML).

**Artifact graph / instruction loading.** `artifact-graph/graph.ts` models artifact
dependencies (requires edges → unlocked/blocked); `state.ts` detects completion from
generated files; `instruction-loader.ts` builds `ArtifactInstructions` (instruction

- template + dependencies + context/rules injection) and `ChangeStatus`;
`outputs.ts` maps `generates` globs.

**Project config (`openspec/config.yaml`).** `project-config.ts`: `schema` (project
default), `context` (free text injected into every artifact instruction — the
`--language` story rides this), `rules` (per-artifact-id extra rules, validated
against the schema), `references` (declared referenced stores: string or
`{id, remote}`), `store:` pointer (config-only dir delegating the root to a
registered store). `classifyOpenSpecDir` distinguishes real root vs pointer dir.

**Root selection.** `root-selection.ts` + `openspec-root.ts` + `planning-home.ts`:
nearest-ancestor `openspec/` walk, planning-shape classification, explicit
`--store <id>` selection, declared-store fallback via the pointer, registered-store
inspection (identity match, root health), `RootSelectionError` with pasteable fixes,
`toPlanningHome` bridge for workflow code. This is the store-aware plumbing that
PORTs with the engine.

**References index.** `references.ts` `assembleReferenceIndex`: per declared store —
registration/clone state, spec inventory with first Purpose lines, sanitized
rendering (prompt-injection-conscious `sanitizeInline`), shell-safe clone recipes;
rendered as an XML block in artifact instructions and a markdown section in apply
instructions; byte-size cap.

**Validation engine.** `validation/validator.ts`: change + spec validators, strict
mode, delta-spec structure checks, scenario-drift/loss checks shared with archive,
JSON reports (`converters/json-converter.ts`). `parsers/`: markdown-parser
(headers/sections), change-parser (deltas), requirement-blocks, spec-structure,
code-fence mask (fence-awareness is load-bearing since A1).

**Archive/sync engine.** `archive.ts` + `specs-apply.ts` as described under the
`archive` command. Standalone note: **there is no `sync` command** — mid-change spec
sync is agent-driven (the `openspec-sync-specs` skill has the agent edit main specs
directly); the delta-merge engine runs only inside archive.

**Change metadata.** `change-metadata/schema.ts` + `utils/change-metadata.ts`:
`.openspec.yaml` per change (schema, created, goal, affected_areas,
retire_capabilities, initiative link — initiative is vestigial, the flag is a hidden
rejection).

**Stores engine.** `core/store/`* as described under `store`; registry lives in the
global data dir; `store.yaml` identity (id, canonical remote); git backend probes.

**Worksets/working-set/context/doctor engine.** `worksets.ts` (locked JSON state,
code-workspace generation), `openers.ts` (opener table + PATH scan + launch argv),
`working-set.ts` (root + references → member list), `relationship-health.ts`,
`file-state.ts` (lock/read/write with corruption errors), `id.ts` (kebab ids).

**Completions engine.** Declarative `COMMAND_REGISTRY` mirroring the entire CLI
(must be maintained in lockstep by hand), shared `COMMON_FLAGS`, per-shell
generators/installers/templates, `completion-provider.ts` for dynamic data,
`shell-detection.ts`.

**Misc.** `src/prompts/searchable-multi-select.ts` (inquirer-based picker),
`src/ui/` (welcome screen, ascii patterns), `src/utils/` (file-system with
path canonicalization + win32-aware permission checks, interactive TTY guards,
item/spec discovery, fuzzy match, task-progress parsing, change-utils),
`src/index.ts` (library export). `test/helpers/run-cli.ts` auto-rebuilds `dist/`
for CLI tests. `docs/` still largely upstream-flavored (Track C row 5).

## 1.3 Platform-specific code (we are macOS/Linux only — flagged for the port)


| Location                                                 | What                                                         | Note                          |
| -------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| `core/completions/generators/powershell-generator.ts`    | PowerShell completion script generator                       | Windows-only value; drop      |
| `core/completions/templates/powershell-templates.ts`     | PowerShell helper templates                                  | drop                          |
| `core/completions/installers/powershell-installer.ts`    | PS profile discovery incl. `Documents/WindowsPowerShell`     | drop                          |
| `utils/shell-detection.ts`                               | PSModulePath / `cmd.exe` / win32 branches                    | keep zsh/bash/fish paths only |
| `core/completions/factory.ts` + zsh/bash/fish generators | `powershell` listed in supported shells / completion values  | prune the value               |
| `core/global-config.ts`                                  | `%APPDATA%` / `%LOCALAPPDATA%` fallbacks, `path.win32` joins | XDG/macOS paths only          |
| `core/openers.ts`                                        | win32 PATHEXT + `path.win32` candidate logic                 | posix only                    |
| `core/references.ts:71-73`                               | win32 double-quoting for pasteable clone commands            | posix single-quote only       |
| `utils/file-system.ts`                                   | win32 permission-bit skip; `path.win32.normalize` branch     | posix only                    |
| `ui/ascii-patterns.ts`                                   | win32 unicode fallback guard                                 | drop                          |


---

# Part 2 — UPSTREAM DELTA (ideas only, no verdicts)

Source: `ops/upstream-shopping-2026-08.md` (window `65a7233f..1ebddd17`, 183 commits)
minus what already landed (A1 archive/sync sweep, archived 2026-08-24). Fresh look
2026-08-24: upstream main gained only `f1b521df` (docs-site rebuild under
`website/`) since the window closed. One line per idea.

**Validate / parser / change resolution (shopping §A2, not yet adopted):**

- #1521 count every level-4 header as a scenario in the loss guard.
- #1604 `validate --archived` lints task completion of archived changes.
- #1523 warn on ambiguous task numbering.
- #1486 count indented sub-tasks in task progress.
- #1502 allow non-English requirement prose to validate.
- #1435 allow numeric-prefixed change names.
- #1392 reject a delta spec at the change's `specs/` root.
- #1399 accept zero-delta changes that declare `skip_specs`.
- #1411 stop delta section dividers becoming phantom requirements.
- #1151 ignore fenced code blocks when parsing delta specs.
- #1281 unified requirement reader (refactor enabling several fixes above).
- #1433/#1375 resolve changes by directory / `--change` finds on-disk names.
- #1612 reject missing roots for list and validate.

**Stores / schema resolution (§A3, not yet adopted):**

- #1703/#1360 resolve main-spec reads/writes against the store-aware root everywhere.
- #1616 honor canonical root selection.
- #1607 preserve YAML formatting when forking a schema.
- #1299 resolve symlinked schema directories.
- #1363 one default store per machine.
- #1328 fix empty store registration.
- #1287 doctor notes when a store checkout is behind its upstream ref.
- #1455 resolve store pointer for `view`.

**Completions / CLI polish (§A4, not yet adopted):**

- #1364 install the right completions for fish.
- #1374 stop emitting broken PowerShell switch blocks (moot if PS dies).
- #1704 print the completions tip from the CLI instead of a postinstall script.
- #1361 use local dates for CLI date-only values.
- #1463/#1667 checkbox markers in multi-select / @inquirer/prompts v8 migration.
- #1426 invoke the CLI without a shell in tests.

**Features (§B):**

- #1303 cluster: shared `.agents` skills target with `legacySkillsDirs` +
`detectionPaths` migration pattern (this IS the Track B design input).
- #1300 `allowed-tools` frontmatter auto-approving the openspec CLI in generated skills.
- #1062 runtime context + operation guidance injected into workflow instructions (big; needs a proper read).
- #1470 `openspec update` offers to upgrade a stale CLI.
- #1610/#1656 `requiresIdeRestart` tool metadata + targeted restart hints.
- #1685 `openspec init --language` writing a Language block into config `context`.
- #1415/#1425 config prototype-key guards, dependabot config, SECURITY.md.
- #1327/#1341/#1357 beta prerelease workflow, release skill, skills.sh publishing.

**Prose lessons (§C, content not code):**

- C1 skill-prose: generic todo instruction (#1403), neutral ask-the-user (#1464),
re-read dependency artifacts from disk (#1368), don't archive before sync
finishes (#1394), stop bulk archive on Cancel (#1398), auto-select the only
active change (#1468), wait-for-explicit-implementation-request +
honor-requested-schema + don't-skip-specs (#1501/#1504/#1412), scaffold before
capturing artifacts (#1503), give explore the project context (#1408), surface
deferred scope (#1530), schema instruction field authoritative (#1405), show
main-spec format in sync-specs (#1402).
- C2 schema-instruction: design must not restate the proposal (#1401), open
questions = deferrable-only (#1366), spec = behavior contract not implementation
plan (#1326), every task states its verification (#1660).

**Mechanical hygiene (§D):** advisory dep patches, `mkdtemp` test temp dirs,
inquirer v8, Node version bumps — do our own audit, use PRs as a heads-up list.

**Deferred from the A1 sweep (upstream end-state we chose not to land yet):**

- Concurrency hardening: content fingerprinting, archive claim locks, spec
snapshots with rollback, verified copy-then-remove `moveDirectory`,
displaced-file retirement protocol.
- #1499 path-confinement machinery (trust roots, `assertPathWithin`) for spec
discovery.

**In-flight upstream branches (not on their main; candidates for a later trip):**

- `TabishB/web-dashboard-WITH-openspec` web dashboard.
- Change-stacking work.

**Fresh look (post-window):**

- #1649/`f1b521df` docs-site rebuild from docs-lab (website-only).

---

# Part 3 — THE PRD (functional requirements for the ported CLI)

Grouped by capability. Every requirement is tagged; ADOPT-NOW rows name the PORT
candidate module or FRESH design need; dependency marks per the legend.

## 3.1 Change lifecycle core


| ID    | Requirement                                                                                                                                                                          | Tag       | Port / design                                                                                                      | Depends                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| FR-01 | Create a change dir with metadata (`new change`: name validation, README, `.openspec.yaml` with schema/created/goal/retire_capabilities)                                             | ADOPT-NOW | PORT `workflow/new-change.ts`, `change-metadata/`                                                                  | [TRACK-F]                                      |
| FR-02 | Artifact status for a change (`status`): per-artifact done/unlocked/blocked, schema-aware, `--json`                                                                                  | ADOPT-NOW | PORT `workflow/status.ts`, `artifact-graph/`                                                                       | [TRACK-F]                                      |
| FR-03 | Enriched artifact-creation instructions (`instructions <artifact>`): schema instruction + template + dependency state + config `context`/`rules` injection + referenced-stores block | ADOPT-NOW | PORT `workflow/instructions.ts`, `artifact-graph/instruction-loader.ts`                                            | [TRACK-F]                                      |
| FR-04 | Apply-phase instructions (`instructions apply`): tasks.md parse with completion state                                                                                                | ADOPT-NOW | PORT same modules                                                                                                  | [TRACK-F]                                      |
| FR-05 | JIT wave-plan instructions (`instructions wave-plan --wave N`, 0 = tracer bullet)                                                                                                    | ADOPT-NOW | PORT `generateWaveInstructions`                                                                                    | [TRACK-F] (the spine's per-wave prompt source) |
| FR-06 | List changes with task progress and recency; list specs; `--json`                                                                                                                    | ADOPT-NOW | PORT `core/list.ts`                                                                                                | [TRACK-F] (skills use `list --json`)           |
| FR-07 | List exploration notes pending vs linked (`list --explorations`)                                                                                                                     | ADOPT-NOW | PORT (explore skill depends on it); note BACKLOG Track C wants NORTH-STAR/BACKLOG/HISTORY out of that folder first |                                                |
| FR-08 | Show change/spec as JSON or markdown with filters (`show`, `spec show`)                                                                                                              | ADOPT-NOW | PORT `commands/show.ts`, `spec.ts`, `converters/`                                                                  | [TRACK-F] (verify skill reads JSON)            |
| FR-09 | Interactive dashboard (`view`)                                                                                                                                                       | LATER     | not agent-facing; store-pointer bug (#1455) outstanding                                                            |                                                |
| FR-10 | Deprecated noun-first `change show/list/validate` group                                                                                                                              | NEVER     | rebuild drops the deprecated aliases outright                                                                      |                                                |


## 3.2 Validation


| ID    | Requirement                                                                                                                                                                                                                                                                                                                                                          | Tag       | Port / design                                                                              | Depends                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ | ---------------------- |
| FR-11 | Validate a change: structure, delta specs, strict mode, JSON report                                                                                                                                                                                                                                                                                                  | ADOPT-NOW | PORT `validation/`, `parsers/` (5 modules)                                                 | [TRACK-F] (gate steps) |
| FR-12 | Validate specs; bulk `--all/--changes/--specs` with bounded concurrency (`OPENSPEC_CONCURRENCY`)                                                                                                                                                                                                                                                                     | ADOPT-NOW | PORT `commands/validate.ts`                                                                | [TRACK-F]              |
| FR-13 | A2 correctness rows (fenced-block parsing #1151, phantom requirements #1411, sub-task counting #1486, ambiguous numbering #1523, level-4 scenario counting #1521, `skip_specs` zero-delta #1399, root-level delta rejection #1392, numeric-prefix names #1435, missing-root rejection #1612, change resolution by dir #1433/#1375, unified requirement reader #1281) | ADOPT-NOW | FRESH re-implementation during the port (Track A2 sweep folds in; end-state method per A1) | [TRACK-F]              |
| FR-14 | Non-English requirement prose validates (#1502)                                                                                                                                                                                                                                                                                                                      | LATER     | prerequisite for the Italian-artifacts story                                               |                        |
| FR-15 | `validate --archived` (#1604)                                                                                                                                                                                                                                                                                                                                        | LATER     |                                                                                            |                        |
| FR-16 | Unify validator delta-file discovery onto `discoverSpecFiles`; unify fence parsers; store-aware baseline in `change.ts:207`; `mainSpecsDir` in archive pre-validation (the four A1 follow-ups)                                                                                                                                                                       | ADOPT-NOW | FRESH (small, fold into the port of FR-11/FR-20)                                           |                        |


## 3.3 Archive / spec sync


| ID    | Requirement                                                                                                                                                                                                          | Tag       | Port / design                                          | Depends                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------ | ------------------------ |
| FR-20 | Archive a change: strict pre-validation, task-completion confirm, delta merge into main specs, dated archive move, exit codes, rerun hints, non-TTY plain output, `--skip-specs`, `--no-validate` guarded            | ADOPT-NOW | PORT `core/archive.ts` (A1 already landed here)        | [TRACK-F] (archive step) |
| FR-21 | Delta-merge engine: ADDED/MODIFIED/REMOVED/RENAMED, fence-aware, idempotent no-ops, Purpose preservation, scenario-loss refusal, capability retirement (`retire_capabilities` + hint ladder), canonical spec rebuild | ADOPT-NOW | PORT `core/specs-apply.ts`                             | [TRACK-F]                |
| FR-22 | Mid-change spec sync stays agent-driven (skill instructs edits; no `sync` command)                                                                                                                                   | ADOPT-NOW | no code; keep the `openspec-sync-specs` skill contract | [TRACK-B]                |
| FR-23 | Archive concurrency hardening (fingerprints, claim locks, snapshots/rollback, verified move) + #1499 path confinement                                                                                                | LATER     | deferred A1 rows; single-user pressure is low          |                          |


## 3.4 Schemas


| ID    | Requirement                                                                                                                            | Tag       | Port / design                                                                     | Depends   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- | --------- |
| FR-30 | Three-tier schema resolution (project → user → built-in), zod-validated YAML, deep-planning as the only built-in and hardcoded default | ADOPT-NOW | PORT `artifact-graph/resolver.ts` + `schema.ts` + `schemas/deep-planning/` bundle | [TRACK-F] |
| FR-31 | `schemas` and `templates` listings (`--json`)                                                                                          | ADOPT-NOW | PORT `workflow/schemas.ts`, `workflow/templates.ts`                               |           |
| FR-32 | `schema which/validate/fork/init` (customization surface)                                                                              | ADOPT-NOW | PORT `commands/schema.ts`; Paolo runs local schema experiments                    |           |
| FR-33 | Fork preserves YAML formatting (#1607); symlinked schema dirs resolve (#1299)                                                          | LATER     | fold into any future schema touch                                                 |           |


## 3.5 Skills: generation, install, translation layer


| ID    | Requirement                                                                                                                                                                                                                                                                                                       | Tag       | Port / design                                                                                                        | Depends             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- | ------------------- |
| FR-40 | Skills authored as multi-file bundles in `schemas/skills/<name>/` with bundle markers and `${...}` seams; thin TS factories read frontmatter                                                                                                                                                                      | ADOPT-NOW | PORT `shared/skill-bundle.ts`, `skill-generation.ts`, `templates/`                                                   | [TRACK-B]           |
| FR-41 | The 10 workflow skills install on init/update, version-checked refresh, canonical placement                                                                                                                                                                                                                       | ADOPT-NOW | PORT `workflow-skills.ts`, `shared/skill-install.ts`, `core/update.ts`                                               | [TRACK-B] [TRACK-F] |
| FR-42 | AI_TOOLS pruned to the stance: **pi, claude, cursor, agents** (from today's 31); `AI_TOOLS` keeps only location/detection data                                                                                                                                                                                    | ADOPT-NOW | FRESH (Track B change; today's list is the eviction candidate set)                                                   | [TRACK-B]           |
| FR-43 | Per-target adapter modules (renderFrontmatter/renderBody/renderAgents/targetDir; Pi = identity) composing a shared transform library; spawn-macro seam; emit matrix `.pi`/`.claude`/`.cursor`/`.agents` (`.agents` only when a generic tool is targeted) replacing today's canonical-store-plus-symlink placement | ADOPT-NOW | FRESH (design settled in shopping §B2; supersedes `skill-install.ts`'s symlink model and kills the `flatten` export) | [TRACK-B]           |
| FR-44 | Parity wall over every generated artifact + one-command rebaseline, extended per-adapter                                                                                                                                                                                                                          | ADOPT-NOW | PORT `skill-templates-parity.test.ts` + `scripts/rebaseline-skill-hashes.mjs`; FRESH per-adapter golden files        | [TRACK-B]           |
| FR-45 | `allowed-tools` frontmatter auto-approving the openspec CLI (claude enforced, pi inert-but-harmless) (#1300)                                                                                                                                                                                                      | ADOPT-NOW | FRESH (small; sequenced after FR-43 per §B2)                                                                         | [TRACK-B]           |
| FR-46 | `requiresIdeRestart` metadata + restart hints (#1610/#1656)                                                                                                                                                                                                                                                       | LATER     | fold into FR-42/43 change if Cursor keeps a dedicated adapter                                                        | [TRACK-B]           |
| FR-47 | `legacySkillsDirs`/`detectionPaths` migration pattern for moved skill roots                                                                                                                                                                                                                                       | LATER     | reusable pattern from #1303 when emit matrix lands                                                                   | [TRACK-B]           |
| FR-48 | C1+C2 prose-lesson audit over `schemas/skills/` + `schemas/deep-planning/`                                                                                                                                                                                                                                        | ADOPT-NOW | FRESH content pass (no code; BACKLOG Track A row)                                                                    |                     |


## 3.6 Init / update


| ID    | Requirement                                                                                                                  | Tag       | Port / design                                                                             | Depends                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| FR-50 | `init`: dir scaffold, config.yaml creation, tool detection + interactive/`--tools` selection, extend mode, pointer-dir guard | ADOPT-NOW | PORT `core/init.ts` (already trimmed of profiles/telemetry); tool list shrinks with FR-42 | [TRACK-B]                 |
| FR-51 | `update`: stale-skill detection and refresh, canonical-store refresh, new-tool hints, `--force`                              | ADOPT-NOW | PORT `core/update.ts`; placement changes with FR-43                                       | [TRACK-B]                 |
| FR-52 | Deprecated `experimental` alias                                                                                              | NEVER     | drop in rebuild                                                                           |                           |
| FR-53 | `update` offering to upgrade a stale CLI (#1470)                                                                             | NEVER     | single user of `@pfurini/openspec`                                                        |                           |
| FR-54 | `init --language` convenience flag (#1685)                                                                                   | LATER     | `context:` hand-edit already achieves it; revisit with the Italian-clients discussion     |                           |
| FR-55 | Runtime context / operation guidance beyond our `context` injection (#1062)                                                  | LATER     | needs the proper read first (Track A row)                                                 | [TRACK-F] candidate input |


## 3.7 Stores, context, doctor, worksets (ledger-pending surface)


| ID    | Requirement                                                                                                                                                                              | Tag                                                                                                               | Port / design                                                                                                                                                                                                                                                                                                                                                                 | Depends  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-60 | Store-aware root resolution INSIDE the engine: `--store` selection, store pointer fallback, registered-store inspection, `RootSelectionError` fixes, store banner, `withStoreFlag` hints | ADOPT-NOW                                                                                                         | PORT-with-engine `root-selection.ts`, `openspec-root.ts`, `planning-home.ts`, `project-config.ts` store pointer (NOT separable)                                                                                                                                                                                                                                               | [LEDGER] |
| FR-61 | Referenced-stores index in instructions (declarations, health, sanitized rendering, clone recipes)                                                                                       | ADOPT-NOW                                                                                                         | PORT-with-engine `references.ts` (instructions depend on it)                                                                                                                                                                                                                                                                                                                  | [LEDGER] |
| FR-62 | `store setup/register/unregister/remove/list/doctor` command surface                                                                                                                     | LATER (pending ledger-home design)                                                                                | PORT candidate exists (`core/store/`, `commands/store.ts`); boarding decision waits for Track E1                                                                                                                                                                                                                                                                              | [LEDGER] |
| FR-63 | `context` command (working context + `--code-workspace` writer)                                                                                                                          | LATER (same gate)                                                                                                 | `commands/context.ts`, `working-set.ts`                                                                                                                                                                                                                                                                                                                                       | [LEDGER] |
| FR-64 | `doctor` command (relationship health + fixes)                                                                                                                                           | LATER (same gate)                                                                                                 | `commands/doctor.ts`, `relationship-health.ts`                                                                                                                                                                                                                                                                                                                                | [LEDGER] |
| FR-65 | `workset` group (saved views, openers, code-workspace generation)                                                                                                                        | NEVER (decided 2026-08-24)                                                                                        | Delete: `commands/workset.ts` + `workset-input.ts` + `workset-prompts.ts`, `core/worksets.ts`, `core/openers.ts` (workset is its only consumer; kills the win32 PATHEXT logic), workset completions rows and tests. Keep: `file-state.ts` (store registry uses it), `id.ts`, `expandUserPath` (store-owned). `context --code-workspace` (FR-63) is independent and unaffected |          |
| FR-66 | A3 store-root correctness rows (#1703/#1360/#1616/#1363/#1328/#1287/#1455 + the `change.ts:207` baseline)                                                                                | ADOPT-NOW for the rows touching engine plumbing (root-aware main-spec reads); LATER for command-surface-only rows | FRESH (Track A3 sweep folds into the port)                                                                                                                                                                                                                                                                                                                                    | [LEDGER] |
| FR-67 | `openspec ledger record` CLI (receipts entry point for non-Pi harnesses)                                                                                                                 | ADOPT-NOW (process needs it, Track E2)                                                                            | FRESH design, gated on the ledger-home session                                                                                                                                                                                                                                                                                                                                | [LEDGER] |


## 3.8 ADR, lint, reverse, explorations


| ID    | Requirement                                                                                    | Tag       | Port / design                                                        | Depends |
| ----- | ---------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------- | ------- |
| FR-70 | ADR registry generation/verification from frontmatter (`adr index --check/--force`)            | ADOPT-NOW | PORT `core/adr/` (MINE)                                              |         |
| FR-71 | Deterministic grounding-lint runner with the ADR rule (`lint --adr`), extensible rule set      | ADOPT-NOW | PORT `core/lint/`; hook/CI wiring stays a parked idea                |         |
| FR-72 | Brownfield reverse: `reverse scan` (capability map) + `reverse scaffold` (idempotent skeleton) | ADOPT-NOW | PORT `core/reverse/` (MINE; the openspec-reverse skill shells to it) |         |


## 3.9 Config, completions, contract


| ID    | Requirement                                                                                                                                                     | Tag       | Port / design                                                                                                            | Depends                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| FR-80 | Global config: XDG-located file, `featureFlags` only, retired-key stripping, get/set/unset/reset/edit with coercion and unknown-key guard                       | ADOPT-NOW | PORT `global-config.ts`, `config-schema.ts`, `commands/config.ts`; drop APPDATA/LOCALAPPDATA branches                    |                                     |
| FR-81 | Config prototype-key guards + dependabot (#1415/#1425)                                                                                                          | ADOPT-NOW | FRESH small (guards touch FR-80 modules; dependabot is repo config)                                                      |                                     |
| FR-82 | Shell completions for **bash** (generate/install/uninstall + `__complete` dynamic data + declarative command registry; Paolo uses bash on both macOS and Linux) | ADOPT-NOW | PORT `core/completions/` minus PowerShell; registry must mirror the ported command set (manual lockstep is a known cost) |                                     |
| FR-83 | zsh + fish completions (incl. #1364 fish install fix, #1704 CLI-printed tip)                                                                                    | LATER     | same engine, activate when wanted                                                                                        |                                     |
| FR-84 | PowerShell completions (generator, installer, templates, shell-detection branches, broken-switch fix #1374)                                                     | NEVER     | macOS/Linux only                                                                                                         |                                     |
| FR-85 | Agent JSON contract: every `--json` failure = exactly one JSON document with null-shape + status array; `diagnostic.fix` pasteable fixes in human mode          | ADOPT-NOW | PORT `shared-output.ts` + `failWithError` pattern (cross-cutting)                                                        | [TRACK-F] (the engine parses these) |
| FR-86 | CLI polish rows: local dates (#1361), inquirer v8 + checkbox markers (#1463/#1667), shell-less CLI test invocation (#1426), own `pnpm audit` pass               | ADOPT-NOW | FRESH mech chore during the port (A4/§D)                                                                                 |                                     |
| FR-87 | postinstall script surface                                                                                                                                      | NEVER     | private monorepo; print tips from the CLI if ever needed (#1704 idea)                                                    |                                     |
| FR-88 | npm publishing machinery (changesets, pack-version guard, prerelease workflow #1327/#1341, skills.sh #1357)                                                     | NEVER     | repo going private; no publishing                                                                                        |                                     |


## 3.10 Identity rename — OpenIntent (decided with Paolo 2026-08-24)

Scope rule: internal module/file names keep their original names (preserves upstream
diffability for future shopping trips); everything user-facing renames. **No
compatibility aliases anywhere** — fresh start. The few existing projects are converted
wholesale (including archived changes' `.openspec.yaml` `schema:` fields) or
re-initialized; no migration machinery ships in the CLI.


| ID    | Requirement                                                                                                                                                                                                                                                                                                                                                          | Tag       | Port / design                                                                 | Depends                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| FR-90 | Product = **OpenIntent**; repo renamed; bin `**openintent`**; package `**@pfurini/openintent**`; `program.name`, welcome screen, success strings; docs written fresh under the new name (merges with the Track C docs rewrite — written once, never rewritten)                                                                                                       | ADOPT-NOW | FRESH strings work in the new repo (tier 1, trivial)                          |                                                                      |
| FR-91 | Rebrand sweep of generated and user-facing strings: every `openspec …` invocation in skill prose, completions generator command names, pasteable hints (`withStoreFlag`, `Fix:` strings, archive rerun hints), test expectations — one sweep, one commit, one parity rebaseline                                                                                      | ADOPT-NOW | FRESH sweep at port time (tier 2, broad but mechanical)                       | [TRACK-B]                                                            |
| FR-92 | Default schema renamed `**intent-driven**`: bundle dir `schemas/intent-driven/`, `DEFAULT_SCHEMA`/`REPO_DEFAULT_SCHEMA`, flag descriptions, schema-prose path mentions; the resolver knows ONLY the new name (no `deep-planning` fallback)                                                                                                                           | ADOPT-NOW | PORT the deep-planning bundle under the new name                              | [TRACK-F]                                                            |
| FR-93 | On-disk contracts renamed, fresh start: project dir `**openintent/**` (root walk, `classifyOpenSpecDir`, store skeletons, path mentions in schema/skill prose), per-change metadata file `**.openintent.yaml**`, env `**OPENINTENT_CONCURRENCY**`, managed-block markers `<!-- OPENINTENT:START/END -->`, global config dir `~/.config/openintent` + global data dir | ADOPT-NOW | FRESH (one-shot hand conversion of Paolo's few projects/stores is acceptable) | [LEDGER] (store skeletons and the registry live in the renamed dirs) |
| FR-94 | Skill naming = bare `**opin-<name>**`, identical across all targets (Option A): frontmatter name == dir name everywhere, adapters never translate names, Track B ownership/prune rule becomes the `opin-` prefix; no `:` in stored names (avoids the Pi ADR-0008 `skill:agent` grammar collision and satisfies Cursor's name==dir constraint)                        | ADOPT-NOW | FRESH rename of the 10 bundles + parity rebaseline (folds into FR-91's sweep) | [TRACK-B]                                                            |
| FR-95 | Pi-side `opin:` invocation sugar (cosmetic prefix alias in the Pi fork's picker; zero content divergence, receipts always record the bare name)                                                                                                                                                                                                                      | LATER     | Pi fork feature, reversible any time                                          |                                                                      |


Ledger event naming (semconv, FR-67) starts as `openintent.*` from day one — no rename
debt ever accrues there.

## 3.11 Explicit NEVER inventory (recorded so the port has a deletion list)

- The workset feature (FR-65): `commands/workset*.ts`, `core/worksets.ts`,
`core/openers.ts`, workset completions rows and tests.
- All Part 1.3 platform-specific code (Windows/PowerShell paths, generators,
installers, detection branches, PATHEXT logic, APPDATA fallbacks, win32 quoting,
ascii fallback).
- The 27 AI_TOOLS entries outside pi/claude/cursor/agents (and every upstream
tool-adapter idea: Rovo, MiniMax, CodeArts, ZCode, Hermes, Kimi, Devin, Copilot
coding-agent, Zoo, Oh My Pi, Trae, Qwen, Command Code, OpenCode args).
- Telemetry, feedback, profiles (evicted; upstream rows permanently N/A).
- Command generation / slash-command adapters (skills are the superset).
- Deprecated surfaces: `change` noun group, `experimental` alias,
`--requirements-only` alias (drop with a clean break in the rebuild).
- Marketing website / docs-site machinery (incl. fresh #1649).
- `--store-path` hidden rejection can die with the rebuild if the resolver's error
covers it (decide at port time; it exists only to reject politely).

## 3.12 Cross-cutting port notes

1. **The completions registry is a second copy of the CLI.** Every ported command
  must update `command-registry.ts` or completions drift silently. A rebuild could
   derive the registry from Commander metadata instead (FRESH idea, unscored).
2. **Store plumbing is woven through**: `root-selection` is imported by cli/index,
  show, validate, archive, list, context, doctor, and all workflow commands. The
   Track E1 constraint (plumbing ports with engine) is structurally confirmed.
3. **The instruction endpoints are the factory's API.** Track F's spine consumes
  `instructions`/`instructions apply`/`instructions wave-plan`/`status`/`list  --json`/`show --json`/`validate --json`/`archive --json`. Any rebuild must keep
   these contracts byte-compatible or version the skills with them (parity wall
   covers the skill side; nothing covers the JSON shapes today — a FRESH
   contract-test idea worth scoring).
4. **Monorepo target** (Track F first unit): `packages/cli` = today's `src/`;
  adapters (FR-43) and the workflow engine land as sibling packages per the
   structure-preserving vendor rule.

