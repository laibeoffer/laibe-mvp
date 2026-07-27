import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const reconciliationRoot = resolve(root, "supabase", "core_reconciliation");

function read(name) {
  const path = resolve(reconciliationRoot, name);
  assert.ok(existsSync(path), `${name} has not been generated`);
  return readFileSync(path, "utf8");
}

test("Core reconciliation manifest binds the exact local migration components", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.schema_version, "a5.core_reconciliation.v1");
  assert.equal(manifest.target_project_ref, "zdwuyomhswjcbbpbhpcq");
  assert.equal(manifest.remote_applied, false);
  assert.equal(manifest.source_migrations.length, 6);
  assert.deepEqual(
    manifest.source_migrations.map((item) => item.path),
    [
      "supabase/migrations/20260726000100_pcm_knowledge_foundation.sql",
      "supabase/migrations/20260727070737_pcm_knowledge_domain_rls_hardening.sql",
      "supabase/migrations/20260727072627_pcm_knowledge_active_session_hardening.sql",
      "supabase/migrations/20260727094259_knowledge_case_event_next_action.sql",
      "supabase/migrations/20260727161457_pcm_woodwork_candidates_staging.sql",
      "supabase/migrations/20260727193000_pcm_knowledge_rpc_surface_hardening.sql",
    ],
  );
  for (const component of manifest.source_migrations) {
    assert.match(component.sha256, /^[a-f0-9]{64}$/);
    assert.ok(component.bytes > 0);
  }
});

test("ordered Core bundle is transaction-bound and carries collision preflight", () => {
  const preflight = read("000_preflight.sql");
  const bundle = read("010_a5_knowledge_foundation.sql");

  assert.match(preflight, /a5\.knowledge_foundation\.core_readiness\.v1/i);
  assert.match(preflight, /to_regnamespace\('knowledge_staging'\)/i);
  assert.match(preflight, /to_regnamespace\('knowledge'\)/i);
  assert.match(preflight, /to_regnamespace\('casework'\)/i);
  assert.doesNotMatch(
    preflight,
    /public\.a5_knowledge_reconciliation_marker/i,
  );
  assert.match(
    preflight,
    /to_regnamespace\('knowledge_staging'\)[\s\S]*?to_regnamespace\('knowledge'\)[\s\S]*?to_regnamespace\('casework'\)[\s\S]*?raise exception/i,
  );
  assert.equal((bundle.match(/\bbegin\s*;/gi) || []).length, 1);
  assert.equal((bundle.match(/\bcommit\s*;/gi) || []).length, 1);
  assert.match(bundle, /000_preflight\.sql/i);
  assert.match(bundle, /20260727193000_pcm_knowledge_rpc_surface_hardening\.sql/i);
  assert.match(
    bundle,
    /comment\s+on\s+schema\s+knowledge\s+is\s+'a5\.knowledge_foundation\.core_readiness\.v1;target=zdwuyomhswjcbbpbhpcq'/i,
  );
  assert.doesNotMatch(
    bundle,
    /(create|drop|alter|truncate)\s+table\s+public\./i,
  );
});

test("verification proves scope, privileges and unapplied remote status", () => {
  const verify = read("900_verify.sql");
  const manifest = JSON.parse(read("manifest.json"));

  assert.match(verify, /knowledge_staging[\s\S]*?knowledge[\s\S]*?casework/i);
  assert.match(verify, /information_schema\.role_table_grants/i);
  assert.match(verify, /routine_schema/i);
  assert.match(verify, /rowsecurity/i);
  assert.equal(manifest.remote_applied, false);
  assert.equal(manifest.remote_verification.migrations, 0);
  assert.equal(manifest.remote_verification.a5_application_tables, 0);
});

test("rollback is marker-gated, data-gated and limited to A5-owned objects", () => {
  const rollback = read("990_rollback.sql");

  assert.match(rollback, /a5\.knowledge_foundation\.core_readiness\.v1/i);
  assert.match(rollback, /obj_description[\s\S]*?pg_namespace/i);
  assert.match(
    rollback,
    /pg_class[\s\S]*?knowledge_staging[\s\S]*?knowledge[\s\S]*?casework[\s\S]*?format\([\s\S]*?limit 1/i,
  );
  assert.match(rollback, /drop\s+schema\s+knowledge_staging/i);
  assert.match(rollback, /drop\s+schema\s+knowledge/i);
  assert.match(rollback, /drop\s+schema\s+casework/i);
  assert.doesNotMatch(rollback, /drop\s+schema[\s\S]*?\bcascade\b/i);
  assert.match(rollback, /pg_get_function_identity_arguments/i);
  assert.match(rollback, /drop\s+table\s+%I\.%I/i);
  assert.match(rollback, /knowledge-source-private/i);
  assert.match(rollback, /case-documents-private/i);
  assert.doesNotMatch(
    rollback,
    /drop\s+(table|schema)\s+(?:public|auth|storage)\./i,
  );
  assert.match(
    rollback,
    /a5_drop_schema_tables[\s\S]*?nspname\s+in\s*\([\s\S]*?'knowledge_staging'[\s\S]*?'knowledge'[\s\S]*?'casework'[\s\S]*?\)[\s\S]*?'drop table %I\.%I'/i,
  );
});

test("Core apply README requires a fresh Owner gate and describes rollback limits", () => {
  const readme = read("README.md");
  for (const phrase of [
    "尚未套用",
    "A0／Owner",
    "zdwuyomhswjcbbpbhpcq",
    "preflight",
    "rollback",
    "非 A5",
    "重複套用會停止",
  ]) {
    assert.ok(readme.includes(phrase), `README is missing ${phrase}`);
  }
});
