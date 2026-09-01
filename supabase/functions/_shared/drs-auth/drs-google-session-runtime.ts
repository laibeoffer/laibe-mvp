import {
  type ClaimedIdentityLinkState,
  type ClosedState,
  type FetchLike,
  type IdentityCallbackCompletion,
  type IdentityLinkStateStore,
  type IdentityOAuthAdapter,
  type IdentityProviderTransport,
  isUuid,
  type NewIdentityLinkState,
  readOwnValue,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
  type SecretEnvelope,
  type VerifiedIdentityClaims,
} from "./contracts.ts";
import { createDrsSecureSessionRuntime } from "./drs-secure-session-runtime.ts";
import { createGoogleIdentityAdapter } from "./google-identity-adapter.ts";
import {
  createDrsSpecialistAuthorizationStrategy,
  type DrsSpecialistAuthorizationStrategy,
} from "./specialist-authorization.ts";
import { createSupabaseDrsWorkspaceGrantDependencies } from "./drs-specialist-authority.ts";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const MAX_RPC_RESPONSE_BYTES = 16_384;
const MAX_GOOGLE_RESPONSE_BYTES = 32_768;
const MAX_OUTBOUND_BODY_BYTES = 8_192;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const GOOGLE_SESSION_ENV_NAMES = Object.freeze(
  [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LAIBE_DRS_APP_ORIGIN",
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
    "LAIBE_DRS_GOOGLE_CLIENT_ID",
    "LAIBE_DRS_GOOGLE_CLIENT_SECRET",
    "LAIBE_DRS_GOOGLE_REDIRECT_URL",
    "LAIBE_DRS_IDENTITY_STATE_KEY_V1",
  ] as const,
);

type EnvironmentName = (typeof GOOGLE_SESSION_ENV_NAMES)[number];
type ExactEnvironment = Readonly<Record<EnvironmentName, string>>;

export type DrsGoogleSessionRuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  crypto?: Crypto;
  now?: () => Date;
}>;

export type DrsGoogleSessionRuntime = Readonly<{
  runtimeAvailable: boolean;
  googleAuthStartDependencies:
    | Readonly<{ allowedOrigin: string; adapter: IdentityOAuthAdapter }>
    | undefined;
  googleAuthCallbackDependencies:
    | Readonly<{ allowedOrigin: string; adapter: IdentityOAuthAdapter }>
    | undefined;
  sessionGrantDependencies:
    | Readonly<{
      allowedOrigins: readonly string[];
      runtimeAvailable: true;
      resolveAuthenticatedIdentity(
        request: Request,
      ): Promise<{ authenticatedUserId: string } | null>;
      authorization: DrsSpecialistAuthorizationStrategy;
    }>
    | undefined;
}>;

const UNAVAILABLE: DrsGoogleSessionRuntime = Object.freeze({
  runtimeAvailable: false,
  googleAuthStartDependencies: undefined,
  googleAuthCallbackDependencies: undefined,
  sessionGrantDependencies: undefined,
});

function unavailable(): DrsGoogleSessionRuntime {
  return UNAVAILABLE;
}

function exactEnvironment(env?: RuntimeEnvironment): ExactEnvironment | null {
  const values = Object.create(null) as Record<EnvironmentName, string>;
  for (const name of GOOGLE_SESSION_ENV_NAMES) {
    const value = env ? env.get(name) : readRuntimeEnvironment(undefined, name);
    if (
      typeof value !== "string" || value.length === 0 || value.length > 4096 ||
      value.trim() !== value || Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127;
      })
    ) return null;
    values[name] = value;
  }
  return Object.freeze(values);
}

function httpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function exactHttpsUrl(value: string, origin: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.origin !== origin || url.username ||
      url.password || url.search || url.hash || url.pathname === "/"
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

function validServiceKey(value: string): boolean {
  return value.length >= 32 && value.length <= 4096 && !/\s/u.test(value);
}

function validOAuthCredential(value: string): boolean {
  return value.length >= 8 && value.length <= 2048 &&
    Array.from(value).every((character) => {
      const code = character.charCodeAt(0);
      return code >= 33 && code !== 127;
    });
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(
      normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
    );
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function exactOwnKeys(
  input: unknown,
  keys: readonly string[],
): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const actual = Object.keys(input).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

async function boundedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declared = response.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/u.test(declared) || Number(declared) > maxBytes)
  ) {
    throw new Error("RESPONSE_TOO_LARGE");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(bytes);
}

function exactNullableUuid(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isUuid(value) ? value : undefined;
}

function createSecretEnvelope(
  cryptoImplementation: Crypto,
  keyBytes: Uint8Array,
): SecretEnvelope {
  let keyPromise: Promise<CryptoKey> | null = null;
  const rawKey = new Uint8Array(keyBytes).buffer;
  const key = () =>
    keyPromise ??= cryptoImplementation.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  const aad = encoder.encode("laibe:drs-google-oauth-pkce:v1");
  return Object.freeze({
    async encrypt(plaintext: string) {
      if (plaintext.length < 32 || plaintext.length > 256) {
        throw new Error("ENVELOPE_INPUT_INVALID");
      }
      const iv = cryptoImplementation.getRandomValues(new Uint8Array(12));
      const ciphertext = await cryptoImplementation.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
        await key(),
        encoder.encode(plaintext),
      );
      return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(ciphertext))}`;
    },
    async decrypt(ciphertext: string) {
      const parts = ciphertext.split(".");
      if (parts.length !== 3 || parts[0] !== "v1") {
        throw new Error("ENVELOPE_INVALID");
      }
      const iv = decodeBase64Url(parts[1]);
      const body = decodeBase64Url(parts[2]);
      if (
        !iv || iv.byteLength !== 12 || !body || body.byteLength < 17 ||
        body.byteLength > 1024
      ) {
        throw new Error("ENVELOPE_INVALID");
      }
      const plaintext = await cryptoImplementation.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
        await key(),
        body,
      );
      const value = decoder.decode(plaintext);
      if (value.length < 32 || value.length > 256) {
        throw new Error("ENVELOPE_INVALID");
      }
      return value;
    },
  });
}

type RpcName =
  | "drs_identity_link_state_create_v1"
  | "drs_identity_link_state_claim_v1"
  | "drs_identity_link_state_fail_v1"
  | "drs_identity_callback_prepare_v1"
  | "drs_identity_callback_finalize_v1";

function createIdentityStore(
  supabaseOrigin: string,
  serviceRoleKey: string,
  fetchImplementation: FetchLike,
): IdentityLinkStateStore {
  async function rpc(
    name: RpcName,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const serialized = JSON.stringify(body);
    if (encoder.encode(serialized).byteLength > MAX_OUTBOUND_BODY_BYTES) {
      throw new Error("RPC_INPUT_TOO_LARGE");
    }
    const response = await fetchImplementation(
      `${supabaseOrigin}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          "authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: serialized,
      },
    );
    const text = await boundedText(response, MAX_RPC_RESPONSE_BYTES);
    if (!response.ok) throw new Error("RPC_UNAVAILABLE");
    if (text.trim() === "" || text.trim() === "null") return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("RPC_RESPONSE_INVALID");
    }
  }

  function oneRow(payload: unknown): Record<string, unknown> {
    const candidate = Array.isArray(payload) ? payload : [payload];
    if (
      candidate.length !== 1 || candidate[0] === null ||
      typeof candidate[0] !== "object" || Array.isArray(candidate[0])
    ) {
      throw new Error("RPC_RESPONSE_INVALID");
    }
    return candidate[0] as Record<string, unknown>;
  }

  return Object.freeze({
    async createLinkState(input: NewIdentityLinkState) {
      await rpc("drs_identity_link_state_create_v1", {
        p_state_digest: input.stateDigest,
        p_nonce_digest: input.nonceDigest,
        p_pkce_verifier_ciphertext: input.pkceVerifierCiphertext,
        p_authenticated_user_id: input.authenticatedUserId,
        p_specialist_id: input.specialistId,
        p_authorization_subject: input.authorizationSubject,
        p_provider: input.provider,
        p_intended_action: input.intendedAction,
        p_redirect_uri: input.redirectUri,
        p_expires_at: input.expiresAt.toISOString(),
        p_now: input.createdAt.toISOString(),
      });
    },
    async claimLinkState(input: {
      stateDigest: string;
      provider: "google" | "line";
      redirectUri: string;
      now: Date;
    }) {
      const row = oneRow(
        await rpc("drs_identity_link_state_claim_v1", {
          p_state_digest: input.stateDigest,
          p_provider: input.provider,
          p_redirect_uri: input.redirectUri,
          p_now: input.now.toISOString(),
        }),
      );
      const authenticatedUserId = exactNullableUuid(
        readOwnValue(row, "authenticated_user_id"),
      );
      const specialistId = exactNullableUuid(
        readOwnValue(row, "specialist_id"),
      );
      const claimToken = readOwnValue(row, "claim_token");
      const nonceDigest = readOwnValue(row, "nonce_digest");
      const verifier = readOwnValue(row, "pkce_verifier_ciphertext");
      const authorizationSubject = readOwnValue(row, "authorization_subject");
      const intendedAction = readOwnValue(row, "intended_action");
      if (
        authenticatedUserId === undefined || specialistId === undefined ||
        !isUuid(claimToken) ||
        typeof nonceDigest !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/u.test(nonceDigest) ||
        typeof verifier !== "string" || verifier.length < 20 ||
        verifier.length > 2048 ||
        !(authorizationSubject === null ||
          (typeof authorizationSubject === "string" &&
            authorizationSubject.length <= 512)) ||
        !(intendedAction === "login" || intendedAction === "bind")
      ) throw new Error("RPC_RESPONSE_INVALID");
      if (
        intendedAction === "login"
          ? authenticatedUserId !== null || specialistId !== null ||
            authorizationSubject !== null
          : !authenticatedUserId || !specialistId ||
            authorizationSubject !== `drs-specialist:${specialistId}`
      ) throw new Error("RPC_RESPONSE_INVALID");
      const claimedAt = input.now;
      const createdAt = input.now;
      const expiresAt = new Date(input.now.getTime() + 15 * 60 * 1000);
      const claimed: ClaimedIdentityLinkState = {
        stateDigest: input.stateDigest,
        nonceDigest,
        pkceVerifierCiphertext: verifier,
        authenticatedUserId,
        specialistId,
        authorizationSubject,
        provider: input.provider,
        intendedAction,
        redirectUri: input.redirectUri,
        expiresAt,
        createdAt,
        claimToken,
        claimedAt,
        consumedAt: null,
        failedAt: null,
      };
      return claimed;
    },
    async failIdentityCallback(input: {
      claimToken: string;
      now: Date;
      failureState: ClosedState;
    }) {
      await rpc("drs_identity_link_state_fail_v1", {
        p_claim_token: input.claimToken,
        p_now: input.now.toISOString(),
        p_failure_state: input.failureState,
      });
    },
    async prepareIdentityCallback(input: {
      claimToken: string;
      provider: "google" | "line";
      subject: string;
      verifiedEmail: string | null;
      now: Date;
    }) {
      const row = oneRow(
        await rpc("drs_identity_callback_prepare_v1", {
          p_claim_token: input.claimToken,
          p_provider: input.provider,
          p_provider_subject: input.subject,
          p_verified_email: input.verifiedEmail,
          p_now: input.now.toISOString(),
        }),
      );
      const authenticatedUserId = readOwnValue(row, "authenticated_user_id");
      const specialistId = readOwnValue(row, "specialist_id");
      const authorizationSubject = readOwnValue(row, "authorization_subject");
      const intendedAction = readOwnValue(row, "intended_action");
      if (
        !isUuid(authenticatedUserId) || !isUuid(specialistId) ||
        authorizationSubject !== `drs-specialist:${specialistId}` ||
        !(intendedAction === "login" || intendedAction === "bind")
      ) throw new Error("RPC_RESPONSE_INVALID");
      const completion: IdentityCallbackCompletion = {
        authenticatedUserId,
        specialistId,
        authorizationSubject,
        intendedAction,
      };
      return completion;
    },
    async finalizeIdentityCallback(input: {
      claimToken: string;
      provider: "google" | "line";
      subject: string;
      verifiedEmail: string | null;
      expectedAuthenticatedUserId: string;
      expectedSpecialistId: string;
      expectedAuthorizationSubject: string;
      expectedIntendedAction: "login" | "bind";
      now: Date;
      correlationId: string;
    }) {
      await rpc("drs_identity_callback_finalize_v1", {
        p_claim_token: input.claimToken,
        p_provider: input.provider,
        p_provider_subject: input.subject,
        p_verified_email: input.verifiedEmail,
        p_expected_authenticated_user_id: input.expectedAuthenticatedUserId,
        p_expected_specialist_id: input.expectedSpecialistId,
        p_expected_authorization_subject: input.expectedAuthorizationSubject,
        p_expected_intended_action: input.expectedIntendedAction,
        p_now: input.now.toISOString(),
        p_correlation_id: input.correlationId,
      });
    },
  });
}

function jsonObject(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
    ) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("PROVIDER_RESPONSE_INVALID");
  }
}

function createGoogleProvider(
  clientId: string,
  clientSecret: string,
  fetchImplementation: FetchLike,
  cryptoImplementation: Crypto,
): IdentityProviderTransport {
  return Object.freeze({
    createAuthorizationUrl(input: {
      redirectUri: string;
      state: string;
      nonce: string;
      codeChallenge: string;
      codeChallengeMethod: "S256";
    }) {
      const url = new URL(GOOGLE_AUTHORIZATION_URL);
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: input.redirectUri,
        response_type: "code",
        scope: "openid email",
        state: input.state,
        nonce: input.nonce,
        code_challenge: input.codeChallenge,
        code_challenge_method: "S256",
      }).toString();
      return url.href;
    },
    async exchangeCode(input: {
      code: string;
      redirectUri: string;
      pkceVerifier: string;
    }) {
      const body = new URLSearchParams({
        code: input.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: input.redirectUri,
        code_verifier: input.pkceVerifier,
        grant_type: "authorization_code",
      }).toString();
      if (encoder.encode(body).byteLength > MAX_OUTBOUND_BODY_BYTES) {
        throw new Error("PROVIDER_INPUT_INVALID");
      }
      const response = await fetchImplementation(GOOGLE_TOKEN_URL, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "accept": "application/json",
        },
        body,
      });
      const payload = jsonObject(
        await boundedText(response, MAX_GOOGLE_RESPONSE_BYTES),
      );
      const idToken = readOwnValue(payload, "id_token");
      if (
        !response.ok || typeof idToken !== "string" || idToken.length < 80 ||
        idToken.length > 16_384
      ) {
        throw new Error("TOKEN_EXCHANGE_FAILED");
      }
      return { idToken };
    },
    async verifyIdToken(
      input: { idToken: string },
    ): Promise<VerifiedIdentityClaims> {
      const segments = input.idToken.split(".");
      if (
        segments.length !== 3 ||
        segments.some((segment) => segment.length === 0)
      ) throw new Error("TOKEN_INVALID");
      const headerBytes = decodeBase64Url(segments[0]);
      const payloadBytes = decodeBase64Url(segments[1]);
      const signature = decodeBase64Url(segments[2]);
      if (
        !headerBytes || !payloadBytes || !signature ||
        signature.byteLength < 128 || signature.byteLength > 1024
      ) {
        throw new Error("TOKEN_INVALID");
      }
      const header = jsonObject(decoder.decode(headerBytes));
      if (
        !exactOwnKeys(header, ["alg", "kid", "typ"]) ||
        readOwnValue(header, "alg") !== "RS256" ||
        readOwnValue(header, "typ") !== "JWT"
      ) {
        throw new Error("TOKEN_INVALID");
      }
      const kid = readOwnValue(header, "kid");
      if (typeof kid !== "string" || kid.length === 0 || kid.length > 256) {
        throw new Error("TOKEN_INVALID");
      }
      const jwksResponse = await fetchImplementation(GOOGLE_JWKS_URL, {
        method: "GET",
        redirect: "error",
        headers: { "accept": "application/json" },
      });
      const jwks = jsonObject(
        await boundedText(jwksResponse, MAX_GOOGLE_RESPONSE_BYTES),
      );
      const keys = readOwnValue(jwks, "keys");
      if (
        !jwksResponse.ok || !Array.isArray(keys) || keys.length === 0 ||
        keys.length > 10
      ) throw new Error("JWKS_INVALID");
      const matches = keys.filter((candidate) => {
        return candidate !== null && typeof candidate === "object" &&
          !Array.isArray(candidate) &&
          readOwnValue(candidate, "kid") === kid &&
          readOwnValue(candidate, "kty") === "RSA" &&
          readOwnValue(candidate, "alg") === "RS256" &&
          readOwnValue(candidate, "use") === "sig";
      });
      if (matches.length !== 1) throw new Error("JWKS_INVALID");
      const publicKey = await cryptoImplementation.subtle.importKey(
        "jwk",
        matches[0] as JsonWebKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const signatureVerified = await cryptoImplementation.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        signature,
        encoder.encode(`${segments[0]}.${segments[1]}`),
      );
      if (!signatureVerified) throw new Error("TOKEN_INVALID");
      const claims = jsonObject(decoder.decode(payloadBytes));
      const subject = readOwnValue(claims, "sub");
      const issuer = readOwnValue(claims, "iss");
      const audience = readOwnValue(claims, "aud");
      const expiresAt = readOwnValue(claims, "exp");
      const nonce = readOwnValue(claims, "nonce");
      const emailVerified = readOwnValue(claims, "email_verified");
      const email = readOwnValue(claims, "email");
      if (
        typeof subject !== "string" || subject.length === 0 ||
        subject.length > 255 ||
        issuer !== "https://accounts.google.com" || audience !== clientId ||
        typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt) ||
        typeof nonce !== "string" || nonce.length < 16 || nonce.length > 512 ||
        emailVerified !== true || typeof email !== "string" ||
        email.length === 0 || email.length > 320
      ) throw new Error("TOKEN_INVALID");
      return {
        subject,
        issuer,
        audience,
        expiresAtEpochSeconds: expiresAt,
        nonce,
        signatureVerified: true,
        emailVerified: true,
        verifiedEmail: email,
      };
    },
  });
}

export function createDrsGoogleSessionRuntime(
  options: DrsGoogleSessionRuntimeOptions = {},
): DrsGoogleSessionRuntime {
  try {
    const environment = exactEnvironment(options.env);
    if (!environment) return unavailable();
    const supabaseOrigin = httpsOrigin(environment.SUPABASE_URL);
    const appOrigin = httpsOrigin(environment.LAIBE_DRS_APP_ORIGIN);
    if (!supabaseOrigin || !appOrigin) return unavailable();
    const redirectUri = exactHttpsUrl(
      environment.LAIBE_DRS_GOOGLE_REDIRECT_URL,
      appOrigin,
    );
    const successUrl = exactHttpsUrl(
      environment.LAIBE_DRS_SESSION_SUCCESS_URL,
      appOrigin,
    );
    if (
      !redirectUri || !successUrl ||
      !validServiceKey(environment.SUPABASE_SERVICE_ROLE_KEY) ||
      !validOAuthCredential(environment.LAIBE_DRS_GOOGLE_CLIENT_ID) ||
      !validOAuthCredential(environment.LAIBE_DRS_GOOGLE_CLIENT_SECRET) ||
      !/^__Host-[A-Za-z0-9._~-]+$/u.test(
        environment.LAIBE_DRS_SESSION_COOKIE_NAME,
      )
    ) return unavailable();
    const stateKey = decodeBase64Url(
      environment.LAIBE_DRS_IDENTITY_STATE_KEY_V1,
    );
    if (!stateKey || stateKey.byteLength !== 32) return unavailable();
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    const cryptoImplementation = options.crypto ?? globalThis.crypto;
    const now = options.now ?? (() => new Date());
    if (
      typeof fetchImplementation !== "function" ||
      !cryptoImplementation?.subtle || typeof now !== "function"
    ) {
      return unavailable();
    }
    const instant = now();
    if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
      return unavailable();
    }

    const secureRuntime = createDrsSecureSessionRuntime({
      env: options.env,
      fetch: fetchImplementation,
      crypto: cryptoImplementation,
      now,
    });
    if (
      !secureRuntime.runtimeAvailable || !secureRuntime.verifiedSessionProducer
    ) return unavailable();

    const adapter = createGoogleIdentityAdapter({
      allowedOrigin: appOrigin,
      redirectUri,
      sessionSuccessRedirectUrl: successUrl,
      sessionCookieName: environment.LAIBE_DRS_SESSION_COOKIE_NAME,
      clientId: environment.LAIBE_DRS_GOOGLE_CLIENT_ID,
      now,
      stateTtlMs: 10 * 60 * 1000,
      envelope: createSecretEnvelope(cryptoImplementation, stateKey),
      store: createIdentityStore(
        supabaseOrigin,
        environment.SUPABASE_SERVICE_ROLE_KEY,
        fetchImplementation,
      ),
      provider: createGoogleProvider(
        environment.LAIBE_DRS_GOOGLE_CLIENT_ID,
        environment.LAIBE_DRS_GOOGLE_CLIENT_SECRET,
        fetchImplementation,
        cryptoImplementation,
      ),
      sessionProducer: secureRuntime.verifiedSessionProducer,
      resolveStartContext: () =>
        Promise.resolve({
          intendedAction: "login",
          authenticatedUserId: null,
          specialistId: null,
          authorizationSubject: null,
        }),
    });

    const capturedEnvironment: RuntimeEnvironment = Object.freeze({
      get(name: string) {
        if (name === "SUPABASE_URL") return supabaseOrigin;
        if (name === "SUPABASE_SERVICE_ROLE_KEY") {
          return environment.SUPABASE_SERVICE_ROLE_KEY;
        }
        return undefined;
      },
    });
    const workspace = createSupabaseDrsWorkspaceGrantDependencies({
      env: capturedEnvironment,
      fetch: fetchImplementation,
      allowedOrigins: Object.freeze([appOrigin]),
    });
    if (!workspace.runtimeAvailable) return unavailable();
    const authorization = createDrsSpecialistAuthorizationStrategy({
      resolveWorkspaceGrant: workspace.resolveWorkspaceGrant,
    });

    const shared = Object.freeze({ allowedOrigin: appOrigin, adapter });
    return Object.freeze({
      runtimeAvailable: true,
      googleAuthStartDependencies: shared,
      googleAuthCallbackDependencies: shared,
      sessionGrantDependencies: Object.freeze({
        allowedOrigins: Object.freeze([appOrigin]),
        runtimeAvailable: true as const,
        async resolveAuthenticatedIdentity(request: Request) {
          const identity = await workspace.resolveAuthenticatedIdentity(
            request,
          );
          return identity ? { authenticatedUserId: identity.userId } : null;
        },
        authorization,
      }),
    });
  } catch {
    return unavailable();
  }
}
