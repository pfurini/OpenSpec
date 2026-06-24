import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCLI, ensureCliBuilt } from '../helpers/run-cli.js';

async function write(root: string, rel: string, content = 'x'): Promise<void> {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content);
}

describe('openspec reverse', () => {
  let dir: string;
  beforeAll(async () => {
    await ensureCliBuilt();
  });
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-reverse-cli-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('scan --json reports counts and candidate capabilities', async () => {
    await write(dir, 'src/auth/login.ts');
    await write(dir, 'src/billing/charge.ts');
    await write(dir, 'node_modules/pkg/index.js');

    const res = await runCLI(['reverse', 'scan', '--json'], { cwd: dir });
    expect(res.exitCode).toBe(0);
    const report = JSON.parse(res.stdout);
    expect(report.counts.source).toBe(2);
    const names = report.capabilities.map((c: { name: string }) => c.name);
    expect(names).toContain('auth');
    expect(names).toContain('billing');
  });

  it('scan marks capabilities that already have a spec', async () => {
    await write(dir, 'src/auth/login.ts');
    await write(dir, 'openspec/specs/auth/spec.md', '# auth Specification\n');

    const res = await runCLI(['reverse', 'scan', '--json'], { cwd: dir });
    expect(res.exitCode).toBe(0);
    const report = JSON.parse(res.stdout);
    const auth = report.capabilities.find((c: { name: string }) => c.name === 'auth');
    expect(auth.existing).toBe(true);
  });

  it('scaffold creates a draft spec; re-run is a no-op', async () => {
    const created = await runCLI(['reverse', 'scaffold', 'auth'], { cwd: dir });
    expect(created.exitCode).toBe(0);
    const specPath = path.join(dir, 'openspec', 'specs', 'auth', 'spec.md');
    expect(await fs.readFile(specPath, 'utf-8')).toContain('# auth Specification');

    const rerun = await runCLI(['reverse', 'scaffold', 'auth'], { cwd: dir });
    expect(rerun.exitCode).toBe(0);
    expect(rerun.stdout).toMatch(/Unchanged/);
  });

  it('scaffold rejects an invalid capability name', async () => {
    const res = await runCLI(['reverse', 'scaffold', 'Bad Name'], { cwd: dir });
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/Invalid capability name/);
  });
});
