import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanAdrDir } from '../../../src/core/adr/index.js';

describe('scanAdrDir', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-adr-scan-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function write(name: string, content: string) {
    await fs.writeFile(path.join(dir, name), content);
  }

  it('parses ADR files and ignores non-ADR files (incl. the generated README)', async () => {
    await write('ADR-0002-keys.md', '---\nid: ADR-0002\ntitle: keys\nstatus: accepted\n---\n# keys\n');
    await write('ADR-0009-slug.md', '---\nid: ADR-0009\ntitle: nine\nstatus: accepted\n---\n# nine\n');
    await write('README.md', '# not an ADR\n');
    await write('notes.md', '# also not an ADR\n');

    const { adrs, errors } = scanAdrDir(dir);
    expect(errors).toEqual([]);
    expect(adrs.map((a) => a.id)).toEqual(['ADR-0002', 'ADR-0009']);
  });

  it('collects parse errors instead of throwing, keeping the valid ADRs', async () => {
    await write('ADR-0002-keys.md', '---\nid: ADR-0002\ntitle: keys\nstatus: accepted\n---\n# keys\n');
    await write('ADR-0003-broken.md', '# no frontmatter at all\n');

    const { adrs, errors } = scanAdrDir(dir);
    expect(adrs.map((a) => a.id)).toEqual(['ADR-0002']);
    expect(errors).toHaveLength(1);
    expect(errors[0].filePath).toBe('ADR-0003-broken.md');
  });

  it('throws when the directory is unreadable', () => {
    expect(() => scanAdrDir(path.join(dir, 'does-not-exist'))).toThrow(/ADR directory/i);
  });
});
