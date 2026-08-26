import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const moduleUrl = new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/app.js", import.meta.url);
const workspaceTransportUrl = new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/drs-workspace-transport.js", import.meta.url);
const caseId = "11111111-1111-4111-8111-111111111111";
const windowRange = Object.freeze({
  timeMin: "2026-08-24T00:00:00+08:00",
  timeMax: "2026-08-31T00:00:00+08:00",
});
const event = Object.freeze({
  title: "圖面確認",
  startsAt: "2026-08-24T09:00:00+08:00",
  endsAt: "2026-08-24T10:00:00+08:00",
  allDay: false,
});

function rootStub() {
  return {
    body: { dataset: {} },
    location: { search: "?ready=1&caseId=CASE-A7#case=CASE-A7" },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

async function loadIntegrationFactory() {
  const previousDocument = globalThis.document;
  globalThis.document = rootStub();
  try {
    const module = await import(`${moduleUrl.href}?test=${Date.now()}-${Math.random()}`);
    return module.createSpecialistCalendarIntegration;
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

function workspaceGrant(id = caseId) {
  return {
    ok: true,
    kind: "workspace",
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: { accountRole: "drs", mode: "read_only", mutationAllowed: false, writeActionsEnabled: false },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };
}

test("calendar integration derives expectedCaseId only from the workspace grant and loads grant before events", async () => {
  const calls = [];
  const createSpecialistCalendarIntegration = await loadIntegrationFactory();
  const integration = createSpecialistCalendarIntegration({
    workspaceTransport: {
      async loadWorkspaceGrant() {
        calls.push(["workspace"]);
        return workspaceGrant();
      },
    },
    calendarTransport: {
      async loadGrant(input) {
        calls.push(["calendar-grant", input]);
        return { ok: true, kind: "grant", state: "READY", accessMode: "read_only", connectionStatus: "connected", timeZone: "Asia/Taipei" };
      },
      async loadEvents(input) {
        calls.push(["calendar-events", input]);
        return { ok: true, kind: "events", timeZone: "Asia/Taipei", window: windowRange, events: [event] };
      },
      async beginConnection() { throw new Error("not used in initialization"); },
      async revokeConnection() { throw new Error("not used in initialization"); },
    },
    navigate: () => {
      throw new Error("navigation is not part of initialization");
    },
  });

  assert.deepEqual(await integration.initialize(windowRange), { ok: true });
  assert.deepEqual(calls, [
    ["workspace"],
    ["calendar-grant", { expectedCaseId: caseId, signal: undefined }],
    ["calendar-events", { expectedCaseId: caseId, ...windowRange, signal: undefined }],
  ]);
  assert.deepEqual(integration.getState(), {
    workspaceCaseId: caseId,
    workspaceStatus: "REVIEW_IN_PROGRESS",
    calendarState: "connected",
    timeZone: "Asia/Taipei",
    window: windowRange,
    events: [event],
  });
  assert.doesNotMatch(JSON.stringify(calls), /CASE-A7/u);
});

test("calendar integration purges prior case and event data on workspace, calendar, or cross-case failure", async () => {
  let workspaceResult = workspaceGrant();
  const calendarResults = [
    { ok: true, kind: "grant", state: "READY", accessMode: "read_only", connectionStatus: "connected", timeZone: "Asia/Taipei" },
    { ok: false, code: "CASE_MISMATCH" },
  ];
  const createSpecialistCalendarIntegration = await loadIntegrationFactory();
  const integration = createSpecialistCalendarIntegration({
    workspaceTransport: { async loadWorkspaceGrant() { return workspaceResult; } },
    calendarTransport: {
      async loadGrant() { return calendarResults.shift(); },
      async loadEvents() { return { ok: true, kind: "events", timeZone: "Asia/Taipei", window: windowRange, events: [event] }; },
      async beginConnection() { throw new Error("not used in initialization"); },
      async revokeConnection() { throw new Error("not used in initialization"); },
    },
    navigate: () => {},
  });

  assert.deepEqual(await integration.initialize(windowRange), { ok: true });
  assert.equal(integration.getState().events.length, 1);

  workspaceResult = { ok: false, code: "SESSION_UNAVAILABLE" };
  assert.deepEqual(await integration.initialize(windowRange), { ok: false, code: "SESSION_UNAVAILABLE" });
  assert.deepEqual(integration.getState(), {
    workspaceCaseId: null,
    workspaceStatus: null,
    calendarState: "unavailable",
    timeZone: null,
    window: null,
    events: [],
  });

  workspaceResult = workspaceGrant("22222222-2222-4222-8222-222222222222");
  assert.deepEqual(await integration.initialize(windowRange), { ok: false, code: "CASE_MISMATCH" });
  assert.deepEqual(integration.getState().events, []);
  assert.equal(integration.getState().calendarState, "unavailable");
});

test("calendar integration requires an authorized workspace for Human connect and revoke actions and navigates only to a validated Google URL", async () => {
  const navigations = [];
  let connectionResult = { ok: true, kind: "connection", state: "OAUTH_REDIRECT_REQUIRED", authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque" };
  const createSpecialistCalendarIntegration = await loadIntegrationFactory();
  const calendarTransport = {
    async loadGrant() { return { ok: false, code: "INVALID_RESPONSE" }; },
    async loadEvents() { throw new Error("events must not load without a calendar grant"); },
    async beginConnection() { return connectionResult; },
    async revokeConnection() { return { ok: true, kind: "connection", state: "REVOKED" }; },
  };
  const integration = createSpecialistCalendarIntegration({
    workspaceTransport: { async loadWorkspaceGrant() { return workspaceGrant(); } },
    calendarTransport,
    navigate: (url) => navigations.push(url),
  });

  assert.deepEqual(await integration.connect(), { ok: false, code: "WORKSPACE_UNAVAILABLE" });
  assert.deepEqual(await integration.revoke(), { ok: false, code: "WORKSPACE_UNAVAILABLE" });

  assert.deepEqual(await integration.initialize(windowRange), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(await integration.connect(), { ok: true, state: "OAUTH_REDIRECT_REQUIRED" });
  assert.deepEqual(navigations, ["https://accounts.google.com/o/oauth2/v2/auth?state=opaque"]);

  connectionResult = { ok: true, kind: "connection", state: "OAUTH_REDIRECT_REQUIRED", authorizationUrl: "javascript:alert(1)" };
  assert.deepEqual(await integration.reconnect(), { ok: false, code: "INVALID_RESPONSE" });
  assert.equal(navigations.length, 1);

  assert.deepEqual(await integration.revoke(), { ok: true, state: "REVOKED" });
  assert.equal(integration.getState().calendarState, "disconnected");
  assert.deepEqual(integration.getState().events, []);
});

test("specialist workspace exposes a truthful calendar state shell without static event or connection claims", async () => {
  const [html, css, app, workspaceTransport] = await Promise.all([
    readFile(new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/code.html", import.meta.url), "utf8"),
    readFile(new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/styles.css", import.meta.url), "utf8"),
    readFile(moduleUrl, "utf8"),
    readFile(workspaceTransportUrl, "utf8"),
  ]);
  const calendarSection = html.match(/<section class="case-calendar-workspace"[\s\S]*?<\/section>/u)?.[0] ?? "";

  assert.match(calendarSection, /data-drs-calendar-state="loading"/u);
  assert.match(calendarSection, /data-drs-calendar-status/u);
  assert.match(calendarSection, /data-drs-calendar-events/u);
  assert.match(calendarSection, /data-drs-calendar-empty/u);
  assert.match(calendarSection, /data-drs-calendar-action="connect"/u);
  assert.match(calendarSection, /data-drs-calendar-action="reconnect"/u);
  assert.match(calendarSection, /data-drs-calendar-action="revoke"/u);
  assert.doesNotMatch(calendarSection, /calendar-grid|乙方送出 v2|圖面回覆|報價修訂|替代材料待確認/u);

  assert.match(css, /\.calendar-access-state/u);
  assert.match(css, /\[data-drs-calendar-state="connected"\]/u);
  assert.match(css, /\.calendar-event-list/u);
  assert.match(app, /createDrsSessionHeadersResolver/u);
  assert.match(app, /createDrsWorkspaceTransport/u);
  assert.match(app, /createSpecialistCalendarTransport/u);
  assert.match(workspaceTransport, /\/functions\/v1\/drs-workspace-grant/u);
  assert.match(app, /\/functions\/v1\/drs-google-calendar-grant/u);
  assert.match(app, /\/functions\/v1\/drs-google-calendar-events-read/u);
  assert.match(app, /\/functions\/v1\/drs-google-calendar-oauth-start/u);
  assert.match(app, /\/functions\/v1\/drs-google-calendar-revoke/u);
  assert.doesNotMatch(app, /localStorage|sessionStorage|window\.__|location\.search/u);
});
