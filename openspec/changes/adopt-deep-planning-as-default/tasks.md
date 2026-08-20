# Tasks: adopt-deep-planning-as-default

Each `## Wave N` is one fresh-session vertical slice, proven test-first. The single
`- [ ]` per wave is the only progress tick and means "wave gate passed".

## Coverage map

| Scenario | Layer | Named test | Wave |
| ---------- | ------- | ------------ | ------ |
| config-loading / fallback schema when config names none | unit | `test/utils/change-metadata.test.ts`, `test/utils/change-utils.test.ts`, `test/core/root-selection.test.ts` (default assertions) | 0 |
| cli-init / writes `schema: deep-planning` into new project config | integration | `test/core/init.test.ts`::config content assertion | 0 |
| cli-artifact-workflow / default schema resolves deep-planning | integration | `test/commands/artifact-workflow.test.ts`, `test/core/artifact-graph/workflow.integration.test.ts` (default-schema cases) | 0 |
| new-change spinner announces resolved schema | unit | `test/commands/` new-change output case (new or existing) | 0 |
| schema-resolution / project-local and package built-in examples | unit | `test/core/artifact-graph/resolver.test.ts` (repointed) | 1 |
| schema-which-command / package + shadowing examples | integration | `test/commands/schema.test.ts` (repointed) | 1 |
| schema-fork-command / fork source examples | integration | `test/commands/schema.test.ts` (repointed) | 1 |
| rules-injection / unknown-artifact warning names deep-planning | unit | `test/core/artifact-graph/instruction-loader.test.ts` (repointed) | 1 |
| schema-resolution / removed-schema config fails listing available schemas | integration | `test/core/artifact-graph/resolver.test.ts` or `test/commands/schema.test.ts` (new not-found case) | 2 |
| docs truth sweep (no test; grep acceptance) | — | — | 3 |

## Wave 0

- [ ] deep-planning is the resolved default everywhere; new-change spinner tells the truth
- components: Default flip (`src/commands/workflow/shared.ts`, `src/utils/change-metadata.ts`, `src/utils/change-utils.ts`, `src/core/root-selection.ts`, `src/core/init.ts`, `src/core/planning-home.ts`, `src/core/openspec-root.ts`, `src/commands/workflow/new-change.ts`; comment strings in `src/core/artifact-graph/instruction-loader.ts`, `src/core/artifact-graph/resolver.ts`, `src/core/project-config.ts`)
- interfaces: unchanged — only default string values flip
- depends-on: —
- stamps: `size:S` `risk:low` `plannerTier:large` `implTier:medium`
- skills: —
- acceptance: `pnpm run build && ./node_modules/.bin/vitest run` green with `schemas/spec-driven/` still on disk

## Wave 1

- [ ] test suite no longer references spec-driven unintentionally
- components: Test repoint (`test/helpers/openspec-fixtures.ts` + all `test/**` files referencing spec-driven: repoint name-only usages to deep-planning or test-local names)
- interfaces: unchanged
- depends-on: Wave 0
- stamps: `size:M` `risk:low` `plannerTier:large` `implTier:medium`
- skills: —
- acceptance: full suite green; `grep -rn "spec-driven" test/` yields zero matches (any intentional survivor documented in the commit message)

## Wave 2

- [ ] spec-driven evicted from the package; naming it fails with available-schemas error
- components: Schema eviction (`git rm -r schemas/spec-driven/`; new not-found test proving a config/`--schema` naming spec-driven errors listing available schemas)
- interfaces: unchanged
- depends-on: Wave 1
- stamps: `size:S` `risk:med` `plannerTier:large` `implTier:medium`
- skills: —
- acceptance: full suite green; `node ./bin/openspec.js schemas` lists only deep-planning

## Wave 3

- [ ] specs and docs stop asserting the old default
- components: Truth sweep (delta specs already authored in this change; minimal docs pass over `docs/cli.md`, `docs/opsx.md`, `docs/concepts.md`, `docs/customization.md`, `docs/migration-guide.md`, `docs/glossary.md`, `docs/faq.md`, `docs/multi-language.md`, `docs/troubleshooting.md`, `docs/commands.md`; update ownership map row 2 status)
- interfaces: unchanged
- depends-on: Wave 2
- stamps: `size:M` `risk:low` `plannerTier:large` `implTier:medium`
- skills: —
- acceptance: `node ./bin/openspec.js validate --all` clean; `grep -rn "spec-driven" docs/` yields only historical/generic mentions
