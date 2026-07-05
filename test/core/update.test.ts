import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpdateCommand } from '../../src/core/update.js';
import { InitCommand } from '../../src/core/init.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { OPENSPEC_MARKERS } from '../../src/core/config.js';
import { WORKFLOW_SKILLS } from '../../src/core/workflow-skills.js';
import type { GlobalConfig } from '../../src/core/global-config.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';

// Shared mutable mock config state
const mockState = {
  config: {
    featureFlags: {},
  } as GlobalConfig,
};

// Mock global config module to isolate tests from the machine's actual config
vi.mock('../../src/core/global-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/global-config.js')>();

  return {
    ...actual,
    getGlobalConfig: () => ({ ...mockState.config }),
    saveGlobalConfig: vi.fn(),
  };
});

function resetMockConfig() {
  mockState.config = { featureFlags: {} };
}

describe('UpdateCommand', () => {
  let testDir: string;
  let updateCommand: UpdateCommand;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create openspec directory
    const openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });

    updateCommand = new UpdateCommand();

    // Reset mock config to defaults
    resetMockConfig();

    // Clear all mocks before each test
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // Restore all mocks after each test
    vi.restoreAllMocks();

    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('basic validation', () => {
    it('should throw error if openspec directory does not exist', async () => {
      // Remove openspec directory
      await fs.rm(path.join(testDir, 'openspec'), {
        recursive: true,
        force: true,
      });

      await expect(updateCommand.execute(testDir)).rejects.toThrow(
        "No OpenSpec directory found. Run 'openspec init' first."
      );
    });

    it('should report no configured tools when none exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No configured tools found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('skill updates', () => {
    it('should update skill files for configured Claude tool', async () => {
      // Set up a configured Claude tool by creating skill directories
      const skillsDir = path.join(testDir, '.claude', 'skills');
      const exploreSkillDir = path.join(skillsDir, 'openspec-explore');
      await fs.mkdir(exploreSkillDir, { recursive: true });

      // Create an existing skill file
      const oldSkillContent = `---
name: openspec-explore (old)
description: Old description
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "0.9"
---

Old instructions content
`;
      await fs.writeFile(
        path.join(exploreSkillDir, 'SKILL.md'),
        oldSkillContent
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Check skill file was updated
      const updatedSkill = await fs.readFile(
        path.join(exploreSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(updatedSkill).toContain('name: openspec-explore');
      expect(updatedSkill).not.toContain('Old instructions content');
      expect(updatedSkill).toContain('license: MIT');

      // Check console output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 1 tool(s): claude')
      );

      consoleSpy.mockRestore();
    });

    it('should install every workflow skill when tool is configured', async () => {
      // Set up a configured tool with one skill directory
      const skillsDir = path.join(testDir, '.claude', 'skills');

      // Create at least one skill to mark tool as configured
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old content'
      );

      await updateCommand.execute(testDir);

      for (const skillName of WORKFLOW_SKILLS) {
        const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
        const exists = await FileSystemUtils.fileExists(skillFile);
        expect(exists).toBe(true);

        const content = await fs.readFile(skillFile, 'utf-8');
        expect(content).toContain('---');
        expect(content).toContain('name:');
        expect(content).toContain('description:');
      }
    });
  });

  describe('multi-tool support', () => {
    it('should update multiple configured tools', async () => {
      // Set up Claude
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(claudeSkillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      // Set up Cursor
      const cursorSkillsDir = path.join(testDir, '.cursor', 'skills');
      await fs.mkdir(path.join(cursorSkillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(cursorSkillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Both configured tools are detected and reported.
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 2 tool(s)')
      );

      // The single canonical store is refreshed (every tool reads it).
      const canonicalSkill = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(canonicalSkill).toContain('name: openspec-explore');

      // Claude's directory is now a symlink resolving to the fresh canonical content.
      const claudeLink = await fs.lstat(path.join(claudeSkillsDir, 'openspec-explore'));
      expect(claudeLink.isSymbolicLink()).toBe(true);
      const claudeSkill = await fs.readFile(
        path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(claudeSkill).toContain('name: openspec-explore');

      consoleSpy.mockRestore();
    });

  });

  describe('canonical-only agents (no per-tool directory)', () => {
    it('should refresh the canonical store for a tool that reads .agents/skills natively', async () => {
      // Cursor reads the canonical store natively, so init writes no .cursor dir.
      const initCommand = new InitCommand({ tools: 'cursor', force: true });
      await initCommand.execute(testDir);

      // Sanity: skills exist in the canonical store, not under .cursor.
      const canonical = path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await FileSystemUtils.fileExists(canonical)).toBe(true);
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.cursor'))).toBe(false);

      // Force an update by staling the canonical version.
      const content = await fs.readFile(canonical, 'utf-8');
      await fs.writeFile(
        canonical,
        content.replace(/generatedBy:\s*["'][^"']+["']/, 'generatedBy: "0.1.0"')
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Update recognizes the install and refreshes it (no "No configured tools").
      const calls = consoleSpy.mock.calls.map((call) => call.map(String).join(' '));
      expect(calls.some((c) => c.includes('No configured tools'))).toBe(false);
      expect(calls.some((c) => c.includes('Updated: OpenSpec skills'))).toBe(true);

      const { version } = await import('../../package.json');
      const refreshed = await fs.readFile(canonical, 'utf-8');
      expect(refreshed).toContain(`generatedBy: "${version}"`);

      consoleSpy.mockRestore();
    });

    it('should report up to date for a current canonical-only install', async () => {
      const initCommand = new InitCommand({ tools: 'cursor', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map((call) => call.map(String).join(' '));
      expect(calls.some((c) => c.includes('No configured tools'))).toBe(false);
      expect(calls.some((c) => c.includes('OpenSpec skills up to date'))).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle tool update failures gracefully', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      // Mock writeFile to fail for skills
      const originalWriteFile = FileSystemUtils.writeFile.bind(FileSystemUtils);
      const writeSpy = vi
        .spyOn(FileSystemUtils, 'writeFile')
        .mockImplementation(async (filePath, content) => {
          if (filePath.includes('SKILL.md')) {
            throw new Error('EACCES: permission denied');
          }
          return originalWriteFile(filePath, content);
        });

      const consoleSpy = vi.spyOn(console, 'log');

      // Should not throw
      await updateCommand.execute(testDir);

      // Should report failure
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed')
      );

      writeSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should fall back to copying when symlink creation is not permitted', async () => {
      // Configured Claude tool.
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(claudeSkillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      // Simulate a platform that refuses symlink creation (e.g. Windows without
      // Developer Mode). Install must degrade to a copy, never hard-fail.
      const nodeFs = await import('node:fs');
      const symlinkSpy = vi
        .spyOn(nodeFs.promises, 'symlink')
        .mockRejectedValue(new Error('EPERM: symlink not permitted'));

      const consoleSpy = vi.spyOn(console, 'log');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await updateCommand.execute(testDir);

      // Update succeeds rather than failing.
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated')
      );

      // Claude's skill is a real copied directory (not a symlink) with fresh content.
      const claudeStat = await nodeFs.promises.lstat(
        path.join(claudeSkillsDir, 'openspec-explore')
      );
      expect(claudeStat.isSymbolicLink()).toBe(false);
      const claudeSkill = await fs.readFile(
        path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(claudeSkill).toContain('name: openspec-explore');

      symlinkSpy.mockRestore();
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  describe('tool detection', () => {
    it('should detect tool as configured only when skill file exists', async () => {
      // Create skills directory but no skill files
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(skillsDir, { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should report no configured tools
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No configured tools found')
      );

      consoleSpy.mockRestore();
    });

    it('should detect tool when any single skill exists', async () => {
      // Create only one skill file
      const skillDir = path.join(
        testDir,
        '.claude',
        'skills',
        'openspec-archive-change'
      );
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'old');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should detect and update Claude
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 1 tool(s): claude')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('skill content validation', () => {
    it('should generate valid YAML frontmatter in skill files', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      await updateCommand.execute(testDir);

      const skillContent = await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );

      // Validate frontmatter structure
      expect(skillContent).toMatch(/^---\n/);
      expect(skillContent).toContain('name:');
      expect(skillContent).toContain('description:');
      expect(skillContent).toContain('license:');
      expect(skillContent).toContain('compatibility:');
      expect(skillContent).toContain('metadata:');
      expect(skillContent).toContain('author:');
      expect(skillContent).toContain('version:');
      expect(skillContent).toMatch(/---\n\n/);
    });

    it('should include proper instructions in skill files', async () => {
      // Set up a configured tool with apply-change skill (which is in core profile)
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-apply-change'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-apply-change', 'SKILL.md'),
        'old'
      );

      await updateCommand.execute(testDir);

      const skillContent = await fs.readFile(
        path.join(skillsDir, 'openspec-apply-change', 'SKILL.md'),
        'utf-8'
      );

      // Apply skill should contain implementation instructions
      expect(skillContent.toLowerCase()).toContain('task');
    });
  });

  describe('success output', () => {
    it('should display success message with tool name', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // The success output uses "✓ Updated: <name>"
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      consoleSpy.mockRestore();
    });

    it('should suggest IDE restart after update', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Restart your IDE')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('smart update detection', () => {
    it('should show "up to date" message when skills have current version', async () => {
      // Initialize full core profile output so there is no profile/delivery drift.
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('up to date')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('--force')
      );

      consoleSpy.mockRestore();
    });

    it('should detect update needed when generatedBy is missing', async () => {
      // Set up a configured tool without generatedBy
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
---

Legacy content without generatedBy
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show "unknown → version" in the update message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown')
      );

      consoleSpy.mockRestore();
    });

    it('should detect update needed when version differs', async () => {
      // Set up a configured tool with old version
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        `---
name: openspec-explore
metadata:
  generatedBy: "0.1.0"
---

Old version content
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show version transition
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('0.1.0')
      );

      consoleSpy.mockRestore();
    });

    it('should embed generatedBy in updated skill files', async () => {
      // Set up a configured tool without generatedBy
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old content without version'
      );

      await updateCommand.execute(testDir);

      const updatedContent = await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );

      // Should contain generatedBy field (semver, including optional prerelease/build suffix)
      expect(updatedContent).toMatch(/generatedBy:\s*["']\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?["']/);
    });
  });

  describe('--force flag', () => {
    it('should update when force is true even if up to date', async () => {
      // Set up a configured tool with current version
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });

      const { version } = await import('../../package.json');
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        `---
metadata:
  generatedBy: "${version}"
---
Content
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show "Force updating" message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Force updating')
      );

      // Should show updated message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      consoleSpy.mockRestore();
    });

    it('should not show --force hint when force is used', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old content'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Get all console.log calls as strings
      const allCalls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );

      // Should not show "Use --force" since force was used
      const hasForceHint = allCalls.some(call => call.includes('Use --force'));
      expect(hasForceHint).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should update all tools when force is used with mixed versions', async () => {
      // Set up Claude with current version
      const { version } = await import('../../package.json');
      const claudeSkillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(claudeSkillDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeSkillDir, 'SKILL.md'),
        `---
metadata:
  generatedBy: "${version}"
---
`
      );

      // Set up Cursor with old version
      const cursorSkillDir = path.join(testDir, '.cursor', 'skills', 'openspec-explore');
      await fs.mkdir(cursorSkillDir, { recursive: true });
      await fs.writeFile(
        path.join(cursorSkillDir, 'SKILL.md'),
        `---
metadata:
  generatedBy: "0.1.0"
---
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show both tools being force updated
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Force updating 2 tool(s)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('version tracking', () => {
    it('should show version in success message', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show version in success message
      const { version } = await import('../../package.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`(v${version})`)
      );

      consoleSpy.mockRestore();
    });

    it('should refresh the canonical store when the installed version is stale', async () => {
      // Init claude,cursor: one canonical store + a Claude symlink (Cursor reads
      // the canonical store natively, so it has no per-tool directory).
      const initCommand = new InitCommand({ tools: 'claude,cursor', force: true });
      await initCommand.execute(testDir);

      // Make the canonical store stale (via Claude's symlink) to force an update.
      const claudeSkillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const claudeContent = await fs.readFile(claudeSkillFile, 'utf-8');
      await fs.writeFile(
        claudeSkillFile,
        claudeContent.replace(/generatedBy:\s*["'][^"']+["']/, 'generatedBy: "0.1.0"')
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Claude is the single tool with a per-tool surface, so it is reported.
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 1 tool(s)')
      );

      // The canonical store is refreshed to the current version.
      const { version } = await import('../../package.json');
      const canonical = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(canonical).toContain(`generatedBy: "${version}"`);

      consoleSpy.mockRestore();
    });
  });

  describe('no legacy interaction', () => {
    it('leaves legacy artifacts untouched and shows no legacy output', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'old');

      // Legacy-era artifacts: marker block in CLAUDE.md + slash command dir
      const legacyContent = `${OPENSPEC_MARKERS.start}
legacy instructions
${OPENSPEC_MARKERS.end}`;
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), legacyContent);
      const legacyCommandDir = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(legacyCommandDir, { recursive: true });
      await fs.writeFile(path.join(legacyCommandDir, 'proposal.md'), 'old command content');

      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand({ force: true }).execute(testDir);

      // No detection, no confirmation, no cleanup: artifacts survive verbatim.
      expect(await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8')).toBe(legacyContent);
      expect(await FileSystemUtils.fileExists(
        path.join(legacyCommandDir, 'proposal.md')
      )).toBe(true);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      expect(calls.some(call => call.toLowerCase().includes('legacy'))).toBe(false);

      consoleSpy.mockRestore();
    });

    it('cannot be restricted by retired profile keys in global config', async () => {
      mockState.config = {
        featureFlags: {},
        profile: 'custom',
        workflows: ['explore'],
      } as any;

      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'old');

      await new UpdateCommand({ force: true }).execute(testDir);

      for (const skillName of WORKFLOW_SKILLS) {
        expect(await FileSystemUtils.fileExists(
          path.join(skillsDir, skillName, 'SKILL.md')
        )).toBe(true);
      }
    });
  });

  describe('install-all convergence', () => {
    it('installs missing workflow skills without any subset prompt', async () => {
      // Configured tool with only one skill present.
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'old');

      await updateCommand.execute(testDir);

      for (const skillName of WORKFLOW_SKILLS) {
        expect(await FileSystemUtils.fileExists(
          path.join(skillsDir, skillName, 'SKILL.md')
        )).toBe(true);
      }
    });

    it('reinstalls a missing skill even when installed versions are current', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // Remove one skill from the canonical store; versions are otherwise current.
      await fs.rm(path.join(testDir, '.agents', 'skills', 'openspec-verify-change'), {
        recursive: true,
        force: true,
      });

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-verify-change', 'SKILL.md')
      )).toBe(true);
    });

    it('leaves unknown skill directories alone', async () => {
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'old');

      // A user-authored skill in the same store must survive the update.
      await fs.mkdir(path.join(skillsDir, 'my-custom-skill'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'my-custom-skill', 'SKILL.md'), 'mine');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'my-custom-skill', 'SKILL.md')
      )).toBe(true);
    });
  });

  describe('new tool detection', () => {
    it('does not flag a detected non-symlink tool as new once the canonical store is installed', async () => {
      // Install via the new model: canonical store + Claude symlink.
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // Cursor's IDE directory is present, but Cursor reads .agents/skills
      // natively — it is already served and must not be flagged as "new".
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand({ force: true }).execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasNewToolMessage = calls.some(call => call.includes('Detected new tool'));
      expect(hasNewToolMessage).toBe(false);

      consoleSpy.mockRestore();
    });

    it('does not flag multiple canonical-served tools as new', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // Two more IDE directories present; both read the canonical store natively.
      await fs.mkdir(path.join(testDir, '.github'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.github', 'copilot-instructions.md'), '');
      await fs.mkdir(path.join(testDir, '.windsurf'), { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand({ force: true }).execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasNewToolMessage = calls.some(call => call.includes('Detected new tool'));
      expect(hasNewToolMessage).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not show new tool message when no new tools detected', async () => {
      // Set up a configured tool (only Claude, no other tool directories)
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'old');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasNewToolMessage = calls.some(call =>
        call.includes('Detected new tool')
      );
      expect(hasNewToolMessage).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('tools output', () => {
    it('should list affected tools in output', async () => {
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'old');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasToolsList = calls.some(call =>
        call.includes('Tools:') && call.includes('Claude Code')
      );
      expect(hasToolsList).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
