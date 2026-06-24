/**
 * Shared Utilities
 *
 * Common code shared between init and update commands.
 */

export {
  SKILL_NAMES,
  type SkillName,
  type ToolSkillStatus,
  type ToolVersionStatus,
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  extractGeneratedByVersion,
  getToolVersionStatus,
  getConfiguredTools,
  getAllToolVersionStatus,
  getInstalledCanonicalSkillNames,
  isCanonicalStorePopulated,
  getCanonicalSkillVersion,
} from './tool-detection.js';

export {
  type SkillTemplateEntry,
  getSkillTemplates,
  generateSkillContent,
  buildSkillArtifacts,
} from './skill-generation.js';

export {
  CANONICAL_SKILLS_RELDIR,
  SYMLINK_TOOL_IDS,
  type InstallableSkill,
  type InstallSkillsOptions,
  installSkills,
  removeSkill,
  getCanonicalSkillsDir,
} from './skill-install.js';
