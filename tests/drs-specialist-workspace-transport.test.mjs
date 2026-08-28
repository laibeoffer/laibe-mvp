import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/drs-workspace-transport.js", import.meta.url);
const workspaceEndpoint = "/functions/v1/drs-workspace-grant";
const caseId = "11111111-1111-4111-8111-111111111111";

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function grant(overrides = {}) {
  return {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
    ...overrides,
  };
}

async function createTransport(fetchImplementation, resolveSessionHeaders = async () => ({ authorization: "Bearer a.b.c" })) {
  const { createDrsWorkspaceTransport } = await import(`${moduleUrl.href}?test=${Date.now()}-${Math.random()}`);
  return createDrsWorkspaceTransport({ fetchImplementation, resolveSessionHeaders });
}

test("workspace transport posts exact empty JSON to the fixed same-origin grant and returns only the read-only server grant", async () => {
  const calls = [];
  const transport = await createTransport(async (url, init) => {
    calls.push({ url, ...init });
    return jsonResponse(grant());
  });
  assert.deepEqual(await transport.loadWorkspaceGrant(), {
    ok: true,
    kind: "workspace",
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: { accountRole: "drs", mode: "read_only", mutationAllowed: false, writeActionsEnabled: false },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  });
  assert.deepEqual(calls, [{
    url: workspaceEndpoint,
    method: "POST",
    credentials: "same-origin",
    headers: { authorization: "Bearer a.b.c", "content-type": "application/json" },
    body: "{}",
    signal: undefined,
  }]);
  assert.doesNotMatch(JSON.stringify(calls), /CASE-A7|"(?:caseId|role|specialistId|assignmentId|subject|calendarId|provider|credential|accessToken)"\s*:/u);
});

test("workspace transport fails closed before fetch when the session header is missing, malformed, or broadened", async () => {
  const headers = [
    null,
    {},
    { Authorization: "Bearer a.b.c" },
    { authorization: "Bearer a.b.c", role: "drs" },
    { authorization: "Bearer a.b.c", "x-csrf-token": "not-authorized-here" },
  ];
  for (const value of headers) {
    let calls = 0;
    const transport = await createTransport(async () => {
      calls += 1;
      return jsonResponse(grant());
    }, async () => value);
    assert.deepEqual(await transport.loadWorkspaceGrant(), { ok: false, code: "SESSION_UNAVAILABLE" });
    assert.equal(calls, 0);
  }
});

test("workspace transport rejects extra, private, malformed, or writable response contracts", async () => {
  const responses = [
    grant({ extra: true }),
    grant({ accessToken: "secret" }),
    grant({ case: { id: "CASE-A7", status: "REVIEW_IN_PROGRESS" } }),
    grant({ case: { id: caseId, status: "" } }),
    grant({ workspaceAccess: { accountRole: "owner", mode: "read_only", mutationAllowed: false, writeActionsEnabled: false } }),
    grant({ workspaceAccess: { accountRole: "drs", mode: "write", mutationAllowed: true, writeActionsEnabled: true } }),
    grant({ next: { actor: "owner", action: "REVIEW_AUTHORIZED_CASE_RECORDS" } }),
    grant({ next: { actor: "drs_specialist", action: "MUTATE_CASE" } }),
  ];
  const transport = await createTransport(async () => jsonResponse(responses.shift()));
  for (let index = 0; index < 8; index += 1) {
    assert.deepEqual(await transport.loadWorkspaceGrant(), { ok: false, code: "INVALID_RESPONSE" });
  }
});

test("workspace transport maps abort, invalid JSON, HTTP, network, and invalid configuration without exposing raw errors", async () => {
  const abortTransport = await createTransport(async () => {
    const error = new Error("private abort");
    error.name = "AbortError";
    throw error;
  });
  assert.deepEqual(await abortTransport.loadWorkspaceGrant({ signal: new AbortController().signal }), { ok: false, code: "REQUEST_ABORTED" });

  const invalidJson = await createTransport(async () => new Response("not json", { status: 200 }));
  assert.deepEqual(await invalidJson.loadWorkspaceGrant(), { ok: false, code: "INVALID_RESPONSE" });

  const http = await createTransport(async () => jsonResponse({ private: "detail" }, 403));
  assert.deepEqual(await http.loadWorkspaceGrant(), { ok: false, code: "HTTP_ERROR" });

  const network = await createTransport(async () => {
    throw new TypeError("private network detail");
  });
  assert.deepEqual(await network.loadWorkspaceGrant(), { ok: false, code: "NETWORK_ERROR" });

  const { createDrsWorkspaceTransport } = await import(`${moduleUrl.href}?test=config-${Date.now()}`);
  assert.throws(() => createDrsWorkspaceTransport({ fetchImplementation: null, resolveSessionHeaders: async () => ({ authorization: "Bearer a.b.c" }) }), TypeError);
  assert.throws(() => createDrsWorkspaceTransport({ fetchImplementation: async () => jsonResponse(grant()), resolveSessionHeaders: null }), TypeError);
  assert.throws(() => createDrsWorkspaceTransport({ fetchImplementation: async () => jsonResponse(grant()), resolveSessionHeaders: async () => ({ authorization: "Bearer a.b.c" }), endpoint: "https://attacker.invalid" }), TypeError);
});

test("focused RED: accepted workspace grant is the only specialist case projection and document routes stay closed", async () => {
  const calls = [];
  const transport = await createTransport(async (url, init) => {
    calls.push({ url, ...init });
    return jsonResponse(grant());
  });
  const workspaceGrant = await transport.loadWorkspaceGrant();
  const { mapWorkspaceGrantToSpecialistProjection } = await import(`${moduleUrl.href}?projection=${Date.now()}-${Math.random()}`);

  assert.equal(typeof mapWorkspaceGrantToSpecialistProjection, "function");
  assert.deepEqual(mapWorkspaceGrantToSpecialistProjection(workspaceGrant), {
    ok: true,
    kind: "specialist-workspace-projection",
    schemaVersion: "laibe.drs-specialist-workspace-projection.v1",
    authority: { state: "authorized", mode: "read_only", label: "已確認案件檢視權限" },
    case: {
      id: caseId,
      status: "REVIEW_IN_PROGRESS",
      label: "已授權案件",
      statusLabel: "審查進行中",
    },
    documents: { state: "pending", label: "尚未取得正式文件", items: [] },
    next: {
      actor: "drs_specialist",
      actorLabel: "DRS 專員",
      action: "REVIEW_AUTHORIZED_CASE_RECORDS",
      actionLabel: "先核對文件來源與版本；正式文件資料尚未取得前，審查與送出維持停用。",
    },
  });
  assert.deepEqual(mapWorkspaceGrantToSpecialistProjection({ ok: true, case: { id: caseId } }), { ok: false, code: "INVALID_RESPONSE" });
  assert.deepEqual(calls.map((call) => call.url), [workspaceEndpoint]);
  assert.doesNotMatch(JSON.stringify(calls), /\/api\/drs\/(?:documents|document-versions|document-snapshots)/u);
});
