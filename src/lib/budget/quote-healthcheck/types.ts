export const QUOTE_EXTRACTION_PACKET_SCHEMA =
  "laibe.quote-extraction-packet.v1" as const;
export const QUOTE_HEALTH_REPORT_SCHEMA =
  "laibe.quote-health-report.v1" as const;
export const QUOTE_HEALTH_REVIEW_PACKET_SCHEMA =
  "laibe.quote-health-review-packet.v1" as const;
export const A0_AUTHORITY_DECISION_CODE =
  "A0-PCM-INTEGRATION-20260731-V1" as const;
export const DOCUMENT_VERSION_REF_SCHEMA =
  "laibe.document-version-ref.v1" as const;
export const KNOWLEDGE_RELEASE_SCHEMA = "laibe.knowledge-release.v1" as const;
export const PLAN_PUZZLE_SNAPSHOT_SCHEMA =
  "laibe.plan-puzzle-snapshot.v1" as const;
export const SPEC_REFERENCE_TYPE = "A0_PINNED_SPEC_REFERENCE" as const;
export const PAYMENT_AUTHORIZATION = false as const;
export const CONTRACTOR_PAYMENT_DUE = "NOT_DETERMINED" as const;

export type QuoteHealthcheckMode =
  | "PRE_CONTRACT_QUOTE_HEALTHCHECK"
  | "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";

export type ConformingReferenceStatus =
  | "TEST_ONLY_CONFORMING_REFERENCE"
  | "A0_ACCEPTED";

export interface AuthorityReference {
  decisionCode: typeof A0_AUTHORITY_DECISION_CODE;
  status: ConformingReferenceStatus;
}

export interface DocumentVersionBinding {
  wireIdentity: typeof DOCUMENT_VERSION_REF_SCHEMA;
  referenceId: string;
  caseId: string;
  documentId: string;
  documentVersionId: string;
  currentDocumentVersionId: string;
  sha256: string;
  supersededByDocumentVersionId: string | null;
  status: ConformingReferenceStatus;
}

export interface UpstreamPacketReference {
  schemaName: string;
  packetId: string;
}

export interface PlanSnapshotPacketReference {
  schemaName: typeof PLAN_PUZZLE_SNAPSHOT_SCHEMA;
  schemaVersion: 1;
  packetId: string;
  packetVersion: number;
  packetSha256: string;
  caseId: string;
  status: "active";
  current: true;
}

export interface KnowledgeReleaseBasisReference {
  schemaVersion: typeof KNOWLEDGE_RELEASE_SCHEMA;
  releaseId: string;
  releaseVersion: number;
  contentSha256: string;
  lifecycleState: "active";
  current: true;
}

export interface SpecBasisReference {
  referenceType: typeof SPEC_REFERENCE_TYPE;
  caseId: string;
  referenceId: string;
  status: "pinned";
}

export interface QuoteDependencyBasis {
  planSnapshot: PlanSnapshotPacketReference;
  knowledgeRelease: KnowledgeReleaseBasisReference;
  specReference: SpecBasisReference;
}

export interface WorksheetCellEvidence {
  kind: "worksheet_cell";
  sourceDocumentVersionId: string;
  sheet: string;
  cell: string;
}

export interface WorksheetRowEvidence {
  kind: "worksheet_row";
  sourceDocumentVersionId: string;
  sheet: string;
  row: number;
}

export interface WorksheetRangeEvidence {
  kind: "worksheet_range";
  sourceDocumentVersionId: string;
  sheet: string;
  range: string;
}

export interface TextRegionEvidence {
  kind: "text_region";
  sourceDocumentVersionId: string;
  page: number;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type EvidencePointer =
  | WorksheetCellEvidence
  | WorksheetRowEvidence
  | WorksheetRangeEvidence
  | TextRegionEvidence;

export type UnknownNumberReason = "EMPTY" | "NON_FINITE" | "INVALID";

export type QuoteNumber =
  | { status: "KNOWN"; value: string }
  | { status: "UNKNOWN"; value: null; reason: UnknownNumberReason };

export interface NormalizedQuoteRowInput {
  lineId: string;
  itemName: unknown;
  unit: unknown;
  quantity: unknown;
  unitPrice: unknown;
  multiplier: unknown;
  declaredAmount: unknown;
  notes: unknown;
  evidence: unknown;
}

export interface NormalizedQuoteRow {
  lineId: string;
  itemName: string | null;
  unit: string | null;
  quantity: QuoteNumber;
  unitPrice: QuoteNumber;
  multiplier: QuoteNumber;
  declaredAmount: QuoteNumber;
  notes: string[];
  evidence: EvidencePointer[];
}

export interface QuoteTotalsInput {
  declaredSubtotal: unknown;
  taxRate: unknown;
  declaredTax: unknown;
  declaredTotal: unknown;
  evidence: unknown;
}

export interface QuoteTotals {
  declaredSubtotal: QuoteNumber;
  taxRate: QuoteNumber;
  declaredTax: QuoteNumber;
  declaredTotal: QuoteNumber;
  evidence: EvidencePointer[];
}

export interface QuotePacketBuildInput {
  packetId: string;
  caseId: string;
  producerVersion: string;
  createdAt: string;
  recordedAt: string;
  mode: QuoteHealthcheckMode;
  authority: AuthorityReference;
  document: DocumentVersionBinding;
  dependencyBasis: QuoteDependencyBasis;
  upstreamPacketIds: PlanSnapshotPacketReference[];
  supersedesPacketIds: string[];
  rows: NormalizedQuoteRowInput[];
  totals: QuoteTotalsInput;
}

export interface StructuredNotice {
  code: string;
  message: string;
  evidence: EvidencePointer[];
}

export interface QuoteExtractionPacketV1 {
  schemaName: typeof QUOTE_EXTRACTION_PACKET_SCHEMA;
  schemaVersion: 1;
  packetId: string;
  caseId: string;
  producerRole: "A1";
  producerVersion: string;
  sourceDocumentReferenceId: string;
  sourceDocumentId: string;
  sourceDocumentVersionId: string;
  sourceDocumentCurrentVersionId: string;
  sourceDocumentSupersededByVersionId: string | null;
  sourceDocumentSha256: string;
  dependencyBasis: QuoteDependencyBasis;
  upstreamPacketIds: PlanSnapshotPacketReference[];
  evidenceReferences: EvidencePointer[];
  createdAt: string;
  recordedAt: string;
  processingStatus: "candidate_ready";
  uncertainty: StructuredNotice[];
  warnings: StructuredNotice[];
  supersedesPacketIds: string[];
  humanReviewRequired: true;
  paymentAuthorization: false;
  contractorPaymentDue: typeof CONTRACTOR_PAYMENT_DUE;
  pricedCandidateGenerated: false;
  reviewStage: "machine_candidate";
  mode: QuoteHealthcheckMode;
  authorityDecisionCode: typeof A0_AUTHORITY_DECISION_CODE;
  rows: NormalizedQuoteRow[];
  totals: QuoteTotals;
  factsHash: string;
}

export type QuoteFindingCode =
  | "MISSING_ITEM_NAME"
  | "MISSING_UNIT"
  | "UNKNOWN_QUANTITY"
  | "UNKNOWN_UNIT_PRICE"
  | "UNKNOWN_MULTIPLIER"
  | "UNKNOWN_AMOUNT"
  | "LINE_AMOUNT_MISMATCH"
  | "SUBTOTAL_MISMATCH"
  | "TAX_MISMATCH"
  | "TOTAL_MISMATCH"
  | "POSSIBLE_DUPLICATE"
  | "UNIT_CONFLICT"
  | "AMBIGUOUS_LUMP_SUM"
  | "SITE_DEPENDENT_SCOPE"
  | "PROVISIONAL_AMOUNT"
  | "SEPARATE_ESTIMATE"
  | "EXCLUDED_SCOPE"
  | "OWNER_SUPPLIED"
  | "OPTIONAL_ITEM"
  | "DOCUMENT_VERSION_SUPERSEDED";

export interface QuoteHealthFinding {
  findingId: string;
  code: QuoteFindingCode;
  category:
    | "ARITHMETIC"
    | "COMPLETENESS"
    | "DUPLICATE"
    | "UNIT"
    | "SCOPE"
    | "VERSION";
  severity: "INFO" | "WARNING" | "REVIEW_REQUIRED";
  message: string;
  evidence: EvidencePointer[];
}

export type SectionStatus = "EVALUATED" | "NOT_EVALUATED";
export type SectionReasonCode =
  | "MODE_NOT_REQUIRED"
  | "DEPENDENCY_MISSING"
  | "RAW_A11_A12_NOT_ACCEPTED"
  | "COMPARISON_ENGINE_NOT_IMPLEMENTED";

export interface EvaluationSection {
  status: SectionStatus;
  reasonCodes: SectionReasonCode[];
}

export interface QuoteHealthSections {
  internalDocumentChecks: EvaluationSection;
  scopeComparison: EvaluationSection;
  planComparison: EvaluationSection;
  priceEvidenceComparison: EvaluationSection;
}

export interface A0CaseDependency {
  caseId: string;
  status: ConformingReferenceStatus;
}

export type SpecDependency = SpecBasisReference;
export type PlanSnapshotDependency = PlanSnapshotPacketReference;
export type KnowledgeReleaseDependency = KnowledgeReleaseBasisReference;

export interface QuoteReviewDependencies {
  a0Case?: A0CaseDependency;
  spec?: SpecDependency;
  planSnapshot?: PlanSnapshotDependency;
  knowledgeRelease?: KnowledgeReleaseDependency;
  rawA11Present?: boolean;
  rawA12Present?: boolean;
}

export interface QuoteHealthReportBuildInput {
  packetId: string;
  producerVersion: string;
  createdAt: string;
  recordedAt: string;
  extractionPacket: QuoteExtractionPacketV1;
  mode: QuoteHealthcheckMode;
  dependencies: QuoteReviewDependencies;
  supersedesPacketIds?: string[];
}

export interface QuoteHealthExtractionPacketBasis {
  schemaName: typeof QUOTE_EXTRACTION_PACKET_SCHEMA;
  schemaVersion: 1;
  packetId: string;
  factsHash: string;
  reviewStage: "machine_candidate";
  caseId: string;
  sourceDocumentReferenceId: string;
  sourceDocumentId: string;
  sourceDocumentVersionId: string;
  sourceDocumentCurrentVersionId: string;
  sourceDocumentSupersededByVersionId: string | null;
  sourceDocumentSha256: string;
  dependencyBasis: QuoteDependencyBasis;
}

export interface QuoteHealthReportV1 {
  schemaName: typeof QUOTE_HEALTH_REPORT_SCHEMA;
  schemaVersion: 1;
  packetId: string;
  caseId: string;
  authorityDecisionCode: typeof A0_AUTHORITY_DECISION_CODE;
  producerRole: "A1";
  producerVersion: string;
  sourceDocumentReferenceId: string;
  sourceDocumentId: string;
  sourceDocumentVersionId: string;
  sourceDocumentSha256: string;
  extractionPacketBasis: QuoteHealthExtractionPacketBasis;
  upstreamPacketIds: UpstreamPacketReference[];
  evidenceReferences: EvidencePointer[];
  createdAt: string;
  recordedAt: string;
  processingStatus: "candidate_ready";
  uncertainty: StructuredNotice[];
  warnings: StructuredNotice[];
  supersedesPacketIds: string[];
  humanReviewRequired: true;
  paymentAuthorization: false;
  contractorPaymentDue: typeof CONTRACTOR_PAYMENT_DUE;
  pricedCandidateGenerated: false;
  reviewStage: "machine_candidate";
  reviewDisposition: "HUMAN_PCM_REVIEW_PENDING";
  mode: QuoteHealthcheckMode;
  lifecycleStatus: "CURRENT" | "STALE";
  overallStatus: "COMPLETE" | "PARTIAL" | "STALE";
  findings: QuoteHealthFinding[];
  sections: QuoteHealthSections;
  priceReasonablenessDecision: "NOT_DETERMINED";
  factsHash: string;
}

export interface DecisionRecordReference {
  decisionRecordId: string;
  decisionRecordVersion: number;
  decisionRecordSha256: string;
}

export interface QuoteHealthReportReference {
  schemaName: typeof QUOTE_HEALTH_REPORT_SCHEMA;
  schemaVersion: 1;
  packetId: string;
  factsHash: string;
  caseId: string;
  sourceDocumentReferenceId: string;
  sourceDocumentId: string;
  sourceDocumentVersionId: string;
  sourceDocumentSha256: string;
  lifecycleStatus: QuoteHealthReportV1["lifecycleStatus"];
  overallStatus: QuoteHealthReportV1["overallStatus"];
  reviewStage: "machine_candidate";
  reviewDisposition: "HUMAN_PCM_REVIEW_PENDING";
}

export interface QuoteHealthReviewPacketBuildInput {
  packetId: string;
  createdAt: string;
  recordedAt: string;
  quoteHealthReport: QuoteHealthReportV1;
  decisionRecordReferences: DecisionRecordReference[];
}

export interface QuoteHealthReviewPacketV1 {
  schemaName: typeof QUOTE_HEALTH_REVIEW_PACKET_SCHEMA;
  schemaVersion: 1;
  packetId: string;
  caseId: string;
  quoteHealthReportPacketId: string;
  quoteHealthReportReference: QuoteHealthReportReference;
  sourceDocumentReferenceId: string;
  sourceDocumentId: string;
  sourceDocumentVersionId: string;
  sourceDocumentSha256: string;
  reviewStatus: "HUMAN_PCM_REVIEW_PENDING";
  nextOwner: "HUMAN_PCM";
  nextAction: "REVIEW_QUOTE_HEALTH_REPORT";
  decisionRecordReferences: DecisionRecordReference[];
  createdAt: string;
  recordedAt: string;
  factsHash: string;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export type BuildResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export type ValidationResult<T> =
  | { valid: true; value: T; issues: ValidationIssue[] }
  | { valid: false; issues: ValidationIssue[] };
