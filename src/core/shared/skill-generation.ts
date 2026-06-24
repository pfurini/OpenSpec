/**
 * Skill Generation Utilities
 *
 * Shared utilities for generating skill files.
 */

import {
  getExploreSkillTemplate,
  getReverseSkillTemplate,
  getOpsxDesignSkillTemplate,
  getNewChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getApplyChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxProposeSkillTemplate,
  type SkillTemplate,
} from '../templates/skill-templates.js';
import {
  flattenSkillBody,
  renderFullInstructions,
  type GeneratedSkillFile,
  type SkillBundleCapability,
} from './skill-bundle.js';

/**
 * Skill template with directory name and workflow ID mapping.
 */
export interface SkillTemplateEntry {
  template: SkillTemplate;
  dirName: string;
  workflowId: string;
}

/**
 * Gets skill templates with their directory names, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose workflowId is in this array
 */
export function getSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  const all: SkillTemplateEntry[] = [
    { template: getExploreSkillTemplate(), dirName: 'openspec-explore', workflowId: 'explore' },
    { template: getReverseSkillTemplate(), dirName: 'openspec-reverse', workflowId: 'reverse' },
    { template: getOpsxDesignSkillTemplate(), dirName: 'openspec-design', workflowId: 'design' },
    { template: getNewChangeSkillTemplate(), dirName: 'openspec-new-change', workflowId: 'new' },
    { template: getContinueChangeSkillTemplate(), dirName: 'openspec-continue-change', workflowId: 'continue' },
    { template: getApplyChangeSkillTemplate(), dirName: 'openspec-apply-change', workflowId: 'apply' },
    { template: getFfChangeSkillTemplate(), dirName: 'openspec-ff-change', workflowId: 'ff' },
    { template: getSyncSpecsSkillTemplate(), dirName: 'openspec-sync-specs', workflowId: 'sync' },
    { template: getArchiveChangeSkillTemplate(), dirName: 'openspec-archive-change', workflowId: 'archive' },
    { template: getBulkArchiveChangeSkillTemplate(), dirName: 'openspec-bulk-archive-change', workflowId: 'bulk-archive' },
    { template: getVerifyChangeSkillTemplate(), dirName: 'openspec-verify-change', workflowId: 'verify' },
    { template: getOnboardSkillTemplate(), dirName: 'openspec-onboard', workflowId: 'onboard' },
    { template: getOpsxProposeSkillTemplate(), dirName: 'openspec-propose', workflowId: 'propose' },
  ];

  if (!workflowFilter) return all;

  const filterSet = new Set(workflowFilter);
  return all.filter(entry => filterSet.has(entry.workflowId));
}

/**
 * Generates skill file content with YAML frontmatter.
 *
 * @param template - The skill template
 * @param generatedByVersion - The OpenSpec version to embed in the file
 * @param transformInstructions - Optional callback to transform the instructions content
 */
export function generateSkillContent(
  template: SkillTemplate,
  generatedByVersion: string,
  transformInstructions?: (instructions: string) => string
): string {
  const instructions = transformInstructions
    ? transformInstructions(template.instructions)
    : template.instructions;

  return `---
name: ${template.name}
description: ${template.description}
license: ${template.license || 'MIT'}
compatibility: ${template.compatibility || 'Requires openspec CLI.'}
metadata:
  author: ${template.metadata?.author || 'openspec'}
  version: "${template.metadata?.version || '1.0'}"
  generatedBy: "${generatedByVersion}"
---

${instructions}
`;
}

/**
 * Builds the full set of files for one skill, degraded to the tool's bundle capability.
 *
 * - Single-file skills (no bundle) and `flatten` tools: one `SKILL.md`, with any
 *   reference files concatenated into the body (self-contained, nothing dropped silently).
 * - `full` tools: a short `SKILL.md` plus each reference and script as a separate file.
 *
 * @param template - The skill template (may carry a `bundle`)
 * @param generatedByVersion - The OpenSpec version to embed in the frontmatter
 * @param capability - How the target tool consumes bundles (`full` | `flatten`)
 * @param transformInstructions - Optional per-tool content transform (e.g. command-reference rewrites)
 */
export function buildSkillArtifacts(
  template: SkillTemplate,
  generatedByVersion: string,
  capability: SkillBundleCapability = 'flatten',
  transformInstructions?: (instructions: string) => string
): GeneratedSkillFile[] {
  const bundle = template.bundle;
  const hasBundle = Boolean(
    bundle && ((bundle.references?.length ?? 0) > 0 || (bundle.scripts?.length ?? 0) > 0)
  );

  if (!hasBundle || capability === 'flatten') {
    const flattened: SkillTemplate = {
      ...template,
      instructions: flattenSkillBody(template.instructions, bundle),
    };
    return [
      {
        relPath: 'SKILL.md',
        content: generateSkillContent(flattened, generatedByVersion, transformInstructions),
      },
    ];
  }

  const applyTransform = transformInstructions ?? ((content: string) => content);
  const fullTemplate: SkillTemplate = {
    ...template,
    instructions: renderFullInstructions(template.instructions, bundle),
  };
  const files: GeneratedSkillFile[] = [
    {
      relPath: 'SKILL.md',
      content: generateSkillContent(fullTemplate, generatedByVersion, transformInstructions),
    },
  ];
  for (const ref of bundle?.references ?? []) {
    files.push({ relPath: ref.relPath, content: applyTransform(ref.content) });
  }
  for (const script of bundle?.scripts ?? []) {
    files.push({ relPath: script.relPath, content: script.content, executable: true });
  }
  return files;
}
