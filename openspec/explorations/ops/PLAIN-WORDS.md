# Plain words — what this project is, and why the plan looks like this

This file tells the same story as the other docs, but in simple words. Read it when you
(or a fresh session) need the *story*, not the instructions. The instruction files stay
bare on purpose; this one is for humans. Last updated 2026-07-05.

## What this project is

We forked OpenSpec (a tool that helps AI agents build software in a disciplined way) to
build **our own process** for making software with AI. The process: think about WHAT to
build (a conversation), decide HOW to build it (a conversation), turn that into a
step-by-step wave plan (automatic), let cheaper AI models execute the waves (automatic),
review and ship (mostly automatic). Every step ends with a file that has a strict shape,
so the next step can pick it up without guessing.

## The two rooms

The whole system is two rooms connected by a shelf:

- **The studio** — where thinking happens: ideas, research, requirements, design. This is
  interactive — a human plus a smart (expensive, rented) model, talking. You cannot
  automate taste.
- **The factory** — where execution happens: waves, tests, reviews, PRs. This runs on its
  own, with cheaper models, and you check on it from a dashboard.
- **The shelf between them** — the files with a strict shape (proposal, design, wave map).
  The studio puts finished thinking on the shelf; the factory takes it and builds.

We do not need to own the rooms. The AI models are rented — Claude, GPT, whatever is best
per job — and even the engines can be borrowed. We only need to own **the shelf and the
recipe book**: the schemas and the skills. Those are just text files. They work in any
room, forever, with no maintenance.

## The money rule

The number that matters is: **what did one shipped change cost, in total** — tokens, PLUS
the time you spent steering, PLUS all the rework when something turned out wrong later.
Not "price per token". A cheap model that needs three retries and your attention is more
expensive than a costly model that gets it right the first time.

## The ledger (the receipts)

Every time a step of the process finishes, we write one line in a file: which step, which
model, how many tokens, how long, how much steering. Like keeping receipts. After enough
receipts, the numbers tell us which model is good enough for which step — no more guessing.

## Regrets (the complaints box)

Here's the trap: approving a design means almost nothing, because you always approve it —
you iterated until it "sounded good". Whether the design was actually *good* you only find
out at the END, when the product is used and something turns out wrong.

So receipts alone are not enough. When something turns out wrong later, we write a
**regret**: a line pointing back at the step that caused it — "this failure came from a
design assumption nobody checked". The rework it caused (tokens, hours) is the true price
of that bad design. Quality becomes a number too — it just arrives late, and that's fine.

## The retro (the detective)

Regrets don't write themselves. After every finished change — and more deeply after every
milestone — a smart model reads the whole trail (the chat transcripts, the deviations, the
review findings) and asks: what went wrong, and which step is to blame? It writes the
regrets into the ledger and the lessons into the project's memory. This used to happen
manually, once, as a heroic effort — that's where the seam catalog came from. Now it's a
normal step that always runs. Heroics don't compound; steps do.

## Measure first, build second

This is the rule behind the current work order, and behind the demotions in the backlog:

- The old plan started by building a fancy piece of machinery (a shared code seam for the
  falsification rules) as "the backbone". But the rules are just sentences — a **message**.
  The machinery is a **fancy envelope**. You can write the message into the skills
  directly, cheaply. Build the fancy envelope only if the receipts later prove the message
  earns it.
- The old warm-up items practiced the old routine (port a rule → rebuild → test → commit).
  The routine that matters now is different: *do work → keep receipts → run the retro*.
  Practicing the old one is practicing your serve after the coach moved you to basketball.
- The items that harden the automated factory wait, because we should fix the machine
  where the receipts show it breaks — not armor the door while the window is what keeps
  breaking.

Nothing was deleted. Things moved from "build it big now" to "write it small now, and
build it big only if the numbers say so".

## The order of work now

1. **The receipts, the complaints box, and the detective** (ledger, regret events, retro).
   After this, everything else measures itself.
2. The disciplines that also produce data while they work: review adjudication with blame
   classes, code-complete ≠ proven, the falsification sentences, multi-angle design review.
3. **One real change driven through the whole process with receipts on** (the spec-baseline
   cleanup, GH issue #1) — the first honest test of everything at once.
4. The rest, as the numbers dictate.

## Where things live

- `START-HERE.md` (this folder) — the ranked to-do list. Pick one item, ship it, tick it.
- `RECONSTRUCTION.md` (this folder) — the full history: what was built, the 17 decisions,
  the upstream storm and the port.
- `process-disciplines-handoff.md` (this folder) — the catalog of hard-won lessons waiting
  to be ported (it absorbed the earlier falsification brief, which no longer exists as a
  separate file). `superpowers-openspec-sync.md` maps which ideas flow which way.
- `../` (the explorations journal) — the deep design notes, one per topic; `../README.md`
  is the index.
- `schemas/` and `schemas/skills/` (repo root) — the recipe book itself: the thing we own.
