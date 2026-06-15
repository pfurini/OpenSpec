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

/** The in-body placeholder marking where a reference belongs: `<!--reference:references/foo.md-->`. */
function referenceMarker(relPath: string): string {
  return `<!--reference:${relPath}-->`;
}

/** First markdown heading text in `content`, used to title a reference pointer. */
function firstHeadingText(content: string): string | undefined {
  return content.match(/^#{1,6}\s+(.+?)\s*$/m)?.[1];
}

/**
 * Concatenates a skill's instructions with its reference files into a single
 * self-contained body. Used for `flatten` tools and for slash commands (which
 * are single-file by design). Scripts are not inlined.
 *
 * A reference is inlined **in place** wherever its `<!--reference:relPath-->`
 * marker appears (preserving authored order); references with no marker are
 * appended at the end. Markers never leak into output.
 */
export function flattenSkillBody(instructions: string, bundle: SkillBundle | undefined): string {
  const references = bundle?.references ?? [];
  if (references.length === 0) return instructions;

  let body = instructions;
  const appended: string[] = [];
  for (const ref of references) {
    const marker = referenceMarker(ref.relPath);
    if (body.includes(marker)) {
      body = body.split(marker).join(ref.content);
    } else {
      appended.push(ref.content);
    }
  }
  return appended.length > 0 ? [body, ...appended].join('\n\n') : body;
}

/**
 * Renders a skill's instructions for a `full` (multi-file) tool: each reference
 * marker becomes a short pointer to the on-demand file (titled from the
 * reference's first heading). References are emitted as separate files by the caller.
 */
export function renderFullInstructions(instructions: string, bundle: SkillBundle | undefined): string {
  const references = bundle?.references ?? [];
  let body = instructions;
  for (const ref of references) {
    const marker = referenceMarker(ref.relPath);
    if (!body.includes(marker)) continue;
    const title = firstHeadingText(ref.content);
    const heading = title ? `## ${title}` : '## Reference';
    const pointer = `${heading}\n\nThe full detail for this section is in **\`${ref.relPath}\`** — load it on demand.`;
    body = body.split(marker).join(pointer);
  }
  return body;
}
