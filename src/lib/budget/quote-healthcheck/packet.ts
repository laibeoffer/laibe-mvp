import { parseQuoteNumber } from "./decimal.ts";
import type {
  BuildResult,
  ConformingReferenceStatus,
  NormalizedQuoteRow,
  PlanSnapshotPacketReference,
  QuoteDependencyBasis,
  QuoteExtractionPacketV1,
  QuoteHealthcheckMode,
  QuoteNumber,
  QuoteTotals,
  StructuredNotice,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";
import {
  A0_AUTHORITY_DECISION_CODE,
  CONTRACTOR_PAYMENT_DUE,
  DOCUMENT_VERSION_REF_SCHEMA,
  KNOWLEDGE_RELEASE_SCHEMA,
  PAYMENT_AUTHORIZATION,
  PLAN_PUZZLE_SNAPSHOT_SCHEMA,
  QUOTE_EXTRACTION_PACKET_SCHEMA,
  SPEC_REFERENCE_TYPE,
} from "./types.ts";
import {
  addIssue,
  dedupeEvidence,
  hasIdentity,
  isIsoDateTime,
  isRecord,
  isSha256,
  normalizeNotes,
  normalizeOptionalText,
  parseEvidenceArray,
  requireClosedKeys,
  requireIdentity,
  requireIsoDateTime,
  sha256Canonical,
  validateIdentityArray,
  validateNoticeArray,
  validateQuoteNumber,
} from "./validation.ts";

const INPUT_KEYS = [
  "packetId",
  "caseId",
  "producerVersion",
  "createdAt",
  "recordedAt",
  "mode",
  "authority",
  "document",
  "dependencyBasis",
  "upstreamPacketIds",
  "supersedesPacketIds",
  "rows",
  "totals",
] as const;

const PACKET_KEYS = [
  "schemaName",
  "schemaVersion",
  "packetId",
  "caseId",
  "producerRole",
  "producerVersion",
  "sourceDocumentReferenceId",
  "sourceDocumentId",
  "sourceDocumentVersionId",
  "sourceDocumentCurrentVersionId",
  "sourceDocumentSupersededByVersionId",
  "sourceDocumentSha256",
  "dependencyBasis",
  "upstreamPacketIds",
  "evidenceReferences",
  "createdAt",
  "recordedAt",
  "processingStatus",
  "uncertainty",
  "warnings",
  "supersedesPacketIds",
  "humanReviewRequired",
  "paymentAuthorization",
  "contractorPaymentDue",
  "pricedCandidateGenerated",
  "reviewStage",
  "mode",
  "authorityDecisionCode",
  "rows",
  "totals",
  "factsHash",
] as const;

const ROW_KEYS = [
  "lineId",
  "itemName",
  "unit",
  "quantity",
  "unitPrice",
  "multiplier",
  "declaredAmount",
  "notes",
  "evidence",
] as const;

const TOTAL_KEYS = [
  "declaredSubtotal",
  "taxRate",
  "declaredTax",
  "declaredTotal",
  "evidence",
] as const;

const isMode = (value: unknown): value is QuoteHealthcheckMode =>
  value === "PRE_CONTRACT_QUOTE_HEALTHCHECK" ||
  value === "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";

const isReferenceStatus = (
  value: unknown,
): value is ConformingReferenceStatus =>
  value === "TEST_ONLY_CONFORMING_REFERENCE" || value === "A0_ACCEPTED";

const parseStringArray = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] => {
  if (!Array.isArray(value) || !value.every(hasIdentity)) {
    addIssue(
      issues,
      path,
      "IDENTITY_ARRAY_REQUIRED",
      "An identity array is required.",
    );
    return [];
  }
  return value.map((item) => item.trim());
};

const PLAN_REFERENCE_KEYS = [
  "schemaName",
  "schemaVersion",
  "packetId",
  "packetVersion",
  "packetSha256",
  "caseId",
  "status",
  "current",
] as const;

const KNOWLEDGE_REFERENCE_KEYS = [
  "schemaVersion",
  "releaseId",
  "releaseVersion",
  "contentSha256",
  "lifecycleState",
  "current",
] as const;

const SPEC_REFERENCE_KEYS = [
  "referenceType",
  "caseId",
  "referenceId",
  "status",
] as const;

const DEPENDENCY_BASIS_KEYS = [
  "planSnapshot",
  "knowledgeRelease",
  "specReference",
] as const;

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

const parsePlanSnapshotReference = (
  value: unknown,
  path: string,
  expectedCaseId: string,
  issues: ValidationIssue[],
): PlanSnapshotPacketReference | null => {
  const start = issues.length;
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "PLAN_SNAPSHOT_REFERENCE_REQUIRED",
      "An exact A9 plan snapshot reference is required.",
    );
    return null;
  }
  requireClosedKeys(value, PLAN_REFERENCE_KEYS, path, issues);
  if (value.schemaName !== PLAN_PUZZLE_SNAPSHOT_SCHEMA) {
    addIssue(
      issues,
      `${path}.schemaName`,
      "UNKNOWN_MAJOR",
      "Only laibe.plan-puzzle-snapshot.v1 is accepted.",
    );
  }
  if (value.schemaVersion !== 1) {
    addIssue(
      issues,
      `${path}.schemaVersion`,
      "UNKNOWN_MAJOR",
      "Plan snapshot schemaVersion must be 1.",
    );
  }
  requireIdentity(value.packetId, `${path}.packetId`, issues);
  if (!isPositiveInteger(value.packetVersion)) {
    addIssue(
      issues,
      `${path}.packetVersion`,
      "PLAN_SNAPSHOT_VERSION_INVALID",
      "Plan snapshot packetVersion must be a positive integer.",
    );
  }
  if (!isSha256(value.packetSha256)) {
    addIssue(
      issues,
      `${path}.packetSha256`,
      "PLAN_SNAPSHOT_HASH_INVALID",
      "Plan snapshot packetSha256 must be a lowercase SHA-256.",
    );
  }
  requireIdentity(value.caseId, `${path}.caseId`, issues);
  if (hasIdentity(expectedCaseId) && value.caseId !== expectedCaseId) {
    addIssue(
      issues,
      `${path}.caseId`,
      "DEPENDENCY_CASE_MISMATCH",
      "Plan snapshot and packet case identities must match.",
    );
  }
  if (value.status !== "active") {
    addIssue(
      issues,
      `${path}.status`,
      "DEPENDENCY_INACTIVE",
      "Plan snapshot must be active.",
    );
  }
  if (value.current !== true) {
    addIssue(
      issues,
      `${path}.current`,
      "DEPENDENCY_STALE",
      "Plan snapshot must be current.",
    );
  }
  return issues.length === start
    ? value as unknown as PlanSnapshotPacketReference
    : null;
};

const parseKnowledgeReleaseReference = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): QuoteDependencyBasis["knowledgeRelease"] | null => {
  const start = issues.length;
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "KNOWLEDGE_RELEASE_REFERENCE_REQUIRED",
      "An exact approved knowledge release reference is required.",
    );
    return null;
  }
  requireClosedKeys(value, KNOWLEDGE_REFERENCE_KEYS, path, issues);
  if (value.schemaVersion !== KNOWLEDGE_RELEASE_SCHEMA) {
    addIssue(
      issues,
      `${path}.schemaVersion`,
      "UNKNOWN_MAJOR",
      "Only laibe.knowledge-release.v1 is accepted.",
    );
  }
  requireIdentity(value.releaseId, `${path}.releaseId`, issues);
  if (!isPositiveInteger(value.releaseVersion)) {
    addIssue(
      issues,
      `${path}.releaseVersion`,
      "KNOWLEDGE_RELEASE_VERSION_INVALID",
      "Knowledge releaseVersion must be a positive integer.",
    );
  }
  if (!isSha256(value.contentSha256)) {
    addIssue(
      issues,
      `${path}.contentSha256`,
      "KNOWLEDGE_RELEASE_HASH_INVALID",
      "Knowledge release contentSha256 must be a lowercase SHA-256.",
    );
  }
  if (value.lifecycleState !== "active") {
    addIssue(
      issues,
      `${path}.lifecycleState`,
      "DEPENDENCY_INACTIVE",
      "Knowledge release must be active.",
    );
  }
  if (value.current !== true) {
    addIssue(
      issues,
      `${path}.current`,
      "DEPENDENCY_STALE",
      "Knowledge release must be current.",
    );
  }
  return issues.length === start
    ? value as unknown as QuoteDependencyBasis["knowledgeRelease"]
    : null;
};

const parseSpecReference = (
  value: unknown,
  path: string,
  expectedCaseId: string,
  issues: ValidationIssue[],
): QuoteDependencyBasis["specReference"] | null => {
  const start = issues.length;
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "SPEC_REFERENCE_REQUIRED",
      "An exact A0-pinned SPEC reference is required.",
    );
    return null;
  }
  requireClosedKeys(value, SPEC_REFERENCE_KEYS, path, issues);
  if (value.referenceType !== SPEC_REFERENCE_TYPE) {
    addIssue(
      issues,
      `${path}.referenceType`,
      "SPEC_REFERENCE_INVALID",
      "The A0 pinned SPEC reference type is required.",
    );
  }
  requireIdentity(value.caseId, `${path}.caseId`, issues);
  requireIdentity(value.referenceId, `${path}.referenceId`, issues);
  if (hasIdentity(expectedCaseId) && value.caseId !== expectedCaseId) {
    addIssue(
      issues,
      `${path}.caseId`,
      "DEPENDENCY_CASE_MISMATCH",
      "SPEC and packet case identities must match.",
    );
  }
  if (value.status !== "pinned") {
    addIssue(
      issues,
      `${path}.status`,
      "SPEC_NOT_PINNED",
      "The SPEC reference must be pinned by A0 authority.",
    );
  }
  return issues.length === start
    ? value as unknown as QuoteDependencyBasis["specReference"]
    : null;
};

const parseDependencyBasis = (
  value: unknown,
  expectedCaseId: string,
  issues: ValidationIssue[],
): QuoteDependencyBasis | null => {
  if (!isRecord(value)) {
    addIssue(
      issues,
      "dependencyBasis",
      "DEPENDENCY_BASIS_REQUIRED",
      "A closed dependency basis is required.",
    );
    return null;
  }
  requireClosedKeys(value, DEPENDENCY_BASIS_KEYS, "dependencyBasis", issues);
  const planSnapshot = parsePlanSnapshotReference(
    value.planSnapshot,
    "dependencyBasis.planSnapshot",
    expectedCaseId,
    issues,
  );
  const knowledgeRelease = parseKnowledgeReleaseReference(
    value.knowledgeRelease,
    "dependencyBasis.knowledgeRelease",
    issues,
  );
  const specReference = parseSpecReference(
    value.specReference,
    "dependencyBasis.specReference",
    expectedCaseId,
    issues,
  );
  return planSnapshot && knowledgeRelease && specReference
    ? { planSnapshot, knowledgeRelease, specReference }
    : null;
};

const parseUpstreamPacketIds = (
  value: unknown,
  expectedCaseId: string,
  issues: ValidationIssue[],
): PlanSnapshotPacketReference[] => {
  if (!Array.isArray(value) || value.length !== 1) {
    addIssue(
      issues,
      "upstreamPacketIds",
      "UPSTREAM_EXACT_A9_REQUIRED",
      "Exactly one typed A9 plan snapshot reference is required.",
    );
    return [];
  }
  const parsed = parsePlanSnapshotReference(
    value[0],
    "upstreamPacketIds[0]",
    expectedCaseId,
    issues,
  );
  return parsed ? [parsed] : [];
};

const samePlanSnapshotReference = (
  left: PlanSnapshotPacketReference,
  right: PlanSnapshotPacketReference,
): boolean =>
  left.schemaName === right.schemaName &&
  left.schemaVersion === right.schemaVersion &&
  left.packetId === right.packetId &&
  left.packetVersion === right.packetVersion &&
  left.packetSha256 === right.packetSha256 &&
  left.caseId === right.caseId &&
  left.status === right.status &&
  left.current === right.current;

const parseRow = (
  value: unknown,
  index: number,
  documentVersionId: string,
  issues: ValidationIssue[],
): NormalizedQuoteRow | null => {
  const path = `rows[${index}]`;
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "ROW_INVALID",
      "A normalized quote row must be an object.",
    );
    return null;
  }
  requireClosedKeys(value, ROW_KEYS, path, issues);
  if (!requireIdentity(value.lineId, `${path}.lineId`, issues)) return null;
  const evidence = parseEvidenceArray(
    value.evidence,
    documentVersionId,
    `${path}.evidence`,
    issues,
  );
  return {
    lineId: value.lineId.trim(),
    itemName: normalizeOptionalText(value.itemName),
    unit: normalizeOptionalText(value.unit),
    quantity: parseQuoteNumber(value.quantity),
    unitPrice: parseQuoteNumber(value.unitPrice),
    multiplier: parseQuoteNumber(value.multiplier),
    declaredAmount: parseQuoteNumber(value.declaredAmount),
    notes: normalizeNotes(value.notes, `${path}.notes`, issues),
    evidence,
  };
};

const parseTotals = (
  value: unknown,
  documentVersionId: string,
  issues: ValidationIssue[],
): QuoteTotals | null => {
  if (!isRecord(value)) {
    addIssue(
      issues,
      "totals",
      "TOTALS_INVALID",
      "Quote totals must be an object.",
    );
    return null;
  }
  requireClosedKeys(value, TOTAL_KEYS, "totals", issues);
  return {
    declaredSubtotal: parseQuoteNumber(value.declaredSubtotal),
    taxRate: parseQuoteNumber(value.taxRate),
    declaredTax: parseQuoteNumber(value.declaredTax),
    declaredTotal: parseQuoteNumber(value.declaredTotal),
    evidence: parseEvidenceArray(
      value.evidence,
      documentVersionId,
      "totals.evidence",
      issues,
    ),
  };
};

const collectUnknownNotices = (
  rows: NormalizedQuoteRow[],
  totals: QuoteTotals,
): StructuredNotice[] => {
  const notices: StructuredNotice[] = [];
  for (const row of rows) {
    for (
      const [field, number] of Object.entries({
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        multiplier: row.multiplier,
        declaredAmount: row.declaredAmount,
      }) as [string, QuoteNumber][]
    ) {
      if (number.status === "UNKNOWN") {
        notices.push({
          code: `UNKNOWN_${field.toUpperCase()}`,
          message: `${field} is unknown and was not converted to zero.`,
          evidence: row.evidence,
        });
      }
    }
  }
  for (const [field, number] of Object.entries(totals) as [string, unknown][]) {
    if (isRecord(number) && number.status === "UNKNOWN") {
      notices.push({
        code: `UNKNOWN_${field.toUpperCase()}`,
        message: `${field} is unknown and was not converted to zero.`,
        evidence: totals.evidence,
      });
    }
  }
  return notices;
};
const computePacketFactsHash = (
  facts: {
    caseId: string;
    sourceDocumentVersionId: string;
    sourceDocumentSha256: string;
    dependencyBasis: QuoteDependencyBasis;
    upstreamPacketIds: PlanSnapshotPacketReference[];
    mode: QuoteHealthcheckMode;
    rows: NormalizedQuoteRow[];
    totals: QuoteTotals;
  },
): Promise<string> =>
  sha256Canonical({
    caseId: facts.caseId,
    sourceDocumentVersionId: facts.sourceDocumentVersionId,
    sourceDocumentSha256: facts.sourceDocumentSha256,
    dependencyBasis: facts.dependencyBasis,
    upstreamPacketIds: facts.upstreamPacketIds,
    mode: facts.mode,
    rows: facts.rows,
    totals: facts.totals,
  });

export const buildQuoteExtractionPacketV1 = async (
  input: unknown,
): Promise<BuildResult<QuoteExtractionPacketV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{
        path: "",
        code: "PACKET_INPUT_INVALID",
        message: "Packet input must be an object.",
      }],
    };
  }
  requireClosedKeys(input, INPUT_KEYS, "", issues);
  requireIdentity(input.packetId, "packetId", issues);
  requireIdentity(input.caseId, "caseId", issues);
  requireIdentity(input.producerVersion, "producerVersion", issues);
  requireIsoDateTime(input.createdAt, "createdAt", issues);
  requireIsoDateTime(input.recordedAt, "recordedAt", issues);
  if (!isMode(input.mode)) {
    addIssue(
      issues,
      "mode",
      "MODE_UNSUPPORTED",
      "Quote healthcheck mode is unsupported.",
    );
  }

  if (!isRecord(input.authority)) {
    addIssue(
      issues,
      "authority",
      "A0_AUTHORITY_REQUIRED",
      "A0 authority is required.",
    );
  } else {
    requireClosedKeys(
      input.authority,
      ["decisionCode", "status"],
      "authority",
      issues,
    );
    if (input.authority.decisionCode !== A0_AUTHORITY_DECISION_CODE) {
      addIssue(
        issues,
        "authority.decisionCode",
        "A0_AUTHORITY_MISMATCH",
        "Exact A0 authority is required.",
      );
    }
    if (!isReferenceStatus(input.authority.status)) {
      addIssue(
        issues,
        "authority.status",
        "AUTHORITY_STATUS_INVALID",
        "Authority reference status is invalid.",
      );
    }
  }

  let documentVersionId = "";
  let document: Record<string, unknown> | null = null;
  if (!isRecord(input.document)) {
    addIssue(
      issues,
      "document",
      "DOCUMENT_VERSION_REQUIRED",
      "A5 document version binding is required.",
    );
  } else {
    document = input.document;
    requireClosedKeys(
      document,
      [
        "wireIdentity",
        "referenceId",
        "caseId",
        "documentId",
        "documentVersionId",
        "currentDocumentVersionId",
        "sha256",
        "supersededByDocumentVersionId",
        "status",
      ],
      "document",
      issues,
    );
    if (document.wireIdentity !== DOCUMENT_VERSION_REF_SCHEMA) {
      addIssue(
        issues,
        "document.wireIdentity",
        "UNKNOWN_MAJOR",
        "Exact document-version wire identity is required.",
      );
    }
    for (
      const key of [
        "referenceId",
        "caseId",
        "documentId",
        "documentVersionId",
        "currentDocumentVersionId",
      ]
    ) {
      requireIdentity(document[key], `document.${key}`, issues);
    }
    if (hasIdentity(document.documentVersionId)) {
      documentVersionId = document.documentVersionId;
    }
    if (document.caseId !== input.caseId) {
      addIssue(
        issues,
        "document.caseId",
        "CASE_DOCUMENT_MISMATCH",
        "Document and packet case identities must match.",
      );
    }
    if (!isSha256(document.sha256)) {
      addIssue(
        issues,
        "document.sha256",
        "SOURCE_HASH_INVALID",
        "A lowercase SHA-256 is required.",
      );
    }
    if (
      document.supersededByDocumentVersionId !== null &&
      !hasIdentity(document.supersededByDocumentVersionId)
    ) {
      addIssue(
        issues,
        "document.supersededByDocumentVersionId",
        "SUPERSESSION_INVALID",
        "Supersession must be null or an identity.",
      );
    }
    if (!isReferenceStatus(document.status)) {
      addIssue(
        issues,
        "document.status",
        "DOCUMENT_REFERENCE_STATUS_INVALID",
        "Document reference status is invalid.",
      );
    }
  }

  const packetCaseId = hasIdentity(input.caseId) ? input.caseId : "";
  const dependencyBasis = parseDependencyBasis(
    input.dependencyBasis,
    packetCaseId,
    issues,
  );
  const upstreamPacketIds = parseUpstreamPacketIds(
    input.upstreamPacketIds,
    packetCaseId,
    issues,
  );
  if (
    dependencyBasis && upstreamPacketIds.length === 1 &&
    !samePlanSnapshotReference(
      dependencyBasis.planSnapshot,
      upstreamPacketIds[0],
    )
  ) {
    addIssue(
      issues,
      "upstreamPacketIds[0]",
      "DEPENDENCY_BASIS_MISMATCH",
      "The upstream A9 reference must exactly match dependencyBasis.planSnapshot.",
    );
  }
  const supersedesPacketIds = parseStringArray(
    input.supersedesPacketIds,
    "supersedesPacketIds",
    issues,
  );
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    addIssue(
      issues,
      "rows",
      "QUOTE_ROWS_REQUIRED",
      "At least one normalized quote row is required.",
    );
  }
  const rows = Array.isArray(input.rows)
    ? input.rows.map((row, index) =>
      parseRow(row, index, documentVersionId, issues)
    ).filter(
      (row): row is NormalizedQuoteRow => row !== null,
    )
    : [];
  const totals = parseTotals(input.totals, documentVersionId, issues);

  if (
    issues.length > 0 || !document || !dependencyBasis || !totals ||
    !isMode(input.mode) ||
    !hasIdentity(input.packetId) || !hasIdentity(input.caseId) ||
    !hasIdentity(input.producerVersion) || !isIsoDateTime(input.createdAt) ||
    !isIsoDateTime(input.recordedAt) || !isSha256(document.sha256) ||
    !hasIdentity(document.referenceId) || !hasIdentity(document.documentId) ||
    !hasIdentity(document.documentVersionId) ||
    !hasIdentity(document.currentDocumentVersionId)
  ) {
    return { ok: false, issues };
  }

  const evidenceReferences = dedupeEvidence([
    ...rows.flatMap((row) => row.evidence),
    ...totals.evidence,
  ]);
  const uncertainty = collectUnknownNotices(rows, totals);
  const factsHash = await computePacketFactsHash({
    caseId: input.caseId,
    sourceDocumentVersionId: document.documentVersionId,
    sourceDocumentSha256: document.sha256,
    dependencyBasis,
    upstreamPacketIds,
    mode: input.mode,
    rows,
    totals,
  });

  const packet: QuoteExtractionPacketV1 = {
    schemaName: QUOTE_EXTRACTION_PACKET_SCHEMA,
    schemaVersion: 1,
    packetId: input.packetId,
    caseId: input.caseId,
    producerRole: "A1",
    producerVersion: input.producerVersion,
    sourceDocumentReferenceId: document.referenceId,
    sourceDocumentId: document.documentId,
    sourceDocumentVersionId: document.documentVersionId,
    sourceDocumentCurrentVersionId: document.currentDocumentVersionId,
    sourceDocumentSupersededByVersionId:
      hasIdentity(document.supersededByDocumentVersionId)
        ? document.supersededByDocumentVersionId
        : null,
    sourceDocumentSha256: document.sha256,
    upstreamPacketIds,
    dependencyBasis,
    evidenceReferences,
    createdAt: input.createdAt,
    recordedAt: input.recordedAt,
    processingStatus: "candidate_ready",
    uncertainty,
    warnings: [],
    supersedesPacketIds,
    humanReviewRequired: true,
    paymentAuthorization: PAYMENT_AUTHORIZATION,
    contractorPaymentDue: CONTRACTOR_PAYMENT_DUE,
    pricedCandidateGenerated: false,
    reviewStage: "machine_candidate",
    mode: input.mode,
    authorityDecisionCode: A0_AUTHORITY_DECISION_CODE,
    rows,
    totals,
    factsHash,
  };
  const validation = await validateQuoteExtractionPacketV1(packet);
  return validation.valid
    ? { ok: true, value: packet }
    : { ok: false, issues: validation.issues };
};

export const validateQuoteExtractionPacketV1 = async (
  value: unknown,
): Promise<ValidationResult<QuoteExtractionPacketV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{
        path: "",
        code: "PACKET_INVALID",
        message: "Packet must be an object.",
      }],
    };
  }
  requireClosedKeys(value, PACKET_KEYS, "", issues);
  const outputCaseId = hasIdentity(value.caseId) ? value.caseId : "";
  const dependencyBasis = parseDependencyBasis(
    value.dependencyBasis,
    outputCaseId,
    issues,
  );
  const upstreamPacketIds = parseUpstreamPacketIds(
    value.upstreamPacketIds,
    outputCaseId,
    issues,
  );
  if (
    dependencyBasis && upstreamPacketIds.length === 1 &&
    !samePlanSnapshotReference(
      dependencyBasis.planSnapshot,
      upstreamPacketIds[0],
    )
  ) {
    addIssue(
      issues,
      "upstreamPacketIds[0]",
      "DEPENDENCY_BASIS_MISMATCH",
      "The upstream A9 reference must exactly match dependencyBasis.planSnapshot.",
    );
  }
  const constants: [string, unknown, unknown][] = [
    ["schemaName", value.schemaName, QUOTE_EXTRACTION_PACKET_SCHEMA],
    ["schemaVersion", value.schemaVersion, 1],
    ["producerRole", value.producerRole, "A1"],
    ["processingStatus", value.processingStatus, "candidate_ready"],
    ["reviewStage", value.reviewStage, "machine_candidate"],
    ["humanReviewRequired", value.humanReviewRequired, true],
    ["paymentAuthorization", value.paymentAuthorization, false],
    [
      "contractorPaymentDue",
      value.contractorPaymentDue,
      CONTRACTOR_PAYMENT_DUE,
    ],
    ["pricedCandidateGenerated", value.pricedCandidateGenerated, false],
    [
      "authorityDecisionCode",
      value.authorityDecisionCode,
      A0_AUTHORITY_DECISION_CODE,
    ],
  ];
  for (const [path, actual, expected] of constants) {
    if (actual !== expected) {
      addIssue(
        issues,
        path,
        "CONSTANT_MISMATCH",
        `Expected ${String(expected)}.`,
      );
    }
  }
  for (
    const key of [
      "packetId",
      "caseId",
      "producerVersion",
      "sourceDocumentReferenceId",
      "sourceDocumentId",
      "sourceDocumentVersionId",
      "sourceDocumentCurrentVersionId",
    ]
  ) requireIdentity(value[key], key, issues);
  requireIsoDateTime(value.createdAt, "createdAt", issues);
  requireIsoDateTime(value.recordedAt, "recordedAt", issues);
  if (!isSha256(value.sourceDocumentSha256)) {
    addIssue(
      issues,
      "sourceDocumentSha256",
      "SOURCE_HASH_INVALID",
      "A lowercase SHA-256 is required.",
    );
  }
  if (!isSha256(value.factsHash)) {
    addIssue(
      issues,
      "factsHash",
      "FACTS_HASH_INVALID",
      "A lowercase SHA-256 is required.",
    );
  }
  if (!isMode(value.mode)) {
    addIssue(
      issues,
      "mode",
      "MODE_UNSUPPORTED",
      "Quote healthcheck mode is unsupported.",
    );
  }
  const sourceVersionId = hasIdentity(value.sourceDocumentVersionId)
    ? value.sourceDocumentVersionId
    : "";
  if (
    value.sourceDocumentSupersededByVersionId !== null &&
    !hasIdentity(value.sourceDocumentSupersededByVersionId)
  ) {
    addIssue(
      issues,
      "sourceDocumentSupersededByVersionId",
      "SUPERSESSION_INVALID",
      "Supersession must be null or an identity.",
    );
  }
  if (!Array.isArray(value.rows) || value.rows.length === 0) {
    addIssue(issues, "rows", "QUOTE_ROWS_REQUIRED", "Rows are required.");
  } else {
    value.rows.forEach((row, index) => {
      const path = `rows[${index}]`;
      if (!isRecord(row)) {
        addIssue(issues, path, "ROW_INVALID", "Row must be a closed object.");
        return;
      }
      requireClosedKeys(row, ROW_KEYS, path, issues);
      requireIdentity(row.lineId, `${path}.lineId`, issues);
      if (row.itemName !== null && !hasIdentity(row.itemName)) {
        addIssue(
          issues,
          `${path}.itemName`,
          "ITEM_NAME_INVALID",
          "Item name must be null or an identity.",
        );
      }
      if (row.unit !== null && !hasIdentity(row.unit)) {
        addIssue(
          issues,
          `${path}.unit`,
          "UNIT_INVALID",
          "Unit must be null or an identity.",
        );
      }
      for (
        const field of ["quantity", "unitPrice", "multiplier", "declaredAmount"]
      ) {
        validateQuoteNumber(row[field], `${path}.${field}`, issues);
      }
      if (
        !Array.isArray(row.notes) ||
        !row.notes.every((note) => typeof note === "string")
      ) {
        addIssue(
          issues,
          `${path}.notes`,
          "NOTES_INVALID",
          "Notes must be an array of strings.",
        );
      }
      parseEvidenceArray(
        row.evidence,
        sourceVersionId,
        `${path}.evidence`,
        issues,
      );
    });
  }
  if (!isRecord(value.totals)) {
    addIssue(
      issues,
      "totals",
      "TOTALS_INVALID",
      "Totals must be a closed object.",
    );
  } else {
    requireClosedKeys(value.totals, TOTAL_KEYS, "totals", issues);
    for (
      const field of [
        "declaredSubtotal",
        "taxRate",
        "declaredTax",
        "declaredTotal",
      ]
    ) {
      validateQuoteNumber(value.totals[field], `totals.${field}`, issues);
    }
    parseEvidenceArray(
      value.totals.evidence,
      sourceVersionId,
      "totals.evidence",
      issues,
    );
  }
  parseEvidenceArray(
    value.evidenceReferences,
    sourceVersionId,
    "evidenceReferences",
    issues,
  );
  validateIdentityArray(
    value.supersedesPacketIds,
    "supersedesPacketIds",
    issues,
  );
  validateNoticeArray(
    value.uncertainty,
    sourceVersionId,
    "uncertainty",
    issues,
  );
  validateNoticeArray(value.warnings, sourceVersionId, "warnings", issues);
  if (
    issues.length === 0 && dependencyBasis && upstreamPacketIds.length === 1
  ) {
    const packet = value as unknown as QuoteExtractionPacketV1;
    const expectedFactsHash = await computePacketFactsHash({
      caseId: packet.caseId,
      sourceDocumentVersionId: packet.sourceDocumentVersionId,
      sourceDocumentSha256: packet.sourceDocumentSha256,
      dependencyBasis,
      upstreamPacketIds,
      mode: packet.mode,
      rows: packet.rows,
      totals: packet.totals,
    });
    if (packet.factsHash !== expectedFactsHash) {
      addIssue(
        issues,
        "factsHash",
        "FACTS_HASH_MISMATCH",
        "factsHash does not match the immutable extraction facts and dependency basis.",
      );
    }
  }
  return issues.length === 0
    ? {
      valid: true,
      value: value as unknown as QuoteExtractionPacketV1,
      issues,
    }
    : { valid: false, issues };
};
