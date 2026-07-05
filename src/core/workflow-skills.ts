/**
 * Workflow Skills Enumeration
 *
 * Single source of truth for the installed skill set. Init and update install
 * exactly this list; the enumeration guard test asserts it stays in lockstep
 * with the bundle (`schemas/skills/`) and the skill template registry.
 *
 * Explicit list, not a bundle scan — adding or removing a skill must touch
 * this constant, the bundle, and the parity rebaseline together.
 */
export const WORKFLOW_SKILLS: readonly string[] = [
  'openspec-apply-change',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-continue-change',
  'openspec-design',
  'openspec-explore',
  'openspec-new-change',
  'openspec-reverse',
  'openspec-sync-specs',
  'openspec-verify-change',
];
