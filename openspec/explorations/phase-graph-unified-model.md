# Unified model: the phase/parallelism graph (OpenSpec ↔ Archon harness)

Status: **core model CONFIRMED** (2026-06) — unit = a right-sized change; worktree-parallelism
= the change DAG; capability axis primary; **parent/child HOW-slicing deferred** until a real
pure-partition case appears. Build deferred. Captures the design reasoning so it isn't lost.
Picks up after the deep-planning + thinking-record work.

Confirmed decisions:
- Unit of work = a right-sized change (coarsest that fits one workflow run cleanly).
- Two DAGs, both live: change DAG (orchestrator) + task DAG (one run's Archon nodes).
- **Capability axis is primary** (initiative of full, independently-spec'd changes — no
  inheritance). Parent/child HOW-slice split is a **deferred fallback**, not built now.
- Integration gate lives on the **initiative**; per-unit gate on each **change**.
- Maps onto existing OpenSpec primitives (initiative / change / design / tasks) — extend, don't invent.

## The harness (given) — grounded against the Archon skill (2026-06)

Archon (`/Users/paolof/Developer/ai/archon`) is a "harness builder for AI coding": a
workflow = a **static DAG of nodes** in YAML (`.archon/workflows/`), run via
`archon workflow run <name> --branch <branch> "<message>"`. Grounding facts (from
`.claude/skills/archon/SKILL.md` + Archon's CLAUDE.md) that shape this model:

- **Seven node types**, not just prompts: `command` (a `.archon/commands/*.md` file),
  `prompt`, `bash`, `script` (bun/uv), `loop`, `approval`, `cancel`. Outputs flow as
  `$nodeId.output` (structured via `output_format` + schema validation, field access
  `$nodeId.output.field`); `when:` conditions + `trigger_rule` give conditional routing.
- **Independent nodes in the same topological layer run concurrently** (definitive, per
  Archon's CLAUDE.md) — intra-run parallelism is real, but all nodes share the run's ONE
  worktree.
- **`loop` nodes with `until_bash`** ("iterate the AI until this command exits 0") are the
  **native per-unit validation-gate primitive** — the PRP-style validation loop, built in.
  OpenSpec's job is to *declare* the gate commands; Archon executes the loop.
- **`approval` nodes** (+ `on_reject` rework, interactive relay protocol) — human gates
  exist *inside* a run; unit workflows aren't forced to be fully autonomous.
- **Worktree lifecycle is Archon-native**: `--branch` auto-creates the worktree;
  `archon isolation list/cleanup` + `archon complete <branch>` tear down; `--resume`
  re-runs a failed run skipping completed nodes; `--detach` + `workflow runs/get --json`
  give monitoring. The orchestrator does NOT manage worktrees — it walks the change graph,
  names branches, launches runs, polls JSON, merges cohorts.
- **`$ARTIFACTS_DIR`** — per-run artifacts dir outside git (+ typed `output_type` sidecars)
  — where unit reports land.
- Stock workflows already cover plan→PR (`archon-plan-to-pr`, `archon-feature-development`,
  `archon-ralph-dag`): a custom `openspec-implement-change` workflow is a small delta, not
  greenfield.

The user's plan: an **orchestrator** (a Claude Code session) walks OpenSpec's **change
graph**, spawns one Archon **workflow run per ready unit in its own git worktree**, then
merges the worktree outputs in dependency order to assemble the final feature.

## The big question, answered

**What is the unit of work a single workflow run builds?** → **a right-sized change.**

Reframe (important): not the *smallest* unit — the **coarsest unit that still fits one
workflow run cleanly**: independently implementable, testable, and mergeable in one worktree.
Splitting buys parallelism at a real merge-coordination cost, so **split only when** a change
is too big for one run, **or** when a sub-part is a genuinely coherent independent capability —
never eagerly to maximize granularity. Parallelism should *fall out of* good capability
decomposition, not drive it.

**Invariant:** "independent enough to parallelize across worktrees" ⟺ "should be its own
change." If two parts of a change are independent enough to run in separate worktrees, that's
the signal to `split` them into sibling changes — not to parallelize tasks across worktrees.

## Two DAGs, two grains — both live

| Grain | DAG | Source | Consumed by | OpenSpec status |
|---|---|---|---|---|
| **Inter-change** | Change DAG (`dependsOn`/`touches`) → which workflows run in which worktrees + merge order | change stack metadata | the **orchestrator** | specced (`add-change-stacking-awareness`), unimplemented |
| **Intra-change** | Task DAG (units, interfaces, `depends_on`) → the **nodes of a single Archon workflow run** | design's **Components & Dependencies** | **one workflow run** | deferred task-builder — now with a concrete consumer |

Mapping to Archon: **change = workflow run = worktree; tasks = workflow nodes (with
`depends_on`); per-task acceptance / change validation = verify nodes.** So the "rich
parallelism-aware task-builder" is **not** discarded — it is the node-level layer of this
model (the design's decomposition seeds the workflow's node DAG). (Resolved: Archon runs
independent nodes in the same topological layer concurrently — the task DAG maps 1:1 onto
real intra-run parallelism, within one shared worktree.)

## Refinement: TWO decomposition axes (this resolves most of the child-WHAT problem)

Splitting happens for two different reasons, at two different stages — and only one of them
needs spec inheritance:

1. **Capability axis (primary), at WHAT-time.** Decompose the feature into multiple
   capability-sized **changes**, each with its OWN specs, coordinated by an **initiative**.
   No inheritance — every unit owns a distinct, independently-meaningful WHAT. This is where
   most parallelism comes from, and it reuses concepts OpenSpec already has.
2. **Implementation axis (fallback), at design-time.** When ONE capability is still too big
   for a single workflow run AND its slices have no independently-meaningful WHAT (a pure build
   partition — e.g. the read path vs the write path of one store), `split` it into **HOW-slice
   child changes**: the **parent holds the specs**, children declare which requirements they
   cover, and the **parent design defines the sibling interface** (`provides`/`requires`).

**Litmus — which axis?** *"Does this slice have requirements a user/reviewer would recognize on
its own?"* Yes → its own capability change (initiative axis, no inheritance). No (it's just a
build partition of one WHAT) → HOW-slice child (parent holds WHAT).

**DECIDED:** build the **capability axis first** — it sidesteps inheritance entirely and maps
onto existing OpenSpec primitives. **Parent/child HOW-slicing is deferred** until a real
pure-partition case demands it (YAGNI; split only when necessary). The litmus above is the
trigger to revisit.

## Maps onto existing OpenSpec primitives (extend, don't invent)

OpenSpec already has the layers this model needs:
- **`initiative`** = "coordinated set of changes" (create/show/list, lives in a context store;
  changes link via `--initiative`; `workspace` opens it as a view). → **this is the feature.**
- **change** = the worktree/workflow unit. **change graph** (`add-change-stacking-awareness`) =
  the orchestration DAG.
- **design** (Components & Dependencies) = the node-DAG of one run. **tasks** = the runbook.

Four-level hierarchy:

| Level | Is | Holds | OpenSpec primitive |
|---|---|---|---|
| **Initiative** | the feature | feature intent + the **integration gate** | `initiative` (exists) |
| **Change** | a capability (or HOW-slice) = **the worktree unit** | specs (or inherited) + **per-unit gate** | `change` + stack metadata |
| **Design** | the HOW of a change | Components & Dependencies → **workflow nodes** | `design` artifact |
| **Tasks** | the runbook | node prompts | `tasks` artifact |

## Validation — TWO gates (not one)

1. **Per-unit gate** (PRP-style validation loop): each change/workflow run self-validates in
   its worktree — lint/types, tests, its own spec scenarios — before it is mergeable. This is
   "done" for a unit.
2. **Integration gate** (distinct, new): after merging a cohort of sibling worktrees, an
   assemble-time validation that the combined feature holds. Needed because `touches` is
   *advisory* — two units can each pass their own gate yet break on merge (shared-file
   semantics, not just textual conflict). The orchestrator runs this after each merge layer.

## What OpenSpec emits (the contract)

Per unit (change):
- **specs** (acceptance / WHAT — from parent if a child slice)
- **design** (HOW) + **Components & Dependencies** (the node-DAG seed)
- **tasks** (the runbook → workflow nodes)
- **validation gates** — per-unit executable "done" + which integration gate it feeds
- **graph position** — `dependsOn` / `touches` / `provides` / `requires` / `parent`

Graph-level (for the orchestrator):
- `openspec change graph --json` — topo order + parallel cohorts (same depth, non-overlapping `touches`)
- `openspec change next` — the ready set (unblocked changes)

## Build order (incremental, derived from the model)

1. **Inter-change graph** = implement `add-change-stacking-awareness`: stack metadata +
   `change graph --json` / `change next` + validation (cycles, missing targets, transitive
   block). This is the orchestration contract — highest leverage.
   *Where the spec lives:* `openspec/changes/add-change-stacking-awareness/` in THIS repo —
   proposal + 4 delta specs + tasks.md (22 tasks, none done). **Provenance: upstream**
   (authored 2026-02-21 by Tabish Bidiwale, Fission-AI; inherited with the fork). Before
   implementing, check upstream for an in-flight implementation to avoid divergence;
   implement as-specced for maximum compatibility.
2. **Validation gates**: per-change executable validation (PRP borrow) + the integration-gate
   concept. Needed for autonomous worktree runs to self-verify and for safe assembly.
   Execution side is free — Archon's `loop`/`until_bash` IS the gate runner; OpenSpec only
   declares the commands.
3. **Right-sizing + split**: guidance for "atomic enough for one run?" and the parent-WHAT /
   child-HOW-inherit model; `change split`.
4. **Task DAG → Archon nodes**: formalize design's Components & Dependencies to a `--json` node
   seed (the deferred task-builder). Lower priority — design already emits the prose form.
   **Content spec captured** in `executable-plans-and-feedback-loop.md` (self-sufficiency
   standard: Mandatory Reading, Patterns to Mirror, per-task Validate, NO_PRIOR_KNOWLEDGE_TEST
   — what a cold autonomous run needs that an interactive session doesn't).

## Open questions — updated

- **Node concurrency (RESOLVED, definitive):** independent nodes in the same topological
  layer run concurrently (Archon CLAUDE.md) — but all nodes of a run share **one worktree**.
  Node-concurrency ≠ worktree-isolation: intra-change parallelism is concurrency over a
  shared filesystem (fine for disjoint files, risky for shared); worktree-level isolation
  only exists at the **change** grain — reinforcing change-as-the-unit.
- **Integration-gate home (resolved):** the **initiative**. The feature-level WHAT = the
  composition of its capability changes; the integration gate = the cross-change acceptance
  (scenarios spanning changes), run by the orchestrator after each merge cohort.
- **Child-change ergonomics (deferred):** only relevant for the fallback implementation axis.
  When built: child = lightweight `.openspec.yaml` (with `parent`) + design/tasks/validation,
  specs resolved from the parent, declaring the requirement IDs it covers. Defer until a real
  pure-partition case appears.
- **Still open:** does a capability-change's per-unit gate run the *full* spec scenarios or
  only the subset it owns? (For capability-axis changes the change owns all its specs, so:
  full. The subset question only arises for HOW-slice children — another reason to defer them.)
- **Change-package contract (direction RESOLVED — pull, not push):** the unit workflow's
  *first node* is a `bash` node that pulls the package from the OpenSpec CLI inside the
  worktree (`openspec status/instructions --json`, or a future `openspec change package
  --json`); the orchestrator passes only the change name as `$ARGUMENTS`. The package flows
  to downstream nodes as `$nodeId.output`. Still open: whether the stitched existing
  commands suffice or a single `change package --json` is worth building (decide when
  authoring the `openspec-implement-change` workflow).
- **Per-unit gate primitive (resolved):** a `loop` node with `until_bash: "<gate command>"`
  (or a `bash` assertion + `when:`-gated `cancel`). OpenSpec declares the gate commands per
  change; the workflow executes them natively. Failed runs resume via `archon workflow
  resume` (completed nodes skipped).
