import {
  isProtocolDigest,
  isUuid,
  readBindingStartInput,
} from "./contracts.ts";
import {
  decryptLineGroupId,
  hmacIdentityDigest,
  importLineGroupEncryptionKey,
} from "./crypto.ts";
import {
  exactJsonBody,
  gatewayVerifiedServiceRole,
  json,
  requiredEnvironment,
  type RuntimeEnvironment,
  runtimeEnvironment,
} from "./http.ts";
import {
  createLineGroupClient,
  type LineGroupClient,
  LineGroupProviderError,
} from "./line-client.ts";
import {
  createLineCaseGroupRepository,
  type LineCaseGroupRepository,
} from "./repository.ts";

type Dependencies = Readonly<{
  env: RuntimeEnvironment;
  repository: LineCaseGroupRepository;
  lineClient: LineGroupClient;
  encryptionKey: CryptoKey;
  authorizeService(request: Request): boolean;
  now?: () => number;
}>;

type Claim = Readonly<{
  outboxId: string;
  claimToken: string;
  retryKey: string;
  providerChannelDigest: string;
  lineGroupDigest: string;
  lineGroupCiphertext: string;
  lineGroupIv: string;
  encryptionKeyVersion: string;
  messageText: string;
}>;

type ClaimIdentity = Readonly<{
  outboxId: string;
  claimToken: string;
}>;

function readClaimIdentity(
  value: Record<string, unknown>,
): ClaimIdentity | null {
  return value.claimed === true && value.state === "CLAIMED" &&
      isUuid(value.outbox_id) && isUuid(value.claim_token)
    ? Object.freeze({
      outboxId: value.outbox_id,
      claimToken: value.claim_token,
    })
    : null;
}

function readClaim(value: Record<string, unknown>): Claim | null {
  if (
    value.claimed !== true || value.state !== "CLAIMED" ||
    !isUuid(value.outbox_id) || !isUuid(value.claim_token) ||
    !isUuid(value.retry_key) ||
    !isProtocolDigest(value.provider_channel_digest) ||
    !isProtocolDigest(value.line_group_digest) ||
    typeof value.line_group_ciphertext !== "string" ||
    !/^[A-Za-z0-9_-]{24,256}$/u.test(value.line_group_ciphertext) ||
    typeof value.line_group_iv !== "string" ||
    !/^[A-Za-z0-9_-]{16}$/u.test(value.line_group_iv) ||
    typeof value.encryption_key_version !== "string" ||
    !/^[A-Za-z0-9._-]{1,64}$/u.test(value.encryption_key_version) ||
    typeof value.message_text !== "string" || value.message_text.length < 1 ||
    value.message_text.length > 5000
  ) return null;
  return Object.freeze({
    outboxId: value.outbox_id,
    claimToken: value.claim_token,
    retryKey: value.retry_key,
    providerChannelDigest: value.provider_channel_digest,
    lineGroupDigest: value.line_group_digest,
    lineGroupCiphertext: value.line_group_ciphertext,
    lineGroupIv: value.line_group_iv,
    encryptionKeyVersion: value.encryption_key_version,
    messageText: value.message_text,
  });
}

async function runtimeDependencies(): Promise<Dependencies> {
  const env = runtimeEnvironment();
  if (!env) throw new Error("runtime_unavailable");
  return Object.freeze({
    env,
    repository: createLineCaseGroupRepository({
      supabaseUrl: requiredEnvironment(env, "SUPABASE_URL"),
      serviceRoleKey: requiredEnvironment(env, "SUPABASE_SERVICE_ROLE_KEY"),
    }),
    lineClient: createLineGroupClient({
      accessToken: requiredEnvironment(env, "LINE_CHANNEL_ACCESS_TOKEN"),
    }),
    encryptionKey: await importLineGroupEncryptionKey(
      requiredEnvironment(env, "DRS_LINE_GROUP_ENCRYPTION_KEY"),
    ),
    authorizeService: gatewayVerifiedServiceRole,
  });
}

async function complete(
  dependencies: Dependencies,
  claim: ClaimIdentity,
  input: Readonly<Record<string, unknown>>,
): Promise<void> {
  const result = await dependencies.repository.invoke(
    "drs_line_review_notification_complete_v1",
    {
      outbox_id: claim.outboxId,
      claim_token: claim.claimToken,
      ...input,
    },
  );
  if (result.ok !== true) throw new Error("completion_failed");
}

export function createReviewNotificationDispatchHandler(
  injected?: Dependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url);
    if (
      request.method !== "POST" ||
      url.pathname !== "/functions/v1/drs-line-review-notification-dispatch" ||
      url.search !== "" ||
      readBindingStartInput(await exactJsonBody(request, 32)) === null
    ) return json({ state: "invalid_request" }, 400);
    let dependencies: Dependencies;
    try {
      dependencies = injected ?? await runtimeDependencies();
    } catch {
      return json({ state: "temporarily_unavailable" }, 503);
    }
    if (!dependencies.authorizeService(request)) {
      return json({ state: "permission_denied" }, 403);
    }
    const now = dependencies.now ?? Date.now;
    const startedAt = now();
    let claim: Claim | null = null;
    try {
      const claimed = await dependencies.repository.invoke(
        "drs_line_review_notification_claim_v1",
        {},
      );
      if (claimed.claimed === false && claimed.state === "EMPTY") {
        return json({ state: "empty" }, 200);
      }
      const claimIdentity = readClaimIdentity(claimed);
      if (!claimIdentity) throw new Error("invalid_claim_identity");
      claim = readClaim(claimed);
      if (!claim) {
        await complete(dependencies, claimIdentity, {
          outcome: "permanent_failure",
          provider_request_id: null,
          provider_accepted_request_id: null,
          provider_message_id: null,
          provider_status_class: "none",
          reason_code: "INVALID_CLAIM_CONTRACT",
          duration_ms: Math.max(0, Math.round(now() - startedAt)),
        });
        return json({ state: "claim_rejected" }, 502);
      }

      const hmacKey = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_IDENTITY_HMAC_KEY",
      );
      const configuredChannelDigest = await hmacIdentityDigest(
        hmacKey,
        requiredEnvironment(dependencies.env, "DRS_LINE_PROVIDER_CHANNEL_ID"),
      );
      const configuredKeyVersion = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_GROUP_ENCRYPTION_KEY_VERSION",
      );
      if (
        claim.providerChannelDigest !== configuredChannelDigest ||
        claim.encryptionKeyVersion !== configuredKeyVersion
      ) {
        await complete(dependencies, claim, {
          outcome: "permanent_failure",
          provider_request_id: null,
          provider_accepted_request_id: null,
          provider_message_id: null,
          provider_status_class: "none",
          reason_code: "RUNTIME_IDENTITY_MISMATCH",
          duration_ms: Math.max(0, Math.round(now() - startedAt)),
        });
        return json({ state: "suppressed" }, 409);
      }

      const current = await dependencies.repository.invoke(
        "drs_line_review_notification_assert_current_v1",
        { outbox_id: claim.outboxId, claim_token: claim.claimToken },
      );
      if (current.ok !== true && current.state === "SUPPRESSED") {
        return json({ state: "suppressed" }, 409);
      }
      if (current.ok !== true && current.state === "STALE_CLAIM") {
        return json({ state: "stale_claim" }, 409);
      }
      if (current.ok !== true || current.state !== "CURRENT") {
        return json({ state: "temporarily_unavailable" }, 503);
      }
      let lineGroupId: string;
      try {
        lineGroupId = await decryptLineGroupId(dependencies.encryptionKey, {
          ciphertext: claim.lineGroupCiphertext,
          iv: claim.lineGroupIv,
        });
        if (
          await hmacIdentityDigest(hmacKey, lineGroupId) !==
            claim.lineGroupDigest
        ) {
          throw new Error("identity_mismatch");
        }
      } catch {
        throw new LineGroupProviderError("invalid_response", false);
      }
      const receipt = await dependencies.lineClient.pushText(
        lineGroupId,
        claim.messageText,
        claim.retryKey,
      );
      if (
        !receipt.observedRequestId && !receipt.acceptedRequestId &&
        !receipt.messageId
      ) {
        throw new LineGroupProviderError("invalid_response", false);
      }
      await complete(dependencies, claim, {
        outcome: "accepted",
        provider_request_id: receipt.observedRequestId,
        provider_accepted_request_id: receipt.acceptedRequestId,
        provider_message_id: receipt.messageId,
        provider_status_class: receipt.statusClass,
        reason_code: receipt.replayed
          ? "RETRY_KEY_ALREADY_ACCEPTED"
          : "PROVIDER_ACCEPTED",
        duration_ms: Math.max(0, Math.round(now() - startedAt)),
      });
      return json({ state: "sent" }, 200);
    } catch (error) {
      if (claim && error instanceof LineGroupProviderError) {
        try {
          await complete(dependencies, claim, {
            outcome: error.retryable ? "retry" : "permanent_failure",
            provider_request_id: error.observedRequestId,
            provider_accepted_request_id: null,
            provider_message_id: null,
            provider_status_class: error.statusClass,
            reason_code: error.code.toUpperCase(),
            duration_ms: Math.max(0, Math.round(now() - startedAt)),
          });
        } catch {
          return json({ state: "temporarily_unavailable" }, 503);
        }
        return json(
          { state: error.retryable ? "retry_scheduled" : "provider_denied" },
          error.retryable ? 503 : 502,
        );
      }
      return json({ state: "temporarily_unavailable" }, 503);
    }
  };
}
