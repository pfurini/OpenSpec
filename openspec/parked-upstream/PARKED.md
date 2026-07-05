# Parked upstream changes

Parked 2026-07-05 when this repo's own workflow flipped from `spec-driven` to `deep-planning`
(`openspec/config.yaml`). These 11 changes were inherited from upstream (or authored against
upstream's architecture before the Option B port) and are all spec-driven artifacts — after the
flip they no longer match the active schema.

**Parking is not a decision.** Nothing here was judged dead; it was moved out of the active path.
Final disposition happens during the GH issue #1 spec-baseline reconciliation (see
`openspec/explorations/ops/START-HERE.md`, backlog #9). Per change, the verdicts are:
**delete** (moot — feature removed in the port, or upstream already shipped it),
**re-author** (idea still valuable → fresh deep-planning change citing the parked one),
or **leave parked**.

## First-pass classification (from proposal headers only — verify before acting)

| Change | First-pass verdict | Why |
|---|---|---|
| `fix-validate-view-resolution-parity` | **likely re-author** | Three commands give wrong/incomplete answers about spec source of truth; matches GH#1's "fix 2 validate failures". Live code-health value. |
| `add-artifact-regeneration-support` | **likely re-author** | Artifact regeneration is relevant to the deep-planning workflow; needs a proper read. |
| `add-qa-smoke-harness` | maybe | CLI smoke harness idea is sound, but the proposal targets deleted surfaces (delivery sync, tool detection). Salvage the idea, not the artifact. |
| `add-change-stacking-awareness` | maybe | Sequencing/dependency metadata between parallel changes — overlaps decision 11 (independence ⇒ split into sibling changes). Read before re-authoring. |
| `add-global-install-scope` | maybe | Install-path consistency; partially superseded by the skills-only `.agents/` store model. |
| `add-tool-command-surface-capabilities` | **likely delete** | Command adapters — the port deleted `src/core/command-generation/` entirely. |
| `fix-opencode-commands-directory` | **likely delete** | Per-tool command directories — fork is skills-only. Upstream issue #748. |
| `unify-template-generation-pipeline` | **likely delete** | Template pipeline replaced by the authored-SKILL.md engine in the port. |
| `simplify-skill-installation` | **likely delete** | Targets the pre-port skill/command installation model. |
| `schema-alias-support` | **likely delete** | Upstream's `spec-driven` → `openspec-default` rename concern; not this fork's problem. |
| `graceful-status-no-changes` | **likely delete** | Upstream issue #714 UX fix; check whether upstream already shipped it, then drop. |
| `IMPLEMENTATION_ORDER.md` | delete with the pile | Orders changes archived long ago (`add-zod-validation` etc.). |
