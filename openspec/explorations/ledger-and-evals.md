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

## Evals: staged, calibrated before empowered — and two regimes

Prose and code are judged by different mechanisms (imported from the ecosystem
research, 2026-08-24):

1. **Prose artifacts (proposals, specs, designs): rubric judges.** LLM judges scoring
   against rubrics derived from our own schema instructions (falsifiability,
   spec-as-behavior-contract, deferrable-only open questions). Advisory only, attached
   to receipts at gate time.
2. **Code: execution-based correctness, never LLM judges.** Judges reward
   plausible-looking code, not correct code (the HumanEval/SWE-bench lesson). The
   correctness signal is compile + tests + static analysis — our TDD gates already
   produce it; the eval layer records it, it does not re-judge it.
3. **Efficiency is trace-derived, not judged:** iterations-to-success (retry/loop count
   per step) and tokens-per-successful-run come from receipts/traces. The composite
   objective (e.g. pass-rate-per-token) is a custom scoring function over both — L5
   work; no vendor ships our trade-off curve.
4. **Calibration before authority:** a judge may block only after regrets prove its
   scores predict quality. An uncalibrated blocking judge is just ceremony.
5. **Evals-as-code later (L4): promptfoo first** (MIT, TS-native, custom JS/TS scorers
   versioned in-repo — the execution-based scorer is custom in every framework anyway).
   DeepEval (Apache-2.0, Python-only, RAG-centric metrics) only as a sidecar if
   subjective code criteria (idiomaticity, style adherence) ever need G-Eval-style
   judging.

## The layered stack, and what we build when

```
L0 runtime          Pi fork                     — exists
L1 vocabulary       OTel gen_ai semconv         — adopt NOW (free, prevents remapping)
L2 transport        OTLP + Collector            — deferred: receipts must prove need
L3 backend           Laminar/Opik/…              — deferred: same gate (shortlist below)
L4 evals-as-code     promptfoo (+DeepEval niche)  — when skills stabilize
L5 semantic layer   receipts + regrets + retro  — build FIRST; this is the moat
```

Build order (BACKLOG track E): schema freeze → thin native capture → retro skill →
semantic evals → only then plumbing. Measure-first applies to the measuring system too.

## Ecosystem research (imported 2026-08-24; re-verify facts before adopting)

Source: the "Langgraph as Agentic Base" research session (Kimi, mid-2026), critically
reviewed and found consistent with our direction. Facts are dated and partly
vendor-sourced — re-check at adoption time.

- **Orchestration: no framework.** LangGraph rejected: Pi already IS the agent runtime;
  adopting a graph framework means either reimplementing Pi's loop inside it or
  wrapping Pi sessions as opaque nodes (an expensive job scheduler). Substrate verified
  2026-08-24: `pi-dynamic-workflows` is **code-mode orchestration** (the Claude Code
  model), not declarative graphs — the workflow IS a JavaScript script over runtime
  primitives (`agent`, `parallel`, `phase`, `gate`, `checkpoint`, …) run in a
  deterministic vm sandbox with journaled, position-keyed replay. Versioning the script
  versions the workflow (Temporal-style workflow-as-code, not Airflow-style data), so
  the ownership argument is unchanged; the design consequences (spine authorship,
  explicit step labels) and the shipped substrate (checkpoint gates, budgets, quality
  patterns) are recorded in BACKLOG track F. Temporal itself stays parked: adopt only
  if crash-resume/multi-day runs demand it, never before observability shows the need.
- **Capture rule: never a proxy/gateway.** A proxy sees API-level request/response, not
  orchestration structure (which node called, what tool ran between calls). And our
  subscription-auth providers (Claude Agent SDK → Anthropic subscription APIs) must
  stay direct: gateways collide with the Authorization header and normalize away the
  client fingerprint the subscription path expects.
- **Token governor** lives at Pi's model-call layer: pre-request budget enforcement,
  fed by ledger data (the ledger measures; the governor enforces). Reportedly no
  vendor ships this ("open frontier") — treat the moat claim as hypothesis, but the
  enforcement point is right regardless.
- **L1 insurance:** gen_ai semconv is still experimental and its *agent/tool*
  attributes are the least stable part. Emit `gen_ai.*` as baseline + OpenInference
  attributes where richer payloads help; wrap all attribute names in ONE internal
  constants module so a semconv rename is a one-file change. Hand-instrumenting Pi is
  an advantage: no auto-instrumentor understands our workflow-node structure anyway.
- **L3 shortlist (for when receipts open the gate):** Laminar (TS-native, best
  agent-trace debugging, SQL over traces, no gating; risks: young community, Rust
  stack) vs Opik (Apache-2.0, best free eval surface incl. ungated online evals,
  prompt optimizer, test suites; the Ollie repair agent is Enterprise-gated on
  self-host). Langfuse = maturity hedge (MIT, biggest community; agent UX lags, no
  SQL). Phoenix out (online evals paywalled; ELv2 only matters if we ever host it for
  others). Helicone out (maintenance mode). Bake-off = one OTLP instrumentation, two
  exporters, side by side — but only AFTER L5 v0 exists. The backend is a **view over
  the traces tier; receipts in the store remain the source of truth**.
- **Retro calibration trick:** Opik's Ollie (trace analysis → fix proposal →
  regression test) is the commercial twin of our retro skill. A month on their free
  cloud tier can benchmark our detective's output — non-sensitive project only (cloud
  traces would carry generated code).
- **Independent confirmation:** the research's "don't loop on confidence, loop on
  evidence" rule for stochastic nodes is the same principle as our categorical
  escalation triggers (NORTH-STAR pillar 2), reached separately.

## Open items

- Schema freeze is **gated on the second-brain materials** (Paolo shares; the ledger
  schema is the interface the second brain ingests).
- Re-verify the L3/L4 shortlist facts at adoption time (fast-moving category,
  vendor-authored comparisons).
- Design the token governor (budget hierarchy, enforcement semantics, relation to
  receipts) when Track F starts.
