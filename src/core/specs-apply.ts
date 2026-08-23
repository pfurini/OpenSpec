/**
 * Spec Application Logic
 *
 * Applies a change's delta specs to the main specs. The merge is idempotent:
 * an operation already reflected in the main spec is a warned no-op rather than
 * a failure, and the rebuilt file is byte-stable for well-formatted input.
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  extractRequirementsSection,
  parseDeltaSpec,
  normalizeRequirementName,
  foldRequirementName,
  findMissingCurrentScenarios,
  type RequirementBlock,
} from './parsers/requirement-blocks.js';
import { buildCodeFenceMask } from './parsers/code-fence.js';
import { findMainSpecStructureIssues } from './parsers/spec-structure.js';
import { MIN_PURPOSE_LENGTH } from './validation/constants.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SpecUpdate {
  source: string;
  target: string;
  exists: boolean;
}

export interface SpecCounts {
  added: number;
  modified: number;
  removed: number;
  renamed: number;
}

export interface BuildUpdatedSpecResult {
  rebuilt: string;
  /** Operations that actually changed the file; already-synced ones count zero. */
  counts: SpecCounts;
  /** Non-blocking notices the caller surfaces (human output and JSON alike). */
  warnings: string[];
  /** True when the rebuilt spec carries no requirement blocks at all. */
  noRequirementBlocks: boolean;
  /** Lines of the target spec the merge could not attribute to a known part. */
  unaccountedContent: string[];
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Find all delta spec files that need to be applied from a change.
 */
export async function findSpecUpdates(changeDir: string, mainSpecsDir: string): Promise<SpecUpdate[]> {
  const updates: SpecUpdate[] = [];
  const changeSpecsDir = path.join(changeDir, 'specs');

  try {
    const entries = await fs.readdir(changeSpecsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specFile = path.join(changeSpecsDir, entry.name, 'spec.md');
        const targetFile = path.join(mainSpecsDir, entry.name, 'spec.md');

        try {
          await fs.access(specFile);

          // Check if target exists
          let exists = false;
          try {
            await fs.access(targetFile);
            exists = true;
          } catch {
            exists = false;
          }

          updates.push({
            source: specFile,
            target: targetFile,
            exists,
          });
        } catch {
          // Source spec doesn't exist, skip
        }
      }
    }
  } catch {
    // No specs directory in change
  }

  return updates;
}

/**
 * Build an updated spec by applying delta operations.
 *
 * Returns the rebuilt content, the count of operations that actually changed
 * the file, and any non-blocking warnings the merge produced.
 */
export async function buildUpdatedSpec(
  update: SpecUpdate,
  changeName: string,
  options: { silent?: boolean } = {}
): Promise<BuildUpdatedSpecResult> {
  // Read change spec content (delta-format expected)
  const changeContent = await fs.readFile(update.source, 'utf-8');

  // Parse deltas from the change spec file
  const plan = parseDeltaSpec(changeContent);
  const specName = path.basename(path.dirname(update.target));

  const warnings: string[] = [];
  const warn = (message: string): void => {
    warnings.push(message);
    if (!options.silent) {
      console.log(chalk.yellow(`⚠️  Warning: ${message}`));
    }
  };
  const counts: SpecCounts = { added: 0, modified: 0, removed: 0, renamed: 0 };

  // Pre-validate duplicates within sections
  const addedNames = new Set<string>();
  for (const add of plan.added) {
    const name = normalizeRequirementName(add.name);
    if (addedNames.has(name)) {
      throw new Error(
        `${specName} validation failed - duplicate requirement in ADDED for header "### Requirement: ${add.name}"`
      );
    }
    addedNames.add(name);
  }
  const modifiedNames = new Set<string>();
  for (const mod of plan.modified) {
    const name = normalizeRequirementName(mod.name);
    if (modifiedNames.has(name)) {
      throw new Error(
        `${specName} validation failed - duplicate requirement in MODIFIED for header "### Requirement: ${mod.name}"`
      );
    }
    modifiedNames.add(name);
  }
  const removedNamesSet = new Set<string>();
  for (const rem of plan.removed) {
    const name = normalizeRequirementName(rem);
    if (removedNamesSet.has(name)) {
      throw new Error(
        `${specName} validation failed - duplicate requirement in REMOVED for header "### Requirement: ${rem}"`
      );
    }
    removedNamesSet.add(name);
  }
  const renamedFromSet = new Set<string>();
  const renamedToSet = new Set<string>();
  for (const { from, to } of plan.renamed) {
    const fromNorm = normalizeRequirementName(from);
    const toNorm = normalizeRequirementName(to);
    if (renamedFromSet.has(fromNorm)) {
      throw new Error(
        `${specName} validation failed - duplicate FROM in RENAMED for header "### Requirement: ${from}"`
      );
    }
    if (renamedToSet.has(toNorm)) {
      throw new Error(
        `${specName} validation failed - duplicate TO in RENAMED for header "### Requirement: ${to}"`
      );
    }
    renamedFromSet.add(fromNorm);
    renamedToSet.add(toNorm);
  }

  // Pre-validate cross-section conflicts
  const conflicts: Array<{ name: string; a: string; b: string }> = [];
  for (const n of modifiedNames) {
    if (removedNamesSet.has(n)) conflicts.push({ name: n, a: 'MODIFIED', b: 'REMOVED' });
    if (addedNames.has(n)) conflicts.push({ name: n, a: 'MODIFIED', b: 'ADDED' });
  }
  for (const n of addedNames) {
    if (removedNamesSet.has(n)) conflicts.push({ name: n, a: 'ADDED', b: 'REMOVED' });
  }
  // A rename whose source is also removed is a contradiction, including
  // spellings that differ only in case or interior whitespace.
  const removedByFold = new Map<string, string>();
  for (const rem of removedNamesSet) {
    removedByFold.set(foldRequirementName(rem), rem);
  }
  // Renamed interplay: MODIFIED must reference the NEW header, not FROM
  for (const { from, to } of plan.renamed) {
    const fromNorm = normalizeRequirementName(from);
    const toNorm = normalizeRequirementName(to);
    const removedTwin = removedByFold.get(foldRequirementName(from));
    if (removedTwin !== undefined) {
      throw new Error(
        `${specName} validation failed - requirement present in multiple sections (RENAMED and REMOVED) for header "### Requirement: ${from}"` +
          (removedTwin === fromNorm ? '' : ` (REMOVED spells it "### Requirement: ${removedTwin}")`)
      );
    }
    if (modifiedNames.has(fromNorm)) {
      throw new Error(
        `${specName} validation failed - when a rename exists, MODIFIED must reference the NEW header "### Requirement: ${to}"`
      );
    }
    // Detect ADDED colliding with a RENAMED TO
    if (addedNames.has(toNorm)) {
      throw new Error(
        `${specName} validation failed - RENAMED TO header collides with ADDED for "### Requirement: ${to}"`
      );
    }
  }
  if (conflicts.length > 0) {
    const c = conflicts[0];
    throw new Error(
      `${specName} validation failed - requirement present in multiple sections (${c.a} and ${c.b}) for header "### Requirement: ${c.name}"`
    );
  }
  const hasAnyDelta = plan.added.length + plan.modified.length + plan.removed.length + plan.renamed.length > 0;
  if (!hasAnyDelta) {
    throw new Error(
      `Delta parsing found no operations for ${path.basename(path.dirname(update.source))}. ` +
        `Provide ADDED/MODIFIED/REMOVED/RENAMED sections in change spec.`
    );
  }

  const deltaPurpose = extractPurposeSection(changeContent);

  // Load or create base target content
  let targetContent: string;
  let isNewSpec = false;
  try {
    targetContent = await fs.readFile(update.target, 'utf-8');
  } catch {
    // Target spec does not exist; MODIFIED and RENAMED are not allowed for new specs
    // REMOVED will be ignored with a warning since there's nothing to remove
    if (plan.modified.length > 0 || plan.renamed.length > 0) {
      throw new Error(
        `${specName}: target spec does not exist; only ADDED requirements are allowed for new specs. MODIFIED and RENAMED operations require an existing spec.`
      );
    }
    // Warn about REMOVED requirements being ignored for new specs
    if (plan.removed.length > 0) {
      warn(
        `${specName} - ${plan.removed.length} REMOVED requirement(s) ignored for new spec (nothing to remove).`
      );
    }
    isNewSpec = true;
    targetContent = buildSpecSkeleton(specName, changeName, carryablePurpose(specName, deltaPurpose, warn));
  }

  if (!isNewSpec && deltaPurpose !== undefined) {
    const mainPurpose = extractPurposeSection(targetContent);
    if (readableOverview(mainPurpose ?? '') !== readableOverview(deltaPurpose)) {
      warn(
        `${specName} - the delta's "## Purpose" differs from the main spec and was ignored; ` +
          `edit the main spec directly to change its Purpose.`
      );
    }
  }

  const structureIssues = findMainSpecStructureIssues(targetContent);
  if (structureIssues.length > 0) {
    const details = structureIssues
      .map(issue => `line ${issue.line}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `${specName}: target spec is structurally invalid and cannot be updated until fixed:\n${details}`
    );
  }

  // Extract requirements section and build name->block map
  const parts = extractRequirementsSection(targetContent);
  const nameToBlock = new Map<string, RequirementBlock>();
  for (const block of parts.bodyBlocks) {
    nameToBlock.set(normalizeRequirementName(block.name), block);
  }

  // Apply operations in order: RENAMED → REMOVED → MODIFIED → ADDED
  // RENAMED
  for (const r of plan.renamed) {
    const from = normalizeRequirementName(r.from);
    const to = normalizeRequirementName(r.to);
    if (!nameToBlock.has(from)) {
      const nearMiss = findNearMiss(nameToBlock, from);
      if (nearMiss !== undefined && nearMiss !== to) {
        throw new Error(
          `${specName} RENAMED failed for header "### Requirement: ${r.from}" - source not found; ` +
            `the main spec carries "### Requirement: ${nearMiss}", which differs only in case or spacing. Match the exact header.`
        );
      }
      if (nameToBlock.has(to)) {
        // The rename landed in an earlier sync of this change.
        warn(`${specName} - rename to "${to}" is already applied in the main spec (no-op).`);
        continue;
      }
      throw new Error(`${specName} RENAMED failed for header "### Requirement: ${r.from}" - source not found`);
    }
    if (nameToBlock.has(to)) {
      throw new Error(`${specName} RENAMED failed for header "### Requirement: ${r.to}" - target already exists`);
    }
    const block = nameToBlock.get(from)!;
    const newHeader = `### Requirement: ${to}`;
    const rawLines = block.raw.split('\n');
    rawLines[0] = newHeader;
    const renamedBlock: RequirementBlock = {
      headerLine: newHeader,
      name: to,
      raw: rawLines.join('\n'),
    };
    nameToBlock.delete(from);
    nameToBlock.set(to, renamedBlock);
    counts.renamed++;
  }

  // REMOVED
  for (const name of plan.removed) {
    const key = normalizeRequirementName(name);
    const existing = nameToBlock.get(key);
    if (!existing) {
      // For new specs, REMOVED requirements are already warned about and ignored
      if (isNewSpec) {
        continue;
      }
      const nearMiss = findNearMiss(nameToBlock, key);
      if (nearMiss !== undefined) {
        throw new Error(
          `${specName} REMOVED failed for header "### Requirement: ${name}" - not found; ` +
            `the main spec carries "### Requirement: ${nearMiss}", which differs only in case or spacing. Match the exact header.`
        );
      }
      warn(`${specName} - REMOVED requirement "${name}" is already gone from the main spec (no-op).`);
      continue;
    }
    warnAboutDroppedTail(specName, existing, undefined, 'removes', warn);
    nameToBlock.delete(key);
    counts.removed++;
  }

  // MODIFIED
  for (const mod of plan.modified) {
    const key = normalizeRequirementName(mod.name);
    const existing = nameToBlock.get(key);
    if (!existing) {
      throw new Error(`${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - not found`);
    }
    // Replace block with provided raw (ensure header line matches key)
    const modHeaderMatch = mod.raw.split('\n')[0].match(/^###\s*Requirement:\s*(.+)\s*$/i);
    if (!modHeaderMatch || normalizeRequirementName(modHeaderMatch[1]) !== key) {
      throw new Error(
        `${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - header mismatch in content`
      );
    }
    if (blocksMatch(existing.raw, mod.raw)) {
      // Already synced by an earlier run of this change.
      continue;
    }
    // A MODIFIED requirement replaces the whole block, so a scenario the block
    // omits would be dropped silently. Refuse instead, before anything is written.
    const missingScenarios = findMissingCurrentScenarios(existing.raw, mod.raw);
    if (missingScenarios.length > 0) {
      throw new Error(
        `${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - the block omits ` +
          `${missingScenarios.length} scenario(s) the main spec still carries: ` +
          `${missingScenarios.map((name) => `"${name}"`).join(', ')}. ` +
          `A MODIFIED requirement replaces the whole block, so copy every scenario you intend to keep into it.`
      );
    }
    warnAboutDroppedTail(specName, existing, mod, 'replaces', warn);
    nameToBlock.set(key, mod);
    counts.modified++;
  }

  // ADDED
  for (const add of plan.added) {
    const key = normalizeRequirementName(add.name);
    const existing = nameToBlock.get(key);
    if (existing && blocksMatch(existing.raw, add.raw)) {
      // Already synced by an earlier run of this change.
      continue;
    }
    if (existing) {
      warnAboutDroppedTail(specName, existing, add, 'replaces', warn);
    }
    nameToBlock.set(key, add);
    counts.added++;
  }

  // Duplicates within resulting map are implicitly prevented by key uniqueness.

  // Recompose requirements section preserving original ordering where possible
  const keptOrder: RequirementBlock[] = [];
  const seen = new Set<string>();
  for (const block of parts.bodyBlocks) {
    const key = normalizeRequirementName(block.name);
    const replacement = nameToBlock.get(key);
    if (replacement) {
      keptOrder.push(replacement);
      seen.add(key);
    }
  }
  // Append any newly added that were not in original order
  for (const [key, block] of nameToBlock.entries()) {
    if (!seen.has(key)) {
      keptOrder.push(block);
    }
  }

  const bodyParts = [parts.preamble.trim(), ...keptOrder.map((b) => b.raw.trim())];
  const rebuilt = [
    parts.before.trim(),
    parts.headerLine.trim(),
    bodyParts.filter((s) => s !== '').join('\n\n'),
    parts.after.trim(),
  ]
    .filter((s) => s !== '')
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n';

  return {
    rebuilt,
    counts,
    warnings,
    noRequirementBlocks: keptOrder.length === 0,
    // Audited on the spec as it stands, because retiring the capability deletes
    // that file: anything the merge cannot name would go with it.
    unaccountedContent: contentTheMergeCannotName(targetContent),
  };
}

/**
 * Delete a main spec whose last requirement this change removed, then prune the
 * directories the deletion empties.
 *
 * A spec that is already gone is not an error - the caller has nothing left to
 * retire. Any other failure is rethrown naming the path, because the archive
 * has already written the other specs and the author has to finish by hand.
 */
export async function retireSpec(
  update: SpecUpdate,
  mainSpecsDir: string,
  options: { silent?: boolean; displayPath?: string } = {}
): Promise<{ retired: boolean }> {
  const specName = path.basename(path.dirname(update.target));
  const displayPath =
    options.displayPath ?? path.posix.join('openspec', 'specs', specName, 'spec.md');

  try {
    await fs.unlink(update.target);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return { retired: false };
    }
    throw new Error(
      `Failed to retire ${update.target}: ${err?.message ?? String(err)}. ` +
        `Delete the file by hand and rerun the archive.`
    );
  }

  await pruneEmptyDirs(path.dirname(update.target), mainSpecsDir);

  if (!options.silent) {
    console.log(chalk.yellow(`⚠️  ${formatRetirementReport(displayPath)}`));
  }

  return { retired: true };
}

/**
 * The retirement report: what was deleted and how to get it back. Deleted specs
 * are recoverable from version control by construction, so the recovery hint is
 * the whole rollback story.
 */
export function formatRetirementReport(displayPath: string): string {
  return (
    `Retired capability spec ${displayPath} - this change removed its last requirement. ` +
    `Recover it with: git checkout HEAD -- ${displayPath}`
  );
}

/**
 * Write an updated spec to disk.
 */
export async function writeUpdatedSpec(
  update: SpecUpdate,
  rebuilt: string,
  counts: SpecCounts,
  options: { silent?: boolean; displayPath?: string } = {}
): Promise<void> {
  // Create target directory if needed
  const targetDir = path.dirname(update.target);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(update.target, rebuilt);

  if (options.silent) return;

  const specName = path.basename(path.dirname(update.target));
  console.log(`Applying changes to ${options.displayPath ?? `openspec/specs/${specName}/spec.md`}:`);
  if (counts.added) console.log(`  + ${counts.added} added`);
  if (counts.modified) console.log(`  ~ ${counts.modified} modified`);
  if (counts.removed) console.log(`  - ${counts.removed} removed`);
  if (counts.renamed) console.log(`  → ${counts.renamed} renamed`);
}

/**
 * Build a skeleton spec for new capabilities. A carried-over Purpose replaces
 * the TBD placeholder; callers vet it with `carryablePurpose` first.
 */
export function buildSpecSkeleton(specFolderName: string, changeName: string, purpose?: string): string {
  const body = purpose && purpose.trim()
    ? purpose.trim()
    : `TBD - created by archiving change ${changeName}. Update Purpose after archive.`;
  return `# ${specFolderName} Specification\n\n## Purpose\n${body}\n\n## Requirements\n`;
}

/**
 * Return the body of a spec's `## Purpose` section, or undefined when there is
 * none (headers inside fenced code blocks are examples, not sections).
 */
export function extractPurposeSection(content: string): string | undefined {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const fenced = buildCodeFenceMask(lines);
  const start = lines.findIndex((line, i) => !fenced[i] && /^##\s+Purpose\s*$/i.test(line));
  if (start === -1) {
    return undefined;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (!fenced[i] && /^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const body = lines.slice(start + 1, end).join('\n').trim();
  return body === '' ? undefined : body;
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

/**
 * Decide whether a delta's Purpose can be carried into a brand-new main spec.
 * A Purpose that is only scaffolding comments, or too brief to read as one,
 * would leave the new spec worse than the placeholder does.
 */
function carryablePurpose(
  specName: string,
  deltaPurpose: string | undefined,
  warn: (message: string) => void
): string | undefined {
  if (deltaPurpose === undefined) {
    return undefined;
  }
  if (readableOverview(deltaPurpose).length >= MIN_PURPOSE_LENGTH) {
    return deltaPurpose.trim();
  }
  warn(
    `${specName} - the delta's "## Purpose" is too brief to carry into the new spec ` +
      `(under ${MIN_PURPOSE_LENGTH} readable characters); the placeholder was used instead.`
  );
  return undefined;
}

/**
 * Remove `startDir` and each empty parent above it, stopping at the specs root.
 *
 * Bounds are compared on real paths so an aliased spelling of the root cannot
 * be walked past, and a symlinked directory is never followed or removed - the
 * link is not ours to delete, and its target may live outside the specs tree.
 */
async function pruneEmptyDirs(startDir: string, boundaryDir: string): Promise<void> {
  let boundary: string;
  try {
    boundary = await fs.realpath(boundaryDir);
  } catch {
    return;
  }

  let current = startDir;
  while (true) {
    let real: string;
    try {
      if ((await fs.lstat(current)).isSymbolicLink()) {
        return;
      }
      real = await fs.realpath(current);
    } catch {
      return;
    }

    if (real === boundary || !isWithin(boundary, real)) {
      return;
    }

    let entries: string[];
    try {
      entries = await fs.readdir(current);
    } catch {
      return;
    }
    if (entries.length > 0) {
      return;
    }

    try {
      await fs.rmdir(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

function isWithin(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const ATX_HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
const SETEXT_UNDERLINE = /^\s{0,3}(=+|-{3,})\s*$/;
const SCENARIO_BULLET = /^\s*([-*+]|\d+[.)])\s+\S/;
const BULLET_CONTINUATION = /^\s+\S/;

/**
 * Every non-blank line of a spec that the merge cannot attribute to a part it
 * understands: the title, the `## Purpose` section, the `## Requirements`
 * header, or a requirement's own header, statement, and scenario bullets.
 *
 * Everything else - a hand-written section, a setext or HTML heading, prose or
 * bullets written after a requirement's scenarios - is authored content that
 * deleting the file would lose. The audit fails safe: a line it cannot classify
 * is reported, so the retirement is refused rather than guessed.
 */
function contentTheMergeCannotName(content: string): string[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const fenced = buildCodeFenceMask(lines);
  const unaccounted: string[] = [];

  let section: 'preamble' | 'purpose' | 'requirements' | 'foreign' = 'preamble';
  let sawTitle = false;
  let inRequirement = false;
  let inScenario = false;
  let bulletRunBroken = false;

  const authored = (line: string): void => {
    unaccounted.push(line.trim());
    bulletRunBroken = true;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    if (fenced[i]) {
      // Fenced content belongs to whatever section encloses it.
      if (section === 'foreign') authored(line);
      continue;
    }

    const heading = ATX_HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();

      if (level === 1) {
        if (!sawTitle && section === 'preamble') {
          sawTitle = true;
          continue;
        }
        section = 'foreign';
        inRequirement = false;
        inScenario = false;
        authored(line);
        continue;
      }

      if (level === 2) {
        inRequirement = false;
        inScenario = false;
        bulletRunBroken = false;
        if (/^Purpose$/i.test(text)) {
          section = 'purpose';
          continue;
        }
        if (/^Requirements$/i.test(text)) {
          section = 'requirements';
          continue;
        }
        section = 'foreign';
        authored(line);
        continue;
      }

      if (section === 'purpose') {
        // Sub-headings inside Purpose are part of the Purpose body.
        continue;
      }

      if (section === 'requirements') {
        if (level === 3) {
          if (/^Requirement:\s*\S/i.test(text)) {
            inRequirement = true;
            inScenario = false;
            bulletRunBroken = false;
            continue;
          }
          inRequirement = false;
          inScenario = false;
          authored(line);
          continue;
        }
        if (inRequirement) {
          // #### and deeper are the requirement's scenarios.
          inScenario = true;
          bulletRunBroken = false;
          continue;
        }
      }

      authored(line);
      continue;
    }

    if (SETEXT_UNDERLINE.test(line)) {
      authored(line);
      continue;
    }

    if (section === 'purpose') continue;

    if (section === 'requirements' && inRequirement) {
      if (!inScenario) {
        // The requirement statement, between its header and its scenarios.
        continue;
      }
      if (!bulletRunBroken && (SCENARIO_BULLET.test(line) || BULLET_CONTINUATION.test(line))) {
        continue;
      }
      authored(line);
      continue;
    }

    authored(line);
  }

  return unaccounted;
}

/** Strip HTML comments, including an unterminated trailing one. */
function maskHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!--[\s\S]*$/, '');
}

/** The prose a reader actually sees: comments removed, blank lines dropped. */
function readableOverview(text: string): string {
  return maskHtmlComments(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n')
    .trim();
}

/** Compare two requirement blocks ignoring the spacing the rebuild normalizes. */
function blocksMatch(a: string, b: string): boolean {
  return normalizeBlockContent(a) === normalizeBlockContent(b);
}

function normalizeBlockContent(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trimEnd());
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line === '' && collapsed[collapsed.length - 1] === '') continue;
    collapsed.push(line);
  }
  while (collapsed.length > 0 && collapsed[0] === '') collapsed.shift();
  while (collapsed.length > 0 && collapsed[collapsed.length - 1] === '') collapsed.pop();
  return collapsed.join('\n');
}

/**
 * Find a requirement in the map whose name differs from `name` only in letter
 * case or interior whitespace. Such a name is a typo, not a missing
 * requirement, so callers refuse instead of treating the operation as a no-op.
 */
function findNearMiss(nameToBlock: Map<string, RequirementBlock>, name: string): string | undefined {
  const folded = foldRequirementName(name);
  for (const key of nameToBlock.keys()) {
    if (key !== name && foldRequirementName(key) === folded) {
      return key;
    }
  }
  return undefined;
}

/**
 * The first heading inside a requirement block that the merge does not
 * recognize as part of the requirement — a note written under the scenarios,
 * for example. `####` and deeper belong to scenarios; `#` to `###` do not.
 */
function firstForeignTail(raw: string): string | undefined {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const fenced = buildCodeFenceMask(lines);
  for (let i = 1; i < lines.length; i++) {
    if (fenced[i]) continue;
    if (/^#{1,3}\s+\S/.test(lines[i])) {
      return lines[i].trim();
    }
  }
  return undefined;
}

/**
 * Warn before an operation silently discards a foreign section carried inside
 * the requirement block it removes or replaces.
 */
function warnAboutDroppedTail(
  specName: string,
  existing: RequirementBlock,
  incoming: RequirementBlock | undefined,
  verb: 'removes' | 'replaces',
  warn: (message: string) => void
): void {
  const heading = firstForeignTail(existing.raw);
  if (heading === undefined) {
    return;
  }
  if (incoming && incoming.raw.split('\n').some((line) => line.trim() === heading)) {
    return;
  }
  warn(
    `${specName} - "${heading}" sits inside requirement "${existing.name}", which this change ${verb}, ` +
      `so it will be dropped; move it above "## Requirements" or under its own requirement to keep it.`
  );
}
