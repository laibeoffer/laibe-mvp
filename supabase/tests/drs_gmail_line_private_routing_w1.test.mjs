import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../migrations/20260831050535_drs_gmail_line_private_routing_w1.sql",
  import.meta.url,
);
const sql = readFileSync(migrationUrl, "utf8");

function tableSource(name) {
  const match = sql.match(
    new RegExp(
      `create table integration\\.${name}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "iu",
    ),
  );
  assert.ok(match, `${name} must be created`);
  return match[1];
}

function functionSource(name) {
  const match = sql.match(
    new RegExp(
      `create or replace function drs_private\\.${name}\\(\\s*p_input jsonb\\s*\\)[\\s\\S]*?\\$\\$;`,
      "iu",
    ),
  );
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
  "drs_line_unlink_by_line_identity_v1",
  "drs_line_claim_webhook_v1",
  "drs_line_complete_webhook_v1",
  "drs_line_complete_account_link_event_v1",
  "drs_line_admit_case_notification_v1",
  "drs_line_claim_notification_v1",
  "drs_line_assert_notification_claim_v1",
  "drs_line_complete_notification_v1",
];

test("migration creates the six private durable LINE routing relations", () => {
  for (const name of TABLES) tableSource(name);
  assert.match(
    tableSource("drs_line_account_link_intents"),
    /nonce_digest\s+text[\s\S]*expires_at\s+timestamptz[\s\S]*consumed_at\s+timestamptz/iu,
  );
  const bindings = tableSource("drs_line_account_bindings");
  for (
    const column of [
      /binding_version\s+bigint/iu,
      /line_user_digest\s+text/iu,
      /line_user_ciphertext\s+text/iu,
      /line_user_iv\s+text/iu,
      /encryption_key_version\s+text/iu,
    ]
  ) assert.match(bindings, column);
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
    assert.match(
      sql,
      new RegExp(`alter table integration\\.${name} owner to postgres`, "iu"),
    );
    assert.match(
      sql,
      new RegExp(
        `alter table integration\\.${name} enable row level security`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `alter table integration\\.${name} force row level security`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `create policy ${name}_deny_all[\\s\\S]*?on integration\\.${name}[\\s\\S]*?to public[\\s\\S]*?using \\(false\\)[\\s\\S]*?with check \\(false\\)`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on table integration\\.${name}[\\s\\S]*?from public, anon, authenticated, service_role`,
        "iu",
      ),
    );
  }
});

test("partial unique indexes prevent both active binding collision directions", () => {
  assert.match(
    sql,
    /create unique index drs_line_bindings_one_active_specialist_idx\s+on integration\.drs_line_account_bindings\s*\(provider_channel_id, specialist_id\)\s*where binding_state = 'active'/iu,
  );
  assert.match(
    sql,
    /create unique index drs_line_bindings_one_active_line_identity_idx\s+on integration\.drs_line_account_bindings\s*\(provider_channel_id, line_user_digest\)\s*where binding_state = 'active'/iu,
  );
  assert.match(
    sql,
    /create unique index drs_line_intents_one_pending_specialist_idx\s+on integration\.drs_line_account_link_intents\s*\(\s*provider_channel_id, specialist_id\s*\)\s*where intent_state in \('pending', 'link_token_issued', 'nonce_ready'\)/iu,
  );
  assert.match(
    sql,
    /unique\s*\(webhook_event_digest\)|webhook_event_digest\s+text\s+primary key/iu,
  );
  assert.match(sql, /idempotency_key\s+text\s+not null\s+unique/iu);
});

test("binding audit and delivery receipts are append-only", () => {
  for (const name of ["drs_line_binding_audit", "drs_line_delivery_receipts"]) {
    assert.match(
      sql,
      new RegExp(
        `create trigger ${name}_append_only[\\s\\S]*?before update or delete[\\s\\S]*?on integration\\.${name}`,
        "iu",
      ),
    );
  }
  assert.match(sql, /raise exception 'DRS_LINE_APPEND_ONLY'/iu);
});

test("all private routing RPCs are closed postgres-owned service-only functions", () => {
  for (const name of RPCS) {
    const rpc = functionSource(name);
    assert.match(rpc, /security definer/iu);
    assert.match(rpc, /set search_path = ''/iu);
    assert.match(
      sql,
      new RegExp(
        `alter function drs_private\\.${name}\\(jsonb\\)\\s+owner to postgres`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on function drs_private\\.${name}\\(jsonb\\)[\\s\\S]*?from public, anon, authenticated`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `grant execute on function drs_private\\.${name}\\(jsonb\\)\\s+to service_role`,
        "iu",
      ),
    );
  }
});

test("Edge runtime RPCs have service-only public PostgREST facades", () => {
  for (const name of RPCS) {
    assert.match(
      sql,
      new RegExp(
        `create or replace function public\\.${name}\\(\\s*p_input jsonb\\s*\\)[\\s\\S]*?drs_private\\.${name}\\(p_input\\)`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.${name}\\(jsonb\\)[\\s\\S]*?from public, anon, authenticated`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `grant execute on function public\\.${name}\\(jsonb\\)\\s+to service_role`,
        "iu",
      ),
    );
  }
});

test("browser-adjacent mutations re-resolve canonical Gmail-backed DRS authority", () => {
  for (
    const name of [
      "drs_line_start_link_intent_v1",
      "drs_line_read_link_status_v1",
      "drs_line_cancel_link_intent_v1",
      "drs_line_prepare_nonce_v1",
      "drs_line_unlink_account_v1",
    ]
  ) {
    const rpc = functionSource(name);
    assert.match(rpc, /drs_private\.drs_line_authority_matches_v1/iu);
    assert.match(rpc, /authenticated_user_id/iu);
    assert.match(rpc, /specialist_id/iu);
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

test("browser-adjacent RPCs derive assignment from the locked authority resolver", () => {
  for (
    const name of [
      "drs_line_start_link_intent_v1",
      "drs_line_read_link_status_v1",
      "drs_line_cancel_link_intent_v1",
      "drs_line_prepare_nonce_v1",
      "drs_line_unlink_account_v1",
    ]
  ) {
    assert.doesNotMatch(
      functionSource(name),
      /p_input\s*->>\s*'assignment_id'/iu,
      `${name} must not receive assignment authority from its caller`,
    );
  }
  const start = functionSource("drs_line_start_link_intent_v1");
  assert.match(
    start,
    /integration\.drs_identity_authority_resolve_locked_v1/iu,
  );
  assert.match(start, /v_authority\s*->>\s*'assignment_id'/iu);
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
  assert.match(rpc, /integration\.drs_identity_authority_resolve_locked_v1/iu);
  assert.match(rpc, /specialist_inactive/iu);
  assert.match(rpc, /v_intent\.assignment_id/iu);
});

test("webhook claim and completion preserve durable replay outcome", () => {
  const claim = functionSource("drs_line_claim_webhook_v1");
  const complete = functionSource("drs_line_complete_webhook_v1");
  const completeLinkEvent = functionSource(
    "drs_line_complete_account_link_event_v1",
  );
  assert.match(claim, /webhook_event_digest/iu);
  assert.match(claim, /for update/iu);
  assert.match(claim, /already_completed/iu);
  assert.match(claim, /claim_token/iu);
  assert.match(claim, /provider_retry_key/iu);
  assert.match(
    claim,
    /attempt_count\s*>=\s*12[\s\S]*processing_state\s*=\s*'completed'/iu,
  );
  assert.match(complete, /completed_at/iu);
  assert.match(complete, /safe_outcome/iu);
  assert.match(
    completeLinkEvent,
    /drs_private\.drs_line_complete_account_link_v1/iu,
  );
  assert.match(
    completeLinkEvent,
    /drs_private\.drs_line_complete_webhook_v1/iu,
  );
  assert.match(completeLinkEvent, /webhook_event_digest/iu);
  assert.match(completeLinkEvent, /claim_token/iu);
  assert.match(completeLinkEvent, /raise exception 'DRS_LINE_ATOMIC_LINK'/iu);
  assert.doesNotMatch(
    `${claim}\n${complete}`,
    /delete from integration\.drs_line_webhook_events/iu,
  );
});

test("private LINE owner can revoke only the binding matching the signed LINE identity", () => {
  const unlink = functionSource("drs_line_unlink_by_line_identity_v1");
  assert.match(unlink, /provider_channel_id/iu);
  assert.match(unlink, /line_user_digest/iu);
  assert.match(unlink, /binding_state\s*=\s*'active'/iu);
  assert.match(unlink, /binding_state\s*=\s*'revoked'/iu);
  assert.doesNotMatch(unlink, /role|assignment_id|selected_case_id/iu);
});

test("assignment and newly linked binding automatically produce derived private notification outbox work", () => {
  assert.match(
    sql,
    /create or replace function drs_private\.drs_line_enqueue_assignment_v1/iu,
  );
  assert.match(
    sql,
    /create trigger drs_line_assignment_notification_producer[\s\S]*after insert[\s\S]*on public\.drs_case_specialist_assignments/iu,
  );
  assert.match(
    sql,
    /create trigger drs_line_binding_notification_producer[\s\S]*after insert[\s\S]*on integration\.drs_line_account_bindings/iu,
  );
  const admission = functionSource("drs_line_admit_case_notification_v1");
  assert.match(admission, /drs_private\.drs_line_enqueue_assignment_v1/iu);
  assert.doesNotMatch(
    admission,
    /case_label'|case_status'|next_action'|case_url'|idempotency_key'/iu,
  );
  assert.match(
    tableSource("drs_line_notification_outbox"),
    /case_path\s+text/iu,
  );
});

test("claimed delivery has stale-lease recovery and state-change fencing", () => {
  const claim = functionSource("drs_line_claim_notification_v1");
  const assertClaim = functionSource("drs_line_assert_notification_claim_v1");
  assert.match(
    claim,
    /delivery_state\s*=\s*'claimed'[\s\S]*claimed_at\s*<=\s*v_now\s*-\s*interval\s*'2 minutes'/iu,
  );
  assert.match(claim, /dispatcher_claim_expired/iu);
  assert.match(assertClaim, /claim_token/iu);
  assert.match(assertClaim, /drs_case_specialist_assignment_terminations/iu);
  assert.match(sql, /DRS_LINE_DELIVERY_IN_FLIGHT/iu);
  assert.match(
    sql,
    /before insert[\s\S]*on public\.drs_case_specialist_assignment_terminations/iu,
  );
  assert.match(
    sql,
    /before update of authority_state[\s\S]*on public\.drs_specialists/iu,
  );
  assert.match(sql, /before update of case_state[\s\S]*on public\.drs_cases/iu);
});

test("notification outcomes append both an immutable receipt and a case audit event", () => {
  const complete = functionSource("drs_line_complete_notification_v1");
  const auditHelper = sql.match(
    /create or replace function drs_private\.drs_line_append_case_receipt_v1\([\s\S]*?\$\$;/iu,
  )?.[0] ?? "";
  assert.match(complete, /integration\.drs_line_delivery_receipts/iu);
  assert.match(complete, /drs_line_append_case_receipt_v1/iu);
  assert.match(auditHelper, /drs_private\.insert_drs_audit_event/iu);
  assert.match(auditHelper, /'PRIVATE_LINE_NOTIFICATION'/iu);
  assert.match(auditHelper, /PRIVATE_LINE_NOTIFICATION/iu);
});

test("notification admission and claim recheck assignment, case, specialist, binding, and binding version", () => {
  const admit = functionSource("drs_line_admit_case_notification_v1");
  const claim = functionSource("drs_line_claim_notification_v1");
  const producer = sql.match(
    /create or replace function drs_private\.drs_line_enqueue_assignment_v1\([\s\S]*?\$\$;/iu,
  )?.[0] ?? "";
  assert.match(admit, /drs_line_enqueue_assignment_v1/iu);
  for (const source of [producer, claim]) {
    assert.match(source, /public\.drs_case_specialist_assignments/iu);
    assert.match(
      source,
      /public\.drs_case_specialist_assignment_terminations/iu,
    );
    assert.match(source, /public\.drs_specialists/iu);
    assert.match(source, /public\.drs_cases/iu);
    assert.match(source, /integration\.drs_line_account_bindings/iu);
    assert.match(source, /binding_version/iu);
  }
  assert.match(claim, /for update skip locked/iu);
  assert.match(
    claim,
    /assignmentStatus|assignment_status|suppressed_authority/iu,
  );
});

test("migration contains no LINE group routing, raw protocol token, or browser authorization shortcut", () => {
  assert.doesNotMatch(sql, /line_group|group_id|groupId|LINE Login|LIFF/iu);
  assert.doesNotMatch(
    sql,
    /\blink_token\b|\braw_nonce\b|raw_user_meta_data|user_metadata|auth\.jwt\(\)/iu,
  );
  assert.doesNotMatch(sql, /localStorage|sessionStorage|console\./iu);
});
