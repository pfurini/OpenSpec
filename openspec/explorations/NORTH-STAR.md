# North Star — what this project is

The vision doc. Timeless on purpose: current work lives in `BACKLOG.md`, the past in
`HISTORY.md`. Written plainly; precise language only where it must be.

## The one-paragraph story

We forked OpenSpec to build **our own process** for making software with AI. The process
and its tools are files we own: schemas (the shape of each artifact), skills (the
instructions agents follow), and now extensions to our own agent harness (the Pi fork at
`../pi`). The fork is the product. Upstream is a shop we visit, never a parent we merge
from (ADR-0001).

## The two rooms (still true, one big change)

- **The studio** — where thinking happens: brainstorming, idea validation, requirements,
  design. Always interactive: a human at the center, guided by a strong model. You cannot
  automate taste, and we stopped trying.
- **The factory** — where execution happens: wave plans, code, tests, reviews. Automated
  with mid-level models, but never deaf: it can escalate to the human when it hits a wall
  (see "Escalation" below).
- **The shelf between them** — artifacts with a strict shape (proposal, specs, design,
  wave map). The studio puts finished thinking on the shelf; the factory builds from it.

**The change:** both rooms now live in the same building. The factory used to be a
separate product (Archon). We parked it: a second product means a second place to audit,
and full autonomy trades early speed for late bug-fixing. The factory is being rebuilt
inside Pi, which we own end to end.

## The three pillars

### 1. Process breadth and quality first

Before more automation, a better process. We add steps before implementation (guided
brainstorming, idea validation against market/users, architecture and stack validation),
during, and after. Method: the same shopping discipline we use for upstream code, aimed
at methodologies — the `.refs/` folder holds cloned repos of candidate methodologies; we
inventory them, keep verdicts, and re-implement the good parts as our own canonical
skills. Our foundation stays fixed: product requirements separated from implementation
(WHAT before HOW). Nothing is adopted wholesale; we merge and synthesize. Every added
step must pay for its ceremony (the anti-GSD rule: verbosity is a cost, measured).

### 2. Gradual automation with a human circuit-breaker

- Creative phases: exclusively interactive, frontier models.
- Planning: strong models, gated by the human (the wave map is approved; wave plans are
  generated just in time).
- Execution: fast, cheap models.
- **Escalation** is a first-class mechanism, triggered by categories (not by a
  self-reported confidence number): irreversible or destructive operations; contradiction
  with a spec or constraint; missing human-owned input; gate failure after N self-fix
  attempts; a design fork the plan flagged as unsettled. Timeout policy: after 15–30 min
  without an answer, proceed with the most confident option — except irreversible
  decisions, which block forever.
- Substrate: `pi-dynamic-workflows` (in `.refs/`), which is code-mode orchestration:
  the workflow is a deterministic, journaled JavaScript script. Our **static spine** is
  a human-authored script the agent never rewrites (unbypassable because it is the
  entry point); the agent may grow **dynamic branches** only at the call sites the
  spine offers.

### 3. Own the harness

Pi is ours; hooks-era thinking is dead. OpenSpec integrates in three layers:

1. **CLI core** (portable truth): artifacts, schemas, validation, stores. No Pi
   dependency, works everywhere.
2. **Canonical skills + adapters**: skills authored once in the **Pi dialect** (the most
   capable), rendered per harness by per-target adapters (`.pi`, `.claude`, `.cursor`,
   `.agents`). Design settled — see `ops/upstream-shopping-2026-08.md` §B2 until it moves
   to a permanent home.
3. **Pi extension** (optional, deep): workflow engine, escalation UX, and native
   instrumentation. On other harnesses everything degrades gracefully to layers 1–2.

## The money rule and the ledger

The number that matters: **total cost of one shipped change** — tokens, plus human
steering time, plus all rework discovered later. The measuring system is the **ledger**:
traces (evidence) → receipts (one fact per process step) → regrets (quality signals that
arrive late and point back at the step that caused them). Receipts live outside any
one project — the exact home (OpenSpec store vs global SQLite vs hybrid) is owed a
design session — captured natively by the Pi extension, and feed the future **second
brain** (a separate initiative where projects, mail, and documents converge).
Full design: `ledger-and-evals.md`.

## Standing rules

- **ADR-0001 everywhere:** shopping trips, verdicts, re-implementation. Never merge, never
  copy — from upstream or from methodologies.
- **Adoptions land as structure-preserving subpackages** in the pnpm monorepo (the Pi
  lesson: clear responsibility per package). A vendored package keeps its upstream
  structure so fixes cherry-pick surgically (recorded upstream SHA + marked patches);
  our logic layers vertically in sibling packages, never by rewriting vendored
  internals.
- **Measure first, build second:** machinery must be justified by receipts, not
  conviction.
- **Docs stay prunable:** harvest-then-delete; git is the archive; ELI10 prose except
  where precision genuinely needs technical language.
- **English for everything durable.**
