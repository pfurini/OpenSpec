# Make this fork mine — ownership map

**Status:** first-pass audit, 2026-07-05. Verdict per subsystem: **MINE** (built by us) /
**KEEP** (upstream code that earns its place) / **EVICT** / **CONTESTED** (needs a decision or
deeper look). Ratified up front by the user: evict `spec-driven` entirely; rename the package to
an owned scope; keep the stores architecture but audit subcommand depth; evict telemetry and the
profile machinery. Upstream strategy: **no more merge/rebase — periodic shopping trips,
re-implement ideas, never pull diffs** (to be recorded as an ADR).

## Why

The fork is now the product (see `ops/START-HERE.md` lens). Everything in the tree should be
here because *we* chose it. This map is the eviction/adoption ledger for that claim.

## The verdicts

### Workflow layer

| Area | Verdict | Notes |
|---|---|---|
| `schemas/deep-planning/` | **MINE** | The spine. Becomes the only built-in schema and the hardcoded default (init, `--schema` flags, docs). |
| `schemas/skills/` (14 authored SKILL.md dirs) | **MINE** | The skill suite + multi-file authoring model. |
| `schemas/spec-driven/` | **EVICT** (ratified) | Upstream's standard workflow. Delete schema, templates, its tests, and every doc that presents it as "the" workflow. Default constant flips to `deep-planning`. |
| Schema resolution (`src/core/schemas/`, project-local → user-override → built-in) | **KEEP** | Good design; serves project-local schema experiments and client guest-mode. |
| `openspec schema` command (fork/inspect/which, 29.7K) | **KEEP** | Owning schemas is the point; these are the tools for it. |

### Engine (src/core)

| Area | Verdict | Notes |
|---|---|---|
| `reverse/`, `adr/`, `lint/` | **MINE** | Ported from feat; complete change trails. |
| `artifact-graph/`, `validation/`, `parsers/`, instruction loading | **KEEP** | The chat→schema seam's enforcement machinery — the part of the engine that serves the owned content. |
| `store/` + `workset.ts` + `context.ts` + `doctor.ts` commands | **KEEP, audit depth** (ratified) | Store = standalone planning repo = the client-sidecar story. TODO: check which workset/context/doctor subcommands we actually use; candidates for trimming, not for wholesale eviction. |
| `init.ts` (25K), `update.ts` (22.7K) | **KEEP, trim** | Needed, but carry profile/spec-driven/telemetry branches that die with their masters. |
| `legacy-cleanup.ts` (23.2K), `migration.ts` | **EVICT** | Migration paths for upstream's historical installs. A personal fork has no legacy users. Verify nothing in init/update hard-requires them, then delete. |
| `profiles.ts`, `profile-sync-drift.ts`, profile branches in config | **EVICT** (ratified) | Skill-gating for upstream's onboarding concern. Always install all nine workflow skills. Global config's `profile`/`workflows` keys become inert → remove. |
| `completions/` + `completion.ts` (shell completions) | **KEEP** | Cheap, useful, no upstream coupling. |
| `converters/`, `templates/`, `styles/`, `ui/` | **KEEP** | Plumbing serving kept commands. Audit only if something above drags them. |
| `global-config.ts`, `config-schema.ts` | **KEEP, trim** | Loses telemetry + profile fields. |

### Upstream-facing surfaces

| Area | Verdict | Notes |
|---|---|---|
| `src/telemetry/` + `telemetry` config + anonymousId | **EVICT** (ratified) | A personal fork phoning upstream analytics is absurd. Also retire `openspec/specs/telemetry/`. |
| `src/commands/feedback.ts` | **EVICT** | Sends feedback to upstream's channel. Not our channel. |
| `docs/` (33K `opsx.md`, `how-commands-work.md`, `migration-guide.md`, `stores-beta/`, marketing README) | **EVICT most, rewrite rest** | Upstream's user docs describe a product we're no longer shipping to anyone. Keep: `agent-contract.md`, `concepts.md`, `glossary.md` as seeds; rewrite README as the fork's own front page (deep-planning first). Low urgency — docs lie quietly. |
| `CHANGELOG.md`, `MAINTAINERS.md`, `.github/` release machinery | **EVICT/replace** | Upstream release history and CI for npm publishing we don't do. Keep test CI, drop publish/release workflows. |
| Package identity `@fission-ai/openspec` | **RENAME** (ratified) | Proposal: npm name → own scope (e.g. `@pfurini/openspec`), **bin stays `openspec`** — every skill invokes `openspec <cmd>`; keeping the bin name makes the rename a one-file change instead of a skill-suite sweep. Full product rebrand (new bin/name) possible later, priced separately. **Open: pick the scope/name.** |

### Specs baseline (openspec/specs — 38 specs)

Already tracked as GH#1, now **bigger**: beyond the port's deletions (`command-generation/`,
`opsx-*-skill/`, `ai-tool-paths/`…), every spec for an evicted feature dies with it
(`telemetry/`, spec-driven-specific scenarios in `cli-artifact-workflow/`, profile scenarios in
`global-config/`/`cli-config/`, `ci-nix-validation/`). GH#1 remains the instrumented dogfood;
each eviction change below retires its own specs as it lands, shrinking GH#1's residue.

### Tests (~1693)

**KEEP infra, prune with each eviction.** The parity-wall machinery (rebaseline) is **MINE** and
stays. Each eviction change deletes the tests of what it evicts — never before.

## Execution plan — each row = one deep-planning change (dogfood)

1. `evict-upstream-surfaces` — telemetry, feedback, profiles, legacy-cleanup (+ their specs/tests/config keys). Independent, well-bounded, high identity value. **First.**
2. `adopt-deep-planning-as-default` — flip default constant, evict `schemas/spec-driven/` + its docs/tests/specs.
3. `rename-package-identity` — npm scope rename, bin unchanged; update lexup + global install. Needs the name decision.
4. `trim-stores-surface` — the "audit depth" verdict on workset/context/doctor, informed by a quick which-subcommands-do-I-use pass.
5. Docs rewrite — lowest urgency, can trail everything.

Then: **the ledger change** (`ops/START-HERE.md` #1) — unchanged, next in line after 1–2.

## The ADR to write

`fork-sovereignty`: this repo is a hard fork. Upstream is a parts catalog: periodic review of
its releases; adopt by re-implementation only; never merge, never rebase. Divergence is the
point, not a cost. (Write via the fork's own ADR machinery once change 1 lands.)

## Open decisions

1. **Package name/scope** (blocks change 3 only).
2. Which workset/context/doctor subcommands survive (blocks change 4 only; needs a usage pass).
3. Docs end-state: minimal README + agent-contract, or a real docs rewrite (defer).
