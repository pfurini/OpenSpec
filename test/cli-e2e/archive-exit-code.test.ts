import { afterAll, describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

/**
 * A bare OpenSpec project on disk. The archive exit-code contract has to be
 * observed on a real process: an in-process `process.exitCode` assertion cannot
 * prove what the CLI actually returns to a shell.
 */
async function makeProject(): Promise<{ projectDir: string; env: NodeJS.ProcessEnv }> {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-archive-exit-'));
  tempRoots.push(base);
  const projectDir = path.join(base, 'project');
  await fs.mkdir(path.join(projectDir, 'openspec', 'changes'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'openspec', 'specs'), { recursive: true });
  return {
    projectDir,
    // Isolate root resolution from any store registry on the host machine.
    env: { XDG_DATA_HOME: path.join(base, 'data') },
  };
}

async function writeChangeSpec(
  projectDir: string,
  changeName: string,
  capability: string,
  content: string
): Promise<void> {
  const specDir = path.join(projectDir, 'openspec', 'changes', changeName, 'specs', capability);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, 'spec.md'), content);
}

async function writeMainSpec(
  projectDir: string,
  capability: string,
  content: string
): Promise<string> {
  const specPath = path.join(projectDir, 'openspec', 'specs', capability, 'spec.md');
  await fs.mkdir(path.dirname(specPath), { recursive: true });
  await fs.writeFile(specPath, content);
  return specPath;
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec archive failure exit status', () => {
  it('exits non-zero when pre-archive validation fails', async () => {
    const { projectDir, env } = await makeProject();
    const changeName = 'invalid-delta';
    await writeChangeSpec(
      projectDir,
      changeName,
      'thing',
      [
        '# Thing - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Broken',
        'This requirement text has no modal verb and the block has no scenario.',
        '',
      ].join('\n')
    );

    const result = await runCLI(['archive', changeName, '--yes'], { cwd: projectDir, env });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Validation failed');
  }, 30000);

  it('exits non-zero and writes nothing when building the updated specs fails', async () => {
    const { projectDir, env } = await makeProject();
    const changeName = 'unbuildable-delta';
    const mainContent = [
      '# alpha Specification',
      '',
      '## Purpose',
      'Alpha capability purpose, long enough to be a real overview.',
      '',
      '## Requirements',
      '',
      '### Requirement: Alpha Rule',
      'The system SHALL keep the alpha rule.',
      '',
      '#### Scenario: Alpha holds',
      '- **WHEN** alpha runs',
      '- **THEN** the rule holds',
      '',
    ].join('\n');
    const mainSpecPath = await writeMainSpec(projectDir, 'alpha', mainContent);

    // REMOVED names a requirement the main spec does not have: the merge cannot
    // be built, so the flow must abort before any write.
    await writeChangeSpec(
      projectDir,
      changeName,
      'alpha',
      ['# Alpha - Changes', '', '## REMOVED Requirements', '', '### Requirement: Absent Rule', ''].join('\n')
    );

    const result = await runCLI(['archive', changeName, '--yes', '--no-validate'], {
      cwd: projectDir,
      env,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Aborted. No files were changed.');
    expect(await fs.readFile(mainSpecPath, 'utf-8')).toBe(mainContent);
  }, 30000);

  it('exits non-zero and writes nothing when a rebuilt spec fails validation', async () => {
    const { projectDir, env } = await makeProject();
    const changeName = 'rebuild-invalid';
    // The main spec already carries a scenario-less requirement, so the rebuilt
    // spec is invalid even though the delta itself validates.
    const mainContent = [
      '# beta Specification',
      '',
      '## Purpose',
      'Beta capability purpose, long enough to be a real overview.',
      '',
      '## Requirements',
      '',
      '### Requirement: Legacy Rule',
      'The system SHALL keep the legacy rule.',
      '',
    ].join('\n');
    const mainSpecPath = await writeMainSpec(projectDir, 'beta', mainContent);

    await writeChangeSpec(
      projectDir,
      changeName,
      'beta',
      [
        '# Beta - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: New Rule',
        'The system SHALL add the new rule.',
        '',
        '#### Scenario: New rule applies',
        '- **WHEN** beta runs',
        '- **THEN** the new rule applies',
        '',
      ].join('\n')
    );

    const result = await runCLI(['archive', changeName, '--yes'], { cwd: projectDir, env });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Aborted. No files were changed.');
    expect(await fs.readFile(mainSpecPath, 'utf-8')).toBe(mainContent);
  }, 30000);
});
