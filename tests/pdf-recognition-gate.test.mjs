import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import path from "node:path";
import test from "node:test";

import {
  PDF_DIMENSION_SCALE_SCHEMA,
  stableScaleDecisionHash
} from "../site/preview_floor_plan/pdf-dimension-scale-decision.mjs";
import { createPlanPuzzleRuntime } from "./helpers/plan-puzzle-runtime-harness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recognitionGatePath = path.join(
  repoRoot,
  "site",
  "preview_floor_plan",
  "pdf-recognition-gate.mjs"
);
const planPuzzlePath = path.join(
  repoRoot,
  "site",
  "preview_floor_plan",
  "plan-puzzle.js"
);
const planPuzzleHtmlPath = path.join(
  repoRoot,
  "tests",
  "fixtures",
  "preview-floor-plan-code.fixture.txt"
);
const exactSourceRuntimePath = path.join(
  repoRoot,
  "site",
  "preview_floor_plan",
  "pdf-plan-exact-source-runtime.mjs"
);
const extractorPath = path.join(
  repoRoot,
  "site",
  "preview_floor_plan",
  "pdf-plan-vector-extractor.js"
);
const adapterPath = path.join(
  repoRoot,
  "site",
  "preview_floor_plan",
  "pdf-plan-objectization-adapter.js"
);
const canonicalPdfPath = path.join(
  repoRoot,
  "tests",
  "fixtures",
  "_qa_pdf_reference_3rf.pdf"
);
const pdfJsPath = path.join(
  repoRoot,
  "site",
  "preview_floor_plan",
  "vendor",
  "pdfjs",
  "pdf.mjs"
);
const autoScaleUiRejections = JSON.parse(readFileSync(
  path.join(repoRoot, "tests", "fixtures", "pdf-auto-scale-ui-rejections.json"),
  "utf8"
));

function acceptedScaleDecision(selectedRegionId) {
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
        dimensionTextSourceId: "scale-horizontal-text",
        dimensionLineSourceId: "scale-horizontal-line",
        witnessLineSourceIds: ["scale-horizontal-witness-1", "scale-horizontal-witness-2"],
        displayedValue: "600",
        interpretedLengthMm: 6000,
        measuredLengthPt: 300,
        worldMmPerPt: 20
      },
      {
        orientation: "vertical",
        dimensionTextSourceId: "scale-vertical-text",
        dimensionLineSourceId: "scale-vertical-line",
        witnessLineSourceIds: ["scale-vertical-witness-1", "scale-vertical-witness-2"],
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

async function scaleBoundBinding({
  fileSha256,
  pageNumber = 1,
  selectedRegionId
}) {
  const scaleDecision = acceptedScaleDecision(selectedRegionId);
  return {
    fileSha256,
    sourcePdfSha256: fileSha256,
    pageNumber,
    selectedRegionId,
    scaleDecisionSchema: PDF_DIMENSION_SCALE_SCHEMA,
    scaleDecisionHash: await stableScaleDecisionHash(scaleDecision),
    scaleDecision
  };
}

function installPdfJsNodePolyfills() {
  if (!Uint8Array.prototype.toHex) {
    Object.defineProperty(Uint8Array.prototype, "toHex", {
      value() {
        return Array.from(this, (byte) => byte.toString(16).padStart(2, "0")).join("");
      }
    });
  }
  if (!Map.prototype.getOrInsertComputed) {
    Object.defineProperty(Map.prototype, "getOrInsertComputed", {
      value(key, createValue) {
        if (!this.has(key)) this.set(key, createValue(key));
        return this.get(key);
      }
    });
  }
  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = class DOMMatrix {
      constructor(values = [1, 0, 0, 1, 0, 0]) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = [
          Number(values[0] ?? 1),
          Number(values[1] ?? 0),
          Number(values[2] ?? 0),
          Number(values[3] ?? 1),
          Number(values[4] ?? 0),
          Number(values[5] ?? 0)
        ];
      }
      multiplySelf(other) {
        const next = {
          a: this.a * other.a + this.c * other.b,
          b: this.b * other.a + this.d * other.b,
          c: this.a * other.c + this.c * other.d,
          d: this.b * other.c + this.d * other.d,
          e: this.a * other.e + this.c * other.f + this.e,
          f: this.b * other.e + this.d * other.f + this.f
        };
        Object.assign(this, next);
        return this;
      }
      preMultiplySelf(other) {
        const current = new globalThis.DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
        Object.assign(this, other);
        return this.multiplySelf(current);
      }
      translate(x = 0, y = 0) {
        return new globalThis.DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f])
          .translateSelf(x, y);
      }
      translateSelf(x = 0, y = 0) {
        return this.multiplySelf(new globalThis.DOMMatrix([1, 0, 0, 1, x, y]));
      }
      scale(x = 1, y = x) {
        return new globalThis.DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f])
          .scaleSelf(x, y);
      }
      scaleSelf(x = 1, y = x) {
        return this.multiplySelf(new globalThis.DOMMatrix([x, 0, 0, y, 0, 0]));
      }
      invertSelf() {
        const determinant = this.a * this.d - this.b * this.c;
        const { a, b, c, d, e, f } = this;
        Object.assign(this, {
          a: d / determinant,
          b: -b / determinant,
          c: -c / determinant,
          d: a / determinant,
          e: (c * f - d * e) / determinant,
          f: (b * e - a * f) / determinant
        });
        return this;
      }
    };
  }
  globalThis.ImageData ||= class ImageData {};
  globalThis.Path2D ||= class Path2D {};
}

let canonicalExtractorOutputPromise;
async function canonicalExtractorOutput() {
  if (!canonicalExtractorOutputPromise) {
    canonicalExtractorOutputPromise = (async () => {
      installPdfJsNodePolyfills();
      const pdfjsLib = await import(pathToFileURL(pdfJsPath).href);
      globalThis.pdfjsLib = pdfjsLib;
      await import(`${pathToFileURL(extractorPath).href}?canonical-stair-roles=1`);
      const bytes = new Uint8Array(readFileSync(canonicalPdfPath));
      const document = await pdfjsLib.getDocument({ data: bytes, disableWorker: true }).promise;
      const page = await document.getPage(1);
      return globalThis.LaibePdfPlanVectorExtractor.extractFromPage(page, { pageNumber: 1 });
    })();
  }
  return canonicalExtractorOutputPromise;
}

function fixtureOperatorLine(id, p1, p2) {
  return {
    id,
    operatorLineId: id,
    p1,
    p2,
    coordinateFrame: "page-bottom-left-pdf-pt",
    sourceEvidence: "pdf_operator_line_geometry"
  };
}

function completeStairEvidenceFixture(prefix, x = 400, y = 200) {
  const treadLines = Array.from({ length: 5 }, (_, index) =>
    fixtureOperatorLine(
      `${prefix}-tread-${index + 1}`,
      { x: x + 10, y: y + 15 + index * 12 },
      { x: x + 90, y: y + 15 + index * 12 }
    )
  );
  const boundaryLines = [
    fixtureOperatorLine(
      `${prefix}-boundary-left`,
      { x, y },
      { x, y: y + 120 }
    ),
    fixtureOperatorLine(
      `${prefix}-boundary-right`,
      { x: x + 100, y },
      { x: x + 100, y: y + 120 }
    )
  ];
  const landingLines = [
    fixtureOperatorLine(
      `${prefix}-landing`,
      { x, y: y + 100 },
      { x: x + 100, y: y + 100 }
    )
  ];
  const markerLines = [
    fixtureOperatorLine(
      `${prefix}-marker-shaft`,
      { x: x + 50, y: y + 20 },
      { x: x + 50, y: y + 85 }
    ),
    fixtureOperatorLine(
      `${prefix}-marker-base`,
      { x: x + 46, y: y + 75 },
      { x: x + 54, y: y + 75 }
    ),
    fixtureOperatorLine(
      `${prefix}-marker-wing-a`,
      { x: x + 46, y: y + 75 },
      { x: x + 50, y: y + 85 }
    ),
    fixtureOperatorLine(
      `${prefix}-marker-wing-b`,
      { x: x + 50, y: y + 85 },
      { x: x + 54, y: y + 75 }
    )
  ];
  return {
    treadLineIds: treadLines.map((line) => line.id),
    treadLines,
    treadCount: treadLines.length,
    boundaryLineIds: boundaryLines.map((line) => line.id),
    boundaryLines,
    landingLineId: landingLines[0].id,
    landingLine: landingLines[0],
    landingLineIds: landingLines.map((line) => line.id),
    landingLines,
    markerLineIds: markerLines.map((line) => line.id),
    markerLines,
    requiredRoleStatus: {
      treads: "geometry_bound",
      boundaries: "geometry_bound",
      landing: "geometry_bound",
      stairMarker: "geometry_bound"
    },
    requiredRolesComplete: true,
    completeCoverage: {
      source: "pdf_operator_line_geometry",
      boundaryAxisCoverage: ["parallel_to_treads", "perpendicular_to_treads"],
      stairMarkerType: "direction_arrow"
    },
    roleRelationEvidence: {
      stairMarker: {
        markerType: "direction_arrow",
        motifs: [{
          markerType: "direction_arrow",
          lineIds: markerLines.map((line) => line.id)
        }]
      }
    },
    boundedEnvelope: { bounded: true }
  };
}

const mixedFixture = {
  source: {
    fileName: "mixed-floor-plan.pdf",
    fileSha256: "A".repeat(64),
    pageNumber: 1,
    pageWidthPt: 840,
    pageHeightPt: 594
  },
  candidates: [
    { id: "wall-1", kind: "wall", sourceLineIds: ["wall-line-1"] },
    {
      id: "door-1",
      kind: "door",
      hostRelation: { hostId: "wall-1", relation: "interrupts_wall" },
      sourceLineIds: ["door-line-1", "door-arc-1"]
    },
    {
      id: "window-1",
      kind: "window",
      hostRelation: { hostId: "wall-1", relation: "interrupts_wall" },
      sourceLineIds: ["window-line-1", "window-line-2"]
    },
    {
      id: "opening-1",
      kind: "opening",
      hostRelation: { hostId: "wall-1", relation: "interrupts_wall" },
      sourceLineIds: ["opening-line-1"]
    },
    {
      id: "stair-1",
      kind: "stair",
      sourceLineIds: completeStairEvidenceFixture("mixed-stair").treadLineIds,
      sourcePayload: completeStairEvidenceFixture("mixed-stair")
    },
    { id: "bath-1", kind: "bathroom_fixture", sourceLineIds: ["bath-line-1"] },
    { id: "cabinet-1", kind: "fixed_cabinet", sourceLineIds: ["cabinet-line-1"] },
    { id: "column-1", kind: "structural_column", sourceLineIds: ["column-path-1"] },
    { id: "dimension-1", kind: "dimension_annotation", sourceLineIds: ["dimension-line-1"] },
    { id: "text-1", kind: "text_annotation", sourceText: "客廳" },
    {
      id: "unknown-1",
      kind: "unknown",
      importance: "important",
      sourceLineIds: ["unknown-line-1"],
      sourcePayload: { reason: "large enclosed source geometry" }
    }
  ]
};

const exactSourceSha256 =
  "37C9016ADFFA354030B0DAD746CFBB7887B45812F4FB7332BA6AECB908079ABA";
const actualObjectizationSceneFixture = {
  source: {
    fileName: "_qa_pdf_reference_3rf.pdf",
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    pageWidthPt: 842,
    pageHeightPt: 1191,
    coordinateFrame: "page-bottom-left-pdf-pt"
  },
  structuralWalls: [
    {
      source_object_id: "src-wall-001",
      sourcePathIds: ["pdf-wall-line-001"],
      sourceBBox: [100, 100, 300, 112],
      p1: { x: 100, y: 106 },
      p2: { x: 300, y: 106 },
      width: 12
    }
  ],
  openingCandidates: [
    {
      source_object_id: "src-door-001",
      subtype: "hinged_door",
      sourcePathIds: ["pdf-door-leaf-001", "pdf-door-arc-001"],
      sourceBBox: [180, 88, 230, 138],
      geometry: {
        bbox: [180, 88, 230, 138],
        evidence: {
          hostWallSourceIds: ["src-wall-001"]
        }
      },
      evidence: {
        hostWallSourceIds: ["src-wall-001"]
      }
    },
    {
      source_object_id: "src-window-001",
      subtype: "window",
      sourcePathIds: ["pdf-window-line-001", "pdf-window-line-002"],
      sourceBBox: [240, 98, 280, 114],
      evidence: {
        hostWallSourceIds: ["src-wall-001"]
      }
    },
    {
      source_object_id: "src-opening-001",
      subtype: "wall_opening",
      sourcePathIds: ["pdf-opening-line-001"],
      sourceBBox: [140, 98, 165, 114],
      evidence: {
        hostWallSourceIds: ["src-wall-001"]
      }
    }
  ],
  stairCandidates: [
    {
      source_object_id: "src-stair-001",
      sourcePathIds: ["pdf-stair-candidate-001"],
      sourceBBox: [400, 200, 500, 320],
      evidence: completeStairEvidenceFixture("pdf-stair-fixture", 400, 200)
    }
  ],
  lineSegments: [
    {
      id: "pdf-stair-boundary-left",
      p1: { x: 400, y: 200 },
      p2: { x: 400, y: 320 }
    },
    {
      id: "pdf-stair-boundary-right",
      p1: { x: 500, y: 200 },
      p2: { x: 500, y: 320 }
    },
    {
      id: "pdf-landing-001",
      p1: { x: 400, y: 300 },
      p2: { x: 500, y: 300 }
    },
    {
      id: "pdf-stair-direction-001",
      p1: { x: 450, y: 210 },
      p2: { x: 450, y: 290 }
    }
  ],
  bathroomFixtureCandidates: [
    {
      source_object_id: "src-bath-001",
      sourcePathIds: ["pdf-bath-path-001"],
      sourceBBox: [520, 200, 570, 250]
    }
  ],
  fixedCabinetCandidates: [
    {
      source_object_id: "src-cabinet-001",
      sourcePathIds: ["pdf-cabinet-path-001"],
      sourceBBox: [590, 200, 680, 250]
    }
  ],
  columns: [
    {
      source_object_id: "src-column-001",
      sourcePathIds: ["pdf-column-path-001"],
      sourceBBox: [320, 100, 350, 130]
    }
  ],
  dimensionLines: [
    {
      source_object_id: "src-dimension-001",
      sourcePathIds: ["pdf-dimension-line-001"],
      sourceBBox: [100, 60, 300, 62],
      p1: { x: 100, y: 61 },
      p2: { x: 300, y: 61 }
    }
  ],
  decodedTextRuns: [
    {
      source_object_id: "src-text-001",
      rawLabel: "300",
      sourceBBox: [190, 45, 220, 58]
    }
  ],
  glyphClusters: [
    {
      source_object_id: "src-glyph-001",
      text: "客廳",
      sourceBBox: [340, 400, 385, 420]
    }
  ],
  stairVoidCandidates: [
    {
      source_object_id: "src-stair-void-001",
      sourcePathIds: ["pdf-void-boundary-001"],
      sourceBBox: [395, 190, 505, 330],
      evidence: {
        boundaryLineIds: ["pdf-void-boundary-001"],
        hostWallSourceIds: ["src-wall-001"]
      }
    }
  ],
  spaceBoundaryCandidates: [
    {
      source_object_id: "src-space-unknown-001",
      sourcePathIds: ["pdf-space-boundary-001"],
      sourceBBox: [90, 80, 700, 500],
      evidence: {
        closedTopology: true
      }
    }
  ]
};

const upperRegionId = "page-1-dimension-cluster-b";
const lowerRegionId = "page-1-dimension-cluster-a";

function sourceItem(id, sourceRegionId, sourceBBox, extra = {}) {
  return {
    source_object_id: id,
    sourceRegionId,
    sourceBBox,
    bbox: sourceBBox,
    ...extra
  };
}

function repeated(count, factory) {
  return Array.from({ length: count }, (_, index) => factory(index));
}

const canonicalTwoRegionSceneFixture = {
  source: {
    fileName: "_qa_pdf_reference_3rf.pdf",
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    pageWidthPt: 842,
    pageHeightPt: 1191,
    coordinateFrame: "page-bottom-left-pdf-pt"
  },
  page: {
    number: 1,
    rect: { x0: 0, y0: 0, x1: 842, y1: 1191, width: 842, height: 1191 }
  },
  sourceRegions: [
    {
      sourceRegionId: "page-1-full",
      boundsPt: { x0: 0, y0: 0, x1: 842, y1: 1191 },
      semantic_status: "page_reference",
      floor_semantic: false
    },
    {
      sourceRegionId: lowerRegionId,
      boundsPt: { x0: 50, y0: 50, x1: 790, y1: 790 },
      semantic_status: "geometry_evidence_bound",
      dimension_evidence_region: true,
      orientationEvidence: {
        source: "geometry_cluster_crop",
        observedRotationDegrees: 0,
        recommendedRotationDegrees: 0,
        sampleCount: 1
      }
    },
    {
      sourceRegionId: upperRegionId,
      boundsPt: { x0: 50, y0: 800, x1: 790, y1: 1170 },
      semantic_status: "geometry_evidence_bound",
      dimension_evidence_region: true,
      orientationEvidence: {
        source: "geometry_cluster_crop",
        observedRotationDegrees: 0,
        recommendedRotationDegrees: 0,
        sampleCount: 1
      }
    },
    {
      sourceRegionId: "page-1-unassigned",
      boundsPt: { x0: 0, y0: 0, x1: 842, y1: 1191 },
      semantic_status: "unresolved",
      floor_semantic: false,
      excluded_from_floor_assignment: true
    }
  ],
  structuralWalls: [
    ...repeated(58, (index) => sourceItem(
      `src_upper_wall_${index + 1}`,
      upperRegionId,
      [100 + index, 900, 130 + index, 908],
      {
        sourcePathIds: [`upper-wall-line-${index + 1}`],
        p1: { x: 100 + index, y: 904 },
        p2: { x: 130 + index, y: 904 },
        width: 8
      }
    )),
    ...repeated(2, (index) => sourceItem(
      `src_lower_wall_${index + 1}`,
      lowerRegionId,
      [100 + index * 50, 300, 140 + index * 50, 308],
      {
        sourcePathIds: [`lower-wall-line-${index + 1}`],
        p1: { x: 100 + index * 50, y: 304 },
        p2: { x: 140 + index * 50, y: 304 },
        width: 8
      }
    ))
  ],
  openingCandidates: [
    ...repeated(3, (index) => sourceItem(
      `src_upper_door_${index + 1}`,
      upperRegionId,
      [200 + index * 20, 880, 215 + index * 20, 910],
      {
        subtype: "hinged_door",
        sourcePathIds: [`upper-door-${index + 1}`],
        evidence: { hostWallSourceIds: [`src_upper_wall_${index + 1}`] }
      }
    )),
    ...repeated(5, (index) => sourceItem(
      `src_upper_window_${index + 1}`,
      upperRegionId,
      [300 + index * 20, 895, 315 + index * 20, 910],
      {
        subtype: "window",
        sourcePathIds: [`upper-window-${index + 1}`],
        evidence: { hostWallSourceIds: [`src_upper_wall_${index + 10}`] }
      }
    ))
  ],
  stairCandidates: [
    sourceItem("src_upper_stair_1", upperRegionId, [400, 850, 500, 980], {
      sourcePathIds: ["upper-stair-candidate-1"],
      evidence: completeStairEvidenceFixture("upper-stair", 400, 850)
    })
  ],
  bathroomFixtureCandidates: repeated(2, (index) => sourceItem(
    `src_upper_bath_${index + 1}`,
    upperRegionId,
    [520 + index * 30, 850, 545 + index * 30, 880],
    { sourcePathIds: [`upper-bath-${index + 1}`] }
  )),
  columns: repeated(9, (index) => sourceItem(
    `src_upper_column_${index + 1}`,
    upperRegionId,
    [100 + index * 40, 820, 112 + index * 40, 832],
    { sourcePathIds: [`upper-column-${index + 1}`] }
  )),
  dimensionLines: repeated(2, (index) => sourceItem(
    `src_upper_dimension_${index + 1}`,
    upperRegionId,
    [100, 1100 + index * 15, 500, 1102 + index * 15],
    {
      p1: { x: 100, y: 1101 + index * 15 },
      p2: { x: 500, y: 1101 + index * 15 }
    }
  )),
  decodedTextRuns: repeated(2, (index) => sourceItem(
    `src_upper_text_${index + 1}`,
    upperRegionId,
    [250 + index * 50, 1050, 280 + index * 50, 1065],
    { rawLabel: String(300 + index * 25) }
  )),
  spaceBoundaryCandidates: [
    ...repeated(5, (index) => sourceItem(
      `src_upper_unknown_${index + 1}`,
      upperRegionId,
      [80 + index * 20, 805, 700, 1000],
      { sourcePathIds: [`upper-space-${index + 1}`], evidence: { closedTopology: true } }
    )),
    sourceItem("src_lower_unknown_1", lowerRegionId, [80, 80, 700, 600], {
      sourcePathIds: ["lower-space-1"],
      evidence: { closedTopology: true }
    })
  ],
  lineSegments: [
    { id: "upper-stair-left", sourceRegionId: upperRegionId, p1: { x: 400, y: 850 }, p2: { x: 400, y: 980 } },
    { id: "upper-stair-right", sourceRegionId: upperRegionId, p1: { x: 500, y: 850 }, p2: { x: 500, y: 980 } },
    { id: "upper-stair-landing", sourceRegionId: upperRegionId, p1: { x: 400, y: 960 }, p2: { x: 500, y: 960 } },
    { id: "upper-stair-direction", sourceRegionId: upperRegionId, p1: { x: 450, y: 860 }, p2: { x: 450, y: 950 } }
  ]
};

async function loadRecognitionModule() {
  if (!existsSync(recognitionGatePath)) return {};
  return import(pathToFileURL(recognitionGatePath).href);
}

test("production provides a PDF recognition gate before native conversion", () => {
  assert.equal(
    existsSync(recognitionGatePath),
    true,
    "pdf-recognition-gate.mjs must exist so a genuine File can be recognized before conversion"
  );
});

test("production recognition gate does not export or embed the canonical PDF fixture SHA", () => {
  const source = readFileSync(recognitionGatePath, "utf8");
  assert.doesNotMatch(source, /\bexport\s+const\s+CANONICAL_PDF_SHA256\b/);
  assert.equal(source.includes(exactSourceSha256), false);
});

test("recognition gate exports its browser-independent recognition API", async () => {
  const gate = await loadRecognitionModule();
  assert.equal(typeof gate.recognizePdfObjects, "function");
  assert.equal(typeof gate.approveRecognitionManifest, "function");
  assert.equal(typeof gate.canStartNativeConversion, "function");
  assert.equal(typeof gate.candidatesFromObjectizationScene, "function");
  assert.equal(typeof gate.createRecognitionOverlaySvg, "function");
  assert.equal(typeof gate.createStairOnlyRecognitionOverlaySvg, "function");
});

test("mixed PDF candidates receive explicit dispositions without losing source evidence", async () => {
  const gate = await loadRecognitionModule();
  assert.equal(typeof gate.recognizePdfObjects, "function", "recognizePdfObjects export is required");
  if (typeof gate.recognizePdfObjects !== "function") return;

  const manifest = gate.recognizePdfObjects(mixedFixture);
  const byId = new Map(manifest.objects.map((item) => [item.sourceId, item]));

  assert.equal(byId.get("wall-1").category, "native_wall_target");
  assert.equal(byId.get("door-1").category, "existing_door_candidate");
  assert.equal(byId.get("window-1").category, "existing_window_candidate");
  assert.equal(byId.get("opening-1").category, "generic_opening_candidate");
  assert.deepEqual(byId.get("door-1").hostRelation, mixedFixture.candidates[1].hostRelation);
  assert.deepEqual(byId.get("window-1").hostRelation, mixedFixture.candidates[2].hostRelation);
  assert.deepEqual(byId.get("opening-1").hostRelation, mixedFixture.candidates[3].hostRelation);

  const stair = byId.get("stair-1");
  assert.equal(stair.category, "locked_stair_line_group");
  assert.equal(stair.locked, true);
  assert.deepEqual(stair.sourceLineIds, mixedFixture.candidates[4].sourceLineIds);

  assert.equal(byId.get("bath-1").category, "excluded_bathroom_fixture");
  assert.equal(byId.get("bath-1").excluded, true);
  assert.equal(byId.get("cabinet-1").category, "excluded_fixed_cabinet");
  assert.equal(byId.get("cabinet-1").excluded, true);
  assert.equal(byId.get("column-1").category, "locked_structural_column");
  assert.equal(byId.get("column-1").locked, true);
  assert.equal(byId.get("dimension-1").category, "locked_dimension_annotation");
  assert.equal(byId.get("dimension-1").locked, true);
  assert.equal(byId.get("text-1").category, "locked_text_annotation");
  assert.equal(byId.get("text-1").locked, true);

  const unresolved = byId.get("unknown-1");
  assert.equal(unresolved.category, "unresolved_important");
  assert.equal(unresolved.retained, true);
  assert.deepEqual(unresolved.sourceLineIds, ["unknown-line-1"]);
  assert.deepEqual(unresolved.sourcePayload, { reason: "large enclosed source geometry" });
});

test("actual objectization scene arrays keep stable ids, geometry, line ids, and wall hosts", async () => {
  const gate = await loadRecognitionModule();
  const candidates = gate.candidatesFromObjectizationScene(actualObjectizationSceneFixture);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  assert.deepEqual(byId.get("src-wall-001").sourceGeometry, {
    p1: { x: 100, y: 106 },
    p2: { x: 300, y: 106 },
    thicknessPt: 12
  });
  assert.deepEqual(byId.get("src-wall-001").sourceLineIds, ["pdf-wall-line-001"]);
  assert.deepEqual(byId.get("src-wall-001").sourceBBox, [100, 100, 300, 112]);

  assert.equal(byId.get("src-door-001").kind, "door");
  assert.deepEqual(byId.get("src-door-001").sourceLineIds, [
    "pdf-door-leaf-001",
    "pdf-door-arc-001"
  ]);
  assert.deepEqual(byId.get("src-door-001").hostRelation, {
    relation: "interrupts_wall",
    hostSourceIds: ["src-wall-001"],
    status: "host_candidate_present"
  });
  assert.equal(byId.get("src-window-001").kind, "window");
  assert.equal(byId.get("src-opening-001").kind, "opening");

  const fixtureStairEvidence = actualObjectizationSceneFixture.stairCandidates[0].evidence;
  assert.deepEqual(
    byId.get("src-stair-001").sourceLineIds,
    fixtureStairEvidence.treadLineIds
  );
  assert.deepEqual(
    byId.get("src-stair-001").sourcePayload.treadLines,
    fixtureStairEvidence.treadLines.map((line) => ({
      id: line.id,
      p1: line.p1,
      p2: line.p2,
      coordinateFrame: line.coordinateFrame
    }))
  );
  const fixtureCompleteIds = [...new Set(
    fixtureStairEvidence.treadLineIds
      .concat(fixtureStairEvidence.boundaryLineIds)
      .concat(fixtureStairEvidence.landingLineIds)
      .concat(fixtureStairEvidence.markerLineIds)
  )].sort();
  assert.deepEqual(
    byId.get("src-stair-001").sourcePayload.completeLineIds,
    fixtureCompleteIds
  );
  assert.equal(
    byId.get("src-stair-001").sourcePayload.completeLines.length,
    fixtureCompleteIds.length
  );
  assert.deepEqual(byId.get("src-dimension-001").sourceGeometry, {
    p1: { x: 100, y: 61 },
    p2: { x: 300, y: 61 }
  });
  assert.equal(byId.get("src-text-001").sourceText, "300");
  assert.equal(byId.get("src-glyph-001").sourceText, "客廳");
});

test("actual objectization scene receives dispositions and starts in explicit review", async () => {
  const gate = await loadRecognitionModule();
  const manifest = gate.recognizePdfObjects(actualObjectizationSceneFixture);
  const byId = new Map(manifest.objects.map((object) => [object.sourceId, object]));

  assert.equal(manifest.source.fileSha256, exactSourceSha256);
  assert.equal(manifest.source.pageWidthPt, 842);
  assert.equal(manifest.source.pageHeightPt, 1191);
  assert.equal(manifest.recognition.status, "needs_review");
  assert.equal(manifest.recognition.reviewRequired, true);
  assert.equal(manifest.conversionGate.status, "blocked");
  assert.equal(gate.canStartNativeConversion(manifest), false);

  assert.equal(byId.get("src-wall-001").category, "native_wall_target");
  assert.equal(byId.get("src-door-001").category, "existing_door_candidate");
  assert.equal(byId.get("src-window-001").category, "existing_window_candidate");
  assert.equal(byId.get("src-opening-001").category, "generic_opening_candidate");
  assert.equal(byId.get("src-stair-001").category, "locked_stair_line_group");
  assert.equal(byId.get("src-bath-001").category, "excluded_bathroom_fixture");
  assert.equal(byId.get("src-cabinet-001").category, "excluded_fixed_cabinet");
  assert.equal(byId.get("src-column-001").category, "locked_structural_column");
  assert.equal(byId.get("src-dimension-001").category, "locked_dimension_annotation");
  assert.equal(byId.get("src-text-001").category, "locked_text_annotation");
  assert.equal(byId.get("src-glyph-001").category, "locked_text_annotation");
  assert.equal(byId.get("src-stair-void-001").category, "unresolved_important");
  assert.equal(byId.get("src-space-unknown-001").category, "unresolved_important");
  assert.deepEqual(manifest.recognition.unresolvedIds, [
    "src-space-unknown-001",
    "src-stair-void-001"
  ]);
});

test("stair recognition fails closed when a required role is missing or its ids do not match explicit operator geometry", async () => {
  const gate = await loadRecognitionModule();
  const missingMarker = structuredClone(actualObjectizationSceneFixture);
  const missingEvidence = missingMarker.stairCandidates[0].evidence;
  missingMarker.lineSegments.push(...missingEvidence.markerLines.map((line) => ({
    id: line.id,
    p1: line.p1,
    p2: line.p2
  })));
  missingEvidence.markerLines = [];
  const missingManifest = gate.recognizePdfObjects(missingMarker);
  const missingStair = missingManifest.objects.find(
    (object) => object.sourceId === "src-stair-001"
  );
  assert.equal(missingStair.category, "unresolved_important");
  assert.equal(missingStair.locked, true);
  assert.equal(missingStair.retained, true);
  assert.equal(missingStair.budgetExcluded, true);
  assert.equal(missingStair.formalOutput, false);
  assert.equal(missingStair.candidateOnly, true);
  assert.equal(missingStair.sourcePayload.requiredRolesComplete, false);
  assert.match(missingStair.sourcePayload.unresolvedReason, /missing_verified_stair_source_geometry/);
  assert.equal(missingManifest.conversionGate.status, "blocked");

  const mismatchedIds = structuredClone(actualObjectizationSceneFixture);
  mismatchedIds.stairCandidates[0].evidence.markerLineIds.push("marker-without-operator-geometry");
  const mismatchManifest = gate.recognizePdfObjects(mismatchedIds);
  const mismatchedStair = mismatchManifest.objects.find(
    (object) => object.sourceId === "src-stair-001"
  );
  assert.equal(mismatchedStair.category, "unresolved_important");
  assert.equal(mismatchedStair.sourcePayload.requiredRolesComplete, false);
  assert.equal(mismatchManifest.conversionGate.status, "blocked");
});

test("actual scene overlay draws source-coordinate boxes, wall lines, and stair treads", async () => {
  const gate = await loadRecognitionModule();
  const manifest = gate.recognizePdfObjects(actualObjectizationSceneFixture);
  const svg = gate.createRecognitionOverlaySvg(manifest);

  assert.match(svg, /辨識分類圖例/);
  assert.match(
    svg,
    /<line[^>]*x1="100"[^>]*y1="1085"[^>]*x2="300"[^>]*y2="1085"[^>]*stroke="#00C2FF"/
  );
  assert.match(
    svg,
    /<rect[^>]*x="180"[^>]*y="1053"[^>]*width="50"[^>]*height="50"[^>]*stroke="#21D07A"/
  );
  assert.match(
    svg,
    /<line[^>]*x1="410"[^>]*y1="976"[^>]*x2="490"[^>]*y2="976"[^>]*stroke="#B481FF"/
  );
  assert.match(
    svg,
    /<line[^>]*x1="400"[^>]*y1="991"[^>]*x2="400"[^>]*y2="871"[^>]*stroke="#B481FF"/
  );
  assert.match(svg, /#FF3E67/);
  assert.match(svg, /width="100%"/);
  assert.match(svg, /height="100%"/);
  assert.doesNotMatch(svg, /Recognition disposition legend/);
  assert.doesNotMatch(svg, /src[_-]/i);
  assert.doesNotMatch(svg, /pdf-(?:tread|stair|landing|wall|door|window)/i);
  assert.doesNotMatch(svg, /native_wall_target|locked_stair_line_group|unresolved_important/);
  assert.doesNotMatch(svg, /data-(?:category|source|region|line)/i);
});

test("canonical PDF 3F and RF stairs carry complete tread, boundary, landing, and verified marker geometry", async () => {
  const raw = await canonicalExtractorOutput();
  assert.equal(raw.stairCandidates.length, 2);
  raw.stairCandidates.forEach((stair) => {
    const evidence = stair.evidence || {};
    assert.ok(evidence.treadLineIds.length >= 5);
    assert.equal(evidence.treadLines.length, evidence.treadLineIds.length);
    assert.ok(evidence.boundaryLineIds.length >= 2);
    assert.equal(evidence.boundaryLines.length, evidence.boundaryLineIds.length);
    assert.deepEqual(
      [...evidence.completeCoverage.boundaryAxisCoverage].sort(),
      ["parallel_to_treads", "perpendicular_to_treads"].sort()
    );
    assert.ok(evidence.completeCoverage.boundaryFlightSideCoverage.length >= 2);
    assert.equal(
      evidence.completeCoverage.boundaryFlightSideCoverage.every(
        (coverage) =>
          coverage.sideCount >= 2 &&
          coverage.crossFlightEndCount >= 2
      ),
      true
    );
    assert.ok(evidence.completeCoverage.sharedBoundaryTreadLineCount >= 2);
    assert.ok(evidence.landingLineIds.length >= 1);
    assert.equal(evidence.landingLines.length, evidence.landingLineIds.length);
    assert.ok(evidence.landingLineId);
    assert.equal(evidence.landingLine.id, evidence.landingLineId);
    assert.ok(evidence.markerLineIds.length >= 4);
    assert.equal(evidence.markerLines.length, evidence.markerLineIds.length);
    const markerRelation = evidence.roleRelationEvidence.stairMarker;
    assert.ok(["direction_arrow", "stair_break"].includes(markerRelation.markerType));
    assert.deepEqual(
      [...new Set(markerRelation.motifs.flatMap((motif) => motif.lineIds))].sort(),
      [...evidence.markerLineIds].sort()
    );
    assert.deepEqual(evidence.requiredRoleStatus, {
      treads: "geometry_bound",
      boundaries: "geometry_bound",
      landing: "geometry_bound",
      stairMarker: "geometry_bound"
    });
    ["treadLines", "boundaryLines", "landingLines", "markerLines"].forEach((role) => {
      assert.equal(
        evidence[role].every((line) =>
          line.id && line.operatorLineId === line.id &&
          line.sourceEvidence === "pdf_operator_line_geometry"
        ),
        true
      );
    });
  });
  const [rfStair, thirdFloorStair] = raw.stairCandidates
    .slice()
    .sort((first, second) => first.bbox.y0 - second.bbox.y0);
  assert.equal(thirdFloorStair.evidence.treadLineIds.length, 16);
  assert.equal(thirdFloorStair.evidence.roleRelationEvidence.stairMarker.markerType, "stair_break");
  assert.deepEqual(thirdFloorStair.evidence.markerLineIds, [
    "pdf-line-0119",
    "pdf-line-0120",
    "pdf-line-0121",
    "pdf-line-0135",
    "pdf-line-0137",
    "pdf-line-0138",
    "pdf-line-0139",
    "pdf-line-0140",
    "pdf-line-0141",
    "pdf-line-0142",
    "pdf-line-0143",
    "pdf-line-0147",
    "pdf-line-0148",
    "pdf-line-0149",
    "pdf-line-0150"
  ]);
  const breakMotif = thirdFloorStair.evidence.roleRelationEvidence.stairMarker.motifs[0];
  assert.equal(breakMotif.markerType, "stair_break");
  assert.equal(breakMotif.headMotifs.length, 2);
  assert.equal(breakMotif.opposingHeads, true);
  assert.equal(breakMotif.coaxialShafts, true);
  assert.equal(breakMotif.connectedBreakPath, true);
  assert.deepEqual(breakMotif.flightBandIndexes, [0]);
  assert.equal(breakMotif.diagonalBreakLineIds.length, 5);
  assert.equal(rfStair.evidence.treadLineIds.length, 12);
  assert.equal(rfStair.evidence.roleRelationEvidence.stairMarker.markerType, "direction_arrow");
  assert.deepEqual(rfStair.evidence.markerLineIds, [
    "pdf-line-0358",
    "pdf-line-0379",
    "pdf-line-0380",
    "pdf-line-0381"
  ]);

  await import(`${pathToFileURL(adapterPath).href}?canonical-stair-roles=1`);
  const scene = await globalThis.LaibePdfPlanObjectizationAdapter.adaptExtractorOutput({
    raw,
    sourceSha256: exactSourceSha256,
    sourceName: "_qa_pdf_reference_3rf.pdf",
    pageNumber: 1,
    regions: [
      {
        sourceRegionId: lowerRegionId,
        boundsPt: { x0: 0, y0: 0, x1: 842, y1: 799.11 },
        semantic_status: "geometry_evidence_bound",
        floor_semantic: true
      },
      {
        sourceRegionId: upperRegionId,
        boundsPt: { x0: 0, y0: 799.11, x1: 842, y1: 1191 },
        semantic_status: "geometry_evidence_bound",
        floor_semantic: true
      }
    ]
  });
  const gate = await loadRecognitionModule();
  const initial = gate.recognizePdfObjects({
    ...scene,
    source: {
      fileSha256: exactSourceSha256,
      pageNumber: 1,
      pageWidthPt: 842,
      pageHeightPt: 1191
    }
  });
  [upperRegionId, lowerRegionId].forEach((regionId) => {
    const selected = gate.selectRecognitionRegion(initial, regionId);
    const lockedStairs = selected.objects.filter(
      (object) => object.category === "locked_stair_line_group"
    );
    assert.equal(lockedStairs.length, 1);
    const payload = lockedStairs[0].sourcePayload || {};
    const expectedIds = [...new Set(
      []
        .concat(payload.treadLineIds || [])
        .concat(payload.boundaryLineIds || [])
        .concat(payload.landingLineIds || [])
        .concat(payload.markerLineIds || [])
    )].sort();
    assert.deepEqual(payload.completeLineIds, expectedIds);
    assert.deepEqual(
      payload.completeLines.map((line) => line.id).sort(),
      expectedIds
    );
    assert.equal(payload.requiredRolesComplete, true);
    const stairOnlySvg = gate.createStairOnlyRecognitionOverlaySvg(selected);
    assert.equal(
      (stairOnlySvg.match(/<line\b/g) || []).length,
      payload.completeLineIds.length
    );
    assert.match(stairOnlySvg, /stroke="#B481FF"/);
    assert.doesNotMatch(stairOnlySvg, /#00C2FF|#C9254E|#FF3E67/);
    assert.doesNotMatch(stairOnlySvg, /<rect\b/);
    assert.doesNotMatch(stairOnlySvg, /pdf-line|src[_-]|data-(?:category|source|line)/i);
  });
});

test("canonical 3F bathroom symbols are each classified or retained for review with fixed-cabinet absence evidence", async () => {
  const raw = await canonicalExtractorOutput();
  const bathroomRows = raw.bathroomFixtureCandidates
    .map((item) => ({ subtype: item.subtype, bbox: item.bbox }))
    .sort((first, second) => first.subtype.localeCompare(second.subtype));
  assert.deepEqual(bathroomRows, [
    {
      subtype: "toilet",
      bbox: {
        x0: 530.7,
        y0: 804.64,
        x1: 554.1,
        y1: 841.32,
        width: 23.4,
        height: 36.68
      }
    },
    {
      subtype: "washbasin",
      bbox: {
        x0: 490.08,
        y0: 804.78,
        x1: 523.14,
        y1: 833.1,
        width: 33.06,
        height: 28.32
      }
    }
  ]);
  assert.equal(raw.fixedCabinetCandidates.length, 0);
  const crossedFrames = raw.unresolvedSymbolCandidates.filter(
    (item) => item.subtype === "crossed_frame_near_bathroom"
  );
  assert.equal(crossedFrames.length, 1);
  crossedFrames.forEach((item) => {
    assert.deepEqual(item.bbox, {
      x0: 572.04,
      y0: 808.32,
      x1: 597.06,
      y1: 817.74,
      width: 25.02,
      height: 9.42
    });
    assert.equal(item.evidence.closedFrame, true);
    assert.equal(item.evidence.opposingDiagonalCount >= 2, true);
    assert.deepEqual(item.evidence.diagonalLineIds, [
      "pdf-line-0207",
      "pdf-line-0208"
    ]);
    assert.deepEqual(item.evidence.frameLineIds, [
      "pdf-line-0205",
      "pdf-line-0206",
      "pdf-line-0214",
      "pdf-line-0215"
    ]);
    assert.deepEqual(item.evidence.coveredFrameSides, [
      "left",
      "right",
      "bottom",
      "top"
    ]);
    assert.equal(item.evidence.classification, "unresolved_requires_human_review");
  });
  const coverage = raw.semanticDetection.classificationCoverage;
  assert.equal(
    coverage.fixedCabinetEvaluation.status,
    "no_matching_fixed_cabinet_motif"
  );
  assert.equal(
    [coverage.fixedCabinetEvaluation.coverageBounds.x0,
      coverage.fixedCabinetEvaluation.coverageBounds.y0,
      coverage.fixedCabinetEvaluation.coverageBounds.x1,
      coverage.fixedCabinetEvaluation.coverageBounds.y1].every(Number.isFinite),
    true
  );
  assert.equal(
    coverage.visibleSymbolRows.length,
    raw.bathroomFixtureCandidates.length + crossedFrames.length
  );

  await import(`${pathToFileURL(adapterPath).href}?canonical-fixture-coverage=1`);
  const scene = await globalThis.LaibePdfPlanObjectizationAdapter.adaptExtractorOutput({
    raw,
    sourceSha256: exactSourceSha256,
    sourceName: "_qa_pdf_reference_3rf.pdf",
    pageNumber: 1,
    regions: [
      {
        sourceRegionId: lowerRegionId,
        boundsPt: { x0: 0, y0: 0, x1: 842, y1: 799.11 },
        semantic_status: "geometry_evidence_bound",
        floor_semantic: true
      },
      {
        sourceRegionId: upperRegionId,
        boundsPt: { x0: 0, y0: 799.11, x1: 842, y1: 1191 },
        semantic_status: "geometry_evidence_bound",
        floor_semantic: true
      }
    ]
  });
  const gate = await loadRecognitionModule();
  const selected = gate.selectRecognitionRegion(gate.recognizePdfObjects({
    ...scene,
    source: {
      fileSha256: exactSourceSha256,
      pageNumber: 1,
      pageWidthPt: 842,
      pageHeightPt: 1191
    }
  }), upperRegionId);
  assert.equal(
    selected.objects.filter((object) => object.category === "excluded_bathroom_fixture").length,
    2
  );
  assert.equal(
    selected.objects.filter((object) =>
      object.sourceCollection === "unresolvedSymbolCandidates" &&
      object.category === "unresolved_important"
    ).length,
    crossedFrames.length
  );
  assert.deepEqual(
    selected.classificationCoverage,
    scene.classificationCoverage
  );
  assert.equal(selected.conversionGate.status, "blocked");
});

test("recognition manifest blocks conversion until every important unknown is acknowledged", async () => {
  const gate = await loadRecognitionModule();
  assert.equal(typeof gate.recognizePdfObjects, "function", "recognizePdfObjects export is required");
  assert.equal(typeof gate.approveRecognitionManifest, "function", "approveRecognitionManifest export is required");
  assert.equal(typeof gate.canStartNativeConversion, "function", "canStartNativeConversion export is required");
  if (
    typeof gate.recognizePdfObjects !== "function" ||
    typeof gate.approveRecognitionManifest !== "function" ||
    typeof gate.canStartNativeConversion !== "function"
  ) return;

  const pending = gate.recognizePdfObjects(mixedFixture);
  assert.equal(pending.recognition.status, "needs_review");
  assert.equal(pending.conversionGate.status, "blocked");
  assert.equal(gate.canStartNativeConversion(pending), false);

  const passed = gate.approveRecognitionManifest(pending, {
    reviewerId: "pcm-reviewer",
    acknowledgedUnresolvedIds: ["unknown-1"]
  });
  assert.equal(passed.recognition.status, "passed");
  assert.equal(passed.conversionGate.status, "passed");
  assert.equal(gate.canStartNativeConversion(passed), false);
  assert.equal(gate.canStartNativeConversion(passed, {
    fileSha256: mixedFixture.source.fileSha256,
    pageNumber: mixedFixture.source.pageNumber,
    selectedRegionId: passed.selection.selectedRegionId
  }), false);
  assert.equal(gate.canStartNativeConversion(
    passed,
    await scaleBoundBinding({
      fileSha256: mixedFixture.source.fileSha256,
      pageNumber: mixedFixture.source.pageNumber,
      selectedRegionId: passed.selection.selectedRegionId
    })
  ), true);
  assert.deepEqual(passed.recognition.acknowledgedUnresolvedIds, ["unknown-1"]);
});

test("automatic candidate conservation authorizes without user pre-ack and locks every important unknown", async () => {
  const gate = await loadRecognitionModule();
  const selected = gate.selectRecognitionRegion(
    gate.recognizePdfObjects(canonicalTwoRegionSceneFixture),
    upperRegionId
  );
  const important = selected.objects.filter(
    (object) => object.category === "unresolved_important"
  );
  assert.equal(important.length > 0, true);
  important.forEach((object) => {
    assert.equal(object.locked, true);
    assert.equal(object.retained, true);
    assert.equal(object.budgetExcluded, true);
    assert.equal(object.formalOutput, false);
  });

  const approved = gate.approveRecognitionManifest(selected, {
    reviewerId: "automatic-recognition-gate",
    mode: "automatic_candidate_conservation",
    preserveUnresolvedAsLocked: true
  });
  const binding = await scaleBoundBinding({
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    selectedRegionId: upperRegionId
  });

  assert.equal(approved.recognition.status, "passed");
  assert.equal(approved.recognition.approvalMode, "automatic_candidate_conservation");
  assert.deepEqual(
    approved.recognition.acknowledgedUnresolvedIds,
    selected.recognition.unresolvedIds
  );
  assert.equal(gate.canStartNativeConversion(approved, binding), true);

  const forgedMode = structuredClone(approved);
  forgedMode.recognition.approvalMode = "explicit_acknowledgement";
  assert.equal(gate.canStartNativeConversion(forgedMode, binding), false);

  const unlockedCandidate = structuredClone(approved);
  const unlocked = unlockedCandidate.objects.find(
    (object) => object.category === "unresolved_important"
  );
  unlocked.locked = false;
  assert.equal(gate.canStartNativeConversion(unlockedCandidate, binding), false);
});

test("recognition manifest produces a human-inspectable SVG overlay and legend", async () => {
  const gate = await loadRecognitionModule();
  assert.equal(typeof gate.createRecognitionOverlaySvg, "function", "createRecognitionOverlaySvg export is required");
  if (typeof gate.createRecognitionOverlaySvg !== "function") return;
  const manifest = gate.recognizePdfObjects(mixedFixture);
  const svg = gate.createRecognitionOverlaySvg(manifest);

  assert.match(svg, /^<svg\b/);
  assert.match(svg, /辨識分類圖例/);
  assert.match(svg, /原生牆候選/);
  assert.match(svg, /鎖定樓梯線群/);
  assert.match(svg, /排除衛浴設備/);
  assert.match(svg, /重要待確認/);
  assert.doesNotMatch(svg, /native_wall_target|locked_stair_line_group|unresolved_important/);
  assert.doesNotMatch(svg, /unknown-1|data-(?:category|source|region|line)/i);
});

test("numbered review badges avoid collisions for tightly stacked source geometry", async () => {
  const gate = await loadRecognitionModule();
  const sourceRegionId = "page-1-plan";
  const manifest = gate.recognizePdfObjects({
    source: {
      fileSha256: exactSourceSha256,
      pageNumber: 1,
      pageWidthPt: 842,
      pageHeightPt: 1191
    },
    sourceRegions: [{
      sourceRegionId,
      boundsPt: { x0: 80, y0: 760, x1: 760, y1: 1160 },
      semantic_status: "geometry_evidence_bound",
      floor_semantic: true
    }],
    spaceBoundaryCandidates: Array.from({ length: 5 }, (unused, index) =>
      sourceItem(
        `stacked-review-${index + 1}`,
        sourceRegionId,
        [350, 820 + index * 2, 390, 900 + index * 2]
      )
    )
  });
  const svg = gate.createRecognitionOverlaySvg(manifest);
  const centers = [...svg.matchAll(
    /<circle cx="([-.\d]+)" cy="([-.\d]+)" r="9"/g
  )].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));

  assert.equal(centers.length, 5);
  centers.forEach((first, firstIndex) => {
    centers.slice(firstIndex + 1).forEach((second) => {
      assert.ok(
        Math.hypot(first.x - second.x, first.y - second.y) >= 20,
        "all numbered badges must remain individually visible"
      );
    });
  });
});

test("genuine PDF file route presents the selected File without semantic conversion", () => {
  const source = readFileSync(planPuzzlePath, "utf8");
  const start = source.indexOf("async function importSelectedR6Pdf(file");
  const end = source.indexOf("function r6SelectedRecord()", start);
  const route = source.slice(start, end);
  const presentationCall = route.indexOf(
    "api.presentSelectedPdfFile(file, { pageNumber: 1 })"
  );

  assert.notEqual(start, -1, "genuine selected File route must exist");
  assert.equal(/\bDataTransfer\b/.test(source), false, "genuine file route must not synthesize a DataTransfer");
  assert.notEqual(
    presentationCall,
    -1,
    "selected File must call presentSelectedPdfFile directly"
  );
  assert.match(route, /presentation\.selectedSha256/);
  assert.match(route, /presentation\.selectedPageNumber/);
  assert.match(route, /presentation\.referenceRaster/);
  assert.match(route, /presentationOnly:\s*true/);
  assert.match(route, /status:\s*"awaiting_a11_bundle_and_user_scale_confirmation"/);
  assert.match(route, /a11BundleId:\s*null/);
  assert.match(route, /userScaleConfirmationStatus:\s*"pending"/);
  assert.doesNotMatch(
    route,
    /recognizeSelectedPdfFile|importSelectedPdfFile|recognizePdfObjects|canStartNativeConversion|approveRecognitionManifest|createScaleDecisionFromRecognitionReceipt|r7TryAutomaticDimensionScale|importPdfObjectizationScene/,
    "source presentation must not perform semantic recognition, automatic gating, or native conversion"
  );
});

test("recognition review dialog is exempt from the path-workbench root hiding rule", () => {
  const source = readFileSync(planPuzzlePath, "utf8");
  const html = readFileSync(planPuzzleHtmlPath, "utf8");
  const reviewFunctionStart = source.indexOf("function showPdfRecognitionOverlay(receipt)");
  const reviewFunctionEnd = source.indexOf(
    "async function importSelectedR6Pdf",
    reviewFunctionStart
  );
  const reviewSource = source.slice(reviewFunctionStart, reviewFunctionEnd);

  assert.notEqual(reviewFunctionStart, -1, "recognition review UI must exist");
  assert.match(reviewSource, /document\.createElement\("div"\)/);
  assert.doesNotMatch(reviewSource, /document\.createElement\("section"\)/);
  assert.match(reviewSource, /display:grid/);
  assert.match(
    html,
    /body\.path-workbench\s*>\s*:not\(#planPuzzleCleanShell\):not\(#laibeCalPrompt\):not\(#laibe-pdf-recognition-review\):not\(script\)/
  );
});

test("two-plan canonical page starts without a selected region and scopes the upper plan explicitly", async () => {
  const gate = await loadRecognitionModule();
  assert.equal(typeof gate.selectRecognitionRegion, "function");
  assert.equal(typeof gate.scopeObjectizationSceneToRegion, "function");

  const initial = gate.recognizePdfObjects(canonicalTwoRegionSceneFixture);
  assert.equal(initial.selection.selectedRegionId, null);
  assert.equal(initial.selection.selectedRegionLabel, null);
  assert.deepEqual(initial.objects, []);
  assert.deepEqual(initial.counts, {});
  assert.deepEqual(
    initial.selection.regions.map((region) => region.publicLabel),
    ["上方平面圖", "下方平面圖"]
  );
  assert.equal(initial.selection.consolidation.inputRegionCount, 4);
  assert.equal(initial.selection.consolidation.mainPlanRegionCount, 2);
  assert.deepEqual(
    initial.selection.consolidation.ignoredRegions.map((region) => region.reason).sort(),
    ["page_reference_not_selectable", "unassigned_content_attached_to_nearest_plan"]
  );
  assert.deepEqual(
    initial.selection.regions.map((region) => region.orientation.recommendedRotationDegrees),
    [0, 0]
  );
  assert.equal(
    initial.selection.regions.every((region) => region.orientation.source === "geometry_cluster_crop"),
    true
  );

  const selected = gate.selectRecognitionRegion(initial, upperRegionId);
  assert.equal(selected.selection.selectedRegionId, upperRegionId);
  assert.equal(selected.selection.selectedRegionLabel, "上方平面圖");
  assert.deepEqual(selected.counts, {
    native_wall_target: 58,
    existing_door_candidate: 3,
    existing_window_candidate: 5,
    locked_stair_line_group: 1,
    excluded_bathroom_fixture: 2,
    locked_structural_column: 9,
    locked_dimension_annotation: 2,
    locked_text_annotation: 2,
    unresolved_important: 5
  });
  assert.equal(selected.objects.length, 87);
  assert.equal(selected.recognition.unresolvedIds.length, 5);
  assert.equal(selected.recognition.acknowledgedUnresolvedIds.length, 0);
  assert.equal(selected.conversionGate.status, "blocked");
  const upperPreview = selected.selection.regions.find(
    (region) => region.sourceRegionId === upperRegionId
  );
  assert.equal(upperPreview.previewCropEvidence.source, "selected_region_object_geometry_union");
  assert.equal(upperPreview.previewCropEvidence.allSelectedObjectsContained, true);
  assert.equal(upperPreview.previewCropEvidence.selectedObjectCount, 87);
  assert.ok(upperPreview.previewCropEvidence.requestedPaddingPt >= 12);
  assert.ok(
    upperPreview.previewBoundsPt.y0 < 800,
    "padding must extend past a tight geometry-cluster edge"
  );
  assert.ok(
    upperPreview.previewBoundsPt.y0 > 600,
    "upper preview must not mix lower-plan objects"
  );
  assert.equal(
    upperPreview.previewCropEvidence.adjacentRegionExclusion.axis,
    "y"
  );
  const selectedSvg = gate.createRecognitionOverlaySvg(selected);
  assert.match(selectedSvg, new RegExp(
    `viewBox="${upperPreview.previewBoundsPt.x0} ${1191 - upperPreview.previewBoundsPt.y1} ` +
    `${upperPreview.previewBoundsPt.x1 - upperPreview.previewBoundsPt.x0} ` +
    `${upperPreview.previewBoundsPt.y1 - upperPreview.previewBoundsPt.y0}"`
  ));
  assert.doesNotMatch(selectedSvg, /rotate\(/);
  ["1", "2", "3", "4", "5"].forEach((number) => {
    assert.match(selectedSvg, new RegExp(`>${number}<\\/text>`));
  });
  const badgeCenters = [...selectedSvg.matchAll(
    /<circle cx="([-.\d]+)" cy="([-.\d]+)" r="9"/g
  )].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  assert.equal(badgeCenters.length, 5);
  badgeCenters.forEach((first, firstIndex) => {
    badgeCenters.slice(firstIndex + 1).forEach((second) => {
      assert.ok(
        Math.hypot(first.x - second.x, first.y - second.y) >= 20,
        "numbered review badges must not overlap"
      );
    });
  });
  assert.doesNotMatch(selectedSvg, /dimension-cluster|sourceRegionId|orientationEvidence/);

  const scopedScene = gate.scopeObjectizationSceneToRegion(
    canonicalTwoRegionSceneFixture,
    upperRegionId
  );
  assert.equal(scopedScene.structuralWalls.length, 58);
  assert.equal(scopedScene.openingCandidates.length, 8);
  assert.equal(scopedScene.spaceBoundaryCandidates.length, 5);
  assert.equal(
    [
      "structuralWalls",
      "openingCandidates",
      "stairCandidates",
      "bathroomFixtureCandidates",
      "columns",
      "dimensionLines",
      "decodedTextRuns",
      "spaceBoundaryCandidates",
      "lineSegments"
    ].every((key) => scopedScene[key].every((item) => item.sourceRegionId === upperRegionId)),
    true
  );
});

test("page-reference and unassigned annotation fragments attach to the nearest main plan instead of becoming choices", async () => {
  const gate = await loadRecognitionModule();
  const scene = {
    source: canonicalTwoRegionSceneFixture.source,
    sourceRegions: canonicalTwoRegionSceneFixture.sourceRegions,
    structuralWalls: [
      sourceItem("upper-main-wall", upperRegionId, [100, 900, 400, 910], {
        sourcePathIds: ["upper-main-wall-line"],
        p1: { x: 100, y: 905 },
        p2: { x: 400, y: 905 },
        width: 10
      }),
      sourceItem("lower-main-wall", lowerRegionId, [100, 300, 400, 310], {
        sourcePathIds: ["lower-main-wall-line"],
        p1: { x: 100, y: 305 },
        p2: { x: 400, y: 305 },
        width: 10
      })
    ],
    decodedTextRuns: [
      sourceItem("upper-title-fragment", "page-1-full", [620, 1010, 680, 1030], {
        rawLabel: "圖名",
        rotationDegrees: 90
      }),
      sourceItem("lower-note-fragment", "page-1-unassigned", [620, 180, 690, 200], {
        rawLabel: "備註",
        rotationDegrees: 90
      })
    ]
  };
  const initial = gate.recognizePdfObjects(scene);
  assert.deepEqual(initial.selection.regions.map((region) => region.publicLabel), [
    "上方平面圖",
    "下方平面圖"
  ]);
  assert.equal(
    initial.allObjects.some((object) =>
      ["page-1-full", "page-1-unassigned"].includes(object.sourceRegionId)
    ),
    false
  );
  const upperFragment = initial.allObjects.find((object) => object.sourceId === "upper-title-fragment");
  const lowerFragment = initial.allObjects.find((object) => object.sourceId === "lower-note-fragment");
  assert.equal(upperFragment.sourceRegionId, upperRegionId);
  assert.equal(lowerFragment.sourceRegionId, lowerRegionId);
  assert.equal(upperFragment.sourceRegionAssignment.reason, "nearest_main_plan_region");
  assert.equal(lowerFragment.sourceRegionAssignment.reason, "nearest_main_plan_region");
  assert.equal(initial.selection.consolidation.attachedFragmentCount, 2);
});

test("gate recomputes review truth and rejects forged, missing, unrelated, or tampered approval", async () => {
  const gate = await loadRecognitionModule();
  const initial = gate.recognizePdfObjects(canonicalTwoRegionSceneFixture);
  const selected = gate.selectRecognitionRegion(initial, upperRegionId);
  const unresolvedIds = [...selected.recognition.unresolvedIds];
  const binding = await scaleBoundBinding({
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    selectedRegionId: upperRegionId
  });
  const approved = gate.approveRecognitionManifest(selected, {
    reviewerId: "pcm-reviewer",
    acknowledgedUnresolvedIds: unresolvedIds
  });
  assert.equal(gate.canStartNativeConversion(approved, binding), true);

  const forgedFlags = structuredClone(selected);
  forgedFlags.recognition.status = "passed";
  forgedFlags.recognition.reviewerId = "pcm-reviewer";
  forgedFlags.conversionGate.status = "passed";
  assert.equal(gate.canStartNativeConversion(forgedFlags, binding), false);

  const missingReviewer = gate.approveRecognitionManifest(selected, {
    acknowledgedUnresolvedIds: unresolvedIds
  });
  assert.equal(gate.canStartNativeConversion(missingReviewer, binding), false);

  const missingAck = gate.approveRecognitionManifest(selected, {
    reviewerId: "pcm-reviewer",
    acknowledgedUnresolvedIds: unresolvedIds.slice(1)
  });
  assert.equal(gate.canStartNativeConversion(missingAck, binding), false);

  const unrelatedAck = gate.approveRecognitionManifest(selected, {
    reviewerId: "pcm-reviewer",
    acknowledgedUnresolvedIds: unresolvedIds.concat("unrelated-source")
  });
  assert.equal(gate.canStartNativeConversion(unrelatedAck, binding), false);

  const tampered = structuredClone(approved);
  tampered.objects[0].category = "unresolved_important";
  tampered.recognition.unresolvedIds = [tampered.objects[0].sourceId, ...unresolvedIds].sort();
  tampered.recognition.acknowledgedUnresolvedIds = [...tampered.recognition.unresolvedIds];
  assert.equal(gate.canStartNativeConversion(tampered, binding), false);

  const missingObject = structuredClone(approved);
  missingObject.objects.pop();
  assert.equal(gate.canStartNativeConversion(missingObject, binding), false);

  const tamperedPreviewBounds = structuredClone(approved);
  const tamperedSelectedRegion = tamperedPreviewBounds.selection.regions.find(
    (region) => region.sourceRegionId === upperRegionId
  );
  tamperedSelectedRegion.previewBoundsPt.x0 += 5;
  assert.equal(gate.canStartNativeConversion(tamperedPreviewBounds, binding), false);

  const tamperedNumberMapping = structuredClone(approved);
  tamperedNumberMapping.recognition.unresolvedIds.reverse();
  assert.equal(gate.canStartNativeConversion(tamperedNumberMapping, binding), false);
});

test("native conversion binding rejects cross-file, cross-page, and cross-region requests after rehash", async () => {
  const gate = await loadRecognitionModule();
  const selected = gate.selectRecognitionRegion(
    gate.recognizePdfObjects(canonicalTwoRegionSceneFixture),
    upperRegionId
  );
  const approved = gate.approveRecognitionManifest(selected, {
    reviewerId: "pcm-reviewer",
    acknowledgedUnresolvedIds: selected.recognition.unresolvedIds
  });
  const correct = await scaleBoundBinding({
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    selectedRegionId: upperRegionId
  });
  assert.equal(gate.canStartNativeConversion(approved, correct), true);
  assert.equal(gate.canStartNativeConversion(approved, {
    ...correct,
    fileSha256: "A".repeat(64)
  }), false);
  assert.equal(gate.canStartNativeConversion(approved, {
    ...correct,
    pageNumber: 2
  }), false);
  assert.equal(gate.canStartNativeConversion(approved, {
    ...correct,
    selectedRegionId: lowerRegionId
  }), false);
});

test("automatic scale authorization rejects failed audits, low confidence, hash drift, and source drift", async () => {
  const gate = await loadRecognitionModule();
  const selected = gate.selectRecognitionRegion(
    gate.recognizePdfObjects(canonicalTwoRegionSceneFixture),
    upperRegionId
  );
  const approved = gate.approveRecognitionManifest(selected, {
    reviewerId: "system-recognition-gate",
    acknowledgedUnresolvedIds: selected.recognition.unresolvedIds
  });
  const valid = await scaleBoundBinding({
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    selectedRegionId: upperRegionId
  });

  assert.equal(gate.canStartNativeConversion(approved, valid), true);
  assert.equal(gate.canStartNativeConversion(approved, {
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    selectedRegionId: upperRegionId
  }), false);

  for (const mutate of [
    (decision) => { decision.status = "rejected"; },
    (decision) => { decision.confidence = 0.979999; },
    (decision) => { decision.audit.pass = false; },
    (decision) => { decision.audit.consistencyErrorPct = 1.01; },
    (decision) => { decision.audit.competingScaleClusterCount = 1; },
    (decision) => { decision.selectedRegionId = lowerRegionId; }
  ]) {
    const scaleDecision = structuredClone(valid.scaleDecision);
    mutate(scaleDecision);
    assert.equal(gate.canStartNativeConversion(approved, {
      ...valid,
      scaleDecision,
      scaleDecisionHash: await stableScaleDecisionHash(scaleDecision)
    }), false);
  }

  assert.equal(gate.canStartNativeConversion(approved, {
    ...valid,
    scaleDecisionHash: "0".repeat(64)
  }), false);
  assert.equal(gate.canStartNativeConversion(approved, {
    ...valid,
    sourcePdfSha256: "A".repeat(64)
  }), false);

  const productionScaleSources = [
    readFileSync(recognitionGatePath, "utf8"),
    readFileSync(exactSourceRuntimePath, "utf8"),
    readFileSync(adapterPath, "utf8"),
    readFileSync(path.join(
      repoRoot,
      "site",
      "preview_floor_plan",
      "pdf-dimension-scale-decision.mjs"
    ), "utf8")
  ].join("\n");
  assert.doesNotMatch(productionScaleSources, /\b6500\b|\b5250\b/);
});

test("bottom importer contract rejects missing or forged authorization before any mutation path", async () => {
  const gate = await loadRecognitionModule();
  assert.equal(typeof gate.validateNativeConversionRequest, "function");
  const selected = gate.selectRecognitionRegion(
    gate.recognizePdfObjects(canonicalTwoRegionSceneFixture),
    upperRegionId
  );
  const approved = gate.approveRecognitionManifest(selected, {
    reviewerId: "pcm-reviewer",
    acknowledgedUnresolvedIds: selected.recognition.unresolvedIds
  });
  const scopedScene = gate.scopeObjectizationSceneToRegion(
    canonicalTwoRegionSceneFixture,
    upperRegionId
  );
  const binding = await scaleBoundBinding({
    fileSha256: exactSourceSha256,
    pageNumber: 1,
    selectedRegionId: upperRegionId
  });

  assert.equal(gate.validateNativeConversionRequest({
    scene: scopedScene,
    manifest: approved,
    binding
  }).ok, true);
  assert.equal(gate.validateNativeConversionRequest({
    scene: scopedScene,
    manifest: null,
    binding
  }).ok, false);
  assert.equal(gate.validateNativeConversionRequest({
    scene: canonicalTwoRegionSceneFixture,
    manifest: approved,
    binding
  }).ok, false);
  assert.equal(gate.validateNativeConversionRequest({
    scene: scopedScene,
    manifest: {
      ...approved,
      recognition: { ...approved.recognition, status: "passed", reviewerId: null }
    },
    binding
  }).ok, false);

  const planSource = readFileSync(planPuzzlePath, "utf8");
  const importerStart = planSource.indexOf("function importPdfObjectizationScene(scene, options = {})");
  const firstMutation = planSource.indexOf("const now = new Date().toISOString()", importerStart);
  const validationCall = planSource.indexOf("validatePdfRecognitionImport", importerStart);
  assert.notEqual(validationCall, -1);
  assert.ok(validationCall < firstMutation, "authorization must fail closed before mutation setup");
});

test("runtime rehashes selected bytes, fails closed on mismatch, and returns presentation only", () => {
  const source = readFileSync(exactSourceRuntimePath, "utf8");
  const start = source.indexOf("export async function presentSelectedPdfFile(file, options = {})");
  const end = source.indexOf("function a11BundleRequiredError", start);
  const route = source.slice(start, end);
  const selectedBytes = route.indexOf("await file.arrayBuffer()");
  const selectedHash = route.indexOf("await sha256Hex(selectedBytes)");
  const mismatchCheck = route.indexOf("selectedSha256 !== expectedSha256");
  const mismatchThrow = route.indexOf(
    'throw new Error("PDF source SHA-256 mismatch.")'
  );
  const pdfParse = route.indexOf("pdfjsLib.getDocument({ data: selectedBytes })");

  assert.notEqual(start, -1, "selected File presentation API must exist");
  assert.notEqual(selectedBytes, -1, "selected bytes must come from the genuine File");
  assert.notEqual(selectedHash, -1, "selected bytes must be SHA-256 hashed");
  assert.notEqual(mismatchCheck, -1, "expected source SHA must be checked exactly");
  assert.notEqual(mismatchThrow, -1, "SHA mismatch must fail closed");
  assert.notEqual(pdfParse, -1, "matching bytes may proceed to PDF presentation");
  assert.ok(
    selectedBytes < selectedHash &&
      selectedHash < mismatchCheck &&
      mismatchCheck < mismatchThrow &&
      mismatchThrow < pdfParse,
    "SHA mismatch must fail before PDF parsing or presentation"
  );
  assert.match(route, /status:\s*"source_presentation_ready"/);
  assert.match(route, /selectedSha256,/);
  assert.match(route, /selectedPageNumber,/);
  assert.match(route, /referenceRaster,/);
  assert.match(route, /sourceDocumentSha256:\s*selectedSha256/);
  assert.match(route, /pageNumber:\s*selectedPageNumber/);
  assert.doesNotMatch(
    route,
    /recognizePdfObjects|canStartNativeConversion|scopeObjectizationSceneToRegion|importPdfObjectizationScene/,
    "presentation API must not create semantic or native conversion output"
  );
  assert.match(
    source,
    /async function recognizeSelectedPdfFile\(\)\s*\{\s*throw a11BundleRequiredError\("recognizeSelectedPdfFile"\);\s*\}/
  );
  assert.match(
    source,
    /async function importSelectedPdfFile\(\)\s*\{\s*throw a11BundleRequiredError\("importSelectedPdfFile"\);\s*\}/
  );
});

function createRecognitionReviewBehaviorRuntime(initialManifest) {
  let runtime;
  const calls = {
    selectedRegionIds: [],
    imports: []
  };
  const recognitionApi = {
    selectRecognitionRegion(manifest, sourceRegionId) {
      calls.selectedRegionIds.push(sourceRegionId);
      const region = manifest.selection.regions.find(
        (candidate) => candidate.sourceRegionId === sourceRegionId
      );
      return {
        ...structuredClone(manifest),
        selection: {
          ...structuredClone(manifest.selection),
          selectedRegionId: sourceRegionId,
          selectedRegionLabel: region?.publicLabel || region?.label || sourceRegionId
        }
      };
    },
    createRecognitionOverlaySvg() {
      return "<svg></svg>";
    },
    createScaleDecisionFromRecognitionReceipt(_receipt, manifest) {
      return acceptedScaleDecision(manifest.selection.selectedRegionId);
    },
    approveRecognitionManifest(manifest) {
      return {
        ...structuredClone(manifest),
        conversionGate: { status: "passed" }
      };
    },
    async __testCompletePendingPdfRecognitionImport(manifest, scaleDecision) {
      calls.imports.push({
        selectedRegionId: manifest.selection.selectedRegionId,
        scaleDecision
      });
      return true;
    },
    __testPrepareRecognitionShell(shell) {
      const create = (tagName, attributeName) => {
        const element = runtime.document.createElement(tagName);
        if (attributeName) element.setAttribute(attributeName, "");
        shell.appendChild(element);
        return element;
      };
      create("button", "data-recognition-close");
      const selectionPanel = create("div", "data-recognition-selection-panel");
      selectionPanel.hidden = /data-recognition-selection-panel\s+hidden/.test(shell.innerHTML);
      const sourceImage = create("img", "data-recognition-source");
      sourceImage.complete = true;
      sourceImage.naturalWidth = 1200;
      sourceImage.naturalHeight = 800;
      create("canvas", "data-recognition-preview");
      create("div", "data-recognition-overlay");
      const regionNode = create("div", "data-recognition-regions");
      create("div", "data-recognition-selection-note");
      create("div", "data-recognition-scale-state");

      let regionMarkup = "";
      Object.defineProperty(regionNode, "innerHTML", {
        configurable: true,
        get() {
          return regionMarkup;
        },
        set(value) {
          regionMarkup = String(value || "");
          this.replaceChildren();
          const pattern = /<button[^>]*data-recognition-region-choice="(\d+)"[^>]*aria-pressed="([^"]+)"[^>]*>[\s\S]*?<canvas[^>]*data-recognition-region-thumbnail="\1"[^>]*width="(\d+)"[^>]*height="(\d+)"/g;
          let match;
          while ((match = pattern.exec(regionMarkup))) {
            const button = runtime.document.createElement("button");
            button.setAttribute("data-recognition-region-choice", match[1]);
            button.setAttribute("aria-pressed", match[2]);
            const canvas = runtime.document.createElement("canvas");
            canvas.setAttribute("data-recognition-region-thumbnail", match[1]);
            canvas.width = Number(match[3]);
            canvas.height = Number(match[4]);
            canvas.drawImageCalls = [];
            canvas.getContext = () => ({
              fillStyle: "",
              fillRect() {},
              drawImage(...args) {
                canvas.drawImageCalls.push(args);
              }
            });
            button.appendChild(canvas);
            this.appendChild(button);
          }
        }
      });
    }
  };
  const replaceOnce = (source, needle, replacement) => {
    const index = source.indexOf(needle);
    assert.notEqual(index, -1, `Missing behavior-test seam: ${needle.slice(0, 60)}`);
    return `${source.slice(0, index)}${replacement}${source.slice(index + needle.length)}`;
  };
  runtime = createPlanPuzzleRuntime(planPuzzlePath, {
    recognitionApi,
    transformPlanPuzzleSource(source) {
      let transformed = replaceOnce(
        source,
        '    const sourceImage = shell.querySelector("[data-recognition-source]");',
        '    if (api && typeof api.__testPrepareRecognitionShell === "function") api.__testPrepareRecognitionShell(shell);\n' +
          '    const sourceImage = shell.querySelector("[data-recognition-source]");'
      );
      transformed = replaceOnce(
        transformed,
        "      const imported = await completePendingPdfRecognitionImport(approvedManifest, scaleDecision);",
        "      const imported = api && typeof api.__testCompletePendingPdfRecognitionImport === \"function\"\n" +
          "        ? await api.__testCompletePendingPdfRecognitionImport(approvedManifest, scaleDecision)\n" +
          "        : await completePendingPdfRecognitionImport(approvedManifest, scaleDecision);"
      );
      transformed = replaceOnce(
        transformed,
        "  async function completePendingPdfRecognitionImport(approvedManifest, scaleDecision) {",
        "  window.__testShowPdfRecognitionOverlay = showPdfRecognitionOverlay;\n\n" +
          "  async function completePendingPdfRecognitionImport(approvedManifest, scaleDecision) {"
      );
      return transformed;
    }
  });
  return {
    runtime,
    calls,
    show() {
      runtime.window.__testShowPdfRecognitionOverlay({
        manifest: structuredClone(initialManifest),
        overlaySvg: "<svg></svg>",
        referenceRaster: {
          dataUrl: "data:image/png;base64,AA=="
        }
      });
      return runtime.document.body.children.find(
        (element) => element.id === "laibe-pdf-recognition-review"
      );
    }
  };
}

async function waitForBehaviorCount(readCount, expected, label) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (readCount() === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(readCount(), expected, label);
}

test("PDF recognition review executes single-plan direct import and distinct multi-plan thumbnails", async () => {
  const source = {
    pageWidthPt: 1200,
    pageHeightPt: 800
  };
  const singleManifest = {
    source,
    selection: {
      regions: [{
        sourceRegionId: "single-plan",
        publicLabel: "單一平面圖",
        previewBoundsPt: { x0: 0, y0: 0, x1: 1200, y1: 800 }
      }],
      selectedRegionId: "single-plan",
      selectedRegionLabel: "單一平面圖"
    }
  };
  const single = createRecognitionReviewBehaviorRuntime(singleManifest);
  const singleShell = single.show();
  assert.ok(singleShell);
  assert.equal(
    singleShell.querySelector("[data-recognition-selection-panel]").hidden,
    true
  );
  assert.equal(
    singleShell.querySelectorAll("[data-recognition-region-choice]").length,
    0
  );
  assert.equal(single.calls.imports.length, 0);
  single.runtime.runPendingTimers();
  await waitForBehaviorCount(
    () => single.calls.imports.length,
    1,
    "single-plan automatic import count"
  );
  assert.equal(single.calls.imports[0].selectedRegionId, "single-plan");

  const multiManifest = {
    source,
    selection: {
      regions: [
        {
          sourceRegionId: "multi-upper",
          publicLabel: "上方平面圖",
          previewBoundsPt: { x0: 0, y0: 400, x1: 600, y1: 800 }
        },
        {
          sourceRegionId: "multi-lower",
          publicLabel: "下方平面圖",
          previewBoundsPt: { x0: 600, y0: 0, x1: 1200, y1: 400 }
        }
      ],
      selectedRegionId: null,
      selectedRegionLabel: null
    }
  };
  const multi = createRecognitionReviewBehaviorRuntime(multiManifest);
  const multiShell = multi.show();
  assert.ok(multiShell);
  assert.equal(
    multiShell.querySelector("[data-recognition-selection-panel]").hidden,
    false
  );
  const choices = multiShell.querySelectorAll("[data-recognition-region-choice]");
  assert.equal(choices.length, 2);
  assert.equal(multi.calls.imports.length, 0);
  const thumbnails = multiShell.querySelectorAll("[data-recognition-region-thumbnail]");
  assert.equal(thumbnails.length, 2);
  assert.equal(thumbnails[0].drawImageCalls.length, 1);
  assert.equal(thumbnails[1].drawImageCalls.length, 1);
  assert.deepEqual(
    thumbnails[0].drawImageCalls[0].slice(1, 5),
    [0, 0, 600, 400]
  );
  assert.deepEqual(
    thumbnails[1].drawImageCalls[0].slice(1, 5),
    [600, 400, 600, 400]
  );
  assert.notDeepEqual(
    thumbnails[0].drawImageCalls[0].slice(1, 5),
    thumbnails[1].drawImageCalls[0].slice(1, 5)
  );
  choices[1].click();
  await waitForBehaviorCount(
    () => multi.calls.imports.length,
    1,
    "multi-plan import count after selection"
  );
  assert.deepEqual(multi.calls.selectedRegionIds, ["multi-lower"]);
  assert.equal(multi.calls.imports[0].selectedRegionId, "multi-lower");
});

test("novice PDF review keeps only plan selection and rejects manual scale or pre-ack controls", () => {
  const source = readFileSync(planPuzzlePath, "utf8");
  const start = source.indexOf("function showPdfRecognitionOverlay(receipt)");
  const end = source.indexOf("async function importSelectedR6Pdf", start);
  const reviewSource = source.slice(start, end);

  assert.match(reviewSource, /data-recognition-region-choice/);
  assert.match(reviewSource, /requiresPlanSelection/);
  assert.match(reviewSource, /data-recognition-selection-panel/);
  assert.match(reviewSource, /data-recognition-region-thumbnail/);
  assert.match(reviewSource, /renderRecognitionRegionThumbnails/);
  assert.match(reviewSource, /selectRecognitionRegion/);
  assert.match(reviewSource, /createRecognitionOverlaySvg|overlaySvg/);
  assert.match(reviewSource, /renderSelectedRecognitionPreview/);
  assert.match(reviewSource, /drawImage/);
  assert.match(reviewSource, /recommendedRotationDegrees/);
  assert.match(reviewSource, /previewBoundsPt/);
  assert.match(reviewSource, /createScaleDecisionFromRecognitionReceipt/);
  assert.match(reviewSource, /beginAutomaticImport/);
  assert.match(reviewSource, /automatic_candidate_conservation/);
  assert.match(reviewSource, /系統正在依尺寸標註確認比例/);
  assert.doesNotMatch(reviewSource, /humanRecognitionPositionLabel|humanRecognitionTypeLabel/);
  for (const selector of autoScaleUiRejections.forbiddenSelectors) {
    assert.doesNotMatch(reviewSource, new RegExp(
      selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ));
  }
  for (const copy of autoScaleUiRejections.forbiddenUserCopy) {
    assert.doesNotMatch(reviewSource, new RegExp(
      copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ));
  }
  assert.match(reviewSource, new RegExp(
    autoScaleUiRejections.requiredRejectedMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ));
  assert.doesNotMatch(reviewSource, /由\s*PCM\s*核對|PCM\s*確認|工程|debug|mock/i);
  assert.doesNotMatch(reviewSource, /data-[^=]*(?:sourceRegionId|selectedRegionId)/);
  assert.doesNotMatch(reviewSource, /dimension-cluster|native_wall_target|unresolved_important/);
});

test("extractor-shaped fixed cabinet motif has a detector route and stays excluded", async () => {
  await import(`${pathToFileURL(extractorPath).href}?fixed-cabinet-red=1`);
  const extractor = globalThis.LaibePdfPlanVectorExtractor;
  assert.equal(typeof extractor.semanticDetectorPredicates.fixedCabinet, "function");
  assert.deepEqual(extractor.semanticDetectorPredicates.fixedCabinet({
    parallelEdgeCount: 4,
    closedRectCount: 2,
    widthPt: 96,
    depthPt: 24,
    hostWallContact: true,
    bathroomOverlap: false
  }), {
    pass: true,
    reason: "fixed_cabinet_geometry_motif"
  });
});

test("fixed cabinet detector accepts wall-contact geometry and rejects bathroom overlap or non-cabinet proportions", async () => {
  await import(`${pathToFileURL(extractorPath).href}?fixed-cabinet-primitives-red=1`);
  const extractor = globalThis.LaibePdfPlanVectorExtractor;
  assert.equal(typeof extractor.detectFixedCabinetCandidates, "function");

  const motif = {
    rects: [
      {
        id: "outer",
        pageBox: { x0: 100, y0: 112, x1: 196, y1: 136, width: 96, height: 24 },
        widthPdf: 96,
        heightPdf: 24
      },
      {
        id: "inner",
        pageBox: { x0: 104, y0: 116, x1: 192, y1: 132, width: 88, height: 16 },
        widthPdf: 88,
        heightPdf: 16
      }
    ],
    lines: [
      {
        id: "cabinet-top",
        orientation: "horizontal",
        pageFrom: { x: 100, y: 136 },
        pageTo: { x: 196, y: 136 },
        lengthPdf: 96
      },
      {
        id: "cabinet-bottom",
        orientation: "horizontal",
        pageFrom: { x: 100, y: 112 },
        pageTo: { x: 196, y: 112 },
        lengthPdf: 96
      }
    ],
    walls: [
      {
        id: "host-wall",
        pageFrom: { x: 50, y: 106 },
        pageTo: { x: 250, y: 106 },
        width: 12,
        lineWidthPdf: 12
      }
    ],
    bathroomFixtureCandidates: [],
    wallThicknessPx: 12
  };
  const accepted = extractor.detectFixedCabinetCandidates(motif);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].subtype, "wall_fixed_cabinet");
  assert.equal(accepted[0].evidence.detectorPredicate.pass, true);

  assert.deepEqual(extractor.detectFixedCabinetCandidates({
    ...motif,
    bathroomFixtureCandidates: [{
      pageBox: { x0: 110, y0: 114, x1: 180, y1: 134, width: 70, height: 20 }
    }]
  }), []);
  assert.deepEqual(extractor.detectFixedCabinetCandidates({
    ...motif,
    rects: [{
      id: "square",
      pageBox: { x0: 100, y0: 112, x1: 140, y1: 148, width: 40, height: 36 },
      widthPdf: 40,
      heightPdf: 36
    }]
  }), []);
});

test("operator-list semantic assembly actually emits fixed cabinets and summary counts", async () => {
  await import(`${pathToFileURL(extractorPath).href}?fixed-cabinet-assembly-red=1`);
  const extractor = globalThis.LaibePdfPlanVectorExtractor;
  const ops = {
    setLineWidth: 2,
    rectangle: 19,
    stroke: 20,
    fill: 22,
    constructPath: 91
  };
  const rectanglePath = (paint, x, y, width, height) => [
    paint,
    [ops.rectangle, x, y, width, height],
    [x, y, x + width, y + height]
  ];
  const operatorList = {
    fnArray: [ops.constructPath, ops.constructPath, ops.constructPath],
    argsArray: [
      rectanglePath(ops.fill, 50, 100, 200, 12),
      rectanglePath(ops.stroke, 100, 112, 96, 24),
      rectanglePath(ops.stroke, 104, 116, 88, 16)
    ]
  };
  const output = extractor.extractFromOperatorList(operatorList, {
    pageNumber: 1,
    pageWidth: 500,
    pageHeight: 400,
    viewport: { width: 500, height: 400, transform: [1, 0, 0, 1, 0, 0] },
    disableLineWidthGrouping: true,
    disableHatchSuppression: true,
    disableTextZoneFiltering: true,
    disableWallHealing: true,
    disableWallMerging: true
  });

  assert.equal(output.fixedCabinetCandidates.length, 1);
  assert.equal(output.summary.fixedCabinetCandidateCount, 1);
  assert.equal(output.semanticDetection.counts.fixedCabinets, 1);
  assert.equal(output.semanticDetection.candidateRows.fixedCabinets.length, 1);
});

test("adapter carries extractor fixedCabinetCandidates into recognition without native promotion", async () => {
  await import(`${pathToFileURL(adapterPath).href}?fixed-cabinet-red=1`);
  const adapter = globalThis.LaibePdfPlanObjectizationAdapter;
  const scene = await adapter.adaptExtractorOutput({
    sourceSha256: exactSourceSha256,
    sourceName: "_qa_pdf_reference_3rf.pdf",
    pageNumber: 1,
    regions: canonicalTwoRegionSceneFixture.sourceRegions,
    raw: {
      pageNumber: 1,
      page: { width: 842, height: 1191 },
      walls: [],
      columns: [],
      axisLines: [],
      numericDimensionLabels: [],
      openingCandidates: [],
      stairCandidates: [],
      stairVoidCandidates: [],
      spaceBoundaryCandidates: [],
      bathroomFixtureCandidates: [],
      fixedCabinetCandidates: [
        {
          id: "pdf-fixed-cabinet-0001",
          subtype: "wall_fixed_cabinet",
          pageBox: { x0: 600, y0: 850, x1: 700, y1: 890, width: 100, height: 40 },
          coordinateFrame: "page-bottom-left-pdf-pt",
          evidence: {
            detectorPredicate: { pass: true, reason: "fixed_cabinet_geometry_motif" }
          }
        }
      ],
      summary: {}
    }
  });
  assert.equal(scene.fixedCabinetCandidates.length, 1);
  assert.equal(scene.fixedCabinetCandidates[0].category, "fixedCabinet");
  assert.equal(scene.fixedCabinetCandidates[0].sourceRegionId, upperRegionId);

  const gate = await loadRecognitionModule();
  const manifest = gate.selectRecognitionRegion(gate.recognizePdfObjects({
    source: canonicalTwoRegionSceneFixture.source,
    ...scene
  }), upperRegionId);
  const candidate = manifest.objects.find(
    (object) => object.sourceId === scene.fixedCabinetCandidates[0].source_object_id
  );
  assert.equal(candidate.category, "excluded_fixed_cabinet");
  assert.equal(candidate.excluded, true);
});
