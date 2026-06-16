import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getOpsxDesignSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxProposeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent, buildSkillArtifacts } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: 'dd21790d9fd81d61b0eaaeba32b60cabe9aa58fe5d06d14dd1fe1d8d6eefe910',
  getOpsxDesignSkillTemplate: '80bfceb8d0f42a6b29c0542a258acddaafc893694d9c9893cf3e922a4d8ab9a3',
  getNewChangeSkillTemplate: '2ac7d5f59b5b76a87c14d70e59eb22c21b447f0047ecf95c3d8ff5bc146dc4d1',
  getContinueChangeSkillTemplate: 'b5df70304d16b6ce4b311ba206062d715ef482c162e896360e6c0790254ca235',
  getApplyChangeSkillTemplate: 'd2a6e033b071872604837b3a1fa1915d9eaf4fc46ad10a3c6f5395df96dab42f',
  getFfChangeSkillTemplate: 'e1aac080505d00092da675ce174583c9efc1319723f78191bdb79ea4d7b14aff',
  getSyncSpecsSkillTemplate: '9f02b41227db70875b89eefeb275c769142607dc5b2593f4e606794aed2fdbad',
  getOnboardSkillTemplate: '0b9e602d807c3da7d587a330b7a1ae26dbdb6154b7bf0738c9c3c2caed74b4ff',
  getArchiveChangeSkillTemplate: 'bd5d4b0a66e832cba11279b7d60a71ae501f742f2fcf359fcd8471fe2e17e9ba',
  getBulkArchiveChangeSkillTemplate: 'fdb1715804e86de85be96222b8efeb9d5b350c6d5c19e343e244655deff8e62b',
  getVerifyChangeSkillTemplate: '3c5dda8b49ba00f50b5bae7f04763dd00cc00a05e5f1d8a2068ad7fb701d8165',
  getOpsxProposeSkillTemplate: '5c6584183c8fe8a23a9dc1dbdcbb120dca26f4dec894f951033038dbbb149359',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '9b75a6fd67e2286d7fbb4d3d6a88025bb4a120aee10c06c55f041d51bb2a2d8e',
  'openspec-design': 'bf19fdcadebacc8e135ece16ca575cdc160b704c33d5386f37467affdef7eec3',
  'openspec-new-change': 'a6a956df4c601f06444011925fc105e964c0ab25f3a2485533acffad4e7646b3',
  'openspec-continue-change': '0f21b5a488700a6908427a2a09b2f929db58fb3932a28853605fd8488dbfbf71',
  'openspec-apply-change': '0fb78e83af6e3631f4a36fd950a54ecebda35bfa8a7574dcb7ba4d542cb13fe4',
  'openspec-ff-change': '53e6e12060f004a145091fbe9cd0afa5d37736a219c3768524d23d0a474824c2',
  'openspec-sync-specs': '2e0f67ec6fadffc6107b4b1a28eef23a99a6649e5fae706897ea1dd9deb852a8',
  'openspec-archive-change': 'ec01ca4aa6da99258a6e3e2a47b457e4117e45c146e0a698ec310326e775a49c',
  'openspec-bulk-archive-change': '16207683996b1952559cd4e33463f28fb097761f2c5d912107733d01a90d3f2f',
  'openspec-verify-change': 'a2acecd0c2b4e57080a314e5e7a093e0688293c37e446eb45d378f5050058550',
  'openspec-onboard': 'a706d5be5b8b1a0a30a3df112759621aeb2bdf61e1433d82fb30dfdd1c198177',
  'openspec-propose': '26b73d61f937a2acc92f5d0051bd85ed924f8b4122ca87d20b600503dd6ea053',
};

const EXPECTED_BUNDLE_TREE_HASHES: Record<string, string> = {
  'openspec-design:full': '54b01d5aabfa8356f4f619363ec1c7f5130e20e43e006e9bd4967521a6393790',
  'openspec-design:flatten': 'cdd829acef46da50aacf025f5be4c802c7b587e2d480257745df2e6724347c1f',
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getOpsxDesignSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxProposeSkillTemplate,
      getFeedbackSkillTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    // Intentionally excludes getFeedbackSkillTemplate: skillFactories only models templates
    // deployed via generateSkillContent, while feedback is covered in function payload parity.
    const skillFactories: Array<[string, () => SkillTemplate]> = [
      ['openspec-explore', getExploreSkillTemplate],
      ['openspec-design', getOpsxDesignSkillTemplate],
      ['openspec-new-change', getNewChangeSkillTemplate],
      ['openspec-continue-change', getContinueChangeSkillTemplate],
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-ff-change', getFfChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
      ['openspec-onboard', getOnboardSkillTemplate],
      ['openspec-propose', getOpsxProposeSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });

  it('preserves the multi-file bundle tree exactly (full + flatten)', () => {
    // Tree parity for skills carrying a `bundle`: hashes the full emitted file set
    // (SKILL.md + references/* [+ scripts/*]) per capability, so reference content is
    // guarded — not just the single SKILL.md. Extend `bundledSkillFactories` as more
    // skills become multi-file.
    const bundledSkillFactories: Array<[string, () => SkillTemplate]> = [
      ['openspec-design', getOpsxDesignSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      bundledSkillFactories.flatMap(([dirName, createTemplate]) =>
        (['full', 'flatten'] as const).map((capability) => [
          `${dirName}:${capability}`,
          hash(stableStringify(buildSkillArtifacts(createTemplate(), 'PARITY-BASELINE', capability))),
        ])
      )
    );

    expect(actualHashes).toEqual(EXPECTED_BUNDLE_TREE_HASHES);
  });

  it('guards unsupported workspace workflows from repo-local fallback edits', () => {
    const guardedSkills: Array<[string, () => SkillTemplate, string]> = [
      ['openspec-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['openspec-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['openspec-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('openspec/changes/<name>');
      expect(content, dirName).not.toContain('mv openspec/changes');
    }
  });
});
