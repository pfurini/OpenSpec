# Handoff — opsx wave-harness TAIL RESTRUCTURE (next build session)

Paste the block below into a fresh session. It's the next recommended step (README "Open stack"
#1): close the last v1 done-condition bar (zero undocumented deviations) + fix the change-gate
turn-cap. Full rationale is durable in `task-machinery-and-wave-execution.md` §14, §15, §16.4 —
this prompt orients + lists the work; the session reads those for detail.

---

```
Build the opsx wave-harness TAIL RESTRUCTURE. Goal: close the last v1 done-condition bar
(zero undocumented deviations) + fix the change-gate turn-cap. The harness already runs
end-to-end (reached PR #114, all 5 waves green, 0 human turns) — this is the one open bar.

REPOS: OpenSpec /Users/paolof/Developer/ai/OpenSpec (branch feat/explore-what-brainstorming);
harness lives in lexup /Users/paolof/Developer/Projects/lexup/lexup-new. Today is 2026-06-14.

READ FIRST (durable design record — do not re-derive):
- task-machinery-and-wave-execution.md §16.4 (the punch list), §14 (change-gate bug),
  §15 (tail fixes — esp. §15.3 DECIDED→(b)), §13 (grain/tier context). README "Open stack" #1.

EDIT THE GENERATOR, NOT THE YAML: lexup .archon/workflows/opsx-wave-harness.gen.mjs is the
source; regenerate with `node opsx-wave-harness.gen.mjs` (+ `--mode stub --k 5 --stub-waves 3`).
Validate: `archon validate workflows opsx-wave-harness`. (The harness will later be canonicalized
into OpenSpec — decision 16 — but NOT in this session; just fix the lexup generator.)

PUNCH LIST (one coherent restructure, in order):
1. change-gate: move the gate RUN out of the agent turn. until_bash (or a preceding bash step)
   runs `pnpm check-types && pnpm test && pnpm coverage:gate && pnpm test:e2e` and writes failures
   to $ARTIFACTS_DIR/gate-failures.txt; the loop prompt FIXES ONLY (reads that file, never runs the
   full suite). First iteration: gate runs once before the agent has anything to fix. NOTE: the
   loop exposes no until_bash-output var (only $LOOP_PREV_OUTPUT/$LOOP_USER_INPUT) → pass failures
   via the file. (§14)
2. Fork the review + self-fix commands off `gh pr` → base diff (`git diff $BASE_BRANCH...HEAD`),
   drop their inline `gh pr comment` posting (they write findings to $ARTIFACTS_DIR/review/*.md
   only). Simplify already uses base diff. (§15.3)
3. Reorder the tail to: waves → simplify → review-scope → review-classify → reviewers → synthesize
   → self-fix → change-gate → create-pr → post-review-comments → report. (simplify FIRST among
   mutators §15.4; create-pr LAST so the gate verifies the shipped code; one gate, no re-gate.)
4. change-gate + self-fix + simplify each append a progress.md entry (what changed + why) on every
   mutation — same documented-deviation discipline the impl loop uses (§15.1). And change-gate
   FIXES only failures caused by this change; pre-existing/out-of-scope reds → flag + report in
   progress.md, don't silently fix (§15.2).
5. Add the post-review-comments node (after create-pr): batch-posts the saved review/self-fix
   artifacts (consolidated-review.md, fix-report.md) to the PR via gh pr comment.

GOTCHAS:
- Config is loaded from the WORKTREE cwd (executor.ts:383); `--resume` matches the run's
  working_path exactly (resume from the worktree dir, or via run-id).
- Reviewers gate on their own review-classify vote; security_critical forces ON only
  error-handling + test-coverage. impl=medium, plan=large.
- turnTimeoutMs is back to 900000 (15 min) — the restructure REMOVES the need for the 30-min
  band-aid: once the gate runs in bash and the agent only fixes, agent turns are short.

VERIFY: archon validate workflows clean; run the stub to confirm wiring; then the USER runs the
real slice (`archon workflow run opsx-wave-harness --branch <new> "account-profile-self-service"`,
from a clean worktree) — expect all four done-condition bars green (incl. zero undocumented
deviations in the report).

CONVENTIONS: commit + push each milestone (lexup dev; OpenSpec branch for any note/schema edits).
Don't run the real harness yourself (claude-terminal TUI under Claude Code → nested-session stalls);
hand the run command to the user.
```
