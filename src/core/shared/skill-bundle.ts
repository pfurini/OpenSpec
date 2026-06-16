/**
 * Multi-file skill bundle support.
 *
 * opsx skills may be authored as real directories under the package's
 * `schemas/skills/<dirName>/` (a short `SKILL.md` + `references/*.md` [+ `scripts/`]),
 * so the source is validatable plain-text in-repo. This module loads those
 * directories, injects templating seams, and degrades the bundle per tool
 * capability (`full` keeps separate files; `flatten` concatenates into one file).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parse as parseYaml } from 'yaml';

import { getPackageSchemasDir } from '../artifact-graph/resolver.js';
import type { SkillBundle, SkillFile } from '../templates/types.js';

/**
 * How a tool consumes a skill bundle:
 * - `full`: references/scripts written as separate files (progressive disclosure)
 * - `flatten`: references concatenated into SKILL.md; scripts dropped (surfaced by the caller)
 */
export type SkillBundleCapability = 'full' | 'flatten';

/** A file ready to be written, relative to the skill's directory. */
export interface GeneratedSkillFile {
  relPath: string;
  content: string;
  executable?: boolean;
}

/**
 * The authored YAML frontmatter of a `SKILL.md` (name/description/…). Keeping it
 * in the source file makes each `schemas/skills/<name>/SKILL.md` a valid,
 * independently-reviewable Agent Skill rather than a body-only fragment; the TS
 * factory reads these fields instead of duplicating them.
 */
export interface SkillFrontmatter {
  name?: string;
  description?: string;
  license?: string;
  compatibility?: string;
  metadata?: { author?: string; version?: string };
}

/** The plain-text source of a skill directory, with seams already injected. */
export interface SkillSource {
  frontmatter: SkillFrontmatter;
  instructions: string;
  bundle: SkillBundle;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---[ \t]*\n?/;

/**
 * Splits an authored SKILL.md into its YAML frontmatter and body. Frontmatter is
 * optional: a body-only file yields an empty object and the body unchanged, so
 * single-file skills keep working.
 */
function splitFrontmatter(raw: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: {}, body: raw };
  const parsed = parseYaml(match[1]) as SkillFrontmatter | null;
  const body = raw.slice(match[0].length).replace(/^\n+/, '');
  return { frontmatter: parsed ?? {}, body };
}

/**
 * Replaces `${KEY}` seams in authored markdown with provided values.
 * Source files stay as close to literal markdown as possible so external
 * skill validators can run against them directly; only the seams are injected.
 */
function injectSeams(content: string, seams: Record<string, string>): string {
  let out = content;
  for (const [key, value] of Object.entries(seams)) {
    out = out.split(`\${${key}}`).join(value);
  }
  return out;
}

/**
 * Loads a skill directory from the package's `schemas/skills/<dirName>/`:
 * `SKILL.md` becomes the instructions; every `references/*.md` (sorted) becomes
 * a bundle reference. Seams are injected into every file.
 */
export function loadSkillSource(dirName: string, seams: Record<string, string> = {}): SkillSource {
  const skillDir = path.join(getPackageSchemasDir(), 'skills', dirName);
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const { frontmatter, body } = splitFrontmatter(fs.readFileSync(skillMdPath, 'utf8'));
  const instructions = injectSeams(body.trimEnd(), seams);

  const references: SkillFile[] = [];
  const referencesDir = path.join(skillDir, 'references');
  if (fs.existsSync(referencesDir)) {
    const entries = fs
      .readdirSync(referencesDir)
      .filter((name) => name.endsWith('.md'))
      .sort();
    for (const name of entries) {
      const content = injectSeams(fs.readFileSync(path.join(referencesDir, name), 'utf8').trimEnd(), seams);
      references.push({ relPath: `references/${name}`, content });
    }
  }

  const scripts: SkillFile[] = [];
  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const entries = fs
      .readdirSync(scriptsDir)
      .filter((name) => !name.startsWith('.'))
      .sort();
    for (const name of entries) {
      const filePath = path.join(scriptsDir, name);
      if (!fs.statSync(filePath).isFile()) continue;
      const content = injectSeams(fs.readFileSync(filePath, 'utf8').trimEnd(), seams);
      scripts.push({ relPath: `scripts/${name}`, content, executable: true });
    }
  }

  const bundle: SkillBundle = {};
  if (references.length > 0) bundle.references = references;
  if (scripts.length > 0) bundle.scripts = scripts;

  // Fail loudly at load time if any authored bundle block points at a missing file.
  validateBundleBlocks(instructions, bundle);

  return { frontmatter, instructions, bundle };
}

/**
 * A bundle block is authored prose fenced by `<!--bundle:start-->` /
 * `<!--bundle:end-->`. The prose is written by the skill author and is what a
 * multi-file (`full`) tool reads verbatim; the file paths it mentions are
 * resolved (inlined) only when the bundle is degraded to a single file (`flatten`).
 */
const BUNDLE_BLOCK_RE = /<!--bundle:start-->([\s\S]*?)<!--bundle:end-->/g;

/**
 * A bundle-include path: a token rooted at one of the bundle directories
 * (`references/` or `scripts/`), to any depth. Anchoring to these roots keeps
 * incidental prose paths (e.g. `docs/adr/README.md`, `path:line` citations)
 * from being mistaken for includes, while still catching a typo'd bundle path.
 */
const BUNDLE_PATH_RE = /(?:references|scripts)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g;

/** Indexes every bundle file by its relPath, tagging whether it is a script. */
function indexBundle(bundle: SkillBundle | undefined): Map<string, { file: SkillFile; isScript: boolean }> {
  const map = new Map<string, { file: SkillFile; isScript: boolean }>();
  for (const ref of bundle?.references ?? []) map.set(ref.relPath, { file: ref, isScript: false });
  for (const script of bundle?.scripts ?? []) map.set(script.relPath, { file: script, isScript: true });
  return map;
}

/** Extracts bundle-include paths from a chunk of text, in order, de-duplicated. */
function extractBundlePaths(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(BUNDLE_PATH_RE)) {
    if (!out.includes(match[0])) out.push(match[0]);
  }
  return out;
}

/** Renders one bundle file for inline (`flatten`) use: references raw; scripts in a fenced, path-headed code block. */
function renderInlineFile(relPath: string, entry: { file: SkillFile; isScript: boolean }): string {
  if (!entry.isScript) return entry.file.content;
  const ext = relPath.match(/\.([A-Za-z0-9]+)$/)?.[1] ?? '';
  return `**\`${relPath}\`**\n\n\`\`\`${ext}\n${entry.file.content}\n\`\`\``;
}

/**
 * Validates every path mentioned inside a `<!--bundle:start-->…<!--bundle:end-->`
 * block against the bundle. Throws (naming the path) if a block points at a file
 * that does not exist — a typo or stale rename fails loudly at load time rather
 * than silently dropping content downstream.
 */
export function validateBundleBlocks(instructions: string, bundle: SkillBundle | undefined): void {
  const known = indexBundle(bundle);
  for (const block of instructions.matchAll(BUNDLE_BLOCK_RE)) {
    for (const relPath of extractBundlePaths(block[1])) {
      if (!known.has(relPath)) {
        throw new Error(
          `Bundle block references "${relPath}" but no such file exists in the skill bundle.`,
        );
      }
    }
  }
}

/**
 * Concatenates a skill's instructions with its bundle files into a single
 * self-contained body. Used for `flatten` tools and for slash commands (which
 * are single-file by design).
 *
 * Each `<!--bundle:start-->…<!--bundle:end-->` block is replaced **in place** by
 * the in-order concatenation of the files its prose names (references inlined
 * raw; scripts inlined as fenced code). The authored pointer prose — useful only
 * when the files live separately — is discarded. References not named by any
 * block are appended at the end (no silent loss); unreferenced scripts are dropped.
 */
export function flattenSkillBody(instructions: string, bundle: SkillBundle | undefined): string {
  const references = bundle?.references ?? [];
  const scripts = bundle?.scripts ?? [];
  if (references.length === 0 && scripts.length === 0) return instructions;

  validateBundleBlocks(instructions, bundle);
  const known = indexBundle(bundle);
  const consumed = new Set<string>();

  const body = instructions.replace(BUNDLE_BLOCK_RE, (_full, inner: string) => {
    const parts: string[] = [];
    for (const relPath of extractBundlePaths(inner)) {
      const entry = known.get(relPath)!; // validated above
      consumed.add(relPath);
      parts.push(renderInlineFile(relPath, entry));
    }
    return parts.join('\n\n');
  });

  // Any reference never named by a block still ships (appended) so flatten loses nothing.
  const appended = references.filter((ref) => !consumed.has(ref.relPath)).map((ref) => ref.content);
  return appended.length > 0 ? [body, ...appended].join('\n\n') : body;
}

/**
 * Renders a skill's instructions for a `full` (multi-file) tool: each
 * `<!--bundle:start-->…<!--bundle:end-->` block has only its fence comments
 * stripped, leaving the author's prose verbatim (path mentions and all). The
 * referenced files are emitted separately by the caller for on-demand loading.
 */
export function renderFullInstructions(instructions: string, bundle: SkillBundle | undefined): string {
  validateBundleBlocks(instructions, bundle);
  return instructions.replace(BUNDLE_BLOCK_RE, (_full, inner: string) => inner.trim());
}
