# OpenSpec Scripts

Utility scripts for OpenSpec maintenance and development.

## update-flake.sh

Updates `flake.nix` pnpm dependency hash automatically.

**When to use**: After updating dependencies (`pnpm install`, `pnpm update`).

**Usage**:
```bash
./scripts/update-flake.sh
```

**What it does**:
1. Reads version from `package.json` (dynamically used by `flake.nix`)
2. Automatically determines the correct pnpm dependency hash
3. Updates the hash in `flake.nix`
4. Verifies the build succeeds

**Example workflow**:
```bash
# After dependency updates
pnpm install
./scripts/update-flake.sh
git add flake.nix
git commit -m "chore: update flake.nix dependency hash"
```

## rebaseline-skill-hashes.mjs

Recomputes the frozen hash baselines in
`test/core/templates/skill-templates-parity.test.ts` and rewrites them in place.

**When to use**: After an intentional edit to any skill template under
`schemas/skills/**` (e.g. `openspec-design/SKILL.md` or its `references/*`). The
parity test compares SHA-256 hashes of every generated artifact against
hardcoded literals to catch accidental drift, so a deliberate skill change makes
it fail by design until the baseline is re-frozen.

**Usage**:
```bash
pnpm rebaseline:skills
```

**What it does**:
1. Builds (`pnpm build`) so `dist/` matches current `src/`
2. Recomputes the three baseline maps (function payloads, generated skill
   content, multi-file bundle tree) with the same hash algorithm and factory
   lists the test uses
3. Rewrites only the changed hash literals (formatting/ordering preserved) and
   reports how many entries moved

Run `pnpm test` afterwards to confirm the suite is green, then commit the test
file alongside the skill change.

## postinstall.js

Post-installation script that runs after package installation.

## pack-version-check.mjs

Validates package version consistency before publishing.
