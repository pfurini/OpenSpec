import * as nodeFs from 'node:fs';
import { createRequire } from 'node:module';

import { FileSystemUtils } from '../../utils/file-system.js';
import { AI_TOOLS, type AIToolOption } from '../config.js';
import { getGlobalConfig, type Profile } from '../global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS } from '../profiles.js';
import {
  getSkillTemplates,
  getToolSkillStatus,
  getToolsWithSkillsDir,
  extractGeneratedByVersion,
  getCanonicalSkillsDir,
  installSkills,
  removeSkill,
  SYMLINK_TOOL_IDS,
} from '../shared/index.js';
import { WORKFLOW_TO_SKILL_DIR } from '../profile-sync-drift.js';
import type { WorkspaceSkillState } from './foundation.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../../package.json');
const fs = nodeFs.promises;

export interface WorkspaceSkillAgentResult {
  tool_id: string;
  name: string;
  skills_path: string;
  workflow_ids: string[];
}

export interface WorkspaceSkillRemovedResult extends WorkspaceSkillAgentResult {
  reason: 'agent_unselected' | 'workflow_unselected';
}

export interface WorkspaceSkillSkippedResult {
  tool_id?: string;
  name?: string;
  reason: string;
  message: string;
}

export interface WorkspaceSkillFailedResult {
  tool_id: string;
  name: string;
  error: string;
}

export interface WorkspaceSkillInstallationReport {
  profile: Profile;
  workflow_ids: string[];
  selected_agents: string[];
  generated: WorkspaceSkillAgentResult[];
  added: WorkspaceSkillAgentResult[];
  refreshed: WorkspaceSkillAgentResult[];
  removed: WorkspaceSkillRemovedResult[];
  skipped: WorkspaceSkillSkippedResult[];
  failed: WorkspaceSkillFailedResult[];
}

interface WorkspaceSkillProfileContext {
  profile: Profile;
  workflowIds: string[];
}

type WorkspaceSkillCapableTool = AIToolOption & { skillsDir: string };

function resolveWorkspaceSkillProfileContext(): WorkspaceSkillProfileContext {
  const globalConfig = getGlobalConfig();
  const profile = globalConfig.profile ?? 'core';
  const workflowIds = [...getProfileWorkflows(profile, globalConfig.workflows)];

  return {
    profile,
    workflowIds,
  };
}

export function getCurrentWorkspaceSkillProfileSelection(): {
  profile: Profile;
  workflow_ids: string[];
} {
  const profileContext = resolveWorkspaceSkillProfileContext();
  return {
    profile: profileContext.profile,
    workflow_ids: profileContext.workflowIds,
  };
}

function arraysEqual(left: readonly string[] | undefined, right: readonly string[]): boolean {
  const leftValues = left ?? [];
  if (leftValues.length !== right.length) {
    return false;
  }

  const leftSet = new Set(leftValues);
  const rightSet = new Set(right);

  if (leftSet.size !== rightSet.size) {
    return false;
  }

  return [...leftSet].every((value) => rightSet.has(value));
}

export function hasWorkspaceSkillProfileDrift(
  state: { workspace_skills?: WorkspaceSkillState } | null | undefined
): boolean {
  const workspaceSkills = state?.workspace_skills;

  if (!workspaceSkills) {
    return false;
  }

  const current = getCurrentWorkspaceSkillProfileSelection();

  return (
    workspaceSkills.last_applied_profile !== current.profile ||
    !arraysEqual(workspaceSkills.last_applied_workflow_ids, current.workflow_ids)
  );
}

function makeBaseWorkspaceSkillReport(
  selectedAgentIds: string[],
  profileContext = resolveWorkspaceSkillProfileContext()
): WorkspaceSkillInstallationReport {
  return {
    profile: profileContext.profile,
    workflow_ids: profileContext.workflowIds,
    selected_agents: selectedAgentIds,
    generated: [],
    added: [],
    refreshed: [],
    removed: [],
    skipped: [],
    failed: [],
  };
}

export function getWorkspaceSkillCapableTools(): WorkspaceSkillCapableTool[] {
  return AI_TOOLS.filter((tool) => Boolean(tool.skillsDir)) as WorkspaceSkillCapableTool[];
}

export function getWorkspaceSkillToolIds(): string[] {
  return getToolsWithSkillsDir();
}

export function parseWorkspaceSkillToolsValue(rawTools: string): string[] {
  const raw = rawTools.trim();
  if (raw.length === 0) {
    throw new Error(
      'The --tools option requires a value. Use "all", "none", or a comma-separated list of agent IDs.'
    );
  }

  const availableTools = getWorkspaceSkillToolIds();
  const availableSet = new Set(availableTools);
  const availableList = ['all', 'none', ...availableTools].join(', ');
  const lowerRaw = raw.toLowerCase();

  if (lowerRaw === 'all') {
    return availableTools;
  }

  if (lowerRaw === 'none') {
    return [];
  }

  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw new Error(
      'The --tools option requires at least one agent ID when not using "all" or "none".'
    );
  }

  const normalizedTokens = tokens.map((token) => token.toLowerCase());

  if (normalizedTokens.some((token) => token === 'all' || token === 'none')) {
    throw new Error('Cannot combine reserved values "all" or "none" with specific agent IDs.');
  }

  const invalidTokens = tokens.filter(
    (_token, index) => !availableSet.has(normalizedTokens[index])
  );

  if (invalidTokens.length > 0) {
    throw new Error(`Invalid agent(s): ${invalidTokens.join(', ')}. Available values: ${availableList}`);
  }

  const deduped: string[] = [];
  for (const token of normalizedTokens) {
    if (!deduped.includes(token)) {
      deduped.push(token);
    }
  }

  return deduped;
}

export function createWorkspaceSkillSkippedReport(
  reason: string,
  message: string
): WorkspaceSkillInstallationReport {
  const report = makeBaseWorkspaceSkillReport([]);
  report.skipped.push({
    reason,
    message,
  });
  return report;
}

function getWorkspaceSkillTool(toolId: string): WorkspaceSkillCapableTool {
  const tool = getWorkspaceSkillCapableTools().find((candidate) => candidate.value === toolId);
  if (!tool) {
    throw new Error(`Unknown workspace skill agent '${toolId}'.`);
  }

  return tool;
}

function getWorkspaceSkillDirectoryForTool(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool
): string {
  return FileSystemUtils.joinPath(workspaceRoot, tool.skillsDir, 'skills');
}

export function getWorkspaceSkillDirectory(workspaceRoot: string, toolId: string): string {
  return getWorkspaceSkillDirectoryForTool(workspaceRoot, getWorkspaceSkillTool(toolId));
}

function makeAgentResult(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool,
  workflowIds: string[]
): WorkspaceSkillAgentResult {
  return {
    tool_id: tool.value,
    name: tool.name,
    // Skills live in the canonical store every agent reads; symlink tools also
    // get a per-tool link, but the store is the source of truth.
    skills_path: getCanonicalSkillsDir(workspaceRoot),
    workflow_ids: workflowIds,
  };
}

function getManagedWorkspaceSkillEntries(): Array<{ workflowId: string; dirName: string }> {
  return getSkillTemplates().map(({ workflowId, dirName }) => ({ workflowId, dirName }));
}

function isOpenSpecManagedSkillDir(skillDir: string): boolean {
  const skillFile = FileSystemUtils.joinPath(skillDir, 'SKILL.md');
  return extractGeneratedByVersion(skillFile) !== null;
}

function isSymlinkTool(toolId: string): boolean {
  return SYMLINK_TOOL_IDS.includes(toolId);
}

/**
 * Workflow IDs whose OpenSpec-managed skill is present in the canonical store.
 * (User-owned directories that merely collide with a workflow name are ignored.)
 */
function getManagedCanonicalWorkflowIds(workspaceRoot: string): string[] {
  const canonicalDir = getCanonicalSkillsDir(workspaceRoot);
  const present: string[] = [];
  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (!dirName) continue;
    if (isOpenSpecManagedSkillDir(FileSystemUtils.joinPath(canonicalDir, dirName))) {
      present.push(workflow);
    }
  }
  return present;
}

/**
 * Remove an unselected agent's symlinks into the canonical store (symlink tools
 * only — other agents read the shared store and leave nothing per-tool behind).
 */
async function removeAgentSymlinks(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool
): Promise<void> {
  if (!isSymlinkTool(tool.value)) return;
  const skillsDir = getWorkspaceSkillDirectoryForTool(workspaceRoot, tool);
  for (const { dirName } of getManagedWorkspaceSkillEntries()) {
    const linkPath = FileSystemUtils.joinPath(skillsDir, dirName);
    try {
      const stats = await fs.lstat(linkPath);
      if (stats.isSymbolicLink()) {
        await fs.unlink(linkPath);
      }
    } catch {
      // nothing to remove
    }
  }
}

/**
 * Remove deselected-workflow skills from the canonical store and the selected
 * symlink tools. Returns the workflow IDs actually removed (managed only).
 */
async function removeDeselectedCanonicalWorkflows(
  workspaceRoot: string,
  selectedAgentIds: readonly string[],
  desiredWorkflowIds: readonly string[]
): Promise<string[]> {
  const desiredSet = new Set(desiredWorkflowIds);
  const canonicalDir = getCanonicalSkillsDir(workspaceRoot);
  const removedWorkflowIds: string[] = [];

  for (const { workflowId, dirName } of getManagedWorkspaceSkillEntries()) {
    if (desiredSet.has(workflowId)) continue;
    if (!isOpenSpecManagedSkillDir(FileSystemUtils.joinPath(canonicalDir, dirName))) {
      continue; // absent or user-owned — never touch
    }
    await removeSkill(workspaceRoot, dirName, { symlinkTools: selectedAgentIds });
    removedWorkflowIds.push(workflowId);
  }

  return removedWorkflowIds;
}

export async function generateWorkspaceAgentSkills(
  workspaceRoot: string,
  selectedAgentIds: string[]
): Promise<WorkspaceSkillInstallationReport> {
  const profileContext = resolveWorkspaceSkillProfileContext();
  const report = makeBaseWorkspaceSkillReport(selectedAgentIds, profileContext);

  if (selectedAgentIds.length === 0) {
    report.skipped.push({
      reason: 'no_agents_selected',
      message: 'No workspace agent skills were selected.',
    });
    return report;
  }

  const skillTemplates = getSkillTemplates(profileContext.workflowIds);

  if (skillTemplates.length === 0) {
    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      report.skipped.push({
        tool_id: tool.value,
        name: tool.name,
        reason: 'no_profile_workflows',
        message: 'The active global profile does not select any workflows.',
      });
    }
    return report;
  }

  // Capture prior per-agent configured state before writing the canonical store.
  const wasConfigured = new Map(
    selectedAgentIds.map((toolId) => [toolId, getToolSkillStatus(workspaceRoot, toolId).configured])
  );

  try {
    await installSkills(workspaceRoot, skillTemplates, {
      symlinkTools: selectedAgentIds,
      version: OPENSPEC_VERSION,
    });
  } catch (error) {
    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      report.failed.push({
        tool_id: tool.value,
        name: tool.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return report;
  }

  for (const toolId of selectedAgentIds) {
    const tool = getWorkspaceSkillTool(toolId);
    const result = makeAgentResult(workspaceRoot, tool, profileContext.workflowIds);
    if (wasConfigured.get(toolId)) {
      report.refreshed.push(result);
    } else {
      report.generated.push(result);
    }
  }

  return report;
}

export async function updateWorkspaceAgentSkills(
  workspaceRoot: string,
  selectedAgentIds: string[],
  previousSkillState?: WorkspaceSkillState
): Promise<WorkspaceSkillInstallationReport> {
  const profileContext = resolveWorkspaceSkillProfileContext();
  const report = makeBaseWorkspaceSkillReport(selectedAgentIds, profileContext);
  const previousSelectedAgentIds = previousSkillState?.selected_agents ?? [];
  const previousSelectedSet = new Set(previousSelectedAgentIds);
  const selectedSet = new Set(selectedAgentIds);
  const skillTemplates = getSkillTemplates(profileContext.workflowIds);

  // Workflows the canonical store is currently serving (managed skills only).
  // Captured before any removal so unselected agents can report what they had.
  const presentWorkflowIds = getManagedCanonicalWorkflowIds(workspaceRoot);

  // 1. Unselected agents: drop their symlinks (symlink tools); the shared
  //    canonical store stays for the agents that remain.
  for (const toolId of previousSelectedAgentIds) {
    if (selectedSet.has(toolId)) {
      continue;
    }

    const tool = getWorkspaceSkillTool(toolId);

    try {
      await removeAgentSymlinks(workspaceRoot, tool);
      if (presentWorkflowIds.length > 0) {
        report.removed.push({
          ...makeAgentResult(workspaceRoot, tool, presentWorkflowIds),
          reason: 'agent_unselected',
        });
      }
    } catch (error) {
      report.failed.push({
        tool_id: tool.value,
        name: tool.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (selectedAgentIds.length === 0) {
    // No agent reads the store anymore — tear down the managed canonical skills.
    for (const workflowId of presentWorkflowIds) {
      const dirName = WORKFLOW_TO_SKILL_DIR[workflowId as (typeof ALL_WORKFLOWS)[number]];
      if (dirName) {
        await removeSkill(workspaceRoot, dirName, { symlinkTools: [] });
      }
    }

    if (report.removed.length === 0) {
      report.skipped.push({
        reason: previousSkillState ? 'no_agents_selected' : 'no_stored_agent_selection',
        message: previousSkillState
          ? 'No workspace agent skills were selected.'
          : 'No workspace agent skill selection is stored. Pass --tools <ids> to install skills.',
      });
    }
    return report;
  }

  if (skillTemplates.length === 0) {
    const removedWorkflowIds = await removeDeselectedCanonicalWorkflows(
      workspaceRoot,
      selectedAgentIds,
      []
    );
    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      if (removedWorkflowIds.length > 0) {
        report.removed.push({
          ...makeAgentResult(workspaceRoot, tool, removedWorkflowIds),
          reason: 'workflow_unselected',
        });
      }
      report.skipped.push({
        tool_id: tool.value,
        name: tool.name,
        reason: 'no_profile_workflows',
        message: 'The active global profile does not select any workflows.',
      });
    }
    return report;
  }

  // 2. Write the canonical store once + symlink the selected symlink tools.
  try {
    await installSkills(workspaceRoot, skillTemplates, {
      symlinkTools: selectedAgentIds,
      version: OPENSPEC_VERSION,
    });
  } catch (error) {
    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      report.failed.push({
        tool_id: tool.value,
        name: tool.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return report;
  }

  // 3. Drop skills for workflows no longer in the profile (canonical + symlinks).
  const removedWorkflowIds = await removeDeselectedCanonicalWorkflows(
    workspaceRoot,
    selectedAgentIds,
    profileContext.workflowIds
  );

  // 4. Per-agent report.
  for (const toolId of selectedAgentIds) {
    const tool = getWorkspaceSkillTool(toolId);
    if (removedWorkflowIds.length > 0) {
      report.removed.push({
        ...makeAgentResult(workspaceRoot, tool, removedWorkflowIds),
        reason: 'workflow_unselected',
      });
    }

    const result = makeAgentResult(workspaceRoot, tool, profileContext.workflowIds);
    if (previousSelectedSet.has(toolId)) {
      report.refreshed.push(result);
    } else {
      report.added.push(result);
    }
  }

  return report;
}
