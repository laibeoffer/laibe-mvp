import assert from "node:assert/strict";

const root = new URL("../../", import.meta.url);
const migrationUrl = new URL(
  "supabase/migrations/20260908104000_account_workspace_grant_compat_v1.sql",
  root,
);

async function migrationSource() {
  return await Deno.readTextFile(migrationUrl);
}

Deno.test("account workspace grant compatibility migration is present", async () => {
  const sql = await migrationSource();
  assert.match(sql, /^begin;[\s\S]*commit;\s*$/u);
});

Deno.test("account grant resolution uses existing active case membership truth", async () => {
  const sql = await migrationSource();
  for (
    const required of [
      /create or replace function casework\.account_workspace_grant_resolve_v1\(/u,
      /join casework\.cases c/u,
      /join auth\.users u/u,
      /c\.case_status = 'active'/u,
      /m\.user_id = p_authenticated_user_id/u,
      /m\.role::text = p_expected_role/u,
      /u\.deleted_at is null/u,
      /u\.banned_until is null or u\.banned_until <= v_now/u,
      /pg_catalog\.to_regprocedure\(\s*'casework\.case_member_workspace_grant_resolve_locked_v1\(uuid,text\)'\s*\)/u,
      /v_lifecycle_column_count not in \(0, 6\)/u,
      /coalesce\(to_jsonb\(m\)->>'membership_status', 'active'\) = 'active'/u,
      /nullif\(to_jsonb\(m\)->>'revoked_at', ''\) is null/u,
      /coalesce\(\s*nullif\(to_jsonb\(m\)->>'valid_from', ''\)::timestamptz,\s*'-infinity'::timestamptz\s*\) <= v_now/u,
      /nullif\(to_jsonb\(m\)->>'valid_until', ''\) is null/u,
      /nullif\(to_jsonb\(m\)->>'valid_until', ''\)::timestamptz > v_now/u,
      /v_candidate_count := v_candidate_count \+ 1/u,
      /if v_candidate_count = 0 then[\s\S]*?'state', 'CASE_NOT_AUTHORIZED'/u,
      /if v_candidate_count <> 1 then[\s\S]*?'state', 'CASE_SELECTION_REQUIRED'/u,
      /'state', 'CASE_NOT_AUTHORIZED'/u,
      /'state', 'CASE_SELECTION_REQUIRED'/u,
      /'state', 'AUTHORIZED_CASEWORK_WORKSPACE'/u,
      /'case_status', 'active'/u,
      /'grant_id', coalesce\(/u,
      /v_candidate\.membership_row->>'membership_id'/u,
      /'grant_version', coalesce\(/u,
      /v_candidate\.membership_row->>'authority_version'/u,
      /'grant_expires_at', least\(/u,
      /v_candidate\.membership_row->>'valid_until'/u,
    ]
  ) assert.match(sql, required);
  assert.doesNotMatch(sql, /raw_user_meta_data|user_metadata|email\s*=|lower\s*\(\s*u\.email/iu);
});

Deno.test("legacy fallback cannot weaken a complete lifecycle resolver", async () => {
  const sql = await migrationSource();
  const delegate = sql.indexOf(
    "case_member_workspace_grant_resolve_locked_v1(uuid,text)",
  );
  const fallback = sql.indexOf("for v_candidate in");
  assert.ok(delegate >= 0 && fallback > delegate);
  assert.match(
    sql.slice(delegate, fallback),
    /execute 'select casework\.case_member_workspace_grant_resolve_locked_v1\(\$1, \$2\)'/u,
  );
});

Deno.test("only service_role can execute the account grant facades", async () => {
  const sql = await migrationSource();
  for (
    const signature of [
      "public.owner_workspace_grant_v1\\(uuid\\)",
      "public.vendor_workspace_grant_v1\\(uuid\\)",
    ]
  ) {
    assert.match(
      sql,
      new RegExp(
        `alter function ${signature} owner to postgres;[\\s\\S]*?revoke all on function ${signature} from public, anon, authenticated, service_role;[\\s\\S]*?grant execute on function ${signature} to service_role;`,
        "u",
      ),
    );
  }
  assert.match(sql, /security definer[\s\S]*?set search_path = ''/u);
});

Deno.test("compatibility migration does not rewrite production case data", async () => {
  const sql = await migrationSource();
  assert.doesNotMatch(
    sql,
    /\b(?:insert|update|delete|truncate|drop)\b|create\s+table|alter\s+table/iu,
  );
  assert.doesNotMatch(sql, /highest_reviewer|document|storage|payment|escrow/iu);
});
