import { createSupabaseCaseworkAuthorityDependencies } from "../casework-authority/resolver.ts";
import { createOwnerWorkspaceGrantHandler } from "../../owner-workspace-grant/index.ts";
import { createVendorWorkspaceGrantHandler } from "../../vendor-workspace-grant/index.ts";
import { createHighestReviewerWorkspaceGrantHandler } from "../../highest-reviewer-workspace-grant/index.ts";
import { createCaseworkCaseCreateHandler } from "../../casework-case-create/index.ts";
import { verifyAuthSession } from "./verified-auth-session.ts";
import assert from "node:assert/strict";
import { observeWorkspaceStage } from "../casework-authority/contracts.ts";

const PROJECT = "https://synthetic-auth-project.supabase.co";
const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";

function equal(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function token(overrides: Record<string, unknown> = {}) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value))
      .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${
    encode({
      sub: USER,
      iss: `${PROJECT}/auth/v1`,
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 300,
      session_id: SESSION,
      ...overrides,
    })
  }.c3ludGhldGljLXNpZ25hdHVyZQ`;
}

type Scenario = {
  name: string;
  status: number;
  claims?: Record<string, unknown>;
  authStatus?: number;
  authUser?: string;
  sessionStatus?: number;
  active?: boolean;
  unavailable?: boolean;
};

const callers = [
  ["owner-workspace-grant", createOwnerWorkspaceGrantHandler, "owner"],
  ["vendor-workspace-grant", createVendorWorkspaceGrantHandler, "pro"],
  [
    "highest-reviewer-workspace-grant",
    createHighestReviewerWorkspaceGrantHandler,
    "highest_reviewer",
  ],
  ["casework-case-create", createCaseworkCaseCreateHandler, "owner"],
] as const;

const denials: Scenario[] = [
  { name: "revoked before JWT expiry", status: 401, active: false },
  { name: "expired JWT", status: 401, claims: { exp: 1 } },
  {
    name: "wrong project issuer",
    status: 401,
    claims: { iss: "https://other.supabase.co/auth/v1" },
  },
  { name: "verified user does not match sub", status: 401, authUser: OTHER },
  { name: "missing session id", status: 401, claims: { session_id: null } },
  {
    name: "wrong session/user pairing",
    status: 401,
    claims: { session_id: OTHER },
    active: false,
  },
  { name: "Auth rejects otherwise valid claims", status: 401, authStatus: 401 },
  { name: "session RPC unavailable", status: 503, sessionStatus: 503 },
  { name: "session RPC absent", status: 503, sessionStatus: 404 },
  { name: "Auth unavailable", status: 503, authStatus: 503 },
  { name: "transport unavailable", status: 503, unavailable: true },
];

const OBSERVATION_HEADER = "x-laibe-workspace-stages";

Deno.test("owner observability: monotonic durations remain finite and bounded", () => {
  const durations: number[] = [];
  const observer = (
    _stage: string,
    _outcome: string,
    _status: number,
    duration: number,
  ) => {
    durations.push(duration);
  };
  observeWorkspaceStage(
    observer,
    "auth",
    "PASS",
    200,
    performance.now() - 70000,
  );
  observeWorkspaceStage(
    observer,
    "auth",
    "PASS",
    200,
    performance.now() + 1000,
  );
  observeWorkspaceStage(observer, "auth", "PASS", 200, Number.NaN);
  assert.deepEqual(durations, [60000, 0, 0]);
});

function stagesOf(response: Response) {
  const header = response.headers.get(OBSERVATION_HEADER);
  assert.ok(header, "owner stage summary exists");
  assert.ok(header.length <= 512 && /^[\x20-\x7e]+$/.test(header));
  assert.match(
    header,
    /^v1;gate=[^;]+;auth=[^;]+;session=[^;]+;workspace=[^;]+;shape=[^;]+$/,
  );
  const stages = Object.fromEntries(
    header.slice(3).split(";").map((entry) => {
      const [name, value] = entry.split("=");
      const [outcome, status, duration] = value.split(",");
      assert.match(
        outcome,
        /^(NOT_REACHED|PASS|DENIED|UNAVAILABLE|HTTP_ERROR|TRANSPORT_ERROR|INVALID_JSON|INVALID_SHAPE)$/,
      );
      assert.ok(
        Number.isInteger(Number(status)) &&
          (status === "0" || (Number(status) >= 100 && Number(status) <= 599)),
      );
      assert.ok(
        Number.isInteger(Number(duration)) && Number(duration) >= 0 &&
          Number(duration) <= 60000,
      );
      if (outcome === "NOT_REACHED") {
        assert.equal(`${status},${duration}`, "0,0");
      }
      return [name, [outcome, Number(status)]];
    }),
  );
  for (const value of [USER, SESSION, OTHER, "synthetic-server-key", token()]) {
    assert.equal(header.includes(value), false);
  }
  return stages;
}

type ObservationScenario = {
  name: string;
  boundary: "auth" | "session" | "workspace" | "shape";
  outcome: string;
  status: number;
  responseStatus: number;
  failure?: () => Response | Promise<Response>;
  claims?: Record<string, unknown>;
};

async function observedCall(scenario?: ObservationScenario) {
  const calls: {
    path: string;
    headers: string[];
    signal: AbortSignal | null | undefined;
  }[] = [];
  const dependencies = createSupabaseCaseworkAuthorityDependencies({
    env: {
      get: (
        name,
      ) => ({
        SUPABASE_URL: PROJECT,
        SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key",
      }[name]),
    },
    fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      calls.push({
        path,
        headers: [...new Headers(init?.headers).keys()].sort(),
        signal: init?.signal,
      });
      const boundary = path === "/auth/v1/user"
        ? "auth"
        : path.endsWith("auth_session_validation_v1")
        ? "session"
        : "workspace";
      if (scenario?.boundary === boundary && scenario.failure) {
        return await scenario.failure();
      }
      if (boundary === "auth") return Response.json({ id: USER });
      if (boundary === "session") {
        return Response.json({
          schemaVersion: "laibe.auth-session-validation.v1",
          active: true,
        });
      }
      return Response.json(
        scenario?.boundary === "shape" ? {} : {
          authorized: true,
          state: "AUTHORIZED_CASEWORK_WORKSPACE",
          case_id: OTHER,
          case_status: "active",
          case_title: "Synthetic case",
          account_role: "owner",
          grant_id: SESSION,
          grant_version: 1,
          grant_expires_at: "2099-01-01T00:00:00Z",
        },
      );
    },
  });
  const response = await createOwnerWorkspaceGrantHandler(dependencies)(
    new Request(`${PROJECT}/functions/v1/owner-workspace-grant`, {
      headers: { authorization: `Bearer ${token(scenario?.claims)}` },
    }),
  );
  return { response, calls };
}

const observationScenarios: ObservationScenario[] = [
  {
    name: "claim rejection",
    boundary: "auth",
    outcome: "DENIED",
    status: 0,
    responseStatus: 401,
    claims: { exp: 1 },
  },
  {
    name: "Auth HTTP rejection",
    boundary: "auth",
    outcome: "DENIED",
    status: 401,
    responseStatus: 401,
    failure: () => new Response(null, { status: 401 }),
  },
  {
    name: "Auth HTTP outage",
    boundary: "auth",
    outcome: "HTTP_ERROR",
    status: 503,
    responseStatus: 503,
    failure: () => new Response(null, { status: 503 }),
  },
  {
    name: "Auth JSON",
    boundary: "auth",
    outcome: "INVALID_JSON",
    status: 200,
    responseStatus: 503,
    failure: () => new Response("{"),
  },
  {
    name: "Auth shape",
    boundary: "auth",
    outcome: "INVALID_SHAPE",
    status: 200,
    responseStatus: 503,
    failure: () => Response.json({}),
  },
  {
    name: "Auth identity",
    boundary: "auth",
    outcome: "DENIED",
    status: 200,
    responseStatus: 401,
    failure: () => Response.json({ id: OTHER }),
  },
  {
    name: "Auth transport",
    boundary: "auth",
    outcome: "TRANSPORT_ERROR",
    status: 0,
    responseStatus: 503,
    failure: () => Promise.reject(new Error("synthetic secret sentinel")),
  },
  {
    name: "session HTTP",
    boundary: "session",
    outcome: "HTTP_ERROR",
    status: 503,
    responseStatus: 503,
    failure: () => new Response(null, { status: 503 }),
  },
  {
    name: "session JSON",
    boundary: "session",
    outcome: "INVALID_JSON",
    status: 200,
    responseStatus: 503,
    failure: () => new Response("{"),
  },
  {
    name: "session shape",
    boundary: "session",
    outcome: "INVALID_SHAPE",
    status: 200,
    responseStatus: 503,
    failure: () => Response.json({ active: true }),
  },
  {
    name: "session revoked",
    boundary: "session",
    outcome: "DENIED",
    status: 200,
    responseStatus: 401,
    failure: () =>
      Response.json({
        schemaVersion: "laibe.auth-session-validation.v1",
        active: false,
      }),
  },
  {
    name: "session transport",
    boundary: "session",
    outcome: "TRANSPORT_ERROR",
    status: 0,
    responseStatus: 503,
    failure: () =>
      Promise.reject(new DOMException("synthetic timeout", "TimeoutError")),
  },
  {
    name: "workspace HTTP",
    boundary: "workspace",
    outcome: "HTTP_ERROR",
    status: 503,
    responseStatus: 503,
    failure: () => new Response(null, { status: 503 }),
  },
  {
    name: "workspace JSON",
    boundary: "workspace",
    outcome: "INVALID_JSON",
    status: 200,
    responseStatus: 503,
    failure: () => new Response("{"),
  },
  {
    name: "workspace transport",
    boundary: "workspace",
    outcome: "TRANSPORT_ERROR",
    status: 0,
    responseStatus: 503,
    failure: () => Promise.reject(new Error("synthetic secret sentinel")),
  },
  {
    name: "workspace body transport",
    boundary: "workspace",
    outcome: "TRANSPORT_ERROR",
    status: 200,
    responseStatus: 503,
    failure: () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new TypeError("synthetic stream interruption"));
          },
        }),
      ),
  },
  {
    name: "grant shape",
    boundary: "shape",
    outcome: "INVALID_SHAPE",
    status: 503,
    responseStatus: 503,
  },
];

for (const scenario of observationScenarios) {
  Deno.test(`owner observability: first failure ${scenario.name}`, async () => {
    const { response, calls } = await observedCall(scenario);
    assert.equal(response.status, scenario.responseStatus);
    assert.equal(
      await response.text(),
      JSON.stringify({
        state: scenario.responseStatus === 401
          ? "AUTH_REQUIRED"
          : "CONTEXT_UNAVAILABLE",
      }),
    );
    const stages = stagesOf(response);
    assert.deepEqual(stages[scenario.boundary], [
      scenario.outcome,
      scenario.status,
    ]);
    const reached = scenario.claims
      ? 0
      : scenario.boundary === "auth"
      ? 1
      : scenario.boundary === "session"
      ? 2
      : 3;
    assert.equal(calls.length, reached);
    if (scenario.boundary === "auth") {
      assert.deepEqual(stages.session, ["NOT_REACHED", 0]);
    }
    if (["auth", "session"].includes(scenario.boundary)) {
      assert.deepEqual(stages.workspace, ["NOT_REACHED", 0]);
      assert.deepEqual(stages.shape, ["NOT_REACHED", 0]);
    }
  });
}

Deno.test("owner observability: success retains exact payload headers upstream order and timeout budgets", async () => {
  const timeout = AbortSignal.timeout;
  const budgets: number[] = [];
  AbortSignal.timeout = (milliseconds) => {
    budgets.push(milliseconds);
    return new AbortController().signal;
  };
  try {
    const { response, calls } = await observedCall();
    assert.equal(response.status, 200);
    const stages = stagesOf(response);
    for (const name of ["gate", "auth", "session", "workspace", "shape"]) {
      assert.equal(stages[name][0], "PASS");
    }
    assert.deepEqual(budgets, [5000, 5000]);
    assert.deepEqual(calls.map((call) => call.path), [
      "/auth/v1/user",
      "/rest/v1/rpc/auth_session_validation_v1",
      "/rest/v1/rpc/owner_workspace_grant_v1",
    ]);
    assert.deepEqual(calls.map((call) => call.headers), [
      ["apikey", "authorization"],
      ["apikey", "authorization", "content-type"],
      ["apikey", "authorization", "content-type"],
    ]);
    assert.equal(calls[2].signal, undefined);
    assert.equal(
      await response.text(),
      JSON.stringify({
        schemaVersion: "laibe.owner-workspace-runtime.v1",
        state: "AUTHORIZED_OWNER_WORKSPACE",
        authenticatedUserId: USER,
        currentCaseId: OTHER,
        membership: {
          userId: USER,
          caseId: OTHER,
          role: "owner",
          status: "active",
        },
        workspaceAccess: {
          role: "owner",
          mutationAllowed: false,
          writeActionsEnabled: false,
          payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
        },
        case: { caseId: OTHER, status: "active", title: "Synthetic case" },
        serviceContext: {
          pcmStatus: "UNAVAILABLE",
          contractStatus: "UNAVAILABLE",
        },
        documents: [],
      }),
    );
    const headers = new Headers(response.headers);
    headers.delete(OBSERVATION_HEADER);
    assert.equal(headers.get("x-laibe-workspace-gate-reason"), "OK");
    headers.delete("x-laibe-workspace-gate-reason");
    assert.deepEqual(Object.fromEntries(headers), {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      vary: "Origin",
    });
  } finally {
    AbortSignal.timeout = timeout;
  }
});

Deno.test("owner observability: throwing optional observer leaves verified session and RPC behavior unchanged", async () => {
  for (
    const observer of [undefined, () => {
      throw new Error("synthetic observer failure");
    }]
  ) {
    let calls = 0;
    const result = await verifyAuthSession(
      new Request(`${PROJECT}/`, {
        headers: { authorization: `Bearer ${token()}` },
      }),
      {
        supabaseUrl: PROJECT,
        serviceRoleKey: "synthetic-server-key",
        observer,
        fetch: () =>
          Promise.resolve(
            ++calls === 1 ? Response.json({ id: USER }) : Response.json({
              schemaVersion: "laibe.auth-session-validation.v1",
              active: true,
            }),
          ),
      },
    );
    assert.equal(result.state, "verified");
    assert.equal(calls, 2);
    const deps = createSupabaseCaseworkAuthorityDependencies({
      env: {
        get: (
          name,
        ) => ({
          SUPABASE_URL: PROJECT,
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key",
        }[name]),
      },
      fetch: () => {
        calls++;
        return Promise.resolve(Response.json({ state: "CASE_NOT_AUTHORIZED" }));
      },
    });
    assert.deepEqual(
      await deps.resolveWorkspaceGrant(USER, "owner", observer),
      { state: "CASE_NOT_AUTHORIZED" },
    );
    assert.equal(calls, 3);
  }
});

async function invoke(
  caller: typeof callers[number],
  scenario: Scenario,
) {
  const [route, factory, role] = caller;
  const jwt = token(scenario.claims);
  let effectCalls = 0;
  const calls: string[] = [];
  const dependencies = createSupabaseCaseworkAuthorityDependencies({
    env: {
      get: (name) => ({
        SUPABASE_URL: PROJECT,
        SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key",
      }[name]),
    },
    fetch: (input, init) => {
      const url = String(input);
      calls.push(url);
      if (scenario.unavailable) {
        return Promise.reject(new Error("synthetic outage"));
      }
      if (url === `${PROJECT}/auth/v1/user`) {
        equal(
          new Headers(init?.headers).get("authorization"),
          `Bearer ${jwt}`,
          "Auth verifies the original token",
        );
        return Promise.resolve(
          Response.json({ id: scenario.authUser ?? USER }, {
            status: scenario.authStatus ?? 200,
          }),
        );
      }
      if (url === `${PROJECT}/rest/v1/rpc/auth_session_validation_v1`) {
        equal(JSON.parse(String(init?.body)), {
          p_authenticated_user_id: scenario.authUser ?? USER,
          p_auth_session_id: scenario.claims?.session_id ?? SESSION,
        }, "RPC receives only verified user and session identities");
        equal(
          new Headers(init?.headers).get("authorization"),
          "Bearer synthetic-server-key",
          "session RPC uses server credentials",
        );
        return Promise.resolve(Response.json({
          schemaVersion: "laibe.auth-session-validation.v1",
          active: scenario.active ?? true,
        }, { status: scenario.sessionStatus ?? 200 }));
      }
      effectCalls++;
      return Promise.resolve(Response.json({
        authorized: true,
        state: "AUTHORIZED_CASEWORK_WORKSPACE",
        case_id: OTHER,
        case_status: "active",
        case_title: "Synthetic case",
        account_role: role,
        grant_id: SESSION,
        grant_version: 1,
        grant_expires_at: new Date(Date.now() + 60_000).toISOString(),
      }));
    },
  });
  const create = route === "casework-case-create";
  const response = await factory(dependencies)(
    new Request(
      `${PROJECT}/functions/v1/${route}`,
      {
        method: create ? "POST" : "GET",
        headers: {
          authorization: `Bearer ${jwt}`,
          ...(create ? { "content-type": "application/json" } : {}),
        },
        ...(create
          ? {
            body: JSON.stringify({
              schemaVersion: "laibe.casework-case-create.request.v1",
              title: "Synthetic case",
              idempotencyKey: "synthetic-session-boundary-001",
            }),
          }
          : {}),
      },
    ),
  );
  return { response, effectCalls, calls };
}

for (const caller of callers) {
  for (const scenario of denials) {
    Deno.test(`S1 ${caller[0]}: ${scenario.name}`, async () => {
      const { response, effectCalls } = await invoke(caller, scenario);
      equal(
        response.status,
        scenario.status,
        "status preserves auth denial versus service failure",
      );
      equal(await response.json(), {
        state: scenario.status === 401
          ? "AUTH_REQUIRED"
          : "CONTEXT_UNAVAILABLE",
      }, "closed response contains no session or backend details");
      equal(
        effectCalls,
        0,
        "no grant or create RPC after failed session verification",
      );
    });
  }
}

for (const caller of callers.slice(0, 2)) {
  Deno.test(`S1 ${caller[0]}: verified active session can reach existing grant`, async () => {
    const { response, effectCalls, calls } = await invoke(caller, {
      name: "valid",
      status: 200,
    });
    equal(response.status, 200, "existing authorized grant remains available");
    equal(effectCalls, 1, "one existing grant call");
    equal(calls.slice(0, 2), [
      `${PROJECT}/auth/v1/user`,
      `${PROJECT}/rest/v1/rpc/auth_session_validation_v1`,
    ], "verified Auth precedes current session validation and grant");
  });
}
