import { spawn } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, '..', '..');
export const cliEntry = path.join(projectRoot, 'dist', 'cli', 'index.js');

/**
 * Everything `tsc` reads to produce `dist/`. Anything newer than the build
 * output means the compiled CLI no longer matches the source under test.
 */
const BUILD_INPUTS = ['src', 'tsconfig.json', 'build.js'];

export type DistState = { fresh: true } | { fresh: false; reason: string };

function displayPath(target: string): string {
  return path.relative(projectRoot, target).split(path.sep).join('/');
}

function newestInput(): { mtimeMs: number; file: string } | undefined {
  let newest: { mtimeMs: number; file: string } | undefined;

  const visit = (target: string): void => {
    let stats;
    try {
      stats = statSync(target);
    } catch {
      // A build input that vanished mid-walk cannot date the build.
      return;
    }

    if (stats.isDirectory()) {
      for (const entry of readdirSync(target)) {
        visit(path.join(target, entry));
      }
      return;
    }

    if (!newest || stats.mtimeMs > newest.mtimeMs) {
      newest = { mtimeMs: stats.mtimeMs, file: target };
    }
  };

  for (const input of BUILD_INPUTS) {
    visit(path.join(projectRoot, input));
  }

  return newest;
}

/**
 * `dist/cli/index.js` dates the whole build: build.js wipes `dist/` first, so
 * every output belongs to the run that produced it. One stat, not a tree walk.
 */
export function inspectDist(): DistState {
  if (!existsSync(cliEntry)) {
    return { fresh: false, reason: `${displayPath(cliEntry)} is missing` };
  }

  const builtAtMs = statSync(cliEntry).mtimeMs;
  const newest = newestInput();

  if (newest && newest.mtimeMs > builtAtMs) {
    return {
      fresh: false,
      reason: `${displayPath(newest.file)} changed after the last build`,
    };
  }

  return { fresh: true };
}

function distStaleError(reason: string): Error {
  return new Error(
    [
      `The compiled CLI in dist/ is stale: ${reason}.`,
      'These tests spawn dist/cli/index.js, so this run would validate stale code.',
      'Fix: run `pnpm run build` (or `pnpm run gate`) and re-run the tests.',
    ].join('\n')
  );
}

let assertedFresh = false;

/**
 * Worker-side guard: verify, never build. Concurrent workers rebuilding the
 * same `dist/` would race against build.js wiping it, so the build belongs to
 * the global setup (single process, before any worker starts).
 */
export function assertDistFresh(): void {
  if (assertedFresh) {
    return;
  }

  const state = inspectDist();
  if (!state.fresh) {
    throw distStaleError(state.reason);
  }

  assertedFresh = true;
}

function runBuild(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['run', 'build'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const cause = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`\`pnpm run build\` failed (${cause}); cannot run tests against dist/.`));
    });
  });
}

let buildPromise: Promise<void> | undefined;

/**
 * Global-setup-side guard: rebuild `dist/` when it is missing or stale. A
 * failing build rejects, so a broken build surfaces instead of being masked.
 */
export async function ensureDistFresh(): Promise<void> {
  const state = inspectDist();
  if (state.fresh) {
    return;
  }

  console.log(`[vitest] Rebuilding dist/ before CLI tests: ${state.reason}.`);

  if (!buildPromise) {
    buildPromise = runBuild();
  }

  try {
    await buildPromise;
  } catch (error) {
    // Let a later run retry instead of replaying the failure from the memo.
    buildPromise = undefined;
    throw error;
  }

  const rebuilt = inspectDist();
  if (!rebuilt.fresh) {
    throw distStaleError(rebuilt.reason);
  }
}
