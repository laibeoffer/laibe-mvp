import assert from "node:assert/strict";
import { File as NodeFile } from "node:buffer";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import test from "node:test";

import { loadCanonicalUpper3fFixture } from "./helpers/canonical-pdf-scene.mjs";
import { createPlanPuzzleRuntime } from "./helpers/plan-puzzle-runtime-harness.mjs";
import {
  PDF_DIMENSION_SCALE_SCHEMA,
  stableScaleDecisionHash
} from "../site/preview_floor_plan/pdf-dimension-scale-decision.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const floorPlanRoot = path.join(repoRoot, "site", "preview_floor_plan");
const paths = {
  pdf: path.join(floorPlanRoot, "_qa_pdf_reference_3rf.pdf"),
  pdfJs: path.join(floorPlanRoot, "vendor", "pdfjs", "pdf.mjs"),
  extractor: path.join(floorPlanRoot, "pdf-plan-vector-extractor.js"),
  adapter: path.join(floorPlanRoot, "pdf-plan-objectization-adapter.js"),
  recognitionGate: path.join(floorPlanRoot, "pdf-recognition-gate.mjs"),
  exactSourceRuntime: path.join(floorPlanRoot, "pdf-plan-exact-source-runtime.mjs"),
  planPuzzle: path.join(floorPlanRoot, "plan-puzzle.js"),
  codeHtml: path.join(floorPlanRoot, "code.html")
};
const exact0312PdfPath = process.env.LAIBE_A9_PDF_0312 || String.raw`Z:\01-工作專區\2025工作資料夾\01-住宅\2025.01.10 青埔 鴻築馥麗B5-13F\01-DWG圖檔\PDF\0312.pdf`;
const exact0312Sha256 = "D5644EC4F7578A08C0033502AC1CAEB3726844B83CF7623B3BE00ACA870072D3";
const autoScaleUiRejections = JSON.parse(readFileSync(
  path.join(repoRoot, "tests", "fixtures", "pdf-auto-scale-ui-rejections.json"),
  "utf8"
));
const exact0312FrozenBrowserReceipt = JSON.parse(readFileSync(
  path.join(repoRoot, "tests", "fixtures", "exact-0312-lower-plan-browser-receipt.json"),
  "utf8"
));

let canonical;

const capturedBrowserScaleFixture = Object.freeze({
  schema: "laibe.tests.browserCapturedPostScaleGeometry.v1",
  sourcePdfSha256: "37c9016adffa354030b0dad746cfbb7887b45812f4fb7332ba6aecb908079aba",
  browserSelectedRegionId: "page-1-dimension-cluster-b",
  fixtureSelectedRegionId: "page-1-region-3f",
  acceptedTransformId: "captured-browser-scale-6500x5250",
  receipt: Object.freeze({
    geometryScaleFactor: 1.0004515618816305,
    geometryScaleFactorX: 0.9974686764689193,
    geometryScaleFactorY: 1.0034344472943415,
    acceptedWorldMmPerPt: 21.776191967000003,
    acceptedWorldMmPerPtX: 21.711265400000002,
    acceptedWorldMmPerPtY: 21.841118534
  })
});

const authoritativeRejectedBrowserLocators = Object.freeze({
  junctionIds: Object.freeze([
    "wall_column_butt:native-column-src_column_4062810cfb1e020cb50b9bb1:pdf-wall-src_wall_2dd371f480a76ba084e09331",
    "wall_l_miter:pdf-wall-src_wall_2dd371f480a76ba084e09331:pdf-wall-src_wall_bf73a221d1eb40e7ca54e04c",
    "wall_t:pdf-wall-src_wall_2dd371f480a76ba084e09331:pdf-wall-src_wall_38c2d34a49f601ecb9d6129a",
    "wall_t:pdf-wall-src_wall_2dd371f480a76ba084e09331:pdf-wall-src_wall_53b263bb26cd41fc7e94c37b",
    "wall_t:pdf-wall-src_wall_2dd371f480a76ba084e09331:pdf-wall-src_wall_b065aabb64b3f17a297b1236"
  ]),
  protrusions: Object.freeze([
    Object.freeze({ wallId: "pdf-wall-src_wall_b065aabb64b3f17a297b1236", partId: "pdf-wall-src_wall_b065aabb64b3f17a297b1236:part-1", columnId: "native-column-src_column_71ec94e06b1536c5c7d77efb", rejectedAreaMm2: 9750.129539 }),
    Object.freeze({ wallId: "pdf-wall-src_wall_088970be3f881bd4d6bfdc63", partId: "pdf-wall-src_wall_088970be3f881bd4d6bfdc63:part-1", columnId: "native-column-src_column_9e957281cdd4d645fded9e81", rejectedAreaMm2: 60.796898 }),
    Object.freeze({ wallId: "pdf-wall-src_wall_bf73a221d1eb40e7ca54e04c", partId: "pdf-wall-src_wall_bf73a221d1eb40e7ca54e04c:part-1", columnId: "native-column-src_column_172cf2e376aea1f9526ecfe5", rejectedAreaMm2: 4788.947223 }),
    Object.freeze({ wallId: "pdf-wall-src_wall_bf73a221d1eb40e7ca54e04c", partId: "pdf-wall-src_wall_bf73a221d1eb40e7ca54e04c:part-1", columnId: "native-column-src_column_4062810cfb1e020cb50b9bb1", rejectedAreaMm2: 4480.946707 }),
    Object.freeze({ wallId: "pdf-wall-src_wall_0192f5dc11fd5f80956eec75", partId: "pdf-wall-src_wall_0192f5dc11fd5f80956eec75:part-1", columnId: "native-column-src_column_172cf2e376aea1f9526ecfe5", rejectedAreaMm2: 7597.213786 }),
    Object.freeze({ wallId: "pdf-wall-src_wall_11e316f3a5e714b1446ce276", partId: "pdf-wall-src_wall_11e316f3a5e714b1446ce276:part-1", columnId: "native-column-src_column_8cc93f97572eda963c81fa4e", rejectedAreaMm2: 12999.686086 }),
    Object.freeze({ wallId: "pdf-wall-src_wall_07c1be5b8aa474a9232e239f", partId: "pdf-wall-src_wall_07c1be5b8aa474a9232e239f:part-1", columnId: "native-column-src_column_8cc93f97572eda963c81fa4e", rejectedAreaMm2: 7413.876362 })
  ])
});

function acceptedTestScaleDecision(selectedRegionId) {
  return {
    schema: PDF_DIMENSION_SCALE_SCHEMA,
    status: "passed",
    confidence: 0.99,
    selectedRegionId,
    inferredUnit: "cm",
    worldMmPerPtX: 20,
    worldMmPerPtY: 20,
    acceptedWorldMmPerPt: 20,
    axes: [
      {
        orientation: "horizontal",
        dimensionTextSourceId: "test-scale-horizontal-text",
        dimensionLineSourceId: "test-scale-horizontal-line",
        witnessLineSourceIds: ["test-scale-horizontal-w1", "test-scale-horizontal-w2"],
        displayedValue: "600",
        interpretedLengthMm: 6000,
        measuredLengthPt: 300,
        worldMmPerPt: 20
      },
      {
        orientation: "vertical",
        dimensionTextSourceId: "test-scale-vertical-text",
        dimensionLineSourceId: "test-scale-vertical-line",
        witnessLineSourceIds: ["test-scale-vertical-w1", "test-scale-vertical-w2"],
        displayedValue: "500",
        interpretedLengthMm: 5000,
        measuredLengthPt: 250,
        worldMmPerPt: 20
      }
    ],
    audit: {
      independentAxisCount: 2,
      unitSolutionCount: 1,
      consistencyErrorPct: 0,
      competingScaleClusterCount: 0,
      allEvidenceInsideSelectedRegion: true,
      pass: true
    }
  };
}

function acceptedTestScaleBinding(fileSha256, selectedRegionId) {
  const scaleDecision = acceptedTestScaleDecision(selectedRegionId);
  return {
    fileSha256,
    sourcePdfSha256: fileSha256,
    pageNumber: 1,
    selectedRegionId,
    scaleDecisionSchema: PDF_DIMENSION_SCALE_SCHEMA,
    scaleDecisionHash: stableScaleDecisionHash(scaleDecision),
    scaleDecision
  };
}

function forgedUnprovenScaleDecision(selectedRegionId) {
  const decision = acceptedTestScaleDecision(selectedRegionId);
  decision.axes[0].displayedValue = "650";
  decision.axes[0].interpretedLengthMm = 6500;
  decision.axes[0].measuredLengthPt = 299.52;
  decision.worldMmPerPtX =
    decision.axes[0].interpretedLengthMm / decision.axes[0].measuredLengthPt;
  decision.axes[0].worldMmPerPt = decision.worldMmPerPtX;
  decision.axes[1].displayedValue = "525";
  decision.axes[1].interpretedLengthMm = 5250;
  decision.axes[1].measuredLengthPt = 240.48;
  decision.worldMmPerPtY =
    decision.axes[1].interpretedLengthMm / decision.axes[1].measuredLengthPt;
  decision.axes[1].worldMmPerPt = decision.worldMmPerPtY;
  decision.acceptedWorldMmPerPt =
    (decision.worldMmPerPtX + decision.worldMmPerPtY) / 2;
  decision.audit.consistencyErrorPct = Math.abs(
    decision.worldMmPerPtX - decision.worldMmPerPtY
  ) / decision.acceptedWorldMmPerPt * 100;
  return decision;
}

test.before(async () => {
  canonical = await loadCanonicalUpper3fFixture(paths);
});

test("exact 0312 page 1 exposes witness-backed dual-axis outlined dimensions for automatic scale", {
  skip: !existsSync(exact0312PdfPath)
}, async () => {
  const bytes = new Uint8Array(readFileSync(exact0312PdfPath));
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  assert.equal(sourceSha256, exact0312Sha256);

  const pdfDocument = await globalThis.pdfjsLib.getDocument({
    data: bytes,
    disableWorker: true
  }).promise;
  const page = await pdfDocument.getPage(1);
  const raw = await globalThis.LaibePdfPlanVectorExtractor.extractFromPage(page, {
    pdfjsLib: globalThis.pdfjsLib,
    pdfDocument,
    sourceFileName: "0312.pdf",
    pageNumber: 1
  });
  const chainAxes = raw.axisLines.filter(
    (axis) => axis.dimensionAxisEvidence?.chainCompatible === true
  );
  const orientations = Array.from(new Set(chainAxes.map((axis) => axis.orientation))).sort();
  const vectorGroups = raw.dimensionEvidence.vectorGlyphGroups || [];
  const diagnostic = JSON.stringify({
    sourceSha256,
    axisCount: raw.axisLines.length,
    axes: raw.axisLines.map((axis) => ({
      id: axis.id,
      orientation: axis.orientation,
      axisSpanPt: axis.axisSpanPt,
      witnessCount: axis.dimensionAxisEvidence?.witnessCount || 0,
      chainCompatible: axis.dimensionAxisEvidence?.chainCompatible === true
    })),
    vectorGroups,
    outlinedDigitDecoder: raw.dimensionEvidence.outlinedDigitDecoder
  });

  assert.deepEqual(orientations, ["horizontal", "vertical"], diagnostic);
  for (const expectedSpan of [36.84, 68.04, 136.08]) {
    assert.ok(chainAxes.some((axis) => Math.abs(axis.axisSpanPt - expectedSpan) <= 0.01), diagnostic);
  }
  assert.ok(vectorGroups.some((group) => group.orientation === "horizontal" && group.glyphCount >= 2), diagnostic);
  assert.ok(vectorGroups.some((group) => group.orientation === "vertical" && group.glyphCount >= 3), diagnostic);
  assert.ok(chainAxes.filter((axis) => axis.dimensionAxisEvidence?.regionSegmentationEligible === true).length < 4, diagnostic);
  [36.84, 68.04, 136.08].forEach((expectedSpan) => {
    const targetAxis = chainAxes.find((axis) => Math.abs(axis.axisSpanPt - expectedSpan) <= 0.01);
    assert.ok(targetAxis, diagnostic);
    assert.ok(targetAxis.dimensionAxisEvidence.witnessEndpointCoverage?.first?.length >= 1, diagnostic);
    assert.ok(targetAxis.dimensionAxisEvidence.witnessEndpointCoverage?.second?.length >= 1, diagnostic);
  });

  const frozen = exact0312FrozenBrowserReceipt;
  assert.equal(frozen.schema, "laibe.tests.exact0312FrozenBrowserReceipt.v1");
  assert.equal(frozen.sourcePdfSha256, sourceSha256);
  assert.equal(frozen.pageNumber, 1);
  assert.deepEqual(
    frozen.dimensionScale.decodedPairs.map((pair) => pair.rawLabel).sort(),
    ["120", "240", "65"]
  );
  assert.deepEqual(
    frozen.dimensionScale.decodedPairs.map((pair) => pair.axisSpanPt).sort((a, b) => a - b),
    [36.84, 68.04, 136.08]
  );
  assert.equal(
    frozen.dimensionScale.decodedPairs.every((pair) =>
      pair.axisId.startsWith("src_dimension_axis_") &&
      pair.labelId.startsWith("src_dimension_label_") &&
      pair.chainCompatible === true &&
      pair.witnessCount >= 2 &&
      pair.sourceRegionId === frozen.selectedRegionId
    ),
    true
  );
  assert.equal(frozen.dimensionScale.pairRegionCount, 1);
  assert.deepEqual(frozen.dimensionScale.availableOrientations, ["horizontal", "vertical"]);
  assert.equal(frozen.dimensionScale.crossAxisConsistencyPass, true);
  assert.ok(frozen.dimensionScale.crossAxisRelativeError <= 0.01);
  assert.equal(frozen.dimensionScale.consensusPass, true);
  assert.equal(frozen.dimensionScale.inferredUnit, "cm");
  assert.equal(frozen.dimensionScale.decisionPass, true);
  assert.deepEqual(frozen.dimensionScale.failedRules, []);
  assert.equal(frozen.dimensionScale.acceptedTransformStatus, "accepted_automatic_dimension_scale");
  assert.equal(frozen.dimensionScale.unitsProven, true);
  assert.deepEqual(frozen.nativeObjectCategories, {
    walls: 200,
    structures: 1,
    openings: 12,
    zones: 0,
    furniture: 0,
    reviewText: 14,
    reviewLines: 4,
    reviewShapes: 23,
    stairs: 0
  });
  assert.deepEqual(
    {
      pass: frozen.topology.pass,
      gapCount: frozen.topology.gapCount,
      illegalOverlapCount: frozen.topology.illegalOverlapCount,
      protrusionCount: frozen.topology.protrusionCount,
      disconnectedBoundaryCount: frozen.topology.disconnectedBoundaryCount,
      failedJunctionCount: frozen.topology.failedJunctionCount,
      closureCount: frozen.topology.closureCount,
      allClosuresSourceJunctionProven: frozen.topology.allClosuresSourceJunctionProven,
      hashesMatch: frozen.topology.hashesMatch
    },
    {
      pass: true,
      gapCount: 0,
      illegalOverlapCount: 0,
      protrusionCount: 0,
      disconnectedBoundaryCount: 0,
      failedJunctionCount: 0,
      closureCount: 16,
      allClosuresSourceJunctionProven: true,
      hashesMatch: true
    }
  );
  assert.equal(frozen.topology.renderGeometryHash, frozen.topology.domGeometryHash);
});

function sceneWithOptionalUnderlay() {
  return {
    ...structuredClone(canonical.scopedScene),
    referenceRaster: {
      available: true,
      visibleDefault: true,
      dataUrl: "data:image/png;base64,AA==",
      renderMode: "pdf-vector-context",
      coordinateWidthMm: 8420,
      coordinateHeightMm: 11910,
      sourcePageWidth: 842,
      sourcePageHeight: 1191,
      sourcePdfSha256: canonical.sourceSha256,
      sourceType: "vector_pdf",
      sourceCoordinateFrame: "page-bottom-left-pdf-pt"
    }
  };
}

function nativeScaleEvidence() {
  return {
    schema: "laibe.planPuzzle.nativePdfScaleEvidence.v1",
    axes: canonical.scopedScene.dimensionLines.map((line) => ({
      sourceId: line.id,
      orientation: line.orientation,
      measuredLengthMm: line.orientation === "horizontal" ? 6500 : 5250
    }))
  };
}

function browserEquivalentPdfJs(pdfjsLib) {
  return {
    ...pdfjsLib,
    getDocument(options) {
      const loadingTask = pdfjsLib.getDocument(options);
      return {
        promise: loadingTask.promise.then((document) => new Proxy(document, {
          get(target, property) {
            if (property === "getPage") {
              return async (pageNumber) => {
                const page = await target.getPage(pageNumber);
                return new Proxy(page, {
                  get(pageTarget, pageProperty) {
                    if (pageProperty === "render") {
                      return () => ({ promise: Promise.resolve() });
                    }
                    const value = pageTarget[pageProperty];
                    return typeof value === "function" ? value.bind(pageTarget) : value;
                  }
                });
              };
            }
            const value = target[property];
            return typeof value === "function" ? value.bind(target) : value;
          }
        }))
      };
    }
  };
}

function browserEquivalentRasterDocument(runtime) {
  return {
    body: runtime.document.body,
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    createElement(tagName) {
      if (tagName !== "canvas") return runtime.document.createElement(tagName);
      const canvas = {
        width: 0,
        height: 0,
        getContext() {
          return {
            canvas,
            fillStyle: "",
            fillRect() {}
          };
        },
        toDataURL() {
          return "data:image/png;base64,AA==";
        }
      };
      return canvas;
    }
  };
}

async function waitForValue(read, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function createConfirmedWorkingDraftStorage(project) {
  const sourceBinding = structuredClone(project.sourceBinding);
  const first = (values, fallback) => {
    const match = values.find((value) => value !== null && value !== undefined && String(value).trim());
    return match === undefined ? fallback : String(match).trim();
  };
  const scope = {
    caseId: first([
      sourceBinding?.caseId,
      project.r6Review?.caseId,
      project.r6Review?.importReceipt?.caseId,
      project.importSource?.caseId
    ], "case-unresolved"),
    pageRef: first([
      sourceBinding?.pageRef,
      project.r6Review?.importReceipt?.source?.page,
      project.r6Review?.importReceipt?.source?.pageNumber,
      project.importSource?.page,
      project.importSource?.pageNumber,
      project.underlay?.page,
      project.lastPdfObjectizationSceneImport?.page
    ], "page-unresolved"),
    floorRef: first([
      sourceBinding?.floorRef,
      project.importSource?.floorId,
      project.importSource?.floorLabel,
      project.underlay?.floorId,
      project.underlay?.floorLabel,
      project.lastPdfObjectizationSceneImport?.floorId,
      project.lastPdfObjectizationSceneImport?.floorLabel
    ], "floor-unresolved"),
    sourceSha256: first([
      sourceBinding?.sourceSha256,
      project.importSource?.sourceSha256,
      project.importSource?.sourcePdfSha256,
      project.underlay?.sourcePdfSha256,
      project.underlay?.sourceSha256,
      project.r6Review?.importReceipt?.file?.sha256,
      project.lastPdfObjectizationSceneImport?.sourcePdfSha256
    ], "manual-source")
  };
  const storageKey = "laibePlanPuzzleWorkingDraftV3:" + [
    scope.caseId,
    scope.sourceSha256,
    scope.pageRef,
    scope.floorRef
  ].map((value) => encodeURIComponent(String(value).trim())).join(":");
  const savedAt = new Date().toISOString();
  return {
    [storageKey]: JSON.stringify({
      schema: "laibe.planPuzzle.workingDraft.v3",
      savedAt,
      sourceBinding,
      storageScope: scope,
      project: structuredClone(project)
    }),
    laibePlanPuzzleActiveWorkingDraftV1: JSON.stringify({
      schema: "laibe.planPuzzle.activeWorkingDraft.v1",
      storageKey,
      sourceBinding,
      updatedAt: savedAt
    })
  };
}

function createAuthorizedRuntime(runtimeOptions = {}) {
  const consumedTokens = new Set();
  let consumeCalls = 0;
  const recognitionApi = {
    consumeRecognitionImportAuthorization(token, request) {
      consumeCalls += 1;
      if (!["task2-once", "task2-reimport"].includes(token) || consumedTokens.has(token)) return false;
      const validation = canonical.gate.validateNativeConversionRequest({
        scene: request.scene,
        manifest: request.manifest,
        binding: request.binding
      });
      if (!validation.ok) return false;
      consumedTokens.add(token);
      return true;
    }
  };
  const runtime = createPlanPuzzleRuntime(paths.planPuzzle, {
    ...runtimeOptions,
    recognitionApi
  });
  const scaleBinding = acceptedTestScaleBinding(
    canonical.sourceSha256,
    canonical.upperRegionId
  );
  return {
    runtime,
    importScene(scene = sceneWithOptionalUnderlay(), overrides = {}) {
      return runtime.window.laibePlanImportPdfObjectizationScene(scene, {
        recognitionManifest: canonical.approved,
        recognitionBinding: scaleBinding,
        recognitionAuthorizationToken: "task2-once",
        sourceSha256: canonical.sourceSha256,
        selectedRegionId: canonical.upperRegionId,
        actorId: "業主",
        caseId: "task2-case",
        nativeScaleEvidence: nativeScaleEvidence(),
        ...overrides
      });
    },
    consumeCalls() {
      return consumeCalls;
    }
  };
}

function createTopologyProofRuntime() {
  return createPlanPuzzleRuntime(paths.planPuzzle, {
    transformPlanPuzzleSource(source) {
      return source.replace(
        "  window.laibePlanConfirmNativePdfScale = confirmNativePdfScale;",
        [
          "  window.LaibePlanPuzzleQa.canonicalizeNativePdfWallTopologyFixture = function canonicalizeNativePdfWallTopologyFixture(walls) {",
          "    return canonicalizeNativePdfWallTopology(walls, [], '2026-07-26T00:00:00.000Z');",
          "  };",
          "  window.LaibePlanPuzzleQa.closeNativePdfWallBodyJunctionGapsFixture = function closeNativePdfWallBodyJunctionGapsFixture(walls) {",
          "    return closeNativePdfWallBodyJunctionGaps(walls, [], 250);",
          "  };",
          "  window.laibePlanConfirmNativePdfScale = confirmNativePdfScale;"
        ].join("\n")
      );
    }
  });
}

function topologyProofWall(id, sourceId, from, to, sourceFrom, sourceTo) {
  return {
    id,
    source_object_id: sourceId,
    source_object_ids: [sourceId],
    sourceRegionId: "fixture-region",
    sourceGeometryPdfPt: {
      p1: sourceFrom,
      p2: sourceTo
    },
    sourceBBox: {
      x0: Math.min(sourceFrom.x, sourceTo.x),
      y0: Math.min(sourceFrom.y, sourceTo.y),
      x1: Math.max(sourceFrom.x, sourceTo.x),
      y1: Math.max(sourceFrom.y, sourceTo.y)
    },
    from,
    to,
    thickness: 100,
    topologyEndpointDispositions: {},
    topologyEndpointDispositionEvidence: {},
    orientation: Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
      ? "horizontal"
      : "vertical"
  };
}

function createConservationProbe(scene, manifest) {
  const runtime = createPlanPuzzleRuntime(paths.planPuzzle, {
    recognitionApi: {
      consumeRecognitionImportAuthorization() {
        return true;
      }
    }
  });
  const before = projectFingerprint(runtime.project());
  const result = runtime.window.laibePlanImportPdfObjectizationScene(scene, {
    recognitionManifest: manifest,
    recognitionBinding: acceptedTestScaleBinding(
      canonical.sourceSha256,
      canonical.upperRegionId
    ),
    recognitionAuthorizationToken: "conservation-probe",
    sourceSha256: canonical.sourceSha256,
    selectedRegionId: canonical.upperRegionId,
    actorId: "conservation-test",
    caseId: "conservation-test-case",
    nativeScaleEvidence: nativeScaleEvidence()
  });
  return {
    runtime,
    result,
    before,
    after: projectFingerprint(runtime.project())
  };
}

function dispatchProductAction(runtime, action) {
  runtime.window.document.dispatchEvent({
    type: "click",
    target: {
      dataset: { action },
      closest(selector) {
        return selector === "[data-action]" ? this : null;
      }
    }
  });
}

function dispatchProductField(runtime, field, value, eventType = "change") {
  runtime.window.document.dispatchEvent({
    type: eventType,
    target: {
      dataset: { field },
      value: String(value),
      closest(selector) {
        return selector === "[data-field]" ? this : null;
      }
    }
  });
}

function confirmAllOpeningReviewsThroughProductUi(runtime) {
  dispatchProductAction(runtime, "review-native-pdf-evidence");
  runtime.project().openings.forEach(() => {
    dispatchProductAction(runtime, "confirm-native-pdf-opening-review");
  });
  const firstOpeningId = runtime.project().openings[0]?.id;
  const firstOpeningHit = runtime.elements.get("openingLayer").children.find(
    (element) => element.classList?.contains("opening-hit-target") && element.dataset.openingId === firstOpeningId
  );
  assert.ok(firstOpeningHit);
  firstOpeningHit.click();
}

function projectFingerprint(project) {
  return JSON.stringify({
    sourceBinding: project.sourceBinding,
    walls: project.walls,
    openings: project.openings,
    structures: project.structures,
    zones: project.zones,
    furniture: project.furniture,
    review: project.pdfReviewObjects,
    scale: project.scale,
    caseEvents: project.caseEvents
  });
}

function rawNativeTopologyDefects(project) {
  const walls = project.walls || [];
  const nativeColumns = (project.structures || []).filter(
    (column) => column.native === true && column.locked === true
  );
  const columns = nativeColumns.length
    ? nativeColumns
    : (project.pdfReviewObjects?.referenceCollections?.structuralColumns || []);
  const epsilon = 0.001;
  const medianThickness = walls
    .map((wall) => Number(wall.thickness))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)[Math.floor(walls.length / 2)] || 80;
  const junctionTolerance = Math.max(25, Math.min(250, medianThickness * 2));
  const distance = (first, second) => Math.hypot(second.x - first.x, second.y - first.y);
  const cross = (first, second) => first.x * second.y - first.y * second.x;
  const subtract = (first, second) => ({ x: first.x - second.x, y: first.y - second.y });
  const pointToSegment = (point, wall) => {
    const vector = subtract(wall.to, wall.from);
    const lengthSquared = vector.x * vector.x + vector.y * vector.y;
    if (!(lengthSquared > 0)) return { distance: Infinity, t: 0, point: wall.from };
    const t = Math.max(0, Math.min(1, ((point.x - wall.from.x) * vector.x + (point.y - wall.from.y) * vector.y) / lengthSquared));
    const projection = { x: wall.from.x + vector.x * t, y: wall.from.y + vector.y * t };
    return { distance: distance(point, projection), t, point: projection };
  };
  const clipSegmentToRect = (from, to, rect) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let t0 = 0;
    let t1 = 1;
    const tests = [
      [-dx, from.x - rect.x0],
      [dx, rect.x1 - from.x],
      [-dy, from.y - rect.y0],
      [dy, rect.y1 - from.y]
    ];
    for (const [p, q] of tests) {
      if (Math.abs(p) <= epsilon) {
        if (q < 0) return null;
        continue;
      }
      const ratio = q / p;
      if (p < 0) t0 = Math.max(t0, ratio);
      else t1 = Math.min(t1, ratio);
      if (t0 > t1) return null;
    }
    return [t0, t1];
  };
  const columnRects = columns.map((column) => {
    if (Array.isArray(column.polygonMm) && column.polygonMm.length >= 3) {
      const xs = column.polygonMm.map((point) => Number(point.x));
      const ys = column.polygonMm.map((point) => Number(point.y));
      return {
        id: column.id,
        x0: Math.min(...xs),
        y0: Math.min(...ys),
        x1: Math.max(...xs),
        y1: Math.max(...ys)
      };
    }
    return {
      id: column.id,
      x0: Number(column.position?.x),
      y0: Number(column.position?.y),
      x1: Number(column.position?.x) + Number(column.widthMm),
      y1: Number(column.position?.y) + Number(column.heightMm)
    };
  });
  const pointInsideRect = (point, rect) =>
    point.x > rect.x0 + epsilon && point.x < rect.x1 - epsilon &&
    point.y > rect.y0 + epsilon && point.y < rect.y1 - epsilon;
  const pointOnRectBoundary = (point, rect) =>
    point.x >= rect.x0 - epsilon && point.x <= rect.x1 + epsilon &&
    point.y >= rect.y0 - epsilon && point.y <= rect.y1 + epsilon &&
    (
      Math.abs(point.x - rect.x0) <= epsilon ||
      Math.abs(point.x - rect.x1) <= epsilon ||
      Math.abs(point.y - rect.y0) <= epsilon ||
      Math.abs(point.y - rect.y1) <= epsilon
    );
  const wallBodyPolygon = (wall) => {
    const dx = Number(wall.to?.x) - Number(wall.from?.x);
    const dy = Number(wall.to?.y) - Number(wall.from?.y);
    const length = Math.hypot(dx, dy);
    const halfThickness = Number(wall.thickness) / 2;
    if (!(length > epsilon) || !(halfThickness > 0)) return [];
    const nx = -dy / length * halfThickness;
    const ny = dx / length * halfThickness;
    return [
      { x: wall.from.x + nx, y: wall.from.y + ny },
      { x: wall.to.x + nx, y: wall.to.y + ny },
      { x: wall.to.x - nx, y: wall.to.y - ny },
      { x: wall.from.x - nx, y: wall.from.y - ny }
    ];
  };
  const clipPolygon = (polygon, inside, intersect) => {
    const output = [];
    if (!polygon.length) return output;
    let previous = polygon.at(-1);
    let previousInside = inside(previous);
    polygon.forEach((current) => {
      const currentInside = inside(current);
      if (currentInside !== previousInside) output.push(intersect(previous, current));
      if (currentInside) output.push(current);
      previous = current;
      previousInside = currentInside;
    });
    return output;
  };
  const clipWallBodyToColumn = (wall, rect) => {
    let polygon = wallBodyPolygon(wall);
    const clipAxis = (axis, limit, keepGreater) => {
      polygon = clipPolygon(
        polygon,
        (point) => keepGreater ? point[axis] >= limit : point[axis] <= limit,
        (first, second) => {
          const delta = second[axis] - first[axis];
          const t = Math.abs(delta) <= epsilon ? 0 : (limit - first[axis]) / delta;
          return {
            x: first.x + (second.x - first.x) * t,
            y: first.y + (second.y - first.y) * t
          };
        }
      );
    };
    clipAxis("x", rect.x0, true);
    clipAxis("x", rect.x1, false);
    clipAxis("y", rect.y0, true);
    clipAxis("y", rect.y1, false);
    return polygon;
  };
  const polygonArea = (polygon) => Math.abs(polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  const signedPolygonArea = (polygon) => polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
  const clipConvexPolygons = (subjectPolygon, clippingPolygon) => {
    let output = subjectPolygon.map((point) => ({ ...point }));
    const winding = signedPolygonArea(clippingPolygon) >= 0 ? 1 : -1;
    const edgeDistance = (edgeFrom, edgeTo, point) => winding * cross(
      subtract(edgeTo, edgeFrom),
      subtract(point, edgeFrom)
    );
    for (let index = 0; index < clippingPolygon.length; index += 1) {
      const edgeFrom = clippingPolygon[index];
      const edgeTo = clippingPolygon[(index + 1) % clippingPolygon.length];
      output = clipPolygon(
        output,
        (point) => edgeDistance(edgeFrom, edgeTo, point) >= -epsilon,
        (first, second) => {
          const firstDistance = edgeDistance(edgeFrom, edgeTo, first);
          const secondDistance = edgeDistance(edgeFrom, edgeTo, second);
          const denominator = firstDistance - secondDistance;
          const t = Math.abs(denominator) <= epsilon ? 0 : firstDistance / denominator;
          return {
            x: first.x + (second.x - first.x) * t,
            y: first.y + (second.y - first.y) * t
          };
        }
      );
      if (!output.length) break;
    }
    return output;
  };
  const pointKey = (point) => `${Number(point.x).toFixed(3)},${Number(point.y).toFixed(3)}`;
  const endpointValence = new Map();
  walls.forEach((wall) => {
    [wall.from, wall.to].forEach((point) => {
      const key = pointKey(point);
      endpointValence.set(key, (endpointValence.get(key) || 0) + 1);
    });
  });
  const isDanglingPoint = (point) => (endpointValence.get(pointKey(point)) || 0) === 1;

  let disconnectedWallJunctions = 0;
  let collinearWallOverlaps = 0;
  let duplicateWallSegments = 0;
  let unresolvedWallCrossings = 0;
  let wallWallBodyOverlaps = 0;
  const disconnectedSamples = [];
  for (let firstIndex = 0; firstIndex < walls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < walls.length; secondIndex += 1) {
      const first = walls[firstIndex];
      const second = walls[secondIndex];
      const firstVector = subtract(first.to, first.from);
      const secondVector = subtract(second.to, second.from);
      const denominator = cross(firstVector, secondVector);
      const qMinusP = subtract(second.from, first.from);
      const firstLength = distance(first.from, first.to);
      const secondLength = distance(second.from, second.to);
      const endpointsMatch =
        (distance(first.from, second.from) <= epsilon && distance(first.to, second.to) <= epsilon) ||
        (distance(first.from, second.to) <= epsilon && distance(first.to, second.from) <= epsilon);
      if (endpointsMatch) {
        duplicateWallSegments += 1;
        continue;
      }
      if (Math.abs(denominator) <= epsilon * Math.max(1, firstLength * secondLength)) {
        const perpendicular = firstLength > 0 ? Math.abs(cross(qMinusP, firstVector)) / firstLength : Infinity;
        if (perpendicular <= epsilon) {
          const axis = Math.abs(firstVector.x) >= Math.abs(firstVector.y) ? "x" : "y";
          const firstRange = [first.from[axis], first.to[axis]].sort((a, b) => a - b);
          const secondRange = [second.from[axis], second.to[axis]].sort((a, b) => a - b);
          const overlap = Math.min(firstRange[1], secondRange[1]) - Math.max(firstRange[0], secondRange[0]);
          if (overlap > epsilon) collinearWallOverlaps += 1;
          else {
            const endpointPairs = [
              [first.from, second.from],
              [first.from, second.to],
              [first.to, second.from],
              [first.to, second.to]
            ].map(([firstPoint, secondPoint]) => ({
              firstPoint,
              secondPoint,
              distance: distance(firstPoint, secondPoint)
            })).sort((left, right) => left.distance - right.distance);
            const closestPair = endpointPairs[0];
            if (
              closestPair.distance > epsilon &&
              closestPair.distance <= junctionTolerance &&
              (isDanglingPoint(closestPair.firstPoint) || isDanglingPoint(closestPair.secondPoint))
            ) {
            disconnectedWallJunctions += 1;
            disconnectedSamples.push({
              first: { id: first.id, from: first.from, to: first.to },
              second: { id: second.id, from: second.from, to: second.to }
            });
            }
          }
        }
        continue;
      }
      const t = cross(qMinusP, secondVector) / denominator;
      const u = cross(qMinusP, firstVector) / denominator;
      if (t >= -epsilon && t <= 1 + epsilon && u >= -epsilon && u <= 1 + epsilon) {
        const firstEndpoint = t <= epsilon || t >= 1 - epsilon;
        const secondEndpoint = u <= epsilon || u >= 1 - epsilon;
        if (!(firstEndpoint && secondEndpoint)) unresolvedWallCrossings += 1;
        continue;
      }
      const closest = [
        { ...pointToSegment(first.from, second), sourceEndpoint: first.from },
        { ...pointToSegment(first.to, second), sourceEndpoint: first.to },
        { ...pointToSegment(second.from, first), sourceEndpoint: second.from },
        { ...pointToSegment(second.to, first), sourceEndpoint: second.to }
      ].reduce((best, candidate) => candidate.distance < best.distance ? candidate : best);
      if (
        closest.distance > epsilon &&
        closest.distance <= junctionTolerance &&
        isDanglingPoint(closest.sourceEndpoint)
      ) {
        disconnectedWallJunctions += 1;
        disconnectedSamples.push({
          first: { id: first.id, from: first.from, to: first.to },
          second: { id: second.id, from: second.from, to: second.to },
          distance: closest.distance
        });
      }
    }
  }
  for (let firstIndex = 0; firstIndex < walls.length; firstIndex += 1) {
    const first = walls[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < walls.length; secondIndex += 1) {
      const second = walls[secondIndex];
      const sharedEndpoint = [first.from, first.to].some((firstPoint) =>
        [second.from, second.to].some((secondPoint) => distance(firstPoint, secondPoint) <= epsilon)
      );
      const firstVector = subtract(first.to, first.from);
      const secondVector = subtract(second.to, second.from);
      const nonCollinear = Math.abs(cross(firstVector, secondVector)) >
        epsilon * Math.max(
          1,
          distance(first.from, first.to) * distance(second.from, second.to)
        );
      if (sharedEndpoint && nonCollinear) continue;
      const intersection = clipConvexPolygons(wallBodyPolygon(first), wallBodyPolygon(second));
      if (polygonArea(intersection) > epsilon * epsilon) wallWallBodyOverlaps += 1;
    }
  }

  const wallColumnGapKeys = new Set();
  const wallColumnOverlapKeys = new Set();
  const wallColumnGapSamples = [];
  const wallColumnOverlapSamples = [];
  walls.forEach((wall) => {
    columnRects.forEach((rect) => {
      const bodyIntersection = clipWallBodyToColumn(wall, rect);
      const overlapAreaMm2 = polygonArea(bodyIntersection);
      if (overlapAreaMm2 > epsilon * epsilon) {
        wallColumnOverlapKeys.add(`${wall.id}|${rect.id}`);
        wallColumnOverlapSamples.push({
          wall: {
            id: wall.id,
            from: wall.from,
            to: wall.to,
            thickness: wall.thickness
          },
          column: rect,
          overlapAreaMm2
        });
      }
      [
        { name: "from", point: wall.from, other: wall.to },
        { name: "to", point: wall.to, other: wall.from }
      ].forEach((endpoint) => {
        if (!isDanglingPoint(endpoint.point)) return;
        if (pointInsideRect(endpoint.point, rect) || pointOnRectBoundary(endpoint.point, rect)) return;
        const vx = endpoint.point.x - endpoint.other.x;
        const vy = endpoint.point.y - endpoint.other.y;
        const length = Math.hypot(vx, vy);
        if (!(length > 0)) return;
        const probe = {
          x: endpoint.point.x + vx / length * junctionTolerance,
          y: endpoint.point.y + vy / length * junctionTolerance
        };
        if (clipSegmentToRect(endpoint.point, probe, rect)) {
          wallColumnGapKeys.add(`${wall.id}|${endpoint.name}|${rect.id}`);
          wallColumnGapSamples.push({
            wall: { id: wall.id, from: wall.from, to: wall.to },
            endpoint: endpoint.name,
            column: rect
          });
        }
      });
    });
  });
  const subThicknessColumnConnectors = walls.filter((wall) => {
    const wallLength = distance(wall.from, wall.to);
    return (
      wallLength + epsilon < Number(wall.thickness) &&
      columnRects.some((rect) =>
        pointOnRectBoundary(wall.from, rect) ||
        pointOnRectBoundary(wall.to, rect)
      )
    );
  });

  let unexplainedDanglingEndpointCount = 0;
  const danglingDispositionSamples = [];
  walls.forEach((wall) => {
    [
      { name: "from", point: wall.from },
      { name: "to", point: wall.to }
    ].forEach((endpoint) => {
      const wallConnected = walls.some((other) => other !== wall && (
        distance(endpoint.point, other.from) <= epsilon ||
        distance(endpoint.point, other.to) <= epsilon
      ));
      const columnConnected = columnRects.some((rect) => pointOnRectBoundary(endpoint.point, rect));
      if (wallConnected || columnConnected) return;
      const disposition = String(wall.topologyEndpointDispositions?.[endpoint.name] || "").trim();
      const evidence = wall.topologyEndpointDispositionEvidence?.[endpoint.name] || null;
      const sourcePoint = evidence?.sourcePointPdfPt;
      const originalPoint = evidence?.originalLivePointMm;
      const standardSourceEndpointEvidence =
        disposition === "source_segment_endpoint" &&
        evidence?.kind === "source_segment_endpoint" &&
        evidence?.sourceId === wall.source_object_id &&
        evidence?.sourceRegionId === wall.sourceRegionId &&
        [sourcePoint?.x, sourcePoint?.y, originalPoint?.x, originalPoint?.y].every(Number.isFinite) &&
        distance(endpoint.point, originalPoint) <= epsilon;
      const alignedPoint = evidence?.alignedLivePointMm;
      const alignment = evidence?.bodyAlignment;
      const expectedAlignedPoint = alignment?.axis === "horizontal"
        ? {
            x: originalPoint?.x,
            y: Number(originalPoint?.y) + Number(alignment?.displacementMm)
          }
        : {
            x: Number(originalPoint?.x) + Number(alignment?.displacementMm),
            y: originalPoint?.y
          };
      const bodyAlignedSourceEndpointEvidence =
        disposition === "body_aligned_source_segment_endpoint" &&
        evidence?.kind === "body_aligned_source_segment_endpoint" &&
        evidence?.sourceId === wall.source_object_id &&
        evidence?.sourceRegionId === wall.sourceRegionId &&
        ["horizontal", "vertical"].includes(alignment?.axis) &&
        [
          sourcePoint?.x,
          sourcePoint?.y,
          originalPoint?.x,
          originalPoint?.y,
          alignedPoint?.x,
          alignedPoint?.y,
          alignment?.displacementMm
        ].every(Number.isFinite) &&
        Math.abs(Number(alignment.displacementMm)) > epsilon &&
        distance(endpoint.point, alignedPoint) <= epsilon &&
        distance(alignedPoint, expectedAlignedPoint) <= epsilon &&
        distance(originalPoint, alignedPoint) > epsilon;
      if (!(standardSourceEndpointEvidence || bodyAlignedSourceEndpointEvidence)) {
        unexplainedDanglingEndpointCount += 1;
        danglingDispositionSamples.push({
          wallId: wall.id,
          endpoint: endpoint.name,
          point: endpoint.point,
          disposition,
          evidence
        });
      }
    });
  });

  return {
    disconnectedWallJunctions,
    collinearWallOverlaps,
    duplicateWallSegments,
    unresolvedWallCrossings,
    wallWallBodyOverlaps,
    wallColumnGaps: wallColumnGapKeys.size,
    wallColumnOverlaps: wallColumnOverlapKeys.size,
    subThicknessColumnConnectorCount: subThicknessColumnConnectors.length,
    unexplainedDanglingEndpointCount,
    danglingDispositionSamples: danglingDispositionSamples.slice(0, 5),
    disconnectedSamples: disconnectedSamples.slice(0, 5),
    wallColumnGapSamples: wallColumnGapSamples.slice(0, 5),
    wallColumnOverlapSamples: wallColumnOverlapSamples.slice(0, 5),
    subThicknessColumnConnectorSamples: subThicknessColumnConnectors.slice(0, 5).map((wall) => ({
      id: wall.id,
      from: wall.from,
      to: wall.to,
      thickness: wall.thickness,
      length: distance(wall.from, wall.to)
    })),
    columnSamples: columns.slice(0, 3).map((column) => ({
      id: column.id,
      polygonMm: column.polygonMm,
      position: column.position,
      widthMm: column.widthMm,
      heightMm: column.heightMm || column.depthMm
    }))
  };
}

test("production importer consumes one authorization before mutation and gives human-readable failure state", () => {
  const { runtime, importScene, consumeCalls } = createAuthorizedRuntime();
  const before = projectFingerprint(runtime.project());
  const missing = runtime.window.laibePlanImportPdfObjectizationScene(sceneWithOptionalUnderlay(), {
    recognitionManifest: canonical.approved,
    recognitionBinding: canonical.binding,
    sourceSha256: canonical.sourceSha256
  });
  assert.equal(missing.ok, false);
  assert.equal(projectFingerprint(runtime.project()), before);
  assert.match(missing.userMessage, /請|確認|重新/);
  assert.doesNotMatch(missing.userMessage, /authorization|schema|scene|token|debug|API|DB/i);

  const first = importScene();
  assert.equal(first.ok, true);
  const afterFirst = projectFingerprint(runtime.project());
  const reused = importScene();
  assert.equal(reused.ok, false);
  assert.equal(projectFingerprint(runtime.project()), afterFirst);
  assert.equal(consumeCalls(), 2);
  assert.match(reused.userMessage, /已使用|重新/);
});

test("body-aware topology gate rejects an irreparable diagonal wall-column overlap before project mutation", () => {
  let consumeCalls = 0;
  const runtime = createPlanPuzzleRuntime(paths.planPuzzle, {
    recognitionApi: {
      consumeRecognitionImportAuthorization() {
        consumeCalls += 1;
        return true;
      }
    }
  });
  const scene = sceneWithOptionalUnderlay();
  const sourceTemplate = structuredClone(scene.structuralWalls[0]);
  const diagonalSourceId = "src_wall_topology_gate_diagonal";
  scene.structuralWalls.push({
    ...sourceTemplate,
    id: diagonalSourceId,
    source_object_id: diagonalSourceId,
    sourceId: diagonalSourceId,
    sourceExtractorId: "pdf-wall-topology-gate-diagonal",
    sourcePathIds: ["pdf-wall-topology-gate-diagonal"],
    p1: { x: 270, y: 1020 },
    p2: { x: 315, y: 1065 },
    width: 6,
    orientation: "diagonal",
    sourceBBox: { x0: 264, y0: 1014, x1: 321, y1: 1071 }
  });
  const before = projectFingerprint(runtime.project());
  const result = runtime.window.laibePlanImportPdfObjectizationScene(scene, {
    recognitionManifest: canonical.approved,
    recognitionBinding: canonical.binding,
    recognitionAuthorizationToken: "topology-gate",
    sourceSha256: canonical.sourceSha256,
    selectedRegionId: canonical.upperRegionId,
    actorId: "業主",
    caseId: "task2-case",
    nativeScaleEvidence: nativeScaleEvidence()
  });
  assert.equal(consumeCalls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.error, "native wall topology gate failed");
  assert.match(result.userMessage, /本次尚未寫入案件/);
  assert.match(result.userMessage, /PCM/);
  assert.equal(projectFingerprint(runtime.project()), before);
  const languageAudit = runtime.window.LaibePlanPuzzleQa.getNativeObjectizationLanguageAudit();
  assert.equal(languageAudit.pass, true);
  assert.equal(languageAudit.topologyFailureMessage, result.userMessage);
});

test("body-aware topology gate rejects parallel finite wall-body overlap before project mutation", () => {
  let consumeCalls = 0;
  const runtime = createPlanPuzzleRuntime(paths.planPuzzle, {
    recognitionApi: {
      consumeRecognitionImportAuthorization() {
        consumeCalls += 1;
        return true;
      }
    }
  });
  const scene = sceneWithOptionalUnderlay();
  const sourceTemplate = structuredClone(scene.structuralWalls[0]);
  scene.structuralWalls = [
    {
      ...sourceTemplate,
      id: "src_wall_parallel_body_overlap_a",
      source_object_id: "src_wall_parallel_body_overlap_a",
      sourceId: "src_wall_parallel_body_overlap_a",
      sourceExtractorId: "pdf-wall-parallel-body-overlap-a",
      sourcePathIds: ["pdf-wall-parallel-body-overlap-a"],
      p1: { x: 50, y: 1100 },
      p2: { x: 150, y: 1100 },
      width: 24,
      orientation: "horizontal",
      sourceBBox: { x0: 38, y0: 1088, x1: 162, y1: 1112 }
    },
    {
      ...sourceTemplate,
      id: "src_wall_parallel_body_overlap_b",
      source_object_id: "src_wall_parallel_body_overlap_b",
      sourceId: "src_wall_parallel_body_overlap_b",
      sourceExtractorId: "pdf-wall-parallel-body-overlap-b",
      sourcePathIds: ["pdf-wall-parallel-body-overlap-b"],
      p1: { x: 50, y: 1115 },
      p2: { x: 150, y: 1115 },
      width: 24,
      orientation: "horizontal",
      sourceBBox: { x0: 38, y0: 1103, x1: 162, y1: 1127 }
    }
  ];
  scene.columns = [];
  const before = projectFingerprint(runtime.project());
  const result = runtime.window.laibePlanImportPdfObjectizationScene(scene, {
    recognitionManifest: canonical.approved,
    recognitionBinding: canonical.binding,
    recognitionAuthorizationToken: "parallel-body-overlap-gate",
    sourceSha256: canonical.sourceSha256,
    selectedRegionId: canonical.upperRegionId,
    actorId: "業主",
    caseId: "task2-case",
    nativeScaleEvidence: nativeScaleEvidence()
  });
  assert.equal(consumeCalls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.error, "native wall topology gate failed");
  assert.match(result.userMessage, /PCM/);
  assert.equal(projectFingerprint(runtime.project()), before);
});

test("canonical upper 3F creates only source-proven native walls with positive editable thickness and source transform receipt", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  const result = importScene();
  assert.equal(result.ok, true);
  const project = runtime.project();
  assert.equal(project.walls.length, 84);
  assert.equal(project.lastPdfObjectizationSceneImport.topologyAudit.nativeWallSegmentCount, 84);
  assert.equal(
    project.walls.every((wall) =>
      wall.source_kind === "pdf" &&
      wall.sourceBBox &&
      wall.source_object_id &&
      wall.sourceRegionId === canonical.upperRegionId &&
      Number.isFinite(Number(wall.thickness)) &&
      Number(wall.thickness) > 0
    ),
    true
  );
  const selectedRegion = canonical.approved.selection.regions.find(
    (region) => region.sourceRegionId === canonical.upperRegionId
  );
  assert.equal(project.nativePdfObjectization.orientation.recommendedRotationDegrees, selectedRegion.orientation.recommendedRotationDegrees);
  assert.equal(project.nativePdfObjectization.orientation.appliedRotationDegrees, selectedRegion.orientation.recommendedRotationDegrees);
  assert.equal(project.nativePdfObjectization.sourceCoordinateFrame, "page-bottom-left-pdf-pt");
  assert.equal(project.nativePdfObjectization.nativeCoordinateFrame, "plan-puzzle-mm");
  assert.equal(project.nativePdfObjectization.sourceIntegrity.allNativeWallsSourceBound, true);
});

test("topology closure preserves a source-proven doorway gap", () => {
  const runtime = createTopologyProofRuntime();
  const walls = [
    topologyProofWall(
      "doorway-left",
      "source-doorway-left",
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    ),
    topologyProofWall(
      "doorway-right",
      "source-doorway-right",
      { x: 1100, y: 0 },
      { x: 2000, y: 0 },
      { x: 12, y: 0 },
      { x: 20, y: 0 }
    )
  ];
  const result = runtime.window.LaibePlanPuzzleQa
    .closeNativePdfWallBodyJunctionGapsFixture(walls);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.walls.map((wall) => ({
      id: wall.id,
      from: wall.from,
      to: wall.to
    })))),
    walls.map((wall) => ({ id: wall.id, from: wall.from, to: wall.to }))
  );
  assert.equal(result.closures.length, 0);
});

test("topology closure preserves nearby intentional endpoints without a source junction", () => {
  const runtime = createTopologyProofRuntime();
  const walls = [
    topologyProofWall(
      "intentional-horizontal-end",
      "source-intentional-horizontal-end",
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    ),
    topologyProofWall(
      "intentional-vertical-end",
      "source-intentional-vertical-end",
      { x: 1080, y: 40 },
      { x: 1080, y: 1000 },
      { x: 11, y: 0.4 },
      { x: 11, y: 10 }
    )
  ];
  const result = runtime.window.LaibePlanPuzzleQa
    .closeNativePdfWallBodyJunctionGapsFixture(walls);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.walls.map((wall) => ({
      id: wall.id,
      from: wall.from,
      to: wall.to
    })))),
    walls.map((wall) => ({ id: wall.id, from: wall.from, to: wall.to }))
  );
  assert.equal(result.closures.length, 0);
});

test("topology closure joins a live gap only when the source segments prove the junction", () => {
  const runtime = createTopologyProofRuntime();
  const walls = [
    topologyProofWall(
      "proven-horizontal",
      "source-proven-horizontal",
      { x: 0, y: 0 },
      { x: 1100, y: 0 },
      { x: 0, y: 0 },
      { x: 11, y: 0 }
    ),
    topologyProofWall(
      "proven-vertical",
      "source-proven-vertical",
      { x: 1040, y: 40 },
      { x: 1040, y: 1000 },
      { x: 10, y: 0 },
      { x: 10, y: 10 }
    )
  ];
  const result = runtime.window.LaibePlanPuzzleQa
    .closeNativePdfWallBodyJunctionGapsFixture(walls);
  assert.equal(result.closures.length, 1);
  assert.equal(result.closures[0].sourceJunctionRelationProven, true);
  assert.ok(result.walls.some((wall) =>
    (wall.from.x === 1040 && wall.from.y === 0) ||
    (wall.to.x === 1040 && wall.to.y === 0)
  ));
});

test("native wall topology is canonicalized into exact wall-wall and wall-column junctions with a fixture-neutral receipt", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  const importResult = importScene();
  assert.equal(importResult.ok, true, JSON.stringify(importResult));
  const project = runtime.project();
  const rawDefects = rawNativeTopologyDefects(project);
  const expectedCounters = {
    disconnectedWallJunctions: 0,
    collinearWallOverlaps: 0,
    duplicateWallSegments: 0,
    unresolvedWallCrossings: 0,
    wallWallBodyOverlaps: 0,
    wallColumnGaps: 0,
    wallColumnOverlaps: 0
  };
  assert.deepEqual(
    Object.fromEntries(Object.keys(expectedCounters).map((key) => [key, rawDefects[key]])),
    expectedCounters,
    `independent post-import geometry audit: ${JSON.stringify({
      rawDefects,
      productionAudit: project.nativePdfWallTopologyAudit
    })}`
  );
  assert.equal(
    rawDefects.unexplainedDanglingEndpointCount,
    0,
    `independent dangling endpoint audit: ${JSON.stringify(rawDefects)}`
  );
  assert.equal(
    rawDefects.subThicknessColumnConnectorCount,
    0,
    `independent finite-thickness connector audit: ${JSON.stringify(rawDefects)}`
  );
  const audit = project.nativePdfWallTopologyAudit;
  assert.ok(audit, `raw topology before canonicalization receipt: ${JSON.stringify(rawDefects)}`);
  assert.equal(audit.schema, "laibe.planPuzzle.nativePdfWallTopologyAudit.v1");
  assert.equal(audit.wallBodyGeometry, "butt_oriented_rectangle");
  assert.deepEqual(
    { ...audit.counters },
    expectedCounters,
    `production topology audit: ${JSON.stringify(audit)}`
  );
  assert.equal(audit.evaluatedColumnCount, 9);
  assert.ok(audit.columnConnections.length > 0);
  assert.equal(
    audit.junctions.every((junction) =>
      junction.wallEndpoints.every((endpoint) =>
        endpoint.point.x === junction.point.x && endpoint.point.y === junction.point.y
      )
    ),
    true
  );
  assert.equal(
    audit.columnConnections.every((connection) =>
      connection.distanceMm === 0 &&
      connection.overlapMm === 0 &&
      Number(connection.bodyOverlapAreaMm2 || 0) === 0
    ),
    true
  );
  assert.equal(audit.subThicknessColumnConnectorCount, 0);
  assert.ok(audit.corrections.absorbedSubThicknessColumnConnectorCount >= 2);
  assert.equal(audit.unexplainedDanglingEndpointCount, 0);
  assert.equal(
    audit.danglingEndpoints.every((endpoint) =>
      (
        endpoint.sourceDisposition === "source_segment_endpoint" &&
        endpoint.sourceDispositionEvidence?.kind === "source_segment_endpoint"
      ) || (
        endpoint.sourceDisposition === "body_aligned_source_segment_endpoint" &&
        endpoint.sourceDispositionEvidence?.kind === "body_aligned_source_segment_endpoint" &&
        Number.isFinite(endpoint.sourceDispositionEvidence?.alignedLivePointMm?.x) &&
        Number.isFinite(endpoint.sourceDispositionEvidence?.alignedLivePointMm?.y) &&
        Number.isFinite(endpoint.sourceDispositionEvidence?.bodyAlignment?.displacementMm) &&
        Math.hypot(
          endpoint.sourceDispositionEvidence.alignedLivePointMm.x -
            endpoint.sourceDispositionEvidence.originalLivePointMm.x,
          endpoint.sourceDispositionEvidence.alignedLivePointMm.y -
            endpoint.sourceDispositionEvidence.originalLivePointMm.y
        ) > 0.001
      )
    ),
    true
  );
  assert.equal(project.lastPdfObjectizationSceneImport.topologyAudit?.pass, true);
});

test("canonical V3 wall bodies terminate at column boundaries without auxiliary geometry", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const project = runtime.project();
  const receipt = runtime.window.LaibePlanPuzzleQa.getRenderedGeometryReceiptV3();
  assert.equal(receipt.schema, "laibe.planPuzzle.renderedGeometryReceipt.v3");
  assert.equal(receipt.matching, true);
  assert.equal(receipt.resolverGeometryHash, receipt.domGeometryHash);
  const columnButtWalls = project.walls.filter((wall) =>
    ["from", "to"].some((endpoint) =>
      String(wall.topologyEndpointDispositions?.[endpoint] || "").includes("column_boundary")
    )
  );
  assert.ok(columnButtWalls.length > 0);
  assert.ok(columnButtWalls.some((wall) => wall.sourceDisplayMode === "pdf-source-boundary"));
  columnButtWalls.forEach((wall) => {
    const geometry = runtime.window.LaibePlanPuzzleQa.getNativePdfWallRenderGeometry(wall.id);
    assert.equal(geometry.ready, true);
    ["bodyLine", "endpointCaps", "frameEdges"].forEach((field) => {
      assert.equal(Object.hasOwn(geometry, field), false);
    });
    assert.doesNotMatch(JSON.stringify(geometry), /wall_junction_frame_extension/);
    assert.match(geometry.geometryHash, /^[a-f0-9]{64}$/);
    assert.ok(geometry.wallBodies.length > 0);
    const dx = wall.to.x - wall.from.x;
    const dy = wall.to.y - wall.from.y;
    const length = Math.hypot(dx, dy);
    const unit = { x: dx / length, y: dy / length };
    const axialPositions = [];
    geometry.wallBodies.forEach((body) => {
      assert.equal(body.wallId, wall.id);
      assert.equal(typeof body.partId, "string");
      assert.ok(Array.isArray(body.polygonMm));
      assert.ok(body.polygonMm.length >= 3);
      assert.match(body.renderPath, /^M .+ Z$/);
      assert.match(body.geometryHash, /^[a-f0-9]{64}$/);
      body.polygonMm.forEach((point) => {
        axialPositions.push(
          (point.x - wall.from.x) * unit.x +
          (point.y - wall.from.y) * unit.y
        );
      });
      const renderedBody = runtime.document.querySelectorAll(".native-wall-body-v3")
        .find((element) => element.dataset.partId === body.partId);
      assert.ok(renderedBody);
      assert.equal(renderedBody.dataset.wallId, body.wallId);
      assert.equal(renderedBody.dataset.geometryHash, body.geometryHash);
      assert.equal(renderedBody.getAttribute("d"), body.renderPath);
    });
    if (String(wall.topologyEndpointDispositions?.from || "").includes("column_boundary")) {
      assert.ok(Math.min(...axialPositions) >= -1e-6);
      assert.ok(axialPositions.some((position) => Math.abs(position) <= 1e-6));
    }
    if (String(wall.topologyEndpointDispositions?.to || "").includes("column_boundary")) {
      assert.ok(Math.max(...axialPositions) <= length + 1e-6);
      assert.ok(axialPositions.some((position) => Math.abs(position - length) <= 1e-6));
    }
  });
});

test("canonical upper 3F creates exactly 3 doors and 5 windows on valid native hosts with served library block assets", async () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const project = runtime.project();
  const doors = project.openings.filter((opening) => opening.kind === "door");
  const windows = project.openings.filter((opening) => opening.kind === "window");
  assert.equal(doors.length, 3);
  assert.equal(windows.length, 5);
  project.openings.forEach((opening) => {
    assert.ok(project.walls.some((wall) => wall.id === opening.wallId));
    assert.ok(project.nodeGraph.edges.some((edge) => edge.id === opening.edgeId));
    assert.equal(opening.status, "existing");
    assert.equal(opening.newExistingStatus, "existing");
    assert.equal(opening.openingStyleSource, "svg-blocks3-index");
    assert.match(opening.blockMetadataId, /^src_[a-f0-9]+$/);
    assert.match(opening.assetRel, /0570|0573/);
    assert.match(opening.assetUrl, /^\.\/svg-blocks3\/b057[03]\.svg$/);
  });

  const server = createServer((request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "");
      const target = path.resolve(floorPlanRoot, relative);
      if (!target.startsWith(path.resolve(floorPlanRoot)) || !statSync(target).isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": "image/svg+xml" });
      response.end(readFileSync(target));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    for (const assetUrl of new Set(project.openings.map((opening) => opening.assetUrl))) {
      const response = await fetch(new URL(assetUrl.replace(/^\.\//, ""), `http://127.0.0.1:${port}/`));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") || "", /image\/svg\+xml/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("opening import fails closed instead of falling back to a nearby wall outside declared source-host evidence", () => {
  const runtime = createPlanPuzzleRuntime(paths.planPuzzle, {
    recognitionApi: {
      consumeRecognitionImportAuthorization() {
        return true;
      }
    }
  });
  const scene = sceneWithOptionalUnderlay();
  const declaredShortHost = scene.structuralWalls.find(
    (wall) => wall.id === "src_wall_8898fb09f6c2ca42401bdec8"
  );
  const unrelatedLongHost = scene.structuralWalls
    .filter((wall) => {
      const dx = Number(wall.p2?.x) - Number(wall.p1?.x);
      const dy = Number(wall.p2?.y) - Number(wall.p1?.y);
      return Math.abs(dy) > Math.abs(dx) && Math.hypot(dx, dy) > 40;
    })
    .sort((left, right) =>
      Math.hypot(Number(right.p2.x) - Number(right.p1.x), Number(right.p2.y) - Number(right.p1.y)) -
      Math.hypot(Number(left.p2.x) - Number(left.p1.x), Number(left.p2.y) - Number(left.p1.y))
    )[0];
  assert.ok(declaredShortHost);
  assert.ok(unrelatedLongHost);
  const candidate = scene.openingCandidates[0];
  const center = {
    x: (Number(unrelatedLongHost.p1.x) + Number(unrelatedLongHost.p2.x)) / 2,
    y: (Number(unrelatedLongHost.p1.y) + Number(unrelatedLongHost.p2.y)) / 2
  };
  candidate.bbox = {
    x0: center.x - 2,
    y0: center.y - 10,
    x1: center.x + 2,
    y1: center.y + 10
  };
  candidate.evidence = {
    ...candidate.evidence,
    hostWallSourceIds: [declaredShortHost.id],
    hostWallIds: [declaredShortHost.id],
    hostWallId: declaredShortHost.id,
    hostWallGap: null
  };

  const result = runtime.window.laibePlanImportPdfObjectizationScene(scene, {
    recognitionManifest: canonical.approved,
    recognitionBinding: canonical.binding,
    recognitionAuthorizationToken: "wrong-host-fallback",
    sourceSha256: canonical.sourceSha256,
    selectedRegionId: canonical.upperRegionId,
    actorId: "業主",
    caseId: "task2-case",
    nativeScaleEvidence: nativeScaleEvidence()
  });
  assert.equal(result.ok, true);
  assert.equal(
    runtime.project().openings.some((opening) => opening.sourceOpeningId === candidate.id),
    false
  );
  const disposition = runtime.project().lastPdfObjectizationSceneImport.openingDispositionRecords.find(
    (row) => row.sourceId === candidate.id
  );
  assert.equal(disposition.decision, "rejected");
  assert.equal(disposition.reason, "host_wall_not_promoted_or_edge_missing");
});

test("canonical upper 3F keeps one locked stair group with exact Recognition Gate role evidence", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const groups = runtime.project().pdfReviewObjects.lineGroups.filter(
    (group) => group.groupKind === "stairGroup"
  );
  assert.equal(groups.length, 1);
  const group = groups[0];
  const recognitionStair = canonical.approved.objects.find(
    (object) => object.category === "locked_stair_line_group"
  ).sourcePayload;
  assert.equal(group.locked, true);
  assert.equal(group.readOnly, true);
  assert.equal(group.selectable, false);
  assert.deepEqual(Array.from(group.roleLineIds.treads), recognitionStair.treadLineIds);
  assert.deepEqual(Array.from(group.roleLineIds.boundaries), recognitionStair.boundaryLineIds);
  assert.deepEqual(Array.from(group.roleLineIds.landing), recognitionStair.landingLineIds);
  assert.deepEqual(Array.from(group.roleLineIds.stairBreak), recognitionStair.markerLineIds);
  assert.deepEqual({ ...group.roleCounts }, {
    treads: 16,
    boundaries: 8,
    landing: 5,
    stairBreak: 15
  });
  const renderedRoleLines = runtime.project().pdfReviewObjects.lines.filter(
    (line) => line.referenceGroupId === group.id
  );
  assert.equal(renderedRoleLines.length, 44);
  assert.deepEqual(
    Object.fromEntries(["treads", "boundaries", "landing", "stairBreak"].map((role) => [
      role,
      renderedRoleLines.filter((line) => line.stairRole === role).length
    ])),
    { treads: 16, boundaries: 8, landing: 5, stairBreak: 15 }
  );
  assert.equal(
    renderedRoleLines.every((line) =>
      line.locked === true && line.readOnly === true && line.selectable === false
    ),
    true
  );
});

test("bathroom fixtures and cabinet stay off canvas with receipts while important unknowns remain locked references", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const project = runtime.project();
  assert.equal(project.furniture.length, 0);
  assert.equal(project.zones.length, 0);
  assert.equal(project.pdfReviewObjects.exclusionReceipts.bathroomFixtures.length, 2);
  assert.equal(
    project.pdfReviewObjects.exclusionReceipts.bathroomFixtures.every(
      (receipt) => receipt.decision === "excluded_from_canvas" && receipt.sourceId
    ),
    true
  );
  assert.equal(project.pdfReviewObjects.exclusionReceipts.fixedCabinet.status, "no_matching_fixed_cabinet_motif");
  assert.equal(project.pdfReviewObjects.exclusionReceipts.fixedCabinet.canvasObjectCount, 0);
  assert.equal(
    project.pdfReviewObjects.importantReferences.every(
      (reference) => reference.locked === true && reference.readOnly === true
    ),
    true
  );
  assert.deepEqual(
    project.pdfReviewObjects.importantReferences.map((reference) => reference.sourceId).sort(),
    canonical.approved.recognition.unresolvedIds.slice().sort()
  );
});

test("important unresolved references fail closed without mutation and preserve exact geometry/policy variants", () => {
  const baseScene = sceneWithOptionalUnderlay();
  const baseManifest = structuredClone(canonical.approved);
  const unresolvedIds = baseManifest.recognition.unresolvedIds.slice();
  const firstId = unresolvedIds[0];
  const secondId = unresolvedIds[1];
  const sourceCollections = [
    "spaceBoundaryCandidates",
    "stairVoidCandidates",
    "unresolvedSymbolCandidates"
  ];
  const replaceSceneCandidate = (scene, sourceId, update) => {
    for (const collection of sourceCollections) {
      const index = (scene[collection] || []).findIndex(
        (item) => String(item.source_object_id || item.sourceId || item.id) === sourceId
      );
      if (index >= 0) {
        scene[collection][index] = update(structuredClone(scene[collection][index]));
        return;
      }
    }
    throw new Error(`Missing unresolved fixture ${sourceId}`);
  };
  const approvedObject = (sourceId) => {
    const object = baseManifest.objects.find((item) => item.sourceId === sourceId);
    assert.ok(object, `Missing approved fixture ${sourceId}`);
    return structuredClone(object);
  };

  const invalidCases = [
    {
      name: "missing object",
      arrange(scene, manifest) {
        manifest.recognition.unresolvedIds.push("missing-important-reference");
      }
    },
    {
      name: "unrenderable object",
      arrange(scene, manifest) {
        const sourceId = "unrenderable-important-reference";
        manifest.recognition.unresolvedIds.push(sourceId);
        manifest.objects.push({
          sourceId,
          source_object_id: sourceId,
          sourceRegionId: canonical.upperRegionId,
          category: "unresolved_important"
        });
      }
    },
    {
      name: "duplicate unresolved identity",
      arrange(scene, manifest) {
        manifest.recognition.unresolvedIds.push(firstId);
      }
    },
    {
      name: "extra retained identity",
      arrange(scene, manifest) {
        const expectedId = "expected-important-reference";
        manifest.recognition.unresolvedIds.push(expectedId);
        manifest.objects.push({
          ...approvedObject(firstId),
          sourceId: expectedId,
          source_object_id: "unexpected-extra-reference"
        });
      }
    },
    {
      name: "identity drift collision",
      arrange(scene, manifest) {
        const expectedFirst = "expected-drift-first";
        const expectedSecond = "expected-drift-second";
        manifest.recognition.unresolvedIds.push(expectedFirst, expectedSecond);
        manifest.objects.push(
          {
            ...approvedObject(firstId),
            sourceId: expectedFirst,
            source_object_id: "drifted-shared-reference"
          },
          {
            ...approvedObject(secondId),
            sourceId: expectedSecond,
            source_object_id: "drifted-shared-reference"
          }
        );
      }
    }
  ];

  for (const scenario of invalidCases) {
    const scene = structuredClone(baseScene);
    const manifest = structuredClone(baseManifest);
    scenario.arrange(scene, manifest);
    const probe = createConservationProbe(scene, manifest);
    assert.equal(probe.result.ok, false, scenario.name);
    assert.match(
      String(probe.result.error || ""),
      /important recognition candidates were not conserved/,
      scenario.name
    );
    assert.equal(probe.after, probe.before, `${scenario.name} mutated project state`);
  }

  const positiveVariants = [
    {
      name: "bbox-only",
      update(item) {
        delete item.sourceBBox;
        delete item.sourceGeometry;
        delete item.p1;
        delete item.p2;
        assert.ok(item.bbox);
        return item;
      }
    },
    {
      name: "sourceBBox-only",
      update(item) {
        item.sourceBBox = structuredClone(item.sourceBBox || item.bbox);
        delete item.bbox;
        delete item.sourceGeometry;
        delete item.p1;
        delete item.p2;
        return item;
      }
    },
    {
      name: "line-only",
      update(item) {
        const box = item.sourceBBox || item.bbox;
        item.p1 = { x: box.x0, y: box.y0 };
        item.p2 = { x: box.x1, y: box.y1 };
        delete item.bbox;
        delete item.sourceBBox;
        delete item.sourceGeometry;
        return item;
      }
    }
  ];

  for (const variant of positiveVariants) {
    const scene = structuredClone(baseScene);
    replaceSceneCandidate(scene, firstId, variant.update);
    const probe = createConservationProbe(scene, structuredClone(baseManifest));
    assert.equal(probe.result.ok, true, variant.name);
    const references = probe.runtime.project().pdfReviewObjects.importantReferences;
    assert.deepEqual(
      references.map((reference) => reference.sourceId).sort(),
      unresolvedIds.slice().sort(),
      variant.name
    );
    assert.equal(
      references.every((reference) =>
        reference.locked === true &&
        reference.readOnly === true &&
        reference.selectable === false &&
        reference.budgetExcluded === true &&
        reference.noBudgetTrigger === true &&
        reference.formalOutput === false &&
        reference.candidateOnly === true
      ),
      true,
      variant.name
    );
  }
});

test("fresh conversion retains approved columns, dimension lines, and necessary text as locked read-only references", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const project = runtime.project();
  const references = project.pdfReviewObjects.referenceCollections;
  assert.equal(project.structures.length, 9);
  assert.equal(
    project.structures.every((column) =>
      /^native-column-/.test(column.id) &&
      column.kind === "column" &&
      column.native === true &&
      column.locked === true &&
      column.editable === false &&
      column.budgetExcluded === true &&
      Array.isArray(column.polygonMm) &&
      column.polygonMm.length === 4 &&
      column.sourceObjectId &&
      column.sourceDocumentSha256 === canonical.sourceSha256 &&
      column.importSessionId
    ),
    true
  );
  assert.equal(references.structuralColumns.length, 9);
  assert.equal(references.dimensionLines.length, 2);
  assert.equal(references.textAnnotations.length, 2);
  [
    ...references.structuralColumns,
    ...references.dimensionLines,
    ...references.textAnnotations
  ].forEach((reference) => {
    assert.equal(reference.locked, true);
    assert.equal(reference.readOnly, true);
    assert.equal(reference.selectable, false);
    assert.ok(reference.sourceId);
    assert.equal(reference.sourceRegionId, canonical.upperRegionId);
  });
  assert.deepEqual(
    references.structuralColumns.map((reference) => reference.sourceId).sort(),
    canonical.approved.objects
      .filter((object) => object.category === "locked_structural_column")
      .map((object) => object.sourceId)
      .sort()
  );
  assert.deepEqual(
    references.dimensionLines.map((reference) => reference.sourceId).sort(),
    canonical.approved.objects
      .filter((object) => object.category === "locked_dimension_annotation")
      .map((object) => object.sourceId)
      .sort()
  );
  assert.deepEqual(
    references.textAnnotations.map((reference) => reference.sourceId).sort(),
    references.dimensionLines.map((reference) => `${reference.sourceId}:label`).sort()
  );
  assert.equal(
    references.structuralColumns.every((reference) =>
      reference.hiddenDefault === true &&
      project.pdfReviewObjects.shapes.some(
        (shape) => shape.id === reference.id && shape.hiddenDefault === true
      )
    ),
    true
  );
  assert.equal(
    references.dimensionLines.every((reference) =>
      runtime.project().pdfReviewObjects.lines.some((line) => line.id === reference.id)
    ),
    true
  );
  assert.equal(
    references.textAnnotations.every((reference) =>
      runtime.project().pdfReviewObjects.text.some((text) => text.id === reference.id)
    ),
    true
  );
});

test("locked source columns render one readable V3 boundary each without visible review substitutes", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const renderedColumns = runtime.document.querySelectorAll(".native-column-body-v3");
  assert.equal(renderedColumns.length, 9);
  assert.equal(
    renderedColumns.every((column) =>
      /^native-column-/.test(column.dataset.columnId) &&
      /^[a-f0-9]{64}$/.test(column.dataset.geometryHash) &&
      column.dataset.sourceDisplayMode === "pdf-source-boundary" &&
      column.dataset.fillClassification === "canonical_column_body" &&
      /^M .+ Z$/.test(column.getAttribute("d"))
    ),
    true
  );
  assert.equal(
    runtime.document.querySelectorAll(".pdf-review-shape-hit")
      .filter((element) => element.dataset.pdfReviewCategory === "columnReview").length,
    0
  );
});

test("underlay starts hidden and 6500 × 5250 mm scale waits for visible confirmation then records case activity", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const project = runtime.project();
  assert.equal(runtime.window.LaibePlanPuzzleQa.getSummary().layerVisibility.underlay, false);
  assert.equal(project.underlay.opacity <= 0.34, true);
  assert.deepEqual(project.nativePdfScaleConfirmation.targetSizeMm, { width: 6500, height: 5250 });
  assert.equal(project.nativePdfScaleConfirmation.status, "waiting_for_confirmation");
  assert.equal(project.scale.calibrated, false);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /6,500/);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /5,250/);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /確認比例/);

  const confirmed = runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  });
  assert.equal(confirmed.ok, true);
  assert.equal(project.nativePdfScaleConfirmation.status, "confirmed");
  assert.equal(project.scale.calibrated, true);
  assert.equal(project.scale.unitsProven, true);
  const event = project.caseEvents.at(-1);
  assert.equal(event.action, "確認平面比例");
  assert.equal(event.actor, "業主");
  assert.equal(event.selectedPlan, "上方 3F 平面圖");
  assert.deepEqual(event.scaleMm, { width: 6500, height: 5250 });
  assert.equal(event.objectCounts.doors, 3);
  assert.equal(event.objectCounts.windows, 5);
  assert.equal(event.exclusions.bathroomFixtures, 2);
  assert.equal(event.exclusions.fixedCabinets, 0);
  assert.equal(event.unresolvedCount, canonical.approved.recognition.unresolvedIds.length);
  assert.ok(event.at);
  assert.ok(event.sourceDocument);
  assert.ok(event.next_actor);
  const activityHtml = runtime.elements.get("inspectorBody").innerHTML;
  assert.match(activityHtml, /確認平面比例/);
  assert.match(activityHtml, /比例已確認並保留紀錄/);
  assert.match(activityHtml, /業主與 PCM 核對牆面、門窗與待確認項目/);
  assert.doesNotMatch(activityHtml, /待指定處理人/);
  assert.match(activityHtml, /檢查門窗與圖面依據/);
  assert.doesNotMatch(activityHtml, />整理預算草稿</);
});

test("scale confirmation immediately aligns every source opening to its proven PDF gap and survives a confirmed-draft restore", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  assert.equal(project.openings.length, 8);
  project.openings.forEach((opening) => {
    const binding = opening.pdfCanonicalHostBinding;
    const hostEdge = opening.pdfSourceHostEdge;
    assert.ok(binding, `${opening.id} should have an immediate canonical host binding`);
    assert.ok(hostEdge, `${opening.id} should have an immediate source-gap host edge`);
    assert.equal(binding.sourceGapEvidenceStatus, "source_gap_proven");
    assert.equal(binding.sourceHostEvidenceStatus, "source_bound");
    assert.equal(opening.edgeId, hostEdge.id);
    assert.equal(opening.wallId, binding.hostWallId);
    assert.ok(binding.hostWallSourceIds.includes(opening.sourceWallId));
    assert.ok(Math.abs(Number(opening.widthMm) - Number(binding.expectedOpeningWidthMm)) <= 0.01);
    const hostLength = Math.hypot(
      Number(hostEdge.to.x) - Number(hostEdge.from.x),
      Number(hostEdge.to.y) - Number(hostEdge.from.y)
    );
    assert.ok(Math.abs(hostLength - Number(binding.sourceWallLengthMm)) <= 0.01);
    assert.ok(
      Math.abs(Number(opening.offsetMm) - Number(binding.expectedOpeningStartOffsetMm)) <= 0.01,
      JSON.stringify({
        id: opening.id,
        offsetMm: opening.offsetMm,
        expectedOpeningStartOffsetMm: binding.expectedOpeningStartOffsetMm,
        pdfSourcePositionUserEdited: opening.pdfSourcePositionUserEdited,
        pdfSourceUserEditProvenance: opening.pdfSourceUserEditProvenance
      })
    );
    const localCenter = Number(opening.offsetMm) + Number(opening.widthMm) / 2;
    const liveCenter = {
      x: Number(hostEdge.from.x) + (Number(hostEdge.to.x) - Number(hostEdge.from.x)) * localCenter / hostLength,
      y: Number(hostEdge.from.y) + (Number(hostEdge.to.y) - Number(hostEdge.from.y)) * localCenter / hostLength
    };
    const expectedLiveCenter = {
      x: Number(binding.expectedCenterPt.x) * Number(project.scale.acceptedWorldMmPerPt),
      y: Number(binding.expectedCenterPt.y) * Number(project.scale.acceptedWorldMmPerPt)
    };
    assert.ok(Math.hypot(
      liveCenter.x - expectedLiveCenter.x,
      liveCenter.y - expectedLiveCenter.y
    ) <= 0.01);
  });

  const restored = createPlanPuzzleRuntime(paths.planPuzzle, {
    recognitionApi: runtime.window.LaibePdfPlanExactSource,
    localStorage: createConfirmedWorkingDraftStorage(project)
  });
  const restoredHtml = restored.elements.get("inspectorBody").innerHTML;
  assert.match(restoredHtml, /比例已確認/);
  assert.doesNotMatch(restoredHtml, /請先確認圖面比例/);
  assert.match(restoredHtml, /繼續核對牆線、門窗與待確認項目/);
});

test("v13 opening drafts migrate to the full source wall without losing user-edited width or position", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  const acceptedTransformId = project.scale.acceptedTransformId;
  const legacyAlignmentId = `${acceptedTransformId}:source-gap-host-v13-canonical-position`;
  const widthOpening = project.openings.find((opening) => (
    Number(opening.pdfCanonicalHostBinding.sourceWallLengthMm) -
    Number(opening.pdfCanonicalWallStartOffsetMm) -
    Number(opening.widthMm)
  ) > 100);
  const positionOpening = project.openings.find((opening) => (
    opening.id !== widthOpening?.id &&
    Number(opening.pdfCanonicalHostBinding.sourceWallLengthMm) -
    Number(opening.pdfCanonicalWallStartOffsetMm) -
    Number(opening.widthMm)
  ) > 10);
  assert.ok(widthOpening);
  assert.ok(positionOpening);

  function setLegacyShortHost(opening, canonicalPositionMm) {
    const binding = opening.pdfCanonicalHostBinding;
    const acceptedWorldMmPerPt = Number(project.scale.acceptedWorldMmPerPt);
    const unit = binding.axisUnit;
    const expectedCenter = {
      x: Number(binding.expectedCenterPt.x) * acceptedWorldMmPerPt,
      y: Number(binding.expectedCenterPt.y) * acceptedWorldMmPerPt
    };
    const positionDelta = canonicalPositionMm - Number(binding.expectedOpeningStartOffsetMm);
    const liveCenter = {
      x: expectedCenter.x + unit.x * positionDelta,
      y: expectedCenter.y + unit.y * positionDelta
    };
    const paddingMm = 2;
    const hostLength = Number(opening.widthMm) + paddingMm * 2;
    opening.pdfSourceHostEdge = {
      ...opening.pdfSourceHostEdge,
      from: {
        x: liveCenter.x - unit.x * hostLength / 2,
        y: liveCenter.y - unit.y * hostLength / 2
      },
      to: {
        x: liveCenter.x + unit.x * hostLength / 2,
        y: liveCenter.y + unit.y * hostLength / 2
      },
      length: hostLength
    };
    opening.edgeId = opening.pdfSourceHostEdge.id;
    opening.offset = paddingMm;
    opening.offsetMm = paddingMm;
    opening.positionOnWallMm = canonicalPositionMm;
    opening.pdfCanonicalWallStartOffsetMm = canonicalPositionMm;
    opening.pdfCanonicalWallCenterOffsetMm = canonicalPositionMm + Number(opening.widthMm) / 2;
    opening.pdfSourceAlignmentTransformId = legacyAlignmentId;
  }

  const editedWidth = Number(widthOpening.widthMm) + 100;
  widthOpening.width = editedWidth;
  widthOpening.widthMm = editedWidth;
  widthOpening.pdfSourceDimensionUserEdited = true;
  widthOpening.pdfSourceUserEditProvenance = {
    ...(widthOpening.pdfSourceUserEditProvenance || {}),
    width: true
  };
  setLegacyShortHost(widthOpening, Number(widthOpening.pdfCanonicalWallStartOffsetMm));

  const editedPosition = Number(positionOpening.pdfCanonicalWallStartOffsetMm) + 10;
  positionOpening.pdfSourcePositionUserEdited = true;
  positionOpening.pdfSourceUserEditProvenance = {
    ...(positionOpening.pdfSourceUserEditProvenance || {}),
    position: true
  };
  setLegacyShortHost(positionOpening, editedPosition);

  const restored = createPlanPuzzleRuntime(paths.planPuzzle, {
    recognitionApi: runtime.window.LaibePdfPlanExactSource,
    localStorage: createConfirmedWorkingDraftStorage(project)
  });
  const restoredProject = restored.project();
  const restoredWidth = restoredProject.openings.find((opening) => opening.id === widthOpening.id);
  const restoredPosition = restoredProject.openings.find((opening) => opening.id === positionOpening.id);
  const expectedAlignmentId = `${acceptedTransformId}:source-gap-host-v14-full-source-wall`;

  assert.equal(restoredWidth.pdfSourceAlignmentTransformId, expectedAlignmentId);
  assert.equal(restoredWidth.width, editedWidth);
  assert.equal(restoredWidth.widthMm, editedWidth);
  assert.ok(Math.abs(
    Number(restoredWidth.pdfSourceHostEdge.length) -
    Number(restoredWidth.pdfCanonicalHostBinding.sourceWallLengthMm)
  ) <= 0.01);
  assert.equal(restoredPosition.pdfSourceAlignmentTransformId, expectedAlignmentId);
  assert.equal(restoredPosition.pdfCanonicalWallStartOffsetMm, editedPosition);
  assert.equal(restoredPosition.positionOnWallMm, editedPosition);
  assert.equal(restoredPosition.offset, editedPosition);
  assert.equal(restoredPosition.offsetMm, editedPosition);
  assert.equal(
    restoredPosition.pdfCanonicalWallCenterOffsetMm,
    editedPosition + Number(restoredPosition.widthMm) / 2
  );
});

test("normal opening review confirms all eight source positions, records case activity, and then advances to the budget draft", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  assert.equal(
    project.openings.every((opening) => opening.sourceReviewStatus === "needs_review"),
    true
  );
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /8 筆待確認/);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /檢查門窗與圖面依據/);

  dispatchProductAction(runtime, "review-native-pdf-evidence");
  project.openings.forEach((opening, index) => {
    dispatchProductAction(runtime, "confirm-native-pdf-opening-review");
    assert.equal(opening.sourceReviewStatus, "confirmed");
    assert.ok(opening.sourceReviewedAt);
    assert.equal(opening.sourceReviewedBy, "業主");
    assert.equal(
      project.openings.filter((item) => item.sourceReviewStatus !== "confirmed").length,
      project.openings.length - index - 1
    );
  });

  const openingEvents = project.caseEvents.filter((event) => event.action === "確認門窗資料");
  assert.equal(openingEvents.length, 8);
  openingEvents.forEach((event, index) => {
    const opening = project.openings[index];
    assert.equal(event.actor, "業主");
    assert.equal(event.reviewer, "PCM");
    assert.equal(event.caseId, "task2-case");
    assert.equal(event.decision_status, "opening_details_confirmed");
    assert.ok(event.sourceDocument);
    assert.ok(event.occurred_at);
    assert.ok(event.next_actor);
    assert.equal(event.evidence.openingKind, opening.kind);
    assert.equal(event.evidence.openingType, opening.openingType);
    assert.equal(event.evidence.widthMm, opening.widthMm);
    assert.equal(event.evidence.heightMm, opening.heightMm);
    assert.equal(event.evidence.sillHeightMm, opening.sillHeightMm);
    assert.equal(event.evidence.positionOnWallMm, opening.pdfCanonicalWallStartOffsetMm);
    assert.equal(event.evidence.hostWallSourceId, opening.sourceWallId);
  });
  const completedHtml = runtime.elements.get("inspectorBody").innerHTML;
  assert.match(completedHtml, /8 筆已確認/);
  assert.doesNotMatch(completedHtml, /檢查門窗與圖面依據/);
  assert.match(completedHtml, />整理預算草稿</);
  assert.match(completedHtml, /門窗資料已確認並保留紀錄/);
});

test("moving a confirmed source opening reopens position review and keeps the decision trail", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  assert.ok(runtime.window.document.listenerCount("change") > 0);
  confirmAllOpeningReviewsThroughProductUi(runtime);
  const opening = project.openings[0];
  assert.equal(opening.sourceReviewStatus, "confirmed");
  const confirmationEvent = project.caseEvents.at(-1);

  const nextOffset = Math.min(
    Number(opening.pdfCanonicalHostBinding.sourceWallLengthMm) - Number(opening.width) - 1,
    Number(opening.pdfCanonicalWallStartOffsetMm) + 10
  );
  const previousOffset = Number(opening.pdfCanonicalWallStartOffsetMm);
  assert.notEqual(nextOffset, previousOffset);
  dispatchProductField(runtime, "selected-opening-offset", nextOffset);

  assert.notEqual(Number(opening.pdfCanonicalWallStartOffsetMm), previousOffset);
  assert.equal(opening.sourceReviewStatus, "needs_review");
  assert.ok(opening.sourceReviewInvalidatedAt);
  assert.equal(opening.sourceReviewInvalidationReason, "position_or_size_changed");
  assert.equal(project.caseEvents.includes(confirmationEvent), true);
  const editEvent = project.caseEvents.at(-1);
  assert.equal(editEvent.action, "property_edit");
  assert.equal(editEvent.evidence.sourceReviewReopened, true);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /1 筆待確認（已確認 7 筆）/);
  assert.doesNotMatch(runtime.elements.get("inspectorBody").innerHTML, />整理預算草稿</);

  assert.equal(runtime.window.laibePlanConfirmNativePdfOpeningReview(opening.id, {
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  assert.equal(opening.sourceReviewStatus, "confirmed");
  assert.equal(opening.sourceReviewInvalidatedAt, null);
  assert.equal(opening.sourceReviewInvalidationReason, null);
  assert.equal(opening.sourceReviewHistory.length, 1);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, />整理預算草稿</);
});

test("confirmed opening width remains one canonical fact, can expand within its proven host, and reopens review", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  confirmAllOpeningReviewsThroughProductUi(runtime);
  const opening = project.openings[0];
  const binding = opening.pdfCanonicalHostBinding;
  const nextWidth = Math.floor(Math.min(
    Number(opening.width) + 100,
    Number(binding.sourceWallLengthMm) - Number(opening.pdfCanonicalWallStartOffsetMm) - 1
  ));
  assert.ok(nextWidth > Number(opening.width));

  dispatchProductField(runtime, "selected-opening-width", nextWidth);

  assert.equal(opening.width, nextWidth);
  assert.equal(opening.widthMm, nextWidth);
  assert.equal(
    opening.pdfCanonicalWallCenterOffsetMm,
    opening.pdfCanonicalWallStartOffsetMm + nextWidth / 2
  );
  assert.equal(opening.sourceReviewStatus, "needs_review");
  assert.equal(opening.sourceReviewInvalidationReason, "position_or_size_changed");
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /1 筆待確認（已確認 7 筆）/);
  assert.doesNotMatch(runtime.elements.get("inspectorBody").innerHTML, />整理預算草稿</);
});

test("confirmed opening height change reopens source review before budget drafting", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  confirmAllOpeningReviewsThroughProductUi(runtime);
  const opening = project.openings[0];
  const nextHeight = Number(opening.height) + 10;
  const propertyEventCountBefore = project.caseEvents.filter((event) => event.action === "property_edit").length;

  dispatchProductField(runtime, "selected-opening-height", nextHeight, "input");

  assert.equal(opening.height, nextHeight);
  assert.equal(opening.heightMm, nextHeight);
  assert.equal(opening.sourceReviewStatus, "needs_review");
  assert.equal(opening.sourceReviewInvalidationReason, "details_changed");
  assert.equal(project.caseEvents.filter((event) => event.action === "property_edit").length, propertyEventCountBefore);
  assert.ok(runtime.runPendingTimers() > 0);
  const propertyEvents = project.caseEvents.filter((event) => event.action === "property_edit");
  assert.equal(propertyEvents.length, propertyEventCountBefore + 1);
  assert.equal(propertyEvents.at(-1).evidence.field, "selected-opening-height");
  assert.equal(propertyEvents.at(-1).evidence.sourceReviewReopened, true);
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /1 筆待確認（已確認 7 筆）/);
  assert.doesNotMatch(runtime.elements.get("inspectorBody").innerHTML, />整理預算草稿</);
});

test("rendered sill-height and type controls reopen confirmed opening review", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  confirmAllOpeningReviewsThroughProductUi(runtime);
  const opening = project.openings[0];
  const renderedInspector = runtime.elements.get("inspectorBody").innerHTML;
  assert.match(renderedInspector, /data-field="selected-opening-sill-height"/);
  assert.match(renderedInspector, /data-field="selected-opening-type"/);
  assert.doesNotMatch(renderedInspector, /data-field="selected-opening-kind"/);

  const nextSillHeight = Number(opening.sillHeight ?? 900) + 10;
  dispatchProductField(runtime, "selected-opening-sill-height", nextSillHeight);
  assert.equal(opening.sillHeight, nextSillHeight);
  assert.equal(opening.sillHeightMm, nextSillHeight);
  assert.equal(opening.sill_height_mm, nextSillHeight);
  assert.equal(opening.sourceReviewStatus, "needs_review");
  assert.equal(opening.sourceReviewInvalidationReason, "details_changed");
  assert.doesNotMatch(runtime.elements.get("inspectorBody").innerHTML, />整理預算草稿</);

  dispatchProductAction(runtime, "confirm-native-pdf-opening-review");
  assert.equal(opening.sourceReviewStatus, "confirmed");
  const nextOpeningType = opening.openingType === "fixed_window" ? "awning_window" : "fixed_window";
  dispatchProductField(runtime, "selected-opening-type", nextOpeningType);
  assert.equal(opening.openingType, nextOpeningType);
  assert.equal(opening.sourceReviewStatus, "needs_review");
  assert.equal(opening.sourceReviewInvalidationReason, "details_changed");
  assert.match(runtime.elements.get("inspectorBody").innerHTML, /1 筆待確認（已確認 7 筆）/);
  assert.doesNotMatch(runtime.elements.get("inspectorBody").innerHTML, />整理預算草稿</);
});

test("dragging a confirmed source opening through the canvas keeps aliases aligned and reopens review", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({
    actor: "業主",
    reviewer: "PCM",
    caseId: "task2-case"
  }).ok, true);
  const project = runtime.project();
  confirmAllOpeningReviewsThroughProductUi(runtime);
  const opening = project.openings[0];
  const edge = opening.pdfSourceHostEdge;
  const edgeLength = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
  const unit = {
    x: (edge.to.x - edge.from.x) / edgeLength,
    y: (edge.to.y - edge.from.y) / edgeLength
  };
  const centerDistance = Number(opening.offset) + Number(opening.width) / 2;
  const startWorld = {
    x: edge.from.x + unit.x * centerDistance,
    y: edge.from.y + unit.y * centerDistance
  };
  const pxPerMm = Number(project.scale.pxPerMm);
  const startClient = {
    x: Math.round(startWorld.x * pxPerMm),
    y: Math.round(startWorld.y * pxPerMm)
  };
  const hit = runtime.elements.get("openingLayer").children.find(
    (element) => element.classList?.contains("opening-hit-target") && element.dataset.openingId === opening.id
  );
  assert.ok(hit);
  const previousPosition = Number(opening.pdfCanonicalWallStartOffsetMm);

  hit.dispatchEvent({
    type: "pointerdown",
    button: 0,
    clientX: startClient.x,
    clientY: startClient.y,
    preventDefault() {},
    stopPropagation() {}
  });
  runtime.window.dispatchEvent({
    type: "pointermove",
    clientX: startClient.x + Math.round(unit.x * 50 * pxPerMm),
    clientY: startClient.y + Math.round(unit.y * 50 * pxPerMm),
    preventDefault() {}
  });
  runtime.window.dispatchEvent({ type: "pointerup" });

  assert.notEqual(opening.pdfCanonicalWallStartOffsetMm, previousPosition);
  assert.equal(opening.offset, opening.offsetMm);
  assert.equal(opening.width, opening.widthMm);
  assert.equal(
    opening.pdfCanonicalWallCenterOffsetMm,
    opening.pdfCanonicalWallStartOffsetMm + opening.widthMm / 2
  );
  assert.equal(opening.sourceReviewStatus, "needs_review");
  const editEvent = project.caseEvents.at(-1);
  assert.equal(editEvent.action, "property_edit");
  assert.equal(editEvent.evidence.field, "canvas_position");
  assert.equal(editEvent.evidence.sourceReviewReopened, true);
});

test("genuine File chooser stores a presentation-only source while awaiting A11 and manual scale", async () => {
  const runtime = createPlanPuzzleRuntime(paths.planPuzzle);
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    location: globalThis.location,
    fetch: globalThis.fetch
  };
  try {
    const localFiles = new Map([
      ["pdf-plan-vector-extractor.js", paths.extractor],
      ["pdf-plan-objectization-adapter.js", paths.adapter],
      ["pdf-plan-exact-source-runtime.mjs", paths.exactSourceRuntime]
    ]);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (resource, options) => {
      const url = String(resource);
      for (const [fileName, filePath] of localFiles) {
        if (url.includes(fileName)) {
          return new Response(readFileSync(filePath), { status: 200 });
        }
      }
      return realFetch(resource, options);
    };
    globalThis.window = runtime.window;
    globalThis.document = browserEquivalentRasterDocument(runtime);
    globalThis.location = {
      hostname: "test.invalid",
      origin: "http://test.invalid",
      href: "http://test.invalid/code.html",
      search: ""
    };
    Object.assign(runtime.window, {
      location: globalThis.location,
      crypto: globalThis.crypto,
      pdfjsLib: browserEquivalentPdfJs(globalThis.pdfjsLib),
      LaibePdfPlanVectorExtractor: globalThis.LaibePdfPlanVectorExtractor,
      LaibePdfPlanObjectizationAdapter: globalThis.LaibePdfPlanObjectizationAdapter
    });
    await import(pathToFileURL(paths.exactSourceRuntime).href + "?presentation-only-chooser=1");

    const file = new NodeFile(
      [readFileSync(paths.pdf)],
      "_qa_pdf_reference_3rf.pdf",
      { type: "application/pdf" }
    );
    const fileInput = runtime.elements.get("planImportInput");
    fileInput.files = [file];
    fileInput.dispatchEvent({ type: "change", target: fileInput });
    const project = await waitForValue(
      () => runtime.project().sourcePresentation?.status ===
        "awaiting_a11_bundle_and_user_scale_confirmation"
        ? runtime.project()
        : null,
      "genuine File source presentation"
    );

    assert.equal(project.importSource.presentationStatus, "source_presentation_ready");
    assert.equal(project.underlay.presentationOnly, true);
    assert.equal(project.underlay.renderMode, "pdf-background-presentation");
    assert.equal(project.underlay.calibratedBy, null);
    assert.match(project.sourcePresentation.sourceDocumentSha256, /^[0-9A-F]{64}$/);
    assert.equal(project.sourcePresentation.pageNumber, 1);
    assert.equal(project.sourcePresentation.a11BundleId, null);
    assert.equal(project.sourcePresentation.userScaleConfirmationStatus, "pending");
    assert.equal(project.scale.calibrated, false);
    assert.equal(project.scale.pxPerMm, null);
    assert.equal(project.scale.autoScaleApplied, false);
    for (const collection of [
      project.walls,
      project.openings,
      project.structures,
      project.structuralObjects,
      project.furniture
    ]) {
      assert.equal(collection.length, 0);
    }
    assert.equal(project.nativePdfObjectization, null);
    assert.equal(project.nativePdfScaleConfirmation, null);

    const api = runtime.window.LaibePdfPlanExactSource;
    await assert.rejects(
      api.recognizeSelectedPdfFile(file),
      (error) =>
        error?.code === "A11_BUNDLE_REQUIRED" &&
        error?.operation === "recognizeSelectedPdfFile"
    );
    await assert.rejects(
      api.importSelectedPdfFile(file),
      (error) =>
        error?.code === "A11_BUNDLE_REQUIRED" &&
        error?.operation === "importSelectedPdfFile"
    );
  } finally {
    globalThis.window = previousGlobals.window;
    globalThis.document = previousGlobals.document;
    globalThis.location = previousGlobals.location;
    globalThis.fetch = previousGlobals.fetch;
  }
});

test("browser-captured post-scale source fixture transforms every native column polygon in the same accepted frame as walls", () => {
  const { runtime, importScene } = createAuthorizedRuntime({
    transformPlanPuzzleSource(source) {
      return source.replace(
        "  window.laibePlanConfirmNativePdfScale = confirmNativePdfScale;",
        [
          "  window.LaibePlanPuzzleQa.applyCapturedCalibrationFixture = function applyCapturedCalibrationFixture(receipt, acceptedTransformId) {",
          "    return r6ApplyAcceptedCalibrationTransform(project, receipt, acceptedTransformId);",
          "  };",
          "  window.laibePlanConfirmNativePdfScale = confirmNativePdfScale;"
        ].join("\n")
      );
    }
  });
  assert.equal(
    canonical.sourceSha256.toLowerCase(),
    capturedBrowserScaleFixture.sourcePdfSha256
  );
  assert.equal(canonical.upperRegionId, capturedBrowserScaleFixture.fixtureSelectedRegionId);
  assert.equal(importScene().ok, true);

  const beforeColumns = structuredClone(runtime.project().structures);
  const application = runtime.window.LaibePlanPuzzleQa.applyCapturedCalibrationFixture(
    capturedBrowserScaleFixture.receipt,
    capturedBrowserScaleFixture.acceptedTransformId
  );
  const afterColumns = runtime.project().structures;
  const expectedPolygons = beforeColumns.map((column) => column.polygonMm.map((point) => ({
    x: Math.round(Number(point.x) * capturedBrowserScaleFixture.receipt.geometryScaleFactorX * 1e6) / 1e6,
    y: Math.round(Number(point.y) * capturedBrowserScaleFixture.receipt.geometryScaleFactorY * 1e6) / 1e6
  })));
  const transformedPolygonCount = afterColumns.filter((column, index) =>
    JSON.stringify(column.polygonMm) === JSON.stringify(expectedPolygons[index])
  ).length;
  const audit = runtime.window.LaibePlanPuzzleQa.getNativeWallGeometryV3Audit();

  assert.equal(application.pass, true);
  assert.equal(application.applicableCount, 170);
  assert.equal(application.appliedCount, 170);
  assert.equal(application.inventory.categoryCounts.structures, 9);
  assert.equal(
    transformedPolygonCount,
    9,
    JSON.stringify({
      audit,
      beforeColumns: beforeColumns.map((column) => ({ id: column.id, polygonMm: column.polygonMm })),
      afterColumns: afterColumns.map((column) => ({ id: column.id, polygonMm: column.polygonMm })),
      expectedPolygons
    })
  );
  afterColumns.forEach((column, index) => {
    assert.equal(JSON.stringify(column.polygonMm), JSON.stringify(expectedPolygons[index]));
    assert.equal(column.r6AppliedPolygonTransformId, capturedBrowserScaleFixture.acceptedTransformId);
    assert.equal(column.polygonCoordinateFrame, "accepted-live-mm");
  });
  assert.deepEqual(
    {
      pass: audit.pass,
      gapCount: audit.gapCount,
      illegalOverlapCount: audit.illegalOverlapCount,
      protrusionCount: audit.protrusionCount,
      disconnectedBoundaryCount: audit.disconnectedBoundaryCount
    },
    {
      pass: true,
      gapCount: 0,
      illegalOverlapCount: 0,
      protrusionCount: 0,
      disconnectedBoundaryCount: 0
    }
  );
});

test("production chooser never forwards automatic recognition, dimension scale, or native import", () => {
  const planSource = readFileSync(paths.planPuzzle, "utf8");
  const exactRuntimeSource = readFileSync(paths.exactSourceRuntime, "utf8");
  const chooserStart = planSource.indexOf("  async function importSelectedR6Pdf");
  const chooserEnd = planSource.indexOf("  function r6SelectedRecord", chooserStart);
  assert.ok(chooserStart >= 0 && chooserEnd > chooserStart);
  const chooserSource = planSource.slice(chooserStart, chooserEnd);

  assert.match(chooserSource, /\bapi\.presentSelectedPdfFile\s*\(/);
  assert.match(chooserSource, /status\s*!==\s*"source_presentation_ready"/);
  assert.match(
    chooserSource,
    /status:\s*"awaiting_a11_bundle_and_user_scale_confirmation"/
  );
  assert.match(chooserSource, /userScaleConfirmationStatus:\s*"pending"/);
  const apiCalls = Array.from(
    chooserSource.matchAll(/\bapi\.([A-Za-z_$][\w$]*)\s*\(/g),
    (match) => match[1]
  );
  assert.deepEqual(Array.from(new Set(apiCalls)), ["presentSelectedPdfFile"]);

  for (const prohibited of [
    "recognizeSelectedPdfFile",
    "importSelectedPdfFile",
    "createScaleDecisionFromRecognitionReceipt",
    "convertSelectedFile",
    "r7TryAutomaticDimensionScale",
    "showPdfRecognitionOverlay",
    "automatic-recognition-gate",
    "automatic_candidate_conservation"
  ]) {
    assert.equal(chooserSource.includes(prohibited), false, prohibited);
  }
  assert.match(exactRuntimeSource, /error\.code\s*=\s*"A11_BUNDLE_REQUIRED"/);
  assert.match(
    exactRuntimeSource,
    /async function recognizeSelectedPdfFile\(\)\s*\{\s*throw a11BundleRequiredError\("recognizeSelectedPdfFile"\);\s*\}/
  );
  assert.match(
    exactRuntimeSource,
    /async function importSelectedPdfFile\(\)\s*\{\s*throw a11BundleRequiredError\("importSelectedPdfFile"\);\s*\}/
  );
  for (const selector of autoScaleUiRejections.forbiddenSelectors) {
    assert.equal(chooserSource.includes(selector), false, selector);
  }
  for (const copy of autoScaleUiRejections.forbiddenUserCopy) {
    assert.equal(chooserSource.includes(copy), false, copy);
  }
  assert.equal(
    /horizontalLengthMm\s*:\s*6500|verticalLengthMm\s*:\s*5250/.test(chooserSource),
    false,
    "presentation-only chooser must not hard-code or infer dimensions"
  );
});

test("all nine locked native PDF columns reject budget, copy, paste, duplicate, and delete mutations without changing object, resolver, or DOM hashes", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const column = runtime.project().structures[0];
  assert.equal(column.native, true);
  assert.equal(column.locked, true);
  assert.equal(column.budgetExcluded, true);
  const hitTarget = runtime.elements.get("structureLayer").children.find(
    (element) =>
      element.classList?.contains("structure-column-hit-target") &&
      element.dataset.structureId === column.id
  );
  assert.ok(hitTarget);
  hitTarget.click();

  const mutationSnapshot = () => {
    const receipt = runtime.window.LaibePlanPuzzleQa.getRenderedGeometryReceiptV3();
    const audit = runtime.window.LaibePlanPuzzleQa.getNativeWallGeometryV3Audit();
    return {
      structureCount: runtime.project().structures.length,
      completeObjectHash: createHash("sha256")
        .update(JSON.stringify(runtime.project().structures))
        .digest("hex"),
      resolverGeometryHash: receipt.resolverGeometryHash,
      domGeometryHash: receipt.domGeometryHash,
      accountingGeometryHash: audit.accountingGeometryHash,
      columnBodyCount: receipt.columnBodyCount,
      auditHash: createHash("sha256").update(JSON.stringify(audit)).digest("hex")
    };
  };
  const snapshotBefore = mutationSnapshot();
  assert.equal(snapshotBefore.structureCount, 9);
  assert.equal(snapshotBefore.columnBodyCount, 9);
  assert.equal(snapshotBefore.resolverGeometryHash, snapshotBefore.domGeometryHash);
  const budgetPurposeBefore = column.budgetPurpose;
  const updatedAtBefore = column.updatedAt;
  const budgetPurposeControl = runtime.document.createElement("select");
  budgetPurposeControl.dataset.field = "selected-budget-purpose";
  budgetPurposeControl.value = "mark";
  runtime.document.dispatchEvent({
    type: "change",
    target: budgetPurposeControl
  });
  const snapshotAfterBudgetPurpose = mutationSnapshot();
  const copyResult = runtime.window.laibePlanCopySelection();
  const snapshotAfterCopy = mutationSnapshot();
  const pasteResult = runtime.window.laibePlanPasteSelection();
  const snapshotAfterPaste = mutationSnapshot();
  dispatchProductAction(runtime, "duplicate-current-selection");
  const snapshotAfterDuplicate = mutationSnapshot();
  dispatchProductAction(runtime, "delete-current-selection");
  const snapshotAfterDelete = mutationSnapshot();

  assert.deepEqual(
    {
      copyResult,
      pasteResult,
      budgetPurposeBefore,
      budgetPurposeAfter: column.budgetPurpose,
      updatedAtBefore,
      updatedAtAfter: column.updatedAt,
      structureCountBefore: 9,
      structureCountAfter: runtime.project().structures.length,
      snapshotAfterBudgetPurpose,
      snapshotAfterCopy,
      snapshotAfterPaste,
      snapshotAfterDuplicate,
      snapshotAfterDelete
    },
    {
      copyResult: false,
      pasteResult: false,
      budgetPurposeBefore,
      budgetPurposeAfter: budgetPurposeBefore,
      updatedAtBefore,
      updatedAtAfter: updatedAtBefore,
      structureCountBefore: 9,
      structureCountAfter: 9,
      snapshotAfterBudgetPurpose: snapshotBefore,
      snapshotAfterCopy: snapshotBefore,
      snapshotAfterPaste: snapshotBefore,
      snapshotAfterDuplicate: snapshotBefore,
      snapshotAfterDelete: snapshotBefore
    }
  );
});

test("normal controls preserve wall thickness and imported lifecycle through undo redo save reload delete and re-import", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  assert.equal(runtime.window.laibePlanConfirmNativePdfScale({ actor: "業主", reviewer: "PCM" }).ok, true);
  const probe = runtime.window.LaibePlanPuzzleQa.runNativeObjectizationLifecycleProbe({
    reimportAuthorizationToken: "task2-reimport"
  });
  assert.equal(probe.ready, true);
  assert.equal(probe.importedWall.select, true);
  assert.equal(probe.importedWall.modifyThickness, true, JSON.stringify(probe, null, 2));
  assert.equal(probe.importedWall.undo, true);
  assert.equal(probe.importedWall.redo, true);
  assert.equal(probe.importedWall.delete, true);
  assert.equal(probe.importedWall.undoDelete, true);
  assert.equal(probe.manualWall.positiveThicknessOnCreate, true);
  assert.equal(probe.manualWall.editThickness, true);
  assert.equal(probe.persistence.save, true);
  assert.equal(probe.persistence.reload, true);
  assert.equal(probe.persistence.importedThicknessSurvives, true);
  assert.equal(probe.persistence.manualThicknessSurvives, true);
  assert.equal(probe.reimport.replacesSourceProject, true);
  assert.equal(probe.reimport.noDuplicateNativeObjects, true);
});

test("opening width label and import CTA states use clear Traditional Chinese without internal terms", () => {
  const { runtime, importScene } = createAuthorizedRuntime();
  assert.equal(importScene().ok, true);
  const language = runtime.window.LaibePlanPuzzleQa.getNativeObjectizationLanguageAudit();
  assert.equal(language.pass, true);
  assert.deepEqual(Array.from(language.openingWidthLabels), ["門", "窗"]);
  assert.match(language.successMessage, /已匯入|請確認/);
  assert.match(language.authorizationFailureMessage, /重新|確認/);
  assert.match(language.invalidSceneMessage, /格式|重新/);
  assert.match(language.emptySceneMessage, /內容|重新/);
  language.userVisibleSamples.forEach((sample) => {
    assert.match(sample, /[\u3400-\u9fff]/);
    assert.doesNotMatch(sample, /authorization|schema|scene|token|debug|mock|API|DB|n8n|GitHub/i);
    assert.doesNotMatch(sample, /(?:ï¿½|�|銝|嚗|撌|蝔|雿|閮|璅|靽|鈭|瘝|鞈|頛)/);
  });
});
