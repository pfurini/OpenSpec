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
  return {
    name: 'openspec-design',
    description:
      'Enter design mode - an interactive HOW-thinking partner that interviews you to settle the architecture, then turns a settled WHAT (proposal + specs) into design.md + ADRs, decomposed into well-bounded units and sequenced into a value-ordered TDD wave skeleton. Writes design.md directly (the single source of the HOW contract); /opsx:continue only transcribes its wave skeleton into tasks.md. Use after requirements are settled, to think through how to build it.',
    instructions: designSource.instructions,
    bundle: designSource.bundle,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
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
