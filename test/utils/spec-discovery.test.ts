import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { discoverSpecFiles } from '../../src/utils/spec-discovery.js';

const onPosix = process.platform !== 'win32';

let tempDir: string;
let specsDir: string;

/** Write a capability spec at a `/`-written capability path. */
async function writeSpec(id: string, content = '# Spec\n'): Promise<string> {
  const file = path.join(specsDir, ...id.split('/'), 'spec.md');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  return file;
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-discovery-'));
  specsDir = path.join(tempDir, 'specs');
  await fs.mkdir(specsDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('discoverSpecFiles', () => {
  it('finds flat capabilities by folder name', async () => {
    const file = await writeSpec('auth');

    expect(await discoverSpecFiles(specsDir)).toEqual([{ id: 'auth', specFile: file }]);
  });

  it('finds nested capabilities and joins ids with "/" on every platform', async () => {
    const file = await writeSpec('platform/session');

    const found = await discoverSpecFiles(specsDir);

    expect(found).toEqual([
      { id: 'platform/session', specFile: file },
    ]);
    expect(found[0].specFile).toBe(
      path.join(specsDir, 'platform', 'session', 'spec.md')
    );
  });

  it('walks arbitrarily deep and skips folders without a spec.md', async () => {
    const deep = await writeSpec('a/b/c/d');
    await fs.mkdir(path.join(specsDir, 'a', 'empty'), { recursive: true });

    expect(await discoverSpecFiles(specsDir)).toEqual([
      { id: 'a/b/c/d', specFile: deep },
    ]);
  });

  it('sorts ids by code point, not by locale collation', async () => {
    await writeSpec('alphabet');
    await writeSpec('alpha/beta');
    await writeSpec('Zeta');

    expect((await discoverSpecFiles(specsDir)).map((s) => s.id)).toEqual([
      'Zeta',
      'alpha/beta',
      'alphabet',
    ]);
  });

  it('skips dot entries', async () => {
    await writeSpec('.hidden');
    await writeSpec('.git/objects/thing');
    const visible = await writeSpec('auth');

    expect(await discoverSpecFiles(specsDir)).toEqual([
      { id: 'auth', specFile: visible },
    ]);
  });

  it('ignores a spec.md sitting directly in the specs root', async () => {
    await fs.writeFile(path.join(specsDir, 'spec.md'), '# Not a capability\n');
    const real = await writeSpec('auth');

    expect(await discoverSpecFiles(specsDir)).toEqual([
      { id: 'auth', specFile: real },
    ]);
  });

  it.skipIf(!onPosix)('does not follow symlinked directories', async () => {
    const outside = path.join(tempDir, 'outside', 'session');
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(path.join(outside, 'spec.md'), '# Outside\n');
    await fs.symlink(path.join(tempDir, 'outside'), path.join(specsDir, 'linked'), 'dir');

    expect(await discoverSpecFiles(specsDir)).toEqual([]);
  });

  it.skipIf(!onPosix)('accepts a symlinked spec.md inside a capability folder', async () => {
    const realFile = path.join(tempDir, 'elsewhere.md');
    await fs.writeFile(realFile, '# Elsewhere\n');
    const capabilityDir = path.join(specsDir, 'auth');
    await fs.mkdir(capabilityDir, { recursive: true });
    const link = path.join(capabilityDir, 'spec.md');
    await fs.symlink(realFile, link);

    expect(await discoverSpecFiles(specsDir)).toEqual([
      { id: 'auth', specFile: link },
    ]);
  });

  it.skipIf(!onPosix)('skips a dangling spec.md symlink', async () => {
    const capabilityDir = path.join(specsDir, 'auth');
    await fs.mkdir(capabilityDir, { recursive: true });
    await fs.symlink(path.join(tempDir, 'missing.md'), path.join(capabilityDir, 'spec.md'));

    expect(await discoverSpecFiles(specsDir)).toEqual([]);
  });

  it('returns an empty list when the root does not exist', async () => {
    expect(await discoverSpecFiles(path.join(tempDir, 'nope'))).toEqual([]);
  });

  it('throws when the root cannot be read for a reason other than absence', async () => {
    const notADir = path.join(tempDir, 'a-file');
    await fs.writeFile(notADir, 'contents');

    await expect(discoverSpecFiles(notADir)).rejects.toThrow();
  });
});
