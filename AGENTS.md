# OpenSpec — Agent Guidance

OpenSpec (`@fission-ai/openspec`) is a TypeScript CLI for spec-driven development: it scaffolds
change proposals, specs, designs, and tasks, and generates per-tool Agent Skills for coding agents.
ESM package, built with `tsc`, distributed via npm.

This file is the shared source of truth for agents working in this repo. Nested `AGENTS.md` files
(e.g. `test/AGENTS.md`) add directory-scoped rules — read them when working in those areas.

## Commands

```bash
pnpm install                 # install deps (pnpm is the package manager)
pnpm run build               # compile src/ -> dist/ via build.js (tsc)
pnpm test                    # full vitest suite
pnpm exec vitest run <file>  # focused test file
pnpm run dev                 # tsc --watch
pnpm run dev:cli             # build + run the local CLI (bin/openspec.js)
pnpm run lint                # eslint src/
pnpm run rebaseline:skills   # re-freeze skill-template parity hashes (see Gotchas)
```

Run `pnpm run build` before focused CLI/integration tests when implementation changes may leave
`dist/` stale — several tests exercise the compiled CLI.

## Architecture

- `src/cli/`, `src/commands/` — CLI entry and command implementations (init, update, store, etc.).
- `src/core/` — the engine:
  - `artifact-graph/` — the change model. A change advances through ordered artifacts:
    `proposal → specs → design → tasks` (see `DEFAULT_ARTIFACTS` in `src/commands/schema.ts`).
    `resolver.ts` locates package/project/user schema dirs; `graph.ts` models artifact status.
  - `templates/` — `SkillTemplate` factories (`skill-templates.ts`) that emit the skills deployed
    into a user's project.
  - `shared/skill-bundle.ts` — loads a skill from `schemas/skills/<name>/` (`loadSkillSource`),
    handles the multi-file bundle markers, and flattens to a single file for tools that need it
    (`flattenSkillBody`, `renderFullInstructions`).
  - `shared/skill-generation.ts` — `generateSkillContent` / `buildSkillArtifacts` turn a template +
    its bundle into the emitted file set.
- `schemas/skills/<name>/` — **authored source** for each skill: `SKILL.md` (+ `references/*.md`,
  optional `scripts/`). The TS templates read these at load time; this is where skill *content*
  lives, not in TS string literals.
- `src/prompts/`, `src/telemetry/`, `src/ui/`, `src/utils/` — prompting, anonymous usage stats,
  terminal UI, shared helpers.
- `test/` — vitest suites mirroring `src/` (`test/AGENTS.md` covers test-specific conventions).
- `docs/` — user docs. Start with `docs/opsx.md` (the current artifact-guided workflow),
  `docs/concepts.md`, and `docs/workflows.md`.

## Editing skills & templates

Every skill is authored as a directory under `schemas/skills/<name>/` — `SKILL.md` (YAML
frontmatter + body) [+ `references/*.md`, optional `scripts/`] — not embedded in TS. The bundle
mechanism uses HTML markers:

- **Frontmatter + thin factory.** `SKILL.md`'s YAML frontmatter is the source of truth for `name`
  (MUST equal the directory name — Cursor requires it), `description`, and optional `license` /
  `compatibility` / `metadata`. The matching factory in `src/core/templates/workflows/` is a thin
  `loadSkillSource('<name>', { …seams })` wrapper that reads those fields and the body — no skill
  body, description, or metadata lives in a `.ts` string literal. `openspec-design`/`design.ts` is the
  reference pair.
- `<!--bundle:start-->` … `<!--bundle:end-->` wrap a block that references a bundled file
  (`references/*.md`, `scripts/*`). On flatten, the block is replaced inline by that file's content.
- Outside a bundle block, never write a raw `references/…` path — for the always-flattened skills it
  would survive as a dangling path. Refer to sections descriptively (e.g. "the Flow, step 2") so the
  pointer works in both the multi-file and flattened single-file forms.
- `${PRIME_RITUAL}` and similar `${…}` seams are interpolated at load time (see `shared-prime.ts`).

## Gotchas

- **Skill-template parity hashes.** `test/core/templates/skill-templates-parity.test.ts` guards
  every generated artifact against drift by comparing SHA-256 hashes to hardcoded literals. Any
  intentional edit to a skill under `schemas/skills/**` makes it fail *by design*. After such an
  edit, run `pnpm run rebaseline:skills` (it builds, recomputes the three baseline maps from `dist/`,
  and rewrites only the changed literals), then `pnpm test` to confirm green, and commit the updated
  test file alongside the skill change.
- **`CLAUDE.md` is gitignored**; `AGENTS.md` is the committed, shared instruction file. Put
  project-wide guidance here.
- **Cross-platform paths.** Don't hard-code Unix separators in test expectations; build paths with
  `path.join` / `FileSystemUtils`. See `test/AGENTS.md` for the full path-canonicalization rules.

## Conventions

- **Commits:** one-line Conventional Commits — `type(scope): subject` (e.g.
  `refactor(skills): …`, `chore(scripts): …`). A longer body after a blank line is fine.
- **Module system:** ESM (`"type": "module"`); use `.js` extensions in relative TS imports.
- **Changes:** small fixes go straight to PR; larger features start with an OpenSpec change proposal
  (see Contributing in `README.md`).
