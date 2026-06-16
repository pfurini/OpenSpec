# Command Retirement — Clean Sweep (handoff plan)

Status: **IN PROGRESS — Stage-1 flip done (build green, 6 tests red, UNCOMMITTED).**
Owner mandate (2026-06-16, verbatim intent): commands are dead. Every agent/tool has migrated to
skills; ~99% support `.agents/skills`. **No command machinery left anywhere in the project. No
backward-compat, no migration dances** — if a user wants to migrate, they delete and reinstall.
`openspec update` must still work (for skills). Clean sweep, zero command leftovers.

Branch: `feat/explore-what-brainstorming`. Local commits are UNPUSHED — do not push unless asked.

---

## 0. Locked decisions (do NOT re-litigate)

- **Hard-delete**, not deprecate. The owner accepted that ~26 tools never verified for SKILL.md
  support may go dark; that is an accepted trade-off. Do not add opt-in/escape hatches.
- **No migration / no active-cleanup of existing command files.** Do not write code to remove users'
  old command files. Delete + reinstall is the user's migration path.
- **`delivery` config is removed entirely** (field, type, all reads, drift branches, workspace
  `last_applied_delivery`). No vestigial field, no config migration.
- **Skills are the sole artifact.** Skill name = directory name = the universal identifier. Prefix
  stays `openspec-` (NOT `opsx-` — owner reconfirmed keep; a rename was rejected as 380-site churn).
- **Skill bodies reference sibling skills by full name** (e.g. `openspec-continue-change`), never by
  `/opsx:` slash-command syntax. The authoritative command-id→skill-dir map is `getSkillTemplates()`
  in `src/core/shared/skill-generation.ts` (irregular: continue→openspec-continue-change,
  sync→openspec-sync-specs, ff→openspec-ff-change).
- **`update` stays functional** for skills (version detection + re-emit). Only command logic is removed.

## Out of scope for THIS sweep (separate, pending tasks — do not start)

- **Delivery model** (canonical `.agents/skills/<name>` written once + per-skill Claude symlink with
  copy-fallback; drop per-tool skill dirs). Already DESIGNED & DECIDED (per-skill symlink; copy-with-
  warning fallback; Claude-only symlink for now; Claude confirmed to follow symlinks). NOT built. This
  is the next big task AFTER the sweep. Mentioned only so you don't conflate it.
- Full ADR/glossary/explore→specs work from `design-tasks-pipeline-collapse.md` etc.

---

## 1. Skill system primer (so you don't relearn it)

- Skills are authored as real dirs under `schemas/skills/<name>/` — `SKILL.md` (with YAML frontmatter:
  `name`/`description`/`license`/`compatibility`/`metadata`) + `references/*.md` + optional `scripts/`.
  Only `openspec-design` is currently multi-file (has `references/`); the rest are single `SKILL.md`
  authored inline as TS template literals in `src/core/templates/workflows/*.ts`.
- `loadSkillSource()` (`src/core/shared/skill-bundle.ts`) parses frontmatter + globs `references/` and
  `scripts/`. `design.ts` reads name/description from the parsed frontmatter (single source of truth).
- **Bundle blocks**: `<!--bundle:start-->…<!--bundle:end-->` in SKILL.md. Full mode strips the fences
  (author prose kept verbatim); flatten mode replaces the block with the named files' content.
  `validateBundleBlocks` throws if a `references/`|`scripts/` path inside a block is missing.
- **Parity guard**: `test/core/templates/skill-templates-parity.test.ts` SHA-256s every generated
  artifact. ANY skill edit trips it by design. After skill edits run **`pnpm run rebaseline:skills`**
  (builds → recomputes from `dist/` → rewrites only changed literals), then `pnpm test`. NEVER hand-
  edit the hashes. This sweep will DELETE the command function-hashes from that file (see step 4).
- **Ref guard**: `test/core/templates/skill-refs-resolve.test.ts` asserts every `openspec-*` token in
  a skill body resolves to a real skill dir. Keep it green.

## Commands & tooling

- Package manager **pnpm**. `pnpm run build` (tsc via build.js), `pnpm test` (vitest), `pnpm exec
  vitest run <file>` for focused, `pnpm run rebaseline:skills` for parity hashes.
- `dist/` is gitignored/untracked. tsc tolerates unused locals (build stays green on `★` warnings) —
  but clean up unused imports you create.
- Commits: one-line Conventional Commits (`refactor(skills): …`, `chore(scripts): …`), longer body
  after a blank line OK. Commit the parity test file alongside skill changes.
- There is an **`advisor`** tool (no params; forwards full transcript). Call it before committing to
  the deletion approach and before declaring done. It already pressure-tested this plan once.
- AGENTS.md (committed; CLAUDE.md is no longer gitignored) is the project instruction file — re-read it.

---

## 2. Current uncommitted WIP (in the working tree — keep as starting point)

Build compiles; 6 tests fail (all vestigial-`delivery` drift — they vanish when `delivery` is deleted).
Changes already made (a partial Stage-1 "flip", to be subsumed by real deletion):

- `src/core/init.ts`, `src/core/update.ts`, `src/core/workspace/skills.ts`: forced
  `shouldGenerateSkills = true; shouldGenerateCommands = false;` (replace these hacks with real
  deletion of the command branches). Dropped unused `Delivery` import in init.ts.
- `src/core/config-schema.ts`, `src/core/global-config.ts`: `delivery` default `'both'` → `'skills'`
  (these get deleted outright in the sweep).
- `test/core/init.test.ts`: command-format + delivery-mode tests deleted; Kimi/legacy-cleanup/re-init
  rewritten to skills-only contract. **GREEN — keep.**
- `test/core/update.test.ts`: command-update / commands-only / legacy-create tests deleted; no-inject
  rewritten to skills. (2 messaging tests still red — fixed by deleting `delivery` drift.)
- `test/core/global-config.test.ts`: default assertions `'both'` → `'skills'`. **GREEN — keep.**

The 6 remaining red tests: update "up to date" + "only update tools that need updating"; workspace
"does not report profile drift…", "installs profile-selected … root only", "updates stored workspace
skills…"; artifact-workflow "creates skills for Cursor tool". All resolve once `delivery`/command
drift is removed.

---

## 3. Removal surface (mapped)

- **`delivery`**: ~105 refs across 13 source files — `config-schema.ts`, `global-config.ts`,
  `init.ts`, `update.ts`, `migration.ts`, `profiles.ts`, `profile-sync-drift.ts`,
  `completions/command-registry.ts`, `workspace/{foundation,legacy-state,skills}.ts`,
  `commands/config.ts`, `commands/workspace.ts`.
- **Command pipeline**: `src/core/command-generation/` — **31 files** (27 tool adapters +
  `generator.ts`, `index.ts`, `registry.ts`, `types.ts`). Delete the whole dir.
- **Command templates**: `getOpsx*CommandTemplate` in the 11 `src/core/templates/workflows/*.ts`
  files; `getCommandContents` + `CommandTemplate` type (`src/core/templates/types.ts`,
  `skill-templates.ts`, `skill-generation.ts`); `generateCommands`, `CommandAdapterRegistry` usages;
  `removeCommandFiles` (init.ts, update.ts); `transformToHyphenCommands`
  (`src/utils/command-references.ts` + adapter + skill-install usages).
- **`profile-sync-drift.ts`**: `hasToolProfileOrDeliveryDrift` currently takes `delivery` and checks
  command files (lines ~89-162). Reduce to skills-only drift: drop the `delivery` param, the
  `CommandAdapterRegistry`/adapter usage, and all command-file branches. Cascade signature change to
  `getToolsNeedingProfileSync` and callers.
- **Tests**: `test/core/command-generation/*.test.ts` (4 files) — delete. Command assertions in
  `migration.test.ts`, `legacy-cleanup.test.ts`, `profile-sync-drift.test.ts`, `workspace.test.ts`,
  `artifact-workflow.test.ts`, `skill-bundle.test.ts`, `skill-generation.test.ts`. Parity test:
  remove the `getOpsx*CommandTemplate` keys from `EXPECTED_FUNCTION_HASHES`.
- **Onboard prose**: `schemas/skills/.../onboard.ts` skill body still has ~20 `/opsx:` refs (cheatsheet
  tables "Command Reference" + invocation prose). Convert to skill names + reframe "Command" →
  "Skill". This is the LAST command leftover in any skill body; once gone, delete
  `transformToHyphenCommands` entirely.
- **Docs**: `AGENTS.md` "Editing skills & templates" section references the bundle/command flow;
  scrub command-generation mentions. Grep the repo for stray `command` / `/opsx:` / `delivery` in
  docs and comments.

---

## 4. Execution order (delete boldly; let tsc + tests be the signal)

The deletion IS the goal, so compile errors are the guiding signal, not a regression to fear.

1. **`delivery` out of drift first** — rewrite `profile-sync-drift.ts` to skills-only (drop param +
   command branches); cascade to `getToolsNeedingProfileSync` + `update.ts`/`workspace` callers.
   Re-run the 6 red tests → expect them to clear (or convert workspace/artifact fixtures that still
   encode `delivery`/`both`). Build + targeted tests green.
2. **Delete the command pipeline** — `rm -rf src/core/command-generation/`; delete its barrel exports
   and every import. Delete `getOpsx*CommandTemplate`, `getCommandContents`, `CommandTemplate`,
   `generateCommands`, `removeCommandFiles`, `transformToHyphenCommands` + their imports/usages. Fix
   all tsc errors.
3. **Purge `delivery`** from the remaining files (config-schema, global-config, init, update,
   migration, profiles, completions, workspace ×3, commands ×2). Remove the type, field, all reads,
   workspace `last_applied_delivery`. Build green.
4. **Tests + parity** — delete `command-generation/*.test.ts`; strip command assertions from the
   other test files; remove command function-hashes from the parity map; `pnpm run rebaseline:skills`;
   `pnpm test` green.
5. **Onboard prose** — convert its `/opsx:` refs to skill names + reframe Command→Skill; rebaseline;
   verify `skill-refs-resolve` + no `/opsx:` remains in ANY `schemas/skills/**` or workflow skill body.
6. **`update` smoke** — run the real CLI (e.g. `node bin/openspec.js update` in a scratch dir, or the
   existing update tests) to confirm skills still install/update with no command code path.
7. **Docs** — scrub `AGENTS.md` + grep the repo for command/delivery leftovers (comments, docs,
   README). Final full `pnpm test` + `pnpm run build` green. Call `advisor`. Commit.

Commit in logical chunks (drift, pipeline, delivery purge, tests/parity, onboard, docs) so history is
reviewable; each commit should build + (where practical) keep the suite green.

## 5. Definition of done

- `grep -rn "delivery\|Delivery\|command-generation\|CommandTemplate\|generateCommands\|/opsx:\|opsx-"
  src schemas` returns nothing meaningful (only legit "acceptance command", `openspec <cli>` CLI
  references, git/shell). Zero command machinery.
- `pnpm run build` exit 0; `pnpm test` fully green; `pnpm run rebaseline:skills` reports no further
  changes after your final rebaseline.
- `update` installs/updates skills with no command code path.
- No migration/compat code added. `delivery` gone from config + schema + workspace state.
