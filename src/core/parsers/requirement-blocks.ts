import { buildCodeFenceMask } from './code-fence.js';

export interface RequirementBlock {
  headerLine: string; // e.g., '### Requirement: Something'
  name: string; // e.g., 'Something'
  raw: string; // full block including headerLine and following content
}

export interface RequirementsSectionParts {
  before: string; // raw content before the '## Requirements' line
  headerLine: string; // the '## Requirements' line
  preamble: string; // content between headerLine and first requirement block
  bodyBlocks: RequirementBlock[]; // parsed requirement blocks in order
  after: string; // raw content from the next top-level section onwards
}

export function normalizeRequirementName(name: string): string {
  return name.trim();
}

/**
 * Folds a requirement name to the identity used for near-miss detection: two
 * names that fold to the same string differ only in letter case or interior
 * whitespace, which is a typo rather than a different requirement.
 */
export function foldRequirementName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const REQUIREMENT_HEADER_REGEX = /^###\s*Requirement:\s*(.+)\s*$/i;

/** A scenario header is any `#### ` heading, exactly four hashes deep. */
const SCENARIO_HEADER_REGEX = /^####(?!#)\s+(.+?)\s*$/;

/**
 * The scenario headers a requirement block carries, in order and one entry per
 * instance. Any non-fenced `#### ` header counts, matching the validator's
 * notion of a scenario; headers inside fenced code blocks are examples.
 */
export function parseScenarioBlocks(blockRaw: string): string[] {
  const lines = normalizeLineEndings(blockRaw).split('\n');
  const fenced = buildCodeFenceMask(lines);
  const names: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (fenced[index]) continue;
    const match = line.match(SCENARIO_HEADER_REGEX);
    if (match) {
      names.push(match[1].trim());
    }
  }
  return names;
}

/**
 * The scenarios `current` carries that `incoming` would drop. Matching is per
 * instance, so N copies of a name in the current block need N in the incoming
 * one; names are compared folded, since case and interior spacing are spelling,
 * not identity. Returned names keep the current block's spelling.
 *
 * One comparison shared by the archive merge and the validator, so the two can
 * never disagree about what counts as a dropped scenario.
 */
export function findMissingCurrentScenarios(current: string, incoming: string): string[] {
  const available = new Map<string, number>();
  for (const name of parseScenarioBlocks(incoming)) {
    const key = foldRequirementName(name);
    available.set(key, (available.get(key) ?? 0) + 1);
  }

  const missing: string[] = [];
  for (const name of parseScenarioBlocks(current)) {
    const key = foldRequirementName(name);
    const remaining = available.get(key) ?? 0;
    if (remaining > 0) {
      available.set(key, remaining - 1);
    } else {
      missing.push(name);
    }
  }
  return missing;
}

/**
 * Extracts the Requirements section from a spec file and parses requirement blocks.
 */
export function extractRequirementsSection(content: string): RequirementsSectionParts {
  const normalized = normalizeLineEndings(content);
  const lines = normalized.split('\n');
  const fenced = buildCodeFenceMask(lines);
  const reqHeaderIndex = lines.findIndex(
    (l, i) => !fenced[i] && /^##\s+Requirements\s*$/i.test(l)
  );

  if (reqHeaderIndex === -1) {
    // No requirements section; create an empty one at the end
    return {
      before: normalized,
      headerLine: '## Requirements',
      preamble: '',
      bodyBlocks: [],
      after: '',
    };
  }

  // Find end of this section: next line that starts with '## ' at same or higher level
  let endIndex = lines.length;
  for (let i = reqHeaderIndex + 1; i < lines.length; i++) {
    if (!fenced[i] && /^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const before = lines.slice(0, reqHeaderIndex).join('\n');
  const headerLine = lines[reqHeaderIndex];
  const sectionBodyLines = lines.slice(reqHeaderIndex + 1, endIndex);
  const sectionFenced = fenced.slice(reqHeaderIndex + 1, endIndex);
  const isRequirementHeader = (index: number): boolean =>
    !sectionFenced[index] && REQUIREMENT_HEADER_REGEX.test(sectionBodyLines[index]);

  // Parse requirement blocks within section body
  const blocks: RequirementBlock[] = [];
  let cursor = 0;
  let preambleLines: string[] = [];

  // Collect preamble lines until first requirement header
  while (cursor < sectionBodyLines.length && !isRequirementHeader(cursor)) {
    preambleLines.push(sectionBodyLines[cursor]);
    cursor++;
  }

  while (cursor < sectionBodyLines.length) {
    const headerLineCandidate = sectionBodyLines[cursor];
    if (!isRequirementHeader(cursor)) {
      // Not a requirement header; skip line defensively
      cursor++;
      continue;
    }
    const headerMatch = headerLineCandidate.match(REQUIREMENT_HEADER_REGEX)!;
    const name = normalizeRequirementName(headerMatch[1]);
    cursor++;
    // Gather lines until next requirement header or end of section
    const bodyLines: string[] = [headerLineCandidate];
    while (
      cursor < sectionBodyLines.length &&
      !isRequirementHeader(cursor) &&
      !(!sectionFenced[cursor] && /^##\s+/.test(sectionBodyLines[cursor]))
    ) {
      bodyLines.push(sectionBodyLines[cursor]);
      cursor++;
    }
    const raw = bodyLines.join('\n').trimEnd();
    blocks.push({ headerLine: headerLineCandidate, name, raw });
  }

  return {
    before,
    headerLine,
    preamble: preambleLines.join('\n').trimEnd(),
    bodyBlocks: blocks,
    after: lines.slice(endIndex).join('\n'),
  };
}

export interface DeltaPlan {
  added: RequirementBlock[];
  modified: RequirementBlock[];
  removed: string[]; // requirement names
  renamed: Array<{ from: string; to: string }>;
  sectionPresence: {
    added: boolean;
    modified: boolean;
    removed: boolean;
    renamed: boolean;
  };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/**
 * Parse a delta-formatted spec change file content into a DeltaPlan with raw blocks.
 */
export function parseDeltaSpec(content: string): DeltaPlan {
  const normalized = normalizeLineEndings(content);
  const sections = splitTopLevelSections(normalized);
  const addedLookup = getSectionCaseInsensitive(sections, 'ADDED Requirements');
  const modifiedLookup = getSectionCaseInsensitive(sections, 'MODIFIED Requirements');
  const removedLookup = getSectionCaseInsensitive(sections, 'REMOVED Requirements');
  const renamedLookup = getSectionCaseInsensitive(sections, 'RENAMED Requirements');
  const added = parseRequirementBlocksFromSection(addedLookup.body);
  const modified = parseRequirementBlocksFromSection(modifiedLookup.body);
  const removedNames = parseRemovedNames(removedLookup.body);
  const renamedPairs = parseRenamedPairs(renamedLookup.body);
  return {
    added,
    modified,
    removed: removedNames,
    renamed: renamedPairs,
    sectionPresence: {
      added: addedLookup.found,
      modified: modifiedLookup.found,
      removed: removedLookup.found,
      renamed: renamedLookup.found,
    },
  };
}

function splitTopLevelSections(content: string): Record<string, string> {
  const lines = content.split('\n');
  const fenced = buildCodeFenceMask(lines);
  const result: Record<string, string> = {};
  const indices: Array<{ title: string; index: number; level: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = fenced[i] ? null : lines[i].match(/^(##)\s+(.+)$/);
    if (m) {
      const level = m[1].length; // only care for '##'
      indices.push({ title: m[2].trim(), index: i, level });
    }
  }
  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    const body = lines.slice(current.index + 1, next ? next.index : lines.length).join('\n');
    result[current.title] = body;
  }
  return result;
}

function getSectionCaseInsensitive(sections: Record<string, string>, desired: string): { body: string; found: boolean } {
  const target = desired.toLowerCase();
  for (const [title, body] of Object.entries(sections)) {
    if (title.toLowerCase() === target) return { body, found: true };
  }
  return { body: '', found: false };
}

function parseRequirementBlocksFromSection(sectionBody: string): RequirementBlock[] {
  if (!sectionBody) return [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  const fenced = buildCodeFenceMask(lines);
  const isRequirementHeader = (index: number): boolean =>
    !fenced[index] && REQUIREMENT_HEADER_REGEX.test(lines[index]);
  const blocks: RequirementBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    // Seek next requirement header
    while (i < lines.length && !isRequirementHeader(i)) i++;
    if (i >= lines.length) break;
    const headerLine = lines[i];
    const m = headerLine.match(REQUIREMENT_HEADER_REGEX)!;
    const name = normalizeRequirementName(m[1]);
    const buf: string[] = [headerLine];
    i++;
    while (i < lines.length && !isRequirementHeader(i) && !(!fenced[i] && /^##\s+/.test(lines[i]))) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ headerLine, name, raw: buf.join('\n').trimEnd() });
  }
  return blocks;
}

function parseRemovedNames(sectionBody: string): string[] {
  if (!sectionBody) return [];
  const names: string[] = [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  const fenced = buildCodeFenceMask(lines);
  for (const [index, line] of lines.entries()) {
    if (fenced[index]) continue;
    const m = line.match(REQUIREMENT_HEADER_REGEX);
    if (m) {
      names.push(normalizeRequirementName(m[1]));
      continue;
    }
    // Also support bullet list of headers
    const bullet = line.match(/^\s*-\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    if (bullet) {
      names.push(normalizeRequirementName(bullet[1]));
    }
  }
  return names;
}

function parseRenamedPairs(sectionBody: string): Array<{ from: string; to: string }> {
  if (!sectionBody) return [];
  const pairs: Array<{ from: string; to: string }> = [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  const fenced = buildCodeFenceMask(lines);
  let current: { from?: string; to?: string } = {};
  for (const [index, line] of lines.entries()) {
    if (fenced[index]) continue;
    const fromMatch = line.match(/^\s*-?\s*FROM:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    const toMatch = line.match(/^\s*-?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    if (fromMatch) {
      current.from = normalizeRequirementName(fromMatch[1]);
    } else if (toMatch) {
      current.to = normalizeRequirementName(toMatch[1]);
      if (current.from && current.to) {
        pairs.push({ from: current.from, to: current.to });
        current = {};
      }
    }
  }
  return pairs;
}
