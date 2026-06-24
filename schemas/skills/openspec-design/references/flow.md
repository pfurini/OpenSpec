## The Flow

The end-to-end design procedure. Follow it in order.

### 0 · Prime — orient before you design
${PRIME_RITUAL}

For design specifically: the **proposal + specs** are the WHAT you build against — read them in full, not just to orient. The exploration note's **Parked Design Seeds** (incl. any `candidate ADR` tags) are your HOW starting points. The accepted **ADRs** are hard constraints; the **glossary** fixes the vocabulary your note and ADRs must use.

**Skills discovery — record the ground-truth references.** Project skills are the harness's backbone, and they must enter as *recorded references in artifacts*, never as session memory (cold-handoff safe). If the exploration note already recorded a resolved skill set, that is your input — carry it forward. Otherwise discover it now: glob `.agents/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md`, read their front-matter `description`s, and match them to this change's capabilities (an `openspec/config.yaml` `skills:` block, if present, pins/adds/excludes — its override wins). Note especially any **test-strategy** skill (the project's scenario→layer table + mock allowlist + enforced bans) — its Testing-approach contribution is load-bearing. You will cite these skills per component (by path) in `design.md` so the wave map and JIT plans can list them as Mandatory Reading.

### 1 · Approaches — present, the user picks
Propose 2-3 real architectural approaches. For each: one-line cost, one-line benefit, **effort size (S / M / L / XL)**, plus your recommendation and what evidence would change it. **Present and wait for the user's pick** — this is the first and biggest fork. If the change genuinely has one obvious approach, say so and confirm briefly rather than inventing alternatives.

### 2 · Interview the load-bearing decisions
Walk the decision tree (above) — one question at a time, recommendation, wait — for the forks that matter. Auto-decide the trivia.

**Settle everything; defer nothing to tasks.** `tasks` is mechanical execution of a fully-settled design — design makes the decisions, tasks makes none.
- **Resolve every design-level decision** — including the small ones with an obvious default (an API/procedure name, a clear-value semantic like `''` vs `null`). Pick the recommended default and record it; don't write it into "Open Questions" and ship it downstream.
- **"Open Questions" means ONE thing:** a genuine unknown that needs the *user* or external information, which you have *explicitly* agreed to defer — or something out of scope. It is never a decision you dodged, and never "decide this in tasks."
- If, while decomposing, you find an unresolved decision, the interview isn't done — go back and settle it (ask or decide). Don't pass it forward.

Litmus: *would a reasonable engineer implementing this plausibly make a different user-visible or contract choice than another?* → it's a decision, settle it now. *Is it an internal name only the implementer sees?* → not an open question; just leave it to coding.

### 3 · Decompose, then sequence into waves
**Decompose** the chosen approach into **well-bounded units, each with one clear purpose, a defined interface, and named dependencies** — the precondition for the wave map:
- **Components** — each unit: purpose (one line), interface (inputs/outputs), depends-on (other units / existing modules).
- **Slice composition** — the dependency edges between units, and for each capability: *independently valuable* (a split signal — surface it; genuinely separable, separately-valuable work wants to be a **sibling change**, not a unit here) vs *simply unordered* (ordering freedom). Do **not** frame units as "parallelizable": code-writing inside one change is single-worktree and serialized. This map seeds the wave ordering.

A unit you can't describe by purpose + interface + dependencies isn't bounded yet — keep shaping it. Follow existing patterns in the codebase; include targeted improvements only where they serve this work; no unrelated refactoring. YAGNI — cut scope the spec doesn't need.

Then **sequence** those units into the **wave skeleton** — the value-ordered vertical slices the harness runs (wave 0 tracer, value ordering, TDD-first, atomic breaking-change slicing, no scope reduction; the full rules live in SKILL.md's "Sequence the build — the wave skeleton" section). The wave skeleton is a HOW decision you make *with* the user; it does not get deferred to tasks.

### 4 · Present the design shape — get approval
Before writing anything, present the shape back to the user, scaled to complexity — a few sentences for a simple change; the approach + decomposition + **the wave skeleton (waves, their value goals, ordering, the wave-0 tracer)** + the load-bearing decisions for a complex one. Ask "does this look right?" and fold in corrections. **This is the gate: don't write `design.md` until the user has confirmed the shape — including the wave map.**

### 5 · Write design.md directly
Write the settled HOW straight into `<changeRoot>/design.md` (no shadow note — this IS the durable record the `openspec-continue-change` skill transcribes the wave map from, so it must hold the full design):
- **Context** — current state cited by `path:line`; constraints; relevant ADRs (reference, don't re-argue).
- **Goals / Non-Goals**.
- **Decisions** — every settled choice + rationale + alternatives considered; reference ADRs for the load-bearing ones.
- **Components & Dependencies** — the decomposition (units, interfaces, depends-on, slice composition). For each unit, cite the **project skills** that govern it (by SKILL.md path — the ground-truth references, see Prime). *The wave-skeleton precondition.*
- **Data model / API shapes**, **Data flow & error handling**.
- **Testing approach** — **decide the test layer per spec scenario here** (unit / integration / component / e2e). Cheapest layer that genuinely *proves* the scenario; *proves* dominates *cheap*. If the project has a **test-strategy** skill (cited in Components above), apply its scenario-class → layer table; else reason from first principles and record it. Multi-page / gate / redirect flows prove at e2e, not unit piles. This is transcribed verbatim into the wave map's coverage map — leave none of it open.
- **Wave Skeleton / Build Sequence** — the value-ordered waves from step 3. Per wave: observable-value goal, the components it builds (component→wave map), the **spec scenarios it proves** (so tasks joins them to their layer — don't restate the layer), depends-on, the **acceptance** command that proves it green, **stamps** (`size` / `risk` / optional tier hints, planner ≥ implementer), and governing **skills**. Mark wave 0 as the tracer. This section is the wave map's source — tasks transcribes it verbatim, adding only grounded test paths.
- **Risks / Trade-offs**, **Migration / Rollback**.
- **Open Questions** — genuine, explicitly-deferred unknowns only (often empty). Never dodged decisions.
- **Parked Design Seeds** *(optional)* — HOW ideas deliberately deferred to a *future* change (not this one). One bullet each; tag `candidate ADR` where relevant. This is the one thing the old design-note uniquely held; it now lives here (or back in the exploration note). It is never a place to stash a decision THIS change needs — those get settled above.

Scale each section to its weight; skip what doesn't apply. Don't pad.

**Glossary:** if the design introduces a genuinely new shared term — a concept others will reference — offer to append it to the project glossary (the existing root `GLOSSARY.md`, or create one at the repo root). One line, append don't clobber. Reuse the glossary's existing terms; don't log throwaway implementation names. (Structure, the `_Avoid_` synonym-killing convention, and the optional `code` identifier / default-language `label` fields: the **Glossary Format** reference.)

### 6 · Record ADRs
Record an ADR **only if all three hold**: hard to reverse · surprising without context · the result of a real trade-off (the expanded "what qualifies" list is in the **ADR Format** reference). Write `ADR-NNNN-slug.md` into the project's ADR directory — use the repo's existing one if it has ADRs, else create `docs/adr/` (the convention). **For the frontmatter (`id` / `title` / `status: proposed` / `date` / `change:`), the status lifecycle, and numbering, follow the ADR Format reference** — don't re-derive it here.

**Dedup first** — check the ADR registry (`docs/adr/README.md`, loaded fresh at prime via `openspec adr index --check`) before minting: if your decision duplicates an existing ADR, don't; if it revises one, supersede it (new ADR + `superseded-by`), never silently duplicate.

**Regenerate the registry — mandatory.** After writing a new ADR or superseding one, run `openspec adr index` so `docs/adr/README.md` reflects it. A stale registry is exactly what makes the next session mint a duplicate — this is a deterministic step, not optional.

- ✅ *"Profile data stays owned by the user-management capability; the self-service page references it, doesn't fork it."* — hard to reverse, surprising, a real trade-off. → **ADR.**
- ❌ *"Reuse the existing Button component for Save."* — trivially reversible, unsurprising, no real alternative. → just do it.

(Status stays `proposed` here. When the change is archived, the `openspec-archive-change` skill promotes the ADRs tagged `change: <name>` to `accepted`. ADRs live *outside* the change directory, so they survive archival as the project's durable architectural memory.)

### 7 · Visual question? Suggest the visual flow
Suggest a separate visual-design flow **only if seeing beats reading AND it's UI (not architecture)**. Don't attempt UI mockups inline.
- ✅ *"Tabs vs single-scroll vs sidebar for the settings page?"* → suggest the visual flow.
- ❌ *"Validate avatar dimensions client- or server-side?"* → a HOW decision, answer is words → handle inline. (A data-flow diagram is *architecture* → ASCII here.)

### 8 · Self-review — the completeness gate (you own it now)
You author `design.md` directly, so you own the completeness check the old transcription pass used to provide. The downstream `tasks` step is purely mechanical and STOPs on any gap — so a gap here halts the autonomous pipeline. Before handoff, assert ALL of the following and fix inline (don't hand off until green):
- **No placeholders / internal consistency** — no `<...>`, `TODO`, or template scaffolding left.
- **Every component** has an interface + named dependencies.
- **Every spec scenario has a test layer** in Testing Approach — none left unassigned.
- **Every wave** in the Wave Skeleton has: a value goal, its components (and every component maps to a wave — none orphaned), the scenarios it proves, depends-on, and an **acceptance command**. Wave 0 is the tracer.
- **The wave skeleton is internally consistent** — value-ordered, dependencies point backward, every spec scenario is proved by exactly one wave, no scope-reduction language anywhere.
- **Open Questions holds no dodged decision** — only genuine, explicitly-deferred user/external unknowns (often empty).
- **Every ADR traces to a decision the user explicitly confirmed** — none silently auto-decided (if one did, you skipped the gate; take it back to the user).

Fix inline. Then ask the user to review `design.md` (esp. the wave map) before they run the `openspec-continue-change` skill.

### 9 · Handoff
"`design.md` written to `<change>/design.md` (+ N ADRs at `status: proposed`). Decomposed into <k> components, sequenced into <w> waves (wave 0 = tracer); every decision and test layer settled. Run the `openspec-continue-change` skill to transcribe the wave skeleton into `tasks.md`." You wrote `design.md` here; the `openspec-continue-change` skill writes only `tasks.md` (mechanically) — no code is written in either step.
