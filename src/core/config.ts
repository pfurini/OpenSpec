export const OPENSPEC_DIR_NAME = 'openspec';

export const OPENSPEC_MARKERS = {
  start: '<!-- OPENSPEC:START -->',
  end: '<!-- OPENSPEC:END -->'
};

export interface OpenSpecConfig {
  aiTools: string[];
}

/**
 * How a tool consumes multi-file skill bundles (references/, scripts/):
 * - `full`: progressive disclosure — references/scripts written as separate files
 * - `flatten`: single SKILL.md only — references concatenated, scripts dropped
 *
 * "Agent Skills" (SKILL.md + references/ + scripts/) is a cross-tool open standard
 * supported by 30+ platforms (Claude, Codex, Cursor, Gemini CLI, Copilot, …), and
 * OpenSpec already emits the Agent Skills layout to every tool with a skillsDir — so
 * `full` is the default. `flatten` is opt-in for tools known not to read subdirectories
 * (it always yields a complete, if larger, SKILL.md — never silent content loss).
 * Converges with the future `ToolProfile` capability model
 * (`unify-template-generation-pipeline`).
 */
export type SkillBundleCapability = 'full' | 'flatten';

export interface AIToolOption {
  name: string;
  value: string;
  available: boolean;
  successLabel?: string;
  skillsDir?: string; // e.g., '.claude' - /skills suffix per Agent Skills spec
  detectionPaths?: string[]; // Override skillsDir for auto-detection; any path existing triggers detection
  skillBundle?: SkillBundleCapability; // multi-file bundle support; defaults to 'full' for skillsDir tools
}

/**
 * Resolves a tool's skill-bundle capability. Tools with a skillsDir default to
 * `full` (the Agent Skills standard); set `skillBundle: 'flatten'` to opt a tool
 * out. Tools with no skillsDir resolve to `flatten` (no multi-file surface).
 */
export function getSkillBundleCapability(toolValue: string): SkillBundleCapability {
  const tool = AI_TOOLS.find((t) => t.value === toolValue);
  if (tool?.skillBundle) return tool.skillBundle;
  return tool?.skillsDir ? 'full' : 'flatten';
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Amazon Q Developer', value: 'amazon-q', available: true, successLabel: 'Amazon Q Developer', skillsDir: '.amazonq' },
  { name: 'Antigravity', value: 'antigravity', available: true, successLabel: 'Antigravity', skillsDir: '.agent' },
  { name: 'Auggie (Augment CLI)', value: 'auggie', available: true, successLabel: 'Auggie', skillsDir: '.augment' },
  { name: 'Bob Shell', value: 'bob', available: true, successLabel: 'Bob Shell', skillsDir: '.bob' },
  { name: 'Claude Code', value: 'claude', available: true, successLabel: 'Claude Code', skillsDir: '.claude' },
  { name: 'Cline', value: 'cline', available: true, successLabel: 'Cline', skillsDir: '.cline' },
  { name: 'Codex', value: 'codex', available: true, successLabel: 'Codex', skillsDir: '.codex' },
  { name: 'ForgeCode', value: 'forgecode', available: true, successLabel: 'ForgeCode', skillsDir: '.forge' },
  { name: 'CodeBuddy Code (CLI)', value: 'codebuddy', available: true, successLabel: 'CodeBuddy Code', skillsDir: '.codebuddy' },
  { name: 'Continue', value: 'continue', available: true, successLabel: 'Continue (VS Code / JetBrains / Cli)', skillsDir: '.continue' },
  { name: 'CoStrict', value: 'costrict', available: true, successLabel: 'CoStrict', skillsDir: '.cospec' },
  { name: 'Crush', value: 'crush', available: true, successLabel: 'Crush', skillsDir: '.crush' },
  { name: 'Cursor', value: 'cursor', available: true, successLabel: 'Cursor', skillsDir: '.cursor' },
  { name: 'Factory Droid', value: 'factory', available: true, successLabel: 'Factory Droid', skillsDir: '.factory' },
  { name: 'Gemini CLI', value: 'gemini', available: true, successLabel: 'Gemini CLI', skillsDir: '.gemini' },
  { name: 'GitHub Copilot', value: 'github-copilot', available: true, successLabel: 'GitHub Copilot', skillsDir: '.github', detectionPaths: ['.github/copilot-instructions.md', '.github/instructions', '.github/workflows/copilot-setup-steps.yml', '.github/prompts', '.github/agents', '.github/skills', '.github/.mcp.json'] },
  { name: 'iFlow', value: 'iflow', available: true, successLabel: 'iFlow', skillsDir: '.iflow' },
  { name: 'Junie', value: 'junie', available: true, successLabel: 'Junie', skillsDir: '.junie' },
  { name: 'Kilo Code', value: 'kilocode', available: true, successLabel: 'Kilo Code', skillsDir: '.kilocode' },
  { name: 'Kimi CLI', value: 'kimi', available: true, successLabel: 'Kimi CLI', skillsDir: '.kimi' },
  { name: 'Kiro', value: 'kiro', available: true, successLabel: 'Kiro', skillsDir: '.kiro' },
  { name: 'Lingma', value: 'lingma', available: true, successLabel: 'Lingma', skillsDir: '.lingma' },
  { name: 'Mistral Vibe', value: 'vibe', available: true, successLabel: 'Mistral Vibe', skillsDir: '.vibe' },
  { name: 'OpenCode', value: 'opencode', available: true, successLabel: 'OpenCode', skillsDir: '.opencode' },
  { name: 'Pi', value: 'pi', available: true, successLabel: 'Pi', skillsDir: '.pi' },
  { name: 'Qoder', value: 'qoder', available: true, successLabel: 'Qoder', skillsDir: '.qoder' },
  { name: 'Qwen Code', value: 'qwen', available: true, successLabel: 'Qwen Code', skillsDir: '.qwen' },
  { name: 'RooCode', value: 'roocode', available: true, successLabel: 'RooCode', skillsDir: '.roo' },
  { name: 'Trae', value: 'trae', available: true, successLabel: 'Trae', skillsDir: '.trae' },
  { name: 'Windsurf', value: 'windsurf', available: true, successLabel: 'Windsurf', skillsDir: '.windsurf' },
  { name: 'AGENTS.md (works with Amp, VS Code, …)', value: 'agents', available: false, successLabel: 'your AGENTS.md-compatible assistant' }
];
