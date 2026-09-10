import { createHighestReviewerGovernanceHandler } from "./handler.ts";
import { base64url } from "../drs-auth/auth-bound-session.ts";

const SCHEMA = "laibe.drs-highest-reviewer-governance.v1";
const PROJECT = "https://synthetic-highest.supabase.co";
const ORIGIN = "https://synthetic-drs.example";
const SERVICE = "synthetic-service-key-at-least-32-characters";
const NOW = Date.parse("2026-09-10T12:00:00Z");
const DATE = "2026-09-10T12:00:00.000Z", UNTIL = "2027-09-10T12:00:00Z";
const U = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";
const G = "44444444-4444-4444-8444-444444444444";
const D = "55555555-5555-4555-8555-555555555555";
const K = "66666666-6666-4666-8666-666666666666";
type Operation = "candidates" | "role-decision";
function assert(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label);
}
function equal(actual: unknown, expected: unknown, label = "exact value") {
  const ordered = (x: unknown): unknown =>
    x && typeof x === "object"
      ? Array.isArray(x) ? x.map(ordered) : Object.fromEntries(
        Object.entries(x).sort().map(([k, v]) => [k, ordered(v)]),
      )
      : x;
  assert(
    JSON.stringify(ordered(actual)) === JSON.stringify(ordered(expected)),
    label,
  );
}
const input = {
  subject: {
    authBindingId: B,
    bindingVersion: 3,
    grantId: null,
    expectedGrantVersion: null,
  },
  decision: "grant",
  reason: "負責申請治理與交叉覆核",
  idempotencyKey: K,
};
const candidate = {
  candidateKey: B,
  displayName: "審查員",
  accountEmail: "verified@example.invalid",
  subject: {
    authBindingId: B,
    bindingVersion: 3,
    grantId: null,
    grantVersion: null,
  },
  qualification: { state: "active", validUntil: UNTIL },
  governanceGrant: { state: "never_granted", validUntil: null },
  effectiveHighestReviewer: false,
  availableAction: "grant",
};
const list = {
  schemaVersion: SCHEMA,
  state: "HIGHEST_REVIEWER_CANDIDATES_READY",
  candidates: [candidate],
  nextCursor: null,
};
const receipt = {
  schemaVersion: SCHEMA,
  state: "HIGHEST_REVIEWER_GRANTED",
  subject: { authBindingId: B, bindingVersion: 3, grantId: G, grantVersion: 1 },
  decision: { decisionId: D, outcome: "grant", decidedAt: DATE },
  governanceGrant: { state: "active", validUntil: UNTIL },
  caseAccessChanged: false,
  replayed: false,
};
function fixture(
  operation: Operation,
  reply: unknown = operation === "candidates" ? list : receipt,
) {
  const state = {
    live: true,
    clock: NOW,
    authStatus: 200,
    authId: U,
    fault: "",
    rpcStatus: 200,
    contentType: "application/json",
    raw: null as string | null,
    calls: [] as {
      path: string;
      body: Record<string, unknown>;
      init?: RequestInit;
    }[],
  };
  const enc = (x: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(x)));
  const jwt = enc({ alg: "HS256" }) + "." + enc({
    sub: U,
    session_id: S,
    iss: PROJECT + "/auth/v1",
    aud: "authenticated",
    exp: NOW / 1000 + 300,
  }) + ".c3ludGhldGlj";
  const env: Record<string, string> = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE,
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
  };
  const handler = createHighestReviewerGovernanceHandler(operation, {
    env: { get: (n: string) => env[n] },
    now: () => state.clock,
    fetch: async (url: string | URL | Request, init?: RequestInit) => {
      await Promise.resolve();
      const path = new URL(String(url)).pathname;
      if (path === "/auth/v1/user") {
        return Response.json({ id: state.authId }, {
          status: state.authStatus,
        });
      }
      if (path.endsWith("/auth_session_validation_v1")) {
        return Response.json({
          schemaVersion: "laibe.auth-session-validation.v1",
          active: state.live,
        });
      }
      state.calls.push({ path, body: JSON.parse(String(init?.body)), init });
      if (state.fault === "throw") {
        throw new Error("private-provider-detail " + SERVICE);
      }
      if (state.fault === "timeout") {
        throw new DOMException("private-provider-detail", "TimeoutError");
      }
      if (state.fault === "expired") state.clock = NOW + 301000;
      return new Response(state.raw ?? JSON.stringify(reply), {
        status: state.rpcStatus,
        headers: { "content-type": state.contentType },
      });
    },
  });
  const request = (
    body: unknown = operation === "candidates" ? { cursor: null } : input,
    change: RequestInit = {},
    suffix = "",
  ) =>
    new Request(
      PROJECT + "/functions/v1/drs-highest-reviewer-" + operation + suffix,
      {
        method: "POST",
        headers: {
          origin: ORIGIN,
          authorization: "Bearer " + jwt,
          "content-type": "application/json",
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
        ...change,
      },
    );
  return { handler, request, state, jwt, env };
}
async function expectError(response: Response, status: number, state: string) {
  equal(response.status, status, state + " HTTP");
  equal(
    await response.json(),
    { schemaVersion: SCHEMA, state },
    state + " exact envelope",
  );
  equal(response.headers.get("cache-control"), "no-store");
}
for (const operation of ["candidates", "role-decision"] as const) {
  Deno.test(
    operation +
      " strictly bounds method, media type, origin, URL, preflight and 4KiB",
    async () => {
      for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
        const f = fixture(operation);
        await expectError(
          await f.handler(f.request(undefined, { method, body: undefined })),
          400,
          "INVALID_REQUEST",
        );
        equal(f.state.calls.length, 0);
      }
      for (
        const headers of [
          { origin: ORIGIN, "content-type": "text/plain" },
          {
            origin: "https://wrong.example",
            "content-type": "application/json",
          },
          { "content-type": "application/json" },
        ]
      ) {
        const f = fixture(operation);
        await expectError(
          await f.handler(f.request(undefined, { headers })),
          400,
          "INVALID_REQUEST",
        );
        equal(f.state.calls.length, 0);
      }
      const f = fixture(operation);
      for (
        const suffix of ["?", "?email=private@example.invalid", "#x", "/wrong"]
      ) {
        await expectError(
          await f.handler(f.request(undefined, {}, suffix)),
          400,
          "INVALID_REQUEST",
        );
      }
      const raw = JSON.stringify(
        operation === "candidates" ? { cursor: null } : input,
      );
      const padded = raw +
        " ".repeat(4096 - new TextEncoder().encode(raw).length);
      equal(
        (await f.handler(f.request(padded))).status,
        200,
        "4096 byte request accepted",
      );
      await expectError(
        await f.handler(f.request(padded + " ")),
        400,
        "INVALID_REQUEST",
      );
      for (
        const rawBody of [
          "",
          "{",
          "null",
          "[]",
          '{"cursor":null,"cursor":null}',
        ]
      ) {
        await expectError(
          await f.handler(f.request(rawBody)),
          400,
          "INVALID_REQUEST",
        );
      }
      const preflight = f.request(undefined, {
        method: "OPTIONS",
        body: undefined,
        headers: {
          origin: ORIGIN,
          "access-control-request-method": "POST",
          "access-control-request-headers":
            "authorization, content-type, apikey",
        },
      });
      equal((await f.handler(preflight)).status, 204);
      await expectError(
        await f.handler(
          f.request(undefined, {
            method: "OPTIONS",
            body: undefined,
            headers: {
              origin: ORIGIN,
              "access-control-request-method": "DELETE",
            },
          }),
        ),
        400,
        "INVALID_REQUEST",
      );
    },
  );
  Deno.test(
    operation + " rejects all browser authority fields before RPC",
    async () => {
      const base = operation === "candidates" ? { cursor: null } : input;
      for (
        const key of [
          "ownerId",
          "ownerUserId",
          "actorUserId",
          "subjectUserId",
          "specialistId",
          "role",
          "operation",
          "scope",
          "validUntil",
          "caseId",
          "canManageHighestReviewers",
          "canReviewRegistrations",
          "p_owner_user_id",
        ]
      ) {
        const f = fixture(operation);
        await expectError(
          await f.handler(f.request({ ...base, [key]: U })),
          400,
          "INVALID_REQUEST",
        );
        equal(f.state.calls.length, 0);
      }
    },
  );
  Deno.test(
    operation + " requires verified bearer and live unexpired server session",
    async () => {
      for (
        const token of [
          null,
          "",
          "Basic test",
          "Bearer malformed",
          "Bearer a.b.c",
          "Bearer undefined",
        ]
      ) {
        const f = fixture(operation),
          headers = new Headers(f.request().headers);
        if (token === null) headers.delete("authorization");
        else headers.set("authorization", token);
        await expectError(
          await f.handler(f.request(undefined, { headers })),
          401,
          "AUTH_REQUIRED",
        );
        equal(f.state.calls.length, 0);
      }
      for (
        const mode of [
          "inactive",
          "expired",
          "wrongUser",
          "authDenied",
          "authUnavailable",
        ]
      ) {
        const f = fixture(operation);
        if (mode === "inactive") f.state.live = false;
        if (mode === "expired") f.state.clock = NOW + 301000;
        if (mode === "wrongUser") f.state.authId = B;
        if (mode === "authDenied") f.state.authStatus = 401;
        if (mode === "authUnavailable") f.state.authStatus = 503;
        await expectError(
          await f.handler(f.request()),
          mode === "authUnavailable" ? 503 : 401,
          mode === "authUnavailable"
            ? "TEMPORARILY_UNAVAILABLE"
            : "AUTH_REQUIRED",
        );
        equal(f.state.calls.length, 0);
      }
    },
  );
  Deno.test(
    operation + " forwards only verified identity into one matching RPC",
    async () => {
      const f = fixture(operation);
      const response = await f.handler(f.request());
      equal(response.status, 200);
      equal(await response.json(), operation === "candidates" ? list : receipt);
      equal(f.state.calls.length, 1);
      equal(
        f.state.calls[0].path,
        "/rest/v1/rpc/drs_highest_reviewer_" + operation.replaceAll("-", "_") +
          "_v1",
      );
      equal(f.state.calls[0].body, {
        p_owner_user_id: U,
        p_auth_session_id: S,
        p_jwt_expires_at: "2026-09-10T12:05:00.000Z",
        ...(operation === "candidates"
          ? { p_cursor_sort_key: null, p_cursor_candidate_key: null }
          : {
            p_auth_binding_id: B,
            p_binding_version: 3,
            p_grant_id: null,
            p_expected_grant_version: null,
            p_decision: "grant",
            p_reason: input.reason,
            p_idempotency_key: K,
          }),
      });
      equal(f.state.calls[0].init?.redirect, "error");
      assert(
        f.state.calls[0].init?.signal instanceof AbortSignal,
        "RPC timeout signal required",
      );
      equal(response.headers.get("access-control-allow-origin"), ORIGIN);
      equal(response.headers.get("cache-control"), "no-store");
    },
  );
  Deno.test(operation + " maps only finite exact error envelopes", async () => {
    for (
      const [state, status] of Object.entries({
        INVALID_REQUEST: 400,
        AUTH_REQUIRED: 401,
        GOVERNANCE_OWNER_NOT_AUTHORIZED: 403,
        REVIEWER_QUALIFICATION_CONFLICT: 409,
        HIGHEST_REVIEWER_GRANT_CONFLICT: 409,
        LEGACY_GRANT_RECONCILIATION_REQUIRED: 409,
        IDEMPOTENCY_CONFLICT: 409,
        TEMPORARILY_UNAVAILABLE: 503,
      })
    ) {
      const f = fixture(operation, { schemaVersion: SCHEMA, state });
      await expectError(await f.handler(f.request()), status, state);
    }
    for (
      const upstream of [
        { state: "AUTH_REQUIRED" },
        { schemaVersion: SCHEMA, state: "SQL_ERROR" },
        { schemaVersion: SCHEMA, state: "AUTH_REQUIRED", detail: SERVICE },
        { schemaVersion: "wrong", state: "AUTH_REQUIRED" },
      ]
    ) {
      const f = fixture(operation, upstream);
      await expectError(
        await f.handler(f.request()),
        503,
        "TEMPORARILY_UNAVAILABLE",
      );
    }
  });
  Deno.test(
    operation +
      " collapses transport, upstream shape, timeout and exception without logs or secrets",
    async () => {
      const log: unknown[] = [],
        saved = { log: console.log, error: console.error, warn: console.warn };
      console.log = console.error = console.warn = (...args: unknown[]) => {
        log.push(args);
      };
      try {
        for (
          const mode of [
            "throw",
            "timeout",
            "rpcError",
            "html",
            "invalidJson",
            "duplicate",
            "oversize",
          ]
        ) {
          const f = fixture(operation);
          if (mode === "throw" || mode === "timeout") f.state.fault = mode;
          if (mode === "rpcError") f.state.rpcStatus = 500;
          if (mode === "html") f.state.contentType = "text/html";
          if (mode === "invalidJson") {
            f.state.raw = "private-provider-detail " + SERVICE;
          }
          if (mode === "duplicate") {
            f.state.raw =
              `{"schemaVersion":"${SCHEMA}","state":"AUTH_REQUIRED","state":"AUTH_REQUIRED"}`;
          }
          if (mode === "oversize") f.state.raw = " ".repeat(65537);
          await expectError(
            await f.handler(f.request()),
            503,
            "TEMPORARILY_UNAVAILABLE",
          );
        }
        equal(log, [], "No sensitive or upstream logging");
      } finally {
        Object.assign(console, saved);
      }
      const f = fixture(operation);
      f.state.fault = "expired";
      await expectError(await f.handler(f.request()), 401, "AUTH_REQUIRED");
    },
  );
}
Deno.test("candidates exact cursor bounds and ordering input are not authority", async () => {
  for (
    const cursor of [
      {},
      [],
      "x",
      { sortKey: "x" },
      { sortKey: null, candidateKey: B },
      { sortKey: "x".repeat(321), candidateKey: B },
      { sortKey: "a", candidateKey: "not-uuid" },
      { sortKey: "a", candidateKey: B, role: "owner" },
    ]
  ) {
    const f = fixture("candidates");
    await expectError(
      await f.handler(f.request({ cursor })),
      400,
      "INVALID_REQUEST",
    );
    equal(f.state.calls.length, 0);
  }
  for (const body of [{}, { cursor: null, extra: true }]) {
    const f = fixture("candidates");
    await expectError(await f.handler(f.request(body)), 400, "INVALID_REQUEST");
  }
  const f = fixture("candidates", {
    ...list,
    state: "NO_ELIGIBLE_REVIEWERS",
    candidates: [],
  });
  equal(
    (await f.handler(
      f.request({ cursor: { sortKey: "x".repeat(320), candidateKey: B } }),
    )).status,
    200,
  );
  equal(f.state.calls[0].body.p_cursor_sort_key, "x".repeat(320));
});
Deno.test("decision exact required nullable keys, UUIDs, versions and Unicode reason", async () => {
  const bad: unknown[] = [null, {}, [], { ...input, decision: "approve" }, {
    ...input,
    idempotencyKey: "bad",
  }];
  for (const key of Object.keys(input)) {
    const x = structuredClone(input) as Record<string, unknown>;
    delete x[key];
    bad.push(x);
  }
  for (const key of Object.keys(input.subject)) {
    const subject = { ...input.subject } as Record<string, unknown>;
    delete subject[key];
    bad.push({ ...input, subject });
  }
  for (
    const subject of [
      null,
      {},
      { ...input.subject, extra: U },
      { ...input.subject, authBindingId: null },
      { ...input.subject, authBindingId: "bad" },
      { ...input.subject, bindingVersion: null },
      { ...input.subject, grantId: G },
      { ...input.subject, expectedGrantVersion: 1 },
      { ...input.subject, grantId: "bad", expectedGrantVersion: 1 },
    ]
  ) bad.push({ ...input, subject });
  for (const version of [-1, 0, 1.5, "3", Number.MAX_SAFE_INTEGER + 1]) {
    bad.push({
      ...input,
      subject: { ...input.subject, bindingVersion: version },
    });
  }
  for (const version of [-1, 1.5, "3", Number.MAX_SAFE_INTEGER + 1]) {
    bad.push({
      ...input,
      subject: { ...input.subject, grantId: G, expectedGrantVersion: version },
    });
  }
  for (const reason of ["", " ", " x", "x ", "x\n", "x".repeat(501), null, 1]) {
    bad.push({ ...input, reason });
  }
  bad.push({ ...input, decision: "revoke" });
  for (const body of bad) {
    const f = fixture("role-decision");
    await expectError(await f.handler(f.request(body)), 400, "INVALID_REQUEST");
    equal(f.state.calls.length, 0);
  }
  for (const reason of ["a", "😀".repeat(500), "第一項依據\n第二項依據"]) {
    const f = fixture("role-decision");
    equal((await f.handler(f.request({ ...input, reason }))).status, 200);
  }
  const f = fixture("role-decision", {
    schemaVersion: SCHEMA,
    state: "LEGACY_GRANT_RECONCILIATION_REQUIRED",
  });
  await expectError(
    await f.handler(
      f.request({
        ...input,
        decision: "revoke",
        subject: {
          authBindingId: null,
          bindingVersion: null,
          grantId: G,
          expectedGrantVersion: 0,
        },
      }),
    ),
    409,
    "LEGACY_GRANT_RECONCILIATION_REQUIRED",
  );
});
function mutations(value: Record<string, unknown>): unknown[] {
  const all: unknown[] = [{ ...value, extra: "private-provider-detail" }];
  for (const [key, child] of Object.entries(value)) {
    const missing = structuredClone(value);
    delete missing[key];
    all.push(missing);
    if (child && typeof child === "object" && !Array.isArray(child)) {
      for (const invalid of mutations(child as Record<string, unknown>)) {
        all.push({ ...value, [key]: invalid });
      }
    }
  }
  return all;
}
Deno.test("success objects reject every extra or missing key recursively", async () => {
  for (
    const reply of [
      ...mutations(list),
      ...mutations(candidate).map((c) => ({ ...list, candidates: [c] })),
    ]
  ) {
    const f = fixture("candidates", reply);
    await expectError(
      await f.handler(f.request()),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
  }
  for (const reply of mutations(receipt)) {
    const f = fixture("role-decision", reply);
    await expectError(
      await f.handler(f.request()),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
  }
});
Deno.test("candidates enforce all field types and finite discriminants", async () => {
  const rows = [
    { ...candidate, candidateKey: "bad" },
    { ...candidate, displayName: 1 },
    { ...candidate, displayName: null },
    { ...candidate, accountEmail: null },
    { ...candidate, accountEmail: 1 },
    { ...candidate, effectiveHighestReviewer: "false" },
    { ...candidate, effectiveHighestReviewer: true },
    { ...candidate, availableAction: "admin" },
    { ...candidate, subject: { ...candidate.subject, authBindingId: null } },
    { ...candidate, subject: { ...candidate.subject, bindingVersion: 0 } },
    { ...candidate, subject: { ...candidate.subject, grantId: G } },
    { ...candidate, subject: { ...candidate.subject, grantVersion: 0 } },
    { ...candidate, qualification: { state: "unknown", validUntil: UNTIL } },
    { ...candidate, qualification: { state: "active", validUntil: null } },
    {
      ...candidate,
      qualification: { state: "active", validUntil: "2026-02-30T12:00:00Z" },
    },
    { ...candidate, governanceGrant: { state: "unknown", validUntil: null } },
    {
      ...candidate,
      governanceGrant: { state: "never_granted", validUntil: UNTIL },
    },
  ];
  for (const row of rows) {
    const f = fixture("candidates", { ...list, candidates: [row] });
    await expectError(
      await f.handler(f.request()),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
  }
  for (
    const reply of [
      { ...list, state: "NO_ELIGIBLE_REVIEWERS" },
      { ...list, candidates: [] },
      { ...list, candidates: Array(26).fill(candidate) },
      { ...list, nextCursor: {} },
      { ...list, nextCursor: { sortKey: "wrong", candidateKey: B } },
    ]
  ) {
    const f = fixture("candidates", reply);
    await expectError(
      await f.handler(f.request()),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
  }
});
Deno.test("historical resolved and unresolved candidates retain exact nullable identities", async () => {
  const unresolved = {
    candidateKey: G,
    displayName: null,
    accountEmail: null,
    subject: {
      authBindingId: null,
      bindingVersion: null,
      grantId: G,
      grantVersion: 4,
    },
    qualification: { state: "unresolved", validUntil: null },
    governanceGrant: { state: "legacy_identity_unresolved", validUntil: null },
    effectiveHighestReviewer: false,
    availableAction: "reconciliation_required",
  };
  const resolved = {
    ...candidate,
    displayName: null,
    accountEmail: null,
    subject: { ...candidate.subject, grantId: G, grantVersion: 3 },
    qualification: { state: "inactive", validUntil: UNTIL },
    governanceGrant: { state: "active", validUntil: UNTIL },
    availableAction: "revoke",
  };
  for (const row of [unresolved, resolved]) {
    const f = fixture("candidates", { ...list, candidates: [row] });
    equal((await f.handler(f.request())).status, 200);
  }
  for (
    const change of [
      { displayName: "invented" },
      { accountEmail: "invented@example.invalid" },
      { subject: { ...unresolved.subject, authBindingId: B } },
      { subject: { ...unresolved.subject, grantId: null } },
      { qualification: { state: "active", validUntil: null } },
      { availableAction: "grant" },
      { effectiveHighestReviewer: true },
    ]
  ) {
    const f = fixture("candidates", {
      ...list,
      candidates: [{ ...unresolved, ...change }],
    });
    await expectError(
      await f.handler(f.request()),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
  }
});

Deno.test("resolved candidates accept each finite server action without deriving authority", async () => {
  for (const state of ["active", "expired", "revoked"]) {
    for (const qualification of ["active", "inactive", "expired", "revoked"]) {
      for (const availableAction of ["grant", "revoke", null]) {
        const row = {
          ...candidate,
          subject: { ...candidate.subject, grantId: G, grantVersion: 3 },
          qualification: { state: qualification, validUntil: UNTIL },
          governanceGrant: { state, validUntil: UNTIL },
          availableAction,
        };
        const f = fixture("candidates", { ...list, candidates: [row] });
        equal((await f.handler(f.request())).status, 200);
      }
    }
  }
});
Deno.test("decision success strictly correlates request and validates receipt types", async () => {
  const bad = [
    { ...receipt, state: "HIGHEST_REVIEWER_REVOKED" },
    { ...receipt, caseAccessChanged: true },
    { ...receipt, caseAccessChanged: null },
    { ...receipt, replayed: 1 },
    { ...receipt, subject: { ...receipt.subject, authBindingId: S } },
    { ...receipt, subject: { ...receipt.subject, bindingVersion: 2 } },
    { ...receipt, subject: { ...receipt.subject, grantId: null } },
    { ...receipt, subject: { ...receipt.subject, grantVersion: 0 } },
    { ...receipt, decision: { ...receipt.decision, decisionId: "bad" } },
    { ...receipt, decision: { ...receipt.decision, outcome: "revoke" } },
    { ...receipt, decision: { ...receipt.decision, decidedAt: "tomorrow" } },
    { ...receipt, governanceGrant: { state: "revoked", validUntil: UNTIL } },
    { ...receipt, governanceGrant: { state: "active", validUntil: null } },
  ];
  for (const reply of bad) {
    const f = fixture("role-decision", reply);
    await expectError(
      await f.handler(f.request()),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
  }
});
Deno.test("fresh, active repeat, revoked repeat and replay preserve server receipt identifiers", async () => {
  for (const decision of ["grant", "revoke"]) {
    for (const replayed of [false, true]) {
      const result = {
        ...receipt,
        replayed,
        state: decision === "grant"
          ? "HIGHEST_REVIEWER_GRANTED"
          : "HIGHEST_REVIEWER_REVOKED",
        decision: { ...receipt.decision, outcome: decision },
        governanceGrant: {
          state: decision === "grant" ? "active" : "revoked",
          validUntil: UNTIL,
        },
      };
      const body = {
        ...input,
        decision,
        subject: { ...input.subject, grantId: G, expectedGrantVersion: 1 },
      };
      const f = fixture("role-decision", result);
      const response = await f.handler(f.request(body));
      equal(response.status, 200);
      equal(await response.json(), result);
      equal(f.state.calls[0].body.p_expected_grant_version, 1);
    }
  }
});
Deno.test("thin actual entrypoints retain JWT boundary and exactly one operation", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Deno, "env")!,
    oldFetch = globalThis.fetch;
  try {
    Object.defineProperty(Deno, "env", {
      configurable: true,
      value: {
        get: (n: string) =>
          ({
            SUPABASE_URL: PROJECT,
            SUPABASE_SERVICE_ROLE_KEY: SERVICE,
            LAIBE_DRS_APP_ORIGIN: ORIGIN,
          } as Record<string, string>)[n],
      },
    });
    globalThis.fetch = () => {
      throw Error("Unauthenticated entry cannot call upstream");
    };
    for (const operation of ["candidates", "role-decision"]) {
      const entry = operation === "candidates"
        ? await import("../../drs-highest-reviewer-candidates/index.ts")
        : await import("../../drs-highest-reviewer-role-decision/index.ts");
      equal(entry.VERIFY_JWT_REQUIRED, true);
      const body = operation === "candidates" ? { cursor: null } : input;
      for (const prefix of ["/", "/functions/v1/"]) {
        await expectError(
          await entry.handler(
            new Request(
              PROJECT + prefix + "drs-highest-reviewer-" + operation,
              {
                method: "POST",
                headers: { origin: ORIGIN, "content-type": "application/json" },
                body: JSON.stringify(body),
              },
            ),
          ),
          401,
          "AUTH_REQUIRED",
        );
      }
    }
  } finally {
    Object.defineProperty(Deno, "env", descriptor);
    globalThis.fetch = oldFetch;
  }
});
