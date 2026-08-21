import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("bootstrap SQL provides a local auth schema and disposable application roles", () => {
  const sql = read("scripts/drs-core-postgres-runtime/bootstrap-local-auth.sql");

  assert.match(sql, /create schema if not exists auth/i);
  assert.match(sql, /create or replace function auth\.uid\(\)/i);
  assert.match(sql, /create role authenticated/i);
  assert.match(sql, /create role service_role/i);
  assert.match(sql, /request\.jwt\.claim\.sub/i);
});

test("runtime verification SQL exercises guarded append, trusted AI append, RLS, and direct audit DML denial", () => {
  const sql = read("scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql");

  assert.match(sql, /set role service_role/i);
  assert.match(sql, /public\.drs_append_audit_event/i);
  assert.match(sql, /public\.drs_append_ai_review_event/i);
  assert.match(sql, /permission denied|42501|insufficient_privilege/i);
  assert.match(sql, /set role authenticated/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /review_service_unavailable|manual_exception_send|pre_send_review_not_performed_break_glass/i);
});

test("runtime verification SQL makes expect_message fail closed with a distinct sqlstate and a self-regression assertion", () => {
  const sql = read("scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql");

  assert.match(sql, /EXPECTED_FAILURE_NOT_RAISED/i);
  assert.match(sql, /errcode\s*=\s*'PDR01'/i);
  assert.match(sql, /when sqlstate\s+'PDR01'\s+then\s+null/i);
  assert.match(sql, /perform drs_runtime\.expect_message\(\s*\$sql\$select 1\$sql\$\s*,\s*'permission denied'/is);
});

test("runtime verification SQL grants only the bounded disposable-runtime helper and authenticated select privileges", () => {
  const sql = read("scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql");

  assert.match(sql, /revoke all on schema drs_runtime from public/i);
  assert.match(sql, /grant usage on schema drs_runtime to authenticated,\s*service_role/i);
  assert.match(sql, /revoke all on function drs_runtime\.assert_true\(boolean,\s*text\) from public/i);
  assert.match(sql, /revoke all on function drs_runtime\.expect_message\(text,\s*text\) from public/i);
  assert.match(sql, /grant execute on function drs_runtime\.assert_true\(boolean,\s*text\) to authenticated,\s*service_role/i);
  assert.match(sql, /grant execute on function drs_runtime\.expect_message\(text,\s*text\) to authenticated,\s*service_role/i);
  assert.match(sql, /grant select on public\.drs_cases,\s*public\.drs_case_audit_events to authenticated/i);
});

test("runtime verification SQL proves audit ACL denial and persisted IDs from table state instead of tautologies", () => {
  const sql = read("scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql");

  assert.match(sql, /EXPECTED_DIRECT_AUDIT_DML_DENIAL/i);
  assert.match(sql, /EXPECTED_DIRECT_AUDIT_UPDATE_DENIAL/i);
  assert.match(sql, /EXPECTED_DIRECT_AUDIT_DELETE_DENIAL/i);
  assert.match(sql, /select[\s\S]*event_id::text as persisted_line_event_id[\s\S]*from public\.drs_case_audit_events/is);
  assert.match(sql, /select[\s\S]*event_id::text as persisted_ai_review_event_id[\s\S]*from public\.drs_case_audit_events/is);
  assert.doesNotMatch(sql, /:'line_event_id'::uuid\s*=\s*:'line_event_id'::uuid/i);
  assert.doesNotMatch(sql, /:'ai_review_event_id'::uuid\s*=\s*:'ai_review_event_id'::uuid/i);
});

test("runtime harness source keeps supabase detection read-only, proof reporting evidence-derived, and docker trust auth off host ports", () => {
  const harness = read("scripts/drs-core-postgres-runtime/runtime-harness.mjs");
  const dockerRunFunction = harness.match(/export function buildDockerRunArgs[\s\S]*?\n}/)?.[0] ?? "";

  assert.match(harness, /commandName === "supabase"[\s\S]*probe skipped/i);
  assert.match(harness, /const available = versionProbe\.status === 0/i);
  assert.doesNotMatch(harness, /Boolean\(location\)\s*\|\|\s*versionProbe\.status === 0/i);
  assert.match(harness, /buildVerifiedProofs/i);
  assert.equal(dockerRunFunction.includes('"-p"'), false);
});

test("W2 runtime doc states disposable-local scope, blocked fallback, and no live Supabase proof", () => {
  const doc = read("docs/drs_backend/core_data_audit_w2_runtime.md");

  assert.match(doc, /disposable local postgresql/i);
  assert.match(doc, /no remote supabase|not remote supabase/i);
  assert.match(doc, /blocked/i);
  assert.match(doc, /live postgres proof/i);
  assert.match(doc, /exact next safe action/i);
  assert.match(doc, /docker exec|no published host port/i);
  assert.match(doc, /evidence-derived|runtime assertions/i);
});
