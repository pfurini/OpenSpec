/**
 * ADR Command
 *
 * `openspec adr index` generates (or, with --check, verifies) the ADR registry —
 * a machine-generated index of the project's ADRs, derived from their frontmatter.
 * The registry is the single cheap-to-read surface that ADR-scaffolding workflows
 * consult for dedup, so it must be regenerated rather than hand-maintained.
 */

import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { scanAdrDir, renderRegistry, REGISTRY_MARKER } from '../core/adr/index.js';

export interface AdrIndexOptions {
  dir?: string;
  check?: boolean;
  force?: boolean;
  json?: boolean;
}

const DEFAULT_DIR = 'docs/adr';
const REGISTRY_FILE = 'README.md';

export async function adrIndexCommand(options: AdrIndexOptions): Promise<void> {
  const dir = options.dir ?? DEFAULT_DIR;
  const { adrs, errors } = scanAdrDir(dir); // throws if the dir is unreadable
  const content = renderRegistry(adrs);
  const target = path.join(dir, REGISTRY_FILE);
  const current = existsSync(target) ? readFileSync(target, 'utf-8') : null;

  if (options.check) {
    const inSync = current === content && errors.length === 0;
    if (options.json) {
      console.log(JSON.stringify({ dir, target, inSync, count: adrs.length, errors }, null, 2));
    } else if (inSync) {
      console.log(`ADR registry up to date (${adrs.length} ADRs).`);
    } else if (current !== content) {
      console.log(`ADR registry OUT OF SYNC. Run \`openspec adr index\` to refresh: ${target}`);
    }
    reportErrors(errors, options.json);
    if (!inSync) process.exitCode = 1;
    return;
  }

  // Write mode: never clobber a hand-written file (one lacking the generated marker).
  if (current !== null && !current.startsWith(REGISTRY_MARKER) && !options.force) {
    throw new Error(
      `Refusing to overwrite ${target}: it is not a generated registry (missing the generated marker). Use --force to overwrite.`
    );
  }
  writeFileSync(target, content);

  if (options.json) {
    console.log(JSON.stringify({ dir, target, written: true, count: adrs.length, errors }, null, 2));
  } else {
    console.log(`Wrote ADR registry: ${target} (${adrs.length} ADRs).`);
    reportErrors(errors, false);
  }
}

function reportErrors(errors: { filePath: string; message: string }[], json?: boolean): void {
  if (json || errors.length === 0) return;
  console.log(`⚠ ${errors.length} ADR file(s) skipped due to parse errors:`);
  for (const e of errors) {
    console.log(`  - ${e.filePath}: ${e.message}`);
  }
}
