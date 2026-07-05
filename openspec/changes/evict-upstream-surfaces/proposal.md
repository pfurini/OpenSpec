# Proposal: evict-upstream-surfaces

> Primary input: `openspec/explorations/make-this-fork-mine.md` (ownership map; this is
> change 1 of its five-change eviction plan).

## Why

This repo is now a personal hard fork whose product is the deep-planning workflow, but it still
carries surfaces that only make sense for upstream's public product: analytics that phone home to
upstream, a feedback command that posts to upstream's channel, a profile system built for
upstream's "too many skills overwhelm new users" onboarding concern, and migration code for
historical upstream installs that this fork has no users of. Every one of them is maintenance
weight, noise in the command surface, and — in telemetry's case — data leaving the machine for
someone else's benefit. Evicting them is the first concrete act of fork ownership.

## What Changes

- Remove the telemetry subsystem entirely: no events, no anonymous id, no first-run notice.
  The CLI makes zero analytics network calls.
- **BREAKING**: remove the `openspec feedback` command (posts to upstream's feedback channel).
- **BREAKING**: remove the profile/skill-gating machinery. There is no `core`/`custom` profile
  and no configurable workflow subset: init and update always install the full workflow skill
  set. `openspec config` loses its profile/workflow management surface.
- **BREAKING**: prune upstream-era skills from the bundle: `openspec-onboard` (upstream
  new-user teaching), `openspec-propose` and `openspec-ff-change` (one-shot artifact generators
  that bypass the design gate). `openspec-bulk-archive-change` stays (neutral utility). With
  install-all as the rule, the bundle is the installed surface — pruning it is part of owning it.
- Remove legacy-project detection, cleanup, and migration paths from init and update. The fork
  supports projects created by the current architecture only; pre-stores-era layouts are out of
  contract.
- Global config (`~/.config/openspec/config.json`) drops the `telemetry`, `profile`, and
  `workflows` keys. A config file still containing them parses fine (ignored), and they are
  dropped on the next write — no prompt, no migration wizard.

## Capabilities

### New Capabilities

None — this change only removes.

### Modified Capabilities

- `global-config`: contract loses the profile, workflows, and telemetry fields; unknown/stale
  keys are tolerated on read and dropped on write.
- `cli-config`: `openspec config` no longer manages profiles or workflow subsets.
- `cli-init`: no legacy detection or cleanup interaction; always installs the full workflow
  skill set.
- `cli-update`: no legacy cleanup and no profile-sync drift detection; always converges the
  project to the full workflow skill set.

### Retired Capabilities

These specs describe evicted behavior and are retired with this change (removed from the main
baseline at sync/archive):

- `telemetry`
- `cli-feedback`
- `legacy-cleanup`

## Constraints

**Compatibility**
- The command surface changes only by removal: `openspec --help` before/after differs exactly by
  `feedback` and the profile/workflow entries of `config`. No kept command changes name, flags,
  or output contract.
- The nine workflow skills' CLI invocations are unaffected: none of the `openspec <cmd>` calls
  they make touch feedback, telemetry, profiles, or legacy cleanup (verifiable by grep over
  `schemas/skills/**`).
- A global config written by the pre-eviction CLI (containing `telemetry`/`profile`/`workflows`)
  loads without error, warning, or prompt.
- Existing projects' `openspec/config.yaml` behavior is unchanged.

**Performance**
- None.

**Security & Compliance**
- After this change the CLI initiates no network calls for analytics or feedback; the only
  network activity is user-initiated (e.g. git operations on store references). Falsifier: no
  HTTP client usage remains outside those user-initiated paths.

**Operational**
- Full test suite green at completion; deleted tests belong exclusively to evicted surfaces.
- The bundle pruning touches `schemas/skills/**`, so the parity-wall rebaseline ritual runs in
  the wave that prunes (`pnpm run rebaseline:skills && pnpm test`) and the regenerated parity
  test is committed with it.

## Impact

- **Deleted**: `src/telemetry/`, `src/commands/feedback.ts`, `src/core/profiles.ts`,
  `src/core/profile-sync-drift.ts`, `src/core/legacy-cleanup.ts`, `src/core/migration.ts`
  (sole dependent is `init.ts` — verified), and the bundle skill dirs `schemas/skills/feedback/`,
  `openspec-onboard/`, `openspec-propose/`, `openspec-ff-change/`.
- **Added**: `src/core/workflow-skills.ts` — the `WORKFLOW_SKILLS` constant (single source of
  truth for the installed set) + an enumeration-guard test asserting constant ↔ bundle parity.
- **Trimmed**: `src/core/init.ts` and `src/core/update.ts` (legacy-cleanup private methods,
  profile-driven workflow selection → constant full set), `src/commands/config.ts`
  (ProfileState/Diff surface), `src/core/global-config.ts` + `config-schema.ts` (dropped keys),
  CLI command registration.
- **Kept with care**: the workflow id list survives the death of `profiles.ts` as the
  `WORKFLOW_SKILLS` constant in `src/core/workflow-skills.ts` (settled in design).
- **Specs**: retire `telemetry/`, `cli-feedback/`, `legacy-cleanup/`; delta-update
  `global-config`, `cli-config`, `cli-init`, `cli-update`.
- **Tests**: prune suites for evicted surfaces; adjust init/update/config suites.
- **Docs**: minimal sweep only — remove `feedback`/telemetry/profile mentions from `docs/cli.md`
  and `docs/commands.md` so no doc describes a removed command. The full docs rewrite stays
  deferred (eviction plan change 5).
- **Operator's machine**: `~/.config/openspec/config.json` self-cleans on next write.
