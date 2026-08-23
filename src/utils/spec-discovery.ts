/**
 * Recursive capability-spec discovery.
 *
 * Capabilities live in folders under a specs root and may nest to any depth:
 * `specs/<area>/<capability>/spec.md` is as much a capability as
 * `specs/<capability>/spec.md`. A capability is identified by its folder path
 * relative to the root, written with `/` on every platform; filesystem paths
 * are always built with `path.join`.
 *
 * Nothing is dropped silently: only an absent root and a dangling link are
 * tolerated, because a swallowed read error is how specs go missing from a
 * merge without anyone noticing.
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface DiscoveredSpec {
  /** Capability path relative to the root, `/`-joined on every platform. */
  id: string;
  /** Absolute-or-root-relative filesystem path to the capability's spec.md. */
  specFile: string;
}

const SPEC_FILENAME = 'spec.md';

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
}

/**
 * Find every capability spec under `root`.
 *
 * Dot entries are skipped, symlinked directories are not followed (a link can
 * point anywhere, including back into the tree), a `spec.md` that is itself a
 * symlink is accepted when it resolves to a file, and a `spec.md` sitting
 * directly in the root is not a capability. Results are sorted by code point,
 * so the order is the same under every locale.
 */
export async function discoverSpecFiles(root: string): Promise<DiscoveredSpec[]> {
  const found: DiscoveredSpec[] = [];

  async function walk(dir: string, segments: string[]): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      // An absent directory has no specs; anything else is a real read failure
      // and must not be mistaken for "this capability does not exist".
      if (isEnoent(error)) {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), [...segments, entry.name]);
        continue;
      }

      if (entry.name !== SPEC_FILENAME || segments.length === 0) continue;

      const specFile = path.join(dir, entry.name);
      if (entry.isFile()) {
        found.push({ id: segments.join('/'), specFile });
        continue;
      }

      if (!entry.isSymbolicLink()) continue;
      try {
        const target = await fs.stat(specFile);
        if (target.isFile()) {
          found.push({ id: segments.join('/'), specFile });
        }
      } catch (error) {
        // A dangling link points at nothing; any other failure is real.
        if (!isEnoent(error)) {
          throw error;
        }
      }
    }
  }

  await walk(root, []);

  found.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return found;
}
