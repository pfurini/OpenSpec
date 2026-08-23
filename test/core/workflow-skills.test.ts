import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

import { WORKFLOW_SKILLS } from '../../src/core/workflow-skills.js';
import {
  generateSkillContent,
  getSkillTemplates,
} from '../../src/core/shared/skill-generation.js';
import {
  type SkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
} from '../../src/core/templates/skill-templates.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');

describe('workflow skills enumeration guard', () => {
  it('matches the bundled skill directories exactly', async () => {
    const bundleDirs = (
      await fs.readdir(path.join(projectRoot, 'schemas', 'skills'), { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect([...WORKFLOW_SKILLS].sort()).toEqual(bundleDirs);
  });

  it('matches the skill template registry exactly', () => {
    const templateDirs = getSkillTemplates()
      .map((entry) => entry.dirName)
      .sort();

    expect([...WORKFLOW_SKILLS].sort()).toEqual(templateDirs);
  });
});

describe('archive skill prose: date-prefix guard', () => {
  const archiveSkills: Array<[string, () => SkillTemplate]> = [
    ['openspec-archive-change', getArchiveChangeSkillTemplate],
    ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
  ];

  it.each(archiveSkills)(
    '%s instructs date-prefixing only when the change name is not already dated',
    (_dirName, createTemplate) => {
      const content = generateSkillContent(createTemplate(), 'WORKFLOW-SKILLS-TEST');

      // The guard's condition: a name that already carries a `YYYY-MM-DD-` prefix.
      expect(content).toMatch(/already starts with a `YYYY-MM-DD-` prefix/);
      // Its outcome: that name is the target name, unchanged.
      expect(content).toMatch(/use it unchanged as the target name/);
      // And the failure it prevents, spelled out so the agent cannot re-derive it.
      expect(content).toMatch(/never stack a second date/);
      // The undated branch still date-prefixes.
      expect(content).toMatch(/YYYY-MM-DD-<change-name>/);
    }
  );
});
