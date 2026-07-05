import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

import { WORKFLOW_SKILLS } from '../../src/core/workflow-skills.js';
import { getSkillTemplates } from '../../src/core/shared/skill-generation.js';

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
