# Multi-file skill/command generation (kill the single-file flattening)

> **ARCHIVED 2026-08-17.** Mechanism shipped 2026-06-15. This is a design record, not a
> build ticket. Do not pick it up as open work.
>
> **Emit format (current):** Agent Skills — `SKILL.md` + `references/` + `scripts/` — is
> the format every target harness understands. Progressive disclosure is the normal path,
> not a Claude Code special case. `getSkillBundleCapability` defaults to `full` for every
> tool with a `skillsDir`. Flatten remains in the emitter as an opt-out for a tool with
> no skills surface; no available tool uses it.
>
> **What's in the tree:** all 10 workflow skills are real dirs under `schemas/skills/`.
> Only `openspec-design` ships `references/` today. Scripts plumbing (`loadSkillSource` +
> `buildSkillArtifacts`, exec bit) exists; no skill has a `scripts/` dir. The `design.ts`
> rewrite this unblocked landed via `design-tasks-pipeline-collapse.md`.

Status: **SHIPPED 2026-06-15; archived 2026-08-17.**
Tags: historical journal below. Snapshot dates on each section.

## Current state (as archived)

| Piece | Status |
|---|---|
| Authoring as real dirs (`schemas/skills/<name>/`) | Done. All 10 skills via `loadSkillSource`. |
| Bundle types + `buildSkillArtifacts` | Done (`full` writes the tree; `flatten` concatenates). |
| Tree parity (`EXPECTED_BUNDLE_TREE_HASHES`) | Done. Only `openspec-design` has a bundle tree. |
| Capability default | `full` for every `skillsDir` tool. Flatten = unknown tool / no skillsDir. |
| Scripts | Loader + emitter ready. Unused (no `scripts/` in any skill). |
| Remaining skills as multi-file content | Real dirs, but 9/10 are still a single `SKILL.md`. Split only if a skill needs depth. |
| User-facing skill generator | Still out of scope. |
| Command-generation adapters | Deleted (skills-only). Confirms "don't chase multi-file commands." |

Optional leftovers (not this track): drop the flatten path if it stays unused; add `scripts/` when a skill actually needs a helper; pass through extra Agent Skills frontmatter fields (`generateSkillContent` still emits a fixed subset).

---

## Historical journal (2026-06-13 → 2026-06-15)

The sections below are the original design record. Pre-build snapshots (§1–§7) describe
the 2026-06-13 gap, not the code today. §8 is the design pass that shipped.

### 1. The trigger [2026-06-13]

OpenSpec's generated skills and slash commands were **single-file by construction**. When the
opsx skills (esp. `design`) were authored, the rich, mature **multi-file** source skills the
user asked to borrow from (gsd, superpowers, claudekit, PRP) were **flattened into a sentence
or two** — their depth (multi-step procedures, reference docs, helper scripts) had nowhere to
go in a one-blob `SKILL.md`. [CONFIRMED defect]

Second consequence: because the skills lived as TS string consts and only became real
`SKILL.md` files *after deployment*, there was **no in-repo plain-text skill to run a
validator against** — so the opsx skills couldn't be empirically tested at the source.
**The authoring representation MUST yield plain-text skill files in this repo.** That
settled the fork → real directories (option 2 in §4).

### 2. The mechanism gap [snapshot 2026-06-13 — closed]

Then:

- `generateSkillContent` returned a **single string** → one `SKILL.md`.
- `SkillTemplate.instructions` was one markdown blob; no bundle manifest.
- Slash commands emitted a single `.md` via per-tool command-generation adapters.
- Templates were TS string consts, SHA-256 parity-hashed as function payloads.

Now: `SkillTemplate.bundle`, `loadSkillSource` / `flattenSkillBody` /
`buildSkillArtifacts`, tree hashes. Command-generation adapters are gone.

### 3. Scope — RATIFIED 2026-06-13

**In:** OpenSpec's **own built-in skills** become multi-file — short `SKILL.md` +
`references/*.md` + **`scripts/`**. [CONFIRMED: scope = "richer opsx skills + scripts"]

**Out:** a user-facing "generate arbitrary multi-file skills for the user's project"
product surface. Still out.

**Degradation (original):** per-tool capability-gated flatten for tools that couldn't
read bundles. **Superseded:** Agent Skills is the emit format for every target harness;
flatten is vestigial (see archive banner).

### 4. Design space & constraints

- **Skills ≠ commands.** The multi-file story is a *skills* story. Slash commands are
  single markdown; don't chase multi-file commands — let them link to skill references.
  [CONFIRMED. Command adapters later deleted entirely.]
- **Target harnesses speak Agent Skills.** `SKILL.md` + `references/` + `scripts/` +
  progressive disclosure is the layout every harness this fork emits to understands
  (Cursor, Codex, Pi, …). An early draft treated multi-file bundles — especially
  `scripts/` — as a Claude Code-only capability and planned flatten/drop as the common
  path. That was wrong: `getSkillBundleCapability` defaults to `full` for any tool with
  a `skillsDir`; `flatten` is the rare opt-out. [CORRECTED 2026-06-15; restated 2026-08-17]
- **Never vendor third-party skills.** Distill into our own `references/`, or cite the
  project's installed skills by path. "Reference / distill, never paste." [CONFIRMED]
- **Empirical-validation loop.** Source stays as close to literal markdown as possible;
  inject only `${PRIME_RITUAL}` / version seams. [CONFIRMED; this is how the dirs work]
- **Authoring representation.** Option 2 won: real directories under
  `schemas/skills/<name>/`. [CONFIRMED in §8.3; later all 10 skills migrated]
- **Progressive disclosure helps the under-read problem.** Short `SKILL.md`, depth on
  demand — aligned with adherence, not bulk. [CONFIRMED rationale]

### 5. Open decisions from the 2026-06-13 pass — all settled in §8

- Authoring representation → real dirs.
- Parity → hash the emitted tree (`EXPECTED_BUNDLE_TREE_HASHES`).
- Degradation contract → `full` default; `flatten` opt-out, unused by available tools.
- Scripts → live under `scripts/`, exec bit set, loaded and emitted. Unused in content.
- Migration → incremental; completed (all skills are real dirs).

### 6. Relation to other work

- Enabler for the design-skill rewrite. Sequence: this mechanism → rewrite as
  `references/`. The rewrite landed via `design-tasks-pipeline-collapse.md`.
- `task-machinery-and-wave-execution.md` §8 (skills-as-Mandatory-Reading by path) is the
  "reference, don't inline" half; this note was the "let opsx skills themselves be
  multi-file" half.
- Generality: keep project-specific conventions out of the emitter.

### 7. Original build order (superseded by §8.5)

1. Design pass (settle §5).
2. Extend generation + rework parity for trees.
3. Per-tool degradation.
4. Migrate opsx skills; then the design rewrite can use references.

---

## 8. Decided approach — design pass 2026-06-15 [the §5 forks, settled]

### 8.1 The upstream collision (context as of 2026-06-15)

This track collided with an **unbuilt upstream proposal stack** (Tabish Bidiwale, PRs
#698/#733/#741):

- **`unify-template-generation-pipeline`** — `WorkflowManifest` / `ToolProfileRegistry` /
  `ArtifactSyncEngine`. Not built here; fork later dropped tracking-upstream as a merge
  strategy (`ADR-0001-fork-sovereignty`).
- **`add-tool-command-surface-capabilities`** — command-surface capability. Not built;
  this fork went skills-only.
- **`simplify-skill-installation`** — was the then-current base (profiles, delivery
  modes). Profiles/delivery were later evicted on this fork.

**Finding at the time:** upstream's pipeline was complementary (plumbing) vs this note
(multi-file semantics). Multi-file extended the skill field from a string to a directory.

### 8.2 Decision: mergeable-shaped, NOT a 24-task prerequisite [CONFIRMED 2026-06-15]

Built the **minimal** real-dirs multi-file capability, shaped to converge with upstream's
proposed names — without implementing their full refactor. Additive bundle types on the
skill template, a capability flag on tool metadata, degradation as a transform. Did NOT
build `ArtifactSyncEngine`. (Later: the fork stopped merging upstream; the mechanism
stayed.)

### 8.3 Authoring representation [CONFIRMED — real dirs]

Opsx skill source = **real directories** under `schemas/skills/<dir>/` (`SKILL.md` +
`references/*.md` + `scripts/`), read + templated at generation time. `schemas/` ships in
`package.json` `files`. Seams stay minimal.

The 2026-06-15 note said the legacy string-const path would stay for the other skills
during an incremental migration. **That migration finished:** every workflow skill is a
`loadSkillSource` factory over a real dir. Only design currently has `references/`.

### 8.4 The pilot — design skill as the tracer bullet

Vertical slice on **`design` first**:

- `DESIGN_BODY` → `schemas/skills/openspec-design/SKILL.md` + `references/*.md`.
- `SkillBundle { references?; scripts? }`, `SkillFile { relPath; content; executable? }`.
- `skillBundle?: 'full' | 'flatten'` on `AIToolOption`. **`full`** writes the tree.
  **`flatten`** concatenates into one `SKILL.md` (never silent loss).
- **Capability default = `full` [CONFIRMED 2026-06-15, corrected].** Initial guess was
  "Claude-only = full" — WRONG. Agent Skills is the cross-tool standard. Default `full`
  for any tool with a `skillsDir`; `flatten` is opt-in. Restated 2026-08-17: every harness
  this fork targets understands references and scripts, so `full` is the only path that
  matters.
- **Scripts:** deferred *as content* in the pilot (design has none). The loader/emitter
  for `scripts/` shipped with the mechanism; still unused.
- **Parity:** hash the emitted tree per `full`/`flatten`, not a single string.

### 8.5 Build trail (TDD waves)

0. **Tracer bullet — DONE 2026-06-15.** Design skill at `schemas/skills/openspec-design/`
   (`SKILL.md` + `references/flow.md`). Bundle types + `loadSkillSource` /
   `flattenSkillBody` / `buildSkillArtifacts` / `getSkillBundleCapability`. Wired into
   `init`/`update`. An early verification had Claude=`full` and Cursor flattened; that
   was the pre-correction default and is **not** current behavior — Cursor (and every
   other `skillsDir` tool) is `full`.
1. **flatten-seam refinement — DONE 2026-06-15.** Wave-0 append-at-end flatten left a
   dangling `references/flow.md` pointer in the always-single-file command path. Fix =
   `<!--bundle:start-->…<!--bundle:end-->` markers; `flattenSkillBody` inlines in place;
   `renderFullInstructions` strips the fences and leaves the author's pointer prose.
   Flatten is now a rare/unused path; the marker still matters for `full` SKILL.md
   staying short.
2. **Tree-based parity — DONE 2026-06-15.** `EXPECTED_BUNDLE_TREE_HASHES` guards the
   emitted file set for bundled skills.
3. **Design-skill rewrite — LANDED** via `design-tasks-pipeline-collapse.md` (wave
   skeleton owned by design, written to `design.md`; borrowed depth in `references/`).
   Original pointer: `prompt-adherence-and-design-rewrite.md` §2.
4. **Scripts + remaining-skill migration — plumbing done, content optional.** All skills
   are real dirs. Add `scripts/` or extra `references/` only when a skill needs them.
   No remaining capability-gate work unless a tool is proven not to read subdirectories.
