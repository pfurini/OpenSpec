import { z } from 'zod';

// Artifact definition schema
export const ArtifactSchema = z.object({
  id: z.string().min(1, { error: 'Artifact ID is required' }),
  generates: z.string().min(1, { error: 'generates field is required' }),
  description: z.string(),
  template: z.string().min(1, { error: 'template field is required' }),
  instruction: z.string().optional(),
  requires: z.array(z.string()).default([]),
});

// Apply phase configuration for schema-aware apply instructions
export const ApplyPhaseSchema = z.object({
  // Artifact IDs that must exist before apply is available
  requires: z.array(z.string()).min(1, { error: 'At least one required artifact' }),
  // Path to file with checkboxes for progress (relative to change dir), or null if no tracking
  tracks: z.string().nullable().optional(),
  // Custom guidance for the apply phase
  instruction: z.string().optional(),
});

// Wave-plan phase configuration for the JIT wave-planning endpoint
// (`openspec instructions wave-plan --change X --wave N`). Mirrors the apply
// block but serves a per-wave executable-plan prompt for the autonomous harness.
export const WavePlanPhaseSchema = z.object({
  // Artifact IDs that must exist before a wave plan can be generated (e.g. [tasks])
  requires: z.array(z.string()).min(1, { error: 'At least one required artifact' }),
  // The static planner payload spec (Mandatory Reading, Patterns-to-Mirror,
  // per-cycle Mirror/Gotcha/Validate, Nyquist, scope-reduction ban, etc.)
  instruction: z.string().optional(),
});

// Full schema YAML structure
export const SchemaYamlSchema = z.object({
  name: z.string().min(1, { error: 'Schema name is required' }),
  version: z.number().int().positive({ error: 'Version must be a positive integer' }),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1, { error: 'At least one artifact required' }),
  // Optional apply phase configuration (for schema-aware apply instructions)
  apply: ApplyPhaseSchema.optional(),
  // Optional wave-plan phase configuration (for the JIT wave-planning endpoint)
  wavePlan: WavePlanPhaseSchema.optional(),
  // How `continue` advances through artifacts:
  //   'step' (default) - one artifact per invocation (classic step-by-step)
  //   'flow-to-gate'   - draft consecutive ungated artifacts, then stop at the
  //                      first gated one (an artifact whose instruction halts
  //                      until a precondition like a thinking note is met)
  continueMode: z.enum(['step', 'flow-to-gate']).optional(),
});

// Derived TypeScript types
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ApplyPhase = z.infer<typeof ApplyPhaseSchema>;
export type WavePlanPhase = z.infer<typeof WavePlanPhaseSchema>;
export type SchemaYaml = z.infer<typeof SchemaYamlSchema>;

// Runtime state types (not Zod - internal only)

// Slice 1: Simple completion tracking via filesystem
export type CompletedSet = Set<string>;

// Return type for blocked query
export interface BlockedArtifacts {
  [artifactId: string]: string[];
}
