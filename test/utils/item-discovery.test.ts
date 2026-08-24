import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { getSpecIds } from '../../src/utils/item-discovery.js';

let tempDir: string;

async function writeSpec(id: string): Promise<void> {
  const file = path.join(tempDir, 'openspec', 'specs', ...id.split('/'), 'spec.md');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, '# Spec\n');
}

describe('getSpecIds', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-item-discovery-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('discovers nested capabilities under their path id, code-point ordered', async () => {
    await writeSpec('auth');
    await writeSpec('platform/session');
    await writeSpec('Zeta');

    expect(await getSpecIds(tempDir)).toEqual(['Zeta', 'auth', 'platform/session']);
  });

  it('ignores a spec.md sitting directly in the specs root', async () => {
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'specs', 'spec.md'), '# Not a capability\n');
    await writeSpec('auth');

    expect(await getSpecIds(tempDir)).toEqual(['auth']);
  });

  it('returns an empty list when the specs root does not exist', async () => {
    expect(await getSpecIds(tempDir)).toEqual([]);
  });
});
