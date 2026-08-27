import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const paths = {
  contracts: new URL("supabase/functions/_shared/drs-auth/contracts.ts", root),
  authority: new URL(
    "supabase/functions/_shared/drs-auth/drs-specialist-authority.ts",
    root,
  ),
  endpoint: new URL("supabase/functions/drs-workspace-grant/index.ts", root),
  bffComposition: new URL(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
    root,
  ),
  bffBehaviorTest: new URL(
    "supabase/tests/drs_bff_route_composition_w1.test.mjs",
    root,
  ),
  migration: new URL(
    "supabase/migrations/20260824170000_drs_identity_google_line_w1.sql",
    root,
  ),
  behaviorTest: new URL(
    "supabase/tests/drs_identity_google_line_w1.test.mjs",
    root,
  ),
  documentation: new URL(
    "docs/drs_backend/drs_identity_google_line_w1.md",
    root,
  ),
  predecessorMigration: new URL(
    "supabase/migrations/20260820090000_drs_core_case_audit_contract.sql",
    root,
  ),
};

async function sources() {
  const entries = await Promise.all(
    Object.entries(paths).map(async (
      [name, path],
    ) => [name, await readFile(path, "utf8")]),
  );
  return Object.fromEntries(entries);
}

function lastDefinition(source, pattern, label) {
  const matches = [...source.matchAll(pattern)];
  assert.notEqual(matches.length, 0, `${label}_MISSING`);
  return matches.at(-1)[0];
}

test("source contract exposes one authenticated POST read-only workspace seam", async () => {
  const source = await sources();
  assert.match(source.endpoint, /request\.method === "OPTIONS"/u);
  assert.match(source.endpoint, /VERIFY_JWT_REQUIRED\s*=\s*false/u);
  assert.match(
    source.endpoint,
    /createDrsBffRouteGuard\("workspaceGrant"\)/u,
  );
  const guard = source.endpoint.indexOf("bffGuard.authorize(request)");
  const workspaceRpc = source.endpoint.indexOf(
    "dependencies.resolveWorkspaceGrant({",
  );
  assert.ok(guard >= 0 && workspaceRpc > guard);
  assert.match(source.endpoint, /readDrsBffGuardFailure\(error\)/u);
  assert.doesNotMatch(
    source.endpoint,
    /resolveAuthenticatedIdentity\(request\)|createClient|supabase-js/u,
  );
  assert.match(
    source.bffComposition,
    /workspaceGrant:\s*closedPost\(\s*"\/functions\/v1\/drs-workspace-grant",\s*exactEmptyBody/u,
  );
  assert.match(
    source.bffComposition,
    /queryFields:\s*Object\.freeze\(\[\]\)/u,
  );
  assert.match(
    source.bffBehaviorTest,
    /workspaceGrant:\s*\{\s*method:\s*"POST",\s*pathname:\s*"\/functions\/v1\/drs-workspace-grant",\s*query:\s*\[\],\s*body:\s*\[\]/u,
  );
  assert.match(
    source.bffBehaviorTest,
    /DrsBffRouteGuardError\("AUTH_REQUIRED",\s*401\)[\s\S]*backendCalls,\s*0/u,
  );
  assert.match(source.endpoint, /AUTHORIZED_DRS_WORKSPACE/u);
  assert.match(source.endpoint, /mode:\s*"read_only"/u);
  assert.match(source.endpoint, /mutationAllowed:\s*false/u);
  assert.doesNotMatch(
    source.endpoint,
    /casework\.case_members|ownerVendor|fallback/iu,
  );
});

test("authority source never derives access from caller identity hints", async () => {
  const source = await sources();
  const production =
    `${source.contracts}\n${source.authority}\n${source.endpoint}`;
  assert.doesNotMatch(
    production,
    /user_metadata|raw_user_meta_data|raw_app_meta_data|line_user|line_profile|line_group|localStorage|sessionStorage/iu,
  );
  assert.doesNotMatch(
    production,
    /authenticatedUserId\s*:\s*specialistId|specialistId\s*=\s*authenticatedUserId/iu,
  );
  assert.match(source.authority, /expectedCaseId/u);
  assert.match(source.authority, /expectedAuthorizationSubject/u);
  assert.match(source.authority, /createDrsSpecialistAuthorizationStrategy/u);
  assert.match(source.authority, /drs_workspace_grant_v1/u);
});

test("final migration order cuts predecessor UUID shortcut over to bound selected case", async () => {
  const source = await sources();
  const composed = `${source.predecessorMigration}\n${source.migration}`;
  const finalHelper = lastDefinition(
    composed,
    /create or replace function drs_private\.is_current_actor_active_case_specialist\(\s*target_case_id uuid\s*\)[\s\S]*?\n\$\$;/giu,
    "FINAL_DRS_RLS_HELPER",
  );
  assert.match(
    finalHelper,
    /b\.authenticated_user_id = \(select auth\.uid\(\)\)/iu,
  );
  assert.match(finalHelper, /b\.selected_assignment_id = a\.assignment_id/iu);
  assert.match(finalHelper, /a\.specialist_id = b\.specialist_id/iu);
  assert.match(finalHelper, /m\.drs_case_id = target_case_id/iu);
  assert.match(finalHelper, /m\.casework_case_id = c\.id/iu);
  assert.match(finalHelper, /c\.case_status = 'active'/iu);
  assert.doesNotMatch(
    finalHelper,
    /target_specialist_id\s*:=\s*\(select auth\.uid\(\)\)|specialist_id\s*=\s*\(select auth\.uid\(\)\)/iu,
  );

  const finalSelfPolicy = lastDefinition(
    composed,
    /create policy drs_specialists_self_select[\s\S]*?;/giu,
    "FINAL_DRS_SPECIALIST_SELF_POLICY",
  );
  assert.match(
    finalSelfPolicy,
    /drs_private\.is_current_actor_active_specialist\(specialist_id\)/iu,
  );
  assert.doesNotMatch(
    finalSelfPolicy,
    /specialist_id\s*=\s*\(select auth\.uid\(\)\)/iu,
  );

  const finalOwnerPolicy = lastDefinition(
    composed,
    /create policy drs_cases_owner_or_assigned_specialist[\s\S]*?;/giu,
    "FINAL_DRS_OWNER_OR_SPECIALIST_POLICY",
  );
  assert.match(finalOwnerPolicy, /owner_id = \(select auth\.uid\(\)\)/iu);
  assert.match(
    finalOwnerPolicy,
    /drs_private\.is_current_actor_active_case_specialist\(case_id\)/iu,
  );
});

test("focused RED: core audit subject refs use PostgreSQL-native exact-key closure", async () => {
  const { predecessorMigration } = await sources();

  assert.doesNotMatch(predecessorMigration, /jsonb_object_length\s*\(/iu);
  assert.match(
    predecessorMigration,
    /subject_ref\s*\?&\s*array\['document_id',\s*'version'\][\s\S]*?subject_ref\s*-\s*array\['document_id',\s*'version'\]\s*=\s*'\{\}'::jsonb/iu,
  );
  assert.match(
    predecessorMigration,
    /subject_ref\s*\?&\s*array\['drawing_id',\s*'version'\][\s\S]*?subject_ref\s*-\s*array\['drawing_id',\s*'version'\]\s*=\s*'\{\}'::jsonb/iu,
  );
});

test("cutover source makes binding mapping assignment and termination the only specialist RLS arm", async () => {
  const { migration } = await sources();
  assert.match(
    migration,
    /create or replace function drs_private\.is_current_actor_active_specialist/iu,
  );
  assert.match(
    migration,
    /authorization_subject\s*=\s*'drs-specialist:'\s*\|\|\s*b\.specialist_id::text/iu,
  );
  assert.match(migration, /b\.binding_status = 'active'/iu);
  assert.match(migration, /b\.valid_until > v_now/iu);
  assert.match(migration, /m\.mapping_status = 'active'/iu);
  assert.match(migration, /m\.valid_until > v_now/iu);
  assert.match(migration, /a\.valid_from <= v_now/iu);
  assert.match(
    migration,
    /not exists \([\s\S]*t\.terminated_at <= v_now[\s\S]*\)/iu,
  );
});

test("migration is additive explicit and avoids composite multi-target INTO", async () => {
  const { migration } = await sources();
  const intervalTables = [
    [
      "integration.drs_auth_specialist_bindings",
      migration.match(
        /create table integration\.drs_auth_specialist_bindings \([\s\S]*?\n\);/iu,
      )?.[0] ?? "",
    ],
    [
      "integration.drs_case_identity_bindings",
      migration.match(
        /create table integration\.drs_case_identity_bindings \([\s\S]*?\n\);/iu,
      )?.[0] ?? "",
    ],
  ];
  const missingFiniteConstraints = intervalTables.filter(([, table]) =>
    !/isfinite\(valid_from\)[\s\S]*isfinite\(valid_until\)[\s\S]*valid_until > valid_from/iu
      .test(table)
  ).map(([name]) => name);
  assert.deepEqual(
    missingFiniteConstraints,
    [],
    `POSTGRES_FINITE_TIMESTAMP_AUTHORITY_WINDOW_MISSING: ${
      missingFiniteConstraints.join(
        ",",
      )
    }`,
  );
  assert.match(migration, /^begin;/u);
  assert.match(migration, /commit;\s*$/u);
  assert.match(
    migration,
    /create table integration\.drs_auth_specialist_bindings/u,
  );
  assert.match(
    migration,
    /create table integration\.drs_case_identity_bindings/u,
  );
  assert.match(
    migration,
    /foreign key \(authenticated_user_id\)[\s\S]*references auth\.users/u,
  );
  assert.match(
    migration,
    /foreign key \(specialist_id\)[\s\S]*references public\.drs_specialists/u,
  );
  assert.match(
    migration,
    /foreign key \(selected_assignment_id\)[\s\S]*references public\.drs_case_specialist_assignments/u,
  );
  assert.match(
    migration,
    /create index drs_auth_specialist_bindings_selected_assignment_idx[\s\S]*\(selected_assignment_id\)[\s\S]*where selected_assignment_id is not null/iu,
  );
  assert.match(
    migration,
    /foreign key \(drs_case_id\)[\s\S]*references public\.drs_cases/u,
  );
  assert.match(
    migration,
    /foreign key \(casework_case_id\)[\s\S]*references casework\.cases/u,
  );
  assert.doesNotMatch(
    migration,
    /into\s+v_(?:binding|specialist|assignment|mapping)\s*,/iu,
  );
  assert.doesNotMatch(
    migration,
    /create\s+table\s+(?:auth|casework|public\.drs_)/iu,
  );
  assert.doesNotMatch(
    migration,
    /alter\s+table\s+(?:auth|casework|public\.drs_)/iu,
  );
});

test("service RPC and Edge source enforce the minimal projection boundary", async () => {
  const source = await sources();
  const rpc = lastDefinition(
    source.migration,
    /create or replace function public\.drs_workspace_grant_v1\([\s\S]*?\n\$\$;/giu,
    "DRS_WORKSPACE_GRANT_RPC",
  );
  for (
    const field of [
      "authorized",
      "state",
      "case_id",
      "case_status",
      "access_mode",
    ]
  ) assert.match(rpc, new RegExp(`'${field}'`, "iu"));
  assert.doesNotMatch(
    rpc,
    /'authenticated_user_id'|'specialist_id'|'assignment_id'|'authorization_subject'|'lock_status'/iu,
  );
  assert.match(source.contracts, /validateDrsWorkspaceGrantProjection/u);
  assert.match(source.authority, /resolveWorkspaceGrant/u);
  assert.match(source.endpoint, /validateDrsWorkspaceGrantProjection/u);
  assert.doesNotMatch(source.endpoint, /validateDrsAuthorityFacts/u);
});

test("private functions are owner-pinned with empty search path and closed grants", async () => {
  const { migration } = await sources();
  const securityDefinerCount =
    (migration.match(/security definer/giu) ?? []).length;
  const emptySearchPathCount =
    (migration.match(/set search_path = ''/gu) ?? []).length;
  assert.ok(securityDefinerCount >= 3);
  assert.equal(emptySearchPathCount, securityDefinerCount);
  assert.match(
    migration,
    /alter table integration\.drs_auth_specialist_bindings owner to postgres/u,
  );
  assert.match(
    migration,
    /alter table integration\.drs_case_identity_bindings owner to postgres/u,
  );
  assert.match(
    migration,
    /revoke all on table integration\.drs_auth_specialist_bindings[\s\S]*public, anon, authenticated, service_role/u,
  );
  assert.match(
    migration,
    /revoke all on table integration\.drs_case_identity_bindings[\s\S]*public, anon, authenticated, service_role/u,
  );
});

test("public responses and documentation preserve the local-only claim boundary", async () => {
  const source = await sources();
  assert.match(source.documentation, /local source\/test candidate/iu);
  assert.match(
    source.documentation,
    /not prove real Supabase Auth, RLS,[\s\S]*migration apply, Google OAuth, LINE login, deployment, or production/iu,
  );
  assert.match(
    source.documentation,
    /LINE[\s\S]*upstream[\s\S]*not authority/iu,
  );
  assert.match(
    source.documentation,
    /casework\.cases[\s\S]*immutable prerequisite/iu,
  );
  assert.match(
    source.documentation,
    /highest reviewer[\s\S]*out of[\s\S]*scope/iu,
  );
  const successPayloadSource = source.endpoint.slice(
    source.endpoint.indexOf("return jsonResponse(200"),
  );
  assert.doesNotMatch(
    successPayloadSource,
    /specialistId|assignmentId|authorizationSubject|credential|provider|email|attendees|description/iu,
  );
});

test("new production source contains no embedded credential or live endpoint", async () => {
  const source = await sources();
  const production =
    `${source.contracts}\n${source.authority}\n${source.endpoint}\n${source.migration}`;
  assert.doesNotMatch(
    production,
    /sb_secret_|service_role_key\s*[:=]\s*["'][^"']+|ya29\.|client_secret\s*[:=]\s*["'][^"']+|hooks\.slack\.com|api\.line\.me/iu,
  );
  assert.doesNotMatch(production, /fetch\([^)]*(?:googleapis|line\.me)/iu);
});
