import assert from "node:assert/strict";

const MIGRATION_URL = new URL(
  "../migrations/20260826190000_drs_document_storage_w1.sql",
  import.meta.url,
);

async function migration() {
  return await Deno.readTextFile(MIGRATION_URL);
}

Deno.test("focused RED 2: canonical document schema and Mode A RPC are absent", async () => {
  const sql = await migration();
  for (
    const table of [
      "documents",
      "document_versions",
      "document_version_sources",
      "document_artifacts",
      "document_upload_intents",
      "evidence_references",
      "submission_snapshots",
      "document_operation_receipts",
      "document_orphan_cleanup_work_items",
    ]
  ) assert.match(sql, new RegExp(`create table casework\\.${table}`, "u"));
  assert.match(
    sql,
    /create or replace function public\.server_document_operation_v1/u,
  );
});

Deno.test("migration preserves casework as sole truth and enforces composite same-case ancestry", async () => {
  const sql = await migration();
  assert.doesNotMatch(sql, /create table public\.drs_(?:cases|documents)/iu);
  for (
    const marker of [
      "unique (case_id, id)",
      "primary key (case_id, document_id, version_id)",
      "foreign key (case_id, document_id)",
      "foreign key (case_id, document_id, version_id)",
      "foreign key (case_id, snapshot_id)",
    ]
  ) assert.match(sql, new RegExp(marker.replace(/[()]/gu, "\\$&"), "iu"));
  assert.match(
    sql,
    /document_version_sources[\s\S]*?unique \(bucket_id, object_key\)/iu,
  );
  assert.match(
    sql,
    /document_artifacts[\s\S]*?check \(artifact_kind <> 'SOURCE'\)/iu,
  );
});

Deno.test("formal versions require exactly one canonical source and immutable rows", async () => {
  const sql = await migration();
  assert.match(sql, /document_formal_source_count_enforce_v1/u);
  assert.match(sql, /constraint trigger document_formal_source_count/u);
  assert.match(sql, /deferrable initially deferred/u);
  assert.match(sql, /FORMAL_VERSION_SOURCE_COUNT_INVALID/u);
  assert.match(sql, /document_append_only_enforce_v1/u);
  assert.match(sql, /raise exception 'DOCUMENT_APPEND_ONLY'/u);
});

Deno.test("RLS, privileges, owners and signature-scoped execution are fail closed", async () => {
  const sql = await migration();
  const tables = [
    "documents",
    "document_versions",
    "document_version_sources",
    "document_artifacts",
    "document_upload_intents",
    "evidence_references",
    "submission_snapshots",
    "document_snapshot_items",
    "document_operation_receipts",
    "document_orphan_cleanup_work_items",
  ];
  for (const table of tables) {
    assert.match(
      sql,
      new RegExp(
        `alter table casework\\.${table} enable row level security`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `alter table casework\\.${table} force row level security`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on table casework\\.${table}[\\s\\S]*?from public, anon, authenticated, service_role`,
        "iu",
      ),
    );
  }
  assert.match(sql, /security definer\s+set search_path = ''/iu);
  assert.match(sql, /security invoker\s+set search_path = ''/iu);
  assert.match(
    sql,
    /alter function casework\.server_document_operation_locked_v1\([\s\S]*?owner to postgres/iu,
  );
  assert.match(
    sql,
    /grant execute on function public\.server_document_operation_v1\([\s\S]*?to service_role/iu,
  );
  assert.doesNotMatch(sql, /grant execute on all functions|grant all/iu);
});

Deno.test("Mode A rechecks exact current versioned authority and never substitutes ambient auth.uid", async () => {
  const sql = await migration();
  assert.match(
    sql,
    /integration\.drs_workspace_grant_assert_current_locked_v1\(/u,
  );
  for (
    const parameter of [
      "p_authenticated_user_id uuid",
      "p_expected_case_id uuid",
      "p_authorization_subject text",
      "p_grant_id uuid",
      "p_grant_version bigint",
      "p_operation text",
      "p_resource_ref text",
      "p_idempotency_key text",
      "p_expected_payload_sha256 text",
    ]
  ) assert.match(sql, new RegExp(parameter, "u"));
  assert.doesNotMatch(sql, /coalesce\s*\(\s*auth\.uid|auth\.uid\s*\(\s*\)/iu);
});

Deno.test("case events are extended as a closed superset with typed same-case references", async () => {
  const sql = await migration();
  for (
    const existing of [
      "CASE_CREATED",
      "HIGHEST_REVIEWER_GRANTED",
      "HIGHEST_REVIEWER_REVOKED",
    ]
  ) assert.match(sql, new RegExp(existing, "u"));
  for (
    const added of [
      "DOCUMENT_UPLOAD_INTENT_CREATED",
      "DOCUMENT_VERSION_FORMALIZED",
      "DOCUMENT_SNAPSHOT_RECORDED",
      "DOCUMENT_WITHDRAWN",
    ]
  ) assert.match(sql, new RegExp(added, "u"));
  assert.match(sql, /case_event_document_refs_same_case_v1/u);
  assert.match(
    sql,
    /foreign key \(case_id, document_id, document_version_id\)/iu,
  );
  assert.match(sql, /upload_intent_id uuid/u);
  assert.match(sql, /orphan_cleanup_work_item_id uuid/u);
  assert.match(
    sql,
    /foreign key \(case_id, document_id, upload_intent_id\)[\s\S]*?document_upload_intents\(case_id, document_id, intent_id\)/iu,
  );
  assert.match(
    sql,
    /foreign key \(case_id, orphan_cleanup_work_item_id\)[\s\S]*?document_orphan_cleanup_work_items\(case_id, work_item_id\)/iu,
  );
  assert.match(
    sql,
    /DOCUMENT_UPLOAD_INTENT_CREATED[\s\S]*?upload_intent_id is not null/iu,
  );
  assert.match(
    sql,
    /DOCUMENT_ORPHAN_CLEANUP_QUEUED[\s\S]*?orphan_cleanup_work_item_id is not null/iu,
  );
});

Deno.test("SQL never mutates Supabase Storage metadata rows and only allows server-owned keys", async () => {
  const sql = await migration();
  assert.doesNotMatch(
    sql,
    /(?:insert\s+into|update|delete\s+from)\s+storage\.(?:buckets|objects)/iu,
  );
  assert.doesNotMatch(sql, /create policy[\s\S]*?using\s*\(\s*true\s*\)/iu);
  assert.equal(
    [...sql.matchAll(
      /create policy drs_document_(?:intake|records)_[a-z_]+/giu,
    )]
      .length,
    4,
  );
  assert.match(
    sql,
    /native signed upload[\s\S]*?bypasses storage object rls[\s\S]*?mode a/iu,
  );
  assert.doesNotMatch(
    sql,
    /create policy[^;]+?on storage\.objects[^;]+?to\s+service_role/giu,
  );
  assert.match(
    sql,
    /document_storage_object_matches_v1[\s\S]*?drs-case-intake-private[\s\S]*?document_upload_intents[\s\S]*?drs-case-records-private[\s\S]*?document_version_sources/iu,
  );
  assert.equal(
    [...sql.matchAll(
      /create policy drs_document_(?:intake|records)_[a-z_]+[\s\S]*?as restrictive[\s\S]*?to anon, authenticated[\s\S]*?(?:using|with check)\s*\(\s*false\s*\)/giu,
    )].length,
    4,
  );
  assert.doesNotMatch(
    sql,
    /create policy[\s\S]*?to\s+public/iu,
  );
  assert.doesNotMatch(
    sql,
    /create policy[\s\S]*?(?:owner_id|storage\.foldername\s*\()/iu,
  );
  assert.match(sql, /drs-case-intake-private/u);
  assert.match(sql, /drs-case-records-private/u);
});

Deno.test("finalize replay is bound to the first idempotency key and request digest", async () => {
  const sql = await migration();
  assert.match(sql, /finalize_idempotency_key text/u);
  assert.match(sql, /finalize_request_payload_sha256 text/u);
  assert.match(
    sql,
    /finalize_idempotency_key is null[\s\S]*?finalize_request_payload_sha256 is null/iu,
  );
  assert.match(
    sql,
    /v_intent\.finalize_idempotency_key\s*<>\s*p_idempotency_key[\s\S]*?VERSION_CONFLICT/iu,
  );
  assert.match(
    sql,
    /v_intent\.finalize_request_payload_sha256\s*<>\s*p_expected_payload_sha256[\s\S]*?IDEMPOTENCY_CONFLICT/iu,
  );
  assert.match(
    sql,
    /requestPayloadSha256[\s\S]*?finalize_request_payload_sha256/iu,
  );
});

Deno.test("orphan cleanup is a typed work item, not a false execution receipt", async () => {
  const sql = await migration();
  assert.match(
    sql,
    /create table casework\.document_orphan_cleanup_work_items/u,
  );
  assert.match(sql, /cleanup_state[\s\S]*?'PENDING'/iu);
  assert.match(sql, /DOCUMENT_ORPHAN_CLEANUP_QUEUED/u);
  assert.doesNotMatch(sql, /DOCUMENT_ORPHAN_CLEANUP_COMPLETED/u);
  assert.match(
    sql,
    /p_operation = 'QUEUE_ORPHAN_CLEANUP'[\s\S]*?p_expected_payload_sha256\s*<>\s*pg_catalog\.encode\([\s\S]*?extensions\.digest\(pg_catalog\.convert_to\(p_resource_ref, 'UTF8'\), 'sha256'\)/iu,
  );
});
