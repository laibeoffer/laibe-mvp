import { readRuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  canonicalFinalizeDomainResourceV1,
  isSha256,
  isUuid,
  sha256CanonicalText,
} from "./contracts.ts";
import type {
  DocumentModeAPrincipal,
  DocumentOperation,
  DocumentRepositoryPort,
  DocumentRuntimePrincipal,
  DocumentSessionContext,
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

function validSessionContext(
  principal: DocumentRuntimePrincipal,
): principal is DocumentSessionContext {
  return isUuid((principal as DocumentSessionContext).userId) &&
    isUuid((principal as DocumentSessionContext).sessionId) &&
    isUuid((principal as DocumentSessionContext).caseId) &&
    isUuid((principal as DocumentSessionContext).membershipId) &&
    ["owner", "vendor", "drs"].includes(
      String((principal as DocumentSessionContext).role),
    ) && Number.isSafeInteger(
      (principal as DocumentSessionContext).authorityVersion,
    ) && (principal as DocumentSessionContext).authorityVersion > 0 &&
    ["owner", "vendor", "drs"].includes(
      String((principal as DocumentSessionContext).nextActor),
    );
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
      input.operation === "FINALIZE_UPLOAD" ||
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

  async function finalizeDomainCommand(
    input: Parameters<DocumentRepositoryPort["finalizeDomainCommand"]>[0],
  ): Promise<unknown> {
    const resource = input.resource;
    if (
      !runtimeAvailable || !validSessionContext(input.principal) ||
      !["AUTHORIZE", "COMMIT"].includes(input.action) ||
      !isSha256(input.finalizeRequestPayloadSha256) ||
      (input.action === "COMMIT" &&
        (!resource || !isSha256(input.canonicalPayloadSha256))) ||
      (input.action === "AUTHORIZE" &&
        (resource !== undefined || input.canonicalPayloadSha256 !== undefined))
    ) return null;
    if (
      resource &&
      await sha256CanonicalText(canonicalFinalizeDomainResourceV1(resource)) !==
        input.canonicalPayloadSha256
    ) return null;
    try {
      const response = await fetchImplementation!(
        `${supabaseUrl}/rest/v1/rpc/server_document_finalize_domain_command_v1`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey!,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            p_action: input.action,
            p_actor_user_id: input.principal.userId,
            p_actor_auth_session_id: input.principal.sessionId,
            p_case_id: input.principal.caseId,
            p_actor_authority_membership_id: input.principal.membershipId,
            p_actor_role: input.principal.role,
            p_authority_version: input.principal.authorityVersion,
            p_next_actor: input.principal.nextActor,
            p_intent_ref: input.request.intentRef,
            p_idempotency_key: input.request.idempotencyKey,
            p_command_id: input.request.commandId,
            p_expected_case_version: input.request.expectedCaseVersion,
            p_finalize_request_payload_sha256:
              input.finalizeRequestPayloadSha256,
            p_canonical_payload_sha256:
              input.canonicalPayloadSha256 ?? null,
            p_records_bucket: resource?.recordsBucket ?? null,
            p_records_object_key: resource?.recordsObjectKey ?? null,
            p_verified_sha256: resource?.verifiedSha256 ?? null,
            p_verified_size_bytes: resource?.verifiedSizeBytes ?? null,
            p_detected_mime: resource?.detectedMime ?? null,
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
    finalizeDomainCommand,
    async queueOrphanCleanup(
      input: Readonly<{
        principal: DocumentRuntimePrincipal;
        intentRef: string;
        recordsBucket: string;
        recordsObjectKey: string;
      }>,
    ) {
      const resourceRef =
        "schemaVersion=laibe.drs-document-orphan-cleanup.internal.v1\n" +
        `intentRef=${input.intentRef}\n` +
        `recordsBucket=${input.recordsBucket}\n` +
        `recordsObjectKey=${input.recordsObjectKey}`;
      const orphanPayloadSha256 = await sha256Text(resourceRef);
      if (validSessionContext(input.principal)) {
        try {
          const response = await fetchImplementation!(
            `${supabaseUrl}/rest/v1/rpc/server_document_finalize_domain_command_v1`,
            {
              method: "POST",
              headers: {
                authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey!,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                p_action: "QUEUE_ORPHAN",
                p_actor_user_id: input.principal.userId,
                p_actor_auth_session_id: input.principal.sessionId,
                p_case_id: input.principal.caseId,
                p_actor_authority_membership_id: input.principal.membershipId,
                p_actor_role: input.principal.role,
                p_authority_version: input.principal.authorityVersion,
                p_next_actor: input.principal.nextActor,
                p_intent_ref: input.intentRef,
                p_idempotency_key: `orphan-${orphanPayloadSha256.slice(0, 40)}`,
                p_command_id: null,
                p_expected_case_version: null,
                p_finalize_request_payload_sha256: orphanPayloadSha256,
                p_canonical_payload_sha256: null,
                p_records_bucket: input.recordsBucket,
                p_records_object_key: input.recordsObjectKey,
                p_verified_sha256: null,
                p_verified_size_bytes: null,
                p_detected_mime: null,
              }),
            },
          );
          if (!response.ok) return null;
          return await response.json();
        } catch {
          return null;
        }
      }
      const legacyResourceRef = JSON.stringify({
        schemaVersion: "laibe.drs-document-orphan-cleanup.internal.v1",
        intentRef: input.intentRef,
        recordsBucket: input.recordsBucket,
        recordsObjectKey: input.recordsObjectKey,
      });
      return await execute({
        principal: input.principal as DocumentModeAPrincipal,
        operation: "QUEUE_ORPHAN_CLEANUP",
        resourceRef: legacyResourceRef,
        idempotencyKey: `orphan-${(await sha256Text(legacyResourceRef)).slice(0, 40)}`,
        expectedPayloadSha256: await sha256Text(legacyResourceRef),
      });
    },
  });
}
