import {
  callSupabaseRpc,
  type CaseMemberRole,
  closedResult,
  createSupabaseCalendarRuntimeConfig,
  type GoogleCalendarAccountRole,
  isMissing,
  isOwnNonEmptyString,
  jsonResponse,
  readOwnData,
  resolveSupabaseAuthenticatedIdentity,
  type SupabaseCalendarRuntimeOptions,
} from "./contracts.ts";
import { authorizeCaseMemberContext } from "./case-calendar-authorization.ts";

const TextEncoderConstructor = TextEncoder;
const TextDecoderConstructor = TextDecoder;
const Uint8ArrayConstructor = Uint8Array;
const DateConstructor = Date;
const JSONStringify = JSON.stringify;
const JSONParse = JSON.parse;
const EncodeURIComponent = encodeURIComponent;
const ArrayIsArray = Array.isArray;
const OAUTH_SCOPE = "openid https://www.googleapis.com/auth/calendar.readonly";
const DRS_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type OAuthMaterialOptions = { nowMs?: number; ttlMs?: number };
type OAuthPending = {
  stateDigest: string;
  authenticatedUserId: string;
  currentCaseId?: string;
  accountRole?: GoogleCalendarAccountRole;
  authorizationSubject?: string;
  assignmentId?: string;
  redirectUri?: string;
  sealedVerifier?: string;
  expiresAt: string;
  claimedAt?: string | null;
  consumedAt: string | null;
};

// deno-lint-ignore no-explicit-any -- handler factories accept injected test/runtime capabilities.
type OAuthDependencies = Record<string, any>;

type ProviderFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GoogleOAuthAdapterOptions = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetch: ProviderFetch;
};

export type DrsSpecialistAuthorizationStrategy = {
  readonly requiresAssignmentBinding?: boolean;
  resolveAuthorization(input: {
    authenticatedUserId: string;
    accountRole: "drs";
    pending:
      | Readonly<{
        currentCaseId: string;
        authorizationSubject: string;
        assignmentId?: string;
      }>
      | null;
  }): Promise<unknown>;
};

export type SupabaseGoogleCalendarOAuthOptions =
  & SupabaseCalendarRuntimeOptions
  & {
    drsAuthorizationStrategy?: DrsSpecialistAuthorizationStrategy | null;
  };

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll(
    "=",
    "",
  );
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8ArrayConstructor(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export function exactDrsGrantedScopes(
  value: unknown,
): readonly string[] | null {
  if (!ArrayIsArray(value)) return null;
  const length = readOwnData(value, "length");
  if (length !== 2) return null;
  let openidCount = 0;
  let readonlyCount = 0;
  const scopes: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const scope = readOwnData(value, String(index));
    if (scope !== "openid" && scope !== DRS_READONLY_SCOPE) return null;
    if (scope === "openid") openidCount += 1;
    if (scope === DRS_READONLY_SCOPE) readonlyCount += 1;
    scopes.push(scope);
  }
  return openidCount === 1 && readonlyCount === 1
    ? Object.freeze(scopes)
    : null;
}

export async function digestOAuthState(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoderConstructor().encode(value),
  );
  return base64Url(new Uint8ArrayConstructor(digest));
}

export async function issueOAuthMaterial(options: OAuthMaterialOptions = {}) {
  const nowMs = Number.isFinite(options.nowMs)
    ? options.nowMs as number
    : DateConstructor.now();
  const ttlMs = Number.isFinite(options.ttlMs)
    ? options.ttlMs as number
    : 10 * 60 * 1000;
  const stateBytes = new Uint8ArrayConstructor(32);
  const verifierBytes = new Uint8ArrayConstructor(48);
  crypto.getRandomValues(stateBytes);
  crypto.getRandomValues(verifierBytes);
  const state = base64Url(stateBytes);
  const codeVerifier = base64Url(verifierBytes);
  return {
    state,
    stateDigest: await digestOAuthState(state),
    codeVerifier,
    codeChallenge: await digestOAuthState(codeVerifier),
    expiresAt: new DateConstructor(nowMs + ttlMs).toISOString(),
  };
}

export async function validateOAuthState(
  rawState: unknown,
  pending: OAuthPending | null,
  authenticatedUserId: string,
  nowMs: number,
): Promise<boolean> {
  try {
    if (typeof rawState !== "string" || rawState.length < 40) return false;
    if (!pending || pending.consumedAt !== null || pending.claimedAt) {
      return false;
    }
    if (pending.authenticatedUserId !== authenticatedUserId) return false;
    if (DateConstructor.parse(pending.expiresAt) <= nowMs) return false;
    return await digestOAuthState(rawState) === pending.stateDigest;
  } catch {
    return false;
  }
}

function caseMemberAuthorizationSubject(
  role: CaseMemberRole,
  authenticatedUserId: string,
  currentCaseId: string,
): string {
  return `case-member:${role}:${authenticatedUserId}:${currentCaseId}`;
}

export function authorizeGoogleCalendarAccountContext(
  expectedRole: GoogleCalendarAccountRole,
  input: unknown,
) {
  try {
    if (expectedRole === "owner" || expectedRole === "pro") {
      const authorized = authorizeCaseMemberContext(expectedRole, input);
      if (!authorized.ok) return authorized;
      const authenticatedUserId = readOwnData(input, "authenticatedUserId");
      const currentCaseId = readOwnData(input, "currentCaseId");
      if (
        typeof authenticatedUserId !== "string" ||
        typeof currentCaseId !== "string"
      ) {
        return closedResult("CONTEXT_UNAVAILABLE");
      }
      return {
        ok: true,
        state: "AUTHORIZED",
        context: {
          authenticatedUserId,
          currentCaseId,
          accountRole: expectedRole,
          authorizationSubject: caseMemberAuthorizationSubject(
            expectedRole,
            authenticatedUserId,
            currentCaseId,
          ),
          membership: readOwnData(input, "membership"),
        },
      };
    }
    if (expectedRole !== "drs") {
      return closedResult("CASE_NOT_AUTHORIZED");
    }
    if (!isOwnNonEmptyString(input, "authenticatedUserId", 128)) {
      return closedResult("CONTEXT_UNAVAILABLE");
    }
    if (!isOwnNonEmptyString(input, "currentCaseId", 128)) {
      return closedResult("CONTEXT_UNAVAILABLE");
    }
    if (!isOwnNonEmptyString(input, "authorizationSubject", 512)) {
      return closedResult("CASE_NOT_AUTHORIZED");
    }
    const authenticatedUserId = readOwnData(input, "authenticatedUserId");
    const currentCaseId = readOwnData(input, "currentCaseId");
    if (
      readOwnData(input, "accountRole") !== "drs" ||
      readOwnData(input, "authBindingStatus") !== "active" ||
      readOwnData(input, "specialistStatus") !== "active" ||
      readOwnData(input, "assignmentStatus") !== "active" ||
      readOwnData(input, "selectedCaseId") !== currentCaseId ||
      !isMissing(readOwnData(input, "membership"))
    ) {
      return closedResult("CASE_NOT_AUTHORIZED");
    }
    return {
      ok: true,
      state: "AUTHORIZED",
      context: {
        authenticatedUserId,
        currentCaseId,
        accountRole: "drs",
        authorizationSubject: readOwnData(input, "authorizationSubject"),
        authBindingStatus: "active",
        specialistStatus: "active",
        assignmentStatus: "active",
        selectedCaseId: currentCaseId,
        ...(typeof readOwnData(input, "specialistId") === "string"
          ? { specialistId: readOwnData(input, "specialistId") }
          : {}),
        ...(typeof readOwnData(input, "assignmentId") === "string"
          ? { assignmentId: readOwnData(input, "assignmentId") }
          : {}),
        ...(typeof readOwnData(input, "validFrom") === "string"
          ? { validFrom: readOwnData(input, "validFrom") }
          : {}),
        ...(typeof readOwnData(input, "validUntil") === "string"
          ? { validUntil: readOwnData(input, "validUntil") }
          : {}),
        ...(readOwnData(input, "terminatedAt") === null
          ? { terminatedAt: null }
          : {}),
        ...(readOwnData(input, "lockStatus") === "locked"
          ? { lockStatus: "locked" }
          : {}),
      },
    };
  } catch {
    return closedResult("CONTEXT_UNAVAILABLE");
  }
}

export function createGoogleOAuthAdapter(options: GoogleOAuthAdapterOptions) {
  const fetchImplementation = options.fetch;
  return {
    createAuthorizationUrl(input: Record<string, string>) {
      const query = [
        ["client_id", options.clientId],
        ["redirect_uri", options.redirectUri],
        ["response_type", "code"],
        ["scope", OAUTH_SCOPE],
        ["access_type", "offline"],
        ["prompt", "consent"],
        ["state", input.state],
        ["code_challenge", input.codeChallenge],
        ["code_challenge_method", "S256"],
      ].map(([key, value]) => `${key}=${EncodeURIComponent(value)}`).join("&");
      return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
    },
    async exchangeCode(input: Record<string, string>) {
      try {
        const body = new URLSearchParams({
          client_id: options.clientId,
          client_secret: options.clientSecret,
          code: input.code,
          code_verifier: input.codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: options.redirectUri,
        });
        const response = await fetchImplementation(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body,
          },
        );
        if (!response.ok) {
          return {
            ok: false,
            publicResult: { state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" },
          };
        }
        const payload = await response.json();
        if (
          typeof payload.access_token !== "string" ||
          payload.access_token.length === 0
        ) {
          return {
            ok: false,
            publicResult: { state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" },
          };
        }
        return {
          ok: true,
          publicResult: {
            state: "CONNECTED_PENDING_BINDING",
            expiresIn: Number(payload.expires_in) || 0,
            scopes: typeof payload.scope === "string"
              ? payload.scope.split(" ")
              : [],
          },
          credentialEnvelope: {
            accessToken: payload.access_token,
            refreshToken: typeof payload.refresh_token === "string"
              ? payload.refresh_token
              : null,
            expiresIn: Number(payload.expires_in) || 0,
            idToken: typeof payload.id_token === "string"
              ? payload.id_token
              : null,
          },
        };
      } catch {
        return {
          ok: false,
          publicResult: { state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" },
        };
      }
    },
    async resolveGoogleAccountAndCalendar(accessToken: string) {
      try {
        const identityResponse = await fetchImplementation(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { authorization: `Bearer ${accessToken}` },
          },
        );
        if (!identityResponse.ok) return null;
        const identity = await identityResponse.json();
        if (!isOwnNonEmptyString(identity, "sub")) {
          return null;
        }
        const calendarResponse = await fetchImplementation(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
          { headers: { authorization: `Bearer ${accessToken}` } },
        );
        if (!calendarResponse.ok) return null;
        const calendarList = await calendarResponse.json();
        const items = readOwnData(calendarList, "items");
        if (!ArrayIsArray(items)) return null;
        const length = readOwnData(items, "length");
        if (
          typeof length !== "number" || !Number.isSafeInteger(length) ||
          length > 10_000
        ) return null;
        for (let index = 0; index < length; index += 1) {
          const item = readOwnData(items, String(index));
          if (
            readOwnData(item, "primary") === true &&
            isOwnNonEmptyString(item, "id")
          ) {
            return {
              googleSubject: readOwnData(identity, "sub") as string,
              calendarId: readOwnData(item, "id") as string,
            };
          }
        }
        return null;
      } catch {
        return null;
      }
    },
  };
}

export async function encryptCredentialEnvelope(
  envelope: unknown,
  keyBase64Url: string,
): Promise<string> {
  const keyBytes = decodeBase64Url(keyBase64Url);
  if (keyBytes.length !== 32) throw new Error("INVALID_ENCRYPTION_KEY");
  const key = await crypto.subtle.importKey(
    "raw",
    exactArrayBuffer(keyBytes),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = new Uint8ArrayConstructor(12);
  crypto.getRandomValues(iv);
  const plaintext = new TextEncoderConstructor().encode(
    JSONStringify(envelope),
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  return `${base64Url(iv)}.${base64Url(new Uint8ArrayConstructor(ciphertext))}`;
}

export async function decryptCredentialEnvelope(
  sealed: string,
  keyBase64Url: string,
): Promise<unknown> {
  const [ivPart, ciphertextPart] = String(sealed).split(".");
  const keyBytes = decodeBase64Url(keyBase64Url);
  if (keyBytes.length !== 32 || !ivPart || !ciphertextPart) {
    throw new Error("INVALID_ENVELOPE");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    exactArrayBuffer(keyBytes),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: exactArrayBuffer(decodeBase64Url(ivPart)) },
    key,
    exactArrayBuffer(decodeBase64Url(ciphertextPart)),
  );
  return JSONParse(new TextDecoderConstructor().decode(plaintext));
}

function readRuntimeEnv(
  options: SupabaseCalendarRuntimeOptions,
  name: string,
): string | undefined {
  const explicit = options.env?.get(name);
  if (explicit) return explicit;
  const runtimeGlobal = globalThis as typeof globalThis & {
    Deno?: { env?: { get(name: string): string | undefined } };
  };
  try {
    return runtimeGlobal.Deno?.env?.get(name);
  } catch {
    return undefined;
  }
}

function exactHttpsRedirectUri(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return null;
  }
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.href !== value
    ) return null;
    return value;
  } catch {
    return null;
  }
}

function requestHeader(request: Request, name: string): string {
  try {
    return request.headers.get(name) ?? "";
  } catch {
    return "";
  }
}

function originAllowed(origin: string, allowedOrigins: unknown): boolean {
  if (!ArrayIsArray(allowedOrigins)) return true;
  const length = readOwnData(allowedOrigins, "length");
  if (typeof length !== "number" || length <= 0) return true;
  for (let index = 0; index < length; index += 1) {
    if (readOwnData(allowedOrigins, String(index)) === origin) return true;
  }
  return false;
}

function originExplicitlyAllowed(
  origin: string,
  allowedOrigins: unknown,
): boolean {
  if (!origin || !ArrayIsArray(allowedOrigins)) return false;
  const length = readOwnData(allowedOrigins, "length");
  return typeof length === "number" &&
    length > 0 &&
    originAllowed(origin, allowedOrigins);
}

function validateOAuthStartRequest(
  request: Request,
  dependencies: OAuthDependencies,
): { ok: true } | { ok: false; status: number } {
  const allowedOrigins = readOwnData(dependencies, "allowedOrigins");
  const origin = requestHeader(request, "origin");
  if (!originAllowed(origin, allowedOrigins)) {
    return { ok: false, status: 403 };
  }
  const fetchSite = requestHeader(request, "sec-fetch-site");
  if (
    fetchSite &&
    fetchSite !== "same-origin" &&
    fetchSite !== "same-site" &&
    fetchSite !== "none" &&
    !(fetchSite === "cross-site" &&
      originExplicitlyAllowed(origin, allowedOrigins))
  ) {
    return { ok: false, status: 403 };
  }
  const contentType = requestHeader(request, "content-type");
  if (contentType && !/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    return { ok: false, status: 415 };
  }
  return { ok: true };
}

function failClosedOAuthDependencies(
  allowedOrigins: readonly string[] = Object.freeze([]),
  redirectUri = "",
): OAuthDependencies {
  return {
    runtimeReady: false,
    allowedOrigins,
    redirectUri,
    resolveServerContext: () => null,
    resolveAuthenticatedIdentity: () => null,
    loadPendingOAuth: () => null,
    reauthorizePendingContext: () => null,
    unsealSecret: () => "",
    sealSecret: () => "",
    sealCredential: () => null,
    storePendingOAuth: () => {
      throw new Error("CONTEXT_UNAVAILABLE");
    },
    commitBinding: () => ({ ok: false, state: "CONTEXT_UNAVAILABLE" }),
    oauth: {
      createAuthorizationUrl: () => "",
      exchangeCode: () => ({
        ok: false,
        publicResult: { state: "CONTEXT_UNAVAILABLE" },
      }),
      resolveGoogleAccountAndCalendar: () => null,
    },
  };
}

function normalizedPending(record: unknown): OAuthPending | null {
  const stateDigest = readOwnData(record, "state_digest") ??
    readOwnData(record, "stateDigest");
  const authenticatedUserId = readOwnData(record, "authenticated_user_id") ??
    readOwnData(record, "authenticatedUserId");
  const currentCaseId = readOwnData(record, "case_id") ??
    readOwnData(record, "currentCaseId");
  const accountRole = readOwnData(record, "account_role") ??
    readOwnData(record, "accountRole");
  const authorizationSubject = readOwnData(record, "authorization_subject") ??
    readOwnData(record, "authorizationSubject");
  const assignmentId = readOwnData(record, "assignment_id") ??
    readOwnData(record, "assignmentId");
  const redirectUri = readOwnData(record, "redirect_uri") ??
    readOwnData(record, "redirectUri");
  const sealedVerifier = readOwnData(record, "sealed_verifier") ??
    readOwnData(record, "sealedVerifier");
  const expiresAt = readOwnData(record, "expires_at") ??
    readOwnData(record, "expiresAt");
  const claimedAt = readOwnData(record, "claimed_at") ??
    readOwnData(record, "claimedAt");
  const consumedAt = readOwnData(record, "consumed_at") ??
    readOwnData(record, "consumedAt");
  if (
    typeof stateDigest !== "string" ||
    typeof authenticatedUserId !== "string" ||
    typeof currentCaseId !== "string" ||
    (accountRole !== "owner" && accountRole !== "pro" &&
      accountRole !== "drs") ||
    typeof authorizationSubject !== "string" ||
    authorizationSubject.length === 0 ||
    typeof redirectUri !== "string" || redirectUri.length === 0 ||
    typeof sealedVerifier !== "string" ||
    typeof expiresAt !== "string"
  ) return null;
  return {
    stateDigest,
    authenticatedUserId,
    currentCaseId,
    accountRole,
    authorizationSubject,
    assignmentId: typeof assignmentId === "string" ? assignmentId : undefined,
    redirectUri,
    sealedVerifier,
    expiresAt,
    claimedAt: typeof claimedAt === "string" ? claimedAt : null,
    consumedAt: typeof consumedAt === "string" ? consumedAt : null,
  };
}

export function createSupabaseGoogleCalendarOAuthDependencies(
  expectedRole: GoogleCalendarAccountRole,
  options: SupabaseGoogleCalendarOAuthOptions = {},
): OAuthDependencies {
  const config = createSupabaseCalendarRuntimeConfig(options);
  const allowedOrigins = config?.allowedOrigins ?? options.allowedOrigins ??
    Object.freeze([]);
  const clientId = readRuntimeEnv(options, "GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = readRuntimeEnv(options, "GOOGLE_CALENDAR_CLIENT_SECRET");
  const caseMemberRedirectUri = exactHttpsRedirectUri(
    readRuntimeEnv(options, "GOOGLE_CALENDAR_REDIRECT_URI"),
  );
  const drsRedirectUri = exactHttpsRedirectUri(
    readRuntimeEnv(options, "GOOGLE_CALENDAR_DRS_REDIRECT_URI"),
  );
  const redirectUri = expectedRole === "drs"
    ? drsRedirectUri
    : caseMemberRedirectUri;
  const credentialKey = readRuntimeEnv(
    options,
    "GOOGLE_CALENDAR_CREDENTIAL_KEY",
  );
  const drsAuthorizationStrategy = options.drsAuthorizationStrategy;
  const requireDrsAssignmentBinding = expectedRole === "drs" &&
    readOwnData(drsAuthorizationStrategy, "requiresAssignmentBinding") === true;
  if (
    !config ||
    (expectedRole !== "owner" && expectedRole !== "pro" &&
      expectedRole !== "drs") ||
    (expectedRole !== "drs" && !config.currentCaseContextRpc) ||
    (expectedRole === "drs" &&
      (!drsAuthorizationStrategy ||
        typeof drsAuthorizationStrategy.resolveAuthorization !== "function" ||
        drsRedirectUri === caseMemberRedirectUri)) ||
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !credentialKey
  ) {
    return failClosedOAuthDependencies(allowedOrigins, redirectUri ?? "");
  }
  const runtimeConfig = config;
  const currentCaseContextRpc = config.currentCaseContextRpc ?? "";

  async function resolveCurrentCase(identity: { userId: string }) {
    const response = await callSupabaseRpc(
      runtimeConfig,
      currentCaseContextRpc,
      { p_user_id: identity.userId },
    );
    const caseId = readOwnData(response, "case_id") ??
      readOwnData(response, "caseId");
    return typeof caseId === "string" && caseId.length > 0 ? { caseId } : null;
  }

  async function resolveMembershipContext(
    identity: { userId: string },
    caseContext: { caseId: string },
    role: CaseMemberRole,
  ) {
    const authorization = await callSupabaseRpc(
      runtimeConfig,
      "case_member_google_calendar_authorize_v1",
      {
        p_user_id: identity.userId,
        p_case_id: caseContext.caseId,
        p_account_role: role,
      },
    );
    if (readOwnData(authorization, "authorized") !== true) return null;
    const status = readOwnData(authorization, "membership_status");
    return {
      authenticatedUserId: identity.userId,
      currentCaseId: caseContext.caseId,
      membership: {
        userId: identity.userId,
        caseId: caseContext.caseId,
        role,
        status: status === "active" ? "active" : "inactive",
      },
    };
  }

  async function resolveDrsContext(
    identity: { userId: string },
    pending: OAuthPending | null,
  ) {
    if (!drsAuthorizationStrategy) return null;
    const pendingContext = pending &&
        typeof pending.currentCaseId === "string" &&
        typeof pending.authorizationSubject === "string" &&
        (!requireDrsAssignmentBinding ||
          typeof pending.assignmentId === "string")
      ? {
        currentCaseId: pending.currentCaseId,
        authorizationSubject: pending.authorizationSubject,
        ...(typeof pending.assignmentId === "string"
          ? { assignmentId: pending.assignmentId }
          : {}),
      }
      : null;
    const candidate = await drsAuthorizationStrategy.resolveAuthorization({
      authenticatedUserId: identity.userId,
      accountRole: "drs",
      pending: pendingContext,
    });
    const authorized = authorizeGoogleCalendarAccountContext("drs", candidate);
    if (!authorized.ok) return null;
    const context = readOwnData(authorized, "context");
    if (readOwnData(context, "authenticatedUserId") !== identity.userId) {
      return null;
    }
    if (pendingContext) {
      if (
        readOwnData(context, "currentCaseId") !==
          pendingContext.currentCaseId ||
        readOwnData(context, "authorizationSubject") !==
          pendingContext.authorizationSubject ||
        (requireDrsAssignmentBinding &&
          readOwnData(context, "assignmentId") !==
            pendingContext.assignmentId)
      ) return null;
    }
    return context;
  }

  const oauth = createGoogleOAuthAdapter({
    clientId,
    clientSecret,
    redirectUri,
    fetch: runtimeConfig.fetch,
  });

  return {
    runtimeReady: true,
    requireDrsAssignmentBinding,
    allowedOrigins,
    redirectUri,
    oauth,
    async resolveServerContext(request: Request) {
      const identity = await resolveSupabaseAuthenticatedIdentity(
        request,
        runtimeConfig,
      );
      if (!identity) return null;
      if (expectedRole === "drs") {
        const context = await resolveDrsContext(identity, null);
        if (context || !requireDrsAssignmentBinding) return context;
        return {
          authenticatedUserId: identity.userId,
          accountRole: "drs",
          authorityUnavailable: true,
        };
      }
      const caseContext = await resolveCurrentCase(identity);
      if (!caseContext) return null;
      return await resolveMembershipContext(
        identity,
        caseContext,
        expectedRole,
      );
    },
    async resolveAuthenticatedIdentity(request: Request) {
      return await resolveSupabaseAuthenticatedIdentity(request, runtimeConfig);
    },
    async loadPendingOAuth(stateDigest: string) {
      return normalizedPending(
        await callSupabaseRpc(
          runtimeConfig,
          requireDrsAssignmentBinding
            ? "drs_google_calendar_get_oauth_state_v1"
            : "google_calendar_account_get_oauth_state_v2",
          { p_state_digest: stateDigest },
        ),
      );
    },
    async reauthorizePendingContext(
      pending: OAuthPending,
      identity: { userId: string },
      role: GoogleCalendarAccountRole,
    ) {
      if (
        role !== expectedRole || pending.accountRole !== expectedRole ||
        pending.authenticatedUserId !== identity.userId ||
        typeof pending.currentCaseId !== "string" ||
        typeof pending.authorizationSubject !== "string" ||
        pending.redirectUri !== redirectUri
      ) return null;
      if (expectedRole === "drs") {
        return await resolveDrsContext(identity, pending);
      }
      if (role !== "owner" && role !== "pro") return null;
      return await resolveMembershipContext(
        identity,
        { caseId: pending.currentCaseId },
        role,
      );
    },
    async sealSecret(value: string) {
      return await encryptCredentialEnvelope({ value }, credentialKey);
    },
    async unsealSecret(sealed: string) {
      const envelope = await decryptCredentialEnvelope(sealed, credentialKey);
      const value = readOwnData(envelope, "value");
      return typeof value === "string" ? value : "";
    },
    async storePendingOAuth(pending: Record<string, unknown>) {
      if (
        requireDrsAssignmentBinding &&
        typeof readOwnData(pending, "assignmentId") !== "string"
      ) throw new Error("CONTEXT_UNAVAILABLE");
      const result = await callSupabaseRpc(
        runtimeConfig,
        requireDrsAssignmentBinding
          ? "drs_google_calendar_begin_oauth_v1"
          : "google_calendar_account_begin_oauth_v2",
        {
          ...(requireDrsAssignmentBinding
            ? {
              p_authenticated_user_id: pending.authenticatedUserId,
              p_selected_case_id: pending.currentCaseId,
              p_assignment_id: pending.assignmentId,
            }
            : {
              p_user_id: pending.authenticatedUserId,
              p_case_id: pending.currentCaseId,
            }),
          p_account_role: pending.accountRole,
          p_authorization_subject: pending.authorizationSubject,
          p_state_digest: pending.stateDigest,
          p_pkce_verifier_ciphertext: pending.sealedVerifier,
          p_redirect_uri: redirectUri,
          p_expires_at: pending.expiresAt,
        },
      );
      if (readOwnData(result, "ok") !== true) {
        throw new Error("CONTEXT_UNAVAILABLE");
      }
    },
    async claimPendingOAuth(pending: OAuthPending) {
      if (!requireDrsAssignmentBinding) {
        return { ok: true, state: "CLAIM_NOT_REQUIRED" };
      }
      if (typeof pending.assignmentId !== "string") {
        return { ok: false, state: "OAUTH_STATE_ALREADY_USED" };
      }
      const result = await callSupabaseRpc(
        runtimeConfig,
        "drs_google_calendar_claim_callback_v1",
        {
          p_state_digest: pending.stateDigest,
          p_authenticated_user_id: pending.authenticatedUserId,
          p_selected_case_id: pending.currentCaseId,
          p_assignment_id: pending.assignmentId,
          p_account_role: pending.accountRole,
          p_authorization_subject: pending.authorizationSubject,
          p_redirect_uri: pending.redirectUri,
        },
      );
      return result ?? { ok: false, state: "OAUTH_STATE_ALREADY_USED" };
    },
    async sealCredential(credential: Record<string, unknown>) {
      const refreshToken = readOwnData(credential, "refreshToken");
      return {
        encryptedAccessToken: await encryptCredentialEnvelope(
          {
            accessToken: readOwnData(credential, "accessToken"),
            idToken: readOwnData(credential, "idToken"),
          },
          credentialKey,
        ),
        encryptedRefreshToken: typeof refreshToken === "string"
          ? await encryptCredentialEnvelope({ refreshToken }, credentialKey)
          : null,
      };
    },
    async commitBinding(input: Record<string, unknown>) {
      const pending = readOwnData(input, "pending");
      const sealedCredential = readOwnData(input, "sealedCredential");
      const grantedScopes = readOwnData(input, "grantedScopes");
      const response = await callSupabaseRpc(
        runtimeConfig,
        requireDrsAssignmentBinding
          ? "drs_google_calendar_commit_callback_v1"
          : "google_calendar_account_commit_callback_v2",
        {
          p_state_digest: readOwnData(pending, "stateDigest"),
          ...(requireDrsAssignmentBinding
            ? {
              p_authenticated_user_id: readOwnData(
                input,
                "authenticatedUserId",
              ),
              p_assignment_id: readOwnData(pending, "assignmentId"),
            }
            : { p_user_id: readOwnData(input, "authenticatedUserId") }),
          p_account_role: readOwnData(input, "accountRole"),
          p_authorization_subject: readOwnData(
            input,
            "authorizationSubject",
          ),
          p_redirect_uri: readOwnData(input, "redirectUri"),
          p_google_subject: readOwnData(input, "googleSubject"),
          p_encrypted_access_token: readOwnData(
            sealedCredential,
            "encryptedAccessToken",
          ),
          p_encrypted_refresh_token: readOwnData(
            sealedCredential,
            "encryptedRefreshToken",
          ),
          p_token_expires_at: readOwnData(input, "tokenExpiresAt"),
          p_granted_scopes: ArrayIsArray(grantedScopes) ? grantedScopes : [],
          p_calendar_id: readOwnData(input, "calendarId"),
        },
      );
      return response ?? { ok: false, state: "CONTEXT_UNAVAILABLE" };
    },
  };
}

export function createOAuthStartHandler(
  expectedRole: GoogleCalendarAccountRole,
  dependencies: OAuthDependencies,
) {
  return async function handleOAuthStart(request: Request) {
    if (request.method !== "POST") {
      return jsonResponse(405, { state: "CONTEXT_UNAVAILABLE" });
    }
    const guarded = validateOAuthStartRequest(request, dependencies);
    if (!guarded.ok) {
      return jsonResponse(guarded.status, { state: "CONTEXT_UNAVAILABLE" });
    }
    try {
      const context = await dependencies.resolveServerContext(
        request,
        expectedRole,
      );
      if (!context) return jsonResponse(401, { state: "AUTH_REQUIRED" });
      const authorized = authorizeGoogleCalendarAccountContext(
        expectedRole,
        context,
      );
      if (!authorized.ok) return jsonResponse(403, { state: authorized.state });
      const authorizedContext = readOwnData(authorized, "context");
      const authenticatedUserId = readOwnData(
        authorizedContext,
        "authenticatedUserId",
      );
      const currentCaseId = readOwnData(authorizedContext, "currentCaseId");
      const authorizationSubject = readOwnData(
        authorizedContext,
        "authorizationSubject",
      );
      const assignmentId = readOwnData(authorizedContext, "assignmentId");
      const redirectUri = readOwnData(dependencies, "redirectUri");
      if (
        typeof authenticatedUserId !== "string" ||
        typeof currentCaseId !== "string" ||
        typeof authorizationSubject !== "string" ||
        (readOwnData(dependencies, "requireDrsAssignmentBinding") === true &&
          typeof assignmentId !== "string") ||
        exactHttpsRedirectUri(redirectUri) === null
      ) return jsonResponse(409, { state: "CONTEXT_UNAVAILABLE" });
      const material = await issueOAuthMaterial();
      const sealedVerifier = await dependencies.sealSecret(
        material.codeVerifier,
      );
      await dependencies.storePendingOAuth({
        stateDigest: material.stateDigest,
        authenticatedUserId,
        currentCaseId,
        accountRole: expectedRole,
        authorizationSubject,
        ...(typeof assignmentId === "string" ? { assignmentId } : {}),
        redirectUri,
        sealedVerifier,
        expiresAt: material.expiresAt,
      });
      return jsonResponse(200, {
        state: "OAUTH_REDIRECT_REQUIRED",
        authorizationUrl: dependencies.oauth.createAuthorizationUrl(material),
      });
    } catch {
      return jsonResponse(409, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}

export function createOAuthCallbackHandler(
  expectedRole: GoogleCalendarAccountRole,
  dependencies: OAuthDependencies,
) {
  return async function handleOAuthCallback(request: Request) {
    try {
      const url = new URL(request.url);
      const redirectUri = readOwnData(dependencies, "redirectUri");
      if (
        exactHttpsRedirectUri(redirectUri) === null ||
        `${url.origin}${url.pathname}` !== redirectUri
      ) return jsonResponse(403, { state: "IDENTITY_MISMATCH" });
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        return jsonResponse(400, { state: "CONTEXT_UNAVAILABLE" });
      }
      const stateDigest = await digestOAuthState(state);
      const pending = await dependencies.loadPendingOAuth(stateDigest);
      const pendingUserId = readOwnData(pending, "authenticatedUserId");
      if (
        typeof pendingUserId !== "string" ||
        !await validateOAuthState(
          state,
          pending,
          pendingUserId,
          DateConstructor.now(),
        )
      ) {
        return jsonResponse(403, { state: "IDENTITY_MISMATCH" });
      }
      if (pending.accountRole !== expectedRole) {
        return jsonResponse(403, { state: "CASE_NOT_AUTHORIZED" });
      }
      if (pending.redirectUri !== redirectUri) {
        return jsonResponse(403, { state: "IDENTITY_MISMATCH" });
      }
      const current = await dependencies.reauthorizePendingContext(
        pending,
        { userId: pendingUserId },
        expectedRole,
      );
      const authorized = authorizeGoogleCalendarAccountContext(
        expectedRole,
        current ?? {},
      );
      if (!authorized.ok) return jsonResponse(403, { state: authorized.state });
      const authorizedContext = readOwnData(authorized, "context");
      if (
        readOwnData(authorizedContext, "authenticatedUserId") !==
          pendingUserId ||
        readOwnData(authorizedContext, "currentCaseId") !==
          pending.currentCaseId ||
        readOwnData(authorizedContext, "authorizationSubject") !==
          pending.authorizationSubject ||
        (readOwnData(dependencies, "requireDrsAssignmentBinding") === true &&
          (typeof pending.assignmentId !== "string" ||
            readOwnData(authorizedContext, "assignmentId") !==
              pending.assignmentId))
      ) return jsonResponse(403, { state: "IDENTITY_MISMATCH" });
      if (readOwnData(dependencies, "requireDrsAssignmentBinding") === true) {
        const claimed = await dependencies.claimPendingOAuth(pending);
        if (readOwnData(claimed, "ok") !== true) {
          return jsonResponse(409, { state: "OAUTH_STATE_ALREADY_USED" });
        }
      }
      const codeVerifier = await dependencies.unsealSecret(
        pending.sealedVerifier,
      );
      const exchanged = await dependencies.oauth.exchangeCode({
        code,
        codeVerifier,
      });
      if (!exchanged.ok) {
        const requestedState = readOwnData(exchanged.publicResult, "state");
        const failure = closedResult(
          typeof requestedState === "string"
            ? requestedState
            : "CONTEXT_UNAVAILABLE",
        );
        return jsonResponse(409, { state: failure.state });
      }
      const providerScopes = readOwnData(exchanged.publicResult, "scopes");
      const grantedScopes = readOwnData(
          dependencies,
          "requireDrsAssignmentBinding",
        ) === true
        ? exactDrsGrantedScopes(providerScopes)
        : (ArrayIsArray(providerScopes) ? providerScopes : []);
      if (grantedScopes === null) {
        return jsonResponse(409, {
          state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
        });
      }
      const google = await dependencies.oauth.resolveGoogleAccountAndCalendar(
        exchanged.credentialEnvelope.accessToken,
      );
      if (!google) {
        return jsonResponse(409, {
          state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
        });
      }
      const sealedCredential = await dependencies.sealCredential(
        exchanged.credentialEnvelope,
      );
      const committed = await dependencies.commitBinding({
        pending,
        authenticatedUserId: pendingUserId,
        accountRole: expectedRole,
        authorizationSubject: pending.authorizationSubject,
        redirectUri,
        googleSubject: google.googleSubject,
        calendarId: google.calendarId,
        sealedCredential,
        grantedScopes,
        tokenExpiresAt: new DateConstructor(
          DateConstructor.now() + exchanged.credentialEnvelope.expiresIn * 1000,
        ).toISOString(),
      });
      if (readOwnData(committed, "ok") !== true) {
        const requestedState = readOwnData(committed, "state");
        const failure = closedResult(
          typeof requestedState === "string"
            ? requestedState
            : "CONTEXT_UNAVAILABLE",
        );
        return jsonResponse(409, { state: failure.state });
      }
      return jsonResponse(200, { state: "CONNECTED" });
    } catch {
      return jsonResponse(409, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}
