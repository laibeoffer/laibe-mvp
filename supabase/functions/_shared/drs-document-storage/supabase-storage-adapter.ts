import { readRuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  DOCUMENT_LIMITS,
  type DocumentMime,
  INTAKE_BUCKET,
  isUuid,
  RECORDS_BUCKET,
} from "./contracts.ts";
import type { DocumentStoragePort, StorageObjectFacts } from "./ports.ts";

const EXTENSION = /^(?:pdf|jpg|jpeg|png)$/u;
const OBJECT_PATH = /^[a-z0-9][a-z0-9/_-]{0,511}\.(?:pdf|jpg|jpeg|png)$/u;

export function buildIntakeObjectPath(
  intentId: string,
  objectId: string,
  extension: string,
): string {
  if (!isUuid(intentId) || !isUuid(objectId) || !EXTENSION.test(extension)) {
    throw new TypeError("INVALID_STORAGE_IDENTITY");
  }
  return `intents/${intentId}/${objectId}.${extension}`;
}

export function buildRecordSourcePath(
  caseId: string,
  documentId: string,
  versionId: string,
  extension: string,
): string {
  if (
    !isUuid(caseId) || !isUuid(documentId) || !isUuid(versionId) ||
    !EXTENSION.test(extension)
  ) throw new TypeError("INVALID_STORAGE_IDENTITY");
  return `cases/${caseId}/documents/${documentId}/versions/${versionId}/source.${extension}`;
}

function validBucket(value: string): boolean {
  return value === INTAKE_BUCKET || value === RECORDS_BUCKET;
}

function encodeObjectPath(path: string): string {
  if (!OBJECT_PATH.test(path) || path.includes("//") || path.includes("..")) {
    throw new TypeError("INVALID_STORAGE_IDENTITY");
  }
  return path.split("/").map(encodeURIComponent).join("/");
}

function mime(value: string | null): DocumentMime | null {
  const normalized = value?.split(";", 1)[0].trim().toLowerCase();
  return DOCUMENT_LIMITS.allowedMime.includes(normalized as DocumentMime)
    ? normalized as DocumentMime
    : null;
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

function mimeFromBytes(bytes: Uint8Array): DocumentMime | null {
  if (
    bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 &&
    bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
  ) return "application/pdf";
  if (
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) =>
      bytes[index] === value
    )
  ) return "image/png";
  return null;
}

function objectExtensionMatches(
  path: string,
  detectedMime: DocumentMime,
): boolean {
  const extension = path.slice(path.lastIndexOf(".") + 1);
  return detectedMime === "application/pdf"
    ? extension === "pdf"
    : detectedMime === "image/jpeg"
    ? extension === "jpg" || extension === "jpeg"
    : extension === "png";
}

async function readBoundedObject(
  response: Response,
): Promise<Uint8Array | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (
        !(value instanceof Uint8Array) ||
        total + value.byteLength > DOCUMENT_LIMITS.maxFileBytes
      ) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } catch {
    try {
      await reader.cancel();
    } catch {
      // Fail closed even when the provider cannot acknowledge cancellation.
    }
    return null;
  } finally {
    reader.releaseLock();
  }
  if (total < 1) return null;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function createSupabaseDocumentStoragePort(
  options: Readonly<{
    env?: Readonly<{ get(name: string): string | undefined }>;
    fetch?: typeof fetch;
    now?: () => Date;
  }> = {},
): DocumentStoragePort {
  const supabaseUrl = readRuntimeEnvironment(options.env, "SUPABASE_URL")
    ?.replace(/\/+$/u, "");
  const serviceRoleKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const now = options.now ?? (() => new Date());
  const runtimeAvailable = Boolean(
    supabaseUrl && serviceRoleKey && typeof fetchImplementation === "function",
  );

  function headers(extra: Record<string, string> = {}): Headers {
    return new Headers({
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey ?? "",
      ...extra,
    });
  }

  return Object.freeze({
    runtimeAvailable,
    async createSignedUpload(
      input: Readonly<{
        bucket: string;
        objectKey: string;
        mime: DocumentMime;
      }>,
    ) {
      if (
        !runtimeAvailable || input.bucket !== INTAKE_BUCKET ||
        !DOCUMENT_LIMITS.allowedMime.includes(input.mime)
      ) return null;
      let path: string;
      try {
        path = encodeObjectPath(input.objectKey);
      } catch {
        return null;
      }
      try {
        const response = await fetchImplementation!(
          `${supabaseUrl}/storage/v1/object/upload/sign/${input.bucket}/${path}`,
          {
            method: "POST",
            headers: headers({ "content-type": "application/json" }),
            body: JSON.stringify({ upsert: false }),
          },
        );
        if (!response.ok) return null;
        const candidate = await response.json();
        const signed = candidate && typeof candidate === "object" &&
            !Array.isArray(candidate) &&
            Object.prototype.hasOwnProperty.call(candidate, "url")
          ? (candidate as Record<string, unknown>).url
          : null;
        if (
          typeof signed !== "string" || signed.length < 1 ||
          signed.length > 4096
        ) {
          return null;
        }
        if (!signed.startsWith("/object/upload/sign/")) return null;
        const signedUrl = new URL(`/storage/v1${signed}`, supabaseUrl);
        const expectedPath =
          `/storage/v1/object/upload/sign/${input.bucket}/${path}`;
        if (
          signedUrl.origin !== new URL(supabaseUrl!).origin ||
          signedUrl.pathname !== expectedPath || signedUrl.username ||
          signedUrl.password || signedUrl.hash ||
          [...signedUrl.searchParams.keys()].some((key) => key !== "token") ||
          signedUrl.searchParams.getAll("token").length !== 1 ||
          !signedUrl.searchParams.get("token")
        ) return null;
        const issuedAt = now();
        if (!Number.isFinite(issuedAt.getTime())) return null;
        return Object.freeze({
          signedUploadUrl: signedUrl.toString(),
          nativeExpiresAt: new Date(issuedAt.getTime() + 2 * 60 * 60 * 1000)
            .toISOString(),
          requiredHeaders: Object.freeze({ "content-type": input.mime }),
        });
      } catch {
        return null;
      }
    },
    async inspect(
      input: Readonly<{
        bucket: string;
        objectKey: string;
      }>,
    ): Promise<StorageObjectFacts | null> {
      if (!runtimeAvailable || !validBucket(input.bucket)) return null;
      let path: string;
      try {
        path = encodeObjectPath(input.objectKey);
      } catch {
        return null;
      }
      try {
        const response = await fetchImplementation!(
          `${supabaseUrl}/storage/v1/object/authenticated/${input.bucket}/${path}`,
          { method: "GET", headers: headers() },
        );
        if (!response.ok) return null;
        const bytes = await readBoundedObject(response);
        if (!bytes) return null;
        const detectedMime = mimeFromBytes(bytes);
        const reportedMime = mime(response.headers.get("content-type"));
        if (
          !detectedMime || reportedMime !== detectedMime ||
          !objectExtensionMatches(input.objectKey, detectedMime)
        ) return null;
        const digestInput = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        const sha256 = hex(await crypto.subtle.digest("SHA-256", digestInput));
        return Object.freeze({
          bucket: input.bucket,
          objectKey: input.objectKey,
          sha256,
          sizeBytes: bytes.byteLength,
          detectedMime,
        });
      } catch {
        return null;
      }
    },
    async promote(
      input: Readonly<{
        sourceBucket: string;
        sourceObjectKey: string;
        targetBucket: string;
        targetObjectKey: string;
      }>,
    ) {
      if (
        !runtimeAvailable || input.sourceBucket !== INTAKE_BUCKET ||
        input.targetBucket !== RECORDS_BUCKET
      ) return false;
      try {
        encodeObjectPath(input.sourceObjectKey);
        encodeObjectPath(input.targetObjectKey);
        const response = await fetchImplementation!(
          `${supabaseUrl}/storage/v1/object/copy`,
          {
            method: "POST",
            headers: headers({ "content-type": "application/json" }),
            body: JSON.stringify({
              bucketId: input.sourceBucket,
              sourceKey: input.sourceObjectKey,
              destinationBucket: input.targetBucket,
              destinationKey: input.targetObjectKey,
              upsert: false,
            }),
          },
        );
        return response.ok;
      } catch {
        return false;
      }
    },
    async download(
      input: Readonly<{
        bucket: string;
        objectKey: string;
      }>,
    ) {
      if (!runtimeAvailable || input.bucket !== RECORDS_BUCKET) return null;
      let path: string;
      try {
        path = encodeObjectPath(input.objectKey);
      } catch {
        return null;
      }
      try {
        const response = await fetchImplementation!(
          `${supabaseUrl}/storage/v1/object/authenticated/${input.bucket}/${path}`,
          { method: "GET", headers: headers() },
        );
        return response.ok && response.body !== null ? response : null;
      } catch {
        return null;
      }
    },
  });
}
