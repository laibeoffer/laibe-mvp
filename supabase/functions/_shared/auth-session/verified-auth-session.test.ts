import { createSupabaseCaseworkAuthorityDependencies } from "../casework-authority/resolver.ts";
import { createOwnerWorkspaceGrantHandler } from "../../owner-workspace-grant/index.ts";
import { createVendorWorkspaceGrantHandler } from "../../vendor-workspace-grant/index.ts";
import { createHighestReviewerWorkspaceGrantHandler } from "../../highest-reviewer-workspace-grant/index.ts";
import { createCaseworkCaseCreateHandler } from "../../casework-case-create/index.ts";

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
