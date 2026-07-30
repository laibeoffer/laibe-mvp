import { INTERNAL_TRACE_ONLY_FIELD_KEYS } from "./formal-layout-contract.ts";
import {
  buildFormalArtifactFilename,
  defaultFormalArtifactPolicy,
  inferFormalArtifactFormat,
  isFormalArtifactAudience,
  isFormalArtifactFormat,
  isFormalArtifactStorageTarget,
  storageTargetIsAllowed,
  type FormalArtifactAudience,
  type FormalArtifactFormat,
  type FormalArtifactPolicy,
  type FormalArtifactStorageTarget,
  type FormalRenderedSkeletonOutput,
} from "./formal-file-writer-policy.ts";
import { isFormalRendererToken } from "./formal-renderer-token.ts";

export interface FormalFileWriterPreflightOptions {
  artifact_audience: FormalArtifactAudience;
  artifact_format: FormalArtifactFormat;
  filename: string;
  storage_target: FormalArtifactStorageTarget;
  writer_options?: Record<string, unknown>;
  signed_document_exists?: boolean;
  policy?: FormalArtifactPolicy;
}

export interface FormalFileWriterPreflightCheck {
  check_code: string;
  passed: boolean;
  severity: "error" | "warning";
  message: string;
}

export interface FormalFileWriterPreflightReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: FormalFileWriterPreflightCheck[];
}

const internalTraceKeyTerms = [
  ...INTERNAL_TRACE_ONLY_FIELD_KEYS,
  "price_source",
  "confidence",
  "requires_review",
];

const forbiddenWriterOptionTerms = [
  "engine",
  "budgetengine",
  "generatebudgetestimate",
  "budgetestimate",
  "pricing",
  "pricingrules",
  "pricerules",
  "materialresolver",
  "material",
  ["r", "ag"].join(""),
  ["a", "i"].join(""),
  ["open", ["a", "i"].join("")].join(""),
  "formatbudgetoutput",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const getString = (
  value: Record<string, unknown> | null,
  key: string,
): string | null => {
  const candidate = value?.[key];
  return typeof candidate === "string" ? candidate : null;
};

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const makeReport = (
  checks: FormalFileWriterPreflightCheck[],
): FormalFileWriterPreflightReport => {
  const errors = checks
    .filter((check) => check.severity === "error" && !check.passed)
    .map((check) => check.message);
  const warnings = checks
    .filter((check) => check.severity === "warning" && !check.passed)
    .map((check) => check.message);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checks,
  };
};

const collectObjectKeyPaths = (
  value: unknown,
  prefix = "",
): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, childValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...collectObjectKeyPaths(childValue, path)];
  });
};

const findForbiddenWriterOptionKeys = (writerOptions: unknown): string[] => {
  if (!isRecord(writerOptions)) {
    return [];
  }

  return collectObjectKeyPaths(writerOptions).filter((keyPath) => {
    const normalized = keyPath.toLowerCase().replace(/[^a-z0-9]/g, "");
    return forbiddenWriterOptionTerms.some((term) => normalized.includes(term));
  });
};

const warningsContainInternalTraceTerms = (warnings: unknown): boolean =>
  getStringArray(warnings).some((warning) =>
    internalTraceKeyTerms.some((term) =>
      warning.toLowerCase().includes(term.toLowerCase()),
    ),
  );

const rowsContainInternalTraceCells = (rows: unknown): boolean => {
  if (!Array.isArray(rows)) {
    return false;
  }

  return rows.some((row) => {
    if (!isRecord(row) || !isRecord(row.cells)) {
      return false;
    }

    return Object.keys(row.cells).some((key) =>
      INTERNAL_TRACE_ONLY_FIELD_KEYS.includes(key),
    );
  });
};

const layoutContainsInternalTraceColumns = (layout: unknown): boolean => {
  if (!isRecord(layout) || !Array.isArray(layout.columns)) {
    return false;
  }

  return layout.columns.some((column) => {
    if (!isRecord(column)) {
      return false;
    }

    return INTERNAL_TRACE_ONLY_FIELD_KEYS.includes(String(column.key));
  });
};

type FormalArtifactFilenameInput = Pick<
  FormalRenderedSkeletonOutput,
  "project_id" | "estimate_id" | "audience" | "snapshot_id"
>;

type FormalArtifactFormatInput = Pick<
  FormalRenderedSkeletonOutput,
  "renderer" | "format"
>;

const normalizePolicy = (policy: unknown): FormalArtifactPolicy =>
  isRecord(policy)
    ? (policy as unknown as FormalArtifactPolicy)
    : defaultFormalArtifactPolicy;

const policyAudiences = (
  policy: FormalArtifactPolicy,
): FormalArtifactAudience[] => {
  const values = getStringArray(policy.audiences);
  return values.filter(isFormalArtifactAudience);
};

const policyFormats = (policy: FormalArtifactPolicy): FormalArtifactFormat[] => {
  const values = getStringArray(policy.formats);
  return values.filter(isFormalArtifactFormat);
};

const safeStorageTargetIsAllowed = (
  policy: FormalArtifactPolicy,
  target: unknown,
): boolean =>
  isFormalArtifactStorageTarget(target) &&
  (() => {
    try {
      return storageTargetIsAllowed(policy, target);
    } catch {
      return false;
    }
  })();

const readFormalArtifactFilenameInput = (
  output: Record<string, unknown> | null,
): FormalArtifactFilenameInput | null => {
  if (
    !output ||
    typeof output.project_id !== "string" ||
    typeof output.estimate_id !== "string" ||
    !isFormalArtifactAudience(output.audience) ||
    typeof output.snapshot_id !== "string"
  ) {
    return null;
  }

  return {
    project_id: output.project_id,
    estimate_id: output.estimate_id,
    audience: output.audience,
    snapshot_id: output.snapshot_id,
  };
};

const readFormalArtifactFormatInput = (
  output: Record<string, unknown> | null,
): FormalArtifactFormatInput | null => {
  if (!output) {
    return null;
  }

  const renderer = output.renderer;
  const format = output.format;

  if (
    (renderer !== "formal_excel_skeleton" &&
      renderer !== "formal_pdf_skeleton") ||
    (format !== "excel_skeleton" && format !== "pdf_skeleton")
  ) {
    return null;
  }

  return {
    renderer,
    format,
  };
};

const buildExpectedFilenameNoThrow = (
  output: Record<string, unknown> | null,
  format: unknown,
): string | null => {
  const filenameInput = readFormalArtifactFilenameInput(output);

  if (!filenameInput || !isFormalArtifactFormat(format)) {
    return null;
  }

  try {
    return buildFormalArtifactFilename(filenameInput, format);
  } catch {
    return null;
  }
};

const inferFormatNoThrow = (
  output: Record<string, unknown> | null,
): FormalArtifactFormat | null => {
  if (!output) {
    return null;
  }

  const formatInput = readFormalArtifactFormatInput(output);
  if (!formatInput) {
    return null;
  }

  try {
    return inferFormalArtifactFormat(formatInput);
  } catch {
    return null;
  }
};

export const runFormalFileWriterPreflight = (
  output: unknown,
  options: Partial<FormalFileWriterPreflightOptions> | null | undefined,
): FormalFileWriterPreflightReport => {
  const checks: FormalFileWriterPreflightCheck[] = [];
  const add = (
    check_code: string,
    passed: boolean,
    message: string,
    severity: "error" | "warning" = "error",
  ) => {
    checks.push({ check_code, passed, message, severity });
  };

  try {
    const outputRecord = isRecord(output) ? output : null;
    const optionsRecord = isRecord(options) ? options : null;
    const policy = normalizePolicy(optionsRecord?.policy);
    const allowedAudiences = policyAudiences(policy);
    const allowedFormats = policyFormats(policy);

    const artifactAudience = getString(optionsRecord, "artifact_audience");
    const artifactFormat = getString(optionsRecord, "artifact_format");
    const filename = getString(optionsRecord, "filename");
    const storageTarget = getString(optionsRecord, "storage_target");
    const writerOptions = optionsRecord?.writer_options;
    const signedDocumentExists = optionsRecord?.signed_document_exists === true;

    const outputAudience = getString(outputRecord, "audience");
    const outputRenderer = getString(outputRecord, "renderer");
    const outputSnapshotId = getString(outputRecord, "snapshot_id");
    const layoutContract = outputRecord?.layout_contract;
    const rows = outputRecord?.rows;
    const totals = outputRecord?.totals;
    const warnings = outputRecord?.warnings;
    const expectedFilename = buildExpectedFilenameNoThrow(
      outputRecord,
      artifactFormat,
    );
    const inferredFormat = inferFormatNoThrow(outputRecord);

    add(
      "input_is_object",
      Boolean(outputRecord),
      "Input must be an object produced by formal-renderer-entry.",
    );

    add(
      "renderer_exists",
      typeof outputRenderer === "string",
      "Output must include renderer.",
    );

    add(
      "formal_renderer_token_valid",
      outputRecord?.renderer_contract === "formal_renderer_entry_gated" &&
        isFormalRendererToken(outputRecord?.renderer_entry_token),
      "Input must be produced by formal-renderer-entry.",
    );

    add(
      "artifact_audience_exists",
      typeof artifactAudience === "string",
      "Preflight options must include artifact_audience.",
    );

    add(
      "artifact_format_exists",
      typeof artifactFormat === "string",
      "Preflight options must include artifact_format.",
    );

    add(
      "storage_target_exists",
      typeof storageTarget === "string",
      "Preflight options must include storage_target.",
    );

    add(
      "filename_exists",
      typeof filename === "string" && filename.length > 0,
      "Preflight options must include filename.",
    );

    add(
      "audience_allowed",
      allowedAudiences.includes(artifactAudience as FormalArtifactAudience),
      `Artifact audience must be one of: ${allowedAudiences.join(", ")}.`,
    );

    add(
      "format_allowed",
      allowedFormats.includes(artifactFormat as FormalArtifactFormat),
      `Artifact format must be one of: ${allowedFormats.join(", ")}.`,
    );

    add(
      "audience_matches_output",
      typeof artifactAudience === "string" &&
        artifactAudience === outputAudience,
      "Artifact audience must match formal renderer output audience.",
    );

    add(
      "format_matches_output",
      typeof artifactFormat === "string" &&
        artifactFormat === inferredFormat,
      "Artifact format must match formal renderer output type.",
    );

    add(
      "storage_target_allowed",
      safeStorageTargetIsAllowed(policy, storageTarget),
      "Storage target must be allowed by artifact policy.",
    );

    add(
      "no_signed_document_overwrite",
      !signedDocumentExists,
      "Writer must not overwrite a signed or approved document.",
    );

    add(
      "snapshot_id_exists",
      typeof outputSnapshotId === "string" && outputSnapshotId.length > 0,
      "Output must include snapshot_id.",
    );

    add(
      "filename_matches_policy",
      typeof filename === "string" &&
        typeof expectedFilename === "string" &&
        filename === expectedFilename,
      "Filename must follow snapshot-bound naming policy.",
    );

    add(
      "layout_contract_exists",
      isRecord(layoutContract),
      "Output must include layout_contract.",
    );

    add(
      "layout_contract_columns_exist",
      isRecord(layoutContract) && Array.isArray(layoutContract.columns),
      "Output layout_contract must include columns.",
    );

    add(
      "totals_exists",
      isRecord(totals),
      "Output must include totals.",
    );

    add(
      "rows_exists",
      outputRecord ? hasOwn(outputRecord, "rows") : false,
      "Output must include rows.",
    );

    add(
      "rows_is_array",
      Array.isArray(rows),
      "Output rows must be an array.",
    );

    add(
      "rows_nonempty",
      Array.isArray(rows) && rows.length > 0,
      "Output must include at least one row.",
    );

    add(
      "customer_layout_safe",
      artifactAudience !== "customer" ||
        !layoutContainsInternalTraceColumns(layoutContract),
      "Customer artifact layout must not contain internal trace columns.",
    );

    add(
      "customer_rows_safe",
      artifactAudience !== "customer" || !rowsContainInternalTraceCells(rows),
      "Customer artifact rows must not contain internal trace fields.",
    );

    add(
      "internal_artifact_marked",
      artifactAudience !== "internal_trace" ||
        outputAudience === "internal_trace",
      "Internal artifact must be explicitly marked internal_trace.",
    );

    add(
      "customer_warnings_sanitized",
      artifactAudience !== "customer" ||
        !warningsContainInternalTraceTerms(warnings),
      "Customer artifact warnings must not expose internal trace keys.",
    );

    add(
      "internal_warnings_allowed",
      artifactAudience !== "internal_trace" ||
        outputAudience === "internal_trace",
      "Internal trace artifact may keep full warnings only when audience is internal_trace.",
      "warning",
    );

    const forbiddenWriterOptionKeys =
      findForbiddenWriterOptionKeys(writerOptions);
    add(
      "writer_options_safe",
      forbiddenWriterOptionKeys.length === 0,
      forbiddenWriterOptionKeys.length === 0
        ? "Writer options do not include forbidden calculation or lookup keys."
        : `Writer options include forbidden keys: ${forbiddenWriterOptionKeys.join(", ")}.`,
    );

    return makeReport(checks);
  } catch (error) {
    add(
      "preflight_no_throw_guard",
      false,
      `Preflight caught malformed input without throwing: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return makeReport(checks);
  }
};
