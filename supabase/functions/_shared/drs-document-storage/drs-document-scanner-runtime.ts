import type { RuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  DOCUMENT_LIMITS,
  type DocumentMime,
  INTAKE_BUCKET,
  isOpaqueRef,
  RECORDS_BUCKET,
} from "./contracts.ts";
import type { DocumentScannerPort } from "./ports.ts";
import type { HostileFileReport } from "./validation.ts";

const MAX_SCANNER_RESPONSE_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const OBJECT_KEY = /^[a-z0-9][a-z0-9/_-]{0,511}\.(?:pdf|jpg|jpeg|png)$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const REPORT_KEYS = Object.freeze(
  [
    "activeFeatures",
    "cpuMs",
    "declaredMime",
    "decodedBytes",
    "detectedMime",
    "extension",
    "indirectObjects",
    "malwareState",
    "maxReferenceDepth",
    "megapixels",
    "pageCount",
    "rssBytes",
    "structuralState",
    "wallMs",
  ] as const,
);

export type SealedByteIdentity = Readonly<{
  sha256: string;
  sizeBytes: number;
  detectedMime: DocumentMime;
  validatedMime: DocumentMime;
}>;

export type OpaqueDocumentByteSeal = object;

export type SealedDocumentScan = Readonly<{
  seal: OpaqueDocumentByteSeal;
  report: HostileFileReport;
  facts: SealedByteIdentity;
}>;

export type SealedScanInput = Readonly<{
  intentRef: string;
  sourceBucket: string;
  sourceObjectKey: string;
  targetBucket: string;
  targetObjectKey: string;
  declaredMime: DocumentMime;
}>;

export type SealedPromotionInput = Readonly<{
  seal: OpaqueDocumentByteSeal;
  intentRef: string;
  sourceBucket: string;
  sourceObjectKey: string;
  targetBucket: string;
  targetObjectKey: string;
}>;

export type SealedPromotionOutcome =
  | "RECORDS_WRITTEN"
  | "NO_WRITE"
  | "WRITE_UNCERTAIN";

export interface DrsDocumentSealedScannerRuntime extends DocumentScannerPort {
  scanSealed(input: SealedScanInput): Promise<SealedDocumentScan | null>;
  promoteSealed(input: SealedPromotionInput): Promise<SealedPromotionOutcome>;
}

export type DrsDocumentScannerRuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: typeof fetch;
  crypto?: Crypto;
  timeoutMs?: number;
}>;

type PrivateSealState = {
  readonly input: SealedScanInput;
  readonly bytes: Uint8Array;
  readonly identity: SealedByteIdentity;
  used: boolean;
};

function readEnvironment(
  explicit: RuntimeEnvironment | undefined,
  name: string,
): string | undefined {
  try {
    if (explicit) return explicit.get(name);
    const runtime = globalThis as typeof globalThis & {
      Deno?: { env?: RuntimeEnvironment };
    };
    return runtime.Deno?.env?.get(name);
  } catch {
    return undefined;
  }
}

function printableSecret(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 &&
    value.length <= 4096 &&
    Array.from(value).every((character) => {
      const code = character.charCodeAt(0);
      return code >= 33 && code <= 126;
    });
}

function exactSupabaseOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const loopback = url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "[::1]");
    if (
      url.origin !== value || url.username || url.password || url.search ||
      url.hash || (url.protocol !== "https:" && !loopback)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

function exactScannerUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "http:" || url.hostname !== "127.0.0.1" ||
      !url.port || Number(url.port) < 1 || Number(url.port) > 65_535 ||
      url.pathname !== "/v1/scan" || url.search || url.hash || url.username ||
      url.password || url.href !== value
    ) return null;
    return value;
  } catch {
    return null;
  }
}

function validObjectKey(value: unknown): value is string {
  return typeof value === "string" && OBJECT_KEY.test(value) &&
    !value.includes("//") &&
    !value.split("/").some((part) => part === "." || part === "..");
}

function encodeObjectKey(value: string): string {
  if (!validObjectKey(value)) throw new TypeError("INVALID_OBJECT_KEY");
  return value.split("/").map(encodeURIComponent).join("/");
}

function mimeFromBytes(bytes: Uint8Array): DocumentMime | null {
  if (
    bytes.byteLength >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 &&
    bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
  ) return "application/pdf";
  if (
    bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";
  if (
    bytes.byteLength >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 &&
    bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d &&
    bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  return null;
}

function extensionMatches(value: string, mime: DocumentMime): boolean {
  const extension = value.split(".").at(-1)?.toLowerCase();
  return mime === "application/pdf"
    ? extension === "pdf"
    : mime === "image/jpeg"
    ? extension === "jpg" || extension === "jpeg"
    : extension === "png";
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(
    new Uint8Array(bytes),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

async function readBounded(
  response: Response,
  maximumBytes: number,
  signal?: AbortSignal,
): Promise<Uint8Array | null> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    if (
      !/^(?:0|[1-9]\d*)$/u.test(declared) || Number(declared) > maximumBytes
    ) {
      try {
        await response.body?.cancel();
      } catch { /* already failed closed */ }
      return null;
    }
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let interrupted = signal?.aborted ?? false;
  let cancellation = Promise.resolve();
  const abort = () => {
    interrupted = true;
    cancellation = reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", abort, { once: true });
  if (interrupted) abort();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (interrupted) return null;
      if (done) break;
      if (!(value instanceof Uint8Array) || value.byteLength === 0) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      if (total + value.byteLength > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      total += value.byteLength;
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  } finally {
    signal?.removeEventListener("abort", abort);
    await cancellation;
    reader.releaseLock();
  }
  if (
    interrupted || total < 1 ||
    (declared !== null && Number(declared) !== total)
  ) {
    return null;
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function ownRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ? value as Record<string, unknown>
    : null;
}

function exactReport(value: unknown): HostileFileReport | null {
  const candidate = ownRecord(value);
  if (!candidate) return null;
  const keys = Object.keys(candidate).sort();
  if (
    keys.length !== REPORT_KEYS.length ||
    !REPORT_KEYS.every((key, index) => key === keys[index]) ||
    !DOCUMENT_LIMITS.allowedMime.includes(
      candidate.declaredMime as DocumentMime,
    ) ||
    !DOCUMENT_LIMITS.allowedMime.includes(
      candidate.detectedMime as DocumentMime,
    ) ||
    !["pdf", "jpg", "jpeg", "png"].includes(String(candidate.extension)) ||
    !Number.isFinite(candidate.decodedBytes) ||
    !Number.isFinite(candidate.cpuMs) ||
    !Number.isFinite(candidate.wallMs) ||
    !Number.isFinite(candidate.rssBytes) ||
    !Number.isSafeInteger(candidate.indirectObjects) ||
    !Number.isSafeInteger(candidate.maxReferenceDepth) ||
    !(candidate.pageCount === null ||
      Number.isSafeInteger(candidate.pageCount)) ||
    !(candidate.megapixels === null || Number.isFinite(candidate.megapixels)) ||
    !["PASS", "REJECTED", "AMBIGUOUS", "TIMEOUT"].includes(
      String(candidate.structuralState),
    ) ||
    !Array.isArray(candidate.activeFeatures) ||
    !candidate.activeFeatures.every((entry) => typeof entry === "string") ||
    !["CLEAN", "INFECTED", "UNKNOWN", "TIMEOUT"].includes(
      String(candidate.malwareState),
    )
  ) return null;
  return Object.freeze({
    declaredMime: candidate.declaredMime as DocumentMime,
    detectedMime: candidate.detectedMime as DocumentMime,
    extension: candidate.extension as "pdf" | "jpg" | "jpeg" | "png",
    decodedBytes: candidate.decodedBytes as number,
    pageCount: candidate.pageCount as number | null,
    megapixels: candidate.megapixels as number | null,
    cpuMs: candidate.cpuMs as number,
    wallMs: candidate.wallMs as number,
    rssBytes: candidate.rssBytes as number,
    indirectObjects: candidate.indirectObjects as number,
    maxReferenceDepth: candidate.maxReferenceDepth as number,
    structuralState: candidate
      .structuralState as HostileFileReport["structuralState"],
    activeFeatures: Object.freeze([...(candidate.activeFeatures as string[])]),
    malwareState: candidate.malwareState as HostileFileReport["malwareState"],
  });
}

function exactInput(input: SealedScanInput): boolean {
  const keys = Object.keys(input).sort();
  return keys.join("|") ===
      "declaredMime|intentRef|sourceBucket|sourceObjectKey|targetBucket|targetObjectKey" &&
    isOpaqueRef(input.intentRef) && input.intentRef.startsWith("int_") &&
    input.sourceBucket === INTAKE_BUCKET &&
    input.targetBucket === RECORDS_BUCKET &&
    validObjectKey(input.sourceObjectKey) &&
    validObjectKey(input.targetObjectKey) &&
    DOCUMENT_LIMITS.allowedMime.includes(input.declaredMime) &&
    extensionMatches(input.sourceObjectKey, input.declaredMime) &&
    extensionMatches(input.targetObjectKey, input.declaredMime);
}

function samePromotionInput(
  candidate: SealedPromotionInput,
  expected: SealedScanInput,
): boolean {
  const keys = Object.keys(candidate).sort();
  return keys.join("|") ===
      "intentRef|seal|sourceBucket|sourceObjectKey|targetBucket|targetObjectKey" &&
    candidate.intentRef === expected.intentRef &&
    candidate.sourceBucket === expected.sourceBucket &&
    candidate.sourceObjectKey === expected.sourceObjectKey &&
    candidate.targetBucket === expected.targetBucket &&
    candidate.targetObjectKey === expected.targetObjectKey;
}

function unavailable(): DrsDocumentSealedScannerRuntime {
  return Object.freeze({
    runtimeAvailable: false,
    scan: () => Promise.resolve(null),
    scanSealed: () => Promise.resolve(null),
    promoteSealed: () => Promise.resolve("NO_WRITE" as const),
  });
}

export function createDrsDocumentScannerRuntime(
  options: DrsDocumentScannerRuntimeOptions = {},
): DrsDocumentSealedScannerRuntime {
  try {
    const supabaseOrigin = exactSupabaseOrigin(
      readEnvironment(options.env, "SUPABASE_URL"),
    );
    const serviceRoleKey = readEnvironment(
      options.env,
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    const scannerUrl = exactScannerUrl(
      readEnvironment(options.env, "LAIBE_DRS_DOCUMENT_SCANNER_URL"),
    );
    const scannerToken = readEnvironment(
      options.env,
      "LAIBE_DRS_DOCUMENT_SCANNER_TOKEN",
    );
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    const cryptoImplementation = options.crypto ?? globalThis.crypto;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (
      !supabaseOrigin || !printableSecret(serviceRoleKey) || !scannerUrl ||
      !printableSecret(scannerToken) ||
      typeof fetchImplementation !== "function" ||
      !cryptoImplementation?.subtle || !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 || timeoutMs > 15_000
    ) return unavailable();
    const serviceRoleCredential = serviceRoleKey as string;
    const scannerEndpoint = scannerUrl as string;

    const privateSeals = new WeakMap<object, PrivateSealState>();

    const boundedFetch = async (
      input: string,
      init: RequestInit,
    ): Promise<
      Readonly<{
        response: Response;
        signal: AbortSignal;
        release: () => void;
      }> | null
    > => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const external = init.signal;
      const abort = () => controller.abort();
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        clearTimeout(timer);
        external?.removeEventListener("abort", abort);
      };
      external?.addEventListener("abort", abort, { once: true });
      try {
        const response = await fetchImplementation(input, {
          ...init,
          redirect: "error",
          signal: controller.signal,
        });
        if (response.redirected) {
          await response.body?.cancel().catch(() => undefined);
          release();
          return null;
        }
        return Object.freeze({ response, signal: controller.signal, release });
      } catch {
        release();
        return null;
      }
    };

    const scanSealed = async (
      input: SealedScanInput,
    ): Promise<SealedDocumentScan | null> => {
      if (!exactInput(input)) return null;
      const encoded = encodeObjectKey(input.sourceObjectKey);
      const sourceFetch = await boundedFetch(
        `${supabaseOrigin}/storage/v1/object/authenticated/${INTAKE_BUCKET}/${encoded}`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${serviceRoleCredential}`,
            apikey: serviceRoleCredential,
          },
        },
      );
      if (!sourceFetch) return null;
      const source = sourceFetch.response;
      let bytes: Uint8Array | null;
      try {
        if (!source.ok) {
          await source.body?.cancel().catch(() => undefined);
          return null;
        }
        bytes = await readBounded(
          source,
          DOCUMENT_LIMITS.maxFileBytes,
          sourceFetch.signal,
        );
      } finally {
        sourceFetch.release();
      }
      if (!bytes) return null;
      const detectedMime = mimeFromBytes(bytes);
      const reportedMime = source.headers.get("content-type")?.split(";", 1)[0]
        ?.trim().toLowerCase();
      if (
        !detectedMime || detectedMime !== input.declaredMime ||
        reportedMime !== detectedMime ||
        !extensionMatches(input.sourceObjectKey, detectedMime)
      ) return null;
      const digestInput = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const sha256 = hex(
        await cryptoImplementation.subtle.digest("SHA-256", digestInput),
      );
      if (!SHA256.test(sha256)) return null;
      const scannerFetch = await boundedFetch(scannerEndpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${scannerToken}`,
          "content-type": detectedMime,
          "x-laibe-content-sha256": sha256,
          "x-laibe-content-length": String(bytes.byteLength),
        },
        body: bytes.slice(),
      });
      if (!scannerFetch) return null;
      const scanner = scannerFetch.response;
      let responseBytes: Uint8Array | null;
      try {
        if (
          !scanner.ok ||
          scanner.headers.get("content-type")?.split(";", 1)[0]?.trim()
              .toLowerCase() !== "application/json"
        ) {
          await scanner.body?.cancel().catch(() => undefined);
          return null;
        }
        responseBytes = await readBounded(
          scanner,
          MAX_SCANNER_RESPONSE_BYTES,
          scannerFetch.signal,
        );
      } finally {
        scannerFetch.release();
      }
      if (!responseBytes) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(responseBytes),
        );
      } catch {
        return null;
      }
      const report = exactReport(parsed);
      if (
        !report || report.declaredMime !== input.declaredMime ||
        report.detectedMime !== detectedMime ||
        !extensionMatches(input.sourceObjectKey, report.detectedMime)
      ) return null;
      const identity = Object.freeze({
        sha256,
        sizeBytes: bytes.byteLength,
        detectedMime,
        validatedMime: report.detectedMime,
      });
      const seal = Object.freeze(function documentByteSeal() {});
      privateSeals.set(seal, {
        input: Object.freeze({ ...input }),
        bytes: bytes.slice(),
        identity,
        used: false,
      });
      return Object.freeze({ seal, report, facts: identity });
    };

    const promoteSealed = async (
      input: SealedPromotionInput,
    ): Promise<SealedPromotionOutcome> => {
      if (
        !input ||
        (typeof input.seal !== "object" && typeof input.seal !== "function")
      ) {
        return "NO_WRITE";
      }
      const state = privateSeals.get(input.seal);
      if (!state || state.used || !samePromotionInput(input, state.input)) {
        return "NO_WRITE";
      }
      state.used = true;
      privateSeals.delete(input.seal);
      let encoded: string;
      try {
        encoded = encodeObjectKey(input.targetObjectKey);
      } catch {
        return "NO_WRITE";
      }
      const recordsFetch = await boundedFetch(
        `${supabaseOrigin}/storage/v1/object/${RECORDS_BUCKET}/${encoded}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${serviceRoleCredential}`,
            apikey: serviceRoleCredential,
            "content-type": state.identity.validatedMime,
            "x-upsert": "false",
          },
          body: state.bytes.slice(),
        },
      );
      if (!recordsFetch) return "WRITE_UNCERTAIN";
      try {
        const written = recordsFetch.response.ok;
        await recordsFetch.response.body?.cancel().catch(() => undefined);
        return written ? "RECORDS_WRITTEN" : "WRITE_UNCERTAIN";
      } finally {
        recordsFetch.release();
      }
    };

    return Object.freeze({
      runtimeAvailable: true,
      scan: () => Promise.resolve(null),
      scanSealed,
      promoteSealed,
    });
  } catch {
    return unavailable();
  }
}
