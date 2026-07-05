# Commands

This is the reference for OpenSpec's slash commands. These commands are invoked in your AI coding assistant's chat interface (e.g., Claude Code, Cursor, Windsurf).

For workflow patterns and when to use each command, see [Workflows](workflows.md). For CLI commands, see [CLI](cli.md).

## Quick Reference

Every bundled workflow skill is always installed — there is no configurable subset.

| Command | Purpose |
|---------|---------|
| `/openspec-explore` | Think through ideas before committing to a change |
| `/openspec-new-change` | Start a new change scaffold |
| `/openspec-continue-change` | Create the next artifact based on dependencies |
| `/openspec-design` | Interactive HOW-thinking partner; writes design.md + ADRs |
| `/openspec-apply-change` | Implement tasks from the change |
| `/openspec-verify-change` | Validate implementation matches artifacts |
| `/openspec-sync-specs` | Merge delta specs into main specs |
| `/openspec-archive-change` | Archive a completed change |
| `/openspec-bulk-archive-change` | Archive multiple changes at once |
| `/openspec-reverse` | Reverse-engineer draft specs from an existing codebase |

---

## Command Reference

### `/openspec-explore`

> **Start here when you're unsure.** Explore is a no-stakes thinking partner: it reads your codebase, compares options, and sharpens a fuzzy idea into a concrete plan before any change exists. For the full case and more examples, see the [Explore First](explore.md) guide.

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
- Can transition to `/openspec-new-change` when insights crystallize

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

AI:  Ready when you are. Run /openspec-new-change add-jwt-auth to begin.
```

**Tips:**
- Use when requirements are unclear or you need to investigate
- No artifacts are created during exploration
- Good for comparing multiple approaches before deciding
- Can read files and search the codebase

---

### `/openspec-new-change`

Start a new change scaffold. Creates the change folder and waits for you to generate artifacts with `/openspec-continue-change`.

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
     Use /openspec-continue-change to create it.
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

**Optional command.** Merge delta specs from a change into main specs. Archive will prompt to sync if needed, so you typically don't need to run this manually.

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

## Skill Invocation by AI Tool

OpenSpec ships its workflow as skills, invoked by name. Nearly every tool uses the same form — `/openspec-<skill>`:

| Tool | Invocation example |
|------|--------------------|
| Most tools (Claude Code, Cursor, Windsurf, Copilot, …) | `/openspec-new-change`, `/openspec-apply-change` |
| Kimi CLI | Skill-prefixed, e.g. `/skill:openspec-new-change`, `/skill:openspec-apply-change` |

The intent is the same across tools; only how each integration *surfaces* the skill differs. There are no per-tool command files — the skills live in one canonical `.agents/skills` store (see [Supported Tools](supported-tools.md)).

> **Note:** GitHub Copilot commands (`.github/prompts/*.prompt.md`) are only available in IDE extensions (VS Code, JetBrains, Visual Studio). GitHub Copilot CLI does not currently support custom prompt files — see [Supported Tools](supported-tools.md) for details and workarounds.

---

## Troubleshooting

### "Change not found"

The command couldn't identify which change to work on.

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

### Commands not recognized

The AI tool doesn't recognize OpenSpec commands.

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
- Use `/openspec-continue-change` to create artifacts one at a time for more control

---

## Next Steps

- [Workflows](workflows.md) - Common patterns and when to use each command
- [CLI](cli.md) - Terminal commands for management and validation
- [Customization](customization.md) - Create custom schemas and workflows
