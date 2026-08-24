import { validateQuoteHealthReportV1 } from "./report.ts";
import {
  QUOTE_HEALTH_REPORT_SCHEMA,
  QUOTE_HEALTH_REVIEW_PACKET_SCHEMA,
} from "./types.ts";
import type {
  BuildResult,
  DecisionRecordReference,
  QuoteHealthReportV1,
  QuoteHealthReportReference,
  QuoteHealthReviewPacketV1,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";
import {
  addIssue,
  hasIdentity,
  isRecord,
  isSha256,
  requireClosedKeys,
  requireIdentity,
  sha256Canonical,
} from "./validation.ts";

const INPUT_KEYS = [
  "packetId",
  "createdAt",
  "recordedAt",
  "quoteHealthReport",
  "decisionRecordReferences",
] as const;

const PACKET_KEYS = [
  "schemaName",
  "schemaVersion",
  "packetId",
  "caseId",
  "quoteHealthReportPacketId",
  "quoteHealthReportReference",
  "sourceDocumentReferenceId",
  "sourceDocumentId",
  "sourceDocumentVersionId",
  "sourceDocumentSha256",
  "reviewStatus",
  "nextOwner",
  "nextAction",
  "decisionRecordReferences",
  "createdAt",
  "recordedAt",
  "factsHash",
] as const;

const REPORT_REFERENCE_KEYS = [
  "schemaName",
  "schemaVersion",
  "packetId",
  "factsHash",
  "caseId",
  "sourceDocumentReferenceId",
  "sourceDocumentId",
  "sourceDocumentVersionId",
  "sourceDocumentSha256",
  "lifecycleStatus",
  "overallStatus",
  "reviewStage",
  "reviewDisposition",
] as const;

const DECISION_REFERENCE_KEYS = [
  "decisionRecordId",
  "decisionRecordVersion",
  "decisionRecordSha256",
] as const;

const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;

const isRfc3339 = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = RFC3339.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(
    Number,
  );
  const offsetHour = match[7] === "Z" ? 0 : Number(match[8]);
  const offsetMinute = match[7] === "Z" ? 0 : Number(match[9]);
  const daysInMonth = month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month)
    ? 30
    : 31;
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth &&
    hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 &&
    offsetMinute <= 59 && Number.isFinite(Date.parse(value));
};

const requireRfc3339 = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is string => {
  if (isRfc3339(value)) return true;
  addIssue(
    issues,
    path,
    "RFC3339_REQUIRED",
    "A strict RFC3339 date-time is required.",
  );
  return false;
};

const parseDecisionRecordReferences = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): DecisionRecordReference[] => {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      path,
      "DECISION_REFERENCES_REQUIRED",
      "Decision record references must be an array.",
    );
    return [];
  }
  const references: DecisionRecordReference[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      addIssue(
        issues,
        itemPath,
        "DECISION_REFERENCE_DENSE_ARRAY_REQUIRED",
        "Decision record references must not contain sparse entries.",
      );
      continue;
    }
    const item = value[index];
    if (!isRecord(item)) {
      addIssue(
        issues,
        itemPath,
        "DECISION_REFERENCE_INVALID",
        "Decision record reference must be a closed object.",
      );
      continue;
    }
    requireClosedKeys(item, DECISION_REFERENCE_KEYS, itemPath, issues);
    const validId = requireIdentity(
      item.decisionRecordId,
      `${itemPath}.decisionRecordId`,
      issues,
    );
    const validVersion = Number.isSafeInteger(item.decisionRecordVersion) &&
      Number(item.decisionRecordVersion) > 0;
    if (!validVersion) {
      addIssue(
        issues,
        `${itemPath}.decisionRecordVersion`,
        "DECISION_VERSION_INVALID",
        "Decision record version must be a positive safe integer.",
      );
    }
    const validHash = isSha256(item.decisionRecordSha256);
    if (!validHash) {
      addIssue(
        issues,
        `${itemPath}.decisionRecordSha256`,
        "DECISION_HASH_INVALID",
        "Decision record SHA-256 must be lowercase hexadecimal.",
      );
    }
    if (!validId || !validVersion || !validHash) continue;
    const decisionRecordId = (item.decisionRecordId as string).trim();
    const decisionRecordVersion = item.decisionRecordVersion as number;
    const key = `${decisionRecordId}\u0000${decisionRecordVersion}`;
    if (seen.has(key)) {
      addIssue(
        issues,
        itemPath,
        "DUPLICATE_DECISION_REFERENCE",
        "Decision record id and version must be unique.",
      );
      continue;
    }
    seen.add(key);
    references.push({
      decisionRecordId,
      decisionRecordVersion,
      decisionRecordSha256: item.decisionRecordSha256 as string,
    });
  }
  return references;
};

const parseReportReference = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): QuoteHealthReportReference | null => {
  const start = issues.length;
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "REPORT_REFERENCE_REQUIRED",
      "A quote health report reference is required.",
    );
    return null;
  }
  requireClosedKeys(value, REPORT_REFERENCE_KEYS, path, issues);
  if (value.schemaName !== QUOTE_HEALTH_REPORT_SCHEMA || value.schemaVersion !== 1) {
    addIssue(
      issues,
      path,
      "REPORT_SCHEMA_MISMATCH",
      "Only laibe.quote-health-report.v1 may be referenced.",
    );
  }
  for (const key of [
    "packetId",
    "caseId",
    "sourceDocumentReferenceId",
    "sourceDocumentId",
    "sourceDocumentVersionId",
  ]) requireIdentity(value[key], `${path}.${key}`, issues);
  for (const key of ["factsHash", "sourceDocumentSha256"]) {
    if (!isSha256(value[key])) {
      addIssue(
        issues,
        `${path}.${key}`,
        "REPORT_REFERENCE_HASH_INVALID",
        "Report reference hashes must be lowercase SHA-256 values.",
      );
    }
  }
  if (value.reviewStage !== "machine_candidate" ||
    value.reviewDisposition !== "HUMAN_PCM_REVIEW_PENDING") {
    addIssue(
      issues,
      path,
      "REPORT_REVIEW_STATE_INVALID",
      "The referenced report must remain a Human PCM review-pending machine candidate.",
    );
  }
  const lifecycleValid = value.lifecycleStatus === "CURRENT" ||
    value.lifecycleStatus === "STALE";
  const overallValid = value.overallStatus === "COMPLETE" ||
    value.overallStatus === "PARTIAL" || value.overallStatus === "STALE";
  if (!lifecycleValid || !overallValid ||
    (value.lifecycleStatus === "STALE" && value.overallStatus !== "STALE") ||
    (value.lifecycleStatus === "CURRENT" && value.overallStatus === "STALE")) {
    addIssue(
      issues,
      path,
      "REPORT_LIFECYCLE_MISMATCH",
      "Report lifecycle and overall status must remain consistent.",
    );
  }
  return issues.length === start
    ? value as unknown as QuoteHealthReportReference
    : null;
};

const quoteReportReferenceFrom = (
  report: QuoteHealthReportV1,
): QuoteHealthReportReference => ({
  schemaName: QUOTE_HEALTH_REPORT_SCHEMA,
  schemaVersion: 1,
  packetId: report.packetId,
  factsHash: report.factsHash,
  caseId: report.caseId,
  sourceDocumentReferenceId: report.sourceDocumentReferenceId,
  sourceDocumentId: report.sourceDocumentId,
  sourceDocumentVersionId: report.sourceDocumentVersionId,
  sourceDocumentSha256: report.sourceDocumentSha256,
  lifecycleStatus: report.lifecycleStatus,
  overallStatus: report.overallStatus,
  reviewStage: "machine_candidate",
  reviewDisposition: "HUMAN_PCM_REVIEW_PENDING",
});

export const buildQuoteHealthReviewPacketV1 = async (
  input: unknown,
): Promise<BuildResult<QuoteHealthReviewPacketV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{
      path: "",
      code: "REVIEW_PACKET_INPUT_INVALID",
      message: "Review packet input must be a closed object.",
    }] };
  }
  requireClosedKeys(input, INPUT_KEYS, "", issues);
  requireIdentity(input.packetId, "packetId", issues);
  const createdAtValid = requireRfc3339(input.createdAt, "createdAt", issues);
  const recordedAtValid = requireRfc3339(input.recordedAt, "recordedAt", issues);
  const createdAt = input.createdAt as string;
  const recordedAt = input.recordedAt as string;
  if (createdAtValid && recordedAtValid && Date.parse(createdAt) > Date.parse(recordedAt)) {
    addIssue(
      issues,
      "recordedAt",
      "TIMESTAMP_ORDER_INVALID",
      "recordedAt must not be earlier than createdAt.",
    );
  }
  const reportValidation = await validateQuoteHealthReportV1(
    input.quoteHealthReport,
  );
  if (!reportValidation.valid) {
    reportValidation.issues.forEach((issue) => addIssue(
      issues,
      `quoteHealthReport${issue.path ? `.${issue.path}` : ""}`,
      issue.code,
      issue.message,
    ));
  }
  const references = parseDecisionRecordReferences(
    input.decisionRecordReferences,
    "decisionRecordReferences",
    issues,
  );
  if (issues.length > 0 || !reportValidation.valid || !hasIdentity(input.packetId) ||
    !createdAtValid || !recordedAtValid) return { ok: false, issues };

  const report = reportValidation.value;
  const packetWithoutFactsHash: Omit<QuoteHealthReviewPacketV1, "factsHash"> = {
    schemaName: QUOTE_HEALTH_REVIEW_PACKET_SCHEMA,
    schemaVersion: 1,
    packetId: input.packetId.trim(),
    caseId: report.caseId,
    quoteHealthReportPacketId: report.packetId,
    quoteHealthReportReference: quoteReportReferenceFrom(report),
    sourceDocumentReferenceId: report.sourceDocumentReferenceId,
    sourceDocumentId: report.sourceDocumentId,
    sourceDocumentVersionId: report.sourceDocumentVersionId,
    sourceDocumentSha256: report.sourceDocumentSha256,
    reviewStatus: "HUMAN_PCM_REVIEW_PENDING",
    nextOwner: "HUMAN_PCM",
    nextAction: "REVIEW_QUOTE_HEALTH_REPORT",
    decisionRecordReferences: references,
    createdAt,
    recordedAt,
  };
  const packet: QuoteHealthReviewPacketV1 = {
    ...packetWithoutFactsHash,
    factsHash: await sha256Canonical(packetWithoutFactsHash),
  };
  const validation = await validateQuoteHealthReviewPacketV1(packet, report);
  return validation.valid
    ? { ok: true, value: packet }
    : { ok: false, issues: validation.issues };
};

export const validateQuoteHealthReviewPacketV1 = async (
  value: unknown,
  trustedQuoteHealthReport: unknown,
): Promise<ValidationResult<QuoteHealthReviewPacketV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{
      path: "",
      code: "REVIEW_PACKET_INVALID",
      message: "Review packet must be a closed object.",
    }] };
  }
  requireClosedKeys(value, PACKET_KEYS, "", issues);
  if (value.schemaName !== QUOTE_HEALTH_REVIEW_PACKET_SCHEMA || value.schemaVersion !== 1) {
    addIssue(issues, "schemaName", "SCHEMA_MISMATCH", "Review packet schema must be v1.");
  }
  for (const key of [
    "packetId",
    "caseId",
    "quoteHealthReportPacketId",
    "sourceDocumentReferenceId",
    "sourceDocumentId",
    "sourceDocumentVersionId",
  ]) requireIdentity(value[key], key, issues);
  for (const key of ["sourceDocumentSha256", "factsHash"]) {
    if (!isSha256(value[key])) {
      addIssue(issues, key, "SHA256_REQUIRED", "A lowercase SHA-256 is required.");
    }
  }
  const createdAtValid = requireRfc3339(value.createdAt, "createdAt", issues);
  const recordedAtValid = requireRfc3339(value.recordedAt, "recordedAt", issues);
  const createdAt = value.createdAt as string;
  const recordedAt = value.recordedAt as string;
  if (createdAtValid && recordedAtValid && Date.parse(createdAt) > Date.parse(recordedAt)) {
    addIssue(issues, "recordedAt", "TIMESTAMP_ORDER_INVALID", "recordedAt must not be earlier than createdAt.");
  }
  for (const [key, expected] of [
    ["reviewStatus", "HUMAN_PCM_REVIEW_PENDING"],
    ["nextOwner", "HUMAN_PCM"],
    ["nextAction", "REVIEW_QUOTE_HEALTH_REPORT"],
  ] as const) {
    if (value[key] !== expected) {
      addIssue(issues, key, "CONSTANT_MISMATCH", `Expected ${expected}.`);
    }
  }
  const reference = parseReportReference(
    value.quoteHealthReportReference,
    "quoteHealthReportReference",
    issues,
  );
  if (reference) {
    for (const key of [
      "caseId",
      "sourceDocumentReferenceId",
      "sourceDocumentId",
      "sourceDocumentVersionId",
      "sourceDocumentSha256",
    ] as const) {
      if (value[key] !== reference[key]) {
        addIssue(issues, key, "REPORT_BINDING_MISMATCH", "Packet binding must match the referenced report.");
      }
    }
    if (value.quoteHealthReportPacketId !== reference.packetId) {
      addIssue(issues, "quoteHealthReportPacketId", "REPORT_BINDING_MISMATCH", "Packet report identity must match the referenced report.");
    }
  }
  const trustedReportValidation = await validateQuoteHealthReportV1(
    trustedQuoteHealthReport,
  );
  if (!trustedReportValidation.valid) {
    trustedReportValidation.issues.forEach((issue) => addIssue(
      issues,
      `trustedQuoteHealthReport${issue.path ? `.${issue.path}` : ""}`,
      issue.code,
      issue.message,
    ));
  } else if (reference) {
    const trustedReference = quoteReportReferenceFrom(
      trustedReportValidation.value,
    );
    for (const key of REPORT_REFERENCE_KEYS) {
      if (reference[key] !== trustedReference[key]) {
        addIssue(
          issues,
          `quoteHealthReportReference.${key}`,
          "TRUSTED_REPORT_BINDING_MISMATCH",
          "Packet reference must exactly match the trusted quote health report.",
        );
      }
    }
  }
  parseDecisionRecordReferences(
    value.decisionRecordReferences,
    "decisionRecordReferences",
    issues,
  );
  if (isSha256(value.factsHash)) {
    const { factsHash: _factsHash, ...preimage } = value;
    const expected = await sha256Canonical(preimage);
    if (value.factsHash !== expected) {
      addIssue(issues, "factsHash", "FACTS_HASH_MISMATCH", "factsHash must match the canonical packet preimage.");
    }
  }
  return issues.length === 0
    ? { valid: true, value: value as unknown as QuoteHealthReviewPacketV1, issues }
    : { valid: false, issues };
};
