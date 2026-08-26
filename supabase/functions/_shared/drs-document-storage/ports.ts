import type {
  DocumentMime,
  FinalizeRequest,
  SnapshotRequest,
  UploadIntentRequest,
} from "./contracts.ts";
import type { HostileFileReport } from "./validation.ts";

export type DocumentModeAPrincipal = Readonly<{
  authenticatedUserId: string;
  expectedCaseId: string;
  authorizationSubject: string;
  grantId: string;
  grantVersion: string;
  grantExpiresAt: string;
}>;

export type DocumentOperation =
  | "CREATE_UPLOAD_INTENT"
  | "FINALIZE_UPLOAD"
  | "DOWNLOAD_VERSION"
  | "CREATE_SNAPSHOT"
  | "QUEUE_ORPHAN_CLEANUP";

export interface DocumentAuthorityPort {
  readonly runtimeAvailable: boolean;
  authorize(request: Request): Promise<DocumentModeAPrincipal | null>;
}

export interface DocumentRepositoryPort {
  readonly runtimeAvailable: boolean;
  execute(
    input: Readonly<{
      principal: DocumentModeAPrincipal;
      operation: DocumentOperation;
      resourceRef: string;
      idempotencyKey: string;
      expectedPayloadSha256: string;
    }>,
  ): Promise<unknown>;
  queueOrphanCleanup(
    input: Readonly<{
      principal: DocumentModeAPrincipal;
      intentRef: string;
      recordsBucket: string;
      recordsObjectKey: string;
    }>,
  ): Promise<unknown>;
}

export type StorageObjectFacts = Readonly<{
  bucket: string;
  objectKey: string;
  sha256: string;
  sizeBytes: number;
  detectedMime: DocumentMime;
}>;

export interface DocumentStoragePort {
  readonly runtimeAvailable: boolean;
  createSignedUpload(
    input: Readonly<{
      bucket: string;
      objectKey: string;
      mime: DocumentMime;
    }>,
  ): Promise<
    Readonly<{
      signedUploadUrl: string;
      nativeExpiresAt: string;
      requiredHeaders: Readonly<Record<string, string>>;
    }> | null
  >;
  inspect(
    input: Readonly<{ bucket: string; objectKey: string }>,
  ): Promise<StorageObjectFacts | null>;
  promote(
    input: Readonly<{
      sourceBucket: string;
      sourceObjectKey: string;
      targetBucket: string;
      targetObjectKey: string;
    }>,
  ): Promise<boolean>;
  download(
    input: Readonly<{ bucket: string; objectKey: string }>,
  ): Promise<Response | null>;
}

export interface DocumentScannerPort {
  readonly runtimeAvailable: boolean;
  scan(
    input: Readonly<{
      bucket: string;
      objectKey: string;
      declaredMime: DocumentMime;
    }>,
  ): Promise<HostileFileReport | null>;
}

export type DocumentServiceInput =
  | UploadIntentRequest
  | FinalizeRequest
  | SnapshotRequest;
