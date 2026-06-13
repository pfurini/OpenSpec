import { describe, it, expect } from 'vitest';
import { renderRegistry, type ParsedAdr } from '../../../src/core/adr/index.js';
import { checkAdrRegistry } from '../../../src/core/lint/index.js';

const adrs: ParsedAdr[] = [
  { id: 'ADR-0002', title: 'keys', status: 'accepted', filePath: 'ADR-0002-keys.md' },
  { id: 'ADR-0003', title: 'slugs', status: 'accepted', filePath: 'ADR-0003-slugs.md' },
];

describe('checkAdrRegistry', () => {
  it('returns no findings when the registry matches the ADRs', () => {
    const findings = checkAdrRegistry({
      adrs,
      errors: [],
      registryContent: renderRegistry(adrs),
      adrDirExists: true,
    });
    expect(findings).toEqual([]);
  });

  it('skips entirely when there is no ADR directory', () => {
    const findings = checkAdrRegistry({ adrs: [], errors: [], registryContent: null, adrDirExists: false });
    expect(findings).toEqual([]);
  });

  it('flags an error when the registry file is missing', () => {
    const findings = checkAdrRegistry({ adrs, errors: [], registryContent: null, adrDirExists: true });
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('adr-registry');
    expect(findings[0].severity).toBe('error');
    expect(findings[0].message).toMatch(/missing|not generated/i);
    expect(findings[0].fix).toContain('openspec adr index');
  });

  it('flags an error when the registry is out of date (drift)', () => {
    const stale = renderRegistry([adrs[0]]); // only one ADR -> stale vs two
    const findings = checkAdrRegistry({ adrs, errors: [], registryContent: stale, adrDirExists: true });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].message).toMatch(/out of date|out of sync|drift/i);
    expect(findings[0].fix).toContain('openspec adr index');
  });

  it('reports each malformed ADR as an error finding', () => {
    const findings = checkAdrRegistry({
      adrs,
      errors: [{ filePath: 'ADR-0009-bad.md', message: 'no frontmatter' }],
      registryContent: renderRegistry(adrs),
      adrDirExists: true,
    });
    const parseFindings = findings.filter((f) => f.message.includes('ADR-0009-bad.md'));
    expect(parseFindings).toHaveLength(1);
    expect(parseFindings[0].severity).toBe('error');
  });
});
