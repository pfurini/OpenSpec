## The Flow

The end-to-end design procedure. Follow it in order.

### 0 · Prime — orient before you design
${PRIME_RITUAL}

For design specifically: the **proposal + specs** are the WHAT you build against — read them in full, not just to orient. The exploration note's **Parked Design Seeds** (incl. any `candidate ADR` tags) are your HOW starting points. The accepted **ADRs** are hard constraints; the **glossary** fixes the vocabulary your note and ADRs must use.

**Skills discovery — record the ground-truth references.** Project skills are the harness's backbone, and they must enter as *recorded references in artifacts*, never as session memory (cold-handoff safe). If the exploration note already recorded a resolved skill set, that is your input — carry it forward. Otherwise discover it now: glob `.agents/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md`, read their front-matter `description`s, and match them to this change's capabilities (an `openspec/config.yaml` `skills:` block, if present, pins/adds/excludes — its override wins). Note especially any **test-strategy** skill (the project's scenario→layer table + mock allowlist + enforced bans) — its Testing-approach contribution is load-bearing. You will cite these skills per component (by path) in the design note so the wave map and JIT plans can list them as Mandatory Reading.

### 1 · Approaches — present, the user picks
Propose 2-3 real architectural approaches. For each: one-line cost, one-line benefit, **effort size (S / M / L / XL)**, plus your recommendation and what evidence would change it. **Present and wait for the user's pick** — this is the first and biggest fork. If the change genuinely has one obvious approach, say so and confirm briefly rather than inventing alternatives.

### 2 · Interview the load-bearing decisions
Walk the decision tree (above) — one question at a time, recommendation, wait — for the forks that matter. Auto-decide the trivia. Settle everything; defer nothing to tasks.

### 3 · Decompose
Turn the chosen approach into components + interfaces + dependencies + the slice-composition map (see the spine above).

### 4 · Present the design shape — get approval
Before writing anything, present the shape back to the user, scaled to complexity — a few sentences for a simple change; the approach + decomposition + the load-bearing decisions for a complex one. Ask "does this look right?" and fold in corrections. **This is the gate: don't write the note until the user has confirmed the shape.**

### 5 · Write the design note
Capture the settled HOW in `<changeRoot>/design-notes.md` — exactly what `/opsx:continue` transcribes into `design.md`, so it must hold the full design:
- **Context** — current state cited by `path:line`; constraints; relevant ADRs (reference, don't re-argue).
- **Goals / Non-Goals**.
- **Decisions** — every settled choice + rationale + alternatives considered; reference ADRs for the load-bearing ones.
- **Components & Dependencies** — the decomposition (units, interfaces, depends-on, slice composition). For each unit, cite the **project skills** that govern it (by SKILL.md path — the ground-truth references, see Prime). *The wave-map precondition.*
- **Data model / API shapes**, **Data flow & error handling**.
- **Testing approach** — **decide the test layer per spec scenario here** (unit / integration / component / e2e). Cheapest layer that genuinely *proves* the scenario; *proves* dominates *cheap*. If the project has a **test-strategy** skill (cited in Components above), apply its scenario-class → layer table; else reason from first principles and record it. Multi-page / gate / redirect flows prove at e2e, not unit piles. This is transcribed verbatim into the wave map's coverage map — leave none of it open.
- **Risks / Trade-offs**, **Migration / Rollback**.
- **Open Questions** — genuine, explicitly-deferred unknowns only (often empty). Never dodged decisions.

Scale each section to its weight; skip what doesn't apply. Don't pad.

**Glossary:** if the design introduces a genuinely new shared term — a concept others will reference — offer to append it to the project glossary (the existing root `GLOSSARY.md`, or create one at the repo root). One line, append don't clobber. Reuse the glossary's existing terms; don't log throwaway implementation names.

### 6 · Record ADRs
Record an ADR **only if all three hold**: hard to reverse · surprising without context · the result of a real trade-off. Write `ADR-NNNN-slug.md` into the project's ADR directory — use the repo's existing one if it has ADRs, else create `docs/adr/` (the convention). Give it this front-matter, then Context / Decision / Consequences / Alternatives:
```yaml
---
id: ADR-NNNN
title: <the decision, one line>
status: proposed
date: <today — run `date +%Y-%m-%d`>
change: <this change name>     # the link /opsx:archive uses to promote it
---
```
**Dedup first** — check the ADR registry (`docs/adr/README.md`, loaded fresh at prime via `openspec adr index --check`) before minting: if your decision duplicates an existing ADR, don't; if it revises one, supersede it (new ADR + `superseded-by`), never silently duplicate.

**Regenerate the registry — mandatory.** After writing a new ADR or superseding one, run `openspec adr index` so `docs/adr/README.md` reflects it. A stale registry is exactly what makes the next session mint a duplicate — this is a deterministic step, not optional.

- ✅ *"Profile data stays owned by the user-management capability; the self-service page references it, doesn't fork it."* — hard to reverse, surprising, a real trade-off. → **ADR.**
- ❌ *"Reuse the existing Button component for Save."* — trivially reversible, unsurprising, no real alternative. → just do it.

(Status stays `proposed` here. When the change is archived, `/opsx:archive` promotes the ADRs tagged `change: <name>` to `accepted`. ADRs live *outside* the change directory, so they survive archival as the project's durable architectural memory.)

### 7 · Visual question? Suggest the visual flow
Suggest a separate visual-design flow **only if seeing beats reading AND it's UI (not architecture)**. Don't attempt UI mockups inline.
- ✅ *"Tabs vs single-scroll vs sidebar for the settings page?"* → suggest the visual flow.
- ❌ *"Validate avatar dimensions client- or server-side?"* → a HOW decision, answer is words → handle inline. (A data-flow diagram is *architecture* → ASCII here.)

### 8 · Self-review + final review
Scan the design note: placeholders, internal consistency, **every component has an interface + named dependencies**, **no unsettled decision is hiding in Open Questions**, and **every ADR traces to a decision the user explicitly confirmed** — none silently auto-decided (if one did, you skipped the gate; take it back to the user before transcribing). Fix inline. Then ask the user to review the note before it's transcribed.

### 9 · Handoff
"Design note written to `<change>/design-notes.md` (+ N ADRs at `status: proposed`). Decomposed into <k> components; every decision settled. Run `/opsx:continue` to materialize `design.md` from the note." No `design.md`, code, or tasks are written here.
