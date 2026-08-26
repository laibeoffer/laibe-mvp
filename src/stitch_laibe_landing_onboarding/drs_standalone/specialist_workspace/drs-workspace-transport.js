const WORKSPACE_ENDPOINT = "/functions/v1/drs-workspace-grant";
const WORKSPACE_SCHEMA = "laibe.drs-workspace-auth.v1";
const AUTHORIZED_STATE = "AUTHORIZED_DRS_WORKSPACE";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_STATUS = /^[A-Z][A-Z0-9_]{0,79}$/u;
const BEARER = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const FORBIDDEN_RESPONSE_KEY = /(?:token|credential|subject|email|calendarid|provider|assignment|specialistid)/iu;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  return isRecord(value) && Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function containsForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  return isRecord(value) && Object.entries(value).some(([key, nested]) => FORBIDDEN_RESPONSE_KEY.test(key) || containsForbiddenKey(nested));
}

function failure(code) {
  return Object.freeze({ ok: false, code });
}

function normalizeAuthorization(value) {
  if (!hasOnlyKeys(value, ["authorization"]) || typeof value.authorization !== "string" || !BEARER.test(value.authorization)) return null;
  return value.authorization;
}

function mapWorkspaceGrant(payload) {
  if (
    containsForbiddenKey(payload)
    || !hasOnlyKeys(payload, ["schemaVersion", "state", "case", "workspaceAccess", "next"])
    || payload.schemaVersion !== WORKSPACE_SCHEMA
    || payload.state !== AUTHORIZED_STATE
    || !hasOnlyKeys(payload.case, ["id", "status"])
    || typeof payload.case.id !== "string"
    || !UUID.test(payload.case.id)
    || typeof payload.case.status !== "string"
    || !SAFE_STATUS.test(payload.case.status)
    || !hasOnlyKeys(payload.workspaceAccess, ["accountRole", "mode", "mutationAllowed", "writeActionsEnabled"])
    || payload.workspaceAccess.accountRole !== "drs"
    || payload.workspaceAccess.mode !== "read_only"
    || payload.workspaceAccess.mutationAllowed !== false
    || payload.workspaceAccess.writeActionsEnabled !== false
    || !hasOnlyKeys(payload.next, ["actor", "action"])
    || payload.next.actor !== "drs_specialist"
    || payload.next.action !== "REVIEW_AUTHORIZED_CASE_RECORDS"
  ) {
    return failure("INVALID_RESPONSE");
  }
  return Object.freeze({
    ok: true,
    kind: "workspace",
    schemaVersion: payload.schemaVersion,
    state: payload.state,
    case: Object.freeze({ id: payload.case.id, status: payload.case.status }),
    workspaceAccess: Object.freeze({
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    }),
    next: Object.freeze({ actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" }),
  });
}

export function createDrsWorkspaceTransport(configuration) {
  if (
    !hasOnlyKeys(configuration, ["fetchImplementation", "resolveSessionHeaders"])
    || typeof configuration.fetchImplementation !== "function"
    || typeof configuration.resolveSessionHeaders !== "function"
  ) {
    throw new TypeError("Invalid workspace transport configuration");
  }
  const { fetchImplementation, resolveSessionHeaders } = configuration;

  return Object.freeze({
    async loadWorkspaceGrant({ signal } = {}) {
      if (signal?.aborted) return failure("REQUEST_ABORTED");
      let authorization;
      try {
        authorization = normalizeAuthorization(await resolveSessionHeaders());
      } catch {
        return failure("SESSION_UNAVAILABLE");
      }
      if (!authorization) return failure("SESSION_UNAVAILABLE");
      try {
        const response = await fetchImplementation(WORKSPACE_ENDPOINT, {
          method: "POST",
          credentials: "same-origin",
          headers: { authorization, "content-type": "application/json" },
          body: "{}",
          signal,
        });
        if (!response?.ok) return failure("HTTP_ERROR");
        let payload;
        try {
          payload = await response.json();
        } catch {
          return failure("INVALID_RESPONSE");
        }
        return mapWorkspaceGrant(payload);
      } catch (error) {
        return failure(signal?.aborted || error?.name === "AbortError" ? "REQUEST_ABORTED" : "NETWORK_ERROR");
      }
    },
  });
}
