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

## 8. Decided approach — design pass 2026-06-15 [the §5 forks, settled]

### 8.1 The upstream collision (new, decision-shaping)

This track collides head-on with an **unbuilt upstream proposal stack** authored by the OpenSpec
maintainer (Tabish Bidiwale, PRs #698/#733/#741), present on `main` and `upstream/main`:

- **`unify-template-generation-pipeline`** (0/24 tasks, NOT built — confirmed: `WorkflowManifest`/
  `ToolProfileRegistry`/`ArtifactSyncEngine` absent from `src/`). Introduces a canonical
  `WorkflowManifest` (kills the three hand-kept parallel arrays in `skill-generation.ts`), a
  `ToolProfileRegistry` (centralizes per-tool capabilities), a first-class **transform pipeline**
  (`preAdapter`/`postAdapter` phases, `skill`/`command`/`both` scope), and a shared
  `ArtifactSyncEngine` (unifies the duplicated `init`/`update`/legacy write loops).
- **`add-tool-command-surface-capabilities`** (0/33, NOT built). Adds a `adapter | skills-invocable
  | none` command-surface capability on tool metadata.
- **`simplify-skill-installation`** (90/90, **DONE** — this is the current base): profiles, delivery
  modes (`both|skills|commands`), `SkillTemplateEntry`, `getProfileWorkflows`. Extend THIS shape.

**Finding:** upstream's pipeline is well-architected and its structures are *exactly* the homes our
multi-file work needs — but it keeps `skill: SkillTemplate` as a **string blob** and never touches
real-dirs/references/scripts. So it is **complementary, not competing**: upstream = the *plumbing*
(manifest/profile/transform/sync) we lack; this note = the *multi-file semantics* on top, which
upstream lacks. They are different layers. Multi-file **extends** the manifest's skill field from a
string to a directory + files reference; it does not contradict anything upstream proposed.

### 8.2 Decision: mergeable-shaped, NOT a 24-task prerequisite [CONFIRMED 2026-06-15]

Build the **minimal** real-dirs multi-file capability now, **shaped to converge** with upstream's
proposed interfaces — but do **not** gate on implementing their full refactor. Rationale: this is the
single highest-churn area of the repo on a fork that tracks `upstream/main`; diverging the pipeline
here makes every future sync a merge fight. Aligning names now makes their eventual refactor a
near-clean convergence, and the multi-file *mechanism* becomes a clean candidate to upstream later
(the design-skill *content* stays on our fork). Mergeable footprint is narrow — additive bundle
types on the skill template, a capability flag on tool metadata named like a future `ToolProfile`
field, and degradation modeled as a transform (same pattern as the existing
`transformToHyphenCommands` for opencode/pi). We do NOT build `ArtifactSyncEngine` etc.

### 8.3 Authoring representation [CONFIRMED — fork settled to real dirs]

Per §4 the empirical-validation requirement locks this: opsx skill source becomes **real directories
in-repo** under `schemas/skills/<dir>/` (`SKILL.md` + `references/*.md` [+ later `scripts/`]), read +
templated at generation time. `schemas/` already ships in `package.json` `files`, so the sources are
present at runtime (no embed/build step). Templating seam stays minimal — `${PRIME_RITUAL}` and
version stamps injected only at the seams, source kept as close to literal markdown as possible so
external validators run against it directly. The legacy string-const path stays for the other 11
skills; the manifest entry supports **both** "string instructions" and "directory source" so the
migration is incremental, not a big-bang.

### 8.4 The pilot — design skill as the tracer bullet (wave 0)

Do the whole vertical slice on the **`design` skill only** first (matches the project's
decision-7 tracer-bullet philosophy), proving the full pipeline end-to-end before any broad
migration:
- Convert `design.ts`'s `DESIGN_BODY` into `schemas/skills/openspec-design/SKILL.md` (short) +
  `references/*.md` (the depth that will carry the borrowed material in the later rewrite).
- Bundle types (mergeable, additive): `SkillBundle { references?: SkillFile[]; scripts?: SkillFile[] }`,
  `SkillFile { relPath; content; executable? }`. `getOpsxDesignSkillTemplate()` reads its dir.
- Capability gate on `AIToolOption`: `skillBundle?: 'full' | 'flatten'`. **`full`** → write
  `references/*.md` alongside `SKILL.md`. **`flatten`** → concat references into `SKILL.md` under
  headings (self-contained, no broken links), surfaced never silently dropped. Converges with the
  future `ToolProfile`.
- **Capability default = `full` [CONFIRMED 2026-06-15, corrected].** Initial guess was "Claude-only
  = full" — WRONG. "Agent Skills" (`SKILL.md` + `references/` + `scripts/` + progressive disclosure)
  is a **cross-tool open standard** supported by 30+ platforms (verified against authoritative docs:
  Cursor `cursor.com/docs/context/skills`, Codex — both load `references/` on demand and execute
  `scripts/`; Cursor even reads `.claude/skills` / `.codex/skills` for compat; Vercel `npx skills`
  spans 27+ agents). OpenSpec already emits the Agent Skills layout to every `skillsDir` tool, so
  `getSkillBundleCapability` **defaults to `full` for any tool with a skillsDir**; `flatten` is opt-in
  per tool. Risk asymmetry drove the shape: `flatten` always yields a *complete* (larger) SKILL.md,
  whereas a wrong `full` silently drops `references/` a tool ignores — so `flatten` is the safe
  fallback and exceptions get marked as discovered (none known yet; candidates to verify if needed:
  the hyphen-command-transform tools opencode/pi). Consequence: flatten is now the *rare* path, so the
  wave-1 flatten-reorder debt is low-stakes (full = clean progressive disclosure, no reorder).
- **Scripts deferred** to a later wave (the design skill has none — references-only keeps the pilot
  tight). Script exec-bit/capability gate is the next slice.
- **Parity rework:** hash the emitted *tree* (SKILL.md + each reference) per capability mode, not a
  single string. New expected-hash map for bundle outputs alongside the existing two.

### 8.5 Build order (TDD waves, supersedes §7 for the pilot)

0. **Tracer bullet — DONE 2026-06-15.** Design skill authored at `schemas/skills/openspec-design/`
   (`SKILL.md` + `references/flow.md`, the flow carrying the `${PRIME_RITUAL}` seam). `SkillFile`/
   `SkillBundle` on `SkillTemplate`; `loadSkillSource`/`flattenSkillBody` (`skill-bundle.ts`);
   `buildSkillArtifacts` (`skill-generation.ts`); `skillBundle: 'full'|'flatten'` on `AIToolOption`
   (Claude=`full`, default `flatten`) + `getSkillBundleCapability`. Wired into `init`/`update` write
   loops. Verified end-to-end: Claude → `SKILL.md`+`references/flow.md`; cursor → one flattened
   `SKILL.md`, no `references/`. Parity re-harvested (only the 3 design hashes moved; 24 others
   byte-identical). Suite 1707 green (+7).
1. **flatten-seam refinement** (the one wave-0 debt): flatten currently *appends* references after
   Guardrails, reordering the command/flatten body vs the original (Flow now trails Guardrails). Fix
   = marker-based inline (replace the `## The Flow` pointer in-place) so flatten is order-lossless.
   Plus: surface dropped scripts; broaden the `full` capability set beyond Claude where supported.
2. **Tree-based parity — DONE 2026-06-15.** `EXPECTED_BUNDLE_TREE_HASHES` in the parity test hashes
   the full emitted file set (SKILL.md + references/* [+ scripts/*]) per `full`/`flatten` capability
   for bundled skills — so `references/` content is guarded, not just the single SKILL.md. Re-harvest
   with the same stableStringify+sha256 over `buildSkillArtifacts(...)`. Suite 1710 green.
3. **Then** the `design.ts` content rewrite lands as edits to `references/*.md`
   (`prompt-adherence-and-design-rewrite.md` §2) — the actual goal this unblocks.
4. (Later) scripts support + capability gate; migrate the remaining opsx skills.
