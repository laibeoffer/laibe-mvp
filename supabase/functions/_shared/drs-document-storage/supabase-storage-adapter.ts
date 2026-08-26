import { readRuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  DOCUMENT_LIMITS,
  type DocumentMime,
  INTAKE_BUCKET,
  isSha256,
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

function exactInteger(value: string | null): number | null {
  if (value === null || !/^(?:0|[1-9]\d*)$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
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
            !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>).signedURL
          : null;
        if (
          typeof signed !== "string" || signed.length < 1 ||
          signed.length > 4096
        ) {
          return null;
        }
        const signedUrl = new URL(signed, `${supabaseUrl}/storage/v1/`);
        if (signedUrl.origin !== new URL(supabaseUrl!).origin) return null;
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
          { method: "HEAD", headers: headers() },
        );
        if (!response.ok) return null;
        const sizeBytes = exactInteger(response.headers.get("content-length"));
        const detectedMime = mime(response.headers.get("content-type"));
        const sha256 = response.headers.get("x-laibe-sha256");
        if (
          sizeBytes === null || sizeBytes < 1 ||
          sizeBytes > DOCUMENT_LIMITS.maxFileBytes || !detectedMime ||
          !isSha256(sha256)
        ) return null;
        return Object.freeze({
          bucket: input.bucket,
          objectKey: input.objectKey,
          sha256,
          sizeBytes,
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
