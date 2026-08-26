const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;

export const MAX_OAUTH_STATE_TTL_MS = 15 * 60 * 1000;
export const DRS_DENIAL_STATES = Object.freeze(
  [
    "AUTH_REQUIRED",
    "CONTEXT_UNAVAILABLE",
    "CASE_NOT_AUTHORIZED",
    "CASE_SELECTION_REQUIRED",
    "IDENTITY_MISMATCH",
  ] as const,
);

export type DrsDenialState = (typeof DRS_DENIAL_STATES)[number];
export type DrsAuthorityExpectation = Readonly<{
  authenticatedUserId: string;
  selectedCaseId?: string | null;
  authorizationSubject?: string | null;
  requireLocked?: boolean;
  nowMs?: number;
}>;
export type DrsSpecialistAuthorityFacts = Readonly<{
  authenticatedUserId: string;
  specialistId: string;
  assignmentId: string;
  selectedCaseId: string;
  currentCaseId: string;
  accountRole: "drs";
  authorizationSubject: string;
  authBindingStatus: "active";
  specialistStatus: "active";
  assignmentStatus: "active";
  validFrom: string;
  validUntil: string;
  terminatedAt: null;
  lockStatus: "locked";
}>;
export type DrsWorkspaceGrantProjection = Readonly<{
  selectedCaseId: string;
  caseStatus: "active";
  accessMode: "read_only";
}>;
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
export type RuntimeEnvironment = {
  get(name: string): string | undefined;
};

export function readOwnValue(record: unknown, key: PropertyKey): unknown {
  if (record === null || typeof record !== "object") return undefined;
  try {
    return Object.getOwnPropertyDescriptor(record, key)?.value;
  } catch {
    return undefined;
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRfc3339(value: unknown): value is string {
  return typeof value === "string" && RFC3339_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value));
}

function isAllowedDenialState(value: unknown): value is DrsDenialState {
  return typeof value === "string" &&
    (DRS_DENIAL_STATES as readonly string[]).includes(value);
}

function hasExactOwnKeys(input: unknown, expected: readonly string[]): boolean {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  try {
    const keys = Object.keys(input);
    return keys.length === expected.length &&
      expected.every((key) => keys.includes(key));
  } catch {
    return false;
  }
}

export function readDenialState(input: unknown): DrsDenialState {
  const state = readOwnValue(input, "state");
  return isAllowedDenialState(state) ? state : "CASE_NOT_AUTHORIZED";
}

export function validateDrsAuthorityFacts(
  input: unknown,
  expectation: DrsAuthorityExpectation,
): DrsSpecialistAuthorityFacts | null {
  try {
    if (readOwnValue(input, "authorized") !== true) return null;
    const authenticatedUserId = readOwnValue(input, "authenticated_user_id");
    const specialistId = readOwnValue(input, "specialist_id");
    const assignmentId = readOwnValue(input, "assignment_id");
    const selectedCaseId = readOwnValue(input, "selected_case_id");
    const authorizationSubject = readOwnValue(input, "authorization_subject");
    const validFrom = readOwnValue(input, "valid_from");
    const validUntil = readOwnValue(input, "valid_until");
    const lockStatus = readOwnValue(input, "lock_status");
    const nowMs = expectation.nowMs ?? Date.now();
    if (
      !isUuid(authenticatedUserId) ||
      authenticatedUserId !== expectation.authenticatedUserId ||
      !isUuid(specialistId) || !isUuid(assignmentId) ||
      !isUuid(selectedCaseId) ||
      (expectation.selectedCaseId &&
        selectedCaseId !== expectation.selectedCaseId) ||
      typeof authorizationSubject !== "string" ||
      authorizationSubject !== `drs-specialist:${specialistId}` ||
      (expectation.authorizationSubject &&
        authorizationSubject !== expectation.authorizationSubject) ||
      readOwnValue(input, "account_role") !== "drs" ||
      readOwnValue(input, "auth_binding_status") !== "active" ||
      readOwnValue(input, "specialist_status") !== "active" ||
      readOwnValue(input, "assignment_status") !== "active" ||
      !isRfc3339(validFrom) || !Number.isFinite(nowMs) ||
      Date.parse(validFrom) > nowMs || !isRfc3339(validUntil) ||
      Date.parse(validUntil) <= Date.parse(validFrom) ||
      Date.parse(validUntil) <= nowMs ||
      readOwnValue(input, "terminated_at") !== null ||
      (expectation.requireLocked !== false && lockStatus !== "locked")
    ) return null;
    return Object.freeze({
      authenticatedUserId,
      specialistId,
      assignmentId,
      selectedCaseId,
      currentCaseId: selectedCaseId,
      accountRole: "drs" as const,
      authorizationSubject,
      authBindingStatus: "active" as const,
      specialistStatus: "active" as const,
      assignmentStatus: "active" as const,
      validFrom,
      validUntil,
      terminatedAt: null,
      lockStatus: "locked" as const,
    });
  } catch {
    return null;
  }
}

export function validateDrsWorkspaceGrantProjection(
  input: unknown,
): DrsWorkspaceGrantProjection | null {
  try {
    if (
      !hasExactOwnKeys(input, [
        "authorized",
        "state",
        "case_id",
        "case_status",
        "access_mode",
      ]) ||
      readOwnValue(input, "authorized") !== true ||
      readOwnValue(input, "state") !== "AUTHORIZED_DRS_WORKSPACE"
    ) return null;
    const selectedCaseId = readOwnValue(input, "case_id");
    if (
      !isUuid(selectedCaseId) ||
      readOwnValue(input, "case_status") !== "active" ||
      readOwnValue(input, "access_mode") !== "read_only"
    ) return null;
    return Object.freeze({
      selectedCaseId,
      caseStatus: "active" as const,
      accessMode: "read_only" as const,
    });
  } catch {
    return null;
  }
}

export async function readExactEmptyJsonBody(
  request: Request,
): Promise<boolean> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) return false;
    const raw = await request.text();
    if (raw.trim().length === 0 || raw.length > 16) return false;
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" &&
      !Array.isArray(parsed) && Object.keys(parsed).length === 0;
  } catch {
    return false;
  }
}

export function readRuntimeEnvironment(
  explicit: RuntimeEnvironment | undefined,
  name: string,
): string | undefined {
  try {
    const supplied = explicit?.get(name);
    if (supplied) return supplied;
    const runtime = globalThis as typeof globalThis & {
      Deno?: { env?: RuntimeEnvironment };
    };
    return runtime.Deno?.env?.get(name);
  } catch {
    return undefined;
  }
}

export function parseAllowedOrigins(
  value: string | undefined,
): readonly string[] {
  if (!value) return Object.freeze([]);
  return Object.freeze(
    value.split(",").map((part) => part.trim()).filter(Boolean),
  );
}

export function corsHeaders(
  origin: string | null,
  allowedOrigins: readonly string[],
): HeadersInit {
  if (!origin || !allowedOrigins.includes(origin)) return { "Vary": "Origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, apikey",
    "access-control-max-age": "600",
    "Vary": "Origin",
  };
}

export function jsonResponse(
  status: number,
  payload: unknown,
  cors: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...cors,
    },
  });
}

export type IdentityProvider = "google" | "line";
export type IntendedIdentityAction = "login" | "bind";
export type ClosedState =
  | DrsDenialState
  | "INVITATION_REQUIRED"
  | "SPECIALIST_NOT_FOUND"
  | "SPECIALIST_INACTIVE"
  | "GOOGLE_IDENTITY_NOT_BOUND"
  | "LINE_IDENTITY_NOT_BOUND"
  | "IDENTITY_ALREADY_BOUND"
  | "IDENTITY_CONFLICT"
  | "ASSIGNMENT_REQUIRED"
  | "OAUTH_STATE_INVALID"
  | "OAUTH_STATE_EXPIRED"
  | "OAUTH_STATE_CONSUMED"
  | "OAUTH_PROVIDER_MISMATCH"
  | "OAUTH_REDIRECT_MISMATCH"
  | "TOKEN_VERIFICATION_FAILED"
  | "SESSION_PRODUCER_UNAVAILABLE"
  | "INVALID_REQUEST";

export class DrsIdentityError extends Error {
  readonly code: ClosedState;
  readonly status: number;
  constructor(code: ClosedState, status = 403) {
    super(code);
    this.name = "DrsIdentityError";
    this.code = code;
    this.status = status;
  }
}

export type IdentityStartContext = Readonly<{
  intendedAction: IntendedIdentityAction;
  authenticatedUserId: string | null;
  specialistId: string | null;
  authorizationSubject: string | null;
}>;
export type NewIdentityLinkState = Readonly<{
  stateDigest: string;
  nonceDigest: string;
  pkceVerifierCiphertext: string;
  authenticatedUserId: string | null;
  specialistId: string | null;
  authorizationSubject: string | null;
  provider: IdentityProvider;
  intendedAction: IntendedIdentityAction;
  redirectUri: string;
  expiresAt: Date;
  createdAt: Date;
}>;
export type ClaimedIdentityLinkState =
  & NewIdentityLinkState
  & Readonly<{
    claimToken: string;
    claimedAt: Date;
    consumedAt: Date | null;
    failedAt: Date | null;
  }>;
export type IdentityCallbackCompletion = Readonly<{
  authenticatedUserId: string;
  specialistId: string;
  authorizationSubject: string;
  intendedAction: IntendedIdentityAction;
}>;

export interface IdentityLinkStateStore {
  createLinkState(input: NewIdentityLinkState): Promise<void>;
  claimLinkState(input: {
    stateDigest: string;
    provider: IdentityProvider;
    redirectUri: string;
    now: Date;
  }): Promise<ClaimedIdentityLinkState>;
  failIdentityCallback(input: {
    claimToken: string;
    now: Date;
    failureState: ClosedState;
  }): Promise<void>;
  prepareIdentityCallback(input: {
    claimToken: string;
    provider: IdentityProvider;
    subject: string;
    verifiedEmail: string | null;
    now: Date;
  }): Promise<IdentityCallbackCompletion>;
  finalizeIdentityCallback(input: {
    claimToken: string;
    provider: IdentityProvider;
    subject: string;
    verifiedEmail: string | null;
    expectedAuthenticatedUserId: string;
    expectedSpecialistId: string;
    expectedAuthorizationSubject: string;
    expectedIntendedAction: IntendedIdentityAction;
    now: Date;
    correlationId: string;
  }): Promise<void>;
}
export interface SecretEnvelope {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}
export interface VerifiedIdentityClaims {
  subject: string;
  issuer: string;
  audience: string;
  expiresAtEpochSeconds: number;
  nonce: string;
  signatureVerified: boolean;
  emailVerified?: boolean;
  verifiedEmail?: string;
}
export interface IdentityProviderTransport {
  createAuthorizationUrl(input: {
    redirectUri: string;
    state: string;
    nonce: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
  }): string;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
    pkceVerifier: string;
  }): Promise<{ idToken: string }>;
  verifyIdToken(input: { idToken: string }): Promise<VerifiedIdentityClaims>;
}
export interface VerifiedSessionProducer {
  createVerifiedSession(
    input: Readonly<{
      authenticatedUserId: string;
      specialistId: string;
      authorizationSubject: string;
      callbackOrigin: string;
      successRedirectUrl: string;
      sessionCookieName: string;
    }>,
  ): Promise<Readonly<{ response: Response }>>;
}
export interface IdentityOAuthAdapterDependencies {
  allowedOrigin: string;
  redirectUri: string;
  sessionSuccessRedirectUrl: string;
  sessionCookieName: string;
  clientId: string;
  now: () => Date;
  stateTtlMs?: number;
  envelope: SecretEnvelope;
  store: IdentityLinkStateStore;
  provider: IdentityProviderTransport;
  sessionProducer: VerifiedSessionProducer | null;
  resolveStartContext(request: Request): Promise<IdentityStartContext | null>;
}
export interface IdentityOAuthAdapter {
  start(request: Request): Promise<Response>;
  callback(request: Request): Promise<Response>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
export async function sha256Digest(value: string): Promise<string> {
  return base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}
export function randomOpaqueValue(byteLength = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}
export async function createPkcePair(): Promise<
  { verifier: string; challenge: string }
> {
  const verifier = randomOpaqueValue(48);
  return { verifier, challenge: await sha256Digest(verifier) };
}
export async function createAesGcmSecretEnvelope(
  keyBytes: Uint8Array,
): Promise<SecretEnvelope> {
  if (keyBytes.byteLength !== 32) throw new Error("AES_GCM_KEY_INVALID");
  const keyMaterial = new Uint8Array(new ArrayBuffer(keyBytes.byteLength));
  keyMaterial.set(keyBytes);
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  return {
    async encrypt(plaintext) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          encoder.encode(plaintext),
        ),
      );
      return `v1.${base64Url(iv)}.${base64Url(ciphertext)}`;
    },
    async decrypt(envelope) {
      const [version, encodedIv, encodedCiphertext, extra] = envelope.split(
        ".",
      );
      if (version !== "v1" || !encodedIv || !encodedCiphertext || extra) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      try {
        const plaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: fromBase64Url(encodedIv) },
          key,
          fromBase64Url(encodedCiphertext),
        );
        return decoder.decode(plaintext);
      } catch {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
    },
  };
}

export function closedResponse(error: unknown, origin?: string): Response {
  const denial = error instanceof DrsIdentityError
    ? error
    : new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  return jsonResponse(
    denial.status,
    { state: denial.code },
    corsHeaders(origin ?? null, origin ? [origin] : []),
  );
}
function requestError(status: number): never {
  throw new DrsIdentityError("INVALID_REQUEST", status);
}
function exactCallbackInput(
  request: Request,
  redirectUri: string,
): { code: string; state: string } {
  if (request.method !== "GET") requestError(405);
  const actual = new URL(request.url);
  const expected = new URL(redirectUri);
  if (
    actual.origin !== expected.origin ||
    actual.pathname !== expected.pathname || expected.search || actual.hash
  ) throw new DrsIdentityError("OAUTH_REDIRECT_MISMATCH");
  const entries = [...actual.searchParams.entries()];
  if (
    entries.length !== 2 ||
    entries.map(([key]) => key).sort().join(",") !== "code,state"
  ) throw new DrsIdentityError("OAUTH_STATE_INVALID");
  const code = actual.searchParams.get("code")?.trim() ?? "";
  const state = actual.searchParams.get("state")?.trim() ?? "";
  if (!code || !state) throw new DrsIdentityError("OAUTH_STATE_INVALID");
  return { code, state };
}
async function validateClaims(
  provider: IdentityProvider,
  claims: VerifiedIdentityClaims,
  clientId: string,
  nonceDigest: string,
  now: Date,
): Promise<void> {
  const issuer = provider === "google"
    ? "https://accounts.google.com"
    : "https://access.line.me";
  if (
    !claims.signatureVerified || claims.issuer !== issuer ||
    claims.audience !== clientId || !claims.subject?.trim() ||
    !Number.isFinite(claims.expiresAtEpochSeconds) ||
    claims.expiresAtEpochSeconds <= Math.floor(now.getTime() / 1000) ||
    (provider === "google" && claims.emailVerified !== true) ||
    await sha256Digest(claims.nonce) !== nonceDigest
  ) throw new DrsIdentityError("TOKEN_VERIFICATION_FAILED");
}
function validStartContext(context: IdentityStartContext): boolean {
  if (context.intendedAction === "login") {
    return context.authenticatedUserId === null &&
      context.specialistId === null && context.authorizationSubject === null;
  }
  return isUuid(context.authenticatedUserId) && isUuid(context.specialistId) &&
    context.authorizationSubject ===
      `drs-specialist:${context.specialistId}`;
}
function completionIsBound(
  completion: IdentityCallbackCompletion,
  claimed: ClaimedIdentityLinkState,
): boolean {
  return isUuid(completion.authenticatedUserId) &&
    isUuid(completion.specialistId) &&
    completion.authorizationSubject ===
      `drs-specialist:${completion.specialistId}` &&
    completion.intendedAction === claimed.intendedAction &&
    (claimed.authenticatedUserId === null ||
      claimed.authenticatedUserId === completion.authenticatedUserId) &&
    (claimed.specialistId === null ||
      claimed.specialistId === completion.specialistId) &&
    (claimed.authorizationSubject === null ||
      claimed.authorizationSubject === completion.authorizationSubject);
}

function validatedSessionContinuation(
  input: unknown,
  dependencies: IdentityOAuthAdapterDependencies,
): Response {
  try {
    const response = readOwnValue(input, "response");
    if (!(response instanceof Response) || response.status !== 303) {
      throw new Error("INVALID_SESSION_RESPONSE");
    }
    if (response.body !== null) throw new Error("SESSION_BODY_FORBIDDEN");
    const configured = new URL(dependencies.sessionSuccessRedirectUrl);
    const allowed = new URL(dependencies.allowedOrigin);
    const locationValue = response.headers.get("location");
    if (!locationValue) throw new Error("SESSION_REDIRECT_MISSING");
    const location = new URL(locationValue);
    if (
      configured.origin !== allowed.origin || configured.search ||
      configured.hash || configured.username || configured.password ||
      location.href !== configured.href
    ) throw new Error("SESSION_REDIRECT_INVALID");

    const cookie = response.headers.get("set-cookie") ?? "";
    if (
      cookie.length === 0 || cookie.length > 4096 || /[\r\n]/u.test(cookie)
    ) throw new Error("SESSION_COOKIE_INVALID");
    const parts = cookie.split(";").map((part) => part.trim());
    const prefix = `${dependencies.sessionCookieName}=`;
    const cookieValue = parts[0]?.startsWith(prefix)
      ? parts[0].slice(prefix.length)
      : "";
    const attributes = new Set(
      parts.slice(1).map((part) => part.toLowerCase()),
    );
    if (
      !/^[A-Za-z0-9._~-]+$/u.test(dependencies.sessionCookieName) ||
      !cookieValue || /[\s,;]/u.test(cookieValue) ||
      !attributes.has("path=/") || !attributes.has("httponly") ||
      !attributes.has("secure") ||
      !(attributes.has("samesite=lax") || attributes.has("samesite=strict")) ||
      [...attributes].some((part) => part.startsWith("domain=")) ||
      response.headers.get("x-laibe-session-state") !== "SESSION_ESTABLISHED"
    ) throw new Error("SESSION_COOKIE_INVALID");

    return new Response(null, {
      status: 303,
      headers: {
        "location": configured.href,
        "set-cookie": cookie,
        "x-laibe-session-state": "SESSION_ESTABLISHED",
        "cache-control": "no-store",
        "pragma": "no-cache",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    throw new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
  }
}

export function createIdentityOAuthAdapter(
  providerName: IdentityProvider,
  dependencies: IdentityOAuthAdapterDependencies,
): IdentityOAuthAdapter {
  return {
    async start(request) {
      const origin = request.headers.get("origin");
      try {
        if (request.method !== "POST") requestError(405);
        if (new URL(request.url).search.length !== 0) requestError(400);
        if (origin !== dependencies.allowedOrigin) requestError(403);
        if (!(await readExactEmptyJsonBody(request))) requestError(400);
        const context = await dependencies.resolveStartContext(request);
        if (!context || !validStartContext(context)) {
          throw new DrsIdentityError("INVITATION_REQUIRED");
        }
        const state = randomOpaqueValue();
        const nonce = randomOpaqueValue();
        const { verifier, challenge } = await createPkcePair();
        const now = dependencies.now();
        const ttl = Math.min(
          dependencies.stateTtlMs ?? 10 * 60 * 1000,
          MAX_OAUTH_STATE_TTL_MS,
        );
        await dependencies.store.createLinkState({
          stateDigest: await sha256Digest(state),
          nonceDigest: await sha256Digest(nonce),
          pkceVerifierCiphertext: await dependencies.envelope.encrypt(verifier),
          authenticatedUserId: context.authenticatedUserId,
          specialistId: context.specialistId,
          authorizationSubject: context.authorizationSubject,
          provider: providerName,
          intendedAction: context.intendedAction,
          redirectUri: dependencies.redirectUri,
          expiresAt: new Date(now.getTime() + ttl),
          createdAt: now,
        });
        return jsonResponse(200, {
          authorizationUrl: dependencies.provider.createAuthorizationUrl({
            redirectUri: dependencies.redirectUri,
            state,
            nonce,
            codeChallenge: challenge,
            codeChallengeMethod: "S256",
          }),
        }, corsHeaders(origin, [dependencies.allowedOrigin]));
      } catch (error) {
        return closedResponse(
          error,
          origin === dependencies.allowedOrigin ? origin : undefined,
        );
      }
    },
    async callback(request) {
      let claimToken: string | null = null;
      let callbackNow: Date | null = null;
      try {
        const { code, state } = exactCallbackInput(
          request,
          dependencies.redirectUri,
        );
        callbackNow = dependencies.now();
        const claimed = await dependencies.store.claimLinkState({
          stateDigest: await sha256Digest(state),
          provider: providerName,
          redirectUri: dependencies.redirectUri,
          now: callbackNow,
        });
        claimToken = claimed.claimToken;
        if (
          claimed.intendedAction === "login" && !dependencies.sessionProducer
        ) {
          throw new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
        }
        const verifier = await dependencies.envelope.decrypt(
          claimed.pkceVerifierCiphertext,
        );
        const exchange = await dependencies.provider.exchangeCode({
          code,
          redirectUri: dependencies.redirectUri,
          pkceVerifier: verifier,
        });
        let claims: VerifiedIdentityClaims;
        try {
          claims = await dependencies.provider.verifyIdToken({
            idToken: exchange.idToken,
          });
        } catch {
          throw new DrsIdentityError("TOKEN_VERIFICATION_FAILED");
        }
        await validateClaims(
          providerName,
          claims,
          dependencies.clientId,
          claimed.nonceDigest,
          callbackNow,
        );
        const completion = await dependencies.store.prepareIdentityCallback({
          claimToken,
          provider: providerName,
          subject: claims.subject,
          verifiedEmail: providerName === "google"
            ? (claims.verifiedEmail ?? null)
            : null,
          now: callbackNow,
        });
        if (!completionIsBound(completion, claimed)) {
          throw new DrsIdentityError("IDENTITY_MISMATCH");
        }
        let continuation: Response | null = null;
        if (completion.intendedAction === "login") {
          try {
            const callbackOrigin = new URL(request.url).origin;
            const session = await dependencies.sessionProducer!
              .createVerifiedSession({
                authenticatedUserId: completion.authenticatedUserId,
                specialistId: completion.specialistId,
                authorizationSubject: completion.authorizationSubject,
                callbackOrigin,
                successRedirectUrl: dependencies.sessionSuccessRedirectUrl,
                sessionCookieName: dependencies.sessionCookieName,
              });
            continuation = validatedSessionContinuation(session, dependencies);
          } catch {
            throw new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
          }
        }
        await dependencies.store.finalizeIdentityCallback({
          claimToken,
          provider: providerName,
          subject: claims.subject,
          verifiedEmail: providerName === "google"
            ? (claims.verifiedEmail ?? null)
            : null,
          expectedAuthenticatedUserId: completion.authenticatedUserId,
          expectedSpecialistId: completion.specialistId,
          expectedAuthorizationSubject: completion.authorizationSubject,
          expectedIntendedAction: completion.intendedAction,
          now: callbackNow,
          correlationId: crypto.randomUUID(),
        });
        claimToken = null;
        return continuation ?? jsonResponse(200, { state: "IDENTITY_BOUND" });
      } catch (error) {
        if (claimToken) {
          try {
            await dependencies.store.failIdentityCallback({
              claimToken,
              now: callbackNow ?? dependencies.now(),
              failureState: error instanceof DrsIdentityError
                ? error.code
                : "CONTEXT_UNAVAILABLE",
            });
          } catch {
            // The claimed row remains terminal because it is never released.
          }
        }
        return closedResponse(error);
      }
    },
  };
}

export function failClosedRuntimeResponse(): Response {
  return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 503));
}
export function strictPreflight(
  request: Request,
  allowedOrigin: string,
  method: "GET" | "POST",
): Response {
  const requestedHeaders =
    (request.headers.get("access-control-request-headers") ?? "")
      .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const allowedHeaders = new Set(["authorization", "content-type", "apikey"]);
  if (
    request.method !== "OPTIONS" ||
    request.headers.get("origin") !== allowedOrigin ||
    request.headers.get("access-control-request-method") !== method ||
    requestedHeaders.some((value) => !allowedHeaders.has(value))
  ) return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 403));
  const headers = new Headers(corsHeaders(allowedOrigin, [allowedOrigin]));
  headers.set("access-control-allow-methods", method);
  return new Response(null, { status: 204, headers });
}
