# Wave 4 plan — closure: docs sweep, tracer live (C8)

Wave map source: `tasks.md` (## Wave 4). Value: docs tell no lies about removed commands
and the contract test is live. Acceptance: `pnpm test` green with the tracer live; grep of
`docs/cli.md` + `docs/commands.md` finds no feedback/profile/telemetry command references.

## Mandatory Reading

| Pri | File | Lines | Why |
|---|---|---|---|
| P0 | `docs/cli.md` | 3, 20, 38, 85, 102–129, 150, 1011, 1023–1060, 1069–1094, 1149–1150, 1159 | Every feedback/profile/telemetry mention to REMOVE or reword |
| P0 | `docs/commands.md` | 9–30 (quick ref), propose/ff-change/onboard sections, cross-refs at 94, 118, 166, 619–620, 638, 695 | Pruned-skill sections to REMOVE; handoffs re-pointed at `/openspec-new-change` |
| P1 | `test/cli-e2e/eviction-contract.test.ts` | all | Verify zero `.fails` markers remain (they were flipped in waves 1–2, per those plans' documented deviations) |

## Files to Change

- UPDATE `docs/cli.md` — remove `openspec feedback` section + quick-ref rows, `--profile`
  option + examples, `config profile` subcommand docs, telemetry config examples and
  env-var rows; reword init/update descriptions to install-all; `--force` described as
  inert (matches wave 3)
- UPDATE `docs/commands.md` — single skill table (10 skills, no profile framing); delete
  `/openspec-propose`, `/openspec-ff-change`, `/openspec-onboard` sections; re-point
  cross-references to `/openspec-new-change` / `/openspec-continue-change`

## Cycles

- [x] **Cycle 1 — C8: docs sweep + tracer-live verification**
  - **Behavior**: no doc in the two swept files describes a removed command; the eviction
    contract runs live (proposal Constraints + tasks.md wave 4)
  - **Test layer**: wave acceptance grep + full suite (no new unit tests — docs-only)
  - **RED**: the acceptance grep itself is red before the sweep:
    `grep -nE "feedback|telemetry|profile" docs/cli.md docs/commands.md` returns hits.
    (Docs edits have no unit-test scaffold; the grep is the automated verification, per
    the wave map's acceptance.)
  - **GREEN**: perform the sweep; re-run the grep expecting only non-command incidental
    hits (target: zero matches for feedback/telemetry/profile in command contexts —
    strive for zero total); `pnpm test` green.
  - **Gotcha**: the tracer has no remaining `.fails` markers to remove — waves 1–2 flipped
    them when their behavior landed (documented there). This cycle just verifies that and
    runs the suite. `docs/commands.md` line 638's "legacy commands" refers to deprecated
    CLI noun-first commands (`openspec change show`), not legacy-cleanup — reword only if
    it mentions evicted surfaces.
  - **Validate**: `grep -inE "feedback|telemetry|profile" docs/cli.md docs/commands.md || echo clean`,
    then `pnpm test`
  - **Commits**: single `docs:` commit (no test:/feat: split — docs-only cycle, the
    acceptance grep is the gate)

## Documented deviations

- **Pruned-skill sections swept too**: the acceptance grep names only
  feedback/profile/telemetry, but `/openspec-propose`, `/openspec-ff-change` and
  `/openspec-onboard` are removed commands and "docs tell no lies" covers them; their
  sections in `docs/commands.md` are removed in this sweep. The full docs rewrite
  (other files, workflows.md, etc.) stays deferred to eviction-plan change 5.
- **No RED/GREEN commit pair**: docs-only cycle; the wave acceptance grep is the
  automated check, committed once green.
