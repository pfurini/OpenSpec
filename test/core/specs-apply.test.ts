import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  buildUpdatedSpec,
  extractPurposeSection,
  buildSpecSkeleton,
} from '../../src/core/specs-apply.js';

const CHANGE = 'sync-change';

let tempDir: string;

function mainPath(capability: string): string {
  return path.join(tempDir, 'openspec', 'specs', capability, 'spec.md');
}

async function writeDelta(capability: string, content: string): Promise<string> {
  const dir = path.join(tempDir, 'openspec', 'changes', CHANGE, 'specs', capability);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'spec.md');
  await fs.writeFile(file, content);
  return file;
}

async function writeMain(capability: string, content: string): Promise<string> {
  const file = mainPath(capability);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  return file;
}

/**
 * Build the merged spec for one capability. Omit `main` to exercise the
 * new-capability path (no target file on disk).
 */
async function build(capability: string, delta: string, main?: string) {
  const source = await writeDelta(capability, delta);
  const target = mainPath(capability);
  let exists = false;
  if (main !== undefined) {
    await writeMain(capability, main);
    exists = true;
  }
  return buildUpdatedSpec({ id: capability, source, target, exists }, CHANGE, { silent: true });
}

const SIGN_IN_BLOCK = [
  '### Requirement: Sign In',
  'The system SHALL authenticate users.',
  '',
  '#### Scenario: Valid credentials',
  '- **WHEN** credentials are valid',
  '- **THEN** a session starts',
].join('\n');

const MAIN = [
  '# auth Specification',
  '',
  '## Purpose',
  'Authentication rules for the platform, covering sign-in and session handling.',
  '',
  '## Requirements',
  '',
  SIGN_IN_BLOCK,
  '',
].join('\n');

describe('buildUpdatedSpec', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-specs-apply-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Delta Reconciliation Logic', () => {
    it('adds an ADDED requirement that does not exist in the main spec', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Sign Out',
        'The system SHALL end sessions.',
        '',
        '#### Scenario: Session ends',
        '- **WHEN** the user signs out',
        '- **THEN** the session is destroyed',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts).toEqual({ added: 1, modified: 0, removed: 0, renamed: 0 });
      expect(result.rebuilt).toContain('### Requirement: Sign In');
      expect(result.rebuilt).toContain('### Requirement: Sign Out');
      expect(result.noRequirementBlocks).toBe(false);
    });

    it('updates an existing requirement when ADDED names one that already exists', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users with a second factor.',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials and the second factor are valid',
        '- **THEN** a session starts',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts.added).toBe(1);
      expect(result.rebuilt).toContain('with a second factor');
      expect(result.rebuilt).not.toContain('The system SHALL authenticate users.\n');
    });

    it('treats an ADDED requirement with identical content as already applied', async () => {
      const delta = ['# auth - Changes', '', '## ADDED Requirements', '', SIGN_IN_BLOCK, ''].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts).toEqual({ added: 0, modified: 0, removed: 0, renamed: 0 });
      expect(result.rebuilt).toBe(MAIN);
    });

    it('replaces a requirement named by MODIFIED', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users against the directory.',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials are valid',
        '- **THEN** a directory session starts',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts).toEqual({ added: 0, modified: 1, removed: 0, renamed: 0 });
      expect(result.rebuilt).toContain('against the directory');
    });

    it('counts a MODIFIED requirement whose content is already identical as zero', async () => {
      const delta = ['# auth - Changes', '', '## MODIFIED Requirements', '', SIGN_IN_BLOCK, ''].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts).toEqual({ added: 0, modified: 0, removed: 0, renamed: 0 });
      expect(result.rebuilt).toBe(MAIN);
    });

    it('removes a requirement named by REMOVED', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Sign In',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts).toEqual({ added: 0, modified: 0, removed: 1, renamed: 0 });
      expect(result.rebuilt).not.toContain('### Requirement: Sign In');
      expect(result.noRequirementBlocks).toBe(true);
    });

    it('treats a REMOVED requirement that is already gone as a warned no-op', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Sign Out',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts.removed).toBe(0);
      expect(result.warnings.join('\n')).toContain('Sign Out');
      expect(result.rebuilt).toBe(MAIN);
    });

    it('fails a REMOVED name that differs from the main spec only in case or interior whitespace', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: sign  in',
        '',
      ].join('\n');

      await expect(build('auth', delta, MAIN)).rejects.toThrow('### Requirement: Sign In');
    });

    it('renames a requirement named by RENAMED', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## RENAMED Requirements',
        '- FROM: `### Requirement: Sign In`',
        '- TO: `### Requirement: Log In`',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.counts).toEqual({ added: 0, modified: 0, removed: 0, renamed: 1 });
      expect(result.rebuilt).toContain('### Requirement: Log In');
      expect(result.rebuilt).not.toContain('### Requirement: Sign In');
    });

    it('treats a rename whose FROM is gone and TO is present as already applied', async () => {
      const renamedMain = MAIN.replace('### Requirement: Sign In', '### Requirement: Log In');
      const delta = [
        '# auth - Changes',
        '',
        '## RENAMED Requirements',
        '- FROM: `### Requirement: Sign In`',
        '- TO: `### Requirement: Log In`',
        '',
      ].join('\n');

      const result = await build('auth', delta, renamedMain);

      expect(result.counts.renamed).toBe(0);
      expect(result.warnings.join('\n')).toContain('Log In');
      expect(result.rebuilt).toBe(renamedMain);
    });

    it('fails a rename whose FROM is contradicted by a REMOVED entry', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## RENAMED Requirements',
        '- FROM: `### Requirement: Sign In`',
        '- TO: `### Requirement: Log In`',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: sign in',
        '',
      ].join('\n');

      await expect(build('auth', delta, MAIN)).rejects.toThrow(/RENAMED.*REMOVED|REMOVED.*RENAMED/);
    });

    it('creates a new capability spec with the TBD placeholder Purpose', async () => {
      const delta = [
        '# billing - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Invoice',
        'The system SHALL issue invoices.',
        '',
        '#### Scenario: Invoice issued',
        '- **WHEN** a period closes',
        '- **THEN** an invoice is issued',
        '',
      ].join('\n');

      const result = await build('billing', delta);

      expect(result.counts.added).toBe(1);
      expect(result.rebuilt).toContain('# billing Specification');
      expect(result.rebuilt).toContain('## Purpose');
      expect(result.rebuilt).toContain(`TBD - created by archiving change ${CHANGE}`);
      expect(result.rebuilt).toContain('### Requirement: Invoice');
    });

    it("carries the delta's Purpose into a new capability spec", async () => {
      const purpose = 'Billing rules for invoices, dunning, and refunds across every plan tier.';
      const delta = [
        '# billing - Changes',
        '',
        '## Purpose',
        purpose,
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Invoice',
        'The system SHALL issue invoices.',
        '',
        '#### Scenario: Invoice issued',
        '- **WHEN** a period closes',
        '- **THEN** an invoice is issued',
        '',
      ].join('\n');

      const result = await build('billing', delta);

      expect(result.rebuilt).toContain(purpose);
      expect(result.rebuilt).not.toContain('TBD - created by archiving change');
    });

    it('falls back to the placeholder with a warning when the delta Purpose is unreadable', async () => {
      const delta = [
        '# billing - Changes',
        '',
        '## Purpose',
        '<!-- Describe the capability here. -->',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Invoice',
        'The system SHALL issue invoices.',
        '',
        '#### Scenario: Invoice issued',
        '- **WHEN** a period closes',
        '- **THEN** an invoice is issued',
        '',
      ].join('\n');

      const result = await build('billing', delta);

      expect(result.rebuilt).toContain(`TBD - created by archiving change ${CHANGE}`);
      expect(result.warnings.join('\n')).toContain('Purpose');
    });

    it('falls back to the placeholder with a warning when the delta Purpose is too brief', async () => {
      const delta = [
        '# billing - Changes',
        '',
        '## Purpose',
        'Billing.',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Invoice',
        'The system SHALL issue invoices.',
        '',
        '#### Scenario: Invoice issued',
        '- **WHEN** a period closes',
        '- **THEN** an invoice is issued',
        '',
      ].join('\n');

      const result = await build('billing', delta);

      expect(result.rebuilt).toContain(`TBD - created by archiving change ${CHANGE}`);
      expect(result.warnings.join('\n')).toContain('Purpose');
    });
  });

  describe('Scenario Preservation', () => {
    const MAIN_TWO_SCENARIOS = [
      '# auth Specification',
      '',
      '## Purpose',
      'Authentication rules for the platform, covering sign-in and session handling.',
      '',
      '## Requirements',
      '',
      '### Requirement: Sign In',
      'The system SHALL authenticate users.',
      '',
      '#### Scenario: Valid credentials',
      '- **WHEN** credentials are valid',
      '- **THEN** a session starts',
      '',
      '#### Scenario: Locked account',
      '- **WHEN** the account is locked',
      '- **THEN** access is refused',
      '',
    ].join('\n');

    it('refuses a MODIFIED block that drops a scenario, naming every missing one', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users against the directory.',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials are valid',
        '- **THEN** a directory session starts',
        '',
      ].join('\n');

      await expect(build('auth', delta, MAIN_TWO_SCENARIOS)).rejects.toThrow(
        /Scenario: Locked account/
      );
    });

    it('changes no files when it refuses', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users against the directory.',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials are valid',
        '- **THEN** a directory session starts',
        '',
      ].join('\n');

      await expect(build('auth', delta, MAIN_TWO_SCENARIOS)).rejects.toThrow();

      const onDisk = await fs.readFile(mainPath('auth'), 'utf-8');
      expect(onDisk).toBe(MAIN_TWO_SCENARIOS);
    });

    it('reports dropped instances when duplicate scenario names are thinned out', async () => {
      const mainWithDuplicates = [
        '# auth Specification',
        '',
        '## Purpose',
        'Authentication rules for the platform, covering sign-in and session handling.',
        '',
        '## Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users.',
        '',
        '#### Scenario: Retry',
        '- **THEN** the first retry is allowed',
        '',
        '#### Scenario: Retry',
        '- **THEN** the second retry is refused',
        '',
      ].join('\n');
      const delta = [
        '# auth - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users against the directory.',
        '',
        '#### Scenario: Retry',
        '- **THEN** the first retry is allowed',
        '',
      ].join('\n');

      await expect(build('auth', delta, mainWithDuplicates)).rejects.toThrow(/Scenario: Retry/);
    });

    it('accepts a MODIFIED block that keeps every current scenario', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users against the directory.',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials are valid',
        '- **THEN** a directory session starts',
        '',
        '#### Scenario: Locked account',
        '- **WHEN** the account is locked',
        '- **THEN** access is refused',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN_TWO_SCENARIOS);

      expect(result.counts.modified).toBe(1);
      expect(result.rebuilt).toContain('#### Scenario: Locked account');
    });
  });

  describe('Content Preservation Warnings', () => {
    it('warns when a removed requirement absorbs a trailing note section', async () => {
      const mainWithNote = [
        '# auth Specification',
        '',
        '## Purpose',
        'Authentication rules for the platform, covering sign-in and session handling.',
        '',
        '## Requirements',
        '',
        SIGN_IN_BLOCK,
        '',
        '# Note',
        'Legacy migration notes kept next to the requirement.',
        '',
      ].join('\n');
      const delta = [
        '# auth - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Sign In',
        '',
      ].join('\n');

      const result = await build('auth', delta, mainWithNote);
      const warnings = result.warnings.join('\n');

      expect(warnings).toContain('# Note');
      expect(warnings).toContain('## Requirements');
    });

    it('warns when a replaced requirement drops a trailing note section', async () => {
      const mainWithNote = [
        '# auth Specification',
        '',
        '## Purpose',
        'Authentication rules for the platform, covering sign-in and session handling.',
        '',
        '## Requirements',
        '',
        SIGN_IN_BLOCK,
        '',
        '# Note',
        'Legacy migration notes kept next to the requirement.',
        '',
      ].join('\n');
      const delta = [
        '# auth - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users against the directory.',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials are valid',
        '- **THEN** a directory session starts',
        '',
      ].join('\n');

      const result = await build('auth', delta, mainWithNote);

      expect(result.warnings.join('\n')).toContain('# Note');
    });

    it('keeps the main spec Purpose and warns when a delta Purpose differs', async () => {
      const delta = [
        '# auth - Changes',
        '',
        '## Purpose',
        'A completely different purpose statement written in the delta spec by mistake.',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Sign Out',
        'The system SHALL end sessions.',
        '',
        '#### Scenario: Session ends',
        '- **WHEN** the user signs out',
        '- **THEN** the session is destroyed',
        '',
      ].join('\n');

      const result = await build('auth', delta, MAIN);

      expect(result.rebuilt).toContain('Authentication rules for the platform');
      expect(result.rebuilt).not.toContain('A completely different purpose statement');
      expect(result.warnings.join('\n')).toContain('Purpose');
    });
  });

  describe('Canonical Output Formatting', () => {
    it('keeps exactly one blank line around the Requirements header', async () => {
      const messyMain = [
        '# auth Specification',
        '',
        '## Purpose',
        'Authentication rules for the platform, covering sign-in and session handling.',
        '',
        '',
        '',
        '## Requirements',
        '',
        '',
        SIGN_IN_BLOCK,
        '',
      ].join('\n');
      const delta = [
        '# auth - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Sign Out',
        'The system SHALL end sessions.',
        '',
        '#### Scenario: Session ends',
        '- **WHEN** the user signs out',
        '- **THEN** the session is destroyed',
        '',
      ].join('\n');

      const result = await build('auth', delta, messyMain);

      expect(result.rebuilt).toContain('sign-in and session handling.\n\n## Requirements\n\n### Requirement: Sign In');
      expect(result.rebuilt).not.toMatch(/\n{3,}/);
    });

    it('ends the rebuilt spec with exactly one trailing newline', async () => {
      const noEofMain = MAIN.trimEnd();
      const delta = [
        '# auth - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Sign Out',
        'The system SHALL end sessions.',
        '',
        '#### Scenario: Session ends',
        '- **WHEN** the user signs out',
        '- **THEN** the session is destroyed',
        '',
      ].join('\n');

      const fromNoEof = await build('auth', delta, noEofMain);
      const fromManyEof = await build('auth2', delta, `${MAIN}\n\n\n`);

      expect(fromNoEof.rebuilt.endsWith('\n')).toBe(true);
      expect(fromNoEof.rebuilt.endsWith('\n\n')).toBe(false);
      expect(fromManyEof.rebuilt.endsWith('\n')).toBe(true);
      expect(fromManyEof.rebuilt.endsWith('\n\n')).toBe(false);
    });

    it('is byte-stable when the deltas are already applied', async () => {
      const delta = ['# auth - Changes', '', '## MODIFIED Requirements', '', SIGN_IN_BLOCK, ''].join('\n');

      const first = await build('auth', delta, MAIN);
      expect(first.rebuilt).toBe(MAIN);

      const second = await build('auth', delta, first.rebuilt);
      expect(second.rebuilt).toBe(first.rebuilt);
    });

    it('ignores requirement headers that appear only inside fenced code blocks', async () => {
      const fencedMain = [
        '# auth Specification',
        '',
        '## Purpose',
        'Authentication rules for the platform, covering sign-in and session handling.',
        '',
        '## Requirements',
        '',
        '### Requirement: Sign In',
        'The system SHALL authenticate users.',
        '',
        'Authors write requirements like this:',
        '',
        '```markdown',
        '### Requirement: Example Only',
        '```',
        '',
        '#### Scenario: Valid credentials',
        '- **WHEN** credentials are valid',
        '- **THEN** a session starts',
        '',
      ].join('\n');
      const delta = [
        '# auth - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Sign In',
        '',
      ].join('\n');

      const result = await build('auth', delta, fencedMain);

      expect(result.counts.removed).toBe(1);
      expect(result.rebuilt).not.toContain('### Requirement: Example Only');
      expect(result.noRequirementBlocks).toBe(true);
    });
  });
});

describe('extractPurposeSection', () => {
  it('returns the Purpose body of a delta spec', () => {
    const content = ['# auth - Changes', '', '## Purpose', 'Some purpose text.', '', '## ADDED Requirements', ''].join('\n');
    expect(extractPurposeSection(content)).toBe('Some purpose text.');
  });

  it('returns undefined when there is no Purpose section', () => {
    expect(extractPurposeSection('# auth - Changes\n\n## ADDED Requirements\n')).toBeUndefined();
  });

  it('ignores a Purpose header inside a fenced code block', () => {
    const content = ['# auth - Changes', '', '```markdown', '## Purpose', 'Example.', '```', ''].join('\n');
    expect(extractPurposeSection(content)).toBeUndefined();
  });
});

describe('buildSpecSkeleton', () => {
  it('uses the provided purpose when one is given', () => {
    const skeleton = buildSpecSkeleton('billing', CHANGE, 'Billing rules for the platform.');
    expect(skeleton).toContain('# billing Specification');
    expect(skeleton).toContain('Billing rules for the platform.');
    expect(skeleton).not.toContain('TBD - created by archiving change');
  });

  it('falls back to the TBD placeholder without a purpose', () => {
    expect(buildSpecSkeleton('billing', CHANGE)).toContain(`TBD - created by archiving change ${CHANGE}`);
  });
});
