import {
  createFormalArtifactManifest,
  type FormalArtifactKind,
  type FormalArtifactManifest,
} from "./formal-artifact-manifest.ts";
import type {
  FormalArtifactFormat,
  FormalArtifactStorageTarget,
  FormalRenderedSkeletonOutput,
} from "./formal-file-writer-policy.ts";
import {
  runFormalFileWriterPreflight,
  type FormalFileWriterPreflightOptions,
  type FormalFileWriterPreflightReport,
} from "./formal-file-writer-preflight.ts";
import { validateFormalLocalStagingPolicy } from "./formal-local-staging-policy.ts";
import {
  writeFormalPlaceholderArtifact,
  type FormalPlaceholderArtifactWriteResult,
} from "./formal-placeholder-artifact-writer.ts";

export interface FormalFileWriterEntryOptions
  extends FormalFileWriterPreflightOptions {
  actual_artifact_kind?: FormalArtifactKind;
  created_at?: string;
  staging_relative_path?: string;
  write_to_staging?: boolean;
}

export interface FormalFileWriterEntryResult {
  status: "blocked" | "manifest_ready" | "placeholder_written";
  preflight: FormalFileWriterPreflightReport;
  manifest: FormalArtifactManifest | null;
  artifact_written: boolean;
  artifact_path: string | null;
  errors: string[];
  warnings: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const writeFormalBudgetArtifact = (
  gatedDocument: unknown,
  options: Partial<FormalFileWriterEntryOptions> | null | undefined,
): FormalFileWriterEntryResult => {
  const preflight = runFormalFileWriterPreflight(gatedDocument, options);

  if (!preflight.valid) {
    return {
      status: "blocked",
      preflight,
      manifest: null,
      artifact_written: false,
      artifact_path: null,
      errors: preflight.errors,
      warnings: preflight.warnings,
    };
  }

  const optionsRecord: Partial<FormalFileWriterEntryOptions> = isRecord(options)
    ? (options as Partial<FormalFileWriterEntryOptions>)
    : {};
  const actualArtifactKind =
    optionsRecord.actual_artifact_kind === "placeholder_text"
      ? "placeholder_text"
      : "manifest_only";
  const stagingPolicy = validateFormalLocalStagingPolicy({
    storage_target: optionsRecord.storage_target,
    staging_relative_path: optionsRecord.staging_relative_path,
    actual_artifact_kind: actualArtifactKind,
    signed_document_exists: optionsRecord.signed_document_exists,
  });

  if (!stagingPolicy.valid) {
    return {
      status: "blocked",
      preflight,
      manifest: null,
      artifact_written: false,
      artifact_path: null,
      errors: stagingPolicy.errors,
      warnings: [...preflight.warnings, ...stagingPolicy.warnings],
    };
  }

  const output = gatedDocument as FormalRenderedSkeletonOutput;
  const manifest = createFormalArtifactManifest({
    output,
    artifact_format: optionsRecord.artifact_format as FormalArtifactFormat,
    filename: optionsRecord.filename as string,
    storage_target: optionsRecord.storage_target as FormalArtifactStorageTarget,
    actual_artifact_kind: actualArtifactKind,
    created_at: optionsRecord.created_at,
    preflight,
    policy_id: optionsRecord.policy?.policy_id,
  });

  const writeResult: FormalPlaceholderArtifactWriteResult =
    writeFormalPlaceholderArtifact(manifest, {
      write_to_staging: optionsRecord.write_to_staging === true,
      staging_relative_path: optionsRecord.staging_relative_path,
      signed_document_exists: optionsRecord.signed_document_exists,
    });

  if (writeResult.errors.length > 0) {
    return {
      status: "blocked",
      preflight,
      manifest,
      artifact_written: false,
      artifact_path: null,
      errors: writeResult.errors,
      warnings: [...manifest.warnings, ...writeResult.warnings],
    };
  }

  return {
    status: writeResult.written ? "placeholder_written" : "manifest_ready",
    preflight,
    manifest,
    artifact_written: writeResult.written,
    artifact_path: writeResult.artifact_path,
    errors: [],
    warnings: [...manifest.warnings, ...writeResult.warnings],
  };
};
