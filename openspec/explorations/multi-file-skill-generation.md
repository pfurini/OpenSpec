# Multi-file skill/command generation (kill the single-file flattening)

Status: **brainstorm captured 2026-06-13, design pass NOT started.** Scope ratified by the
user; this note is the durable problem + design-space record for the implementing session.
Tags: **[CONFIRMED]** user-ratified · **[REC]** Claude's default, re-confirmable · **[OPEN]** undecided.

## 1. The trigger

OpenSpec's generated skills and slash commands are **single-file by construction**. When the
opsx skills (esp. `design`) were authored, the rich, mature **multi-file** source skills the
user asked to borrow from (gsd, superpowers, claudekit, PRP) were **flattened into a sentence
or two** — their depth (multi-step procedures, reference docs, helper scripts) had nowhere to
go in a one-blob `SKILL.md`. [CONFIRMED defect]

Second consequence [CONFIRMED 2026-06-13]: because the skills live as TS string consts and only
become real `SKILL.md` files *after deployment*, there is **no in-repo plain-text skill to run a
validator against** (superpowers `writing-skills`, `skill-creator`) — so the opsx skills can't
be empirically tested/refined at the source, only their generated artifacts in a consuming
project. This makes "the source must be validatable plain-text in-repo" a hard requirement that
settles the authoring fork (§4).

## 2. Confirmed in code (the mechanism gap)

- `generateSkillContent(template, version, transformInstructions?)` returns a **single string**
  → one `SKILL.md` (`src/core/shared/skill-generation.ts`).
- `SkillTemplate` = `{ name, description, instructions: string, license, compatibility,
  metadata }` — `instructions` is one markdown blob; no manifest for bundled files
  (`src/core/templates/types.ts`).
- Slash commands likewise emit a single `.md` (per-tool command-generation adapters in
  `src/core/command-generation/adapters/*`).
- Templates are TS string consts (e.g. `DESIGN_BODY`) and are **SHA-256 parity-hashed**
  (`test/core/templates/skill-templates-parity.test.ts`) — any multi-file refactor must
  rework or extend this parity mechanism.

## 3. Scope — RATIFIED 2026-06-13

**In:** OpenSpec's **own built-in (opsx) skills** become multi-file — short `SKILL.md` +
`references/*.md` + **`scripts/`** (executable helpers a skill can invoke) — with per-tool
**capability-gated degradation** (bundle for tools that support skill bundles; flatten or
link for those that don't). [CONFIRMED: scope = "richer opsx skills + scripts"]

**Out (for this track):** a user-facing "generate arbitrary multi-file skills/commands for
the user's project" product surface. Not now. (Revisit later as its own initiative if wanted.)

**Timing:** [CONFIRMED] author this note now; **build after the step-2 writing-pass test**.
This is too big to wedge mid-test.

## 4. Design space & constraints (for the design pass)

- **Skills ≠ commands.** Claude Code *skills* natively support multi-file + progressive
  disclosure (always-loaded `SKILL.md`, `references/` + `scripts/` loaded on demand). Slash
  *commands* are single markdown by the tool's design — "multi-file command" mostly doesn't
  exist (a command can at most reference external files). **The multi-file story is a *skills*
  story.** [REC: don't chase multi-file commands; let commands link to skill references.]
- **Tool heterogeneity.** OpenSpec emits to Claude Code, Codex, Cursor, … Multi-file bundles
  (and especially `scripts/`) are a Claude-skills capability; other tools may accept only a
  single file and no scripts. The emitter must **degrade gracefully**: bundle where supported,
  flatten (concatenate references into one file) or link where not, and **drop/skip scripts**
  for tools that can't run them — surfaced, never silent. This is the same per-tool adapter
  divergence the command-generation adapters already model. [REC]
- **Never vendor third-party skills.** OpenSpec must NOT copy gsd/superpowers/claudekit files
  into its output (license, staleness, drift). Two legitimate models, likely both:
  (a) author opsx skills with **their own** reference files that *distill* the sources;
  (b) reference the **project's installed** skills by path (the §8 skills-as-Mandatory-Reading
  contract — already the direction). "Reference / distill, never paste." [CONFIRMED principle]
- **Empirical-validation loop [CONFIRMED requirement 2026-06-13].** Today the opsx skill
  bodies exist only as TS string consts; a real `SKILL.md` appears **only after deployment**
  into a target project. So a skill-validator (superpowers `writing-skills`, `skill-creator`)
  has nothing **in-repo** to run against — you can only check the *generated artifact* in a
  consuming project, which tests the output, not the editable source, and is too indirect to
  refine against. **The authoring representation MUST yield plain-text skill files in this repo
  that external validators can run directly.** This knocks out option 1 below (strings in `.ts`
  are still not loose files) and effectively settles the fork → **option 2**. Caveat: a
  templating step remains (`${PRIME_RITUAL}`, version stamps), so either validate the
  placeholdered source or a rendered copy — design goal: keep opsx skills as close to literal
  markdown as possible, inject only at the seams, to maximize how directly they validate.
  *Interim before the refactor:* `openspec init /tmp/scratch` renders all skills to real files
  under `.claude/skills/*` → point the validator there (tests the artifact, not the source).
- **Authoring representation [OPEN — the load-bearing design fork; the empirical-validation
  requirement above tilts it hard to option 2].** Two options:
  1. Keep TS string consts, add a `files: { path, content }[]` (or `references`/`scripts`)
     manifest to `SkillTemplate`. Minimal plumbing change; but big reference bodies as TS
     string literals are ugly and the parity hash just covers more strings.
  2. Author skills as **real directories in the OpenSpec repo** (`schemas/skills/<name>/SKILL.md`
     + `references/` + `scripts/`), read + templated at generation time. Cleaner authoring,
     editable as real markdown/scripts; but a real refactor of generation + the parity
     mechanism (hash the directory tree, not a function payload). [REC leans option 2; decide
     in the design pass.]
- **Progressive disclosure *helps* the under-read problem.** A separate diagnosis this session:
  the design round failed because the prompt was **under-read** (ADR dedup / glossary / UX
  nuance all skipped). Multi-file with progressive disclosure keeps `SKILL.md` short and loads
  depth on demand — the *opposite* of cramming. So this work is aligned with fixing adherence,
  not adding bulk. [CONFIRMED rationale]

## 5. Open decisions to settle in the design pass

- Authoring representation (§4 — string manifest vs real skill directories). **The root fork.**
- Parity mechanism for multi-file skills (hash the tree; how to re-harvest).
- The degradation contract per tool: flatten-concat vs link vs drop; how scripts degrade; how
  the dropped/flattened content is surfaced to the user (no silent loss).
- Script handling: where scripts live, exec-bit/permissions, language assumptions, and the
  capability gate (which tools get scripts).
- Migration of the existing single-file opsx skills (design/explore/…) into the multi-file
  shape without regressing current behavior.

## 6. Relation to other work

- **Prerequisite/enabler for the `design.ts` quality rewrite** (the user's "design skill is
  poorly written / dropped the borrows" complaint). With multi-file skills, that rewrite carries
  the borrowed depth as `references/` instead of flattening. **Sequence this BEFORE the design
  rewrite.**
- **§8 of `task-machinery-and-wave-execution.md`** (skills-as-Mandatory-Reading by path) is the
  "reference, don't inline" half of the fix; this note is the "let opsx skills themselves be
  multi-file" half.
- **Generality (§12):** the emitter + degradation are general OpenSpec mechanism; what each tool
  supports is an adapter detail. Keep lexup specifics out.

## 7. Build order (when un-parked, after step-2)

1. Design pass (settle §5; new design note + ADR for the authoring-representation fork).
2. Extend `SkillTemplate` / generation to carry a file manifest (or read skill dirs); rework
   parity for trees.
3. Per-tool degradation in the command/skill generation adapters (+ surfacing of dropped/
   flattened content).
4. Migrate the opsx skills to multi-file; then the `design.ts` rewrite can use references.
