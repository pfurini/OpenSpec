import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { scanAdrDir, renderRegistry, type ParsedAdr } from '../../adr/index.js';
import type { LintFinding, LintRule } from '../types.js';

const RULE_ID = 'adr-registry';
const FIX = 'openspec adr index';

/**
 * Pure check: given the parsed ADRs, parse errors, and the current registry file
 * content (null if absent), report drift / missing-registry / malformed-ADR
 * findings. The deterministic counterpart to the prompt-level drift hint.
 */
export function checkAdrRegistry(args: {
  adrs: ParsedAdr[];
  errors: { filePath: string; message: string }[];
  registryContent: string | null;
  adrDirExists: boolean;
}): LintFinding[] {
  if (!args.adrDirExists) return [];

  const findings: LintFinding[] = [];

  for (const err of args.errors) {
    findings.push({
      ruleId: RULE_ID,
      severity: 'error',
      message: `ADR ${err.filePath} failed to parse: ${err.message}`,
    });
  }

  const expected = renderRegistry(args.adrs);
  if (args.registryContent === null) {
    findings.push({
      ruleId: RULE_ID,
      severity: 'error',
      message: 'ADR registry (README.md in the ADR dir) is missing / not generated.',
      fix: FIX,
    });
  } else if (args.registryContent !== expected) {
    findings.push({
      ruleId: RULE_ID,
      severity: 'error',
      message: 'ADR registry is out of date (drift vs ADR frontmatter).',
      fix: FIX,
    });
  }

  return findings;
}

/** The ADR-registry rule: reads the dir + registry file, delegates to checkAdrRegistry. */
export const adrRegistryRule: LintRule = {
  id: RULE_ID,
  description: 'ADR registry (README.md in the ADR dir) is in sync with ADR frontmatter',
  run(ctx) {
    if (!existsSync(ctx.adrDir)) return []; // no ADRs in this project — nothing to lint
    const { adrs, errors } = scanAdrDir(ctx.adrDir);
    const registryPath = path.join(ctx.adrDir, 'README.md');
    const registryContent = existsSync(registryPath) ? readFileSync(registryPath, 'utf-8') : null;
    return checkAdrRegistry({ adrs, errors, registryContent, adrDirExists: true });
  },
};
