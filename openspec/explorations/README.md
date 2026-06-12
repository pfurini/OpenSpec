# Explorations index — handoff entry point

**Start here.** This directory is the durable design record for the deep-planning /
harness work on branch `feat/explore-what-brainstorming`. An implementing session should
read this index, then ONLY the note(s) for its chosen track — not the whole corpus.

Two families of files:
- **Ours (this effort)** — the 8 notes below.
- **Upstream** (`workspace-*.md`, `explore-workflow-ux.md`) — inherited context; read only
  if a track touches workspaces/initiatives.

## The notes, by role

| Note | Role | Status |
|---|---|---|
| `phase-graph-unified-model.md` | **The architecture.** OpenSpec↔Archon harness model: unit = right-sized change; change DAG (orchestrator) + task DAG (Ralph loop); validation gates; build order; intra-change execution; model routing; size ceiling | Core model **CONFIRMED**; build deferred |
| `executable-plans-and-feedback-loop.md` | Content spec for the rich task-builder (self-sufficiency standard, ralph `prd.json` convergence) + implementation report / feedback loop | Deferred; consumer contract verified |
| `change-records-and-thinking-layer.md` | Amendment model, shadow-layer caveat, ADR/glossary layer (§4 LANDED), small parked items (§5) | Mixed: §4 shipped, rest deferred |
| `specialized-review-steps.md` | WHAT-review vs HOW-review panels, dimensions distilled from gstack/PRP/claudekit/furiai | Deferred |
| `research-grounding-capability.md` | Parallel specialized research (external + codebase) at grounding points | Deferred |
| `product-discovery-prd-phase.md` | Problem-first discovery → real PRD, BEFORE explore | Deferred |
| `linear-github-sync.md` | v1: outbound push to Linear (configurable mapping, ids in metadata). Future vision: Linear as driver (Agents API = protocol-not-runtime; all compute on own hardware) | v1 buildable; driver = vision |
| `explore-workflow-ux.md` | Earlier explore UX thinking (pre-dates this effort) | Historical |

## Decisions locked (do not re-litigate)

1. WHAT/HOW separation: explore=WHAT, design=HOW; both pure thinkers; `continue` transcribes.
2. Unit of work = a **right-sized change** (coarsest fitting one workflow run); worktree
   parallelism = the change DAG; capability axis primary; parent/child HOW-slicing deferred.
3. Intra-change execution = **Ralph pattern** (static loop node, disk work queue), not
   meta-generated DAGs; nodes = phases.
4. ADRs/glossary are **project-owned** (`docs/adr/`, root `GLOSSARY.md`), prompt-level
   lifecycle (`proposed` → archive promotes to `accepted` via `change:` front-matter link).
5. Git owns content truth; Linear (v1) is outbound-only projection.
6. All agent compute on own hardware; model choice owned (Archon tiers, local via Pi/ollama).

## What is code vs notes (already shipped on this branch)

Shipped: interactive `/opsx:design` (interview discipline, ADR floor), enriched
`/opsx:explore` (one-sentence gate, given-constraints, glossary seeding), shared prime
ritual (`shared-prime.ts`), ADR lifecycle in archive, `deep-planning` schema (Constraints
section, falsifiability gate, flow-to-gate continueMode, MECHANICAL-ONLY tasks),
`openspec list --explorations`. All tests green (1665).

## Recommended next steps (in order)

0. ✅ **DONE (2026-06-12, 100% pass under the cold-handoff protocol).** Verified live:
   archive moved all 5 artifacts; ADR-0037 re-derived through the interview and promoted
   (`change:` link, `accepted` + date); proposal Constraints grouped + falsifiable with an
   HONEST "None" (no fabrication); specs vibe-word-clean; tasks zero deferred decisions;
   design fed a spec-wording fix back to the WHAT properly. lexup reverted to pre-test
   state afterward (the change is active again, planning artifacts regenerated and valid).
   ~~Acceptance tests on lexup (~30 min, validates shipped prompt work):~~
   (a) run `/opsx:design` on a real change — expect one-question-at-a-time interview,
   ADR-worthy decisions confirmed with the user, nothing deferred to tasks;
   (b) design→archive ADR lifecycle — ADR written to `docs/adr/` with `change:` +
   `status: proposed`, archive flips it to `accepted`.
   **Setup (account-profile-self-service):** keep the exploration note + `.openspec.yaml`
   + ADR-0036; delete the stale `proposal.md`, `specs/`, `design-notes.md` (pre-dates the
   interview work) and `docs/adr/ADR-0037-*` (minted unilaterally, old format). Archive
   dry-run: git-checkpoint first, confirm the incomplete-tasks warning, **DECLINE spec
   sync** (feature is unimplemented), verify ADR flip + move, then `git reset --hard`.
   **Cold-handoff protocol — `/clear` at every command boundary, never mid-interview:**
   artifacts must carry ALL state (the architecture's central claim; Archon consumers are
   fresh-context by design). Warm sessions produce FALSE PASSES (the model remembers what
   the note should have carried). Bisection rule: cold-fail + warm-pass = artifact/prime
   gap; fails both = prompt gap.
1. **The vertical slice (recommended first build):** author the `openspec-implement-change`
   Archon workflow (ralph-dag variant: bash node pulls the change package via OpenSpec CLI →
   implement loop over the change's tasks with per-task validate+commit → gate → PR → unit
   report) and run it END-TO-END on one real lexup change. Empirically settles the two open
   forks: tasks.md vs tasks.json work queue, and stitched CLI vs `change package --json`.
   Needs NO new OpenSpec code to start. Read: `phase-graph-unified-model.md` +
   `executable-plans-and-feedback-loop.md`.
2. **Inter-change graph:** implement `add-change-stacking-awareness`
   (spec: `openspec/changes/add-change-stacking-awareness/` — upstream-authored, check
   upstream for in-flight implementation first). The orchestration contract.
3. Then per the phase-graph build order: validation gates → right-sizing/split → task-DAG
   formalization; capability tracks (review steps, discovery, research grounding, Linear v1)
   slot in independently.

## Implementation-session protocol (tribal knowledge — read before coding)

- **Repo**: `/Users/paolof/Developer/ai/OpenSpec`, branch `feat/explore-what-brainstorming`
  (fork pfurini/OpenSpec). Commit + push each milestone.
- **Prompt templates** live in `src/core/templates/workflows/*.ts` (skill + command bodies,
  often duplicated per file — use `replace_all` and VERIFY both bodies got the edit).
- **Parity test**: any template change breaks
  `test/core/templates/skill-templates-parity.test.ts` (SHA-256 hashes). Re-harvest by
  computing hashes with the same stableStringify+sha256 (tsx script) and updating
  `EXPECTED_FUNCTION_HASHES` + `EXPECTED_GENERATED_SKILL_CONTENT_HASHES`.
- **Suite**: `npx vitest run` (1665 tests); build: `npm run build`.
- **Testbed**: lexup at `/Users/paolof/Developer/Projects/lexup/lexup-new`
  (`openspec/config.yaml` → `schema: deep-planning`; active change
  `account-profile-self-service`). Propagate prompts with
  `node ./bin/openspec.js update --force <lexup-path>` (NO --force = skipped on unchanged
  version stamp). Schema YAML is NOT propagated — it resolves at runtime from this repo's
  `schemas/deep-planning/schema.yaml` because lexup runs this dev binary.
- **Archon**: `/Users/paolof/Developer/ai/archon` — skills at `.claude/skills/archon`
  (runtime) and `.claude/skills/archon-dev` (their dev workflow); stock workflows at
  `.archon/workflows/defaults/` (ralph-dag is the Ralph reference). Verify capability claims
  against `packages/workflows/src/` — the skill docs have known stale spots (loop `model:`
  IS honored; docs say ignored).
