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
  getNewChangeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent, buildSkillArtifacts } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '49739a347a1cda594354fa471894036926200fe62e1188b97dad7f7e41ab5210',
  getReverseSkillTemplate: 'acbc88d5e7a97ee104e6b53b1029b51bf2ebd045a7f4c8887931378ec4532c8d',
  getOpsxDesignSkillTemplate: 'ae6ffbfb754023773e4b0c580001dea9b5d513341f4a6d65e41ff1d8ac193eb9',
  getNewChangeSkillTemplate: '1586d2365c1e34817b245352bffe7800b59bf6a23d72e9f331049b1e7f7348e0',
  getContinueChangeSkillTemplate: '3d08d09995bc32975ed732ea2becab33be3f96c76995a30dd1eec112695b8478',
  getApplyChangeSkillTemplate: '9b1cc0151aa00d7dcb73525a81886ec01122189b04380c55b203b68514abb4c3',
  getSyncSpecsSkillTemplate: '8fb15693288b95d3a0a966a15972b00029bd7400ec75e55b8581dc6d3d161aeb',
  getArchiveChangeSkillTemplate: 'd8529cf40f6e8191bcf7558ba8dd730030e5405d71dae5fe76cc679345cba3db',
  getBulkArchiveChangeSkillTemplate: '12fbe1b8cac45da6323766d965099fd6ed0f245b596a312b2a1595c238c63dd0',
  getVerifyChangeSkillTemplate: '40391f03390c62263e33dde0bc22627a0b3bf3f5961fe68e72747c0fd5a9db0e',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '08303d9498074354c9e36eca25240528b0b9e6f5f03eb6d2004b9a9762357cb2',
  'openspec-reverse': 'fbb3e0c71abb62f3d8651895e3b1ac09ba9bb2737f43136aab5cb1019765681d',
  'openspec-design': 'bf19fdcadebacc8e135ece16ca575cdc160b704c33d5386f37467affdef7eec3',
  'openspec-new-change': 'a34852cd0258ed892ec4aa39fb84cd19aff1a49864bf246ae6a180184f87e722',
  'openspec-continue-change': '740ccc3c7c407e98665203c01625caff14cf429eb21dae007f1aca33f6383101',
  'openspec-apply-change': 'b5bc3236f52be9d3d6fe9efe2b7262f37eba8cab321499e9e78239dabf7efc4d',
  'openspec-sync-specs': 'a5d13279b9e868ccfa0ef0b626c21ff7a9942afe75790cdccb06b488917925f7',
  'openspec-archive-change': '552c31ff2418ebd98d7b9ebd08ff55cb9fe5fd89a968fc563d566ebb0a4c70bd',
  'openspec-bulk-archive-change': 'daf6288f09c7e7d808dd7be2ecf3e4edb98527b8943a6fa28cae50d803a2e5b1',
  'openspec-verify-change': '583b66750f560da7fd505aee3958e738caa07d0b276169f976fc80d579cba833',
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
      getSyncSpecsSkillTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getVerifyChangeSkillTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    const skillFactories: Array<[string, () => SkillTemplate]> = [
      ['openspec-explore', getExploreSkillTemplate],
      ['openspec-reverse', getReverseSkillTemplate],
      ['openspec-design', getOpsxDesignSkillTemplate],
      ['openspec-new-change', getNewChangeSkillTemplate],
      ['openspec-continue-change', getContinueChangeSkillTemplate],
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
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
