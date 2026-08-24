# Upstream shopping trip — 2026-08 (first trip under ADR-0001)

**Status: PROPOSED verdicts, awaiting ratification.** Nothing here is adopted yet.
Revised 2026-08-21 after review with Paolo (tool stance amended, spec-driven prose
reclassified, translation-layer direction recorded, publishing rows closed).

- **Window:** fork point `65a7233f` (2026-07-03) → upstream/main `1ebddd17` (2026-08-19),
  **183 non-merge commits**. Upstream `main` only (in-flight branches deliberately skipped;
  candidates for a later trip: `TabishB/web-dashboard-WITH-openspec`, change-stacking work).
- **Method (ADR-0001):** shopping trip, not merge. Anything ADOPTED is **re-implemented** as
  a deep-planning change in our tree; we never pull diffs. PR numbers below are *references
  to read at adoption time*, not cherry-pick targets.
- **Provenance:** verdicts proposed from commit messages plus read diffs: #1303, #1276,
  #1300, #1062, #1685 (+ upstream `docs/multi-language.md`), upstream `src/core/config.ts`,
  and the `schemas/spec-driven` prose diffs #1401/#1366/#1326/#1660. Re-verify the exact
  diff before implementing any row.

## Fork-side facts that frame every verdict

1. **We are skills-only — and skills are the superset.** `src/core/command-generation/`
   does not exist in our tree. In the harnesses we target, skills have superseded commands
   (and Pi's prompts): everything commands had — including argument expansion — is now
   fully supported in skills in both Pi and Claude Code. Upstream keeps the command+skill
   duality for its long tail of harnesses; for us, every upstream slash-command/adapter
   commit is structurally N/A.
2. **Skills-only still needs a translation layer (direction recorded 2026-08-21, not yet
   built).** Canonical "full-power" skills are the source of truth; an install-time
   translation step adapts them for less-capable harnesses (the `.agents` render) or
   different conventions, and will later do the same for **specialized agents** (planned,
   not yet introduced). Idea reference (NOT an implementation to copy):
   `~/Developer/ai/PRPs-agentic-eng/scripts/sync_plugin.py` — what we take is the
   *pattern*: one canonical source, per-target generated renders with harness-isms
   rewritten (`$ARGUMENTS` → an "Arguments" note, Task-tool subagent dispatch → explicit
   delegation prose), stale-prune of anything the source didn't generate, and a
   `--check` drift mode. What we do NOT take is their layout or machinery: our canonical
   sources stay in `schemas/skills/<name>/` (they do not move under `.claude/`), and the
   adaptation step lives inside our existing generation pipeline
   (`skill-bundle.ts` / `skill-generation.ts`), not in a sidecar script.
   (Nugget from that script worth remembering: Codex does *not* read `~/.agents/skills`
   at user level — discovery is `$CODEX_HOME/skills`; repo-level `.agents` is a separate
   question. Verify per harness, don't assume.)
3. **We rewrote the skill bodies AND forked the schema.** deep-planning derives from
   spec-driven, so upstream fixes to their skill *and* schema-template prose cannot land
   as code — but the content is shoppable. See section C.
4. **Evicted areas stay evicted:** telemetry, feedback, profiles, spec-driven *as code*.
5. **Tool stance (session decision 2026-08-21, amended):** first-class targets are
   (a) the generic shared `.agents` dir, (b) Claude Code, (c) **Pi** (primary harness,
   the `../pi` fork, which supports the same skills features as Claude Code → adapter =
   claude logic with `.pi` target dir), and (d) **Cursor** — served by the `.agents`
   render by default, with a dedicated adapter only if a concrete opportunity justifies
   special treatment. Everything else on the AI_TOOLS list is an eviction candidate for
   the cleanup track, not an adoption target.

## Answers to the two scouting questions

**"What did upstream add for Cursor that can't live in `.agents`?" — Nothing.** In the
whole window Cursor gained only `requiresIdeRestart: true` metadata (drives the "restart
your IDE" hint, #1610/#1656). Upstream still emits Cursor's skills to `.cursor/`; only
**Codex** (#1511, then skills-only #1283) and **Zed** (#1659) moved onto
`skillsDir: '.agents'`, with the vendor-neutral `agents` target made selectable (#1303).

**Open investigation (ours, not upstream's): the Cursor duplicate-read tension.** Cursor
natively reads `.agents/` AND `.claude/` alongside its own `.cursor/`. A project that
installs skills for both Cursor and another `.agents`-reading (or Claude) harness would
hand Cursor two or three copies of every skill. The install matrix must resolve this —
plausibly: Cursor consumes the `.agents` render and gets **no** `.cursor` emit unless a
dedicated adapter earns its place. Settle this inside the #1303 adoption (B).

**"Does upstream have Pi support to extend?" — Only the same minimal entry we already
have.** `pi` (`skillsDir: '.pi'`) predates the fork point in both trees. Upstream added no
Pi-specific features (their `.pi/prompts/` command emit is command-generation, which we
evicted). Amusingly they also added "Oh My Pi" (`.omp`, #1276) — unrelated to our Pi.
The planned claude-parity Pi adapter (extended skills features, argument substitution)
has **no upstream counterpart; it's ours to design and build.**

## Verdict legend

- **ADOPT** — re-implement (grouped into our own changes).
- **DISCUSS** — needs a decision with Paolo before adopting or discarding.
- **IDEA** — no code port; harvest the lesson into our skills/schemas when we touch them.
- **MECH** — mechanical hygiene (deps, security); do our own equivalent, don't port pins.
- **N/A** — evicted subsystem, rewritten surface, or out-of-scope tool.
- **IGNORE** — applicable but not wanted (reason recorded).

## A. Engine correctness in subsystems we KEEP — the payload of this trip

These target code we share (archive/sync engine, validate, parsers, stores/schema
resolution, completions). Most fix real data-loss or false-positive bugs. Proposed
packaging: **two adoption changes** — `adopt-upstream-archive-sync-fixes` and
`adopt-upstream-validate-parser-fixes` — auditing each row against our code (some may
already be fixed or not reproduce in our tree).

### A1. Archive / spec-sync — LANDED 2026-08-23 via `adopt-upstream-archive-sync-fixes`

All rows re-implemented from the module end-state (no upstream code copied, per ADR-0001).
Per-row outcomes follow the change's design.md "Upstream row ledger".

| PR | What | Outcome (2026-08-23, `adopt-upstream-archive-sync-fixes`) |
| --- | --- | --- |
| #1699 | Never dead-end a capability retirement | Landed (retirement hint ladder) |
| #1484 | Let a change retire a capability it empties | Landed (validator-decided retirement + `retire_capabilities` marker) |
| #1475 + #1391/#1252 | Scenario-drift check: fence-aware + multiplicity-aware | Superseded by end-state — intermediate states folded into the consolidated `findMissingCurrentScenarios` comparison |
| #1482 | Report scenarios a MODIFIED requirement would drop | Landed (shared by archive + validate) |
| #1490 | Warn before archiving deletes a note next to a requirement | Landed (`firstForeignTail` warning) |
| #1431 | Keep the delta spec's Purpose in a new main spec | Landed (incl. masking guards) |
| #1386 / #19d41714 (#1437) | Already-synced RENAMED / early-synced REMOVED deltas = no-ops | Landed (idempotent merge end-state, near-miss guards) |
| #1376 | Stop failing on specs already synced before archiving | Landed (warned no-op) |
| #1316 / #1388 | Don't stack a second date prefix on archive names | Landed (CLI guard + skill prose twin) |
| #1637 | Preserve blank lines around `## Requirements` when syncing | Landed (canonical rebuild form) |
| #1528 | Canonicalize rebuilt spec EOF | Landed (same rebuild form) |
| #1311 | Correct `archive` exit code on validation failure | Landed (exit 1 at every abort) |
| #1483 | Tell the caller which flag to pass in non-interactive archive | Landed (`ArchiveBlockedError` rerun hints) |
| #1603 | No ANSI escapes to a redirected (non-TTY) stdout | Landed (`confirmPrompt` plain path + picker TTY guard) |
| #1355 / #1508 | Discover/preserve nested spec paths recursively (parse, apply, archive) | Landed (`discoverSpecFiles`, wired through archive/list/view/spec) |

**Deferred, NOT closed** (see the change's design.md Non-Goals; revisit as their own rows,
e.g. a future `adopt-upstream-archive-hardening`):

- Concurrency hardening from upstream's end-state: content fingerprinting, archive claim locks,
  spec snapshots with rollback, verified copy-then-remove `moveDirectory`, displaced-file
  (`deferDelete`) retirement protocol.
- #1499 path-confinement machinery (`resolveTrustedSpecPath`, trust roots, `assertPathWithin`);
  `discoverSpecFiles` landed minimal, without trust-root checks.

**Post-A1 follow-ups** (repo-local debt surfaced by the A1 code review, 2026-08-24 — not
upstream rows; small, fold into whichever change next touches the file):

- Unify `Validator.findDeltaSpecFiles()` onto `discoverSpecFiles` (`src/core/validation/validator.ts`).
  The private walk swallows read errors — the #1353 silent-drop class A1 eliminated elsewhere — and
  any future divergence (dot entries, symlink rules) would make validate and archive disagree about
  which delta specs exist. Highest-value item here.
- Unify `spec-structure.ts`'s private fence parser onto `buildCodeFenceMask`
  (`src/core/parsers/code-fence.ts`). Both are correct today; fence-awareness is now load-bearing,
  so a one-sided fence-rule change would split the merge's and the validator's notion of "fenced".
- Route the two pre-existing unquoted hint sites through `quoteChangeName`
  (`src/core/archive.ts` — the `openspec validate ${changeName}` / `${specName}` suggestions), the
  same paste-target class the A1 quoting policy covers.

**Execution method** (worked well; reuse for the A2/A3/A4 sweeps): group the section's rows by
module, diff the upstream module end-state for reference only (never copied), re-implement the
end-state behaviors in our idiom test-first, then walk the per-row checklist to confirm each is
covered or explicitly superseded/deferred.

### A2. Validate / parser / change resolution (ADOPT, audit each)

| PR | What |
| --- | --- |
| #1521 | Count every level-4 header as a scenario in the loss guard |
| #1604 | `validate --archived` lints task completion of archived changes |
| #1523 | Warn on ambiguous task numbering |
| #1486 | Count indented sub-tasks in task progress |
| #1502 | Allow non-English requirements (prerequisite for any Italian-artifacts story — see #1685 in B) |
| #1435 | Allow numeric-prefixed change names |
| #1392 | Reject a delta spec at the change's `specs/` root |
| #1399 | Accept zero-delta changes that declare `skip_specs` |
| #1411 | Stop delta section dividers becoming phantom requirements |
| #1151 | Ignore fenced code blocks when parsing delta specs |
| #1281 | Unify requirement reader (refactor; enables several fixes above) |
| #1433 / #1375 | Resolve changes by directory / let `--change` find on-disk names |
| #1612 | Reject missing roots for list and validate |

### A3. Stores / schema resolution (ADOPT, audit each — we kept this surface intact)

| PR | What |
| --- | --- |
| #1703 | Resolve main-spec reads against the store-aware root |
| #1616 | Honor canonical root selection |
| #1360 | Store-aware root for main specs in sync/archive (template-side twin of #1703) |
| #1607 | Preserve YAML formatting when forking a schema |
| #1299 | Resolve symlinked schema directories |
| #1363 | One default store per machine |
| #1328 | Fix empty store registration |
| #1287 | Doctor notes when a store checkout is behind its upstream ref |
| #1455 | Resolve store pointer for `view` |

### A4. Completions / CLI polish (ADOPT, small)

| PR | What |
| --- | --- |
| #1364 | Install the right completions for fish |
| #1374 | Stop emitting broken PowerShell switch blocks |
| #1704 | Print the completions tip from the CLI, not a postinstall script |
| #1361 | Use local dates for CLI date-only values |
| #1463 / #1667 | Checkbox markers in multi-select / @inquirer/prompts v8 migration |
| #1426 | Invoke the CLI without a shell in tests (test hygiene) |

## B. Features needing a decision (DISCUSS unless marked)

| PR | What | Verdict + notes |
| --- | --- | --- |
| #1303 (+#1511, #1283, #1659) | **Shared `.agents` skills target**; Codex + Zed moved onto it | **ADOPT (shape to be designed)** — it *is* our ratified tool stance, but through the translation-layer lens: `.agents` is not a byte-copy of the canonical skill, it's the **lowest-common-denominator render** (no `$ARGUMENTS`, no harness-specific tool references). Upstream's `legacySkillsDirs` + `detectionPaths` migration pattern (Codex `.codex`→`.agents`) is reusable. Must also settle the Cursor duplicate-read tension (scouting section) and the AI_TOOLS prune (Track C). |
| #1300 | Auto-approve the openspec CLI in generated skills (`allowed-tools` frontmatter via `src/core/shared/allowed-tools.ts`) | DISCUSS — small, real UX win for Claude Code; check whether the Pi fork honors the same frontmatter — if yes, one seam serves both. |
| #1062 | Runtime context + operation guidance injected into workflow instructions (project-config `context`) | DISCUSS — big (2.4k lines). Our fork already injects config `context` into artifact instructions (`src/core/project-config.ts`); what #1062 adds beyond that (operation guidance, runtime context blocks) needs a proper read. |
| #1470 | `openspec update` offers to upgrade a stale CLI | Probably IGNORE — we're the only user of `@pfurini/openspec`. |
| #1610 / #1656 | `requiresIdeRestart` tool metadata + targeted restart hints | **ADOPT (small)** — Cursor stays a first-class target; fold into the #1303/tool-list change. |
| #1685 | `openspec init --language` | **Investigated — mostly already ours.** Not per-artifact machinery: the flag just writes a `Language: X` block into `config.yaml`'s `context:` field, which our fork already injects into **every artifact instruction**; document structure and SHALL/MUST keywords stay English (validation depends on them), and #1502 (A2) makes non-English prose validate. "Artifacts" = all agent-authored prose: proposal, specs, design, tasks. For the Italy market: Italian artifacts are achievable **today** by hand-editing `context:`; an EN-canonical + IT-render dual-language story would be our own build (fits the translation layer). No code worth adopting except maybe the convenience flag; revisit alongside the Italian-clients discussion. |
| #1415 / #1425 | Security policy, dependabot config, config prototype-key guards | **ADOPT the config key guards** (they touch `global-config`/`config-schema`, which we KEEP) **and dependabot** (standard practice in our projects). SECURITY.md policy file: optional, low value for a soon-private repo. |
| #1327 / #1341 | Beta prerelease workflow + release skill | **IGNORE** — no publishing planned; repo going private. |
| #1357 | Publish workflow skills to skills.sh | **IGNORE** — same reason. |

## B2. Translation layer — verified facts + remaining decisions (updated 2026-08-22)

The #1303 cluster, the AI_TOOLS prune, the Pi adapter, and #1300 all depend on this.
Verification done 2026-08-22 against: the Agent Skills spec (agentskills.io), the Pi
fork docs (`../pi/docs/skills.md`, `../pi/docs/skills-capability-matrix.md` @ commit
`1e5666870`), Cursor's skills docs, and Paolo's direct answers.

### Who reads what (project-level skill roots) — VERIFIED

| Harness | Roots read | Notes |
| --- | --- | --- |
| Pi | `.pi/skills/`, `.agents/skills/` | Never `.claude/` (Pi ADR-0002). `.agents` skills get the FULL Pi feature set — Pi does not degrade them. |
| Claude Code | `.claude/skills/` only | Confirmed by Paolo: does NOT read `.agents`. The only overlap-free root. |
| Cursor | `.cursor/skills/`, `.agents/skills/` — **verified by experiment 2026-08-22** | Docs also claim `.claude`/`.codex` compatibility reads, but the fixture controls FAILED for both — not read in practice (Cursor version unrecorded; re-check on updates). Dedupes by name across roots; **`.agents` beats `.cursor`**. |
| Generic (Zed, Codex, Amp, …) | `.agents/skills/` | The Agent Skills LCD. |

### Capability tiers — VERIFIED

- **Pi (canonical — ratified, see decisions):** byte-exact CC argument grammar
  (`$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, declared `arguments` names), `@path` refs,
  shell injection, enforced `disallowed-tools` (unioned across stacked skills),
  `model`/`effort`, `context: fork` + `agent` + `background`, **skill-bundled agents**
  (`<skill>/agents/*.md`, Pi ADR-0008, qualified `skill:agent` naming), `paths` listing
  boost, `when_to_use`, live watch, nested discovery. `allowed-tools` and `hooks` are
  **parsed but inert** (kept for round-tripping — so #1300's field is harmless to emit).
  `CLAUDE_*` interop vars accepted as aliases of `PI_*`.
- **Claude Code:** ≈ Pi's surface minus Pi extras; `allowed-tools` ENFORCED, `hooks`
  live, `paths` = auto-activation (not just boost). **Bundled agents: plain
  `.claude/skills/<skill>/agents/` does NOT register — a plugin is required (Paolo,
  2026-08-22).** Resolved at the render level instead — see the rewrite catalog below.
  (General caveat: the Pi matrix's CC column is a 2.1.220 snapshot from 2026-08-02,
  not re-verified.)
- **Cursor:** SKILL.md with `name` (must match folder), `description`, `paths`,
  `disable-model-invocation`, `icon`/`color` (Custom Mode badge), `metadata`. **No
  argument substitution documented**, no `when_to_use`/`model`/`effort`/fork. Manual
  `/skill` attaches to ONE message (Custom Mode for session-long). Cursor has custom
  subagents as a separate feature → natural degradation target for Pi bundled agents.
- **LCD (Agent Skills spec):** `name`, `description`, `license`, `compatibility`,
  `metadata`, `allowed-tools` (experimental) + `scripts/`/`references/`/`assets/`,
  progressive disclosure, relative file refs. No arguments, no `paths`, no
  `when_to_use`, no fork/agents.

### Settled (2026-08-22, Paolo)

- **Canonical dialect = Pi** — the most capable harness; we use its full surface,
  including skill-bundled agents, which degrade to agent prompts in harnesses with
  subagent support (Claude Code, Cursor).
- **The `flatten` export dies** — unused; add to the Track C eviction list.
- **Emit shape (near-final after the experiment):** every first-class harness has a
  private root — `.pi` (Pi), `.claude` (CC), `.cursor` (Cursor, which does not actually
  read `.claude`) — and `.agents` is emitted ONLY when a generic tool is targeted.
  `.agents` is the only overlap-maker: Pi and Cursor both read it, and in Cursor it
  SHADOWS `.cursor` on a name clash.
- **Capability modeling = per-target adapter modules (ratified 2026-08-22).** One
  adapter per target implementing a small render interface (`renderFrontmatter`,
  `renderBody`, `renderAgents`, `targetDir`); Pi = identity. Two disciplines attached:
  (1) adapters compose a **shared transform library** (strip-placeholders,
  fold-when-to-use, project-frontmatter-by-allowlist, expand-spawn-macro), never
  open-coded copies; (2) adapters **never parse free prose** — where dialects diverge
  in the body (above all subagent spawning), the canonical skill declares it with an
  explicit macro/seam (in the spirit of `${…}` and `<!--bundle:…-->`), and each
  adapter expands it into its harness's vocabulary. Consequences: `AI_TOOLS` keeps
  only location/detection data (`skillsDir`, `detectionPaths`, `requiresIdeRestart`,
  `legacySkillsDirs`) — capability knowledge lives in adapters; render order = load
  canonical bundle → interpolate seams → adapter render → write.

### Emit matrix — experiment DONE, overlap problem mostly dissolved (2026-08-22)

The fixture experiment (`~/tmp/cursor-skill-dedupe-fixture`, results in its README)
answered the flagged unknown:

- Cursor **dedupes by name** across roots: one Skills-UI entry and one autocomplete
  entry per skill name (byte-identical copies too; the "2 entries" for `/dupe` were
  the two distinct fixture skills).
- Precedence: **`.agents` > `.cursor`** — the `.agents` copy won both the UI listing
  and the `/dupe-probe` invocation. A dedicated `.cursor` render is silently shadowed
  by any same-name `.agents` emit.
- **`.claude` and `.codex` were NOT read** despite the docs' compatibility claim
  (controls failed). Version-dependent risk: unrecorded Cursor version — re-verify
  after Cursor updates before relying on it long-term.

Resulting clean per-harness solution: Pi → `.pi`, CC → `.claude`, Cursor → `.cursor`,
generic tools → `.agents`; emit `.agents` only when a generic tool is selected. The
CC+Cursor overlap is GONE (Cursor doesn't read `.claude` in practice). Remaining
wrinkle, for the #1303 design: when a generic tool is selected alongside Pi or Cursor,
`.agents` double-covers them — Cursor resolves it itself (`.agents` wins, shadowing
`.cursor`), Pi surfaces qualified duplicates — so either skip the private-root emit for
those harnesses in that combination, or accept the shadowing. Still open: user-level
roots (out of scope this round).

### Still open (implementation-time details — no design conversations left)

1. **Rewrite catalog per adapter** — mechanism settled (shared transforms +
   spawn-macro expansion); what remains is enumerating each adapter's transform list
   and macro expansions. **Bundled-agent strategy settled (2026-08-22):** the
   `agents/` directory ships VERBATIM in every render (inert where a harness ignores
   it); the spawn macro expands per dialect — Pi native `context: fork`/`agent:`, CC
   Task-tool prose, Cursor subagent prose, LCD neutral delegate-or-inline prose —
   using the bundled agent file as the prompt with each harness's model/parameter
   form. Plus: Pi→Cursor strips substitution placeholders and folds `when_to_use`
   into description; Pi→LCD projects to spec-only frontmatter.
2. **Ownership/prune namespace rule** in target dirs (only `openspec-*` is ours).
3. **Parity-wall extension** for multiplied per-target renders (per-adapter golden
   files fit naturally).
4. **Artifact-kind seam** (skill | agent) reserved in pipeline types; build nothing.
5. **Sequencing:** enumerate the adapter transform lists → ONE change: AI_TOOLS prune
   + emit matrix + `legacySkillsDirs`/`detectionPaths`/`requiresIdeRestart` + adapters
   → then #1300. Do NOT ship `.agents` as a near-copy before the adapters exist.
6. Out of scope this round: user-level installs, the Italian dual-render idea,
   anything publishing-related.

## C. Prose-lesson sweep (IDEA — no code port; skills AND schema)

Upstream's code here is N/A (we rewrote the skills and forked the schema), but the
*content* is shoppable. Proposed packaging: **one audit pass** over `schemas/skills/`
**and** `schemas/deep-planning/` with C1+C2 as the rubric ("do ours have this failure
mode / this guidance?"), producing at most one small change.

### C1. Skill-prose lessons (from their workflow templates)

- #1403 Claude-only TodoWrite → generic todo instruction; #1464 AskUserQuestion → neutral
  ask-the-user (we have Pi + Claude; check our skills for Claude-only tool references —
  note the tension with the translation layer: the *canonical* skill may stay
  Claude/Pi-powered and the neutralization happen in the `.agents` render instead).
- #1368 re-read dependency artifacts from disk before creating the next one.
- #1394 don't archive before spec sync finishes; #1398 stop bulk archive on Cancel.
- #1468 auto-select the only active change instead of prompting.
- #1501 / #1504 / #1412 propose: wait for explicit implementation request, honor the
  requested schema, don't skip the specs artifact.
- #1503 explore: scaffold changes before capturing artifacts; #1408 give explore the
  project's context and rules.
- #1530 surface deferred scope instead of silently simplifying tasks.
- #1405 make the schema instruction field authoritative for artifact creation.
- #1402 show the main spec format in the sync-specs skill.

### C2. Schema-instruction lessons (deep-planning derives from spec-driven — read diffs, port what applies)

Diffs read 2026-08-21; each is a real behavioral guard. Audit against deep-planning —
some may already be covered by our falsifiability gate / Constraints section / wave-plan
TDD rules:

- **#1401 design.md must not restate the proposal.** Context = only current state +
  constraints that shape the approach; "the proposal covers why and what; design covers
  how — if a section would only restate, point instead". Also: decisions "with rationale
  *and alternatives considered*".
- **#1366 Open Questions = deferrable-only.** An open question is legitimate only if
  answering it later changes nothing in specs, approach, or task breakdown; anything
  blocking must be resolved with the user *now* ("ask instead of guessing"), and tasks
  must check design.md's open questions before baking in unstated assumptions.
- **#1326 "A spec is a behavior contract, not an implementation plan."** Good: observable
  behavior, inputs/outputs/errors, external constraints, testable scenarios. Avoid:
  internal names, library choices, implementation steps. Quick test: "if the
  implementation can change without changing externally visible behavior, it doesn't
  belong in the spec."
- **#1660 every task states its verification** in its own checkbox (test, command,
  observable behavior, or artifact); separate verification tasks only for cross-task
  integration checks. Likely partly covered by our wave-plan red-green cycles — verify.

## D. Mechanical hygiene (MECH — do our own, don't port)

Dependency and security work: advisory patches (js-yaml, nanoid #1635; fast-uri, postcss,
brace-expansion #1510/#1461; esbuild scripts #1196), `mkdtemp` for test temp dirs (#1432),
inquirer v8 (#1667, also listed in A4), Node 22 for nix (#1406) *if* nix survives Track C.
**Action: run our own `pnpm audit` + dependency refresh as one chore change**, using these
PRs only as a heads-up list. Dependabot config adoption is in B (#1415).

## E. Not applicable (N/A) — recorded so we never re-litigate

- **Telemetry** (#1666, #1668, #1609, #1513, #1476), **feedback** (#1653, #1396, #1652),
  **profiles** (#1663, #1632, #1410, #1351, #1354, #1377, #1442): evicted subsystems.
- **Command generation / slash-command adapters** (Oh My Pi #1276, Trae #1090, Qwen
  #1191, Command Code adapter #1622, OpenCode args #1664/#15e50d68, #1471, #1447, #1492):
  we are skills-only, and skills now carry every command capability we need.
- **New/renamed tools outside our stance** (Rovo #1516, MiniMax #1214, CodeArts #1266,
  ZCode #1209, Hermes #1292, Kimi Code #1208, Devin Desktop #1167, Copilot coding-agent
  files #1274/#1517, Zoo Code #1428): fail the tool-stance filter. (Zed #1659 is N/A as a
  tool but is *evidence* for the `.agents` adoption in B.)
- **Website / docs site** (Cloudflare Pages #1342, website deps, homepage fixes): they
  built a marketing site; our Track C goes the opposite direction.
- **spec-driven schema fixes *as code***: schema evicted — but the prose lessons are
  reclassified into C2, since deep-planning derives from spec-driven.
- **#1416 parity-hash regeneration helper**: convergent with our existing
  `pnpm run rebaseline:skills`; nothing to take.

## Recommended adoption order (if ratified)

1. **`.agents` shared target + tool-list decision** (B, #1303 cluster) — interlocks with
   the Track C adapter prune, the Cursor duplicate-read tension, the Pi-adapter design,
   and the translation-layer direction (fact 2), so design it first, as one conversation.
2. **Archive/sync fixes** (A1) — data-loss class bugs, highest payoff.
3. **Validate/parser fixes** (A2) and **stores/root fixes** (A3) — one change each, or a
   single "upstream correctness sweep".
4. **Completions/CLI polish + config key guards + dependabot + MECH deps pass**
   (A4 + B#1415 + D) — one chore change.
5. **Prose-lesson audit** (C1 + C2, skills and schema together) — cheap, feeds the skills
   work we'll do anyway.
6. Remaining B rows resolved during the Track B/C discussions.

## Bookkeeping

- After ratification: record adopted rows as deep-planning changes; update
  `make-this-fork-mine.md` (adoption is the flip side of the eviction ledger) and strike
  N/A rows permanently.
- Next trip: check upstream's change-stacking / web-dashboard branches once they land on
  their main.
