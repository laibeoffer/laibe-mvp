import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import {
  isUuid,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./contracts.ts";
import { readBoundedRpcJson } from "./auth-bound-session.ts";

const SCHEMA = "laibe.drs-reviewer-self-application.v1";
const PATH = "/functions/v1/drs-reviewer-registration-applications";
const MAX_BODY_BYTES = 4096;
type Options = Readonly<
  {
    env?: RuntimeEnvironment;
    fetch?: typeof globalThis.fetch;
    now?: () => number;
  }
>;

function hasExactOwnKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function exactHttpsOrigin(value: string | undefined): value is string {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && url.origin === value;
  } catch {
    return false;
  }
}
async function contactBody(request: Request) {
  if (
    !/^application\/json(?:\s*;|$)/iu.test(
      request.headers.get("content-type") ?? "",
    ) || !request.body
  ) throw new Error("Invalid body");
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY_BYTES) throw new Error("Body exceeds limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const value = JSON.parse(raw);
  if (!hasExactOwnKeys(value, ["displayName", "organization", "phone"])) {
    throw new Error("Invalid fields");
  }
  // Count structural colons outside strings so duplicate JSON members cannot be hidden by parsing.
  let quoted = false, escaped = false, members = 0;
  for (const ch of raw) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ":") members++;
  }
  if (members !== 3) throw new Error("Duplicate fields");
  const result: Record<string, string> = {};
  for (
    const [name, min, max] of [
      ["displayName", 1, 80],
      ["organization", 0, 160],
      ["phone", 0, 32],
    ] as const
  ) {
    const input = value[name];
    if (
      typeof input !== "string" || Array.from(input).some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || (code >= 127 && code <= 159);
      })
    ) throw new Error("Invalid contact");
    const trimmed = input.trim();
    const length = Array.from(trimmed).length;
    if (length < min || length > max) throw new Error("Invalid contact length");
    result[name] = trimmed;
  }
  return result;
}
function projection(value: unknown, create: boolean) {
  if (
    !hasExactOwnKeys(value, [
      "schemaVersion",
      "state",
      "application",
      "created",
    ]) || value.schemaVersion !== SCHEMA || typeof value.created !== "boolean"
  ) return null;
  if (value.state === "NO_APPLICATION") {
    return value.application === null && value.created === false && !create
      ? {
        schemaVersion: SCHEMA,
        state: "NO_APPLICATION",
        application: null,
        created: false,
      }
      : null;
  }
  const application = value.application;
  if (
    !hasExactOwnKeys(application, ["applicationId", "submittedAt", "status"]) ||
    !isUuid(application.applicationId) ||
    typeof application.submittedAt !== "string"
  ) return null;
  const timestamp = application.submittedAt;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/u
      .test(timestamp) || !Number.isFinite(Date.parse(timestamp))
  ) return null;
  if (
    typeof application.status !== "string" ||
    !["pending", "approved", "rejected"].includes(application.status) ||
    value.state !== `APPLICATION_${application.status.toUpperCase()}` ||
    (value.created && (!create || application.status !== "pending"))
  ) return null;
  return {
    schemaVersion: SCHEMA,
    state: value.state,
    application: {
      applicationId: application.applicationId,
      submittedAt: timestamp,
      status: application.status,
    },
    created: value.created,
  };
}
export function createDrsReviewerRegistrationApplicationsHandler(
  options: Options = {},
) {
  const origin = readRuntimeEnvironment(options.env, "LAIBE_DRS_APP_ORIGIN");
  const project = readRuntimeEnvironment(options.env, "SUPABASE_URL");
  const serviceKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetcher = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    const suppliedOrigin = request.headers.get("origin");
    const cors: Record<string, string> = {
      "vary": "Origin",
      "cache-control": "no-store",
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
    };
    const reply = (status: number, payload: unknown) =>
      Response.json(payload, { status, headers: cors });
    if (!exactHttpsOrigin(origin)) {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
    if (suppliedOrigin !== origin) {
      return reply(403, { state: "CONTEXT_UNAVAILABLE" });
    }
    cors["access-control-allow-origin"] = origin;
    cors["access-control-allow-methods"] = "GET, POST, OPTIONS";
    cors["access-control-allow-headers"] = "authorization,content-type,apikey";
    const url = new URL(request.url);
    if (url.pathname !== PATH || url.search) {
      return reply(400, { state: "INVALID_REQUEST" });
    }
    if (request.method === "OPTIONS") {
      const method = request.headers.get("access-control-request-method");
      const headers =
        (request.headers.get("access-control-request-headers") ?? "").split(",")
          .map((v) => v.trim().toLowerCase()).filter(Boolean);
      if (
        !["GET", "POST"].includes(method ?? "") ||
        headers.some((v) =>
          !["authorization", "content-type", "apikey"].includes(v)
        )
      ) return reply(403, { state: "CONTEXT_UNAVAILABLE" });
      return new Response(null, { status: 204, headers: cors });
    }
    if (!["GET", "POST"].includes(request.method)) {
      return reply(400, { state: "INVALID_REQUEST" });
    }
    let contact: Record<string, string> | null = null;
    try {
      if (request.method === "POST") contact = await contactBody(request);
      else if (request.body) throw new Error("Unexpected body");
    } catch {
      return reply(400, { state: "INVALID_REQUEST" });
    }
    if (
      !exactHttpsOrigin(project) || !serviceKey || serviceKey.length < 32 ||
      typeof fetcher !== "function"
    ) return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    const verified = await verifyAuthSession(request, {
      supabaseUrl: project,
      serviceRoleKey: serviceKey,
      fetch: fetcher,
      now,
    });
    if (verified.state !== "verified") {
      return reply(verified.state === "denied" ? 401 : 503, {
        state: verified.state === "denied"
          ? "AUTH_REQUIRED"
          : "CONTEXT_UNAVAILABLE",
      });
    }
    try {
      const response = await fetcher(
        new URL("/rest/v1/rpc/drs_reviewer_self_application_v1", project),
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            p_authenticated_user_id: verified.session.userId,
            p_auth_session_id: verified.session.authSessionId,
            p_jwt_expires_at: new Date(
              verified.session.expiresAtEpochSeconds * 1000,
            ).toISOString(),
            p_create: contact !== null,
            p_display_name: contact?.displayName ?? null,
            p_organization: contact?.organization ?? null,
            p_phone: contact?.phone ?? null,
          }),
        },
      );
      const raw = await readBoundedRpcJson(response);
      if (
        hasExactOwnKeys(raw, ["schemaVersion", "state"]) &&
        raw.schemaVersion === SCHEMA && raw.state === "AUTH_REQUIRED"
      ) return reply(401, { state: "AUTH_REQUIRED" });
      const result = projection(raw, contact !== null);
      if (!result) return reply(503, { state: "CONTEXT_UNAVAILABLE" });
      const current = now();
      if (!Number.isFinite(current)) {
        return reply(503, { state: "CONTEXT_UNAVAILABLE" });
      }
      if (current >= verified.session.expiresAtEpochSeconds * 1000) {
        return reply(401, { state: "AUTH_REQUIRED" });
      }
      const { created, ...dto } = result;
      return reply(created ? 201 : 200, dto);
    } catch {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}
