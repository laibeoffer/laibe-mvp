import { verifyLineSignature } from "../drs-line-account-link/signature.ts";
import { readGroupBindingWebhookEnvelope } from "./contracts.ts";
import {
  encryptLineGroupId,
  hmacIdentityDigest,
  importLineGroupEncryptionKey,
} from "./crypto.ts";
import {
  json,
  requiredEnvironment,
  type RuntimeEnvironment,
  runtimeEnvironment,
} from "./http.ts";
import {
  createLineCaseGroupRepository,
  type LineCaseGroupRepository,
} from "./repository.ts";

type Dependencies = Readonly<{
  env: RuntimeEnvironment;
  repository: LineCaseGroupRepository;
  verifySignature(
    body: Uint8Array,
    signature: string | null,
    secret: string,
  ): Promise<boolean>;
}>;

function runtimeDependencies(): Dependencies {
  const env = runtimeEnvironment();
  if (!env) throw new Error("runtime_unavailable");
  return Object.freeze({
    env,
    repository: createLineCaseGroupRepository({
      supabaseUrl: requiredEnvironment(env, "SUPABASE_URL"),
      serviceRoleKey: requiredEnvironment(env, "SUPABASE_SERVICE_ROLE_KEY"),
    }),
    verifySignature: verifyLineSignature,
  });
}

export function createCaseGroupWebhookHandler(
  injected?: Dependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url);
    if (
      request.method !== "POST" ||
      url.pathname !== "/functions/v1/drs-line-case-webhook" ||
      url.search !== ""
    ) return json({ state: "invalid_request" }, 400);
    let dependencies: Dependencies;
    try {
      dependencies = injected ?? runtimeDependencies();
      const rawBody = new Uint8Array(await request.arrayBuffer());
      if (rawBody.byteLength === 0 || rawBody.byteLength > 1_048_576) {
        return json({ state: "invalid_request" }, 400);
      }
      const channelSecret = requiredEnvironment(
        dependencies.env,
        "LINE_CHANNEL_SECRET",
      );
      if (
        !await dependencies.verifySignature(
          rawBody,
          request.headers.get("x-line-signature"),
          channelSecret,
        )
      ) return json({ state: "signature_denied" }, 401);

      let decoded: unknown;
      try {
        decoded = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(rawBody),
        );
      } catch {
        return json({ state: "invalid_request" }, 400);
      }
      const envelope = readGroupBindingWebhookEnvelope(decoded);
      const expectedDestination = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_BOT_USER_ID",
      );
      if (!envelope || envelope.destination !== expectedDestination) {
        return json({ state: "invalid_request" }, 400);
      }

      const hmacKey = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_IDENTITY_HMAC_KEY",
      );
      const providerChannel = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_PROVIDER_CHANNEL_ID",
      );
      const providerChannelDigest = await hmacIdentityDigest(
        hmacKey,
        providerChannel,
      );
      const encryptionKeyVersion = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_GROUP_ENCRYPTION_KEY_VERSION",
      );
      if (!/^[A-Za-z0-9._-]{1,64}$/u.test(encryptionKeyVersion)) {
        throw new Error("runtime_unavailable");
      }
      const encryptionKey = await importLineGroupEncryptionKey(
        requiredEnvironment(dependencies.env, "DRS_LINE_GROUP_ENCRYPTION_KEY"),
      );

      const states: string[] = [];
      for (const event of envelope.events) {
        const encrypted = await encryptLineGroupId(
          encryptionKey,
          event.lineGroupId,
        );
        const result = await dependencies.repository.invoke(
          "drs_line_case_group_bind_from_webhook_v1",
          {
            provider_channel_digest: providerChannelDigest,
            webhook_event_digest: await hmacIdentityDigest(
              hmacKey,
              event.webhookEventId,
            ),
            challenge_digest: await hmacIdentityDigest(
              hmacKey,
              event.challenge,
            ),
            line_group_digest: await hmacIdentityDigest(
              hmacKey,
              event.lineGroupId,
            ),
            line_group_ciphertext: encrypted.ciphertext,
            line_group_iv: encrypted.iv,
            line_user_digest: event.lineUserId
              ? await hmacIdentityDigest(hmacKey, event.lineUserId)
              : null,
            encryption_key_version: encryptionKeyVersion,
            provider_timestamp_ms: event.timestamp,
            is_redelivery: event.isRedelivery,
          },
        );
        if (
          result.ok !== true || typeof result.state !== "string" ||
          !["BOUND", "REDELIVERED", "IGNORED"].includes(result.state)
        ) {
          throw new Error("runtime_unavailable");
        }
        states.push(result.state.toLowerCase());
      }
      return json({ accepted: true, states }, 200);
    } catch {
      return json({ state: "temporarily_unavailable" }, 503);
    }
  };
}
