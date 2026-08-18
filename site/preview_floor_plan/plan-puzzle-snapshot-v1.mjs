import {
  hashCanonicalValue
} from "../../tools/a11_recognition/floor_plan_recognition_bundle_v1.mjs";
import {
  convertAcceptedBundleToNativePlan,
  validateA11BundleBinding
} from "./a11-floor-plan-bundle-consumer.mjs";

export const PLAN_PUZZLE_SNAPSHOT_SCHEMA_NAME = "laibe.plan-puzzle-snapshot.v1";
export const PLAN_PUZZLE_SNAPSHOT_SCHEMA_VERSION = 1;

export const PLAN_PUZZLE_SNAPSHOT_ERROR_CODES = Object.freeze({
  SNAPSHOT_REQUIRED: "SNAPSHOT_REQUIRED",
  SNAPSHOT_UNKNOWN_FIELD: "SNAPSHOT_UNKNOWN_FIELD",
  SNAPSHOT_FIELD_REQUIRED: "SNAPSHOT_FIELD_REQUIRED",
  SNAPSHOT_SCHEMA_MISMATCH: "SNAPSHOT_SCHEMA_MISMATCH",
  SNAPSHOT_IDENTITY_MISMATCH: "SNAPSHOT_IDENTITY_MISMATCH",
  SNAPSHOT_HASH_INVALID: "SNAPSHOT_HASH_INVALID",
  SNAPSHOT_TIMESTAMP_INVALID: "SNAPSHOT_TIMESTAMP_INVALID",
  SNAPSHOT_ARRAY_REQUIRED: "SNAPSHOT_ARRAY_REQUIRED",
  SNAPSHOT_OBJECT_REQUIRED: "SNAPSHOT_OBJECT_REQUIRED",
  SNAPSHOT_SCALE_INVALID: "SNAPSHOT_SCALE_INVALID",
  SNAPSHOT_STATUS_INVALID: "SNAPSHOT_STATUS_INVALID",
  SNAPSHOT_UPSTREAM_INVALID: "SNAPSHOT_UPSTREAM_INVALID",
  CREATOR_INPUT_INVALID: "CREATOR_INPUT_INVALID",
  CLASS_TOKEN_UNSUPPORTED: "CLASS_TOKEN_UNSUPPORTED",
  NATIVE_PLAN_INVALID: "NATIVE_PLAN_INVALID",
  NATIVE_PLAN_PROVENANCE_MISMATCH: "NATIVE_PLAN_PROVENANCE_MISMATCH",
  NATIVE_PLAN_SCALE_MISMATCH: "NATIVE_PLAN_SCALE_MISMATCH",
  NON_CANONICAL_VALUE: "NON_CANONICAL_VALUE"
});

export class PlanPuzzleSnapshotError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "PlanPuzzleSnapshotError";
    this.code = code;
    this.details = details;
  }
}

const SNAPSHOT_FIELDS = Object.freeze([
  "a0IntegrationAcceptance",
  "a1BudgetFactsProjection",
  "bundleHash",
  "bundleId",
  "caseId",
  "converterVersion",
  "createdAt",
  "evidenceBacklinks",
  "evidenceReferences",
  "gateReceiptId",
  "humanReviewRequired",
  "nativeObjects",
  "packetId",
  "pageNumber",
  "persistence",
  "processingStatus",
  "producerRole",
  "producerVersion",
  "recordedAt",
  "scaleConfirmation",
  "schemaName",
  "schemaVersion",
  "sourceDocumentId",
  "sourceDocumentSha256",
  "sourceDocumentVersionId",
  "supersedesPacketIds",
  "topology",
  "uncertainty",
  "unresolved",
  "upstreamPacketIds",
  "warnings"
]);

const CREATOR_FIELDS = Object.freeze([
  "acceptedBinding",
  "converterVersion",
  "createdAt",
  "nativePlan",
  "packetId",
  "persistence",
  "producerVersion",
  "recordedAt",
  "supersedesPacketIds",
  "topology"
]);

function fail(code, message, details = null) {
  throw new PlanPuzzleSnapshotError(code, message, details);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalClone(value, location = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.NON_CANONICAL_VALUE, location);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalClone(item, location + "[" + index + "]"));
  }
  if (!isPlainObject(value)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.NON_CANONICAL_VALUE, location);
  }
  const clone = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) {
      fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.NON_CANONICAL_VALUE, location + "." + key);
    }
    clone[key] = canonicalClone(value[key], location + "." + key);
  }
  return clone;
}

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_FIELD_REQUIRED, field);
  }
  return value;
}

function requireHash(value, field) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_HASH_INVALID, field);
  }
  return value;
}

function requireIso(value, field) {
  requireString(value, field);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_TIMESTAMP_INVALID, field);
  }
  return value;
}

function requireArray(value, field) {
  if (!Array.isArray(value)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_ARRAY_REQUIRED, field);
  }
  return value;
}

function requireObject(value, field) {
  if (!isPlainObject(value)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED, field);
  }
  return value;
}

function requireUniqueStrings(value, field) {
  requireArray(value, field);
  const seen = new Set();
  for (const item of value) {
    requireString(item, field);
    if (seen.has(item)) {
      fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_ARRAY_REQUIRED, field);
    }
    seen.add(item);
  }
  return value;
}

function requireExactFields(value, expectedFields, code) {
  if (!isPlainObject(value)) fail(code, "object");
  const actual = Object.keys(value).sort();
  const expected = [...expectedFields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    fail(code, "closed fields", { actual, expected });
  }
}

function requireNonEmptyUniqueStrings(value, field) {
  requireUniqueStrings(value, field);
  if (value.length === 0) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_ARRAY_REQUIRED, field);
  }
  return value;
}

function requireBounds(value, field) {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((entry) => !Number.isFinite(entry)) ||
    value[2] <= value[0] ||
    value[3] <= value[1]
  ) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED, field);
  }
}

function validateEvidenceBacklinks(backlinks, evidenceReferences) {
  requireArray(backlinks, "evidenceBacklinks");
  const referenceIds = new Set(evidenceReferences);
  const backlinkIds = new Set();
  for (const backlink of backlinks) {
    requireObject(backlink, "evidenceBacklink");
    const fields = Object.hasOwn(backlink, "evidenceHash")
      ? ["evidenceId", "bounds", "evidenceHash"]
      : ["evidenceId", "bounds"];
    requireExactFields(
      backlink,
      fields,
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED
    );
    const evidenceId = requireString(backlink.evidenceId, "evidenceBacklink.evidenceId");
    if (!referenceIds.has(evidenceId) || backlinkIds.has(evidenceId)) {
      fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH, evidenceId);
    }
    requireBounds(backlink.bounds, "evidenceBacklink.bounds");
    if (Object.hasOwn(backlink, "evidenceHash")) {
      requireHash(backlink.evidenceHash, "evidenceBacklink.evidenceHash");
    }
    backlinkIds.add(evidenceId);
  }
  if (
    backlinkIds.size !== referenceIds.size ||
    [...referenceIds].some((evidenceId) => !backlinkIds.has(evidenceId))
  ) {
    fail(
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH,
      "evidenceBacklinks"
    );
  }
}

function validateWarningStrings(warnings) {
  requireArray(warnings, "warnings");
  for (const warning of warnings) requireString(warning, "warning");
}

function validateUnresolvedRecords(unresolved) {
  requireArray(unresolved, "unresolved");
  for (const record of unresolved) {
    requireObject(record, "unresolved record");
    canonicalClone(record);
  }
}

function validateTopology(topology) {
  requireExactFields(
    topology,
    ["closureStatus", "roomLoops", "unresolvedTopologyIssueIds"],
    PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED
  );
  if (!["closed", "open", "unresolved"].includes(topology.closureStatus)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_STATUS_INVALID, "closureStatus");
  }
  requireArray(topology.roomLoops, "topology.roomLoops");
  for (const roomLoop of topology.roomLoops) {
    requireObject(roomLoop, "topology.roomLoop");
    canonicalClone(roomLoop);
  }
  requireUniqueStrings(
    topology.unresolvedTopologyIssueIds,
    "topology.unresolvedTopologyIssueIds"
  );
}

function validatePersistence(persistence) {
  requireExactFields(
    persistence,
    ["status", "version"],
    PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED
  );
  if (persistence.status !== "candidate") {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_STATUS_INVALID, "persistence.status");
  }
  if (!Number.isSafeInteger(persistence.version) || persistence.version < 1) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED, "persistence.version");
  }
}

function requireManualScale(value) {
  requireObject(value, "scaleConfirmation");
  if (
    value.status !== "confirmed" ||
    value.method !== "manual_user_confirmation" ||
    value.automatic === true
  ) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_SCALE_INVALID, "scale status");
  }
  requireString(value.actorId, "scaleConfirmation.actorId");
  requireIso(value.confirmedAt, "scaleConfirmation.confirmedAt");
  if (!Number.isFinite(value.scale) || value.scale <= 0) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_SCALE_INVALID, "scale");
  }
  return value;
}

const NATIVE_BASE_FIELDS = Object.freeze([
  "classToken",
  "disposition",
  "editable",
  "evidenceRegionIds",
  "locked",
  "objectId",
  "sourceGeometry"
]);
const NATIVE_LOCKED_DISPOSITIONS = new Set([
  "locked_line_group",
  "locked_structural_reference",
  "retained_locked_reference"
]);

function nativeFieldsForClass(classToken) {
  if (classToken === "wall") return [...NATIVE_BASE_FIELDS, "wallThicknessPt"];
  if (["door", "window", "opening"].includes(classToken)) {
    return [...NATIVE_BASE_FIELDS, "hostWallId", "relationId"];
  }
  if (["stair", "column", "dimension", "necessary_text"].includes(classToken)) {
    return [...NATIVE_BASE_FIELDS];
  }
  fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.CLASS_TOKEN_UNSUPPORTED, classToken);
}

function validateNativeObjects(nativeObjects, evidenceReferences) {
  requireArray(nativeObjects, "nativeObjects");
  const evidenceIds = new Set(evidenceReferences);
  const objectClasses = new Map();
  const openingHosts = [];
  const relationIds = new Set();

  for (const nativeObject of nativeObjects) {
    requireObject(nativeObject, "nativeObject");
    const classToken = requireString(nativeObject.classToken, "nativeObject.classToken");
    requireExactFields(
      nativeObject,
      nativeFieldsForClass(classToken),
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED
    );
    const objectId = requireString(nativeObject.objectId, "nativeObject.objectId");
    if (objectClasses.has(objectId)) {
      fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH, objectId);
    }
    objectClasses.set(objectId, classToken);
    requireObject(nativeObject.sourceGeometry, "nativeObject.sourceGeometry");
    canonicalClone(nativeObject.sourceGeometry);
    requireNonEmptyUniqueStrings(
      nativeObject.evidenceRegionIds,
      "nativeObject.evidenceRegionIds"
    );
    if (
      nativeObject.evidenceRegionIds.some((evidenceId) => !evidenceIds.has(evidenceId))
    ) {
      fail(
        PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH,
        "nativeObject.evidenceRegionIds"
      );
    }

    const isEditable = nativeObject.disposition === "native_object_candidate";
    const isLocked = NATIVE_LOCKED_DISPOSITIONS.has(nativeObject.disposition);
    if (
      (!isEditable && !isLocked) ||
      nativeObject.editable !== isEditable ||
      nativeObject.locked !== isLocked
    ) {
      fail(
        PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_STATUS_INVALID,
        "nativeObject disposition"
      );
    }
    if (
      ["dimension", "necessary_text"].includes(classToken) &&
      (!isLocked || nativeObject.editable !== false)
    ) {
      fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_STATUS_INVALID, classToken);
    }

    if (
      classToken === "wall" &&
      (!Number.isFinite(nativeObject.wallThicknessPt) ||
        nativeObject.wallThicknessPt <= 0)
    ) {
      fail(
        PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED,
        "wallThicknessPt"
      );
    }
    if (["door", "window", "opening"].includes(classToken)) {
      const relationId = requireString(nativeObject.relationId, "nativeObject.relationId");
      const hostWallId = requireString(nativeObject.hostWallId, "nativeObject.hostWallId");
      if (relationIds.has(relationId)) {
        fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH, relationId);
      }
      relationIds.add(relationId);
      openingHosts.push({ objectId, hostWallId });
    }
  }

  for (const { objectId, hostWallId } of openingHosts) {
    if (objectClasses.get(hostWallId) !== "wall") {
      fail(
        PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH,
        "hostWallId:" + objectId
      );
    }
  }
}

function requireFixedSnapshotState(snapshot) {
  if (
    snapshot.schemaName !== PLAN_PUZZLE_SNAPSHOT_SCHEMA_NAME ||
    snapshot.schemaVersion !== PLAN_PUZZLE_SNAPSHOT_SCHEMA_VERSION
  ) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_SCHEMA_MISMATCH, "schema");
  }
  if (
    snapshot.producerRole !== "A9_CONVERTER" ||
    snapshot.processingStatus !== "candidate_ready" ||
    snapshot.humanReviewRequired !== true ||
    snapshot.a1BudgetFactsProjection !== "hold" ||
    snapshot.a0IntegrationAcceptance !== "pending"
  ) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_STATUS_INVALID, "fixed status");
  }
}

export function validatePlanPuzzleSnapshot(snapshot) {
  requireExactFields(
    snapshot,
    SNAPSHOT_FIELDS,
    PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_UNKNOWN_FIELD
  );
  requireFixedSnapshotState(snapshot);
  for (const field of [
    "packetId",
    "caseId",
    "producerVersion",
    "sourceDocumentId",
    "sourceDocumentVersionId",
    "bundleId",
    "gateReceiptId",
    "converterVersion"
  ]) {
    requireString(snapshot[field], field);
  }
  requireHash(snapshot.sourceDocumentSha256, "sourceDocumentSha256");
  requireHash(snapshot.bundleHash, "bundleHash");
  requireIso(snapshot.createdAt, "createdAt");
  requireIso(snapshot.recordedAt, "recordedAt");
  if (snapshot.recordedAt < snapshot.createdAt) {
    fail(
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_TIMESTAMP_INVALID,
      "recordedAt must be at or after createdAt"
    );
  }
  if (!Number.isSafeInteger(snapshot.pageNumber) || snapshot.pageNumber < 1) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_OBJECT_REQUIRED, "pageNumber");
  }
  requireNonEmptyUniqueStrings(snapshot.upstreamPacketIds, "upstreamPacketIds");
  requireUniqueStrings(snapshot.supersedesPacketIds, "supersedesPacketIds");
  if (
    !snapshot.upstreamPacketIds.includes(snapshot.bundleId) ||
    !snapshot.upstreamPacketIds.includes(snapshot.gateReceiptId)
  ) {
    fail(
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_UPSTREAM_INVALID,
      "bundleId and gateReceiptId"
    );
  }
  if (snapshot.supersedesPacketIds.includes(snapshot.packetId)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH, "packetId");
  }
  requireNonEmptyUniqueStrings(snapshot.evidenceReferences, "evidenceReferences");
  validateEvidenceBacklinks(snapshot.evidenceBacklinks, snapshot.evidenceReferences);
  validateNativeObjects(snapshot.nativeObjects, snapshot.evidenceReferences);
  validateWarningStrings(snapshot.warnings);
  validateUnresolvedRecords(snapshot.unresolved);
  validateUnresolvedRecords(snapshot.uncertainty);
  validateTopology(snapshot.topology);
  validatePersistence(snapshot.persistence);
  requireManualScale(snapshot.scaleConfirmation);
  return canonicalClone(snapshot);
}

export function hashPlanPuzzleSnapshot(snapshot) {
  const canonicalSnapshot = validatePlanPuzzleSnapshot(snapshot);
  const snapshotHash = hashCanonicalValue(canonicalSnapshot);
  requireHash(snapshotHash, "snapshotHash");
  return snapshotHash;
}

function requireNativePlanMatches(acceptedBinding, nativePlan) {
  requireObject(nativePlan, "nativePlan");
  requireObject(nativePlan.provenance, "nativePlan.provenance");
  requireArray(nativePlan.objects, "nativePlan.objects");
  requireArray(nativePlan.excludedObjects, "nativePlan.excludedObjects");
  requireArray(nativePlan.unresolvedObjects, "nativePlan.unresolvedObjects");
  requireManualScale(nativePlan.userScaleConfirmation);

  const provenancePairs = [
    [acceptedBinding.bundle.packetId, nativePlan.provenance.bundleId, "bundleId"],
    [acceptedBinding.bundleHash, nativePlan.provenance.bundleHash, "bundleHash"],
    [
      acceptedBinding.gateReceipt.receiptId,
      nativePlan.provenance.gateReceiptId,
      "gateReceiptId"
    ],
    [acceptedBinding.caseId, nativePlan.provenance.caseId, "caseId"],
    [
      acceptedBinding.sourceDocumentId,
      nativePlan.provenance.sourceDocumentId,
      "sourceDocumentId"
    ],
    [
      acceptedBinding.sourceDocumentVersionId,
      nativePlan.provenance.sourceDocumentVersionId,
      "sourceDocumentVersionId"
    ],
    [
      acceptedBinding.sourceDocumentSha256,
      nativePlan.provenance.sourceDocumentSha256,
      "sourceDocumentSha256"
    ],
    [acceptedBinding.pageNumber, nativePlan.provenance.pageNumber, "pageNumber"],
    [acceptedBinding.modelVersion, nativePlan.provenance.modelVersion, "modelVersion"],
    [acceptedBinding.ruleVersion, nativePlan.provenance.ruleVersion, "ruleVersion"]
  ];
  for (const [expected, actual, field] of provenancePairs) {
    if (expected !== actual) {
      fail(
        PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.NATIVE_PLAN_PROVENANCE_MISMATCH,
        field,
        { expected, actual }
      );
    }
  }

  const acceptedScaleHash = hashCanonicalValue(acceptedBinding.userScaleConfirmation);
  const nativeScaleHash = hashCanonicalValue(nativePlan.userScaleConfirmation);
  if (acceptedScaleHash !== nativeScaleHash) {
    fail(
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.NATIVE_PLAN_SCALE_MISMATCH,
      "userScaleConfirmation"
    );
  }

  const expectedNativePlan = convertAcceptedBundleToNativePlan(acceptedBinding);
  const expectedNativeHash = hashCanonicalValue(expectedNativePlan);
  const suppliedNativeHash = hashCanonicalValue(nativePlan);
  if (expectedNativeHash !== suppliedNativeHash) {
    fail(
      PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.NATIVE_PLAN_INVALID,
      "nativePlan was not produced from acceptedBinding"
    );
  }
}

function deriveUpstreamPacketIds(bundle, gateReceipt) {
  const upstreamPacketIds = [
    ...bundle.upstreamPacketIds,
    bundle.packetId,
    gateReceipt.receiptId
  ];
  return [...new Set(upstreamPacketIds)];
}

function deriveUnresolved(nativePlan) {
  return canonicalClone(nativePlan.unresolvedObjects);
}

export function createPlanPuzzleSnapshot(input) {
  requireExactFields(
    input,
    CREATOR_FIELDS,
    PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.CREATOR_INPUT_INVALID
  );
  const packetId = requireString(input.packetId, "packetId");
  const producerVersion = requireString(input.producerVersion, "producerVersion");
  const converterVersion = requireString(input.converterVersion, "converterVersion");
  const createdAt = requireIso(input.createdAt, "createdAt");
  const recordedAt = requireIso(input.recordedAt, "recordedAt");
  const supersedesPacketIds = requireUniqueStrings(
    input.supersedesPacketIds,
    "supersedesPacketIds"
  );
  if (supersedesPacketIds.includes(packetId)) {
    fail(PLAN_PUZZLE_SNAPSHOT_ERROR_CODES.SNAPSHOT_IDENTITY_MISMATCH, "packetId");
  }
  const topology = requireObject(input.topology, "topology");
  const persistence = requireObject(input.persistence, "persistence");

  const acceptedBinding = validateA11BundleBinding(input.acceptedBinding);
  const nativePlan = canonicalClone(input.nativePlan);
  requireNativePlanMatches(acceptedBinding, nativePlan);

  const { bundle, bundleHash, gateReceipt } = acceptedBinding;
  const snapshot = {
    packetId,
    schemaName: PLAN_PUZZLE_SNAPSHOT_SCHEMA_NAME,
    schemaVersion: PLAN_PUZZLE_SNAPSHOT_SCHEMA_VERSION,
    caseId: acceptedBinding.caseId,
    producerRole: "A9_CONVERTER",
    producerVersion,
    sourceDocumentId: acceptedBinding.sourceDocumentId,
    sourceDocumentVersionId: acceptedBinding.sourceDocumentVersionId,
    sourceDocumentSha256: acceptedBinding.sourceDocumentSha256,
    pageNumber: acceptedBinding.pageNumber,
    upstreamPacketIds: deriveUpstreamPacketIds(bundle, gateReceipt),
    evidenceReferences: canonicalClone(bundle.evidenceReferences),
    createdAt,
    recordedAt,
    processingStatus: "candidate_ready",
    supersedesPacketIds,
    humanReviewRequired: true,
    bundleId: bundle.packetId,
    bundleHash,
    gateReceiptId: gateReceipt.receiptId,
    converterVersion,
    nativeObjects: canonicalClone(nativePlan.objects),
    topology: canonicalClone(topology),
    scaleConfirmation: canonicalClone(nativePlan.userScaleConfirmation),
    evidenceBacklinks: canonicalClone(bundle.evidenceRegions),
    warnings: canonicalClone(bundle.warnings),
    unresolved: deriveUnresolved(nativePlan),
    uncertainty: canonicalClone(bundle.uncertainty),
    persistence: canonicalClone(persistence),
    a1BudgetFactsProjection: "hold",
    a0IntegrationAcceptance: "pending"
  };
  return validatePlanPuzzleSnapshot(snapshot);
}
