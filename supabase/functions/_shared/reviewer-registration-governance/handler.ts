import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import {
  isUuid,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "../drs-auth/contracts.ts";

const SCHEMA = "laibe.drs-reviewer-registration-governance.v1";
type Route = "queue" | "decision";
type Options = Readonly<
  {
    env?: RuntimeEnvironment;
    fetch?: typeof globalThis.fetch;
    now?: () => number;
  }
>;
const ERRORS: Readonly<Record<string, number>> = Object.freeze({
  AUTH_REQUIRED: 401,
  REGISTRATION_OPERATION_NOT_AUTHORIZED: 403,
  SELF_APPROVAL_NOT_ALLOWED: 403,
  INVALID_REQUEST: 400,
  APPLICATION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  APPLICANT_NOT_ELIGIBLE: 409,
  EXISTING_IDENTITY_REQUIRES_REVIEW: 409,
  CONTEXT_UNAVAILABLE: 503,
});
function authFailureStage(
  stage: string,
  outcome: string,
  status: number,
):
  | "INPUT"
  | "AUTH_PROVIDER"
  | "IDENTITY"
  | "AUTH_SERVICE"
  | "SESSION_STATE"
  | "SESSION_SERVICE" {
  if (stage === "session") {
    return outcome === "DENIED" ? "SESSION_STATE" : "SESSION_SERVICE";
  }
  if (outcome !== "DENIED") return "AUTH_SERVICE";
  if (status >= 200 && status <= 299) return "IDENTITY";
  if (status === 401 || status === 403) return "AUTH_PROVIDER";
  return "INPUT";
}
function exact(
  v: unknown,
  keys: readonly string[],
): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) &&
    Reflect.ownKeys(v).length === keys.length &&
    keys.every((k) => Object.hasOwn(v, k));
}
function text(v: unknown, min: number, max: number): v is string {
  return typeof v === "string" && Array.from(v).length >= min &&
    Array.from(v).length <= max &&
    !Array.from(v).some((c) =>
      c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159)
    );
}
function timestamp(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/u
      .exec(v);
  if (!m || !Number.isFinite(Date.parse(v))) return false;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return y >= 1000 && mo >= 1 && mo <= 12 && d >= 1 && d <= days && h < 24 &&
    mi < 60 && s < 60 &&
    (m[7] === "Z" ||
      (Number(m[7].slice(1, 3)) <= 23 && Number(m[7].slice(4)) < 60));
}
function cursor(v: unknown): boolean {
  return v === null ||
    (exact(v, ["submittedAt", "applicationId"]) && timestamp(v.submittedAt) &&
      isUuid(v.applicationId));
}
function instant(v: string): bigint {
  const fraction = /\.(\d+)/u.exec(v)?.[1] ?? "";
  return BigInt(Date.parse(v)) * 1000n +
    BigInt(fraction.padEnd(6, "0").slice(3, 6));
}
function https(v: string | undefined): v is string {
  try {
    const u = new URL(v ?? "");
    return u.protocol === "https:" && u.origin === v;
  } catch {
    return false;
  }
}
async function boundedJson(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
) {
  if (!body) throw Error("Missing body");
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error("Body bound");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const x of chunks) {
    bytes.set(x, offset);
    offset += x.length;
  }
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const value: unknown = JSON.parse(raw);
  // JSON.parse overwrites duplicate names; count members outside strings to reject that ambiguity.
  let quoted = false, escaped = false, members = 0;
  for (const c of raw) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ":") members++;
  }
  const keys = (x: unknown): number =>
    x !== null && typeof x === "object"
      ? Object.entries(x).reduce(
        (n, [, v]) => n + keys(v),
        Array.isArray(x) ? 0 : Object.keys(x).length,
      )
      : 0;
  if (members !== keys(value)) throw Error("Duplicate members");
  return value;
}
function input(route: Route, v: unknown): v is Record<string, unknown> {
  if (route === "queue") return exact(v, ["cursor"]) && cursor(v.cursor);
  return exact(v, [
    "applicationId",
    "expectedVersion",
    "decision",
    "reason",
    "idempotencyKey",
    "bindingValidUntil",
  ]) &&
    isUuid(v.applicationId) && Number.isInteger(v.expectedVersion) &&
    (v.expectedVersion as number) >= 1 &&
    (v.expectedVersion as number) < 2147483647 &&
    (v.decision === "approve" || v.decision === "reject") &&
    text(v.reason, 1, 500) && v.reason === v.reason.trim() &&
    isUuid(v.idempotencyKey) &&
    (v.decision === "approve"
      ? timestamp(v.bindingValidUntil)
      : v.bindingValidUntil === null);
}
function projection(
  route: Route,
  v: unknown,
  request: Record<string, unknown>,
): boolean {
  if (route === "queue") {
    if (
      !exact(v, ["schemaVersion", "state", "applications", "nextCursor"]) ||
      v.schemaVersion !== SCHEMA ||
      v.state !== "REGISTRATION_QUEUE_READY" ||
      !Array.isArray(v.applications) || v.applications.length > 25 ||
      !cursor(v.nextCursor)
    ) return false;
    let previous = request.cursor;
    for (const a of v.applications) {
      if (
        !exact(a, [
          "applicationId",
          "version",
          "status",
          "submittedAt",
          "displayName",
          "organization",
          "phone",
          "accountEmail",
          "emailConfirmed",
        ]) ||
        !isUuid(a.applicationId) || !Number.isInteger(a.version) ||
        (a.version as number) < 1 || (a.version as number) > 2147483647 ||
        a.status !== "pending" || !timestamp(a.submittedAt) ||
        !text(a.displayName, 1, 80) || !text(a.organization, 0, 160) ||
        !text(a.phone, 0, 32) || !text(a.accountEmail, 0, 255) ||
        typeof a.emailConfirmed !== "boolean"
      ) return false;
      if (previous !== null && previous !== undefined) {
        const p = previous as Record<string, string>,
          t = instant(a.submittedAt),
          pt = instant(p.submittedAt);
        if (
          t < pt ||
          (t === pt &&
            a.applicationId.toLowerCase() <= p.applicationId.toLowerCase())
        ) return false;
      }
      previous = a;
    }
    if (v.nextCursor !== null) {
      if (v.applications.length !== 25) return false;
      const last = v.applications.at(-1),
        next = v.nextCursor as Record<string, unknown>;
      if (
        next.applicationId !== last.applicationId ||
        next.submittedAt !== last.submittedAt
      ) return false;
    }
    return true;
  }
  if (
    !exact(v, [
      "schemaVersion",
      "state",
      "application",
      "decision",
      "qualification",
      "caseAccessGranted",
      "replayed",
    ]) ||
    v.schemaVersion !== SCHEMA || v.state !== "REGISTRATION_DECIDED" ||
    v.caseAccessGranted !== false || typeof v.replayed !== "boolean" ||
    !exact(v.application, ["applicationId", "status", "version"]) ||
    !exact(v.decision, ["decisionId", "outcome", "decidedAt"]) ||
    !exact(v.qualification, ["effect", "validUntil"])
  ) return false;
  const approve = request.decision === "approve";
  return v.application.applicationId === request.applicationId &&
    v.application.status === (approve ? "approved" : "rejected") &&
    v.application.version === (request.expectedVersion as number) + 1 &&
    isUuid(v.decision.decisionId) && v.decision.outcome === request.decision &&
    timestamp(v.decision.decidedAt) &&
    v.qualification.effect === (approve ? "granted" : "not_granted") &&
    (approve
      ? timestamp(v.qualification.validUntil) &&
        Date.parse(v.qualification.validUntil) ===
          Date.parse(request.bindingValidUntil as string)
      : v.qualification.validUntil === null);
}
export function createRegistrationGovernanceHandler(
  route: Route,
  options: Options = {},
) {
  const origin = readRuntimeEnvironment(options.env, "LAIBE_DRS_APP_ORIGIN");
  const project = readRuntimeEnvironment(options.env, "SUPABASE_URL");
  const service = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetcher = options.fetch ?? globalThis.fetch,
    now = options.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    const headers: Record<string, string> = {
      "cache-control": "no-store",
      pragma: "no-cache",
      vary: "Origin",
      "x-content-type-options": "nosniff",
    };
    const reply = (status: number, body: unknown) =>
      Response.json(body, { status, headers });
    if (!https(origin)) return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    if (request.headers.get("origin") !== origin) {
      return reply(403, { state: "CONTEXT_UNAVAILABLE" });
    }
    Object.assign(headers, {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization,content-type,apikey",
    });
    const url = new URL(request.url);
    if (
      url.pathname !== "/functions/v1/drs-reviewer-registration-" + route ||
      url.search
    ) return reply(400, { state: "INVALID_REQUEST" });
    if (request.method === "OPTIONS") {
      const allowed =
        (request.headers.get("access-control-request-headers") ?? "").split(",")
          .map((x) => x.trim().toLowerCase()).filter(Boolean);
      if (
        request.headers.get("access-control-request-method") !== "POST" ||
        allowed.some((x) =>
          !["authorization", "content-type", "apikey"].includes(x)
        )
      ) return reply(403, { state: "CONTEXT_UNAVAILABLE" });
      return new Response(null, { status: 204, headers });
    }
    if (
      request.method !== "POST" ||
      !/^application\/json(?:\s*;|$)/iu.test(
        request.headers.get("content-type") ?? "",
      )
    ) return reply(400, { state: "INVALID_REQUEST" });
    let body: unknown;
    try {
      body = await boundedJson(request.body, 4096);
    } catch {
      return reply(400, { state: "INVALID_REQUEST" });
    }
    if (!input(route, body)) return reply(400, { state: "INVALID_REQUEST" });
    if (!https(project) || !service || service.length < 32) {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
    let authStage: ReturnType<typeof authFailureStage> = "AUTH_SERVICE";
    const verified = await verifyAuthSession(request, {
      supabaseUrl: project,
      serviceRoleKey: service,
      fetch: fetcher,
      now,
      observer: (stage, outcome, status) => {
        authStage = authFailureStage(stage, outcome, status);
      },
    });
    if (verified.state !== "verified") {
      if (route === "queue") headers["x-laibe-auth-stage"] = authStage;
      return reply(verified.state === "denied" ? 401 : 503, {
        state: verified.state === "denied"
          ? "AUTH_REQUIRED"
          : "CONTEXT_UNAVAILABLE",
      });
    }
    const base = {
      p_actor_user_id: verified.session.userId,
      p_auth_session_id: verified.session.authSessionId,
      p_jwt_expires_at: new Date(verified.session.expiresAtEpochSeconds * 1000)
        .toISOString(),
    };
    const c = body.cursor as Record<string, string> | null;
    const args = route === "queue"
      ? {
        ...base,
        p_cursor_submitted_at: c?.submittedAt ?? null,
        p_cursor_application_id: c?.applicationId ?? null,
      }
      : {
        ...base,
        p_application_id: body.applicationId,
        p_expected_version: body.expectedVersion,
        p_decision: body.decision,
        p_reason: body.reason,
        p_idempotency_key: body.idempotencyKey,
        p_binding_valid_until: body.bindingValidUntil,
      };
    try {
      const response = await fetcher(
        new URL(
          "/rest/v1/rpc/drs_reviewer_registration_" + route + "_v1",
          project,
        ),
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
          headers: {
            apikey: service,
            authorization: "Bearer " + service,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(args),
        },
      );
      if (
        !response.ok ||
        !/^application\/json(?:\s*;|$)/iu.test(
          response.headers.get("content-type") ?? "",
        )
      ) {
        await response.body?.cancel();
        return reply(503, { state: "CONTEXT_UNAVAILABLE" });
      }
      const raw = await boundedJson(response.body, 65536);
      if (
        exact(raw, ["schemaVersion", "state"]) &&
        raw.schemaVersion === SCHEMA && typeof raw.state === "string" &&
        Object.hasOwn(ERRORS, raw.state)
      ) {
        return reply(ERRORS[raw.state], { state: raw.state });
      }
      if (!projection(route, raw, body)) {
        return reply(503, { state: "CONTEXT_UNAVAILABLE" });
      }
      const current = now();
      if (!Number.isFinite(current)) {
        return reply(503, { state: "CONTEXT_UNAVAILABLE" });
      }
      if (current >= verified.session.expiresAtEpochSeconds * 1000) {
        return reply(401, { state: "AUTH_REQUIRED" });
      }
      return reply(200, raw);
    } catch {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}
