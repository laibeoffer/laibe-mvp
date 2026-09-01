import {
  DRS_THREE_ROLE_SESSION_CONTEXT_KEYS,
  type DrsThreeRoleSessionBootstrapDependencies,
  type SessionContext,
  type TechnicalSealedSessionCookieEnvelope,
} from "../_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  createDrsThreeRoleSecureSessionRuntime,
  type DrsThreeRoleSecureSessionRuntime,
} from "../_shared/drs-auth/drs-secure-session-runtime.ts";
import {
  assertTransitionCatalogIntegrity,
  type DrsCaseCommandRequest,
  FORBIDDEN_CALLER_AUTHORITY_KEYS,
  parseDrsCaseCommandRequest,
} from "../_shared/drs-case-command/contracts.ts";

export const VERIFY_JWT_REQUIRED = false;
const COMMAND_PATH = "/drs-case-command";
const MAX_BODY_BYTES = 32_768;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

type EnvironmentReader = Readonly<{ get(name: string): string | undefined }>;

type EndpointOptions = Readonly<{
  runtime?: DrsThreeRoleSecureSessionRuntime;
  env?: EnvironmentReader;
  fetch?: typeof globalThis.fetch;
}>;

function defaultEnvironment(): EnvironmentReader | undefined {
  try {
    return Object.freeze({ get: (name: string) => Deno.env.get(name) });
  } catch {
    return undefined;
  }
}

function jsonResponse(
  body: Readonly<Record<string, unknown>>,
  status: number,
  allowedOrigin?: string,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  });
  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin, Cookie");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function ownValue(record: unknown, key: string): unknown {
  if (record === null || typeof record !== "object") return undefined;
  return Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Record<string, unknown>)[key]
    : undefined;
}

function hasExactOwnKeys(value: unknown, expected: readonly string[]): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).sort().join("\n") ===
    [...expected].sort().join("\n");
}

function parseCookie(request: Request, cookieName: string): string {
  const raw = request.headers.get("cookie") ?? "";
  const matches = raw.split(";").map((part) => part.trim()).filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      return separator > 0
        ? [part.slice(0, separator), part.slice(separator + 1)] as const
        : ["", ""] as const;
    }).filter(([name]) => name === cookieName);
  if (matches.length !== 1 || matches[0][1].length === 0) {
    throw new Error("AUTH_REQUIRED");
  }
  return matches[0][1];
}

function validEnvelope(
  value: unknown,
): value is TechnicalSealedSessionCookieEnvelope {
  return hasExactOwnKeys(value, [
    "schemaVersion",
    "userId",
    "authSessionId",
    "serverSessionId",
    "accessToken",
    "expiresAtEpochSeconds",
  ]) &&
    ownValue(value, "schemaVersion") ===
      "drs-three-role-technical-session-v1" &&
    typeof ownValue(value, "userId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "userId") as string) &&
    typeof ownValue(value, "authSessionId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "authSessionId") as string) &&
    typeof ownValue(value, "serverSessionId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "serverSessionId") as string) &&
    typeof ownValue(value, "accessToken") === "string" &&
    TOKEN_PATTERN.test(ownValue(value, "accessToken") as string) &&
    Number.isSafeInteger(ownValue(value, "expiresAtEpochSeconds")) &&
    (ownValue(value, "expiresAtEpochSeconds") as number) > Date.now() / 1000;
}

function validContext(value: unknown): value is SessionContext {
  if (!hasExactOwnKeys(value, DRS_THREE_ROLE_SESSION_CONTEXT_KEYS)) {
    return false;
  }
  return typeof ownValue(value, "userId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "userId") as string) &&
    typeof ownValue(value, "sessionId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "sessionId") as string) &&
    typeof ownValue(value, "caseId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "caseId") as string) &&
    typeof ownValue(value, "membershipId") === "string" &&
    UUID_PATTERN.test(ownValue(value, "membershipId") as string) &&
    ["owner", "vendor", "drs"].includes(String(ownValue(value, "role"))) &&
    Number.isSafeInteger(ownValue(value, "authorityVersion")) &&
    (ownValue(value, "authorityVersion") as number) > 0 &&
    ["owner", "vendor", "drs"].includes(String(ownValue(value, "nextActor")));
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

function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll(
    "=",
    "",
  );
}

async function accessTokenDigest(value: string): Promise<string> {
  if (!TOKEN_PATTERN.test(value)) throw new Error("AUTH_REQUIRED");
  const bytes = fromBase64Url(value);
  if (bytes.byteLength !== 32) throw new Error("AUTH_REQUIRED");
  return toBase64Url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  );
}

async function readCommand(request: Request): Promise<DrsCaseCommandRequest> {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(
      request.headers.get("content-type") ?? "",
    )
  ) throw new Error("INVALID_REQUEST");
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength &&
    (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)
  ) {
    throw new Error("INVALID_REQUEST");
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BODY_BYTES) {
    throw new Error("INVALID_REQUEST");
  }
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return parseDrsCaseCommandRequest(JSON.parse(raw));
}

async function callCommandRpc(
  supabaseOrigin: string,
  serviceRoleKey: string,
  fetchImplementation: typeof globalThis.fetch,
  envelope: TechnicalSealedSessionCookieEnvelope,
  command: DrsCaseCommandRequest,
): Promise<unknown> {
  const response = await fetchImplementation(
    `${supabaseOrigin}/rest/v1/rpc/drs_case_command_apply_v1`,
    {
      method: "POST",
      redirect: "error",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "accept": "application/json",
        "apikey": serviceRoleKey,
        "authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_server_session_id: envelope.serverSessionId,
        p_access_token_digest: await accessTokenDigest(envelope.accessToken),
        p_expected_user_id: envelope.userId,
        p_expected_auth_session_id: envelope.authSessionId,
        p_command_id: command.commandId,
        p_command_type: command.commandType,
        p_idempotency_key: command.idempotencyKey,
        p_expected_case_version: command.expectedCaseVersion,
        p_canonical_payload_sha256: command.canonicalPayloadSha256,
        p_evidence_refs: command.evidenceRefs,
        p_due_time: command.dueTime,
      }),
    },
  );
  if (!response.ok) throw new Error("COMMAND_UNAVAILABLE");
  const payload: unknown = await response.json();
  return Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
}

export function createDrsCaseCommandEndpoint(
  options: EndpointOptions = {},
): (request: Request) => Promise<Response> {
  const runtime = options.runtime ?? createDrsThreeRoleSecureSessionRuntime();
  const environment = options.env ?? defaultEnvironment();
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  return async (request) => {
    let allowedOrigin: string | undefined;
    try {
      const dependencies: DrsThreeRoleSessionBootstrapDependencies | undefined =
        runtime.bootstrapDependencies;
      const supabaseOrigin = environment?.get("SUPABASE_URL");
      const serviceRoleKey = environment?.get("SUPABASE_SERVICE_ROLE_KEY");
      if (
        !runtime.runtimeAvailable || !dependencies ||
        typeof supabaseOrigin !== "string" ||
        !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/iu.test(supabaseOrigin) ||
        typeof serviceRoleKey !== "string" || serviceRoleKey.length < 32
      ) throw new Error("CONTEXT_UNAVAILABLE");
      allowedOrigin = dependencies.allowedOrigin;
      const url = new URL(request.url);
      if (
        request.method !== "POST" || url.pathname !== COMMAND_PATH ||
        url.search.length !== 0 || url.hash.length !== 0 ||
        request.headers.get("origin") !== allowedOrigin
      ) throw new Error("INVALID_REQUEST");
      for (const key of FORBIDDEN_CALLER_AUTHORITY_KEYS) {
        if (request.headers.has(`x-drs-${key}`)) {
          throw new Error("INVALID_REQUEST");
        }
      }
      for (const [name] of request.headers) {
        if (name.startsWith("x-drs-")) throw new Error("INVALID_REQUEST");
      }
      await assertTransitionCatalogIntegrity();
      const command = await readCommand(request);
      const sealedCookie = parseCookie(request, dependencies.sessionCookieName);
      const opened = await dependencies.technicalCookieCodec
        .openTechnicalSessionCookie(sealedCookie);
      if (!validEnvelope(opened)) throw new Error("AUTH_REQUIRED");
      const verified = await dependencies.sessionVerifier
        .verifyThreeRoleSession({
          serverSessionId: opened.serverSessionId,
          accessToken: opened.accessToken,
          expectedUserId: opened.userId,
          expectedAuthSessionId: opened.authSessionId,
        });
      if (
        !validContext(verified) || verified.userId !== opened.userId ||
        verified.sessionId !== opened.authSessionId
      ) throw new Error("AUTH_REQUIRED");
      const result = await callCommandRpc(
        supabaseOrigin,
        serviceRoleKey,
        fetchImplementation,
        opened,
        command,
      );
      return jsonResponse({ result }, 200, allowedOrigin);
    } catch (error) {
      const code = error instanceof Error
        ? error.message
        : "COMMAND_UNAVAILABLE";
      const status = code === "INVALID_REQUEST"
        ? 400
        : code === "AUTH_REQUIRED"
        ? 401
        : code === "CONTEXT_UNAVAILABLE"
        ? 503
        : 502;
      return jsonResponse({ state: code }, status, allowedOrigin);
    }
  };
}

export const handler = createDrsCaseCommandEndpoint();
if (import.meta.main) Deno.serve(handler);
