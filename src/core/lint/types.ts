export type LintSeverity = 'error' | 'warning';

export interface LintFinding {
  ruleId: string;
  severity: LintSeverity;
  message: string;
  /** A suggested command/action that resolves the finding. */
  fix?: string;
}

export interface LintContext {
  projectRoot: string;
  /** Resolved absolute path to the project's ADR directory. */
  adrDir: string;
}

export interface LintRule {
  id: string;
  description: string;
  run(ctx: LintContext): LintFinding[] | Promise<LintFinding[]>;
}

export interface LintOptions {
  /** Run only the ADR rule. */
  adr?: boolean;
  /** Override the ADR directory (default: docs/adr). */
  adrDir?: string;
}
