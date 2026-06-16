import { describe, expect, it } from 'vitest';

import { getSkillTemplates } from '../../../src/core/shared/skill-generation.js';
import { flattenSkillBody } from '../../../src/core/shared/skill-bundle.js';

/**
 * Guard: every `openspec-<name>` skill reference that appears in a skill BODY must
 * resolve to a real skill directory. Skill bodies now reference sibling skills by
 * their full name (e.g. `openspec-continue-change`) instead of the old `/opsx:`
 * slash-command syntax — but unlike bundle-block paths, those bare names have no
 * load-time validator. The command-id -> skill-name mapping is irregular
 * (`continue` -> `openspec-continue-change`, `sync` -> `openspec-sync-specs`), so a
 * hand-edit can easily mint a dangling ref like `openspec-continue`. This test is
 * the only thing that catches that.
 */
describe('skill bodies reference only real skills', () => {
  const entries = getSkillTemplates();
  const validNames = new Set(entries.map((e) => e.dirName));

  // Tokens of the shape `openspec-<segment>(-<segment>)*` — the skill-name shape.
  const SKILL_REF_RE = /openspec-[a-z]+(?:-[a-z]+)*/g;

  for (const { template, dirName } of entries) {
    it(`${dirName}: every openspec-* reference resolves`, () => {
      // Flatten so reference-file bodies (e.g. design's flow.md) are scanned too.
      const body = flattenSkillBody(template.instructions, template.bundle);
      const refs = [...body.matchAll(SKILL_REF_RE)].map((m) => m[0]);
      const dangling = [...new Set(refs)].filter((ref) => !validNames.has(ref));
      expect(dangling, `dangling skill refs in ${dirName}`).toEqual([]);
    });
  }
});
