import { evaluateQuoteFindings } from "./findings.ts";
import {
  evaluateQuoteHealthSections,
  parseQuoteReviewDependencies,
} from "./policy.ts";
import { validateQuoteExtractionPacketV1 } from "./packet.ts";
import type {
  BuildResult,
  QuoteExtractionPacketV1,
  QuoteHealthcheckMode,
  QuoteHealthExtractionPacketBasis,
  QuoteHealthReportV1,
  StructuredNotice,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";
import {
  A0_AUTHORITY_DECISION_CODE,
  CONTRACTOR_PAYMENT_DUE,
  PAYMENT_AUTHORIZATION,
  QUOTE_EXTRACTION_PACKET_SCHEMA,
  QUOTE_HEALTH_REPORT_SCHEMA,
} from "./types.ts";
import {
  addIssue,
  hasIdentity,
  isIsoDateTime,
  isRecord,
  isSha256,
  parseEvidenceArray,
  requireClosedKeys,
  requireIdentity,
  requireIsoDateTime,
  sha256Canonical,
  validateIdentityArray,
  validateNoticeArray,
  validateUpstreamPacketArray,
} from "./validation.ts";

const INPUT_KEYS = [
  "packetId",
  "producerVersion",
  "createdAt",
  "recordedAt",
  "extractionPacket",
  "mode",
  "dependencies",
  "supersedesPacketIds",
] as const;

const REPORT_KEYS = [
  "schemaName",
  "schemaVersion",
  "packetId",
  "caseId",
  "authorityDecisionCode",
  "producerRole",
  "producerVersion",
  "sourceDocumentReferenceId",
  "sourceDocumentId",
  "sourceDocumentVersionId",
  "sourceDocumentSha256",
  "extractionPacketBasis",
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
  "reviewDisposition",
  "mode",
  "lifecycleStatus",
  "overallStatus",
  "findings",
  "sections",
  "priceReasonablenessDecision",
  "factsHash",
] as const;

const EXTRACTION_BASIS_KEYS = [
  "schemaName",
  "schemaVersion",
  "packetId",
  "factsHash",
  "reviewStage",
  "caseId",
  "sourceDocumentReferenceId",
  "sourceDocumentId",
  "sourceDocumentVersionId",
  "sourceDocumentCurrentVersionId",
  "sourceDocumentSupersededByVersionId",
  "sourceDocumentSha256",
  "dependencyBasis",
] as const;
const DEPENDENCY_BASIS_KEYS = [
  "planSnapshot",
  "knowledgeRelease",
  "specReference",
] as const;

const FINDING_CODES = new Set([
  "MISSING_ITEM_NAME",
  "MISSING_UNIT",
  "UNKNOWN_QUANTITY",
  "UNKNOWN_UNIT_PRICE",
  "UNKNOWN_MULTIPLIER",
  "UNKNOWN_AMOUNT",
  "LINE_AMOUNT_MISMATCH",
  "SUBTOTAL_MISMATCH",
  "TAX_MISMATCH",
  "TOTAL_MISMATCH",
  "POSSIBLE_DUPLICATE",
  "UNIT_CONFLICT",
  "AMBIGUOUS_LUMP_SUM",
  "SITE_DEPENDENT_SCOPE",
  "PROVISIONAL_AMOUNT",
  "SEPARATE_ESTIMATE",
  "EXCLUDED_SCOPE",
  "OWNER_SUPPLIED",
  "OPTIONAL_ITEM",
  "DOCUMENT_VERSION_SUPERSEDED",
]);
const FINDING_CATEGORIES = new Set([
  "ARITHMETIC",
  "COMPLETENESS",
  "DUPLICATE",
  "UNIT",
  "SCOPE",
  "VERSION",
]);
const FINDING_SEVERITIES = new Set(["INFO", "WARNING", "REVIEW_REQUIRED"]);
const SECTION_NAMES = [
  "internalDocumentChecks",
  "scopeComparison",
  "planComparison",
  "priceEvidenceComparison",
] as const;
const SECTION_REASONS = new Set([
  "MODE_NOT_REQUIRED",
  "DEPENDENCY_MISSING",
  "RAW_A11_A12_NOT_ACCEPTED",
  "COMPARISON_ENGINE_NOT_IMPLEMENTED",
]);

const isMode = (value: unknown): value is QuoteHealthcheckMode =>
  value === "PRE_CONTRACT_QUOTE_HEALTHCHECK" ||
  value === "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";

const parseStringArray = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] => {
  if (value === undefined) return [];
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

const buildExtractionPacketBasis = (
  packet: QuoteExtractionPacketV1,
): QuoteHealthExtractionPacketBasis => ({
  schemaName: QUOTE_EXTRACTION_PACKET_SCHEMA,
  schemaVersion: 1,
  packetId: packet.packetId,
  factsHash: packet.factsHash,
  reviewStage: "machine_candidate",
  caseId: packet.caseId,
  sourceDocumentReferenceId: packet.sourceDocumentReferenceId,
  sourceDocumentId: packet.sourceDocumentId,
  sourceDocumentVersionId: packet.sourceDocumentVersionId,
  sourceDocumentCurrentVersionId: packet.sourceDocumentCurrentVersionId,
  sourceDocumentSupersededByVersionId:
    packet.sourceDocumentSupersededByVersionId,
  sourceDocumentSha256: packet.sourceDocumentSha256,
  dependencyBasis: {
    planSnapshot: { ...packet.dependencyBasis.planSnapshot },
    knowledgeRelease: { ...packet.dependencyBasis.knowledgeRelease },
    specReference: { ...packet.dependencyBasis.specReference },
  },
});

const dependencyIssuePath = (path: string, issuePath: string): string => {
  if (issuePath === "dependencies") return `${path}.dependencyBasis`;
  return issuePath
    .replace(
      "dependencies.planSnapshot",
      `${path}.dependencyBasis.planSnapshot`,
    )
    .replace(
      "dependencies.knowledgeRelease",
      `${path}.dependencyBasis.knowledgeRelease`,
    )
    .replace(
      "dependencies.spec",
      `${path}.dependencyBasis.specReference`,
    );
};

const parseExtractionPacketBasis = (
  value: unknown,
  caseId: string,
  path: string,
  issues: ValidationIssue[],
): QuoteHealthExtractionPacketBasis | null => {
  const start = issues.length;
  if (!isRecord(value)) {
    addIssue(
      issues,
      path,
      "EXTRACTION_BASIS_REQUIRED",
      "A closed extraction packet basis is required.",
    );
    return null;
  }
  requireClosedKeys(value, EXTRACTION_BASIS_KEYS, path, issues);
  if (value.schemaName !== QUOTE_EXTRACTION_PACKET_SCHEMA) {
    addIssue(
      issues,
      `${path}.schemaName`,
      "UNKNOWN_MAJOR",
      "Only laibe.quote-extraction-packet.v1 is accepted.",
    );
  }
  if (value.schemaVersion !== 1) {
    addIssue(
      issues,
      `${path}.schemaVersion`,
      "UNKNOWN_MAJOR",
      "Extraction packet schemaVersion must be 1.",
    );
  }
  if (value.reviewStage !== "machine_candidate") {
    addIssue(
      issues,
      `${path}.reviewStage`,
      "EXTRACTION_STAGE_NOT_MACHINE_CANDIDATE",
      "Only an A1 machine-candidate extraction packet may be referenced.",
    );
  }
  for (
    const key of [
      "packetId",
      "caseId",
      "sourceDocumentReferenceId",
      "sourceDocumentId",
      "sourceDocumentVersionId",
      "sourceDocumentCurrentVersionId",
    ]
  ) requireIdentity(value[key], `${path}.${key}`, issues);
  const basisCaseId = hasIdentity(value.caseId) ? value.caseId : "";
  if (basisCaseId && basisCaseId !== caseId) {
    addIssue(
      issues,
      `${path}.caseId`,
      "EXTRACTION_BASIS_MISMATCH",
      "Report case identity must match the extraction packet basis.",
    );
  }
  for (const key of ["factsHash", "sourceDocumentSha256"]) {
    if (!isSha256(value[key])) {
      addIssue(
        issues,
        `${path}.${key}`,
        "SHA256_REQUIRED",
        "A lowercase SHA-256 is required.",
      );
    }
  }
  if (
    value.sourceDocumentSupersededByVersionId !== null &&
    !hasIdentity(value.sourceDocumentSupersededByVersionId)
  ) {
    addIssue(
      issues,
      `${path}.sourceDocumentSupersededByVersionId`,
      "SUPERSESSION_ID_INVALID",
      "Superseding document version must be an identity or null.",
    );
  }

  if (!isRecord(value.dependencyBasis)) {
    addIssue(
      issues,
      `${path}.dependencyBasis`,
      "DEPENDENCY_BASIS_REQUIRED",
      "The extraction dependency basis is required.",
    );
  } else {
    requireClosedKeys(
      value.dependencyBasis,
      DEPENDENCY_BASIS_KEYS,
      `${path}.dependencyBasis`,
      issues,
    );
    for (const key of DEPENDENCY_BASIS_KEYS) {
      if (value.dependencyBasis[key] === undefined) {
        addIssue(
          issues,
          `${path}.dependencyBasis.${key}`,
          "DEPENDENCY_REQUIRED",
          "Every admitted extraction dependency must be pinned.",
        );
      }
    }
    const dependencyIssues: ValidationIssue[] = [];
    const parsed = parseQuoteReviewDependencies(
      {
        spec: value.dependencyBasis.specReference,
        planSnapshot: value.dependencyBasis.planSnapshot,
        knowledgeRelease: value.dependencyBasis.knowledgeRelease,
      },
      basisCaseId,
      dependencyIssues,
    );
    for (const issue of dependencyIssues) {
      addIssue(
        issues,
        dependencyIssuePath(path, issue.path),
        issue.code,
        issue.message,
      );
    }
    if (
      !parsed.spec || !parsed.planSnapshot || !parsed.knowledgeRelease
    ) {
      addIssue(
        issues,
        `${path}.dependencyBasis`,
        "DEPENDENCY_BASIS_INVALID",
        "The exact approved dependency basis is required.",
      );
    }
  }

  return issues.length === start
    ? value as unknown as QuoteHealthExtractionPacketBasis
    : null;
};

const computeReportFactsHash = (
  report: unknown,
): Promise<string> => sha256Canonical(report);

const sectionNotices = (
  sections: QuoteHealthReportV1["sections"],
  packet: QuoteExtractionPacketV1,
): StructuredNotice[] =>
  Object.entries(sections)
    .filter(([name, section]) =>
      name !== "internalDocumentChecks" && section.status === "NOT_EVALUATED"
    )
    .map(([name, section]) => ({
      code: `${name.toLocaleUpperCase()}_NOT_EVALUATED`,
      message: `Comparison section was not evaluated: ${
        section.reasonCodes.join(",")
      }.`,
      evidence: packet.evidenceReferences,
    }));

export const buildPreliminaryQuoteHealthReportV1 = async (
  input: unknown,
): Promise<BuildResult<QuoteHealthReportV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{
        path: "",
        code: "REPORT_INPUT_INVALID",
        message: "Report input must be a closed object.",
      }],
    };
  }
  requireClosedKeys(input, INPUT_KEYS, "", issues);
  for (const key of ["packetId", "producerVersion"]) {
    requireIdentity(input[key], key, issues);
  }
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

  const packetValidation = await validateQuoteExtractionPacketV1(
    input.extractionPacket,
  );
  if (!packetValidation.valid) {
    for (const issue of packetValidation.issues) {
      addIssue(
        issues,
        `extractionPacket${issue.path ? `.${issue.path}` : ""}`,
        issue.code,
        issue.message,
      );
    }
  }
  const packet = packetValidation.valid ? packetValidation.value : null;
  if (packet && input.mode !== packet.mode) {
    addIssue(
      issues,
      "mode",
      "MODE_PACKET_MISMATCH",
      "Report mode must match extraction packet mode.",
    );
  }

  const dependencies = parseQuoteReviewDependencies(
    input.dependencies,
    packet?.caseId ?? "",
    issues,
  );
  if (packet) {
    const expectedDependencies = {
      spec: packet.dependencyBasis.specReference,
      planSnapshot: packet.dependencyBasis.planSnapshot,
      knowledgeRelease: packet.dependencyBasis.knowledgeRelease,
    };
    for (
      const dependencyName of [
        "spec",
        "planSnapshot",
        "knowledgeRelease",
      ] as const
    ) {
      const actual = dependencies[dependencyName];
      if (actual === undefined) continue;
      const [actualHash, expectedHash] = await Promise.all([
        sha256Canonical(actual),
        sha256Canonical(expectedDependencies[dependencyName]),
      ]);
      if (actualHash !== expectedHash) {
        addIssue(
          issues,
          "dependencies." + dependencyName,
          "DEPENDENCY_BASIS_MISMATCH",
          "Report dependency must exactly match the extraction packet basis.",
        );
      }
    }
  }
  const supersedesPacketIds = parseStringArray(
    input.supersedesPacketIds,
    "supersedesPacketIds",
    issues,
  );
  if (
    issues.length > 0 || !packet || !isMode(input.mode) ||
    !hasIdentity(input.packetId) ||
    !hasIdentity(input.producerVersion) || !isIsoDateTime(input.createdAt) ||
    !isIsoDateTime(input.recordedAt)
  ) {
    return { ok: false, issues };
  }

  const sections = evaluateQuoteHealthSections(input.mode, dependencies);
  const findings = evaluateQuoteFindings(packet);
  const lifecycleStatus =
    packet.sourceDocumentVersionId !== packet.sourceDocumentCurrentVersionId ||
      packet.sourceDocumentSupersededByVersionId !== null
      ? "STALE" as const
      : "CURRENT" as const;
  const overallStatus = lifecycleStatus === "STALE"
    ? "STALE" as const
    : input.mode === "PRE_CONTRACT_QUOTE_HEALTHCHECK"
    ? "COMPLETE" as const
    : "PARTIAL" as const;
  const uncertainty = [
    ...packet.uncertainty,
    ...sectionNotices(sections, packet),
  ];
  const extractionPacketBasis = buildExtractionPacketBasis(packet);
  const reportWithoutFactsHash: Omit<QuoteHealthReportV1, "factsHash"> = {
    schemaName: QUOTE_HEALTH_REPORT_SCHEMA,
    schemaVersion: 1,
    packetId: input.packetId,
    caseId: packet.caseId,
    authorityDecisionCode: A0_AUTHORITY_DECISION_CODE,
    producerRole: "A1",
    producerVersion: input.producerVersion,
    sourceDocumentReferenceId: packet.sourceDocumentReferenceId,
    sourceDocumentId: packet.sourceDocumentId,
    sourceDocumentVersionId: packet.sourceDocumentVersionId,
    sourceDocumentSha256: packet.sourceDocumentSha256,
    extractionPacketBasis,
    upstreamPacketIds: [{
      schemaName: QUOTE_EXTRACTION_PACKET_SCHEMA,
      packetId: packet.packetId,
    }],
    evidenceReferences: packet.evidenceReferences,
    createdAt: input.createdAt,
    recordedAt: input.recordedAt,
    processingStatus: "candidate_ready",
    uncertainty,
    warnings: packet.warnings,
    supersedesPacketIds,
    humanReviewRequired: true,
    paymentAuthorization: PAYMENT_AUTHORIZATION,
    contractorPaymentDue: CONTRACTOR_PAYMENT_DUE,
    pricedCandidateGenerated: false,
    reviewStage: "machine_candidate",
    reviewDisposition: "HUMAN_PCM_REVIEW_PENDING",
    mode: input.mode,
    lifecycleStatus,
    overallStatus,
    findings,
    sections,
    priceReasonablenessDecision: "NOT_DETERMINED",
  };
  const report: QuoteHealthReportV1 = {
    ...reportWithoutFactsHash,
    factsHash: await computeReportFactsHash(reportWithoutFactsHash),
  };
  const validation = await validateQuoteHealthReportV1(report);
  return validation.valid
    ? { ok: true, value: report }
    : { ok: false, issues: validation.issues };
};

export const validateQuoteHealthReportV1 = async (
  value: unknown,
): Promise<ValidationResult<QuoteHealthReportV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{
        path: "",
        code: "REPORT_INVALID",
        message: "Report must be an object.",
      }],
    };
  }
  requireClosedKeys(value, REPORT_KEYS, "", issues);
  const constants: [string, unknown, unknown][] = [
    ["schemaName", value.schemaName, QUOTE_HEALTH_REPORT_SCHEMA],
    ["schemaVersion", value.schemaVersion, 1],
    [
      "authorityDecisionCode",
      value.authorityDecisionCode,
      A0_AUTHORITY_DECISION_CODE,
    ],
    ["producerRole", value.producerRole, "A1"],
    ["processingStatus", value.processingStatus, "candidate_ready"],
    ["reviewStage", value.reviewStage, "machine_candidate"],
    ["reviewDisposition", value.reviewDisposition, "HUMAN_PCM_REVIEW_PENDING"],
    ["humanReviewRequired", value.humanReviewRequired, true],
    ["paymentAuthorization", value.paymentAuthorization, false],
    [
      "contractorPaymentDue",
      value.contractorPaymentDue,
      CONTRACTOR_PAYMENT_DUE,
    ],
    ["pricedCandidateGenerated", value.pricedCandidateGenerated, false],
    [
      "priceReasonablenessDecision",
      value.priceReasonablenessDecision,
      "NOT_DETERMINED",
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
  const extractionPacketBasis = parseExtractionPacketBasis(
    value.extractionPacketBasis,
    hasIdentity(value.caseId) ? value.caseId : "",
    "extractionPacketBasis",
    issues,
  );
  if (extractionPacketBasis) {
    for (
      const key of [
        "sourceDocumentReferenceId",
        "sourceDocumentId",
        "sourceDocumentVersionId",
        "sourceDocumentSha256",
      ] as const
    ) {
      if (value[key] !== extractionPacketBasis[key]) {
        addIssue(
          issues,
          key,
          "EXTRACTION_BASIS_MISMATCH",
          "Report source identity must match the extraction packet basis.",
        );
      }
    }
    if (
      !Array.isArray(value.upstreamPacketIds) ||
      value.upstreamPacketIds.length !== 1 ||
      !isRecord(value.upstreamPacketIds[0]) ||
      value.upstreamPacketIds[0].schemaName !==
        extractionPacketBasis.schemaName ||
      value.upstreamPacketIds[0].packetId !== extractionPacketBasis.packetId
    ) {
      addIssue(
        issues,
        "upstreamPacketIds",
        "EXTRACTION_BASIS_MISMATCH",
        "The report upstream identity must match its extraction packet basis.",
      );
    }
  }
  if (!Array.isArray(value.findings)) {
    addIssue(
      issues,
      "findings",
      "FINDINGS_REQUIRED",
      "Findings must be an array.",
    );
  } else {
    value.findings.forEach((item, index) => {
      if (!isRecord(item)) {
        addIssue(
          issues,
          `findings[${index}]`,
          "FINDING_INVALID",
          "Finding must be an object.",
        );
        return;
      }
      requireClosedKeys(
        item,
        ["findingId", "code", "category", "severity", "message", "evidence"],
        `findings[${index}]`,
        issues,
      );
      requireIdentity(item.findingId, `findings[${index}].findingId`, issues);
      requireIdentity(item.code, `findings[${index}].code`, issues);
      if (!FINDING_CODES.has(String(item.code))) {
        addIssue(
          issues,
          `findings[${index}].code`,
          "FINDING_CODE_INVALID",
          "Finding code is invalid.",
        );
      }
      if (!FINDING_CATEGORIES.has(String(item.category))) {
        addIssue(
          issues,
          `findings[${index}].category`,
          "FINDING_CATEGORY_INVALID",
          "Finding category is invalid.",
        );
      }
      if (!FINDING_SEVERITIES.has(String(item.severity))) {
        addIssue(
          issues,
          `findings[${index}].severity`,
          "FINDING_SEVERITY_INVALID",
          "Finding severity is invalid.",
        );
      }
      requireIdentity(item.message, `findings[${index}].message`, issues);
      parseEvidenceArray(
        item.evidence,
        hasIdentity(value.sourceDocumentVersionId)
          ? value.sourceDocumentVersionId
          : "",
        `findings[${index}].evidence`,
        issues,
      );
    });
  }
  const sourceVersionId = hasIdentity(value.sourceDocumentVersionId)
    ? value.sourceDocumentVersionId
    : "";
  parseEvidenceArray(
    value.evidenceReferences,
    sourceVersionId,
    "evidenceReferences",
    issues,
  );
  validateUpstreamPacketArray(
    value.upstreamPacketIds,
    "upstreamPacketIds",
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
  if (!isRecord(value.sections)) {
    addIssue(
      issues,
      "sections",
      "SECTIONS_REQUIRED",
      "Evaluation sections are required.",
    );
  } else {
    requireClosedKeys(value.sections, SECTION_NAMES, "sections", issues);
    for (const sectionName of SECTION_NAMES) {
      const section = value.sections[sectionName];
      const path = `sections.${sectionName}`;
      if (!isRecord(section)) {
        addIssue(
          issues,
          path,
          "SECTION_INVALID",
          "Evaluation section must be a closed object.",
        );
        continue;
      }
      requireClosedKeys(section, ["status", "reasonCodes"], path, issues);
      if (
        section.status !== "EVALUATED" && section.status !== "NOT_EVALUATED"
      ) {
        addIssue(
          issues,
          `${path}.status`,
          "SECTION_STATUS_INVALID",
          "Section status is invalid.",
        );
      }
      if (
        !Array.isArray(section.reasonCodes) ||
        !section.reasonCodes.every((reason) =>
          SECTION_REASONS.has(String(reason))
        )
      ) {
        addIssue(
          issues,
          `${path}.reasonCodes`,
          "SECTION_REASON_INVALID",
          "Section reason code is invalid.",
        );
      }
      if (
        section.status === "EVALUATED" && Array.isArray(section.reasonCodes) &&
        section.reasonCodes.length > 0
      ) {
        addIssue(
          issues,
          `${path}.reasonCodes`,
          "EVALUATED_SECTION_HAS_REASON",
          "Evaluated section must not have not-evaluated reasons.",
        );
      }
      if (
        section.status === "NOT_EVALUATED" &&
        Array.isArray(section.reasonCodes) && section.reasonCodes.length === 0
      ) {
        addIssue(
          issues,
          `${path}.reasonCodes`,
          "NOT_EVALUATED_REASON_REQUIRED",
          "Not-evaluated section requires a reason.",
        );
      }
    }
  }
  if (
    value.lifecycleStatus !== "CURRENT" && value.lifecycleStatus !== "STALE"
  ) {
    addIssue(
      issues,
      "lifecycleStatus",
      "LIFECYCLE_STATUS_INVALID",
      "Lifecycle status is invalid.",
    );
  }
  if (
    value.overallStatus !== "COMPLETE" && value.overallStatus !== "PARTIAL" &&
    value.overallStatus !== "STALE"
  ) {
    addIssue(
      issues,
      "overallStatus",
      "OVERALL_STATUS_INVALID",
      "Overall status is invalid.",
    );
  }
  if (extractionPacketBasis) {
    const expectedLifecycleStatus =
      extractionPacketBasis.sourceDocumentVersionId !==
          extractionPacketBasis.sourceDocumentCurrentVersionId ||
        extractionPacketBasis.sourceDocumentSupersededByVersionId !== null
        ? "STALE"
        : "CURRENT";
    if (value.lifecycleStatus !== expectedLifecycleStatus) {
      addIssue(
        issues,
        "lifecycleStatus",
        "STALE_STATUS_MISMATCH",
        "Report lifecycle must reflect the pinned document supersession state.",
      );
    }
    if (isMode(value.mode)) {
      const expectedOverallStatus = expectedLifecycleStatus === "STALE"
        ? "STALE"
        : value.mode === "PRE_CONTRACT_QUOTE_HEALTHCHECK"
        ? "COMPLETE"
        : "PARTIAL";
      if (value.overallStatus !== expectedOverallStatus) {
        addIssue(
          issues,
          "overallStatus",
          "OVERALL_STATUS_MISMATCH",
          "Overall status must match mode and document lifecycle.",
        );
      }
    }
  }
  if (isSha256(value.factsHash)) {
    const { factsHash: _factsHash, ...reportFacts } = value;
    const expectedFactsHash = await computeReportFactsHash(reportFacts);
    if (value.factsHash !== expectedFactsHash) {
      addIssue(
        issues,
        "factsHash",
        "FACTS_HASH_MISMATCH",
        "Report factsHash does not match the immutable report preimage.",
      );
    }
  }
  return issues.length === 0
    ? { valid: true, value: value as unknown as QuoteHealthReportV1, issues }
    : { valid: false, issues };
};
