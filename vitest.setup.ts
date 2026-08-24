import { readFileSync } from 'fs';

import { ensureDistFresh } from './test/helpers/dist-freshness.js';

/**
 * Test files that spawn the compiled CLI reach it through this helper, so its
 * import is the marker for "this run needs a fresh dist/".
 */
const CLI_HELPER_MARKER = 'helpers/run-cli';

/** The slice of Vitest's TestProject this setup depends on. */
interface GlobalSetupProject {
  vitest?: {
    state?: { getPaths?: () => string[] };
    filenamePattern?: string[];
  };
  globTestFiles?: (filters?: string[]) => Promise<{ testFiles: string[] }>;
}

async function resolveRunFiles(project: GlobalSetupProject): Promise<string[] | undefined> {
  // Vitest resolves the run's files (globs plus CLI filters) before invoking
  // global setup, so this is the exact list, focused runs included.
  const paths = project?.vitest?.state?.getPaths?.();
  if (Array.isArray(paths) && paths.length > 0) {
    return paths;
  }

  const globbed = await project?.globTestFiles?.(project?.vitest?.filenamePattern);
  if (Array.isArray(globbed?.testFiles) && globbed.testFiles.length > 0) {
    return globbed.testFiles;
  }

  return undefined;
}

function usesCompiledCli(file: string): boolean {
  try {
    return readFileSync(file, 'utf-8').includes(CLI_HELPER_MARKER);
  } catch {
    // Unreadable file: assume it needs the CLI rather than skip the guard.
    return true;
  }
}

export async function setup(project: GlobalSetupProject) {
  const files = await resolveRunFiles(project);

  // An unknown file list falls back to guarding the run: a needless build costs
  // time, a skipped one lets tests validate stale code.
  if (files && !files.some(usesCompiledCli)) {
    return;
  }

  await ensureDistFresh();
}

// Global teardown to ensure clean exit
export async function teardown() {
  // Force exit after a short grace period if the process hasn't exited cleanly.
  // This handles cases where child processes or open handles keep the worker alive.
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}
