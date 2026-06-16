/**
 * Skill Template Workflow Module — bulk-archive-change.
 *
 * Authored as a directory under `schemas/skills/openspec-bulk-archive-change/`
 * (`SKILL.md` with frontmatter); this factory loads it.
 */
import type { SkillTemplate } from '../types.js';
import { loadSkillSource } from '../../shared/skill-bundle.js';

const source = loadSkillSource('openspec-bulk-archive-change');

export function getBulkArchiveChangeSkillTemplate(): SkillTemplate {
  const { frontmatter } = source;
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error("openspec-bulk-archive-change SKILL.md must define 'name' and 'description' in frontmatter");
  }
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    instructions: source.instructions,
    license: frontmatter.license ?? 'MIT',
    compatibility: frontmatter.compatibility ?? 'Requires openspec CLI.',
    metadata: frontmatter.metadata ?? { author: 'openspec', version: '1.0' },
  };
}
