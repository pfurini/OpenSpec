import { describe, it, expect } from 'vitest';

import { resolveSchema } from '../../../src/core/artifact-graph/resolver.js';
import { loadTemplate } from '../../../src/core/artifact-graph/instruction-loader.js';
import {
  getOpsxDesignSkillTemplate,
  getOpsxDesignCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { flattenSkillBody } from '../../../src/core/shared/skill-bundle.js';

/**
 * Contract tests for the design→tasks pipeline collapse
 * (openspec/explorations/design-tasks-pipeline-collapse.md).
 *
 * The HOW thinker (/opsx:design) now decides the wave skeleton with the user and
 * writes design.md DIRECTLY. design-notes.md is eliminated. `tasks` becomes a
 * genuinely mechanical transcription + named-test-path grounding; it decides nothing.
 * design.md is the single source of the contract.
 *
 * These pin the SEMANTIC contract (the parity hashes only detect *that* content
 * changed, not that it changed the right way).
 */

function artifactInstruction(schemaName: string, id: string): string {
  const schema = resolveSchema(schemaName);
  const artifact = schema.artifacts.find((a) => a.id === id);
  if (!artifact?.instruction) {
    throw new Error(`No instruction for artifact '${id}' in schema '${schemaName}'`);
  }
  return artifact.instruction;
}

describe('design→tasks pipeline collapse', () => {
  describe('design artifact is now a pure gate (file-presence = done; instruction read only when design.md is absent)', () => {
    const instruction = () => artifactInstruction('deep-planning', 'design');

    it('does not reference the eliminated design-notes.md shadow file', () => {
      expect(instruction()).not.toMatch(/design-notes\.md/);
    });

    it('does not instruct the generic writer to transcribe design.md', () => {
      // The generic writer (continue) must never author design.md anymore — /opsx:design does.
      expect(instruction().toLowerCase()).not.toMatch(/transcribe it faithfully/);
    });

    it('is a STOP gate pointing the user at /opsx:design', () => {
      const text = instruction();
      expect(text).toMatch(/STOP/);
      expect(text).toMatch(/\/opsx:design/);
    });

    it('no longer enumerates the design.md section spec (that home is the design skill)', () => {
      // The section spec must live in ONE home (the design skill + template), not be
      // re-specified here. The gate should not carry the full Sections list.
      expect(instruction()).not.toMatch(/Goals \/ Non-Goals/);
    });
  });

  describe('design.md template carries the Wave Skeleton (the transcription source)', () => {
    const template = () => loadTemplate('deep-planning', 'design.md');

    it('has a Wave Skeleton / Build Sequence section', () => {
      expect(template()).toMatch(/Wave Skeleton/);
    });

    it('still has the Testing Approach (scenario→layer) and Components sections', () => {
      expect(template()).toMatch(/Testing Approach/);
      expect(template()).toMatch(/Components & Dependencies/);
    });
  });

  describe('tasks artifact is genuinely mechanical transcription', () => {
    const instruction = () => artifactInstruction('deep-planning', 'tasks');

    it('sources the wave skeleton from design.md, not from its own judgment', () => {
      expect(instruction()).toMatch(/Wave Skeleton/);
      expect(instruction().toLowerCase()).toMatch(/transcrib/);
    });

    it('still grounds named-test paths against the repo (its one repo-coupled job)', () => {
      expect(instruction()).toMatch(/[Gg]round/);
      expect(instruction()).toMatch(/named-test|Named test/);
    });

    it('keeps the open-questions gap-detector (STOP → back to design)', () => {
      const text = instruction();
      expect(text).toMatch(/Open Questions/);
      expect(text).toMatch(/STOP/);
    });
  });

  describe('the wave-model JUDGMENT relocated INTO the design skill (not deleted)', () => {
    const designBody = () => {
      const t = getOpsxDesignSkillTemplate();
      return flattenSkillBody(t.instructions, t.bundle);
    };

    it('design skill writes design.md directly and never the eliminated note', () => {
      const body = designBody();
      expect(body).toMatch(/design\.md/);
      expect(body).not.toMatch(/design-notes\.md/);
    });

    it('design skill owns the wave-skeleton decision (value ordering + tracer)', () => {
      const body = designBody();
      expect(body).toMatch(/Wave Skeleton|wave skeleton/);
      expect(body.toLowerCase()).toMatch(/tracer/);
      expect(body.toLowerCase()).toMatch(/value-order|order .*by value|value order/);
    });

    it('design skill bans scope-reduction language (relocated from tasks)', () => {
      expect(designBody().toLowerCase()).toMatch(/scope[- ]reduction|mvp|for now/);
    });

    it('design command (flattened, single-file) also carries the wave skeleton', () => {
      expect(getOpsxDesignCommandTemplate().content).toMatch(/Wave Skeleton|wave skeleton/);
    });
  });
});
