import type { FetchLike, RuntimeEnvironment } from "../drs-auth/contracts.ts";

export type LineAccountLinkAuthority = Readonly<{
  authenticatedUserId: string;
  specialistId: string;
  selectedCaseId: string;
  authorizationSubject: string;
}>;

export type PrepareLineNonceInput = Readonly<{
  authority: LineAccountLinkAuthority;
  nonceDigest: string;
  nonceExpiresAt: string;
}>;

export interface LineAccountLinkRepository {
  startIntent(authority: LineAccountLinkAuthority): Promise<unknown>;
  readStatus(authority: LineAccountLinkAuthority): Promise<unknown>;
  cancelIntent(authority: LineAccountLinkAuthority): Promise<unknown>;
  prepareNonce(input: PrepareLineNonceInput): Promise<unknown>;
  unlink(authority: LineAccountLinkAuthority): Promise<unknown>;
}

type RepositoryOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  providerChannelId?: string;
  botLaunchUrl?: string;
}>;

const RPC_NAMES = Object.freeze({
  start: "drs_line_start_link_intent_v1",
  status: "drs_line_read_link_status_v1",
  cancel: "drs_line_cancel_link_intent_v1",
  prepare: "drs_line_prepare_nonce_v1",
  unlink: "drs_line_unlink_account_v1",
});
const MAX_RPC_RESPONSE_BYTES = 8192;

function runtimeEnvironment(): RuntimeEnvironment | undefined {
  const candidate = (globalThis as unknown as {
    Deno?: { env?: { get?: (name: string) => string | undefined } };
  }).Deno?.env;
  return typeof candidate?.get === "function"
    ? Object.freeze({ get: candidate.get.bind(candidate) })
    : undefined;
}

function ownString(input: unknown, key: string): string | null {
  if (input === null || typeof input !== "object") return null;
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  return typeof descriptor?.value === "string" ? descriptor.value : null;
}

function authorityPayload(authority: LineAccountLinkAuthority) {
  return Object.freeze({
    authenticated_user_id: authority.authenticatedUserId,
    specialist_id: authority.specialistId,
    selected_case_id: authority.selectedCaseId,
    authorization_subject: authority.authorizationSubject,
  });
}

export function createSupabaseDrsLineAccountLinkRepository(
  options: RepositoryOptions = {},
): LineAccountLinkRepository {
  const environment = options.env ?? runtimeEnvironment();
  const supabaseUrl = environment?.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = environment?.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const providerChannelId = options.providerChannelId ??
    environment?.get("DRS_LINE_PROVIDER_CHANNEL_ID") ?? "";
  const botLaunchUrl = options.botLaunchUrl ??
    environment?.get("DRS_LINE_OFFICIAL_ACCOUNT_URL") ?? "";
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const configured = /^https:\/\/[^/]+$/u.test(supabaseUrl) &&
    serviceRoleKey.length >= 32 && /^[0-9]{1,32}$/u.test(providerChannelId) &&
    /^https:\/\/([a-z0-9-]+\.)*line\.me\//u.test(botLaunchUrl) &&
    typeof fetchImplementation === "function";

  async function invoke(
    name: (typeof RPC_NAMES)[keyof typeof RPC_NAMES],
    input: Record<string, unknown>,
  ) {
    if (!configured) {
      throw new Error("DRS_LINE_ACCOUNT_LINK_UNAVAILABLE");
    }
    const response = await fetchImplementation(
      `${supabaseUrl}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ p_input: input }),
      },
    );
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (!response.ok || contentLength > MAX_RPC_RESPONSE_BYTES) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("DRS_LINE_ACCOUNT_LINK_UNAVAILABLE");
    }
    const raw = await response.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_RPC_RESPONSE_BYTES) {
      throw new Error("DRS_LINE_ACCOUNT_LINK_UNAVAILABLE");
    }
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
      ) {
        throw new Error("invalid_rpc_response");
      }
      return parsed;
    } catch {
      throw new Error("DRS_LINE_ACCOUNT_LINK_UNAVAILABLE");
    }
  }

  const repository: LineAccountLinkRepository = Object.freeze({
    startIntent(authority: LineAccountLinkAuthority) {
      return invoke(RPC_NAMES.start, {
        ...authorityPayload(authority),
        provider_channel_id: providerChannelId,
        bot_launch_url: botLaunchUrl,
      });
    },
    readStatus(authority: LineAccountLinkAuthority) {
      return invoke(RPC_NAMES.status, {
        ...authorityPayload(authority),
        provider_channel_id: providerChannelId,
      });
    },
    cancelIntent(authority: LineAccountLinkAuthority) {
      return invoke(RPC_NAMES.cancel, {
        ...authorityPayload(authority),
        provider_channel_id: providerChannelId,
      });
    },
    prepareNonce(input: PrepareLineNonceInput) {
      return invoke(RPC_NAMES.prepare, {
        ...authorityPayload(input.authority),
        provider_channel_id: providerChannelId,
        nonce_digest: input.nonceDigest,
        nonce_expires_at: input.nonceExpiresAt,
      });
    },
    unlink(authority: LineAccountLinkAuthority) {
      return invoke(RPC_NAMES.unlink, {
        ...authorityPayload(authority),
        provider_channel_id: providerChannelId,
      });
    },
  });
  return repository;
}

export function readRuntimeLineIdentityHmacKey(
  env: RuntimeEnvironment | undefined = runtimeEnvironment(),
): string {
  return ownString(
    env === undefined ? null : { value: env.get("DRS_LINE_IDENTITY_HMAC_KEY") },
    "value",
  ) ?? "";
}
