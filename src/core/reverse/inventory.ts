/**
 * Reverse — deterministic codebase inventory.
 *
 * Walks a working tree and classifies files as source / test / doc, honoring
 * `.gitignore` plus a built-in vendored/generated ignore set. No language model,
 * no network, no writes — pure inputs to the `openspec reverse` skill.
 */
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FileSystemUtils } from '../../utils/file-system.js';

export type FileCategory = 'source' | 'test' | 'doc';

export interface InventoryFile {
  /** POSIX-relative path from the scan root (cross-platform stable). */
  path: string;
  category: FileCategory;
  /** Detected language, or `'unknown'`. */
  language: string;
}

export interface Inventory {
  /** Absolute scan root. */
  root: string;
  files: InventoryFile[];
  counts: { source: number; test: number; doc: number; total: number };
  /** Language → file count, descending insertion is not guaranteed; sort at display. */
  languages: Record<string, number>;
}

/**
 * Directory names that never contain first-party source worth baselining.
 * Sourced from common ecosystems (node, python, rust, go, jvm, build outputs)
 * and OpenSpec's own managed dirs.
 */
const DEFAULT_IGNORE_DIRS = [
  'node_modules', 'dist', 'build', 'out', 'target', 'bin', 'obj',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', 'coverage',
  '__pycache__', '.venv', 'venv', '.tox', '.mypy_cache', '.pytest_cache',
  'vendor', '.git', '.hg', '.svn', '.idea', '.vscode',
  'openspec', '.openspec', '.tokensave', '.agents',
];

const LANGUAGE_BY_EXT: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.kt': 'kotlin', '.kts': 'kotlin', '.scala': 'scala',
  '.swift': 'swift', '.m': 'objective-c', '.mm': 'objective-c',
  '.c': 'c', '.h': 'c', '.cc': 'cpp', '.cpp': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp', '.php': 'php', '.ex': 'elixir', '.exs': 'elixir',
  '.dart': 'dart', '.clj': 'clojure', '.hs': 'haskell', '.erl': 'erlang',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.md': 'markdown', '.mdx': 'markdown', '.rst': 'restructuredtext', '.txt': 'text',
};

const DOC_EXTS = new Set(['.md', '.mdx', '.rst', '.txt']);
const DOC_DIR_RE = /(^|\/)docs?(\/|$)/i;
const DOC_NAME_RE = /^(readme|changelog|contributing|architecture|adr)\b/i;

/** Path markers that mean "this is a test file" — checked before source classification. */
const TEST_PATH_RE = /(^|\/)(tests?|__tests__|spec|specs)(\/)|(\.|_)(test|spec)\.[a-z0-9]+$/i;

const SOURCE_EXTS = new Set(
  Object.keys(LANGUAGE_BY_EXT).filter((ext) => !DOC_EXTS.has(ext)),
);

export interface BuildInventoryOptions {
  /** Extra glob patterns to ignore, on top of `.gitignore` + defaults. */
  extraIgnore?: string[];
}

/**
 * Builds the inventory for `root`. Best-effort `.gitignore` support: comments,
 * blank lines, and negations (`!`) are not honored in v1 (documented limitation —
 * the skill re-ratifies the map anyway).
 */
export async function buildInventory(
  root: string,
  options: BuildInventoryOptions = {},
): Promise<Inventory> {
  const absRoot = path.resolve(root);
  const ignore = [
    ...DEFAULT_IGNORE_DIRS.flatMap((d) => [`**/${d}/**`, `${d}/**`]),
    ...gitignoreToGlobs(absRoot),
    ...(options.extraIgnore ?? []),
  ];

  const matches = await fg('**/*', {
    cwd: absRoot,
    ignore,
    onlyFiles: true,
    dot: false,
    followSymbolicLinks: false,
    suppressErrors: true,
  });

  const files: InventoryFile[] = [];
  for (const rel of matches.sort()) {
    const category = classify(rel);
    if (!category) continue;
    files.push({
      path: FileSystemUtils.toPosixPath(rel),
      category,
      language: LANGUAGE_BY_EXT[path.extname(rel).toLowerCase()] ?? 'unknown',
    });
  }

  const counts = { source: 0, test: 0, doc: 0, total: files.length };
  const languages: Record<string, number> = {};
  for (const f of files) {
    counts[f.category] += 1;
    languages[f.language] = (languages[f.language] ?? 0) + 1;
  }

  return { root: absRoot, files, counts, languages };
}

/** Returns the category, or `null` for files we don't baseline (config, assets, etc.). */
function classify(rel: string): FileCategory | null {
  const ext = path.extname(rel).toLowerCase();
  const base = path.basename(rel);

  if (TEST_PATH_RE.test(rel) && SOURCE_EXTS.has(ext)) return 'test';
  if (DOC_EXTS.has(ext) || DOC_DIR_RE.test(rel) || DOC_NAME_RE.test(base)) {
    return DOC_EXTS.has(ext) ? 'doc' : SOURCE_EXTS.has(ext) ? 'source' : 'doc';
  }
  if (SOURCE_EXTS.has(ext)) return 'source';
  return null;
}

/** Pragmatic `.gitignore` → fast-glob ignore-pattern conversion. Best-effort (see above). */
function gitignoreToGlobs(absRoot: string): string[] {
  let raw: string;
  try {
    raw = readFileSync(path.join(absRoot, '.gitignore'), 'utf-8');
  } catch {
    return [];
  }
  const globs: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const pat = line.trim();
    if (!pat || pat.startsWith('#') || pat.startsWith('!')) continue;
    const cleaned = pat.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!cleaned) continue;
    if (cleaned.includes('/')) {
      globs.push(cleaned, `${cleaned}/**`);
    } else {
      globs.push(`**/${cleaned}`, `**/${cleaned}/**`);
    }
  }
  return globs;
}
