import assert from "node:assert/strict";

const root = new URL("../../", import.meta.url);
const migrationUrl = new URL(
  "supabase/migrations/20260818160000_casework_authority_v1.sql",
  root,
);

async function migrationSource() {
  return await Deno.readTextFile(migrationUrl);
}

Deno.test(
  "focused RED: casework authority schema RLS and grants are absent",
  async () => {
    const sql = await migrationSource();
    assert.match(sql, /create schema if not exists casework;/u);
    assert.match(sql, /create table casework\.cases/u);
    assert.match(sql, /create table casework\.case_members/u);
    assert.match(sql, /create table casework\.case_events/u);
    assert.match(sql, /create table casework\.highest_reviewer_case_grants/u);
  },
);

Deno.test("casework authority migration binds active membership truth", async () => {
  const sql = await migrationSource();
  for (
    const required of [
      /membership_id uuid primary key/u,
      /unique \(case_id, user_id\)/u,
      /unique \(case_id, membership_id\)/u,
      /role text not null[\s\S]*?'owner'[\s\S]*?'pro'/u,
      /membership_status text not null[\s\S]*?'active'[\s\S]*?'revoked'/u,
      /valid_from timestamptz not null/u,
      /valid_until timestamptz/u,
      /revoked_at timestamptz/u,
      /authority_version bigint not null default 1/u,
      /membership_status = 'active'[\s\S]*?revoked_at is null/u,
      /membership_status = 'revoked'[\s\S]*?valid_until = revoked_at/u,
    ]
  ) assert.match(sql, required);
  assert.doesNotMatch(sql, /role[\s\S]{0,120}'vendor'/u);
});

Deno.test("casework authority migration enforces same-case immutable events", async () => {
  const sql = await migrationSource();
  assert.match(
    sql,
    /foreign key \(case_id, membership_id\)[\s\S]*?references casework\.case_members \(case_id, membership_id\)/u,
  );
  assert.match(
    sql,
    /foreign key \(case_id, created_event_id\)[\s\S]*?references casework\.case_events \(case_id, event_id\)/u,
  );
  assert.match(sql, /case_event_immutable_v1/u);
  assert.match(sql, /before update or delete on casework\.case_events/u);
  assert.match(sql, /raise exception 'CASE_EVENT_IMMUTABLE'/u);
});

Deno.test("casework authority tables are closed behind forced RLS", async () => {
  const sql = await migrationSource();
  for (
    const table of [
      "cases",
      "case_members",
      "case_events",
      "highest_reviewer_case_grants",
    ]
  ) {
    assert.match(
      sql,
      new RegExp(
        `alter table casework\\.${table} enable row level security;`,
        "u",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `alter table casework\\.${table} force row level security;`,
        "u",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on table casework\\.${table} from public, anon, authenticated, service_role;`,
        "u",
      ),
    );
  }
  assert.doesNotMatch(sql, /create policy/u);
});

Deno.test("casework authority functions use fixed owners and exact grants", async () => {
  const sql = await migrationSource();
  const publicSignatures = [
    "public.casework_case_create_v1\\(uuid, text, text, text\\)",
    "public.owner_workspace_grant_v1\\(uuid\\)",
    "public.vendor_workspace_grant_v1\\(uuid\\)",
    "public.highest_reviewer_workspace_grant_v1\\(uuid\\)",
  ];
  for (const signature of publicSignatures) {
    assert.match(
      sql,
      new RegExp(
        `alter function ${signature} owner to postgres;[\\s\\S]*?revoke all on function ${signature} from public, anon, authenticated, service_role;[\\s\\S]*?grant execute on function ${signature} to service_role;`,
        "u",
      ),
    );
  }
  const privateSignatures = [
    "casework.case_create_locked_v1\\(uuid, text, text, text\\)",
    "casework.case_member_workspace_grant_resolve_locked_v1\\(uuid, text\\)",
    "casework.highest_reviewer_workspace_grant_resolve_locked_v1\\(uuid\\)",
  ];
  for (const signature of privateSignatures) {
    assert.match(
      sql,
      new RegExp(
        `alter function ${signature}[\\s\\S]*?owner to postgres;[\\s\\S]*?revoke all on function ${signature}[\\s\\S]*?from public, anon, authenticated, service_role;[\\s\\S]*?grant execute on function ${signature}[\\s\\S]*?to service_role;`,
        "u",
      ),
    );
  }
  assert.equal(
    (sql.match(/language (?:sql|plpgsql)\nvolatile\n/gu) ?? []).length,
    6,
  );
  assert.equal((sql.match(/for share/gu) ?? []).length, 4);
  assert.match(sql, /security invoker/u);
  assert.match(sql, /security definer[\s\S]*?set search_path = ''/u);
  assert.doesNotMatch(sql, /auth\.uid\(\)/u);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/iu);
});

Deno.test("casework authority migration remains P1-only", async () => {
  const sql = await migrationSource();
  assert.doesNotMatch(
    sql,
    /server_document_operation|document_versions|document_upload|storage\.objects|storage\.buckets|drs-case-intake-private|drs-case-records-private/iu,
  );
  assert.doesNotMatch(
    sql,
    /create table (?:if not exists )?public\.drs_cases/iu,
  );
});

Deno.test(
  "focused RED rework: case-create replay revalidates held closed revoked and expired truth",
  async () => {
    const sql = await migrationSource();
    const replayStart = sql.indexOf(
      "create or replace function casework.case_create_locked_v1",
    );
    const replayEnd = sql.indexOf(
      "create or replace function public.casework_case_create_v1",
    );
    const replay = sql.slice(replayStart, replayEnd);
    for (
      const required of [
        /c\.case_status/u,
        /m\.membership_status/u,
        /m\.valid_from/u,
        /m\.valid_until/u,
        /m\.revoked_at/u,
        /'state', 'CASE_ON_HOLD'/u,
        /'state', 'CASE_CLOSED'/u,
        /'state', 'MEMBERSHIP_REVOKED'/u,
        /'state', 'MEMBERSHIP_EXPIRED'/u,
      ]
    ) assert.match(replay, required);
    assert.doesNotMatch(
      replay.slice(
        replay.indexOf("if found then"),
        replay.indexOf("end if;", replay.indexOf("if found then")) + 7,
      ),
      /'case_status', 'active'|'membership_status', 'active'/u,
    );
    const lock = replay.indexOf("perform pg_advisory_xact_lock(");
    const currentReplay = replay.indexOf("c.creation_payload_sha256");
    assert.ok(lock >= 0 && currentReplay > lock);
    assert.match(
      replay,
      /p_authenticated_user_id::text \|\| E'\\\\x1f' \|\| p_idempotency_key/u,
    );
    assert.match(replay, /v_existing_payload_sha256 <> p_payload_sha256/u);
  },
);
