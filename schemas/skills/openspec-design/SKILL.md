Enter design mode. Think deeply about HOW to build it — as an interactive partner, not a one-shot generator. This is the HOW counterpart to explore.

Design is your thinking partner for the **HOW** — architecture, units, interfaces, the **wave skeleton** (the value-ordered build sequence the autonomous harness runs), and the load-bearing technical decisions. It runs on an existing change whose WHAT is already settled (proposal + specs). Like explore, it is a **pure thinker** — it decides nothing the user wouldn't want a say in — but the durable record it crystallizes IS `design.md` itself (plus **ADRs** for the load-bearing decisions). There is no shadow note: you settle the HOW with the user, then write `design.md` directly. `design.md` is the single source of the HOW contract; `/opsx:continue` only mechanically transcribes its wave skeleton into `tasks.md` afterward.

**This is a collaborative interview, not autonomous generation.** Your job is to reach a *shared model* of the HOW with the user and settle every load-bearing decision *together* — before writing anything. You carry the recommendations; the user confirms, overrides, or redirects. Do not silently decide the architecture and hand back finished artifacts.

**Adaptive depth — scale the interaction to the design's complexity, but every design gets some:**
- A genuinely simple change: maybe one or two questions, or just "here's the shape — good?" then write.
- A change with real architectural forks: walk them one at a time (see Interview below).

Don't manufacture questions to look thorough; don't skip the ones that matter to move fast. The litmus for each is under "What to put to the user."

---

## Where Design Sits

Design runs on an **existing change** that already has proposal + specs (the WHAT). It is the deep HOW thinker. Its output is **`design.md`** (written directly into the change directory) plus ADRs. `/opsx:continue` does not author `design.md` — it gates on it: until `design.md` exists, continue stops and sends the user here; once it exists, continue mechanically transcribes its wave skeleton into `tasks.md`.

**Prereq:** proposal + specs must exist. If they don't, stop and tell the user to settle the WHAT first (`/opsx:explore` to think it through, then create proposal + specs — e.g. via `/opsx:continue`) — you can't design against requirements that aren't written.

**If no change is named:** run `openspec list --json` and find the changes whose `design` artifact isn't `done` yet (confirm via `openspec status --change "<name>" --json` — `done` means `design.md` already exists). Those are the ones ready for the HOW. If a change already has a `design.md`, design is complete (or resumable) there — offer to revise it. Let the user pick which change to design.

---

## Interview the HOW — the heart of this command

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

**The ADR floor — non-negotiable:** if a decision is ADR-worthy (hard to reverse · surprising · a real trade-off), it goes to the user. Always. Adaptive scales the *number* of questions; it never lets you auto-decide a consequential one. A decision important enough to record as an ADR was important enough to confirm with the user first — recording an ADR for something you decided unilaterally is the exact failure this command exists to prevent.

**Format:** a concrete fork with a recommendation beats a yes/no. Not "Should we use X?" but "Between X and Y, which — given Z? I'd pick X because…".

**Anti-patterns:** parallel questions ("schema? and API? and auth?" — ask one, the first answer reshapes the rest); yes/no railroading; recommendation-free questions; asking what the code answers; grilling past the coding horizon (if the next question is a coding-time detail, stop).

**Stop interviewing when** every load-bearing decision has an answer, no "probably / I think / we'll figure it out" remains on anything cross-cutting, and the user has confirmed the *shape*. Stop *before* implementation detail that's genuinely decided at coding time.

---

## Decisions are settled HERE — never deferred to tasks

`tasks` is mechanical execution of a fully-settled design. **Design makes the decisions; tasks makes none.** So:

- **Resolve every design-level decision** — including the small ones with an obvious default (an API/procedure name, a clear-value semantic like `''` vs `null`). Pick the recommended default and record it. Do NOT write it into "Open Questions" and ship it downstream.
- **"Open Questions" means ONE thing:** a genuine unknown that needs the *user* or external information, which you have *explicitly* agreed to defer — or something out of scope. It is NEVER a decision you dodged, and NEVER "decide this in tasks."
- If, while decomposing, you find an unresolved decision, the interview isn't done — go back and settle it (ask or decide). Don't pass it forward.

Litmus: *would a reasonable engineer implementing this plausibly make a different user-visible or contract choice than another?* → it's a decision, settle it now. *Is it an internal name only the implementer sees?* → not an open question; just leave it to coding.

---

## Design for Decomposition — the spine

Decompose the work into **well-bounded units, each with one clear purpose, a defined interface, and named dependencies** — the precondition for the downstream TDD wave map:

- **Components** — each unit: purpose (one line), interface (inputs/outputs), depends-on (other units / existing modules).
- **Slice composition** — the dependency edges between units, and for each capability: *independently valuable* (a split signal — surface it; genuinely separable, separately-valuable work wants to be a **sibling change**, not a unit here) vs *simply unordered* (ordering freedom). Do **not** frame units as "parallelizable": code-writing inside one change is single-worktree and serialized. This map seeds the wave ordering downstream.

A unit you can't describe by purpose + interface + dependencies isn't bounded yet — keep shaping it. Follow existing patterns in the codebase; include targeted improvements only where they serve this work; no unrelated refactoring. YAGNI — cut scope the spec doesn't need.

---

## Sequence the build — the wave skeleton

The components map work into *units*; the wave skeleton sequences them into the **value-ordered vertical slices** the autonomous harness executes. **This is a load-bearing HOW decision you make WITH the user** (it used to leak into a "mechanical" tasks step with no thinker — that is the bug this command fixes). Decide it here so `tasks` only transcribes it.

A **wave** is a vertical slice that delivers one observable unit of value end to end, proven by tests — **NOT** a horizontal layer ("all the models", then "all the tests"). Each wave is one fresh harness session; within it the implementer runs red-green-refactor cycles. Build the skeleton against these rules:

- **Order waves by value, respecting dependencies.** Earliest waves deliver the most load-bearing user/system value that later waves build on.
- **Wave 0 is the tracer bullet:** a single failing end-to-end happy-path test that exercises the whole skeleton, PLUS scaffolding for any missing test infrastructure (Nyquist: every later wave needs an automated way to verify it; wave 0 creates what's missing). It proves the pipes connect; it is committed RED.
- **TDD ordering is mandatory.** Within every wave, behavior is proven test-first. A tests-last or tests-as-a-final-wave layout is a DEFECT.
- **Breaking changes are sliced atomically.** Every wave must leave the WHOLE suite green. A breaking reshape of an EXISTING API (one with current callers) goes in the SAME wave as the migration of all those callers AND their existing tests — never reshape in one wave and migrate a caller (or its test) in a later wave (that leaves an intermediate red the gate rejects).
- **No scope reduction.** Never shrink a scenario with "v1 / for now / simplified / MVP / just / basic / we'll handle X later". If a scenario is too big for one change, that is a **re-scoping decision to make with the user now** (split into a sibling change) — never a silent trim.

Capture the result in design.md's **Wave Skeleton / Build Sequence** section — per wave: the observable-value goal, the components it builds (the component→wave map), the spec scenarios it proves (so tasks can join them to their test layer), depends-on, the acceptance command that proves it green, stamps (`size` / `risk` / optional tier hints, planner ≥ implementer), and the governing skills. Don't restate interfaces (they live in Components) or test layers (they live in Testing Approach) — reference, so tasks transcribes losslessly without duplication.

---

<!--reference:references/flow.md-->

---

## Guardrails

- **Interview, don't generate** - Reach a shared model with the user; settle load-bearing decisions together. Don't silently decide architecture the user would want a say in.
- **One question at a time, then wait** - Never batch questions; never proceed on a "probably."
- **Settle everything (incl. the wave skeleton); defer nothing to tasks** - tasks only transcribes. Open Questions are genuine, explicitly-deferred user-facing unknowns — never dodged decisions.
- **The wave skeleton is yours** - decide the waves, their value ordering, the wave-0 tracer, and the component→wave map WITH the user. tasks transcribes; it never re-slices.
- **Adaptive** - Scale interaction to complexity; don't manufacture questions for a simple design, don't skip them for a complex one.
- **Stay in the HOW lane** - The WHAT is fixed. If designing the HOW reveals the WHAT is wrong or infeasible, flag it and send the user back to revise specs — don't silently redefine requirements.
- **Design for isolation** - Small, well-bounded units with clear interfaces and explicit dependencies. Follow existing patterns; YAGNI.
- **Write design.md directly; no code, no tasks** - your output IS `design.md` (incl. the Wave Skeleton) + ADRs, written after the shape-approval gate. `/opsx:continue` only transcribes the wave skeleton into `tasks.md`; it does not author `design.md`.
- **ADRs ship `proposed`, tagged `change:`** - don't self-promote; `/opsx:archive` accepts them when the change ships. They live in the project's ADR directory (commonly `docs/adr/`), outside the change directory — durable architectural memory.
- **Keep the glossary canonical** - reuse the project glossary's terms (a root `GLOSSARY.md`); offer to append genuinely new shared ones; never coin a synonym for a concept it already names.
- **Reference, don't duplicate** - point to ADRs and specs; don't re-argue or re-state them.
- **Do visualize architecture in ASCII** - diagrams, data flows, dependency graphs.
