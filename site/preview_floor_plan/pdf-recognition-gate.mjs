import {
  PDF_DIMENSION_SCALE_SCHEMA,
  stableScaleDecisionHash
} from "./pdf-dimension-scale-decision.mjs";

export const PDF_RECOGNITION_KIND_DISPOSITIONS = Object.freeze({
  wall: Object.freeze({ category: "native_wall_target" }),
  door: Object.freeze({ category: "existing_door_candidate" }),
  window: Object.freeze({ category: "existing_window_candidate" }),
  opening: Object.freeze({ category: "generic_opening_candidate" }),
  stair: Object.freeze({ category: "locked_stair_line_group", locked: true }),
  bathroom_fixture: Object.freeze({ category: "excluded_bathroom_fixture", excluded: true }),
  fixed_cabinet: Object.freeze({ category: "excluded_fixed_cabinet", excluded: true }),
  structural_column: Object.freeze({ category: "locked_structural_column", locked: true }),
  dimension_annotation: Object.freeze({ category: "locked_dimension_annotation", locked: true }),
  text_annotation: Object.freeze({ category: "locked_text_annotation", locked: true })
});

const CATEGORY_COLORS = Object.freeze({
  native_wall_target: "#00C2FF",
  existing_door_candidate: "#21D07A",
  existing_window_candidate: "#65E8FF",
  generic_opening_candidate: "#B8FF6A",
  locked_stair_line_group: "#B481FF",
  excluded_bathroom_fixture: "#FF7A45",
  excluded_fixed_cabinet: "#FFB547",
  locked_structural_column: "#FFD95A",
  locked_dimension_annotation: "#4E8DFF",
  locked_text_annotation: "#8DA2B8",
  unresolved_important: "#FF3E67",
  unresolved: "#A5B2BF"
});

const CATEGORY_LABELS = Object.freeze({
  native_wall_target: "原生牆候選",
  existing_door_candidate: "既有門候選",
  existing_window_candidate: "既有窗候選",
  generic_opening_candidate: "一般開口候選",
  locked_stair_line_group: "鎖定樓梯線群",
  excluded_bathroom_fixture: "排除衛浴設備",
  excluded_fixed_cabinet: "排除固定櫃體",
  locked_structural_column: "鎖定結構柱",
  locked_dimension_annotation: "鎖定尺寸標註",
  locked_text_annotation: "鎖定文字標註",
  unresolved_important: "重要待確認",
  unresolved: "待確認"
});

const CATEGORY_ORDER = Object.freeze(Object.keys(CATEGORY_COLORS));
const DEFAULT_REGION_ID = "page-1-full-page";
const SCENE_OBJECT_COLLECTIONS = Object.freeze([
  "structuralWalls",
  "openingCandidates",
  "stairCandidates",
  "bathroomFixtureCandidates",
  "fixedCabinetCandidates",
  "unresolvedSymbolCandidates",
  "columns",
  "dimensionLines",
  "decodedTextRuns",
  "glyphClusters",
  "stairVoidCandidates",
  "spaceBoundaryCandidates"
]);

const asArray = (value) => Array.isArray(value) ? value : [];
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const sourceIdOf = (item, fallback) => String(
  item && (item.sourceId || item.source_object_id || item.id || item.sourceExtractorId) || fallback
);
const regionIdOf = (item) => String(item && item.sourceRegionId || "");
const bboxOf = (item) => clone(item && (item.sourceBBox || item.bbox || item.geometry && item.geometry.bbox) || null);
const evidenceOf = (item) => item && (item.evidence || item.geometry && item.geometry.evidence) || {};

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function stableFingerprint(value) {
  const text = stableStringify(value);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16777619);
    second ^= code + index;
    second = Math.imul(second, 2246822519);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function sameValue(first, second) {
  return stableStringify(first) === stableStringify(second);
}

function sortedUniqueStrings(values) {
  return [...new Set(asArray(values).map((value) => String(value || "")).filter(Boolean))].sort();
}

function lineGeometry(line) {
  if (!line || typeof line !== "object") return null;
  const p1 = line.p1 || line.pageFrom || line.from;
  const p2 = line.p2 || line.pageTo || line.to;
  const values = [p1 && p1.x, p1 && p1.y, p2 && p2.x, p2 && p2.y].map(Number);
  if (!values.every(Number.isFinite)) return null;
  return {
    id: String(line.id || ""),
    p1: { x: values[0], y: values[1] },
    p2: { x: values[2], y: values[3] },
    coordinateFrame: String(line.coordinateFrame || "page-bottom-left-pdf-pt")
  };
}

function stairRoleGeometry(evidence, idsKey, linesKey, minimumCount) {
  const suppliedIds = asArray(evidence && evidence[idsKey])
    .map((id) => String(id || ""))
    .filter(Boolean);
  const ids = sortedUniqueStrings(suppliedIds);
  const suppliedLines = asArray(evidence && evidence[linesKey]);
  const linesById = new Map();
  let sourceGeometryAuthentic = true;
  suppliedLines.forEach((line) => {
    const normalized = lineGeometry(line);
    const id = normalized && normalized.id;
    if (!id ||
      String(line.operatorLineId || "") !== id ||
      String(line.sourceEvidence || "") !== "pdf_operator_line_geometry" ||
      linesById.has(id)) {
      sourceGeometryAuthentic = false;
      return;
    }
    linesById.set(id, normalized);
  });
  const lineIds = sortedUniqueStrings(Array.from(linesById.keys()));
  const valid = suppliedIds.length === ids.length &&
    suppliedLines.length === linesById.size &&
    ids.length >= minimumCount &&
    sameValue(ids, lineIds) &&
    sourceGeometryAuthentic;
  return {
    ids,
    lines: ids.map((id) => linesById.get(id)).filter(Boolean),
    valid
  };
}

function completeStairEvidence(item) {
  const evidence = evidenceOf(item);
  const roles = {
    treads: stairRoleGeometry(evidence, "treadLineIds", "treadLines", 5),
    boundaries: stairRoleGeometry(evidence, "boundaryLineIds", "boundaryLines", 2),
    landing: stairRoleGeometry(evidence, "landingLineIds", "landingLines", 1),
    stairMarker: stairRoleGeometry(evidence, "markerLineIds", "markerLines", 4)
  };
  const requiredRoleStatus = evidence.requiredRoleStatus || {};
  const roleStatusAuthentic = Object.keys(roles).every(
    (role) => requiredRoleStatus[role] === "geometry_bound"
  );
  const lineIndex = new Map();
  Object.values(roles).forEach((role) => role.lines.forEach((line) => {
    if (!lineIndex.has(line.id)) lineIndex.set(line.id, line);
  }));
  const completeLineIds = sortedUniqueStrings(
    Object.values(roles).flatMap((role) => role.ids)
  );
  const completeLines = completeLineIds.map((id) => lineIndex.get(id)).filter(Boolean);
  const requiredRolesComplete = evidence.requiredRolesComplete === true &&
    roleStatusAuthentic &&
    Object.values(roles).every((role) => role.valid) &&
    completeLines.length === completeLineIds.length;
  return {
    treadLineIds: roles.treads.ids,
    treadLines: roles.treads.lines,
    boundaryLineIds: roles.boundaries.ids,
    boundaryLines: roles.boundaries.lines,
    landingLineIds: roles.landing.ids,
    landingLines: roles.landing.lines,
    markerLineIds: roles.stairMarker.ids,
    markerLines: roles.stairMarker.lines,
    requiredRoleStatus: clone(requiredRoleStatus),
    requiredRolesComplete,
    completeCoverage: clone(evidence.completeCoverage || null),
    roleAbsentEvidence: clone(evidence.roleAbsentEvidence || null),
    roleRelationEvidence: clone(evidence.roleRelationEvidence || null),
    unresolvedReason: requiredRolesComplete
      ? null
      : String(evidence.unresolvedReason || "missing_verified_stair_source_geometry"),
    completeLineIds,
    completeLines
  };
}

function openingCandidate(item, index) {
  const subtype = String(item && item.subtype || "opening").toLowerCase();
  const hostSourceIds = asArray(evidenceOf(item).hostWallSourceIds).map(String);
  const kind = subtype === "window" || subtype.includes("window")
    ? "window"
    : subtype === "door" || subtype.includes("door")
      ? "door"
      : "opening";
  return {
    ...clone(item),
    id: sourceIdOf(item, `opening-${index + 1}`),
    kind,
    sourceBBox: bboxOf(item),
    sourceLineIds: asArray(item && item.sourcePathIds).map(String),
    hostRelation: {
      relation: "interrupts_wall",
      hostSourceIds,
      status: hostSourceIds.length ? "host_candidate_present" : "host_candidate_missing"
    }
  };
}

function sourceCandidate(item, kind, index, collection, extras = {}) {
  return {
    ...clone(item),
    id: sourceIdOf(item, `${kind}-${index + 1}`),
    kind,
    sourceCollection: collection,
    sourceBBox: bboxOf(item),
    sourceLineIds: asArray(item && item.sourcePathIds).map(String),
    ...extras
  };
}

export function candidatesFromObjectizationScene(scene = {}) {
  if (Array.isArray(scene.candidates)) {
    return scene.candidates.map((candidate) => {
      const copy = clone(candidate);
      if (copy.kind !== "stair") return copy;
      const suppliedEvidence = copy.evidence || copy.sourcePayload || {};
      const completeEvidence = completeStairEvidence({ evidence: suppliedEvidence });
      return {
        ...copy,
        sourceLineIds: completeEvidence.treadLineIds,
        sourcePayload: {
          ...clone(copy.sourcePayload || {}),
          ...completeEvidence
        }
      };
    });
  }
  return []
    .concat(asArray(scene.structuralWalls).map((item, index) => sourceCandidate(
      item,
      "wall",
      index,
      "structuralWalls",
      { sourceGeometry: { p1: clone(item.p1), p2: clone(item.p2), thicknessPt: Number(item.width) || null } }
    )))
    .concat(asArray(scene.openingCandidates).map(openingCandidate))
    .concat(asArray(scene.stairCandidates).map((item, index) => {
      const evidence = evidenceOf(item);
      const completeEvidence = completeStairEvidence(item);
      return sourceCandidate(item, "stair", index, "stairCandidates", {
        sourceLineIds: asArray(evidence.treadLineIds).map(String),
        sourcePayload: {
          treadCount: Number(evidence.treadCount) || 0,
          boundedEnvelope: clone(evidence.boundedEnvelope || null),
          detectorPredicate: clone(evidence.detectorPredicate || null),
          ...completeEvidence
        }
      });
    }))
    .concat(asArray(scene.bathroomFixtureCandidates).map((item, index) =>
      sourceCandidate(item, "bathroom_fixture", index, "bathroomFixtureCandidates")))
    .concat(asArray(scene.fixedCabinetCandidates).map((item, index) =>
      sourceCandidate(item, "fixed_cabinet", index, "fixedCabinetCandidates")))
    .concat(asArray(scene.unresolvedSymbolCandidates).map((item, index) =>
      sourceCandidate(item, "unknown", index, "unresolvedSymbolCandidates", {
        importance: "important",
        sourcePayload: {
          reason: "visible_symbol_requires_classification_review",
          evidence: clone(evidenceOf(item))
        }
      })))
    .concat(asArray(scene.columns).map((item, index) =>
      sourceCandidate(item, "structural_column", index, "columns")))
    .concat(asArray(scene.dimensionLines).map((item, index) =>
      sourceCandidate(item, "dimension_annotation", index, "dimensionLines", {
        sourceGeometry: { p1: clone(item.p1), p2: clone(item.p2) }
      })))
    .concat(asArray(scene.decodedTextRuns).map((item, index) =>
      sourceCandidate(item, "text_annotation", index, "decodedTextRuns", {
        sourceText: String(item.rawLabel || item.text || "")
      })))
    .concat(asArray(scene.glyphClusters).map((item, index) =>
      sourceCandidate(item, "text_annotation", index, "glyphClusters", {
        sourceText: String(item.rawLabel || item.text || "")
      })))
    .concat(asArray(scene.stairVoidCandidates).map((item, index) =>
      sourceCandidate(item, "unknown", index, "stairVoidCandidates", {
        importance: "important",
        sourcePayload: { reason: "stair_void_requires_relationship_review", evidence: clone(evidenceOf(item)) }
      })))
    .concat(asArray(scene.spaceBoundaryCandidates).map((item, index) =>
      sourceCandidate(item, "unknown", index, "spaceBoundaryCandidates", {
        importance: "important",
        sourcePayload: { reason: "space_boundary_requires_topology_review", evidence: clone(evidenceOf(item)) }
      })));
}

function applyDisposition(candidate) {
  const cleanCandidate = clone(candidate);
  delete cleanCandidate.category;
  delete cleanCandidate.locked;
  delete cleanCandidate.excluded;
  delete cleanCandidate.retained;
  delete cleanCandidate.budgetExcluded;
  delete cleanCandidate.formalOutput;
  delete cleanCandidate.candidateOnly;
  const incompleteStair = cleanCandidate.kind === "stair" &&
    (!cleanCandidate.sourcePayload ||
      cleanCandidate.sourcePayload.requiredRolesComplete !== true);
  const disposition = incompleteStair
    ? { category: "unresolved_important" }
    : PDF_RECOGNITION_KIND_DISPOSITIONS[cleanCandidate.kind] || {
    category: cleanCandidate.importance === "important" ? "unresolved_important" : "unresolved"
  };
  const object = {
    ...cleanCandidate,
    sourceId: sourceIdOf(cleanCandidate, "unidentified-source"),
    ...disposition
  };
  delete object.id;
  if (object.category === "unresolved_important") {
    object.retained = true;
    object.locked = true;
    object.budgetExcluded = true;
    object.formalOutput = false;
    object.candidateOnly = true;
    if (incompleteStair) {
      object.sourcePayload = {
        ...clone(cleanCandidate.sourcePayload || {}),
        unresolvedReason: String(
          cleanCandidate.sourcePayload && cleanCandidate.sourcePayload.unresolvedReason ||
          "missing_verified_stair_source_geometry"
        )
      };
    }
  }
  return object;
}

function dispositionIsAuthentic(object) {
  const expected = applyDisposition(object);
  return object.category === expected.category &&
    object.locked === expected.locked &&
    object.excluded === expected.excluded &&
    object.retained === expected.retained &&
    object.budgetExcluded === expected.budgetExcluded &&
    object.formalOutput === expected.formalOutput &&
    object.candidateOnly === expected.candidateOnly;
}

function truthFor(objects) {
  const source = asArray(objects);
  const unresolvedIds = source
    .filter((object) => applyDisposition(object).category === "unresolved_important")
    .map((object) => String(object.sourceId))
    .sort();
  const counts = source.reduce((result, object) => {
    const category = applyDisposition(object).category;
    result[category] = (result[category] || 0) + 1;
    return result;
  }, {});
  return { counts, unresolvedIds };
}

function summaryRowsFor(counts) {
  return CATEGORY_ORDER
    .filter((category) => Number(counts && counts[category]) > 0)
    .map((category) => ({
      label: CATEGORY_LABELS[category],
      count: Number(counts[category])
    }));
}

function bboxCoordinates(bbox) {
  if (Array.isArray(bbox) && bbox.length >= 4) return bbox.slice(0, 4).map(Number);
  if (bbox && typeof bbox === "object") return [bbox.x0, bbox.y0, bbox.x1, bbox.y1].map(Number);
  return null;
}

function regionBounds(region) {
  return bboxCoordinates(region && (region.boundsPt || region.sourceBBox || region.bbox));
}

function normalizedRotation(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const rotations = [0, 90, -90, 180];
  return rotations.sort((first, second) =>
    Math.abs(numeric - first) - Math.abs(numeric - second)
  )[0];
}

function orientationForRegion(region, candidates) {
  const explicit = region && region.orientationEvidence;
  if (explicit && Number.isFinite(Number(explicit.recommendedRotationDegrees))) {
    return {
      source: String(explicit.source || "source_orientation_evidence"),
      observedRotationDegrees: Number(explicit.observedRotationDegrees ?? explicit.recommendedRotationDegrees),
      recommendedRotationDegrees: normalizedRotation(explicit.recommendedRotationDegrees),
      sampleCount: Math.max(1, Number(explicit.sampleCount) || 1),
      evidence: clone(explicit)
    };
  }
  const bounds = regionBounds(region);
  if (bounds && bounds.every(Number.isFinite)) {
    const width = Math.abs(bounds[2] - bounds[0]);
    const height = Math.abs(bounds[3] - bounds[1]);
    if (width >= height && width > 0 && height > 0) {
      return {
        source: "geometry_cluster_crop",
        observedRotationDegrees: 0,
        recommendedRotationDegrees: 0,
        sampleCount: 1,
        evidence: {
          widthPt: Number(width.toFixed(3)),
          heightPt: Number(height.toFixed(3)),
          aspectRatio: Number((width / height).toFixed(6))
        }
      };
    }
  }
  const rotations = candidates
    .filter((candidate) => regionIdOf(candidate) === String(region && region.sourceRegionId || ""))
    .map((candidate) => Number(candidate && candidate.rotationDegrees))
    .filter(Number.isFinite)
    .map(normalizedRotation);
  if (rotations.length) {
    const counts = rotations.reduce((result, rotation) => {
      result[rotation] = (result[rotation] || 0) + 1;
      return result;
    }, {});
    const recommendedRotationDegrees = Object.entries(counts)
      .sort((first, second) => second[1] - first[1] || Math.abs(Number(second[0])) - Math.abs(Number(first[0])))[0][0];
    return {
      source: "source_text_rotation_consensus",
      observedRotationDegrees: Number(recommendedRotationDegrees),
      recommendedRotationDegrees: Number(recommendedRotationDegrees),
      sampleCount: rotations.length,
      evidence: { rotationCounts: counts }
    };
  }
  return {
    source: "no_rotation_evidence",
    observedRotationDegrees: 0,
    recommendedRotationDegrees: 0,
    sampleCount: 0,
    evidence: null
  };
}

function auxiliaryRegionReason(region) {
  if (region && region.excluded_from_floor_assignment === true) {
    return "unassigned_content_attached_to_nearest_plan";
  }
  if (String(region && region.semantic_status || "") === "page_reference") {
    return "page_reference_not_selectable";
  }
  const token = `${String(region && region.sourceRegionId || "")} ${String(region && region.label || "")}`.toLowerCase();
  if (/(^|[-\s])full($|[-\s])/.test(token)) return "page_reference_not_selectable";
  if (/unassigned|title|annotation|note/.test(token)) {
    return "unassigned_content_attached_to_nearest_plan";
  }
  return null;
}

function mainPlanRegion(region) {
  if (!region || auxiliaryRegionReason(region)) return false;
  return region.dimension_evidence_region === true ||
    region.floor_semantic === true ||
    ["geometry_evidence_bound", "source_text_geometry_correspondence", "human_verified"]
      .includes(String(region.semantic_status || ""));
}

function inferredRegions(input, candidates) {
  const provided = asArray(input && input.sourceRegions);
  const regionIds = sortedUniqueStrings(candidates.map(regionIdOf));
  const providedMain = provided.filter(mainPlanRegion);
  const selectableProvided = provided.filter((region) => !auxiliaryRegionReason(region));
  const source = provided.length
    ? providedMain.length >= 2
      ? providedMain
      : selectableProvided.length
        ? selectableProvided
        : provided
    : regionIds.map((sourceRegionId) => {
      const boxes = candidates
        .filter((candidate) => regionIdOf(candidate) === sourceRegionId)
        .map((candidate) => bboxCoordinates(candidate.sourceBBox))
        .filter((box) => box && box.every(Number.isFinite));
      const bounds = boxes.length ? {
        x0: Math.min(...boxes.map((box) => box[0])),
        y0: Math.min(...boxes.map((box) => box[1])),
        x1: Math.max(...boxes.map((box) => box[2])),
        y1: Math.max(...boxes.map((box) => box[3]))
      } : null;
      return { sourceRegionId, boundsPt: bounds };
    });
  const ignoredRegions = provided
    .filter((region) => !source.includes(region))
    .map((region) => ({
      sourceRegionId: String(region && region.sourceRegionId || ""),
      reason: auxiliaryRegionReason(region) || "non_plan_fragment_attached_to_nearest_plan"
    }))
    .sort((first, second) => first.sourceRegionId.localeCompare(second.sourceRegionId));
  if (!source.length) {
    source.push({ sourceRegionId: DEFAULT_REGION_ID, boundsPt: null });
  }
  const normalized = source.map((region, index) => ({
    sourceRegionId: String(region && region.sourceRegionId || `${DEFAULT_REGION_ID}-${index + 1}`),
    boundsPt: clone(region && region.boundsPt || null),
    orientation: orientationForRegion(region, candidates)
  }));
  normalized.sort((first, second) => {
    const firstBox = regionBounds(first);
    const secondBox = regionBounds(second);
    const firstY = firstBox && firstBox.every(Number.isFinite) ? (firstBox[1] + firstBox[3]) / 2 : -Infinity;
    const secondY = secondBox && secondBox.every(Number.isFinite) ? (secondBox[1] + secondBox[3]) / 2 : -Infinity;
    return secondY - firstY || first.sourceRegionId.localeCompare(second.sourceRegionId);
  });
  const regions = normalized.map((region, index) => ({
    ...region,
    previewCrop: normalized.length > 1,
    publicLabel: normalized.length === 1
      ? "本頁平面圖"
      : index === 0
        ? "上方平面圖"
        : index === 1
          ? "下方平面圖"
          : `第 ${index + 1} 張平面圖`
  }));
  return {
    regions,
    consolidation: {
      schema: "laibe.planPuzzle.pdfRecognitionRegionConsolidation.v1",
      inputRegionCount: provided.length || regions.length,
      mainPlanRegionCount: regions.length,
      ignoredRegions,
      attachedFragmentCount: 0,
      assignmentMethod: "source_region_membership_or_nearest_main_plan_bounds"
    }
  };
}

function centerOfCandidate(candidate) {
  const box = bboxCoordinates(candidate && candidate.sourceBBox);
  if (box && box.every(Number.isFinite)) {
    return { x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2 };
  }
  const geometry = candidate && candidate.sourceGeometry;
  if (geometry && geometry.p1 && geometry.p2) {
    return {
      x: (Number(geometry.p1.x) + Number(geometry.p2.x)) / 2,
      y: (Number(geometry.p1.y) + Number(geometry.p2.y)) / 2
    };
  }
  return null;
}

function pointDistanceToRegion(point, region) {
  const box = regionBounds(region);
  if (!point || !box || !box.every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const x0 = Math.min(box[0], box[2]);
  const x1 = Math.max(box[0], box[2]);
  const y0 = Math.min(box[1], box[3]);
  const y1 = Math.max(box[1], box[3]);
  const dx = point.x < x0 ? x0 - point.x : point.x > x1 ? point.x - x1 : 0;
  const dy = point.y < y0 ? y0 - point.y : point.y > y1 ? point.y - y1 : 0;
  return Math.hypot(dx, dy);
}

function assignCandidateToMainRegion(candidate, regions) {
  const originalSourceRegionId = regionIdOf(candidate);
  const existing = regions.find((region) => region.sourceRegionId === originalSourceRegionId);
  if (existing) {
    return {
      ...candidate,
      sourceRegionId: existing.sourceRegionId,
      sourceRegionAssignment: {
        originalSourceRegionId,
        assignedSourceRegionId: existing.sourceRegionId,
        reason: "existing_main_plan_region"
      }
    };
  }
  const point = centerOfCandidate(candidate);
  const nearest = regions
    .map((region) => ({ region, distance: pointDistanceToRegion(point, region) }))
    .sort((first, second) =>
      first.distance - second.distance ||
      first.region.sourceRegionId.localeCompare(second.region.sourceRegionId)
    )[0];
  const fallback = nearest && nearest.region || regions[0];
  return {
    ...candidate,
    sourceRegionId: fallback && fallback.sourceRegionId || originalSourceRegionId || DEFAULT_REGION_ID,
    sourceRegionAssignment: {
      originalSourceRegionId: originalSourceRegionId || null,
      assignedSourceRegionId: fallback && fallback.sourceRegionId || null,
      reason: "nearest_main_plan_region",
      distancePt: nearest && Number.isFinite(nearest.distance)
        ? Number(nearest.distance.toFixed(3))
        : null
    }
  };
}

function unionEnvelope(first, second) {
  if (!first) return second ? { ...second } : null;
  if (!second) return { ...first };
  return {
    x0: Math.min(first.x0, second.x0),
    y0: Math.min(first.y0, second.y0),
    x1: Math.max(first.x1, second.x1),
    y1: Math.max(first.y1, second.y1)
  };
}

function lineEnvelope(line, padding = 0) {
  const normalized = lineGeometry(line);
  if (!normalized) return null;
  return {
    x0: Math.min(normalized.p1.x, normalized.p2.x) - padding,
    y0: Math.min(normalized.p1.y, normalized.p2.y) - padding,
    x1: Math.max(normalized.p1.x, normalized.p2.x) + padding,
    y1: Math.max(normalized.p1.y, normalized.p2.y) + padding
  };
}

function objectEnvelope(object) {
  const bbox = bboxCoordinates(object && object.sourceBBox);
  let envelope = bbox && bbox.every(Number.isFinite) ? {
    x0: Math.min(bbox[0], bbox[2]),
    y0: Math.min(bbox[1], bbox[3]),
    x1: Math.max(bbox[0], bbox[2]),
    y1: Math.max(bbox[1], bbox[3])
  } : null;
  const geometry = object && object.sourceGeometry;
  if (geometry && geometry.p1 && geometry.p2) {
    envelope = unionEnvelope(envelope, lineEnvelope(
      geometry,
      Math.max(0, Number(geometry.thicknessPt) || 0) / 2
    ));
  }
  asArray(object && object.sourcePayload && object.sourcePayload.completeLines).forEach((line) => {
    envelope = unionEnvelope(envelope, lineEnvelope(line, 1));
  });
  return envelope;
}

function roundedEnvelope(envelope) {
  if (!envelope) return null;
  return Object.fromEntries(Object.entries(envelope).map(([key, value]) => [
    key,
    Number(Number(value).toFixed(3))
  ]));
}

function envelopeContains(container, content) {
  return Boolean(container && content &&
    container.x0 <= content.x0 &&
    container.y0 <= content.y0 &&
    container.x1 >= content.x1 &&
    container.y1 >= content.y1);
}

function buildPreviewRegions(regions, allObjects, source) {
  const pageWidth = Math.max(1, Number(source && source.pageWidthPt) || 842);
  const pageHeight = Math.max(1, Number(source && source.pageHeightPt) || 1191);
  const requestedPaddingPt = Math.max(12, Math.min(pageWidth, pageHeight) * 0.012);
  const rows = regions.map((region) => {
    const objects = allObjects.filter((object) => regionIdOf(object) === region.sourceRegionId);
    const objectUnion = objects.reduce((envelope, object) =>
      unionEnvelope(envelope, objectEnvelope(object)), null
    );
    const fallback = regionBounds(region);
    const fallbackEnvelope = fallback && fallback.every(Number.isFinite) ? {
      x0: Math.min(fallback[0], fallback[2]),
      y0: Math.min(fallback[1], fallback[3]),
      x1: Math.max(fallback[0], fallback[2]),
      y1: Math.max(fallback[1], fallback[3])
    } : { x0: 0, y0: 0, x1: pageWidth, y1: pageHeight };
    return {
      region,
      objects,
      objectUnion: objectUnion || fallbackEnvelope,
      center: {
        x: ((objectUnion || fallbackEnvelope).x0 + (objectUnion || fallbackEnvelope).x1) / 2,
        y: ((objectUnion || fallbackEnvelope).y0 + (objectUnion || fallbackEnvelope).y1) / 2
      }
    };
  });
  return rows.map((row) => {
    const union = row.objectUnion;
    const crop = {
      x0: Math.max(0, union.x0 - requestedPaddingPt),
      y0: Math.max(0, union.y0 - requestedPaddingPt),
      x1: Math.min(pageWidth, union.x1 + requestedPaddingPt),
      y1: Math.min(pageHeight, union.y1 + requestedPaddingPt)
    };
    let adjacentRegionExclusion = {
      axis: null,
      boundaryPt: null,
      adjacentRegionCount: 0
    };
    const otherRows = rows.filter((candidate) => candidate !== row);
    if (otherRows.length) {
      const nearest = otherRows
        .map((candidate) => ({
          candidate,
          dx: Math.abs(candidate.center.x - row.center.x),
          dy: Math.abs(candidate.center.y - row.center.y),
          distance: Math.hypot(candidate.center.x - row.center.x, candidate.center.y - row.center.y)
        }))
        .sort((first, second) =>
          first.distance - second.distance ||
          first.candidate.region.sourceRegionId.localeCompare(second.candidate.region.sourceRegionId)
        )[0];
      const axis = nearest.dy >= nearest.dx ? "y" : "x";
      const adjacent = nearest.candidate.objectUnion;
      let boundaryPt = null;
      if (axis === "y" && row.center.y > nearest.candidate.center.y && adjacent.y1 <= union.y0) {
        boundaryPt = (adjacent.y1 + union.y0) / 2;
        crop.y0 = Math.max(crop.y0, boundaryPt);
      } else if (axis === "y" && row.center.y < nearest.candidate.center.y && union.y1 <= adjacent.y0) {
        boundaryPt = (union.y1 + adjacent.y0) / 2;
        crop.y1 = Math.min(crop.y1, boundaryPt);
      } else if (axis === "x" && row.center.x > nearest.candidate.center.x && adjacent.x1 <= union.x0) {
        boundaryPt = (adjacent.x1 + union.x0) / 2;
        crop.x0 = Math.max(crop.x0, boundaryPt);
      } else if (axis === "x" && row.center.x < nearest.candidate.center.x && union.x1 <= adjacent.x0) {
        boundaryPt = (union.x1 + adjacent.x0) / 2;
        crop.x1 = Math.min(crop.x1, boundaryPt);
      }
      adjacentRegionExclusion = {
        axis,
        boundaryPt: boundaryPt == null ? null : Number(boundaryPt.toFixed(3)),
        adjacentRegionCount: otherRows.length
      };
    }
    const roundedCrop = Object.freeze(roundedEnvelope(crop));
    const roundedUnion = Object.freeze(roundedEnvelope(union));
    const previewCropEvidence = Object.freeze({
      schema: "laibe.planPuzzle.pdfRecognitionPreviewCrop.v1",
      source: "selected_region_object_geometry_union",
      selectedObjectCount: row.objects.length,
      objectUnionBoundsPt: roundedUnion,
      requestedPaddingPt: Number(requestedPaddingPt.toFixed(3)),
      appliedPaddingPt: Object.freeze({
        left: Number((union.x0 - crop.x0).toFixed(3)),
        right: Number((crop.x1 - union.x1).toFixed(3)),
        bottom: Number((union.y0 - crop.y0).toFixed(3)),
        top: Number((crop.y1 - union.y1).toFixed(3))
      }),
      pageBoundsClamp: Object.freeze({ x0: 0, y0: 0, x1: pageWidth, y1: pageHeight }),
      adjacentRegionExclusion: Object.freeze(adjacentRegionExclusion),
      allSelectedObjectsContained: envelopeContains(crop, union)
    });
    return {
      ...row.region,
      previewBoundsPt: roundedCrop,
      previewCrop: Object.freeze({
        source: "selected_region_object_geometry_union",
        boundsPt: roundedCrop,
        evidence: previewCropEvidence
      }),
      previewCropEvidence
    };
  });
}

function sourceBindingOf(source) {
  return {
    fileSha256: String(source && (source.fileSha256 || source.sourceSha256 || source.sha256) || "").toUpperCase(),
    pageNumber: Number(source && source.pageNumber || 0)
  };
}

function integrityPayload(manifest) {
  return {
    schema: manifest && manifest.schema,
    source: sourceBindingOf(manifest && manifest.source),
    regions: asArray(manifest && manifest.selection && manifest.selection.regions).map((region) => ({
      sourceRegionId: String(region.sourceRegionId || ""),
      publicLabel: String(region.publicLabel || ""),
      boundsPt: clone(region.boundsPt || null),
      orientation: clone(region.orientation || null),
      previewBoundsPt: clone(region.previewBoundsPt || null),
      previewCrop: clone(region.previewCrop || null),
      previewCropEvidence: clone(region.previewCropEvidence || null)
    })),
    consolidation: clone(manifest && manifest.selection && manifest.selection.consolidation || null),
    classificationCoverage: clone(manifest && manifest.classificationCoverage || null),
    allObjects: asArray(manifest && manifest.allObjects)
  };
}

function recognitionFingerprint(manifest) {
  return stableFingerprint(integrityPayload(manifest));
}

function selectedObjectsFromManifest(manifest) {
  const selectedRegionId = String(manifest && manifest.selection && manifest.selection.selectedRegionId || "");
  if (!selectedRegionId) return [];
  return asArray(manifest && manifest.allObjects).filter((object) => {
    const objectRegionId = regionIdOf(object);
    return objectRegionId ? objectRegionId === selectedRegionId : selectedRegionId === DEFAULT_REGION_ID;
  });
}

function recognitionStructureIsAuthentic(manifest) {
  if (!manifest || manifest.schema !== "laibe.planPuzzle.pdfRecognitionManifest.v1") return false;
  if (!manifest.integrity || manifest.integrity.recognitionFingerprint !== recognitionFingerprint(manifest)) return false;
  if (!asArray(manifest.allObjects).every(dispositionIsAuthentic)) return false;
  if (!asArray(manifest.objects).every(dispositionIsAuthentic)) return false;
  const selectedObjects = selectedObjectsFromManifest(manifest);
  if (!sameValue(selectedObjects, asArray(manifest.objects))) return false;
  const truth = truthFor(selectedObjects);
  if (!sameValue(truth.counts, manifest.counts || {})) return false;
  if (!sameValue(truth.unresolvedIds, asArray(manifest.recognition && manifest.recognition.unresolvedIds))) return false;
  return true;
}

function pendingReview(truth) {
  return {
    status: "needs_review",
    reviewRequired: true,
    unresolvedIds: truth.unresolvedIds,
    acknowledgedUnresolvedIds: [],
    reviewerId: null,
    approvalMode: null,
    approvalReceipt: null
  };
}

export function recognizePdfObjects(input = {}) {
  const candidates = candidatesFromObjectizationScene(input);
  const regionResult = inferredRegions(input, candidates);
  const regions = regionResult.regions;
  const effectiveRegionId = regions.length === 1 ? regions[0].sourceRegionId : null;
  let attachedFragmentCount = 0;
  const allObjects = candidates.map((candidate) => {
    const withRegion = assignCandidateToMainRegion(candidate, regions);
    if (withRegion.sourceRegionAssignment.reason === "nearest_main_plan_region") {
      attachedFragmentCount += 1;
    }
    return applyDisposition(withRegion);
  });
  const previewRegions = buildPreviewRegions(regions, allObjects, input.source);
  const consolidation = {
    ...regionResult.consolidation,
    attachedFragmentCount
  };
  const objects = effectiveRegionId
    ? allObjects.filter((object) => regionIdOf(object) === effectiveRegionId)
    : [];
  const truth = truthFor(objects);
  const manifest = {
    schema: "laibe.planPuzzle.pdfRecognitionManifest.v1",
    source: input.source ? clone(input.source) : undefined,
    selection: {
      selectedRegionId: effectiveRegionId,
      selectedRegionLabel: effectiveRegionId ? previewRegions[0].publicLabel : null,
      regions: previewRegions,
      consolidation
    },
    allObjects,
    objects,
    counts: truth.counts,
    summaryRows: summaryRowsFor(truth.counts),
    classificationCoverage: clone(input.classificationCoverage || null),
    recognition: pendingReview(truth),
    conversionGate: {
      status: "blocked",
      reason: effectiveRegionId
        ? truth.unresolvedIds.length
          ? "important_items_require_acknowledgement"
          : "visual_review_required"
        : "plan_region_selection_required"
    }
  };
  manifest.integrity = {
    schema: "laibe.planPuzzle.pdfRecognitionIntegrity.v1",
    recognitionFingerprint: recognitionFingerprint(manifest)
  };
  return manifest;
}

export function selectRecognitionRegion(manifest, selectedRegionId) {
  if (!manifest || !manifest.integrity || manifest.integrity.recognitionFingerprint !== recognitionFingerprint(manifest)) {
    return manifest;
  }
  const region = asArray(manifest.selection && manifest.selection.regions)
    .find((candidate) => String(candidate.sourceRegionId) === String(selectedRegionId));
  if (!region) return manifest;
  const objects = asArray(manifest.allObjects).filter((object) => {
    const objectRegionId = regionIdOf(object);
    return objectRegionId ? objectRegionId === region.sourceRegionId : region.sourceRegionId === DEFAULT_REGION_ID;
  });
  const truth = truthFor(objects);
  return {
    ...manifest,
    selection: {
      ...manifest.selection,
      selectedRegionId: region.sourceRegionId,
      selectedRegionLabel: region.publicLabel
    },
    objects,
    counts: truth.counts,
    summaryRows: summaryRowsFor(truth.counts),
    recognition: pendingReview(truth),
    conversionGate: {
      status: "blocked",
      reason: truth.unresolvedIds.length
        ? "important_items_require_acknowledgement"
        : "visual_review_required"
    }
  };
}

function exactAcknowledgement(acknowledged, unresolvedIds) {
  const supplied = asArray(acknowledged).map((value) => String(value || "")).filter(Boolean);
  const suppliedUnique = sortedUniqueStrings(supplied);
  return supplied.length === suppliedUnique.length && sameValue(suppliedUnique, unresolvedIds);
}

function approvalFingerprint(recognitionHash, reviewerId, acknowledgedUnresolvedIds, approvalMode) {
  return stableFingerprint({
    recognitionFingerprint: recognitionHash,
    reviewerId,
    acknowledgedUnresolvedIds,
    approvalMode
  });
}

export function approveRecognitionManifest(manifest, approval = {}) {
  const truth = truthFor(asArray(manifest && manifest.objects));
  const reviewerId = String(approval.reviewerId || "").trim() || null;
  const requestedMode = String(approval.mode || "").trim();
  const automaticMode = requestedMode === "automatic_candidate_conservation";
  const approvalMode = automaticMode
    ? "automatic_candidate_conservation"
    : "explicit_acknowledgement";
  const supplied = (
    automaticMode && approval.preserveUnresolvedAsLocked === true
      ? truth.unresolvedIds
      : asArray(approval.acknowledgedUnresolvedIds)
  ).map((value) => String(value || "")).filter(Boolean);
  const acknowledgedUnresolvedIds = sortedUniqueStrings(supplied);
  const automaticPolicySatisfied = !automaticMode || (
    reviewerId === "automatic-recognition-gate" &&
    approval.preserveUnresolvedAsLocked === true &&
    asArray(manifest && manifest.objects)
      .filter((object) => object.category === "unresolved_important")
      .every((object) =>
        object.retained === true &&
        object.locked === true &&
        object.budgetExcluded === true &&
        object.formalOutput === false &&
        object.candidateOnly === true
      )
  );
  const passed = Boolean(
    reviewerId &&
    (requestedMode === "" || automaticMode) &&
    automaticPolicySatisfied &&
    manifest && manifest.selection && manifest.selection.selectedRegionId &&
    recognitionStructureIsAuthentic(manifest) &&
    exactAcknowledgement(supplied, truth.unresolvedIds)
  );
  const approvalReceipt = passed ? {
    schema: "laibe.planPuzzle.pdfRecognitionApproval.v1",
    recognitionFingerprint: manifest.integrity.recognitionFingerprint,
    approvalFingerprint: approvalFingerprint(
      manifest.integrity.recognitionFingerprint,
      reviewerId,
      acknowledgedUnresolvedIds,
      approvalMode
    )
  } : null;
  return {
    ...manifest,
    recognition: {
      ...manifest.recognition,
      status: passed ? "passed" : "needs_review",
      unresolvedIds: truth.unresolvedIds,
      acknowledgedUnresolvedIds,
      reviewerId,
      approvalMode: passed ? approvalMode : null,
      approvalReceipt
    },
    conversionGate: {
      status: passed ? "passed" : "blocked",
      reason: passed ? "recognition_review_accepted" : "recognition_review_incomplete"
    }
  };
}

function bindingMatches(manifest, binding) {
  if (!binding || !manifest || !manifest.selection) return false;
  const source = sourceBindingOf(manifest.source);
  const fileSha256 = String(binding.fileSha256 || "").toUpperCase();
  const sourcePdfSha256 = String(binding.sourcePdfSha256 || "").toUpperCase();
  const pageNumber = Number(binding.pageNumber);
  const selectedRegionId = String(binding.selectedRegionId || "");
  return /^[A-F0-9]{64}$/.test(fileSha256) &&
    sourcePdfSha256 === fileSha256 &&
    fileSha256 === source.fileSha256 &&
    pageNumber > 0 &&
    pageNumber === source.pageNumber &&
    selectedRegionId.length > 0 &&
    selectedRegionId === String(manifest.selection.selectedRegionId || "");
}

function scaleDecisionMatches(manifest, binding) {
  const decision = binding && binding.scaleDecision;
  const decisionHash = String(binding && binding.scaleDecisionHash || "").toLowerCase();
  const schema = String(binding && binding.scaleDecisionSchema || "");
  const selectedRegionId = String(manifest?.selection?.selectedRegionId || "");
  const axes = asArray(decision && decision.axes);
  const audit = decision && decision.audit;
  if (
    schema !== PDF_DIMENSION_SCALE_SCHEMA ||
    decision?.schema !== PDF_DIMENSION_SCALE_SCHEMA ||
    decision?.status !== "passed" ||
    Number(decision?.confidence) < 0.98 ||
    String(decision?.selectedRegionId || "") !== selectedRegionId ||
    !(Number(decision?.worldMmPerPtX) > 0) ||
    !(Number(decision?.worldMmPerPtY) > 0) ||
    !(Number(decision?.acceptedWorldMmPerPt) > 0) ||
    !/^[a-f0-9]{64}$/.test(decisionHash) ||
    stableScaleDecisionHash(decision) !== decisionHash
  ) {
    return false;
  }
  if (
    audit?.pass !== true ||
    Number(audit.independentAxisCount) !== 2 ||
    Number(audit.unitSolutionCount) !== 1 ||
    !(Number(audit.consistencyErrorPct) <= 1) ||
    Number(audit.competingScaleClusterCount) !== 0 ||
    audit.allEvidenceInsideSelectedRegion !== true
  ) {
    return false;
  }
  const orientations = sortedUniqueStrings(axes.map((axis) => axis && axis.orientation));
  return sameValue(orientations, ["horizontal", "vertical"]) &&
    axes.every((axis) =>
      String(axis?.dimensionTextSourceId || "") &&
      String(axis?.dimensionLineSourceId || "") &&
      asArray(axis?.witnessLineSourceIds).length >= 2 &&
      Number(axis?.interpretedLengthMm) > 0 &&
      Number(axis?.measuredLengthPt) > 0 &&
      Number(axis?.worldMmPerPt) > 0
    );
}

export function canStartNativeConversion(manifest, binding) {
  if (
    !recognitionStructureIsAuthentic(manifest) ||
    !bindingMatches(manifest, binding) ||
    !scaleDecisionMatches(manifest, binding)
  ) return false;
  const recognition = manifest.recognition || {};
  const truth = truthFor(manifest.objects);
  const reviewerId = String(recognition.reviewerId || "").trim();
  const approvalMode = String(recognition.approvalMode || "");
  if (!reviewerId || recognition.status !== "passed") return false;
  if (!["explicit_acknowledgement", "automatic_candidate_conservation"].includes(approvalMode)) return false;
  if (
    approvalMode === "automatic_candidate_conservation" &&
    (
      reviewerId !== "automatic-recognition-gate" ||
      asArray(manifest.objects)
        .filter((object) => object.category === "unresolved_important")
        .some((object) =>
          object.retained !== true ||
          object.locked !== true ||
          object.budgetExcluded !== true ||
          object.formalOutput !== false ||
          object.candidateOnly !== true
        )
    )
  ) return false;
  if (!exactAcknowledgement(recognition.acknowledgedUnresolvedIds, truth.unresolvedIds)) return false;
  const receipt = recognition.approvalReceipt;
  if (!receipt ||
    receipt.recognitionFingerprint !== manifest.integrity.recognitionFingerprint ||
    receipt.approvalFingerprint !== approvalFingerprint(
      manifest.integrity.recognitionFingerprint,
      reviewerId,
      sortedUniqueStrings(recognition.acknowledgedUnresolvedIds),
      approvalMode
    )) return false;
  return manifest.conversionGate && manifest.conversionGate.status === "passed";
}

export function scopeObjectizationSceneToRegion(scene = {}, selectedRegionId) {
  const regionId = String(selectedRegionId || "");
  if (!regionId) return null;
  const output = clone(scene);
  const candidates = candidatesFromObjectizationScene(scene);
  const regionResult = inferredRegions(scene, candidates);
  const assignedCandidates = candidates.map((candidate) =>
    assignCandidateToMainRegion(candidate, regionResult.regions)
  );
  const assignmentBySourceId = new Map(assignedCandidates.map((candidate) => [
    sourceIdOf(candidate, ""),
    candidate.sourceRegionAssignment
  ]).filter(([sourceId]) => Boolean(sourceId)));
  SCENE_OBJECT_COLLECTIONS.forEach((key) => {
    if (!Array.isArray(scene[key])) return;
    output[key] = scene[key].map((item) => {
      const assignment = assignmentBySourceId.get(sourceIdOf(item, ""));
      if (!assignment || assignment.assignedSourceRegionId !== regionId) return null;
      return {
        ...clone(item),
        sourceRegionId: regionId,
        sourceRegionAssignment: clone(assignment)
      };
    }).filter(Boolean);
  });
  ["lineSegments", "rawPaths"].forEach((key) => {
    if (!Array.isArray(scene[key])) return;
    output[key] = scene[key].filter((item) => regionIdOf(item) === regionId).map(clone);
  });
  if (Array.isArray(scene.candidates)) {
    output.candidates = scene.candidates.map((item) => {
      const assignment = assignmentBySourceId.get(sourceIdOf(item, ""));
      if (!assignment || assignment.assignedSourceRegionId !== regionId) return null;
      return {
        ...clone(item),
        sourceRegionId: regionId,
        sourceRegionAssignment: clone(assignment)
      };
    }).filter(Boolean);
  }
  if (Array.isArray(scene.sourceRegions)) {
    output.sourceRegions = regionResult.regions
      .filter((region) => region.sourceRegionId === regionId)
      .map(clone);
  }
  output.selectedRegionId = regionId;
  return output;
}

function sceneContainsOnlySelectedRegion(scene, selectedRegionId) {
  const arrays = []
    .concat(SCENE_OBJECT_COLLECTIONS.map((key) => asArray(scene && scene[key])))
    .concat([asArray(scene && scene.candidates)]);
  const objects = arrays.flat();
  return objects.length > 0 && objects.every((item) => regionIdOf(item) === selectedRegionId);
}

export function validateNativeConversionRequest(request = {}) {
  const manifest = request.manifest;
  const binding = request.binding;
  const scene = request.scene;
  if (!canStartNativeConversion(manifest, binding)) {
    return { ok: false, reason: "recognition_authorization_invalid" };
  }
  const selectedRegionId = String(binding.selectedRegionId || "");
  if (!scene || !sceneContainsOnlySelectedRegion(scene, selectedRegionId)) {
    return { ok: false, reason: "scene_region_scope_invalid" };
  }
  const freshObjects = candidatesFromObjectizationScene(scene).map(applyDisposition);
  if (!sameValue(freshObjects, manifest.objects)) {
    return { ok: false, reason: "scene_manifest_mismatch" };
  }
  return {
    ok: true,
    reason: "recognition_authorization_verified",
    selectedRegionId,
    recognitionFingerprint: manifest.integrity.recognitionFingerprint,
    scaleDecisionHash: binding.scaleDecisionHash
  };
}

const escapeXml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

function overlayLine(line, pageHeight, color, width = 2) {
  if (!line || !line.p1 || !line.p2) return "";
  const x1 = Number(line.p1.x);
  const y1 = Number(line.p1.y);
  const x2 = Number(line.p2.x);
  const y2 = Number(line.p2.y);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return "";
  return `<line x1="${x1}" y1="${pageHeight - y1}" x2="${x2}" y2="${pageHeight - y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function sourceViewBounds(selectedBounds, pageWidth, pageHeight) {
  if (!selectedBounds || !selectedBounds.every(Number.isFinite)) {
    return { x0: 0, y0: 0, x1: pageWidth, y1: pageHeight };
  }
  return {
    x0: Math.min(selectedBounds[0], selectedBounds[2]),
    y0: pageHeight - Math.max(selectedBounds[1], selectedBounds[3]),
    x1: Math.max(selectedBounds[0], selectedBounds[2]),
    y1: pageHeight - Math.min(selectedBounds[1], selectedBounds[3])
  };
}

function markerOffsetCandidates(step = 22, rings = 12) {
  const offsets = [{ x: 0, y: 0 }];
  for (let ring = 1; ring <= rings; ring += 1) {
    for (let y = -ring; y <= ring; y += 1) {
      for (let x = -ring; x <= ring; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== ring) continue;
        offsets.push({ x: x * step, y: y * step });
      }
    }
  }
  return offsets.sort((first, second) =>
    Math.hypot(first.x, first.y) - Math.hypot(second.x, second.y) ||
    Math.abs(first.y) - Math.abs(second.y) ||
    first.x - second.x ||
    first.y - second.y
  );
}

function layoutUnresolvedNumberMarkers(
  objects,
  unresolvedIds,
  pageWidth,
  pageHeight,
  selectedBounds
) {
  const objectById = new Map(asArray(objects).map((object) => [String(object.sourceId), object]));
  const view = sourceViewBounds(selectedBounds, pageWidth, pageHeight);
  const markerRadius = 9;
  const viewInset = markerRadius + 2;
  const minimumCenterDistance = markerRadius * 2 + 2;
  const offsets = markerOffsetCandidates();
  const placed = [];
  const layouts = new Map();
  asArray(unresolvedIds).forEach((sourceId, index) => {
    const object = objectById.get(String(sourceId));
    const envelope = objectEnvelope(object);
    if (!envelope) return;
    const preferred = {
      x: Math.min(envelope.x1 - markerRadius, envelope.x0 + markerRadius + 2),
      y: Math.min(
        pageHeight - envelope.y0 - markerRadius,
        pageHeight - envelope.y1 + markerRadius + 2
      )
    };
    const tried = new Set();
    let position = null;
    for (const offset of offsets) {
      const candidate = {
        x: Math.max(
          view.x0 + viewInset,
          Math.min(view.x1 - viewInset, preferred.x + offset.x)
        ),
        y: Math.max(
          view.y0 + viewInset,
          Math.min(view.y1 - viewInset, preferred.y + offset.y)
        )
      };
      const key = `${candidate.x.toFixed(3)}:${candidate.y.toFixed(3)}`;
      if (tried.has(key)) continue;
      tried.add(key);
      if (placed.every((other) =>
        Math.hypot(candidate.x - other.x, candidate.y - other.y) >= minimumCenterDistance
      )) {
        position = candidate;
        break;
      }
    }
    if (!position) return;
    const layout = {
      number: index + 1,
      x: Number(position.x.toFixed(3)),
      y: Number(position.y.toFixed(3)),
      preferredX: Number(preferred.x.toFixed(3)),
      preferredY: Number(preferred.y.toFixed(3))
    };
    placed.push(layout);
    layouts.set(String(sourceId), layout);
  });
  return layouts;
}

function unresolvedNumberMarker(marker) {
  if (!marker || !Number.isInteger(marker.number) || marker.number < 1) return "";
  const moved = Math.hypot(marker.x - marker.preferredX, marker.y - marker.preferredY) > 1;
  const leader = moved
    ? `<line x1="${marker.preferredX}" y1="${marker.preferredY}" x2="${marker.x}" y2="${marker.y}" stroke="#C9254E" stroke-width="1.5" stroke-linecap="round"/>`
    : "";
  return `<g>${leader}<circle cx="${marker.x}" cy="${marker.y}" r="9" fill="#C9254E" stroke="#FFFFFF" stroke-width="2"/><text x="${marker.x}" y="${marker.y + 3.5}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#FFFFFF">${marker.number}</text></g>`;
}

function overlayShape(object, pageHeight, marker = null) {
  const color = CATEGORY_COLORS[object.category] || "#A5B2BF";
  const geometry = object.sourceGeometry || {};
  let shape = "";
  if (object.category === "locked_stair_line_group") {
    const completeLines = asArray(object.sourcePayload && object.sourcePayload.completeLines);
    if (!completeLines.length) return "";
    shape = completeLines.map((line) => overlayLine(line, pageHeight, color)).join("");
  } else if (geometry.p1 && geometry.p2) {
    const width = object.category === "native_wall_target"
      ? Math.max(2, Math.min(14, Number(geometry.thicknessPt) || 4))
      : 2;
    shape = overlayLine(geometry, pageHeight, color, width);
  } else {
    const completeLines = asArray(object.sourcePayload && object.sourcePayload.completeLines);
    if (completeLines.length) {
      shape = completeLines.map((line) => overlayLine(line, pageHeight, color)).join("");
    } else {
      const bbox = bboxCoordinates(object.sourceBBox);
      if (!bbox || !bbox.every(Number.isFinite)) return "";
      const [x0, y0, x1, y1] = bbox;
      const x = Math.min(x0, x1);
      const y = pageHeight - Math.max(y0, y1);
      const width = Math.max(1, Math.abs(x1 - x0));
      const height = Math.max(1, Math.abs(y1 - y0));
      const dash = object.excluded || object.category === "unresolved_important"
        ? ` stroke-dasharray="5 4"`
        : "";
      shape = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2"${dash}/>`;
    }
  }
  const numberedMarker = unresolvedNumberMarker(marker);
  return numberedMarker ? `<g>${shape}${numberedMarker}</g>` : shape;
}

export function createStairOnlyRecognitionOverlaySvg(manifest = {}) {
  const width = Math.max(1, Number(manifest.source && manifest.source.pageWidthPt) || 842);
  const height = Math.max(1, Number(manifest.source && manifest.source.pageHeightPt) || 1191);
  const objects = asArray(manifest.objects).filter(
    (object) =>
      object.category === "locked_stair_line_group" &&
      object.sourcePayload &&
      object.sourcePayload.requiredRolesComplete === true
  );
  const selectedRegion = asArray(manifest.selection && manifest.selection.regions)
    .find((region) =>
      String(region.sourceRegionId || "") ===
      String(manifest.selection && manifest.selection.selectedRegionId || "")
    );
  const selectedBounds = selectedRegion && selectedRegion.previewCrop
    ? bboxCoordinates(selectedRegion.previewBoundsPt)
    : null;
  const shapes = objects.map((object) => overlayShape(object, height)).join("");
  const rotation = normalizedRotation(
    selectedRegion && selectedRegion.orientation &&
    selectedRegion.orientation.recommendedRotationDegrees
  );
  let viewBox = `0 0 ${width} ${height}`;
  let shapeTransform = "";
  if (selectedBounds && selectedBounds.every(Number.isFinite)) {
    const sourceX = Math.min(selectedBounds[0], selectedBounds[2]);
    const sourceY = height - Math.max(selectedBounds[1], selectedBounds[3]);
    const sourceWidth = Math.max(1, Math.abs(selectedBounds[2] - selectedBounds[0]));
    const sourceHeight = Math.max(1, Math.abs(selectedBounds[3] - selectedBounds[1]));
    if (rotation === 90) {
      viewBox = `0 0 ${sourceHeight} ${sourceWidth}`;
      shapeTransform = `translate(${sourceHeight} 0) rotate(90) translate(${-sourceX} ${-sourceY})`;
    } else if (rotation === -90) {
      viewBox = `0 0 ${sourceHeight} ${sourceWidth}`;
      shapeTransform = `translate(0 ${sourceWidth}) rotate(-90) translate(${-sourceX} ${-sourceY})`;
    } else if (rotation === 180) {
      viewBox = `0 0 ${sourceWidth} ${sourceHeight}`;
      shapeTransform = `translate(${sourceWidth} ${sourceHeight}) rotate(180) translate(${-sourceX} ${-sourceY})`;
    } else {
      viewBox = `${sourceX} ${sourceY} ${sourceWidth} ${sourceHeight}`;
    }
  }
  const shapeGroup = shapeTransform
    ? `<g transform="${shapeTransform}">${shapes}</g>`
    : `<g>${shapes}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="樓梯辨識線群" width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"><title>樓梯辨識線群</title>${shapeGroup}</svg>`;
}

export function createRecognitionOverlaySvg(manifest = {}) {
  const width = Math.max(1, Number(manifest.source && manifest.source.pageWidthPt) || 842);
  const height = Math.max(1, Number(manifest.source && manifest.source.pageHeightPt) || 1191);
  const objects = asArray(manifest.objects);
  const selectedRegion = asArray(manifest.selection && manifest.selection.regions)
    .find((region) =>
      String(region.sourceRegionId || "") === String(manifest.selection && manifest.selection.selectedRegionId || "")
    );
  const selectedBounds = selectedRegion && selectedRegion.previewCrop
    ? bboxCoordinates(selectedRegion.previewBoundsPt)
    : null;
  const unresolvedMarkerById = layoutUnresolvedNumberMarkers(
    objects,
    manifest.recognition && manifest.recognition.unresolvedIds,
    width,
    height,
    selectedBounds
  );
  const shapes = objects.map((object) =>
    overlayShape(object, height, unresolvedMarkerById.get(String(object.sourceId)) || null)
  ).join("");
  const rotation = normalizedRotation(
    selectedRegion && selectedRegion.orientation && selectedRegion.orientation.recommendedRotationDegrees
  );
  let viewBox = `0 0 ${width} ${height}`;
  let shapeTransform = "";
  let legendX = 12;
  let legendY = 24;
  if (selectedBounds && selectedBounds.every(Number.isFinite)) {
    const sourceX = Math.min(selectedBounds[0], selectedBounds[2]);
    const sourceY = height - Math.max(selectedBounds[1], selectedBounds[3]);
    const sourceWidth = Math.max(1, Math.abs(selectedBounds[2] - selectedBounds[0]));
    const sourceHeight = Math.max(1, Math.abs(selectedBounds[3] - selectedBounds[1]));
    if (rotation === 90) {
      viewBox = `0 0 ${sourceHeight} ${sourceWidth}`;
      shapeTransform = `translate(${sourceHeight} 0) rotate(90) translate(${-sourceX} ${-sourceY})`;
    } else if (rotation === -90) {
      viewBox = `0 0 ${sourceHeight} ${sourceWidth}`;
      shapeTransform = `translate(0 ${sourceWidth}) rotate(-90) translate(${-sourceX} ${-sourceY})`;
    } else if (rotation === 180) {
      viewBox = `0 0 ${sourceWidth} ${sourceHeight}`;
      shapeTransform = `translate(${sourceWidth} ${sourceHeight}) rotate(180) translate(${-sourceX} ${-sourceY})`;
    } else {
      viewBox = `${sourceX} ${sourceY} ${sourceWidth} ${sourceHeight}`;
      legendX = sourceX + 12;
      legendY = sourceY + 24;
    }
  }
  const legendEntries = CATEGORY_ORDER.map((category, index) => {
    const count = Number(manifest.counts && manifest.counts[category]) || 0;
    return `<g transform="translate(0 ${index * 18})"><rect width="10" height="10" y="-9" rx="2" fill="${CATEGORY_COLORS[category]}"/><text x="16" y="0">${escapeXml(CATEGORY_LABELS[category])} (${count})</text></g>`;
  }).join("");
  const shapeGroup = shapeTransform
    ? `<g transform="${shapeTransform}">${shapes}</g>`
    : `<g>${shapes}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="辨識分類圖例" width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"><title>辨識分類圖例</title>${shapeGroup}<g transform="translate(${legendX} ${legendY})" font-family="system-ui, sans-serif" font-size="10" fill="#10212B"><rect x="-8" y="-18" width="228" height="${CATEGORY_ORDER.length * 18 + 36}" rx="8" fill="#FFFFFF" fill-opacity="0.9" stroke="#CBD5DD"/><text x="0" y="-2" font-weight="700">辨識分類圖例</text><g transform="translate(0 18)">${legendEntries}</g></g></svg>`;
}
