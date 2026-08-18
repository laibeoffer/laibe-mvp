import * as localPdfJs from "./vendor/pdfjs/pdf.mjs";
import "./pdf-plan-vector-extractor.js";
import "./pdf-plan-objectization-adapter.js";
import { recognizePdfObjects as recognizeWithGate } from "./pdf-recognition-gate.mjs";
import { validateA11BundleBinding } from "./a11-floor-plan-bundle-consumer.mjs";

export const MAX_DRAWING_PDF_BYTES = 32 * 1024 * 1024;

const safeApply = Reflect.apply;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const blobPrototype = globalThis.Blob && globalThis.Blob.prototype;
const trustedBlobSizeGetter = blobPrototype &&
  safeGetOwnPropertyDescriptor(blobPrototype, "size")?.get;
const trustedBlobArrayBuffer = blobPrototype &&
  safeGetOwnPropertyDescriptor(blobPrototype, "arrayBuffer")?.value;
const EMPTY_ARGUMENTS = safeFreeze([]);

function freezeResult(record) {
  if (record.file) safeFreeze(record.file);
  if (record.summary) safeFreeze(record.summary);
  if (record.uncertainty) safeFreeze(record.uncertainty);
  return safeFreeze({
    ...record,
    conversionAllowed: false,
    projectMutationAllowed: false,
    uploaded: false,
    persisted: false,
    formalCaseRecord: false,
  });
}

function closedResult(status, reason, file = null) {
  return freezeResult({
    status,
    reason,
    file,
    summary: null,
    uncertainty: safeFreeze([]),
  });
}

function normalizedMaxBytes(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? number
    : MAX_DRAWING_PDF_BYTES;
}

function hasPdfSignature(bytes) {
  return bytes.byteLength >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
}

async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function createTrustedSnapshot(bytes) {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  if (typeof globalThis.File === "function") {
    return new globalThis.File([copy], "selected-plan.pdf", {
      type: "application/pdf",
    });
  }
  const snapshot = new globalThis.Blob([copy], { type: "application/pdf" });
  Object.defineProperty(snapshot, "name", {
    configurable: false,
    enumerable: true,
    value: "selected-plan.pdf",
    writable: false,
  });
  return snapshot;
}

async function defaultPresentSelectedPdfFile(snapshot, options) {
  if (typeof window === "undefined") {
    throw new Error("Browser document unavailable");
  }
  window.pdfjsLib = localPdfJs;
  if (localPdfJs.GlobalWorkerOptions) {
    localPdfJs.GlobalWorkerOptions.workerSrc = new URL(
      "./vendor/pdfjs/pdf.worker.mjs",
      import.meta.url,
    ).href;
  }
  const runtime = await import("./pdf-plan-exact-source-runtime.mjs");
  return runtime.presentSelectedPdfFile(snapshot, options);
}

async function documentHasActiveContent(pdfDocument) {
  if (typeof pdfDocument.getJSActions !== "function") return false;
  const actions = await pdfDocument.getJSActions();
  return Boolean(actions && typeof actions === "object" &&
    Reflect.ownKeys(actions).length > 0);
}

async function defaultExtractScene({ bytes, sourceSha256 }) {
  const loadingTask = localPdfJs.getDocument({
    data: bytes.slice(),
    disableWorker: true,
  });
  const pdfDocument = await loadingTask.promise;
  try {
    if (await documentHasActiveContent(pdfDocument)) {
      return { activeContent: true, pageCount: pdfDocument.numPages, scene: null };
    }
    if (!Number.isInteger(pdfDocument.numPages) || pdfDocument.numPages < 1) {
      throw new Error("Invalid page count");
    }
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const extractor = globalThis.LaibePdfPlanVectorExtractor ||
      (typeof window !== "undefined" && window.LaibePdfPlanVectorExtractor);
    const objectization = globalThis.LaibePdfPlanObjectizationAdapter ||
      (typeof window !== "undefined" && window.LaibePdfPlanObjectizationAdapter);
    if (!extractor || !objectization) throw new Error("Recognition support unavailable");
    const raw = await extractor.extractFromPage(page, {
      pdfjsLib: localPdfJs,
      pdfDocument,
      sourceFileName: "selected-plan.pdf",
      pageNumber: 1,
    });
    const region = {
      sourceRegionId: "page-1-full",
      label: "第 1 頁",
      boundsPt: {
        x0: 0,
        y0: 0,
        x1: Number(viewport.width),
        y1: Number(viewport.height),
      },
      semantic_status: "page_reference",
      floor_semantic: false,
    };
    const scene = await objectization.adaptExtractorOutput({
      raw,
      sourceSha256,
      sourceName: "selected-plan.pdf",
      pageIndex: 0,
      pageNumber: 1,
      pdfjsVersion: localPdfJs.version || null,
      regions: [region],
    });
    return {
      activeContent: false,
      pageCount: pdfDocument.numPages,
      scene: {
        ...scene,
        source: {
          ...(scene.source || {}),
          fileName: "selected-plan.pdf",
          fileSha256: sourceSha256,
          pageNumber: 1,
          pageWidthPt: Number(viewport.width),
          pageHeightPt: Number(viewport.height),
        },
      },
    };
  } finally {
    if (typeof pdfDocument.destroy === "function") await pdfDocument.destroy();
  }
}

function defaultValidateA11Binding(binding) {
  if (!binding) return { passed: false, reason: "a11_bundle_unavailable" };
  try {
    validateA11BundleBinding(binding);
    return { passed: true, reason: "a11_gate_passed" };
  } catch {
    return { passed: false, reason: "a11_gate_not_accepted" };
  }
}

function defaultDependencies() {
  return {
    presentSelectedPdfFile: defaultPresentSelectedPdfFile,
    extractScene: defaultExtractScene,
    recognizePdfObjects: recognizeWithGate,
    validateA11Binding: defaultValidateA11Binding,
  };
}

function safeUncertainty(manifest) {
  const values = manifest?.recognition?.unresolvedIds;
  if (!Array.isArray(values)) return safeFreeze([]);
  return safeFreeze(values
    .filter((value) => typeof value === "string" && value.length > 0)
    .slice(0, 50));
}

function classifyError(error) {
  if (error?.name === "PasswordException" || error?.code === 1 || error?.code === 2) {
    return "encrypted";
  }
  return "corrupt";
}

export function createDrawingRecognitionRunGuard() {
  let sequence = 0;
  return safeFreeze({
    begin() {
      sequence += 1;
      return sequence;
    },
    cancel() {
      sequence += 1;
    },
    isCurrent(token) {
      return Number.isSafeInteger(token) && token === sequence;
    },
  });
}

export async function recognizeDrawingFile(file, options = {}) {
  const maxBytes = normalizedMaxBytes(options.maxBytes);
  let declaredSize;
  try {
    if (!trustedBlobSizeGetter || !trustedBlobArrayBuffer) {
      return closedResult("error", "browser_file_unavailable");
    }
    declaredSize = safeApply(trustedBlobSizeGetter, file, EMPTY_ARGUMENTS);
  } catch {
    return closedResult("error", "browser_file_unavailable");
  }
  if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0) {
    return closedResult("unsupported", "empty");
  }
  if (declaredSize > maxBytes) {
    return closedResult("unsupported", "oversize", safeFreeze({ byteLength: declaredSize }));
  }

  let buffer;
  try {
    buffer = await safeApply(trustedBlobArrayBuffer, file, EMPTY_ARGUMENTS);
  } catch {
    return closedResult("error", "read_failed");
  }
  if (!(buffer instanceof ArrayBuffer)) return closedResult("error", "read_failed");
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength > maxBytes || bytes.byteLength !== declaredSize) {
    return closedResult("unsupported", "oversize", safeFreeze({ byteLength: declaredSize }));
  }
  if (!hasPdfSignature(bytes)) {
    return closedResult("unsupported", "corrupt", safeFreeze({ byteLength: declaredSize }));
  }

  const dependencies = {
    ...defaultDependencies(),
    ...(options.dependencies || {}),
  };
  const sourceSha256 = await sha256Hex(bytes);
  const fileFacts = safeFreeze({ byteLength: declaredSize, sha256: sourceSha256 });
  try {
    const snapshot = createTrustedSnapshot(bytes);
    const presentation = await dependencies.presentSelectedPdfFile(snapshot, {
      expectedSha256: sourceSha256,
      pageNumber: 1,
    });
    const extraction = await dependencies.extractScene({
      bytes,
      sourceSha256,
      pageNumber: 1,
    });
    if (extraction?.activeContent === true) {
      return closedResult("unsupported", "active_content", fileFacts);
    }
    const manifest = dependencies.recognizePdfObjects(extraction?.scene || {});
    const objectCount = Array.isArray(manifest?.allObjects)
      ? manifest.allObjects.length
      : 0;
    if (objectCount === 0) {
      return closedResult("unsupported", "scanned_or_non_vector", fileFacts);
    }
    const uncertainty = safeUncertainty(manifest);
    const a11 = dependencies.validateA11Binding(options.a11Binding || null);
    const recognized = a11?.passed === true &&
      manifest?.selection?.selectedRegionId &&
      uncertainty.length === 0;
    const pageCount = Number(extraction?.pageCount || presentation?.pageCount || 0);
    return freezeResult({
      status: recognized ? "recognized" : "partial",
      reason: recognized ? "recognized" : "review_required",
      file: safeFreeze({ ...fileFacts, pageCount }),
      summary: safeFreeze({
        pageCount,
        objectCount,
        unresolvedCount: uncertainty.length,
        counts: safeFreeze({ ...(manifest.counts || {}) }),
      }),
      uncertainty,
    });
  } catch (error) {
    return closedResult("unsupported", classifyError(error), fileFacts);
  }
}
