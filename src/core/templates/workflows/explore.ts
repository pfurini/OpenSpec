/**
 * Skill Template Workflow Module — explore.
 *
 * Authored as a directory under `schemas/skills/openspec-explore/`
 * (`SKILL.md` with frontmatter); this factory loads and seam-injects it.
 */
import type { SkillTemplate } from '../types.js';
import { PRIME_RITUAL } from './shared-prime.js';
import { loadSkillSource } from '../../shared/skill-bundle.js';

const source = loadSkillSource('openspec-explore', { PRIME_RITUAL });

export function getExploreSkillTemplate(): SkillTemplate {
  const { frontmatter } = source;
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error("openspec-explore SKILL.md must define 'name' and 'description' in frontmatter");
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
