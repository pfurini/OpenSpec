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

/** The plain-text source of a skill directory, with seams already injected. */
export interface SkillSource {
  instructions: string;
  bundle: SkillBundle;
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
  const instructions = injectSeams(fs.readFileSync(skillMdPath, 'utf8').trimEnd(), seams);

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

  const bundle: SkillBundle = references.length > 0 ? { references } : {};
  return { instructions, bundle };
}

/**
 * Concatenates a skill's instructions with its reference files into a single
 * self-contained body. Used for `flatten` tools and for slash commands (which
 * are single-file by design). Scripts are not inlined.
 */
export function flattenSkillBody(instructions: string, bundle: SkillBundle | undefined): string {
  const references = bundle?.references ?? [];
  if (references.length === 0) return instructions;
  return [instructions, ...references.map((ref) => ref.content)].join('\n\n');
}
