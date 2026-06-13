import { parse as parseYaml } from 'yaml';

/**
 * An Architecture Decision Record's frontmatter, parsed from a project ADR file.
 * ADRs are project-owned (commonly in docs/adr/); this is the machine-readable
 * view the registry/index is generated from.
 */
export interface ParsedAdr {
  id: string;
  title: string;
  status: string;
  date?: string;
  /** The change that introduced the ADR (archive promotes proposed -> accepted via this link). */
  change?: string;
  /** The ADR id that supersedes this one, from the `superseded-by` frontmatter key. */
  supersededBy?: string;
  /** The ADR file path (as supplied; the registry links to it). */
  filePath: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

/** Coerce a YAML scalar to a trimmed string; dates render as YYYY-MM-DD. */
function scalarString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return undefined;
}

/**
 * Parses an ADR file's YAML frontmatter into a ParsedAdr.
 * Throws if the frontmatter block is missing, malformed, or missing a required
 * field (id, title).
 */
export function parseAdr(content: string, filePath: string): ParsedAdr {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(`ADR ${filePath}: no YAML frontmatter block found`);
  }

  let data: Record<string, unknown>;
  try {
    data = (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`ADR ${filePath}: malformed YAML frontmatter: ${(err as Error).message}`);
  }

  const id = scalarString(data.id);
  if (!id) {
    throw new Error(`ADR ${filePath}: missing required frontmatter field 'id'`);
  }
  const title = scalarString(data.title);
  if (!title) {
    throw new Error(`ADR ${filePath}: missing required frontmatter field 'title'`);
  }

  return {
    id,
    title,
    status: scalarString(data.status) ?? 'unknown',
    date: scalarString(data.date),
    change: scalarString(data.change),
    supersededBy: scalarString(data['superseded-by']) ?? scalarString(data.supersededBy),
    filePath,
  };
}
