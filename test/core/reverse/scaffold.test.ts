import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scaffoldCapabilitySpec, DRAFT_BANNER } from '../../../src/core/reverse/scaffold.js';

describe('scaffoldCapabilitySpec', () => {
  let openspecDir: string;
  beforeEach(async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-reverse-scaffold-'));
    openspecDir = path.join(root, 'openspec');
  });
  afterEach(async () => {
    await fs.rm(path.dirname(openspecDir), { recursive: true, force: true });
  });

  it('creates a draft skeleton with banner, Purpose, and Requirements', async () => {
    const res = await scaffoldCapabilitySpec(openspecDir, 'user-auth', { purpose: 'Handle login' });
    expect(res.written).toBe(true);
    const content = await fs.readFile(res.specPath, 'utf-8');
    expect(content).toContain(DRAFT_BANNER);
    expect(content).toContain('# user-auth Specification');
    expect(content).toContain('## Purpose\nHandle login');
    expect(content).toContain('## Requirements');
  });

  it('is idempotent on its own skeleton (no-op on re-run)', async () => {
    const first = await scaffoldCapabilitySpec(openspecDir, 'auth');
    const second = await scaffoldCapabilitySpec(openspecDir, 'auth');
    expect(first.written).toBe(true);
    expect(second.written).toBe(false);
    expect(second.skipped).toBe('existing-skeleton');
  });

  it('refuses to overwrite human-authored content without --force', async () => {
    const { specPath } = await scaffoldCapabilitySpec(openspecDir, 'auth');
    await fs.writeFile(specPath, '# auth Specification\n\nHand-written requirements.\n');
    await expect(scaffoldCapabilitySpec(openspecDir, 'auth')).rejects.toThrow(/Refusing to overwrite/);
  });

  it('overwrites human content with --force', async () => {
    const { specPath } = await scaffoldCapabilitySpec(openspecDir, 'auth');
    await fs.writeFile(specPath, '# auth Specification\n\nHand-written.\n');
    const res = await scaffoldCapabilitySpec(openspecDir, 'auth', { force: true });
    expect(res.written).toBe(true);
    expect(await fs.readFile(specPath, 'utf-8')).toContain(DRAFT_BANNER);
  });

  it('rejects invalid capability names before writing', async () => {
    await expect(scaffoldCapabilitySpec(openspecDir, 'Bad Name')).rejects.toThrow(/Invalid capability name/);
  });
});
