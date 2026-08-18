import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  PDF_DIMENSION_SCALE_SCHEMA,
  stableScaleDecisionHash
} from "../../site/preview_floor_plan/pdf-dimension-scale-decision.mjs";

const UPPER_REGION_ID = "page-1-region-3f";
const LOWER_REGION_ID = "page-1-region-rf";

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

let canonicalPromise;

export async function loadCanonicalUpper3fFixture(paths) {
  if (!canonicalPromise) {
    canonicalPromise = (async () => {
      installPdfJsNodePolyfills();
      const bytes = new Uint8Array(readFileSync(paths.pdf));
      const sourceSha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
      const pdfjsLib = await import(pathToFileURL(paths.pdfJs).href);
      globalThis.pdfjsLib = pdfjsLib;
      await import(`${pathToFileURL(paths.extractor).href}?native-objectization-test=1`);
      await import(`${pathToFileURL(paths.adapter).href}?native-objectization-test=1`);
      const pdfDocument = await pdfjsLib.getDocument({ data: bytes, disableWorker: true }).promise;
      const page = await pdfDocument.getPage(1);
      const raw = await globalThis.LaibePdfPlanVectorExtractor.extractFromPage(page, { pageNumber: 1 });
      const scene = await globalThis.LaibePdfPlanObjectizationAdapter.adaptExtractorOutput({
        raw,
        sourceSha256,
        sourceName: "_qa_pdf_reference_3rf.pdf",
        pageNumber: 1,
        regions: [
          {
            sourceRegionId: LOWER_REGION_ID,
            label: "RF",
            boundsPt: { x0: 0, y0: 0, x1: 842, y1: 799.11 },
            semantic_status: "geometry_evidence_bound",
            floor_semantic: true
          },
          {
            sourceRegionId: UPPER_REGION_ID,
            label: "3F",
            boundsPt: { x0: 0, y0: 799.11, x1: 842, y1: 1191 },
            semantic_status: "geometry_evidence_bound",
            floor_semantic: true
          }
        ]
      });
      const gate = await import(`${pathToFileURL(paths.recognitionGate).href}?native-objectization-test=1`);
      const recognized = gate.recognizePdfObjects({
        ...scene,
        source: {
          ...(scene.source || {}),
          fileName: "_qa_pdf_reference_3rf.pdf",
          fileSha256: sourceSha256,
          pageNumber: 1,
          pageWidthPt: 842,
          pageHeightPt: 1191
        }
      });
      const selected = gate.selectRecognitionRegion(recognized, UPPER_REGION_ID);
      const approved = gate.approveRecognitionManifest(selected, {
        reviewerId: "pcm-task2-test",
        acknowledgedUnresolvedIds: selected.recognition.unresolvedIds
      });
      const scopedScene = gate.scopeObjectizationSceneToRegion(scene, UPPER_REGION_ID);
      const scaleAxes = scopedScene.dimensionLines.map((line) => {
        const orientation = String(line.orientation || "");
        const measuredLengthPt = Math.hypot(
          Number(line.p2?.x) - Number(line.p1?.x),
          Number(line.p2?.y) - Number(line.p1?.y)
        );
        const interpretedLengthMm = orientation === "horizontal" ? 6500 : 5250;
        return {
          orientation,
          dimensionTextSourceId: `fixture-${orientation}-dimension-text`,
          dimensionLineSourceId: String(line.id || line.sourceId),
          witnessLineSourceIds: [
            `fixture-${orientation}-witness-start`,
            `fixture-${orientation}-witness-end`
          ],
          displayedValue: orientation === "horizontal" ? "650" : "525",
          interpretedLengthMm,
          measuredLengthPt,
          worldMmPerPt: interpretedLengthMm / measuredLengthPt
        };
      }).sort((left, right) => left.orientation.localeCompare(right.orientation));
      const horizontalScale = scaleAxes.find((axis) => axis.orientation === "horizontal").worldMmPerPt;
      const verticalScale = scaleAxes.find((axis) => axis.orientation === "vertical").worldMmPerPt;
      const acceptedWorldMmPerPt = (horizontalScale + verticalScale) / 2;
      const scaleDecision = {
        schema: PDF_DIMENSION_SCALE_SCHEMA,
        status: "passed",
        confidence: 0.99,
        selectedRegionId: UPPER_REGION_ID,
        inferredUnit: "cm",
        worldMmPerPtX: horizontalScale,
        worldMmPerPtY: verticalScale,
        acceptedWorldMmPerPt,
        axes: scaleAxes,
        audit: {
          independentAxisCount: 2,
          unitSolutionCount: 1,
          consistencyErrorPct:
            Math.abs(horizontalScale - verticalScale) / acceptedWorldMmPerPt * 100,
          competingScaleClusterCount: 0,
          allEvidenceInsideSelectedRegion: true,
          pass: true
        }
      };
      const binding = {
        fileSha256: sourceSha256,
        sourcePdfSha256: sourceSha256,
        pageNumber: 1,
        selectedRegionId: UPPER_REGION_ID,
        scaleDecisionSchema: PDF_DIMENSION_SCALE_SCHEMA,
        scaleDecisionHash: stableScaleDecisionHash(scaleDecision),
        scaleDecision
      };
      return {
        raw,
        scene,
        gate,
        recognized,
        selected,
        approved,
        scopedScene,
        binding,
        sourceSha256,
        upperRegionId: UPPER_REGION_ID,
        lowerRegionId: LOWER_REGION_ID
      };
    })();
  }
  return canonicalPromise;
}
