import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ChangeMetadataSchema, type ChangeMetadata } from '../core/change-metadata/index.js';
import { listSchemas } from '../core/artifact-graph/resolver.js';
import { readProjectConfig } from '../core/project-config.js';

export const METADATA_FILENAME = '.openspec.yaml';

/**
 * Error thrown when change metadata validation fails.
 */
export class ChangeMetadataError extends Error {
  constructor(
    message: string,
    public readonly metadataPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ChangeMetadataError';
  }
}

/**
 * Validates that a schema name is valid (exists in available schemas).
 *
 * @param schemaName - The schema name to validate
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The validated schema name
 * @throws Error if schema is not found
 */
export function validateSchemaName(
  schemaName: string,
  projectRoot?: string
): string {
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(schemaName)) {
    throw new Error(
      `Unknown schema '${schemaName}'. Available: ${availableSchemas.join(', ')}`
    );
  }
  return schemaName;
}

/**
 * Writes change metadata to .openspec.yaml in the change directory.
 *
 * @param changeDir - The path to the change directory
 * @param metadata - The metadata to write
 * @param projectRoot - Optional project root for project-local schema resolution
 * @throws ChangeMetadataError if validation fails or write fails
 */
export function writeChangeMetadata(
  changeDir: string,
  metadata: ChangeMetadata,
  projectRoot?: string
): void {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  // Validate schema exists
  validateSchemaName(metadata.schema, projectRoot);

  // Validate with Zod
  const parseResult = ChangeMetadataSchema.safeParse(metadata);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Write YAML file
  const content = yaml.stringify(parseResult.data);
  try {
    fs.writeFileSync(metaPath, content, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to write metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }
}

/**
 * Reads change metadata from .openspec.yaml in the change directory.
 *
 * @param changeDir - The path to the change directory
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The validated metadata, or null if no metadata file exists
 * @throws ChangeMetadataError if the file exists but is invalid
 */
export function readChangeMetadata(
  changeDir: string,
  projectRoot?: string
): ChangeMetadata | null {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  let content: string;
  try {
    content = fs.readFileSync(metaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to read metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.parse(content);
  } catch (err) {
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Invalid YAML in metadata file: ${parseError.message}`,
      metaPath,
      parseError
    );
  }

  // Validate with Zod
  const parseResult = ChangeMetadataSchema.safeParse(parsed);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Validate that the schema exists
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(parseResult.data.schema)) {
    throw new ChangeMetadataError(
      `Unknown schema '${parseResult.data.schema}'. Available: ${availableSchemas.join(', ')}`,
      metaPath
    );
  }

  return parseResult.data;
}

/**
 * The result of reading an opt-in boolean marker from change metadata.
 * A marker that cannot be honored is never declared; `invalidReason` says why
 * so the caller can tell the author instead of rejecting them bare.
 */
export interface MetadataMarker {
  declared: boolean;
  invalidReason?: string;
}

/**
 * Reduce a failure message to a single, control-character-free line. Metadata
 * errors quote user-authored YAML, which can carry newlines or escapes that
 * would otherwise corrupt the terminal output the reason ends up in.
 */
function sanitizeMarkerReason(reason: string): string {
  return reason
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads an opt-in boolean marker from a change's `.openspec.yaml`.
 *
 * The marker is honored only when the metadata parses, satisfies the metadata
 * shape, and names a schema that resolves. Anything else - including a missing
 * or non-boolean value - is `{ declared: false }`, with `invalidReason` set
 * whenever the metadata itself was the obstacle.
 *
 * @param changeDir - The path to the change directory
 * @param key - The metadata key to read
 * @param projectRootOverride - Optional project root for schema resolution
 */
export function readBooleanMarker(
  changeDir: string,
  key: string,
  projectRootOverride?: string
): MetadataMarker {
  const projectRoot = projectRootOverride ?? path.resolve(changeDir, '../../..');

  let metadata: ChangeMetadata | null;
  try {
    metadata = readChangeMetadata(changeDir, projectRoot);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { declared: false, invalidReason: sanitizeMarkerReason(reason) };
  }

  if (!metadata) {
    return { declared: false };
  }

  return { declared: (metadata as Record<string, unknown>)[key] === true };
}

/**
 * Reads the `retire_capabilities` marker, which lets an archive delete a main
 * spec whose last requirement this change removes.
 */
export function readRetireCapabilitiesMarker(
  changeDir: string,
  projectRootOverride?: string
): MetadataMarker {
  return readBooleanMarker(changeDir, 'retire_capabilities', projectRootOverride);
}

export interface ResolveSchemaForChangeOptions {
  metadata?: ChangeMetadata | null;
}

/**
 * Resolves the schema for a change, with explicit override taking precedence.
 *
 * Resolution order:
 * 1. Explicit schema (if provided)
 * 2. Schema from .openspec.yaml metadata (if exists)
 * 3. Schema from openspec/config.yaml (if exists)
 * 4. Default 'deep-planning'
 *
 * @param changeDir - The path to the change directory
 * @param explicitSchema - Optional explicit schema override
 * @returns The resolved schema name
 */
export function resolveSchemaForChange(
  changeDir: string,
  explicitSchema?: string,
  projectRootOverride?: string,
  options: ResolveSchemaForChangeOptions = {}
): string {
  // Derive project root from changeDir (changeDir is typically projectRoot/openspec/changes/change-name)
  const projectRoot = projectRootOverride ?? path.resolve(changeDir, '../../..');

  // 1. Explicit override wins
  if (explicitSchema) {
    return explicitSchema;
  }

  const metadata =
    options.metadata !== undefined ? options.metadata : readChangeMetadata(changeDir, projectRoot);
  if (metadata?.schema) {
    return metadata.schema;
  }

  // 3. Try reading from project config when metadata is absent.
  try {
    const config = readProjectConfig(projectRoot);
    if (config?.schema) {
      return config.schema;
    }
  } catch {
    // If config read fails, fall back to default
  }

  // 4. Default
  return 'deep-planning';
}
