import { afterAll, describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

function specBody(title: string, requirement: string): string {
  return [
    `# ${title} Specification`,
    '',
    '## Purpose',
    `Rules for ${title}, covering the behavior this capability owns.`,
    '',
    '## Requirements',
    '',
    `### Requirement: ${requirement}`,
    'The system SHALL behave as specified.',
    '',
    '#### Scenario: Happy path',
    '- **WHEN** the feature is exercised',
    '- **THEN** it behaves as specified',
    '',
  ].join('\n');
}

/**
 * A project whose specs live at mixed depths. `spec` commands read the cwd, so
 * the ids have to resolve against a real tree in a real process.
 */
async function makeProject(): Promise<{ projectDir: string; env: NodeJS.ProcessEnv }> {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-spec-nested-'));
  tempRoots.push(base);
  const projectDir = path.join(base, 'project');
  const specsDir = path.join(projectDir, 'openspec', 'specs');
  await fs.mkdir(path.join(projectDir, 'openspec', 'changes'), { recursive: true });

  for (const [id, requirement] of [
    ['platform/session', 'Session Lifetime'],
    ['alphabet', 'Ordering'],
    ['Zeta', 'Ordering'],
  ] as const) {
    const file = path.join(specsDir, ...id.split('/'), 'spec.md');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, specBody(id, requirement));
  }

  // Directly in the specs root: not a capability, must never be listed.
  await fs.writeFile(path.join(specsDir, 'spec.md'), specBody('stray', 'Stray'));

  return {
    projectDir,
    env: { XDG_DATA_HOME: path.join(base, 'data') },
  };
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec spec with nested capability folders', () => {
  it('lists nested specs by their path id, code-point ordered', async () => {
    const { projectDir, env } = await makeProject();

    const result = await runCLI(['spec', 'list'], { cwd: projectDir, env });

    expect(result.exitCode).toBe(0);
    const ids = result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
    expect(ids).toEqual(['Zeta', 'alphabet', 'platform/session']);
  }, 30000);

  it('shows and validates a nested spec by its path id', async () => {
    const { projectDir, env } = await makeProject();

    const shown = await runCLI(['spec', 'show', 'platform/session'], { cwd: projectDir, env });
    expect(shown.exitCode).toBe(0);
    expect(shown.stdout).toContain('### Requirement: Session Lifetime');

    const validated = await runCLI(['spec', 'validate', 'platform/session'], {
      cwd: projectDir,
      env,
    });
    expect(validated.exitCode).toBe(0);
    expect(validated.stdout).toContain("Specification 'platform/session' is valid");
  }, 30000);

  it('routes nested specs through top-level show and bulk validate', async () => {
    const { projectDir, env } = await makeProject();

    const shown = await runCLI(['show', 'platform/session'], { cwd: projectDir, env });
    expect(shown.exitCode).toBe(0);
    expect(shown.stdout).toContain('Session Lifetime');

    const validated = await runCLI(['validate', '--specs', '--json', '--no-interactive'], {
      cwd: projectDir,
      env,
    });
    expect(validated.exitCode).toBe(0);
    const parsed = JSON.parse(validated.stdout);
    const ids = parsed.items.map((item: { id: string }) => item.id);
    expect(ids).toContain('platform/session');
    expect(parsed.summary.totals.failed).toBe(0);
  }, 30000);

  it('does not treat a spec.md in the specs root as a spec', async () => {
    const { projectDir, env } = await makeProject();

    const result = await runCLI(['spec', 'list'], { cwd: projectDir, env });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('stray');
  }, 30000);
});
