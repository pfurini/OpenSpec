# GLOSSARY.md Format

The project glossary is a root `GLOSSARY.md` — the canonical vocabulary the design, ADRs, and specs
must use. It is a glossary and **nothing else**: totally devoid of implementation details. Do not
treat it as a spec, a scratch pad, or a repository for implementation decisions.

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

## Location

One `GLOSSARY.md` at the repo root — the single canonical vocabulary for the whole project. If none
exists, create it lazily when the first shared term is resolved.
