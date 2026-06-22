# Workflow Skills

This is the reference for OpenSpec's workflow skills. Each skill is invoked through your AI coding assistant's skill mechanism (e.g., Claude Code, Cursor, Windsurf); the invocation tokens below (`/openspec-propose`, etc.) name the skill your agent loads.

For workflow patterns and when to use each skill, see [Workflows](workflows.md). For CLI commands, see [CLI](cli.md).

## Quick Reference

### Default Quick Path (`core` profile)

| Skill | Purpose |
|---------|---------|
| `/openspec-propose` | Create a change and generate planning artifacts in one step |
| `/openspec-explore` | Think through ideas before committing to a change |
| `/openspec-apply-change` | Implement tasks from the change |
| `/openspec-sync-specs` | Merge delta specs into main specs |
| `/openspec-archive-change` | Archive a completed change |

### Expanded Workflow Skills (custom workflow selection)

| Skill | Purpose |
|---------|---------|
| `/openspec-new-change` | Start a new change scaffold |
| `/openspec-continue-change` | Create the next artifact based on dependencies |
| `/openspec-ff-change` | Fast-forward: create all planning artifacts at once |
| `/openspec-verify-change` | Validate implementation matches artifacts |
| `/openspec-bulk-archive-change` | Archive multiple changes at once |
| `/openspec-onboard` | Guided tutorial through the complete workflow |
| `/openspec-reverse` | Draft a spec baseline from an existing (brownfield) codebase |

The default global profile is `core`. To enable the expanded workflow skills, run `openspec config profile`, select workflows, then run `openspec update` in your project.

---

## Skill Reference

### `/openspec-propose`

Create a new change and generate planning artifacts in one step. This is the default start skill in the `core` profile.

**Syntax:**
```text
/openspec-propose [change-name-or-description]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name-or-description` | No | Kebab-case name or plain-language change description |

**What it does:**
- Creates `openspec/changes/<change-name>/`
- Generates artifacts needed before implementation (for `spec-driven`: proposal, specs, design, tasks)
- Stops when the change is ready for `/openspec-apply-change`

**Example:**
```text
You: /openspec-propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md
     ✓ specs/ui/spec.md
     ✓ design.md
     ✓ tasks.md
     Ready for implementation. Run /openspec-apply-change.
```

**Tips:**
- Use this for the fastest end-to-end path
- If you want step-by-step artifact control, enable expanded workflows and use `/openspec-new-change` + `/openspec-continue-change`

---

### `/openspec-explore`

Think through ideas, investigate problems, and clarify requirements before committing to a change.

**Syntax:**
```
/openspec-explore [topic]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `topic` | No | What you want to explore or investigate |

**What it does:**
- Opens an exploratory conversation with no structure required
- Investigates the codebase to answer questions
- Compares options and approaches
- Creates visual diagrams to clarify thinking
- Can transition to `/openspec-propose` (default) or `/openspec-new-change` (expanded workflow) when insights crystallize

**Example:**
```text
You: /openspec-explore

AI:  What would you like to explore?

You: How should we handle authentication for the mobile app?

AI:  Let me investigate your current auth setup...
     [Analyzes codebase]

     I see you're using session-based auth for the web app.
     For mobile, we have three main options:

     1. JWT tokens (stateless, works offline)
     2. OAuth2 (if you need third-party login)
     3. Extend current sessions (simpler, but requires connectivity)

     Your API already has CORS configured. Which direction interests you?

You: Let's go with JWT. Can we start a change for that?

AI:  Ready when you are. Run /openspec-propose add-jwt-auth to begin.
```

**Tips:**
- Use when requirements are unclear or you need to investigate
- No artifacts are created during exploration
- Good for comparing multiple approaches before deciding
- Can read files and search the codebase

---

### `/openspec-new-change`

Start a new change scaffold. Creates the change folder and waits for you to generate artifacts with `/openspec-continue-change` or `/openspec-ff-change`.

This skill is part of the expanded workflow set (not included in the default `core` profile).

**Syntax:**
```
/openspec-new-change [change-name] [--schema <schema-name>]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Name for the change folder (prompted if not provided) |
| `--schema` | No | Workflow schema to use (default: from config or `spec-driven`) |

**What it does:**
- Creates `openspec/changes/<change-name>/` directory
- Creates `.openspec.yaml` metadata file in the change folder
- Shows the first artifact template ready for creation
- Prompts for change name and schema if not provided

**What it creates:**
```
openspec/changes/<change-name>/
└── .openspec.yaml    # Change metadata (schema, created date)
```

**Example:**
```
You: /openspec-new-change add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     Schema: spec-driven

     Ready to create: proposal
     Use /openspec-continue-change to create it, or /openspec-ff-change to create all artifacts.
```

**Tips:**
- Use descriptive names: `add-feature`, `fix-bug`, `refactor-module`
- Avoid generic names like `update`, `changes`, `wip`
- Schema can also be set in project config (`openspec/config.yaml`)

---

### `/openspec-continue-change`

Create the next artifact in the dependency chain. Creates one artifact at a time for incremental progress.

**Syntax:**
```
/openspec-continue-change [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to continue (inferred from context if not provided) |

**What it does:**
- Queries the artifact dependency graph
- Shows which artifacts are ready vs blocked
- Creates the first ready artifact
- Reads dependency files for context
- Shows what becomes available after creation

**Example:**
```
You: /openspec-continue-change

AI:  Change: add-dark-mode

     Artifact status:
     ✓ proposal    (done)
     ◆ specs       (ready)
     ◆ design      (ready)
     ○ tasks       (blocked - needs: specs)

     Creating specs...

     [Reads proposal.md, creates specs based on requirements]

     ✓ Created openspec/changes/add-dark-mode/specs/ui/spec.md

     Now available: tasks
     Run /openspec-continue-change to create the next artifact.
```

**Tips:**
- Use when you want to review each artifact before proceeding
- Good for complex changes where you want control
- Multiple artifacts may become ready simultaneously
- You can edit created artifacts before continuing

---

### `/openspec-ff-change`

Fast-forward through artifact creation. Creates all planning artifacts at once.

**Syntax:**
```
/openspec-ff-change [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to fast-forward (inferred from context if not provided) |

**What it does:**
- Creates all artifacts in dependency order
- Tracks progress via todo list
- Stops when all `apply-required` artifacts are complete
- Reads each dependency before creating the next artifact

**Example:**
```
You: /openspec-ff-change add-dark-mode

AI:  Fast-forwarding add-dark-mode...

     ✓ Creating proposal.md
     ✓ Creating specs/ui/spec.md
     ✓ Creating design.md
     ✓ Creating tasks.md

     All planning artifacts complete!
     Ready for implementation. Run /openspec-apply-change to begin.
```

**Tips:**
- Use when you have a clear picture of what you're building
- Faster than `/openspec-continue-change` for straightforward changes
- You can still edit artifacts afterward
- Good for small to medium features

---

### `/openspec-apply-change`

Implement tasks from the change. Works through the task list, writing code and checking off items.

**Syntax:**
```
/openspec-apply-change [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to implement (inferred from context if not provided) |

**What it does:**
- Reads `tasks.md` and identifies incomplete tasks
- Works through tasks one by one
- Writes code, creates files, runs tests as needed
- Marks tasks complete with checkboxes `[x]`

**Example:**
```
You: /openspec-apply-change

AI:  Implementing add-dark-mode...

     Reading tasks.md:
     - [ ] 1.1 Create ThemeContext
     - [ ] 1.2 Add CSS custom properties
     - [ ] 1.3 Implement localStorage persistence

     Working on 1.1: Create ThemeContext...
     [Creates src/context/ThemeContext.tsx]

     ✓ 1.1 Complete

     Working on 1.2: Add CSS custom properties...
     [Updates src/styles/globals.css]

     ✓ 1.2 Complete
     ...
```

**Tips:**
- Can resume where you left off if interrupted
- Use for parallel changes by specifying the change name
- Completion state is tracked in `tasks.md` checkboxes

---

### `/openspec-verify-change`

Validate that implementation matches your change artifacts. Checks completeness, correctness, and coherence.

**Syntax:**
```
/openspec-verify-change [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to verify (inferred from context if not provided) |

**What it does:**
- Checks three dimensions of implementation quality
- Searches codebase for implementation evidence
- Reports issues categorized as CRITICAL, WARNING, or SUGGESTION
- Does not block archive, but surfaces issues

**Verification dimensions:**

| Dimension | What it validates |
|-----------|-------------------|
| **Completeness** | All tasks done, all requirements implemented, scenarios covered |
| **Correctness** | Implementation matches spec intent, edge cases handled |
| **Coherence** | Design decisions reflected in code, patterns consistent |

**Example:**
```
You: /openspec-verify-change

AI:  Verifying add-dark-mode...

     COMPLETENESS
     ✓ All 8 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "System preference detection" has no test coverage

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "CSS variables" but implementation uses Tailwind classes

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for system preference detection
     2. Update design.md to reflect Tailwind usage, or refactor to use CSS variables
```

**Tips:**
- Run before archiving to catch mismatches early
- Warnings don't block archive but indicate potential issues
- Good for reviewing AI's work before committing
- Can reveal drift between artifacts and implementation

---

### `/openspec-sync-specs`

**Optional skill.** Merge delta specs from a change into main specs. Archive will prompt to sync if needed, so you typically don't need to run this manually.

**Syntax:**
```
/openspec-sync-specs [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to sync (inferred from context if not provided) |

**What it does:**
- Reads delta specs from change folder
- Parses ADDED/MODIFIED/REMOVED/RENAMED sections
- Merges changes into main `openspec/specs/` directory
- Preserves existing content not mentioned in delta
- Does not archive the change (remains active)

**Example:**
```text
You: /openspec-sync-specs

AI:  Syncing add-dark-mode delta specs...

     Reading: openspec/changes/add-dark-mode/specs/ui/spec.md
     Target:  openspec/specs/ui/spec.md

     Changes to apply:
     ✓ ADDED: Theme Selection requirement (2 scenarios)
     ✓ ADDED: Accessibility requirement (1 scenario)

     Merging...
     ✓ openspec/specs/ui/spec.md updated

     Change remains active. Run /openspec-archive-change when ready to complete.
```

**When to use manually:**

| Scenario | Use sync? |
|----------|-----------|
| Long-running change, want specs in main before archiving | Yes |
| Multiple parallel changes need the updated base specs | Yes |
| Want to preview/review the merge separately | Yes |
| Quick change, going straight to archive | No (archive handles it) |

**Tips:**
- Sync is intelligent, not copy-paste
- Can add scenarios to existing requirements without duplicating
- Change stays active after sync (not archived)
- Most users will never need to call this directly—archive prompts if needed

---

### `/openspec-archive-change`

Archive a completed change. Finalizes the change and moves it to the archive folder.

**Syntax:**
```
/openspec-archive-change [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to archive (inferred from context if not provided) |

**What it does:**
- Checks artifact completion status
- Checks task completion (warns if incomplete)
- Offers to sync delta specs if not already synced
- Moves change folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`
- Preserves all artifacts for audit trail

**Example:**
```text
You: /openspec-archive-change

AI:  Archiving add-dark-mode...

     Artifact status:
     ✓ proposal.md exists
     ✓ specs/ exists
     ✓ design.md exists
     ✓ tasks.md exists (8/8 tasks complete)

     Delta specs: Not yet synced
     → Sync now? (recommended)

You: Yes

AI:  ✓ Synced specs to openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/

     Change archived successfully.
```

**Tips:**
- Archive won't block on incomplete tasks, but will warn
- Delta specs can be synced during archive or beforehand
- Archived changes are preserved for history
- Use `/openspec-verify-change` first to catch issues

---

### `/openspec-bulk-archive-change`

Archive multiple completed changes at once. Handles spec conflicts between changes.

**Syntax:**
```
/openspec-bulk-archive-change [change-names...]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-names` | No | Specific changes to archive (prompts to select if not provided) |

**What it does:**
- Lists all completed changes
- Validates each change before archiving
- Detects spec conflicts across changes
- Resolves conflicts by checking what's actually implemented
- Archives in chronological order

**Example:**
```
You: /openspec-bulk-archive-change

AI:  Found 3 completed changes:
     - add-dark-mode (8/8 tasks complete)
     - fix-login-bug (3/3 tasks complete)
     - update-footer (2/2 tasks complete)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will merge in chronological order:
     1. add-dark-mode (created Jan 20)
     2. update-footer (created Jan 22)

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-bug
     ✓ Archived update-footer
     Specs merged: add-dark-mode → update-footer
```

**Tips:**
- Good for parallel work streams
- Conflict resolution is agentic (checks codebase)
- Changes are archived in order of creation
- Prompts before overwriting spec content

---

### `/openspec-onboard`

Guided onboarding through the complete OpenSpec workflow. An interactive tutorial using your actual codebase.

**Syntax:**
```
/openspec-onboard
```

**What it does:**
- Walks through a complete workflow cycle with narration
- Scans your codebase for real improvement opportunities
- Creates an actual change with real artifacts
- Implements actual work (small, safe changes)
- Archives the completed change
- Explains each step as it happens

**Phases:**
1. Welcome and codebase analysis
2. Finding an improvement opportunity
3. Creating a change (`/openspec-new-change`)
4. Writing the proposal
5. Creating specs
6. Writing the design
7. Creating tasks
8. Implementing tasks (`/openspec-apply-change`)
9. Verifying implementation
10. Archiving the change
11. Summary and next steps

**Example:**
```
You: /openspec-onboard

AI:  Welcome to OpenSpec!

     I'll walk you through the complete workflow using your actual codebase.
     We'll find something small to improve, create a proper change for it,
     implement it, and archive it.

     Let me scan your codebase for opportunities...

     [Analyzes codebase]

     I found a few things we could work on:
     1. Add input validation to the contact form
     2. Improve error messages in the auth flow
     3. Add loading states to async buttons

     Which interests you? (or suggest something else)
```

**Tips:**
- Best for new users learning the workflow
- Uses real code, not toy examples
- Creates a real change you can keep or discard
- Takes 15-30 minutes to complete

---

### `/openspec-reverse`

Reverse-engineer a **draft** spec baseline from an existing (brownfield) codebase that has no
`openspec/specs/` yet.

**Syntax:**
```
/openspec-reverse
```

**What it does:**
- Runs `openspec reverse scan` to inventory the repo and propose a candidate capability map
- Asks you to ratify the map (keep / rename / merge / split / skip) before extracting anything
- Extracts one capability at a time, reading **tests and docs first, code second**, citing `file:line`
- Drafts requirements at behavioral altitude, scaffolds via `openspec reverse scaffold`, and validates
- Records anything it can't confirm as an open question; flags possible bugs instead of codifying them

**What it is NOT (non-goals):**
- **Not authoritative** — every output carries a `DRAFT BASELINE` banner and must be ratified by a human
- **Not idempotent across runs** — extraction is model-driven; only the `reverse scan`/`scaffold` helpers are deterministic
- **Not a whole-repo dump** — you confirm the map and each draft, capability by capability
- **Does not invent intent** — unconfirmed behavior becomes an open question, never a `SHALL`

**Example:**
```text
You: /openspec-reverse

AI:  Scanned the repo: 174 source, 95 test files across 12 candidate capabilities.
     Which should I baseline? (auth, billing, …) — confirm or adjust the grouping.

You: Start with auth.

AI:  Reading test/auth/* and docs/auth.md first…
     Drafted openspec/specs/auth/spec.md — 4 requirements, 2 open questions. Review before I continue.
```

**Notes:**
- See [Reverse Engineering Commands](cli.md) for the underlying `openspec reverse scan` / `scaffold` CLI.
- The drafts live under `openspec/specs/`; once ratified, future changes diff against them like any baseline.

---

## Invoking Skills

Each workflow skill is surfaced through your tool's own skill mechanism — the invocation token (`/openspec-propose`, `/openspec-apply-change`, …) names the skill your agent loads. How that token is typed or triggered varies by tool. See [Supported Tools](supported-tools.md) for per-tool details.

---

## Legacy Workflow

Earlier OpenSpec versions shipped an all-at-once workflow (`/openspec:proposal`, `/openspec:apply`, `/openspec:archive`). It has been replaced by the workflow skills documented above. If you're upgrading from it, see the [Migration Guide](migration-guide.md) — your existing changes continue to work with the new skills.

---

## Troubleshooting

### "Change not found"

The skill couldn't identify which change to work on.

**Solutions:**
- Specify the change name explicitly: `/openspec-apply-change add-dark-mode`
- Check that the change folder exists: `openspec list`
- Verify you're in the right project directory

### "No artifacts ready"

All artifacts are either complete or blocked by missing dependencies.

**Solutions:**
- Run `openspec status --change <name>` to see what's blocking
- Check if required artifacts exist
- Create missing dependency artifacts first

### "Schema not found"

The specified schema doesn't exist.

**Solutions:**
- List available schemas: `openspec schemas`
- Check spelling of schema name
- Create the schema if it's custom: `openspec schema init <name>`

### Skills not recognized

The AI tool doesn't recognize OpenSpec skills.

**Solutions:**
- Ensure OpenSpec is initialized: `openspec init`
- Regenerate skills: `openspec update`
- Check that `.claude/skills/` directory exists (for Claude Code)
- Restart your AI tool to pick up new skills

### Artifacts not generating properly

The AI creates incomplete or incorrect artifacts.

**Solutions:**
- Add project context in `openspec/config.yaml`
- Add per-artifact rules for specific guidance
- Provide more detail in your change description
- Use `/openspec-continue-change` instead of `/openspec-ff-change` for more control

---

## Next Steps

- [Workflows](workflows.md) - Common patterns and when to use each skill
- [CLI](cli.md) - Terminal commands for management and validation
- [Customization](customization.md) - Create custom schemas and workflows
