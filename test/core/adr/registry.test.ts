import { describe, it, expect } from 'vitest';
import { renderRegistry, REGISTRY_MARKER, type ParsedAdr } from '../../../src/core/adr/index.js';

const adrs: ParsedAdr[] = [
  {
    id: 'ADR-0037',
    title: 'Self-service writes | not raw',
    status: 'proposed',
    date: '2026-06-12',
    change: 'account-profile-self-service',
    supersededBy: undefined,
    filePath: 'ADR-0037-self.md',
  },
  {
    id: 'ADR-0002',
    title: 'bigserial primary keys, not UUID',
    status: 'accepted',
    date: '2026-05-17',
    change: undefined,
    supersededBy: undefined,
    filePath: 'ADR-0002-keys.md',
  },
  {
    id: 'ADR-0010',
    title: 'Old decision',
    status: 'superseded',
    date: '2026-01-01',
    change: undefined,
    supersededBy: 'ADR-0042',
    filePath: 'ADR-0010-old.md',
  },
];

describe('renderRegistry', () => {
  it('renders a single table sorted by id, escaping pipes and filling empties with —', () => {
    const expected = [
      REGISTRY_MARKER,
      '# ADR Registry',
      '',
      '| ID | Status | Title | Date | Change | Superseded by |',
      '| --- | --- | --- | --- | --- | --- |',
      '| [ADR-0002](./ADR-0002-keys.md) | accepted | bigserial primary keys, not UUID | 2026-05-17 | — | — |',
      '| [ADR-0010](./ADR-0010-old.md) | superseded | Old decision | 2026-01-01 | — | ADR-0042 |',
      '| [ADR-0037](./ADR-0037-self.md) | proposed | Self-service writes \\| not raw | 2026-06-12 | account-profile-self-service | — |',
      '',
    ].join('\n');

    expect(renderRegistry(adrs)).toBe(expected);
  });

  it('sorts numerically, not lexically (ADR-0009 before ADR-0010)', () => {
    const out = renderRegistry([
      { id: 'ADR-0010', title: 'ten', status: 'accepted', filePath: 'a.md' },
      { id: 'ADR-0009', title: 'nine', status: 'accepted', filePath: 'b.md' },
    ]);
    expect(out.indexOf('ADR-0009')).toBeLessThan(out.indexOf('ADR-0010'));
  });

  it('renders just the header when there are no ADRs', () => {
    const out = renderRegistry([]);
    expect(out).toContain(REGISTRY_MARKER);
    expect(out).toContain('| ID | Status | Title | Date | Change | Superseded by |');
    expect(out).not.toMatch(/\[ADR-/);
  });
});
