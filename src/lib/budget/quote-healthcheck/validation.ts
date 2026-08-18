import type { EvidencePointer, ValidationIssue } from "./types.ts";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const hasIdentity = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isIsoDateTime = (value: unknown): value is string =>
  hasIdentity(value) && Number.isFinite(Date.parse(value));

export const isSha256 = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{64}$/.test(value);

export const addIssue = (
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void => {
  issues.push({ path, code, message });
};

export const requireIdentity = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is string => {
  if (!hasIdentity(value)) {
    addIssue(
      issues,
      path,
      "IDENTITY_REQUIRED",
      "A non-empty identity is required.",
    );
    return false;
  }
  return true;
};

export const requireIsoDateTime = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is string => {
  if (!isIsoDateTime(value)) {
    addIssue(
      issues,
      path,
      "ISO_DATETIME_REQUIRED",
      "An ISO date-time is required.",
    );
    return false;
  }
  return true;
};

export const requireClosedKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void => {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      addIssue(
        issues,
        path ? `${path}.${key}` : key,
        "UNKNOWN_FIELD",
        "Unknown fields fail closed.",
      );
    }
  }
};

const finiteNonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const positiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

export const parseEvidencePointer = (
  value: unknown,
  expectedDocumentVersionId: string,
  path: string,
  issues: ValidationIssue[],
): EvidencePointer | null => {
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "EVIDENCE_POINTER_REQUIRED",
      "Evidence must be a closed object.",
    );
    return null;
  }
  if (value.sourceDocumentVersionId !== expectedDocumentVersionId) {
    addIssue(
      issues,
      `${path}.sourceDocumentVersionId`,
      "EVIDENCE_DOCUMENT_VERSION_MISMATCH",
      "Evidence must pin the packet document version.",
    );
  }

  if (value.kind === "worksheet_cell") {
    requireClosedKeys(
      value,
      ["kind", "sourceDocumentVersionId", "sheet", "cell"],
      path,
      issues,
    );
    if (
      !requireIdentity(value.sheet, `${path}.sheet`, issues) ||
      !requireIdentity(value.cell, `${path}.cell`, issues) ||
      !hasIdentity(value.sourceDocumentVersionId)
    ) return null;
    return {
      kind: "worksheet_cell",
      sourceDocumentVersionId: value.sourceDocumentVersionId,
      sheet: value.sheet,
      cell: value.cell,
    };
  }

  if (value.kind === "worksheet_row") {
    requireClosedKeys(
      value,
      ["kind", "sourceDocumentVersionId", "sheet", "row"],
      path,
      issues,
    );
    if (
      !requireIdentity(value.sheet, `${path}.sheet`, issues) ||
      !positiveInteger(value.row) || !hasIdentity(value.sourceDocumentVersionId)
    ) {
      if (!positiveInteger(value.row)) {
        addIssue(
          issues,
          `${path}.row`,
          "ROW_REQUIRED",
          "A positive row is required.",
        );
      }
      return null;
    }
    return {
      kind: "worksheet_row",
      sourceDocumentVersionId: value.sourceDocumentVersionId,
      sheet: value.sheet,
      row: value.row,
    };
  }

  if (value.kind === "worksheet_range") {
    requireClosedKeys(
      value,
      ["kind", "sourceDocumentVersionId", "sheet", "range"],
      path,
      issues,
    );
    if (
      !requireIdentity(value.sheet, `${path}.sheet`, issues) ||
      !requireIdentity(value.range, `${path}.range`, issues) ||
      !hasIdentity(value.sourceDocumentVersionId)
    ) return null;
    return {
      kind: "worksheet_range",
      sourceDocumentVersionId: value.sourceDocumentVersionId,
      sheet: value.sheet,
      range: value.range,
    };
  }

  if (value.kind === "text_region") {
    requireClosedKeys(
      value,
      ["kind", "sourceDocumentVersionId", "page", "region"],
      path,
      issues,
    );
    if (!positiveInteger(value.page)) {
      addIssue(
        issues,
        `${path}.page`,
        "PAGE_REQUIRED",
        "A positive page is required.",
      );
    }
    if (!isRecord(value.region)) {
      addIssue(
        issues,
        `${path}.region`,
        "TEXT_REGION_REQUIRED",
        "A text region is required.",
      );
      return null;
    }
    requireClosedKeys(
      value.region,
      ["x", "y", "width", "height"],
      `${path}.region`,
      issues,
    );
    const region = value.region as Record<string, unknown>;
    const validRegion = ["x", "y", "width", "height"].every((key) =>
      finiteNonnegative(region[key])
    );
    if (!validRegion) {
      addIssue(
        issues,
        `${path}.region`,
        "TEXT_REGION_INVALID",
        "Region values must be finite and nonnegative.",
      );
    }
    if (
      !positiveInteger(value.page) || !validRegion ||
      !hasIdentity(value.sourceDocumentVersionId)
    ) return null;
    return {
      kind: "text_region",
      sourceDocumentVersionId: value.sourceDocumentVersionId,
      page: value.page,
      region: {
        x: value.region.x as number,
        y: value.region.y as number,
        width: value.region.width as number,
        height: value.region.height as number,
      },
    };
  }

  addIssue(
    issues,
    `${path}.kind`,
    "EVIDENCE_KIND_UNSUPPORTED",
    "Evidence kind is unsupported.",
  );
  return null;
};

export const parseEvidenceArray = (
  value: unknown,
  expectedDocumentVersionId: string,
  path: string,
  issues: ValidationIssue[],
): EvidencePointer[] => {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(
      issues,
      path,
      "EVIDENCE_REQUIRED",
      "At least one evidence pointer is required.",
    );
    return [];
  }
  return value.map((item, index) =>
    parseEvidencePointer(
      item,
      expectedDocumentVersionId,
      `${path}[${index}]`,
      issues,
    )
  ).filter((item): item is EvidencePointer => item !== null);
};

export const normalizeOptionalText = (value: unknown): string | null =>
  hasIdentity(value) ? value.trim() : null;

export const normalizeNotes = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] => {
  if (
    !Array.isArray(value) || !value.every((item) => typeof item === "string")
  ) {
    addIssue(
      issues,
      path,
      "NOTES_INVALID",
      "Notes must be an array of strings.",
    );
    return [];
  }
  return value.map((item) => item.trim()).filter(Boolean);
};

const canonicalize = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${
    Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalize(record[key])}`
    ).join(",")
  }}`;
};

export const sha256Canonical = async (value: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const dedupeEvidence = (
  evidence: EvidencePointer[],
): EvidencePointer[] => {
  const seen = new Set<string>();
  return evidence.filter((pointer) => {
    const key = canonicalize(pointer);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const validateQuoteNumber = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "QUOTE_NUMBER_INVALID",
      "Quote number must be a closed object.",
    );
    return;
  }
  if (value.status === "KNOWN") {
    requireClosedKeys(value, ["status", "value"], path, issues);
    if (
      typeof value.value !== "string" ||
      !/^[+-]?\d+(?:\.\d+)?$/.test(value.value)
    ) {
      addIssue(
        issues,
        `${path}.value`,
        "KNOWN_DECIMAL_INVALID",
        "Known quote number must be a decimal string.",
      );
    }
    return;
  }
  if (value.status === "UNKNOWN") {
    requireClosedKeys(value, ["status", "value", "reason"], path, issues);
    if (value.value !== null) {
      addIssue(
        issues,
        `${path}.value`,
        "UNKNOWN_VALUE_MUST_BE_NULL",
        "Unknown quote number value must be null.",
      );
    }
    if (
      value.reason !== "EMPTY" && value.reason !== "NON_FINITE" &&
      value.reason !== "INVALID"
    ) {
      addIssue(
        issues,
        `${path}.reason`,
        "UNKNOWN_REASON_INVALID",
        "Unknown quote number reason is invalid.",
      );
    }
    return;
  }
  addIssue(
    issues,
    `${path}.status`,
    "QUOTE_NUMBER_STATUS_INVALID",
    "Quote number status is invalid.",
  );
};

export const validateIdentityArray = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (!Array.isArray(value) || !value.every(hasIdentity)) {
    addIssue(
      issues,
      path,
      "IDENTITY_ARRAY_REQUIRED",
      "An identity array is required.",
    );
  }
};

export const validateUpstreamPacketArray = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      path,
      "UPSTREAM_ARRAY_REQUIRED",
      "Upstream packet references must be an array.",
    );
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      addIssue(
        issues,
        itemPath,
        "UPSTREAM_REFERENCE_INVALID",
        "Upstream reference must be a closed object.",
      );
      return;
    }
    requireClosedKeys(item, ["schemaName", "packetId"], itemPath, issues);
    requireIdentity(item.schemaName, `${itemPath}.schemaName`, issues);
    requireIdentity(item.packetId, `${itemPath}.packetId`, issues);
  });
};

export const validateNoticeArray = (
  value: unknown,
  expectedDocumentVersionId: string,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      path,
      "NOTICE_ARRAY_REQUIRED",
      "Notices must be an array.",
    );
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      addIssue(
        issues,
        itemPath,
        "NOTICE_INVALID",
        "Notice must be a closed object.",
      );
      return;
    }
    requireClosedKeys(item, ["code", "message", "evidence"], itemPath, issues);
    requireIdentity(item.code, `${itemPath}.code`, issues);
    requireIdentity(item.message, `${itemPath}.message`, issues);
    parseEvidenceArray(
      item.evidence,
      expectedDocumentVersionId,
      `${itemPath}.evidence`,
      issues,
    );
  });
};
