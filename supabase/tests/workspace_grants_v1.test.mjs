import assert from "node:assert/strict";

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
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
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

async function readJson(response) {
  return await response.json();
}

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
