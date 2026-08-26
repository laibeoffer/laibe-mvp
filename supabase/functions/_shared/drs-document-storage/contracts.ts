export const UPLOAD_INTENT_REQUEST_SCHEMA =
  "laibe.drs-document-upload-intent.request.v1" as const;
export const FINALIZE_REQUEST_SCHEMA =
  "laibe.drs-document-upload-finalize.request.v1" as const;
export const SNAPSHOT_REQUEST_SCHEMA =
  "laibe.drs-document-snapshot.request.v1" as const;

export const DOCUMENT_LIMITS = Object.freeze({
  maxFileBytes: 26_214_400,
  maxBatchFiles: 10,
  maxBatchBytes: 104_857_600,
  maxPdfPages: 500,
  maxImageMegapixels: 40,
  allowedMime: Object.freeze(
    [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ] as const,
  ),
});

export const INTAKE_BUCKET = "drs-case-intake-private" as const;
export const RECORDS_BUCKET = "drs-case-records-private" as const;

export type DocumentMime = typeof DOCUMENT_LIMITS.allowedMime[number];
export type DocumentKind =
  | "drawing"
  | "quote"
  | "contract"
  | "photo"
  | "drs_review"
  | "other_case_evidence";
export type SnapshotPurpose =
  | "REVIEW_SUBMISSION"
  | "DECISION_BASIS"
  | "FORMAL_RECEIPT";

export type UploadIntentRequest = Readonly<{
  schemaVersion: typeof UPLOAD_INTENT_REQUEST_SCHEMA;
  mode: "NEW_DOCUMENT" | "NEW_VERSION";
  documentRef?: string;
  documentKind: DocumentKind;
  originalFilename: string;
  declaredMime: DocumentMime;
  declaredSizeBytes: number;
  declaredSha256: string;
}>;

export type FinalizeRequest = Readonly<{
  schemaVersion: typeof FINALIZE_REQUEST_SCHEMA;
  intentRef: string;
  idempotencyKey: string;
}>;

export type SnapshotRequest = Readonly<{
  schemaVersion: typeof SNAPSHOT_REQUEST_SCHEMA;
  purpose: SnapshotPurpose;
  versionRefs: readonly string[];
  idempotencyKey: string;
}>;

export type DownloadRequest = Readonly<{ versionRef: string }>;
export type DocumentRequest =
  | UploadIntentRequest
  | FinalizeRequest
  | SnapshotRequest
  | DownloadRequest;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OPAQUE_REF = /^(?:doc|dvr|int|snp|rcp)_[0-9a-z]{20,40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const IDEMPOTENCY = /^[^\s\p{C}]{16,128}$/u;
const SAFE_FILENAME = /^[^/\\\p{C}]{1,240}$/u;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isOpaqueRef(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_REF.test(value);
}

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && IDEMPOTENCY.test(value);
}

export function readOwn(input: unknown, key: string): unknown {
  if (
    input === null || typeof input !== "object" || Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    !Object.prototype.hasOwnProperty.call(input, key)
  ) return undefined;
  return (input as Record<string, unknown>)[key];
}

function hasExactKeys(input: unknown, expected: readonly string[]): boolean {
  if (
    input === null || typeof input !== "object" || Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) return false;
  const keys = Object.keys(input);
  return keys.length === expected.length &&
    expected.every((key) => keys.includes(key));
}

function extensionForMime(mime: DocumentMime): readonly string[] {
  if (mime === "application/pdf") return ["pdf"];
  if (mime === "image/jpeg") return ["jpg", "jpeg"];
  return ["png"];
}

export function extensionFromFilename(
  filename: string,
  mime: DocumentMime,
): string | null {
  if (
    filename !== filename.trim() || !SAFE_FILENAME.test(filename) ||
    filename === "." || filename === ".."
  ) return null;
  const separator = filename.lastIndexOf(".");
  if (separator <= 0 || separator === filename.length - 1) return null;
  const extension = filename.slice(separator + 1).toLowerCase();
  return extensionForMime(mime).includes(extension) ? extension : null;
}

export function parseUploadIntentRequest(
  input: unknown,
): UploadIntentRequest | null {
  const mode = readOwn(input, "mode");
  const expected = mode === "NEW_VERSION"
    ? [
      "schemaVersion",
      "mode",
      "documentRef",
      "documentKind",
      "originalFilename",
      "declaredMime",
      "declaredSizeBytes",
      "declaredSha256",
    ]
    : [
      "schemaVersion",
      "mode",
      "documentKind",
      "originalFilename",
      "declaredMime",
      "declaredSizeBytes",
      "declaredSha256",
    ];
  if (!hasExactKeys(input, expected)) return null;
  const schemaVersion = readOwn(input, "schemaVersion");
  const documentRef = readOwn(input, "documentRef");
  const documentKind = readOwn(input, "documentKind");
  const originalFilename = readOwn(input, "originalFilename");
  const declaredMime = readOwn(input, "declaredMime");
  const declaredSizeBytes = readOwn(input, "declaredSizeBytes");
  const declaredSha256 = readOwn(input, "declaredSha256");
  if (
    schemaVersion !== UPLOAD_INTENT_REQUEST_SCHEMA ||
    (mode !== "NEW_DOCUMENT" && mode !== "NEW_VERSION") ||
    (mode === "NEW_VERSION" && !isOpaqueRef(documentRef)) ||
    ![
      "drawing",
      "quote",
      "contract",
      "photo",
      "drs_review",
      "other_case_evidence",
    ].includes(String(documentKind)) ||
    typeof originalFilename !== "string" ||
    !DOCUMENT_LIMITS.allowedMime.includes(declaredMime as DocumentMime) ||
    extensionFromFilename(
        originalFilename,
        declaredMime as DocumentMime,
      ) === null ||
    !Number.isSafeInteger(declaredSizeBytes) ||
    (declaredSizeBytes as number) < 1 ||
    (declaredSizeBytes as number) > DOCUMENT_LIMITS.maxFileBytes ||
    !isSha256(declaredSha256)
  ) return null;
  return Object.freeze({
    schemaVersion,
    mode,
    ...(mode === "NEW_VERSION" ? { documentRef: documentRef as string } : {}),
    documentKind: documentKind as DocumentKind,
    originalFilename,
    declaredMime: declaredMime as DocumentMime,
    declaredSizeBytes: declaredSizeBytes as number,
    declaredSha256,
  });
}

export function parseFinalizeRequest(input: unknown): FinalizeRequest | null {
  if (!hasExactKeys(input, ["schemaVersion", "intentRef", "idempotencyKey"])) {
    return null;
  }
  const schemaVersion = readOwn(input, "schemaVersion");
  const intentRef = readOwn(input, "intentRef");
  const idempotencyKey = readOwn(input, "idempotencyKey");
  if (
    schemaVersion !== FINALIZE_REQUEST_SCHEMA || !isOpaqueRef(intentRef) ||
    !isIdempotencyKey(idempotencyKey)
  ) return null;
  return Object.freeze({ schemaVersion, intentRef, idempotencyKey });
}

export function parseSnapshotRequest(input: unknown): SnapshotRequest | null {
  if (
    !hasExactKeys(input, [
      "schemaVersion",
      "purpose",
      "versionRefs",
      "idempotencyKey",
    ])
  ) return null;
  const schemaVersion = readOwn(input, "schemaVersion");
  const purpose = readOwn(input, "purpose");
  const versionRefs = readOwn(input, "versionRefs");
  const idempotencyKey = readOwn(input, "idempotencyKey");
  if (
    schemaVersion !== SNAPSHOT_REQUEST_SCHEMA ||
    !["REVIEW_SUBMISSION", "DECISION_BASIS", "FORMAL_RECEIPT"].includes(
      String(purpose),
    ) || !Array.isArray(versionRefs) || versionRefs.length < 1 ||
    versionRefs.length > DOCUMENT_LIMITS.maxBatchFiles ||
    versionRefs.some((value) => !isOpaqueRef(value)) ||
    new Set(versionRefs).size !== versionRefs.length ||
    !isIdempotencyKey(idempotencyKey)
  ) return null;
  return Object.freeze({
    schemaVersion,
    purpose: purpose as SnapshotPurpose,
    versionRefs: Object.freeze([...versionRefs]),
    idempotencyKey,
  });
}

export async function sha256Canonical(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class DocumentContractError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "DocumentContractError";
    this.code = code;
    this.status = status;
  }
}
