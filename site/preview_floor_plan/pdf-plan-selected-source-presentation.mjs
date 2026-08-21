function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(buffer) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("PDF source hashing is unavailable.");
  }
  return bytesToHex(await globalThis.crypto.subtle.digest("SHA-256", buffer));
}

function positivePageNumber(value, fallback) {
  const pageNumber = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error("Selected PDF page number is invalid.");
  }
  return pageNumber;
}

export async function presentSelectedPdfFile(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("A genuine PDF file selection is required.");
  }
  const name = String(file.name || "selected-plan.pdf");
  const mimeType = String(file.type || "").toLowerCase();
  if (!/\.pdf$/iu.test(name) && mimeType !== "application/pdf") {
    throw new Error("Only PDF files can use the governed presentation flow.");
  }

  const selectedBytes = await file.arrayBuffer();
  if (!(selectedBytes instanceof ArrayBuffer) || selectedBytes.byteLength === 0) {
    throw new Error("A non-empty selected PDF ArrayBuffer is required.");
  }
  const selectedByteLength = selectedBytes.byteLength;
  const selectedSha256 = await sha256Hex(selectedBytes);
  const expectedSha256 = options.expectedSha256 === undefined
    ? null
    : String(options.expectedSha256).trim().toLowerCase();
  if (expectedSha256 && selectedSha256 !== expectedSha256) {
    throw new Error("PDF source SHA-256 mismatch.");
  }

  const pdfjsLib = options.pdfjsLib;
  if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
    throw new Error("Local PDF.js is unavailable.");
  }
  if (typeof globalThis.document?.createElement !== "function") {
    throw new Error("PDF presentation requires a browser document.");
  }

  const pdfDocument = await pdfjsLib.getDocument({ data: selectedBytes }).promise;
  try {
    const pageCount = Number(pdfDocument.numPages);
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new Error("PDF.js did not provide a valid page count.");
    }
    const requestedPageNumber = positivePageNumber(options.pageNumber, 1);
    if (requestedPageNumber > pageCount) {
      throw new Error("Selected PDF page number is outside the document.");
    }

    const page = await pdfDocument.getPage(requestedPageNumber);
    const selectedPageNumber = Number(page.pageNumber);
    if (selectedPageNumber !== requestedPageNumber) {
      throw new Error("PDF.js returned a different page than requested.");
    }
    const viewport = page.getViewport({ scale: 1 });
    const displayWidth = Number(viewport.width);
    const displayHeight = Number(viewport.height);
    const rotation = Number(viewport.rotation);
    if (!(displayWidth > 0) || !(displayHeight > 0) || !Number.isFinite(rotation)) {
      throw new Error("PDF.js did not provide valid page display metadata.");
    }

    const renderScale = options.renderScale === undefined
      ? Number(globalThis.devicePixelRatio) || 1
      : Number(options.renderScale);
    if (!Number.isFinite(renderScale) || renderScale <= 0) {
      throw new Error("PDF presentation render scale must be positive.");
    }
    const rasterViewport = page.getViewport({ scale: renderScale, rotation });
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rasterViewport.width));
    canvas.height = Math.max(1, Math.round(rasterViewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("PDF presentation canvas is unavailable.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: context,
      viewport: rasterViewport,
      background: "#ffffff",
    }).promise;

    return Object.freeze({
      schema: "laibe.planPuzzle.pdfSourcePresentation.v1",
      status: "source_presentation_ready",
      route: "genuine-user-file-selection",
      file: Object.freeze({
        name,
        byteLength: selectedByteLength,
        mimeType: mimeType || "application/pdf",
      }),
      selectedSha256,
      selectedPageNumber,
      pageCount,
      displayWidth,
      displayHeight,
      rotation,
      referenceRaster: Object.freeze({
        available: true,
        dataUrl: canvas.toDataURL("image/png"),
        naturalWidth: canvas.width,
        naturalHeight: canvas.height,
        fileType: "png",
        source: "browser-pdfjs-selected-page-render",
        sourceDocumentSha256: selectedSha256,
        pageNumber: selectedPageNumber,
        displayWidth,
        displayHeight,
        rotation,
      }),
      capturedAt: new Date().toISOString(),
    });
  } finally {
    if (typeof pdfDocument?.destroy === "function") await pdfDocument.destroy();
  }
}
