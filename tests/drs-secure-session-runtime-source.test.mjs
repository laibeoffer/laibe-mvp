import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const runtimeUrl = new URL(
  "supabase/functions/_shared/drs-auth/drs-secure-session-runtime.ts",
  root,
);
const endpointUrl = new URL(
  "supabase/functions/drs-session-bootstrap/index.ts",
  root,
);
const migrationUrl = new URL(
  "supabase/migrations/20260827140000_drs_secure_session_runtime_composition_w1.sql",
  root,
);

function source(url) {
  assert.equal(existsSync(url), true, `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

function rpcSource(sql, name) {
  const rpc = sql.match(
    new RegExp(
      `create or replace function public\\.drs_server_session_${name}_v1\\([\\s\\S]*?\\$\\$;`,
      "iu",
    ),
  )?.[0];
  assert.ok(rpc, `${name} RPC source must exist`);
  return rpc;
}

const authorityKeys = Object.freeze([
  "authorized",
  "authenticated_user_id",
  "specialist_id",
  "assignment_id",
  "selected_case_id",
  "account_role",
  "authorization_subject",
  "auth_binding_status",
  "specialist_status",
  "assignment_status",
  "valid_from",
  "valid_until",
  "terminated_at",
  "lock_status",
]);

const exactAuthorityArrayPattern = String.raw`array\[\s*${
  authorityKeys.map((key) => `'${key}'`).join(String.raw`\s*,\s*`)
}\s*\]`;

function sessionAuthorityIsCurrent(session, authority, now) {
  return authority.authorized === true &&
    authority.authenticated_user_id === session.authenticated_user_id &&
    authority.specialist_id === session.specialist_id &&
    authority.authorization_subject === session.authorization_subject &&
    authority.account_role === "drs" &&
    authority.auth_binding_status === "active" &&
    authority.specialist_status === "active" &&
    authority.assignment_status === "active" &&
    authority.lock_status === "locked" &&
    authority.terminated_at === null &&
    authority.valid_from <= now &&
    authority.valid_until > now;
}

test("focused RED: exact secure-session runtime and migration seams exist", () => {
  assert.equal(existsSync(runtimeUrl), true, runtimeUrl.pathname);
  assert.equal(existsSync(migrationUrl), true, migrationUrl.pathname);
});

test("runtime composes exact server-only dependencies without browser authority or secret leakage", () => {
  const runtime = source(runtimeUrl);
  for (
    const required of [
      "createDrsSecureSessionRuntime",
      "createServerOwnedVerifiedSessionProducer",
      "createDrsSpecialistAuthorizationStrategy",
      "createSupabaseDrsWorkspaceGrantDependencies",
      "DrsServerSessionRevoker",
      "revokeServerSession",
      "drs_workspace_grant_v1",
      "drs_server_session_issue_v1",
      "drs_server_session_verify_v1",
      "drs_server_session_revoke_v1",
      'redirect: "error"',
      "TextDecoder",
      "fatal: true",
      "AES-GCM",
      "HMAC",
      "SHA-256",
      "laibe.drs-server-session-cookie.v1",
      "laibe:drs-session-bff",
    ]
  ) assert.equal(runtime.includes(required), true, required);
  assert.doesNotMatch(runtime, /LAIBE_ALLOWED_ORIGINS|\/auth\/v1\/user/u);
  assert.doesNotMatch(
    runtime,
    /console\.|localStorage|sessionStorage|document\.|location\./u,
  );
  assert.doesNotMatch(
    runtime,
    /raw_user_meta_data|user_metadata|auth\.jwt\(\)/u,
  );
  assert.match(
    runtime,
    /allowedOrigins:\s*Object\.freeze\(\[\]\)|allowedOrigins:\s*\[\]/u,
  );
  assert.match(
    runtime,
    /Object\.freeze\([\s\S]*runtimeAvailable[\s\S]*bootstrapDependencies[\s\S]*verifiedSessionProducer[\s\S]*sessionRevoker/u,
  );
});

test("runtime environment is a closed seven-name contract and Supabase URL validation precedes crypto and composition", () => {
  const runtime = source(runtimeUrl);
  const expected = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LAIBE_DRS_APP_ORIGIN",
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
  ];
  for (const name of expected) {
    assert.match(runtime, new RegExp(`"${name}"`, "u"));
  }
  const environmentNames = [
    ...runtime.matchAll(
      /"(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|LAIBE_[A-Z0-9_]+)"/gu,
    ),
  ]
    .map((match) => match[1]);
  assert.deepEqual([...new Set(environmentNames)].sort(), expected.sort());
  assert.match(runtime, /new URL\(value\)\.origin|parsed\.origin/u);
  assert.match(runtime, /127\.0\.0\.1|\[::1\]/u);
  assert.match(runtime, /__Host-/u);
  assert.match(runtime, /32/u);
  assert.match(runtime, /900/u);
  assert.match(runtime, /proofTtlSeconds:\s*60/u);
  assert.match(runtime, /sameSite:\s*"Lax"/u);
});

test("migration creates a private forced-RLS digest-only table with indexed authority and expiry lookups", () => {
  const sql = source(migrationUrl);
  const table = sql.match(
    /create table integration\.drs_server_sessions\s*\(([\s\S]*?)\n\);/iu,
  )?.[1];
  assert.ok(table, "private session table must be declared");
  for (
    const column of [
      /server_session_id\s+uuid\s+primary key/iu,
      /access_token_digest\s+text/iu,
      /authenticated_user_id\s+uuid/iu,
      /specialist_id\s+uuid/iu,
      /authorization_subject\s+text/iu,
      /issued_at\s+timestamptz/iu,
      /expires_at\s+timestamptz/iu,
      /revoked_at\s+timestamptz/iu,
    ]
  ) assert.match(table, column);
  for (
    const forbidden of [
      /\baccess_token\b/iu,
      /provider/iu,
      /cookie/iu,
      /proof/iu,
      /^\s*(?:key|encryption_key|signing_key)\s+/imu,
      /case_id/iu,
      /grant/iu,
      /bucket/iu,
      /\bpath\b/iu,
    ]
  ) assert.doesNotMatch(table, forbidden);
  assert.match(
    sql,
    /alter table integration\.drs_server_sessions enable row level security/iu,
  );
  assert.match(
    sql,
    /alter table integration\.drs_server_sessions force row level security/iu,
  );
  assert.doesNotMatch(sql, /create\s+policy/iu);
  assert.match(
    sql,
    /revoke all on table integration\.drs_server_sessions from public, anon, authenticated, service_role/iu,
  );
  assert.match(sql, /create index[\s\S]*authenticated_user_id/iu);
  assert.match(sql, /create index[\s\S]*specialist_id/iu);
  assert.match(
    sql,
    /create index[\s\S]*expires_at[\s\S]*where revoked_at is null/iu,
  );
});

test("issue verify and revoke RPCs are postgres-owned closed service-role SECURITY DEFINER contracts", () => {
  const sql = source(migrationUrl);
  const signatures = [
    "drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz)",
    "drs_server_session_verify_v1(uuid,text)",
    "drs_server_session_revoke_v1(uuid,text)",
  ];
  for (const name of ["issue", "verify", "revoke"]) {
    assert.match(
      sql,
      new RegExp(
        `create or replace function public\\.drs_server_session_${name}_v1\\(`,
        "iu",
      ),
    );
  }
  assert.equal((sql.match(/security definer/giu) ?? []).length, 3);
  assert.equal((sql.match(/set search_path\s*=\s*''/giu) ?? []).length, 3);
  for (const signature of signatures) {
    const escaped = signature.replace(/[()]/gu, (value) => `\\${value}`);
    assert.match(
      sql,
      new RegExp(
        `alter function public\\.${escaped}[\\s\\S]*?owner to postgres`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.${escaped}[\\s\\S]*?from public, anon, authenticated, service_role`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `grant execute on function public\\.${escaped}[\\s\\S]*?to service_role`,
        "iu",
      ),
    );
  }
  assert.doesNotMatch(
    sql,
    /grant execute[\s\S]*to\s+(?:public|anon|authenticated)\b/iu,
  );
  assert.match(
    sql,
    /integration\.drs_identity_authority_resolve_locked_v1\(\s*p_authenticated_user_id,\s*null,\s*p_authorization_subject/iu,
  );
  assert.match(sql, /p_expires_at\s*>\s*v_now/iu);
  assert.match(
    sql,
    /p_expires_at\s*>\s*v_now\s*\+\s*interval\s*'15 minutes'/iu,
  );
  assert.match(sql, /on conflict[\s\S]*do nothing/iu);
  assert.match(sql, /revoked_at is null[\s\S]*expires_at\s*>/iu);
  assert.match(sql, /jsonb_build_object\(\s*'revoked',\s*true\s*\)/iu);
  assert.match(sql, /jsonb_build_object\(\s*'revoked',\s*false\s*\)/iu);
});

test("issue and verify use PostgreSQL-native exact 14-key authority closure", () => {
  const sql = source(migrationUrl);
  assert.doesNotMatch(sql, /jsonb_object_length\s*\(/iu);

  for (const name of ["issue", "verify"]) {
    const rpc = rpcSource(sql, name);
    assert.match(
      rpc,
      new RegExp(
        String
          .raw`not\s*\(\s*v_authority\s*\?&\s*${exactAuthorityArrayPattern}\s*and\s*v_authority\s*-\s*${exactAuthorityArrayPattern}\s*=\s*'\{\}'::jsonb\s*\)`,
        "iu",
      ),
      `${name} must accept all and only the admitted authority keys`,
    );
  }
});

test("issue rejects JSON-null authority facts with eight null-safe exact comparisons", () => {
  const issue = rpcSource(source(migrationUrl), "issue");
  const comparisons = [
    [
      /v_authority ->> 'authenticated_user_id'\s+is distinct from\s+p_authenticated_user_id::text/iu,
      /v_authority ->> 'authenticated_user_id'\s*<>/iu,
    ],
    [
      /v_authority ->> 'specialist_id'\s+is distinct from\s+p_specialist_id::text/iu,
      /v_authority ->> 'specialist_id'\s*<>/iu,
    ],
    [
      /v_authority ->> 'authorization_subject'\s+is distinct from\s+p_authorization_subject/iu,
      /v_authority ->> 'authorization_subject'\s*<>/iu,
    ],
    [
      /v_authority ->> 'account_role'\s+is distinct from\s+'drs'/iu,
      /v_authority ->> 'account_role'\s*<>/iu,
    ],
    [
      /v_authority ->> 'auth_binding_status'\s+is distinct from\s+'active'/iu,
      /v_authority ->> 'auth_binding_status'\s*<>/iu,
    ],
    [
      /v_authority ->> 'specialist_status'\s+is distinct from\s+'active'/iu,
      /v_authority ->> 'specialist_status'\s*<>/iu,
    ],
    [
      /v_authority ->> 'assignment_status'\s+is distinct from\s+'active'/iu,
      /v_authority ->> 'assignment_status'\s*<>/iu,
    ],
    [
      /v_authority ->> 'lock_status'\s+is distinct from\s+'locked'/iu,
      /v_authority ->> 'lock_status'\s*<>/iu,
    ],
  ];

  assert.equal(comparisons.length, 8);
  for (const [required, unsafe] of comparisons) {
    assert.match(issue, required);
    assert.doesNotMatch(issue, unsafe);
  }
});

test("verify locks the session and rejects identity authority rotation before returning stored facts", () => {
  const verify = rpcSource(source(migrationUrl), "verify");
  const stored = {
    authenticated_user_id: "user-1",
    specialist_id: "specialist-a",
    authorization_subject: "subject-a",
  };
  const currentAuthority = {
    authorized: true,
    authenticated_user_id: "user-1",
    specialist_id: "specialist-b",
    authorization_subject: "subject-b",
    account_role: "drs",
    auth_binding_status: "active",
    specialist_status: "active",
    assignment_status: "active",
    lock_status: "locked",
    terminated_at: null,
    valid_from: 1,
    valid_until: 3,
  };
  assert.equal(
    sessionAuthorityIsCurrent(stored, currentAuthority, 2),
    false,
    "a specialist-A session must not authenticate a rotated specialist-B binding",
  );

  assert.match(
    verify,
    /select[\s\S]*?s\.authenticated_user_id,[\s\S]*?s\.specialist_id,[\s\S]*?s\.authorization_subject,[\s\S]*?s\.expires_at,[\s\S]*?s\.revoked_at[\s\S]*?where s\.server_session_id = p_server_session_id[\s\S]*?and s\.access_token_digest = p_access_token_digest[\s\S]*?for update;/iu,
  );
  assert.match(
    verify,
    /integration\.drs_identity_authority_resolve_locked_v1\(\s*v_session\.authenticated_user_id,\s*null,\s*v_session\.authorization_subject\s*\)/iu,
  );
  for (
    const exactMatch of [
      /v_authority ->> 'authenticated_user_id'\s+is distinct from\s+v_session\.authenticated_user_id::text/iu,
      /v_authority ->> 'specialist_id'\s+is distinct from\s+v_session\.specialist_id::text/iu,
      /v_authority ->> 'authorization_subject'\s+is distinct from\s+v_session\.authorization_subject/iu,
      /v_authority ->> 'auth_binding_status'\s+is distinct from\s+'active'/iu,
      /v_authority ->> 'specialist_status'\s+is distinct from\s+'active'/iu,
      /v_authority ->> 'assignment_status'\s+is distinct from\s+'active'/iu,
      /v_authority ->> 'lock_status'\s+is distinct from\s+'locked'/iu,
      /v_authority -> 'terminated_at'\s+is distinct from\s+'null'::jsonb/iu,
    ]
  ) assert.match(verify, exactMatch);

  const rowLock = verify.indexOf("for update;");
  const authorityResolve = verify.indexOf(
    "integration.drs_identity_authority_resolve_locked_v1(",
  );
  const returnProjection = verify.indexOf("return jsonb_build_object(");
  assert.ok(
    rowLock >= 0 && rowLock < authorityResolve &&
      authorityResolve < returnProjection,
    "the stored session row must be locked before current authority is rechecked",
  );
});

test("issue verify and revoke use only post-lock clock values for current-state decisions", () => {
  const sql = source(migrationUrl);
  const issue = rpcSource(sql, "issue");
  const verify = rpcSource(sql, "verify");
  const revoke = rpcSource(sql, "revoke");

  for (const rpc of [issue, verify, revoke]) {
    assert.match(rpc, /v_now\s+timestamptz\s*;/iu);
    assert.doesNotMatch(
      rpc,
      /v_now\s+timestamptz\s*:=\s*clock_timestamp\(\)/iu,
    );
    assert.equal(
      (rpc.match(/v_now\s*:=\s*clock_timestamp\(\)/giu) ?? []).length,
      1,
    );
  }

  const issueResolve = issue.indexOf(
    "integration.drs_identity_authority_resolve_locked_v1(",
  );
  const issueNow = issue.indexOf("v_now := clock_timestamp();");
  const issueExpiry = issue.indexOf("p_expires_at <= v_now");
  const issueInsert = issue.indexOf(
    "insert into integration.drs_server_sessions",
  );
  assert.ok(
    issueResolve >= 0 && issueResolve < issueNow && issueNow < issueExpiry &&
      issueExpiry < issueInsert,
    "issue must refresh time after locked authority resolution and before expiry checks or writes",
  );

  const verifyLock = verify.indexOf("for update;");
  const verifyResolve = verify.indexOf(
    "integration.drs_identity_authority_resolve_locked_v1(",
  );
  const verifyNow = verify.indexOf("v_now := clock_timestamp();");
  const verifyExpiry = verify.indexOf("v_session.expires_at <= v_now");
  const verifyReturn = verify.indexOf("return jsonb_build_object(");
  const verifyPreLock = verify.slice(0, verifyLock);
  assert.doesNotMatch(
    verifyPreLock,
    /revoked_at is null|expires_at\s*>\s*v_now/iu,
  );
  assert.ok(
    verifyLock >= 0 && verifyLock < verifyResolve &&
      verifyResolve < verifyNow &&
      verifyNow < verifyExpiry && verifyExpiry < verifyReturn,
    "verify must refresh time after the row and authority locks before terminal predicates",
  );

  const revokeLock = revoke.indexOf("for update;");
  const revokeNow = revoke.indexOf("v_now := clock_timestamp();");
  const revokeExpiry = revoke.indexOf("v_session.expires_at <= v_now");
  const revokeUpdate = revoke.indexOf(
    "update integration.drs_server_sessions",
  );
  const revokePreLock = revoke.slice(0, revokeLock);
  assert.doesNotMatch(
    revokePreLock,
    /revoked_at is null|expires_at\s*>\s*v_now/iu,
  );
  assert.ok(
    revokeLock >= 0 && revokeLock < revokeNow && revokeNow < revokeExpiry &&
      revokeExpiry < revokeUpdate,
    "revoke must refresh time after its exact row lock before expiry checks or writes",
  );
  assert.match(
    revoke.slice(revokeUpdate),
    /where server_session_id = p_server_session_id[\s\S]*?and access_token_digest = p_access_token_digest[\s\S]*?and revoked_at is null[\s\S]*?and expires_at > v_now/iu,
  );
});

test("endpoint constructs runtime once, injects only bootstrap dependencies, preserves JWT mode and Deno serve", () => {
  const endpoint = source(endpointUrl);
  assert.match(endpoint, /createDrsSecureSessionRuntime\(\)/u);
  assert.equal(
    (endpoint.match(/createDrsSecureSessionRuntime\(\)/gu) ?? []).length,
    1,
  );
  assert.match(
    endpoint,
    /createDrsSessionBootstrapEndpoint\(\s*secureSessionRuntime\.bootstrapDependencies,?\s*\)/u,
  );
  assert.doesNotMatch(endpoint, /sessionRevoker|verifiedSessionProducer/u);
  assert.match(endpoint, /VERIFY_JWT_REQUIRED\s*=\s*false/u);
  assert.match(endpoint, /Deno\.serve\(handler\)/u);
});
