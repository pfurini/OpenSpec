import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('package identity', () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));

  it('names the published package @pfurini/openspec', () => {
    expect(pkg.name).toBe('@pfurini/openspec');
  });

  it('exposes the CLI as the openspec bin', () => {
    expect(pkg.bin).toEqual({ openspec: './bin/openspec.js' });
  });

  it('points homepage and repository at pfurini/OpenSpec', () => {
    expect(pkg.homepage).toBe('https://github.com/pfurini/OpenSpec');
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'https://github.com/pfurini/OpenSpec',
    });
  });
});
