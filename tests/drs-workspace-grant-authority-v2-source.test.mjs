import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return await readFile(new URL(path, root), "utf8");
}

test("focused RED: versioned DRS grant source closure is absent", async () => {
  const [migration, module] = await Promise.all([
    text(
      "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
    ),
    text("supabase/functions/_shared/drs-auth/versioned-workspace-grant.ts"),
  ]);
  assert.match(migration, /create table integration\.drs_workspace_grants/u);
  assert.match(module, /grantVersion: string/u);
});

test("migration binds persistent monotonic capability state without JS precision shortcuts", async () => {
  const migration = await text(
    "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  );
  assert.match(migration, /grant_version bigint generated always as identity/u);
  assert.match(
    migration,
    /grant_id uuid primary key default extensions\.gen_random_uuid\(\)/u,
  );
  assert.match(migration, /and expires_at > issued_at/u);
  assert.match(migration, /expires_at <= issued_at \+ interval '15 minutes'/u);
  assert.match(
    migration,
    /create unique index drs_workspace_grants_one_current_binding_idx/u,
  );
  assert.match(migration, /where invalidated_at is null/u);
  assert.match(migration, /enable row level security/u);
  assert.match(migration, /force row level security/u);
  assert.match(
    migration,
    /revoke all on table integration\.drs_workspace_grants\s+from public, anon, authenticated, service_role/u,
  );
  assert.doesNotMatch(
    migration,
    /xmin|hashtextextended|extract\s*\(\s*epoch|floor\s*\(|grant_version\s+default|setval\s*\(|restart\s+with|cycle/iu,
  );
});

test("issue and private assert recheck canonical current authority and every stored fact", async () => {
  const migration = await text(
    "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  );
  for (
    const signature of [
      /integration\.drs_workspace_grant_issue_locked_v2\(\s*p_authenticated_user_id uuid,\s*p_expected_case_id uuid,\s*p_authorization_subject text\s*\)/u,
      /integration\.drs_workspace_grant_assert_current_locked_v1\(\s*p_authenticated_user_id uuid,\s*p_expected_case_id uuid,\s*p_authorization_subject text,\s*p_grant_id uuid,\s*p_grant_version bigint\s*\)/u,
      /public\.drs_workspace_grant_v2\(\s*p_authenticated_user_id uuid,\s*p_expected_case_id uuid,\s*p_authorization_subject text\s*\)/u,
    ]
  ) assert.match(migration, signature);

  assert.ok(
    migration.match(/integration\.drs_identity_authority_resolve_locked_v1\(/gu)
      ?.length >= 2,
  );
  for (
    const fact of [
      "binding_id",
      "authenticated_user_id",
      "specialist_id",
      "assignment_id",
      "drs_case_id",
      "casework_case_id",
      "authorization_subject",
      "expires_at",
      "grant_version",
    ]
  ) assert.match(migration, new RegExp(`v_grant\\.${fact}`, "u"), fact);
  assert.match(migration, /v_grant\.invalidated_at is not null/u);
  assert.match(migration, /v_grant\.expires_at <= v_now/u);
  assert.match(
    migration,
    /invalidated_at = coalesce\(invalidated_at, v_now\)/u,
  );
  assert.match(migration, /grant_version'\s*,\s*v_grant\.grant_version::text/u);
});

test("issue and assert refresh wall-clock time after acquiring authority locks", async () => {
  const migration = await text(
    "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  );
  const resolverThenRefresh =
    /v_authority := integration\.drs_identity_authority_resolve_locked_v1\([\s\S]*?\);\n\n[ ]{2}v_now := clock_timestamp\(\);/gu;
  assert.equal(
    migration.match(resolverThenRefresh)?.length,
    2,
    "both issue and assert must refresh time only after the locked v1 resolver returns",
  );
});

test("function ownership and execute privileges preserve the private P2 boundary", async () => {
  const migration = await text(
    "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  );
  for (
    const name of [
      "integration.drs_workspace_grant_issue_locked_v2",
      "integration.drs_workspace_grant_assert_current_locked_v1",
      "integration.drs_workspace_grant_invalidate_from_authority_change_v1",
    ]
  ) {
    assert.match(
      migration,
      new RegExp(
        `alter function ${
          name.replaceAll(".", "\\.")
        }\\([\\s\\S]*?owner to postgres`,
        "u",
      ),
    );
  }
  assert.match(
    migration,
    /language plpgsql\s+security definer\s+set search_path = ''/u,
  );
  assert.match(
    migration,
    /language sql\s+security invoker\s+set search_path = ''/u,
  );
  assert.match(
    migration,
    /grant execute on function integration\.drs_workspace_grant_issue_locked_v2\(\s*uuid, uuid, text\s*\) to service_role/u,
  );
  assert.match(
    migration,
    /revoke all on function integration\.drs_workspace_grant_assert_current_locked_v1\([\s\S]*?from public, anon, authenticated, service_role/u,
  );
  assert.match(
    migration,
    /grant execute on function public\.drs_workspace_grant_v2\(\s*uuid, uuid, text\s*\) to service_role/u,
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function integration\.drs_workspace_grant_assert_current_locked_v1\([\s\S]*?to service_role/u,
  );
});

test("authority changes irreversibly invalidate current derived capabilities", async () => {
  const migration = await text(
    "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  );
  for (
    const table of [
      "integration.drs_auth_specialist_bindings",
      "integration.drs_case_identity_bindings",
      "public.drs_specialists",
      "public.drs_case_specialist_assignments",
      "public.drs_case_specialist_assignment_terminations",
      "public.drs_cases",
      "casework.cases",
    ]
  ) {
    assert.match(
      migration,
      new RegExp(`on ${table.replaceAll(".", "\\.")}`, "u"),
      table,
    );
  }
  assert.match(migration, /after insert or update or delete/u);
  assert.match(
    migration,
    /invalidated_at = coalesce\(invalidated_at, clock_timestamp\(\)\)/u,
  );
  assert.doesNotMatch(migration, /invalidated_at\s*=\s*null/iu);
});

test("TypeScript wire validator keeps grant internals server-only and decimal-string exact", async () => {
  const module = await text(
    "supabase/functions/_shared/drs-auth/versioned-workspace-grant.ts",
  );
  assert.match(module, /export type DrsVersionedWorkspaceGrant/u);
  assert.match(module, /grantVersion: string/u);
  assert.match(module, /\^\[1-9\]\\d\{0,18\}\$/u);
  assert.match(module, /drs_workspace_grant_v2/u);
  assert.match(module, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.doesNotMatch(
    module,
    /Number\(.*grant|parseInt\(.*grant|parseFloat\(.*grant/iu,
  );
});

test("existing v1 and browser-facing bytes do not project capability internals", async () => {
  const paths = [
    "supabase/functions/drs-workspace-grant/index.ts",
    "supabase/functions/drs-session-grant/index.ts",
    "supabase/functions/_shared/drs-auth/contracts.ts",
    "supabase/migrations/20260824170000_drs_identity_google_line_w1.sql",
  ];
  const existing = (await Promise.all(paths.map(text))).join("\n");
  assert.doesNotMatch(
    existing,
    /drs_workspace_grant_v2|grant_id|grant_version|grant_expires_at/iu,
  );
  const migration = await text(
    "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  );
  assert.doesNotMatch(
    migration,
    /grant select|create policy .* using \(true\)/iu,
  );
});

test("real PostgreSQL harness binds the two-user two-case adversarial matrix", async () => {
  const harness = await text(
    "supabase/tests/drs_workspace_grant_authority_v2_real_pg.test.mjs",
  );
  for (
    const marker of [
      "DRS_REAL_PG_DISPOSABLE_CONFIRMED",
      "two users and two cases",
      "cross-case denial",
      "specialist suspension",
      "assignment termination",
      "case mapping revocation",
      "case closure",
      "grant expiry",
      "stale version denial",
      "concurrent issue convergence",
      "proacl",
      "rollback",
    ]
  ) assert.match(harness, new RegExp(marker, "u"), marker);
});
