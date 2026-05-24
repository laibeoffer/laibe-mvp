import {
  defaultFormalArtifactPolicy,
  getFormalArtifactExtension,
  type FormalArtifactAudience,
  type FormalArtifactFormat,
  type FormalArtifactStorageTarget,
  type FormalRenderedSkeletonOutput,
} from "./formal-file-writer-policy.ts";
import type { FormalFileWriterPreflightReport } from "./formal-file-writer-preflight.ts";

export type FormalArtifactKind = "manifest_only" | "placeholder_text";

export interface FormalArtifactSecurityFlags {
  snapshot_only: true;
  preflight_passed: true;
  engine_not_called: true;
  pricing_not_called: true;
  material_resolver_not_called: true;
  rag_not_called: true;
  ai_not_called: true;
  legacy_output_not_used: true;
}

export interface FormalArtifactManifest {
  manifest_id: string;
  artifact_id: string;
  snapshot_id: string;
  project_id: string;
  estimate_id: string;
  audience: FormalArtifactAudience;
  format: FormalArtifactFormat;
  intended_extension: "xlsx" | "pdf";
  actual_artifact_kind: FormalArtifactKind;
  filename: string;
  storage_target: FormalArtifactStorageTarget;
  row_count: number;
  total_amount: number;
  layout_profile: string;
  created_at: string;
  preflight_valid: boolean;
  policy_id: string;
  security_flags: FormalArtifactSecurityFlags;
  warnings: string[];
}

interface CreateFormalArtifactManifestOptions {
  output: FormalRenderedSkeletonOutput;
  artifact_format: FormalArtifactFormat;
  filename: string;
  storage_target: FormalArtifactStorageTarget;
  actual_artifact_kind?: FormalArtifactKind;
  created_at?: string;
  preflight: FormalFileWriterPreflightReport;
  policy_id?: string;
}

const sanitizeIdPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

export const createFormalArtifactManifest = (
  options: CreateFormalArtifactManifestOptions,
): FormalArtifactManifest => {
  const createdAt = options.created_at ?? new Date().toISOString();
  const manifestId = [
    "formal-artifact-manifest",
    sanitizeIdPart(options.output.snapshot_id),
    sanitizeIdPart(options.artifact_format),
    sanitizeIdPart(createdAt),
  ].join("-");
  const artifactId = [
    "formal-artifact",
    sanitizeIdPart(options.output.project_id),
    sanitizeIdPart(options.output.estimate_id),
    sanitizeIdPart(options.output.audience),
    sanitizeIdPart(options.output.snapshot_id),
  ].join("-");

  return {
    manifest_id: manifestId,
    artifact_id: artifactId,
    snapshot_id: options.output.snapshot_id,
    project_id: options.output.project_id,
    estimate_id: options.output.estimate_id,
    audience: options.output.audience,
    format: options.artifact_format,
    intended_extension: getFormalArtifactExtension(options.artifact_format),
    actual_artifact_kind: options.actual_artifact_kind ?? "manifest_only",
    filename: options.filename,
    storage_target: options.storage_target,
    row_count: options.output.rows.length,
    total_amount: options.output.totals.total_amount,
    layout_profile: options.output.layout_contract.layout_profile,
    created_at: createdAt,
    preflight_valid: options.preflight.valid,
    policy_id: options.policy_id ?? defaultFormalArtifactPolicy.policy_id,
    security_flags: {
      snapshot_only: true,
      preflight_passed: true,
      engine_not_called: true,
      pricing_not_called: true,
      material_resolver_not_called: true,
      rag_not_called: true,
      ai_not_called: true,
      legacy_output_not_used: true,
    },
    warnings: [...options.output.warnings, ...options.preflight.warnings],
  };
};
