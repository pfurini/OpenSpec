import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAdr, type ParsedAdr } from './parse.js';

export interface AdrScanResult {
  adrs: ParsedAdr[];
  /** Per-file parse failures — collected, not thrown, so one bad ADR can't sink the index. */
  errors: { filePath: string; message: string }[];
}

/** ADR files look like `ADR-0037-slug.md`. The generated README/index is not an ADR. */
const ADR_FILE_RE = /^ADR-\d+.*\.md$/i;

/**
 * Scans an ADR directory, parsing every ADR file. Parse failures are collected
 * into `errors` rather than thrown. Throws only if the directory is unreadable.
 */
export function scanAdrDir(dir: string): AdrScanResult {
  const adrs: ParsedAdr[] = [];
  const errors: { filePath: string; message: string }[] = [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    throw new Error(`ADR directory not found or unreadable: ${dir}`);
  }

  for (const name of entries.filter((n) => ADR_FILE_RE.test(n)).sort()) {
    const full = path.join(dir, name);
    try {
      adrs.push(parseAdr(readFileSync(full, 'utf-8'), name));
    } catch (err) {
      errors.push({ filePath: name, message: (err as Error).message });
    }
  }

  return { adrs, errors };
}
