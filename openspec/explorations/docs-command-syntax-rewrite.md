# Docs Command-Syntax Rewrite — execution plan (handoff)

Status: **NOT STARTED.** Self-contained plan for a fresh session.
Branch: `feat/explore-what-brainstorming` (local commits are UNPUSHED — do not push unless asked).

## Background (what already happened)

The **command-retirement sweep is complete and committed** (7 commits on this branch). Slash
commands are gone: `src/core/command-generation/` is deleted, all `getOpsx*CommandTemplate`
factories and the `CommandTemplate` type are removed, the `delivery` config is fully removed, and
`transformToHyphenCommands` is deleted. **Skills are the sole artifact.** Build is green, the full
vitest suite passes, and the §5 grep over `src schemas` is clean.

What remains is **documentation**: the user-facing docs still describe the retired slash commands
with `/opsx:<name>` invocation syntax (~187 references). This was deliberately deferred from the
sweep. This plan finishes it.

## Locked decisions (do NOT re-litigate)

- **Invocation token convention** (verb — "run this"): `/openspec-<skill-name>`, where
  `<skill-name>` is the **actual skill directory name** (not the short workflow id). Examples:
  `` `/openspec-propose` ``, `` `/openspec-continue-change` ``, `` `/openspec-ff-change` ``.
  Rationale: the token *is* the skill any agent loads; self-consistent with the skill dirs. Each
  agent/consumer adapts it to its own invocation mechanism — do **not** audit per-agent skill
  invocation docs (out of scope).
- **Reference style** (noun — "the X skill does Y"): bare `openspec-<skill-name>`, no slash.
  e.g. "the `openspec-propose` skill reads the exploration note".
- **Prefix stays `openspec-`** (a rename to `opsx-` was already rejected).
- No `delivery`, no command machinery, no "slash command file" language anywhere.

## Token map (full skill names — apply longest-id-first)

```
/opsx:bulk-archive → /openspec-bulk-archive-change
/opsx:continue     → /openspec-continue-change
/opsx:archive      → /openspec-archive-change
/opsx:apply        → /openspec-apply-change
/opsx:verify       → /openspec-verify-change
/opsx:sync         → /openspec-sync-specs
/opsx:new          → /openspec-new-change
/opsx:ff           → /openspec-ff-change
/opsx:propose      → /openspec-propose
/opsx:explore      → /openspec-explore
/opsx:onboard      → /openspec-onboard
/opsx:design       → /openspec-design
```

Order matters: replace `bulk-archive` before `archive`; the short ids (`continue`, `apply`, `ff`,
`new`, `sync`, `archive`, `verify`) must map to their FULL skill names, not a literal prefix swap.
This is **not** a blind sed — lines like `You: /opsx:propose add-dark-mode` are invocation examples
that should read naturally as `/openspec-propose add-dark-mode` (token swap is fine here, but read
each surrounding sentence so it still makes sense as "ask your agent to run this skill").

## Project facts you need

- Package manager **pnpm**. Build: `pnpm run build`. Tests: `pnpm test`. Focused:
  `pnpm exec vitest run <file>`. Parity rebaseline: `pnpm run rebaseline:skills`.
- Skills are authored two ways: `openspec-design` lives under `schemas/skills/openspec-design/`;
  every other skill body is a TS template literal in `src/core/templates/workflows/*.ts`
  (e.g. `onboard.ts`). The authoritative workflow-id→skill-dir map is `getSkillTemplates()` in
  `src/core/shared/skill-generation.ts`.
- **Parity-hash gotcha:** `test/core/templates/skill-templates-parity.test.ts` SHA-256s every
  generated skill artifact against frozen literals. ANY edit to a skill body (incl. `onboard.ts`)
  trips it by design. After such an edit run **`pnpm run rebaseline:skills`** (it builds, recomputes
  from `dist/`, rewrites only changed literals), then `pnpm test`. NEVER hand-edit the hashes.
- `test/core/templates/skill-refs-resolve.test.ts` asserts every `openspec-*` token in a skill body
  resolves to a real skill dir — keep it green.
- There is an `advisor` tool (no params, forwards transcript). Call it before committing to the
  approach and before declaring done.
- Commits: one-line Conventional Commits (`docs: …`, `refactor(skills): …`).

---

## Phase A — user docs (the ~187-ref pass)

Doc-only; no source changes; no parity impact. Re-grep counts at the start (`grep -rn "/opsx:" docs
README.md`) — current snapshot:

| File | refs |
|------|------|
| `docs/commands.md` | 61 |
| `docs/workflows.md` | 52 |
| `docs/opsx.md` | 29 |
| `docs/migration-guide.md` | 26 |
| `README.md` | 7 |
| `docs/getting-started.md` | 6 |
| `docs/concepts.md` | 4 |
| `docs/cli.md` | 2 |

Steps:
1. **`docs/commands.md`** — this is the slash-command reference doc. Retitle it to a **skills
   reference** ("Workflow Skills" / "Skill Reference"), convert the command table to skill rows,
   and drop any "slash command file" / per-tool command-path mechanics. (README links to it as
   "workflow skills reference" — keep the link target or update the anchor in README too.)
2. **`docs/workflows.md`** — convert every `You: /opsx:…` example line and every ASCII flow chain
   (`/opsx:propose ──► /opsx:apply ──► …`) to `/openspec-<name>` form; convert the
   `ff` vs `continue` decision table.
3. **`docs/opsx.md`** — the artifact-guided workflow narrative; convert invocations.
4. **`docs/migration-guide.md`** — convert invocations AND verify the "new way" it points users to
   is skills, never a now-dead command.
5. **`docs/getting-started.md`**, **`docs/concepts.md`**, **`docs/cli.md`** — convert remaining
   invocation tokens.
6. **`README.md`** — quickstart `/opsx:propose` example + the expanded-workflow list.
7. Apply reference-vs-invocation style: slash form for "run this", bare name for "the X skill".

Commit Phase A as one `docs:` commit.

## Phase B — align already-converted surfaces (consistency) + reparity

The command-retirement sweep already converted a few invocation surfaces to **bare**
`openspec-<name>` (no slash), predating the locked `/openspec-<name>` convention. Align them:

1. **`src/core/templates/workflows/onboard.ts`** — the "Skill Reference" cheatsheet tables and the
   "Try `openspec-propose`…" prompts: switch invocation forms to `/openspec-<name>`. (Bare names
   inside a "Skill" column that are clearly nouns may stay bare — use judgment; the "Try X" and
   quick-start lines are invocations.)
2. **`src/ui/welcome-screen.ts`** — the quick-start lines (`openspec-new-change` etc.) → slash form.
3. **`src/core/init.ts`** — getting-started message ("Start your first change with the
   openspec-new-change skill") → `/openspec-new-change` form.
4. **`src/core/update.ts`** — the newly-configured-tools getting-started block
   (`openspec-new-change  Start a new change`, etc.) → slash form.
5. Leave the `migration.ts` "the openspec-propose skill" message bare (reference-style).
6. Run **`pnpm run rebaseline:skills`** (onboard body changed → hashes move), then `pnpm test`.

Commit Phase B as one `refactor(skills): …` commit (include the rebaselined parity test file).

## Phase C — verify (definition of done)

1. `grep -rn "/opsx:\|delivery\|slash command\|command file" docs README.md src schemas` returns
   only legitimate hits (e.g. the literal `openspec <cli>` CLI, the two `legacy-cleanup.ts`
   `opsx-*` legacy-detection globs, an English "delivery" in the glossary example).
2. Every `/openspec-<token>` written in docs resolves to a real skill dir (doc-side mirror of the
   `skill-refs-resolve` guard — spot-check the irregular ones).
3. README anchors to any retitled/renamed doc still resolve.
4. `pnpm run build` exit 0; `pnpm test` fully green; `pnpm run rebaseline:skills` reports
   "no changes" on a clean run.
5. Call `advisor`. Commit. Do not push.

## Out of scope (separate tasks — do NOT start)

- `AGENTS.md` "Editing skills & templates" section and any `docs/customization.md` skill-**authoring**
  content: these describe the TS-literal authoring format and belong with the upcoming
  **TS → `schemas/skills/<name>/` source-format conversion**, not this doc pass.
- The **delivery model** (canonical `.agents/skills/<name>` + per-skill symlink/copy-fallback).
- Per-agent skill-invocation audit.
