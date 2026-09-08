import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import { readBoundedRpcJson } from "./auth-bound-session.ts";
import {
  closedResponse,
  corsHeaders,
  DrsIdentityError,
  type FetchLike,
  isUuid,
  readDenialState,
  readExactEmptyJsonBody,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
  strictPreflight,
  validateDrsAuthorityFacts,
} from "./contracts.ts";

const ENDPOINT_PATH = "/functions/v1/drs-password-auth-session";
const REVIEWER_ACCESS_PATH = "/pcm/reviewer/access/";
const MAX_TOKEN_LENGTH = 16 * 1024;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const HOST_COOKIE_PATTERN = /^__Host-[A-Za-z0-9_-]{1,64}$/u;

export interface DrsPasswordAuthSessionDependencies {
  allowedOrigin: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  sessionCookieName: string;
  sessionSuccessRedirectUrl: string;
  now(): Date;
  fetch: FetchLike;
  authorityResolver: DrsPasswordSessionAuthorityResolver;
  sessionProducer: PasswordVerifiedSessionProducer;
}

export interface PasswordVerifiedSessionProducer {
  createVerifiedSession(
    input: Readonly<{
      authenticatedUserId: string;
      authSessionId: string;
      supabaseAccessToken: string;
      authExpiresAtEpochSeconds: number;
      specialistId: string;
      authorizationSubject: string;
      callbackOrigin: string;
      successRedirectUrl: string;
      sessionCookieName: string;
    }>,
  ): Promise<{ response: Response }>;
}

export interface DrsPasswordSessionAuthorityResolver {
  resolveAuthority(
    input: Readonly<{ authenticatedUserId: string; authSessionId: string }>,
  ): Promise<unknown>;
}

type RuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  now?: () => Date;
  authorityResolver?: DrsPasswordSessionAuthorityResolver | null;
  sessionProducer?: PasswordVerifiedSessionProducer | null;
}>;

type Runtime = Readonly<{
  allowedOrigin: URL;
  supabaseOrigin: URL;
  successUrl: URL;
}>;

function exactOrigin(value: string, allowLoopback = false): URL {
  const url = new URL(value);
  const loopback = allowLoopback && url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (
    (url.protocol !== "https:" && !loopback) ||
    url.username || url.password || url.pathname !== "/" || url.search ||
    url.hash
  ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  return url;
}

function assertDependencies(
  dependencies: DrsPasswordAuthSessionDependencies,
): Runtime {
  const allowedOrigin = exactOrigin(dependencies.allowedOrigin, true);
  const supabaseOrigin = exactOrigin(dependencies.supabaseUrl);
  const successUrl = new URL(dependencies.sessionSuccessRedirectUrl);
  if (
    successUrl.origin !== allowedOrigin.origin ||
    successUrl.pathname !== REVIEWER_ACCESS_PATH || successUrl.search ||
    successUrl.hash !== "#login" ||
    !HOST_COOKIE_PATTERN.test(dependencies.sessionCookieName) ||
    typeof dependencies.serviceRoleKey !== "string" ||
    dependencies.serviceRoleKey.length < 8 ||
    dependencies.serviceRoleKey.length > MAX_TOKEN_LENGTH ||
    typeof dependencies.now !== "function" ||
    typeof dependencies.fetch !== "function" ||
    typeof dependencies.authorityResolver?.resolveAuthority !== "function" ||
    typeof dependencies.sessionProducer?.createVerifiedSession !== "function"
  ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  return Object.freeze({ allowedOrigin, supabaseOrigin, successUrl });
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/u.exec(authorization);
  const token = match?.[1] ?? "";
  if (
    token.length < 16 || token.length > MAX_TOKEN_LENGTH ||
    !JWT_PATTERN.test(token)
  ) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  return token;
}

function exactRequest(
  request: Request,
  runtime: Runtime,
): { origin: string; accessToken: string } {
  const url = new URL(request.url);
  const origin = request.headers.get("origin") ?? "";
  if (
    request.method !== "POST" || url.pathname !== ENDPOINT_PATH ||
    url.search || url.hash || origin !== runtime.allowedOrigin.origin
  ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 403);
  return { origin, accessToken: bearerToken(request) };
}

function safeSessionCookie(
  response: Response,
  sessionCookieName: string,
  successUrl: URL,
): string {
  const cookie = response.headers.get("set-cookie") ?? "";
  if (
    response.status !== 303 ||
    response.headers.get("location") !== successUrl.href ||
    response.headers.get("x-laibe-session-state") !== "SESSION_ESTABLISHED" ||
    cookie.length === 0 || cookie.length > 32 * 1024 ||
    /[\r\n]/u.test(cookie) || !cookie.startsWith(`${sessionCookieName}=`) ||
    !cookie.includes("; Path=/") || !cookie.includes("; HttpOnly") ||
    !cookie.includes("; Secure") || !cookie.includes("; SameSite=Lax")
  ) throw new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
  return cookie;
}

export function createDrsPasswordAuthSessionHandler(
  dependencies?: DrsPasswordAuthSessionDependencies,
): (request: Request) => Promise<Response> {
  let runtime: Runtime | null = null;
  try {
    if (dependencies) runtime = assertDependencies(dependencies);
  } catch {
    runtime = null;
  }
  return async (request) => {
    if (!dependencies || !runtime) {
      return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 503));
    }
    if (request.method === "OPTIONS") {
      return strictPreflight(request, runtime.allowedOrigin.origin, "POST");
    }
    let origin: string | undefined;
    try {
      const input = exactRequest(request, runtime);
      origin = input.origin;
      if (!await readExactEmptyJsonBody(request)) {
        throw new DrsIdentityError("INVALID_REQUEST", 400);
      }
      const verification = await verifyAuthSession(request, {
        supabaseUrl: dependencies.supabaseUrl,
        serviceRoleKey: dependencies.serviceRoleKey,
        fetch: dependencies.fetch,
        now: () => dependencies.now().getTime(),
      });
      if (verification.state !== "verified") {
        throw new DrsIdentityError(
          verification.state === "unavailable"
            ? "CONTEXT_UNAVAILABLE"
            : "AUTH_REQUIRED",
          verification.state === "unavailable" ? 503 : 401,
        );
      }
      const { userId, authSessionId, expiresAtEpochSeconds } =
        verification.session;
      const now = dependencies.now();
      const authorityInput = await dependencies.authorityResolver
        .resolveAuthority({ authenticatedUserId: userId, authSessionId });
      const authority = validateDrsAuthorityFacts(authorityInput, {
        authenticatedUserId: userId,
        nowMs: now.getTime(),
        requireLocked: true,
      });
      if (!authority) {
        const state = readDenialState(authorityInput);
        throw new DrsIdentityError(
          state,
          state === "CONTEXT_UNAVAILABLE"
            ? 503
            : state === "AUTH_REQUIRED"
            ? 401
            : 403,
        );
      }
      const result = await dependencies.sessionProducer.createVerifiedSession({
        authenticatedUserId: userId,
        authSessionId,
        supabaseAccessToken: input.accessToken,
        authExpiresAtEpochSeconds: expiresAtEpochSeconds,
        specialistId: authority.specialistId,
        authorizationSubject: authority.authorizationSubject,
        callbackOrigin: runtime.allowedOrigin.origin,
        successRedirectUrl: runtime.successUrl.href,
        sessionCookieName: dependencies.sessionCookieName,
      });
      if (!(result?.response instanceof Response)) {
        throw new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
      }
      const cookie = safeSessionCookie(
        result.response,
        dependencies.sessionCookieName,
        runtime.successUrl,
      );
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(origin, [runtime.allowedOrigin.origin]),
          "set-cookie": cookie,
          "x-laibe-session-state": "SESSION_ESTABLISHED",
          "cache-control": "no-store",
          pragma: "no-cache",
          "x-content-type-options": "nosniff",
        },
      });
    } catch (error) {
      return closedResponse(error, origin);
    }
  };
}

export function createDrsPasswordAuthSessionRuntimeDependencies(
  options: RuntimeOptions = {},
): DrsPasswordAuthSessionDependencies | undefined {
  const sessionProducer = options.sessionProducer;
  const authorityResolver = options.authorityResolver;
  const allowedOrigin = readRuntimeEnvironment(
    options.env,
    "LAIBE_DRS_APP_ORIGIN",
  );
  const supabaseUrl = readRuntimeEnvironment(options.env, "SUPABASE_URL");
  const serviceRoleKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const sessionCookieName = readRuntimeEnvironment(
    options.env,
    "LAIBE_DRS_SESSION_COOKIE_NAME",
  );
  const sessionSuccessRedirectUrl = readRuntimeEnvironment(
    options.env,
    "LAIBE_DRS_SESSION_SUCCESS_URL",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (
    !sessionProducer || !authorityResolver || !allowedOrigin || !supabaseUrl ||
    !serviceRoleKey ||
    !sessionCookieName || !sessionSuccessRedirectUrl ||
    typeof fetchImplementation !== "function"
  ) return undefined;
  return Object.freeze({
    allowedOrigin,
    supabaseUrl,
    serviceRoleKey,
    sessionCookieName,
    sessionSuccessRedirectUrl,
    now: options.now ?? (() => new Date()),
    fetch: fetchImplementation,
    authorityResolver,
    sessionProducer,
  });
}

export function createSupabaseDrsPasswordSessionAuthorityResolver(
  options: Readonly<{
    env?: RuntimeEnvironment;
    fetch?: FetchLike;
  }> = {},
): DrsPasswordSessionAuthorityResolver | null {
  const supabaseUrl = readRuntimeEnvironment(options.env, "SUPABASE_URL");
  const serviceRoleKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (
    !supabaseUrl || !serviceRoleKey || serviceRoleKey.length < 32 ||
    typeof fetchImplementation !== "function"
  ) return null;
  let origin: URL;
  try {
    origin = exactOrigin(supabaseUrl);
  } catch {
    return null;
  }
  return Object.freeze({
    async resolveAuthority(
      input: Readonly<{ authenticatedUserId: string; authSessionId: string }>,
    ) {
      if (
        !isUuid(input?.authenticatedUserId) || !isUuid(input?.authSessionId)
      ) {
        throw new DrsIdentityError("CASE_NOT_AUTHORIZED", 403);
      }
      let response: Response;
      try {
        response = await fetchImplementation(
          new URL(
            "/rest/v1/rpc/drs_password_session_authority_v1",
            origin,
          ),
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
            headers: {
              apikey: serviceRoleKey,
              authorization: `Bearer ${serviceRoleKey}`,
              "content-type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({
              p_authenticated_user_id: input.authenticatedUserId,
              p_auth_session_id: input.authSessionId,
            }),
          },
        );
      } catch {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      try {
        return await readBoundedRpcJson(response);
      } catch {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
    },
  });
}
