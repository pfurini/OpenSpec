# cli-config — delta

## REMOVED Requirements

### Requirement: Profile Configuration Flow
**Reason**: The profile/skill-gating machinery is evicted — the fork has no `core`/`custom` profiles and no configurable workflow subset. (The requirement also referenced delivery settings, which were already removed in the skills-only port.)
**Migration**: `openspec config profile` no longer exists. Init and update always install the full workflow skill set; no configuration is needed or possible.
