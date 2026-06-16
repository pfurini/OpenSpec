import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS } from './config.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { getConfiguredTools } from './shared/index.js';
import { getCanonicalSkillsDir } from './shared/skill-install.js';

type WorkflowId = (typeof ALL_WORKFLOWS)[number];

/**
 * Maps workflow IDs to their skill directory names.
 */
export const WORKFLOW_TO_SKILL_DIR: Record<WorkflowId, string> = {
  'explore': 'openspec-explore',
  'design': 'openspec-design',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

function toKnownWorkflows(workflows: readonly string[]): WorkflowId[] {
  return workflows.filter(
    (workflow): workflow is WorkflowId =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
  );
}

/**
 * Detects if a single tool has profile drift against the desired skill state.
 *
 * This function covers:
 * - required skills missing for selected workflows
 * - skills for workflows that were deselected from the current profile
 */
export function hasToolProfileDrift(
  projectPath: string,
  toolId: string,
  desiredWorkflows: readonly string[]
): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return false;

  const knownDesiredWorkflows = toKnownWorkflows(desiredWorkflows);
  const desiredWorkflowSet = new Set<WorkflowId>(knownDesiredWorkflows);
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  for (const workflow of knownDesiredWorkflows) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      return true;
    }
  }

  // Deselecting workflows in a profile should trigger sync.
  for (const workflow of ALL_WORKFLOWS) {
    if (desiredWorkflowSet.has(workflow)) continue;
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillDir = path.join(skillsDir, dirName);
    if (fs.existsSync(skillDir)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects profile drift in the canonical `.agents/skills` store: a desired
 * workflow's skill is missing, or a deselected workflow's skill lingers.
 */
export function hasCanonicalProfileDrift(
  projectPath: string,
  desiredWorkflows: readonly string[]
): boolean {
  const knownDesiredWorkflows = toKnownWorkflows(desiredWorkflows);
  const desiredWorkflowSet = new Set<WorkflowId>(knownDesiredWorkflows);
  const skillsDir = getCanonicalSkillsDir(projectPath);

  for (const workflow of knownDesiredWorkflows) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (!fs.existsSync(path.join(skillsDir, dirName, 'SKILL.md'))) {
      return true;
    }
  }

  for (const workflow of ALL_WORKFLOWS) {
    if (desiredWorkflowSet.has(workflow)) continue;
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (fs.existsSync(path.join(skillsDir, dirName))) {
      return true;
    }
  }

  return false;
}

/**
 * Returns configured tools that currently need a profile sync.
 */
export function getToolsNeedingProfileSync(
  projectPath: string,
  desiredWorkflows: readonly string[],
  configuredTools?: readonly string[]
): string[] {
  const tools = configuredTools ? [...new Set(configuredTools)] : getConfiguredTools(projectPath);
  return tools.filter((toolId) =>
    hasToolProfileDrift(projectPath, toolId, desiredWorkflows)
  );
}

function getInstalledWorkflowsForTool(
  projectPath: string,
  toolId: string
): WorkflowId[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return [];

  const installed = new Set<WorkflowId>();
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      installed.add(workflow);
    }
  }

  return [...installed];
}

/**
 * Detects whether the current project has any profile drift.
 */
export function hasProjectConfigDrift(
  projectPath: string,
  desiredWorkflows: readonly string[]
): boolean {
  const configuredTools = getConfiguredTools(projectPath);
  if (getToolsNeedingProfileSync(projectPath, desiredWorkflows, configuredTools).length > 0) {
    return true;
  }

  const desiredSet = new Set(toKnownWorkflows(desiredWorkflows));

  for (const toolId of configuredTools) {
    const installed = getInstalledWorkflowsForTool(projectPath, toolId);
    if (installed.some((workflow) => !desiredSet.has(workflow))) {
      return true;
    }
  }

  return false;
}
