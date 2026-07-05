/**
 * Update Command
 *
 * Refreshes OpenSpec skills for configured tools.
 * Converges every tool to the full bundled workflow skill set, with smart
 * update detection (version drift or missing skills).
 */

import path from 'path';
import * as fs from 'fs';
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
  SYMLINK_TOOL_IDS,
  type ToolVersionStatus,
} from './shared/index.js';
import { getCanonicalSkillsDir } from './shared/skill-install.js';
import {
  detectLegacyArtifacts,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  getToolsFromLegacyArtifacts,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getAvailableTools } from './available-tools.js';
import { WORKFLOW_SKILLS } from './workflow-skills.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Force update even when tools are up to date */
  force?: boolean;
}

/**
 * True when the given skills directory is missing any bundled workflow skill.
 * Unknown (user-authored) directories are never considered — convergence only
 * installs what the enumeration owns, it never removes.
 */
function isMissingWorkflowSkills(skillsDir: string): boolean {
  return WORKFLOW_SKILLS.some(
    (dirName) => !fs.existsSync(path.join(skillsDir, dirName, 'SKILL.md'))
  );
}

/**
 * Returns configured tools whose skill directories are missing bundled skills.
 */
function getToolsMissingSkills(projectPath: string, configuredTools: readonly string[]): string[] {
  return [...new Set(configuredTools)].filter((toolId) => {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool?.skillsDir) return false;
    return isMissingWorkflowSkills(path.join(projectPath, tool.skillsDir, 'skills'));
  });
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

    // 2. Detect and handle legacy artifacts + upgrade legacy tools
    const newlyConfiguredTools = await this.handleLegacyCleanup(resolvedProjectPath);

    // 3. Find configured tools
    const configuredTools = getConfiguredTools(resolvedProjectPath);

    // Most agents read the canonical `.agents/skills` store natively and never
    // get a per-tool directory, so `configuredTools` can be empty even though
    // OpenSpec is installed. Refresh the canonical store directly in that case.
    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      if (isCanonicalStorePopulated(resolvedProjectPath)) {
        await this.updateCanonicalStore(resolvedProjectPath);
        return;
      }

      console.log(chalk.yellow('No configured tools found.'));
      console.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    // 4. Check version status for all configured tools
    const toolStatuses = configuredTools.map((toolId) =>
      getToolVersionStatus(resolvedProjectPath, toolId, OPENSPEC_VERSION)
    );
    const statusByTool = new Map(toolStatuses.map((status) => [status.toolId, status] as const));

    // 5. Smart update detection: version drift or missing bundled skills
    const toolsNeedingVersionUpdate = toolStatuses
      .filter((s) => s.needsUpdate)
      .map((s) => s.toolId);
    const toolsMissingSkills = getToolsMissingSkills(resolvedProjectPath, configuredTools);
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsMissingSkills,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0) {
      // All tools are up to date
      this.displayUpToDateMessage(toolStatuses);

      // Still check for new tool directories
      this.detectNewTools(resolvedProjectPath, configuredTools);
      return;
    }

    // 6. Display update plan
    if (this.force) {
      console.log(`Force updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    } else {
      this.displayUpdatePlan([...toolsToUpdateSet], statusByTool, toolsUpToDate);
    }
    console.log();

    // 7. Update tools (all if force, otherwise only those needing update).
    // Skills are written once to the canonical `.agents/skills` store and
    // re-symlinked for symlink-capable tools (Claude). Every configured tool
    // consumes that single store, so refreshing it refreshes them all.
    const skillTemplates = getSkillTemplates();
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];
    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];

    if (toolsToUpdate.length > 0) {
      const spinner = ora('Updating OpenSpec skills...').start();
      const warnings: string[] = [];

      try {
        await installSkills(resolvedProjectPath, skillTemplates, {
          symlinkTools: toolsToUpdate,
          version: OPENSPEC_VERSION,
          onWarn: (message) => warnings.push(message),
        });

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

    // 8. Summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }

    // 9. Show onboarding message for newly configured tools from legacy upgrade
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

    // 10. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredAndNewTools);

    // 11. List affected tools
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
      return `${toolId} (missing skills)`;
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
   * Refreshes the canonical `.agents/skills` store for projects whose agents
   * read it natively (no per-tool directory to key off). Mirrors the per-tool
   * update flow's version/missing-skill gating and reporting, but at store
   * granularity.
   */
  private async updateCanonicalStore(projectPath: string): Promise<void> {
    const currentVersion = getCanonicalSkillVersion(projectPath);
    const needsVersionUpdate = currentVersion === null || currentVersion !== OPENSPEC_VERSION;
    const needsMissingSkills = isMissingWorkflowSkills(getCanonicalSkillsDir(projectPath));

    if (!this.force && !needsVersionUpdate && !needsMissingSkills) {
      console.log(chalk.green(`✓ OpenSpec skills up to date (v${OPENSPEC_VERSION})`));
      console.log();
      console.log(chalk.dim('Use --force to refresh files anyway.'));
      return;
    }

    if (this.force) {
      console.log('Force updating OpenSpec skills');
    } else {
      const fromVersion = needsVersionUpdate ? (currentVersion ?? 'unknown') : null;
      console.log(
        fromVersion
          ? `Updating OpenSpec skills (${fromVersion} → ${OPENSPEC_VERSION})`
          : 'Updating OpenSpec skills (missing skills)'
      );
    }
    console.log();

    const skillTemplates = getSkillTemplates();
    const spinner = ora('Updating OpenSpec skills...').start();

    try {
      await installSkills(projectPath, skillTemplates, {
        symlinkTools: [],
        version: OPENSPEC_VERSION,
      });
      spinner.succeed('Updated OpenSpec skills');
    } catch (error) {
      spinner.fail('Failed to update OpenSpec skills');
      console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
      return;
    }

    console.log();
    console.log(chalk.green(`✓ Updated: OpenSpec skills (v${OPENSPEC_VERSION})`));
    console.log();
    console.log(chalk.dim('Restart your IDE for changes to take effect.'));
  }

  /**
   * Detect and handle legacy OpenSpec artifacts.
   * Unlike init, update warns but continues if legacy files found in non-interactive mode.
   * Returns array of tool IDs that were newly configured during legacy upgrade.
   */
  private async handleLegacyCleanup(projectPath: string): Promise<string[]> {
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
      return this.upgradeLegacyTools(projectPath, detection, canPrompt);
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
      return this.upgradeLegacyTools(projectPath, detection, canPrompt);
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
    canPrompt: boolean
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

    // Create skills for selected tools — always the full bundled set.
    const newlyConfigured: string[] = [];
    const skillTemplates = getSkillTemplates();

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
