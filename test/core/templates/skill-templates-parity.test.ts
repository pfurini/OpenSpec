import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getReverseSkillTemplate,
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
  getExploreSkillTemplate: '8ff9c5fa35aef47949a2c4aff2aef5612c7565bd1deb2cdb946bccebd91602c3',
  getReverseSkillTemplate: 'acbc88d5e7a97ee104e6b53b1029b51bf2ebd045a7f4c8887931378ec4532c8d',
  getOpsxDesignSkillTemplate: 'ae6ffbfb754023773e4b0c580001dea9b5d513341f4a6d65e41ff1d8ac193eb9',
  getNewChangeSkillTemplate: '020863604c6c84ba6fcd2a79a4d80416cef16ef502d3fc02d37e4f573cef5553',
  getContinueChangeSkillTemplate: 'b1358fc2b7f99746a9e905289b3a6054c6ddb6f05a34e3b76f7cb0cb5b1acfd0',
  getApplyChangeSkillTemplate: 'db94fe23ed51e2156568b8e0117acf875582fdf0c804e7867488f6f231e20dc5',
  getFfChangeSkillTemplate: '2770930e71a4a2994d55c62e49311853e54848638fdb3a790110f56065d00ce7',
  getSyncSpecsSkillTemplate: '8fb15693288b95d3a0a966a15972b00029bd7400ec75e55b8581dc6d3d161aeb',
  getOnboardSkillTemplate: '89e7728506f0d5faea7e39841f3277cf8d837eef123703f15729a11b8daf5e0c',
  getArchiveChangeSkillTemplate: 'd8529cf40f6e8191bcf7558ba8dd730030e5405d71dae5fe76cc679345cba3db',
  getBulkArchiveChangeSkillTemplate: '12fbe1b8cac45da6323766d965099fd6ed0f245b596a312b2a1595c238c63dd0',
  getVerifyChangeSkillTemplate: 'd718c79aad649223a73fdb11036c93fb3842ac5a780f4934d50bfa03c9692683',
  getOpsxProposeSkillTemplate: 'ad2aea1a16400c26ecb1845f09555bd0bfb4c7c2876a0835d93ad84060203c08',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'a745963e83b0763bc698f3eab0d7dceca624e738906a9b1556774fa212ac4d69',
  'openspec-reverse': 'fbb3e0c71abb62f3d8651895e3b1ac09ba9bb2737f43136aab5cb1019765681d',
  'openspec-design': 'bf19fdcadebacc8e135ece16ca575cdc160b704c33d5386f37467affdef7eec3',
  'openspec-new-change': 'd88c71cce800262c49383382a919197f197be52c6e9004d3c0acccd7150ecd80',
  'openspec-continue-change': '3ef2efb7245a043bc661664ae2f80166209e66a42af2d7e8d747ef6d9e512632',
  'openspec-apply-change': 'a423ada3b80a7f4f74885fbff5929ce4983f72b3fdcb41d9606508688bb5bbdf',
  'openspec-ff-change': '87445c63d0648b132c42e2ffed1e438cac2748e4f34d3321df42ef3af073118f',
  'openspec-sync-specs': 'a5d13279b9e868ccfa0ef0b626c21ff7a9942afe75790cdccb06b488917925f7',
  'openspec-archive-change': '552c31ff2418ebd98d7b9ebd08ff55cb9fe5fd89a968fc563d566ebb0a4c70bd',
  'openspec-bulk-archive-change': 'daf6288f09c7e7d808dd7be2ecf3e4edb98527b8943a6fa28cae50d803a2e5b1',
  'openspec-verify-change': '97d1eed5b900788706c28339e27c1d2d9c548626316253f43ebd00d8d52d02d6',
  'openspec-onboard': '0cef02201124982fae7c563bd6ddfe07dae132624010adf3489f093de99b42e2',
  'openspec-propose': 'fc4ab2f697689b5dac5498c2935abd26748164e877dcaf3bd3c82cff08e815f8',
};

const EXPECTED_BUNDLE_TREE_HASHES: Record<string, string> = {
  'openspec-design:full': '0372ec0bafe2710b90878da2c95ba14ac605b593e77c08bd38c69bf6eee76c86',
  'openspec-design:flatten': 'cfc1a177d89578cb33cdc4a46f7f0865597b9f165f669165af6c8c81fbe64500',
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
      getReverseSkillTemplate,
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
      ['openspec-reverse', getReverseSkillTemplate],
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
});
