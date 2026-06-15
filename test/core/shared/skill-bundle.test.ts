import { describe, expect, it } from 'vitest';

import {
  loadSkillSource,
  flattenSkillBody,
} from '../../../src/core/shared/skill-bundle.js';
import { buildSkillArtifacts, generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { getOpsxDesignSkillTemplate, getOpsxDesignCommandTemplate } from '../../../src/core/templates/skill-templates.js';
import { getSkillBundleCapability } from '../../../src/core/config.js';
import type { SkillTemplate } from '../../../src/core/templates/types.js';

const BASE: SkillTemplate = {
  name: 'demo',
  description: 'demo skill',
  instructions: 'Body of the skill.\n\nSee `references/flow.md`.',
  license: 'MIT',
  compatibility: 'Requires openspec CLI.',
  metadata: { author: 'openspec', version: '1.0' },
};

const WITH_BUNDLE: SkillTemplate = {
  ...BASE,
  bundle: {
    references: [{ relPath: 'references/flow.md', content: '# Flow\n\nThe detailed flow.' }],
    scripts: [{ relPath: 'scripts/run.sh', content: '#!/usr/bin/env bash\necho hi', executable: true }],
  },
};

describe('buildSkillArtifacts', () => {
  it('emits a single SKILL.md for a skill with no bundle (byte-identical to generateSkillContent)', () => {
    const files = buildSkillArtifacts(BASE, 'V', 'full');
    expect(files).toHaveLength(1);
    expect(files[0].relPath).toBe('SKILL.md');
    expect(files[0].content).toBe(generateSkillContent(BASE, 'V'));
  });

  it('full capability emits SKILL.md plus separate reference and script files', () => {
    const files = buildSkillArtifacts(WITH_BUNDLE, 'V', 'full');
    const byPath = Object.fromEntries(files.map((f) => [f.relPath, f]));

    expect(Object.keys(byPath).sort()).toEqual(['SKILL.md', 'references/flow.md', 'scripts/run.sh']);
    // SKILL.md stays short — it must NOT contain the reference body.
    expect(byPath['SKILL.md'].content).not.toContain('The detailed flow.');
    expect(byPath['references/flow.md'].content).toBe('# Flow\n\nThe detailed flow.');
    expect(byPath['scripts/run.sh'].executable).toBe(true);
  });

  it('flatten capability concatenates references into SKILL.md and drops scripts', () => {
    const files = buildSkillArtifacts(WITH_BUNDLE, 'V', 'flatten');
    expect(files).toHaveLength(1);
    expect(files[0].relPath).toBe('SKILL.md');
    // The reference body is inlined, nothing silently lost.
    expect(files[0].content).toContain('Body of the skill.');
    expect(files[0].content).toContain('The detailed flow.');
    // No separate script file under flatten.
    expect(files.some((f) => f.relPath.startsWith('scripts/'))).toBe(false);
  });
});

describe('flattenSkillBody', () => {
  it('returns instructions unchanged when there is no bundle', () => {
    expect(flattenSkillBody(BASE.instructions, undefined)).toBe(BASE.instructions);
  });

  it('appends reference content after the instructions when there is no marker', () => {
    const out = flattenSkillBody(BASE.instructions, WITH_BUNDLE.bundle);
    expect(out.startsWith(BASE.instructions)).toBe(true);
    expect(out).toContain('The detailed flow.');
  });

  it('inlines reference content at its marker, in place (no append, no dangling marker)', () => {
    const instructions = 'Intro.\n\n## Flow\n\n<!--reference:references/flow.md-->\n\n## Guardrails\n\nRules.';
    const out = flattenSkillBody(instructions, WITH_BUNDLE.bundle);
    expect(out).not.toContain('<!--reference:');
    // Reference content sits between Flow and Guardrails — original order preserved.
    expect(out.indexOf('The detailed flow.')).toBeGreaterThan(out.indexOf('## Flow'));
    expect(out.indexOf('The detailed flow.')).toBeLessThan(out.indexOf('## Guardrails'));
  });
});

describe('design command coherence (single-file, always flattened)', () => {
  it('inlines the flow in order with no dangling reference pointer or marker', () => {
    const content = getOpsxDesignCommandTemplate().content;
    expect(content).not.toContain('<!--reference:');
    expect(content).not.toContain('references/flow.md');
    // The flow body (step 0) must appear BEFORE Guardrails — original document order.
    const iFlow = content.indexOf('### 0 · Prime');
    const iGuardrails = content.indexOf('## Guardrails');
    expect(iFlow).toBeGreaterThan(-1);
    expect(iGuardrails).toBeGreaterThan(-1);
    expect(iFlow).toBeLessThan(iGuardrails);
  });
});

describe('loadSkillSource (real design skill directory)', () => {
  it('loads SKILL.md with the prime seam injected and flow.md as a reference', () => {
    const source = loadSkillSource('openspec-design', { PRIME_RITUAL: 'PRIMED-SENTINEL' });
    expect(source.instructions).toContain('Enter design mode');
    // Seam token must not survive in the SKILL.md (it has no prime, but flow.md does).
    expect(source.instructions).not.toContain('${PRIME_RITUAL}');

    const refPaths = (source.bundle.references ?? []).map((r) => r.relPath);
    expect(refPaths).toContain('references/flow.md');
    const flow = source.bundle.references!.find((r) => r.relPath === 'references/flow.md')!;
    expect(flow.content).toContain('PRIMED-SENTINEL');
    expect(flow.content).not.toContain('${PRIME_RITUAL}');
  });
});

describe('getSkillBundleCapability (Agent Skills standard: full by default)', () => {
  it('defaults to full for tools that support the Agent Skills layout', () => {
    // Authoritatively verified to support multi-file Agent Skills (references/ + scripts/).
    expect(getSkillBundleCapability('claude')).toBe('full');
    expect(getSkillBundleCapability('codex')).toBe('full');
    expect(getSkillBundleCapability('cursor')).toBe('full');
  });

  it('resolves flatten for an unknown tool with no skills surface', () => {
    expect(getSkillBundleCapability('not-a-real-tool')).toBe('flatten');
  });
});

describe('getOpsxDesignSkillTemplate (now bundle-backed)', () => {
  it('carries a references bundle and a real (injected) prime ritual', () => {
    const template = getOpsxDesignSkillTemplate();
    expect(template.bundle?.references?.some((r) => r.relPath === 'references/flow.md')).toBe(true);
    // The prime ritual is injected at build time, not left as a token.
    const flow = template.bundle!.references!.find((r) => r.relPath === 'references/flow.md')!;
    expect(flow.content).not.toContain('${PRIME_RITUAL}');
    expect(flow.content).toContain('A ritual, not a fact store');
  });
});
