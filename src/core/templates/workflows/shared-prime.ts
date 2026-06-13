/**
 * Shared "prime" ritual for the thinking commands (explore + design).
 *
 * Generalized from the piv-prime skill: a ritual, NOT a fact store. It refreshes
 * live state and routes to the canonical, never-stale sources (project context,
 * ADRs, glossary, thinking notes, real code) — it deliberately carries no copy of
 * the architecture, because a copy drifts and silently misleads. explore primes to
 * ground the WHAT; design primes to ground the HOW. The ritual is identical; only
 * the use differs, so it lives in one place and both commands embed it.
 *
 * Emitted without a heading so each host supplies its own (a `### ` subsection in
 * explore's "OpenSpec Awareness", step `0` in design's flow).
 */
export const PRIME_RITUAL = `A ritual, not a fact store (after piv-prime): refresh live state, route to the canonical never-stale sources, copy no facts down. Run it once at the start; don't re-prime mid-session unless something material changed. Scale it to the question — a narrow ask needs only a slice of this, not the whole checklist.

**1 · Refresh live state**
- \`openspec list --json\` — active changes, their schemas and status.
- \`openspec list --explorations --json\` — any pending exploration note (one not yet linked to a change) worth picking up.
- If a change is in play: \`openspec status --change "<name>" --json\` → \`changeRoot\`, \`artifactPaths\`, \`actionContext\`, and which artifacts exist / are \`done\`.

**2 · Route to the canonical sources — read them, never re-derive**
- **Project context** — the repo's agent guide (\`AGENTS.md\` / \`CLAUDE.md\`) + the OpenSpec project config → stack, conventions, hard constraints.
- **Architectural memory** — accepted **ADRs** are *standing constraints you must respect*; the **glossary** is the *canonical vocabulary* (use its terms, don't coin synonyms). *Find them where the project already keeps them:* ADRs commonly live in \`docs/adr/\`, the glossary in a root \`GLOSSARY.md\`. **ADR registry — check freshness first, then read it as your index:** if the project has an ADR directory, run \`openspec adr index --check\`; if it reports drift, run \`openspec adr index\` to refresh; then read the registry (\`<adr-dir>/README.md\` — id · status · title · superseded-by) as the canonical list of what already exists. The registry is your dedup surface — don't eyeball raw ADR files to discover what's already decided.
- **Thinking records** — the exploration note (\`openspec/explorations/<name>.md\`) for the settled WHAT and its parked design seeds; the design note (\`<changeRoot>/design-notes.md\`) if you're resuming the HOW.
- **The code** — existing patterns at \`path:line\`. Use the repo's code graph if one is available; otherwise read the real code. Cite reality; don't reinvent it.

**3 · Orient — tight, no filler:** branch / change, what's settled vs still open, the constraints (ADRs) and vocabulary (glossary) in play, and what this session is set up to decide. Then begin.

If any source — a doc, a memory, an ADR — disagrees with what \`git\` or the code actually shows, trust the live observation and flag the stale source.`;
