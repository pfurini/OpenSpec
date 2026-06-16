/**
 * Skill Template Workflow Module — design.
 *
 * The design skill is authored as a real multi-file directory under
 * `schemas/skills/openspec-design/` (`SKILL.md` + `references/*.md`) so the
 * source is validatable plain-text in-repo. It is loaded and seam-injected here.
 * Slash commands are single-file by design, so the command template flattens the
 * bundle into one body.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { PRIME_RITUAL } from './shared-prime.js';
import { loadSkillSource, flattenSkillBody } from '../../shared/skill-bundle.js';

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

export function getOpsxDesignCommandTemplate(): CommandTemplate {
  const body = flattenSkillBody(designSource.instructions, designSource.bundle);
  return {
    name: 'OPSX: Design',
    description:
      'Enter design mode - interview to settle the HOW, then write design.md + ADRs: well-bounded units sequenced into a value-ordered TDD wave skeleton (continue transcribes the wave skeleton into tasks.md)',
    category: 'Workflow',
    tags: ['workflow', 'design', 'experimental', 'thinking'],
    content: `${body}

---

**Input**: The argument after \`/opsx:design\` is the change name to design (kebab-case), e.g. \`/opsx:design add-user-auth\`. If omitted, infer it from conversation context; if ambiguous, run \`openspec list --json\` and ask which change to design.`,
  };
}
