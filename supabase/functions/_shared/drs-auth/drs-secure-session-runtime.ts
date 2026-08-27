import {
  BFF_PROOF_AUDIENCE,
  createServerOwnedVerifiedSessionProducer,
  type DrsSessionBootstrapDependencies,
  type OpaqueBffProofClaims,
  type SealedSessionCookieEnvelope,
} from "./drs-session-bootstrap-bff.ts";
import {
  createSupabaseDrsWorkspaceGrantDependencies,
} from "./drs-specialist-authority.ts";
import {
  createDrsSpecialistAuthorizationStrategy,
} from "./specialist-authorization.ts";
import type {
  FetchLike,
  RuntimeEnvironment,
  VerifiedSessionProducer,
} from "./contracts.ts";
import { isUuid } from "./contracts.ts";

const ENVIRONMENT_NAMES = Object.freeze(
  [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LAIBE_DRS_APP_ORIGIN",
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
  ] as const,
);

const SESSION_TTL_SECONDS = 900;
const PROOF_TTL_SECONDS = 60;
const MAX_RPC_REQUEST_BYTES = 2048;
const MAX_RPC_RESPONSE_BYTES = 8192;
const MAX_COOKIE_BYTES = 4096;
const MAX_PROOF_BYTES = 4096;
const COOKIE_DOMAIN = "laibe.drs-server-session-cookie.v1";
const PROOF_AUDIENCE = "laibe:drs-session-bff";
const COOKIE_AAD = new TextEncoder().encode(COOKIE_DOMAIN);
const PROOF_HEADER_JSON = '{"alg":"HS256","typ":"JWT"}';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const BASE64URL_32_BYTE_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;
const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]{1,128}$/u;
const RPC_PATHS = Object.freeze(
  [
    "/rest/v1/rpc/drs_workspace_grant_v1",
    "/rest/v1/rpc/drs_server_session_issue_v1",
    "/rest/v1/rpc/drs_server_session_verify_v1",
    "/rest/v1/rpc/drs_server_session_revoke_v1",
  ] as const,
);

type EnvironmentName = (typeof ENVIRONMENT_NAMES)[number];
type ExactEnvironment = Readonly<Record<EnvironmentName, string>>;
type RpcPath = (typeof RPC_PATHS)[number];

export type DrsServerSessionRevoker = Readonly<{
  revokeServerSession(
    input: Readonly<{
      serverSessionId: string;
      accessToken: string;
    }>,
  ): Promise<void>;
}>;

export type DrsSecureSessionRuntime = Readonly<{
  runtimeAvailable: boolean;
  bootstrapDependencies: DrsSessionBootstrapDependencies | undefined;
  verifiedSessionProducer: VerifiedSessionProducer | null;
  sessionRevoker: DrsServerSessionRevoker | null;
}>;

export type DrsSecureSessionRuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  crypto?: Crypto;
  now?: () => Date;
}>;

const UNAVAILABLE_RUNTIME: DrsSecureSessionRuntime = Object.freeze({
  runtimeAvailable: false,
  bootstrapDependencies: undefined,
  verifiedSessionProducer: null,
  sessionRevoker: null,
});

function unavailable(): DrsSecureSessionRuntime {
  return UNAVAILABLE_RUNTIME;
}

function sanitizedFailure(): Error {
  return new Error("DRS_SECURE_SESSION_UNAVAILABLE");
}

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

function ownValue(input: Record<string, unknown>, key: string): unknown {
  try {
    return Object.getOwnPropertyDescriptor(input, key)?.value;
  } catch {
    return undefined;
  }
}

function defaultEnvironment(): RuntimeEnvironment | null {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env?: RuntimeEnvironment };
  };
  return runtime.Deno?.env && typeof runtime.Deno.env.get === "function"
    ? runtime.Deno.env
    : null;
}

function readExactEnvironment(
  explicit: RuntimeEnvironment | undefined,
): ExactEnvironment | null {
  const environment = explicit ?? defaultEnvironment();
  if (!environment || typeof environment.get !== "function") return null;
  const values = Object.create(null) as Record<EnvironmentName, string>;
  try {
    for (const name of ENVIRONMENT_NAMES) {
      const value = environment.get(name);
      if (typeof value !== "string") return null;
      values[name] = value;
    }
  } catch {
    return null;
  }
  return Object.freeze(values);
}

function hasUnsafeUrlByte(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return character === "\\" || /\s/u.test(character) || code < 32 ||
      code === 127;
  });
}

function validSupabaseOrigin(value: string): boolean {
  if (!value || hasUnsafeUrlByte(value)) return false;
  try {
    const parsed = new URL(value);
    if (
      parsed.origin !== value || parsed.username || parsed.password ||
      parsed.search || parsed.hash
    ) return false;
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]");
  } catch {
    return false;
  }
}

function validHttpsOrigin(value: string): boolean {
  if (!value || hasUnsafeUrlByte(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.origin === value &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

function validSuccessUrl(value: string, appOrigin: string): boolean {
  if (!value || hasUnsafeUrlByte(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.origin === appOrigin &&
      parsed.href === value && !parsed.username && !parsed.password &&
      !parsed.search && !parsed.hash && parsed.pathname !== "/" &&
      /^\/[A-Za-z0-9/_-]+$/u.test(parsed.pathname) &&
      !parsed.pathname.includes("//") && !parsed.pathname.endsWith("/");
  } catch {
    return false;
  }
}

function validServiceRoleKey(value: string): boolean {
  return value.length > 0 && value.length <= 4096 &&
    Array.from(value).every((character) => {
      const code = character.charCodeAt(0);
      return code >= 33 && code <= 126;
    });
}

function validHostCookieName(value: string): boolean {
  return value.startsWith("__Host-") && COOKIE_NAME_PATTERN.test(value);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw sanitizedFailure();
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    if (base64Url(bytes) !== value) throw sanitizedFailure();
    return bytes;
  } catch {
    throw sanitizedFailure();
  }
}

function readKey(value: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64URL_32_BYTE_PATTERN.test(value)) return null;
  try {
    const bytes = fromBase64Url(value);
    return bytes.byteLength === 32 ? bytes : null;
  } catch {
    return null;
  }
}

function validCrypto(value: Crypto | undefined): value is Crypto {
  return !!value && typeof value.getRandomValues === "function" &&
    typeof value.randomUUID === "function" && !!value.subtle &&
    typeof value.subtle.importKey === "function" &&
    typeof value.subtle.encrypt === "function" &&
    typeof value.subtle.decrypt === "function" &&
    typeof value.subtle.sign === "function" &&
    typeof value.subtle.digest === "function";
}

function safeNow(now: () => Date): Date {
  const candidate = now();
  if (!(candidate instanceof Date) || !Number.isFinite(candidate.getTime())) {
    throw sanitizedFailure();
  }
  return new Date(candidate.getTime());
}

function validRfc3339(value: unknown): value is string {
  return typeof value === "string" && RFC3339_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value));
}

function validAuthorizationSubject(
  value: unknown,
  specialistId: unknown,
): value is string {
  return typeof specialistId === "string" && isUuid(specialistId) &&
    value === `drs-specialist:${specialistId}`;
}

function exactRpcBody(path: RpcPath, input: unknown): boolean {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const body = input as Record<string, unknown>;
  if (path === "/rest/v1/rpc/drs_workspace_grant_v1") {
    if (
      !hasExactOwnKeys(body, [
        "p_authenticated_user_id",
        "p_expected_case_id",
        "p_authorization_subject",
      ]) || !isUuid(ownValue(body, "p_authenticated_user_id"))
    ) return false;
    const expectedCaseId = ownValue(body, "p_expected_case_id");
    const subject = ownValue(body, "p_authorization_subject");
    return (expectedCaseId === null || isUuid(expectedCaseId)) &&
      (subject === null ||
        (typeof subject === "string" &&
          /^drs-specialist:[0-9a-f-]{36}$/iu.test(subject)));
  }
  if (path === "/rest/v1/rpc/drs_server_session_issue_v1") {
    return hasExactOwnKeys(body, [
      "p_server_session_id",
      "p_access_token_digest",
      "p_authenticated_user_id",
      "p_specialist_id",
      "p_authorization_subject",
      "p_issued_at",
      "p_expires_at",
    ]) && isUuid(ownValue(body, "p_server_session_id")) &&
      BASE64URL_32_BYTE_PATTERN.test(
        String(ownValue(body, "p_access_token_digest") ?? ""),
      ) && isUuid(ownValue(body, "p_authenticated_user_id")) &&
      isUuid(ownValue(body, "p_specialist_id")) &&
      validAuthorizationSubject(
        ownValue(body, "p_authorization_subject"),
        ownValue(body, "p_specialist_id"),
      ) && validRfc3339(ownValue(body, "p_issued_at")) &&
      validRfc3339(ownValue(body, "p_expires_at"));
  }
  return hasExactOwnKeys(body, [
    "p_server_session_id",
    "p_access_token_digest",
  ]) && isUuid(ownValue(body, "p_server_session_id")) &&
    BASE64URL_32_BYTE_PATTERN.test(
      String(ownValue(body, "p_access_token_digest") ?? ""),
    );
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
      while (/\s/u.test(raw[next] ?? "")) next += 1;
      if (depth === 1 && raw[next] === ":") {
        try {
          const memberName = JSON.parse(raw.slice(stringStart, end));
          if (typeof memberName !== "string" || seen.has(memberName)) {
            return true;
          }
          seen.add(memberName);
        } catch {
          return true;
        }
      }
      stringStart = -1;
    } else if (character === '"') {
      stringStart = index;
    } else if (character === "{" || character === "[") {
      depth += 1;
    } else if (character === "}" || character === "]") {
      depth -= 1;
    }
  }
  return false;
}

async function cancelReader(
  reader: ReadableStreamDefaultReader<Uint8Array> | null,
): Promise<void> {
  if (!reader) return;
  try {
    await reader.cancel();
  } catch {
    // Cancellation is best-effort after the request has already failed closed.
  }
}

function createBoundedRpcFetch(
  supabaseOrigin: string,
  serviceRoleKey: string,
  rawFetch: FetchLike,
): FetchLike {
  return async (input, init) => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      if (
        !(typeof input === "string" || input instanceof URL) ||
        init?.method !== "POST" || typeof init.body !== "string"
      ) throw sanitizedFailure();
      const url = new URL(String(input));
      const path = RPC_PATHS.find((candidate) => candidate === url.pathname);
      if (
        !path || url.origin !== supabaseOrigin ||
        url.href !== `${supabaseOrigin}${path}`
      ) throw sanitizedFailure();
      const requestBytes = new TextEncoder().encode(init.body).byteLength;
      if (
        requestBytes < 1 || requestBytes > MAX_RPC_REQUEST_BYTES ||
        hasDuplicateTopLevelJsonMemberName(init.body)
      ) throw sanitizedFailure();
      let requestPayload: unknown;
      try {
        requestPayload = JSON.parse(init.body);
      } catch {
        throw sanitizedFailure();
      }
      if (
        !exactRpcBody(path, requestPayload) ||
        JSON.stringify(requestPayload) !== init.body
      ) throw sanitizedFailure();

      const response = await rawFetch(`${supabaseOrigin}${path}`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          "content-type": "application/json",
        },
        body: init.body,
        redirect: "error",
      });
      if (!response.body) throw sanitizedFailure();
      reader = response.body.getReader();
      const status = response.status;
      if (
        response.redirected || !Number.isInteger(status) || status < 200 ||
        status > 599 || (status >= 300 && status <= 399) ||
        status === 204 || status === 205
      ) throw sanitizedFailure();
      const rawLength = response.headers.get("content-length");
      let declaredLength: number | null = null;
      if (rawLength !== null) {
        if (!/^[1-9]\d{0,3}$/u.test(rawLength)) throw sanitizedFailure();
        declaredLength = Number(rawLength);
        if (
          declaredLength < 1 || declaredLength > MAX_RPC_RESPONSE_BYTES ||
          String(declaredLength) !== rawLength
        ) throw sanitizedFailure();
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        if (!(result.value instanceof Uint8Array)) throw sanitizedFailure();
        total += result.value.byteLength;
        if (
          total > MAX_RPC_RESPONSE_BYTES ||
          (declaredLength !== null && total > declaredLength)
        ) throw sanitizedFailure();
        chunks.push(result.value);
      }
      if (total < 1 || (declaredLength !== null && total !== declaredLength)) {
        throw sanitizedFailure();
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (hasDuplicateTopLevelJsonMemberName(text)) throw sanitizedFailure();
      const payload = JSON.parse(text);
      if (
        payload === null || typeof payload !== "object" ||
        Array.isArray(payload)
      ) throw sanitizedFailure();
      return new Response(bytes, {
        status,
        headers: { "content-type": "application/json" },
      });
    } catch {
      await cancelReader(reader);
      throw sanitizedFailure();
    }
  };
}

async function callRpc(
  boundedFetch: FetchLike,
  supabaseOrigin: string,
  path: RpcPath,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const response = await boundedFetch(`${supabaseOrigin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw sanitizedFailure();
    const payload: unknown = await response.json();
    if (
      payload === null || typeof payload !== "object" || Array.isArray(payload)
    ) throw sanitizedFailure();
    return payload as Record<string, unknown>;
  } catch {
    throw sanitizedFailure();
  }
}

function createCookieEnvelopeCodec(
  cryptoImplementation: Crypto,
  rawKey: Uint8Array<ArrayBuffer>,
) {
  let keyPromise: Promise<CryptoKey> | null = null;
  const key = () =>
    keyPromise ??= cryptoImplementation.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );

  function validateEnvelope(
    input: unknown,
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
    return ownValue(input, "schemaVersion") === COOKIE_DOMAIN &&
      isUuid(ownValue(input, "authenticatedUserId")) &&
      isUuid(ownValue(input, "specialistId")) &&
      validAuthorizationSubject(
        ownValue(input, "authorizationSubject"),
        ownValue(input, "specialistId"),
      ) && isUuid(ownValue(input, "serverSessionId")) &&
      typeof ownValue(input, "accessToken") === "string" &&
      BASE64URL_32_BYTE_PATTERN.test(
        ownValue(input, "accessToken") as string,
      ) && Number.isSafeInteger(ownValue(input, "expiresAtEpochSeconds")) &&
      (ownValue(input, "expiresAtEpochSeconds") as number) > 0;
  }

  return Object.freeze({
    async sealCookieEnvelope(payload: SealedSessionCookieEnvelope) {
      try {
        if (!validateEnvelope(payload)) throw sanitizedFailure();
        const plaintext = JSON.stringify({
          schemaVersion: payload.schemaVersion,
          authenticatedUserId: payload.authenticatedUserId,
          specialistId: payload.specialistId,
          authorizationSubject: payload.authorizationSubject,
          serverSessionId: payload.serverSessionId,
          accessToken: payload.accessToken,
          expiresAtEpochSeconds: payload.expiresAtEpochSeconds,
        });
        const iv = new Uint8Array(12);
        cryptoImplementation.getRandomValues(iv);
        const ciphertext = new Uint8Array(
          await cryptoImplementation.subtle.encrypt(
            {
              name: "AES-GCM",
              iv,
              additionalData: COOKIE_AAD,
              tagLength: 128,
            },
            await key(),
            new TextEncoder().encode(plaintext),
          ),
        );
        const sealed = `v1.${base64Url(iv)}.${base64Url(ciphertext)}`;
        if (sealed.length > MAX_COOKIE_BYTES) throw sanitizedFailure();
        return sealed;
      } catch {
        throw sanitizedFailure();
      }
    },
    async openCookieEnvelope(value: string) {
      try {
        if (
          typeof value !== "string" || value.length < 1 ||
          value.length > MAX_COOKIE_BYTES
        ) throw sanitizedFailure();
        const parts = value.split(".");
        if (parts.length !== 3 || parts[0] !== "v1") throw sanitizedFailure();
        const iv = fromBase64Url(parts[1]);
        const ciphertext = fromBase64Url(parts[2]);
        if (iv.byteLength !== 12 || ciphertext.byteLength < 17) {
          throw sanitizedFailure();
        }
        const plaintextBytes = await cryptoImplementation.subtle.decrypt(
          {
            name: "AES-GCM",
            iv,
            additionalData: COOKIE_AAD,
            tagLength: 128,
          },
          await key(),
          ciphertext,
        );
        const plaintext = new TextDecoder("utf-8", { fatal: true }).decode(
          plaintextBytes,
        );
        if (new TextEncoder().encode(plaintext).byteLength > MAX_COOKIE_BYTES) {
          throw sanitizedFailure();
        }
        const parsed: unknown = JSON.parse(plaintext);
        if (!validateEnvelope(parsed) || JSON.stringify(parsed) !== plaintext) {
          throw sanitizedFailure();
        }
        return Object.freeze({ ...(parsed as SealedSessionCookieEnvelope) });
      } catch {
        throw sanitizedFailure();
      }
    },
  });
}

function createProofCodec(
  cryptoImplementation: Crypto,
  rawKey: Uint8Array<ArrayBuffer>,
) {
  const encodedHeader = base64Url(new TextEncoder().encode(PROOF_HEADER_JSON));
  let keyPromise: Promise<CryptoKey> | null = null;
  const key = () =>
    keyPromise ??= cryptoImplementation.subtle.importKey(
      "raw",
      rawKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

  function validateClaims(input: unknown): input is OpaqueBffProofClaims {
    if (
      !hasExactOwnKeys(input, [
        "audience",
        "issuedAtEpochSeconds",
        "expiresAtEpochSeconds",
        "cookieDigest",
        "authorizationFactsDigest",
      ])
    ) return false;
    const issuedAt = ownValue(input, "issuedAtEpochSeconds");
    const expiresAt = ownValue(input, "expiresAtEpochSeconds");
    return ownValue(input, "audience") === PROOF_AUDIENCE &&
      Number.isSafeInteger(issuedAt) && Number.isSafeInteger(expiresAt) &&
      (expiresAt as number) > (issuedAt as number) &&
      (expiresAt as number) - (issuedAt as number) <= PROOF_TTL_SECONDS &&
      typeof ownValue(input, "cookieDigest") === "string" &&
      BASE64URL_32_BYTE_PATTERN.test(
        ownValue(input, "cookieDigest") as string,
      ) && typeof ownValue(input, "authorizationFactsDigest") === "string" &&
      BASE64URL_32_BYTE_PATTERN.test(
        ownValue(input, "authorizationFactsDigest") as string,
      );
  }

  function canonicalClaims(claims: OpaqueBffProofClaims) {
    return Object.freeze({
      audience: claims.audience,
      issuedAtEpochSeconds: claims.issuedAtEpochSeconds,
      expiresAtEpochSeconds: claims.expiresAtEpochSeconds,
      cookieDigest: claims.cookieDigest,
      authorizationFactsDigest: claims.authorizationFactsDigest,
    });
  }

  return Object.freeze({
    async mintOpaqueProof(claims: OpaqueBffProofClaims) {
      try {
        if (!validateClaims(claims)) throw sanitizedFailure();
        const payloadJson = JSON.stringify(canonicalClaims(claims));
        const payload = base64Url(new TextEncoder().encode(payloadJson));
        const signed = `${encodedHeader}.${payload}`;
        const signature = new Uint8Array(
          await cryptoImplementation.subtle.sign(
            "HMAC",
            await key(),
            new TextEncoder().encode(signed),
          ),
        );
        const proof = `${signed}.${base64Url(signature)}`;
        if (proof.length > MAX_PROOF_BYTES) throw sanitizedFailure();
        return proof;
      } catch {
        throw sanitizedFailure();
      }
    },
    async verifyOpaqueProof(proof: string) {
      try {
        if (
          typeof proof !== "string" || proof.length < 1 ||
          proof.length > MAX_PROOF_BYTES ||
          !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(proof)
        ) throw sanitizedFailure();
        const parts = proof.split(".");
        if (parts.length !== 3 || parts[0] !== encodedHeader) {
          throw sanitizedFailure();
        }
        const headerJson = new TextDecoder("utf-8", { fatal: true }).decode(
          fromBase64Url(parts[0]),
        );
        if (headerJson !== PROOF_HEADER_JSON) throw sanitizedFailure();
        const payloadJson = new TextDecoder("utf-8", { fatal: true }).decode(
          fromBase64Url(parts[1]),
        );
        const claims: unknown = JSON.parse(payloadJson);
        if (!validateClaims(claims)) throw sanitizedFailure();
        const canonical = canonicalClaims(claims);
        if (JSON.stringify(canonical) !== payloadJson) throw sanitizedFailure();
        const actualSignature = fromBase64Url(parts[2]);
        const expectedSignature = new Uint8Array(
          await cryptoImplementation.subtle.sign(
            "HMAC",
            await key(),
            new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
          ),
        );
        if (actualSignature.byteLength !== expectedSignature.byteLength) {
          throw sanitizedFailure();
        }
        let difference = 0;
        for (let index = 0; index < expectedSignature.byteLength; index += 1) {
          difference |= actualSignature[index] ^ expectedSignature[index];
        }
        if (difference !== 0) throw sanitizedFailure();
        return canonical;
      } catch {
        throw sanitizedFailure();
      }
    },
  });
}

async function accessTokenDigest(
  cryptoImplementation: Crypto,
  accessToken: string,
): Promise<string> {
  if (!BASE64URL_32_BYTE_PATTERN.test(accessToken)) throw sanitizedFailure();
  const raw = fromBase64Url(accessToken);
  if (raw.byteLength !== 32) throw sanitizedFailure();
  return base64Url(
    new Uint8Array(
      await cryptoImplementation.subtle.digest("SHA-256", raw),
    ),
  );
}

function createSessionPorts(
  boundedFetch: FetchLike,
  supabaseOrigin: string,
  cryptoImplementation: Crypto,
  now: () => Date,
) {
  const serverSessionIssuer = Object.freeze({
    async issueServerSession(
      input: Readonly<{
        authenticatedUserId: string;
        specialistId: string;
        authorizationSubject: string;
        now: string;
      }>,
    ) {
      try {
        if (
          !hasExactOwnKeys(input, [
            "authenticatedUserId",
            "specialistId",
            "authorizationSubject",
            "now",
          ]) || !isUuid(ownValue(input, "authenticatedUserId")) ||
          !isUuid(ownValue(input, "specialistId")) ||
          !validAuthorizationSubject(
            ownValue(input, "authorizationSubject"),
            ownValue(input, "specialistId"),
          ) || !validRfc3339(ownValue(input, "now"))
        ) throw sanitizedFailure();
        const issuedAt = ownValue(input, "now") as string;
        const issuedAtMs = Date.parse(issuedAt);
        const expiresAt = new Date(
          issuedAtMs + SESSION_TTL_SECONDS * 1000,
        ).toISOString();
        const serverSessionId = cryptoImplementation.randomUUID();
        if (!UUID_PATTERN.test(serverSessionId)) throw sanitizedFailure();
        const tokenBytes = new Uint8Array(32);
        cryptoImplementation.getRandomValues(tokenBytes);
        const accessToken = base64Url(tokenBytes);
        const digest = await accessTokenDigest(
          cryptoImplementation,
          accessToken,
        );
        const projection = await callRpc(
          boundedFetch,
          supabaseOrigin,
          "/rest/v1/rpc/drs_server_session_issue_v1",
          {
            p_server_session_id: serverSessionId,
            p_access_token_digest: digest,
            p_authenticated_user_id: input.authenticatedUserId,
            p_specialist_id: input.specialistId,
            p_authorization_subject: input.authorizationSubject,
            p_issued_at: issuedAt,
            p_expires_at: expiresAt,
          },
        );
        if (
          !hasExactOwnKeys(projection, ["server_session_id", "expires_at"]) ||
          ownValue(projection, "server_session_id") !== serverSessionId ||
          !validRfc3339(ownValue(projection, "expires_at")) ||
          Date.parse(ownValue(projection, "expires_at") as string) !==
            Date.parse(expiresAt)
        ) throw sanitizedFailure();
        return Object.freeze({
          serverSessionId,
          accessToken,
          expiresAtEpochSeconds: Math.floor(Date.parse(expiresAt) / 1000),
        });
      } catch {
        throw sanitizedFailure();
      }
    },
  });

  const accessSessionVerifier = Object.freeze({
    async verifyAccessSession(
      input: Readonly<{
        serverSessionId: string;
        accessToken: string;
      }>,
    ) {
      try {
        if (
          !hasExactOwnKeys(input, ["serverSessionId", "accessToken"]) ||
          !isUuid(ownValue(input, "serverSessionId")) ||
          typeof ownValue(input, "accessToken") !== "string"
        ) throw sanitizedFailure();
        const serverSessionId = input.serverSessionId;
        const digest = await accessTokenDigest(
          cryptoImplementation,
          input.accessToken,
        );
        const projection = await callRpc(
          boundedFetch,
          supabaseOrigin,
          "/rest/v1/rpc/drs_server_session_verify_v1",
          {
            p_server_session_id: serverSessionId,
            p_access_token_digest: digest,
          },
        );
        if (
          !hasExactOwnKeys(projection, [
            "authenticated_user_id",
            "specialist_id",
            "authorization_subject",
            "expires_at",
          ]) || !isUuid(ownValue(projection, "authenticated_user_id")) ||
          !isUuid(ownValue(projection, "specialist_id")) ||
          !validAuthorizationSubject(
            ownValue(projection, "authorization_subject"),
            ownValue(projection, "specialist_id"),
          ) || !validRfc3339(ownValue(projection, "expires_at"))
        ) throw sanitizedFailure();
        const expiresAtMs = Date.parse(
          ownValue(projection, "expires_at") as string,
        );
        const nowMs = safeNow(now).getTime();
        if (
          expiresAtMs <= nowMs ||
          expiresAtMs > nowMs + SESSION_TTL_SECONDS * 1000
        ) throw sanitizedFailure();
        return Object.freeze({
          authenticatedUserId: ownValue(
            projection,
            "authenticated_user_id",
          ) as string,
          specialistId: ownValue(projection, "specialist_id") as string,
          authorizationSubject: ownValue(
            projection,
            "authorization_subject",
          ) as string,
          expiresAtEpochSeconds: Math.floor(expiresAtMs / 1000),
        });
      } catch {
        throw sanitizedFailure();
      }
    },
  });

  const sessionRevoker: DrsServerSessionRevoker = Object.freeze({
    async revokeServerSession(input) {
      try {
        if (
          !hasExactOwnKeys(input, ["serverSessionId", "accessToken"]) ||
          !isUuid(ownValue(input, "serverSessionId")) ||
          typeof ownValue(input, "accessToken") !== "string"
        ) throw sanitizedFailure();
        const projection = await callRpc(
          boundedFetch,
          supabaseOrigin,
          "/rest/v1/rpc/drs_server_session_revoke_v1",
          {
            p_server_session_id: input.serverSessionId,
            p_access_token_digest: await accessTokenDigest(
              cryptoImplementation,
              input.accessToken,
            ),
          },
        );
        if (
          !hasExactOwnKeys(projection, ["revoked"]) ||
          ownValue(projection, "revoked") !== true
        ) throw sanitizedFailure();
      } catch {
        throw sanitizedFailure();
      }
    },
  });

  return Object.freeze({
    serverSessionIssuer,
    accessSessionVerifier,
    sessionRevoker,
  });
}

export function createDrsSecureSessionRuntime(
  options: DrsSecureSessionRuntimeOptions = {},
): DrsSecureSessionRuntime {
  try {
    const environment = readExactEnvironment(options.env);
    if (!environment) return unavailable();
    if (BFF_PROOF_AUDIENCE !== PROOF_AUDIENCE) return unavailable();
    const supabaseOrigin = environment.SUPABASE_URL;
    if (!validSupabaseOrigin(supabaseOrigin)) return unavailable();
    if (
      !validServiceRoleKey(environment.SUPABASE_SERVICE_ROLE_KEY) ||
      !validHttpsOrigin(environment.LAIBE_DRS_APP_ORIGIN) ||
      !validSuccessUrl(
        environment.LAIBE_DRS_SESSION_SUCCESS_URL,
        environment.LAIBE_DRS_APP_ORIGIN,
      ) ||
      !validHostCookieName(environment.LAIBE_DRS_SESSION_COOKIE_NAME)
    ) return unavailable();

    const cookieKey = readKey(environment.LAIBE_DRS_SESSION_COOKIE_KEY_V1);
    const proofKey = readKey(environment.LAIBE_DRS_BFF_PROOF_KEY_V1);
    if (
      !cookieKey || !proofKey ||
      environment.LAIBE_DRS_SESSION_COOKIE_KEY_V1 ===
        environment.LAIBE_DRS_BFF_PROOF_KEY_V1
    ) return unavailable();

    const fetchImplementation = options.fetch ?? globalThis.fetch;
    const cryptoImplementation = options.crypto ?? globalThis.crypto;
    const now = options.now ?? (() => new Date());
    if (
      typeof fetchImplementation !== "function" ||
      !validCrypto(cryptoImplementation) || typeof now !== "function"
    ) return unavailable();
    safeNow(now);

    const boundedAuthorityFetch = createBoundedRpcFetch(
      supabaseOrigin,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      fetchImplementation,
    );
    const capturedEnvironment: RuntimeEnvironment = Object.freeze({
      get(name: string) {
        if (name === "SUPABASE_URL") return supabaseOrigin;
        if (name === "SUPABASE_SERVICE_ROLE_KEY") {
          return environment.SUPABASE_SERVICE_ROLE_KEY;
        }
        return undefined;
      },
    });
    const workspaceDependencies = createSupabaseDrsWorkspaceGrantDependencies({
      env: capturedEnvironment,
      fetch: boundedAuthorityFetch,
      allowedOrigins: Object.freeze([]),
    });
    if (
      workspaceDependencies.runtimeAvailable !== true ||
      typeof workspaceDependencies.resolveWorkspaceGrant !== "function"
    ) return unavailable();
    const authorizationPort = Object.freeze({
      resolveWorkspaceGrant: workspaceDependencies.resolveWorkspaceGrant,
    });
    const authorization = Object.freeze(
      createDrsSpecialistAuthorizationStrategy(authorizationPort),
    );
    const cookieEnvelope = createCookieEnvelopeCodec(
      cryptoImplementation,
      cookieKey,
    );
    const proofCodec = createProofCodec(cryptoImplementation, proofKey);
    const sessionPorts = createSessionPorts(
      boundedAuthorityFetch,
      supabaseOrigin,
      cryptoImplementation,
      now,
    );
    const verifiedSessionProducer = Object.freeze(
      createServerOwnedVerifiedSessionProducer({
        allowedCallbackOrigin: environment.LAIBE_DRS_APP_ORIGIN,
        successRedirectUrl: environment.LAIBE_DRS_SESSION_SUCCESS_URL,
        sessionCookieName: environment.LAIBE_DRS_SESSION_COOKIE_NAME,
        sameSite: "Lax",
        now,
        serverSessionIssuer: sessionPorts.serverSessionIssuer,
        cookieEnvelope,
      }),
    );
    const bootstrapDependencies: DrsSessionBootstrapDependencies = Object
      .freeze({
        allowedOrigin: environment.LAIBE_DRS_APP_ORIGIN,
        sessionCookieName: environment.LAIBE_DRS_SESSION_COOKIE_NAME,
        proofTtlSeconds: 60,
        now,
        cookieEnvelope,
        proofCodec,
        accessSessionVerifier: sessionPorts.accessSessionVerifier,
        authorization,
      });
    return Object.freeze({
      runtimeAvailable: true,
      bootstrapDependencies,
      verifiedSessionProducer,
      sessionRevoker: sessionPorts.sessionRevoker,
    });
  } catch {
    return unavailable();
  }
}
