/**
 * Skill Installation
 *
 * Single source of truth for *where* generated skills land on disk. Skills are
 * written once to a canonical, cross-tool store at `.agents/skills/<name>/`
 * (read natively by Cursor, Codex, Pi, …). Tools that are verified to follow a
 * symlinked skill directory additionally get an on-demand per-skill symlink
 * (e.g. `.claude/skills/<name>` -> `../../.agents/skills/<name>`) so they pick
 * the skill up from their own conventional location without a second copy.
 *
 * `init`, `update`, and `workspace` all funnel through `installSkills` /
 * `removeSkill` so the placement logic can never drift between them.
 */

import path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';

import { FileSystemUtils } from '../../utils/file-system.js';
import { AI_TOOLS, type AIToolOption } from '../config.js';
import { buildSkillArtifacts } from './skill-generation.js';
import type { SkillTemplate } from '../templates/types.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../../package.json');

/** Relative path (from the project root) of the canonical skill store. */
export const CANONICAL_SKILLS_RELDIR = path.join('.agents', 'skills');

/**
 * Tools that receive an on-demand per-skill symlink into the canonical store.
 *
 * Claude Code is verified (firsthand) to follow a symlinked skill directory.
 * Every other tool is assumed to read `.agents/skills` natively for now; the
 * authoritative "which tools also need a symlink" list is the parked per-agent
 * invocation audit — expand this set as tools are verified.
 */
export const SYMLINK_TOOL_IDS: readonly string[] = ['claude'];

type SkillsDirTool = AIToolOption & { skillsDir: string };

/** A skill ready to install: its template plus the directory name it lives under. */
export interface InstallableSkill {
  template: SkillTemplate;
  dirName: string;
}

export interface InstallSkillsOptions {
  /**
   * Tool IDs selected for this project. Only those that are also in
   * {@link SYMLINK_TOOL_IDS} receive a symlink; the rest read the canonical
   * store directly and need nothing tool-specific written.
   */
  symlinkTools?: readonly string[];
  /** Version stamped into generated SKILL.md frontmatter (defaults to the CLI version). */
  version?: string;
  /** Sink for non-fatal warnings (defaults to `console.warn`). */
  onWarn?: (message: string) => void;
}

/** Resolve selected tool IDs to the symlink-capable tool definitions. */
function resolveSymlinkTools(symlinkTools?: readonly string[]): SkillsDirTool[] {
  const allowed = new Set(SYMLINK_TOOL_IDS);
  const ids = (symlinkTools ?? SYMLINK_TOOL_IDS).filter((id) => allowed.has(id));
  return ids
    .map((id) => AI_TOOLS.find((tool) => tool.value === id))
    .filter((tool): tool is SkillsDirTool => Boolean(tool?.skillsDir));
}

async function lstatSafe(targetPath: string): Promise<fs.Stats | null> {
  try {
    return await fs.promises.lstat(targetPath);
  } catch {
    return null;
  }
}

/** Remove a path whether it is a symlink, file, or directory (never follows the link). */
async function removePath(targetPath: string): Promise<void> {
  const stats = await lstatSafe(targetPath);
  if (!stats) return;
  if (stats.isSymbolicLink() || stats.isFile()) {
    await fs.promises.unlink(targetPath);
  } else {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
  }
}

/**
 * Ensure `<tool.skillsDir>/skills/<dirName>` is a symlink to the canonical skill
 * directory. Replaces any pre-existing real directory; no-ops when the correct
 * symlink already exists. Falls back to copying the tree (with a warning) if the
 * platform refuses symlink creation (e.g. Windows without Developer Mode).
 */
async function linkSkillForTool(
  projectPath: string,
  tool: SkillsDirTool,
  dirName: string,
  canonicalSkillDir: string,
  onWarn: (message: string) => void
): Promise<void> {
  const toolSkillsDir = path.join(projectPath, tool.skillsDir, 'skills');
  const linkPath = path.join(toolSkillsDir, dirName);
  const relativeTarget = path.relative(toolSkillsDir, canonicalSkillDir);

  const existing = await lstatSafe(linkPath);
  if (existing?.isSymbolicLink()) {
    const currentTarget = await fs.promises.readlink(linkPath).catch(() => null);
    if (currentTarget === relativeTarget) return; // already correct — idempotent no-op
  }
  if (existing) {
    await removePath(linkPath);
  }

  await FileSystemUtils.createDirectory(toolSkillsDir);

  try {
    await fs.promises.symlink(relativeTarget, linkPath, 'dir');
  } catch {
    // Symlink creation can fail on Windows without privilege; degrade to a copy
    // so install never hard-fails. The copy diverges from the canonical store on
    // the next update, which rewrites both.
    await fs.promises.cp(canonicalSkillDir, linkPath, { recursive: true });
    onWarn(
      `Could not symlink ${tool.name} skill '${dirName}'; copied it from the canonical store instead.`
    );
  }
}

/**
 * Write each skill once to the canonical store and create per-skill symlinks for
 * the selected symlink-capable tools.
 */
export async function installSkills(
  projectPath: string,
  skills: InstallableSkill[],
  options: InstallSkillsOptions = {}
): Promise<void> {
  const version = options.version ?? OPENSPEC_VERSION;
  const onWarn = options.onWarn ?? ((message: string) => console.warn(message));
  const symlinkTools = resolveSymlinkTools(options.symlinkTools);
  const canonicalRoot = path.join(projectPath, CANONICAL_SKILLS_RELDIR);

  for (const { template, dirName } of skills) {
    const canonicalSkillDir = path.join(canonicalRoot, dirName);

    // Canonical store always gets the full multi-file bundle (the Agent Skills
    // standard); there is a single store, so there is nothing to degrade per tool.
    const artifacts = buildSkillArtifacts(template, version, 'full');
    for (const artifact of artifacts) {
      const filePath = path.join(canonicalSkillDir, artifact.relPath);
      await FileSystemUtils.writeFile(filePath, artifact.content);
      if (artifact.executable) await fs.promises.chmod(filePath, 0o755);
    }

    for (const tool of symlinkTools) {
      await linkSkillForTool(projectPath, tool, dirName, canonicalSkillDir, onWarn);
    }
  }
}

/**
 * Remove a skill from the canonical store and any per-tool symlinks/copies.
 * Returns true if anything was removed.
 */
export async function removeSkill(
  projectPath: string,
  dirName: string,
  options: Pick<InstallSkillsOptions, 'symlinkTools'> = {}
): Promise<boolean> {
  let removed = false;

  const canonicalSkillDir = path.join(projectPath, CANONICAL_SKILLS_RELDIR, dirName);
  if (await lstatSafe(canonicalSkillDir)) {
    await fs.promises.rm(canonicalSkillDir, { recursive: true, force: true });
    removed = true;
  }

  for (const tool of resolveSymlinkTools(options.symlinkTools)) {
    const linkPath = path.join(projectPath, tool.skillsDir, 'skills', dirName);
    if (await lstatSafe(linkPath)) {
      await removePath(linkPath);
      removed = true;
    }
  }

  return removed;
}

/** Absolute path of the canonical skill store for a project. */
export function getCanonicalSkillsDir(projectPath: string): string {
  return path.join(projectPath, CANONICAL_SKILLS_RELDIR);
}
