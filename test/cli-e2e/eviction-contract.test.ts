/**
 * Eviction contract tracer (change: evict-upstream-surfaces).
 *
 * Asserts the END STATE of the eviction: no feedback/profile command surface,
 * a self-cleaning global config, and init installing exactly the full workflow
 * skill set. Committed in Wave 0 with `.fails` markers (expected-fail); each
 * later wave flips the markers its work turns green, and Wave 4 verifies the
 * whole contract is live.
 */
import { afterAll, describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * The post-prune bundle: `schemas/skills/` minus `feedback`, `openspec-onboard`,
 * `openspec-propose`, `openspec-ff-change`. Kept literal here — Wave 2's
 * enumeration-guard test owns constant<->bundle parity; this tracer owns the
 * observable install surface.
 */
const EXPECTED_SKILLS = [
  'openspec-apply-change',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-continue-change',
  'openspec-design',
  'openspec-explore',
  'openspec-new-change',
  'openspec-reverse',
  'openspec-sync-specs',
  'openspec-verify-change',
];

const RETIRED_KEYS = ['telemetry', 'profile', 'workflows'] as const;

const tempRoots: string[] = [];

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeTempBase(): Promise<string> {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-eviction-'));
  tempRoots.push(base);
  return base;
}

/**
 * Seeds an isolated XDG config home containing all three retired keys plus
 * keeper fields, and returns the paths. `noticeSeen: true` keeps the legacy
 * home-config telemetry merge (src/telemetry/config.ts) out of the picture.
 */
async function seedConfigHome(base: string): Promise<{ configHome: string; configPath: string }> {
  const configHome = path.join(base, 'config-home');
  const configDir = path.join(configHome, 'openspec');
  await fs.mkdir(configDir, { recursive: true });
  const configPath = path.join(configDir, 'config.json');
  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        telemetry: { anonymousId: 'tracer', noticeSeen: true },
        profile: 'core',
        workflows: ['explore'],
        featureFlags: { keep: true },
        tracerKeeper: 'stays',
      },
      null,
      2
    ) + '\n',
    'utf-8'
  );
  return { configHome, configPath };
}

describe('eviction contract (tracer)', () => {
  it.fails('root help has no feedback entry', async () => {
    const result = await runCLI(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: openspec');
    expect(result.stdout).not.toContain('feedback');
  });

  it.fails('config and init help have no profile surface', async () => {
    const configHelp = await runCLI(['config', '--help']);
    expect(configHelp.exitCode).toBe(0);
    expect(configHelp.stdout).not.toContain('profile');

    const initHelp = await runCLI(['init', '--help']);
    expect(initHelp.exitCode).toBe(0);
    expect(initHelp.stdout).not.toContain('--profile');
  });

  it.fails('global config with retired keys loads silently and clean', async () => {
    const base = await makeTempBase();
    const { configHome } = await seedConfigHome(base);

    const result = await runCLI(['config', 'list', '--json'], {
      env: { XDG_CONFIG_HOME: configHome },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const config = JSON.parse(result.stdout);
    for (const key of RETIRED_KEYS) {
      expect(config).not.toHaveProperty(key);
    }
    expect(config.featureFlags?.keep).toBe(true);
    expect(config.tracerKeeper).toBe('stays');
  });

  it.fails('retired keys are dropped on the next config write', async () => {
    const base = await makeTempBase();
    const { configHome, configPath } = await seedConfigHome(base);

    const result = await runCLI(['config', 'set', 'featureFlags.tracer', 'true'], {
      env: { XDG_CONFIG_HOME: configHome },
    });
    expect(result.exitCode).toBe(0);

    const written = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    for (const key of RETIRED_KEYS) {
      expect(written).not.toHaveProperty(key);
    }
    expect(written.featureFlags?.tracer).toBe(true);
    expect(written.featureFlags?.keep).toBe(true);
    expect(written.tracerKeeper).toBe('stays');
  });

  it.fails(
    'init installs exactly the full workflow skill set, ignoring retired config keys',
    async () => {
      const base = await makeTempBase();
      const { configHome } = await seedConfigHome(base);
      const projectDir = path.join(base, 'project');
      await fs.mkdir(projectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'claude'], {
        cwd: projectDir,
        env: { XDG_CONFIG_HOME: configHome },
        timeoutMs: 20000,
      });
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OpenSpec Setup Complete');

      const installed = (await fs.readdir(path.join(projectDir, '.agents', 'skills'))).sort();
      expect(installed).toEqual(EXPECTED_SKILLS);
    },
    30000
  );
});
