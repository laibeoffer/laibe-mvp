import {
  mkdirSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import type { FormalArtifactManifest } from "./formal-artifact-manifest.ts";
import {
  FORMAL_LOCAL_STAGING_ROOT,
  validateFormalLocalStagingPolicy,
} from "./formal-local-staging-policy.ts";

export interface FormalPlaceholderArtifactWriteOptions {
  write_to_staging?: boolean;
  staging_relative_path?: string;
  signed_document_exists?: boolean;
}

export interface FormalPlaceholderArtifactWriteResult {
  written: boolean;
  artifact_path: string | null;
  errors: string[];
  warnings: string[];
}

const blockedFormalExtensions = [
  ["xl", "sx"].join(""),
  ["pd", "f"].join(""),
];

const extensionOf = (pathValue: string): string | null => {
  const normalized = pathValue.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() ?? "";
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : null;
};

const stringifyPlaceholder = (manifest: FormalArtifactManifest): string =>
  [
    "Laibe formal artifact placeholder",
    `manifest_id=${manifest.manifest_id}`,
    `artifact_id=${manifest.artifact_id}`,
    `snapshot_id=${manifest.snapshot_id}`,
    `project_id=${manifest.project_id}`,
    `estimate_id=${manifest.estimate_id}`,
    `audience=${manifest.audience}`,
    `format=${manifest.format}`,
    `intended_extension=${manifest.intended_extension}`,
    "No formal file was generated in this phase.",
  ].join("\n");

export const writeFormalPlaceholderArtifact = (
  manifest: FormalArtifactManifest,
  options: FormalPlaceholderArtifactWriteOptions = {},
): FormalPlaceholderArtifactWriteResult => {
  if (options.write_to_staging !== true) {
    return {
      written: false,
      artifact_path: null,
      errors: [],
      warnings: ["Placeholder writer returned manifest metadata only."],
    };
  }

  const validation = validateFormalLocalStagingPolicy({
    storage_target: manifest.storage_target,
    staging_relative_path: options.staging_relative_path,
    write_to_staging: options.write_to_staging,
    actual_artifact_kind: manifest.actual_artifact_kind,
    signed_document_exists: options.signed_document_exists,
  });

  if (!validation.valid || !validation.normalized_relative_path) {
    return {
      written: false,
      artifact_path: null,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const extension = extensionOf(validation.normalized_relative_path);
  if (extension && blockedFormalExtensions.includes(extension)) {
    return {
      written: false,
      artifact_path: null,
      errors: ["Placeholder writer refuses formal file extensions."],
      warnings: validation.warnings,
    };
  }

  const rootPath = resolve(process.cwd(), FORMAL_LOCAL_STAGING_ROOT);
  const artifactPath = resolve(
    rootPath,
    validation.normalized_relative_path,
  );

  if (!artifactPath.startsWith(`${rootPath}`)) {
    return {
      written: false,
      artifact_path: null,
      errors: ["Resolved artifact path escaped the staging root."],
      warnings: validation.warnings,
    };
  }

  const body =
    manifest.actual_artifact_kind === "placeholder_text"
      ? stringifyPlaceholder(manifest)
      : JSON.stringify(manifest, null, 2);

  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, body, "utf8");

  return {
    written: true,
    artifact_path: artifactPath,
    errors: [],
    warnings: validation.warnings,
  };
};
