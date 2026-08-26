const CALENDAR_READ_SCHEMA = "laibe.drs-calendar-read.v1";
const GOOGLE_AUTHORIZATION_HOSTS = new Set(["accounts.google.com"]);
const SESSION_HEADER_NAMES = new Set(["authorization", "x-csrf-token"]);
const FORBIDDEN_RESPONSE_KEY = /(?:token|credential|subject|email|calendarid|provider|attendees|description|raw)/iu;
const TRANSPORT_FAILURE = Symbol("transport failure");
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/u;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/u;
const MAX_EVENT_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

function result(value) { return Object.freeze({ ok: true, ...value }); }
function failure(code) { return Object.freeze({ ok: false, code }); }
function transportFailure(value) { return Object.freeze({ [TRANSPORT_FAILURE]: value }); }
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function hasOnlyKeys(value, keys) { return isRecord(value) && Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
function hasForbiddenKey(value) { return Array.isArray(value) ? value.some(hasForbiddenKey) : isRecord(value) && Object.keys(value).some((key) => FORBIDDEN_RESPONSE_KEY.test(key) || hasForbiddenKey(value[key])); }

function isValidDateParts(match) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateTimeValue(value) {
  const match = typeof value === "string" ? DATE_TIME.exec(value) : null;
  if (!match || !isValidDateParts(match) || Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) return null;
  if (match[7] !== "Z" && (Number(match[7].slice(1, 3)) > 23 || Number(match[7].slice(4, 6)) > 59)) return null;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : null;
}

function dateOnlyValue(value) {
  const match = typeof value === "string" ? DATE_ONLY.exec(value) : null;
  return match && isValidDateParts(match) ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function normalizeSessionHeaders(value) {
  if (!isRecord(value)) return null;
  const headers = Object.create(null);
  for (const [name, headerValue] of Object.entries(value)) {
    const normalizedName = name.toLowerCase();
    if (!SESSION_HEADER_NAMES.has(normalizedName) || Object.hasOwn(headers, normalizedName) || typeof headerValue !== "string" || headerValue.length === 0) return null;
    headers[normalizedName] = headerValue;
  }
  return headers;
}

function validateEndpoints(endpoints) {
  if (!hasOnlyKeys(endpoints, ["grant", "eventsRead", "oauthStart", "revoke"])) return null;
  return Object.values(endpoints).every((endpoint) => typeof endpoint === "string" && endpoint.startsWith("/") && !endpoint.startsWith("//")) ? endpoints : null;
}

function isSafeAuthorizationUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" && url.port === "" && GOOGLE_AUTHORIZATION_HOSTS.has(url.hostname);
  } catch { return false; }
}

function mapGrant(payload, expectedCaseId) {
  if (hasForbiddenKey(payload) || !hasOnlyKeys(payload, ["state", "grant"]) || payload.state !== "READY" || !hasOnlyKeys(payload.grant, ["schemaVersion", "caseId", "accessMode", "connectionStatus", "timeZone"]) || payload.grant.schemaVersion !== CALENDAR_READ_SCHEMA || payload.grant.caseId !== expectedCaseId || payload.grant.accessMode !== "read_only" || payload.grant.connectionStatus !== "connected" || payload.grant.timeZone !== "Asia/Taipei") return failure(payload?.grant?.caseId !== undefined && payload.grant.caseId !== expectedCaseId ? "CASE_MISMATCH" : "INVALID_RESPONSE");
  return result({ kind: "grant", state: "READY", accessMode: "read_only", connectionStatus: "connected", timeZone: payload.grant.timeZone });
}

function mapEvents(payload, expectedCaseId, expectedWindow) {
  if (hasForbiddenKey(payload) || !hasOnlyKeys(payload, ["state", "caseId", "timeZone", "window", "events"]) || payload.state !== "READY" || payload.caseId !== expectedCaseId || payload.timeZone !== "Asia/Taipei" || !hasOnlyKeys(payload.window, ["timeMin", "timeMax"]) || payload.window.timeMin !== expectedWindow.timeMin || payload.window.timeMax !== expectedWindow.timeMax || !Array.isArray(payload.events)) return failure(payload?.caseId !== undefined && payload.caseId !== expectedCaseId ? "CASE_MISMATCH" : "INVALID_RESPONSE");
  const sanitizedEvents = [];
  for (const event of payload.events) {
    if (!hasOnlyKeys(event, ["title", "startsAt", "endsAt", "allDay"]) || typeof event.title !== "string" || event.title.length === 0 || typeof event.allDay !== "boolean") return failure("INVALID_RESPONSE");
    const start = event.allDay ? dateOnlyValue(event.startsAt) : dateTimeValue(event.startsAt);
    const end = event.allDay ? dateOnlyValue(event.endsAt) : dateTimeValue(event.endsAt);
    if (start === null || end === null || end <= start) return failure("INVALID_RESPONSE");
    sanitizedEvents.push(Object.freeze({ title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, allDay: event.allDay }));
  }
  return result({ kind: "events", timeZone: payload.timeZone, window: Object.freeze({ ...expectedWindow }), events: Object.freeze(sanitizedEvents) });
}

function mapConnection(payload, state) {
  const keys = state === "OAUTH_REDIRECT_REQUIRED" ? ["state", "authorizationUrl"] : ["state"];
  if (hasForbiddenKey(payload) || !hasOnlyKeys(payload, keys) || payload.state !== state) return failure("INVALID_RESPONSE");
  if (state === "OAUTH_REDIRECT_REQUIRED") return isSafeAuthorizationUrl(payload.authorizationUrl) ? result({ kind: "connection", state, authorizationUrl: payload.authorizationUrl }) : failure("INVALID_RESPONSE");
  return result({ kind: "connection", state });
}

export function createSpecialistCalendarTransport({ fetchImplementation, endpoints, resolveSessionHeaders }) {
  const safeEndpoints = validateEndpoints(endpoints);
  if (typeof fetchImplementation !== "function" || typeof resolveSessionHeaders !== "function" || !safeEndpoints) throw new TypeError("Invalid calendar transport configuration");
  async function post(endpoint, body, signal) {
    if (signal?.aborted) return transportFailure(failure("REQUEST_ABORTED"));
    let sessionHeaders;
    try { sessionHeaders = normalizeSessionHeaders(await resolveSessionHeaders()); } catch { return transportFailure(failure("SESSION_UNAVAILABLE")); }
    if (!sessionHeaders) return transportFailure(failure("SESSION_UNAVAILABLE"));
    try {
      const response = await fetchImplementation(endpoint, { method: "POST", credentials: "same-origin", headers: { ...sessionHeaders, "content-type": "application/json" }, body: JSON.stringify(body), signal });
      if (!response || !response.ok) return transportFailure(failure("HTTP_ERROR"));
      try { return await response.json(); } catch { return transportFailure(failure("INVALID_RESPONSE")); }
    } catch (error) { return transportFailure(signal?.aborted || error?.name === "AbortError" ? failure("REQUEST_ABORTED") : failure("NETWORK_ERROR")); }
  }
  return Object.freeze({
    async loadGrant({ expectedCaseId, signal } = {}) {
      if (typeof expectedCaseId !== "string" || expectedCaseId.length === 0) return failure("INVALID_INPUT");
      const payload = await post(safeEndpoints.grant, {}, signal);
      return payload[TRANSPORT_FAILURE] ?? mapGrant(payload, expectedCaseId);
    },
    async loadEvents({ expectedCaseId, timeMin, timeMax, signal } = {}) {
      const minimum = dateTimeValue(timeMin); const maximum = dateTimeValue(timeMax);
      if (typeof expectedCaseId !== "string" || expectedCaseId.length === 0 || minimum === null || maximum === null || minimum >= maximum || maximum - minimum > MAX_EVENT_WINDOW_MS) return failure("INVALID_INPUT");
      const window = { timeMin, timeMax };
      const payload = await post(safeEndpoints.eventsRead, window, signal);
      return payload[TRANSPORT_FAILURE] ?? mapEvents(payload, expectedCaseId, window);
    },
    async beginConnection({ mode, signal } = {}) {
      if (mode !== "connect" && mode !== "reconnect") return failure("INVALID_INPUT");
      const payload = await post(safeEndpoints.oauthStart, {}, signal);
      return payload[TRANSPORT_FAILURE] ?? mapConnection(payload, "OAUTH_REDIRECT_REQUIRED");
    },
    async revokeConnection({ signal } = {}) {
      const payload = await post(safeEndpoints.revoke, {}, signal);
      return payload[TRANSPORT_FAILURE] ?? mapConnection(payload, "REVOKED");
    },
  });
}
