import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(
  fileURLToPath(new URL("../package.json", import.meta.url)),
);
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260831182641_drs_remote_baseline_bridge_w2.sql",
);
const realPgPath = join(
  root,
  "supabase",
  "tests",
  "drs_remote_baseline_bridge_real_pg.test.mjs",
);
const docPath = join(
  root,
  "docs",
  "drs_backend",
  "drs_remote_baseline_bridge_w2.md",
);

const expectedLedger = [
  "20260820112418",
  "20260820112429",
  "20260820112430",
  "20260820112835",
  "20260824094039",
  "20260825065950",
  "20260826035856",
];

const wrapperSignatures = [
  "public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)",
  "public.drs_identity_link_state_claim_v1(text,text,text,timestamptz)",
  "public.drs_identity_link_state_fail_v1(uuid,timestamptz,text)",
  "public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)",
  "public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)",
];

function executable(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/--[^\r\n]*/gu, " ")
    .replace(/'(?:''|[^'])*'/gsu, "''");
}

function functionBlock(source, qualifiedName) {
  const start = source.indexOf(`create or replace function ${qualifiedName}`);
  assert.notEqual(start, -1, `${qualifiedName} declaration is required`);
  const end = source.indexOf("\n$$;", start);
  assert.notEqual(end, -1, `${qualifiedName} terminator is required`);
  return source.slice(start, end + 4);
}

const hardenedSecurityDefiners = [
  "drs_private.is_authorized_case_specialist_at",
  "drs_private.is_current_actor_active_case_specialist",
  "drs_private.resolve_pgcrypto_schema",
  "drs_private.sha256_utf8",
  "drs_private.insert_drs_audit_event",
  "public.drs_append_audit_event",
  "public.drs_append_ai_review_event",
];

test("focused RED: forward bridge binds exact-seven preimage and exact transaction", () => {
  const source = readFileSync(migrationPath, "utf8");
  const preflight = source.slice(0, source.indexOf("-- BRIDGE_PHASE_CORE"));
  assert.match(source, /^begin;\s*$/mu);
  assert.match(source, /commit;\s*$/u);
  assert.match(source, /DRS_REMOTE_BASELINE_LEDGER_MISMATCH/u);
  assert.match(source, /DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH/u);
  assert.match(source, /DRS_REMOTE_BASELINE_PARTIAL_FOOTPRINT/u);
  assert.match(source, /DRS_REMOTE_BASELINE_POSTCONDITION_FAILED/u);
  for (const version of expectedLedger) {
    assert.match(source, new RegExp(version, "u"));
  }
  assert.equal((source.match(/2026082\d{7}/gu) ?? []).length >= 7, true);
  for (const signature of wrapperSignatures) {
    assert.equal(preflight.includes(`to_regprocedure('${signature}')`), true);
  }
  assert.match(
    preflight,
    /integration\.drs_case_identity_binding_assert_casework_v1\(\)/u,
  );
  for (
    const signature of [
      "public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz)",
      "public.drs_server_session_verify_v1(uuid,text)",
      "public.drs_server_session_revoke_v1(uuid,text)",
    ]
  ) assert.equal(preflight.includes(`to_regprocedure('${signature}')`), true);
  for (
    const prerequisite of [
      /to_regrole\('service_role'\)/u,
      /to_regrole\('authenticated'\)/u,
      /to_regrole\('anon'\)/u,
      /to_regnamespace\('extensions'\)/u,
      /extensions\.gen_random_uuid\(\)/u,
      /extension_record\.extname = 'pgcrypto'/u,
    ]
  ) assert.match(preflight, prerequisite);
});

test("focused RED: preflight binds immutable protected baseline fingerprints", () => {
  const source = readFileSync(migrationPath, "utf8");
  const preflight = source.slice(0, source.indexOf("-- BRIDGE_PHASE_CORE"));
  for (
    const selector of [
      /v_expected_cases_owner/u,
      /v_expected_members_owner/u,
      /v_expected_cases_acl_fingerprint/u,
      /v_expected_members_acl_fingerprint/u,
      /v_expected_cases_rls/u,
      /v_expected_members_rls/u,
      /v_expected_cases_force_rls/u,
      /v_expected_members_force_rls/u,
      /v_expected_cases_trigger_fingerprint/u,
      /v_expected_members_trigger_fingerprint/u,
      /v_expected_cases_constraint_fingerprint/u,
      /v_expected_members_constraint_fingerprint/u,
      /v_expected_cases_policy_fingerprint/u,
      /v_expected_members_policy_fingerprint/u,
      /v_expected_calendar_definition_fingerprint/u,
      /v_expected_calendar_owner/u,
      /v_expected_calendar_acl_fingerprint/u,
    ]
  ) assert.match(preflight, selector);
  assert.doesNotMatch(
    preflight,
    /create temporary table drs_bridge_preimage_fingerprint/iu,
  );
});

test("focused RED: policy roles are canonicalized by rendered name, never OID", () => {
  const source = readFileSync(migrationPath, "utf8");
  const preflight = source.slice(0, source.indexOf("-- BRIDGE_PHASE_CORE"));
  assert.match(preflight, /when role_oid = 0 then 'PUBLIC'/u);
  assert.match(preflight, /as role_name/u);
  assert.match(preflight, /order by role_name/u);
  assert.doesNotMatch(preflight, /order by role_oid/u);
});

test("bridge never mutates protected casework relations or migration history", () => {
  const sql = executable(readFileSync(migrationPath, "utf8"));
  for (const relation of ["casework.cases", "casework.case_members"]) {
    assert.doesNotMatch(
      sql,
      new RegExp(
        `\\b(?:create\\s+table|alter\\s+table|drop\\s+table|insert\\s+into|update|delete\\s+from|truncate\\s+table|grant|revoke|comment\\s+on\\s+table)\\s+${
          relation.replace(".", "\\.")
        }`,
        "iu",
      ),
    );
  }
  assert.doesNotMatch(
    sql,
    /references\s+casework\.(?:cases|case_members)\b/iu,
  );
  assert.doesNotMatch(
    sql,
    /\b(?:insert\s+into|update|delete\s+from|alter\s+table|drop\s+table|truncate\s+table)\s+supabase_migrations\.schema_migrations\b/iu,
  );
  assert.doesNotMatch(
    sql,
    /create\s+or\s+replace\s+function\s+integration\.google_calendar_drs_authorize_transaction_v1/iu,
  );
  for (
    const selector of [
      /cases_trigger_fingerprint/u,
      /members_trigger_fingerprint/u,
      /cases_constraint_fingerprint/u,
      /members_constraint_fingerprint/u,
      /cases_policy_fingerprint/u,
      /members_policy_fingerprint/u,
      /cases_owner/u,
      /members_owner/u,
      /cases_acl/u,
      /members_acl/u,
    ]
  ) assert.match(readFileSync(migrationPath, "utf8"), selector);
});

test("bridge installs the DRS authority, secure session, and hardened LINE lifecycle", () => {
  const source = readFileSync(migrationPath, "utf8");
  for (
    const selector of [
      /create table public\.drs_cases/iu,
      /create table public\.drs_specialists/iu,
      /create table integration\.drs_auth_specialist_bindings/iu,
      /create table integration\.drs_case_identity_bindings/iu,
      /integration\.drs_case_identity_binding_assert_casework_v1/iu,
      /create table integration\.drs_server_sessions/iu,
      /create table integration\.drs_line_account_bindings/iu,
      /create table integration\.drs_line_notification_outbox/iu,
      /create table integration\.drs_line_delivery_receipts/iu,
      /integration\.drs_identity_authority_resolve_locked_v1/iu,
      /DRS_AUTH_BINDING_DELETE_FORBIDDEN/u,
      /v_now\s*:=\s*clock_timestamp\(\)/u,
    ]
  ) assert.match(source, selector);
  assert.doesNotMatch(source, /line_user_id\s+text/iu);
  assert.doesNotMatch(source, /provider_(?:access|refresh)_token/iu);
});

test("identity-state RPC wrappers are public, fixed-search-path, and service-role only", () => {
  const source = readFileSync(migrationPath, "utf8");
  for (const signature of wrapperSignatures) {
    const basename = signature.slice("public.".length, signature.indexOf("("));
    assert.match(
      source,
      new RegExp(`function\\s+public\\.${basename}\\s*\\(`, "iu"),
    );
    assert.match(
      source,
      new RegExp(
        `revoke\\s+all\\s+on\\s+function\\s+${
          signature.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
        }\\s+from\\s+public,\\s*anon,\\s*authenticated,\\s*service_role`,
        "iu",
      ),
    );
    assert.match(
      source,
      new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+${
          signature.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
        }\\s+to\\s+service_role`,
        "iu",
      ),
    );
  }
  assert.equal((source.match(/security definer/giu) ?? []).length >= 5, true);
  assert.equal(
    (source.match(/set search_path = ''/gu) ?? []).length >= 5,
    true,
  );
  assert.doesNotMatch(
    source,
    /grant\s+usage\s+on\s+schema\s+integration\s+to\s+service_role/iu,
  );
  assert.match(
    source,
    /revoke\s+all\s+on\s+schema\s+integration\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/iu,
  );
  const privateIdentitySection = source.slice(
    source.indexOf(
      "revoke all on function integration.drs_identity_link_state_create_v1",
    ),
    source.indexOf("-- BRIDGE_PHASE_IDENTITY_AUTHORITY"),
  );
  assert.equal(
    (privateIdentitySection.match(
      /from public, anon, authenticated, service_role;/gu,
    ) ?? []).length,
    6,
  );
  assert.doesNotMatch(
    privateIdentitySection,
    /grant\s+execute\s+on\s+function\s+integration\./iu,
  );
  assert.match(
    source,
    /has_schema_privilege\('service_role', 'integration', 'usage'\)/u,
  );
  assert.match(
    source,
    /has_function_privilege\('service_role', v_private_signature, 'execute'\)/u,
  );
});

test("all relevant SECURITY DEFINER functions use an empty search path", () => {
  const source = readFileSync(migrationPath, "utf8");
  for (const qualifiedName of hardenedSecurityDefiners) {
    const block = functionBlock(source, qualifiedName);
    assert.match(block, /security definer/iu);
    assert.match(block, /set search_path = ''/u);
    assert.doesNotMatch(
      block,
      /set search_path = (?:public|pg_catalog|[^'\r\n])/iu,
    );
  }

  for (
    const qualifiedReference of [
      /from public\.drs_case_specialist_assignments/u,
      /from public\.drs_case_audit_events/u,
      /insert into public\.drs_case_audit_events/u,
      /drs_private\.is_authorized_case_specialist_at/u,
      /drs_private\.resolve_pgcrypto_schema/u,
      /drs_private\.parse_rfc3339_millis/u,
      /drs_private\.sha256_utf8/u,
      /drs_private\.insert_drs_audit_event/u,
      /from pg_catalog\.pg_extension/u,
      /join pg_catalog\.pg_namespace/u,
    ]
  ) assert.match(source, qualifiedReference);
});

test("final owner visibility is derived through canonical casework membership", () => {
  const source = readFileSync(migrationPath, "utf8");
  assert.match(source, /casework\.case_members/iu);
  assert.match(source, /integration\.drs_case_identity_bindings/iu);
  assert.match(source, /member_record\.role\s*=\s*'owner'/iu);
  assert.doesNotMatch(
    source.slice(source.lastIndexOf("BRIDGE_FINAL_POLICY_BEGIN")),
    /visible_case\.owner_id\s*=\s*\(select auth\.uid\(\)\)/iu,
  );
});

test("real gate and operator note stay local, disposable, and fail closed", () => {
  const realGate = readFileSync(realPgPath, "utf8");
  const doc = readFileSync(docPath, "utf8");
  assert.match(realGate, /public\.ecr\.aws\/supabase\/postgres:17\.6\.1\.165/u);
  assert.match(realGate, /--network["'],\s*["']none/u);
  assert.match(realGate, /20260831182641_drs_remote_baseline_bridge_w2\.sql/u);
  assert.match(realGate, /DRS_REMOTE_BASELINE_LEDGER_MISMATCH/u);
  for (const relation of ["casework.cases", "casework.case_members"]) {
    assert.match(
      realGate,
      new RegExp(
        `alter table ${relation.replace(".", "\\.")} disable row level security`,
        "u",
      ),
    );
  }
  assert.match(realGate, /POLICY_ROLE_OID_ORDER_DRIFT_NOT_REPRODUCED/u);
  assert.match(realGate, /service_role/u);
  assert.doesNotMatch(realGate, /Deno\.env/u);
  assert.doesNotMatch(
    realGate,
    /SUPABASE_DB_URL|DATABASE_URL|DRS_REAL_PG_URL/u,
  );
  assert.match(doc, /local source only/iu);
  assert.match(doc, /never.*remote/iu);
  assert.match(doc, /casework\.cases/u);
  assert.match(doc, /casework\.case_members/u);
  assert.match(doc, /DISABLE ROW LEVEL SECURITY/u);
});
