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

## 2. The thinking-record layer is a *shadow* layer (architectural caveat)

The thinking records we introduced — exploration note
(`openspec/explorations/<name>.md`), design note
(`<change>/design-notes.md`), and ADRs (`openspec/adr/`) — live **outside**
OpenSpec's tracked artifact graph. `openspec status` does not know they exist.

Consequences to keep in mind:
- **Ordering can only be guarded at the prompt level**, not via the schema's
  `requires` graph. (That is why the `deep-planning` `design` artifact instruction
  hard-stops when `design-notes.md` is missing — the dependency graph can't express
  "design.md needs the design note".)
- **Drift is possible**: a stale note behind an updated `design.md`/spec, with
  nothing flagging the mismatch.

Future decision: should notes **graduate into the schema as optional artifacts**
(so they're tracked, ordered, and drift-checkable), or stay as deliberately
lightweight shadow files? Don't solve until the workflow has been used enough to
know whether the drift actually bites.

## 3. Deferred cleanup: unify note-incorporation

`/opsx:propose` Step 0 hard-codes exploration-note incorporation. The
`deep-planning` schema now expresses the same behavior in its `proposal`/`specs`
artifact instructions. Step 0 is **not** duplicative today (it serves the
`spec-driven` / core-profile propose path, which has no note-incorporation in its
schema). If we ever move note-incorporation into `spec-driven` itself, collapse
Step 0 to its flow-control-only role (name derivation, skip-interview) to avoid two
sources of truth.

## 4. Durable ADR/glossary layer — LANDED (prompt-level)

Implemented as prompts only (no new CLI), consistent with §2's "don't formalize the
shadow layer until drift is observed" and the repo's all-markdown convention.

What now exists:
- **ADR lifecycle**: `/opsx:design` writes ADRs at `status: proposed` with front-matter
  carrying `change: <name>`. `/opsx:archive` promotes the ADRs tagged with that change to
  `status: accepted` (+ `accepted:` date) on archival. ADRs live in `openspec/adr/`
  (outside the change dir) so they survive archival as durable architectural memory.
- **explore-reads-ADRs**: explore primes from accepted ADRs as *standing constraints*
  (WHAT-lane guardrail: read as context, not a license to design).
- **Shared prime ritual**: `src/core/templates/workflows/shared-prime.ts` exports
  `PRIME_RITUAL`, a piv-prime-style ritual (refresh live state → route to canonical
  never-stale sources incl. ADRs + glossary → orient) embedded in both explore and design.
  It holds no copied facts by design.
- **Glossary**: canonical `openspec/glossary.md`. explore *seeds* domain vocabulary;
  design *extends* with new shared terms; both read it as canonical (no synonyms). Offer-
  to-write, append-don't-clobber.

Still deferred (revisit only if drift/scale bites):
- **`openspec adr` CLI** (`list --json`, `promote --change`): chosen prompt-only for now.
  Promotion is an agent Edit; ADR reads are markdown. Build the CLI when the markdown-only
  approach proves fragile or unqueryable at scale (this is the §2 graduation question for ADRs).
- **init scaffolding** of `openspec/adr/` and `openspec/glossary.md`: created lazily on
  first write today (same as `explorations/`); formalize in `init` if convention solidifies.

## Related
- `openspec/explorations/explore-workflow-ux.md`
- `schemas/deep-planning/schema.yaml`
- `src/core/templates/workflows/design.ts`
- `src/core/templates/workflows/explore.ts`
- `src/core/templates/workflows/archive-change.ts`
- `src/core/templates/workflows/shared-prime.ts`
