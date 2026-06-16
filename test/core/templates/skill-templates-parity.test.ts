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
  getOpsxDesignCommandTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent, buildSkillArtifacts } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '2ae925bac22575d7af8f24fe6c94d1ebcbd0f7897ea60f9873823299affa15ce',
  getOpsxDesignSkillTemplate: 'e3dfc3f218914e27dbfe0c0129b898b6ebcf7d243f0d48e991826f34317569ab',
  getOpsxDesignCommandTemplate: 'd573355e240c98a9b78876458b7b141eae8541e4b237780bb6437d696a762b53',
  getNewChangeSkillTemplate: '8dd042e33d5db66fb3bacc0bba806c669c1c02802abf4bc7e0fbe74c189c2d87',
  getContinueChangeSkillTemplate: '54dda3115192748419ca9771893665a19c39745910f525bcb817f72fe48ceea8',
  getApplyChangeSkillTemplate: 'e746f230c2513a5fd40842bde494bb3cdb3c5f7c1bcece101f92090983d4ff55',
  getFfChangeSkillTemplate: '50e68fbb49b76d2690b614bffa9e6210e45539fb74419fc2e4311158b6d38485',
  getSyncSpecsSkillTemplate: '9f02b41227db70875b89eefeb275c769142607dc5b2593f4e606794aed2fdbad',
  getOnboardSkillTemplate: '4f4b60fea6e3fc7d2185815b2808fad51535fdd00cd4401b32d1536f32fa2b6d',
  getOpsxExploreCommandTemplate: 'e0b872e4ced11a2b226c202e5199b8763c4093ef04ead16269ffcf590bfc85ef',
  getOpsxNewCommandTemplate: '4f45b76ac9bcf23768962fa21d1323c7e0d10a1508bbdc02ba37ccf275214ace',
  getOpsxContinueCommandTemplate: '0d5169eecd13d948c211bf10926bccb237399b4208e42290b873fd6fcd5e32c0',
  getOpsxApplyCommandTemplate: '812feefd32a4d9d468e03e456d06e3d2d08d1118d29cce4911f0be59cdd30bfc',
  getOpsxFfCommandTemplate: 'f775b242bcfd56594c431c7f31a0129208a1bacfdb2427074d412543072ef7ca',
  getArchiveChangeSkillTemplate: 'bd5d4b0a66e832cba11279b7d60a71ae501f742f2fcf359fcd8471fe2e17e9ba',
  getBulkArchiveChangeSkillTemplate: 'fdb1715804e86de85be96222b8efeb9d5b350c6d5c19e343e244655deff8e62b',
  getOpsxSyncCommandTemplate: '4c8118afaea79ff4fed3d946c88e6a7abbba904a5fbf643e4372da1e3735a467',
  getVerifyChangeSkillTemplate: '3c5dda8b49ba00f50b5bae7f04763dd00cc00a05e5f1d8a2068ad7fb701d8165',
  getOpsxArchiveCommandTemplate: '9fd2155542df9a52dbbf0ca6c9d564481f3df532054b226a7824da1022e4c2af',
  getOpsxOnboardCommandTemplate: '57c1f3e2590bda8f47818bab1d528456c1b8a9a7501f63ab9e2115e0cfaf6f35',
  getOpsxBulkArchiveCommandTemplate: 'b76c421023ccb5a12867c349f27cdb186234b692c1811980fb94127567bdabda',
  getOpsxVerifyCommandTemplate: '9a7a3f9e5bc3d0c0878b1a4493efbbb38729597d9b9be78f63284cc2da7c20c3',
  getOpsxProposeSkillTemplate: '360bb369002053c42d387ff199bb33c97fa300782cad20e35c55d1da4c174194',
  getOpsxProposeCommandTemplate: 'cd0bb2db964d4c399bb6aa590116c3a5643af41dcc3875fdec0a8044f3786b8b',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '1d9a292e1cfdfe0af5b81be2a8b0b042cf518ca48987890ee31a9201b8e535bb',
  'openspec-design': 'f13edf99faea069ed5349be29e24dddd01b001648503bb6fedd2e93030807704',
  'openspec-new-change': '56d91ad2d746f35ab87990e0875985f1421a07ad965e40fee4f46a96fd5c6bcb',
  'openspec-continue-change': '92779c8f0b18ad74cf27d551603957ea976c6dfa5f36ea032bfec624e5fe218e',
  'openspec-apply-change': 'd849442efd925b9247651e254a5cd696945321610cca5a9432ad420430554548',
  'openspec-ff-change': '9d9b1995b6f4adb3da570676f7d11fee4cd1cf6c5df8ec83c033e02783a544df',
  'openspec-sync-specs': '2e0f67ec6fadffc6107b4b1a28eef23a99a6649e5fae706897ea1dd9deb852a8',
  'openspec-archive-change': 'ec01ca4aa6da99258a6e3e2a47b457e4117e45c146e0a698ec310326e775a49c',
  'openspec-bulk-archive-change': '16207683996b1952559cd4e33463f28fb097761f2c5d912107733d01a90d3f2f',
  'openspec-verify-change': 'a2acecd0c2b4e57080a314e5e7a093e0688293c37e446eb45d378f5050058550',
  'openspec-onboard': 'b924ea3c97543ebb7ee82c5f194afe7ce87a521c32b85616f445240ab33a02ab',
  'openspec-propose': '1a913f212df682d7a72295097c167d6781b7b38a1e593d60d27ef82357b09fc6',
};

const EXPECTED_BUNDLE_TREE_HASHES: Record<string, string> = {
  'openspec-design:full': '6d2802fb0a8c90716786265657f3001a0a4c28b4fd91c2db5f5997639714b750',
  'openspec-design:flatten': '41ac45d0ad89d504bbd937a9fada3d439aba3785a5e7e834a7fcd3b4d6c1ebd9',
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
      getOpsxDesignCommandTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
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
