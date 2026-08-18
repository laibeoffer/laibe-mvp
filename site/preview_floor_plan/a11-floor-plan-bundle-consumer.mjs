import {
  hashFloorPlanRecognitionBundle,
  validateFloorPlanRecognitionBundle
} from "../../tools/a11_recognition/floor_plan_recognition_bundle_v1.mjs";
import {
  validateA11RecognitionGateReceipt
} from "../../tools/a11_recognition/floor_plan_recognition_gate_v1.mjs";

export const A9_A11_FAIL_CLOSED_REASONS = "missing mismatch gate false stale superseded";

export const A9_A11_CONSUMER_ERROR_CODES = Object.freeze({
  INPUT_REQUIRED: "INPUT_REQUIRED",
  BUNDLE_REQUIRED: "BUNDLE_REQUIRED",
  BUNDLE_ID_REQUIRED: "BUNDLE_ID_REQUIRED",
  BUNDLE_HASH_REQUIRED: "BUNDLE_HASH_REQUIRED",
  BUNDLE_HASH_MISMATCH: "BUNDLE_HASH_MISMATCH",
  BUNDLE_ID_MISMATCH: "BUNDLE_ID_MISMATCH",
  GATE_RECEIPT_REQUIRED: "GATE_RECEIPT_REQUIRED",
  GATE_RECEIPT_ID_REQUIRED: "GATE_RECEIPT_ID_REQUIRED",
  GATE_NOT_PASSED: "GATE_NOT_PASSED",
  CASE_ID_REQUIRED: "CASE_ID_REQUIRED",
  CASE_BINDING_MISMATCH: "CASE_BINDING_MISMATCH",
  SOURCE_DOCUMENT_ID_REQUIRED: "SOURCE_DOCUMENT_ID_REQUIRED",
  SOURCE_DOCUMENT_VERSION_ID_REQUIRED: "SOURCE_DOCUMENT_VERSION_ID_REQUIRED",
  SOURCE_HASH_REQUIRED: "SOURCE_HASH_REQUIRED",
  PAGE_NUMBER_REQUIRED: "PAGE_NUMBER_REQUIRED",
  SOURCE_BINDING_MISMATCH: "SOURCE_BINDING_MISMATCH",
  SOURCE_VERSION_STALE: "SOURCE_VERSION_STALE",
  BUNDLE_SUPERSEDED: "BUNDLE_SUPERSEDED",
  MODEL_BINDING_MISMATCH: "MODEL_BINDING_MISMATCH",
  RULE_BINDING_MISMATCH: "RULE_BINDING_MISMATCH",
  SOURCE_FRAME_INVALID: "SOURCE_FRAME_INVALID",
  BACKGROUND_INVALID: "BACKGROUND_INVALID",
  POINT_INVALID: "POINT_INVALID",
  AUTOMATIC_SCALE_FORBIDDEN: "AUTOMATIC_SCALE_FORBIDDEN",
  SCALE_ACTOR_REQUIRED: "SCALE_ACTOR_REQUIRED",
  SCALE_VALUE_REQUIRED: "SCALE_VALUE_REQUIRED",
  SCALE_CONFIRMED_AT_REQUIRED: "SCALE_CONFIRMED_AT_REQUIRED",
  HUMAN_SCALE_CONFIRMATION_REQUIRED: "HUMAN_SCALE_CONFIRMATION_REQUIRED",
  OBJECT_INVALID: "OBJECT_INVALID",
  HOST_RELATION_REQUIRED: "HOST_RELATION_REQUIRED",
  CLASS_TOKEN_UNSUPPORTED: "CLASS_TOKEN_UNSUPPORTED",
  NON_CANONICAL_VALUE: "NON_CANONICAL_VALUE"
});

export class A9A11ConsumerError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "A9A11ConsumerError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = null) {
  throw new A9A11ConsumerError(code, message, details);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalClone(value, location = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(A9_A11_CONSUMER_ERROR_CODES.NON_CANONICAL_VALUE, location);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalClone(item, location + "[" + index + "]"));
  }
  if (!isPlainObject(value)) fail(A9_A11_CONSUMER_ERROR_CODES.NON_CANONICAL_VALUE, location);
  const clone = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) {
      fail(A9_A11_CONSUMER_ERROR_CODES.NON_CANONICAL_VALUE, location + "." + key);
    }
    clone[key] = canonicalClone(value[key], location + "." + key);
  }
  return clone;
}

function requireString(value, code, field) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail(code, field + " is required");
  }
  return value;
}

function requireHash(value, code, field) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    fail(code, field + " must be a lowercase SHA-256");
  }
  return value;
}

function requirePage(value, code, field) {
  if (!Number.isSafeInteger(value) || value < 1) fail(code, field + " must be positive");
  return value;
}

function requireIso(value, code, field) {
  requireString(value, code, field);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) fail(code, field + " must be a calendar-valid ISO-8601 UTC timestamp with milliseconds");
  return value;
}

function exact(expected, actual, code, field) {
  if (expected !== actual) fail(code, field + " does not match", { expected, actual });
}

function requireMatrix(value, field) {
  if (
    !Array.isArray(value) ||
    value.length !== 6 ||
    value.some((entry) => !Number.isFinite(entry))
  ) fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, field);
  return value;
}

function requireBounds(value, field) {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((entry) => !Number.isFinite(entry)) ||
    value[2] <= value[0] ||
    value[3] <= value[1]
  ) fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, field);
  return value;
}

const SOURCE_FRAME_FIELDS = Object.freeze([
  "cropBox",
  "displayBounds",
  "displayToSourceTransform",
  "mediaBox",
  "rotationDegrees",
  "roundTripTolerance",
  "sourceBounds",
  "sourceToDisplayTransform",
  "userUnit"
]);

function requireSourceFrame(sourceFrame) {
  if (!isPlainObject(sourceFrame)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, "sourceFrame");
  }
  const actual = Object.keys(sourceFrame).sort();
  const expected = [...SOURCE_FRAME_FIELDS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, "sourceFrame fields");
  requireBounds(sourceFrame.mediaBox, "sourceFrame.mediaBox");
  requireBounds(sourceFrame.cropBox, "sourceFrame.cropBox");
  requireBounds(sourceFrame.sourceBounds, "sourceFrame.sourceBounds");
  requireBounds(sourceFrame.displayBounds, "sourceFrame.displayBounds");
  if (!Number.isFinite(sourceFrame.userUnit) || sourceFrame.userUnit <= 0) {
    fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, "sourceFrame.userUnit");
  }
  if (![0, 90, 180, 270].includes(sourceFrame.rotationDegrees)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, "sourceFrame.rotationDegrees");
  }
  requireMatrix(sourceFrame.sourceToDisplayTransform, "sourceToDisplayTransform");
  requireMatrix(sourceFrame.displayToSourceTransform, "displayToSourceTransform");
  if (!Number.isFinite(sourceFrame.roundTripTolerance) || sourceFrame.roundTripTolerance < 0) {
    fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_FRAME_INVALID, "roundTripTolerance");
  }
  return sourceFrame;
}

function rejectLifecycle(input) {
  if (input.stale === true) {
    fail(A9_A11_CONSUMER_ERROR_CODES.SOURCE_VERSION_STALE, "selected source is stale");
  }
  if (input.superseded === true) {
    fail(A9_A11_CONSUMER_ERROR_CODES.BUNDLE_SUPERSEDED, "bundle is superseded");
  }
}

function requireBindingInput(input) {
  if (!isPlainObject(input)) fail(A9_A11_CONSUMER_ERROR_CODES.INPUT_REQUIRED, "input");
  if (!isPlainObject(input.bundle)) fail(A9_A11_CONSUMER_ERROR_CODES.BUNDLE_REQUIRED, "bundle");
  if (!isPlainObject(input.gateReceipt)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.GATE_RECEIPT_REQUIRED, "gateReceipt");
  }
  return {
    bundle: input.bundle,
    bundleHash: requireHash(
      input.bundleHash,
      A9_A11_CONSUMER_ERROR_CODES.BUNDLE_HASH_REQUIRED,
      "bundleHash"
    ),
    gateReceipt: input.gateReceipt,
    caseId: requireString(
      input.caseId,
      A9_A11_CONSUMER_ERROR_CODES.CASE_ID_REQUIRED,
      "caseId"
    ),
    sourceDocumentId: requireString(
      input.sourceDocumentId,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_DOCUMENT_ID_REQUIRED,
      "sourceDocumentId"
    ),
    sourceDocumentVersionId: requireString(
      input.sourceDocumentVersionId,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_DOCUMENT_VERSION_ID_REQUIRED,
      "sourceDocumentVersionId"
    ),
    sourceDocumentSha256: requireHash(
      input.sourceDocumentSha256,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_HASH_REQUIRED,
      "sourceDocumentSha256"
    ),
    pageNumber: requirePage(
      input.pageNumber,
      A9_A11_CONSUMER_ERROR_CODES.PAGE_NUMBER_REQUIRED,
      "pageNumber"
    ),
    modelVersion: requireString(
      input.modelVersion,
      A9_A11_CONSUMER_ERROR_CODES.MODEL_BINDING_MISMATCH,
      "modelVersion"
    ),
    ruleVersion: requireString(
      input.ruleVersion,
      A9_A11_CONSUMER_ERROR_CODES.RULE_BINDING_MISMATCH,
      "ruleVersion"
    )
  };
}

function readBundleFields(bundle) {
  return {
    packetId: requireString(
      bundle.packetId,
      A9_A11_CONSUMER_ERROR_CODES.BUNDLE_ID_REQUIRED,
      "bundle.packetId"
    ),
    caseId: requireString(
      bundle.caseId,
      A9_A11_CONSUMER_ERROR_CODES.CASE_ID_REQUIRED,
      "bundle.caseId"
    ),
    sourceDocumentId: requireString(
      bundle.sourceDocumentId,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_DOCUMENT_ID_REQUIRED,
      "bundle.sourceDocumentId"
    ),
    sourceDocumentVersionId: requireString(
      bundle.sourceDocumentVersionId,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_DOCUMENT_VERSION_ID_REQUIRED,
      "bundle.sourceDocumentVersionId"
    ),
    sourceDocumentSha256: requireHash(
      bundle.sourceDocumentSha256,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_HASH_REQUIRED,
      "bundle.sourceDocumentSha256"
    ),
    pageNumber: requirePage(
      bundle.pageNumber,
      A9_A11_CONSUMER_ERROR_CODES.PAGE_NUMBER_REQUIRED,
      "bundle.pageNumber"
    ),
    modelVersion: requireString(
      bundle.modelVersion,
      A9_A11_CONSUMER_ERROR_CODES.MODEL_BINDING_MISMATCH,
      "bundle.modelVersion"
    ),
    ruleVersion: requireString(
      bundle.ruleVersion,
      A9_A11_CONSUMER_ERROR_CODES.RULE_BINDING_MISMATCH,
      "bundle.ruleVersion"
    )
  };
}

function readGateFields(gateReceipt) {
  return {
    receiptId: requireString(
      gateReceipt.receiptId,
      A9_A11_CONSUMER_ERROR_CODES.GATE_RECEIPT_ID_REQUIRED,
      "gateReceipt.receiptId"
    ),
    bundleId: requireString(
      gateReceipt.bundleId,
      A9_A11_CONSUMER_ERROR_CODES.BUNDLE_ID_REQUIRED,
      "gateReceipt.bundleId"
    ),
    bundleHash: requireHash(
      gateReceipt.bundleHash,
      A9_A11_CONSUMER_ERROR_CODES.BUNDLE_HASH_REQUIRED,
      "gateReceipt.bundleHash"
    ),
    caseId: requireString(
      gateReceipt.caseId,
      A9_A11_CONSUMER_ERROR_CODES.CASE_ID_REQUIRED,
      "gateReceipt.caseId"
    ),
    sourceDocumentId: requireString(
      gateReceipt.sourceDocumentId,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_DOCUMENT_ID_REQUIRED,
      "gateReceipt.sourceDocumentId"
    ),
    sourceDocumentVersionId: requireString(
      gateReceipt.sourceDocumentVersionId,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_DOCUMENT_VERSION_ID_REQUIRED,
      "gateReceipt.sourceDocumentVersionId"
    ),
    sourceDocumentSha256: requireHash(
      gateReceipt.sourceDocumentSha256,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_HASH_REQUIRED,
      "gateReceipt.sourceDocumentSha256"
    ),
    pageNumber: requirePage(
      gateReceipt.pageNumber,
      A9_A11_CONSUMER_ERROR_CODES.PAGE_NUMBER_REQUIRED,
      "gateReceipt.pageNumber"
    ),
    modelVersion: requireString(
      gateReceipt.modelVersion,
      A9_A11_CONSUMER_ERROR_CODES.MODEL_BINDING_MISMATCH,
      "gateReceipt.modelVersion"
    ),
    ruleVersion: requireString(
      gateReceipt.ruleVersion,
      A9_A11_CONSUMER_ERROR_CODES.RULE_BINDING_MISMATCH,
      "gateReceipt.ruleVersion"
    ),
    result: gateReceipt.result
  };
}

function validateIdentity(caller, bundleFields, gateFields) {
  validateFloorPlanRecognitionBundle(caller.bundle);
  const gateBinding = {
    bundle: caller.bundle,
    bundleId: bundleFields.packetId,
    bundleHash: caller.bundleHash,
    caseId: caller.caseId,
    sourceDocumentId: caller.sourceDocumentId,
    sourceDocumentVersionId: caller.sourceDocumentVersionId,
    sourceDocumentSha256: caller.sourceDocumentSha256,
    pageNumber: caller.pageNumber,
    modelVersion: caller.modelVersion,
    ruleVersion: caller.ruleVersion
  };
  validateA11RecognitionGateReceipt(caller.gateReceipt, gateBinding);
  const computedHash = hashFloorPlanRecognitionBundle(caller.bundle);
  requireHash(
    computedHash,
    A9_A11_CONSUMER_ERROR_CODES.BUNDLE_HASH_MISMATCH,
    "computedHash"
  );
  exact(
    caller.bundleHash,
    computedHash,
    A9_A11_CONSUMER_ERROR_CODES.BUNDLE_HASH_MISMATCH,
    "bundleHash"
  );
  exact(
    bundleFields.packetId,
    gateFields.bundleId,
    A9_A11_CONSUMER_ERROR_CODES.BUNDLE_ID_MISMATCH,
    "gate.bundleId"
  );
  exact(
    caller.bundleHash,
    gateFields.bundleHash,
    A9_A11_CONSUMER_ERROR_CODES.BUNDLE_HASH_MISMATCH,
    "gate.bundleHash"
  );
  if (Object.hasOwn(caller.bundle, "bundleId") && caller.bundle.bundleId !== bundleFields.packetId) {
    fail(A9_A11_CONSUMER_ERROR_CODES.BUNDLE_ID_MISMATCH, "bundleId alias");
  }
  if (gateFields.result !== "passed") {
    fail(A9_A11_CONSUMER_ERROR_CODES.GATE_NOT_PASSED, "gate result");
  }
}

function validateBindings(caller, bundleFields, gateFields) {
  exact(
    caller.caseId,
    bundleFields.caseId,
    A9_A11_CONSUMER_ERROR_CODES.CASE_BINDING_MISMATCH,
    "bundle.caseId"
  );
  exact(
    caller.caseId,
    gateFields.caseId,
    A9_A11_CONSUMER_ERROR_CODES.CASE_BINDING_MISMATCH,
    "gate.caseId"
  );
  const sourcePairs = [
    [caller.sourceDocumentId, bundleFields.sourceDocumentId, "bundle.sourceDocumentId"],
    [caller.sourceDocumentId, gateFields.sourceDocumentId, "gate.sourceDocumentId"],
    [
      caller.sourceDocumentVersionId,
      bundleFields.sourceDocumentVersionId,
      "bundle.sourceDocumentVersionId"
    ],
    [
      caller.sourceDocumentVersionId,
      gateFields.sourceDocumentVersionId,
      "gate.sourceDocumentVersionId"
    ],
    [
      caller.sourceDocumentSha256,
      bundleFields.sourceDocumentSha256,
      "bundle.sourceDocumentSha256"
    ],
    [
      caller.sourceDocumentSha256,
      gateFields.sourceDocumentSha256,
      "gate.sourceDocumentSha256"
    ],
    [caller.pageNumber, bundleFields.pageNumber, "bundle.pageNumber"],
    [caller.pageNumber, gateFields.pageNumber, "gate.pageNumber"]
  ];
  for (const [expected, actual, field] of sourcePairs) {
    exact(
      expected,
      actual,
      A9_A11_CONSUMER_ERROR_CODES.SOURCE_BINDING_MISMATCH,
      field
    );
  }
  exact(
    caller.modelVersion,
    bundleFields.modelVersion,
    A9_A11_CONSUMER_ERROR_CODES.MODEL_BINDING_MISMATCH,
    "bundle.modelVersion"
  );
  exact(
    caller.modelVersion,
    gateFields.modelVersion,
    A9_A11_CONSUMER_ERROR_CODES.MODEL_BINDING_MISMATCH,
    "gate.modelVersion"
  );
  exact(
    caller.ruleVersion,
    bundleFields.ruleVersion,
    A9_A11_CONSUMER_ERROR_CODES.RULE_BINDING_MISMATCH,
    "bundle.ruleVersion"
  );
  exact(
    caller.ruleVersion,
    gateFields.ruleVersion,
    A9_A11_CONSUMER_ERROR_CODES.RULE_BINDING_MISMATCH,
    "gate.ruleVersion"
  );
}

export function validateA11BundleBinding(input) {
  if (!isPlainObject(input)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.INPUT_REQUIRED, "input");
  }
  rejectLifecycle(input);
  const caller = requireBindingInput(input);
  const bundleFields = readBundleFields(caller.bundle);
  const gateFields = readGateFields(caller.gateReceipt);
  validateIdentity(caller, bundleFields, gateFields);
  validateBindings(caller, bundleFields, gateFields);
  return canonicalClone(input);
}

export function createPdfPresentationBinding(input) {
  if (!isPlainObject(input)) fail(A9_A11_CONSUMER_ERROR_CODES.INPUT_REQUIRED, "presentation");
  const accepted = validateA11BundleBinding(input.acceptedBinding);
  const background = input.background;
  if (!isPlainObject(background)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.BACKGROUND_INVALID, "background");
  }
  if (!["pdf", "image"].includes(background.kind)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.BACKGROUND_INVALID, "background.kind");
  }
  return canonicalClone({
    caseId: accepted.caseId,
    sourceDocumentId: accepted.sourceDocumentId,
    sourceDocumentVersionId: accepted.sourceDocumentVersionId,
    sourceDocumentSha256: accepted.sourceDocumentSha256,
    pageNumber: accepted.pageNumber,
    sourceFrame: requireSourceFrame(accepted.bundle.sourceFrame),
    bundleHash: accepted.bundleHash,
    gateReceiptId: accepted.gateReceipt.receiptId,
    background
  });
}

function transformPoint(point, matrix) {
  if (!Array.isArray(point) || point.length !== 2 || point.some((value) => !Number.isFinite(value))) {
    fail(A9_A11_CONSUMER_ERROR_CODES.POINT_INVALID, "point");
  }
  requireMatrix(matrix, "transform");
  const [x, y] = point;
  const [a, b, c, d, e, f] = matrix;
  return [a * x + c * y + e, b * x + d * y + f];
}

export function transformSourcePointForDisplay(point, sourceFrame) {
  const frame = requireSourceFrame(sourceFrame);
  return transformPoint(point, frame.sourceToDisplayTransform);
}

export function transformDisplayPointForSource(point, sourceFrame) {
  const frame = requireSourceFrame(sourceFrame);
  return transformPoint(point, frame.displayToSourceTransform);
}

export function recordUserScaleConfirmation(input) {
  if (!isPlainObject(input)) fail(A9_A11_CONSUMER_ERROR_CODES.INPUT_REQUIRED, "scale");
  if (
    input.automatic === true ||
    (input.method !== undefined && input.method !== "manual_user_confirmation")
  ) fail(A9_A11_CONSUMER_ERROR_CODES.AUTOMATIC_SCALE_FORBIDDEN, "method");
  const actorId = requireString(
    input.actorId,
    A9_A11_CONSUMER_ERROR_CODES.SCALE_ACTOR_REQUIRED,
    "actorId"
  );
  if (!Number.isFinite(input.scale) || input.scale <= 0) {
    fail(A9_A11_CONSUMER_ERROR_CODES.SCALE_VALUE_REQUIRED, "scale");
  }
  requireIso(
    input.confirmedAt,
    A9_A11_CONSUMER_ERROR_CODES.SCALE_CONFIRMED_AT_REQUIRED,
    "confirmedAt"
  );
  return canonicalClone({
    ...input,
    actorId,
    method: "manual_user_confirmation",
    status: "confirmed"
  });
}

function requireHumanScale(value) {
  if (!isPlainObject(value) || value.status !== "confirmed") {
    fail(A9_A11_CONSUMER_ERROR_CODES.HUMAN_SCALE_CONFIRMATION_REQUIRED, "status");
  }
  if (value.automatic === true || value.method !== "manual_user_confirmation") {
    fail(A9_A11_CONSUMER_ERROR_CODES.HUMAN_SCALE_CONFIRMATION_REQUIRED, "method");
  }
  requireString(
    value.actorId,
    A9_A11_CONSUMER_ERROR_CODES.HUMAN_SCALE_CONFIRMATION_REQUIRED,
    "actorId"
  );
  if (!Number.isFinite(value.scale) || value.scale <= 0) {
    fail(A9_A11_CONSUMER_ERROR_CODES.HUMAN_SCALE_CONFIRMATION_REQUIRED, "scale");
  }
  requireIso(
    value.confirmedAt,
    A9_A11_CONSUMER_ERROR_CODES.HUMAN_SCALE_CONFIRMATION_REQUIRED,
    "confirmedAt"
  );
}

const ALLOWED_DISPOSITIONS = new Set([
  "native_object_candidate",
  "locked_line_group",
  "locked_structural_reference",
  "exclude_from_canvas",
  "retained_locked_reference",
  "unresolved_required_review"
]);
const LOCKED_DISPOSITIONS = new Set([
  "locked_line_group",
  "locked_structural_reference",
  "retained_locked_reference"
]);

function requireEvidenceRegionIds(value, objectId) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID, "evidenceRegionIds:" + objectId);
  }
  const seen = new Set();
  for (const evidenceRegionId of value) {
    requireString(
      evidenceRegionId,
      A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID,
      "evidenceRegionIds:" + objectId
    );
    if (seen.has(evidenceRegionId)) {
      fail(A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID, "duplicate evidenceRegionId");
    }
    seen.add(evidenceRegionId);
  }
  return value;
}

function readObject(object) {
  if (!isPlainObject(object)) fail(A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID, "object");
  const objectId = requireString(
    object.objectId,
    A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID,
    "objectId"
  );
  const classToken = requireString(
    object.classToken,
    A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID,
    "classToken"
  );
  if (!isPlainObject(object.sourceGeometry)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID, "sourceGeometry");
  }
  requireEvidenceRegionIds(object.evidenceRegionIds, objectId);
  if (!ALLOWED_DISPOSITIONS.has(object.disposition)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID, "disposition");
  }
  return { objectId, classToken };
}

function hostRelations(relations, objectId) {
  return relations.filter(
    (relation) =>
      isPlainObject(relation) &&
      relation.relationType === "opening_hosted_by_wall" &&
      relation.sourceObjectId === objectId &&
      relation.status === "confirmed" &&
      typeof relation.relationId === "string" &&
      relation.relationId.length > 0 &&
      typeof relation.targetObjectId === "string" &&
      relation.targetObjectId.length > 0
  );
}

function nativeBase(object) {
  return {
    objectId: object.objectId,
    classToken: object.classToken,
    sourceGeometry: canonicalClone(object.sourceGeometry),
    evidenceRegionIds: canonicalClone(object.evidenceRegionIds),
    disposition: object.disposition,
    editable: object.disposition === "native_object_candidate",
    locked: LOCKED_DISPOSITIONS.has(object.disposition)
  };
}

export function convertAcceptedBundleToNativePlan(binding) {
  const accepted = validateA11BundleBinding(binding);
  requireHumanScale(accepted.userScaleConfirmation);
  const { bundle, gateReceipt } = accepted;
  if (!Array.isArray(bundle.objects) || !Array.isArray(bundle.relations)) {
    fail(A9_A11_CONSUMER_ERROR_CODES.BUNDLE_REQUIRED, "objects and relations");
  }
  const nativeObjects = [];
  const excludedObjects = [];
  const unresolvedObjects = [];
  for (const object of bundle.objects) {
    const { objectId, classToken } = readObject(object);
    const { disposition } = object;
    if (disposition === "exclude_from_canvas") {
      excludedObjects.push(canonicalClone(object));
    }
    if (disposition === "unresolved_required_review") {
      unresolvedObjects.push(canonicalClone(object));
    }
    if (["exclude_from_canvas", "unresolved_required_review"].includes(disposition)) {
      continue;
    }
    if (classToken === "wall") {
      if (!Number.isFinite(object.wallThicknessPt) || object.wallThicknessPt <= 0) {
        fail(A9_A11_CONSUMER_ERROR_CODES.OBJECT_INVALID, "wallThicknessPt");
      }
      nativeObjects.push({
        ...nativeBase(object),
        wallThicknessPt: object.wallThicknessPt
      });
      continue;
    }
    if (["door", "window", "opening"].includes(classToken)) {
      const hosts = hostRelations(bundle.relations, objectId);
      if (hosts.length !== 1) {
        fail(A9_A11_CONSUMER_ERROR_CODES.HOST_RELATION_REQUIRED, objectId);
      }
      nativeObjects.push({
        ...nativeBase(object),
        relationId: hosts[0].relationId,
        hostWallId: hosts[0].targetObjectId
      });
      continue;
    }
    if (
      classToken === "stair" ||
      classToken === "column" ||
      LOCKED_DISPOSITIONS.has(disposition)
    ) {
      nativeObjects.push(nativeBase(object));
      continue;
    }
    fail(A9_A11_CONSUMER_ERROR_CODES.CLASS_TOKEN_UNSUPPORTED, classToken);
  }

  return canonicalClone({
    provenance: {
      bundleId: bundle.packetId,
      bundleHash: accepted.bundleHash,
      gateReceiptId: gateReceipt.receiptId,
      caseId: accepted.caseId,
      sourceDocumentId: accepted.sourceDocumentId,
      sourceDocumentVersionId: accepted.sourceDocumentVersionId,
      sourceDocumentSha256: accepted.sourceDocumentSha256,
      pageNumber: accepted.pageNumber,
      modelVersion: accepted.modelVersion,
      ruleVersion: accepted.ruleVersion
    },
    sourceFrame: bundle.sourceFrame,
    userScaleConfirmation: accepted.userScaleConfirmation,
    objects: nativeObjects,
    excludedObjects,
    unresolvedObjects
  });
}
