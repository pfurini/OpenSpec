import { describe, it, expect } from 'vitest';
import {
  extractRequirementsSection,
  parseDeltaSpec,
  parseScenarioBlocks,
  findMissingCurrentScenarios,
} from '../../../src/core/parsers/requirement-blocks.js';

describe('extractRequirementsSection', () => {
  it('parses canonical ### Requirement: headers', () => {
    const result = extractRequirementsSection(`## Requirements\n### Requirement: Foo\nThe system SHALL foo.\n`);
    expect(result.bodyBlocks.length).toBe(1);
    expect(result.bodyBlocks[0].name).toBe('Foo');
  });

  it('regression: parses mixed-case ### requirement: headers without silently dropping them', () => {
    const variants = [
      '### requirement: Lowercase',
      '### REQUIREMENT: Uppercase',
      '### Requirement: Canonical',
    ];
    for (const header of variants) {
      const result = extractRequirementsSection(`## Requirements\n${header}\nThe system SHALL foo.\n`);
      expect(result.bodyBlocks.length).toBeGreaterThan(0);
      expect(result.bodyBlocks[0].name).toBe(header.replace(/^###\s*requirement:\s*/i, ''));
    }
  });

  it('regression: parses ###Requirement: header with no space after ### without silently dropping it', () => {
    const result = extractRequirementsSection(`## Requirements\n###Requirement: NoSpace\nThe system SHALL foo.\n`);
    expect(result.bodyBlocks.length).toBe(1);
    expect(result.bodyBlocks[0].name).toBe('NoSpace');
  });

  it('regression: multiple blocks where first uses no-space header are all parsed', () => {
    const content = `## Requirements\n###Requirement: First\nThe system SHALL first.\n\n### Requirement: Second\nThe system SHALL second.\n`;
    const result = extractRequirementsSection(content);
    expect(result.bodyBlocks.length).toBe(2);
    expect(result.bodyBlocks[0].name).toBe('First');
    expect(result.bodyBlocks[1].name).toBe('Second');
  });
});

describe('parseDeltaSpec', () => {
  it('regression: parses ###Requirement: header with no space in delta ADDED section', () => {
    const content = `## ADDED Requirements\n###Requirement: NoSpace\nThe system SHALL foo.\n`;
    const result = parseDeltaSpec(content);
    expect(result.added.length).toBe(1);
    expect(result.added[0].name).toBe('NoSpace');
  });
});

describe('parseScenarioBlocks', () => {
  it('lists every non-fenced #### header in order, one entry per instance', () => {
    const block = [
      '### Requirement: Sign In',
      'The system SHALL authenticate users.',
      '',
      '#### Scenario: Valid credentials',
      '- **THEN** a session starts',
      '',
      '#### Scenario: Locked account',
      '- **THEN** access is refused',
      '',
      '#### Scenario: Valid credentials',
      '- **THEN** the session is recorded',
    ].join('\n');

    expect(parseScenarioBlocks(block)).toEqual([
      'Scenario: Valid credentials',
      'Scenario: Locked account',
      'Scenario: Valid credentials',
    ]);
  });

  it('ignores #### headers inside fenced code blocks and deeper headings', () => {
    const block = [
      '### Requirement: Sign In',
      'The system SHALL authenticate users.',
      '',
      '#### Scenario: Valid credentials',
      '- **THEN** a session starts',
      '',
      '```markdown',
      '#### Scenario: Example from the docs',
      '```',
      '',
      '##### Sub heading is not a scenario',
    ].join('\n');

    expect(parseScenarioBlocks(block)).toEqual(['Scenario: Valid credentials']);
  });
});

describe('findMissingCurrentScenarios', () => {
  const requirement = (scenarios: string[]): string =>
    [
      '### Requirement: Sign In',
      'The system SHALL authenticate users.',
      '',
      ...scenarios.flatMap((name) => [`#### Scenario: ${name}`, '- **THEN** it holds', '']),
    ].join('\n');

  it('reports scenarios the incoming block no longer carries', () => {
    const missing = findMissingCurrentScenarios(
      requirement(['Valid credentials', 'Locked account']),
      requirement(['Valid credentials'])
    );

    expect(missing).toEqual(['Scenario: Locked account']);
  });

  it('returns nothing when every current scenario is still present', () => {
    const missing = findMissingCurrentScenarios(
      requirement(['Valid credentials']),
      requirement(['Valid credentials', 'Locked account'])
    );

    expect(missing).toEqual([]);
  });

  it('counts duplicate scenario names per instance, not per unique name', () => {
    const missing = findMissingCurrentScenarios(
      requirement(['Retry', 'Retry', 'Retry']),
      requirement(['Retry'])
    );

    expect(missing).toEqual(['Scenario: Retry', 'Scenario: Retry']);
  });

  it('ignores fenced #### headers on either side of the comparison', () => {
    const current = [
      '### Requirement: Sign In',
      'The system SHALL authenticate users.',
      '',
      '#### Scenario: Valid credentials',
      '- **THEN** a session starts',
      '',
      '```markdown',
      '#### Scenario: Only an example',
      '```',
    ].join('\n');
    const incoming = [
      '### Requirement: Sign In',
      'The system SHALL authenticate users against the directory.',
      '',
      '#### Scenario: Valid credentials',
      '- **THEN** a directory session starts',
      '',
      '```markdown',
      '#### Scenario: Another example entirely',
      '```',
    ].join('\n');

    expect(findMissingCurrentScenarios(current, incoming)).toEqual([]);
  });

  it('matches scenario names that differ only in case or interior spacing', () => {
    const missing = findMissingCurrentScenarios(
      requirement(['Valid  credentials']),
      requirement(['valid credentials'])
    );

    expect(missing).toEqual([]);
  });
});
