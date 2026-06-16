import { describe, expect, it } from 'vitest';

import {
  loadSkillSource,
  flattenSkillBody,
  renderFullInstructions,
  validateBundleBlocks,
} from '../../../src/core/shared/skill-bundle.js';
import { buildSkillArtifacts, generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { getOpsxDesignSkillTemplate, getOpsxDesignCommandTemplate } from '../../../src/core/templates/skill-templates.js';
import { getSkillBundleCapability } from '../../../src/core/config.js';
import type { SkillTemplate } from '../../../src/core/templates/types.js';

const BASE: SkillTemplate = {
  name: 'demo',
  description: 'demo skill',
  instructions: 'Body of the skill.\n\nNo bundle block here.',
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

/** A SKILL.md body with one authored bundle block pointing at the flow reference. */
const BLOCK_BODY = [
  'Intro.',
  '',
  '<!--bundle:start-->',
  '## Flow',
  '',
  'Follow exactly these instructions: references/flow.md',
  '<!--bundle:end-->',
  '',
  '## Guardrails',
  '',
  'Rules.',
].join('\n');

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

  it('flatten capability concatenates referenced bundle files and drops unreferenced scripts', () => {
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

describe('renderFullInstructions (full mode — author owns the prose)', () => {
  it('strips the bundle fence comments and keeps the authored prose verbatim', () => {
    const out = renderFullInstructions(BLOCK_BODY, WITH_BUNDLE.bundle);
    expect(out).not.toContain('<!--bundle:start-->');
    expect(out).not.toContain('<!--bundle:end-->');
    // The author's prose (incl. the on-demand path mention) survives untouched.
    expect(out).toContain('## Flow');
    expect(out).toContain('Follow exactly these instructions: references/flow.md');
    // The reference BODY is NOT inlined — it ships as a separate file.
    expect(out).not.toContain('The detailed flow.');
    // Document order preserved.
    expect(out.indexOf('## Flow')).toBeGreaterThan(out.indexOf('Intro.'));
    expect(out.indexOf('## Flow')).toBeLessThan(out.indexOf('## Guardrails'));
  });

  it('returns instructions unchanged when there are no bundle blocks', () => {
    expect(renderFullInstructions(BASE.instructions, WITH_BUNDLE.bundle)).toBe(BASE.instructions);
  });

  it('throws when a block references a path absent from the bundle', () => {
    const bad = BLOCK_BODY.replace('references/flow.md', 'references/missing.md');
    expect(() => renderFullInstructions(bad, WITH_BUNDLE.bundle)).toThrow(/references\/missing\.md/);
  });
});

describe('flattenSkillBody (flatten mode — block replaced by concatenated file contents)', () => {
  it('returns instructions unchanged when there is no bundle', () => {
    expect(flattenSkillBody(BASE.instructions, undefined)).toBe(BASE.instructions);
  });

  it('replaces the whole block (fences + prose) with the referenced reference content, in place', () => {
    const out = flattenSkillBody(BLOCK_BODY, WITH_BUNDLE.bundle);
    expect(out).not.toContain('<!--bundle:');
    // Authored pointer prose is gone; the file body takes its place.
    expect(out).not.toContain('Follow exactly these instructions: references/flow.md');
    expect(out).toContain('The detailed flow.');
    // Original document order preserved.
    expect(out.indexOf('The detailed flow.')).toBeGreaterThan(out.indexOf('Intro.'));
    expect(out.indexOf('The detailed flow.')).toBeLessThan(out.indexOf('## Guardrails'));
  });

  it('inlines a script reference inside a fenced code block headed by its path (option a)', () => {
    const body = [
      '<!--bundle:start-->',
      'Run the helper: scripts/run.sh',
      '<!--bundle:end-->',
    ].join('\n');
    const out = flattenSkillBody(body, WITH_BUNDLE.bundle);
    expect(out).not.toContain('<!--bundle:');
    // Path-as-heading + fenced body, so the single file stays self-contained.
    expect(out).toContain('scripts/run.sh');
    expect(out).toContain('```');
    expect(out).toContain('echo hi');
  });

  it('concatenates multiple bundle files in the order their paths appear in the block', () => {
    const bundle = {
      references: [
        { relPath: 'references/a.md', content: '# A\n\nAlpha.' },
        { relPath: 'references/b.md', content: '# B\n\nBeta.' },
      ],
    };
    const body = [
      '<!--bundle:start-->',
      'First references/b.md then references/a.md',
      '<!--bundle:end-->',
    ].join('\n');
    const out = flattenSkillBody(body, bundle);
    expect(out.indexOf('Beta.')).toBeLessThan(out.indexOf('Alpha.'));
  });

  it('appends an unreferenced reference after the instructions (no silent loss)', () => {
    const out = flattenSkillBody(BASE.instructions, WITH_BUNDLE.bundle);
    expect(out.startsWith(BASE.instructions)).toBe(true);
    expect(out).toContain('The detailed flow.');
  });

  it('throws when a block references a path absent from the bundle', () => {
    const bad = BLOCK_BODY.replace('references/flow.md', 'references/missing.md');
    expect(() => flattenSkillBody(bad, WITH_BUNDLE.bundle)).toThrow(/references\/missing\.md/);
  });

  it('ignores incidental non-bundle paths in block prose (only references/ and scripts/ are includes)', () => {
    const body = [
      '<!--bundle:start-->',
      'Check the registry at docs/adr/README.md, then follow references/flow.md',
      '<!--bundle:end-->',
    ].join('\n');
    // docs/adr/README.md is not a bundle root — must not throw, must not be treated as an include.
    expect(() => flattenSkillBody(body, WITH_BUNDLE.bundle)).not.toThrow();
    const out = flattenSkillBody(body, WITH_BUNDLE.bundle);
    expect(out).toContain('The detailed flow.');
  });
});

describe('validateBundleBlocks', () => {
  it('passes when every block path exists in the bundle', () => {
    expect(() => validateBundleBlocks(BLOCK_BODY, WITH_BUNDLE.bundle)).not.toThrow();
  });

  it('throws naming the offending path when a block path is missing', () => {
    const bad = BLOCK_BODY.replace('references/flow.md', 'scripts/nope.sh');
    expect(() => validateBundleBlocks(bad, WITH_BUNDLE.bundle)).toThrow(/scripts\/nope\.sh/);
  });
});

describe('design command coherence (single-file, always flattened)', () => {
  it('inlines the flow in order with no dangling bundle marker or raw path mention', () => {
    const content = getOpsxDesignCommandTemplate().content;
    expect(content).not.toContain('<!--bundle:');
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

  it('throws if a SKILL.md bundle block points at a non-existent file', () => {
    // The real design skill must be internally consistent: every block path resolves.
    expect(() => loadSkillSource('openspec-design')).not.toThrow();
  });

  it('parses authored frontmatter and keeps it out of the instructions body', () => {
    const source = loadSkillSource('openspec-design');
    // Frontmatter is the source of truth for name/description — the file is a valid skill.
    expect(source.frontmatter.name).toBe('openspec-design');
    expect(source.frontmatter.description).toContain('interactive HOW-thinking partner');
    // The frontmatter block must NOT leak into the body the generator wraps.
    expect(source.instructions.startsWith('---')).toBe(false);
    expect(source.instructions).not.toContain('\ndescription:');
    expect(source.instructions.startsWith('Enter design mode')).toBe(true);
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
