import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import {
  HIGHEST_REVIEWER_GOVERNANCE_SCHEMA as SCHEMA,
  type HighestReviewerCandidatesRequest,
  type HighestReviewerCandidatesResponse,
  type HighestReviewerDecisionRequest,
  type HighestReviewerDecisionResponse,
  type HighestReviewerErrorState,
  isUuid,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "../drs-auth/contracts.ts";
import { withEdgeRequestBoundary } from "../http/edge-request-boundary.ts";

type Operation = "candidates" | "role-decision";
type Dependencies = Readonly<
  {
    env?: RuntimeEnvironment;
    fetch?: typeof globalThis.fetch;
    now?: () => number;
  }
>;
const HTTP: Readonly<Record<HighestReviewerErrorState, number>> = Object.freeze(
  {
    INVALID_REQUEST: 400,
    AUTH_REQUIRED: 401,
    GOVERNANCE_OWNER_NOT_AUTHORIZED: 403,
    REVIEWER_QUALIFICATION_CONFLICT: 409,
    HIGHEST_REVIEWER_GRANT_CONFLICT: 409,
    LEGACY_GRANT_RECONCILIATION_REQUIRED: 409,
    IDEMPOTENCY_CONFLICT: 409,
    TEMPORARILY_UNAVAILABLE: 503,
  },
);
function exact(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && Array.from(value).length >= min &&
    Array.from(value).length <= max &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
}
function version(value: unknown, min = 1): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min;
}
function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/u
      .exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(
    Number,
  );
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && hour < 24 &&
    minute < 60 && second < 60 &&
    (match[7] === "Z" ||
      (Number(match[7].slice(1, 3)) < 24 && Number(match[7].slice(4)) < 60));
}
function cursor(value: unknown): boolean {
  return value === null ||
    (exact(value, ["sortKey", "candidateKey"]) && text(value.sortKey, 0, 320) &&
      isUuid(value.candidateKey));
}
function https(value: string | undefined): value is string {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && url.origin === value;
  } catch {
    return false;
  }
}
async function boundedJson(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<unknown> {
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
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    value: unknown = JSON.parse(raw);
  // Reject duplicate JSON members rather than accepting JSON.parse's last value.
  let quoted = false, escaped = false, members = 0;
  for (const character of raw) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === ":") members++;
  }
  const keys = (x: unknown): number =>
    x !== null && typeof x === "object"
      ? Object.entries(x).reduce(
        (count, [, child]) => count + keys(child),
        Array.isArray(x) ? 0 : Object.keys(x).length,
      )
      : 0;
  if (members !== keys(value)) throw Error("Duplicate members");
  return value;
}
function candidatesInput(
  value: unknown,
): value is HighestReviewerCandidatesRequest {
  return exact(value, ["cursor"]) && cursor(value.cursor);
}
function decisionInput(
  value: unknown,
): value is HighestReviewerDecisionRequest {
  if (
    !exact(value, ["subject", "decision", "reason", "idempotencyKey"]) ||
    !exact(value.subject, [
      "authBindingId",
      "bindingVersion",
      "grantId",
      "expectedGrantVersion",
    ]) ||
    (value.decision !== "grant" && value.decision !== "revoke") ||
    !isUuid(value.idempotencyKey) ||
    typeof value.reason !== "string" || Array.from(value.reason).length < 1 ||
    Array.from(value.reason).length > 500 ||
    value.reason !== value.reason.trim()
  ) return false;
  const subject = value.subject;
  const binding = isUuid(subject.authBindingId) &&
    version(subject.bindingVersion);
  const grant = isUuid(subject.grantId) &&
    version(subject.expectedGrantVersion, 0);
  return (value.decision === "grant" ? binding : binding ||
    (subject.authBindingId === null && subject.bindingVersion === null)) &&
    (value.decision === "revoke" ? grant : grant ||
      (subject.grantId === null && subject.expectedGrantVersion === null));
}
function candidate(value: unknown): boolean {
  if (
    !exact(value, [
      "candidateKey",
      "displayName",
      "accountEmail",
      "subject",
      "qualification",
      "governanceGrant",
      "effectiveHighestReviewer",
      "availableAction",
    ]) ||
    !isUuid(value.candidateKey) ||
    !exact(value.subject, [
      "authBindingId",
      "bindingVersion",
      "grantId",
      "grantVersion",
    ]) ||
    !exact(value.qualification, ["state", "validUntil"]) ||
    !exact(value.governanceGrant, ["state", "validUntil"]) ||
    typeof value.effectiveHighestReviewer !== "boolean"
  ) return false;
  const subject = value.subject,
    qualification = value.qualification,
    grant = value.governanceGrant;
  if (grant.state === "legacy_identity_unresolved") {
    return value.displayName === null && value.accountEmail === null &&
      subject.authBindingId === null && subject.bindingVersion === null &&
      isUuid(subject.grantId) && version(subject.grantVersion) &&
      value.candidateKey === subject.grantId &&
      qualification.state === "unresolved" &&
      qualification.validUntil === null && grant.validUntil === null &&
      value.effectiveHighestReviewer === false &&
      value.availableAction === "reconciliation_required";
  }
  if (
    !isUuid(subject.authBindingId) || !version(subject.bindingVersion) ||
    !["active", "inactive", "expired", "revoked"].includes(
      qualification.state as string,
    ) ||
    !["never_granted", "active", "expired", "revoked"].includes(
      grant.state as string,
    ) ||
    !(value.displayName === null || text(value.displayName, 1, 80)) ||
    !(value.accountEmail === null || text(value.accountEmail, 0, 320)) ||
    !(qualification.validUntil === null || timestamp(qualification.validUntil))
  ) return false;
  if (
    qualification.state === "active" &&
    (value.displayName === null || !text(value.accountEmail, 1, 320) ||
      !timestamp(qualification.validUntil))
  ) return false;
  if (grant.state === "never_granted") {
    if (
      subject.grantId !== null || subject.grantVersion !== null ||
      grant.validUntil !== null || qualification.state !== "active"
    ) return false;
  } else if (
    !isUuid(subject.grantId) || !version(subject.grantVersion) ||
    !timestamp(grant.validUntil)
  ) return false;
  if (
    value.candidateKey !== subject.authBindingId &&
    value.candidateKey !== subject.grantId
  ) return false;
  if (
    value.effectiveHighestReviewer &&
    (qualification.state !== "active" || grant.state !== "active")
  ) return false;
  return value.availableAction === null || value.availableAction === "grant" ||
    value.availableAction === "revoke";
}
function candidatesProjection(
  value: unknown,
): value is HighestReviewerCandidatesResponse {
  if (
    !exact(value, ["schemaVersion", "state", "candidates", "nextCursor"]) ||
    value.schemaVersion !== SCHEMA ||
    !Array.isArray(value.candidates) || value.candidates.length > 25 ||
    !cursor(value.nextCursor)
  ) return false;
  if (value.candidates.length === 0) {
    return value.state === "NO_ELIGIBLE_REVIEWERS" && value.nextCursor === null;
  }
  if (
    value.state !== "HIGHEST_REVIEWER_CANDIDATES_READY" ||
    !value.candidates.every(candidate)
  ) return false;
  const ids = value.candidates.map((row) => row.candidateKey.toLowerCase());
  if (new Set(ids).size !== ids.length) return false;
  if (value.nextCursor !== null) {
    const last = value.candidates.at(-1),
      next = value.nextCursor as Record<string, unknown>;
    if (
      value.candidates.length !== 25 ||
      next.candidateKey !== last.candidateKey ||
      next.sortKey !== (last.accountEmail?.trim().toLowerCase() ?? "")
    ) return false;
  }
  return true;
}
function decisionProjection(
  value: unknown,
  request: HighestReviewerDecisionRequest,
): value is HighestReviewerDecisionResponse {
  if (
    !exact(value, [
      "schemaVersion",
      "state",
      "subject",
      "decision",
      "governanceGrant",
      "caseAccessChanged",
      "replayed",
    ]) || value.schemaVersion !== SCHEMA ||
    !exact(value.subject, [
      "authBindingId",
      "bindingVersion",
      "grantId",
      "grantVersion",
    ]) ||
    !exact(value.decision, ["decisionId", "outcome", "decidedAt"]) ||
    !exact(value.governanceGrant, ["state", "validUntil"]) ||
    value.caseAccessChanged !== false || typeof value.replayed !== "boolean"
  ) return false;
  const subject = value.subject,
    previous = request.subject.expectedGrantVersion;
  return value.state ===
      (request.decision === "grant"
        ? "HIGHEST_REVIEWER_GRANTED"
        : "HIGHEST_REVIEWER_REVOKED") &&
    isUuid(subject.authBindingId) &&
    subject.authBindingId.toLowerCase() ===
      request.subject.authBindingId?.toLowerCase() &&
    version(subject.bindingVersion) &&
    subject.bindingVersion === request.subject.bindingVersion &&
    isUuid(subject.grantId) &&
    (request.subject.grantId === null ||
      subject.grantId.toLowerCase() ===
        request.subject.grantId.toLowerCase()) &&
    version(subject.grantVersion) &&
    (previous === null
      ? subject.grantVersion === 1
      : subject.grantVersion === previous ||
        subject.grantVersion === previous + 1) &&
    isUuid(value.decision.decisionId) &&
    value.decision.outcome === request.decision &&
    timestamp(value.decision.decidedAt) &&
    value.governanceGrant.state ===
      (request.decision === "grant" ? "active" : "revoked") &&
    timestamp(value.governanceGrant.validUntil);
}
export function createHighestReviewerGovernanceHandler(
  operation: Operation,
  dependencies: Dependencies = {},
) {
  const slug = "drs-highest-reviewer-" + operation;
  const fetcher = dependencies.fetch ?? globalThis.fetch,
    now = dependencies.now ?? Date.now;
  const handler = async (request: Request): Promise<Response> => {
    const headers = new Headers({
      "cache-control": "no-store",
      pragma: "no-cache",
      vary: "Origin",
      "x-content-type-options": "nosniff",
    });
    const error = (state: HighestReviewerErrorState) =>
      Response.json({ schemaVersion: SCHEMA, state }, {
        status: HTTP[state],
        headers,
      });
    let body: unknown, service: string | undefined;
    try {
      const origin = readRuntimeEnvironment(
        dependencies.env,
        "LAIBE_DRS_APP_ORIGIN",
      );
      if (!https(origin)) return error("TEMPORARILY_UNAVAILABLE");
      if (request.headers.get("origin") !== origin) {
        return error("INVALID_REQUEST");
      }
      headers.set("access-control-allow-origin", origin);
      headers.set("access-control-allow-methods", "POST, OPTIONS");
      headers.set(
        "access-control-allow-headers",
        "authorization,content-type,apikey",
      );
      if (request.method === "OPTIONS") {
        const requested =
          (request.headers.get("access-control-request-headers") ?? "").split(
            ",",
          ).map((x) => x.trim().toLowerCase()).filter(Boolean);
        if (
          request.headers.get("access-control-request-method") !== "POST" ||
          requested.some((x) =>
            !["authorization", "content-type", "apikey"].includes(x)
          )
        ) return error("INVALID_REQUEST");
        return new Response(null, { status: 204, headers });
      }
      if (
        request.method !== "POST" ||
        !/^application\/json(?:\s*;|$)/iu.test(
          request.headers.get("content-type") ?? "",
        )
      ) return error("INVALID_REQUEST");
      try {
        body = await boundedJson(request.body, 4096);
      } catch {
        return error("INVALID_REQUEST");
      }
      if (
        !(operation === "candidates"
          ? candidatesInput(body)
          : decisionInput(body))
      ) return error("INVALID_REQUEST");
      const project = readRuntimeEnvironment(dependencies.env, "SUPABASE_URL");
      service = readRuntimeEnvironment(
        dependencies.env,
        "SUPABASE_SERVICE_ROLE_KEY",
      );
      if (
        !https(project) || !service || service.length < 32 ||
        !Number.isFinite(now())
      ) return error("TEMPORARILY_UNAVAILABLE");
      const verified = await verifyAuthSession(request, {
        supabaseUrl: project,
        serviceRoleKey: service,
        fetch: fetcher,
        now,
      });
      if (verified.state !== "verified") {
        return error(
          verified.state === "denied"
            ? "AUTH_REQUIRED"
            : "TEMPORARILY_UNAVAILABLE",
        );
      }
      const base = {
        p_owner_user_id: verified.session.userId,
        p_auth_session_id: verified.session.authSessionId,
        p_jwt_expires_at: new Date(
          verified.session.expiresAtEpochSeconds * 1000,
        ).toISOString(),
      };
      const page = body as HighestReviewerCandidatesRequest,
        command = body as HighestReviewerDecisionRequest;
      const args = operation === "candidates"
        ? {
          ...base,
          p_cursor_sort_key: page.cursor?.sortKey ?? null,
          p_cursor_candidate_key: page.cursor?.candidateKey ?? null,
        }
        : {
          ...base,
          p_auth_binding_id: command.subject.authBindingId,
          p_binding_version: command.subject.bindingVersion,
          p_grant_id: command.subject.grantId,
          p_expected_grant_version: command.subject.expectedGrantVersion,
          p_decision: command.decision,
          p_reason: command.reason,
          p_idempotency_key: command.idempotencyKey,
        };
      const response = await fetcher(
        new URL(
          "/rest/v1/rpc/drs_highest_reviewer_" +
            operation.replaceAll("-", "_") + "_v1",
          project,
        ),
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
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
        return error("TEMPORARILY_UNAVAILABLE");
      }
      const raw = await boundedJson(response.body, 65536);
      if (!Number.isFinite(now())) return error("TEMPORARILY_UNAVAILABLE");
      if (now() >= verified.session.expiresAtEpochSeconds * 1000) {
        return error("AUTH_REQUIRED");
      }
      if (
        exact(raw, ["schemaVersion", "state"]) &&
        raw.schemaVersion === SCHEMA && typeof raw.state === "string" &&
        Object.hasOwn(HTTP, raw.state)
      ) return error(raw.state as HighestReviewerErrorState);
      if (
        !(operation === "candidates"
          ? candidatesProjection(raw)
          : decisionProjection(raw, command))
      ) return error("TEMPORARILY_UNAVAILABLE");
      return Response.json(raw, { status: 200, headers });
    } catch {
      return error("TEMPORARILY_UNAVAILABLE");
    } finally {
      body = undefined;
      service = undefined;
    }
  };
  const boundary = withEdgeRequestBoundary(slug, handler);
  return async (request: Request): Promise<Response> => {
    const response = await boundary(request);
    if (response.status !== 400) return response;
    // The shared boundary has a generic envelope; this API keeps its frozen schema.
    await response.body?.cancel();
    return Response.json({ schemaVersion: SCHEMA, state: "INVALID_REQUEST" }, {
      status: 400,
      headers: response.headers,
    });
  };
}
