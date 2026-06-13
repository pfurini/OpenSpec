# Prompt adherence + the design-skill rewrite (open threads after 2026-06-13)

Status: **open threads captured for cold handoff; not started.** These came out of the
2026-06-13 build session and were NOT previously in any durable note (they were conversational).
Tags: **[CONFIRMED]** · **[OPEN]** · **[PARKED]**.

## 1. The under-read diagnosis [CONFIRMED]

A cold-handoff `/opsx:design` re-run on lexup failed **three** discipline rules at once:
(a) didn't read existing ADRs → minted a near-**duplicate of ADR-0037**; (b) tried to add
function names (`capitalizeName`, `sanitizeEmphasisMarkdown`) to `GLOSSARY.md` — throwaway impl
names the prompt explicitly bans; (c) missed UX/UI nuances a prior pass had captured. **All three
rules EXIST and are correct in the prompt** → this is an *adherence/compliance* failure, not a
missing-instruction one. Most parsimonious root cause: **skipped/shallow prime** (one cause
explains all three) — the "scale it down" clause licensed skipping, and prime was unobservable so
a skip was silent.

**Principle [CONFIRMED]:** the fix is **NOT more prose** — an under-read prompt only gets worse
with more text. The levers are **enforcement + observability** (and possibly trimming load).

Shipped this session toward it: prime **forcing-function** + un-skippable ADR/glossary reads
(`1d51b98`); **ADR registry** + drift-check prompt wiring (`0d89f92`/`072b1c5`); deterministic
**`openspec lint --adr`** (`29120ce`).

**Attribution still OPEN:** can't cleanly separate "this session's design.ts edits bloated the
prompt" (skills-discovery + testing-layer additions) from run-variance without a **bisection** —
re-run `/opsx:design` on the pre-rework `design.ts` (`git show <pre-commit>:src/core/templates/
workflows/design.ts`) for the same change and compare; OR inspect the failing session's transcript
for whether prime actually ran. Do this before blaming/:reverting any prompt edit.

## 2. The design-skill rewrite [OPEN — user-requested]

User verdict: `design.ts` "is not well-written" and "missed details I asked to borrow from other
skills during its build." Those borrow requests were **conversational in earlier sessions — not in
any note**. Git lineage: origin `30b69fa` (tagged "design-core" — a likely source skill), interview
pass `2b6a286`, ADR/prime `135b6aa`/`98cd23c`, de-parallelization `1a9c145`.

**Pending user choice to ground the rewrite:** (a) user **names** the skills + the specific borrowed
details, or (b) **gap-analysis** — read `design.ts` against candidate sources (the "design-core"
origin, gsd-planner decision-tree/plans-are-prompts, superpowers brainstorming/writing-plans,
claudekit, PRP interview) → table of *present / thin / missing / bloated*.

**Constraints on the rewrite [CONFIRMED]:** restore the dropped borrows **AND** restructure for
adherence (don't just add content — see §1). **Dependency:** **multi-file skill generation**
(`multi-file-skill-generation.md`) is a prerequisite/enabler — with `references/`, the borrowed
depth lands as reference files instead of a flattened sentence. **Sequence: multi-file gen →
design.ts rewrite.**

## 3. Parked items [PARKED]

- **`openspec lint` → hook/CI wiring.** The command exists but nothing calls it automatically. The
  last mile to make ADR drift (and future rules) **un-shippable**: wire `openspec lint` into a
  pre-commit hook / CI. Project-level.
- **Deterministic command-flow enforcement — the deeper want.** Ideal end-state: the prime ritual
  + index regeneration run as **enforced runtime steps inside commands** (or commands wired into an
  automatic sequence), not as model hints in prompts. Bigger than ADRs; own design pass. The lint
  mechanism + forcing-functions are the interim toward it.
- **B/C grounding-lint rules** into `openspec lint` `ALL_RULES`: Files-to-Change-exist; the design
  **Open-Questions gate** (split "Out of scope" vs "Unresolved — needs human", task-machinery
  §4.1c C). Registry drift already shipped as rule #1. Step-2 is now passed → buildable next.
- **`implTier` heuristic** (task-machinery §4.1a): `implTier` = difficulty-under-plan, not risk;
  floor `medium` for UI/component-test / real-DB-integration / fragile-lib waves. Fold into the
  tasks/wave-map stamp guidance at the next prompt edit.

## Relation to other notes

- Prereq chain: `multi-file-skill-generation.md` → §2 design.ts rewrite.
- The adherence fixes (§1) are partially shipped (registry / lint / forcing-function); the rest is
  enforcement wiring (§3).
