import {
  defaultFormalArtifactPolicy,
  type FormalArtifactAudience,
  type FormalArtifactFormat,
  type FormalArtifactStorageTarget,
} from "./formal-file-writer-policy.ts";
import {
  runFormalFileWriterPreflight,
  type FormalFileWriterPreflightOptions,
} from "./formal-file-writer-preflight.ts";

export interface FormalFileWriterDryRunResult {
  valid: boolean;
  would_write: boolean;
  audience: FormalArtifactAudience | null;
  format: FormalArtifactFormat | null;
  filename: string | null;
  storage_target: FormalArtifactStorageTarget | null;
  snapshot_id: string | null;
  row_count: number;
  total_amount: number | null;
  preflight_errors: string[];
  preflight_warnings: string[];
  artifact_policy_id: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (
  value: Record<string, unknown> | null,
  key: string,
): string | null => {
  const candidate = value?.[key];
  return typeof candidate === "string" ? candidate : null;
};

const readRowCount = (output: unknown): number =>
  isRecord(output) && Array.isArray(output.rows) ? output.rows.length : 0;

const readTotalAmount = (output: unknown): number | null => {
  if (!isRecord(output) || !isRecord(output.totals)) {
    return null;
  }

  return typeof output.totals.total_amount === "number"
    ? output.totals.total_amount
    : null;
};

const readPolicyId = (options: unknown): string => {
  if (
    isRecord(options) &&
    isRecord(options.policy) &&
    typeof options.policy.policy_id === "string"
  ) {
    return options.policy.policy_id;
  }

  return defaultFormalArtifactPolicy.policy_id;
};

export const runFormalFileWriterDryRun = (
  output: unknown,
  options: Partial<FormalFileWriterPreflightOptions> | null | undefined,
): FormalFileWriterDryRunResult => {
  const preflight = runFormalFileWriterPreflight(output, options);
  const optionsRecord = isRecord(options) ? options : null;
  const outputRecord = isRecord(output) ? output : null;

  return {
    valid: preflight.valid,
    would_write: preflight.valid,
    audience: readString(
      optionsRecord,
      "artifact_audience",
    ) as FormalArtifactAudience | null,
    format: readString(optionsRecord, "artifact_format") as FormalArtifactFormat | null,
    filename: readString(optionsRecord, "filename"),
    storage_target: readString(
      optionsRecord,
      "storage_target",
    ) as FormalArtifactStorageTarget | null,
    snapshot_id: readString(outputRecord, "snapshot_id"),
    row_count: readRowCount(output),
    total_amount: readTotalAmount(output),
    preflight_errors: preflight.errors,
    preflight_warnings: preflight.warnings,
    artifact_policy_id: readPolicyId(options),
  };
};
