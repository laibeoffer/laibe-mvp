import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/calendar-transport.js", import.meta.url);
const endpoints = Object.freeze({ grant: "/functions/v1/drs-specialist-calendar-grant", eventsRead: "/functions/v1/drs-specialist-calendar-events-read", oauthStart: "/functions/v1/drs-specialist-calendar-oauth-start", revoke: "/functions/v1/drs-specialist-calendar-revoke" });
const window = Object.freeze({ timeMin: "2026-08-01T00:00:00+08:00", timeMax: "2026-08-31T00:00:00+08:00" });

async function loadTransport() { return import(`${moduleUrl.href}?test=${Date.now()}-${Math.random()}`); }
function jsonResponse(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } }); }
function grant(caseId = "CASE-7") { return { state: "READY", grant: { schemaVersion: "laibe.drs-calendar-read.v1", caseId, accessMode: "read_only", connectionStatus: "connected", timeZone: "Asia/Taipei" } }; }
function events(caseId = "CASE-7", values = [{ title: "圖面確認", startsAt: "2026-08-24T09:00:00+08:00", endsAt: "2026-08-24T10:00:00+08:00", allDay: false }]) { return { state: "READY", caseId, timeZone: "Asia/Taipei", window: { ...window }, events: values }; }
async function createTransport(fetchImplementation, resolveSessionHeaders = async () => ({ Authorization: "Bearer session" })) {
  const { createSpecialistCalendarTransport } = await loadTransport();
  return createSpecialistCalendarTransport({ fetchImplementation, endpoints, resolveSessionHeaders });
}

test("calendar transport posts exact minimal bodies and returns the A3/A14 sanitized read contract", async () => {
  const calls = [];
  const transport = await createTransport(async (url, init) => {
    calls.push({ url, init });
    if (url === endpoints.grant) return jsonResponse(grant());
    if (url === endpoints.eventsRead) return jsonResponse(events());
    if (url === endpoints.oauthStart) return jsonResponse({ state: "OAUTH_REDIRECT_REQUIRED", authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque" });
    return jsonResponse({ state: "REVOKED" });
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await transport.loadGrant({ expectedCaseId: "CASE-7", signal }), { ok: true, kind: "grant", state: "READY", accessMode: "read_only", connectionStatus: "connected", timeZone: "Asia/Taipei" });
  assert.deepEqual(await transport.loadEvents({ expectedCaseId: "CASE-7", ...window, signal }), { ok: true, kind: "events", timeZone: "Asia/Taipei", window, events: [{ title: "圖面確認", startsAt: "2026-08-24T09:00:00+08:00", endsAt: "2026-08-24T10:00:00+08:00", allDay: false }] });
  assert.deepEqual(await transport.beginConnection({ mode: "connect", signal }), { ok: true, kind: "connection", state: "OAUTH_REDIRECT_REQUIRED", authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque" });
  assert.deepEqual(await transport.revokeConnection({ signal }), { ok: true, kind: "connection", state: "REVOKED" });
  assert.deepEqual(calls.map(({ url, init }) => ({ url, method: init.method, body: init.body, credentials: init.credentials, signal: init.signal, headers: init.headers })), [
    { url: endpoints.grant, method: "POST", body: "{}", credentials: "same-origin", signal, headers: { authorization: "Bearer session", "content-type": "application/json" } },
    { url: endpoints.eventsRead, method: "POST", body: '{"timeMin":"2026-08-01T00:00:00+08:00","timeMax":"2026-08-31T00:00:00+08:00"}', credentials: "same-origin", signal, headers: { authorization: "Bearer session", "content-type": "application/json" } },
    { url: endpoints.oauthStart, method: "POST", body: "{}", credentials: "same-origin", signal, headers: { authorization: "Bearer session", "content-type": "application/json" } },
    { url: endpoints.revoke, method: "POST", body: "{}", credentials: "same-origin", signal, headers: { authorization: "Bearer session", "content-type": "application/json" } },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /caseId|specialistId|assignmentId|role|calendarId|email/u);
});

test("session resolver has a closed normalized allowlist and never reaches fetch on forbidden headers", async () => {
  const forbiddenHeaders = [{ "content-type": "text/plain" }, { "Content-Type": "application/json" }, { authorization: "one", Authorization: "two" }, { caseId: "CASE-7" }, { specialistId: "S-1" }, { assignmentId: "A-1" }, { role: "specialist" }, { calendarId: "private" }, { email: "private@example.com" }, { "x-case-id": "CASE-7" }, { "x-untrusted": "no" }];
  for (const headers of forbiddenHeaders) {
    let calls = 0;
    const transport = await createTransport(async () => { calls += 1; return jsonResponse({ state: "REVOKED" }); }, async () => headers);
    assert.deepEqual(await transport.revokeConnection(), { ok: false, code: "SESSION_UNAVAILABLE" });
    assert.equal(calls, 0, JSON.stringify(headers));
  }
  let safeCalls = 0;
  const safe = await createTransport(async (_url, init) => { safeCalls += 1; assert.deepEqual(init.headers, { authorization: "Bearer session", "x-csrf-token": "csrf", "content-type": "application/json" }); return jsonResponse({ state: "REVOKED" }); }, async () => ({ Authorization: "Bearer session", "X-CSRF-Token": "csrf" }));
  assert.deepEqual(await safe.revokeConnection(), { ok: true, kind: "connection", state: "REVOKED" });
  assert.equal(safeCalls, 1);
});

test("calendar transport rejects old, extra, missing, mismatched, and unsafe response contracts", async () => {
  const responses = [{ schemaVersion: "laibe.drs-specialist-calendar.v1", caseId: "CASE-7", connectionState: "connected" }, { ...grant(), extra: true }, grant("OTHER"), { ...grant(), grant: { ...grant().grant, timeZone: "UTC" } }, { ...events(), timeZone: "UTC" }, { ...events(), events: [{ title: "會議", startsAt: "2026-08-24T09:00:00+08:00", endsAt: "2026-08-24T10:00:00+08:00", allDay: false, attendees: [] }] }, { ...events(), window: { ...window, timeMax: "2026-08-30T00:00:00+08:00" } }, { state: "authorization_required", authorizationUrl: "javascript:alert(1)" }, { state: "REVOKED", accessToken: "secret" }, { ok: false, code: "SPOOFED_SERVER_BODY" }];
  const transport = await createTransport(async () => jsonResponse(responses.shift()));
  assert.deepEqual(await transport.loadGrant({ expectedCaseId: "CASE-7" }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.loadGrant({ expectedCaseId: "CASE-7" }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.loadGrant({ expectedCaseId: "CASE-7" }), { ok: false, code: "CASE_MISMATCH" });
  assert.deepEqual(await transport.loadGrant({ expectedCaseId: "CASE-7" }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.beginConnection({ mode: "reconnect" }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.revokeConnection(), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await transport.revokeConnection(), { ok: false, code: "INVALID_RESPONSE" });
});

test("calendar transport validates windows and exclusive event chronology before accepting data", async () => {
  let calls = 0;
  const transport = await createTransport(async () => { calls += 1; return jsonResponse(events()); });
  for (const invalidWindow of [{ timeMin: window.timeMax, timeMax: window.timeMin }, { timeMin: "2026-08-01T00:00:00+08:00", timeMax: "2026-09-02T00:00:00+08:00" }, { timeMin: "2026-08-01", timeMax: window.timeMax }]) assert.deepEqual(await transport.loadEvents({ expectedCaseId: "CASE-7", ...invalidWindow }), { ok: false, code: "INVALID_INPUT" });
  assert.equal(calls, 0);
  const invalidEvents = await createTransport(async () => jsonResponse(events("CASE-7", [{ title: "倒置", startsAt: "2026-08-24T10:00:00+08:00", endsAt: "2026-08-24T09:00:00+08:00", allDay: false }])));
  assert.deepEqual(await invalidEvents.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: false, code: "INVALID_RESPONSE" });
  const sameInstant = await createTransport(async () => jsonResponse(events("CASE-7", [{ title: "零長度", startsAt: "2026-08-24T09:00:00+08:00", endsAt: "2026-08-24T09:00:00+08:00", allDay: false }])));
  assert.deepEqual(await sameInstant.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: false, code: "INVALID_RESPONSE" });
  const sameDate = await createTransport(async () => jsonResponse(events("CASE-7", [{ title: "零日", startsAt: "2026-08-24", endsAt: "2026-08-24", allDay: true }])));
  assert.deepEqual(await sameDate.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: false, code: "INVALID_RESPONSE" });
  const allDay = await createTransport(async () => jsonResponse(events("CASE-7", [{ title: "全天施工", startsAt: "2026-08-24", endsAt: "2026-08-25", allDay: true }])));
  assert.deepEqual(await allDay.loadEvents({ expectedCaseId: "CASE-7", ...window }), { ok: true, kind: "events", timeZone: "Asia/Taipei", window, events: [{ title: "全天施工", startsAt: "2026-08-24", endsAt: "2026-08-25", allDay: true }] });
});

test("calendar transport has deterministic invalid JSON, HTTP, network, abort, and input failures", async () => {
  const invalidJson = await createTransport(async () => new Response("not json", { status: 200 }));
  assert.deepEqual(await invalidJson.loadGrant({ expectedCaseId: "CASE-7" }), { ok: false, code: "INVALID_RESPONSE" });
  const http = await createTransport(async () => jsonResponse({ message: "private" }, 403));
  assert.deepEqual(await http.revokeConnection(), { ok: false, code: "HTTP_ERROR" });
  const network = await createTransport(async () => { throw new TypeError("offline"); });
  assert.deepEqual(await network.revokeConnection(), { ok: false, code: "NETWORK_ERROR" });
  const abort = await createTransport(async () => { const error = new Error("cancelled"); error.name = "AbortError"; throw error; });
  assert.deepEqual(await abort.revokeConnection({ signal: new AbortController().signal }), { ok: false, code: "REQUEST_ABORTED" });
  const valid = await createTransport(async () => jsonResponse({ state: "REVOKED" }));
  assert.deepEqual(await valid.beginConnection({ mode: "invalid" }), { ok: false, code: "INVALID_INPUT" });
});
