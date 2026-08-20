# Make this fork mine — ownership map

**Status:** living eviction ledger. First-pass audit 2026-07-05; **refreshed 2026-08-17**.
Verdict per subsystem: **MINE** (built by us) / **KEEP** (upstream code that earns its
place) / **EVICT** / **CONTESTED**. Row 1 (`evict-upstream-surfaces`) **LANDED** 2026-08-13
(`openspec/changes/archive/2026-08-13-evict-upstream-surfaces/`). ADR-0001 is **accepted**.

Ratified direction (unchanged): evict `spec-driven` entirely; rename the package to an owned
scope; keep the stores architecture but audit subcommand depth. Telemetry and profile
machinery are **gone**. Upstream strategy is law: **no merge/rebase — periodic shopping
trips, re-implement ideas, never pull diffs** (`docs/adr/ADR-0001-fork-sovereignty.md`).

## Why

The fork is the product (see `ops/START-HERE.md` lens). Everything in the tree should be
here because *we* chose it. This map is the eviction/adoption ledger for that claim.

**The remaining product lie in the tree:** the README still sells Fission-AI OpenSpec (row 5).
The default-schema half was evicted in row 2: deep-planning is now the only built-in
schema and the default everywhere.

## The verdicts

Status is **LANDED** (code matches the verdict) or **OPEN** (verdict stands, work remains).

### Workflow layer

| Area | Verdict | Status | Notes |
|---|---|---|---|
| `schemas/deep-planning/` | **MINE** | LANDED (default) | The spine. Only built-in schema and the hardcoded default (init, `--schema` flags, docs) as of change `adopt-deep-planning-as-default`. |
| `schemas/skills/` (10 dirs) | **MINE** | LANDED | Was 14; eviction pruned `onboard`, `propose`, `ff-change`. `bulk-archive-change` stayed. Init/update install `WORKFLOW_SKILLS` in `src/core/workflow-skills.ts`. Multi-file authoring shipped (`archived/multi-file-skill-generation.md`). |
| `schemas/spec-driven/` | **EVICT** (ratified) | **LANDED** | Gone from disk and from every default-resolution point; naming it fails with the available-schemas error. Docs no longer present it as the workflow (change `adopt-deep-planning-as-default`, 2026-08-20). |
| Schema resolution (`src/core/schemas/`) | **KEEP** | LANDED | Project-local → user-override → built-in. Serves guest-mode and local schema experiments. |
| `openspec schema` command | **KEEP** | LANDED | fork / inspect / which. |

### Engine (src/core)

| Area | Verdict | Status | Notes |
|---|---|---|---|
| `reverse/`, `adr/`, `lint/` | **MINE** | LANDED | ADR registry + `openspec lint --adr` (ADR-registry rule only). |
| `artifact-graph/`, `validation/`, `parsers/`, instruction loading | **KEEP** | LANDED | Chat→schema enforcement. |
| `store/` + `workset.ts` + `context.ts` + `doctor.ts` | **KEEP, audit depth** | **OPEN** | Full surface intact. Usage pass still owed before trimming. |
| `init.ts`, `update.ts` | **KEEP, trim** | partial | Profile/telemetry/legacy branches died with row 1. Spec-driven default remains until row 2. |
| `legacy-cleanup.ts`, `migration.ts` | **EVICT** | **LANDED** | Files gone. |
| `profiles.ts`, `profile-sync-drift.ts` | **EVICT** | **LANDED** | Files gone. Global config `profile` / `workflows` are retired keys (ignored on read, stripped on write). Init always installs the full skill set. |
| `completions/` + `completion.ts` | **KEEP** | LANDED | |
| `converters/`, `templates/`, `styles/`, `ui/` | **KEEP** | LANDED | Audit only if something above drags them. |
| `global-config.ts`, `config-schema.ts` | **KEEP, trim** | LANDED | `RETIRED_KEYS = ['telemetry','profile','workflows']`. |

### Upstream-facing surfaces

| Area | Verdict | Status | Notes |
|---|---|---|---|
| `src/telemetry/` + anonymousId | **EVICT** | **LANDED** | Code gone. `openspec/specs/telemetry/` retired. Root README still documents anonymous usage — docs lie until row 5. |
| `src/commands/feedback.ts` | **EVICT** | **LANDED** | Command gone. |
| `docs/` + marketing README | **EVICT most, rewrite rest** | **OPEN** | Partial sweep in `docs/cli.md` / `docs/commands.md`. README, `docs/opsx.md`, `docs/concepts.md`, `docs/glossary.md`, `docs/migration-guide.md`, `docs/stores-beta/` still upstream / spec-driven-first. Keep `agent-contract.md` as a seed; rewrite README as the fork's front page (deep-planning first). Low urgency — docs lie quietly. |
| `CHANGELOG.md`, `MAINTAINERS.md`, `.github/` release | **EVICT/replace** | partial | `MAINTAINERS.md` gone. `CHANGELOG.md` remains. CI kept (`ci.yml`). `deploy-docs.yml` remains. No npm publish workflow. |
| Package identity `@fission-ai/openspec` | **RENAME** (ratified) | **OPEN** | npm name → owned scope; **bin stays `openspec`**. Homepage/repo URLs still Fission-AI. **Open: pick the scope/name.** |

### Specs baseline (`openspec/specs/` — 35 specs)

GH#1 (`pfurini/OpenSpec#1`) is still **OPEN**. Residue shrank with row 1 (`telemetry` gone) and will shrink again with each eviction. Leftovers that should die with later rows: `command-generation/`, `opsx-onboard-skill/`, spec-driven-specific scenarios, profile leftovers in `global-config/` / `cli-config/`, `ci-nix-validation/`. No active changes — only `openspec/changes/archive/`. GH#1 remains the instrumented dogfood (`ops/START-HERE.md` #9).

### Tests

**KEEP infra, prune with each eviction.** Parity-wall (`pnpm run rebaseline:skills`) is **MINE** and stays. Each eviction change deletes the tests of what it evicts — never before.

## Execution plan — each row = one deep-planning change (dogfood)

| # | Change | Status | Notes |
|---|---|---|---|
| 1 | `evict-upstream-surfaces` | **LANDED** 2026-08-13 | Telemetry, feedback, profiles, legacy-cleanup, three skills. ADR-0001 accepted. |
| 2 | `adopt-deep-planning-as-default` | **LANDED** 2026-08-20 | Default flipped to `deep-planning`; `schemas/spec-driven/` + its docs/tests/specs evicted. Also fixed the `new change` spinner announcing the machine default instead of the resolved schema. |
| 3 | `rename-package-identity` | **OPEN** | npm scope rename, bin unchanged; update installs. Blocked on the name decision. |
| 4 | `trim-stores-surface` | **OPEN** | Audit which workset/context/doctor subcommands we actually use. |
| 5 | Docs rewrite | **OPEN** | Lowest urgency. Can trail 2–4. README is the loudest lie. |

Then: **the ledger change** (`ops/START-HERE.md` #1). Originally "after 1–2"; row 1 is done, so ledger can start after row 2 (or in parallel — they don't share files). START-HERE is the ranked process backlog; this file is only the eviction track.

## ADR

`docs/adr/ADR-0001-fork-sovereignty.md` — **accepted** 2026-08-13, change `evict-upstream-surfaces`. Do not re-propose it.

## Open decisions

1. **Package name/scope** (blocks change 3 only).
2. Which workset/context/doctor subcommands survive (blocks change 4 only; needs a usage pass).
3. Docs end-state: minimal README + agent-contract, or a real docs rewrite (defer).
