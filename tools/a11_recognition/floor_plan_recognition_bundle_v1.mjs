export const FLOOR_PLAN_BUNDLE_SCHEMA_NAME =
  "laibe.floor-plan-recognition-bundle.v1";
export const FLOOR_PLAN_BUNDLE_SCHEMA_VERSION = 1;

const LOWER_SHA256 = /^[0-9a-f]{64}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_ROUND_TRIP_TOLERANCE = 0.01;
const OBJECT_TYPES = new Set([
  "wall", "door", "window", "opening", "stair", "column",
  "sanitary_fixture", "fixed_cabinet", "dimension", "necessary_text",
  "critical_uncertainty"
]);
const OBJECT_DISPOSITIONS = new Set([
  "native_object_candidate", "locked_line_group", "locked_structural_reference",
  "exclude_from_canvas", "retained_locked_reference", "unresolved_required_review"
]);
const OBJECT_TYPE_DISPOSITION = Object.freeze({
  wall: "native_object_candidate",
  door: "native_object_candidate",
  window: "native_object_candidate",
  opening: "native_object_candidate",
  stair: "locked_line_group",
  column: "locked_structural_reference",
  sanitary_fixture: "exclude_from_canvas",
  fixed_cabinet: "exclude_from_canvas",
  dimension: "retained_locked_reference",
  necessary_text: "retained_locked_reference",
  critical_uncertainty: "unresolved_required_review"
});
const TOP_LEVEL_FIELDS = new Set([
  "schemaName", "schemaVersion", "packetId", "bundleId", "caseId",
  "producerRole", "producerVersion", "sourceDocumentId",
  "sourceDocumentVersionId", "sourceDocumentSha256", "pageNumber",
  "upstreamPacketIds", "evidenceReferences", "evidenceRegions",
  "releaseReceiptId", "createdAt", "recordedAt", "processingStatus",
  "uncertainty", "warnings", "supersedesPacketIds", "humanReviewRequired",
  "manifestHash", "bundleFactsHash", "sourceFrame", "recognitionAlgorithm",
  "algorithmVersion", "modelVersion", "ruleVersion", "parameterHash",
  "parameterSha256", "objects", "relations", "scaleEvidence",
  "validationRoleBindings"
]);
const REQUIRED_FIELDS = [
  "schemaName", "schemaVersion", "packetId", "caseId", "producerRole",
  "producerVersion", "sourceDocumentId", "sourceDocumentVersionId",
  "sourceDocumentSha256", "pageNumber", "upstreamPacketIds",
  "evidenceReferences", "evidenceRegions", "releaseReceiptId", "createdAt",
  "recordedAt", "processingStatus", "uncertainty", "warnings",
  "supersedesPacketIds", "humanReviewRequired", "manifestHash",
  "sourceFrame", "algorithmVersion", "modelVersion", "ruleVersion",
  "objects", "relations", "scaleEvidence", "validationRoleBindings"
];
const ARRAY_FIELDS = [
  "upstreamPacketIds", "evidenceReferences", "evidenceRegions", "uncertainty",
  "warnings", "supersedesPacketIds", "objects", "relations", "scaleEvidence"
];
const SOURCE_FRAME_FALLBACK_FIELDS = [
  "fallbackWidth", "fallbackHeight", "fallbackPageWidth", "fallbackPageHeight",
  "fixedFallback", "guessedBounds", "defaultPageSize"
];
const SOURCE_FRAME_FIELDS = new Set([
  "mediaBox", "cropBox", "userUnit", "rotationDegrees",
  "sourceBounds", "displayBounds",
  "sourceToDisplayTransform", "displayToSourceTransform",
  "roundTripTolerance"
]);
const SOURCE_FRAME_REQUIRED_FIELDS = [...SOURCE_FRAME_FIELDS];
const EVIDENCE_REGION_FIELDS = new Set([
  "evidenceId", "bounds", "evidenceHash"
]);
const EVIDENCE_REGION_REQUIRED_FIELDS = ["evidenceId", "bounds"];
const SCALE_EVIDENCE_FIELDS = new Set(["evidenceId", "confidence"]);
const SCALE_EVIDENCE_REQUIRED_FIELDS = ["evidenceId", "confidence"];
const VALIDATION_ROLE_BINDING_FIELDS = new Set(["technicalGateWriter"]);
const OBJECT_FIELDS = new Set([
  "objectId", "classToken", "sourceGeometry", "confidence",
  "disposition", "wallThicknessPt", "evidenceRegionIds"
]);
const OBJECT_REQUIRED_FIELDS = [
  "objectId", "classToken", "sourceGeometry", "confidence",
  "disposition", "evidenceRegionIds"
];
const SOURCE_GEOMETRY_FIELDS = new Set(["kind", "points"]);
const SOURCE_GEOMETRY_REQUIRED_FIELDS = ["kind", "points"];
const SOURCE_GEOMETRY_KINDS = new Set([
  "point", "segment", "polyline", "polygon"
]);
const RELATION_FIELDS = new Set([
  "relationId", "relationType", "sourceObjectId", "targetObjectId",
  "status", "confidence", "evidenceRegionIds"
]);
const RELATION_REQUIRED_FIELDS = [
  "relationId", "relationType", "sourceObjectId", "targetObjectId",
  "status", "confidence"
];
const RELATION_TYPES = new Set(["opening_hosted_by_wall"]);
const RELATION_STATUSES = new Set(["candidate", "confirmed", "unresolved"]);
const UNCERTAINTY_FIELDS = new Set([
  "uncertaintyId", "code", "severity", "disposition",
  "objectId", "evidenceRegionIds"
]);
const UNCERTAINTY_REQUIRED_FIELDS = [
  "uncertaintyId", "code", "severity", "disposition", "evidenceRegionIds"
];
const UNCERTAINTY_SEVERITIES = new Set(["warning", "critical"]);
const UNCERTAINTY_DISPOSITIONS = new Set([
  "unresolved_required_review",
  "retained_locked_reference",
  "exclude_from_canvas"
]);

class FloorPlanBundleContractError extends TypeError {
  constructor(code, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "FloorPlanBundleContractError";
    this.code = code;
  }
}

function fail(code, detail) {
  throw new FloorPlanBundleContractError(code, detail);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requirePlainObject(value, code, detail) {
  if (!isPlainObject(value)) fail(code, detail);
  return value;
}

function requireClosedObject(value, allowedFields, requiredFields, code, path) {
  const object = requirePlainObject(value, code, path);
  for (const key of Object.keys(object)) {
    if (!allowedFields.has(key)) fail("SCHEMA_UNKNOWN_FIELD", path + "." + key);
  }
  for (const field of requiredFields) {
    if (!Object.hasOwn(object, field)) fail(code, path + "." + field);
  }
  return object;
}

function requireNonEmptyString(value, code, detail) {
  if (typeof value !== "string" || value.trim() === "") fail(code, detail);
  return value;
}

function requireUniqueStringArray(value, code, path, allowEmpty = true) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(code, path);
  }
  const seen = new Set();
  for (const entry of value) {
    requireNonEmptyString(entry, code, path);
    if (seen.has(entry)) fail(code, path + " duplicate " + entry);
    seen.add(entry);
  }
  return seen;
}

function requireLowerSha256(value, code, detail) {
  if (typeof value !== "string" || !LOWER_SHA256.test(value)) fail(code, detail);
  return value;
}

function requireIsoTimestamp(value, field) {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) {
    fail("TIMESTAMP_INVALID", field);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("TIMESTAMP_INVALID", field);
  }
}

function requireFiniteNumber(value, code, detail) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(code, detail);
  return value;
}

function requireConfidence(value, code, detail) {
  requireFiniteNumber(value, code, detail);
  if (value < 0 || value > 1) fail(code, detail);
  return value;
}

function requireBox(value, field, code = "SOURCE_FRAME_BOX_INVALID") {
  if (!Array.isArray(value) || value.length !== 4 ||
      !value.every((entry) => typeof entry === "number" && Number.isFinite(entry)) ||
      !(value[0] < value[2]) || !(value[1] < value[3])) {
    fail(code, field);
  }
  return value;
}

function requireAffine(value, field) {
  if (!Array.isArray(value) || value.length !== 6 ||
      !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    fail("SOURCE_FRAME_TRANSFORM_INVALID", field);
  }
  const determinant = value[0] * value[3] - value[1] * value[2];
  if (!Number.isFinite(determinant) || determinant === 0) {
    fail("SOURCE_FRAME_TRANSFORM_INVALID", field + " is not invertible");
  }
  return value;
}

function boxInside(inner, outer, tolerance = 0) {
  return inner[0] >= outer[0] - tolerance &&
    inner[1] >= outer[1] - tolerance &&
    inner[2] <= outer[2] + tolerance &&
    inner[3] <= outer[3] + tolerance;
}

function boxCorners(box) {
  return [
    [box[0], box[1]],
    [box[2], box[1]],
    [box[2], box[3]],
    [box[0], box[3]]
  ];
}

function applyAffine(transform, point) {
  return [
    transform[0] * point[0] + transform[2] * point[1] + transform[4],
    transform[1] * point[0] + transform[3] * point[1] + transform[5]
  ];
}

function requirePointNear(actual, expected, tolerance, code, detail) {
  if (Math.abs(actual[0] - expected[0]) > tolerance ||
      Math.abs(actual[1] - expected[1]) > tolerance) {
    fail(code, detail);
  }
}

function transformedExtent(box, transform) {
  const points = boxCorners(box).map((point) => applyAffine(transform, point));
  const x = points.map((point) => point[0]);
  const y = points.map((point) => point[1]);
  return [Math.min(...x), Math.min(...y), Math.max(...x), Math.max(...y)];
}

function validateSourceFrame(value) {
  const frame = requireClosedObject(
    value,
    SOURCE_FRAME_FIELDS,
    SOURCE_FRAME_REQUIRED_FIELDS,
    "SOURCE_FRAME_INVALID",
    "sourceFrame"
  );
  for (const field of SOURCE_FRAME_FALLBACK_FIELDS) {
    if (Object.hasOwn(frame, field)) fail("SOURCE_FRAME_FALLBACK_FORBIDDEN", field);
  }
  const mediaBox = requireBox(frame.mediaBox, "mediaBox");
  const cropBox = requireBox(frame.cropBox, "cropBox");
  const sourceBounds = requireBox(frame.sourceBounds, "sourceBounds");
  const displayBounds = requireBox(frame.displayBounds, "displayBounds");
  requireFiniteNumber(frame.userUnit, "SOURCE_FRAME_USER_UNIT_INVALID", "userUnit");
  if (!(frame.userUnit > 0)) fail("SOURCE_FRAME_USER_UNIT_INVALID", "userUnit");
  if (!Number.isInteger(frame.rotationDegrees) ||
      ![0, 90, 180, 270].includes(frame.rotationDegrees)) {
    fail("SOURCE_FRAME_ROTATION_INVALID", "rotationDegrees");
  }
  const sourceToDisplay = requireAffine(
    frame.sourceToDisplayTransform,
    "sourceToDisplayTransform"
  );
  const displayToSource = requireAffine(
    frame.displayToSourceTransform,
    "displayToSourceTransform"
  );
  requireFiniteNumber(
    frame.roundTripTolerance,
    "SOURCE_FRAME_TOLERANCE_INVALID",
    "roundTripTolerance"
  );
  if (frame.roundTripTolerance < 0 ||
      frame.roundTripTolerance > MAX_ROUND_TRIP_TOLERANCE) {
    fail("SOURCE_FRAME_TOLERANCE_INVALID", "roundTripTolerance");
  }

  const tolerance = frame.roundTripTolerance;
  if (!boxInside(cropBox, mediaBox, tolerance)) {
    fail("SOURCE_FRAME_CROP_OUTSIDE_MEDIA_BOX", "cropBox");
  }
  for (let index = 0; index < 4; index += 1) {
    if (Math.abs(sourceBounds[index] - cropBox[index]) > tolerance) {
      fail("SOURCE_FRAME_SOURCE_BOUNDS_MISMATCH", "sourceBounds");
    }
  }

  for (const sourcePoint of boxCorners(sourceBounds)) {
    const displayPoint = applyAffine(sourceToDisplay, sourcePoint);
    requirePointNear(
      applyAffine(displayToSource, displayPoint),
      sourcePoint,
      tolerance,
      "SOURCE_FRAME_ROUND_TRIP_INVALID",
      "source -> display -> source"
    );
  }
  for (const displayPoint of boxCorners(displayBounds)) {
    const sourcePoint = applyAffine(displayToSource, displayPoint);
    requirePointNear(
      applyAffine(sourceToDisplay, sourcePoint),
      displayPoint,
      tolerance,
      "SOURCE_FRAME_ROUND_TRIP_INVALID",
      "display -> source -> display"
    );
  }

  const actualDisplayBounds = transformedExtent(sourceBounds, sourceToDisplay);
  for (let index = 0; index < 4; index += 1) {
    if (Math.abs(actualDisplayBounds[index] - displayBounds[index]) > tolerance) {
      fail("SOURCE_FRAME_DISPLAY_BOUNDS_MISMATCH", "displayBounds[" + index + "]");
    }
  }
  return frame;
}
function validateEvidenceRegions(values, sourceFrame, evidenceReferenceIds) {
  const evidenceRegionIds = new Set();
  values.forEach((value, index) => {
    const path = "evidenceRegions[" + index + "]";
    const region = requireClosedObject(
      value,
      EVIDENCE_REGION_FIELDS,
      EVIDENCE_REGION_REQUIRED_FIELDS,
      "EVIDENCE_REGION_INVALID",
      path
    );
    const evidenceId = requireNonEmptyString(
      region.evidenceId,
      "EVIDENCE_REGION_ID_INVALID",
      path
    );
    if (evidenceRegionIds.has(evidenceId)) {
      fail("EVIDENCE_REGION_ID_DUPLICATE", evidenceId);
    }
    if (!evidenceReferenceIds.has(evidenceId)) {
      fail("EVIDENCE_REFERENCE_MISSING", evidenceId);
    }
    const bounds = requireBox(
      region.bounds,
      path + ".bounds",
      "EVIDENCE_REGION_BOUNDS_INVALID"
    );
    if (!boxInside(bounds, sourceFrame.sourceBounds, sourceFrame.roundTripTolerance)) {
      fail("EVIDENCE_REGION_OUTSIDE_SOURCE_FRAME", evidenceId);
    }
    if (Object.hasOwn(region, "evidenceHash")) {
      requireLowerSha256(region.evidenceHash, "EVIDENCE_HASH_INVALID", evidenceId);
    }
    evidenceRegionIds.add(evidenceId);
  });
  return evidenceRegionIds;
}

function validateEvidenceRegionIds(
  value,
  path,
  evidenceRegionIds,
  allowEmpty = true
) {
  if (value === undefined) return;
  const ids = requireUniqueStringArray(
    value,
    "EVIDENCE_REGION_IDS_INVALID",
    path,
    allowEmpty
  );
  for (const id of ids) {
    if (!evidenceRegionIds.has(id)) {
      fail("EVIDENCE_REGION_REFERENCE_MISSING", id);
    }
  }
}

function validateSourceGeometry(value, path, sourceFrame) {
  const geometry = requireClosedObject(
    value,
    SOURCE_GEOMETRY_FIELDS,
    SOURCE_GEOMETRY_REQUIRED_FIELDS,
    "OBJECT_GEOMETRY_INVALID",
    path
  );
  if (!SOURCE_GEOMETRY_KINDS.has(geometry.kind)) {
    fail("OBJECT_GEOMETRY_KIND_INVALID", path);
  }
  if (!Array.isArray(geometry.points)) {
    fail("OBJECT_GEOMETRY_POINTS_INVALID", path);
  }
  const exactPointCount = { point: 1, segment: 2 }[geometry.kind];
  if ((exactPointCount !== undefined &&
       geometry.points.length !== exactPointCount) ||
      (geometry.kind === "polyline" && geometry.points.length < 2) ||
      (geometry.kind === "polygon" && geometry.points.length < 3)) {
    fail("OBJECT_GEOMETRY_POINTS_INVALID", path);
  }
  geometry.points.forEach((point, index) => {
    if (!Array.isArray(point) || point.length !== 2 ||
        !point.every((coordinate) =>
          typeof coordinate === "number" && Number.isFinite(coordinate))) {
      fail("OBJECT_GEOMETRY_POINT_INVALID", path + ".points[" + index + "]");
    }
    const bounds = sourceFrame.sourceBounds;
    const tolerance = sourceFrame.roundTripTolerance;
    if (point[0] < bounds[0] - tolerance ||
        point[0] > bounds[2] + tolerance ||
        point[1] < bounds[1] - tolerance ||
        point[1] > bounds[3] + tolerance) {
      fail(
        "OBJECT_GEOMETRY_OUTSIDE_SOURCE_FRAME",
        path + ".points[" + index + "]"
      );
    }
  });
}

function validateObject(
  value,
  index,
  objectClasses,
  sourceFrame,
  evidenceRegionIds
) {
  const path = "objects[" + index + "]";
  const object = requireClosedObject(
    value,
    OBJECT_FIELDS,
    OBJECT_REQUIRED_FIELDS,
    "OBJECT_INVALID",
    path
  );
  const objectId = requireNonEmptyString(object.objectId, "OBJECT_ID_INVALID", path);
  if (objectClasses.has(objectId)) fail("OBJECT_ID_DUPLICATE", objectId);
  if (typeof object.classToken !== "string" ||
      !OBJECT_TYPES.has(object.classToken)) {
    fail("OBJECT_TYPE_INVALID", objectId);
  }
  requireConfidence(object.confidence, "OBJECT_CONFIDENCE_INVALID", objectId);
  if (typeof object.disposition !== "string" ||
      !OBJECT_DISPOSITIONS.has(object.disposition)) {
    fail("OBJECT_DISPOSITION_INVALID", objectId);
  }
  if (object.disposition !== OBJECT_TYPE_DISPOSITION[object.classToken]) {
    fail("OBJECT_DISPOSITION_CLASS_MISMATCH", objectId);
  }
  validateSourceGeometry(
    object.sourceGeometry,
    path + ".sourceGeometry",
    sourceFrame
  );
  validateEvidenceRegionIds(
    object.evidenceRegionIds,
    path + ".evidenceRegionIds",
    evidenceRegionIds,
    false
  );
  if (object.classToken === "wall") {
    requireFiniteNumber(object.wallThicknessPt, "WALL_THICKNESS_INVALID", objectId);
    if (!(object.wallThicknessPt > 0)) {
      fail("WALL_THICKNESS_INVALID", objectId);
    }
  } else if (Object.hasOwn(object, "wallThicknessPt")) {
    fail("OBJECT_FIELD_FORBIDDEN", objectId + ".wallThicknessPt");
  }
  objectClasses.set(objectId, object.classToken);
}

function validateRelation(
  value,
  index,
  relationIds,
  objectClasses,
  evidenceRegionIds,
  confirmedHostCounts
) {
  const path = "relations[" + index + "]";
  const relation = requireClosedObject(
    value,
    RELATION_FIELDS,
    RELATION_REQUIRED_FIELDS,
    "RELATION_INVALID",
    path
  );
  const relationId = requireNonEmptyString(
    relation.relationId,
    "RELATION_ID_INVALID",
    path
  );
  if (relationIds.has(relationId)) {
    fail("RELATION_ID_DUPLICATE", relationId);
  }
  relationIds.add(relationId);
  if (!RELATION_TYPES.has(relation.relationType)) {
    fail("RELATION_TYPE_INVALID", relationId);
  }
  if (!RELATION_STATUSES.has(relation.status)) {
    fail("RELATION_STATUS_INVALID", relationId);
  }
  const sourceObjectId = requireNonEmptyString(
    relation.sourceObjectId,
    "RELATION_SOURCE_INVALID",
    relationId
  );
  const targetObjectId = requireNonEmptyString(
    relation.targetObjectId,
    "RELATION_TARGET_INVALID",
    relationId
  );
  if (!objectClasses.has(sourceObjectId) ||
      !objectClasses.has(targetObjectId)) {
    fail("RELATION_OBJECT_MISSING", relationId);
  }
  requireConfidence(
    relation.confidence,
    "RELATION_CONFIDENCE_INVALID",
    relationId
  );
  if (relation.relationType === "opening_hosted_by_wall" &&
      (!new Set(["door", "window", "opening"]).has(
        objectClasses.get(sourceObjectId)
      ) ||
       objectClasses.get(targetObjectId) !== "wall")) {
    fail("RELATION_CLASS_BINDING_INVALID", relationId);
  }
  validateEvidenceRegionIds(
    relation.evidenceRegionIds,
    path + ".evidenceRegionIds",
    evidenceRegionIds
  );
  if (relation.relationType === "opening_hosted_by_wall" &&
      relation.status === "confirmed") {
    confirmedHostCounts.set(
      sourceObjectId,
      (confirmedHostCounts.get(sourceObjectId) || 0) + 1
    );
  }
}

function validateOpeningHostRelations(objectClasses, confirmedHostCounts) {
  for (const [objectId, classToken] of objectClasses) {
    if (classToken === "door" ||
        classToken === "window" ||
        classToken === "opening") {
      if (confirmedHostCounts.get(objectId) !== 1) {
        fail("CONFIRMED_HOST_RELATION_REQUIRED", objectId);
      }
    }
  }
}

function validateScaleEvidence(values, evidenceRegionIds) {
  const seen = new Set();
  values.forEach((value, index) => {
    const path = "scaleEvidence[" + index + "]";
    const evidence = requireClosedObject(
      value,
      SCALE_EVIDENCE_FIELDS,
      SCALE_EVIDENCE_REQUIRED_FIELDS,
      "SCALE_EVIDENCE_INVALID",
      path
    );
    const evidenceId = requireNonEmptyString(
      evidence.evidenceId,
      "SCALE_EVIDENCE_ID_INVALID",
      path
    );
    if (seen.has(evidenceId)) {
      fail("SCALE_EVIDENCE_ID_DUPLICATE", evidenceId);
    }
    if (!evidenceRegionIds.has(evidenceId)) {
      fail("SCALE_EVIDENCE_REGION_MISSING", evidenceId);
    }
    requireConfidence(
      evidence.confidence,
      "SCALE_EVIDENCE_CONFIDENCE_INVALID",
      evidenceId
    );
    seen.add(evidenceId);
  });
}

function validateValidationRoleBindings(value) {
  const bindings = requireClosedObject(
    value,
    VALIDATION_ROLE_BINDING_FIELDS,
    ["technicalGateWriter"],
    "VALIDATION_ROLE_BINDINGS_INVALID",
    "validationRoleBindings"
  );
  if (bindings.technicalGateWriter !== "A11_VALIDATOR") {
    fail("VALIDATION_ROLE_BINDING_MISMATCH", "technicalGateWriter");
  }
}

function validateUncertainty(values, objectClasses, evidenceRegionIds) {
  const seen = new Set();
  values.forEach((value, index) => {
    const path = "uncertainty[" + index + "]";
    const uncertainty = requireClosedObject(
      value,
      UNCERTAINTY_FIELDS,
      UNCERTAINTY_REQUIRED_FIELDS,
      "UNCERTAINTY_INVALID",
      path
    );
    const id = requireNonEmptyString(
      uncertainty.uncertaintyId,
      "UNCERTAINTY_ID_INVALID",
      path
    );
    if (seen.has(id)) fail("UNCERTAINTY_ID_DUPLICATE", id);
    requireNonEmptyString(
      uncertainty.code,
      "UNCERTAINTY_CODE_INVALID",
      id
    );
    if (!UNCERTAINTY_SEVERITIES.has(uncertainty.severity)) {
      fail("UNCERTAINTY_SEVERITY_INVALID", id);
    }
    if (!UNCERTAINTY_DISPOSITIONS.has(uncertainty.disposition)) {
      fail("UNCERTAINTY_DISPOSITION_INVALID", id);
    }
    if (Object.hasOwn(uncertainty, "objectId") &&
        !objectClasses.has(uncertainty.objectId)) {
      fail("UNCERTAINTY_OBJECT_MISSING", id);
    }
    validateEvidenceRegionIds(
      uncertainty.evidenceRegionIds,
      path + ".evidenceRegionIds",
      evidenceRegionIds
    );
    seen.add(id);
  });
}

function normalizeCanonical(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("CANONICAL_NUMBER_INVALID");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") fail("CANONICAL_VALUE_INVALID");
  if (ancestors.has(value)) fail("CANONICAL_CYCLE_FORBIDDEN");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const output = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) fail("CANONICAL_SPARSE_ARRAY");
        output.push(normalizeCanonical(value[index], ancestors));
      }
      return output;
    }
    if (!isPlainObject(value) || Object.getOwnPropertySymbols(value).length > 0) {
      fail("CANONICAL_OBJECT_INVALID");
    }
    const output = {};
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
        fail("CANONICAL_VALUE_INVALID", key);
      }
      output[key] = normalizeCanonical(entry, ancestors);
    }
    return output;
  } finally {
    ancestors.delete(value);
  }
}

function utf8Bytes(text) {
  const bytes = [];
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < text.length) {
      const low = text.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
        index += 1;
      }
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >>> 12), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >>> 18), 0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
  }
  return bytes;
}

function rotateRight(value, count) {
  return (value >>> count) | (value << (32 - count));
}

function sha256Hex(text) {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const bytes = utf8Bytes(text);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  bytes.push((high >>> 24) & 0xff, (high >>> 16) & 0xff, (high >>> 8) & 0xff,
    high & 0xff, (low >>> 24) & 0xff, (low >>> 16) & 0xff, (low >>> 8) & 0xff, low & 0xff);

  const words = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const cursor = offset + index * 4;
      words[index] = ((bytes[cursor] << 24) | (bytes[cursor + 1] << 16) |
        (bytes[cursor + 2] << 8) | bytes[cursor + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const first = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const second = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + first + words[index - 7] + second) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const upperE = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporaryOne = (h + upperE + choice + constants[index] + words[index]) >>> 0;
      const upperA = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporaryTwo = (upperA + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temporaryOne) >>> 0;
      d = c; c = b; b = a; a = (temporaryOne + temporaryTwo) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

export function hashCanonicalValue(value) {
  return sha256Hex(JSON.stringify(normalizeCanonical(value)));
}

function bundleFactsProjection(bundle) {
  const projection = {};
  for (const key of Object.keys(bundle)) {
    if (key !== "bundleFactsHash") projection[key] = bundle[key];
  }
  return normalizeCanonical(projection);
}

function validateBundleStructure(value, requireFactsHash) {
  const bundle = requirePlainObject(
    value,
    "BUNDLE_INVALID",
    "bundle must be a plain object"
  );
  for (const key of Object.keys(bundle)) {
    if (!TOP_LEVEL_FIELDS.has(key)) fail("SCHEMA_UNKNOWN_FIELD", key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(bundle, field)) {
      fail("SCHEMA_REQUIRED_FIELD", field);
    }
  }
  if (requireFactsHash && !Object.hasOwn(bundle, "bundleFactsHash")) {
    fail("SCHEMA_REQUIRED_FIELD", "bundleFactsHash");
  }
  requireNonEmptyString(bundle.packetId, "PACKET_ID_INVALID", "packetId");
  if (Object.hasOwn(bundle, "bundleId") &&
      bundle.bundleId !== bundle.packetId) {
    fail("PACKET_ID_MISMATCH", "bundleId");
  }
  if (bundle.schemaName !== FLOOR_PLAN_BUNDLE_SCHEMA_NAME) {
    fail("SCHEMA_NAME_MISMATCH");
  }
  if (bundle.schemaVersion !== FLOOR_PLAN_BUNDLE_SCHEMA_VERSION) {
    fail("SCHEMA_VERSION_MISMATCH");
  }
  if (bundle.producerRole !== "A11_RECOGNIZER") {
    fail("PRODUCER_ROLE_MISMATCH");
  }
  requireNonEmptyString(bundle.caseId, "CASE_ID_INVALID", "caseId");
  requireNonEmptyString(
    bundle.producerVersion,
    "PRODUCER_VERSION_INVALID",
    "producerVersion"
  );
  requireNonEmptyString(
    bundle.sourceDocumentId,
    "SOURCE_DOCUMENT_ID_INVALID",
    "sourceDocumentId"
  );
  requireNonEmptyString(
    bundle.sourceDocumentVersionId,
    "SOURCE_DOCUMENT_VERSION_ID_INVALID",
    "sourceDocumentVersionId"
  );
  requireLowerSha256(
    bundle.sourceDocumentSha256,
    "SOURCE_SHA256_INVALID",
    "sourceDocumentSha256"
  );
  /*
   * External bindings only: shape is validated and both values participate in
   * bundleFactsHash. This module does not prove manifest bytes or the release
   * receipt identified by releaseReceiptId.
   */
  requireLowerSha256(
    bundle.manifestHash,
    "MANIFEST_HASH_INVALID",
    "manifestHash"
  );
  if (requireFactsHash) {
    requireLowerSha256(
      bundle.bundleFactsHash,
      "BUNDLE_FACTS_HASH_INVALID",
      "bundleFactsHash"
    );
  }
  if (!Number.isInteger(bundle.pageNumber) || bundle.pageNumber < 1) {
    fail("PAGE_NUMBER_INVALID");
  }
  if (bundle.processingStatus !== "candidate_ready") {
    fail("PROCESSING_STATUS_MISMATCH");
  }
  if (bundle.humanReviewRequired !== true) {
    fail("HUMAN_REVIEW_REQUIRED_MISMATCH");
  }
  requireIsoTimestamp(bundle.createdAt, "createdAt");
  requireIsoTimestamp(bundle.recordedAt, "recordedAt");
  if (bundle.recordedAt < bundle.createdAt) {
    fail("TIMESTAMP_ORDER_INVALID", "recordedAt before createdAt");
  }
  requireNonEmptyString(
    bundle.releaseReceiptId,
    "RELEASE_RECEIPT_ID_INVALID",
    "releaseReceiptId"
  );
  requireNonEmptyString(
    bundle.algorithmVersion,
    "ALGORITHM_VERSION_INVALID",
    "algorithmVersion"
  );
  requireNonEmptyString(
    bundle.modelVersion,
    "MODEL_VERSION_INVALID",
    "modelVersion"
  );
  requireNonEmptyString(
    bundle.ruleVersion,
    "RULE_VERSION_INVALID",
    "ruleVersion"
  );
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(bundle[field])) {
      fail("ARRAY_FIELD_INVALID", field);
    }
  }
  requireUniqueStringArray(
    bundle.upstreamPacketIds,
    "UPSTREAM_PACKET_IDS_INVALID",
    "upstreamPacketIds"
  );
  const evidenceReferenceIds = requireUniqueStringArray(
    bundle.evidenceReferences,
    "EVIDENCE_REFERENCES_INVALID",
    "evidenceReferences",
    false
  );
  const supersedesPacketIds = requireUniqueStringArray(
    bundle.supersedesPacketIds,
    "SUPERSEDES_PACKET_IDS_INVALID",
    "supersedesPacketIds"
  );
  if (supersedesPacketIds.has(bundle.packetId)) {
    fail("PACKET_SELF_SUPERSESSION_FORBIDDEN", bundle.packetId);
  }
  if (bundle.warnings.some((warning) =>
    typeof warning !== "string" || warning.trim() === "")) {
    fail("WARNINGS_INVALID", "warnings");
  }
  validateValidationRoleBindings(bundle.validationRoleBindings);
  if (Object.hasOwn(bundle, "recognitionAlgorithm")) {
    requirePlainObject(
      bundle.recognitionAlgorithm,
      "RECOGNITION_ALGORITHM_INVALID",
      "recognitionAlgorithm"
    );
  }
  for (const field of ["parameterHash", "parameterSha256"]) {
    if (Object.hasOwn(bundle, field)) {
      requireLowerSha256(
        bundle[field],
        "PARAMETER_HASH_MISMATCH",
        field
      );
    }
  }
  if (Object.hasOwn(bundle, "parameterHash") &&
      Object.hasOwn(bundle, "parameterSha256") &&
      bundle.parameterHash !== bundle.parameterSha256) {
    fail("PARAMETER_HASH_MISMATCH", "parameterHash != parameterSha256");
  }

  const sourceFrame = validateSourceFrame(bundle.sourceFrame);
  const evidenceRegionIds = validateEvidenceRegions(
    bundle.evidenceRegions,
    sourceFrame,
    evidenceReferenceIds
  );
  const objectClasses = new Map();
  bundle.objects.forEach((object, index) =>
    validateObject(
      object,
      index,
      objectClasses,
      sourceFrame,
      evidenceRegionIds
    ));
  const relationIds = new Set();
  const confirmedHostCounts = new Map();
  bundle.relations.forEach((relation, index) =>
    validateRelation(
      relation,
      index,
      relationIds,
      objectClasses,
      evidenceRegionIds,
      confirmedHostCounts
    ));
  validateOpeningHostRelations(objectClasses, confirmedHostCounts);
  validateScaleEvidence(bundle.scaleEvidence, evidenceRegionIds);
  validateUncertainty(bundle.uncertainty, objectClasses, evidenceRegionIds);

  const canonical = normalizeCanonical(bundle);
  if (requireFactsHash) {
    const expected = hashCanonicalValue(bundleFactsProjection(canonical));
    if (canonical.bundleFactsHash !== expected) {
      fail("BUNDLE_FACTS_HASH_MISMATCH", "bundleFactsHash");
    }
  }
  return canonical;
}

export function computeFloorPlanBundleFactsHash(value) {
  const candidate = {
    ...requirePlainObject(value, "BUNDLE_INVALID", "bundle")
  };
  delete candidate.bundleFactsHash;
  const facts = validateBundleStructure(candidate, false);
  return hashCanonicalValue(bundleFactsProjection(facts));
}

export function validateFloorPlanRecognitionBundle(value) {
  return validateBundleStructure(value, true);
}

export function canonicalizeFloorPlanBundle(bundle) {
  return validateFloorPlanRecognitionBundle(bundle);
}

export function hashFloorPlanRecognitionBundle(bundle) {
  return hashCanonicalValue(validateFloorPlanRecognitionBundle(bundle));
}

export function createFloorPlanRecognitionBundle(input) {
  const candidate = requirePlainObject(input, "BUNDLE_INVALID", "bundle");
  if (Object.hasOwn(candidate, "bundleFactsHash")) {
    fail("BUNDLE_FACTS_HASH_CALLER_FORBIDDEN", "bundleFactsHash");
  }
  const facts = validateBundleStructure(candidate, false);
  const bundleFactsHash = hashCanonicalValue(bundleFactsProjection(facts));
  return validateBundleStructure({ ...facts, bundleFactsHash }, true);
}
