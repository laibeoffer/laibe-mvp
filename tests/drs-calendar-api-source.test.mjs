import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const requiredProductionPaths = [
  "supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts",
  "supabase/functions/drs-google-calendar-grant/index.ts",
  "supabase/functions/drs-google-calendar-oauth-start/index.ts",
  "supabase/functions/drs-google-calendar-oauth-callback/index.ts",
  "supabase/functions/drs-google-calendar-revoke/index.ts",
  "supabase/functions/drs-google-calendar-events-read/index.ts",
  "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
  "supabase/config.toml",
  "docs/drs_backend/drs_calendar_api_w1.md",
];

const endpointPaths = requiredProductionPaths.filter((path) =>
  path.startsWith("supabase/functions/drs-google-calendar-")
);
const guardedEndpointRoutes = new Map([
  ["supabase/functions/drs-google-calendar-grant/index.ts", "calendarGrant"],
  [
    "supabase/functions/drs-google-calendar-oauth-start/index.ts",
    "calendarOauthStart",
  ],
  [
    "supabase/functions/drs-google-calendar-events-read/index.ts",
    "calendarEventsRead",
  ],
  ["supabase/functions/drs-google-calendar-revoke/index.ts", "calendarRevoke"],
]);

async function source(path) {
  const url = new URL(path, root);
  return existsSync(url) ? await readFile(url, "utf8") : "";
}

test("focused RED: every DRS Calendar API source path exists", () => {
  const missing = requiredProductionPaths.filter((path) =>
    !existsSync(new URL(path, root))
  );
  assert.deepEqual(missing, []);
});

test("DRS endpoints use the exact composed guard before backend work and sanitize responses", async () => {
  for (const path of endpointPaths) {
    const text = await source(path);
    const route = guardedEndpointRoutes.get(path);
    if (route) {
      assert.match(
        text,
        new RegExp(`createDrsBffRouteGuard\\("${route}"\\)`, "u"),
        path,
      );
      const guard = text.indexOf("bffGuard.authorize(request)");
      assert.notEqual(guard, -1, path);
      for (
        const backendMarker of [
          "port.resolveAuthorization(",
          "authorization.resolveAuthorization({",
          "port.loadGrant(",
          "port.readEvents(",
          "port.revoke(",
        ]
      ) {
        const backend = text.indexOf(backendMarker);
        if (backend !== -1) {
          assert.ok(guard < backend, `${path}: ${backendMarker}`);
        }
      }
    } else {
      assert.match(text, /request\.method\s*!==\s*"GET"/u, path);
    }
    assert.match(text, /jsonResponse\(/u, path);
    assert.doesNotMatch(
      text,
      /console\.|stack|clientSecret|refreshToken/u,
      path,
    );
  }
});

test("HTTP contracts are centralized and every endpoint revalidates with VERIFY_JWT false", async () => {
  const composition = await source(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
  );
  for (const [path, route] of guardedEndpointRoutes) {
    const text = await source(path);
    assert.match(
      text,
      new RegExp(`createDrsBffRouteGuard\\("${route}"\\)`, "u"),
      path,
    );
    assert.match(text, /VERIFY_JWT\s*=\s*false/u, path);
  }
  const callback = await source(
    "supabase/functions/drs-google-calendar-oauth-callback/index.ts",
  );
  assert.match(callback, /request\.method\s*!==\s*"GET"/u);
  assert.match(callback, /VERIFY_JWT\s*=\s*false/u);
  for (
    const [route, pathname] of [
      ["calendarGrant", "/functions/v1/drs-google-calendar-grant"],
      ["calendarOauthStart", "/functions/v1/drs-google-calendar-oauth-start"],
      ["calendarEventsRead", "/functions/v1/drs-google-calendar-events-read"],
      ["calendarRevoke", "/functions/v1/drs-google-calendar-revoke"],
    ]
  ) {
    const routeStart = composition.indexOf(`${route}: closedPost(`);
    const pathStart = composition.indexOf(`"${pathname}"`, routeStart);
    assert.ok(routeStart >= 0 && pathStart > routeStart, route);
  }
});

test("DRS source is readonly and never adds an event-write endpoint or write scope", async () => {
  const oauth = await source(
    "supabase/functions/_shared/google-calendar/google-oauth-adapter.ts",
  );
  const allDrsSource = (
    await Promise.all(requiredProductionPaths.map((path) => source(path)))
  ).join("\n");

  assert.match(
    oauth,
    /https:\/\/www\.googleapis\.com\/auth\/calendar\.readonly/u,
  );
  assert.doesNotMatch(
    allDrsSource,
    /calendar\.events(?:\.insert|\.update|\.delete)|events-write|calendar\.events\b/u,
  );
  assert.equal(
    existsSync(
      new URL("supabase/functions/drs-google-calendar-events-write", root),
    ),
    false,
  );
});

test("migration keeps the A14 login adapter private, fail closed, and service-only", async () => {
  const sql = await source(
    "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
  );

  assert.match(
    sql,
    /create or replace function integration\.drs_specialist_calendar_authority_v1/iu,
  );
  assert.match(sql, /DRS_AUTHORIZATION_ADAPTER_UNAVAILABLE/u);
  assert.match(
    sql,
    /revoke all on function integration\.drs_specialist_calendar_authority_v1[\s\S]*from public, anon, authenticated, service_role/iu,
  );
  for (
    const rpc of [
      "drs_google_calendar_authorize_v1",
      "drs_google_calendar_begin_oauth_v1",
      "drs_google_calendar_get_oauth_state_v1",
      "drs_google_calendar_claim_callback_v1",
      "drs_google_calendar_commit_callback_v1",
      "drs_google_calendar_grant_v1",
      "drs_google_calendar_revoke_v1",
      "drs_google_calendar_events_context_v1",
    ]
  ) {
    assert.match(
      sql,
      new RegExp(`create or replace function public\\.${rpc}`, "iu"),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.${rpc}[\\s\\S]*?from public, anon, authenticated`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `grant execute on function public\\.${rpc}[\\s\\S]*?to service_role`,
        "iu",
      ),
    );
  }
  assert.match(sql, /assignment_id uuid/iu);
  assert.match(sql, /claimed_at timestamptz/iu);
  assert.match(sql, /valid_from[\s\S]*valid_until[\s\S]*terminated_at/iu);
  assert.match(
    sql,
    /drs_google_calendar_claim_callback_v1[\s\S]*for update[\s\S]*claimed_at/iu,
  );
  assert.match(
    sql,
    /drs_google_calendar_audit_events[\s\S]*unique[\s\S]*event_key/iu,
  );
});

test("DRS source never falls back to owner or vendor authority", async () => {
  const authorization = await source(
    "supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts",
  );
  const endpoints = (
    await Promise.all(endpointPaths.map((path) => source(path)))
  ).join("\n");
  assert.doesNotMatch(
    `${authorization}\n${endpoints}`,
    /case_member_google_calendar_authorize_v1|createOwner|createVendor|accountRole:\s*"(?:owner|pro)"/u,
  );
});

test("revoke is exact-assignment idempotent and never revokes a shared credential", async () => {
  const sql = await source(
    "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
  );
  const revoke = sql.match(
    /create or replace function public\.drs_google_calendar_revoke_v1[\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  assert.match(revoke, /assignment_id\s*=\s*p_assignment_id/iu);
  assert.match(
    revoke,
    /if v_binding\.binding_status = 'active'[\s\S]*update integration\.drs_google_calendar_bindings[\s\S]*insert into integration\.drs_google_calendar_audit_events/iu,
  );
  assert.doesNotMatch(
    revoke,
    /update integration\.google_calendar_credentials/iu,
  );
});

test("owner and vendor endpoint wrappers stay excluded from the DRS composition", async () => {
  const wrapperPaths = [
    "supabase/functions/owner-google-calendar-grant/index.ts",
    "supabase/functions/owner-google-calendar-oauth-start/index.ts",
    "supabase/functions/owner-google-calendar-oauth-callback/index.ts",
    "supabase/functions/vendor-google-calendar-grant/index.ts",
    "supabase/functions/vendor-google-calendar-oauth-start/index.ts",
    "supabase/functions/vendor-google-calendar-oauth-callback/index.ts",
  ];

  for (const path of wrapperPaths) {
    assert.equal(existsSync(new URL(path, root)), false, path);
  }

  const admittedDrsSource = (
    await Promise.all([
      source(
        "supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts",
      ),
      ...endpointPaths.map((path) => source(path)),
    ])
  ).join("\n");
  assert.doesNotMatch(
    admittedDrsSource,
    /(?:owner|vendor)-google-calendar|case_member_google_calendar_authorize_v1|createOwner|createVendor/u,
  );
});

test("verify_jwt false is paired with the closed BFF proof and current-authority guard", async () => {
  const config = await source("supabase/config.toml");
  const composition = await source(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
  );
  const bootstrap = await source(
    "supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
  );
  assert.match(config, /^project_id\s*=\s*"laibe-mvp-project"\s*$/mu);
  for (
    const name of [
      "drs-google-calendar-grant",
      "drs-google-calendar-oauth-start",
      "drs-google-calendar-oauth-callback",
      "drs-google-calendar-revoke",
      "drs-google-calendar-events-read",
    ]
  ) {
    assert.match(
      config,
      new RegExp(
        `\\[functions\\.${name}\\]\\s+verify_jwt\\s*=\\s*false(?:\\s|$)`,
        "u",
      ),
      name,
    );
  }
  assert.match(
    composition,
    /createDrsBffGuard\(dependencies, DRS_BFF_ROUTE_CONTRACTS\[route\]\)/u,
  );
  const closedRequest = bootstrap.indexOf(
    "await assertClosedRequestContract(request, compiledRequestContract)",
  );
  const proof = bootstrap.indexOf(
    "const proof = bearerProof(request)",
    closedRequest,
  );
  const cookie = bootstrap.indexOf("readConfiguredCookie(", proof);
  const verify = bootstrap.indexOf("proofCodec.verifyOpaqueProof(", cookie);
  const session = bootstrap.indexOf("resolveBoundSession(", verify);
  const authority = bootstrap.indexOf(
    "authorizationFactsDigest(session)",
    session,
  );
  assert.ok(
    closedRequest >= 0 && proof > closedRequest && cookie > proof &&
      verify > cookie && session > verify && authority > session,
  );
});

test("migration avoids composite row variables in multi-target INTO and indexes audit foreign keys", async () => {
  const sql = await source(
    "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
  );
  assert.doesNotMatch(sql, /into\s+v_binding\s*,/iu);
  assert.doesNotMatch(sql, /into\s+v_binding\s*,\s*v_credential/iu);
  assert.match(
    sql,
    /create index drs_google_calendar_audit_authenticated_user_idx\s+on integration\.drs_google_calendar_audit_events \(authenticated_user_id\)/iu,
  );
  assert.match(
    sql,
    /create index drs_google_calendar_audit_case_idx\s+on integration\.drs_google_calendar_audit_events \(case_id\)/iu,
  );
});

test("closed route contracts reject queries and preserve DRS-only CORS guards", async () => {
  for (const path of guardedEndpointRoutes.keys()) {
    const text = await source(path);
    assert.match(text, /createDrsBffRouteGuard\(/u, path);
    assert.match(text, /createDrsCorsResponder\(/u, path);
  }
  const composition = await source(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
  );
  const bootstrap = await source(
    "supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
  );
  assert.match(composition, /queryFields:\s*Object\.freeze\(\[\]\)/u);
  assert.match(
    composition,
    /calendarEventsRead:\s*closedPost\([\s\S]*exactTimeWindowBody/u,
  );
  assert.match(bootstrap, /assertExactQuery\(url, contract\.queryFields\)/u);
  assert.match(
    bootstrap,
    /await assertExactJsonBody\(request, contract\.jsonBodyFields\)/u,
  );
  const authorization = await source(
    "supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts",
  );
  assert.match(authorization, /DRS_ALLOWED_ORIGINS/u);
  assert.match(authorization, /access-control-allow-origin/iu);
  assert.match(authorization, /access-control-allow-methods/iu);
  assert.match(authorization, /access-control-allow-headers/iu);
  assert.match(authorization, /vary/iu);
});

test("candidate migration preserves predecessor owner/pro consumed-state compatibility", async () => {
  const predecessor = await source(
    "supabase/migrations/20260821170000_google_calendar_drs_account_contract.sql",
  );
  const candidate = await source(
    "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
  );
  const ownerProCommit = predecessor.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2[\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  const drsClaim = candidate.match(
    /create or replace function public\.drs_google_calendar_claim_callback_v1[\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  const drsCommit = candidate.match(
    /create or replace function public\.drs_google_calendar_commit_callback_v1[\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  assert.match(ownerProCommit, /set consumed_at\s*=\s*v_now/iu);
  assert.doesNotMatch(ownerProCommit, /set claimed_at/iu);
  assert.doesNotMatch(
    candidate,
    /check\s*\(\s*consumed_at\s+is\s+null\s+or\s+claimed_at\s+is\s+not\s+null\s*\)/iu,
  );
  assert.match(
    drsClaim,
    /or v_state\.claimed_at is not null[\s\S]*or v_state\.consumed_at is not null/iu,
  );
  assert.match(
    drsClaim,
    /update integration\.google_calendar_oauth_states[\s\S]*set claimed_at = v_now[\s\S]*and claimed_at is null[\s\S]*and consumed_at is null/iu,
  );
  assert.match(
    drsCommit,
    /or v_state\.claimed_at is null[\s\S]*or v_state\.consumed_at is not null/iu,
  );
  assert.match(
    drsCommit,
    /set consumed_at = v_now[\s\S]*and claimed_at is not null[\s\S]*and consumed_at is null/iu,
  );
});

test("DRS SQL callback commit enforces exact scope multiset cardinality", async () => {
  const sql = await source(
    "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
  );
  const commit = sql.match(
    /create or replace function public\.drs_google_calendar_commit_callback_v1[\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  assert.match(
    commit,
    /cardinality\s*\(\s*coalesce\(p_granted_scopes,\s*'\{\}'::text\[\]\)\s*\)\s*<>\s*2/iu,
  );
  assert.match(
    commit,
    /count\(\*\)[\s\S]*granted_scope\s*=\s*'openid'[\s\S]*<>\s*1/iu,
  );
  assert.match(
    commit,
    /count\(\*\)[\s\S]*granted_scope\s*=\s*'https:\/\/www\.googleapis\.com\/auth\/calendar\.readonly'[\s\S]*<>\s*1/iu,
  );
});
