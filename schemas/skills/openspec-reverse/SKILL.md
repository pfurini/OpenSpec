---
name: openspec-reverse
description: Draft an OpenSpec spec baseline from an existing (brownfield) codebase that was never built with OpenSpec. Use when a repo has code but no openspec/specs/, and you want reviewable draft specs to ratify — not authoritative specs. Reverse-engineers observable behavior into capability specs, test-and-doc first, one capability at a time, with a human confirming every step.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Reverse-engineer a **draft** OpenSpec spec baseline from an existing codebase.

You are a cartographer, not an architect: you document **what the system does**, captured at the
altitude of behavioral requirements — never what it *should* do, and never improvements. The output
is a draft a human ratifies, not a source of truth. This is an **agent-driven** operation: you read
code/tests/docs and write `openspec/specs/<capability>/spec.md` files, leaning on two deterministic
CLI helpers (`openspec reverse scan`, `openspec reverse scaffold`) for the mechanical parts.

**Why this is hard (hold these the whole way):** code encodes the HOW and includes bugs; a spec
encodes the WHAT. You cannot perfectly recover intent from mechanism. So you bias toward evidence,
confirm before you assert, and surface everything you can't confirm as an open question instead of
inventing a requirement.

---

## The discipline (non-negotiable)

1. **Document what IS, not what SHOULD BE.** No suggestions, no critique, no refactors, no "this could
   be improved." You are recording behavior, not reviewing it.
2. **Every requirement traces to evidence.** Cite the `file:line` you read for each requirement/scenario
   (in your working notes and in the draft as `<!-- evidence: path:line -->`). Never assert behavior you
   have not read in the actual code or a test.
3. **Tests and docs are the intent oracle; code confirms current behavior.** When a test or doc states
   intent, prefer it. When code behavior **contradicts** a doc/test, or looks like a bug, **flag it for
   the reviewer** — do NOT silently canonize current code behavior as a `SHALL`.
4. **No fabrication.** Behavior you cannot confirm becomes an explicit open question, never a requirement.
5. **Behavioral altitude.** A requirement is a WHAT a user/caller can observe, not a transcription of
   functions. If your draft mirrors the code one-to-one, you are too low — zoom out.
6. **Draft, not authoritative.** The draft banner stays. A human ratifies before anyone relies on it.
7. **One capability at a time.** Never emit a whole-repo spec set in a single unreviewed pass.

---

## Preflight

Confirm the CLI is available, otherwise stop and tell the user to install it:

```bash
openspec --version
```

Then confirm you are at the project root (the directory that will hold `openspec/`). All commands below
are run from there.

---

## Flow

### Step 1 — Inventory first (never draft before this)

Run the deterministic scan and read its candidate capability map:

```bash
openspec reverse scan --json
```

This returns file counts, detected languages, and **candidate capabilities** (each marked
`existing: true` if `openspec/specs/<name>/` already exists). The scan is read-only and does no
inference — it is your starting map, not the answer. Do not begin drafting requirements before you
have it.

### Step 2 — Ratify the capability map with the human

The scan's grouping is a *heuristic* (top-level modules). It will be too coarse in places, too granular
in others, and may surface noise (root-level singletons, build configs). **Present it and let the human
decide** — use the **AskUserQuestion tool**. Never auto-select or silently finalize boundaries.

Offer the human these moves per candidate: **keep**, **rename**, **merge** with another, **split**, or
**skip**. Skip capabilities already marked `existing` unless the user wants to extend them. Capture the
confirmed list before extracting anything.

### Step 3 — Extract one capability at a time

For each confirmed capability, in turn (do not batch):

**a. Gather signal, in priority order.** Read the actual files — do not pattern-match from names:
1. **Tests** for this capability (executable statements of intent; richest in edge/error cases).
2. **Docs** — `README`, `docs/**`, ADRs — for stated intent and the WHY.
3. **Implementation code** — only to fill gaps tests/docs leave. Note `file:line` for everything.

Use the scan's `sampleFiles` for the capability as entry points, then follow outward one level.

**b. Draft requirements at behavioral altitude.** Write `### Requirement:` (a SHALL statement) with
`#### Scenario:` blocks in `- **WHEN** … / - **THEN** …` form. Each requirement carries an evidence
comment. Keep the count tractable — a handful of real requirements beats a transcription.

**c. Apply the confirmed-only rule.**
- Confirmed from tests/docs/code → a requirement, with evidence.
- Cannot confirm whether a behavior is intended → an open question:
  `> TODO(reverse): <question> — seen at <path:line>`.
- Current behavior may be a bug, or code contradicts a doc/test → flag for the reviewer in the draft
  (`> REVIEW(reverse): possible-bug — <what>, <path:line>`); do not promote it to a `SHALL`.

**d. Scaffold and write.** Create the canonical skeleton, then fill it (keep the draft banner):

```bash
openspec reverse scaffold <capability> --purpose "<one line>"
```

Then edit `openspec/specs/<capability>/spec.md`: replace the Purpose placeholder, add the requirements
and scenarios, and append any open-question / review lines.

**e. Validate before moving on.**

```bash
openspec validate <capability> --type spec
```

Fix any structural failures for this capability before starting the next one. Do NOT use `--strict`
here: strict mode escalates draft-stage warnings (a brief/`TBD` Purpose, etc.) to errors, and these
are drafts by design. Strict validation is for after a human has ratified and completed the spec.

**f. Show the human and pause.** Summarize what you drafted for this capability — requirements added,
open questions, review flags — and let them correct it before you move to the next capability.

### Step 4 — Wrap up

When the confirmed capabilities are drafted:

- Summarize: capabilities drafted, total requirements, and the consolidated open-question / review list.
- Remind the user these are **drafts requiring ratification** — the banner stays until a human removes it.
- Suggest next steps: ratify and refine each spec, or fold a ratified baseline into the project (these
  specs already live under `openspec/specs/`; a future change can diff against them).

---

## Output on success

```
## Baseline drafted

Capabilities drafted (N):
- <capability-1>: <R> requirements, <Q> open questions, <F> review flags
- <capability-2>: …

Open questions / review flags carried forward:
- TODO(reverse): … (path:line)
- REVIEW(reverse): possible-bug — … (path:line)

These are DRAFT baselines. Review each openspec/specs/<capability>/spec.md, resolve the open
questions, and remove the draft banner once ratified.
```

---

## Guardrails

- Read tests and the real code before asserting behavior — cite `path:line`, never memory.
- Tests/docs lead for intent; code confirms current behavior; disagreements get flagged, not canonized.
- Unconfirmed behavior is an open question, never a requirement.
- Stay at behavioral altitude — if the spec reads like the code, zoom out.
- One capability at a time; the human ratifies the map and each draft.
- The draft banner stays until a human removes it. You never declare a baseline authoritative.
