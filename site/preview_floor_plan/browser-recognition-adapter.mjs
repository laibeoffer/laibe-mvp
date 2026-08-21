import * as localPdfJs from "./vendor/pdfjs/pdf.mjs";
import "./pdf-plan-vector-extractor.js";
import "./pdf-plan-objectization-adapter.js";
import { recognizePdfObjects as recognizeWithGate } from "./pdf-recognition-gate.mjs";

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
export const DRAWING_PDF_SECURITY_STATUS = safeFreeze({
  SAFE: "NO_ACTIVE_CONTENT_TRIGGER_DETECTED",
  ACTIVE: "CONFIRMED_ACTIVE_CONTENT",
  UNAVAILABLE: "SECURITY_INSPECTION_UNAVAILABLE",
});

const LOCAL_REVIEW_HOLDS = safeFreeze(["A11_FORMAL_BINDING_HOLD"]);
const UNCERTAINTY_NEXT_ACTION = "請人工核對原始圖說後再決定是否採用。";
const PRESENTATION_DATA_URL_LIMIT = 16 * 1024 * 1024;
const PUBLIC_UNCERTAINTY_REASONS = safeFreeze({
  wall_endpoint_requires_review: "牆線端點或銜接關係仍需人工核對。",
  visible_symbol_requires_classification_review: "圖面符號的分類仍需人工核對。",
  stair_void_requires_relationship_review: "樓梯與挑空的關係仍需人工核對。",
  space_boundary_requires_topology_review: "空間邊界的連接關係仍需人工核對。",
  missing_verified_stair_source_geometry: "樓梯線條來源仍不完整，需回看原始圖說。",
});
const PUBLIC_CLASSIFICATION_LABELS = safeFreeze({
  locked_reference: "鎖定參考",
  native_opening: "門窗與開口",
  native_wall: "牆線",
  unresolved: "一般待確認",
  unresolved_important: "重要待確認",
});

function freezeResult(record) {
  if (record.file) safeFreeze(record.file);
  if (record.summary) safeFreeze(record.summary);
  if (record.sourcePage) safeFreeze(record.sourcePage);
  if (record.presentationReference) safeFreeze(record.presentationReference);
  if (record.classificationCounts) {
    record.classificationCounts.forEach(safeFreeze);
    safeFreeze(record.classificationCounts);
  }
  if (record.uncertainty) safeFreeze(record.uncertainty);
  return safeFreeze({
    ...record,
    mode: "local_review_only",
    holds: LOCAL_REVIEW_HOLDS,
    conversionAllowed: false,
    projectMutationAllowed: false,
    uploaded: false,
    persisted: false,
    formalCaseRecord: false,
  });
}

function closedResult(
  status,
  reason,
  file = null,
  securityStatus = DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE,
) {
  return freezeResult({
    status,
    reason,
    file,
    securityStatus,
    summary: null,
    sourcePage: null,
    presentationReference: null,
    classificationCounts: safeFreeze([]),
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
    value.toString(16).padStart(2, "0")).join("");
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

const ACTIVE_PDF_NAMES = safeFreeze(new Set([
  "AA",
  "AF",
  "EF",
  "EmbeddedFiles",
  "JavaScript",
  "OpenAction",
]));
const ACTIVE_PDF_ACTIONS = safeFreeze(new Set([
  "GoToE",
  "GoToR",
  "ImportData",
  "JavaScript",
  "Launch",
  "Movie",
  "Rendition",
  "RichMediaExecute",
  "Sound",
  "SubmitForm",
  "URI",
]));
const PDF_STRUCTURAL_TOKEN_LIMIT = 1_000_000;
const PDF_EXPANDED_OBJECT_LIMIT = 64 * 1024 * 1024;

function isPdfWhite(byte) {
  return byte === 0 || byte === 9 || byte === 10 || byte === 12 ||
    byte === 13 || byte === 32;
}

function isPdfDelimiter(byte) {
  return byte === 0x28 || byte === 0x29 || byte === 0x3c || byte === 0x3e ||
    byte === 0x5b || byte === 0x5d || byte === 0x7b || byte === 0x7d ||
    byte === 0x2f || byte === 0x25;
}

function hexDigit(byte) {
  if (byte >= 0x30 && byte <= 0x39) return byte - 0x30;
  if (byte >= 0x41 && byte <= 0x46) return byte - 0x41 + 10;
  if (byte >= 0x61 && byte <= 0x66) return byte - 0x61 + 10;
  return -1;
}

function decodePdfName(bytes, start, end) {
  let value = "";
  for (let index = start; index < end; index += 1) {
    if (bytes[index] === 0x23 && index + 2 < end) {
      const high = hexDigit(bytes[index + 1]);
      const low = hexDigit(bytes[index + 2]);
      if (high >= 0 && low >= 0) {
        value += String.fromCharCode(high * 16 + low);
        index += 2;
        continue;
      }
    }
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

function isPdfNumberText(value) {
  if (!value) return false;
  let digitCount = 0;
  let dotCount = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0x30 && code <= 0x39) {
      digitCount += 1;
      continue;
    }
    if (code === 0x2e && dotCount === 0) {
      dotCount += 1;
      continue;
    }
    if ((code === 0x2b || code === 0x2d) && index === 0) continue;
    return false;
  }
  return digitCount > 0;
}

function readPdfToken(bytes, initialCursor) {
  let cursor = initialCursor;
  while (cursor < bytes.length) {
    if (isPdfWhite(bytes[cursor])) {
      cursor += 1;
      continue;
    }
    if (bytes[cursor] === 0x25) {
      while (cursor < bytes.length && bytes[cursor] !== 10 && bytes[cursor] !== 13) {
        cursor += 1;
      }
      continue;
    }
    break;
  }
  if (cursor >= bytes.length) return null;
  const start = cursor;
  const byte = bytes[cursor];
  if (byte === 0x28) {
    cursor += 1;
    let depth = 1;
    while (cursor < bytes.length && depth > 0) {
      if (bytes[cursor] === 0x5c) {
        cursor += 2;
        continue;
      }
      if (bytes[cursor] === 0x28) depth += 1;
      if (bytes[cursor] === 0x29) depth -= 1;
      cursor += 1;
    }
    return { kind: "string", start, end: cursor };
  }
  if (byte === 0x3c) {
    if (bytes[cursor + 1] === 0x3c) {
      return { kind: "dictStart", start, end: cursor + 2 };
    }
    cursor += 1;
    while (cursor < bytes.length && bytes[cursor] !== 0x3e) cursor += 1;
    return { kind: "hexString", start, end: Math.min(cursor + 1, bytes.length) };
  }
  if (byte === 0x3e && bytes[cursor + 1] === 0x3e) {
    return { kind: "dictEnd", start, end: cursor + 2 };
  }
  if (byte === 0x5b || byte === 0x5d) {
    return {
      kind: byte === 0x5b ? "arrayStart" : "arrayEnd",
      start,
      end: cursor + 1,
    };
  }
  if (byte === 0x2f) {
    cursor += 1;
    const nameStart = cursor;
    while (
      cursor < bytes.length &&
      !isPdfWhite(bytes[cursor]) &&
      !isPdfDelimiter(bytes[cursor])
    ) cursor += 1;
    return {
      kind: "name",
      value: decodePdfName(bytes, nameStart, cursor),
      start,
      end: cursor,
    };
  }
  while (
    cursor < bytes.length &&
    !isPdfWhite(bytes[cursor]) &&
    !isPdfDelimiter(bytes[cursor])
  ) cursor += 1;
  if (cursor === start) return { kind: "delimiter", start, end: cursor + 1 };
  let value = "";
  for (let index = start; index < cursor; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return {
    kind: isPdfNumberText(value) ? "number" : "keyword",
    value: isPdfNumberText(value) ? Number(value) : value,
    start,
    end: cursor,
  };
}

function lastPdfDictionary(tokens) {
  if (!tokens.length || tokens[tokens.length - 1].kind !== "dictEnd") return null;
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    if (tokens[index].kind === "dictEnd") depth += 1;
    if (tokens[index].kind === "dictStart") {
      depth -= 1;
      if (depth === 0) return tokens.slice(index, tokens.length);
    }
  }
  return null;
}

function directDictionaryValue(tokens, key) {
  if (!tokens) return null;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].kind === "name" && tokens[index].value === key) {
      return tokens[index + 1];
    }
  }
  return null;
}

function dictionaryIsObjectStream(tokens) {
  const type = directDictionaryValue(tokens, "Type");
  return type?.kind === "name" && type.value === "ObjStm";
}

function objectStreamFilterIsSupported(tokens) {
  const filter = directDictionaryValue(tokens, "Filter");
  if (!filter) return "none";
  if (filter.kind === "name" && filter.value === "FlateDecode") return "deflate";
  return "unsupported";
}

function tokenCreatesActiveBehavior(token, previousToken) {
  if (token.kind !== "name") return false;
  if (ACTIVE_PDF_NAMES.has(token.value)) return true;
  if (
    previousToken?.kind === "name" &&
    previousToken.value === "S" &&
    ACTIVE_PDF_ACTIONS.has(token.value)
  ) return true;
  if (
    previousToken?.kind === "name" &&
    previousToken.value === "Type" &&
    (token.value === "EmbeddedFile" || token.value === "Filespec")
  ) return true;
  if (
    previousToken?.kind === "name" &&
    previousToken.value === "Subtype" &&
    (token.value === "FileAttachment" || token.value === "RichMedia" ||
      token.value === "Movie" || token.value === "Sound")
  ) return true;
  return false;
}

function streamDataStart(bytes, cursor) {
  if (bytes[cursor] === 13 && bytes[cursor + 1] === 10) return cursor + 2;
  if (bytes[cursor] === 10 || bytes[cursor] === 13) return cursor + 1;
  return -1;
}

async function inflatePdfObjectStream(bytes) {
  if (typeof globalThis.DecompressionStream !== "function") return null;
  try {
    const decompressed = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")),
    ).arrayBuffer();
    if (decompressed.byteLength > PDF_EXPANDED_OBJECT_LIMIT) return null;
    return new Uint8Array(decompressed);
  } catch {
    return null;
  }
}

async function inspectPdfStructureSecurity(bytes, depth = 0) {
  if (depth > 4 || bytes.byteLength > PDF_EXPANDED_OBJECT_LIMIT) {
    return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
  }
  let cursor = 0;
  let count = 0;
  let previousToken = null;
  let tokens = [];
  while (cursor < bytes.length) {
    const token = readPdfToken(bytes, cursor);
    if (!token) break;
    cursor = token.end;
    count += 1;
    if (count > PDF_STRUCTURAL_TOKEN_LIMIT) {
      return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
    }
    if (tokenCreatesActiveBehavior(token, previousToken)) {
      return DRAWING_PDF_SECURITY_STATUS.ACTIVE;
    }
    tokens.push(token);
    previousToken = token;
    if (token.kind !== "keyword" || token.value !== "stream") continue;

    const dictionary = lastPdfDictionary(tokens.slice(0, -1));
    const start = streamDataStart(bytes, cursor);
    const lengthToken = directDictionaryValue(dictionary, "Length");
    const length = lengthToken?.kind === "number" ? lengthToken.value : null;
    if (start < 0 || !Number.isSafeInteger(length) || length < 0 || start + length > bytes.length) {
      return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
    }
    const streamBytes = bytes.slice(start, start + length);
    if (dictionaryIsObjectStream(dictionary)) {
      const filter = objectStreamFilterIsSupported(dictionary);
      if (filter === "unsupported") return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
      const expanded = filter === "deflate"
        ? await inflatePdfObjectStream(streamBytes)
        : streamBytes;
      if (!expanded) return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
      const nestedStatus = await inspectPdfStructureSecurity(expanded, depth + 1);
      if (nestedStatus !== DRAWING_PDF_SECURITY_STATUS.SAFE) return nestedStatus;
    }
    cursor = start + length;
    tokens = [];
    previousToken = null;
  }
  return DRAWING_PDF_SECURITY_STATUS.SAFE;
}

function recordHasEntries(value) {
  return Boolean(value && typeof value === "object" && Reflect.ownKeys(value).length > 0);
}

function annotationHasActiveContent(annotation) {
  if (!annotation || typeof annotation !== "object") return false;
  for (const key of [
    "action",
    "attachment",
    "attachmentDest",
    "file",
    "resetForm",
    "setOCGState",
    "unsafeUrl",
    "url",
  ]) {
    if (annotation[key]) return true;
  }
  return recordHasEntries(annotation.actions);
}

function outlineHasActiveContent(items) {
  if (!Array.isArray(items)) return false;
  return items.some((item) =>
    annotationHasActiveContent(item) || outlineHasActiveContent(item?.items));
}

export async function inspectDrawingPdfActiveContent({ bytes }) {
  const loadingTask = localPdfJs.getDocument({
    data: bytes.slice(),
    disableWorker: true,
    isEvalSupported: false,
  });
  const pdfDocument = await loadingTask.promise;
  try {
    for (const method of [
      "getAttachments",
      "getJSActions",
      "getOpenAction",
      "getOutline",
      "hasJSActions",
    ]) {
      if (typeof pdfDocument[method] !== "function") {
        return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
      }
    }
    const [attachments, documentActions, openAction, outline, hasJsActions] =
      await Promise.all([
        pdfDocument.getAttachments(),
        pdfDocument.getJSActions(),
        pdfDocument.getOpenAction(),
        pdfDocument.getOutline(),
        pdfDocument.hasJSActions(),
      ]);
    if (
      recordHasEntries(attachments) ||
      recordHasEntries(documentActions) ||
      recordHasEntries(openAction) ||
      hasJsActions === true ||
      outlineHasActiveContent(outline)
    ) return DRAWING_PDF_SECURITY_STATUS.ACTIVE;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      if (typeof page.getJSActions !== "function" || typeof page.getAnnotations !== "function") {
        return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
      }
      const [pageActions, annotations] = await Promise.all([
        page.getJSActions(),
        page.getAnnotations({ intent: "display" }),
      ]);
      if (
        recordHasEntries(pageActions) ||
        (Array.isArray(annotations) && annotations.some(annotationHasActiveContent))
      ) return DRAWING_PDF_SECURITY_STATUS.ACTIVE;
    }
    return inspectPdfStructureSecurity(bytes);
  } finally {
    if (typeof pdfDocument.destroy === "function") await pdfDocument.destroy();
  }
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
  const presenter = await import("./pdf-plan-selected-source-presentation.mjs");
  return presenter.presentSelectedPdfFile(snapshot, {
    ...options,
    pdfjsLib: localPdfJs,
  });
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

function defaultDependencies() {
  return {
    inspectActiveContent: inspectDrawingPdfActiveContent,
    presentSelectedPdfFile: defaultPresentSelectedPdfFile,
    extractScene: defaultExtractScene,
    recognizePdfObjects: recognizeWithGate,
  };
}

function safeUncertainty(manifest) {
  const values = manifest?.recognition?.unresolvedIds;
  if (!Array.isArray(values)) return safeFreeze([]);
  const objects = Array.isArray(manifest?.allObjects) ? manifest.allObjects : [];
  const results = values
    .filter((value) => typeof value === "string" && value.length > 0)
    .slice(0, 50)
    .map((id) => {
      const source = objects.find((candidate) =>
        String(candidate?.sourceId || candidate?.source_object_id || "") === id);
      const internalReason = String(
        source?.sourcePayload?.unresolvedReason ||
        source?.sourcePayload?.reason ||
        manifest?.recognition?.reason ||
        "",
      );
      const reason = PUBLIC_UNCERTAINTY_REASONS[internalReason] ||
        "此項辨識依據仍不足，需回看原始圖說確認。";
      return safeFreeze({
        reason,
        nextAction: UNCERTAINTY_NEXT_ACTION,
      });
    });
  return safeFreeze(results);
}

function safeClassificationCounts(manifest) {
  const rows = Array.isArray(manifest?.summaryRows) ? manifest.summaryRows : [];
  const normalizedRows = rows.slice(0, 50).flatMap((row) => {
    const count = Number(row?.count);
    const label = typeof row?.label === "string" ? row.label.trim().slice(0, 80) : "";
    return label && Number.isSafeInteger(count) && count >= 0
      ? [safeFreeze({ label, count })]
      : [];
  });
  if (normalizedRows.length > 0) return safeFreeze(normalizedRows);
  const counts = manifest?.counts;
  if (!counts || typeof counts !== "object") return safeFreeze([]);
  return safeFreeze(Reflect.ownKeys(counts).slice(0, 50).flatMap((key) => {
    if (typeof key !== "string") return [];
    const descriptor = Object.getOwnPropertyDescriptor(counts, key);
    const count = Number(descriptor?.value);
    return Number.isSafeInteger(count) && count >= 0
      ? [safeFreeze({
        label: PUBLIC_CLASSIFICATION_LABELS[key] || "其他待確認內容",
        count,
      })]
      : [];
  }));
}

function safePresentationReference(
  presentation,
  sourceSha256,
  requestedPageNumber,
  extractionPageNumber,
) {
  const raster = presentation?.referenceRaster;
  const dataUrl = typeof raster?.dataUrl === "string" ? raster.dataUrl : "";
  const width = Number(raster?.naturalWidth);
  const height = Number(raster?.naturalHeight);
  const pageNumber = Number(raster?.pageNumber);
  const presentationPageNumber = Number(presentation?.selectedPageNumber);
  const requestedPage = Number(requestedPageNumber);
  const extractionPage = Number(extractionPageNumber);
  const upstreamAvailable = raster?.available === true;
  const sourceMatches = raster?.sourceDocumentSha256 === sourceSha256;
  const pageMatches = Number.isSafeInteger(requestedPage) && requestedPage > 0 &&
    pageNumber === requestedPage &&
    presentationPageNumber === requestedPage &&
    extractionPage === requestedPage;
  const safeDataUrl = upstreamAvailable && sourceMatches && pageMatches &&
    dataUrl.length <= PRESENTATION_DATA_URL_LIMIT &&
    /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl)
    ? dataUrl
    : null;
  const isAvailable = Boolean(
    safeDataUrl && Number.isFinite(width) && width > 0 &&
    Number.isFinite(height) && height > 0
  );
  return safeFreeze({
    available: isAvailable,
    dataUrl: isAvailable ? safeDataUrl : null,
    naturalWidth: isAvailable ? Math.round(width) : null,
    naturalHeight: isAvailable ? Math.round(height) : null,
    pageNumber: isAvailable ? requestedPage : null,
  });
}

function normalizedSecurityStatus(value) {
  if (value === false || value === DRAWING_PDF_SECURITY_STATUS.SAFE) {
    return DRAWING_PDF_SECURITY_STATUS.SAFE;
  }
  if (value === true || value === DRAWING_PDF_SECURITY_STATUS.ACTIVE) {
    return DRAWING_PDF_SECURITY_STATUS.ACTIVE;
  }
  return DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
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
  const requestedPageNumber = 1;
  let securityStatus = DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
  try {
    try {
      securityStatus = normalizedSecurityStatus(
        await dependencies.inspectActiveContent({ bytes }),
      );
    } catch {
      securityStatus = DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE;
    }
    if (securityStatus === DRAWING_PDF_SECURITY_STATUS.ACTIVE) {
      return closedResult("unsupported", "active_content", fileFacts, securityStatus);
    }
    if (securityStatus === DRAWING_PDF_SECURITY_STATUS.UNAVAILABLE) {
      return closedResult(
        "unsupported",
        "security_inspection_unavailable",
        fileFacts,
        securityStatus,
      );
    }
    const snapshot = createTrustedSnapshot(bytes);
    const presentation = await dependencies.presentSelectedPdfFile(snapshot, {
      expectedSha256: sourceSha256,
      pageNumber: requestedPageNumber,
    });
    const extraction = await dependencies.extractScene({
      bytes,
      sourceSha256,
      pageNumber: requestedPageNumber,
    });
    if (extraction?.activeContent === true) {
      return closedResult(
        "unsupported",
        "active_content",
        fileFacts,
        DRAWING_PDF_SECURITY_STATUS.ACTIVE,
      );
    }
    const manifest = dependencies.recognizePdfObjects(extraction?.scene || {});
    const objectCount = Array.isArray(manifest?.allObjects)
      ? manifest.allObjects.length
      : 0;
    if (objectCount === 0) {
      return closedResult("unsupported", "scanned_or_non_vector", fileFacts, securityStatus);
    }
    const uncertainty = safeUncertainty(manifest);
    const classificationCounts = safeClassificationCounts(manifest);
    const pageCount = Number(extraction?.pageCount || presentation?.pageCount || 0);
    const extractionPageNumber = Number(extraction?.scene?.source?.pageNumber);
    const selectedPageNumber = Number.isSafeInteger(extractionPageNumber) && extractionPageNumber > 0
      ? extractionPageNumber
      : requestedPageNumber;
    return freezeResult({
      status: "partial",
      reason: "A11_FORMAL_BINDING_HOLD",
      securityStatus,
      file: safeFreeze({ ...fileFacts, pageCount }),
      summary: safeFreeze({
        pageCount,
        objectCount,
        unresolvedCount: uncertainty.length,
        counts: safeFreeze({ ...(manifest.counts || {}) }),
      }),
      sourcePage: safeFreeze({
        pageNumber: Number.isSafeInteger(selectedPageNumber) && selectedPageNumber > 0
          ? selectedPageNumber
          : 1,
        pageCount,
        label: `第 ${Number.isSafeInteger(selectedPageNumber) && selectedPageNumber > 0 ? selectedPageNumber : 1} 頁`,
      }),
      classificationCounts,
      presentationReference: safePresentationReference(
        presentation,
        sourceSha256,
        requestedPageNumber,
        extractionPageNumber,
      ),
      uncertainty,
    });
  } catch (error) {
    return closedResult("unsupported", classifyError(error), fileFacts, securityStatus);
  }
}
