import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildInventory } from '../../../src/core/reverse/inventory.js';

async function write(root: string, rel: string, content = 'x'): Promise<void> {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content);
}

describe('buildInventory', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-reverse-inv-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('classifies source, test, and doc files and detects language', async () => {
    await write(dir, 'src/auth/login.ts');
    await write(dir, 'src/auth/login.test.ts');
    await write(dir, 'docs/guide.md');
    await write(dir, 'README.md');

    const inv = await buildInventory(dir);
    const byPath = Object.fromEntries(inv.files.map((f) => [f.path, f]));

    expect(byPath['src/auth/login.ts'].category).toBe('source');
    expect(byPath['src/auth/login.ts'].language).toBe('typescript');
    expect(byPath['src/auth/login.test.ts'].category).toBe('test');
    expect(byPath['docs/guide.md'].category).toBe('doc');
    expect(byPath['README.md'].category).toBe('doc');
    expect(inv.counts).toMatchObject({ source: 1, test: 1, doc: 2, total: 4 });
  });

  it('excludes the built-in vendored/generated ignore set', async () => {
    await write(dir, 'src/index.ts');
    await write(dir, 'node_modules/pkg/index.js');
    await write(dir, 'dist/index.js');
    await write(dir, 'openspec/specs/foo/spec.md');

    const inv = await buildInventory(dir);
    const paths = inv.files.map((f) => f.path);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('node_modules/pkg/index.js');
    expect(paths).not.toContain('dist/index.js');
    expect(paths.some((p) => p.startsWith('openspec/'))).toBe(false);
  });

  it('honors .gitignore entries (best-effort)', async () => {
    await write(dir, '.gitignore', 'generated/\n*.gen.ts\n');
    await write(dir, 'src/app.ts');
    await write(dir, 'generated/types.ts');
    await write(dir, 'src/schema.gen.ts');

    const inv = await buildInventory(dir);
    const paths = inv.files.map((f) => f.path);

    expect(paths).toContain('src/app.ts');
    expect(paths).not.toContain('generated/types.ts');
    expect(paths).not.toContain('src/schema.gen.ts');
  });

  it('skips files that are neither source, test, nor doc', async () => {
    await write(dir, 'src/app.ts');
    await write(dir, 'package.json', '{}');
    await write(dir, 'config.yaml', 'a: 1');

    const inv = await buildInventory(dir);
    const paths = inv.files.map((f) => f.path);

    expect(paths).toEqual(['src/app.ts']);
  });
});
