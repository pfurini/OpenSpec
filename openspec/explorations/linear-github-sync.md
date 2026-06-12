# Deferred capability: native Linear (+ GitHub) sync

Status: **deferred / direction decided (2026-06).** OpenSpec's planning structures projected
into Linear's native hierarchy, with hooks usable from inside Archon workflow runs. GitHub
linkage rides the user's EXISTING native GH↔Linear integration — OpenSpec never syncs to
GitHub directly (loop avoidance).

Decided:
- **Mapping: CONFIGURABLE** — both homomorphisms implemented, chosen per project (e.g.
  `linear.mapping: project-per-change | issue-per-change` in config).
- **Direction: push + status-only backflow.** Git artifacts are the single source of truth;
  OpenSpec→Linear pushes structure/content idempotently; Linear→OpenSpec surfaces only
  status/comments (in `openspec status` / the prime ritual) and NEVER edits artifacts.
  Full bidirectional rejected (second editing surface for specs + conflict machine).

## The two mappings

| OpenSpec | **B — full-fidelity** (`project-per-change`) | **A — lighter** (`issue-per-change`) |
|---|---|---|
| Initiative (feature) | Linear **Initiative** | Linear **Project** |
| Change (worktree unit) | Linear **Project** | Linear **Issue** |
| Tasks | Linear **Issues** + blocked-by relations from `dependsOn` | sub-issues or description checklist |
| Merge cohorts (change-graph topo layers) | Project **Milestones** | — |
| Exploration/design notes, ADRs | Linear **Documents** on the project | issue description sections |

B = "modeled in Linear's own structure" 1:1; the Linear timeline shows exactly the
orchestrator's execution plan (cohorts as milestones). A = changes as board/cycle issues;
fewer objects; plan-agnostic.

## Tooling (verified 2026-06)

`linear` CLI v2 (`@schpet/linear-cli`, installed at /opt/homebrew/bin/linear; skill at
`~/.claude/skills/linear-cli`) covers the FULL hierarchy from bash: `initiative`,
`project`, `milestone`, `issue`, `label`, `document`, `project-update`,
`initiative-update`, plus raw GraphQL (`linear api`). ⇒ **headless-safe**: Archon bash
nodes and OpenSpec prompt steps need no MCP. (Linear MCP exists for interactive sessions
but is interactively-authenticated — unreliable in headless/cron runs.)

## Hard rules

- **Identity in change metadata**: `.openspec.yaml` gains a `linear:` block (issueId /
  projectId / etc.) → sync is an idempotent UPSERT, never a duplicate-creator. (Same
  pattern as the ADR `change:` link.) Initiative-level ids live with the initiative record.
- **GitHub via the native integration, not direct sync**: orchestrator names Archon
  branches with Linear's branch convention (`{user}/{ABC-123}-slug`) and PR bodies carry
  magic words (`Fixes ABC-123`) → Linear auto-links/auto-closes. OpenSpec syncs planning
  only; GH linkage comes free; nothing syncs twice.
- **Backflow never writes artifacts**: Linear status/comments are *displayed* (status
  command, prime ritual), treated like ADR/glossary context — read, not merged.

## Lifecycle hooks (derived from `openspec status`, not stored)

| Moment | Linear action |
|---|---|
| change created (proposal done) | create Issue/Project in Backlog, body = proposal summary |
| specs/design done | update description; attach design note as Document (mapping B) |
| tasks built | create sub-issues/Issues with blocked-by relations from the task graph |
| Archon run starts | → In Progress + comment with run link (a workflow bash node) |
| per-task events (`ralph_story_started/completed`) | per-task Issue state transitions (mapping B) |
| per-unit gate passes | → In Review / Done per team convention |
| archive | → Done + project update / initiative update |

The change package carries the `linear:` ids so workflow nodes can reference them without
lookups.

## Mechanism (the recurring CLI-vs-prompt fork)

Start **prompt-level**: a `/opsx:sync-linear` step (or hooks in existing commands) driving
the `linear` CLI with ids from `.openspec.yaml`. Graduate to a native `openspec sync linear`
command when prompt-level proves fragile. Honest caveat vs the ADR precedent: sync touches
MANY objects per invocation (idempotency across a tree, partial-failure recovery), so
fragility may bite sooner here than it did for one-line ADR promotion — expect the CLI
graduation to actually happen.

## Open items to discuss

- Config surface: `linear.mapping`, team/workspace ids, state-name mapping (team workflows
  differ: Backlog/Todo/In Progress/In Review/Done) — where does this live
  (`openspec/config.yaml` `linear:` block?), and is state mapping per-team configurable?
- Partial-failure semantics: a sync that creates 3 of 7 sub-issues then fails — resume via
  upsert is the answer, but requires every object keyed (task ids in tasks.json → another
  argument for the JSON work queue, see `executable-plans-and-feedback-loop.md`).
- Backflow display: where exactly do Linear statuses/comments surface — `openspec status
  --json` (a `linear:` section), the prime ritual, both?
- Does explore get a hook (exploration note → draft issue/document), or does sync start at
  change creation? (Lean: start at change creation; explorations are pre-commitment.)
- Rate limits / batching for big initiatives (B creates many objects); `linear api` GraphQL
  batch mutations as the escape hatch.
- Auth in Archon worktree nodes: `linear` CLI auth is user-level (keychain/config) — verify
  it resolves inside worktrees + the Archon daemon environment.

## Related
- `phase-graph-unified-model.md` — change graph cohorts → milestones; orchestrator branch
  naming; change package carries Linear ids.
- `executable-plans-and-feedback-loop.md` — task ids in the JSON work queue enable per-task
  Linear sync; unit report ↔ project update.
- `change-records-and-thinking-layer.md` — the CLI-vs-prompt graduation pattern.
