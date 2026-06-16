/**
 * Skill Template Workflow Module — apply-change.
 *
 * Authored as a directory under `schemas/skills/openspec-apply-change/`
 * (`SKILL.md` with frontmatter); this factory loads it.
 */
import type { SkillTemplate } from '../types.js';
import { loadSkillSource } from '../../shared/skill-bundle.js';

const source = loadSkillSource('openspec-apply-change');

export function getApplyChangeSkillTemplate(): SkillTemplate {
  const { frontmatter } = source;
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error("openspec-apply-change SKILL.md must define 'name' and 'description' in frontmatter");
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
