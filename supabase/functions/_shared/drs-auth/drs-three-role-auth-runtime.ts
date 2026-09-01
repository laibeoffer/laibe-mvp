import {
  closedResponse,
  corsHeaders,
  createAesGcmSecretEnvelope,
  DrsIdentityError,
  type FetchLike,
  type IdentityOAuthAdapter,
  isUuid,
  jsonResponse,
  randomOpaqueValue as createRandomOpaqueValue,
  readExactEmptyJsonBody,
  readOwnValue,
  type RuntimeEnvironment,
  type SecretEnvelope,
  sha256Digest,
} from "./contracts.ts";

const GOOGLE_START_PATH = "/functions/v1/drs-google-auth-start";
const GOOGLE_PROVIDER = "google";
const MAX_STATE_TTL_MS = 5 * 60 * 1000;
const MAX_OAUTH_VALUE_LENGTH = 2048;
const MAX_TOKEN_LENGTH = 16 * 1024;
const ALLOWED_START_X_HEADERS = Object.freeze([
  "x-client-info",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
  "x-real-ip",
  "x-request-id",
  "x-supabase-api-version",
]);

export type DrsThreeRoleOAuthStateRecord = Readonly<{
  stateDigest: string;
  provider: typeof GOOGLE_PROVIDER;
  redirectUri: string;
  pkceVerifierCiphertext: string;
  createdAt: Date;
  expiresAt: Date;
}>;

export type ClaimedDrsThreeRoleOAuthState = Readonly<{
  claimToken: string;
  pkceVerifierCiphertext: string;
  expiresAt: Date;
}>;

export interface DrsThreeRoleOAuthStateStore {
  createOAuthState(input: DrsThreeRoleOAuthStateRecord): Promise<void>;
  claimOAuthState(
    input: Readonly<{
      stateDigest: string;
      provider: typeof GOOGLE_PROVIDER;
      redirectUri: string;
      now: Date;
    }>,
  ): Promise<ClaimedDrsThreeRoleOAuthState>;
  finalizeOAuthState(
    input: Readonly<{ claimToken: string; now: Date }>,
  ): Promise<void>;
  failOAuthState(
    input: Readonly<{ claimToken: string; now: Date }>,
  ): Promise<void>;
}

export interface DrsThreeRoleTechnicalSessionProducer {
  createTechnicalSession(
    input: Readonly<{
      userId: string;
      authSessionId: string;
      accessToken: string;
      expiresAtEpochSeconds: number;
      callbackOrigin: string;
      successRedirectUrl: string;
      sessionCookieName: string;
    }>,
  ): Promise<Readonly<{ response: Response }>>;
}

export interface DrsThreeRoleGoogleAuthDependencies {
  allowedOrigin: string;
  redirectUri: string;
  sessionSuccessRedirectUrl: string;
  sessionCookieName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  now(): Date;
  stateTtlMs?: number;
  stateEnvelope: SecretEnvelope;
  stateStore: DrsThreeRoleOAuthStateStore;
  fetch: FetchLike;
  sessionProducer: DrsThreeRoleTechnicalSessionProducer;
  randomOpaqueValue?(byteLength?: number): string;
}

type VerifiedGoTrueSession = Readonly<{
  userId: string;
  authSessionId: string;
  accessToken: string;
  expiresAtEpochSeconds: number;
}>;

function exactUrl(value: string, kind: "origin" | "redirect" | "success"): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    (kind !== "redirect" && url.search)
  ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  if (
    kind === "origin" && (url.href !== url.origin + "/" || url.pathname !== "/")
  ) {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  if (kind === "redirect" && url.search) {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  return url;
}

function validHostCookieName(value: string): boolean {
  return /^__Host-[A-Za-z0-9_-]{1,96}$/u.test(value);
}

function assertDependencies(
  dependencies: DrsThreeRoleGoogleAuthDependencies,
): Readonly<{
  allowedOrigin: URL;
  redirectUri: URL;
  successUrl: URL;
  supabaseUrl: URL;
  stateTtlMs: number;
}> {
  const allowedOrigin = exactUrl(dependencies.allowedOrigin, "origin");
  const redirectUri = exactUrl(dependencies.redirectUri, "redirect");
  const successUrl = exactUrl(
    dependencies.sessionSuccessRedirectUrl,
    "success",
  );
  const supabaseUrl = exactUrl(dependencies.supabaseUrl, "origin");
  const stateTtlMs = dependencies.stateTtlMs ?? MAX_STATE_TTL_MS;
  if (
    successUrl.origin !== allowedOrigin.origin ||
    redirectUri.pathname !==
      "/functions/v1/drs-google-auth-callback" ||
    !validHostCookieName(dependencies.sessionCookieName) ||
    typeof dependencies.supabaseAnonKey !== "string" ||
    dependencies.supabaseAnonKey.length < 8 ||
    dependencies.supabaseAnonKey.length > MAX_TOKEN_LENGTH ||
    !Number.isSafeInteger(stateTtlMs) ||
    stateTtlMs <= 0 ||
    stateTtlMs > MAX_STATE_TTL_MS ||
    typeof dependencies.now !== "function" ||
    typeof dependencies.stateEnvelope?.encrypt !== "function" ||
    typeof dependencies.stateEnvelope?.decrypt !== "function" ||
    typeof dependencies.stateStore?.createOAuthState !== "function" ||
    typeof dependencies.stateStore?.claimOAuthState !== "function" ||
    typeof dependencies.stateStore?.finalizeOAuthState !== "function" ||
    typeof dependencies.stateStore?.failOAuthState !== "function" ||
    typeof dependencies.fetch !== "function" ||
    typeof dependencies.sessionProducer?.createTechnicalSession !== "function"
  ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  return Object.freeze({
    allowedOrigin,
    redirectUri,
    successUrl,
    supabaseUrl,
    stateTtlMs,
  });
}

function assertNoClientAuthorityHeaders(request: Request): void {
  if (request.headers.has("authorization")) {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  for (const name of request.headers.keys()) {
    if (name.startsWith("x-") && !ALLOWED_START_X_HEADERS.includes(name)) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
  }
}

function currentDate(now: () => Date): Date {
  const value = now();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  return new Date(value.getTime());
}

function validOAuthValue(value: unknown): value is string {
  return typeof value === "string" && value.length >= 16 &&
    value.length <= MAX_OAUTH_VALUE_LENGTH && /^[A-Za-z0-9._~-]+$/u.test(value);
}

async function assertExactStartRequest(
  request: Request,
  allowedOrigin: string,
): Promise<void> {
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    url.pathname !== GOOGLE_START_PATH ||
    url.search ||
    url.hash ||
    request.headers.get("origin") !== allowedOrigin ||
    request.headers.get("sec-fetch-site") !== "same-origin" ||
    !(await readExactEmptyJsonBody(request))
  ) throw new DrsIdentityError("INVALID_REQUEST", 400);
  assertNoClientAuthorityHeaders(request);
}

function exactCallbackInput(request: Request, redirectUri: URL): {
  code: string;
  state: string;
} {
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== redirectUri.origin ||
    url.pathname !== redirectUri.pathname ||
    url.hash ||
    request.headers.has("authorization")
  ) throw new DrsIdentityError("OAUTH_REDIRECT_MISMATCH", 403);
  const entries = [...url.searchParams.entries()];
  if (
    entries.length !== 2 ||
    entries.map(([key]) => key).sort().join(",") !== "code,state"
  ) throw new DrsIdentityError("OAUTH_STATE_INVALID", 403);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!validOAuthValue(code) || !validOAuthValue(state)) {
    throw new DrsIdentityError("OAUTH_STATE_INVALID", 403);
  }
  return { code, state };
}

function authorizationUrl(
  supabaseUrl: URL,
  redirectUri: URL,
  state: string,
  challenge: string,
): string {
  const callback = new URL(redirectUri);
  callback.searchParams.set("state", state);
  const url = new URL("/auth/v1/authorize", supabaseUrl);
  url.searchParams.set("provider", GOOGLE_PROVIDER);
  url.searchParams.set("redirect_to", callback.href);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");
  return url.href;
}

async function readBoundedJson(
  response: Response,
  maxBytes: number,
): Promise<unknown> {
  if (!response.body) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      total += result.value.byteLength;
      if (total < 1 || total > maxBytes) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      chunks.push(result.value);
    }
    if (total < 1) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text);
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // Cancellation is best-effort after a fail-closed response.
    }
    if (error instanceof DrsIdentityError) throw error;
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > 64 * 1024) {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  return await readBoundedJson(response, 64 * 1024);
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  if (accessToken.length > MAX_TOKEN_LENGTH) {
    throw new DrsIdentityError("AUTH_REQUIRED", 401);
  }
  const parts = accessToken.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new DrsIdentityError("AUTH_REQUIRED", 401);
  }
  try {
    const normalized = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const bytes = Uint8Array.from(
      atob(padded),
      (character) => character.charCodeAt(0),
    );
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (
      payload === null || typeof payload !== "object" || Array.isArray(payload)
    ) {
      throw new Error("invalid payload");
    }
    return payload as Record<string, unknown>;
  } catch {
    throw new DrsIdentityError("AUTH_REQUIRED", 401);
  }
}

async function verifyGoTrueSession(
  dependencies: DrsThreeRoleGoogleAuthDependencies,
  runtime: ReturnType<typeof assertDependencies>,
  code: string,
  pkceVerifier: string,
  nowEpochSeconds: number,
): Promise<VerifiedGoTrueSession> {
  const tokenUrl = new URL("/auth/v1/token", runtime.supabaseUrl);
  tokenUrl.searchParams.set("grant_type", "pkce");
  const tokenResponse = await dependencies.fetch(tokenUrl, {
    method: "POST",
    headers: {
      "apikey": dependencies.supabaseAnonKey,
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({ auth_code: code, code_verifier: pkceVerifier }),
  });
  const tokenPayload = await readJson(tokenResponse);
  const accessToken = readOwnValue(tokenPayload, "access_token");
  if (
    typeof accessToken !== "string" ||
    accessToken.length < 16 ||
    accessToken.length > MAX_TOKEN_LENGTH
  ) throw new DrsIdentityError("AUTH_REQUIRED", 401);

  const userResponse = await dependencies.fetch(
    new URL("/auth/v1/user", runtime.supabaseUrl),
    {
      method: "GET",
      headers: {
        "apikey": dependencies.supabaseAnonKey,
        "authorization": `Bearer ${accessToken}`,
        "accept": "application/json",
      },
    },
  );
  const userPayload = await readJson(userResponse);
  const verifiedUserId = readOwnValue(userPayload, "id");
  const claims = decodeJwtPayload(accessToken);
  const userId = readOwnValue(claims, "sub");
  const authSessionId = readOwnValue(claims, "session_id");
  const expiresAtEpochSeconds = readOwnValue(claims, "exp");
  if (
    !isUuid(verifiedUserId) ||
    !isUuid(userId) ||
    verifiedUserId !== userId ||
    !isUuid(authSessionId) ||
    typeof expiresAtEpochSeconds !== "number" ||
    !Number.isSafeInteger(expiresAtEpochSeconds) ||
    expiresAtEpochSeconds <= nowEpochSeconds
  ) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  return Object.freeze({
    userId,
    authSessionId,
    accessToken,
    expiresAtEpochSeconds,
  });
}

function validClaimedState(
  claimed: unknown,
  now: Date,
): claimed is ClaimedDrsThreeRoleOAuthState {
  if (
    claimed === null || typeof claimed !== "object" || Array.isArray(claimed)
  ) {
    return false;
  }
  const claimToken = readOwnValue(claimed, "claimToken");
  const ciphertext = readOwnValue(claimed, "pkceVerifierCiphertext");
  const expiresAt = readOwnValue(claimed, "expiresAt");
  return validOAuthValue(claimToken) &&
    typeof ciphertext === "string" && ciphertext.length > 0 &&
    ciphertext.length <= MAX_TOKEN_LENGTH &&
    expiresAt instanceof Date && Number.isFinite(expiresAt.getTime()) &&
    expiresAt.getTime() > now.getTime();
}

export function createDrsThreeRoleGoogleAuthAdapter(
  dependencies: DrsThreeRoleGoogleAuthDependencies,
): IdentityOAuthAdapter {
  const runtime = assertDependencies(dependencies);
  const random = dependencies.randomOpaqueValue ?? createRandomOpaqueValue;
  return Object.freeze({
    async start(request: Request): Promise<Response> {
      const origin = request.headers.get("origin");
      try {
        await assertExactStartRequest(request, runtime.allowedOrigin.origin);
        const state = random(32);
        const pkceVerifier = random(48);
        if (!validOAuthValue(state) || !validOAuthValue(pkceVerifier)) {
          throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
        }
        const challenge = await sha256Digest(pkceVerifier);
        const now = currentDate(dependencies.now);
        await dependencies.stateStore.createOAuthState(Object.freeze({
          stateDigest: await sha256Digest(state),
          provider: GOOGLE_PROVIDER,
          redirectUri: runtime.redirectUri.href,
          pkceVerifierCiphertext: await dependencies.stateEnvelope.encrypt(
            pkceVerifier,
          ),
          createdAt: now,
          expiresAt: new Date(now.getTime() + runtime.stateTtlMs),
        }));
        return jsonResponse(200, {
          authorizationUrl: authorizationUrl(
            runtime.supabaseUrl,
            runtime.redirectUri,
            state,
            challenge,
          ),
        }, corsHeaders(origin, [runtime.allowedOrigin.origin]));
      } catch (error) {
        return closedResponse(
          error,
          origin === runtime.allowedOrigin.origin ? origin : undefined,
        );
      }
    },

    async callback(request: Request): Promise<Response> {
      let claimToken: string | null = null;
      let now: Date | null = null;
      let finalized = false;
      try {
        const input = exactCallbackInput(request, runtime.redirectUri);
        now = currentDate(dependencies.now);
        const claimed = await dependencies.stateStore.claimOAuthState({
          stateDigest: await sha256Digest(input.state),
          provider: GOOGLE_PROVIDER,
          redirectUri: runtime.redirectUri.href,
          now,
        });
        if (!validClaimedState(claimed, now)) {
          throw new DrsIdentityError("OAUTH_STATE_INVALID", 403);
        }
        claimToken = claimed.claimToken;
        const pkceVerifier = await dependencies.stateEnvelope.decrypt(
          claimed.pkceVerifierCiphertext,
        );
        if (!validOAuthValue(pkceVerifier)) {
          throw new DrsIdentityError("OAUTH_STATE_INVALID", 403);
        }
        const session = await verifyGoTrueSession(
          dependencies,
          runtime,
          input.code,
          pkceVerifier,
          Math.floor(now.getTime() / 1000),
        );
        await dependencies.stateStore.finalizeOAuthState({ claimToken, now });
        finalized = true;
        const continuation = await dependencies.sessionProducer
          .createTechnicalSession({
            userId: session.userId,
            authSessionId: session.authSessionId,
            accessToken: session.accessToken,
            expiresAtEpochSeconds: session.expiresAtEpochSeconds,
            callbackOrigin: runtime.redirectUri.origin,
            successRedirectUrl: runtime.successUrl.href,
            sessionCookieName: dependencies.sessionCookieName,
          });
        if (!(continuation?.response instanceof Response)) {
          throw new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
        }
        return continuation.response;
      } catch (error) {
        if (claimToken && now && !finalized) {
          try {
            await dependencies.stateStore.failOAuthState({ claimToken, now });
          } catch {
            // The original denial remains authoritative; no callback retry is allowed.
          }
        }
        return closedResponse(error);
      }
    },
  });
}

export type DrsThreeRoleGoogleAuthRuntime = Readonly<{
  runtimeAvailable: boolean;
  adapter: IdentityOAuthAdapter | null;
}>;

export type DrsThreeRoleGoogleAuthRuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  crypto?: Crypto;
  now?: () => Date;
  sessionProducer: DrsThreeRoleTechnicalSessionProducer | null;
}>;

const UNAVAILABLE_GOOGLE_RUNTIME: DrsThreeRoleGoogleAuthRuntime = Object.freeze(
  {
    runtimeAvailable: false,
    adapter: null,
  },
);

function defaultEnvironment(): RuntimeEnvironment | null {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env?: RuntimeEnvironment };
  };
  return runtime.Deno?.env && typeof runtime.Deno.env.get === "function"
    ? runtime.Deno.env
    : null;
}

function base64UrlKey(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) return null;
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = atob(normalized.padEnd(44, "="));
    const key = new Uint8Array(new ArrayBuffer(decoded.length));
    for (let index = 0; index < decoded.length; index += 1) {
      key[index] = decoded.charCodeAt(index);
    }
    return key.byteLength === 32 ? key : null;
  } catch {
    return null;
  }
}

function httpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
        !url.search && !url.hash && url.pathname === "/"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function configuredRedirect(
  value: string,
  supabaseOrigin: string,
): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === supabaseOrigin &&
        !url.username && !url.password && !url.search && !url.hash &&
        url.pathname === "/functions/v1/drs-google-auth-callback"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function configuredSuccess(value: string, appOrigin: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === appOrigin &&
        !url.username && !url.password && !url.search && !url.hash
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function exactStateRpcBody(
  name: string,
  input: Record<string, unknown>,
): boolean {
  const keys = Object.keys(input);
  const exact = (expected: readonly string[]) =>
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key));
  if (name === "drs_three_role_oauth_state_create_v1") {
    return exact([
      "p_state_digest",
      "p_provider",
      "p_redirect_uri",
      "p_pkce_verifier_ciphertext",
      "p_created_at",
      "p_expires_at",
    ]);
  }
  if (name === "drs_three_role_oauth_state_claim_v1") {
    return exact([
      "p_state_digest",
      "p_provider",
      "p_redirect_uri",
      "p_now",
    ]);
  }
  return exact(["p_claim_token", "p_now"]);
}

function hasExactOwnKeys(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const keys = Object.keys(input);
  return keys.length === expected.length &&
    expected.every((key) => keys.includes(key));
}

function createSupabaseOAuthStateStore(
  supabaseOrigin: string,
  serviceRoleKey: string,
  fetch: FetchLike,
): DrsThreeRoleOAuthStateStore {
  const allowedNames = new Set([
    "drs_three_role_oauth_state_create_v1",
    "drs_three_role_oauth_state_claim_v1",
    "drs_three_role_oauth_state_finalize_v1",
    "drs_three_role_oauth_state_fail_v1",
  ]);
  const rpc = async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    try {
      if (!allowedNames.has(name) || !exactStateRpcBody(name, input)) {
        throw new Error("invalid rpc");
      }
      const response = await fetch(
        `${supabaseOrigin}/rest/v1/rpc/${name}`,
        {
          method: "POST",
          headers: {
            "authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
            "content-type": "application/json",
            "accept": "application/json",
          },
          body: JSON.stringify(input),
          redirect: "error",
        },
      );
      if (!response.ok || response.redirected) {
        throw new DrsIdentityError(
          response.status === 401 || response.status === 403
            ? "OAUTH_STATE_CONSUMED"
            : "CONTEXT_UNAVAILABLE",
          response.status === 401 || response.status === 403 ? 403 : 503,
        );
      }
      const rawLength = response.headers.get("content-length");
      if (rawLength && Number(rawLength) > 16 * 1024) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      const payload = await readBoundedJson(response, 16 * 1024);
      if (
        payload === null || typeof payload !== "object" ||
        Array.isArray(payload)
      ) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      return payload as Record<string, unknown>;
    } catch (error) {
      if (error instanceof DrsIdentityError) throw error;
      throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
    }
  };
  return Object.freeze({
    async createOAuthState(
      input: Parameters<DrsThreeRoleOAuthStateStore["createOAuthState"]>[0],
    ) {
      const projection = await rpc("drs_three_role_oauth_state_create_v1", {
        p_state_digest: input.stateDigest,
        p_provider: input.provider,
        p_redirect_uri: input.redirectUri,
        p_pkce_verifier_ciphertext: input.pkceVerifierCiphertext,
        p_created_at: input.createdAt.toISOString(),
        p_expires_at: input.expiresAt.toISOString(),
      });
      if (
        !hasExactOwnKeys(projection, ["created"]) ||
        readOwnValue(projection, "created") !== true
      ) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
    },
    async claimOAuthState(
      input: Parameters<DrsThreeRoleOAuthStateStore["claimOAuthState"]>[0],
    ) {
      const projection = await rpc("drs_three_role_oauth_state_claim_v1", {
        p_state_digest: input.stateDigest,
        p_provider: input.provider,
        p_redirect_uri: input.redirectUri,
        p_now: input.now.toISOString(),
      });
      const claimToken = readOwnValue(projection, "claim_token");
      const ciphertext = readOwnValue(projection, "pkce_verifier_ciphertext");
      const rawExpiresAt = readOwnValue(projection, "expires_at");
      if (
        !hasExactOwnKeys(projection, [
          "claim_token",
          "pkce_verifier_ciphertext",
          "expires_at",
        ]) ||
        typeof claimToken !== "string" ||
        typeof ciphertext !== "string" ||
        typeof rawExpiresAt !== "string" ||
        !Number.isFinite(Date.parse(rawExpiresAt))
      ) throw new DrsIdentityError("OAUTH_STATE_INVALID", 403);
      return Object.freeze({
        claimToken,
        pkceVerifierCiphertext: ciphertext,
        expiresAt: new Date(rawExpiresAt),
      });
    },
    async finalizeOAuthState(
      input: Parameters<DrsThreeRoleOAuthStateStore["finalizeOAuthState"]>[0],
    ) {
      const projection = await rpc("drs_three_role_oauth_state_finalize_v1", {
        p_claim_token: input.claimToken,
        p_now: input.now.toISOString(),
      });
      if (
        !hasExactOwnKeys(projection, ["consumed"]) ||
        readOwnValue(projection, "consumed") !== true
      ) {
        throw new DrsIdentityError("OAUTH_STATE_CONSUMED", 403);
      }
    },
    async failOAuthState(
      input: Parameters<DrsThreeRoleOAuthStateStore["failOAuthState"]>[0],
    ) {
      const projection = await rpc("drs_three_role_oauth_state_fail_v1", {
        p_claim_token: input.claimToken,
        p_now: input.now.toISOString(),
      });
      if (
        !hasExactOwnKeys(projection, ["failed"]) ||
        readOwnValue(projection, "failed") !== true
      ) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
    },
  });
}

export function createDrsThreeRoleGoogleAuthRuntime(
  options: DrsThreeRoleGoogleAuthRuntimeOptions,
): DrsThreeRoleGoogleAuthRuntime {
  try {
    if (!options.sessionProducer) return UNAVAILABLE_GOOGLE_RUNTIME;
    const environment = options.env ?? defaultEnvironment();
    if (!environment || typeof environment.get !== "function") {
      return UNAVAILABLE_GOOGLE_RUNTIME;
    }
    const supabaseUrl = environment.get("SUPABASE_URL");
    const serviceRoleKey = environment.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = environment.get("SUPABASE_ANON_KEY");
    const rawAppOrigin = environment.get("LAIBE_DRS_APP_ORIGIN");
    const rawRedirect = environment.get("LAIBE_DRS_GOOGLE_REDIRECT_URL");
    const rawSuccess = environment.get("LAIBE_DRS_SESSION_SUCCESS_URL");
    const sessionCookieName = environment.get("LAIBE_DRS_SESSION_COOKIE_NAME");
    const rawStateKey = environment.get("LAIBE_DRS_IDENTITY_STATE_KEY_V1");
    if (
      typeof supabaseUrl !== "string" ||
      typeof serviceRoleKey !== "string" || serviceRoleKey.length < 20 ||
      typeof anonKey !== "string" || anonKey.length < 8 ||
      typeof rawAppOrigin !== "string" ||
      typeof rawRedirect !== "string" ||
      typeof rawSuccess !== "string" ||
      typeof sessionCookieName !== "string" ||
      !/^__Host-[A-Za-z0-9_-]{1,96}$/u.test(sessionCookieName) ||
      typeof rawStateKey !== "string"
    ) return UNAVAILABLE_GOOGLE_RUNTIME;
    const supabaseOrigin = httpsOrigin(supabaseUrl);
    const appOrigin = httpsOrigin(rawAppOrigin);
    if (!supabaseOrigin || !appOrigin) return UNAVAILABLE_GOOGLE_RUNTIME;
    const redirectUri = configuredRedirect(rawRedirect, supabaseOrigin);
    const successUrl = configuredSuccess(rawSuccess, appOrigin);
    const stateKey = base64UrlKey(rawStateKey);
    const fetch = options.fetch ?? globalThis.fetch;
    const crypto = options.crypto ?? globalThis.crypto;
    const now = options.now ?? (() => new Date());
    if (
      !redirectUri || !successUrl || !stateKey ||
      typeof fetch !== "function" || !crypto?.subtle ||
      typeof crypto.getRandomValues !== "function" || typeof now !== "function"
    ) return UNAVAILABLE_GOOGLE_RUNTIME;
    const adapter = createDrsThreeRoleGoogleAuthAdapter({
      allowedOrigin: appOrigin,
      redirectUri,
      sessionSuccessRedirectUrl: successUrl,
      sessionCookieName,
      supabaseUrl: supabaseOrigin,
      supabaseAnonKey: anonKey,
      now,
      stateTtlMs: MAX_STATE_TTL_MS,
      stateEnvelope: awaitableSecretEnvelope(
        createAesGcmSecretEnvelope(stateKey),
      ),
      stateStore: createSupabaseOAuthStateStore(
        supabaseOrigin,
        serviceRoleKey,
        fetch,
      ),
      fetch,
      sessionProducer: options.sessionProducer,
    });
    return Object.freeze({ runtimeAvailable: true, adapter });
  } catch {
    return UNAVAILABLE_GOOGLE_RUNTIME;
  }
}

function awaitableSecretEnvelope(
  envelopePromise: Promise<SecretEnvelope>,
): SecretEnvelope {
  return Object.freeze({
    async encrypt(value: string): Promise<string> {
      return await (await envelopePromise).encrypt(value);
    },
    async decrypt(value: string): Promise<string> {
      return await (await envelopePromise).decrypt(value);
    },
  });
}
