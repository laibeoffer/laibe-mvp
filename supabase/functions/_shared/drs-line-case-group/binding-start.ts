import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import { isRfc3339, isUuid, readBindingStartInput } from "./contracts.ts";
import {
  base64UrlEncode,
  hmacIdentityDigest,
  randomProtocolValue,
} from "./crypto.ts";
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

type VerifiedSession =
  | Readonly<{
    state: "verified";
    session: Readonly<{
      userId: string;
      authSessionId: string;
      expiresAtEpochSeconds: number;
    }>;
  }>
  | Readonly<{ state: "denied" | "unavailable" }>;

type Dependencies = Readonly<{
  env: RuntimeEnvironment;
  repository: LineCaseGroupRepository;
  verify(request: Request): Promise<VerifiedSession>;
  now?: () => number;
}>;

function runtimeDependencies(): Dependencies {
  const env = runtimeEnvironment();
  if (!env) throw new Error("runtime_unavailable");
  const supabaseUrl = requiredEnvironment(env, "SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment(env, "SUPABASE_SERVICE_ROLE_KEY");
  return Object.freeze({
    env,
    repository: createLineCaseGroupRepository({ supabaseUrl, serviceRoleKey }),
    verify: (request) =>
      verifyAuthSession(request, {
        supabaseUrl,
        serviceRoleKey,
      }),
  });
}

export function createCaseGroupBindingStartHandler(
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
      url.pathname !== "/functions/v1/drs-line-case-group-binding-start" ||
      url.search !== ""
    ) return json({ state: "invalid_request" }, 400, cors);
    const input = readBindingStartInput(await exactJsonBody(request));
    if (!input) return json({ state: "invalid_request" }, 400, cors);

    const verified = await dependencies.verify(request);
    if (verified.state === "denied") {
      return json({ state: "permission_denied" }, 403, cors);
    }
    if (verified.state !== "verified") {
      return json({ state: "temporarily_unavailable" }, 503, cors);
    }
    try {
      const now = dependencies.now ?? Date.now;
      const expirationMs = Math.min(
        now() + 10 * 60_000,
        verified.session.expiresAtEpochSeconds * 1000,
      );
      if (expirationMs <= now()) {
        return json({ state: "permission_denied" }, 403, cors);
      }
      const challenge = base64UrlEncode(randomProtocolValue(32));
      const hmacKey = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_IDENTITY_HMAC_KEY",
      );
      const providerChannel = requiredEnvironment(
        dependencies.env,
        "DRS_LINE_PROVIDER_CHANNEL_ID",
      );
      const result = await dependencies.repository.invoke(
        "drs_line_case_group_binding_start_v1",
        {
          authenticated_user_id: verified.session.userId,
          auth_session_id: verified.session.authSessionId,
          provider_channel_digest: await hmacIdentityDigest(
            hmacKey,
            providerChannel,
          ),
          challenge_digest: await hmacIdentityDigest(hmacKey, challenge),
          expires_at: new Date(expirationMs).toISOString(),
        },
      );
      if (
        result.ok !== true || result.state !== "AWAITING_LINE_GROUP" ||
        !isUuid(result.intent_id) || !isUuid(result.case_id) ||
        !isRfc3339(result.expires_at)
      ) {
        if (result.ok === false && result.state === "CASE_NOT_AUTHORIZED") {
          return json({ state: "permission_denied" }, 403, cors);
        }
        return json({ state: "temporarily_unavailable" }, 503, cors);
      }
      return json(
        {
          state: "awaiting_line_group",
          intentId: result.intent_id,
          caseId: result.case_id,
          expiresAt: result.expires_at,
          bindingCommand: `DRS案件綁定 ${challenge}`,
        },
        200,
        cors,
      );
    } catch {
      return json({ state: "temporarily_unavailable" }, 503, cors);
    }
  };
}
