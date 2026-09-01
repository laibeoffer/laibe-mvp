import type { FetchLike, RuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  encryptLineUserId,
  hmacIdentityDigest,
  importLineUserIdEncryptionKey,
} from "./crypto.ts";
import { createLineClient, type LineClient } from "./line-client.ts";
import { verifyLineSignature } from "./signature.ts";
import {
  readLineWebhookEnvelope,
  sanitizeLineLinkStatus,
} from "./validation.ts";

type SafeWebhookOutcome =
  | "verified"
  | "link_token_replied"
  | "linked"
  | "expired"
  | "conflict_line_already_bound"
  | "conflict_drs_already_bound"
  | "specialist_inactive"
  | "ignored"
  | "failed"
  | "not_linked"
  | "revoked"
  | "temporarily_unavailable";

type WebhookClaim =
  | Readonly<{
    admission: "claimed";
    claimToken: string;
    providerRetryKey: string;
  }>
  | Readonly<
    { admission: "already_completed"; safeOutcome: SafeWebhookOutcome }
  >
  | Readonly<
    { admission: "in_progress" | "rejected" | "temporarily_unavailable" }
  >;

type ClaimInput = Readonly<{
  webhookEventDigest: string;
  eventKind: "binding_action" | "unlink_action" | "account_link";
}>;

type CompletionInput = Readonly<{
  webhookEventDigest: string;
  claimToken: string;
  safeOutcome: SafeWebhookOutcome;
}>;

type CompleteAccountLinkInput = Readonly<{
  nonceDigest: string;
  lineUserDigest: string;
  lineUserCiphertext: string;
  lineUserIv: string;
  encryptionKeyVersion: string;
}>;

type CompleteAccountLinkEventInput =
  & CompleteAccountLinkInput
  & Readonly<{
    webhookEventDigest: string;
    claimToken: string;
  }>;

type UnlinkByLineIdentityInput = Readonly<{
  lineUserDigest: string;
}>;

export interface LineWebhookRepository {
  claimEvent(input: ClaimInput): Promise<WebhookClaim>;
  completeEvent(input: CompletionInput): Promise<unknown>;
  completeAccountLinkEvent(
    input: CompleteAccountLinkEventInput,
  ): Promise<unknown>;
  unlinkByLineIdentity(input: UnlinkByLineIdentityInput): Promise<unknown>;
}

export type LineWebhookDependencies = Readonly<{
  channelSecret: string;
  identityHmacKey: string;
  identityEncryptionKey: CryptoKey;
  identityEncryptionKeyVersion: string;
  publicOrigin: string;
  repository: LineWebhookRepository;
  lineClient: LineClient;
}>;

const MAX_BODY_BYTES = 1_048_576;
const MAX_RPC_RESPONSE_BYTES = 8192;
const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});

function json(status: number): Response {
  return new Response("{}", { status, headers: JSON_HEADERS });
}

function runtimeEnvironment(): RuntimeEnvironment | undefined {
  const candidate = (globalThis as unknown as {
    Deno?: { env?: { get?: (name: string) => string | undefined } };
  }).Deno?.env;
  return typeof candidate?.get === "function"
    ? Object.freeze({ get: candidate.get.bind(candidate) })
    : undefined;
}

async function boundedBody(request: Request): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/u.test(declared) || Number(declared) > MAX_BODY_BYTES)
  ) {
    throw new RangeError("body_too_large");
  }
  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new RangeError("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function exactWebhookRequest(request: Request): boolean {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]
    .trim().toLowerCase();
  return request.method === "POST" &&
    url.pathname === "/functions/v1/drs-line-webhook" &&
    url.search === "" && contentType === "application/json";
}

function completed(input: unknown, expected: SafeWebhookOutcome): boolean {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const descriptor = Object.getOwnPropertyDescriptor(input, "completed")?.value;
  const outcome =
    Object.getOwnPropertyDescriptor(input, "safeOutcome")?.value ??
      Object.getOwnPropertyDescriptor(input, "safe_outcome")?.value;
  return descriptor === true && outcome === expected;
}

function stableOutcome(state: string): SafeWebhookOutcome | null {
  return [
      "linked",
      "expired",
      "conflict_line_already_bound",
      "conflict_drs_already_bound",
      "specialist_inactive",
    ].includes(state)
    ? state as SafeWebhookOutcome
    : null;
}

async function processEvent(
  dependencies: LineWebhookDependencies,
  event: NonNullable<
    ReturnType<typeof readLineWebhookEnvelope>
  >["events"][number],
): Promise<void> {
  const eventDigest = await hmacIdentityDigest(
    dependencies.identityHmacKey,
    `laibe.drs-line-webhook.event.v1:${event.webhookEventId}`,
  );
  const claim = await dependencies.repository.claimEvent({
    webhookEventDigest: eventDigest,
    eventKind: event.kind,
  });
  if (claim.admission === "already_completed") return;
  if (claim.admission !== "claimed") throw new Error("webhook_not_claimed");

  let outcome: SafeWebhookOutcome;
  if (event.kind === "binding_action") {
    const linkToken = await dependencies.lineClient.issueLinkToken(
      event.lineUserId,
    );
    const linkingUrl = new URL(
      "/drs/line-account-link",
      dependencies.publicOrigin,
    );
    linkingUrl.searchParams.set("linkToken", linkToken);
    await dependencies.lineClient.pushAccountLink(
      event.lineUserId,
      linkingUrl.toString(),
      claim.providerRetryKey,
    );
    outcome = "link_token_replied";
  } else if (event.kind === "unlink_action") {
    const lineUserDigest = await hmacIdentityDigest(
      dependencies.identityHmacKey,
      `laibe.drs-line-account-link.line-user.v1:${event.lineUserId}`,
    );
    const status = sanitizeLineLinkStatus(
      await dependencies.repository.unlinkByLineIdentity({ lineUserDigest }),
    );
    if (status.state !== "revoked" && status.state !== "not_linked") {
      throw new Error("account_unlink_not_completed");
    }
    await dependencies.lineClient.pushUnlinkConfirmation(
      event.lineUserId,
      claim.providerRetryKey,
    );
    outcome = status.state;
  } else if (event.result === "failed") {
    outcome = "failed";
  } else {
    const nonceDigest = await hmacIdentityDigest(
      dependencies.identityHmacKey,
      `laibe.drs-line-account-link.nonce.v1:${event.nonce}`,
    );
    const lineUserDigest = await hmacIdentityDigest(
      dependencies.identityHmacKey,
      `laibe.drs-line-account-link.line-user.v1:${event.lineUserId}`,
    );
    const encrypted = await encryptLineUserId(
      dependencies.identityEncryptionKey,
      event.lineUserId,
    );
    const result = await dependencies.repository.completeAccountLinkEvent({
      webhookEventDigest: eventDigest,
      claimToken: claim.claimToken,
      nonceDigest,
      lineUserDigest,
      lineUserCiphertext: encrypted.ciphertext,
      lineUserIv: encrypted.iv,
      encryptionKeyVersion: dependencies.identityEncryptionKeyVersion,
    });
    const candidate = result !== null && typeof result === "object"
      ? Object.getOwnPropertyDescriptor(result, "safeOutcome")?.value ??
        Object.getOwnPropertyDescriptor(result, "safe_outcome")?.value
      : null;
    const accepted = stableOutcome(String(candidate));
    if (
      !completed(result, accepted ?? "temporarily_unavailable") ||
      accepted === null
    ) {
      throw new Error("account_link_not_completed");
    }
    return;
  }
  const result = await dependencies.repository.completeEvent({
    webhookEventDigest: eventDigest,
    claimToken: claim.claimToken,
    safeOutcome: outcome,
  });
  if (!completed(result, outcome)) throw new Error("webhook_not_completed");
}

function validDependencies(input: LineWebhookDependencies): boolean {
  return input.channelSecret.length >= 16 &&
    input.identityHmacKey.length >= 16 &&
    /^[A-Za-z0-9._-]{1,64}$/u.test(input.identityEncryptionKeyVersion) &&
    /^https:\/\/[^/]+$/u.test(input.publicOrigin) &&
    typeof input.repository?.claimEvent === "function" &&
    typeof input.lineClient?.issueLinkToken === "function";
}

function createSupabaseWebhookRepository(
  env: RuntimeEnvironment,
  fetchImplementation: FetchLike = globalThis.fetch,
): LineWebhookRepository {
  const supabaseUrl = env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const providerChannelId = env.get("DRS_LINE_PROVIDER_CHANNEL_ID") ?? "";
  if (
    !/^https:\/\/[^/]+$/u.test(supabaseUrl) || serviceRoleKey.length < 32 ||
    !/^[0-9]{1,32}$/u.test(providerChannelId) ||
    typeof fetchImplementation !== "function"
  ) throw new Error("runtime_unavailable");

  async function invoke(name: string, pInput: Record<string, unknown>) {
    const response = await fetchImplementation(
      `${supabaseUrl}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ p_input: pInput }),
      },
    );
    const raw = await response.text();
    if (
      !response.ok ||
      new TextEncoder().encode(raw).byteLength > MAX_RPC_RESPONSE_BYTES
    ) {
      throw new Error("runtime_unavailable");
    }
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
      ) {
        throw new Error("invalid_response");
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new Error("runtime_unavailable");
    }
  }
  return Object.freeze({
    async claimEvent(input: ClaimInput): Promise<WebhookClaim> {
      const result = await invoke("drs_line_claim_webhook_v1", {
        webhook_event_digest: input.webhookEventDigest,
        event_kind: input.eventKind,
      });
      const admission = result.admission;
      if (
        admission === "claimed" && typeof result.claim_token === "string" &&
        typeof result.provider_retry_key === "string"
      ) {
        return Object.freeze({
          admission,
          claimToken: result.claim_token,
          providerRetryKey: result.provider_retry_key,
        });
      }
      if (
        admission === "already_completed" &&
        typeof result.safe_outcome === "string"
      ) {
        return Object.freeze({
          admission,
          safeOutcome: result.safe_outcome as SafeWebhookOutcome,
        });
      }
      if (
        ["in_progress", "rejected", "temporarily_unavailable"].includes(
          String(admission),
        )
      ) {
        return Object.freeze({ admission } as WebhookClaim);
      }
      throw new Error("runtime_unavailable");
    },
    async completeEvent(input: CompletionInput) {
      return await invoke("drs_line_complete_webhook_v1", {
        webhook_event_digest: input.webhookEventDigest,
        claim_token: input.claimToken,
        safe_outcome: input.safeOutcome,
      });
    },
    async completeAccountLinkEvent(input: CompleteAccountLinkEventInput) {
      return await invoke("drs_line_complete_account_link_event_v1", {
        webhook_event_digest: input.webhookEventDigest,
        claim_token: input.claimToken,
        provider_channel_id: providerChannelId,
        nonce_digest: input.nonceDigest,
        line_user_digest: input.lineUserDigest,
        line_user_ciphertext: input.lineUserCiphertext,
        line_user_iv: input.lineUserIv,
        encryption_key_version: input.encryptionKeyVersion,
      });
    },
    async unlinkByLineIdentity(input: UnlinkByLineIdentityInput) {
      return await invoke("drs_line_unlink_by_line_identity_v1", {
        provider_channel_id: providerChannelId,
        line_user_digest: input.lineUserDigest,
      });
    },
  });
}

async function runtimeDependencies(): Promise<LineWebhookDependencies> {
  const env = runtimeEnvironment();
  if (!env) throw new Error("runtime_unavailable");
  const channelSecret = env.get("LINE_CHANNEL_SECRET") ?? "";
  const accessToken = env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
  const identityHmacKey = env.get("DRS_LINE_IDENTITY_HMAC_KEY") ?? "";
  const encryptionKey = env.get("DRS_LINE_IDENTITY_ENCRYPTION_KEY") ?? "";
  const identityEncryptionKeyVersion =
    env.get("DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION") ?? "";
  const publicOrigin = env.get("DRS_PUBLIC_ORIGIN") ?? "";
  const dependencies = Object.freeze({
    channelSecret,
    identityHmacKey,
    identityEncryptionKey: await importLineUserIdEncryptionKey(encryptionKey),
    identityEncryptionKeyVersion,
    publicOrigin,
    repository: createSupabaseWebhookRepository(env),
    lineClient: createLineClient({ accessToken }),
  });
  if (!validDependencies(dependencies)) throw new Error("runtime_unavailable");
  return dependencies;
}

export function createLineWebhookHandler(
  injectedDependencies?: LineWebhookDependencies,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (!exactWebhookRequest(request)) return json(400);
    let rawBody: Uint8Array;
    try {
      rawBody = await boundedBody(request);
    } catch (error) {
      return json(error instanceof RangeError ? 413 : 400);
    }
    let dependencies: LineWebhookDependencies;
    try {
      dependencies = injectedDependencies ?? await runtimeDependencies();
      if (!validDependencies(dependencies)) return json(503);
    } catch {
      return json(503);
    }
    if (
      !await verifyLineSignature(
        rawBody,
        request.headers.get("x-line-signature"),
        dependencies.channelSecret,
      )
    ) return json(401);
    let payload: unknown;
    try {
      payload = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(rawBody),
      );
    } catch {
      return json(400);
    }
    const envelope = readLineWebhookEnvelope(payload);
    if (!envelope) return json(400);
    try {
      for (const event of envelope.events) {
        await processEvent(dependencies, event);
      }
      return json(200);
    } catch {
      return json(503);
    }
  };
}
