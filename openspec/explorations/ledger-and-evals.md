# Ledger and evals — the measuring system

Design settled 2026-08-24 (session with Fable). Technical on purpose; the plain-words
version is in `NORTH-STAR.md` ("The money rule and the ledger"). Implementation order
lives in `BACKLOG.md` track E.

## What it measures

Total cost of one shipped change: tokens + human steering time + rework discovered
later. Gate-time acceptance is denominator data only (~everything gets accepted, so it
carries no information). Quality arrives late and is back-filled as regrets.

## The three tiers

| Tier | What | Nature | Retention |
| --- | --- | --- | --- |
| Traces | every model/tool call as OTel `gen_ai` semconv spans | evidence, voluminous | short |
| Receipts | one record per **process-step instance**, written at step completion | facts, durable | forever |
| Regrets/verdicts | quality signals attached later, pointing back at receipts | judgments, append-only | forever |

**The receipt is the join key.** Every receipt carries: trace IDs (drill down to the
exact transcript span), artifact refs (change id, artifact type, git SHA), and the
**skill version** (git SHA of the canonical skill that ran the step — this is what lets
us A/B process changes by downstream outcomes instead of vibes).

## Step identity

A receipt keys on `(project, change, schema-step, node-instance, attempt)`. The OpenSpec
schema provides the step ontology; the workflow DAG provides instances. This is why the
ledger lives in OpenSpec and not in a generic observability tool: only OpenSpec knows
the process semantics.

## Capture: semantic events, not log scraping

The Pi extension emits events at meaningful moments: `step_started`,
`artifact_written`, `gate_run(result)`, `deviation_logged`,
`escalation_raised(category, resolution, wait_time)`, `model_escalated`,
`human_turn(kind)`. Two deliberate payoffs:

- **Steering is countable**, and classified: answering a requested escalation (healthy)
  vs unprompted human correction (a process failure signal, weighted heavier).
- **Escalations are self-measuring**: every trigger, timeout expiry, and
  proceed-with-most-confident decision lands in a receipt, producing the calibration
  data a future learned threshold would need.

Interactive (studio) steps get receipts too — duration, turns, artifacts, decisions
recorded. Their quality signal arrives only via downstream regrets; that closes the loop
that lets process synthesis (Track D) be evaluated empirically.

## Storage: store-homed, local-first

- **Canonical home: the OpenSpec store** (the external planning checkout we kept),
  multi-project by design, git-friendly, works offline. Aligns with the second-brain
  initiative: the store is one converging stream the second brain ingests; cross-project
  queries (model routing stats) belong at second-brain level, not in one store query.
- **Local-first capture semantics:** a receipt is never lost because the store is
  unreachable — the emitter degrades to a project-local journal, `doctor` reports the
  divergence, reconciliation replays the journal.
- Transcripts stay in Pi session logs; the ledger stores pointers, not copies.
- Other harnesses feed coarse receipts via a CLI surface (`openspec ledger record`
  called from skill prose); Pi gets full fidelity natively. The ledger must never be
  Pi-only.

## Regrets

Fields: provenance (`retro` | `human-inline`), status (`candidate` | `adjudicated` |
`rejected`), blame class, blamed receipt, rework cost, evidence links, taxonomy version.

- **Inline human regrets** are welcome and frictionless, but enter as candidates: they
  may be rage. The retro adjudicates them against evidence before they count in cost
  attribution.
- **Rejected regrets are kept**: a cluster of unconfirmed frustration around a step is a
  friction metric (the step may be correct and still exhausting) — distinct from quality.
- **Blame taxonomy** is bootstrapped empirically from existing logs and incidents;
  the classes (spec-gap, design-assumption, plan-slicing, implementation, review-miss)
  are hypotheses to validate, not truth. The taxonomy is versioned; every regret records
  its taxonomy version; changes are retro-proposed, human-ratified.

## Evals: staged, calibrated before empowered

1. **Semantic evals first (L5):** LLM judges scoring artifacts against rubrics derived
   from our own schema instructions (falsifiability, spec-as-behavior-contract,
   deferrable-only open questions). Advisory only, attached to receipts at gate time.
2. **Calibration before authority:** a judge may block only after regrets prove its
   scores predict quality. An uncalibrated blocking judge is just ceremony.
3. **Evals-as-code later (L4):** promptfoo/DeepEval as CI regression walls for canonical
   skills, once they stabilize (premature while methodologies are merging weekly).

## The layered stack, and what we build when

```
L0 runtime          Pi fork                     — exists
L1 vocabulary       OTel gen_ai semconv         — adopt NOW (free, prevents remapping)
L2 transport        OTLP + Collector            — deferred: receipts must prove need
L3 backend          Laminar/Opik/…              — deferred: same gate
L4 evals-as-code    promptfoo/DeepEval          — when skills stabilize
L5 semantic layer   receipts + regrets + retro  — build FIRST; this is the moat
```

Build order (BACKLOG track E): schema freeze → thin native capture → retro skill →
semantic evals → only then plumbing. Measure-first applies to the measuring system too.

## Open items

- Schema freeze is **gated on the second-brain materials** (Paolo shares; the ledger
  schema is the interface the second brain ingests).
- The L3/L4 tool candidates came from a separate research session; pressure-test them
  against this staging before any commitment.
