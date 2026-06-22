/**
 * `openspec reverse` — deterministic helpers for brownfield spec baselining.
 *
 * These commands do NO inference (no language model): `scan` inventories the repo
 * and proposes a candidate capability map; `scaffold` writes a canonical draft spec
 * skeleton. The `openspec-reverse` skill orchestrates them and supplies the judgment.
 */
import type { program } from '../cli/index.js';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { OPENSPEC_DIR_NAME } from '../core/config.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { buildInventory } from '../core/reverse/inventory.js';
import { deriveCapabilities } from '../core/reverse/capabilities.js';
import { scaffoldCapabilitySpec } from '../core/reverse/scaffold.js';

/** Existing capability dir names under `<root>/openspec/specs/`. */
function listExistingCapabilities(scanRoot: string): string[] {
  const specsDir = path.join(scanRoot, OPENSPEC_DIR_NAME, 'specs');
  try {
    return readdirSync(specsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export function registerReverseCommand(rootProgram: typeof program) {
  const reverse = rootProgram
    .command('reverse')
    .description('Brownfield helpers: inventory a codebase and scaffold draft baseline specs');

  reverse
    .command('scan')
    .description('Inventory the codebase and propose a candidate capability map (read-only)')
    .option('--path <dir>', 'Directory to scan (defaults to current directory)')
    .option('--json', 'Output as JSON')
    .action(async (options: { path?: string; json?: boolean }) => {
      try {
        const scanRoot = path.resolve(options.path ?? process.cwd());
        const inventory = await buildInventory(scanRoot);
        const capabilities = deriveCapabilities(
          inventory,
          listExistingCapabilities(scanRoot),
        );

        if (options.json) {
          console.log(
            JSON.stringify(
              { root: inventory.root, counts: inventory.counts, languages: inventory.languages, capabilities },
              null,
              2,
            ),
          );
          return;
        }

        const { counts, languages } = inventory;
        console.log(`Scanned ${inventory.root}`);
        console.log(`  ${counts.total} files — ${counts.source} source, ${counts.test} test, ${counts.doc} doc`);
        const langs = Object.entries(languages)
          .filter(([lang]) => lang !== 'unknown')
          .sort((a, b) => b[1] - a[1])
          .map(([lang, n]) => `${lang} (${n})`)
          .join(', ');
        if (langs) console.log(`  Languages: ${langs}`);
        console.log('');
        console.log(`Candidate capabilities (${capabilities.length}):`);
        for (const c of capabilities) {
          const mark = c.existing ? ' [already specified]' : '';
          console.log(`  ${c.name} — ${c.fileCount} files${mark}`);
        }
        console.log('');
        console.log('Drafts are unreviewed. Run the openspec-reverse skill to extract specs per capability.');
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exitCode = 1;
      }
    });

  reverse
    .command('scaffold <capability>')
    .description('Create an idempotent draft baseline spec skeleton for a capability')
    .option('--path <dir>', 'Project root containing openspec/ (defaults to current directory)')
    .option('--purpose <text>', 'Purpose text for the spec (defaults to a TBD placeholder)')
    .option('--force', 'Overwrite an existing spec even if it contains non-skeleton content')
    .action(async (capability: string, options: { path?: string; purpose?: string; force?: boolean }) => {
      try {
        const projectRoot = path.resolve(options.path ?? process.cwd());
        const openspecDir = FileSystemUtils.joinPath(projectRoot, OPENSPEC_DIR_NAME);
        const result = await scaffoldCapabilitySpec(openspecDir, capability, {
          purpose: options.purpose,
          force: options.force,
        });
        if (result.written) {
          console.log(`Scaffolded ${result.specPath}`);
        } else {
          console.log(`Unchanged (existing skeleton): ${result.specPath}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exitCode = 1;
      }
    });
}
