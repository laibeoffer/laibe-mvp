(function (global) {
  "use strict";

  const ADAPTER_VERSION = "0.5.0-r9-visible-symbol-classification-20260723";
  const SCENE_SCHEMA = "laibe.planPuzzle.pdfObjectizationScene.v2";

  function round(value, digits = 3) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const scale = 10 ** digits;
    return Math.round(number * scale) / scale;
  }

  function cleanString(value) {
    return String(value == null ? "" : value).trim();
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function stableStringify(value, omitKeys = []) {
    const omit = new Set(omitKeys);
    const seen = new WeakSet();
    function normalize(input) {
      if (input === undefined || typeof input === "function" || typeof input === "symbol") return undefined;
      if (input === null || typeof input !== "object") return input;
      if (seen.has(input)) return "[Circular]";
      seen.add(input);
      if (Array.isArray(input)) return input.map(normalize);
      const output = {};
      Object.keys(input).sort().forEach((key) => {
        if (omit.has(key)) return;
        const normalized = normalize(input[key]);
        if (normalized !== undefined) output[key] = normalized;
      });
      return output;
    }
    return JSON.stringify(normalize(value));
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  async function sha256HexFromText(text) {
    if (!global.crypto || !global.crypto.subtle) {
      throw new Error("SHA-256 is unavailable in this browser context.");
    }
    const bytes = new TextEncoder().encode(String(text));
    return bytesToHex(await global.crypto.subtle.digest("SHA-256", bytes));
  }

  async function canonicalSha256(value, options = {}) {
    return sha256HexFromText(stableStringify(value, options.omitKeys || []));
  }

  function pointFrom(value) {
    if (!value || typeof value !== "object") return null;
    const x = round(value.x, 3);
    const y = round(value.y, 3);
    return x === null || y === null ? null : { x, y };
  }

  function boxFrom(value) {
    if (!value || typeof value !== "object") return null;
    let x0 = round(value.x0 ?? value.left ?? value.x, 3);
    let y0 = round(value.y0 ?? value.top ?? value.y, 3);
    let x1 = round(value.x1, 3);
    let y1 = round(value.y1, 3);
    if ((x1 === null || y1 === null) && x0 !== null && y0 !== null) {
      const width = round(value.width ?? value.w, 3);
      const height = round(value.height ?? value.h, 3);
      if (width !== null && height !== null) {
        x1 = round(x0 + width, 3);
        y1 = round(y0 + height, 3);
      }
    }
    if ([x0, y0, x1, y1].some((entry) => entry === null)) return null;
    return {
      x0: Math.min(x0, x1),
      y0: Math.min(y0, y1),
      x1: Math.max(x0, x1),
      y1: Math.max(y0, y1)
    };
  }

  function lineBox(p1, p2, pad = 0) {
    if (!p1 || !p2) return null;
    return {
      x0: round(Math.min(p1.x, p2.x) - pad, 3),
      y0: round(Math.min(p1.y, p2.y) - pad, 3),
      x1: round(Math.max(p1.x, p2.x) + pad, 3),
      y1: round(Math.max(p1.y, p2.y) + pad, 3)
    };
  }

  function boxCenter(box) {
    return box ? { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 } : null;
  }

  function boxArea(box) {
    const normalized = boxFrom(box);
    if (!normalized) return Number.POSITIVE_INFINITY;
    const width = normalized.x1 - normalized.x0;
    const height = normalized.y1 - normalized.y0;
    return Number.isFinite(width) && Number.isFinite(height) && width >= 0 && height >= 0
      ? width * height : Number.POSITIVE_INFINITY;
  }

  function containsPoint(box, point) {
    return Boolean(box && point && point.x >= box.x0 && point.x <= box.x1 && point.y >= box.y0 && point.y <= box.y1);
  }

  function normalizeRegion(region) {
    const box = boxFrom(region && region.boundsPt);
    return {
      sourceRegionId: cleanString(region && region.sourceRegionId) || "page-1-full",
      label: cleanString(region && region.label) || "page-1-full",
      pageIndex: Number.isFinite(Number(region && region.pageIndex)) ? Number(region.pageIndex) : 0,
      pageNumber: Number.isFinite(Number(region && region.pageNumber)) ? Number(region.pageNumber) : 1,
      method: cleanString(region && region.method) || "exact-source-runtime",
      boundsPt: box,
      localCoordinateFrame: cleanString(region && region.localCoordinateFrame) || "page-1-local-pt",
      coordinate_frame: cleanString(region && region.coordinate_frame) || cleanString(region && region.localCoordinateFrame) || "page-1-local-pt",
      semantic_status: cleanString(region && region.semantic_status) || "unresolved",
      human_confirmation_required: Boolean(region && region.human_confirmation_required),
      profile_source: cleanString(region && region.profile_source) || null,
      source_sha256: cleanString(region && region.source_sha256).toUpperCase() || null,
      sourceProfileHash: cleanString(region && region.sourceProfileHash) || cleanString(region && region.source_profile_hash) || null,
      floor_semantic: Boolean(region && region.floor_semantic),
      excluded_from_floor_assignment: Boolean(region && region.excluded_from_floor_assignment)
    };
  }

  function chooseRegion(regions, point) {
    const normalized = (regions || []).map(normalizeRegion);
    const verifiedFloor = normalized.find((region) => (
      region.semantic_status === "human_verified" &&
      region.floor_semantic &&
      containsPoint(region.boundsPt, point)
    ));
    if (verifiedFloor) return verifiedFloor;
    const spatialRegion = normalized
      .filter((region) => region.boundsPt && !region.excluded_from_floor_assignment && containsPoint(region.boundsPt, point))
      .sort((a, b) => boxArea(a.boundsPt) - boxArea(b.boundsPt) || a.sourceRegionId.localeCompare(b.sourceRegionId))[0];
    if (spatialRegion) return spatialRegion;
    return normalized.find((region) => region.sourceRegionId === "page-1-unassigned") || {
      sourceRegionId: "page-1-unassigned",
      label: "unassigned",
      semantic_status: "unresolved",
      human_confirmation_required: true,
      excluded_from_floor_assignment: true
    };
  }

  async function sourceObjectId(meta, category, regionId, coords) {
    const slugByCategory = {
      structural_wall_candidate: "wall",
      column_candidate: "column",
      dimension_or_axis_evidence: "dimension_axis",
      dimension_numeric_label_evidence: "dimension_label",
      opening_candidate: "opening",
      stair_candidate: "stair",
      stair_void_candidate: "stair_void",
      space_boundary_candidate: "space_boundary",
      bathroom_fixture_candidate: "bathroom_fixture",
      fixed_cabinet_candidate: "fixed_cabinet",
      unresolved_symbol_candidate: "unresolved_symbol"
    };
    const slug = slugByCategory[category] || cleanString(category).replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const token = [
      cleanString(meta && meta.sourceSha256).toUpperCase(),
      Number.isFinite(Number(meta && meta.pageNumber)) ? Number(meta.pageNumber) : 1,
      cleanString(regionId),
      cleanString(category),
      stableStringify(coords)
    ].join("|");
    return "src_" + slug + "_" + (await sha256HexFromText(token)).slice(0, 24).toLowerCase();
  }

  function makeSourceContract(id, category, region, sourceBox, raw) {
    const normalizedRegion = normalizeRegion(region || {});
    const regionId = normalizedRegion.sourceRegionId || "page-1-unassigned";
    return {
      source_object_id: id,
      sourceId: id,
      sourceRegionId: regionId,
      sourceRegionSemanticStatus: normalizedRegion.semantic_status,
      humanVerifiedFloorAssignment: normalizedRegion.semantic_status === "human_verified" && normalizedRegion.floor_semantic,
      sourceBBox: sourceBox,
      source_kind: "pdf",
      object_status: "existing",
      work_action: "none",
      budget_trigger: "none",
      dbspec_projection: "excluded",
      editable_object_id: null,
      acceptedTransformId: null,
      mapping_state: "not_accepted",
      objectState: "candidate_object",
      candidateOnly: true,
      formalOutput: false,
      reviewRequired: true,
      sourceCategory: category,
      sourceExtractorId: raw && raw.id ? cleanString(raw.id) : null
    };
  }

  async function wallToScene(wall, index, meta, regions) {
    const p1 = pointFrom(wall && wall.pageFrom);
    const p2 = pointFrom(wall && wall.pageTo);
    if (!p1 || !p2) return null;
    const sourceBox = lineBox(p1, p2, Math.max(0.5, Number(wall.lineWidthPdf) || 0));
    const region = chooseRegion(regions, boxCenter(sourceBox));
    const regionId = region.sourceRegionId;
    const category = "structural_wall_candidate";
    const id = await sourceObjectId(meta, category, regionId, { p1, p2, width: round(wall.lineWidthPdf || wall.lineWidthDevice || 0, 3) });
    return {
      id,
      category: "structuralWall",
      p1,
      p2,
      width: round(wall.lineWidthPdf || wall.lineWidthDevice || 1, 3),
      orientation: cleanString(wall.orientation) || null,
      confidence: cleanString(wall.confidence) || "candidate",
      extractorRank: Number.isFinite(Number(wall.rank)) ? Number(wall.rank) : index + 1,
      sourcePathIds: wall && wall.id ? [cleanString(wall.id)] : [],
      ...makeSourceContract(id, category, region, sourceBox, wall)
    };
  }

  async function columnToScene(column, index, meta, regions) {
    const sourceBox = boxFrom(column && (column.pageBox || column.canvasBox));
    if (!sourceBox) return null;
    const region = chooseRegion(regions, boxCenter(sourceBox));
    const regionId = region.sourceRegionId;
    const category = "column_candidate";
    const id = await sourceObjectId(meta, category, regionId, sourceBox);
    return {
      id,
      category: "column",
      bbox: sourceBox,
      confidence: cleanString(column.confidence) || "candidate",
      extractorRank: Number.isFinite(Number(column.rank)) ? Number(column.rank) : index + 1,
      sourcePathIds: column && column.id ? [cleanString(column.id)] : [],
      ...makeSourceContract(id, category, region, sourceBox, column)
    };
  }

  async function axisToDimensionLine(axis, index, meta, regions) {
    const p1 = pointFrom(axis && axis.pageFrom);
    const p2 = pointFrom(axis && axis.pageTo);
    if (!p1 || !p2) return null;
    const sourceBox = lineBox(p1, p2, Math.max(0.25, Number(axis.lineWidthPdf) || 0));
    const region = chooseRegion(regions, boxCenter(sourceBox));
    const regionId = region.sourceRegionId;
    const category = "dimension_or_axis_evidence";
    const id = await sourceObjectId(meta, category, regionId, { p1, p2, width: round(axis.lineWidthPdf || 0, 3) });
    return {
      id,
      category: "dimensionLine",
      p1,
      p2,
      confidence: cleanString(axis.confidence) || "evidence",
      orientation: cleanString(axis.orientation) || null,
      axisSpanPt: round(axis.axisSpanPt || axis.lengthPdf || 0, 6),
      dimensionAxisEvidence: axis.dimensionAxisEvidence || null,
      extractorRank: Number.isFinite(Number(axis.rank)) ? Number(axis.rank) : index + 1,
      evidenceOnly: true,
      objectState: "evidence_marker",
      formalOutput: false,
      budgetExcluded: true,
      ...makeSourceContract(id, category, region, sourceBox, axis)
    };
  }

  async function numericDimensionLabelToScene(label, index, meta, regions) {
    const sourceBox = boxFrom(label && label.pageBox);
    if (!sourceBox) return null;
    const numericValue = Number(label && label.normalizedNumericValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    const region = chooseRegion(regions, boxCenter(sourceBox));
    const regionId = region.sourceRegionId;
    const category = "dimension_numeric_label_evidence";
    const id = await sourceObjectId(meta, category, regionId, {
      rawLabel: cleanString(label.rawLabel),
      numericValue: round(numericValue, 6),
      bbox: sourceBox,
      orientation: cleanString(label.orientation)
    });
    return {
      id,
      category: "dimensionLabelEvidence",
      rawLabel: cleanString(label.rawLabel),
      normalizedNumericValue: numericValue,
      explicitUnit: cleanString(label.explicitUnit) || null,
      bbox: sourceBox,
      orientation: cleanString(label.orientation) || null,
      rotationDegrees: round(label.rotationDegrees, 3),
      confidence: cleanString(label.confidence) || "candidate",
      runnerUpMargin: Number.isFinite(Number(label.runnerUpMargin)) ? Number(label.runnerUpMargin) : null,
      evidenceOnly: true,
      objectState: "evidence_marker",
      formalOutput: false,
      budgetExcluded: true,
      ...makeSourceContract(id, category, region, sourceBox, label)
    };
  }

  function mapCandidateHostWallEvidence(evidence, sourceWallIdsByExtractorId) {
    const original = evidence && typeof evidence === "object" ? evidence : null;
    if (!original) return null;
    const mapped = { ...original };
    const rawIds = []
      .concat(Array.isArray(original.hostWallGap?.wallIds) ? original.hostWallGap.wallIds : [])
      .concat(Array.isArray(original.hostWallIds) ? original.hostWallIds : [])
      .concat(original.hostWallId ? [original.hostWallId] : []);
    const hostWallSourceIds = Array.from(new Set(rawIds
      .map((value) => sourceWallIdsByExtractorId.get(cleanString(value)))
      .filter(Boolean))).sort();
    if (hostWallSourceIds.length) mapped.hostWallSourceIds = hostWallSourceIds;
    return mapped;
  }

  function normalizeBoundaryPoints(points) {
    const normalized = (Array.isArray(points) ? points : []).map(pointFrom).filter(Boolean);
    if (normalized.length < 3) return [];
    const deduped = normalized.filter((point, index) => (
      index === 0 || point.x !== normalized[index - 1].x || point.y !== normalized[index - 1].y
    ));
    if (deduped.length > 3 && deduped[0].x === deduped[deduped.length - 1].x && deduped[0].y === deduped[deduped.length - 1].y) {
      deduped.pop();
    }
    return deduped.length >= 3 ? deduped : [];
  }

  async function semanticCandidateToScene(candidate, index, meta, regions, sourceCategory, sceneCategory, sourceWallIdsByExtractorId = new Map()) {
    const sourceBox = boxFrom(candidate && (candidate.pageBox || candidate.bbox));
    if (!sourceBox) return null;
    const region = chooseRegion(regions, boxCenter(sourceBox));
    const regionId = region.sourceRegionId;
    const category = sourceCategory;
    const evidence = mapCandidateHostWallEvidence(candidate && candidate.evidence, sourceWallIdsByExtractorId);
    const boundaryPoints = normalizeBoundaryPoints(candidate && candidate.boundaryPoints);
    const id = await sourceObjectId(meta, category, regionId, {
      subtype: cleanString(candidate.subtype),
      bbox: sourceBox,
      evidence,
      boundaryPoints
    });
    return {
      id,
      category: sceneCategory,
      subtype: cleanString(candidate.subtype) || null,
      bbox: sourceBox,
      sourceBBox: sourceBox,
      coordinateFrame: cleanString(candidate.coordinateFrame) || "page-bottom-left-pdf-pt",
      geometry: {
        bbox: sourceBox,
        evidence,
        boundaryPoints
      },
      boundaryPoints,
      evidence,
      confidence: cleanString(candidate.confidence) || "candidate",
      semantic_status: "candidate_unaccepted",
      human_confirmation_required: true,
      extractorRank: Number.isFinite(Number(candidate.rank)) ? Number(candidate.rank) : index + 1,
      sourcePathIds: candidate && candidate.id ? [cleanString(candidate.id)] : [],
      ...makeSourceContract(id, category, region, sourceBox, candidate)
    };
  }

  async function mapAsync(items, mapper) {
    const out = [];
    for (let index = 0; index < items.length; index += 1) {
      const mapped = await mapper(items[index], index);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  function countByRegion(items) {
    return items.reduce((counts, item) => {
      const key = cleanString(item && item.sourceRegionId) || "page-1-unassigned";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function buildNativeProjectionRequirements({
    structuralWalls,
    columns,
    openingCandidates,
    stairCandidates,
    spaceBoundaryCandidates
  }) {
    const sourceId = (item) => cleanString(item && (item.source_object_id || item.sourceId || item.id));
    const accepted = (items, predicateNames) => (Array.isArray(items) ? items : [])
      .filter((item) => {
        const predicate = item && item.evidence && item.evidence.detectorPredicate;
        return predicate && predicate.pass === true && predicateNames.includes(cleanString(predicate.name));
      })
      .map(sourceId)
      .filter(Boolean)
      .sort();
    const sourceIds = {
      wall: (Array.isArray(structuralWalls) ? structuralWalls : []).map(sourceId).filter(Boolean).sort(),
      column: (Array.isArray(columns) ? columns : []).map(sourceId).filter(Boolean).sort(),
      opening: accepted(openingCandidates, ["door", "window"]),
      stair: accepted(stairCandidates, ["stair"]),
      space: accepted(spaceBoundaryCandidates, ["space"])
    };
    return {
      counts: Object.fromEntries(Object.entries(sourceIds).map(([category, ids]) => [category, ids.length])),
      sourceIds
    };
  }

  async function adaptExtractorOutput(input) {
    const raw = input && input.raw;
    if (!raw || typeof raw !== "object") {
      throw new Error("Extractor output is required.");
    }
    const meta = {
      sourceSha256: cleanString(input.sourceSha256).toUpperCase(),
      pageNumber: Number.isFinite(Number(input.pageNumber)) ? Number(input.pageNumber) : Number(raw.pageNumber) || 1
    };
    if (!meta.sourceSha256) throw new Error("Source SHA-256 is required for deterministic source ids.");
    const regions = (Array.isArray(input.regions) && input.regions.length ? input.regions : [{ sourceRegionId: "page-1-full" }]).map(normalizeRegion);
    const structuralWalls = await mapAsync(Array.isArray(raw.walls) ? raw.walls : [], (item, index) => wallToScene(item, index, meta, regions));
    const columns = await mapAsync(Array.isArray(raw.columns) ? raw.columns : [], (item, index) => columnToScene(item, index, meta, regions));
    const dimensionAxisLines = (Array.isArray(raw.axisLines) ? raw.axisLines : []).filter((axis) =>
      axis?.dimensionAxisEvidence?.regionSegmentationEligible === true ||
      axis?.dimensionAxisEvidence?.labelAssociationEligible === true
    );
    const dimensionLines = await mapAsync(dimensionAxisLines, (item, index) => axisToDimensionLine(item, index, meta, regions));
    const dimensionLabelEvidence = await mapAsync(Array.isArray(raw.numericDimensionLabels) ? raw.numericDimensionLabels : [], (item, index) => numericDimensionLabelToScene(item, index, meta, regions));
    const sourceWallIdsByExtractorId = new Map();
    structuralWalls.forEach((wall) => (wall.sourcePathIds || []).forEach((extractorId) => sourceWallIdsByExtractorId.set(cleanString(extractorId), wall.source_object_id)));
    const openingCandidates = await mapAsync(Array.isArray(raw.openingCandidates) ? raw.openingCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "opening_candidate", "opening", sourceWallIdsByExtractorId));
    const stairCandidates = await mapAsync(Array.isArray(raw.stairCandidates) ? raw.stairCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "stair_candidate", "stair", sourceWallIdsByExtractorId));
    const stairVoidCandidates = await mapAsync(Array.isArray(raw.stairVoidCandidates) ? raw.stairVoidCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "stair_void_candidate", "stairVoid", sourceWallIdsByExtractorId));
    const spaceBoundaryCandidates = await mapAsync(Array.isArray(raw.spaceBoundaryCandidates) ? raw.spaceBoundaryCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "space_boundary_candidate", "spaceBoundary", sourceWallIdsByExtractorId));
    const bathroomFixtureCandidates = await mapAsync(Array.isArray(raw.bathroomFixtureCandidates) ? raw.bathroomFixtureCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "bathroom_fixture_candidate", "bathroomFixture", sourceWallIdsByExtractorId));
    const fixedCabinetCandidates = await mapAsync(Array.isArray(raw.fixedCabinetCandidates) ? raw.fixedCabinetCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "fixed_cabinet_candidate", "fixedCabinet", sourceWallIdsByExtractorId));
    const unresolvedSymbolCandidates = await mapAsync(Array.isArray(raw.unresolvedSymbolCandidates) ? raw.unresolvedSymbolCandidates : [], (item, index) => semanticCandidateToScene(item, index, meta, regions, "unresolved_symbol_candidate", "unresolvedSymbol", sourceWallIdsByExtractorId));
    const basePdfObjects = [].concat(structuralWalls, columns, dimensionLines);
    const semanticPdfObjects = [].concat(openingCandidates, stairCandidates, stairVoidCandidates, spaceBoundaryCandidates, bathroomFixtureCandidates, fixedCabinetCandidates, unresolvedSymbolCandidates);
    const pdfDerivedObjects = [].concat(basePdfObjects, semanticPdfObjects);
    const nativeProjection = buildNativeProjectionRequirements({
      structuralWalls,
      columns,
      openingCandidates,
      stairCandidates,
      spaceBoundaryCandidates
    });
    const objectCountByRegion = countByRegion(basePdfObjects);
    const semanticObjectCountByRegion = countByRegion(semanticPdfObjects);
    const verifiedFloorObjectCountByRegion = regions.reduce((counts, region) => {
      if (region.floor_semantic && region.semantic_status === "human_verified") {
        counts[region.sourceRegionId] = objectCountByRegion[region.sourceRegionId] || 0;
      }
      return counts;
    }, {});
    const unassignedRegionIds = new Set(regions.filter((region) => region.excluded_from_floor_assignment).map((region) => region.sourceRegionId));
    const unassignedObjectCount = basePdfObjects.filter((item) => unassignedRegionIds.has(item.sourceRegionId)).length;
    const page = raw.page || {};
    return {
      schema: SCENE_SCHEMA,
      status: "candidate_review_required",
      adapter: {
        name: "pdf-plan-objectization-adapter.js",
        version: ADAPTER_VERSION,
        inputSchema: "LaibePdfPlanVectorExtractor.candidate_review_required",
        outputSchema: SCENE_SCHEMA,
        targetImporter: "window.laibePlanImportPdfObjectizationScene",
        invokedImporter: false
      },
      source: {
        input: cleanString(input.sourceUrl),
        name: cleanString(input.sourceName),
        sourceSha256: meta.sourceSha256,
        producer: "pdf-plan-objectization-adapter.js",
        extractor: "LaibePdfPlanVectorExtractor",
        extractorVersion: cleanString(raw.extractorVersion),
        pdfjsVersion: cleanString(input.pdfjsVersion)
      },
      page: {
        index: Number.isFinite(Number(input.pageIndex)) ? Number(input.pageIndex) : 0,
        number: meta.pageNumber,
        coordinateFrame: "page-bottom-left-pdf-pt",
        rect: {
          x0: 0,
          y0: 0,
          x1: round(page.width || page.viewportWidth || 0, 3),
          y1: round(page.height || page.viewportHeight || 0, 3),
          width: round(page.width || page.viewportWidth || 0, 3),
          height: round(page.height || page.viewportHeight || 0, 3)
        },
        worldUnit: "pdf_pt",
        plotScaleDenominator: null,
        acceptedTransformId: null,
        acceptedTransformStatus: "not-established"
      },
      sourceRegions: regions,
      pdfObjectPolicy: {
        source_kind: "pdf",
        object_status: "existing",
        work_action: "none",
        budget_trigger: "none",
        dbspec_projection: "excluded",
        pdf_derived_new_object_count: 0,
        automatic_budget_candidate_count: 0,
        automatic_dbspec_projection_count: 0
      },
      referenceRaster: {
        available: false,
        visibleDefault: false,
        role: "not-generated-in-r1"
      },
      rawPaths: [],
      lineSegments: [],
      structuralWalls,
      filledWallBodies: [],
      columns,
      dimensionLines,
      dimensionLabelEvidence,
      dimensionScaleDecision: null,
      leaderLines: [],
      openingCandidates,
      stairCandidates,
      stairVoidCandidates,
      spaceBoundaryCandidates,
      bathroomFixtureCandidates,
      fixedCabinetCandidates,
      unresolvedSymbolCandidates,
      classificationCoverage: clone(raw.semanticDetection && raw.semanticDetection.classificationCoverage || null),
      nativeProjectionRequirements: nativeProjection.counts,
      nativeProjectionRequiredSourceIds: nativeProjection.sourceIds,
      decodedTextRuns: dimensionLabelEvidence,
      glyphClusters: [],
      hatchNoise: [],
      qaCounters: {
        rawPathCount: Number(raw.summary && raw.summary.rawPathCount) || 0,
        lineSegmentCount: Number(raw.summary && raw.summary.rawSegmentCount) || 0,
        structuralWallCount: structuralWalls.length,
        filledWallBodyCount: 0,
        columnCount: columns.length,
        dimensionLineCount: dimensionLines.length,
        dimensionLabelEvidenceCount: dimensionLabelEvidence.length,
        leaderLineCount: 0,
        openingReviewCount: openingCandidates.length,
        doorCandidateCount: openingCandidates.filter((item) => item.subtype === "hinged_door").length,
        windowCandidateCount: openingCandidates.filter((item) => item.subtype === "window").length,
        stairReviewCount: stairCandidates.length,
        stairVoidReviewCount: stairVoidCandidates.length,
        spaceBoundaryReviewCount: spaceBoundaryCandidates.length,
        bathroomFixtureReviewCount: bathroomFixtureCandidates.length,
        fixedCabinetReviewCount: fixedCabinetCandidates.length,
        unresolvedSymbolReviewCount: unresolvedSymbolCandidates.length,
        decodedTextRunCount: dimensionLabelEvidence.length,
        glyphClusterCount: 0,
        hatchNoiseCount: Number(raw.summary && raw.summary.hatchSuppressedLineCount) || 0,
        extractorWallCandidateCount: Array.isArray(raw.walls) ? raw.walls.length : 0,
        extractorColumnCandidateCount: Array.isArray(raw.columns) ? raw.columns.length : 0,
        extractorAxisLineCandidateCount: Array.isArray(raw.axisLines) ? raw.axisLines.length : 0,
        extractorOpeningCandidateCount: Array.isArray(raw.openingCandidates) ? raw.openingCandidates.length : 0,
        extractorStairCandidateCount: Array.isArray(raw.stairCandidates) ? raw.stairCandidates.length : 0,
        extractorStairVoidCandidateCount: Array.isArray(raw.stairVoidCandidates) ? raw.stairVoidCandidates.length : 0,
        extractorSpaceBoundaryCandidateCount: Array.isArray(raw.spaceBoundaryCandidates) ? raw.spaceBoundaryCandidates.length : 0,
        extractorBathroomFixtureCandidateCount: Array.isArray(raw.bathroomFixtureCandidates) ? raw.bathroomFixtureCandidates.length : 0,
        extractorFixedCabinetCandidateCount: Array.isArray(raw.fixedCabinetCandidates) ? raw.fixedCabinetCandidates.length : 0,
        extractorUnresolvedSymbolCandidateCount: Array.isArray(raw.unresolvedSymbolCandidates) ? raw.unresolvedSymbolCandidates.length : 0,
        objectCountByRegion,
        semanticObjectCountByRegion,
        semanticObjectCount: semanticPdfObjects.length,
        verifiedFloorObjectCountByRegion,
        unassignedObjectCount,
        titleBlockOrOutsideVerifiedFloorObjectCount: unassignedObjectCount,
        pdf_derived_new_object_count: 0,
        automatic_budget_candidate_count: 0,
        automatic_dbspec_projection_count: 0,
        mapping_state: "not_accepted",
        future_editable_object_id: null
      },
      r1Limitations: {
        mapping_state: "not_accepted",
        future_editable_object_id: null,
        eastBlackWedges: "uncertain_not_openings",
        rfDashedOpenEdgeAndTankBoundary: "uncertain",
        dimensionLabels: "numeric_evidence_requires_same_region_axis_pairing_consensus_and_explicit_user_acceptance",
        stairOverlap: "does_not_prove_two_editable_objects",
        topology: "not_exhaustive"
      },
      semanticCategoryPolicy: {
        status: "candidate_unaccepted",
        human_confirmation_required: true,
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null,
        blackWedges: "uncertain_not_openings",
        rfDashedOpenEdge: "uncertain_not_opening_or_space_boundary",
        tankBoundary: "uncertain_not_space_boundary",
        source: "vector-operator-list-geometry-relations",
        noEvidenceFilesystemDependency: true
      },
      caveats: [
        "R4A adds geometry-derived semantic candidates without accepting or importing them.",
        "No Plan Puzzle importer is invoked by this adapter.",
        "Future editable_object_id values remain null until a later accepted mapping stage."
      ]
    };
  }

  global.LaibePdfPlanObjectizationAdapter = Object.freeze({
    VERSION: ADAPTER_VERSION,
    SCENE_SCHEMA,
    stableStringify,
    canonicalSha256,
    sha256HexFromText,
    adaptExtractorOutput
  });
})(typeof window !== "undefined" ? window : globalThis);
