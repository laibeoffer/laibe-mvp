import test from "node:test";
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCanonicalUpper3fFixture } from "./helpers/canonical-pdf-scene.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const adapterPath = resolve(
  repoRoot,
  "site/preview_floor_plan/browser-recognition-adapter.mjs",
);
const pdfPath = resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf");
const adapterUrl = pathToFileURL(adapterPath).href;
const canonicalPaths = {
  pdf: pdfPath,
  pdfJs: resolve(repoRoot, "site/preview_floor_plan/vendor/pdfjs/pdf.mjs"),
  extractor: resolve(repoRoot, "site/preview_floor_plan/pdf-plan-vector-extractor.js"),
  adapter: resolve(repoRoot, "site/preview_floor_plan/pdf-plan-objectization-adapter.js"),
  recognitionGate: resolve(repoRoot, "site/preview_floor_plan/pdf-recognition-gate.mjs"),
};

test.before(async () => {
  await loadCanonicalUpper3fFixture(canonicalPaths);
});

function a11Unavailable() {
  return { passed: false, reason: "a11_bundle_unavailable" };
}

function recognizedScene() {
  return {
    pageCount: 1,
    activeContent: false,
    scene: {
      source: {
        fileSha256: "A".repeat(64),
        pageNumber: 1,
        pageWidthPt: 842,
        pageHeightPt: 1191,
      },
      regions: [{
        sourceRegionId: "page-1-full",
        label: "第 1 頁",
        boundsPt: { x0: 0, y0: 0, x1: 842, y1: 1191 },
      }],
      structuralWalls: [{
        source_object_id: "wall-1",
        category: "wall",
        sourceRegionId: "page-1-full",
        sourceBBox: [10, 10, 100, 20],
      }],
    },
  };
}

function buildPdf(objectBodies) {
  let source = "%PDF-1.7\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (let index = 0; index < objectBodies.length; index += 1) {
    offsets.push(Buffer.byteLength(source, "latin1"));
    source += `${index + 1} 0 obj\n${objectBodies[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(source, "latin1");
  source += `xref\n0 ${objectBodies.length + 1}\n`;
  source += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    source += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  source += `trailer\n<< /Size ${objectBodies.length + 1} /Root 1 0 R >>\n`;
  source += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(source, "latin1");
}

function pageObject(extra = "") {
  return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R ${extra} >>`;
}

function activePdfScenarios() {
  const emptyContents = "<< /Length 0 >>\nstream\nendstream";
  return [
    {
      name: "indirect Catalog OpenAction Launch",
      bytes: buildPdf([
        "<< /Type /Catalog /Pages 2 0 R /OpenAction 5 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        pageObject(),
        emptyContents,
        "<< /Type /Action /S /Launch /F (calc.exe) >>",
      ]),
    },
    {
      name: "Catalog additional action URI",
      bytes: buildPdf([
        "<< /Type /Catalog /Pages 2 0 R /AA << /WC 5 0 R >> >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        pageObject(),
        emptyContents,
        "<< /Type /Action /S /URI /URI (https://example.invalid) >>",
      ]),
    },
    {
      name: "page additional action SubmitForm",
      bytes: buildPdf([
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        pageObject("/AA << /O 5 0 R >>"),
        emptyContents,
        "<< /Type /Action /S /SubmitForm /F (https://example.invalid) >>",
      ]),
    },
    {
      name: "embedded attachment and page GoToR action",
      bytes: buildPdf([
        "<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(payload.txt) 5 0 R] >> >> >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        pageObject("/Annots [7 0 R]"),
        emptyContents,
        "<< /Type /Filespec /F (payload.txt) /EF << /F 6 0 R >> >>",
        "<< /Type /EmbeddedFile /Length 4 >>\nstream\nDATA\nendstream",
        "<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] /A << /S /GoToR /F (remote.pdf) >> >>",
      ]),
    },
  ];
}

test("focused real File route reads bytes and returns recognition-only summary", async () => {
  const {
    recognizeDrawingFile,
    createDrawingRecognitionRunGuard,
  } = await import(`${adapterUrl}?red-real-file-route=1`);
  const bytes = readFileSync(pdfPath);
  const file = new File([bytes], "真實圖說.pdf", { type: "application/pdf" });
  let presentedBytes = 0;
  let extractedBytes = 0;
  let recognizedCalls = 0;
  const result = await recognizeDrawingFile(file, {
    dependencies: {
      async presentSelectedPdfFile(snapshot) {
        const selected = await snapshot.arrayBuffer();
        presentedBytes = selected.byteLength;
        return { pageCount: 1, selectedPageNumber: 1 };
      },
      async extractScene(input) {
        extractedBytes = input.bytes.byteLength;
        return recognizedScene();
      },
      recognizePdfObjects(input) {
        recognizedCalls += 1;
        return {
          selection: { selectedRegionId: "page-1-full" },
          allObjects: [{ category: "wall" }],
          objects: [{ category: "wall" }],
          counts: { wall: 1 },
          recognition: { status: "needs_review", unresolvedIds: ["wall-1"] },
          conversionGate: { status: "blocked" },
          summaryRows: [{ key: "wall", count: 1 }],
        };
      },
      validateA11Binding: a11Unavailable,
    },
  });

  assert.equal(presentedBytes, bytes.byteLength);
  assert.equal(extractedBytes, bytes.byteLength);
  assert.equal(recognizedCalls, 1);
  assert.equal(result.status, "partial");
  assert.equal(result.file.byteLength, bytes.byteLength);
  assert.equal(result.summary.pageCount, 1);
  assert.equal(result.summary.objectCount, 1);
  assert.equal(result.summary.unresolvedCount, 1);
  assert.equal(result.conversionAllowed, false);
  assert.equal(result.projectMutationAllowed, false);
  assert.equal(result.uploaded, false);
  assert.equal(result.persisted, false);
  assert.equal(result.formalCaseRecord, false);
  assert.equal(Object.isFrozen(result), true);

  const guard = createDrawingRecognitionRunGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
  guard.cancel();
  assert.equal(guard.isCurrent(second), false);
});

test("trusted pre-read size and post-read cap fail closed", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?red-size-cap=1`);
  let calls = 0;
  const dependencies = {
    async presentSelectedPdfFile() { calls += 1; },
    async extractScene() { calls += 1; return recognizedScene(); },
    recognizePdfObjects() { calls += 1; return {}; },
    validateA11Binding: a11Unavailable,
  };
  const oversized = new File([new Uint8Array(33)], "large.pdf", {
    type: "application/pdf",
  });
  const result = await recognizeDrawingFile(oversized, {
    maxBytes: 32,
    dependencies,
  });
  assert.equal(result.status, "unsupported");
  assert.equal(result.reason, "oversize");
  assert.equal(calls, 0);

  const source = readFileSync(adapterPath, "utf8");
  const sizeGate = source.indexOf("trustedBlobSizeGetter");
  const read = source.indexOf("trustedBlobArrayBuffer");
  const postRead = source.indexOf("bytes.byteLength > maxBytes", read);
  assert.ok(sizeGate >= 0 && sizeGate < read && read < postRead);
});

test("existing genuine PDF passes the local PDF.js vector and recognition chain", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?genuine-local-chain=1`);
  const bytes = readFileSync(pdfPath);
  const file = new File([bytes], "任意使用者圖說.pdf", {
    type: "application/pdf",
  });
  const result = await recognizeDrawingFile(file, {
    dependencies: {
      async presentSelectedPdfFile(snapshot) {
        const selected = await snapshot.arrayBuffer();
        assert.equal(selected.byteLength, bytes.byteLength);
        return { pageCount: 1, selectedPageNumber: 1 };
      },
      validateA11Binding: a11Unavailable,
    },
  });
  assert.equal(result.status, "partial");
  assert.equal(result.summary.pageCount, 1);
  assert.ok(result.summary.objectCount > 0);
  assert.equal(result.conversionAllowed, false);
});

test("unsupported scanned encrypted corrupt and active inputs stay closed", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?red-fail-closed=1`);
  const file = new File(["%PDF-1.7\nfixture"], "plan.pdf", {
    type: "application/pdf",
  });
  const base = {
    async inspectActiveContent() { return false; },
    async presentSelectedPdfFile() { return { pageCount: 1 }; },
    validateA11Binding: a11Unavailable,
  };
  const cases = [
    {
      reason: "scanned_or_non_vector",
      dependencies: {
        ...base,
        async extractScene() { return { pageCount: 1, activeContent: false, scene: {} }; },
        recognizePdfObjects() {
          return { allObjects: [], objects: [], counts: {}, recognition: { unresolvedIds: [] } };
        },
      },
    },
    {
      reason: "encrypted",
      dependencies: {
        ...base,
        async extractScene() {
          const error = new Error("secret");
          error.name = "PasswordException";
          throw error;
        },
        recognizePdfObjects() { throw new Error("must not run"); },
      },
    },
    {
      reason: "corrupt",
      dependencies: {
        ...base,
        async extractScene() { throw new Error("broken"); },
        recognizePdfObjects() { throw new Error("must not run"); },
      },
    },
    {
      reason: "active_content",
      dependencies: {
        ...base,
        async extractScene() {
          return { ...recognizedScene(), activeContent: true };
        },
        recognizePdfObjects() { throw new Error("must not run"); },
      },
    },
  ];

  for (const entry of cases) {
    const result = await recognizeDrawingFile(file, {
      dependencies: entry.dependencies,
    });
    assert.equal(result.status, "unsupported", entry.reason);
    assert.equal(result.reason, entry.reason, entry.reason);
    assert.equal(result.conversionAllowed, false, entry.reason);
  }
});

test("valid adversarial PDFs stop before presentation extraction or recognition", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?active-structure-red=1`);
  const pdfjs = await import(pathToFileURL(canonicalPaths.pdfJs).href);
  const scenarios = activePdfScenarios();
  for (const scenario of scenarios) {
    const parsed = await pdfjs.getDocument({
      data: new Uint8Array(scenario.bytes),
      disableWorker: true,
    }).promise;
    assert.equal(parsed.numPages, 1, `${scenario.name} must be a valid PDF`);
    await parsed.destroy();
  }
  for (const scenario of scenarios) {
    const calls = { presentation: 0, extraction: 0, recognition: 0 };
    const result = await recognizeDrawingFile(
      new File([scenario.bytes], "drawing.pdf", { type: "application/pdf" }),
      {
        dependencies: {
          async presentSelectedPdfFile() {
            calls.presentation += 1;
            throw new Error("active PDF reached presentation");
          },
          async extractScene() {
            calls.extraction += 1;
            throw new Error("active PDF reached extraction");
          },
          recognizePdfObjects() {
            calls.recognition += 1;
            throw new Error("active PDF reached recognition");
          },
          validateA11Binding: a11Unavailable,
        },
      },
    );
    assert.equal(result.status, "unsupported", scenario.name);
    assert.equal(result.reason, "active_content", scenario.name);
    assert.deepEqual(calls, {
      presentation: 0,
      extraction: 0,
      recognition: 0,
    }, scenario.name);
    assert.equal(result.conversionAllowed, false, scenario.name);
    assert.equal(result.projectMutationAllowed, false, scenario.name);
  }
});

test("accepted contracts are reused without conversion or fixture-name branching", async () => {
  const source = readFileSync(adapterPath, "utf8");
  for (const acceptedModule of [
    "vendor/pdfjs/pdf.mjs",
    "pdf-plan-vector-extractor.js",
    "pdf-plan-objectization-adapter.js",
    "pdf-plan-exact-source-runtime.mjs",
    "pdf-recognition-gate.mjs",
    "a11-floor-plan-bundle-consumer.mjs",
  ]) {
    assert.match(source, new RegExp(acceptedModule.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(source, /_qa_pdf_reference_3rf|0312\.pdf|fixture/i);
  assert.doesNotMatch(
    source,
    /convertAcceptedBundleToNativePlan|importSelectedPdfFile|importPdfObjectizationScene|laibePlanImport/i,
  );
});
