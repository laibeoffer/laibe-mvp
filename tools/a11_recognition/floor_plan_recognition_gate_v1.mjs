import {
  hashCanonicalValue,
  hashFloorPlanRecognitionBundle,
  validateFloorPlanRecognitionBundle
} from "./floor_plan_recognition_bundle_v1.mjs";

export const A11_GATE_RECEIPT_SCHEMA_NAME =
  "laibe.floor-plan-recognition-gate-receipt.v1";
export const A11_GATE_RECEIPT_SCHEMA_VERSION = 1;
export const A11_GATE_TRUST_STATE = "technical_candidate_only";

const LOWER_SHA256 = /^[0-9a-f]{64}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const RECEIPT_FIELDS = new Set([
  "schemaName", "schemaVersion", "receiptId", "writerRole", "bundleId",
  "bundleHash", "caseId", "sourceDocumentId", "sourceDocumentVersionId",
  "sourceDocumentSha256", "pageNumber", "policyVersion", "modelVersion",
  "ruleVersion", "result", "reasonCodes", "recordedAt", "trustState",
  "validatorEvidence"
]);
const REQUIRED_RECEIPT_FIELDS = [
  "schemaName", "schemaVersion", "receiptId", "writerRole", "bundleId",
  "bundleHash", "caseId", "sourceDocumentId", "sourceDocumentVersionId",
  "sourceDocumentSha256", "pageNumber", "policyVersion", "modelVersion",
  "ruleVersion", "result", "reasonCodes", "recordedAt", "trustState",
  "validatorEvidence"
];
const CREATE_INPUT_FIELDS = new Set([
  "receiptId", "bundle", "bundleHash", "policyVersion",
  "validatorEvidence", "recordedAt"
]);
const CREATE_REQUIRED_FIELDS = [...CREATE_INPUT_FIELDS];
const VALIDATOR_CHECK_FIELDS = Object.freeze([
  "bundleSchemaValidated",
  "sourceIdentityValidated",
  "sourceFrameValidated",
  "evidenceBindingsValidated",
  "relationsValidated",
  "uncertaintyDispositionValidated",
  "releaseBindingsValidated"
]);
const VALIDATOR_EVIDENCE_FIELDS = new Set([
  "validatorVersion", "validationRunId", "evidenceHash",
  ...VALIDATOR_CHECK_FIELDS
]);
const VALIDATOR_EVIDENCE_REQUIRED_FIELDS = [
  "validatorVersion", "validationRunId", "evidenceHash",
  ...VALIDATOR_CHECK_FIELDS
];
const REASON_CODE_BY_CHECK = Object.freeze({
  bundleSchemaValidated: "BUNDLE_SCHEMA_VALIDATION_FAILED",
  sourceIdentityValidated: "SOURCE_IDENTITY_VALIDATION_FAILED",
  sourceFrameValidated: "SOURCE_FRAME_VALIDATION_FAILED",
  evidenceBindingsValidated: "EVIDENCE_BINDINGS_VALIDATION_FAILED",
  relationsValidated: "RELATIONS_VALIDATION_FAILED",
  uncertaintyDispositionValidated: "UNCERTAINTY_DISPOSITION_VALIDATION_FAILED",
  releaseBindingsValidated: "RELEASE_BINDINGS_VALIDATION_FAILED"
});
const BINDING_FIELDS = new Set([
  "bundle", "bundleId", "bundleHash", "caseId", "sourceDocumentId",
  "sourceDocumentVersionId", "sourceDocumentSha256", "pageNumber",
  "policyVersion", "modelVersion", "ruleVersion"
]);

class RecognitionGateContractError extends TypeError {
  constructor(code, detail = "") {
    super(detail ? code + ": " + detail : code);
    this.name = "RecognitionGateContractError";
    this.code = code;
  }
}

function fail(code, detail) {
  throw new RecognitionGateContractError(code, detail);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireClosedObject(value, allowedFields, requiredFields, code, path) {
  if (!isPlainObject(value)) fail(code, path);
  for (const key of Object.keys(value)) {
    if (!allowedFields.has(key)) fail("SCHEMA_UNKNOWN_FIELD", path + "." + key);
  }
  for (const field of requiredFields) {
    if (!Object.hasOwn(value, field)) fail(code, path + "." + field);
  }
  return value;
}

function requireNonEmptyString(value, code, field) {
  if (typeof value !== "string" || value.trim() === "") fail(code, field);
}

function requireLowerSha256(value, code, field) {
  if (typeof value !== "string" || !LOWER_SHA256.test(value)) fail(code, field);
}

function requireIsoTimestamp(value) {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) {
    fail("GATE_RECORDED_AT_INVALID", "recordedAt");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("GATE_RECORDED_AT_INVALID", "recordedAt");
  }
}

function cloneValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cloneValue);
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = cloneValue(value[key]);
  return output;
}

function sameStringArray(actual, expected) {
  return actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function validateSchemaIdentity(value) {
  if (value.schemaName !== A11_GATE_RECEIPT_SCHEMA_NAME) {
    fail("GATE_SCHEMA_NAME_MISMATCH", "schemaName");
  }
  if (value.schemaVersion !== A11_GATE_RECEIPT_SCHEMA_VERSION) {
    fail("GATE_SCHEMA_VERSION_MISMATCH", "schemaVersion");
  }
}

function mismatchCode(field) {
  const codes = {
    bundleId: "BUNDLE_ID_MISMATCH",
    bundleHash: "BUNDLE_HASH_MISMATCH",
    caseId: "CASE_ID_MISMATCH",
    sourceDocumentId: "SOURCE_DOCUMENT_ID_MISMATCH",
    sourceDocumentVersionId: "SOURCE_DOCUMENT_VERSION_ID_MISMATCH",
    sourceDocumentSha256: "SOURCE_DOCUMENT_HASH_MISMATCH",
    pageNumber: "PAGE_NUMBER_MISMATCH",
    policyVersion: "GATE_POLICY_MISMATCH",
    modelVersion: "MODEL_VERSION_MISMATCH",
    ruleVersion: "RULE_VERSION_MISMATCH"
  };
  return codes[field] || "GATE_BINDING_MISMATCH";
}

function validatorEvidenceProjection(value) {
  const projection = {
    validatorVersion: value.validatorVersion,
    validationRunId: value.validationRunId
  };
  for (const field of VALIDATOR_CHECK_FIELDS) {
    projection[field] = value[field];
  }
  return projection;
}

function validateValidatorEvidenceShape(value, requireHash) {
  const requiredFields = requireHash
    ? VALIDATOR_EVIDENCE_REQUIRED_FIELDS
    : VALIDATOR_EVIDENCE_REQUIRED_FIELDS.filter(
      (field) => field !== "evidenceHash"
    );
  const evidence = requireClosedObject(
    value,
    VALIDATOR_EVIDENCE_FIELDS,
    requiredFields,
    "VALIDATOR_EVIDENCE_INVALID",
    "validatorEvidence"
  );
  requireNonEmptyString(
    evidence.validatorVersion,
    "VALIDATOR_VERSION_INVALID",
    "validatorVersion"
  );
  requireNonEmptyString(
    evidence.validationRunId,
    "VALIDATION_RUN_ID_INVALID",
    "validationRunId"
  );
  for (const field of VALIDATOR_CHECK_FIELDS) {
    if (typeof evidence[field] !== "boolean") {
      fail("VALIDATOR_CHECK_INVALID", field);
    }
  }
  if (requireHash) {
    requireLowerSha256(
      evidence.evidenceHash,
      "VALIDATOR_EVIDENCE_HASH_INVALID",
      "evidenceHash"
    );
    const expected = hashCanonicalValue(validatorEvidenceProjection(evidence));
    if (evidence.evidenceHash !== expected) {
      fail("VALIDATOR_EVIDENCE_HASH_MISMATCH", "evidenceHash");
    }
  }
  return cloneValue(evidence);
}

export function hashA11ValidatorEvidence(value) {
  const candidate = {
    ...requireClosedObject(
      value,
      VALIDATOR_EVIDENCE_FIELDS,
      VALIDATOR_EVIDENCE_REQUIRED_FIELDS.filter(
        (field) => field !== "evidenceHash"
      ),
      "VALIDATOR_EVIDENCE_INVALID",
      "validatorEvidence"
    )
  };
  delete candidate.evidenceHash;
  const validated = validateValidatorEvidenceShape(candidate, false);
  return hashCanonicalValue(validatorEvidenceProjection(validated));
}

function validateValidatorEvidence(value) {
  return validateValidatorEvidenceShape(value, true);
}

function deriveGateDecision(validatorEvidence) {
  const reasonCodes = VALIDATOR_CHECK_FIELDS
    .filter((field) => validatorEvidence[field] !== true)
    .map((field) => REASON_CODE_BY_CHECK[field]);
  return {
    result: reasonCodes.length === 0 ? "passed" : "failed",
    reasonCodes
  };
}

/*
 * This receipt is an integrity-bound technical candidate. This module does
 * not authenticate the validator identity and does not make recordedAt a
 * trusted backend timestamp.
 */
function validateGateShape(value) {
  const receipt = requireClosedObject(
    value,
    RECEIPT_FIELDS,
    REQUIRED_RECEIPT_FIELDS,
    "GATE_FIELD_MISSING",
    "gateReceipt"
  );
  validateSchemaIdentity(receipt);
  requireNonEmptyString(
    receipt.receiptId,
    "GATE_RECEIPT_ID_INVALID",
    "receiptId"
  );
  if (receipt.writerRole !== "A11_VALIDATOR") {
    fail("GATE_WRITER_ROLE_MISMATCH", "writerRole");
  }
  requireNonEmptyString(receipt.bundleId, "BUNDLE_ID_MISMATCH", "bundleId");
  requireLowerSha256(receipt.bundleHash, "BUNDLE_HASH_MISMATCH", "bundleHash");
  requireNonEmptyString(receipt.caseId, "CASE_ID_MISMATCH", "caseId");
  requireNonEmptyString(
    receipt.sourceDocumentId,
    "SOURCE_DOCUMENT_ID_MISMATCH",
    "sourceDocumentId"
  );
  requireNonEmptyString(
    receipt.sourceDocumentVersionId,
    "SOURCE_DOCUMENT_VERSION_ID_MISMATCH",
    "sourceDocumentVersionId"
  );
  requireLowerSha256(
    receipt.sourceDocumentSha256,
    "SOURCE_DOCUMENT_HASH_MISMATCH",
    "sourceDocumentSha256"
  );
  if (!Number.isInteger(receipt.pageNumber) || receipt.pageNumber < 1) {
    fail("PAGE_NUMBER_MISMATCH", "pageNumber");
  }
  requireNonEmptyString(
    receipt.policyVersion,
    "GATE_POLICY_MISMATCH",
    "policyVersion"
  );
  requireNonEmptyString(
    receipt.modelVersion,
    "MODEL_VERSION_MISMATCH",
    "modelVersion"
  );
  requireNonEmptyString(
    receipt.ruleVersion,
    "RULE_VERSION_MISMATCH",
    "ruleVersion"
  );
  if (!Array.isArray(receipt.reasonCodes) ||
      receipt.reasonCodes.some((reason) =>
        typeof reason !== "string" || reason.trim() === "")) {
    fail("GATE_REASON_CODES_INVALID", "reasonCodes");
  }
  if (receipt.trustState !== A11_GATE_TRUST_STATE) {
    fail("GATE_TRUST_STATE_MISMATCH", "trustState");
  }
  requireIsoTimestamp(receipt.recordedAt);
  const validatorEvidence = validateValidatorEvidence(
    receipt.validatorEvidence
  );
  const expectedDecision = deriveGateDecision(validatorEvidence);
  if (receipt.result !== expectedDecision.result) {
    fail("GATE_RESULT_EVIDENCE_MISMATCH", "result");
  }
  if (!sameStringArray(receipt.reasonCodes, expectedDecision.reasonCodes)) {
    fail("GATE_REASON_CODES_EVIDENCE_MISMATCH", "reasonCodes");
  }
  return cloneValue(receipt);
}

function validateGateCreateInput(value) {
  const input = requireClosedObject(
    value,
    CREATE_INPUT_FIELDS,
    CREATE_REQUIRED_FIELDS,
    "GATE_INPUT_INVALID",
    "gateInput"
  );
  requireNonEmptyString(
    input.receiptId,
    "GATE_RECEIPT_ID_INVALID",
    "receiptId"
  );
  const bundle = validateFloorPlanRecognitionBundle(input.bundle);
  requireLowerSha256(input.bundleHash, "BUNDLE_HASH_MISMATCH", "bundleHash");
  const actualBundleHash = hashFloorPlanRecognitionBundle(bundle);
  if (input.bundleHash !== actualBundleHash) {
    fail("BUNDLE_HASH_MISMATCH", "bundleHash");
  }
  requireNonEmptyString(
    input.policyVersion,
    "GATE_POLICY_MISMATCH",
    "policyVersion"
  );
  requireIsoTimestamp(input.recordedAt);
  if (input.recordedAt < bundle.recordedAt) {
    fail("GATE_RECORDED_AT_PRECEDES_BUNDLE", "recordedAt");
  }
  const validatorEvidence = validateValidatorEvidence(
    input.validatorEvidence
  );
  return {
    receiptId: input.receiptId,
    bundle,
    bundleHash: actualBundleHash,
    policyVersion: input.policyVersion,
    validatorEvidence,
    recordedAt: input.recordedAt
  };
}

export function validateA11RecognitionGateInput(value) {
  return validateGateCreateInput(value);
}

export function createA11RecognitionGateReceipt(value) {
  const input = validateGateCreateInput(value);
  const bundle = input.bundle;
  const decision = deriveGateDecision(input.validatorEvidence);
  return validateGateShape({
    schemaName: A11_GATE_RECEIPT_SCHEMA_NAME,
    schemaVersion: A11_GATE_RECEIPT_SCHEMA_VERSION,
    receiptId: input.receiptId,
    writerRole: "A11_VALIDATOR",
    bundleId: bundle.packetId,
    bundleHash: input.bundleHash,
    caseId: bundle.caseId,
    sourceDocumentId: bundle.sourceDocumentId,
    sourceDocumentVersionId: bundle.sourceDocumentVersionId,
    sourceDocumentSha256: bundle.sourceDocumentSha256,
    pageNumber: bundle.pageNumber,
    policyVersion: input.policyVersion,
    modelVersion: bundle.modelVersion,
    ruleVersion: bundle.ruleVersion,
    result: decision.result,
    reasonCodes: decision.reasonCodes,
    recordedAt: input.recordedAt,
    trustState: A11_GATE_TRUST_STATE,
    validatorEvidence: input.validatorEvidence
  });
}

export function validateA11RecognitionGateReceipt(receipt, binding = {}) {
  const validated = validateGateShape(receipt);
  if (!isPlainObject(binding)) fail("GATE_BINDING_INVALID");
  for (const key of Object.keys(binding)) {
    if (!BINDING_FIELDS.has(key)) fail("GATE_BINDING_INVALID", key);
  }

  const exactBinding = { ...binding };
  delete exactBinding.bundle;
  if (Object.hasOwn(binding, "bundle")) {
    const bundle = validateFloorPlanRecognitionBundle(binding.bundle);
    const bundleHash = hashFloorPlanRecognitionBundle(bundle);
    const derivedBinding = {
      bundleId: bundle.packetId,
      bundleHash,
      caseId: bundle.caseId,
      sourceDocumentId: bundle.sourceDocumentId,
      sourceDocumentVersionId: bundle.sourceDocumentVersionId,
      sourceDocumentSha256: bundle.sourceDocumentSha256,
      pageNumber: bundle.pageNumber,
      modelVersion: bundle.modelVersion,
      ruleVersion: bundle.ruleVersion
    };
    for (const [field, expected] of Object.entries(derivedBinding)) {
      if (Object.hasOwn(exactBinding, field) &&
          exactBinding[field] !== expected) {
        fail(mismatchCode(field), field);
      }
      exactBinding[field] = expected;
    }
    if (validated.recordedAt < bundle.recordedAt) {
      fail("GATE_RECORDED_AT_PRECEDES_BUNDLE", "recordedAt");
    }
  }

  for (const field of [
    "bundleId", "bundleHash", "caseId", "sourceDocumentId",
    "sourceDocumentVersionId", "sourceDocumentSha256", "pageNumber",
    "policyVersion", "modelVersion", "ruleVersion"
  ]) {
    if (Object.hasOwn(exactBinding, field) &&
        exactBinding[field] !== validated[field]) {
      fail(mismatchCode(field), field);
    }
  }
  return cloneValue(validated);
}
