/**
 * Skill Template Workflow Module — design.
 *
 * The design skill is authored as a real multi-file directory under
 * `schemas/skills/openspec-design/` (`SKILL.md` + `references/*.md`) so the
 * source is validatable plain-text in-repo. It is loaded and seam-injected here.
 */
import type { SkillTemplate } from '../types.js';
import { PRIME_RITUAL } from './shared-prime.js';
import { loadSkillSource } from '../../shared/skill-bundle.js';

const designSource = loadSkillSource('openspec-design', { PRIME_RITUAL });

export function getOpsxDesignSkillTemplate(): SkillTemplate {
  const { frontmatter } = designSource;
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error("openspec-design SKILL.md must define 'name' and 'description' in frontmatter");
  }
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    instructions: designSource.instructions,
    bundle: designSource.bundle,
    license: frontmatter.license ?? 'MIT',
    compatibility: frontmatter.compatibility ?? 'Requires openspec CLI.',
    metadata: frontmatter.metadata ?? { author: 'openspec', version: '1.0' },
  };
}
