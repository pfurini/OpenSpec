/**
 * Update Command
 *
 * Refreshes OpenSpec skills for configured tools.
 * Supports profile-aware updates, migration, and smart update detection.
 */

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createRequire } from 'module';
import { FileSystemUtils } from '../utils/file-system.js';
import { AI_TOOLS, OPENSPEC_DIR_NAME } from './config.js';
import {
  getToolVersionStatus,
  getSkillTemplates,
  getToolsWithSkillsDir,
  getConfiguredTools,
  isCanonicalStorePopulated,
  getCanonicalSkillVersion,
  installSkills,
  removeSkill,
  SYMLINK_TOOL_IDS,
  type ToolVersionStatus,
} from './shared/index.js';
import {
  detectLegacyArtifacts,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  getToolsFromLegacyArtifacts,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getGlobalConfig, type Profile } from './global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS } from './profiles.js';
import { getAvailableTools } from './available-tools.js';
import {
  WORKFLOW_TO_SKILL_DIR,
  getToolsNeedingProfileSync,
  hasCanonicalProfileDrift,
} from './profile-sync-drift.js';
import {
  scanInstalledWorkflows as scanInstalledWorkflowsShared,
  migrateIfNeeded as migrateIfNeededShared,
} from './migration.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');
const OLD_CORE_WORKFLOWS = ['propose', 'explore', 'apply', 'archive'] as const;

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Force update even when tools are up to date */
  force?: boolean;
}

/**
 * Scans installed workflow artifacts (skills and managed commands) across all configured tools.
 * Returns the union of detected workflow IDs that match ALL_WORKFLOWS.
 *
 * Wrapper around the shared migration module's scanInstalledWorkflows that accepts tool IDs.
 */
export function scanInstalledWorkflows(projectPath: string, toolIds: string[]): string[] {
  const tools = toolIds
    .map((id) => AI_TOOLS.find((t) => t.value === id))
    .filter((t): t is NonNullable<typeof t> => t != null);
  return scanInstalledWorkflowsShared(projectPath, tools);
}

export class UpdateCommand {
  private readonly force: boolean;

  constructor(options: UpdateCommandOptions = {}) {
    this.force = options.force ?? false;
  }

  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const openspecPath = path.join(resolvedProjectPath, OPENSPEC_DIR_NAME);

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    // 2. Perform one-time migration if needed before any legacy upgrade generation.
    // Use detected tool directories to preserve existing opsx skills/commands.
    const detectedTools = getAvailableTools(resolvedProjectPath);
    migrateIfNeededShared(resolvedProjectPath, detectedTools);

    // 3. Read global config for profile
    const globalConfig = getGlobalConfig();
    const profile = globalConfig.profile ?? 'core';
    const profileWorkflows = getProfileWorkflows(profile, globalConfig.workflows);
    const desiredWorkflows = profileWorkflows.filter((workflow): workflow is (typeof ALL_WORKFLOWS)[number] =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
    );

    // 4. Detect and handle legacy artifacts + upgrade legacy tools using effective config
    const newlyConfiguredTools = await this.handleLegacyCleanup(
      resolvedProjectPath,
      desiredWorkflows
    );

    // 5. Find configured tools
    const configuredTools = getConfiguredTools(resolvedProjectPath);

    // Most agents read the canonical `.agents/skills` store natively and never
    // get a per-tool directory, so `configuredTools` can be empty even though
    // OpenSpec is installed. Refresh the canonical store directly in that case.
    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      if (isCanonicalStorePopulated(resolvedProjectPath)) {
        await this.updateCanonicalStore(
          resolvedProjectPath,
          desiredWorkflows,
          profile,
          globalConfig.workflows
        );
        return;
      }

      console.log(chalk.yellow('No configured tools found.'));
      console.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    // 6. Check version status for all configured tools
    const toolStatuses = configuredTools.map((toolId) =>
      getToolVersionStatus(resolvedProjectPath, toolId, OPENSPEC_VERSION)
    );
    const statusByTool = new Map(toolStatuses.map((status) => [status.toolId, status] as const));

    // 7. Smart update detection
    const toolsNeedingVersionUpdate = toolStatuses
      .filter((s) => s.needsUpdate)
      .map((s) => s.toolId);
    const toolsNeedingConfigSync = getToolsNeedingProfileSync(
      resolvedProjectPath,
      desiredWorkflows,
      configuredTools
    );
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsNeedingConfigSync,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0) {
      // All tools are up to date
      this.displayUpToDateMessage(toolStatuses);

      // Still check for new tool directories and extra workflows
      this.detectNewTools(resolvedProjectPath, configuredTools);
      this.displayExtraWorkflowsNote(resolvedProjectPath, configuredTools, desiredWorkflows);
      this.displayOldCoreCustomProfileNote(profile, globalConfig.workflows);
      return;
    }

    // 8. Display update plan
    if (this.force) {
      console.log(`Force updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    } else {
      this.displayUpdatePlan([...toolsToUpdateSet], statusByTool, toolsUpToDate);
    }
    console.log();

    // 9. Determine skills to generate
    const skillTemplates = getSkillTemplates(desiredWorkflows);

    // 10. Update tools (all if force, otherwise only those needing update).
    // Skills are written once to the canonical `.agents/skills` store and
    // re-symlinked for symlink-capable tools (Claude). Every configured tool
    // consumes that single store, so refreshing it refreshes them all.
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];
    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];
    let removedDeselectedSkillCount = 0;

    if (toolsToUpdate.length > 0) {
      const spinner = ora('Updating OpenSpec skills...').start();
      const warnings: string[] = [];

      try {
        await installSkills(resolvedProjectPath, skillTemplates, {
          symlinkTools: toolsToUpdate,
          version: OPENSPEC_VERSION,
          onWarn: (message) => warnings.push(message),
        });

        removedDeselectedSkillCount += await this.removeUnselectedSkillDirs(
          resolvedProjectPath,
          desiredWorkflows,
          toolsToUpdate
        );

        spinner.succeed('Updated OpenSpec skills');
        for (const warning of warnings) {
          console.log(chalk.yellow(`⚠ ${warning}`));
        }

        for (const toolId of toolsToUpdate) {
          const tool = AI_TOOLS.find((t) => t.value === toolId);
          if (tool?.skillsDir) updatedTools.push(tool.name);
        }
      } catch (error) {
        spinner.fail('Failed to update OpenSpec skills');
        failedTools.push({
          name: 'OpenSpec skills',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 11. Summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }
    if (removedDeselectedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${removedDeselectedSkillCount} skill directories (deselected workflows)`));
    }

    // 12. Show onboarding message for newly configured tools from legacy upgrade
    if (newlyConfiguredTools.length > 0) {
      console.log();
      console.log(chalk.bold('Getting started:'));
      console.log('  /openspec-new-change       Start a new change');
      console.log('  /openspec-continue-change  Create the next artifact');
      console.log('  /openspec-apply-change     Implement tasks');
      console.log();
      console.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`);
    }

    const configuredAndNewTools = [...new Set([...configuredTools, ...newlyConfiguredTools])];

    // 13. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredAndNewTools);

    // 14. Display note about extra workflows not in profile
    this.displayExtraWorkflowsNote(resolvedProjectPath, configuredAndNewTools, desiredWorkflows);
    this.displayOldCoreCustomProfileNote(profile, globalConfig.workflows);

    // 15. List affected tools
    if (updatedTools.length > 0) {
      const toolDisplayNames = updatedTools;
      console.log(chalk.dim(`Tools: ${toolDisplayNames.join(', ')}`));
    }

    console.log();
    console.log(chalk.dim('Restart your IDE for changes to take effect.'));
  }

  /**
   * Display message when all tools are up to date.
   */
  private displayUpToDateMessage(toolStatuses: ToolVersionStatus[]): void {
    const toolNames = toolStatuses.map((s) => s.toolId);
    console.log(chalk.green(`✓ All ${toolStatuses.length} tool(s) up to date (v${OPENSPEC_VERSION})`));
    console.log(chalk.dim(`  Tools: ${toolNames.join(', ')}`));
    console.log();
    console.log(chalk.dim('Use --force to refresh files anyway.'));
  }

  /**
   * Display the update plan showing which tools need updating.
   */
  private displayUpdatePlan(
    toolsToUpdate: string[],
    statusByTool: Map<string, ToolVersionStatus>,
    upToDate: ToolVersionStatus[]
  ): void {
    const updates = toolsToUpdate.map((toolId) => {
      const status = statusByTool.get(toolId);
      if (status?.needsUpdate) {
        const fromVersion = status.generatedByVersion ?? 'unknown';
        return `${status.toolId} (${fromVersion} → ${OPENSPEC_VERSION})`;
      }
      return `${toolId} (config sync)`;
    });

    console.log(`Updating ${toolsToUpdate.length} tool(s): ${updates.join(', ')}`);

    if (upToDate.length > 0) {
      const upToDateNames = upToDate.map((s) => s.toolId);
      console.log(chalk.dim(`Already up to date: ${upToDateNames.join(', ')}`));
    }
  }

  /**
   * Detects new tool directories that aren't currently configured and displays a hint.
   *
   * Once OpenSpec is installed, the canonical `.agents/skills` store already
   * serves every tool that reads it natively (i.e. every non-symlink tool), so
   * those are never "new" — only symlink-capable tools (Claude) that lack their
   * link still need setup.
   */
  private detectNewTools(projectPath: string, configuredTools: string[]): void {
    const availableTools = getAvailableTools(projectPath);
    const configuredSet = new Set(configuredTools);
    const canonicalServed = isCanonicalStorePopulated(projectPath);

    const newTools = availableTools.filter((t) => {
      if (configuredSet.has(t.value)) return false;
      // A detected non-symlink tool is already served by the canonical store.
      if (canonicalServed && !SYMLINK_TOOL_IDS.includes(t.value)) return false;
      return true;
    });

    if (newTools.length > 0) {
      const newToolNames = newTools.map((tool) => tool.name);
      const isSingleTool = newToolNames.length === 1;
      const toolNoun = isSingleTool ? 'tool' : 'tools';
      const pronoun = isSingleTool ? 'it' : 'them';
      console.log();
      console.log(
        chalk.yellow(
          `Detected new ${toolNoun}: ${newToolNames.join(', ')}. Run 'openspec init' to add ${pronoun}.`
        )
      );
    }
  }

  /**
   * Displays a note about extra workflows installed that aren't in the current profile.
   */
  private displayExtraWorkflowsNote(
    projectPath: string,
    configuredTools: string[],
    profileWorkflows: readonly string[]
  ): void {
    const installedWorkflows = scanInstalledWorkflows(projectPath, configuredTools);
    const profileSet = new Set(profileWorkflows);
    const extraWorkflows = installedWorkflows.filter((w) => !profileSet.has(w));

    if (extraWorkflows.length > 0) {
      console.log(chalk.dim(`Note: ${extraWorkflows.length} extra workflows not in profile (use \`openspec config profile\` to manage)`));
    }
  }

  /**
   * Suggest opting back into core when a custom profile still matches the old
   * pre-sync core set. Keep custom profiles user-owned; do not mutate them.
   */
  private displayOldCoreCustomProfileNote(profile: Profile, workflows?: readonly string[]): void {
    if (profile !== 'custom' || !workflows) {
      return;
    }

    const workflowSet = new Set(workflows);
    const matchesOldCore =
      workflowSet.size === OLD_CORE_WORKFLOWS.length &&
      OLD_CORE_WORKFLOWS.every((workflow) => workflowSet.has(workflow));

    if (!matchesOldCore) {
      return;
    }

    console.log(chalk.dim('Note: The core profile now includes sync. Your custom profile is preserving the old core workflow set.'));
    console.log(chalk.dim('Run `openspec config profile core` and then `openspec update` to add sync.'));
  }

  /**
   * Removes skill directories for workflows that are no longer selected in the active profile.
   * Returns the number of directories removed.
   */
  private async removeUnselectedSkillDirs(
    projectPath: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][],
    symlinkTools: readonly string[]
  ): Promise<number> {
    const desiredSet = new Set(desiredWorkflows);
    let removed = 0;

    for (const workflow of ALL_WORKFLOWS) {
      if (desiredSet.has(workflow)) continue;
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      if (!dirName) continue;

      try {
        if (await removeSkill(projectPath, dirName, { symlinkTools })) {
          removed++;
        }
      } catch {
        // Ignore errors
      }
    }

    return removed;
  }

  /**
   * Refreshes the canonical `.agents/skills` store for projects whose agents
   * read it natively (no per-tool directory to key off). Mirrors the per-tool
   * update flow's version/drift gating and reporting, but at store granularity.
   */
  private async updateCanonicalStore(
    projectPath: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][],
    profile: Profile,
    customWorkflows?: readonly string[]
  ): Promise<void> {
    const currentVersion = getCanonicalSkillVersion(projectPath);
    const needsVersionUpdate = currentVersion === null || currentVersion !== OPENSPEC_VERSION;
    const needsConfigSync = hasCanonicalProfileDrift(projectPath, desiredWorkflows);

    if (!this.force && !needsVersionUpdate && !needsConfigSync) {
      console.log(chalk.green(`✓ OpenSpec skills up to date (v${OPENSPEC_VERSION})`));
      console.log();
      console.log(chalk.dim('Use --force to refresh files anyway.'));
      this.displayOldCoreCustomProfileNote(profile, customWorkflows);
      return;
    }

    if (this.force) {
      console.log('Force updating OpenSpec skills');
    } else {
      const fromVersion = needsVersionUpdate ? (currentVersion ?? 'unknown') : null;
      console.log(
        fromVersion
          ? `Updating OpenSpec skills (${fromVersion} → ${OPENSPEC_VERSION})`
          : 'Updating OpenSpec skills (config sync)'
      );
    }
    console.log();

    const skillTemplates = getSkillTemplates(desiredWorkflows);
    const spinner = ora('Updating OpenSpec skills...').start();
    let removedDeselectedSkillCount = 0;

    try {
      await installSkills(projectPath, skillTemplates, {
        symlinkTools: [],
        version: OPENSPEC_VERSION,
      });
      removedDeselectedSkillCount = await this.removeUnselectedSkillDirs(
        projectPath,
        desiredWorkflows,
        []
      );
      spinner.succeed('Updated OpenSpec skills');
    } catch (error) {
      spinner.fail('Failed to update OpenSpec skills');
      console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
      return;
    }

    console.log();
    console.log(chalk.green(`✓ Updated: OpenSpec skills (v${OPENSPEC_VERSION})`));
    if (removedDeselectedSkillCount > 0) {
      console.log(
        chalk.dim(`Removed: ${removedDeselectedSkillCount} skill directories (deselected workflows)`)
      );
    }

    this.displayExtraWorkflowsNote(projectPath, [], desiredWorkflows);
    this.displayOldCoreCustomProfileNote(profile, customWorkflows);

    console.log();
    console.log(chalk.dim('Restart your IDE for changes to take effect.'));
  }

  /**
   * Detect and handle legacy OpenSpec artifacts.
   * Unlike init, update warns but continues if legacy files found in non-interactive mode.
   * Returns array of tool IDs that were newly configured during legacy upgrade.
   */
  private async handleLegacyCleanup(
    projectPath: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][]
  ): Promise<string[]> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return []; // No legacy artifacts found
    }

    // Show what was detected
    console.log();
    console.log(formatDetectionSummary(detection));
    console.log();

    const canPrompt = isInteractive();

    if (this.force) {
      // --force flag: proceed with cleanup automatically
      await this.performLegacyCleanup(projectPath, detection);
      // Then upgrade legacy tools to new skills
      return this.upgradeLegacyTools(projectPath, detection, canPrompt, desiredWorkflows);
    }

    if (!canPrompt) {
      // Non-interactive mode without --force: warn and continue
      // (Unlike init, update doesn't abort - user may just want to update skills)
      console.log(chalk.yellow('⚠ Run with --force to auto-cleanup legacy files, or run interactively.'));
      console.log();
      return [];
    }

    // Interactive mode: prompt for confirmation
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: 'Upgrade and clean up legacy files?',
      default: true,
    });

    if (shouldCleanup) {
      await this.performLegacyCleanup(projectPath, detection);
      // Then upgrade legacy tools to new skills
      return this.upgradeLegacyTools(projectPath, detection, canPrompt, desiredWorkflows);
    } else {
      console.log(chalk.dim('Skipping legacy cleanup. Continuing with skill update...'));
      console.log();
      return [];
    }
  }

  /**
   * Perform cleanup of legacy artifacts.
   */
  private async performLegacyCleanup(projectPath: string, detection: LegacyDetectionResult): Promise<void> {
    const spinner = ora('Cleaning up legacy files...').start();

    const result = await cleanupLegacyArtifacts(projectPath, detection);

    spinner.succeed('Legacy files cleaned up');

    const summary = formatCleanupSummary(result);
    if (summary) {
      console.log();
      console.log(summary);
    }

    console.log();
  }

  /**
   * Upgrade legacy tools to new skills system.
   * Returns array of tool IDs that were newly configured.
   */
  private async upgradeLegacyTools(
    projectPath: string,
    detection: LegacyDetectionResult,
    canPrompt: boolean,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][]
  ): Promise<string[]> {
    // Get tools that had legacy artifacts
    const legacyTools = getToolsFromLegacyArtifacts(detection);

    if (legacyTools.length === 0) {
      return [];
    }

    // Get currently configured tools
    const configuredTools = getConfiguredTools(projectPath);
    const configuredSet = new Set(configuredTools);

    // Filter to tools that aren't already configured
    const unconfiguredLegacyTools = legacyTools.filter((t) => !configuredSet.has(t));

    if (unconfiguredLegacyTools.length === 0) {
      return [];
    }

    // Get valid tools (those with skillsDir)
    const validToolIds = new Set(getToolsWithSkillsDir());
    const validUnconfiguredTools = unconfiguredLegacyTools.filter((t) => validToolIds.has(t));

    if (validUnconfiguredTools.length === 0) {
      return [];
    }

    // Show what tools were detected from legacy artifacts
    console.log(chalk.bold('Tools detected from legacy artifacts:'));
    for (const toolId of validUnconfiguredTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      console.log(`  • ${tool?.name || toolId}`);
    }
    console.log();

    let selectedTools: string[];

    if (this.force || !canPrompt) {
      // Non-interactive with --force: auto-select detected tools
      selectedTools = validUnconfiguredTools;
      console.log(`Setting up skills for: ${selectedTools.join(', ')}`);
    } else {
      // Interactive mode: prompt for tool selection with detected tools pre-selected
      const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

      const sortedChoices = validUnconfiguredTools.map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        return {
          name: tool?.name || toolId,
          value: toolId,
          configured: false,
          preSelected: true, // Pre-select all detected legacy tools
        };
      });

      selectedTools = await searchableMultiSelect({
        message: 'Select tools to set up with the new skill system:',
        pageSize: 15,
        choices: sortedChoices,
        validate: (_selected: string[]) => true, // Allow empty selection (user can skip)
      });

      if (selectedTools.length === 0) {
        console.log(chalk.dim('Skipping tool setup.'));
        console.log();
        return [];
      }
    }

    // Create skills for selected tools using the effective profile.
    const newlyConfigured: string[] = [];
    const skillTemplates = getSkillTemplates(desiredWorkflows);

    for (const toolId of selectedTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Setting up ${tool.name}...`).start();

      try {
        await installSkills(projectPath, skillTemplates, {
          symlinkTools: [toolId],
          version: OPENSPEC_VERSION,
        });

        spinner.succeed(`Setup complete for ${tool.name}`);
        newlyConfigured.push(toolId);
      } catch (error) {
        spinner.fail(`Failed to set up ${tool.name}`);
        console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    if (newlyConfigured.length > 0) {
      console.log();
    }

    return newlyConfigured;
  }
}
