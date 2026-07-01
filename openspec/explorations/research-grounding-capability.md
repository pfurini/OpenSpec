# Deferred capability: research-grounding (parallel specialized investigation)

Status: **deferred / to-discuss.** Captured from the PRP analysis conversation. One of the
two genuine capabilities OpenSpec lacks that several other frameworks do well.

## What it is

Explicit, **parallel, specialized research** at grounding points in the workflow — not the
single-threaded, inline code-reading explore does today. Multiple focused investigators run
concurrently, each with a narrow mandate, and their findings are summarized back as a gate
("does this change your thinking?") before the next decision.

Two research modes, both missing or thin in OpenSpec:
- **External / web research** — market, prior art, library/API options, known pitfalls,
  current best practices. OpenSpec has **no** external-research dimension at all.
- **Codebase research** — WHERE relevant code lives + patterns, and HOW related features work
  end-to-end with `file:line` evidence. The prime ritual routes to a code graph if present, but
  there is no *parallel, specialized* decomposition of the investigation.

## Why it's missing / why it matters

OpenSpec's explore investigates inline, in the main context, one thread at a time. For anything
where the answer isn't already in the repo (a library choice, an unfamiliar domain, a feasibility
unknown), there's no grounding step — the model reasons from training priors. The frameworks
below treat research as a first-class, parallelizable phase with a summarize-and-gate pattern.

## Where it fits in OpenSpec (a capability, not a phase)

Research-grounding is **cross-cutting** — invoked at grounding points inside several phases,
not a phase of its own:
- **product-discovery** (market / demand evidence) — see `product-discovery-prd-phase.md`
- **explore** (WHAT grounding: existing behavior, prior art, constraints) — WHAT-lane safe
- **design** (HOW grounding: feasibility, patterns to leverage, integration points)

Caveat / discipline: keep WHAT-research (behavior, requirements, prior art) separate from
HOW-research (architecture, feasibility) so it doesn't drag the HOW into explore.

## Inspiration sources (verified paths — to scout deeply together)

- **archon-dev** (`archon/.claude/skills/archon-dev/cookbooks/`): **the best concrete recipe
  found so far** — `investigate.md` (strategic research: FRAME the question by type
  [compare / explore / feasibility / prior-art] + state the *decision needed* → 2-3 parallel
  agents [web-researcher always; codebase explorer always; analyst for feasibility] → ASSESS
  each option against the codebase [alignment / integration effort / trade-off table] →
  RECOMMEND with explicit confidence → durable artifact in `research/` with front-matter
  [date, type, status, recommendation]). Distinguishes cleanly from `research.md` (pure
  codebase questions, "document what exists, no suggestions"). Key properties to port: the
  *decision-needed* framing, codebase-fit as a first-class evaluation dimension, and
  opinionated RECOMMEND (vs neutral survey).
- **PRPs-agentic-eng** (`plugins/prp-core/`): the same agent trio
  (`agents/web-researcher`, `agents/codebase-explorer` (WHERE + patterns),
  `agents/codebase-analyst` (HOW end-to-end, `file:line`, "no suggestions")). `commands/prp-prd.md`
  fires them **in parallel at two grounding gates** (market, then technical feasibility) and
  summarizes back. Also `commands/prp-research-team.md` (dynamic research team via agent teams).
- **gsd-core** (`commands/gsd/`): `map-codebase.md`, `ingest-docs.md`, `forensics.md`,
  `surface.md`, `spike.md`, and the research step inside `discuss-phase.md` (the
  discuss→research→plan flow the user referenced).
- **gsd-pi** (`src/resources/skills/`): `forensics/`, `grill-me/`, `decompose-into-slices/`.
- **gstack** (`.agents/skills/`): `gstack-investigate/`, `gstack-scrape/`, `gstack-browse/`,
  `gstack-learn/`; plus gbrain semantic search as a grounding tool. (Verify which are genuinely
  research vs debugging.)

## Open items to discuss together

- **Tooling tension:** this is the subagent-orchestration dimension (parallel `Task` agents).
  Our environment mandates tokensave/code-graph over Explore agents for *code* research — so the
  codebase-research half should route through the code graph, and the net-new is *external/web*
  research + the *parallel* fan-out. Reconcile with our standing rules.
- **Where do findings land?** A research note (`openspec/research/<name>.md`?) the exploration
  note / proposal cites, or inline-only? (Mirror the exploration-note `--json` discoverability?)
- **Default vs opt-in depth:** most engineering changes don't need market research. Likely an
  opt-in "grounding depth," not a default — consistent with keeping explore lightweight.
- **Cost/latency:** parallel agents are expensive; gate behind a complexity/uncertainty signal.

## Relation to existing notes
- `product-discovery-prd-phase.md` (research is the grounding engine of discovery)
- `phase-graph-unified-model.md` (design-time feasibility research informs decomposition)
- Built on the engineering-flavored WHAT we already have (`shape-spec` borrow in explore).
