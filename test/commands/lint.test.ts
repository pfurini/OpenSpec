import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCLI } from '../helpers/run-cli.js';

describe('lint command (adr-registry rule)', () => {
  let tempDir: string;
  let adrDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-lint-'));
    adrDir = path.join(tempDir, 'docs', 'adr');
    await fs.mkdir(adrDir, { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const adr = (id: string, title: string) =>
    `---\nid: ${id}\ntitle: ${title}\nstatus: accepted\ndate: 2026-05-17\n---\n# ${title}\n`;
  const writeAdr = (name: string, content: string) => fs.writeFile(path.join(adrDir, name), content);

  it('passes (exit 0) when there is no ADR directory', async () => {
    await fs.rm(adrDir, { recursive: true, force: true });
    const result = await runCLI(['lint', '--adr'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
  });

  it('fails (exit 1) when ADRs exist but the registry has not been generated', async () => {
    await writeAdr('ADR-0002-keys.md', adr('ADR-0002', 'keys'));
    const result = await runCLI(['lint', '--adr'], { cwd: tempDir });
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/missing|not generated/i);
    expect(result.stdout + result.stderr).toContain('openspec adr index');
  });

  it('passes after the registry is generated, then fails again on drift', async () => {
    await writeAdr('ADR-0002-keys.md', adr('ADR-0002', 'keys'));
    await runCLI(['adr', 'index', '--dir', adrDir], { cwd: tempDir });

    const ok = await runCLI(['lint', '--adr'], { cwd: tempDir });
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain('no issues');

    // add an ADR without regenerating -> drift
    await writeAdr('ADR-0003-slugs.md', adr('ADR-0003', 'slugs'));
    const drift = await runCLI(['lint', '--adr'], { cwd: tempDir });
    expect(drift.exitCode).toBe(1);
    expect(drift.stdout + drift.stderr).toMatch(/out of date|drift/i);
  });

  it('emits JSON with --json', async () => {
    await writeAdr('ADR-0002-keys.md', adr('ADR-0002', 'keys'));
    const result = await runCLI(['lint', '--adr', '--json'], { cwd: tempDir });
    const json = JSON.parse(result.stdout);
    expect(json.ok).toBe(false);
    expect(json.findings[0].ruleId).toBe('adr-registry');
  });
});
