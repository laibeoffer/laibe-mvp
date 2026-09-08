import { base64url, createAuthBoundSession } from "./auth-bound-session.ts";
import { createDrsSessionLogoutHandler } from "./drs-session-logout.ts";
import type { AuthBoundCookieEnvelope } from "./drs-session-bootstrap-bff.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const SID = "22222222-2222-4222-8222-222222222222";
const SPEC = "33333333-3333-4333-8333-333333333333";
const SERVER = "44444444-4444-4444-8444-444444444444";
const PROJECT = "https://synthetic-auth-project.supabase.co";
const ORIGIN = "https://synthetic-drs.example";
const COOKIE = "__Host-laibe_drs_session";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function fixture() {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const encode = (value: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(value)));
  const token = `${encode({ alg: "HS256" })}.${
    encode({
      sub: USER,
      session_id: SID,
      iss: PROJECT + "/auth/v1",
      aud: "authenticated",
      exp,
    })
  }.c3ludGhldGlj`;
  const state = {
    active: true,
    completed: false,
    revoked: false,
    providerStatus: 204,
    deleteOnLogout: true,
    rpcStatus: 200,
    providerCalls: 0,
    wrongUser: false,
    wrongProof: false,
  };
  const session = createAuthBoundSession({
    supabaseUrl: PROJECT,
    serviceRoleKey: "synthetic-service-key",
    allowedOrigin: ORIGIN,
    successRedirectUrl: ORIGIN + "/pcm/reviewer/access/#login",
    sessionCookieName: COOKIE,
    cookieKey: new Uint8Array(32).fill(11),
    crypto,
    now: () => new Date(),
    fetch: (url, init) => {
      const u = new URL(String(url));
      if (u.pathname === "/auth/v1/user") {
        return Promise.resolve(
          Response.json({ id: state.wrongUser ? SERVER : USER }),
        );
      }
      if (u.pathname.endsWith("/auth_session_validation_v1")) {
        return Promise.resolve(
          Response.json({
            schemaVersion: "laibe.auth-session-validation.v1",
            active: state.active,
          }),
        );
      }
      if (u.pathname === "/auth/v1/logout") {
        state.providerCalls++;
        assert(u.search === "?scope=local", "Logout must be explicitly local");
        assert(
          new Headers(init?.headers).get("authorization") === `Bearer ${token}`,
          "Logout must use the sealed caller JWT",
        );
        if (state.providerStatus === 204 && state.deleteOnLogout) {
          state.active = false;
        }
        return Promise.resolve(
          new Response(null, { status: state.providerStatus }),
        );
      }
      assert(
        u.pathname.endsWith("/drs_auth_bound_session_logout_v1"),
        "Unexpected logout RPC",
      );
      if (state.rpcStatus !== 200) {
        return Promise.resolve(Response.json({}, { status: state.rpcStatus }));
      }
      const body = JSON.parse(String(init?.body));
      if (
        state.wrongProof || body.p_server_session_id !== SERVER ||
        body.p_authenticated_user_id !== USER || body.p_auth_session_id !== SID
      ) {
        return Promise.resolve(
          Response.json({ authorized: false, state: "AUTH_REQUIRED" }),
        );
      }
      state.revoked = true;
      if (body.p_complete && !state.active) state.completed = true;
      return Promise.resolve(
        Response.json({
          revoked: true,
          completed: state.completed,
          auth_session_active: state.active,
        }),
      );
    },
  });
  const envelope: AuthBoundCookieEnvelope = {
    schemaVersion: "laibe.drs-server-session-cookie.v2",
    authenticatedUserId: USER,
    specialistId: SPEC,
    authorizationSubject: `drs-specialist:${SPEC}`,
    serverSessionId: SERVER,
    accessToken: base64url(new Uint8Array(32).fill(44)),
    expiresAtEpochSeconds: exp,
    authSessionId: SID,
    supabaseAccessToken: token,
    authExpiresAtEpochSeconds: exp,
  };
  const sealed = await session.codec.sealCookieEnvelope(envelope);
  const handler = createDrsSessionLogoutHandler(session);
  const request = (
    body = "{}",
    origin = ORIGIN,
    cookie = `${COOKIE}=${sealed}`,
  ) =>
    new Request(PROJECT + "/functions/v1/drs-session-logout", {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body,
    });
  return { state, handler, request, session, envelope };
}

Deno.test("S2 logout: revoke exact opaque + provider local, confirm Auth removal, then safe repeat", async () => {
  const f = await fixture();
  const first = await f.handler(f.request());
  assert(
    first.status === 204 && f.state.revoked && f.state.completed &&
      !f.state.active,
    "Logout completion requires both server effects",
  );
  assert(
    first.headers.get("set-cookie")?.includes("Max-Age=0"),
    "Local cookie must be cleared",
  );
  const again = await f.handler(f.request());
  assert(
    again.status === 204 && f.state.providerCalls === 1,
    "Exact completed proof should be idempotent",
  );
  f.state.wrongProof = true;
  assert(
    (await f.handler(f.request())).status === 401,
    "Another opaque proof must not inherit completed status",
  );
});
for (const status of [401, 403, 500]) {
  Deno.test(`S2 logout: provider ${status} is unavailable, never false completion`, async () => {
    const f = await fixture();
    f.state.providerStatus = status;
    const response = await f.handler(f.request());
    assert(
      response.status === 503 && f.state.revoked && !f.state.completed,
      "Provider failure must remain pending after local DRS revoke",
    );
    assert(
      response.headers.get("set-cookie")?.includes("Max-Age=0"),
      "Provider failure must still clear local cookie",
    );
  });
}
Deno.test("S2 logout: provider success without live Auth removal is unavailable", async () => {
  const f = await fixture();
  f.state.deleteOnLogout = false;
  assert(
    (await f.handler(f.request())).status === 503 && !f.state.completed,
    "Provider HTTP success is insufficient",
  );
});
Deno.test("S2 logout: wrong account, revoked token, old cookie and malformed authority input stay closed", async () => {
  const f = await fixture();
  f.state.wrongUser = true;
  assert(
    (await f.handler(f.request())).status === 401 &&
      f.state.providerCalls === 0,
    "Wrong user must not reach provider",
  );
  f.state.wrongUser = false;
  f.state.active = false;
  assert(
    (await f.handler(f.request())).status === 401 && !f.state.completed,
    "Unproven previous logout is not success",
  );
  assert(
    (await f.handler(f.request("{}", ORIGIN, `${COOKIE}=v1.old.cookie`)))
      .status === 401,
    "Old unbound cookie must require login",
  );
  assert(
    (await f.handler(f.request('{"userId":"attacker"}'))).status === 400,
    "Client authority input must be rejected",
  );
  const cross = await f.handler(f.request("{}", "https://foreign.example"));
  assert(
    cross.status === 403 && !cross.headers.has("set-cookie"),
    "Foreign origin cannot log out this site",
  );
});
Deno.test("S2 logout: binding service unavailable clears cookie but cannot claim logout", async () => {
  const f = await fixture();
  f.state.rpcStatus = 503;
  const response = await f.handler(f.request());
  assert(
    response.status === 503 && f.state.providerCalls === 0,
    "Unavailable binding cannot authorize provider logout",
  );
  assert(
    response.headers.get("set-cookie")?.includes("Max-Age=0"),
    "Local removal must remain possible",
  );
});
