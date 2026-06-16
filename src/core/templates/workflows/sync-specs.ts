/**
 * Skill Template Workflow Module — sync-specs.
 *
 * Authored as a directory under `schemas/skills/openspec-sync-specs/`
 * (`SKILL.md` with frontmatter); this factory loads it.
 */
import type { SkillTemplate } from '../types.js';
import { loadSkillSource } from '../../shared/skill-bundle.js';

const source = loadSkillSource('openspec-sync-specs');

export function getSyncSpecsSkillTemplate(): SkillTemplate {
  const { frontmatter } = source;
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error("openspec-sync-specs SKILL.md must define 'name' and 'description' in frontmatter");
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
