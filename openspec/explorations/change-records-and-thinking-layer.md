# Future direction: change extension + the thinking-record layer

Captured mid-build so we don't lose it. Not yet designed. Picks up after the
`deep-planning` schema + `/opsx:design`-as-thinker work.

## 1. Updating / extending an existing change (the gap)

Today OpenSpec does **not** detect intent-level overlap. `openspec new <name>`
always scaffolds a *new* change; there is no "is this actually the same work as
an existing change?" check. The `workflows.md` "When to Update vs Start Fresh"
section is **human judgment guidance**, not automation.

How you extend a change today: target it by name — `continue <name>` creates
not-yet-made artifacts; you edit/regenerate artifacts to modify them; `apply
<name>` implements. There is no dedicated "extend"/"amend" command.

To build later:
- **Existing-change detector** (next-turn enhancement): a pre-flight at the entry
  point (explore / new) that runs `openspec list --json`, detects overlap with an
  active change, and offers "this looks like it extends `<x>` — update it instead
  of creating new?". Lives at the entry, not as a standalone command.
- **Proper change-record / amendment model**: a first-class way to record that an
  existing change was extended (what changed, why, when) rather than silently
  editing artifacts. Open question: does this reuse ADRs, or is it a new
  per-change changelog?

## 2. The remaining shadow layer is narrow (architectural caveat)

This caveat was too broad in the original note. The core OpenSpec artifacts are already
schema-tracked by the artifact graph: `proposal.md`, `specs/**/*.md`, `design.md`, and
`tasks.md` are declared by `schemas/deep-planning/schema.yaml`, ordered by `requires`, and
surfaced by `openspec status` / artifact instructions.

The remaining prompt-owned layer is narrower:
- `openspec/explorations/<name>.md` is discoverable (`openspec list --explorations`) and
  consumed by prompt/schema instructions, but is not a required change artifact.
- `<change>/design-notes.md` is required by the `design` prompt guard, but not declared as
  a graph artifact.
- ADRs (`docs/adr/` by convention) and root `GLOSSARY.md` are project-owned architectural
  memory. They intentionally live outside `openspec/` and are lifecycle-managed by prompts.
- Future harness artifacts (`plans/wave-N.md`, `progress.md`, final reports/reviews) need an
  explicit authority/lifecycle decision when they are implemented.

Consequences to keep in mind:
- **Ordering can only be guarded at the prompt level**, not via the schema's
  `requires` graph, for artifacts not in the graph. That is why the `deep-planning`
  `design` artifact instruction hard-stops when `design-notes.md` is missing — the
  dependency graph can't express "design.md needs the design note" unless we promote the
  note into the schema.
- **Drift is possible**, but the risk is now specific: stale exploration/design notes,
  stale ADR/glossary context, or future wave/report artifacts that disagree with the
  tracked proposal/specs/design/tasks.

Future decision: should any of these files **graduate into the schema as optional
artifacts** (so they're tracked, ordered, and drift-checkable), or stay deliberately
lightweight prompt-owned files? Do not solve globally. Decide per artifact after the v1
harness proof shows where drift actually bites.

## 3. Deferred cleanup: unify note-incorporation

`/opsx:propose` Step 0 hard-codes exploration-note incorporation. The
`deep-planning` schema now expresses the same behavior in its `proposal`/`specs`
artifact instructions. Step 0 is **not** duplicative today (it serves the
`spec-driven` / core-profile propose path, which has no note-incorporation in its
schema). If we ever move note-incorporation into `spec-driven` itself, collapse
Step 0 to its flow-control-only role (name derivation, skip-interview) to avoid two
sources of truth.

## 4. Durable ADR/glossary layer — LANDED (prompt-level)

Implemented as prompts only (no new CLI), consistent with §2's "don't over-formalize
prompt-owned files until drift is observed" and the repo's all-markdown convention.

What now exists:
- **ADR lifecycle**: `/opsx:design` writes ADRs at `status: proposed` with front-matter
  carrying `change: <name>`. `/opsx:archive` promotes the ADRs tagged with that change to
  `status: accepted` (+ `accepted:` date) on archival. ADRs live in the project's ADR
  directory (**`docs/adr/`** by convention — the prompts discover the repo's existing one),
  outside the change dir, so they survive archival as durable architectural memory.
- **explore-reads-ADRs**: explore primes from accepted ADRs as *standing constraints*
  (WHAT-lane guardrail: read as context, not a license to design).
- **Shared prime ritual**: `src/core/templates/workflows/shared-prime.ts` exports
  `PRIME_RITUAL`, a piv-prime-style ritual (refresh live state → route to canonical
  never-stale sources incl. ADRs + glossary → orient) embedded in both explore and design.
  It holds no copied facts by design.
- **Glossary**: canonical **root `GLOSSARY.md`** (a top-level project doc, like README/
  CHANGELOG — not buried in a subfolder). explore *seeds* domain vocabulary; design *extends*
  with new shared terms; both read it as canonical (no synonyms). Offer-to-write,
  append-don't-clobber.
- **Locations are project-owned, not OpenSpec-owned**: ADRs/glossary are project-wide
  architectural memory with their own conventions, so the prompts resolve to the repo's
  existing location (defaults: `docs/adr/`, root `GLOSSARY.md`) and never write under
  `openspec/`. A config override (`adrDir`/`glossaryPath`) is a possible future addition if a
  project needs a non-standard, deterministic path.

Still deferred (revisit only if drift/scale bites):
- **`openspec adr` CLI** (`list --json`, `promote --change`): chosen prompt-only for now.
  Promotion is an agent Edit; ADR reads are markdown. Build the CLI when the markdown-only
  approach proves fragile or unqueryable at scale (this is the §2 graduation question for ADRs).

## 5. Small deferred items (parking, so they aren't lost)

- **Visual-design flow**: `/opsx:design` step 7 *detects* authentic visual questions and
  suggests a separate visual flow — but that flow itself doesn't exist. The user has
  "something more articulate than the visual companion in mind" (their words); design it
  with them, don't assume the superpowers visual-companion shape.
- **Name the `deep-planning` schema for real**: working title; pick a proper name before
  any public release of the schema.
- **Design-side detector in propose**: `/opsx:propose` (spec-driven path) has no
  existing-change overlap detection; `new` got it. Add when touching propose.

## Related
- `openspec/explorations/explore-workflow-ux.md`
- `schemas/deep-planning/schema.yaml`
- `src/core/templates/workflows/design.ts`
- `src/core/templates/workflows/explore.ts`
- `src/core/templates/workflows/archive-change.ts`
- `src/core/templates/workflows/shared-prime.ts`
