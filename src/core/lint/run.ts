import path from 'node:path';
import type { LintContext, LintFinding, LintOptions, LintRule } from './types.js';
import { adrRegistryRule } from './rules/adr-registry.js';

/** All registered grounding-lint rules. New rules (Files-to-Change exist, design
 *  Open-Questions gate, …) are added here. */
export const ALL_RULES: LintRule[] = [adrRegistryRule];

export function selectRules(options: LintOptions): LintRule[] {
  if (options.adr) return ALL_RULES.filter((r) => r.id === 'adr-registry');
  return ALL_RULES;
}

export async function runLint(projectRoot: string, options: LintOptions = {}): Promise<LintFinding[]> {
  const ctx: LintContext = {
    projectRoot,
    adrDir: path.resolve(projectRoot, options.adrDir ?? 'docs/adr'),
  };

  const findings: LintFinding[] = [];
  for (const rule of selectRules(options)) {
    findings.push(...(await rule.run(ctx)));
  }
  return findings;
}
