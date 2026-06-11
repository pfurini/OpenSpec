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

## Related
- `openspec/explorations/explore-workflow-ux.md`
- `schemas/deep-planning/schema.yaml`
- `src/core/templates/workflows/design.ts`
