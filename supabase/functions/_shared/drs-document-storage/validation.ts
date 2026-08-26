import { DOCUMENT_LIMITS, type DocumentMime } from "./contracts.ts";

export type HostileFileReport = Readonly<{
  declaredMime: DocumentMime;
  detectedMime: DocumentMime;
  extension: "pdf" | "jpg" | "jpeg" | "png";
  decodedBytes: number;
  pageCount: number | null;
  megapixels: number | null;
  cpuMs: number;
  wallMs: number;
  rssBytes: number;
  indirectObjects: number;
  maxReferenceDepth: number;
  structuralState: "PASS" | "REJECTED" | "AMBIGUOUS" | "TIMEOUT";
  activeFeatures: readonly string[];
  malwareState: "CLEAN" | "INFECTED" | "UNKNOWN" | "TIMEOUT";
}>;

export type FileValidationDecision = Readonly<{
  state: "CLEAN" | "QUARANTINED" | "REJECTED";
  reason: string | null;
}>;

const MIME_EXTENSIONS = Object.freeze(
  {
    "application/pdf": Object.freeze(["pdf"]),
    "image/jpeg": Object.freeze(["jpg", "jpeg"]),
    "image/png": Object.freeze(["png"]),
  } satisfies Readonly<Record<DocumentMime, readonly string[]>>,
);

export function evaluateHostileFileReport(
  input: HostileFileReport,
): FileValidationDecision {
  try {
    if (
      input.declaredMime !== input.detectedMime ||
      !DOCUMENT_LIMITS.allowedMime.includes(input.detectedMime) ||
      typeof input.extension !== "string" ||
      !MIME_EXTENSIONS[input.detectedMime]?.includes(input.extension) ||
      !Number.isFinite(input.decodedBytes) || input.decodedBytes < 1 ||
      input.decodedBytes > 200 * 1024 * 1024 ||
      !Number.isFinite(input.cpuMs) || input.cpuMs < 0 ||
      input.cpuMs > 10_000 ||
      !Number.isFinite(input.wallMs) || input.wallMs < 0 ||
      input.wallMs > 15_000 ||
      !Number.isFinite(input.rssBytes) || input.rssBytes < 0 ||
      input.rssBytes > 256 * 1024 * 1024 ||
      !Number.isSafeInteger(input.indirectObjects) ||
      input.indirectObjects < 0 || input.indirectObjects > 200_000 ||
      !Number.isSafeInteger(input.maxReferenceDepth) ||
      input.maxReferenceDepth < 0 || input.maxReferenceDepth > 64
    ) return Object.freeze({ state: "REJECTED", reason: "RESOURCE_LIMIT" });
    if (input.structuralState !== "PASS") {
      return Object.freeze({
        state: input.structuralState === "REJECTED"
          ? "REJECTED"
          : "QUARANTINED",
        reason: "STRUCTURAL_VALIDATION_INCOMPLETE",
      });
    }
    if (!Array.isArray(input.activeFeatures)) {
      return Object.freeze({
        state: "QUARANTINED",
        reason: "VALIDATION_UNKNOWN",
      });
    }
    if (
      input.activeFeatures.length !== 0 ||
      input.activeFeatures.some((feature) => typeof feature !== "string")
    ) {
      return Object.freeze({ state: "REJECTED", reason: "ACTIVE_FEATURE" });
    }
    if (
      input.detectedMime === "application/pdf" &&
      (!Number.isSafeInteger(input.pageCount) || input.pageCount! < 1 ||
        input.pageCount! > DOCUMENT_LIMITS.maxPdfPages)
    ) return Object.freeze({ state: "REJECTED", reason: "PDF_PAGE_LIMIT" });
    if (
      input.detectedMime !== "application/pdf" &&
      (typeof input.megapixels !== "number" ||
        !Number.isFinite(input.megapixels) ||
        input.megapixels <= 0 ||
        input.megapixels > DOCUMENT_LIMITS.maxImageMegapixels)
    ) return Object.freeze({ state: "REJECTED", reason: "IMAGE_PIXEL_LIMIT" });
    if (input.malwareState === "INFECTED") {
      return Object.freeze({ state: "REJECTED", reason: "MALWARE_DETECTED" });
    }
    if (input.malwareState !== "CLEAN") {
      return Object.freeze({ state: "QUARANTINED", reason: "MALWARE_UNKNOWN" });
    }
    return Object.freeze({ state: "CLEAN", reason: null });
  } catch {
    return Object.freeze({
      state: "QUARANTINED",
      reason: "VALIDATION_UNKNOWN",
    });
  }
}
