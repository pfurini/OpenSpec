# GLOSSARY.md Format

The project glossary is a root `GLOSSARY.md` — the canonical vocabulary the design, ADRs, and specs
must use. It is a glossary and **nothing else**: devoid of implementation detail beyond the optional
canonical `code` identifier (below). Do not treat it as a spec, a scratch pad, or a repository for
implementation decisions.

## Structure

```md
# {Project} Glossary

{One or two sentences on what this project is, so terms have a frame.}

**Order**:
{A one or two sentence description of the term.}
_Avoid_: Purchase, Transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, Payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, Buyer, Account
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the
  others under `_Avoid_`. The glossary's job is to *kill synonyms*, not catalogue them.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's domain.** General programming concepts (timeouts,
  error types, utility patterns) don't belong even if the project uses them extensively. Before
  adding a term, ask: is this a concept unique to this domain, or a general programming concept?
  Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single
  cohesive area, a flat list is fine.
- **Append, don't clobber.** When design introduces a genuinely new shared term, add one line;
  never rewrite existing entries to fit the change you're working on.

## Code identifier and default-language label (optional)

Two optional fields cover the common case where a project's user-facing language isn't English, or a
concept's code symbol differs from its name. The bold heading stays the canonical concept name —
what design, specs, and ADRs use:

- **`code`** — the single canonical identifier the codebase uses (table, type, column, enum,
  function), when it differs from the heading. This is `_Avoid_` applied to the code axis: one
  canonical name, no drift. Omit it when the heading already is the code name.
- **`label (<lang>)`** — the user-facing string in the project's default language.

```md
**Withdrawal waiver**:
A buyer's per-purchase waiver of the 14-day right of withdrawal.
code: `recesso_waiver`
label (it): Recesso
_Avoid_: cancellation, refund opt-out
```

**Stop at `code` plus one default label.** The glossary fixes the *concept* and its canonical code
name; it is not a translation catalogue. Full localization — every string in every supported
language — belongs to the project's i18n layer, keyed by the `code` identifier. Don't mirror all
translations here: a second copy drifts from the catalogue the moment one is wired in, and adding a
locale would then mean editing every entry instead of extending the catalogue.

## Location

One `GLOSSARY.md` at the repo root — the single canonical vocabulary for the whole project. If none
exists, create it lazily when the first shared term is resolved.

## Already have a glossary somewhere else?

Many repos already carry an informal glossary inside a README, an `AGENTS.md` / `CLAUDE.md`, or a
wiki. Don't create a second, competing one. Instead, offer to **consolidate**: move the terms into
`GLOSSARY.md` and leave a one-line cross-reference where they used to live (e.g. "Canonical glossary:
`GLOSSARY.md`"). One home, linked from everywhere — never the same term defined in two places that
can drift apart.
