# cli-feedback — delta

## REMOVED Requirements

### Requirement: Feedback command
**Reason**: The `openspec feedback` command posts to upstream's feedback channel; evicted from the personal hard fork.
**Migration**: File issues directly on the fork's own repository (`pfurini/OpenSpec`).

### Requirement: GitHub CLI dependency
**Reason**: Existed only to serve the feedback command.
**Migration**: None — `gh` is no longer a soft dependency of any CLI command.

### Requirement: Issue metadata
**Reason**: Feedback command evicted.
**Migration**: None.

### Requirement: Feedback always works
**Reason**: Feedback command evicted.
**Migration**: None.

### Requirement: Error handling
**Reason**: Feedback command evicted.
**Migration**: None.

### Requirement: Feedback skill for agents
**Reason**: Feedback command evicted; agents no longer get a feedback skill.
**Migration**: None — the workflow skill set does not include feedback.

### Requirement: Shell completions
**Reason**: Completions specific to the feedback command die with it.
**Migration**: General shell completions for remaining commands are unaffected (owned by `cli-completion`).
