---
id: ADR-0001
title: Fork sovereignty — adopt upstream ideas by re-implementation, never by merge
status: accepted
date: 2026-07-05
accepted: 2026-08-13
change: evict-upstream-surfaces
---

# Fork sovereignty — adopt upstream ideas by re-implementation, never by merge

This repo is a permanent hard fork of `Fission-AI/OpenSpec` whose product is the deep-planning
workflow; it is not a downstream that tracks upstream. Upstream is a parts catalog: we
periodically review its releases and adopt ideas worth having by **re-implementing them in this
codebase** — we never merge or rebase upstream branches again. Divergence is the point, not a
cost to be minimized.

## Context

The Option B port (Jun 2026) absorbed upstream's 235-file "stores" breaking change to stop
divergence drift — the last act of merge-based alignment. Since then the fork's direction
(deep-planning as the only workflow, content-only ownership floor, eviction of upstream-facing
surfaces) makes merge alignment both impossible (the trees no longer correspond) and undesirable
(upstream's product goals are a subset of ours). The alternative — staying merge-compatible —
was rejected because its ongoing cost (parity constraints, absorbing breaking changes, keeping
surfaces we don't want) buys alignment with a roadmap we don't control.

## Consequences

- No free upstream bugfixes or security patches; mitigated by shrinking the shared surface
  (the eviction plan in `openspec/explorations/make-this-fork-mine.md`) and the test suite.
- The upstream git remote stays configured for reference and shopping trips only.
- Future sessions and agents must not suggest merging/rebasing upstream; adoption requests are
  framed as "re-implement upstream feature X here."
