/**
 * Core template types for skills and slash commands.
 */

/**
 * A single bundled file shipped alongside a skill's SKILL.md.
 * `relPath` is relative to the skill's directory (e.g. 'references/flow.md').
 */
export interface SkillFile {
  relPath: string;
  content: string;
  /** When true, write with the executable bit set (scripts/). */
  executable?: boolean;
}

/**
 * Optional multi-file payload for a skill: progressive-disclosure references
 * and executable helper scripts. Tools that support skill bundles receive these
 * as separate files; tools that do not receive a degraded (flattened) form.
 */
export interface SkillBundle {
  references?: SkillFile[];
  scripts?: SkillFile[];
}

export interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  /** Optional multi-file bundle (references/, scripts/). Absent for single-file skills. */
  bundle?: SkillBundle;
}

export interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}
