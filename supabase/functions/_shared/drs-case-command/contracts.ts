export const TRANSITION_CATALOG_SCHEMA_VERSION =
  "laibe.drs.a4-transition-catalog.pre-ready.v1" as const;
export const TRANSITION_CATALOG_SHA256 =
  "804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e" as const;
export const TRANSITION_CATALOG_ROW_COUNT = 22 as const;
export const TRANSITION_CATALOG_CANONICAL_BYTES = 6157 as const;

export const TRANSITION_CATALOG_COLUMNS =
  "ordinal|step|fromState|commandType|eventType|allowedRoles|toState|nextActorRule|requiredEvidenceRefs|effects0DenialSets|boundary" as const;

export const TRANSITION_CATALOG_ROWS = Object.freeze(
  [
    "01|1|CASE_PREPARATION|RECORD_QUOTE_HEALTHCHECK_OUTCOME|QUOTE_HEALTHCHECK_OUTCOME_RECORDED|drs|QUOTE_HEALTHCHECK_RECORDED|DRS_IF_DRAWING_INPUT_READY_ELSE_OWNER|analysisRunRef,citationSetRef,quoteDocumentVersionRef,quoteSha256,reviewDecisionRef|D0,D1|PROVISIONAL_TASK5_6",
    "02|2|QUOTE_HEALTHCHECK_RECORDED|RECORD_DRAWING_HEALTHCHECK_OUTCOME|DRAWING_HEALTHCHECK_OUTCOME_RECORDED|drs|DRAWING_HEALTHCHECK_RECORDED|DRS_IF_CONTRACT_INPUT_READY_ELSE_OWNER|analysisRunRef,citationSetRef,drawingDocumentVersionRef,drawingSha256,reviewDecisionRef|D0,D1|PROVISIONAL_TASK5_6",
    "03|3|DRAWING_HEALTHCHECK_RECORDED|RECORD_CONTRACT_HEALTHCHECK_OUTCOME|CONTRACT_HEALTHCHECK_OUTCOME_RECORDED|drs|CONTRACT_HEALTHCHECK_RECORDED|owner|analysisRunRef,citationSetRef,contractDocumentVersionRef,contractSha256,reviewDecisionRef,rulesetRef|D0,D1|PROVISIONAL_TASK5_6_HUMAN_RULESET",
    "04|4|CONTRACT_HEALTHCHECK_RECORDED|SUBMIT_SERVICE_CONTRACT_INTENT|SERVICE_CONTRACT_INTENT_SUBMITTED|owner|SERVICE_CONTRACT_COUNTERSIGN_PENDING|drs|attachmentManifestSha256,ownerIntentReceiptRef,previewReceiptRef,serviceContractSha256,serviceContractVersionRef|D0,D2|PROVISIONAL_TASK7_HUMAN_PROVIDER",
    "05|5|SERVICE_CONTRACT_COUNTERSIGN_PENDING|RECORD_SERVICE_CONTRACT_COUNTERSIGN_INTENT|SERVICE_CONTRACT_COUNTERSIGN_INTENT_RECORDED|drs|SERVICE_CONTRACT_INTENTS_RECORDED|drs|attachmentManifestSha256,drsIntentReceiptRef,drsSignerAuthorityRef,ownerIntentReceiptRef,serviceContractSha256,serviceContractVersionRef|D0,D2|PROVISIONAL_TASK7_HUMAN_PROVIDER",
    "06|6|SERVICE_CONTRACT_INTENTS_RECORDED|CONFIRM_LINE_CASE_CHANNEL|LINE_CASE_CHANNEL_CONFIRMED|drs|LINE_CASE_CHANNEL_CONFIRMED|vendor|lineAccountBindingRefs,lineGroupBindingRef,threePartyConsentRefs|D0,D3|PROVISIONAL_TASK8_HUMAN_POLICY",
    "07|7|LINE_CASE_CHANNEL_CONFIRMED|SUBMIT_VENDOR_BUNDLE|VENDOR_BUNDLE_SUBMITTED|vendor|VENDOR_BUNDLE_SUBMITTED|OWNER_OR_VENDOR_UNFULFILLED_SIGNER|bundleManifestSha256,calendarEventLinkRefs,documentVersionRefs,submissionBundleRef|D0,D4|PROVISIONAL_TASK9_10",
    "08|8|VENDOR_BUNDLE_SUBMITTED|RECORD_OWNER_VENDOR_SIGNATURE_INTENT|OWNER_VENDOR_SIGNATURE_INTENT_RECORDED|owner,vendor|OWNER_VENDOR_COUNTERSIGN_PENDING|REMAINING_REQUIRED_SIGNER|attachmentManifestSha256,contractSha256,ownerVendorContractVersionRef,signerIntentReceiptRef|D0,D5|PROVISIONAL_TASK7_HUMAN_PROVIDER",
    "09|8|OWNER_VENDOR_COUNTERSIGN_PENDING|RECORD_OWNER_VENDOR_SIGNATURE_INTENT|OWNER_VENDOR_SIGNATURE_INTENT_RECORDED|owner,vendor|OWNER_VENDOR_INTENTS_RECORDED|owner|attachmentManifestSha256,contractSha256,ownerVendorContractVersionRef,priorSignerIntentReceiptRef,signerIntentReceiptRef|D0,D5|PROVISIONAL_TASK7_HUMAN_PROVIDER",
    "10|9|OWNER_VENDOR_INTENTS_RECORDED|RECORD_EXTERNAL_PAYMENT_EVIDENCE|EXTERNAL_PAYMENT_EVIDENCE_RECORDED|owner|PAYMENT_EVIDENCE_REVIEW_PENDING|drs|ownerStatementRef,paymentEvidenceSha256,paymentEvidenceVersionRef|D0,D6|PROVISIONAL_TASK10_HUMAN_PAYMENT_POLICY",
    "11|9|PAYMENT_EVIDENCE_REVIEW_PENDING|RECORD_PAYMENT_EVIDENCE_REVIEW|PAYMENT_EVIDENCE_REVIEW_RECORDED|drs|PAYMENT_EVIDENCE_REVIEWED|vendor|ownerStatementRef,paymentEvidenceReviewRef,paymentEvidenceSha256,paymentEvidenceVersionRef|D0,D6|PROVISIONAL_TASK10_HUMAN_PAYMENT_POLICY",
    "12|10|PAYMENT_EVIDENCE_REVIEWED|SUBMIT_MOBILIZATION_EVIDENCE|MOBILIZATION_EVIDENCE_SUBMITTED|vendor|MOBILIZATION_OWNER_CONFIRMATION_PENDING|owner|calendarEventReceiptRef,mobilizationEvidenceSha256,mobilizationEvidenceVersionRef,paymentEvidenceReviewRef|D0,D7|PROVISIONAL_TASK9_10",
    "13|10|MOBILIZATION_OWNER_CONFIRMATION_PENDING|RECORD_OWNER_MOBILIZATION_CONFIRMATION|OWNER_MOBILIZATION_CONFIRMATION_RECORDED|owner|MOBILIZATION_DRS_CONFIRMATION_PENDING|drs|calendarEventReceiptRef,mobilizationEvidenceSha256,mobilizationEvidenceVersionRef,ownerConfirmationRef,vendorMobilizationReceiptRef|D0,D7|PROVISIONAL_TASK10",
    "14|10|MOBILIZATION_DRS_CONFIRMATION_PENDING|RECORD_DRS_MOBILIZATION_CONFIRMATION|DRS_MOBILIZATION_CONFIRMATION_RECORDED|drs|MOBILIZATION_RECORDED|vendor|calendarEventReceiptRef,drsConfirmationRef,mobilizationEvidenceSha256,mobilizationEvidenceVersionRef,ownerConfirmationRef,vendorMobilizationReceiptRef|D0,D7|PROVISIONAL_TASK10",
    "15|11|MOBILIZATION_RECORDED|SUBMIT_FIRST_MILESTONE_EVIDENCE|FIRST_MILESTONE_EVIDENCE_SUBMITTED|vendor|FIRST_MILESTONE_REVIEW_PENDING|drs|milestoneEvidenceManifestSha256,milestoneEvidenceVersionRefs,milestoneRef,submissionReceiptRef|D0,D8|PROVISIONAL_TASK10",
    "16|11|FIRST_MILESTONE_REVIEW_PENDING|RECORD_FIRST_MILESTONE_WRITTEN_REVIEW|FIRST_MILESTONE_WRITTEN_REVIEW_RECORDED|drs|FIRST_MILESTONE_REVIEW_RECORDED|owner|citationSetRef,firstMilestoneSubmissionRef,reviewDecisionRef,writtenOutcomeRef|D0,D8|PROVISIONAL_TASK10",
    "17|11A|FIRST_MILESTONE_REVIEW_RECORDED|RECORD_OWNER_MILESTONE_DECISION|OWNER_MILESTONE_DECISION_RECORDED|owner|SECOND_MILESTONE_EVIDENCE_PENDING|vendor|firstMilestoneReviewRef,ownerDecisionRef|D0,D8|PROVISIONAL_TASK10",
    "18|12|SECOND_MILESTONE_EVIDENCE_PENDING|SUBMIT_SECOND_MILESTONE_EVIDENCE|SECOND_MILESTONE_EVIDENCE_SUBMITTED|vendor|SECOND_MILESTONE_REVIEW_PENDING|drs|milestoneEvidenceManifestSha256,milestoneEvidenceVersionRefs,secondMilestoneRef,submissionReceiptRef|D0,D8|PROVISIONAL_TASK10",
    "19|12|SECOND_MILESTONE_REVIEW_PENDING|REQUEST_SUPPLEMENT|SUPPLEMENT_REQUEST_RECORDED|drs|SUPPLEMENT_REQUESTED|vendor|dueTime,missingItemRefs,priorReviewRef,secondMilestoneSubmissionRef,supplementRequestRef|D0,D9|PROVISIONAL_TASK10",
    "20|13|SUPPLEMENT_REQUESTED|SUBMIT_SUPPLEMENT_VERSION|SUPPLEMENT_VERSION_SUBMITTED|vendor|SUPPLEMENT_REVIEW_PENDING|drs|priorReviewRef,supplementRequestRef,supplementSha256,supplementSubmissionReceiptRef,supplementVersionRef|D0,D10|PROVISIONAL_TASK10",
    "21|13|SUPPLEMENT_REVIEW_PENDING|RECORD_SUCCESSOR_REVIEW_OUTCOME|SUCCESSOR_REVIEW_OUTCOME_RECORDED|drs|SUCCESSOR_REVIEW_RECORDED|owner|citationSetRef,priorReviewRef,successorReviewRef,supplementRequestRef,supplementSha256,supplementVersionRef,writtenOutcomeRef|D0,D10|PROVISIONAL_TASK10",
    "22|13|SUPPLEMENT_REVIEW_PENDING|REQUEST_FURTHER_SUPPLEMENT|FURTHER_SUPPLEMENT_REQUEST_RECORDED|drs|SUPPLEMENT_REQUESTED|vendor|citationSetRef,dueTime,missingItemRefs,newSupplementRequestRef,priorReviewRef,supplementRequestRef,supplementSha256,supplementVersionRef|D0,D10|PROVISIONAL_TASK10",
  ] as const,
);

export type DrsCaseRole = "owner" | "vendor" | "drs";

export const COMMAND_RECEIPT_SCHEMA_VERSION =
  "laibe.drs.command-receipt.v1" as const;

export const COMMAND_RECEIPT_CORE_FIELDS = Object.freeze(
  [
    "schemaVersion",
    "commandId",
    "caseId",
    "eventId",
    "sequenceNo",
    "caseVersion",
    "fromState",
    "toState",
    "nextActor",
    "recordedAt",
    "catalogSchemaVersion",
    "catalogHash",
  ] as const,
);

export type CommandReceiptCore = Readonly<{
  schemaVersion: typeof COMMAND_RECEIPT_SCHEMA_VERSION;
  commandId: string;
  caseId: string;
  eventId: string;
  sequenceNo: number;
  caseVersion: number;
  fromState: string;
  toState: string;
  nextActor: DrsCaseRole;
  recordedAt: string;
  catalogSchemaVersion: string | null;
  catalogHash: string | null;
}>;

export type DrsCaseCommandExecutionEnvelope = Readonly<{
  state: "APPLIED" | "REPLAYED";
  newEffects: 0 | 1;
  receipt: CommandReceiptCore;
  receiptCanonical: string;
  receiptSha256: string;
}>;

export function commandReceiptCanonicalText(
  receipt: CommandReceiptCore,
): string {
  return [
    `schemaVersion=${COMMAND_RECEIPT_SCHEMA_VERSION}`,
    `commandId=${receipt.commandId}`,
    `caseId=${receipt.caseId}`,
    `eventId=${receipt.eventId}`,
    `sequenceNo=${receipt.sequenceNo}`,
    `caseVersion=${receipt.caseVersion}`,
    `fromState=${receipt.fromState}`,
    `toState=${receipt.toState}`,
    `nextActor=${receipt.nextActor}`,
    `recordedAt=${receipt.recordedAt}`,
    `catalogSchemaVersion=${receipt.catalogSchemaVersion ?? ""}`,
    `catalogHash=${receipt.catalogHash ?? ""}`,
  ].join("\n");
}

export type TransitionCatalogRow = Readonly<{
  ordinal: number;
  step: string;
  fromState: string;
  commandType: string;
  eventType: string;
  allowedRoles: readonly DrsCaseRole[];
  toState: string;
  nextActorRule: string;
  requiredEvidenceRefs: readonly string[];
  effects0DenialSets: readonly string[];
  boundary: string;
}>;

export const FORBIDDEN_CALLER_AUTHORITY_KEYS = Object.freeze(
  [
    "caseId",
    "userId",
    "sessionId",
    "membershipId",
    "role",
    "actor",
    "actorUserId",
    "authorityVersion",
    "nextActor",
  ] as const,
);

export const COMMAND_REQUEST_KEYS = Object.freeze(
  [
    "commandId",
    "commandType",
    "idempotencyKey",
    "expectedCaseVersion",
    "canonicalPayloadSha256",
    "evidenceRefs",
    "dueTime",
  ] as const,
);

export type DrsCaseCommandRequest = Readonly<{
  commandId: string;
  commandType: string;
  idempotencyKey: string;
  expectedCaseVersion: number;
  canonicalPayloadSha256: string;
  evidenceRefs: Readonly<Record<string, unknown>>;
  dueTime: string | null;
}>;

export type TrustedNextActorFacts = Readonly<{
  drawingInputReady: boolean;
  contractInputReady: boolean;
  ownerSignatureRecorded: boolean;
  vendorSignatureRecorded: boolean;
}>;

function splitRequired(value: string): readonly string[] {
  return Object.freeze(value.split(","));
}

function parseCatalogRow(value: string): TransitionCatalogRow {
  const fields = value.split("|");
  if (fields.length !== 11) throw new Error("TRANSITION_CATALOG_INVALID");
  const ordinal = Number(fields[0]);
  const roles = splitRequired(fields[5]);
  if (
    !Number.isSafeInteger(ordinal) || ordinal < 1 ||
    roles.some((role) =>
      role !== "owner" && role !== "vendor" && role !== "drs"
    )
  ) throw new Error("TRANSITION_CATALOG_INVALID");
  return Object.freeze({
    ordinal,
    step: fields[1],
    fromState: fields[2],
    commandType: fields[3],
    eventType: fields[4],
    allowedRoles: roles as readonly DrsCaseRole[],
    toState: fields[6],
    nextActorRule: fields[7],
    requiredEvidenceRefs: splitRequired(fields[8]),
    effects0DenialSets: splitRequired(fields[9]),
    boundary: fields[10],
  });
}

export const TRANSITION_CATALOG = Object.freeze(
  TRANSITION_CATALOG_ROWS.map(parseCatalogRow),
);

export function transitionCatalogCanonicalText(): string {
  return TRANSITION_CATALOG_ROWS.join("\n");
}

function toHex(bytes: Uint8Array): string {
  let result = "";
  for (const value of bytes) result += value.toString(16).padStart(2, "0");
  return result;
}

export async function assertTransitionCatalogIntegrity(): Promise<void> {
  const canonical = new TextEncoder().encode(transitionCatalogCanonicalText());
  if (
    TRANSITION_CATALOG.length !== TRANSITION_CATALOG_ROW_COUNT ||
    canonical.byteLength !== TRANSITION_CATALOG_CANONICAL_BYTES
  ) throw new Error("TRANSITION_CATALOG_IDENTITY_MISMATCH");
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", canonical),
  );
  if (toHex(digest) !== TRANSITION_CATALOG_SHA256) {
    throw new Error("TRANSITION_CATALOG_IDENTITY_MISMATCH");
  }
}

export function resolveConcreteNextActor(
  rule: string,
  facts: TrustedNextActorFacts,
): DrsCaseRole {
  if (rule === "owner" || rule === "vendor" || rule === "drs") return rule;
  if (rule === "DRS_IF_DRAWING_INPUT_READY_ELSE_OWNER") {
    return facts.drawingInputReady ? "drs" : "owner";
  }
  if (rule === "DRS_IF_CONTRACT_INPUT_READY_ELSE_OWNER") {
    return facts.contractInputReady ? "drs" : "owner";
  }
  if (rule === "OWNER_OR_VENDOR_UNFULFILLED_SIGNER") {
    if (!facts.ownerSignatureRecorded) return "owner";
    if (!facts.vendorSignatureRecorded) return "vendor";
    throw new Error("WRONG_ACTOR_CHAIN");
  }
  if (rule === "REMAINING_REQUIRED_SIGNER") {
    if (facts.ownerSignatureRecorded === facts.vendorSignatureRecorded) {
      throw new Error("WRONG_ACTOR_CHAIN");
    }
    return facts.ownerSignatureRecorded ? "vendor" : "owner";
  }
  throw new Error("TRANSITION_CATALOG_INVALID");
}

function ownKeys(value: object): readonly string[] {
  return Object.keys(value).sort();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function parseDrsCaseCommandRequest(
  input: unknown,
): DrsCaseCommandRequest {
  if (!isPlainRecord(input)) throw new Error("INVALID_REQUEST");
  if (FORBIDDEN_CALLER_AUTHORITY_KEYS.some((key) => key in input)) {
    throw new Error("INVALID_REQUEST");
  }
  const expectedKeys = [...COMMAND_REQUEST_KEYS].sort();
  if (ownKeys(input).join("\n") !== expectedKeys.join("\n")) {
    throw new Error("INVALID_REQUEST");
  }
  if (
    typeof input.commandId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      .test(input.commandId) ||
    typeof input.commandType !== "string" ||
    !/^[A-Z][A-Z0-9_]{2,79}$/u.test(input.commandType) ||
    typeof input.idempotencyKey !== "string" ||
    input.idempotencyKey.length < 16 || input.idempotencyKey.length > 128 ||
    /[\s\p{Cc}]/u.test(input.idempotencyKey) ||
    typeof input.expectedCaseVersion !== "number" ||
    !Number.isSafeInteger(input.expectedCaseVersion) ||
    input.expectedCaseVersion < 1 ||
    typeof input.canonicalPayloadSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(input.canonicalPayloadSha256) ||
    !isPlainRecord(input.evidenceRefs) ||
    (input.dueTime !== null &&
      (typeof input.dueTime !== "string" ||
        !Number.isFinite(Date.parse(input.dueTime))))
  ) throw new Error("INVALID_REQUEST");
  return Object.freeze({
    commandId: input.commandId,
    commandType: input.commandType,
    idempotencyKey: input.idempotencyKey,
    expectedCaseVersion: input.expectedCaseVersion,
    canonicalPayloadSha256: input.canonicalPayloadSha256,
    evidenceRefs: Object.freeze({ ...input.evidenceRefs }),
    dueTime: input.dueTime,
  });
}
