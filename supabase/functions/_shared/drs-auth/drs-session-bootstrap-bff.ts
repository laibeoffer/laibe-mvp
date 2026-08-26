import {
  DrsIdentityError,
  isUuid,
  readExactEmptyJsonBody,
} from "./contracts.ts";
import type {
  DrsSpecialistAuthorizationStrategy,
} from "./specialist-authorization.ts";

export const BFF_PROOF_AUDIENCE = "laibe:drs-session-bff";

const BOOTSTRAP_PATH = "/functions/v1/drs-session-bootstrap";
const COOKIE_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const PROOF_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const DIGEST_PATTERN = /^[A-Za-z0-9_-]{32,}$/u;
const MAX_COOKIE_HEADER_LENGTH = 8192;
const MAX_COOKIE_VALUE_LENGTH = 4096;
const MAX_SECRET_LENGTH = 4096;
const MAX_CLOSED_BODY_BYTES = 64 * 1024;
const MAX_REQUEST_FIELDS = 32;
const REQUEST_FIELD_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,63}$/u;
const REQUEST_METHOD_PATTERN = /^[A-Z]{3,10}$/u;
const REQUEST_PATH_PATTERN = /^\/[A-Za-z0-9/_-]{1,255}$/u;

const FORBIDDEN_AUTHORITY_HEADERS = Object.freeze([
  "x-laibe-case-id",
  "x-laibe-role",
  "x-laibe-account-role",
  "x-laibe-specialist-id",
  "x-laibe-assignment-id",
  "x-laibe-authenticated-user-id",
  "x-laibe-authorization-subject",
  "x-laibe-provider-subject",
  "x-laibe-provider-id",
  "x-laibe-calendar-id",
  "x-laibe-calendar-provider",
]);
const APPROVED_GUARD_X_HEADERS = Object.freeze([
  "x-client-info",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
  "x-real-ip",
  "x-request-id",
  "x-supabase-api-version",
]);

type SessionIdentityFacts = Readonly<{
  authenticatedUserId: string;
  specialistId: string;
  authorizationSubject: string;
}>;

export type IssuedServerSession = Readonly<{
  serverSessionId: string;
  accessToken: string;
  expiresAtEpochSeconds: number;
}>;

export interface ServerSessionIssuer {
  issueServerSession(
    input: Readonly<
      SessionIdentityFacts & {
        now: string;
      }
    >,
  ): Promise<IssuedServerSession>;
}

export type SealedSessionCookieEnvelope = Readonly<
  & SessionIdentityFacts
  & IssuedServerSession
  & {
    schemaVersion: "laibe.drs-server-session-cookie.v1";
  }
>;

export interface SealedCookieEnvelopeCodec {
  sealCookieEnvelope(payload: SealedSessionCookieEnvelope): Promise<string>;
  openCookieEnvelope(value: string): Promise<unknown>;
}

export type OpaqueBffProofClaims = Readonly<{
  audience: typeof BFF_PROOF_AUDIENCE;
  issuedAtEpochSeconds: number;
  expiresAtEpochSeconds: number;
  cookieDigest: string;
  authorizationFactsDigest: string;
}>;

export interface OpaqueBffProofCodec {
  mintOpaqueProof(claims: OpaqueBffProofClaims): Promise<string>;
  verifyOpaqueProof(proof: string): Promise<unknown>;
}

export type VerifiedAccessSession = Readonly<
  SessionIdentityFacts & {
    expiresAtEpochSeconds: number;
  }
>;

export interface AccessSessionVerifier {
  verifyAccessSession(
    input: Readonly<{
      serverSessionId: string;
      accessToken: string;
    }>,
  ): Promise<unknown>;
}

export interface VerifiedSessionProducerDependencies {
  allowedCallbackOrigin: string;
  successRedirectUrl: string;
  sessionCookieName: string;
  sameSite: "Lax" | "Strict";
  now(): Date;
  serverSessionIssuer: ServerSessionIssuer;
  cookieEnvelope: SealedCookieEnvelopeCodec;
}

export interface DrsSessionBootstrapDependencies {
  allowedOrigin: string;
  sessionCookieName: string;
  proofTtlSeconds: number;
  now(): Date;
  cookieEnvelope: SealedCookieEnvelopeCodec;
  proofCodec: OpaqueBffProofCodec;
  accessSessionVerifier: AccessSessionVerifier;
  authorization: DrsSpecialistAuthorizationStrategy;
}

export type DrsBffRequestScalar = string | number | boolean;

export type DrsBffRequestFieldContract = Readonly<{
  name: string;
  scalarType: "string" | "number" | "boolean";
  validate(value: DrsBffRequestScalar): boolean;
}>;

export type DrsBffRequestContract = Readonly<{
  method: string;
  pathname: string;
  queryFields: readonly DrsBffRequestFieldContract[];
  jsonBodyFields: readonly DrsBffRequestFieldContract[] | null;
}>;

export type DrsBffAuthorizedContext = Readonly<
  SessionIdentityFacts & {
    selectedCaseId: string;
    caseStatus: "active";
    accessMode: "read_only";
    proofExpiresAt: string;
  }
>;

export interface DrsBffGuard {
  authorize(request: Request): Promise<DrsBffAuthorizedContext>;
}

type BoundSession = Readonly<
  SessionIdentityFacts & {
    serverSessionId: string;
    accessToken: string;
    expiresAtEpochSeconds: number;
    selectedCaseId: string;
    caseStatus: "active";
    accessMode: "read_only";
  }
>;

type CompiledDrsBffRequestContract = Readonly<{
  method: string;
  pathname: string;
  queryFields: readonly DrsBffRequestFieldContract[];
  jsonBodyFields: readonly DrsBffRequestFieldContract[] | null;
}>;

function hasExactOwnKeys(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
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

function requestContractUnavailable(): never {
  throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
}

function compileRequestFields(
  value: unknown,
  queryFields: boolean,
): readonly DrsBffRequestFieldContract[] {
  if (!Array.isArray(value) || value.length > MAX_REQUEST_FIELDS) {
    return requestContractUnavailable();
  }
  const names = new Set<string>();
  const fields = value.map((candidate) => {
    if (
      !hasExactOwnKeys(candidate, ["name", "scalarType", "validate"]) ||
      typeof candidate.name !== "string" ||
      !REQUEST_FIELD_NAME_PATTERN.test(candidate.name) ||
      names.has(candidate.name) ||
      !["string", "number", "boolean"].includes(
        candidate.scalarType as string,
      ) ||
      (queryFields && candidate.scalarType !== "string") ||
      typeof candidate.validate !== "function"
    ) return requestContractUnavailable();
    names.add(candidate.name);
    return Object.freeze({
      name: candidate.name,
      scalarType: candidate.scalarType as "string" | "number" | "boolean",
      validate: candidate.validate as (
        value: DrsBffRequestScalar,
      ) => boolean,
    });
  });
  return Object.freeze(fields);
}

function compileRequestContract(
  value: unknown,
): CompiledDrsBffRequestContract {
  try {
    if (
      !hasExactOwnKeys(value, [
        "method",
        "pathname",
        "queryFields",
        "jsonBodyFields",
      ]) ||
      typeof value.method !== "string" ||
      !REQUEST_METHOD_PATTERN.test(value.method) ||
      typeof value.pathname !== "string" ||
      !REQUEST_PATH_PATTERN.test(value.pathname)
    ) return requestContractUnavailable();
    return Object.freeze({
      method: value.method,
      pathname: value.pathname,
      queryFields: compileRequestFields(value.queryFields, true),
      jsonBodyFields: value.jsonBodyFields === null
        ? null
        : compileRequestFields(value.jsonBodyFields, false),
    });
  } catch {
    return requestContractUnavailable();
  }
}

function currentDate(now: () => Date): Date {
  const value = now();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  return value;
}

function epochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function validSecret(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= MAX_SECRET_LENGTH &&
    Array.from(value).every((character) => {
      const code = character.charCodeAt(0);
      return code > 32 && code !== 127;
    });
}

function validCookieName(value: unknown): value is string {
  return typeof value === "string" &&
    /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(value) && value.length <= 128;
}

function validHostCookieName(value: unknown): value is string {
  return validCookieName(value) && value.startsWith("__Host-");
}

function validIdentityFacts(input: unknown): input is SessionIdentityFacts {
  if (
    !hasExactOwnKeys(input, [
      "authenticatedUserId",
      "specialistId",
      "authorizationSubject",
    ])
  ) return false;
  return isUuid(input.authenticatedUserId) && isUuid(input.specialistId) &&
    input.authorizationSubject === `drs-specialist:${input.specialistId}`;
}

function validIssuedSession(
  input: unknown,
  nowEpochSeconds: number,
): input is IssuedServerSession {
  if (
    !hasExactOwnKeys(input, [
      "serverSessionId",
      "accessToken",
      "expiresAtEpochSeconds",
    ])
  ) return false;
  const expiresAtEpochSeconds = input.expiresAtEpochSeconds;
  return validSecret(input.serverSessionId) && validSecret(input.accessToken) &&
    typeof expiresAtEpochSeconds === "number" &&
    Number.isSafeInteger(expiresAtEpochSeconds) &&
    expiresAtEpochSeconds > nowEpochSeconds;
}

function validEnvelope(
  input: unknown,
  nowEpochSeconds: number,
): input is SealedSessionCookieEnvelope {
  if (
    !hasExactOwnKeys(input, [
      "schemaVersion",
      "authenticatedUserId",
      "specialistId",
      "authorizationSubject",
      "serverSessionId",
      "accessToken",
      "expiresAtEpochSeconds",
    ])
  ) return false;
  const expiresAtEpochSeconds = input.expiresAtEpochSeconds;
  return input.schemaVersion === "laibe.drs-server-session-cookie.v1" &&
    isUuid(input.authenticatedUserId) && isUuid(input.specialistId) &&
    input.authorizationSubject === `drs-specialist:${input.specialistId}` &&
    validSecret(input.serverSessionId) && validSecret(input.accessToken) &&
    typeof expiresAtEpochSeconds === "number" &&
    Number.isSafeInteger(expiresAtEpochSeconds) &&
    expiresAtEpochSeconds > nowEpochSeconds;
}

function validVerifiedAccessSession(
  input: unknown,
  nowEpochSeconds: number,
): input is VerifiedAccessSession {
  if (
    !hasExactOwnKeys(input, [
      "authenticatedUserId",
      "specialistId",
      "authorizationSubject",
      "expiresAtEpochSeconds",
    ])
  ) return false;
  const expiresAtEpochSeconds = input.expiresAtEpochSeconds;
  return isUuid(input.authenticatedUserId) && isUuid(input.specialistId) &&
    input.authorizationSubject === `drs-specialist:${input.specialistId}` &&
    typeof expiresAtEpochSeconds === "number" &&
    Number.isSafeInteger(expiresAtEpochSeconds) &&
    expiresAtEpochSeconds > nowEpochSeconds;
}

function validGrant(
  input: unknown,
): input is Readonly<{
  selectedCaseId: string;
  caseStatus: "active";
  accessMode: "read_only";
}> {
  if (
    !hasExactOwnKeys(input, [
      "selectedCaseId",
      "caseStatus",
      "accessMode",
    ])
  ) return false;
  return isUuid(input.selectedCaseId) && input.caseStatus === "active" &&
    input.accessMode === "read_only";
}

function validProofClaims(
  input: unknown,
  nowEpochSeconds: number,
): input is OpaqueBffProofClaims {
  if (
    !hasExactOwnKeys(input, [
      "audience",
      "issuedAtEpochSeconds",
      "expiresAtEpochSeconds",
      "cookieDigest",
      "authorizationFactsDigest",
    ])
  ) return false;
  const issuedAtEpochSeconds = input.issuedAtEpochSeconds;
  const expiresAtEpochSeconds = input.expiresAtEpochSeconds;
  if (
    input.audience !== BFF_PROOF_AUDIENCE ||
    typeof issuedAtEpochSeconds !== "number" ||
    !Number.isSafeInteger(issuedAtEpochSeconds) ||
    typeof expiresAtEpochSeconds !== "number" ||
    !Number.isSafeInteger(expiresAtEpochSeconds) ||
    issuedAtEpochSeconds > nowEpochSeconds ||
    expiresAtEpochSeconds <= nowEpochSeconds ||
    expiresAtEpochSeconds <= issuedAtEpochSeconds ||
    expiresAtEpochSeconds - issuedAtEpochSeconds > 60 ||
    typeof input.cookieDigest !== "string" ||
    !DIGEST_PATTERN.test(input.cookieDigest) ||
    typeof input.authorizationFactsDigest !== "string" ||
    !DIGEST_PATTERN.test(input.authorizationFactsDigest)
  ) return false;
  return true;
}

function assertConfiguredOrigin(value: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.origin !== value ||
    url.pathname !== "/" || url.search || url.hash || url.username ||
    url.password
  ) throw new Error("INVALID_ORIGIN_CONFIG");
}

function assertConfiguredRedirect(value: string, allowedOrigin: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.origin !== allowedOrigin || url.search ||
    url.hash || url.username || url.password
  ) throw new Error("INVALID_REDIRECT_CONFIG");
}

function producerUnavailable(): DrsIdentityError {
  return new DrsIdentityError("SESSION_PRODUCER_UNAVAILABLE", 503);
}

export function createServerOwnedVerifiedSessionProducer(
  dependencies: VerifiedSessionProducerDependencies,
): {
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
} {
  return {
    async createVerifiedSession(input) {
      try {
        assertConfiguredOrigin(dependencies.allowedCallbackOrigin);
        assertConfiguredRedirect(
          dependencies.successRedirectUrl,
          dependencies.allowedCallbackOrigin,
        );
        if (
          !validHostCookieName(dependencies.sessionCookieName) ||
          !["Lax", "Strict"].includes(dependencies.sameSite) ||
          !validIdentityFacts({
            authenticatedUserId: input.authenticatedUserId,
            specialistId: input.specialistId,
            authorizationSubject: input.authorizationSubject,
          }) || input.callbackOrigin !== dependencies.allowedCallbackOrigin ||
          input.successRedirectUrl !== dependencies.successRedirectUrl ||
          input.sessionCookieName !== dependencies.sessionCookieName
        ) throw new Error("INVALID_SESSION_PRODUCER_INPUT");

        const now = currentDate(dependencies.now);
        const issued = await dependencies.serverSessionIssuer
          .issueServerSession({
            authenticatedUserId: input.authenticatedUserId,
            specialistId: input.specialistId,
            authorizationSubject: input.authorizationSubject,
            now: now.toISOString(),
          });
        if (!validIssuedSession(issued, epochSeconds(now))) {
          throw new Error("INVALID_ISSUED_SESSION");
        }
        const sealed = await dependencies.cookieEnvelope.sealCookieEnvelope({
          schemaVersion: "laibe.drs-server-session-cookie.v1",
          authenticatedUserId: input.authenticatedUserId,
          specialistId: input.specialistId,
          authorizationSubject: input.authorizationSubject,
          serverSessionId: issued.serverSessionId,
          accessToken: issued.accessToken,
          expiresAtEpochSeconds: issued.expiresAtEpochSeconds,
        });
        if (
          typeof sealed !== "string" || sealed.length === 0 ||
          sealed.length > MAX_COOKIE_VALUE_LENGTH ||
          !COOKIE_VALUE_PATTERN.test(sealed) ||
          sealed.includes(issued.accessToken) ||
          sealed.includes(issued.serverSessionId)
        ) throw new Error("INVALID_SEALED_COOKIE");

        return Object.freeze({
          response: new Response(null, {
            status: 303,
            headers: {
              "location": dependencies.successRedirectUrl,
              "set-cookie":
                `${dependencies.sessionCookieName}=${sealed}; Path=/; HttpOnly; Secure; SameSite=${dependencies.sameSite}`,
              "x-laibe-session-state": "SESSION_ESTABLISHED",
            },
          }),
        });
      } catch {
        throw producerUnavailable();
      }
    },
  };
}

function assertNoAuthorityHeaders(
  request: Request,
  authorizationAllowed: boolean,
): void {
  if (!authorizationAllowed && request.headers.has("authorization")) {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  if (FORBIDDEN_AUTHORITY_HEADERS.some((name) => request.headers.has(name))) {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
}

function assertNoCustomGuardHeaders(request: Request): void {
  for (const name of request.headers.keys()) {
    if (
      name.startsWith("x-") && !APPROVED_GUARD_X_HEADERS.includes(name)
    ) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
  }
}

function assertSameOrigin(
  request: Request,
  allowedOrigin: string,
): void {
  if (
    request.headers.get("origin") !== allowedOrigin ||
    request.headers.get("sec-fetch-site") !== "same-origin"
  ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 403);
}

function readConfiguredCookie(
  request: Request,
  cookieName: string,
): Readonly<{ value: string; exactCookie: string }> {
  const raw = request.headers.get("cookie");
  if (
    raw === null || raw.length === 0 || raw.length > MAX_COOKIE_HEADER_LENGTH ||
    raw.includes("\r") || raw.includes("\n") || raw.includes("\0")
  ) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  const matches: string[] = [];
  for (const rawPart of raw.split(";")) {
    const part = rawPart.trim();
    const separator = part.indexOf("=");
    if (separator <= 0) throw new DrsIdentityError("AUTH_REQUIRED", 401);
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!validCookieName(name) || value.length === 0) {
      throw new DrsIdentityError("AUTH_REQUIRED", 401);
    }
    if (name === cookieName) matches.push(value);
  }
  if (
    matches.length !== 1 || matches[0].length > MAX_COOKIE_VALUE_LENGTH ||
    !COOKIE_VALUE_PATTERN.test(matches[0])
  ) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  return Object.freeze({
    value: matches[0],
    exactCookie: `${cookieName}=${matches[0]}`,
  });
}

function runtimeAvailable(
  dependencies: DrsSessionBootstrapDependencies | undefined,
): dependencies is DrsSessionBootstrapDependencies {
  return !!dependencies && typeof dependencies.allowedOrigin === "string" &&
    validHostCookieName(dependencies.sessionCookieName) &&
    Number.isSafeInteger(dependencies.proofTtlSeconds) &&
    dependencies.proofTtlSeconds > 0 && dependencies.proofTtlSeconds <= 60 &&
    typeof dependencies.now === "function" &&
    typeof dependencies.cookieEnvelope?.sealCookieEnvelope === "function" &&
    typeof dependencies.cookieEnvelope?.openCookieEnvelope === "function" &&
    typeof dependencies.proofCodec?.mintOpaqueProof === "function" &&
    typeof dependencies.proofCodec?.verifyOpaqueProof === "function" &&
    typeof dependencies.accessSessionVerifier?.verifyAccessSession ===
      "function" &&
    typeof dependencies.authorization?.resolveSession === "function";
}

async function sha256Digest(value: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

async function cookieDigest(exactCookie: string): Promise<string> {
  return await sha256Digest(JSON.stringify(["cookie-v1", exactCookie]));
}

async function authorizationFactsDigest(
  session: BoundSession,
): Promise<string> {
  return await sha256Digest(JSON.stringify([
    "drs-bff-authority-v1",
    session.authenticatedUserId,
    session.specialistId,
    session.authorizationSubject,
    session.selectedCaseId,
    session.caseStatus,
    session.accessMode,
  ]));
}

function proofClaimsEqual(
  actual: OpaqueBffProofClaims,
  expected: OpaqueBffProofClaims,
): boolean {
  return actual.audience === expected.audience &&
    actual.issuedAtEpochSeconds === expected.issuedAtEpochSeconds &&
    actual.expiresAtEpochSeconds === expected.expiresAtEpochSeconds &&
    actual.cookieDigest === expected.cookieDigest &&
    actual.authorizationFactsDigest === expected.authorizationFactsDigest;
}

function preserveVerificationError(error: unknown): DrsIdentityError {
  if (
    error instanceof DrsIdentityError &&
    [401, 403, 503].includes(error.status)
  ) return error;
  return new DrsIdentityError("AUTH_REQUIRED", 401);
}

async function resolveBoundSession(
  dependencies: DrsSessionBootstrapDependencies,
  cookieValue: string,
  nowEpochSeconds: number,
): Promise<BoundSession> {
  let envelope: unknown;
  try {
    envelope = await dependencies.cookieEnvelope.openCookieEnvelope(
      cookieValue,
    );
  } catch {
    throw new DrsIdentityError("AUTH_REQUIRED", 401);
  }
  if (!validEnvelope(envelope, nowEpochSeconds)) {
    throw new DrsIdentityError("AUTH_REQUIRED", 401);
  }

  let verified: unknown;
  try {
    verified = await dependencies.accessSessionVerifier.verifyAccessSession({
      serverSessionId: envelope.serverSessionId,
      accessToken: envelope.accessToken,
    });
  } catch (error) {
    throw preserveVerificationError(error);
  }
  if (
    !validVerifiedAccessSession(verified, nowEpochSeconds) ||
    verified.authenticatedUserId !== envelope.authenticatedUserId ||
    verified.specialistId !== envelope.specialistId ||
    verified.authorizationSubject !== envelope.authorizationSubject ||
    verified.expiresAtEpochSeconds !== envelope.expiresAtEpochSeconds
  ) throw new DrsIdentityError("AUTH_REQUIRED", 401);

  let grant: unknown;
  try {
    grant = await dependencies.authorization.resolveSession({
      authenticatedUserId: verified.authenticatedUserId,
    });
  } catch (error) {
    if (
      error instanceof DrsIdentityError &&
      [401, 403, 503].includes(error.status)
    ) throw error;
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  if (!validGrant(grant)) {
    throw new DrsIdentityError("CASE_NOT_AUTHORIZED", 403);
  }
  return Object.freeze({
    authenticatedUserId: verified.authenticatedUserId,
    specialistId: verified.specialistId,
    authorizationSubject: verified.authorizationSubject,
    serverSessionId: envelope.serverSessionId,
    accessToken: envelope.accessToken,
    expiresAtEpochSeconds: verified.expiresAtEpochSeconds,
    selectedCaseId: grant.selectedCaseId,
    caseStatus: grant.caseStatus,
    accessMode: grant.accessMode,
  });
}

function successHeaders(
  origin: string,
  proof: string,
  expiresAt: string,
): HeadersInit {
  return {
    "authorization": `Bearer ${proof}`,
    "x-laibe-session-expires-at": expiresAt,
    "cache-control": "no-store",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "vary": "Origin, Cookie",
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-expose-headers":
      "Authorization, X-Laibe-Session-Expires-At",
  };
}

function closedResponse(status: number, origin?: string): Response {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "vary": "Origin, Cookie",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
  }
  return new Response(null, { status, headers });
}

function sanitizedStatus(error: unknown): number {
  if (
    error instanceof DrsIdentityError &&
    [400, 401, 403, 503].includes(error.status)
  ) return error.status;
  return 503;
}

export function createDrsSessionBootstrapHandler(
  dependencies?: DrsSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    let allowedOrigin: string | undefined;
    try {
      if (
        request.method !== "POST" ||
        new URL(request.url).pathname !== BOOTSTRAP_PATH ||
        new URL(request.url).search.length !== 0 ||
        !(await readExactEmptyJsonBody(request))
      ) throw new DrsIdentityError("INVALID_REQUEST", 400);
      assertNoAuthorityHeaders(request, false);
      if (!runtimeAvailable(dependencies)) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      assertConfiguredOrigin(dependencies.allowedOrigin);
      allowedOrigin = dependencies.allowedOrigin;
      assertSameOrigin(request, dependencies.allowedOrigin);
      const cookie = readConfiguredCookie(
        request,
        dependencies.sessionCookieName,
      );
      const now = currentDate(dependencies.now);
      const nowEpochSeconds = epochSeconds(now);
      const session = await resolveBoundSession(
        dependencies,
        cookie.value,
        nowEpochSeconds,
      );
      const expiresAtEpochSeconds = Math.min(
        nowEpochSeconds + dependencies.proofTtlSeconds,
        session.expiresAtEpochSeconds,
      );
      if (
        expiresAtEpochSeconds <= nowEpochSeconds ||
        expiresAtEpochSeconds - nowEpochSeconds > 60
      ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      const claims: OpaqueBffProofClaims = Object.freeze({
        audience: BFF_PROOF_AUDIENCE,
        issuedAtEpochSeconds: nowEpochSeconds,
        expiresAtEpochSeconds,
        cookieDigest: await cookieDigest(cookie.exactCookie),
        authorizationFactsDigest: await authorizationFactsDigest(session),
      });
      const proof = await dependencies.proofCodec.mintOpaqueProof(claims);
      let verifiedProof: unknown;
      try {
        verifiedProof = await dependencies.proofCodec.verifyOpaqueProof(proof);
      } catch {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      if (
        !validProofClaims(verifiedProof, nowEpochSeconds) ||
        !proofClaimsEqual(verifiedProof, claims)
      ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      if (
        typeof proof !== "string" || !PROOF_PATTERN.test(proof) ||
        proof === session.accessToken || proof === session.serverSessionId ||
        proof.includes(session.accessToken) ||
        proof.includes(session.serverSessionId) ||
        proof === session.authenticatedUserId ||
        proof.includes(session.authenticatedUserId) ||
        proof.includes(session.specialistId) ||
        proof.includes(session.authorizationSubject) ||
        proof.includes(session.selectedCaseId)
      ) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);

      return new Response(null, {
        status: 204,
        headers: successHeaders(
          dependencies.allowedOrigin,
          proof,
          new Date(expiresAtEpochSeconds * 1000).toISOString(),
        ),
      });
    } catch (error) {
      return closedResponse(
        sanitizedStatus(error),
        allowedOrigin && request.headers.get("origin") === allowedOrigin
          ? allowedOrigin
          : undefined,
      );
    }
  };
}

function invalidClosedRequest(): never {
  throw new DrsIdentityError("INVALID_REQUEST", 400);
}

function assertFieldValue(
  field: DrsBffRequestFieldContract,
  value: unknown,
): void {
  if (
    typeof value !== field.scalarType ||
    (typeof value === "number" && !Number.isFinite(value))
  ) return invalidClosedRequest();
  try {
    if (field.validate(value as DrsBffRequestScalar) !== true) {
      return invalidClosedRequest();
    }
  } catch {
    return invalidClosedRequest();
  }
}

function assertExactQuery(
  url: URL,
  fields: readonly DrsBffRequestFieldContract[],
): void {
  const entries = Array.from(url.searchParams.entries());
  if (entries.length !== fields.length) return invalidClosedRequest();
  const byName = new Map(fields.map((field) => [field.name, field]));
  const seen = new Set<string>();
  for (const [name, value] of entries) {
    const field = byName.get(name);
    if (!field || seen.has(name)) return invalidClosedRequest();
    seen.add(name);
    assertFieldValue(field, value);
  }
}

function hasDuplicateTopLevelJsonMemberName(raw: string): boolean {
  const seen = new Set<string>();
  let depth = 0;
  let stringStart = -1;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (stringStart >= 0) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character !== '"') continue;

      const end = index + 1;
      let next = end;
      while (
        next < raw.length &&
        (raw[next] === " " || raw[next] === "\t" || raw[next] === "\n" ||
          raw[next] === "\r")
      ) next += 1;
      if (depth === 1 && raw[next] === ":") {
        let memberName: unknown;
        try {
          memberName = JSON.parse(raw.slice(stringStart, end));
        } catch {
          return false;
        }
        if (typeof memberName !== "string") return false;
        if (seen.has(memberName)) return true;
        seen.add(memberName);
      }
      stringStart = -1;
      continue;
    }

    if (character === '"') {
      stringStart = index;
    } else if (character === "{" || character === "[") {
      depth += 1;
    } else if (character === "}" || character === "]") {
      depth -= 1;
    }
  }
  return false;
}

async function assertExactJsonBody(
  request: Request,
  fields: readonly DrsBffRequestFieldContract[] | null,
): Promise<void> {
  if (fields === null) {
    if (
      request.body !== null || request.headers.has("content-type") ||
      request.headers.has("content-length")
    ) return invalidClosedRequest();
    return;
  }
  if (
    request.body === null ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(
      request.headers.get("content-type") ?? "",
    )
  ) return invalidClosedRequest();
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d{1,10}$/u.test(declaredLength) ||
      Number(declaredLength) > MAX_CLOSED_BODY_BYTES)
  ) return invalidClosedRequest();
  let bytes: ArrayBuffer;
  try {
    bytes = await request.clone().arrayBuffer();
  } catch {
    return invalidClosedRequest();
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CLOSED_BODY_BYTES) {
    return invalidClosedRequest();
  }
  let payload: unknown;
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (hasDuplicateTopLevelJsonMemberName(raw)) return invalidClosedRequest();
    payload = JSON.parse(raw);
  } catch {
    return invalidClosedRequest();
  }
  const names = fields.map((field) => field.name);
  if (!hasExactOwnKeys(payload, names)) return invalidClosedRequest();
  for (const field of fields) assertFieldValue(field, payload[field.name]);
}

async function assertClosedRequestContract(
  request: Request,
  contract: CompiledDrsBffRequestContract,
): Promise<void> {
  const url = new URL(request.url);
  if (
    request.method !== contract.method || url.pathname !== contract.pathname
  ) {
    return invalidClosedRequest();
  }
  assertNoCustomGuardHeaders(request);
  assertExactQuery(url, contract.queryFields);
  await assertExactJsonBody(request, contract.jsonBodyFields);
}

function bearerProof(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/u
    .exec(authorization);
  if (!match) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  return match[1];
}

export function createDrsBffGuard(
  dependencies: DrsSessionBootstrapDependencies | undefined,
  requestContract: DrsBffRequestContract,
): DrsBffGuard {
  const compiledRequestContract = compileRequestContract(requestContract);
  return Object.freeze({
    async authorize(request: Request) {
      if (!runtimeAvailable(dependencies)) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      try {
        assertConfiguredOrigin(dependencies.allowedOrigin);
      } catch {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      }
      assertSameOrigin(request, dependencies.allowedOrigin);
      await assertClosedRequestContract(request, compiledRequestContract);
      const proof = bearerProof(request);
      const cookie = readConfiguredCookie(
        request,
        dependencies.sessionCookieName,
      );
      const now = currentDate(dependencies.now);
      const nowEpochSeconds = epochSeconds(now);
      let candidateClaims: unknown;
      try {
        candidateClaims = await dependencies.proofCodec.verifyOpaqueProof(
          proof,
        );
      } catch {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      }
      if (!validProofClaims(candidateClaims, nowEpochSeconds)) {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      }
      const exactCookieDigest = await cookieDigest(cookie.exactCookie);
      if (candidateClaims.cookieDigest !== exactCookieDigest) {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      }
      const session = await resolveBoundSession(
        dependencies,
        cookie.value,
        nowEpochSeconds,
      );
      if (
        candidateClaims.expiresAtEpochSeconds > session.expiresAtEpochSeconds
      ) {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      }
      const exactAuthorityDigest = await authorizationFactsDigest(session);
      if (candidateClaims.authorizationFactsDigest !== exactAuthorityDigest) {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      }
      return Object.freeze({
        authenticatedUserId: session.authenticatedUserId,
        specialistId: session.specialistId,
        authorizationSubject: session.authorizationSubject,
        selectedCaseId: session.selectedCaseId,
        caseStatus: session.caseStatus,
        accessMode: session.accessMode,
        proofExpiresAt: new Date(
          candidateClaims.expiresAtEpochSeconds * 1000,
        ).toISOString(),
      });
    },
  });
}
