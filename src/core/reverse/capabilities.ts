/**
 * Reverse — generic capability heuristic.
 *
 * Groups inventory files into candidate OpenSpec capabilities by their top-level
 * module/directory, cross-checked against existing `openspec/specs/` so already
 * specified capabilities are marked rather than duplicated. v1 is intentionally
 * language-agnostic: the skill re-ratifies the boundaries with a human.
 */
import type { Inventory, InventoryFile } from './inventory.js';

export interface CapabilityCandidate {
  /** Slugified capability name (a valid `openspec/specs/<name>` dir). */
  name: string;
  fileCount: number;
  /** Up to 5 representative paths (source preferred), for the ratification prompt. */
  sampleFiles: string[];
  /** True when `openspec/specs/<name>/` already exists. */
  existing: boolean;
}

/**
 * Top dirs that are containers, not capabilities — descend one level past them.
 * Includes test roots so a mirrored `test/auth/...` folds into the `auth` capability
 * instead of forming a bogus `test` capability.
 */
const CONTAINER_ROOTS = new Set([
  'src', 'lib', 'app', 'apps', 'source', 'sources', 'internal', 'pkg', 'cmd', 'packages',
  'test', 'tests', '__tests__',
]);

/**
 * Derives candidate capabilities from source + test files, descending in 2026-stable
 * insertion order. `existingCapabilities` are the dir names under `openspec/specs/`.
 */
export function deriveCapabilities(
  inventory: Inventory,
  existingCapabilities: readonly string[] = [],
): CapabilityCandidate[] {
  const existing = new Set(existingCapabilities);
  const groups = new Map<string, InventoryFile[]>();

  for (const file of inventory.files) {
    if (file.category === 'doc') continue; // docs inform intent, but don't define capabilities
    const key = moduleKey(file.path);
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(file);
    groups.set(key, bucket);
  }

  const candidates: CapabilityCandidate[] = [];
  for (const [name, files] of groups) {
    const samples = files
      .slice()
      .sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path))
      .slice(0, 5)
      .map((f) => f.path);
    candidates.push({
      name,
      fileCount: files.length,
      sampleFiles: samples,
      existing: existing.has(name),
    });
  }

  return candidates.sort(
    (a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name),
  );
}

/** Source files rank ahead of tests when picking representative samples. */
function rank(f: InventoryFile): number {
  return f.category === 'source' ? 0 : 1;
}

/**
 * Maps a path to its capability key: the first meaningful segment, descending one
 * level past a known container root (e.g. `src/auth/login.ts` → `auth`,
 * `packages/api/index.ts` → `api`, `billing/charge.ts` → `billing`).
 */
function moduleKey(posixPath: string): string | null {
  const segments = posixPath.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  let idx = 0;
  if (segments.length > 1 && CONTAINER_ROOTS.has(segments[0].toLowerCase())) idx = 1;

  return slugify(segments[idx]);
}

function slugify(value: string): string | null {
  const slug = value
    .toLowerCase()
    .replace(/\.[^.]+$/, '') // drop a file extension if a bare filename slipped through
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}
