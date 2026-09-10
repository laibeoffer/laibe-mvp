import { createDrsSecureSessionRuntime } from "../drs-auth/drs-secure-session-runtime.ts";
import { isUuid, readReviewEnqueueInput } from "./contracts.ts";
import { hmacIdentityDigest } from "./crypto.ts";
import {
  corsHeaders,
  exactJsonBody,
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
  verify(request: Request): Promise<
    Readonly<{
      state: "verified";
      proof: Readonly<{
        serverSessionId: string;
        accessTokenDigest: string;
        authenticatedUserId: string;
        authSessionId: string;
        authTokenDigest: string;
      }>;
    }> | Readonly<{ state: "denied" | "unavailable" }>
  >;
}>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256_BASE64URL = /^[A-Za-z0-9_-]{43}$/u;

function own(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, key)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function proofFromRuntime(value: unknown) {
  const serverSessionId = own(value, "p_server_session_id");
  const accessTokenDigest = own(value, "p_access_token_digest");
  const authenticatedUserId = own(value, "p_authenticated_user_id");
  const authSessionId = own(value, "p_auth_session_id");
  const authTokenDigest = own(value, "p_auth_token_digest");
  if (
    typeof serverSessionId !== "string" || !UUID.test(serverSessionId) ||
    typeof accessTokenDigest !== "string" ||
    !SHA256_BASE64URL.test(accessTokenDigest) ||
    typeof authenticatedUserId !== "string" ||
    !UUID.test(authenticatedUserId) ||
    typeof authSessionId !== "string" || !UUID.test(authSessionId) ||
    typeof authTokenDigest !== "string" ||
    !SHA256_BASE64URL.test(authTokenDigest)
  ) return null;
  return Object.freeze({
    serverSessionId,
    accessTokenDigest,
    authenticatedUserId,
    authSessionId,
    authTokenDigest,
  });
}

function errorStatus(error: unknown): number {
  const status = own(error, "status");
  return typeof status === "number" ? status : 0;
}

async function verifySealedDrsSession(request: Request) {
  const runtime = createDrsSecureSessionRuntime();
  if (!runtime.runtimeAvailable || !runtime.authBoundSession) {
    return Object.freeze({ state: "unavailable" as const });
  }
  const bound = runtime.authBoundSession;
  const config = bound.options;
  try {
    if (
      request.headers.get("origin") !== config.allowedOrigin ||
      request.headers.has("authorization") ||
      [...request.headers.keys()].some((name) => name.startsWith("x-laibe-"))
    ) return Object.freeze({ state: "denied" as const });
    const rawCookie = request.headers.get("cookie") ?? "";
    if (rawCookie.length === 0 || rawCookie.length > 8192) {
      return Object.freeze({ state: "denied" as const });
    }
    const prefix = `${config.sessionCookieName}=`;
    const matches = rawCookie.split(";").map((part) => part.trim()).filter(
      (part) => part.startsWith(prefix),
    );
    if (matches.length !== 1) {
      return Object.freeze({ state: "denied" as const });
    }
    const envelope = await bound.codec.openCookieEnvelope(
      matches[0].slice(prefix.length),
    );
    if (
      envelope.expiresAtEpochSeconds <=
        Math.floor(config.now().getTime() / 1000)
    ) return Object.freeze({ state: "denied" as const });
    await bound.verifyEnvelopeAuth(envelope);
    const proof = proofFromRuntime(await bound.proofBody(envelope));
    return proof
      ? Object.freeze({ state: "verified" as const, proof })
      : Object.freeze({ state: "unavailable" as const });
  } catch (error) {
    return [401, 403].includes(errorStatus(error))
      ? Object.freeze({ state: "denied" as const })
      : Object.freeze({ state: "unavailable" as const });
  }
}

function runtimeDependencies(): Dependencies {
  const env = runtimeEnvironment();
  if (!env) throw new Error("runtime_unavailable");
  const supabaseUrl = requiredEnvironment(env, "SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment(env, "SUPABASE_SERVICE_ROLE_KEY");
  return Object.freeze({
    env,
    repository: createLineCaseGroupRepository({ supabaseUrl, serviceRoleKey }),
    verify: verifySealedDrsSession,
  });
}

export function createReviewNotificationEnqueueHandler(
  injected?: Dependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    let dependencies: Dependencies;
    try {
      dependencies = injected ?? runtimeDependencies();
    } catch {
      return json({ state: "temporarily_unavailable" }, 503);
    }
    const cors = corsHeaders(request, dependencies.env);
    if (request.method === "OPTIONS") {
      return cors
        ? new Response(null, { status: 204, headers: cors })
        : json({ state: "permission_denied" }, 403);
    }
    const url = new URL(request.url);
    if (
      !cors || request.method !== "POST" ||
      url.pathname !== "/functions/v1/drs-line-review-notification-enqueue" ||
      url.search !== ""
    ) return json({ state: "invalid_request" }, 400, cors);
    const input = readReviewEnqueueInput(await exactJsonBody(request));
    if (!input) return json({ state: "invalid_request" }, 400, cors);
    const verified = await dependencies.verify(request);
    if (verified.state === "denied") {
      return json({ state: "permission_denied" }, 403, cors);
    }
    if (verified.state !== "verified") {
      return json({ state: "temporarily_unavailable" }, 503, cors);
    }
    try {
      const hmacKey = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_IDENTITY_HMAC_KEY",
      );
      const channel = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_PROVIDER_CHANNEL_ID",
      );
      const result = await dependencies.repository.invoke(
        "drs_line_review_notification_enqueue_v1",
        {
          server_session_id: verified.proof.serverSessionId,
          access_token_digest: verified.proof.accessTokenDigest,
          authenticated_user_id: verified.proof.authenticatedUserId,
          auth_session_id: verified.proof.authSessionId,
          auth_token_digest: verified.proof.authTokenDigest,
          review_event_id: input.reviewEventId,
          provider_channel_digest: await hmacIdentityDigest(hmacKey, channel),
        },
      );
      if (
        result.ok !== true ||
        !["ENQUEUED", "ALREADY_ENQUEUED"].includes(String(result.state)) ||
        !isUuid(result.outbox_id)
      ) {
        if (result.ok === false && result.state === "CASE_NOT_AUTHORIZED") {
          return json({ state: "permission_denied" }, 403, cors);
        }
        if (result.ok === false && result.state === "GROUP_NOT_BOUND") {
          return json({ state: "line_group_not_bound" }, 409, cors);
        }
        return json({ state: "temporarily_unavailable" }, 503, cors);
      }
      return json(
        {
          state: result.state === "ENQUEUED" ? "enqueued" : "already_enqueued",
          outboxId: result.outbox_id,
        },
        200,
        cors,
      );
    } catch {
      return json({ state: "temporarily_unavailable" }, 503, cors);
    }
  };
}
