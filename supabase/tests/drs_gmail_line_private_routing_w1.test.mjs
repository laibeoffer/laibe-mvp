import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../migrations/20260831050535_drs_gmail_line_private_routing_w1.sql",
  import.meta.url,
);
const sql = readFileSync(migrationUrl, "utf8");

function tableSource(name) {
  const match = sql.match(new RegExp(
    `create table integration\\.${name}\\s*\\(([\\s\\S]*?)\\n\\);`,
    "iu",
  ));
  assert.ok(match, `${name} must be created`);
  return match[1];
}

function functionSource(name) {
  const match = sql.match(new RegExp(
    `create or replace function drs_private\\.${name}\\(\\s*p_input jsonb\\s*\\)[\\s\\S]*?\\$\\$;`,
    "iu",
  ));
  assert.ok(match, `${name}(jsonb) must be created`);
  return match[0];
}

const TABLES = [
  "drs_line_account_link_intents",
  "drs_line_account_bindings",
  "drs_line_binding_audit",
  "drs_line_webhook_events",
  "drs_line_notification_outbox",
  "drs_line_delivery_receipts",
];

const RPCS = [
  "drs_line_start_link_intent_v1",
  "drs_line_read_link_status_v1",
  "drs_line_cancel_link_intent_v1",
  "drs_line_prepare_nonce_v1",
  "drs_line_complete_account_link_v1",
  "drs_line_unlink_account_v1",
  "drs_line_claim_webhook_v1",
  "drs_line_complete_webhook_v1",
  "drs_line_admit_case_notification_v1",
  "drs_line_claim_notification_v1",
  "drs_line_complete_notification_v1",
];

test("migration creates the six private durable LINE routing relations", () => {
  for (const name of TABLES) tableSource(name);
  assert.match(
    tableSource("drs_line_account_link_intents"),
    /nonce_digest\s+text[\s\S]*expires_at\s+timestamptz[\s\S]*consumed_at\s+timestamptz/iu,
  );
  const bindings = tableSource("drs_line_account_bindings");
  for (const column of [
    /binding_version\s+bigint/iu,
    /line_user_digest\s+text/iu,
    /line_user_ciphertext\s+text/iu,
    /line_user_iv\s+text/iu,
    /encryption_key_version\s+text/iu,
  ]) assert.match(bindings, column);
  assert.match(
    tableSource("drs_line_notification_outbox"),
    /assignment_id\s+uuid[\s\S]*binding_version\s+bigint[\s\S]*idempotency_key\s+text[\s\S]*next_attempt_at\s+timestamptz/iu,
  );
  assert.match(
    tableSource("drs_line_delivery_receipts"),
    /outbox_id\s+uuid[\s\S]*outcome\s+text[\s\S]*http_status_class\s+text[\s\S]*duration_ms\s+integer/iu,
  );
});

test("all six relations are postgres-owned forced-RLS deny-by-default storage", () => {
  for (const name of TABLES) {
    assert.match(sql, new RegExp(`alter table integration\\.${name} owner to postgres`, "iu"));
    assert.match(sql, new RegExp(`alter table integration\\.${name} enable row level security`, "iu"));
    assert.match(sql, new RegExp(`alter table integration\\.${name} force row level security`, "iu"));
    assert.match(sql, new RegExp(
      `create policy ${name}_deny_all[\\s\\S]*?on integration\\.${name}[\\s\\S]*?to public[\\s\\S]*?using \\(false\\)[\\s\\S]*?with check \\(false\\)`,
      "iu",
    ));
    assert.match(sql, new RegExp(
      `revoke all on table integration\\.${name}[\\s\\S]*?from public, anon, authenticated, service_role`,
      "iu",
    ));
  }
});

test("partial unique indexes prevent both active binding collision directions", () => {
  assert.match(sql, /create unique index drs_line_bindings_one_active_specialist_idx\s+on integration\.drs_line_account_bindings\s*\(provider_channel_id, specialist_id\)\s*where binding_state = 'active'/iu);
  assert.match(sql, /create unique index drs_line_bindings_one_active_line_identity_idx\s+on integration\.drs_line_account_bindings\s*\(provider_channel_id, line_user_digest\)\s*where binding_state = 'active'/iu);
  assert.match(sql, /create unique index drs_line_intents_one_pending_specialist_idx\s+on integration\.drs_line_account_link_intents\s*\(\s*provider_channel_id, specialist_id\s*\)\s*where intent_state in \('pending', 'link_token_issued', 'nonce_ready'\)/iu);
  assert.match(sql, /unique\s*\(webhook_event_digest\)|webhook_event_digest\s+text\s+primary key/iu);
  assert.match(sql, /idempotency_key\s+text\s+not null\s+unique/iu);
});

test("binding audit and delivery receipts are append-only", () => {
  for (const name of ["drs_line_binding_audit", "drs_line_delivery_receipts"]) {
    assert.match(sql, new RegExp(
      `create trigger ${name}_append_only[\\s\\S]*?before update or delete[\\s\\S]*?on integration\\.${name}`,
      "iu",
    ));
  }
  assert.match(sql, /raise exception 'DRS_LINE_APPEND_ONLY'/iu);
});

test("all private routing RPCs are closed postgres-owned service-only functions", () => {
  for (const name of RPCS) {
    const rpc = functionSource(name);
    assert.match(rpc, /security definer/iu);
    assert.match(rpc, /set search_path = ''/iu);
    assert.match(sql, new RegExp(
      `alter function drs_private\\.${name}\\(jsonb\\)\\s+owner to postgres`,
      "iu",
    ));
    assert.match(sql, new RegExp(
      `revoke all on function drs_private\\.${name}\\(jsonb\\)[\\s\\S]*?from public, anon, authenticated`,
      "iu",
    ));
    assert.match(sql, new RegExp(
      `grant execute on function drs_private\\.${name}\\(jsonb\\)\\s+to service_role`,
      "iu",
    ));
  }
});

test("browser-adjacent mutations re-resolve canonical Gmail-backed DRS authority", () => {
  for (const name of [
    "drs_line_start_link_intent_v1",
    "drs_line_read_link_status_v1",
    "drs_line_cancel_link_intent_v1",
    "drs_line_prepare_nonce_v1",
    "drs_line_unlink_account_v1",
  ]) {
    const rpc = functionSource(name);
    assert.match(rpc, /drs_private\.drs_line_authority_matches_v1/iu);
    assert.match(rpc, /authenticated_user_id/iu);
    assert.match(rpc, /specialist_id/iu);
    assert.match(rpc, /assignment_id/iu);
    assert.match(rpc, /selected_case_id/iu);
    assert.match(rpc, /authorization_subject/iu);
  }
  const authorityHelper = sql.match(
    /create or replace function drs_private\.drs_line_authority_matches_v1\([\s\S]*?\$\$;/iu,
  )?.[0];
  assert.ok(authorityHelper);
  assert.match(
    authorityHelper,
    /integration\.drs_identity_authority_resolve_locked_v1/iu,
  );
});

test("account-link completion consumes one nonce and maps both collision directions without overwrite", () => {
  const rpc = functionSource("drs_line_complete_account_link_v1");
  assert.match(rpc, /nonce_digest/iu);
  assert.match(rpc, /for update/iu);
  assert.match(rpc, /consumed_at is null/iu);
  assert.match(rpc, /conflict_line_already_bound/iu);
  assert.match(rpc, /conflict_drs_already_bound/iu);
  assert.match(rpc, /insert into integration\.drs_line_account_bindings/iu);
  assert.doesNotMatch(rpc, /on conflict[\s\S]*do update/iu);
});

test("webhook claim and completion preserve durable replay outcome", () => {
  const claim = functionSource("drs_line_claim_webhook_v1");
  const complete = functionSource("drs_line_complete_webhook_v1");
  assert.match(claim, /webhook_event_digest/iu);
  assert.match(claim, /for update/iu);
  assert.match(claim, /already_completed/iu);
  assert.match(claim, /claim_token/iu);
  assert.match(complete, /completed_at/iu);
  assert.match(complete, /safe_outcome/iu);
  assert.doesNotMatch(`${claim}\n${complete}`, /delete from integration\.drs_line_webhook_events/iu);
});

test("notification admission and claim recheck assignment, case, specialist, binding, and binding version", () => {
  const admit = functionSource("drs_line_admit_case_notification_v1");
  const claim = functionSource("drs_line_claim_notification_v1");
  for (const source of [admit, claim]) {
    assert.match(source, /public\.drs_case_specialist_assignments/iu);
    assert.match(source, /public\.drs_case_specialist_assignment_terminations/iu);
    assert.match(source, /public\.drs_specialists/iu);
    assert.match(source, /public\.drs_cases/iu);
    assert.match(source, /integration\.drs_line_account_bindings/iu);
    assert.match(source, /binding_version/iu);
  }
  assert.match(claim, /for update skip locked/iu);
  assert.match(claim, /assignmentStatus|assignment_status|suppressed_authority/iu);
});

test("migration contains no LINE group routing, raw protocol token, or browser authorization shortcut", () => {
  assert.doesNotMatch(sql, /line_group|group_id|groupId|LINE Login|LIFF/iu);
  assert.doesNotMatch(sql, /\blink_token\b|\braw_nonce\b|raw_user_meta_data|user_metadata|auth\.jwt\(\)/iu);
  assert.doesNotMatch(sql, /localStorage|sessionStorage|console\./iu);
});
