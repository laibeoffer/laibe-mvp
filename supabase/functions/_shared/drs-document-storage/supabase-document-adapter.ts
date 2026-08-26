import { readRuntimeEnvironment } from "../drs-auth/contracts.ts";
import { isSha256, isUuid } from "./contracts.ts";
import type {
  DocumentModeAPrincipal,
  DocumentOperation,
  DocumentRepositoryPort,
} from "./ports.ts";

const DECIMAL_BIGINT = /^[1-9]\d{0,18}$/u;
const MAX_RESOURCE_REF_BYTES = 16 * 1024;

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validPrincipal(principal: DocumentModeAPrincipal): boolean {
  return isUuid(principal.authenticatedUserId) &&
    isUuid(principal.expectedCaseId) &&
    /^drs-specialist:[0-9a-f-]{36}$/iu.test(principal.authorizationSubject) &&
    isUuid(principal.grantId) && DECIMAL_BIGINT.test(principal.grantVersion) &&
    Number.isFinite(Date.parse(principal.grantExpiresAt));
}

function validOperation(value: string): value is DocumentOperation {
  return [
    "CREATE_UPLOAD_INTENT",
    "FINALIZE_UPLOAD",
    "DOWNLOAD_VERSION",
    "CREATE_SNAPSHOT",
    "QUEUE_ORPHAN_CLEANUP",
  ].includes(value);
}

export function createSupabaseDocumentRepository(
  options: Readonly<{
    env?: Readonly<{ get(name: string): string | undefined }>;
    fetch?: typeof fetch;
  }> = {},
): DocumentRepositoryPort {
  const supabaseUrl = readRuntimeEnvironment(options.env, "SUPABASE_URL")
    ?.replace(/\/+$/u, "");
  const serviceRoleKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const runtimeAvailable = Boolean(
    supabaseUrl && serviceRoleKey && typeof fetchImplementation === "function",
  );

  async function execute(
    input: Readonly<{
      principal: DocumentModeAPrincipal;
      operation: DocumentOperation;
      resourceRef: string;
      idempotencyKey: string;
      expectedPayloadSha256: string;
    }>,
  ): Promise<unknown> {
    if (
      !runtimeAvailable || !validPrincipal(input.principal) ||
      !validOperation(input.operation) ||
      typeof input.resourceRef !== "string" ||
      new TextEncoder().encode(input.resourceRef).byteLength >
        MAX_RESOURCE_REF_BYTES ||
      typeof input.idempotencyKey !== "string" ||
      !isSha256(input.expectedPayloadSha256)
    ) return null;
    try {
      const response = await fetchImplementation!(
        `${supabaseUrl}/rest/v1/rpc/server_document_operation_v1`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey!,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            p_authenticated_user_id: input.principal.authenticatedUserId,
            p_expected_case_id: input.principal.expectedCaseId,
            p_authorization_subject: input.principal.authorizationSubject,
            p_grant_id: input.principal.grantId,
            p_grant_version: input.principal.grantVersion,
            p_operation: input.operation,
            p_resource_ref: input.resourceRef,
            p_idempotency_key: input.idempotencyKey,
            p_expected_payload_sha256: input.expectedPayloadSha256,
          }),
        },
      );
      if (!response.ok) return null;
      const candidate = await response.json();
      return candidate !== null && typeof candidate === "object" &&
          !Array.isArray(candidate)
        ? candidate
        : null;
    } catch {
      return null;
    }
  }

  return Object.freeze({
    runtimeAvailable,
    execute,
    async queueOrphanCleanup(
      input: Readonly<{
        principal: DocumentModeAPrincipal;
        intentRef: string;
        recordsBucket: string;
        recordsObjectKey: string;
      }>,
    ) {
      const resourceRef = JSON.stringify({
        schemaVersion: "laibe.drs-document-orphan-cleanup.internal.v1",
        intentRef: input.intentRef,
        recordsBucket: input.recordsBucket,
        recordsObjectKey: input.recordsObjectKey,
      });
      const orphanPayloadSha256 = await sha256Text(resourceRef);
      await execute({
        principal: input.principal,
        operation: "QUEUE_ORPHAN_CLEANUP",
        resourceRef,
        idempotencyKey: `orphan-${orphanPayloadSha256.slice(0, 40)}`,
        expectedPayloadSha256: orphanPayloadSha256,
      });
    },
  });
}
