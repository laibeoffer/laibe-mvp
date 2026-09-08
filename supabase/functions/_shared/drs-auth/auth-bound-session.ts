import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import {
  DrsIdentityError,
  type FetchLike,
  isUuid,
  readDenialState,
} from "./contracts.ts";
import type { PasswordVerifiedSessionProducer } from "./drs-password-auth-session.ts";
import type {
  AuthBoundCookieEnvelope,
  DrsSessionBootstrapDependencies,
  SealedSessionCookieEnvelope,
} from "./drs-session-bootstrap-bff.ts";

const DOMAIN = "laibe.drs-server-session-cookie.v2";
const DIGEST = /^[A-Za-z0-9_-]{43}$/u;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const encoder = new TextEncoder();
const keys = [
  "schemaVersion",
  "authenticatedUserId",
  "specialistId",
  "authorizationSubject",
  "serverSessionId",
  "accessToken",
  "expiresAtEpochSeconds",
  "authSessionId",
  "supabaseAccessToken",
  "authExpiresAtEpochSeconds",
] as const;

export function authFailure(): never {
  throw new DrsIdentityError("AUTH_REQUIRED", 401);
}
export function unavailable(): never {
  throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
}
export function exactObject(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((key) => Object.hasOwn(value, key));
}
export function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll(
    "/",
    "_",
  ).replaceAll("=", "");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) authFailure();
  const bytes = Uint8Array.from(
    atob(
      value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
        Math.ceil(value.length / 4) * 4,
        "=",
      ),
    ),
    (c) => c.charCodeAt(0),
  );
  if (base64url(bytes) !== value) authFailure();
  return bytes;
}
export async function tokenDigest(
  token: string,
  implementation: Crypto = crypto,
): Promise<string> {
  return base64url(
    new Uint8Array(
      await implementation.subtle.digest("SHA-256", encoder.encode(token)),
    ),
  );
}
function canonical(input: AuthBoundCookieEnvelope): AuthBoundCookieEnvelope {
  return Object.fromEntries(
    keys.map((key) => [key, input[key]]),
  ) as AuthBoundCookieEnvelope;
}
export function validAuthBoundEnvelope(
  value: unknown,
): value is AuthBoundCookieEnvelope {
  if (!exactObject(value, keys)) return false;
  return value.schemaVersion === DOMAIN && isUuid(value.authenticatedUserId) &&
    isUuid(value.specialistId) && isUuid(value.serverSessionId) &&
    isUuid(value.authSessionId) &&
    value.authorizationSubject === `drs-specialist:${value.specialistId}` &&
    typeof value.accessToken === "string" && DIGEST.test(value.accessToken) &&
    typeof value.supabaseAccessToken === "string" &&
    value.supabaseAccessToken.length <= 3000 &&
    JWT.test(value.supabaseAccessToken) &&
    Number.isSafeInteger(value.expiresAtEpochSeconds) &&
    Number.isSafeInteger(value.authExpiresAtEpochSeconds) &&
    (value.expiresAtEpochSeconds as number) > 0 &&
    (value.expiresAtEpochSeconds as number) <=
      (value.authExpiresAtEpochSeconds as number);
}

export function createAuthBoundCookieCodec(
  rawKey: Uint8Array<ArrayBuffer>,
  implementation: Crypto = crypto,
) {
  if (rawKey.length !== 32) unavailable();
  const imported = implementation.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  const aad = encoder.encode(DOMAIN);
  return Object.freeze({
    async sealCookieEnvelope(
      payload: SealedSessionCookieEnvelope,
    ): Promise<string> {
      if (!validAuthBoundEnvelope(payload)) authFailure();
      const iv = implementation.getRandomValues(new Uint8Array(12));
      const encrypted = await implementation.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
        await imported,
        encoder.encode(JSON.stringify(canonical(payload))),
      );
      const value = `v2.${base64url(iv)}.${
        base64url(new Uint8Array(encrypted))
      }`;
      if (value.length > 3900) unavailable();
      return value;
    },
    async openCookieEnvelope(value: string): Promise<AuthBoundCookieEnvelope> {
      try {
        if (typeof value !== "string" || value.length > 3900) authFailure();
        const parts = value.split(".");
        if (parts.length !== 3 || parts[0] !== "v2") authFailure();
        const iv = decode(parts[1]);
        if (iv.length !== 12) authFailure();
        const plaintext = await implementation.subtle.decrypt(
          { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
          await imported,
          decode(parts[2]),
        );
        const json = new TextDecoder("utf-8", { fatal: true }).decode(
          plaintext,
        );
        const result: unknown = JSON.parse(json);
        if (
          !validAuthBoundEnvelope(result) ||
          JSON.stringify(canonical(result)) !== json
        ) authFailure();
        return Object.freeze(result);
      } catch {
        authFailure();
      }
    },
  });
}

export type AuthBoundRuntimeOptions = Readonly<{
  supabaseUrl: string;
  serviceRoleKey: string;
  allowedOrigin: string;
  successRedirectUrl: string;
  sessionCookieName: string;
  cookieKey: Uint8Array<ArrayBuffer>;
  now(): Date;
  fetch: FetchLike;
  crypto: Crypto;
}>;
const RPC_NAMES = new Set([
  "drs_auth_bound_server_session_issue_v1",
  "drs_auth_bound_server_session_verify_v1",
  "drs_auth_bound_session_logout_v1",
]);

export async function readBoundedRpcJson(
  response: Response,
): Promise<Record<string, unknown>> {
  if (
    !response.ok ||
    !/^application\/json(?:\s*;|$)/iu.test(
      response.headers.get("content-type") ?? "",
    )
  ) {
    await response.body?.cancel();
    unavailable();
  }
  const reader = response.body?.getReader();
  if (!reader) unavailable();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        unavailable();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const result: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    unavailable();
  }
  return result as Record<string, unknown>;
}

export function createAuthBoundSession(options: AuthBoundRuntimeOptions) {
  const codec = createAuthBoundCookieCodec(options.cookieKey, options.crypto);
  async function rpc(
    name: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!RPC_NAMES.has(name)) unavailable();
    try {
      const response = await options.fetch(
        `${options.supabaseUrl}/rest/v1/rpc/${name}`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
          headers: {
            apikey: options.serviceRoleKey,
            authorization: `Bearer ${options.serviceRoleKey}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const result = await readBoundedRpcJson(response);
      if (
        exactObject(result, ["authorized", "state"]) &&
        result.authorized === false
      ) {
        const state = readDenialState(result);
        throw new DrsIdentityError(
          state,
          state === "AUTH_REQUIRED"
            ? 401
            : state === "CONTEXT_UNAVAILABLE"
            ? 503
            : 403,
        );
      }
      return result as Record<string, unknown>;
    } catch (error) {
      if (error instanceof DrsIdentityError) throw error;
      unavailable();
    }
  }
  async function verifyEnvelopeAuth(
    envelope: AuthBoundCookieEnvelope,
  ): Promise<void> {
    const result = await verifyAuthSession(
      new Request(options.supabaseUrl, {
        headers: { authorization: `Bearer ${envelope.supabaseAccessToken}` },
      }),
      {
        supabaseUrl: options.supabaseUrl,
        serviceRoleKey: options.serviceRoleKey,
        fetch: options.fetch,
        now: () => options.now().getTime(),
      },
    );
    if (result.state === "unavailable") unavailable();
    if (
      result.state !== "verified" ||
      result.session.userId !== envelope.authenticatedUserId ||
      result.session.authSessionId !== envelope.authSessionId ||
      result.session.expiresAtEpochSeconds !==
        envelope.authExpiresAtEpochSeconds
    ) authFailure();
  }
  async function proofBody(envelope: AuthBoundCookieEnvelope) {
    return {
      p_server_session_id: envelope.serverSessionId,
      p_access_token_digest: await tokenDigest(
        envelope.accessToken,
        options.crypto,
      ),
      p_authenticated_user_id: envelope.authenticatedUserId,
      p_auth_session_id: envelope.authSessionId,
      p_auth_token_digest: await tokenDigest(
        envelope.supabaseAccessToken,
        options.crypto,
      ),
    };
  }
  const passwordSessionProducer: PasswordVerifiedSessionProducer = Object
    .freeze({
      async createVerifiedSession(
        input: Parameters<
          PasswordVerifiedSessionProducer["createVerifiedSession"]
        >[0],
      ) {
        if (
          input.callbackOrigin !== options.allowedOrigin ||
          input.successRedirectUrl !== options.successRedirectUrl ||
          input.sessionCookieName !== options.sessionCookieName
        ) unavailable();
        const now = Math.floor(options.now().getTime() / 1000);
        const expires = Math.min(now + 900, input.authExpiresAtEpochSeconds);
        if (!Number.isSafeInteger(now) || expires <= now) authFailure();
        const envelope: AuthBoundCookieEnvelope = Object.freeze({
          schemaVersion: DOMAIN,
          authenticatedUserId: input.authenticatedUserId,
          specialistId: input.specialistId,
          authorizationSubject: input.authorizationSubject,
          serverSessionId: options.crypto.randomUUID(),
          accessToken: base64url(
            options.crypto.getRandomValues(new Uint8Array(32)),
          ),
          expiresAtEpochSeconds: expires,
          authSessionId: input.authSessionId,
          supabaseAccessToken: input.supabaseAccessToken,
          authExpiresAtEpochSeconds: input.authExpiresAtEpochSeconds,
        });
        if (input.supabaseAccessToken.length > 3000) unavailable();
        if (!validAuthBoundEnvelope(envelope)) authFailure();
        await verifyEnvelopeAuth(envelope);
        const sealed = await codec.sealCookieEnvelope(envelope);
        const cookiePrefix =
          `${options.sessionCookieName}=${sealed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=`;
        if ((cookiePrefix + (expires - now)).length > 4096) unavailable();
        const result = await rpc("drs_auth_bound_server_session_issue_v1", {
          ...await proofBody(envelope),
          p_specialist_id: envelope.specialistId,
          p_authorization_subject: envelope.authorizationSubject,
          p_issued_at: new Date(now * 1000).toISOString(),
          p_expires_at: new Date(expires * 1000).toISOString(),
          p_auth_expires_at: new Date(envelope.authExpiresAtEpochSeconds * 1000)
            .toISOString(),
        });
        if (
          !exactObject(result, ["server_session_id", "expires_at"]) ||
          result.server_session_id !== envelope.serverSessionId ||
          Date.parse(String(result.expires_at)) !== expires * 1000
        ) unavailable();
        const responseNow = Math.floor(options.now().getTime() / 1000);
        const remaining = Math.min(
          expires - responseNow,
          envelope.authExpiresAtEpochSeconds - responseNow,
          900,
        );
        if (!Number.isSafeInteger(responseNow) || remaining <= 0) authFailure();
        return {
          response: new Response(null, {
            status: 303,
            headers: {
              location: options.successRedirectUrl,
              "set-cookie": cookiePrefix + remaining,
              "x-laibe-session-state": "SESSION_ESTABLISHED",
              "cache-control": "no-store",
            },
          }),
        };
      },
    });
  const accessSessionVerifier:
    DrsSessionBootstrapDependencies["accessSessionVerifier"] = {
      async verifyAccessSession(input) {
        const envelope = input.authBoundEnvelope;
        if (
          !validAuthBoundEnvelope(envelope) ||
          envelope.serverSessionId !== input.serverSessionId ||
          envelope.accessToken !== input.accessToken ||
          envelope.expiresAtEpochSeconds <=
            Math.floor(options.now().getTime() / 1000)
        ) authFailure();
        await verifyEnvelopeAuth(envelope);
        const result = await rpc(
          "drs_auth_bound_server_session_verify_v1",
          await proofBody(envelope),
        );
        if (
          !exactObject(result, [
            "authenticated_user_id",
            "auth_session_id",
            "specialist_id",
            "authorization_subject",
            "expires_at",
            "selected_case_id",
            "case_status",
            "access_mode",
          ])
        ) unavailable();
        return Object.freeze({
          authenticatedUserId: result.authenticated_user_id,
          authSessionId: result.auth_session_id,
          specialistId: result.specialist_id,
          authorizationSubject: result.authorization_subject,
          expiresAtEpochSeconds: Date.parse(String(result.expires_at)) / 1000,
          selectedCaseId: result.selected_case_id,
          caseStatus: result.case_status,
          accessMode: result.access_mode,
        });
      },
    };
  return Object.freeze({
    options,
    codec,
    rpc,
    proofBody,
    verifyEnvelopeAuth,
    passwordSessionProducer,
    accessSessionVerifier,
  });
}
export type AuthBoundSession = ReturnType<typeof createAuthBoundSession>;
