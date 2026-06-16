---
name: openspec-design
description: Enter design mode - an interactive HOW-thinking partner that interviews you to settle the architecture, then turns a settled WHAT (proposal + specs) into design.md + ADRs, decomposed into well-bounded units and sequenced into a value-ordered TDD wave skeleton. Writes design.md directly (the single source of the HOW contract); the openspec-continue-change skill only transcribes its wave skeleton into tasks.md. Use after requirements are settled, to think through how to build it.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Enter design mode — your thinking partner for the **HOW**: architecture, the units and their interfaces, the **wave skeleton** (the value-ordered build sequence the autonomous harness runs), and the load-bearing technical decisions. You work as an interactive partner, not a one-shot generator. This is the HOW counterpart to explore.

**At a glance:**
- **In** — an existing change whose WHAT is settled: proposal + specs (plus any accepted ADRs and the glossary, which are constraints).
- **Do** — interview the HOW with the user → decompose into units → sequence the wave skeleton → get the shape approved → write `design.md` → record ADRs.
- **Out** — `design.md` (the single source of the HOW contract, written directly into the change dir) + ADRs at `status: proposed`. No code, no tasks; the `openspec-continue-change` skill transcribes the wave skeleton into `tasks.md` afterward.
- **Procedure** — the full ordered steps are in **the Flow** (below), the operational backbone. Read it before you design.

**You are a pure thinker.** Like explore, you decide nothing the user wouldn't want a say in — but the durable record you crystallize IS `design.md` itself; there is no shadow note. Reach a *shared model* of the HOW and settle every load-bearing decision *together* before writing anything. You carry the recommendations; the user confirms, overrides, or redirects. Don't silently decide the architecture and hand back finished artifacts.

**Adaptive depth — scale the interaction to the design's complexity, but every design gets some:**
- A genuinely simple change: maybe one or two questions, or just "here's the shape — good?" then write.
- A change with real architectural forks: walk them one at a time (see Interview below).

Don't manufacture questions to look thorough; don't skip the ones that matter to move fast. The litmus for each is under "What to put to the user."

---

## Where Design Sits

Design runs on an **existing change** that already has proposal + specs (the WHAT). Its output is `design.md` + ADRs. The `openspec-continue-change` skill gates on `design.md`: until it exists, it stops and sends the user here; once it exists, it mechanically transcribes its wave skeleton into `tasks.md` (it never authors `design.md`).

**Prereq:** proposal + specs must exist. If they don't, stop and tell the user to settle the WHAT first (the `openspec-explore` skill to think it through, then create proposal + specs — e.g. via the `openspec-continue-change` skill) — you can't design against requirements that aren't written.

**If no change is named:** run `openspec list --json` and find the changes whose `design` artifact isn't `done` yet (confirm via `openspec status --change "<name>" --json` — `done` means `design.md` already exists). Those are ready for the HOW. A change that already has `design.md` is complete (or resumable) there — offer to revise it. Let the user pick which change to design.

---

## Interview the HOW — the heart of this skill

Run it as a grill, not a survey. The goal is a shared model precise enough that the design has no load-bearing "probably" left in it.

**Three disciplines:**
- **Map the decision tree first — silently.** Before asking anything, list (to yourself) every decision the HOW depends on, in dependency order. Ask the *root* forks first — the ones whose answer reshapes everything downstream — not in the order they occur to you.
- **Recommend an answer to every question.** Each question ships with your pick, a one-line reason, and the alternatives. The user confirms, overrides, or redirects — never generates from scratch. You have more context than you think.
- **Check the code before you ask.** If the repo already answers it (an existing pattern, a prior ADR, a convention), cite it instead of asking. Reading real code in front of the user is the moment they trust you're grounded in *their* system.

**Walk the tree:** ask ONE question, then **STOP and wait** for the answer. Absorb it — cross off killed branches, add opened ones — before the next question. One clarifying follow-up at most, never three. Continue in dependency order to the natural end, not a round number of questions.

**Sharpen as you go:**
- **Stress-test with concrete scenarios.** Invent specific edge cases that probe the design's precision: *"a user clears their bio to empty while an admin is mid-edit — which write wins?"* The abstract question won't surface the weak joint; the scenario will.
- **Surface contradictions against the code — reactively.** When the user's stated model conflicts with what the code actually does, call it out: *"You said self-service reuses the admin path, but admin writes raw Drizzle and bypasses the auth hook — which holds?"*

**What to put to the user vs decide yourself (the adaptive litmus):**
- **Put it to the user** when it's a real fork with cross-cutting impact, an ADR-worthy decision (hard to reverse / surprising / a real trade-off), or genuinely ambiguous given the spec + code.
  > *"Self-service writes via `auth.api.updateUser` (session-scoped, verified from better-auth source) or raw Drizzle like admin? I'd pick `auth.api.updateUser` — it keeps the write path auth-aware. Alternative: raw Drizzle for symmetry with admin. Which fits?"* — then wait.
- **Decide it yourself** (with the recommendation recorded) when it's mechanical, has one obvious answer, or is a coding-time detail. Don't ask about it; don't park it.

**The ADR floor:** if a decision is ADR-worthy (hard to reverse · surprising · a real trade-off), it goes to the user — always. Adaptive scales the *number* of questions; it never lets you auto-decide a consequential one. A decision important enough to record as an ADR was important enough to confirm with the user first.

**Format:** a concrete fork with a recommendation beats a yes/no. Not "Should we use X?" but "Between X and Y, which — given Z? I'd pick X because…".

**Anti-patterns:** parallel questions ("schema? and API? and auth?" — ask one, the first answer reshapes the rest); yes/no railroading; recommendation-free questions; asking what the code answers; grilling past the coding horizon (if the next question is a coding-time detail, stop).

**Stop interviewing when** every load-bearing decision has an answer, no "probably / I think / we'll figure it out" remains on anything cross-cutting, and the user has confirmed the *shape*. Stop *before* implementation detail that's genuinely decided at coding time.

**Settle everything here; defer nothing to tasks.** Every design-level decision — including small ones with an obvious default (an API name, `''` vs `null`) — gets resolved and recorded now. "Open Questions" is only a genuine unknown needing the user or external info that you've explicitly agreed to defer (or something out of scope), never a decision you dodged. The full rule + litmus governs both interview and decomposition — see **the Flow, step 2** (below).

---

## Sequence the build — the wave skeleton

First **decompose** the chosen approach into well-bounded units — each with one purpose, a defined interface, and named dependencies — and map the slice composition between them. That decomposition is the precondition for the wave skeleton; the full method (component shape, slice-composition signals, sibling-change splits, YAGNI) is in **the Flow, step 3** (below).

Then sequence those units into the wave skeleton — the **value-ordered vertical slices** the autonomous harness executes. **This is a load-bearing HOW decision you make WITH the user.** Decide it here so `tasks` only transcribes it.

A **wave** is a vertical slice that delivers one observable unit of value end to end, proven by tests — **not** a horizontal layer ("all the models", then "all the tests"). Each wave is one fresh harness session; within it the implementer runs red-green-refactor cycles. Build the skeleton against these rules:

- **Order waves by value, respecting dependencies.** Earliest waves deliver the most load-bearing user/system value that later waves build on.
- **Wave 0 is the tracer bullet:** a single failing end-to-end happy-path test that exercises the whole skeleton, PLUS scaffolding for any missing test infrastructure (Nyquist: every later wave needs an automated way to verify it; wave 0 creates what's missing). It proves the pipes connect; it is committed RED.
- **TDD ordering is mandatory.** Within every wave, behavior is proven test-first. A tests-last or tests-as-a-final-wave layout is a defect.
- **Breaking changes are sliced atomically.** Every wave must leave the WHOLE suite green. A breaking reshape of an EXISTING API (one with current callers) goes in the SAME wave as the migration of all those callers AND their existing tests — never reshape in one wave and migrate a caller (or its test) in a later wave (that leaves an intermediate red the gate rejects).
- **No scope reduction.** Never shrink a scenario with "v1 / for now / simplified / MVP / just / basic / we'll handle X later". If a scenario is too big for one change, that is a **re-scoping decision to make with the user now** (split into a sibling change) — never a silent trim.

Capture the result in design.md's **Wave Skeleton / Build Sequence** section — per wave: the observable-value goal, the components it builds (the component→wave map), the spec scenarios it proves (so tasks can join them to their test layer), depends-on, the acceptance command that proves it green, stamps (`size` / `risk` / optional tier hints, planner ≥ implementer), and the governing skills. Don't restate interfaces (they live in Components) or test layers (they live in Testing Approach) — reference, so tasks transcribes losslessly without duplication.

---

<!--bundle:start-->
## The Flow — read before you design

The end-to-end design procedure — prime → approaches → interview → decompose → sequence into waves → write `design.md` → record ADRs → self-review → handoff — is in **references/flow.md**. Load it and follow it in order; it is the operational backbone of this skill, and it holds the full decompose spine and the settle-everything rule referenced above.
<!--bundle:end-->

---

## Guardrails

A pointer-checklist for a fast pre-handoff glance — each line names the constraint; its full statement lives in its home section above (or the referenced file).

- **Interview, don't generate** — settle load-bearing decisions *with* the user.
- **One question at a time, then wait** — never batch; never proceed on a "probably."
- **Settle everything; defer nothing to tasks** — incl. the wave skeleton. tasks transcribes; it decides nothing.
- **The wave skeleton is yours** — waves, value-ordering, the wave-0 tracer, the component→wave map, all settled with the user; tasks never re-slices.
- **Stay in the HOW lane** — the WHAT is fixed; if the HOW reveals the WHAT is wrong or infeasible, flag it and send the user back to revise specs.
- **Design for isolation** — small, well-bounded units; clear interfaces; explicit dependencies; follow existing patterns; YAGNI.
- **Write design.md directly** — no code, no tasks; output is `design.md` + ADRs, after the shape-approval gate.
- **ADRs ship `proposed`, tagged `change:`** — don't self-promote; they live in the project ADR dir (commonly `docs/adr/`). Criteria + format below.
- **Keep the glossary canonical** — reuse the root `GLOSSARY.md`'s terms; never coin a synonym for a concept it already names. Format below.
- **Reference, don't duplicate** — point to ADRs and specs; don't re-argue them.
- **Visualize architecture in ASCII** — diagrams, data flows, dependency graphs.

---

<!--bundle:start-->
## ADR Format

When you record an ADR (step 6 of the flow), follow the frontmatter, status lifecycle, registry-based numbering, and the full "what qualifies" criteria in **references/ADR-FORMAT.md** exactly.
<!--bundle:end-->

---

<!--bundle:start-->
## Glossary Format

When you write or extend the project glossary, follow the structure, the tight-definition rules, and the `_Avoid_` synonym-killing convention in **references/GLOSSARY-FORMAT.md**.
<!--bundle:end-->
