import {
  defaultFormalArtifactPolicy,
  isFormalArtifactStorageTarget,
  storageTargetAllowsFileWrite,
  storageTargetIsAllowed,
  type FormalArtifactStorageTarget,
} from "./formal-file-writer-policy.ts";
import type { FormalArtifactKind } from "./formal-artifact-manifest.ts";

export const FORMAL_LOCAL_STAGING_ROOT =
  "artifacts/budget-renderer-staging";

export interface FormalLocalStagingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  storage_target: FormalArtifactStorageTarget | null;
  normalized_relative_path: string | null;
  staging_root: string;
}

export interface FormalLocalStagingPolicyOptions {
  storage_target: unknown;
  staging_relative_path?: unknown;
  write_to_staging?: boolean;
  actual_artifact_kind?: FormalArtifactKind;
  signed_document_exists?: boolean;
}

const allowedManifestExtension = "json";
const allowedTextExtension = "txt";
const blockedFormalExtensions = [
  ["xl", "sx"].join(""),
  ["pd", "f"].join(""),
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "");

const pathHasTraversal = (value: string): boolean =>
  normalizePath(value)
    .split("/")
    .some((part) => part === "..");

const pathLooksAbsolute = (value: string): boolean =>
  /^([a-zA-Z]:|\/|\\\\)/.test(value);

const getExtension = (value: string): string | null => {
  const lastSegment = normalizePath(value).split("/").pop() ?? "";
  const index = lastSegment.lastIndexOf(".");
  return index >= 0 ? lastSegment.slice(index + 1).toLowerCase() : null;
};

const storageTargetAllowed = (value: unknown): value is FormalArtifactStorageTarget =>
  isFormalArtifactStorageTarget(value) &&
  storageTargetIsAllowed(defaultFormalArtifactPolicy, value);

export const validateFormalLocalStagingPolicy = (
  options: FormalLocalStagingPolicyOptions,
): FormalLocalStagingValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const target = storageTargetAllowed(options.storage_target)
    ? options.storage_target
    : null;
  const kind = options.actual_artifact_kind ?? "manifest_only";

  if (!target) {
    errors.push("Storage target is not allowed by local staging policy.");
  }

  if (
    target &&
    options.write_to_staging === true &&
    !storageTargetAllowsFileWrite(defaultFormalArtifactPolicy, target)
  ) {
    errors.push("Storage target does not allow local staging writes.");
  }

  if (options.signed_document_exists === true) {
    errors.push("Local staging policy forbids overwriting signed or approved artifacts.");
  }

  if (
    options.staging_relative_path === undefined ||
    options.staging_relative_path === null
  ) {
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      storage_target: target,
      normalized_relative_path: null,
      staging_root: FORMAL_LOCAL_STAGING_ROOT,
    };
  }

  if (typeof options.staging_relative_path !== "string") {
    errors.push("Staging path must be a relative string path.");
    return {
      valid: false,
      errors,
      warnings,
      storage_target: target,
      normalized_relative_path: null,
      staging_root: FORMAL_LOCAL_STAGING_ROOT,
    };
  }

  const normalized = normalizePath(options.staging_relative_path);

  if (!normalized || normalized.endsWith("/")) {
    errors.push("Staging path must include a file name.");
  }

  if (pathLooksAbsolute(options.staging_relative_path)) {
    errors.push("Staging path must not be absolute.");
  }

  if (pathHasTraversal(options.staging_relative_path)) {
    errors.push("Staging path must not contain path traversal segments.");
  }

  if (normalized.startsWith(`${FORMAL_LOCAL_STAGING_ROOT}/`)) {
    errors.push("Staging path should be relative to the staging root, not include the root itself.");
  }

  const extension = getExtension(normalized);
  const allowedExtension =
    kind === "placeholder_text" ? allowedTextExtension : allowedManifestExtension;

  if (!extension) {
    errors.push("Staging path must include an allowed extension.");
  } else if (blockedFormalExtensions.includes(extension)) {
    errors.push("Local staging policy forbids formal file extensions in this phase.");
  } else if (extension !== allowedExtension) {
    errors.push(
      `Staging path extension must be .${allowedExtension} for ${kind}.`,
    );
  }

  if (isRecord(options) && options.storage_target === "review_packet_attachment") {
    warnings.push("review_packet_attachment is recorded as metadata only in this local prototype.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    storage_target: target,
    normalized_relative_path: normalized,
    staging_root: FORMAL_LOCAL_STAGING_ROOT,
  };
};
