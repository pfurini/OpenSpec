import { describe, it, expect } from 'vitest';
import { parseAdr } from '../../../src/core/adr/index.js';

const VALID = `---
id: ADR-0037
title: Self-service profile writes via auth.api.updateUser, not raw Drizzle
status: proposed
date: 2026-06-12
change: account-profile-self-service
---

# Self-service profile writes via \`auth.api.updateUser\`, not raw Drizzle

Body.
`;

describe('parseAdr', () => {
  it('parses all frontmatter fields from a valid ADR', () => {
    const adr = parseAdr(VALID, 'ADR-0037-self-service.md');
    expect(adr).toEqual({
      id: 'ADR-0037',
      title: 'Self-service profile writes via auth.api.updateUser, not raw Drizzle',
      status: 'proposed',
      date: '2026-06-12',
      change: 'account-profile-self-service',
      supersededBy: undefined,
      filePath: 'ADR-0037-self-service.md',
    });
  });

  it('reads the superseded-by (kebab-case) frontmatter key', () => {
    const content = `---
id: ADR-0010
title: Old decision
status: superseded
date: 2026-01-01
superseded-by: ADR-0042
---
# Old decision
`;
    const adr = parseAdr(content, 'ADR-0010-old.md');
    expect(adr.supersededBy).toBe('ADR-0042');
    expect(adr.status).toBe('superseded');
  });

  it('leaves optional fields undefined when absent', () => {
    const content = `---
id: ADR-0002
title: bigserial primary keys, not UUID
status: accepted
date: 2026-05-17
---
# bigserial primary keys, not UUID
`;
    const adr = parseAdr(content, 'ADR-0002-keys.md');
    expect(adr.change).toBeUndefined();
    expect(adr.supersededBy).toBeUndefined();
  });

  it('throws when there is no frontmatter block', () => {
    expect(() => parseAdr('# Just a heading\n\nNo frontmatter.\n', 'x.md')).toThrow(/frontmatter/i);
  });

  it('throws when required id is missing', () => {
    const content = `---
title: No id here
status: accepted
---
# No id here
`;
    expect(() => parseAdr(content, 'bad.md')).toThrow(/id/i);
  });

  it('throws when required title is missing', () => {
    const content = `---
id: ADR-0099
status: accepted
---
# heading
`;
    expect(() => parseAdr(content, 'bad.md')).toThrow(/title/i);
  });

  it('throws on malformed YAML frontmatter', () => {
    const content = `---
id: ADR-0099
title: "unterminated
status: accepted
---
# heading
`;
    expect(() => parseAdr(content, 'bad.md')).toThrow();
  });
});
