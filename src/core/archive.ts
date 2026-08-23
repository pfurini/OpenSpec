import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { Validator } from './validation/validator.js';
import chalk from 'chalk';
import {
  emitStoreRootBanner,
  isRootSelectionError,
  resolveOpenSpecRoot,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
  isStoreSelectedRoot,
} from './root-selection.js';
import {
  findSpecUpdates,
  buildUpdatedSpec,
  writeUpdatedSpec,
  retireSpec,
  formatRetirementReport,
  type SpecCounts,
  type SpecUpdate,
} from './specs-apply.js';
import {
  METADATA_FILENAME,
  readRetireCapabilitiesMarker,
  type MetadataMarker,
} from '../utils/change-metadata.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';
import { confirmPrompt, isNonInteractivePromptError } from '../utils/interactive.js';
import { VALIDATION_MESSAGES } from './validation/constants.js';
import type { ValidationReport } from './validation/types.js';

/**
 * A change name that already carries its own `YYYY-MM-DD-` prefix is archived
 * under that name; only undated names get today's date prepended.
 */
export const ARCHIVE_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}-/;

/**
 * Names that keep their meaning inside double quotes in every shell we can be
 * pasted into. Anything else (spaces are fine, `$`, backticks, quotes and
 * backslashes are not) is replaced by a placeholder rather than handing the
 * user a command their shell would reinterpret.
 */
const PORTABLY_QUOTABLE_CHANGE_NAME = /^[A-Za-z0-9 ._\-/+=:,@]+$/;

const CHANGE_NAME_PLACEHOLDER = '<change-name>';

function quoteChangeName(changeName: string | undefined): string {
  if (!changeName || !PORTABLY_QUOTABLE_CHANGE_NAME.test(changeName)) {
    return CHANGE_NAME_PLACEHOLDER;
  }
  return `"${changeName}"`;
}

async function listActiveChangeNames(changesDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export interface ArchiveOptions {
  yes?: boolean;
  skipSpecs?: boolean;
  noValidate?: boolean;
  validate?: boolean;
  json?: boolean;
  store?: string;
  storePath?: string;
}

interface ArchiveDiagnostic {
  severity: 'error';
  code: string;
  message: string;
  fix?: string;
}

interface ArchiveResult {
  change: string;
  archivedAs: string;
  path: string;
  specsUpdated: boolean;
  totals?: SpecCounts;
  /** Non-blocking merge notices (already-synced no-ops, dropped notes, ...). */
  warnings?: string[];
}

/**
 * JSON mode is non-interactive: any point where the human flow would prompt or
 * print prose instead throws this error, which becomes a machine-readable
 * status entry with a non-zero exit code.
 */
class ArchiveBlockedError extends Error {
  readonly diagnostic: ArchiveDiagnostic;

  constructor(code: string, message: string, fix?: string) {
    super(message);
    this.name = 'ArchiveBlockedError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...(fix ? { fix } : {}),
    };
  }
}

function toArchiveDiagnostic(error: unknown): ArchiveDiagnostic {
  if (error instanceof ArchiveBlockedError) {
    return error.diagnostic;
  }
  if (isRootSelectionError(error)) {
    return error.diagnostic;
  }
  return {
    severity: 'error',
    code: 'archive_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

/** How many unaccounted lines an abort quotes before summarizing the rest. */
const MAX_QUOTED_UNACCOUNTED_LINES = 10;

/**
 * A rebuilt spec is retirable when the only thing wrong with it is that it has
 * no requirements left. The block parser and the validator genuinely disagree
 * about what counts as a requirement, so asking the validator makes "this spec
 * could not have been written anyway" true by construction.
 */
function isRetirableSpec(report: ValidationReport): boolean {
  const errors = report.issues.filter((issue) => issue.level === 'ERROR');
  return (
    errors.length > 0 &&
    errors.every((issue) => issue.message === VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS)
  );
}

/**
 * Recursively copy a directory. Used when fs.rename fails (e.g. EPERM on Windows).
 */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Move a directory from src to dest. On Windows, fs.rename() often fails with
 * EPERM when the directory is non-empty or another process has it open (IDE,
 * file watcher, antivirus). Fall back to copy-then-remove when rename fails
 * with EPERM or EXDEV.
 */
async function moveDirectory(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'EPERM' || code === 'EXDEV') {
      await copyDirRecursive(src, dest);
      await fs.rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

export class ArchiveCommand {
  async execute(changeName?: string, options: ArchiveOptions = {}): Promise<void> {
    const json = !!options.json;

    let root: ResolvedOpenSpecRoot;
    try {
      root = await resolveOpenSpecRoot({
        ...(options.store !== undefined ? { store: options.store } : {}),
        ...(options.storePath !== undefined ? { storePath: options.storePath } : {}),
      });
    } catch (error) {
      if (json && isRootSelectionError(error)) {
        this.printJsonFailure(undefined, toArchiveDiagnostic(error));
        return;
      }
      throw error;
    }

    if (json) {
      try {
        const result = await this.run(changeName, options, root, true);
        if (!result) {
          return;
        }
        console.log(JSON.stringify({ archive: result, root: toRootOutput(root) }, null, 2));
      } catch (error) {
        this.printJsonFailure(root, toArchiveDiagnostic(error));
      }
      return;
    }

    emitStoreRootBanner(root);
    await this.run(changeName, options, root, false);
  }

  private printJsonFailure(root: ResolvedOpenSpecRoot | undefined, diagnostic: ArchiveDiagnostic): void {
    console.log(
      JSON.stringify(
        {
          archive: null,
          ...(root ? { root: toRootOutput(root) } : {}),
          status: [diagnostic],
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }

  /**
   * Shared archive flow. In human mode (json=false) prompts and prose match
   * the historical behavior and cancellations return null. In JSON mode no
   * prose reaches stdout and every blocked path throws.
   */
  private async run(
    changeName: string | undefined,
    options: ArchiveOptions,
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): Promise<ArchiveResult | null> {
    const changesDir = root.changesDir;
    const archiveDir = root.archiveDir;
    const mainSpecsDir = root.specsDir;

    // Check if changes directory exists
    try {
      await fs.access(changesDir);
    } catch {
      throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
    }

    // Get change name interactively if not provided
    if (!changeName) {
      if (json) {
        throw new ArchiveBlockedError(
          'archive_change_name_required',
          'A change name is required: archive --json is non-interactive.',
          withStoreFlag(root, 'openspec archive <change-name> --json')
        );
      }
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new ArchiveBlockedError(
          'archive_no_terminal',
          'No terminal is available to select a change interactively.',
          `Name the change instead: ${this.rerunCommand(root, undefined, options)}`
        );
      }
      let selectedChange: string | null;
      try {
        selectedChange = await this.selectChange(changesDir);
      } catch (error) {
        if (isNonInteractivePromptError(error)) {
          throw new ArchiveBlockedError(
            'archive_selection_unanswered',
            'Change selection ended without an answer.',
            `Name the change instead: ${this.rerunCommand(root, undefined, options)}`
          );
        }
        throw error;
      }
      if (!selectedChange) {
        console.log('No change selected. Aborting.');
        process.exitCode = 1;
        return null;
      }
      changeName = selectedChange;
    }

    const changeDir = path.join(changesDir, changeName);

    // Verify change exists
    try {
      const stat = await fs.stat(changeDir);
      if (!stat.isDirectory()) {
        throw new Error(`Change '${changeName}' not found.`);
      }
    } catch {
      const available = await listActiveChangeNames(changesDir);
      throw new ArchiveBlockedError(
        'archive_change_not_found',
        available.length > 0
          ? `Change '${changeName}' not found. Available changes: ${available.join(', ')}`
          : `Change '${changeName}' not found. No active changes exist in this root.`
      );
    }

    const skipValidation = options.validate === false || options.noValidate === true;

    // Validate specs and change before archiving
    if (!skipValidation) {
      const validator = new Validator();
      let hasValidationErrors = false;

      // Validate proposal.md (informative only; human mode prints warnings)
      if (!json) {
        const changeFile = path.join(changeDir, 'proposal.md');
        try {
          await fs.access(changeFile);
          const changeReport = await validator.validateChange(changeFile);
          // Proposal validation is informative only (do not block archive)
          if (!changeReport.valid) {
            console.log(chalk.yellow(`\nProposal warnings in proposal.md (non-blocking):`));
            for (const issue of changeReport.issues) {
              const symbol = issue.level === 'ERROR' ? '⚠' : (issue.level === 'WARNING' ? '⚠' : 'ℹ');
              console.log(chalk.yellow(`  ${symbol} ${issue.message}`));
            }
          }
        } catch {
          // Change file doesn't exist, skip validation
        }
      }

      // Validate delta-formatted spec files under the change directory if present
      const changeSpecsDir = path.join(changeDir, 'specs');
      let hasDeltaSpecs = false;
      for (const { specFile } of await discoverSpecFiles(changeSpecsDir)) {
        try {
          const content = await fs.readFile(specFile, 'utf-8');
          if (/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/m.test(content)) {
            hasDeltaSpecs = true;
            break;
          }
        } catch {
          // Unreadable here only skips the delta-validation probe; the merge
          // reads the same file again and reports the failure for real.
        }
      }
      if (hasDeltaSpecs) {
        const deltaReport = await validator.validateChangeDeltaSpecs(changeDir);
        if (!deltaReport.valid) {
          hasValidationErrors = true;
          if (!json) {
            console.log(chalk.red(`\nValidation errors in change delta specs:`));
            for (const issue of deltaReport.issues) {
              if (issue.level === 'ERROR') {
                console.log(chalk.red(`  ✗ ${issue.message}`));
              } else if (issue.level === 'WARNING') {
                console.log(chalk.yellow(`  ⚠ ${issue.message}`));
              }
            }
          }
        }
      }

      if (hasValidationErrors) {
        if (json) {
          throw new ArchiveBlockedError(
            'archive_validation_failed',
            `Validation failed for change '${changeName}'.`,
            `Run ${withStoreFlag(root, `openspec validate ${changeName}`)} for details, fix the errors, or rerun with --no-validate.`
          );
        }
        console.log(chalk.red('\nValidation failed. Please fix the errors before archiving.'));
        console.log(chalk.yellow('To skip validation (not recommended), use --no-validate flag.'));
        process.exitCode = 1;
        return null;
      }
    } else if (json) {
      if (!options.yes) {
        throw new ArchiveBlockedError(
          'archive_confirmation_required',
          'Skipping validation requires confirmation: rerun with --yes.',
          withStoreFlag(root, 'openspec archive <change-name> --json --no-validate --yes')
        );
      }
    } else {
      // Log warning when validation is skipped
      const timestamp = new Date().toISOString();

      if (!options.yes) {
        const proceed = await this.confirmOrBlock(
          {
            message: chalk.yellow('⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)'),
            default: false,
          },
          'Skipping validation may archive invalid specs. Continue?',
          root,
          changeName,
          options
        );
        if (!proceed) {
          console.log('Archive cancelled.');
          process.exitCode = 1;
          return null;
        }
      } else {
        console.log(chalk.yellow(`\n⚠️  WARNING: Skipping validation may archive invalid specs.`));
      }

      console.log(chalk.yellow(`[${timestamp}] Validation skipped for change: ${changeName}`));
      console.log(chalk.yellow(`Affected files: ${changeDir}`));
    }

    // Show progress and check for incomplete tasks
    const progress = await getTaskProgressForChange(changesDir, changeName, path.resolve(changesDir, '..', '..'));
    if (!json) {
      const status = formatTaskStatus(progress);
      console.log(`Task status: ${status}`);
    }

    const incompleteTasks = Math.max(progress.total - progress.completed, 0);
    if (incompleteTasks > 0) {
      if (json) {
        if (!options.yes) {
          throw new ArchiveBlockedError(
            'archive_tasks_incomplete',
            `${incompleteTasks} incomplete task(s) found for change '${changeName}'.`,
            'Complete the tasks or rerun with --yes.'
          );
        }
      } else if (!options.yes) {
        const taskPrompt = `Warning: ${incompleteTasks} incomplete task(s) found. Continue?`;
        const proceed = await this.confirmOrBlock(
          { message: taskPrompt, default: false },
          taskPrompt,
          root,
          changeName,
          options
        );
        if (!proceed) {
          console.log('Archive cancelled.');
          process.exitCode = 1;
          return null;
        }
      } else {
        console.log(`Warning: ${incompleteTasks} incomplete task(s) found. Continuing due to --yes flag.`);
      }
    }

    // Settle the archive name and check the destination before any main spec is
    // modified, so a name collision can never leave half-merged specs behind.
    const archiveName = ARCHIVE_DATE_PREFIX_PATTERN.test(changeName)
      ? changeName
      : `${this.getArchiveDate()}-${changeName}`;
    const archivePath = path.join(archiveDir, archiveName);

    let archiveExists = false;
    try {
      await fs.access(archivePath);
      archiveExists = true;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    if (archiveExists) {
      throw new ArchiveBlockedError('archive_target_exists', `Archive '${archiveName}' already exists.`);
    }

    // Handle spec updates unless skipSpecs flag is set
    let specsUpdated = false;
    let totals: ArchiveResult['totals'];
    const warnings: string[] = [];
    if (options.skipSpecs) {
      if (!json) {
        console.log('Skipping spec updates (--skip-specs flag provided).');
      }
    } else {
      // Find specs to update
      const specUpdates = await findSpecUpdates(changeDir, mainSpecsDir);

      if (specUpdates.length > 0) {
        if (!json) {
          console.log('\nSpecs to update:');
          for (const update of specUpdates) {
            const status = update.exists ? 'update' : 'create';
            console.log(`  ${update.id}: ${status}`);
          }
        }

        let shouldUpdateSpecs = true;
        if (!options.yes) {
          if (json) {
            throw new ArchiveBlockedError(
              'archive_confirmation_required',
              `Updating ${specUpdates.length} spec(s) requires confirmation: rerun with --yes.`,
              withStoreFlag(root, 'openspec archive <change-name> --json --yes')
            );
          }
          shouldUpdateSpecs = await this.confirmOrBlock(
            { message: 'Proceed with spec updates?', default: true },
            'Proceed with spec updates?',
            root,
            changeName,
            options
          );
          if (!shouldUpdateSpecs) {
            console.log('Skipping spec updates. Proceeding with archive.');
          }
        }

        if (shouldUpdateSpecs) {
          // Prepare all updates first (validation pass, no writes)
          const prepared: Array<{
            update: SpecUpdate;
            rebuilt: string;
            counts: SpecCounts;
            unaccountedContent: string[];
            retire: boolean;
          }> = [];
          try {
            for (const update of specUpdates) {
              // Human mode: buildUpdatedSpec prints its own warnings as it goes.
              const built = await buildUpdatedSpec(update, changeName!, { silent: json });
              warnings.push(...built.warnings);
              prepared.push({
                update,
                rebuilt: built.rebuilt,
                counts: built.counts,
                unaccountedContent: built.unaccountedContent,
                retire: false,
              });
            }
          } catch (err: any) {
            if (json) {
              throw new ArchiveBlockedError(
                'archive_spec_update_failed',
                String(err.message || err),
                'Fix the change delta specs and rerun. No files were changed.'
              );
            }
            console.log(String(err.message || err));
            console.log('Aborted. No files were changed.');
            process.exitCode = 1;
            return null;
          }

          // Validate every rebuilt spec before writing any of them, so a
          // late validation failure really does leave all targets unchanged.
          // Retirement is opt-in per change, and only meaningful while the
          // rebuilt specs are being validated at all.
          const retireMarker = skipValidation
            ? { declared: false }
            : readRetireCapabilitiesMarker(changeDir);

          if (!skipValidation) {
            for (const p of prepared) {
              const specName = p.update.id;
              const report = await new Validator().validateSpecContent(specName, p.rebuilt);
              if (!report.valid) {
                const emptied = isRetirableSpec(report);
                if (
                  emptied &&
                  retireMarker.declared &&
                  p.counts.removed > 0 &&
                  p.update.exists &&
                  p.unaccountedContent.length === 0
                ) {
                  p.retire = true;
                  continue;
                }

                const hint = emptied
                  ? this.retirementHint({
                      specName,
                      displayPath: this.specDisplayPath(root, p.update),
                      marker: retireMarker,
                      unaccountedContent: p.unaccountedContent,
                      removed: p.counts.removed,
                      exists: p.update.exists,
                    })
                  : undefined;

                if (json) {
                  throw new ArchiveBlockedError(
                    'archive_spec_validation_failed',
                    `Rebuilt spec for '${specName}' failed validation. No files were changed.`,
                    hint ??
                      `Run ${withStoreFlag(root, `openspec validate ${specName}`)} after fixing the change deltas.`
                  );
                }
                console.log(chalk.red(`\nValidation errors in rebuilt spec for ${specName} (will not write changes):`));
                for (const issue of report.issues) {
                  if (issue.level === 'ERROR') console.log(chalk.red(`  ✗ ${issue.message}`));
                  else if (issue.level === 'WARNING') console.log(chalk.yellow(`  ⚠ ${issue.message}`));
                }
                if (hint) {
                  console.log(chalk.yellow(hint));
                }
                console.log('Aborted. No files were changed.');
                process.exitCode = 1;
                return null;
              }
            }
          }

          // All validations passed; write the specs this run actually changes.
          // A spec whose every operation was already synced is left untouched,
          // so re-archiving cannot rewrite a byte-identical file.
          const writeTotals: SpecCounts = { added: 0, modified: 0, removed: 0, renamed: 0 };
          for (const p of prepared) {
            if (p.retire) continue;
            const changed =
              p.counts.added + p.counts.modified + p.counts.removed + p.counts.renamed > 0;
            if (!changed) continue;
            await writeUpdatedSpec(p.update, p.rebuilt, p.counts, {
              silent: json,
              // Cross-root paths must be absolute when a store is selected.
              ...(isStoreSelectedRoot(root) ? { displayPath: p.update.target } : {}),
            });
            specsUpdated = true;
            writeTotals.added += p.counts.added;
            writeTotals.modified += p.counts.modified;
            writeTotals.removed += p.counts.removed;
            writeTotals.renamed += p.counts.renamed;
          }

          // Retirements come last: deleting a spec is the one step no later
          // failure can undo, so every write happens before any deletion.
          for (const p of prepared) {
            if (!p.retire) continue;
            const displayPath = this.specDisplayPath(root, p.update);
            const { retired } = await retireSpec(p.update, mainSpecsDir, {
              silent: json,
              displayPath,
            });
            if (!retired) continue;
            specsUpdated = true;
            writeTotals.removed += p.counts.removed;
            warnings.push(formatRetirementReport(displayPath));
          }

          totals = writeTotals;
          if (!json) {
            if (specsUpdated) {
              console.log(
                `Totals: + ${writeTotals.added}, ~ ${writeTotals.modified}, - ${writeTotals.removed}, → ${writeTotals.renamed}`
              );
              console.log('Specs updated successfully.');
            } else {
              console.log('Specs already in sync - no changes needed.');
            }
          }
        }
      }
    }

    // Create archive directory if needed
    await fs.mkdir(archiveDir, { recursive: true });

    // Move change to archive (uses copy+remove on EPERM/EXDEV, e.g. Windows)
    await moveDirectory(changeDir, archivePath);

    if (!json) {
      console.log(`Change '${changeName}' archived as '${archiveName}'.`);
    }

    return {
      change: changeName,
      archivedAs: archiveName,
      path: archivePath,
      specsUpdated,
      ...(totals ? { totals } : {}),
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  /**
   * The command that answers, in advance, whatever this run could not ask:
   * the caller's own flags plus `--yes`, inside the selected store.
   */
  private rerunCommand(
    root: ResolvedOpenSpecRoot,
    changeName: string | undefined,
    options: ArchiveOptions
  ): string {
    const flags: string[] = [];
    if (options.skipSpecs) flags.push('--skip-specs');
    if (options.validate === false || options.noValidate === true) flags.push('--no-validate');
    if (options.json) flags.push('--json');
    flags.push('--yes');
    return withStoreFlag(
      root,
      `openspec archive ${quoteChangeName(changeName)} ${flags.join(' ')}`
    );
  }

  /**
   * Asks a yes/no question that an unattended run cannot answer. A prompt that
   * ends without an answer must never read as "no" and exit 0: it names the
   * decision and the command that decides it up front.
   */
  private async confirmOrBlock(
    prompt: { message: string; default: boolean },
    decision: string,
    root: ResolvedOpenSpecRoot,
    changeName: string | undefined,
    options: ArchiveOptions
  ): Promise<boolean> {
    try {
      return await confirmPrompt(prompt);
    } catch (error) {
      if (isNonInteractivePromptError(error)) {
        throw new ArchiveBlockedError(
          'archive_confirmation_unanswered',
          `Archive stopped: the confirmation "${decision}" could not be answered because the input ended.`,
          `Answer it up front: ${this.rerunCommand(root, changeName, options)}`
        );
      }
      throw error;
    }
  }

  /**
   * The path a spec is reported by. Cross-root paths must be absolute when a
   * store is selected; otherwise the root-relative POSIX form reads the same on
   * every platform.
   */
  private specDisplayPath(root: ResolvedOpenSpecRoot, update: SpecUpdate): string {
    if (isStoreSelectedRoot(root)) {
      return update.target;
    }
    return path.posix.join('openspec', 'specs', ...update.id.split('/'), 'spec.md');
  }

  /**
   * Say what to do about a capability the change emptied but the archive will
   * not retire. Never a bare rejection: whichever obstacle applies is named,
   * and a marker that could not be honored always says why.
   */
  private retirementHint(context: {
    specName: string;
    displayPath: string;
    marker: MetadataMarker;
    unaccountedContent: string[];
    removed: number;
    exists: boolean;
  }): string {
    const { specName, displayPath, marker, unaccountedContent, removed, exists } = context;
    const parts: string[] = [];

    if (unaccountedContent.length > 0) {
      const quoted = unaccountedContent
        .slice(0, MAX_QUOTED_UNACCOUNTED_LINES)
        .map((line) => `    ${line}`);
      const extra = unaccountedContent.length - quoted.length;
      parts.push(
        `'${specName}' has no requirements left, but ${displayPath} still holds content the merge ` +
          `cannot account for, so it was not retired` +
          (marker.declared ? '' : ` (declaring retire_capabilities would not help)`) +
          `:\n${quoted.join('\n')}` +
          (extra > 0 ? `\n    ... and ${extra} more line(s)` : '') +
          `\nMove those lines into "## Purpose" or a requirement, or delete ${displayPath} deliberately, then rerun.`
      );
    } else if (!exists) {
      parts.push(
        `This change creates '${specName}' with no requirements. Add at least one ADDED requirement ` +
          `to the change's delta spec, then rerun.`
      );
    } else if (!marker.declared) {
      parts.push(
        `'${specName}' has no requirements left. To retire the capability, add ` +
          `"retire_capabilities: true" to ${METADATA_FILENAME} in the change and rerun; ` +
          `otherwise keep at least one requirement in the delta.`
      );
    } else if (removed === 0) {
      parts.push(
        `'${specName}' already had no requirements before this change, and this change removes none ` +
          `from it, so it was not retired. Delete ${displayPath} deliberately, or add the requirement ` +
          `removals to the change, then rerun.`
      );
    } else {
      parts.push(
        `'${specName}' has no requirements left and was not retired. Keep at least one requirement, ` +
          `or delete ${displayPath} deliberately, then rerun.`
      );
    }

    if (marker.invalidReason) {
      parts.push(
        `"retire_capabilities" in ${METADATA_FILENAME} could not be honored: ${marker.invalidReason}`
      );
    }

    return parts.join('\n');
  }

  private async selectChange(changesDir: string): Promise<string | null> {
    const { select } = await import('@inquirer/prompts');
    // Get all directories in changes (excluding archive)
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    const changeDirs = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'archive')
      .map(entry => entry.name)
      .sort();

    if (changeDirs.length === 0) {
      console.log('No active changes found.');
      return null;
    }

    // Build choices with progress inline to avoid duplicate lists
    let choices: Array<{ name: string; value: string }> = changeDirs.map(name => ({ name, value: name }));
    try {
      const progressList: Array<{ id: string; status: string }> = [];
      for (const id of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, id, path.resolve(changesDir, '..', '..'));
        const status = formatTaskStatus(progress);
        progressList.push({ id, status });
      }
      const nameWidth = Math.max(...progressList.map(p => p.id.length));
      choices = progressList.map(p => ({
        name: `${p.id.padEnd(nameWidth)}     ${p.status}`,
        value: p.id
      }));
    } catch {
      // If anything fails, fall back to simple names
      choices = changeDirs.map(name => ({ name, value: name }));
    }

    try {
      const answer = await select({
        message: 'Select a change to archive',
        choices
      });
      return answer;
    } catch (error) {
      // A prompt nothing could answer is the caller's to explain; a plain
      // cancellation (Ctrl+C) stays the quiet abort it has always been.
      if (isNonInteractivePromptError(error)) {
        throw error;
      }
      return null;
    }
  }

  private getArchiveDate(): string {
    // Returns date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  }
}
