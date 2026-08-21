# Tasks: rename-package-identity

Each `## Wave N` is one fresh-session vertical slice, proven test-first. The single
`- [ ]` per wave is the only progress tick and means "wave gate passed".

## Coverage map

| Scenario | Layer | Named test | Wave |
| ---------- | ------- | ------------ | ------ |
| Package manifest name | unit | `test/package-identity.test.ts`::package name | 0 |
| Bin field | unit | `test/package-identity.test.ts`::bin field | 0 |
| Homepage and repository fields | unit | `test/package-identity.test.ts`::homepage and repository | 0 |
| Version after scoped install | integration | `pnpm run check:pack-version` | 1 |
| Packed CLI version matches manifest / scoped install path | integration | `pnpm run check:pack-version` | 1 |
| README and installation docs | grep acceptance | wave 1 acceptance `rg` | 1 |
| Website npm link and homepage install | grep acceptance | wave 1 acceptance `rg` | 1 |

## Wave 0

- [x] published-name tracer exists (RED): package.json name, bin, homepage, and repository assertions fail against the current Fission-AI identity
- components: Identity tracer (`test/package-identity.test.ts`)
- interfaces: `test/package-identity.test.ts` reads root `package.json`
- depends-on: —
- stamps: `size:S` `risk:low` `plannerTier:medium` `implTier:medium`
- skills: —
- acceptance: `pnpm exec vitest run test/package-identity.test.ts` fails on the name assertion (expected RED)

## Wave 1

- [x] tree publishes as `@pfurini/openspec`; tracer green; install docs and pack guard follow
- components: Manifest + pack guard (`package.json` `name`/`homepage`/`repository`; lockfile name fields; `scripts/pack-version-check.mjs`); Install-surface retarget (README, `docs/installation.md` and other install snippets, website npm URL + homepage command, `AGENTS.md`, `CHANGELOG.md` heading, `.changeset/*`, ownership-map row 3)
- interfaces: `package.json` identity tuple; pack-guard bin path derived from `pkg.name` via `path.join('node_modules', ...parts, 'bin', 'openspec.js')`
- depends-on: Wave 0
- stamps: `size:S` `risk:low` `plannerTier:medium` `implTier:medium`
- skills: —
- acceptance: `pnpm exec vitest run test/package-identity.test.ts` green; `pnpm run check:pack-version` green; `rg -n '@fission-ai/openspec' --glob '!openspec/changes/archive/**' --glob '!openspec/explorations/**' --glob '!CHANGELOG.md' --glob '!package-lock.json'` yields zero matches
