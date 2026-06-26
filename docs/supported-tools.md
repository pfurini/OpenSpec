# Supported Tools

OpenSpec works with many AI coding assistants. When you run `openspec init`, OpenSpec installs its workflow as **Agent Skills** using your active profile/workflow selection.

## How It Works

Skills are written **once** to a canonical, cross-tool store at the project root:

```
.agents/skills/openspec-*/SKILL.md
```

How each tool picks them up:

- **Most tools read `.agents/skills` natively** — nothing tool-specific is generated; the canonical store *is* the install.
- **Claude Code** additionally gets an on-demand per-skill symlink (`.claude/skills/openspec-* → ../../.agents/skills/openspec-*`) so it discovers them through its own skills directory.

There is **no per-tool slash-command generation** — the workflow ships as skills only, invoked in your assistant's chat as `/openspec-<skill>` (for example `/openspec-propose`).

By default, OpenSpec uses the `core` profile, which includes:
- `propose`
- `explore`
- `apply`
- `sync`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`) via `openspec config profile`, then run `openspec update`.

## Non-Interactive Setup

For CI/CD or scripted setup, use `--tools` (and optionally `--profile`):

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none

# Override profile for this init run
openspec init --profile core
```

**Available tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `lingma`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `vibe`, `windsurf`

Because skills live in the shared `.agents/skills` store, selecting a tool mainly controls whether OpenSpec also lays down a tool-specific affordance (today, only Claude Code's symlink); every other selected tool reads the same canonical store.

## Workflow-Dependent Installation

OpenSpec installs workflow skills based on selected workflows:

- **Core profile (default):** `propose`, `explore`, `apply`, `sync`, `archive`
- **Custom selection:** any subset of all workflow IDs:
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

In other words, skill counts are profile-dependent, not fixed.

## Generated Skill Names

When selected by profile/workflow config, OpenSpec generates these skills:

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

See [Commands](commands.md) for skill behavior and [CLI](cli.md) for `init`/`update` options.

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Skills and how to invoke them
- [Getting Started](getting-started.md) — First-time setup
