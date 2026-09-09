import assert from "node:assert/strict";

const STAGES_HEADER = "x-laibe-workspace-stages";
const STAGE_NAMES = ["gate", "auth", "session", "workspace", "shape"];

Deno.test("owner gate reason identifies the closed rejection without request data", async () => {
  const { createOwnerWorkspaceGrantHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  let identityCalls = 0;
  const handler = createOwnerWorkspaceGrantHandler(dependencies({
    resolveAuthenticatedIdentity: () => {
      identityCalls++;
      return Promise.resolve({ userId: USER_ID });
    },
  }));
  const path = "/functions/v1/owner-workspace-grant";
  const bodyRequest = request(path);
  Object.defineProperty(bodyRequest, "body", { value: {} });
  for (
    const [input, reason, status] of [
      [request(path), "OK", 200],
      [request(path, { method: "POST" }), "METHOD", 405],
      [request("/secret-path-canary"), "PATH", 400],
      [request(path + "?secret-query-canary=private"), "QUERY", 400],
      [bodyRequest, "BODY", 400],
      [
        request(path, { headers: { "content-length": "17" } }),
        "CONTENT_LENGTH",
        400,
      ],
      [
        request(path, {
          headers: { "x-secret-name-canary": "secret-value-canary" },
        }),
        "UNAPPROVED_X_HEADER",
        400,
      ],
    ]
  ) {
    const response = await handler(input);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("x-laibe-workspace-gate-reason"), reason);
    assert.doesNotMatch(
      JSON.stringify([...response.headers]),
      /canary|private/,
    );
    if (status !== 200) {
      assert.deepEqual(await response.json(), { state: "INVALID_REQUEST" });
      assert.equal(workspaceStages(response).auth[0], "NOT_REACHED");
    }
  }
  assert.equal(identityCalls, 1);
});

function workspaceStages(response) {
  const header = response.headers.get(STAGES_HEADER);
  assert.equal(typeof header, "string", "owner response carries stage summary");
  assert.ok(header.length <= 512 && /^[\x20-\x7e]+$/.test(header));
  const parts = header.split(";");
  assert.equal(parts.shift(), "v1");
  assert.equal(parts.length, 5);
  return Object.fromEntries(parts.map((part, index) => {
    const match =
      /^(gate|auth|session|workspace|shape)=(NOT_REACHED|PASS|DENIED|UNAVAILABLE|HTTP_ERROR|TRANSPORT_ERROR|INVALID_JSON|INVALID_SHAPE),(0|[1-5][0-9]{2}),(0|[1-9][0-9]*)$/
        .exec(part);
    assert.ok(match, "closed stage grammar");
    assert.equal(match[1], STAGE_NAMES[index]);
    const duration = Number(match[4]);
    assert.ok(duration <= 60000);
    if (match[2] === "NOT_REACHED") {
      assert.equal(`${match[3]},${match[4]}`, "0,0");
    }
    return [match[1], [match[2], Number(match[3]), duration]];
  }));
}

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const CASE_TITLE = "廚房更新決策";
const CASE_CREATE_BODY = JSON.stringify({
  schemaVersion: "laibe.casework-case-create.request.v1",
  title: CASE_TITLE,
  idempotencyKey: "case-create-0001",
});
const APPROVED_X_HEADERS = Object.freeze([
  "x-client-info",
  "x-deno-subhost",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-prefix",
  "x-consumer-id",
  "x-consumer-custom-id",
  "x-consumer-username",
  "x-credential-identifier",
  "x-anonymous-consumer",
  "x-forwarded-proto",
  "x-real-ip",
  "x-request-id",
  "x-supabase-api-version",
]);

function request(path, init = {}) {
  return new Request(`https://example.test${path}`, {
    ...init,
    headers: {
      authorization: "Bearer verified-user-jwt",
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

function dependencies(overrides = {}) {
  return {
    allowedOrigins: Object.freeze([]),
    runtimeAvailable: true,
    resolveAuthenticatedIdentity: () => Promise.resolve({ userId: USER_ID }),
    createCase: () =>
      Promise.resolve({
        ok: true,
        created: true,
        state: "CASE_CREATED",
        case_id: CASE_ID,
        case_status: "active",
        membership_role: "owner",
        membership_status: "active",
        event_id: "33333333-3333-4333-8333-333333333333",
      }),
    resolveWorkspaceGrant: (_userId, role) =>
      Promise.resolve({
        authorized: true,
        state: "AUTHORIZED_CASEWORK_WORKSPACE",
        case_id: CASE_ID,
        case_status: "active",
        case_title: CASE_TITLE,
        account_role: role,
        grant_id: "44444444-4444-4444-8444-444444444444",
        grant_version: 1,
        grant_expires_at: "2026-08-26T12:15:00.000Z",
      }),
    ...overrides,
  };
}

Deno.test("owner gateway route preserves verified workspace and closed request guards", async () => {
  const module = await import("../functions/owner-workspace-grant/index.ts");
  const createRuntime = module.createOwnerWorkspaceGrantRuntimeHandler ??
    module.createOwnerWorkspaceGrantHandler;
  let identityCalls = 0;
  const handler = createRuntime(dependencies({
    resolveAuthenticatedIdentity: () => {
      identityCalls++;
      return Promise.resolve({ userId: USER_ID });
    },
  }));
  const canonical = await handler(
    request("/functions/v1/owner-workspace-grant"),
  );
  const gateway = await handler(request("/owner-workspace-grant"));
  assert.equal(canonical.status, 200);
  assert.equal(
    gateway.status,
    200,
    "The deployed gateway short path must reach the same verified handler",
  );
  assert.equal(await canonical.text(), await gateway.text());
  assert.equal(identityCalls, 2);
  for (
    const [path, init] of [
      ["/owner-workspace-grant?", {}],
      ["/owner-workspace-grant?caseId=guess", {}],
      ["/owner-workspace-grant/", {}],
      ["/vendor-workspace-grant", {}],
      ["/owner-workspace-grant", { headers: { "content-length": "1" } }],
      ["/owner-workspace-grant", {
        headers: { "x-user-id": "caller-authority" },
      }],
    ]
  ) {
    assert.equal((await handler(request(path, init))).status, 400);
  }
  assert.equal(
    identityCalls,
    2,
    "Invalid gateway requests cannot reach identity or grant checks",
  );
});

Deno.test("vendor runtime normalizes transport while retaining verified pro authority", async () => {
  const module = await import("../functions/vendor-workspace-grant/index.ts");
  const createRuntime = module.createVendorWorkspaceGrantRuntimeHandler ??
    module.createVendorWorkspaceGrantHandler;
  let identities = 0;
  let grants = 0;
  const handler = createRuntime(dependencies({
    allowedOrigins: ["https://approved.test"],
    resolveAuthenticatedIdentity(incoming) {
      identities++;
      assert.deepEqual(Object.fromEntries(incoming.headers), {
        apikey: "synthetic-routing-key",
        authorization: "Bearer verified-user-jwt",
        "content-type": "application/json",
      });
      return Promise.resolve({ userId: USER_ID });
    },
    resolveWorkspaceGrant(userId, role) {
      grants++;
      assert.equal(userId, USER_ID);
      assert.equal(role, "pro");
      return dependencies().resolveWorkspaceGrant(userId, role);
    },
  }));
  for (
    const path of [
      "/vendor-workspace-grant",
      "/functions/v1/vendor-workspace-grant",
    ]
  ) {
    const response = await handler(request(path, {
      headers: {
        apikey: "synthetic-routing-key",
        "x-platform-routing-id": "metadata-canary",
        cookie: "cookie-canary",
      },
    }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.state, "AUTHORIZED_VENDOR_WORKSPACE");
    assert.equal(body.authenticatedUserId, USER_ID);
    assert.equal(body.currentCaseId, CASE_ID);
    assert.equal(body.membership.role, "pro");
    assert.equal(body.workspaceAccess.mutationAllowed, false);
    assert.doesNotMatch(
      JSON.stringify([body, [...response.headers]]),
      /canary/,
    );
  }
  for (
    const [path, init, status] of [
      ["/vendor-workspace-grant?caseId=guess", {}, 400],
      ["/vendor-workspace-grant", { method: "POST", body: "{}" }, 405],
      ["/vendor-workspace-grant", { headers: { "content-length": "1" } }, 400],
      ["/vendor-workspace-grant", { headers: { authorization: "" } }, 401],
      ["/vendor-workspace-grant", {
        headers: { origin: "https://unapproved.test" },
      }, 403],
      ...[
        "x-user-id",
        "x-role",
        "x-case-id",
        "x-selected-case",
        "x-laibe-role",
        "x-calendar-id",
        "x-arbitrary-authority",
        "x-authenticated-user-id",
        "x-account-role",
      ].map(
        (name) => ["/vendor-workspace-grant", {
          headers: { [name]: "caller-authority" },
        }, 400],
      ),
    ]
  ) assert.equal((await handler(request(path, init))).status, status);
  assert.equal(identities, 2);
  assert.equal(grants, 2);
  const denied = createRuntime(
    dependencies({
      resolveAuthenticatedIdentity: () => Promise.resolve(null),
      resolveWorkspaceGrant: () => {
        throw new Error("Must not grant without verified identity");
      },
    }),
  );
  assert.equal(
    (await denied(
      request("/vendor-workspace-grant", {
        headers: { "x-platform-routing-id": "metadata" },
      }),
    )).status,
    401,
  );
});

Deno.test("owner runtime discards gateway metadata before verified authority", async () => {
  const { createOwnerWorkspaceGrantRuntimeHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  const incomingHeaders = {
    authorization: "Bearer verified-user-jwt",
    apikey: "synthetic-routing-key",
    "content-type": "application/json",
    "content-length": "0",
    "x-platform-routing-id": "private-platform-canary",
    "x-future-proxy-feature": "private-feature-canary",
    "x-deno-subhost": "private-subhost-canary",
    cookie: "private-cookie-canary",
  };
  let identityCalls = 0;
  let grantCalls = 0;
  const handler = createOwnerWorkspaceGrantRuntimeHandler(dependencies({
    resolveAuthenticatedIdentity(incoming) {
      identityCalls++;
      assert.deepEqual(Object.fromEntries(incoming.headers), {
        apikey: incomingHeaders.apikey,
        authorization: incomingHeaders.authorization,
        "content-length": "0",
        "content-type": "application/json",
      });
      return Promise.resolve({ userId: USER_ID });
    },
    resolveWorkspaceGrant(userId, role) {
      grantCalls++;
      assert.equal(userId, USER_ID);
      assert.equal(role, "owner");
      return dependencies().resolveWorkspaceGrant(userId, role);
    },
  }));
  const response = await handler(request("/owner-workspace-grant", {
    headers: incomingHeaders,
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-laibe-workspace-gate-reason"), "OK");
  const body = await response.json();
  assert.equal(body.authenticatedUserId, USER_ID);
  assert.equal(body.currentCaseId, CASE_ID);
  assert.equal(body.membership.role, "owner");
  assert.equal(body.workspaceAccess.mutationAllowed, false);
  assert.doesNotMatch(JSON.stringify([body, [...response.headers]]), /canary/);
  assert.equal(identityCalls, 1);
  assert.equal(grantCalls, 1);
});

Deno.test("owner runtime retains reserved authority and closed request denials", async () => {
  const { createOwnerWorkspaceGrantRuntimeHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  let identityCalls = 0;
  let grantCalls = 0;
  const handler = createOwnerWorkspaceGrantRuntimeHandler(dependencies({
    allowedOrigins: ["https://approved.test"],
    resolveAuthenticatedIdentity() {
      identityCalls++;
      return Promise.resolve(null);
    },
    resolveWorkspaceGrant() {
      grantCalls++;
      return Promise.resolve(null);
    },
  }));
  for (
    const name of [
      "x-user-id",
      "x-role",
      "x-case-id",
      "x-laibe-role",
      "x-selected-case",
      "x-calendar-id",
      "x-arbitrary-authority",
      "x-authenticated-user-id",
      "x-account-role",
    ]
  ) {
    assert.equal(
      (await handler(request("/owner-workspace-grant", {
        headers: { [name]: "caller-authority" },
      }))).status,
      400,
    );
  }
  for (
    const [path, init, expected] of [
      ["/owner-workspace-grant?caseId=guess", {}, 400],
      ["/owner-workspace-grant", { method: "POST", body: "{}" }, 405],
      ["/owner-workspace-grant", { headers: { "content-length": "1" } }, 400],
      ["/owner-workspace-grant", {
        headers: { origin: "https://unapproved.test" },
      }, 403],
      ["/owner-workspace-grant", { headers: { authorization: "" } }, 401],
    ]
  ) assert.equal((await handler(request(path, init))).status, expected);
  assert.equal(identityCalls, 0);
  const preflight = await handler(request("/owner-workspace-grant", {
    method: "OPTIONS",
    headers: {
      origin: "https://approved.test",
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization,apikey",
    },
  }));
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://approved.test",
  );
  assert.equal(
    (await handler(request("/owner-workspace-grant", {
      headers: { "x-future-platform-tag": "synthetic" },
    }))).status,
    401,
  );
  assert.equal(identityCalls, 1);
  assert.equal(grantCalls, 0);
});

Deno.test("owner observability: grant denials keep the existing business response", async () => {
  const { createOwnerWorkspaceGrantHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  for (
    const [state, status] of [["AUTH_REQUIRED", 401], [
      "CASE_NOT_AUTHORIZED",
      403,
    ], ["CASE_SELECTION_REQUIRED", 409]]
  ) {
    const response = await createOwnerWorkspaceGrantHandler(dependencies({
      resolveWorkspaceGrant: () => Promise.resolve({ state }),
    }))(request("/functions/v1/owner-workspace-grant"));
    assert.equal(response.status, status);
    assert.equal(await response.text(), JSON.stringify({ state }));
    const stages = workspaceStages(response);
    assert.deepEqual(stages.workspace.slice(0, 2), ["PASS", 0]);
    assert.deepEqual(stages.shape.slice(0, 2), ["DENIED", status]);
  }
});

async function readJson(response) {
  return await response.json();
}

Deno.test("owner observability: closed gate responses preserve body status and CORS", async () => {
  const { createOwnerWorkspaceGrantHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  const cases = [
    {
      init: { method: "POST" },
      status: 405,
      state: "INVALID_REQUEST",
      outcome: "DENIED",
    },
    {
      init: { headers: { authorization: "" } },
      status: 401,
      state: "AUTH_REQUIRED",
      outcome: "DENIED",
    },
    {
      init: { headers: { "x-laibe-workspace-stages": "attacker" } },
      status: 400,
      state: "INVALID_REQUEST",
      outcome: "DENIED",
    },
    {
      init: { headers: { origin: "https://unapproved.test" } },
      status: 403,
      state: "CONTEXT_UNAVAILABLE",
      outcome: "DENIED",
    },
    {
      init: {},
      runtimeAvailable: false,
      status: 503,
      state: "CONTEXT_UNAVAILABLE",
      outcome: "UNAVAILABLE",
    },
  ];
  for (const scenario of cases) {
    let calls = 0;
    const handler = createOwnerWorkspaceGrantHandler(dependencies({
      runtimeAvailable: scenario.runtimeAvailable ?? true,
      resolveAuthenticatedIdentity() {
        calls++;
        throw new Error("must not call Auth");
      },
    }));
    const response = await handler(
      request("/functions/v1/owner-workspace-grant", scenario.init),
    );
    assert.equal(response.status, scenario.status);
    assert.equal(
      await response.text(),
      JSON.stringify({ state: scenario.state }),
    );
    const stages = workspaceStages(response);
    assert.deepEqual(stages.gate.slice(0, 2), [
      scenario.outcome,
      scenario.status,
    ]);
    for (const name of STAGE_NAMES.slice(1)) {
      assert.deepEqual(stages[name], ["NOT_REACHED", 0, 0]);
    }
    const headers = new Headers(response.headers);
    headers.delete(STAGES_HEADER);
    headers.delete("x-laibe-workspace-gate-reason");
    assert.deepEqual(Object.fromEntries(headers), {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      vary: "Origin",
    });
    assert.equal(calls, 0);
  }
  const response = await createOwnerWorkspaceGrantHandler(
    dependencies({ allowedOrigins: ["https://approved.test"] }),
  )(
    request("/functions/v1/owner-workspace-grant", {
      method: "OPTIONS",
      headers: {
        origin: "https://approved.test",
        "access-control-request-method": "GET",
      },
    }),
  );
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://approved.test",
  );
  assert.equal(response.headers.has("access-control-expose-headers"), false);
  assert.deepEqual(workspaceStages(response).gate.slice(0, 2), ["PASS", 204]);
});

Deno.test("owner observability: two interleaved owners and vendor keep independent stages", async () => {
  const { createOwnerWorkspaceGrantHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  const { createVendorWorkspaceGrantHandler } = await import(
    "../functions/vendor-workspace-grant/index.ts"
  );
  let releaseFirst;
  let firstEntered;
  const entered = new Promise((resolve) => {
    firstEntered = resolve;
  });
  const waitFirst = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let identityCalls = 0;
  let grantCalls = 0;
  const base = dependencies({
    async resolveAuthenticatedIdentity(_request, observer) {
      identityCalls++;
      if (identityCalls === 1) {
        firstEntered();
        await waitFirst;
        observer?.("auth", "HTTP_ERROR", 503, 7);
        throw new Error("synthetic private details must stay private");
      }
      observer?.("auth", "PASS", 200, 2);
      observer?.("session", "PASS", 200, 3);
      return { userId: USER_ID };
    },
    async resolveWorkspaceGrant(userId, role, observer) {
      grantCalls++;
      if (role === "pro") assert.equal(observer, undefined);
      observer?.("workspace", "PASS", 200, 4);
      return await dependencies().resolveWorkspaceGrant(userId, role);
    },
  });
  const owner = createOwnerWorkspaceGrantHandler(base);
  const first = owner(request("/functions/v1/owner-workspace-grant"));
  await entered;
  const [second, vendor] = await Promise.all([
    owner(request("/functions/v1/owner-workspace-grant")),
    createVendorWorkspaceGrantHandler(base)(
      request("/functions/v1/vendor-workspace-grant"),
    ),
  ]);
  releaseFirst();
  const failed = await first;
  assert.equal(failed.status, 503);
  assert.equal(await failed.text(), '{"state":"CONTEXT_UNAVAILABLE"}');
  const failedStages = workspaceStages(failed);
  assert.deepEqual(failedStages.auth, ["HTTP_ERROR", 503, 7]);
  for (const name of ["session", "workspace", "shape"]) {
    assert.deepEqual(failedStages[name], ["NOT_REACHED", 0, 0]);
  }
  assert.equal(second.status, 200);
  const successful = workspaceStages(second);
  for (const name of STAGE_NAMES) assert.equal(successful[name][0], "PASS");
  assert.equal(vendor.status, 200);
  assert.equal(vendor.headers.has(STAGES_HEADER), false);
  assert.equal(identityCalls, 3);
  assert.equal(grantCalls, 2);
  assert.doesNotMatch(
    second.headers.get(STAGES_HEADER),
    /private|11111111|22222222|Bearer|synthetic/,
  );
});

Deno.test("owner observability: invalid diagnostics cannot enter the wire and durations clamp", async () => {
  const { createOwnerWorkspaceGrantHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  const response = await createOwnerWorkspaceGrantHandler(dependencies({
    resolveAuthenticatedIdentity(_request, observer) {
      observer?.("auth", "untrusted-secret", 200, 1);
      observer?.("untrusted-stage", "PASS", 200, 1);
      observer?.("auth", "PASS", 999, -10);
      observer?.("session", "PASS", 200, 70000);
      return Promise.resolve({ userId: USER_ID });
    },
  }))(request("/functions/v1/owner-workspace-grant"));
  assert.equal(response.status, 200);
  const stages = workspaceStages(response);
  assert.deepEqual(stages.auth, ["PASS", 0, 0]);
  assert.deepEqual(stages.session, ["PASS", 200, 60000]);
  assert.doesNotMatch(response.headers.get(STAGES_HEADER), /untrusted/);
});

Deno.test(
  "focused RED: case create and workspace grants are absent",
  async () => {
    const [
      { createCaseworkCaseCreateHandler },
      { createOwnerWorkspaceGrantHandler },
    ] = await Promise.all([
      import("../functions/casework-case-create/index.ts"),
      import("../functions/owner-workspace-grant/index.ts"),
    ]);
    assert.equal(typeof createCaseworkCaseCreateHandler, "function");
    assert.equal(typeof createOwnerWorkspaceGrantHandler, "function");
  },
);

Deno.test("case create accepts only verified exact POST input", async () => {
  const { createCaseworkCaseCreateHandler, VERIFY_JWT_REQUIRED } = await import(
    "../functions/casework-case-create/index.ts"
  );
  assert.equal(VERIFY_JWT_REQUIRED, true);
  let createCalls = 0;
  const handler = createCaseworkCaseCreateHandler(dependencies({
    createCase(input) {
      createCalls += 1;
      assert.equal(input.authenticatedUserId, USER_ID);
      assert.equal(input.title, "廚房更新決策");
      assert.equal(input.idempotencyKey, "case-create-0001");
      assert.match(input.payloadSha256, /^[a-f0-9]{64}$/u);
      return dependencies().createCase();
    },
  }));
  const response = await handler(request("/functions/v1/casework-case-create", {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: "laibe.casework-case-create.request.v1",
      title: "廚房更新決策",
      idempotencyKey: "case-create-0001",
    }),
  }));
  assert.equal(response.status, 201);
  assert.equal(createCalls, 1);
  const payload = await readJson(response);
  assert.equal(payload.case.id, CASE_ID);
  assert.equal(payload.membership.role, "owner");
  assert.equal(payload.receipt.eventId, "33333333-3333-4333-8333-333333333333");
});

Deno.test("case create rejects caller authority and unknown fields before RPC", async () => {
  const { createCaseworkCaseCreateHandler } = await import(
    "../functions/casework-case-create/index.ts"
  );
  let backendCalls = 0;
  const handler = createCaseworkCaseCreateHandler(dependencies({
    createCase() {
      backendCalls += 1;
      return Promise.resolve(null);
    },
  }));
  for (
    const candidate of [
      { method: "GET" },
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: "laibe.casework-case-create.request.v1",
          title: "有效名稱",
          idempotencyKey: "case-create-0001",
          caseId: CASE_ID,
        }),
      },
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: "laibe.casework-case-create.request.v1",
          title: "有效名稱",
          idempotencyKey: "case-create-0001",
          role: "owner",
        }),
      },
    ]
  ) {
    const response = await handler(
      request("/functions/v1/casework-case-create", candidate),
    );
    assert.ok(response.status === 400 || response.status === 405);
  }
  assert.equal(backendCalls, 0);
});

Deno.test(
  "focused RED rework: duplicate case-create JSON keys stop before identity and RPC",
  async () => {
    const { createCaseworkCaseCreateHandler } = await import(
      "../functions/casework-case-create/index.ts"
    );
    let identityCalls = 0;
    let createCalls = 0;
    const handler = createCaseworkCaseCreateHandler(dependencies({
      resolveAuthenticatedIdentity() {
        identityCalls += 1;
        return Promise.resolve({ userId: USER_ID });
      },
      createCase() {
        createCalls += 1;
        return dependencies().createCase();
      },
    }));
    const duplicateBodies = [
      `{"schemaVersion":"laibe.casework-case-create.request.v1","title":"原始名稱","title":"覆寫名稱","idempotencyKey":"case-create-0001"}`,
      `{"schemaVersion":"laibe.casework-case-create.request.v1","title":"${CASE_TITLE}","idempotencyKey":"case-create-0001","idempotencyKey":"case-create-0002"}`,
      `{"schemaVersion":"laibe.casework-case-create.request.v1","schemaVersion":"laibe.casework-case-create.request.v1","title":"${CASE_TITLE}","idempotencyKey":"case-create-0001"}`,
      `{"schemaVersion":"laibe.casework-case-create.request.v1","title":"原始名稱","\\u0074itle":"覆寫名稱","idempotencyKey":"case-create-0001"}`,
    ];
    const statuses = [];
    for (const body of duplicateBodies) {
      const response = await handler(request(
        "/functions/v1/casework-case-create",
        { method: "POST", body },
      ));
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [400, 400, 400, 400]);
    assert.equal(identityCalls, 0);
    assert.equal(createCalls, 0);
  },
);

Deno.test(
  "focused RED rework: every P1 user route rejects unapproved x headers before authority",
  async () => {
    const [caseRoute, ownerRoute, vendorRoute, highestRoute] = await Promise
      .all([
        import("../functions/casework-case-create/index.ts"),
        import("../functions/owner-workspace-grant/index.ts"),
        import("../functions/vendor-workspace-grant/index.ts"),
        import("../functions/highest-reviewer-workspace-grant/index.ts"),
      ]);
    const routes = [
      {
        createHandler: caseRoute.createCaseworkCaseCreateHandler,
        path: "/functions/v1/casework-case-create",
        init: { method: "POST", body: CASE_CREATE_BODY },
      },
      {
        createHandler: ownerRoute.createOwnerWorkspaceGrantHandler,
        path: "/functions/v1/owner-workspace-grant",
        init: { method: "GET", body: undefined },
      },
      {
        createHandler: vendorRoute.createVendorWorkspaceGrantHandler,
        path: "/functions/v1/vendor-workspace-grant",
        init: { method: "GET", body: undefined },
      },
      {
        createHandler: highestRoute.createHighestReviewerWorkspaceGrantHandler,
        path: "/functions/v1/highest-reviewer-workspace-grant",
        init: { method: "GET", body: undefined },
      },
    ];
    const unapprovedHeaders = [
      "x-case-id",
      "x-selected-case",
      "x-calendar-id",
      "x-arbitrary-authority",
    ];
    const observations = [];
    for (const route of routes) {
      for (const header of unapprovedHeaders) {
        let identityCalls = 0;
        let backendCalls = 0;
        const handler = route.createHandler(dependencies({
          resolveAuthenticatedIdentity() {
            identityCalls += 1;
            return Promise.resolve({ userId: USER_ID });
          },
          createCase() {
            backendCalls += 1;
            return dependencies().createCase();
          },
          resolveWorkspaceGrant(userId, role) {
            backendCalls += 1;
            return dependencies().resolveWorkspaceGrant(userId, role);
          },
        }));
        const response = await handler(request(route.path, {
          ...route.init,
          headers: { [header]: CASE_ID },
        }));
        observations.push({
          path: route.path,
          header,
          status: response.status,
          identityCalls,
          backendCalls,
        });
      }
    }
    assert.equal(observations.length, 16);
    assert.equal(
      observations.every((entry) =>
        entry.status === 400 && entry.identityCalls === 0 &&
        entry.backendCalls === 0
      ),
      true,
      JSON.stringify(observations),
    );
  },
);

Deno.test("approved P1 transport headers never become authority facts", async () => {
  const [caseRoute, ownerRoute, vendorRoute, highestRoute] = await Promise.all([
    import("../functions/casework-case-create/index.ts"),
    import("../functions/owner-workspace-grant/index.ts"),
    import("../functions/vendor-workspace-grant/index.ts"),
    import("../functions/highest-reviewer-workspace-grant/index.ts"),
  ]);
  const routes = [
    {
      createHandler: caseRoute.createCaseworkCaseCreateHandler,
      path: "/functions/v1/casework-case-create",
      init: { method: "POST", body: CASE_CREATE_BODY },
      expectedStatus: 201,
    },
    {
      createHandler: ownerRoute.createOwnerWorkspaceGrantHandler,
      path: "/functions/v1/owner-workspace-grant",
      init: { method: "GET", body: undefined },
      expectedStatus: 200,
    },
    {
      createHandler: vendorRoute.createVendorWorkspaceGrantHandler,
      path: "/functions/v1/vendor-workspace-grant",
      init: { method: "GET", body: undefined },
      expectedStatus: 200,
    },
    {
      createHandler: highestRoute.createHighestReviewerWorkspaceGrantHandler,
      path: "/functions/v1/highest-reviewer-workspace-grant",
      init: { method: "GET", body: undefined },
      expectedStatus: 200,
    },
  ];
  for (const route of routes) {
    for (const header of APPROVED_X_HEADERS) {
      const handler = route.createHandler(dependencies({
        resolveAuthenticatedIdentity(incoming) {
          assert.equal(incoming.headers.get(header), "transport-only");
          return Promise.resolve({ userId: USER_ID });
        },
        createCase(input) {
          assert.deepEqual(Object.keys(input).sort(), [
            "authenticatedUserId",
            "idempotencyKey",
            "payloadSha256",
            "title",
          ]);
          return dependencies().createCase();
        },
        resolveWorkspaceGrant(userId, role) {
          assert.equal(userId, USER_ID);
          assert.ok(["owner", "pro", "highest_reviewer"].includes(role));
          return dependencies().resolveWorkspaceGrant(userId, role);
        },
      }));
      const response = await handler(request(route.path, {
        ...route.init,
        headers: { [header]: "transport-only" },
      }));
      assert.equal(
        response.status,
        route.expectedStatus,
        `${route.path} ${header}`,
      );
    }
  }
});

Deno.test(
  "focused RED rework: actual grant responses resume actual Account Access consumers",
  async () => {
    const [ownerRoute, vendorRoute, accountAccess] = await Promise.all([
      import("../functions/owner-workspace-grant/index.ts"),
      import("../functions/vendor-workspace-grant/index.ts"),
      import(
        "../../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js"
      ),
    ]);
    const ownerHandler = ownerRoute.createOwnerWorkspaceGrantHandler(
      dependencies(),
    );
    const vendorHandler = vendorRoute.createVendorWorkspaceGrantHandler(
      dependencies(),
    );
    const location = { pathname: "/account/access/" };

    const ownerNavigations = [];
    const ownerResult = await accountAccess.resumeAuthorizedSession({
      authRuntime: {
        getSession: () =>
          Promise.resolve({ access_token: "verified-user-jwt" }),
        authenticatedFetch(endpoint, init) {
          assert.equal(endpoint, "owner-workspace-grant");
          return ownerHandler(request(
            "/functions/v1/owner-workspace-grant",
            { ...init, body: undefined },
          ));
        },
      },
      navigate: (path) => ownerNavigations.push(path),
      location,
      roleIntent: "owner",
    });
    assert.deepEqual(ownerResult, { state: "OWNER_GRANTED" });
    assert.deepEqual(ownerNavigations, ["/pcm/owner/workspace/"]);

    const vendorNavigations = [];
    const vendorResult = await accountAccess.resumeVendorSession({
      authRuntime: {
        getSession: () =>
          Promise.resolve({ access_token: "verified-user-jwt" }),
        authenticatedFetch(endpoint, init) {
          assert.equal(endpoint, "vendor-workspace-grant");
          return vendorHandler(request(
            "/functions/v1/vendor-workspace-grant",
            { ...init, body: undefined },
          ));
        },
      },
      navigate: (path) => vendorNavigations.push(path),
      location,
    });
    assert.deepEqual(vendorResult, { state: "VENDOR_GRANTED" });
    assert.deepEqual(vendorNavigations, ["/pcm/vendor/workspace/"]);
  },
);

Deno.test(
  "focused RED rework: case-create replay returns lifecycle denial truth",
  async () => {
    const { createCaseworkCaseCreateHandler } = await import(
      "../functions/casework-case-create/index.ts"
    );
    for (
      const [state, expectedStatus] of [
        ["CASE_ON_HOLD", 409],
        ["CASE_CLOSED", 409],
        ["MEMBERSHIP_REVOKED", 403],
        ["MEMBERSHIP_EXPIRED", 403],
      ]
    ) {
      const handler = createCaseworkCaseCreateHandler(dependencies({
        createCase: () => Promise.resolve({ ok: false, state }),
      }));
      const response = await handler(request(
        "/functions/v1/casework-case-create",
        { method: "POST", body: CASE_CREATE_BODY },
      ));
      assert.equal(response.status, expectedStatus, state);
      assert.deepEqual(await readJson(response), { state });
    }
  },
);

Deno.test("same-key same-payload replay responses remain idempotent", async () => {
  const { createCaseworkCaseCreateHandler } = await import(
    "../functions/casework-case-create/index.ts"
  );
  const handler = createCaseworkCaseCreateHandler(dependencies({
    createCase: () =>
      Promise.resolve({
        ok: true,
        created: false,
        state: "CASE_CREATE_REPLAYED",
        case_id: CASE_ID,
        case_status: "active",
        membership_role: "owner",
        membership_status: "active",
        event_id: "33333333-3333-4333-8333-333333333333",
      }),
  }));
  const responses = await Promise.all([
    handler(request("/functions/v1/casework-case-create", {
      method: "POST",
      body: CASE_CREATE_BODY,
    })),
    handler(request("/functions/v1/casework-case-create", {
      method: "POST",
      body: CASE_CREATE_BODY,
    })),
  ]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.deepEqual(await readJson(responses[0]), await readJson(responses[1]));
});

Deno.test("owner and vendor grants verify identity and expose no internal grant facts", async () => {
  const [ownerRoute, vendorRoute] = await Promise.all([
    import("../functions/owner-workspace-grant/index.ts"),
    import("../functions/vendor-workspace-grant/index.ts"),
  ]);
  assert.equal(ownerRoute.VERIFY_JWT_REQUIRED, true);
  assert.equal(vendorRoute.VERIFY_JWT_REQUIRED, true);
  for (
    const [createHandler, path, expectedRole] of [
      [
        ownerRoute.createOwnerWorkspaceGrantHandler,
        "/functions/v1/owner-workspace-grant",
        "owner",
      ],
      [
        vendorRoute.createVendorWorkspaceGrantHandler,
        "/functions/v1/vendor-workspace-grant",
        "pro",
      ],
    ]
  ) {
    const order = [];
    const handler = createHandler(dependencies({
      resolveAuthenticatedIdentity() {
        order.push("identity");
        return Promise.resolve({ userId: USER_ID });
      },
      resolveWorkspaceGrant(userId, role) {
        order.push("grant");
        assert.equal(userId, USER_ID);
        assert.equal(role, expectedRole);
        return dependencies().resolveWorkspaceGrant(userId, role);
      },
    }));
    const response = await handler(
      request(path, { method: "GET", body: undefined }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(order, ["identity", "grant"]);
    const payload = await readJson(response);
    assert.equal(payload.currentCaseId, CASE_ID);
    assert.equal(payload.membership.role, expectedRole);
    assert.equal(payload.workspaceAccess.role, expectedRole);
    assert.equal(payload.workspaceAccess.mutationAllowed, false);
    assert.equal(payload.workspaceAccess.writeActionsEnabled, false);
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(
      serialized,
      /grantId|grantVersion|grantExpiresAt|serviceRole|serviceKey|bucket|path/iu,
    );
  }
});

Deno.test("workspace grants reject query body and missing identity before resolver", async () => {
  const { createOwnerWorkspaceGrantHandler } = await import(
    "../functions/owner-workspace-grant/index.ts"
  );
  let grantCalls = 0;
  const base = dependencies({
    resolveWorkspaceGrant() {
      grantCalls += 1;
      return Promise.resolve(null);
    },
  });
  const handler = createOwnerWorkspaceGrantHandler(base);
  assert.equal(
    (await handler(
      request("/functions/v1/owner-workspace-grant?caseId=" + CASE_ID, {
        method: "GET",
        body: undefined,
      }),
    )).status,
    400,
  );
  assert.equal(
    (await handler(
      request("/functions/v1/owner-workspace-grant", {
        method: "POST",
        body: "{}",
      }),
    )).status,
    405,
  );
  const noIdentity = createOwnerWorkspaceGrantHandler(dependencies({
    resolveAuthenticatedIdentity: () => Promise.resolve(null),
    resolveWorkspaceGrant() {
      grantCalls += 1;
      return Promise.resolve(null);
    },
  }));
  assert.equal(
    (await noIdentity(
      request("/functions/v1/owner-workspace-grant", {
        method: "GET",
        body: undefined,
      }),
    )).status,
    401,
  );
  assert.equal(grantCalls, 0);
});

Deno.test("highest reviewer remains case-scoped and fail closed without issuer state", async () => {
  const { createHighestReviewerWorkspaceGrantHandler, VERIFY_JWT_REQUIRED } =
    await import("../functions/highest-reviewer-workspace-grant/index.ts");
  assert.equal(VERIFY_JWT_REQUIRED, true);
  const handler = createHighestReviewerWorkspaceGrantHandler(dependencies({
    resolveWorkspaceGrant: () =>
      Promise.resolve({
        authorized: false,
        state: "CASE_NOT_AUTHORIZED",
      }),
  }));
  const response = await handler(request(
    "/functions/v1/highest-reviewer-workspace-grant",
    { method: "GET", body: undefined },
  ));
  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), { state: "CASE_NOT_AUTHORIZED" });
});
