import {
  type DownloadRequest,
  extensionFromFilename,
  type FinalizeRequest,
  INTAKE_BUCKET,
  isOpaqueRef,
  isSha256,
  isUuid,
  readOwn,
  RECORDS_BUCKET,
  sha256Canonical,
  type SnapshotRequest,
  type UploadIntentRequest,
} from "./contracts.ts";
import { createDocumentAuthorityResolver } from "./authority.ts";
import type {
  DocumentAuthorityPort,
  DocumentModeAPrincipal,
  DocumentRepositoryPort,
  DocumentScannerPort,
  DocumentStoragePort,
} from "./ports.ts";
import {
  documentJsonResponse,
  documentPreflight,
  type DocumentRoute,
  hasDisallowedDocumentOrigin,
  readDocumentRequest,
} from "./request-guard.ts";
import { createSupabaseDocumentRepository } from "./supabase-document-adapter.ts";
import {
  buildIntakeObjectPath,
  createSupabaseDocumentStoragePort,
} from "./supabase-storage-adapter.ts";
import { evaluateHostileFileReport } from "./validation.ts";

export type DocumentStorageService = ReturnType<
  typeof createDocumentStorageService
>;

export type DocumentEdgeDependencies = Readonly<{
  allowedOrigins: readonly string[];
  authority: DocumentAuthorityPort;
  service: DocumentStorageService;
}>;

function uuid(): string {
  return crypto.randomUUID();
}

function opaque(
  prefix: "doc" | "dvr" | "int" | "snp" | "rcp",
  id: string,
): string {
  return `${prefix}_${id.replaceAll("-", "")}`;
}

function record(candidate: unknown): Record<string, unknown> | null {
  return candidate !== null && typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      Object.getPrototypeOf(candidate) === Object.prototype
    ? candidate as Record<string, unknown>
    : null;
}

function logicalConflict(
  candidate: Record<string, unknown> | null,
): "IDEMPOTENCY_CONFLICT" | "VERSION_CONFLICT" | null {
  const state = readOwn(candidate, "state");
  return readOwn(candidate, "ok") === false &&
      (state === "IDEMPOTENCY_CONFLICT" || state === "VERSION_CONFLICT")
    ? state
    : null;
}

function conflictResponse(
  schemaVersion: string,
  state: "IDEMPOTENCY_CONFLICT" | "VERSION_CONFLICT",
): Readonly<Record<string, unknown>> {
  return Object.freeze({ schemaVersion, state });
}

function exactRef(value: unknown, prefix: string): value is string {
  return isOpaqueRef(value) && value.startsWith(`${prefix}_`);
}

function hasExactRecordKeys(
  candidate: Record<string, unknown> | null,
  expected: readonly string[],
): candidate is Record<string, unknown> {
  if (!candidate) return false;
  const keys = Object.keys(candidate);
  return keys.length === expected.length &&
    expected.every((key) => keys.includes(key));
}

export function createDocumentStorageService(
  dependencies: Readonly<{
    repository: DocumentRepositoryPort;
    storage: DocumentStoragePort;
    scanner: DocumentScannerPort;
    now?: () => Date;
    randomUuid?: () => string;
  }>,
) {
  const now = dependencies.now ?? (() => new Date());
  const randomUuid = dependencies.randomUuid ?? uuid;

  async function queuePromotedOrphan(
    principal: DocumentModeAPrincipal,
    intentRef: string,
    recordsObjectKey: string,
  ): Promise<void> {
    let durable = false;
    try {
      const queued = record(
        await dependencies.repository.queueOrphanCleanup({
          principal,
          intentRef,
          recordsBucket: RECORDS_BUCKET,
          recordsObjectKey,
        }),
      );
      durable = hasExactRecordKeys(
        queued,
        ["ok", "state", "work_item_id"],
      ) && readOwn(queued, "ok") === true &&
        readOwn(queued, "state") === "ORPHAN_CLEANUP_QUEUED" &&
        isUuid(readOwn(queued, "work_item_id"));
    } catch { /* closed below */ }
    if (!durable) throw new Error("ORPHAN_DURABILITY_UNAVAILABLE");
  }

  async function createUploadIntent(
    principal: DocumentModeAPrincipal,
    request: UploadIntentRequest,
  ): Promise<Readonly<Record<string, unknown>> | null> {
    if (
      !dependencies.repository.runtimeAvailable ||
      !dependencies.storage.runtimeAvailable
    ) {
      return null;
    }
    const issuedAt = now();
    if (!Number.isFinite(issuedAt.getTime())) return null;
    const extension = extensionFromFilename(
      request.originalFilename,
      request.declaredMime,
    );
    if (!extension) return null;
    const intentId = randomUuid();
    const objectId = randomUuid();
    const intentRef = opaque("int", intentId);
    const objectKey = buildIntakeObjectPath(intentId, objectId, extension);
    const resource = Object.freeze({
      schemaVersion: "laibe.drs-document-upload-intent.internal.v1",
      intentRef,
      intentId,
      objectId,
      objectKey,
      mode: request.mode,
      ...(request.documentRef ? { documentRef: request.documentRef } : {}),
      documentKind: request.documentKind,
      originalFilename: request.originalFilename,
      declaredMime: request.declaredMime,
      declaredSizeBytes: request.declaredSizeBytes,
      declaredSha256: request.declaredSha256,
      expiresAt: new Date(issuedAt.getTime() + 15 * 60 * 1000).toISOString(),
    });
    const resourceRef = JSON.stringify(resource);
    const payloadSha256 = await sha256Canonical(resource);
    const stored = record(
      await dependencies.repository.execute({
        principal,
        operation: "CREATE_UPLOAD_INTENT",
        resourceRef,
        idempotencyKey: intentRef,
        expectedPayloadSha256: payloadSha256,
      }),
    );
    if (
      readOwn(stored, "ok") !== true ||
      readOwn(stored, "state") !== "UPLOAD_INTENT_CREATED" ||
      readOwn(stored, "intent_ref") !== intentRef
    ) return null;
    const signed = await dependencies.storage.createSignedUpload({
      bucket: INTAKE_BUCKET,
      objectKey,
      mime: request.declaredMime,
    });
    if (!signed) return null;
    return Object.freeze({
      schemaVersion: "laibe.drs-document-upload-intent.response.v1",
      state: "UPLOAD_INTENT_CREATED",
      intentRef,
      intentExpiresAt: resource.expiresAt,
      upload: Object.freeze({ method: "SIGNED_UPLOAD", ...signed }),
      limits: Object.freeze({
        maxBytes: 26_214_400,
        allowedMime: Object.freeze([
          "application/pdf",
          "image/jpeg",
          "image/png",
        ]),
      }),
    });
  }

  async function finalizeUpload(
    principal: DocumentModeAPrincipal,
    request: FinalizeRequest,
  ): Promise<Readonly<Record<string, unknown>> | null> {
    if (
      !dependencies.repository.runtimeAvailable ||
      !dependencies.storage.runtimeAvailable
    ) {
      return null;
    }
    const requestHash = await sha256Canonical(request);
    const plan = record(
      await dependencies.repository.execute({
        principal,
        operation: "FINALIZE_UPLOAD",
        resourceRef: request.intentRef,
        idempotencyKey: request.idempotencyKey,
        expectedPayloadSha256: requestHash,
      }),
    );
    if (!plan) return null;
    const planConflict = logicalConflict(plan);
    if (planConflict) {
      return conflictResponse(
        "laibe.drs-document-upload-finalize.response.v1",
        planConflict,
      );
    }
    const planDocumentRef = readOwn(plan, "document_ref");
    const planVersionRef = readOwn(plan, "version_ref");
    const planReceiptRef = readOwn(plan, "receipt_ref");
    if (
      readOwn(plan, "ok") === true &&
      readOwn(plan, "state") === "FORMAL_VERSION_CREATED" &&
      exactRef(planDocumentRef, "doc") && exactRef(planVersionRef, "dvr") &&
      exactRef(planReceiptRef, "rcp")
    ) {
      return Object.freeze({
        schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
        state: "FORMAL_VERSION_CREATED",
        documentRef: planDocumentRef,
        versionRef: planVersionRef,
        receiptRef: planReceiptRef,
      });
    }
    if (
      readOwn(plan, "ok") !== true ||
      readOwn(plan, "state") !== "VALIDATION_REQUIRED" ||
      readOwn(plan, "intake_bucket") !== INTAKE_BUCKET ||
      readOwn(plan, "records_bucket") !== RECORDS_BUCKET
    ) return null;
    if (!dependencies.scanner.runtimeAvailable) {
      return Object.freeze({
        schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
        state: "VALIDATION_PENDING",
        intentRef: request.intentRef,
      });
    }
    const intakeKey = readOwn(plan, "intake_object_key");
    const recordsKey = readOwn(plan, "records_object_key");
    const declaredMime = readOwn(plan, "declared_mime");
    if (
      typeof intakeKey !== "string" || typeof recordsKey !== "string" ||
      !["application/pdf", "image/jpeg", "image/png"].includes(
        String(declaredMime),
      )
    ) return null;
    const intake = await dependencies.storage.inspect({
      bucket: INTAKE_BUCKET,
      objectKey: intakeKey,
    });
    if (!intake) return null;
    const scan = await dependencies.scanner.scan({
      bucket: INTAKE_BUCKET,
      objectKey: intakeKey,
      declaredMime: declaredMime as typeof intake.detectedMime,
    });
    const intakeFilename = intakeKey.split("/").at(-1) ?? "";
    if (
      !scan || evaluateHostileFileReport(scan).state !== "CLEAN" ||
      scan.declaredMime !== declaredMime ||
      scan.detectedMime !== intake.detectedMime ||
      extensionFromFilename(intakeFilename, intake.detectedMime) !==
        scan.extension
    ) {
      return Object.freeze({
        schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
        state: "VALIDATION_PENDING",
        intentRef: request.intentRef,
      });
    }
    const promoted = await dependencies.storage.promote({
      sourceBucket: INTAKE_BUCKET,
      sourceObjectKey: intakeKey,
      targetBucket: RECORDS_BUCKET,
      targetObjectKey: recordsKey,
    });
    if (!promoted) return null;
    const records = await dependencies.storage.inspect({
      bucket: RECORDS_BUCKET,
      objectKey: recordsKey,
    });
    if (
      !records || records.sha256 !== intake.sha256 ||
      records.sizeBytes !== intake.sizeBytes ||
      records.detectedMime !== intake.detectedMime
    ) {
      await queuePromotedOrphan(principal, request.intentRef, recordsKey);
      return null;
    }
    const finalizeResource = Object.freeze({
      schemaVersion: "laibe.drs-document-finalize.internal.v1",
      intentRef: request.intentRef,
      recordsBucket: RECORDS_BUCKET,
      recordsObjectKey: recordsKey,
      verifiedSha256: records.sha256,
      verifiedSizeBytes: records.sizeBytes,
      detectedMime: records.detectedMime,
      requestPayloadSha256: requestHash,
    });
    const finalized = record(
      await dependencies.repository.execute({
        principal,
        operation: "FINALIZE_UPLOAD",
        resourceRef: JSON.stringify(finalizeResource),
        idempotencyKey: request.idempotencyKey,
        expectedPayloadSha256: await sha256Canonical(finalizeResource),
      }),
    );
    const finalizeConflict = logicalConflict(finalized);
    if (finalizeConflict) {
      await queuePromotedOrphan(principal, request.intentRef, recordsKey);
      return conflictResponse(
        "laibe.drs-document-upload-finalize.response.v1",
        finalizeConflict,
      );
    }
    const documentRef = readOwn(finalized, "document_ref");
    const versionRef = readOwn(finalized, "version_ref");
    const receiptRef = readOwn(finalized, "receipt_ref");
    if (
      readOwn(finalized, "ok") !== true ||
      readOwn(finalized, "state") !== "FORMAL_VERSION_CREATED" ||
      !exactRef(documentRef, "doc") || !exactRef(versionRef, "dvr") ||
      !exactRef(receiptRef, "rcp")
    ) {
      await queuePromotedOrphan(principal, request.intentRef, recordsKey);
      return null;
    }
    return Object.freeze({
      schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
      state: "FORMAL_VERSION_CREATED",
      documentRef,
      versionRef,
      receiptRef,
    });
  }

  async function downloadVersion(
    principal: DocumentModeAPrincipal,
    request: DownloadRequest,
  ): Promise<Response | null> {
    const payloadSha256 = await sha256Canonical(request);
    const result = record(
      await dependencies.repository.execute({
        principal,
        operation: "DOWNLOAD_VERSION",
        resourceRef: request.versionRef,
        idempotencyKey: `download-${payloadSha256.slice(0, 40)}`,
        expectedPayloadSha256: payloadSha256,
      }),
    );
    if (
      readOwn(result, "ok") !== true ||
      readOwn(result, "state") !== "DOWNLOAD_READY" ||
      readOwn(result, "bucket_id") !== RECORDS_BUCKET ||
      typeof readOwn(result, "object_key") !== "string"
    ) return null;
    const provider = await dependencies.storage.download({
      bucket: RECORDS_BUCKET,
      objectKey: readOwn(result, "object_key") as string,
    });
    if (!provider?.body) return null;
    return new Response(provider.body, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": "attachment",
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  }

  async function createSnapshot(
    principal: DocumentModeAPrincipal,
    request: SnapshotRequest,
  ): Promise<Readonly<Record<string, unknown>> | null> {
    const resourceRef = JSON.stringify(request);
    const expectedPayloadSha256 = await sha256Canonical(request);
    const result = record(
      await dependencies.repository.execute({
        principal,
        operation: "CREATE_SNAPSHOT",
        resourceRef,
        idempotencyKey: request.idempotencyKey,
        expectedPayloadSha256,
      }),
    );
    const conflict = logicalConflict(result);
    if (conflict) {
      return conflictResponse(
        "laibe.drs-document-snapshot.response.v1",
        conflict,
      );
    }
    if (
      !hasExactRecordKeys(result, [
        "ok",
        "state",
        "snapshot_ref",
        "receipt_ref",
        "canonical_payload_sha256",
      ]) ||
      readOwn(result, "ok") !== true ||
      readOwn(result, "state") !== "SNAPSHOT_RECORDED" ||
      !exactRef(readOwn(result, "snapshot_ref"), "snp") ||
      !exactRef(readOwn(result, "receipt_ref"), "rcp") ||
      !isSha256(readOwn(result, "canonical_payload_sha256"))
    ) return null;
    return Object.freeze({
      schemaVersion: "laibe.drs-document-snapshot.response.v1",
      state: "SNAPSHOT_RECORDED",
      snapshotRef: readOwn(result, "snapshot_ref"),
      receiptRef: readOwn(result, "receipt_ref"),
      canonicalPayloadSha256: readOwn(result, "canonical_payload_sha256"),
    });
  }

  return Object.freeze({
    createUploadIntent,
    finalizeUpload,
    downloadVersion,
    createSnapshot,
  });
}

function runtimeOrigins(): readonly string[] {
  try {
    const raw = Deno.env.get("DRS_DOCUMENT_ALLOWED_ORIGINS") ?? "";
    const origins = raw.split(",").map((value) => value.trim()).filter(Boolean);
    if (
      origins.length === 0 || origins.length > 8 ||
      origins.some((value) => {
        try {
          const url = new URL(value);
          return url.origin !== value || url.protocol !== "https:" ||
            Boolean(url.username || url.password || url.search || url.hash);
        } catch {
          return true;
        }
      })
    ) return Object.freeze([]);
    return Object.freeze([...new Set(origins)]);
  } catch {
    return Object.freeze([]);
  }
}

export function createDefaultDocumentEdgeDependencies(): DocumentEdgeDependencies {
  const repository = createSupabaseDocumentRepository();
  const storage = createSupabaseDocumentStoragePort();
  const scanner: DocumentScannerPort = Object.freeze({
    runtimeAvailable: false,
    scan: () => Promise.resolve(null),
  });
  return Object.freeze({
    allowedOrigins: runtimeOrigins(),
    authority: createDocumentAuthorityResolver(),
    service: createDocumentStorageService({ repository, storage, scanner }),
  });
}

export function createDocumentEdgeHandler(
  route: DocumentRoute,
  functionPath: string,
  dependencies: DocumentEdgeDependencies =
    createDefaultDocumentEdgeDependencies(),
) {
  const method = route === "download" ? "GET" : "POST";
  if (!functionPath.startsWith("/functions/v1/drs-document-")) {
    throw new TypeError("INVALID_DOCUMENT_FUNCTION_PATH");
  }
  return async function documentEdgeHandler(
    request: Request,
  ): Promise<Response> {
    const origin = request.headers.get("origin");
    const preflight = documentPreflight(
      request,
      method,
      dependencies.allowedOrigins,
    );
    if (preflight) return preflight;
    if (hasDisallowedDocumentOrigin(request, dependencies.allowedOrigins)) {
      return documentJsonResponse(
        403,
        { state: "CONTEXT_UNAVAILABLE" },
        origin,
        dependencies.allowedOrigins,
      );
    }
    const pathname = new URL(request.url).pathname;
    if (
      (route === "download" && !pathname.startsWith(`${functionPath}/`)) ||
      (route !== "download" && pathname !== functionPath)
    ) {
      return documentJsonResponse(
        400,
        { state: "INVALID_REQUEST" },
        origin,
        dependencies.allowedOrigins,
      );
    }
    let parsed;
    try {
      parsed = await readDocumentRequest(route, request);
    } catch {
      return documentJsonResponse(
        400,
        { state: "INVALID_REQUEST" },
        origin,
        dependencies.allowedOrigins,
      );
    }
    if (
      !/^Bearer\s+[^\s]+$/u.test(request.headers.get("authorization") ?? "")
    ) {
      return documentJsonResponse(
        401,
        { state: "AUTH_REQUIRED" },
        origin,
        dependencies.allowedOrigins,
      );
    }
    if (!dependencies.authority.runtimeAvailable) {
      return documentJsonResponse(
        503,
        { state: "CONTEXT_UNAVAILABLE" },
        origin,
        dependencies.allowedOrigins,
      );
    }
    const principal = await dependencies.authority.authorize(request);
    if (!principal) {
      return documentJsonResponse(
        403,
        { state: "CONTEXT_UNAVAILABLE" },
        origin,
        dependencies.allowedOrigins,
      );
    }
    try {
      if (route === "uploadIntent") {
        const result = await dependencies.service.createUploadIntent(
          principal,
          parsed as UploadIntentRequest,
        );
        return result
          ? documentJsonResponse(
            201,
            result,
            origin,
            dependencies.allowedOrigins,
          )
          : documentJsonResponse(
            503,
            { state: "CONTEXT_UNAVAILABLE" },
            origin,
            dependencies.allowedOrigins,
          );
      }
      if (route === "finalize") {
        const result = await dependencies.service.finalizeUpload(
          principal,
          parsed as FinalizeRequest,
        );
        if (!result) {
          return documentJsonResponse(
            503,
            { state: "CONTEXT_UNAVAILABLE" },
            origin,
            dependencies.allowedOrigins,
          );
        }
        return documentJsonResponse(
          result.state === "VALIDATION_PENDING"
            ? 202
            : result.state === "IDEMPOTENCY_CONFLICT" ||
                result.state === "VERSION_CONFLICT"
            ? 409
            : 201,
          result,
          origin,
          dependencies.allowedOrigins,
        );
      }
      if (route === "snapshot") {
        const result = await dependencies.service.createSnapshot(
          principal,
          parsed as SnapshotRequest,
        );
        return result
          ? documentJsonResponse(
            result.state === "IDEMPOTENCY_CONFLICT" ||
              result.state === "VERSION_CONFLICT"
              ? 409
              : 201,
            result,
            origin,
            dependencies.allowedOrigins,
          )
          : documentJsonResponse(
            503,
            { state: "CONTEXT_UNAVAILABLE" },
            origin,
            dependencies.allowedOrigins,
          );
      }
      const result = await dependencies.service.downloadVersion(
        principal,
        parsed as DownloadRequest,
      );
      if (!result) {
        return documentJsonResponse(
          403,
          { state: "CONTEXT_UNAVAILABLE" },
          origin,
          dependencies.allowedOrigins,
        );
      }
      const headers = new Headers(result.headers);
      headers.set("access-control-allow-origin", origin!);
      headers.set("vary", "Origin");
      return new Response(result.body, { status: result.status, headers });
    } catch {
      return documentJsonResponse(
        503,
        { state: "CONTEXT_UNAVAILABLE" },
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
