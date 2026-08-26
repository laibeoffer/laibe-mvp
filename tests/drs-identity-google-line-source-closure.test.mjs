import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationName = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith("_drs_identity_foundation.sql"));
const migrationPath = migrationName.length === 1
  ? `supabase/migrations/${migrationName[0]}`
  : "supabase/migrations/MISSING_drs_identity_foundation.sql";
const expectedPaths = [
  "docs/drs_backend/drs_identity_google_line_binding_w1.md",
  migrationPath,
  "supabase/functions/_shared/drs-auth/contracts.ts",
  "supabase/functions/_shared/drs-auth/google-identity-adapter.ts",
  "supabase/functions/_shared/drs-auth/line-login-adapter.ts",
  "supabase/functions/_shared/drs-auth/specialist-authorization.ts",
  "supabase/functions/drs-google-auth-start/index.ts",
  "supabase/functions/drs-google-auth-callback/index.ts",
  "supabase/functions/drs-line-login-start/index.ts",
  "supabase/functions/drs-line-login-callback/index.ts",
  "supabase/functions/drs-session-grant/index.ts",
  "supabase/tests/drs_identity_google_line_binding_w1.test.mjs",
  "tests/drs-identity-google-line-source-closure.test.mjs",
].sort();
const productionTs = expectedPaths.filter((file) => file.endsWith(".ts"));

function source(file) {
  return readFileSync(path.resolve(file), "utf8");
}

const admittedCompositionHashes = new Map([
  [
    "supabase/migrations/20260824090000_drs_google_calendar_api_w1.sql",
    "70467148fa8a7d76978fa26c974663672dd50d2041b7df7d9f03bb8a9f6ded7b",
  ],
  [
    "supabase/migrations/20260824170000_drs_identity_google_line_w1.sql",
    "f5e0c6d2098f94982772e3516d2728fbf76eebc542ba5f70b38311a17d6e9b38",
  ],
  [
    "supabase/migrations/20260824180000_drs_calendar_identity_composition_w1.sql",
    "27da80a3794777edff5ee76a5c7de9ce7d2de2b85cb72a4708c9dfe4260a58b3",
  ],
]);

test("focused RED: A3 authority composition and terminal callback boundaries", () => {
  const sql = source(migrationPath);
  const contracts = source("supabase/functions/_shared/drs-auth/contracts.ts");
  const authorization = source(
    "supabase/functions/_shared/drs-auth/specialist-authorization.ts",
  );
  const defects = [];

  if (
    /create table drs\.(?:specialists|cases|case_assignments|supervisor_authorities)/iu
      .test(sql)
  ) defects.push("COMPETING_DRS_AUTHORITY_GRAPH");
  if (
    !/integration\.drs_auth_specialist_bindings/iu.test(sql) ||
    !/integration\.drs_case_identity_bindings/iu.test(sql) ||
    !/integration\.drs_identity_authority_resolve_locked_v1/iu.test(sql)
  ) defects.push("ACCEPTED_AUTHORITY_SEAM_NOT_CONSUMED");
  if (/highest_reviewer|all_cases|override_actions/iu.test(sql)) {
    defects.push("UNAPPROVED_WILDCARD_AUTHORITY");
  }
  if (
    /release_identity_link_state_claim_v1/iu.test(sql) ||
    /releaseLinkState/iu.test(contracts) ||
    !/fail_identity_link_state_claim_v1/iu.test(sql) ||
    !/failed_at/iu.test(sql)
  ) defects.push("CALLBACK_STATE_REOPENABLE");
  if (
    !/validateDrsAuthorityFacts/u.test(contracts) ||
    !/validateDrsWorkspaceGrantProjection/u.test(contracts)
  ) defects.push("ACCEPTED_SHARED_CONTRACT_NOT_PRESERVED");
  if (
    !/authenticatedUserId/u.test(authorization) ||
    /provider[\s\S]{0,80}subject/u.test(authorization)
  ) defects.push("AUTHORITY_NOT_BOUND_TO_VERIFIED_USER");
  if (
    !/SESSION_PRODUCER_UNAVAILABLE/u.test(contracts) ||
    !/sessionProducer/u.test(contracts) ||
    /\{\s*state:\s*"AUTHENTICATED"\s*\}/u.test(contracts)
  ) defects.push("SESSION_PRODUCER_CONTRACT_MISSING");

  assert.deepEqual(
    defects,
    [],
    `DRS_IDENTITY_A3_COMPOSITION_MISSING: ${defects.join(",")}`,
  );
});

test("admitted local 090000 170000 and 180000 composition bytes remain exact", () => {
  for (const [relativePath, expectedHash] of admittedCompositionHashes) {
    const bytes = readFileSync(path.resolve(relativePath));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expectedHash,
      relativePath,
    );
  }
});

test("composition contains the admitted identity security subset without global status coupling", () => {
  assert.deepEqual(migrationName.length, 1, "exactly one CLI migration is required");
  for (const relativePath of expectedPaths) {
    assert.doesNotThrow(() => source(relativePath), relativePath);
  }
});

test("migration adds provider identity state without a competing authority graph", () => {
  const sql = source(migrationPath);
  for (const required of [
    "create schema if not exists integration",
    "create table integration.drs_identity_provider_bindings",
    "create table integration.drs_identity_link_states",
    "create table integration.drs_identity_provider_events",
    "references public.drs_specialists",
    "integration.drs_auth_specialist_bindings",
    "integration.drs_case_identity_bindings",
    "integration.drs_identity_authority_resolve_locked_v1",
  ]) assert.match(sql, new RegExp(required.replaceAll(".", "\\."), "iu"), required);
  assert.doesNotMatch(
    sql,
    /create table drs\.(?:specialists|cases|case_assignments|supervisor_authorities)|highest_reviewer|all_cases|override_actions/iu,
  );
});

test("provider bindings are exact, active-singular, and bound to accepted auth facts", () => {
  const sql = source(migrationPath);
  for (const pattern of [
    /unique\s*\(provider,\s*provider_subject\)/iu,
    /provider,\s*authenticated_user_id[\s\S]{0,100}where binding_status = 'active'/iu,
    /provider,\s*specialist_id[\s\S]{0,100}where binding_status = 'active'/iu,
    /authorization_subject\s*=\s*'drs-specialist:'\s*\|\|\s*specialist_id::text/iu,
    /p_authenticated_user_id\s+uuid/iu,
    /b\.authenticated_user_id\s*=\s*v_authenticated_user_id/iu,
    /b\.specialist_id\s*=\s*v_specialist_id/iu,
    /v_authority\s*->>\s*'authenticated_user_id'[\s\S]{0,100}v_authenticated_user_id::text/iu,
    /v_authority\s*->>\s*'specialist_id'[\s\S]{0,100}v_specialist_id::text/iu,
  ]) assert.match(sql, pattern);
  assert.doesNotMatch(sql, /auth\.uid\s*\(\s*\)/iu);
});

test("OAuth state contract is digest-only, finite <=15m, encrypted, claimable and single-use", () => {
  const sql = source(migrationPath);
  for (const pattern of [
    /state_digest\s+text\s+not null\s+unique/iu,
    /nonce_digest\s+text\s+not null/iu,
    /pkce_verifier_ciphertext\s+text\s+not null/iu,
    /expires_at\s+timestamptz\s+not null/iu,
    /expires_at\s*>\s*created_at/iu,
    /expires_at\s*<=\s*created_at\s*\+\s*interval\s*'15 minutes'/iu,
    /claimed_at\s+timestamptz/iu,
    /claim_token\s+uuid/iu,
    /consumed_at\s+timestamptz/iu,
    /for update/iu,
  ]) assert.match(sql, pattern);
  assert.doesNotMatch(sql, /\braw_state\b|\bpkce_verifier\s+text|\bnonce\s+text/iu);
});

test("provider tables use RLS plus FORCE RLS and deny direct application access", () => {
  const sql = source(migrationPath);
  for (const table of [
    "integration.drs_identity_provider_bindings",
    "integration.drs_identity_link_states",
    "integration.drs_identity_provider_events",
  ]) {
    const escaped = table.replace(".", "\\.");
    assert.match(
      sql,
      new RegExp(`alter table ${escaped}\\s+enable row level security`, "iu"),
      table,
    );
    assert.match(
      sql,
      new RegExp(`alter table ${escaped}\\s+force row level security`, "iu"),
      table,
    );
  }
  assert.match(
    sql,
    /revoke all on table integration\.drs_identity_provider_bindings\s+from public, anon, authenticated, service_role/iu,
  );
  assert.doesNotMatch(
    sql,
    /grant\s+(?:select|insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated|service_role)/iu,
  );
});

test("security-definer producers are pinned and expose only exact service functions", () => {
  const sql = source(migrationPath);
  assert.match(sql, /security definer/iu);
  assert.match(sql, /set search_path = ''/iu);
  for (const name of [
    "drs_identity_link_state_create_v1",
    "drs_identity_link_state_claim_v1",
    "fail_identity_link_state_claim_v1",
    "drs_identity_callback_prepare_v1",
    "drs_identity_callback_finalize_v1",
    "drs_identity_provider_revoke_v1",
  ]) {
    assert.match(sql, new RegExp(`revoke all on function integration\\.${name}\\(`, "iu"));
    assert.match(sql, new RegExp(`grant execute on function integration\\.${name}\\([\\s\\S]+?to service_role`, "iu"));
  }
  assert.doesNotMatch(sql, /create\s+(?:or replace\s+)?function\s+public\./iu);
});

test("binding creation, revocation, login and terminal failure are audited once", () => {
  const sql = source(migrationPath);
  assert.match(sql, /insert into integration\.drs_identity_provider_events/iu);
  assert.match(sql, /identity_binding_created/iu);
  assert.match(sql, /identity_binding_revoked/iu);
  assert.match(sql, /identity_login/iu);
  assert.match(sql, /identity_callback_failed/iu);
  assert.match(sql, /terminal_status = 'failed'/iu);
  assert.doesNotMatch(sql, /release_identity_link_state_claim_v1|claimed_at\s*=\s*null|claim_token\s*=\s*null/iu);
});

test("login completion is two-phase and returns only a validated browser continuation", () => {
  const sql = source(migrationPath);
  const contracts = source("supabase/functions/_shared/drs-auth/contracts.ts");
  const prepareStart = sql.indexOf(
    "function integration.drs_identity_callback_prepare_v1",
  );
  const finalizeStart = sql.indexOf(
    "function integration.drs_identity_callback_finalize_v1",
  );
  assert.ok(prepareStart >= 0 && finalizeStart > prepareStart);
  const prepareBody = sql.slice(prepareStart, finalizeStart);
  assert.doesNotMatch(prepareBody, /terminal_status\s*=\s*'consumed'/iu);
  assert.doesNotMatch(prepareBody, /'identity_login'/iu);
  const finalizeBody = sql.slice(finalizeStart);
  assert.match(finalizeBody, /drs_identity_callback_prepare_v1/iu);
  assert.match(finalizeBody, /terminal_status\s*=\s*'consumed'/iu);
  assert.match(finalizeBody, /'identity_login'/iu);

  const prepareCall = contracts.indexOf("store.prepareIdentityCallback");
  const producerCall = contracts.indexOf(".createVerifiedSession", prepareCall);
  const finalizeCall = contracts.indexOf("store.finalizeIdentityCallback", producerCall);
  const continuationReturn = contracts.indexOf(
    "return continuation ??",
    finalizeCall,
  );
  assert.ok(
    prepareCall >= 0 && producerCall > prepareCall &&
      finalizeCall > producerCall && continuationReturn > finalizeCall,
  );
  assert.match(contracts, /response\.status\s*!==\s*303/iu);
  assert.match(contracts, /httponly/iu);
  assert.match(contracts, /samesite=lax/iu);
  assert.match(contracts, /x-laibe-session-state/iu);
  assert.doesNotMatch(
    contracts,
    /jsonResponse\([^;]+SESSION_ESTABLISHED/isu,
  );
});

test("all foreign keys and authority lookup paths have leading indexes", () => {
  const sql = source(migrationPath);
  for (const pattern of [
    /create index drs_identity_provider_bindings_specialist_idx\s+on integration\.drs_identity_provider_bindings \(specialist_id\)/iu,
    /create index drs_identity_link_states_authenticated_user_idx\s+on integration\.drs_identity_link_states \(authenticated_user_id\)/iu,
    /create index drs_identity_link_states_specialist_idx\s+on integration\.drs_identity_link_states \(specialist_id\)/iu,
    /create index drs_identity_provider_events_authenticated_user_idx\s+on integration\.drs_identity_provider_events/iu,
    /create index drs_identity_provider_events_specialist_idx\s+on integration\.drs_identity_provider_events/iu,
    /create index drs_identity_provider_events_state_idx\s+on integration\.drs_identity_provider_events \(state_id\)/iu,
  ]) assert.match(sql, pattern);
});

test("production transports are injected and contain no live provider or Supabase fetch", () => {
  const combined = productionTs.map(source).join("\n");
  assert.doesNotMatch(combined, /\bfetch\s*\(/u);
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY|service-role-secret|line[_-]?channel[_-]?secret|google[_-]?client[_-]?secret/iu);
  assert.doesNotMatch(combined, /account\.line\.biz|localStorage|casework\.case_members/iu);
  assert.match(combined, /CONTEXT_UNAVAILABLE/u);
});

test("endpoint source exposes method guards, fail-closed factories, and minimal session projection", () => {
  const endpoints = productionTs.filter((file) => file.endsWith("/index.ts")).map(source).join("\n");
  const sessionContract = source("supabase/functions/_shared/drs-auth/contracts.ts") +
    source("supabase/functions/drs-session-grant/index.ts");
  assert.match(endpoints, /request\.method/iu);
  assert.match(endpoints, /CONTEXT_UNAVAILABLE/u);
  assert.match(sessionContract, /laibe\.drs-workspace-auth\.v1/u);
  assert.match(sessionContract, /validateDrsWorkspaceGrantProjection/u);
  assert.match(sessionContract, /resolveAuthenticatedIdentity/u);
  for (const forbidden of ["accessToken", "refreshToken", "idToken", "pkceVerifier", "serviceRoleKey", "caseIds"]) {
    assert.doesNotMatch(source("supabase/functions/drs-session-grant/index.ts"), new RegExp(forbidden, "u"));
  }
});

test("documentation preserves local-only gates and non-secret verification procedure", () => {
  const markdown = source("docs/drs_backend/drs_identity_google_line_binding_w1.md");
  for (const required of [
    "REAL_DRS_SUPABASE_PROJECT=NOT_CREATED", "REAL_GOOGLE_OAUTH=NOT_CONNECTED",
    "REAL_LINE_LOGIN=NOT_CONNECTED", "REAL_DRS_ACCOUNTS=NOT_CREATED",
    "REMOTE_MIGRATION=NOT_APPLIED", "DEPLOYMENT=NOT_DONE", "CANONICAL_RUNTIME=NOT_PROVEN",
    "mock transport", "20260824092002_drs_identity_foundation.sql", "git diff --check",
  ]) assert.ok(markdown.includes(required), required);
  assert.doesNotMatch(
    markdown,
    /(?:real integration (?:is )?complete|(?:is|are) production ready|DEPLOYED=TRUE)/iu,
  );
});
