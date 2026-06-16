#!/usr/bin/env node
// Recompute the frozen hash baselines in
// `test/core/templates/skill-templates-parity.test.ts` and rewrite them in place.
//
// The parity test guards skill-template output against accidental drift by
// comparing SHA-256 hashes of every generated artifact against hardcoded
// literals. Those literals are intentionally hand-frozen, so ANY deliberate
// edit to a skill (e.g. `schemas/skills/openspec-design/SKILL.md`) trips the
// test by design. Run this after such an edit to re-freeze the baseline:
//
//     pnpm rebaseline:skills
//
// The npm script builds first, so `dist/` matches current `src/` and the
// hashes computed here are identical to what the (src-importing) test computes.
// The hash algorithm, factory lists, and baseline token below MUST stay in
// lockstep with the parity test — if you change them there, change them here.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..');
const distEntry = path.join(repoRoot, 'dist/core/templates/skill-templates.js');
const parityTestPath = path.join(repoRoot, 'test/core/templates/skill-templates-parity.test.ts');

if (!existsSync(distEntry)) {
  console.error(
    'dist/ not found. Run this via `pnpm rebaseline:skills` (it builds first), ' +
      'or run `pnpm build` before invoking this script directly.'
  );
  process.exit(1);
}

const templates = await import(distEntry);
const { generateSkillContent, buildSkillArtifacts } = await import(
  path.join(repoRoot, 'dist/core/shared/skill-generation.js')
);

// The baseline token the parity test passes as the OpenSpec version stand-in.
const BASELINE = 'PARITY-BASELINE';

// --- hashing (mirror of the parity test) ----------------------------------
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
const hash = (value) => createHash('sha256').update(value).digest('hex');

// --- factory lists (mirror of the parity test, in the same order) ---------
const FUNCTION_FACTORY_NAMES = [
  'getExploreSkillTemplate',
  'getOpsxDesignSkillTemplate',
  'getOpsxDesignCommandTemplate',
  'getNewChangeSkillTemplate',
  'getContinueChangeSkillTemplate',
  'getApplyChangeSkillTemplate',
  'getFfChangeSkillTemplate',
  'getSyncSpecsSkillTemplate',
  'getOnboardSkillTemplate',
  'getOpsxExploreCommandTemplate',
  'getOpsxNewCommandTemplate',
  'getOpsxContinueCommandTemplate',
  'getOpsxApplyCommandTemplate',
  'getOpsxFfCommandTemplate',
  'getArchiveChangeSkillTemplate',
  'getBulkArchiveChangeSkillTemplate',
  'getOpsxSyncCommandTemplate',
  'getVerifyChangeSkillTemplate',
  'getOpsxArchiveCommandTemplate',
  'getOpsxOnboardCommandTemplate',
  'getOpsxBulkArchiveCommandTemplate',
  'getOpsxVerifyCommandTemplate',
  'getOpsxProposeSkillTemplate',
  'getOpsxProposeCommandTemplate',
  'getFeedbackSkillTemplate',
];

// [dirName, skill-template factory name] — feeds the generated-content + tree maps.
const SKILL_FACTORY_ENTRIES = [
  ['openspec-explore', 'getExploreSkillTemplate'],
  ['openspec-design', 'getOpsxDesignSkillTemplate'],
  ['openspec-new-change', 'getNewChangeSkillTemplate'],
  ['openspec-continue-change', 'getContinueChangeSkillTemplate'],
  ['openspec-apply-change', 'getApplyChangeSkillTemplate'],
  ['openspec-ff-change', 'getFfChangeSkillTemplate'],
  ['openspec-sync-specs', 'getSyncSpecsSkillTemplate'],
  ['openspec-archive-change', 'getArchiveChangeSkillTemplate'],
  ['openspec-bulk-archive-change', 'getBulkArchiveChangeSkillTemplate'],
  ['openspec-verify-change', 'getVerifyChangeSkillTemplate'],
  ['openspec-onboard', 'getOnboardSkillTemplate'],
  ['openspec-propose', 'getOpsxProposeSkillTemplate'],
];

const BUNDLED_SKILL_ENTRIES = [['openspec-design', 'getOpsxDesignSkillTemplate']];

function factory(name) {
  const fn = templates[name];
  if (typeof fn !== 'function') throw new Error(`missing template factory: ${name}`);
  return fn;
}

// --- compute the three maps -----------------------------------------------
const fnHashes = Object.fromEntries(
  FUNCTION_FACTORY_NAMES.map((name) => [name, hash(stableStringify(factory(name)()))])
);

const genHashes = Object.fromEntries(
  SKILL_FACTORY_ENTRIES.map(([dir, name]) => [
    dir,
    hash(generateSkillContent(factory(name)(), BASELINE)),
  ])
);

const treeHashes = Object.fromEntries(
  BUNDLED_SKILL_ENTRIES.flatMap(([dir, name]) =>
    ['full', 'flatten'].map((capability) => [
      `${dir}:${capability}`,
      hash(stableStringify(buildSkillArtifacts(factory(name)(), BASELINE, capability))),
    ])
  )
);

// --- rewrite the parity test in place -------------------------------------
function renderBlock(map) {
  const isIdent = (k) => /^[A-Za-z_$][\w$]*$/.test(k);
  return Object.entries(map)
    .map(([k, v]) => `  ${isIdent(k) ? k : `'${k}'`}: '${v}',`)
    .join('\n');
}

const REPLACEMENTS = [
  ['EXPECTED_FUNCTION_HASHES', fnHashes],
  ['EXPECTED_GENERATED_SKILL_CONTENT_HASHES', genHashes],
  ['EXPECTED_BUNDLE_TREE_HASHES', treeHashes],
];

let source = readFileSync(parityTestPath, 'utf8');
const before = source;

for (const [constName, map] of REPLACEMENTS) {
  const re = new RegExp(
    `(const ${constName}: Record<string, string> = \\{)[\\s\\S]*?(\\n\\};)`
  );
  if (!re.test(source)) throw new Error(`could not locate ${constName} block in parity test`);
  source = source.replace(re, `$1\n${renderBlock(map)}$2`);
}

if (source === before) {
  console.log('Skill hash baselines already up to date — no changes.');
  process.exit(0);
}

writeFileSync(parityTestPath, source);

// --- report what moved ----------------------------------------------------
const diffCount = (label, oldText, map) => {
  let changed = 0;
  for (const [k, v] of Object.entries(map)) {
    const m = oldText.match(new RegExp(`['"]?${k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}['"]?: '([0-9a-f]{64})'`));
    if (!m || m[1] !== v) changed += 1;
  }
  if (changed) console.log(`  ${label}: ${changed} entr${changed === 1 ? 'y' : 'ies'} updated`);
};

console.log(`Rebaselined ${path.relative(repoRoot, parityTestPath)}:`);
diffCount('function payloads', before, fnHashes);
diffCount('generated content', before, genHashes);
diffCount('bundle tree', before, treeHashes);
console.log('Run `pnpm test` (or the parity suite) to confirm green.');
