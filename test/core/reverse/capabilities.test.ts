import { describe, it, expect } from 'vitest';
import { deriveCapabilities } from '../../../src/core/reverse/capabilities.js';
import type { Inventory, InventoryFile } from '../../../src/core/reverse/inventory.js';

function inv(files: Array<[string, InventoryFile['category']]>): Inventory {
  const list: InventoryFile[] = files.map(([p, category]) => ({
    path: p,
    category,
    language: 'typescript',
  }));
  return { root: '/x', files: list, counts: { source: 0, test: 0, doc: 0, total: list.length }, languages: {} };
}

describe('deriveCapabilities', () => {
  it('groups by the module under a container root and descends past src', () => {
    const caps = deriveCapabilities(
      inv([
        ['src/auth/login.ts', 'source'],
        ['src/auth/token.ts', 'source'],
        ['src/billing/charge.ts', 'source'],
      ]),
    );
    const names = caps.map((c) => c.name);
    expect(names).toContain('auth');
    expect(names).toContain('billing');
    expect(caps.find((c) => c.name === 'auth')!.fileCount).toBe(2);
  });

  it('folds mirrored test trees into their source capability', () => {
    const caps = deriveCapabilities(
      inv([
        ['src/auth/login.ts', 'source'],
        ['test/auth/login.test.ts', 'test'],
      ]),
    );
    expect(caps).toHaveLength(1);
    expect(caps[0]).toMatchObject({ name: 'auth', fileCount: 2 });
  });

  it('marks capabilities that already have a spec', () => {
    const caps = deriveCapabilities(
      inv([['src/auth/login.ts', 'source'], ['src/billing/charge.ts', 'source']]),
      ['auth'],
    );
    expect(caps.find((c) => c.name === 'auth')!.existing).toBe(true);
    expect(caps.find((c) => c.name === 'billing')!.existing).toBe(false);
  });

  it('ignores docs and sorts by file count descending', () => {
    const caps = deriveCapabilities(
      inv([
        ['src/big/a.ts', 'source'],
        ['src/big/b.ts', 'source'],
        ['src/small/a.ts', 'source'],
        ['docs/guide.md', 'doc'],
      ]),
    );
    expect(caps.map((c) => c.name)).toEqual(['big', 'small']);
    expect(caps.every((c) => c.name !== 'docs')).toBe(true);
  });

  it('caps sample files at 5, source-first', () => {
    const files: Array<[string, InventoryFile['category']]> = [];
    for (let i = 0; i < 8; i++) files.push([`src/mod/s${i}.ts`, 'source']);
    files.push(['test/mod/t.test.ts', 'test']);
    const caps = deriveCapabilities(inv(files));
    const mod = caps.find((c) => c.name === 'mod')!;
    expect(mod.sampleFiles).toHaveLength(5);
    expect(mod.sampleFiles.every((p) => !p.includes('.test.'))).toBe(true);
  });
});
