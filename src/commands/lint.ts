/**
 * Lint Command
 *
 * `openspec lint` runs deterministic grounding-lint rules — the enforced (not
 * prompt-hinted) counterpart to the checks workflows are told to perform. Rule #1
 * is ADR registry drift; the mechanism grows as more rules are added.
 */

import { runLint } from '../core/lint/index.js';

export interface LintCommandOptions {
  adr?: boolean;
  adrDir?: string;
  json?: boolean;
}

export async function lintCommand(options: LintCommandOptions): Promise<void> {
  const projectRoot = process.cwd();
  const findings = await runLint(projectRoot, { adr: options.adr, adrDir: options.adrDir });
  const errorCount = findings.filter((f) => f.severity === 'error').length;

  if (options.json) {
    console.log(JSON.stringify({ ok: errorCount === 0, findings }, null, 2));
  } else if (findings.length === 0) {
    console.log('Lint: no issues.');
  } else {
    for (const f of findings) {
      const tag = f.severity === 'error' ? 'error' : 'warn';
      console.log(`[${tag}] ${f.ruleId}: ${f.message}${f.fix ? `  (fix: ${f.fix})` : ''}`);
    }
  }

  if (errorCount > 0) process.exitCode = 1;
}
