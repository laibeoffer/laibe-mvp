function fail(message: string): never {
  throw new Error(message);
}

const assert = Object.freeze({
  ok(value: unknown, message = "assertion failed"): void {
    if (!value) fail(message);
  },
  equal(actual: unknown, expected: unknown, message = "values differ") {
    if (!Object.is(actual, expected)) {
      fail(
        `${message}: expected ${String(expected)}, received ${String(actual)}`,
      );
    }
  },
  match(actual: string, pattern: RegExp, message = "pattern did not match") {
    if (!pattern.test(actual)) fail(`${message}: ${pattern}`);
  },
  doesNotMatch(
    actual: string,
    pattern: RegExp,
    message = "unexpected pattern matched",
  ) {
    if (pattern.test(actual)) fail(`${message}: ${pattern}`);
  },
});

const MIGRATION_URL = new URL(
  "../../supabase/migrations/20260911031500_drs_line_account_link_private_routing_v2.sql",
  import.meta.url,
);

async function migrationSource(): Promise<string> {
  return await Deno.readTextFile(MIGRATION_URL);
}

function matches(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].map((match) => match[0]);
}

Deno.test("Exact3 admits only fresh or exact W1 state before target DDL", async () => {
  const source = await migrationSource();
  assert.ok(source.length > 0, "V2 migration must exist");
  assert.match(source, /^begin;$/mu);
  assert.match(source, /^set local lock_timeout = '[^']+';$/mu);
  assert.match(source, /^set local statement_timeout = '[^']+';$/mu);
  assert.match(source, /REAPPLY_MODE=FAIL_CLOSED_NOT_IDEMPOTENT/u);
  const preflight = source.indexOf("UNKNOWN_LINE_DRIFT");
  const firstDdl = source.indexOf("create schema drs_line_private");
  assert.ok(
    preflight >= 0 && firstDdl > preflight,
    "source-state preflight must precede all target DDL",
  );
  assert.match(
    source,
    /if pg_catalog\.current_setting\([^)]*\) = 'LEGACY_W1_EXACT' then/iu,
  );
  assert.doesNotMatch(
    source,
    /alter\s+(?:table|function)\s+(?:auth|casework|drs_forward_private)\./iu,
  );
});

Deno.test("V2 stays inside the fixed object budget", async () => {
  const source = await migrationSource();
  const target = source.slice(source.indexOf("create schema drs_line_private"));
  assert.equal(
    matches(target, /^create table integration\.drs_line_/gmu).length,
    4,
  );
  assert.equal(
    matches(target, /^create function public\.drs_line_/gmu).length,
    9,
  );
  assert.ok(
    matches(target, /^create function drs_line_private\./gmu).length <= 13,
  );
  assert.equal(matches(target, /^create (?:unique )?index /gmu).length, 5);
  assert.equal(matches(target, /^create policy /gmu).length, 4);
  assert.equal(matches(target, /^create trigger /gmu).length, 1);
  assert.doesNotMatch(
    target,
    /notification_outbox|delivery_receipts|review_notification|case_group_bind/iu,
  );
});

Deno.test("V2 creates exactly the four private LINE account-link relations", async () => {
  const source = await migrationSource();
  for (
    const table of [
      "drs_line_account_link_intents",
      "drs_line_account_bindings",
      "drs_line_binding_audit",
      "drs_line_webhook_events",
    ]
  ) {
    assert.match(
      source,
      new RegExp(`create table integration\\.${table} \\(`, "u"),
    );
    assert.match(
      source,
      new RegExp(
        `alter table integration\\.${table} enable row level security`,
        "u",
      ),
    );
    assert.match(
      source,
      new RegExp(
        `alter table integration\\.${table} force row level security`,
        "u",
      ),
    );
    assert.match(source, new RegExp(`create policy ${table}_deny_all`, "u"));
    assert.match(
      source,
      new RegExp(`revoke all on table integration\\.${table}`, "u"),
    );
  }
  assert.match(
    source,
    /foreign key \(authority_id\) references drs_forward_private\.reviewer_case_authorities\(authority_id\)/iu,
  );
  assert.match(
    source,
    /foreign key \(specialist_id\) references drs_forward_private\.specialists\(specialist_id\)/iu,
  );
  assert.match(
    source,
    /foreign key \(selected_case_id\) references casework\.cases\(id\)/iu,
  );
  assert.match(
    source,
    /foreign key \(authenticated_user_id\) references auth\.users\(id\)/iu,
  );
  assert.doesNotMatch(source, /\bassignment_id\s+uuid/iu);
  assert.doesNotMatch(source, /p_input\s*->>\s*'assignment_id'/iu);
});

Deno.test("public facades are invoker-only and executable only by service_role", async () => {
  const source = await migrationSource();
  const facades = [
    "drs_line_start_link_intent_v1",
    "drs_line_read_link_status_v1",
    "drs_line_cancel_link_intent_v1",
    "drs_line_prepare_nonce_v1",
    "drs_line_unlink_account_v1",
    "drs_line_claim_webhook_v1",
    "drs_line_complete_webhook_v1",
    "drs_line_complete_account_link_event_v1",
    "drs_line_unlink_by_line_identity_v1",
  ];
  for (const name of facades) {
    const definition = new RegExp(
      `create function public\\.${name}\\(p_input jsonb\\)[\\s\\S]*?security invoker[\\s\\S]*?set search_path = ''`,
      "iu",
    );
    assert.match(source, definition);
    assert.match(
      source,
      new RegExp(
        `revoke all on function public\\.${name}\\(jsonb\\) from public, anon, authenticated`,
        "iu",
      ),
    );
    assert.match(
      source,
      new RegExp(
        `grant execute on function public\\.${name}\\(jsonb\\) to service_role`,
        "iu",
      ),
    );
  }
  assert.doesNotMatch(
    source,
    /grant\s+(?:select|insert|update|delete|all).*on table.*service_role/iu,
  );
});

Deno.test("private implementation is definer-only with a closed schema boundary", async () => {
  const source = await migrationSource();
  assert.match(
    source,
    /create schema drs_line_private authorization postgres/iu,
  );
  assert.match(
    source,
    /revoke all on schema drs_line_private from public, anon, authenticated/iu,
  );
  assert.match(
    source,
    /grant usage on schema drs_line_private to service_role/iu,
  );
  for (
    const definition of source.matchAll(
      /^create function drs_line_private\.[\s\S]*?^\$function\$;$/gmu,
    )
  ) {
    assert.match(definition[0], /security definer/iu);
    assert.match(definition[0], /set search_path = ''/iu);
  }
  assert.match(
    source,
    /revoke all on all functions in schema drs_line_private from public, anon, authenticated/iu,
  );
});

Deno.test("password authority and current Core membership are locked and fail closed", async () => {
  const source = await migrationSource();
  assert.match(
    source,
    /drs_forward_private\.drs_password_authority_resolve_locked_v1\(/u,
  );
  assert.doesNotMatch(source, /identity_provider_bindings/iu);
  assert.doesNotMatch(
    source,
    /drs_identity_authority_resolve_locked_v1/iu,
  );
  assert.match(
    source,
    /v_authority_id\s*:=\s*\(v_authority\s*->>\s*'assignment_id'\)::uuid/iu,
  );
  assert.match(source, /authority_id/iu);
  assert.match(source, /authenticated_user_id/iu);
  assert.match(source, /specialist_id/iu);
  assert.match(source, /selected_case_id/iu);
  assert.match(source, /authorization_subject/iu);
  assert.match(source, /auth_specialist_bindings/iu);
  assert.match(source, /binding_status = 'active'/iu);
  assert.match(source, /revoked_at is null/iu);
  assert.match(source, /valid_from <=/iu);
  assert.match(source, /valid_until >/iu);
  assert.match(
    source,
    /from casework\.case_members membership_row[\s\S]*?for update/iu,
  );
  assert.match(source, /v_membership\.role::text is distinct from 'owner'/iu);
});

Deno.test("preflight requires password authority and current membership shape", async () => {
  const source = await migrationSource();
  assert.match(
    source,
    /drs_password_authority_resolve_locked_v1\(uuid,uuid,text\)/u,
  );
  assert.match(source, /'case_members:' \|\| v_name/u);
  for (const field of ["case_id", "user_id", "role", "added_by", "added_at"]) {
    assert.match(
      source,
      new RegExp(`['"]${field}['"]`, "u"),
      `preflight must bind case_members.${field}`,
    );
  }
});

Deno.test("Exact4 uses PostgreSQL expressions without invalid pg_catalog qualification", async () => {
  const source = await migrationSource();
  assert.doesNotMatch(
    source,
    /pg_catalog\.(?:coalesce|least|greatest)\s*\(/iu,
  );
  assert.match(source, /array_agg\(a\.attname::text order by a\.attnum\)/iu);
});

Deno.test("Exact4 binds the current Core membership row and owner role only", async () => {
  const source = await migrationSource();
  const preflight = source.slice(0, source.indexOf("$preflight$;"));
  const resolver =
    /create function drs_line_private\.drs_line_resolve_authority_v2[\s\S]*?\$function\$;/iu
      .exec(source)?.[0] ?? "";
  assert.ok(resolver.length > 0, "authority resolver must exist");
  for (const field of ["case_id", "user_id", "role", "added_by", "added_at"]) {
    assert.match(preflight, new RegExp(`['"]${field}['"]`, "u"));
  }
  assert.match(preflight, /indisprimary/iu);
  assert.match(resolver, /v_membership\s+casework\.case_members%rowtype/iu);
  assert.match(
    resolver,
    /from casework\.case_members membership_row[\s\S]*?membership_row\.case_id[\s\S]*?membership_row\.user_id[\s\S]*?for update/iu,
  );
  assert.match(resolver, /v_membership\.role::text is distinct from 'owner'/iu);
  assert.doesNotMatch(
    resolver,
    /membership_(?:status)|v_membership\.(?:revoked_at|valid_from|valid_until)/iu,
  );
});

Deno.test("native fixture creates API roles and uses an explicit specialist join", async () => {
  const source = await Deno.readTextFile(
    new URL(
      "./drs_line_account_link_private_routing_v3_real_pg.test.ts",
      import.meta.url,
    ),
  );
  for (const role of ["anon", "authenticated", "service_role"]) {
    assert.match(source, new RegExp(`create role ${role} nologin`, "iu"));
  }
  assert.match(
    source,
    /join drs_forward_private\.specialists s\s+on s\.specialist_id = a\.specialist_id/iu,
  );
  assert.doesNotMatch(
    source,
    /join drs_forward_private\.specialists s using\s*\(specialist_id\)/iu,
  );
});

Deno.test("Exact5 real-PG runner is native-only with unique databases and exact cleanup", async () => {
  const source = await Deno.readTextFile(
    new URL(
      "./drs_line_account_link_private_routing_v3_real_pg.test.ts",
      import.meta.url,
    ),
  );
  assert.match(source, /const pgDataDirectory = String\s*\.raw/iu);
  assert.match(source, /current_setting\('data_directory'\)/iu);
  assert.match(source, /crypto\.randomUUID\(\)/iu);
  assert.match(source, /create database \$\{quoteIdentifier\(database\)\}/iu);
  assert.match(
    source,
    /drop database if exists \$\{quoteIdentifier\(database\)\} with \(force\)/iu,
  );
  assert.doesNotMatch(
    source,
    /\b(?:docker|waitHealthy|dockerExecutable|postgresImage|container)\b/iu,
  );
});

Deno.test("Exact5 real-PG membership scenarios use only the current Core row", async () => {
  const source = await Deno.readTextFile(
    new URL(
      "./drs_line_account_link_private_routing_v3_real_pg.test.ts",
      import.meta.url,
    ),
  );
  const scenarios = source.slice(source.indexOf("const startInput"));
  assert.doesNotMatch(
    scenarios,
    /membership_status|revoked_at|valid_from|valid_until/iu,
  );
  assert.match(
    scenarios,
    /delete from casework\.case_members[\s\S]*?case_id='\$\{ids\.case1\}'[\s\S]*?user_id='\$\{ids\.owner1\}'/iu,
  );
  assert.match(
    scenarios,
    /insert into casework\.case_members\(case_id, user_id, role, added_by\)[\s\S]*?'owner'/iu,
  );
  assert.doesNotMatch(source, /alter\s+table\s+casework\.case_members/iu);
});

Deno.test("Exact5 real-PG exercises post-lock wrong-role and deletion with zero target writes", async () => {
  const source = await Deno.readTextFile(
    new URL(
      "./drs_line_account_link_private_routing_v3_real_pg.test.ts",
      import.meta.url,
    ),
  );
  assert.match(source, /wrongRoleBlocker\s*=\s*startPsql/iu);
  assert.match(source, /wrongRoleFinalizer\s*=\s*startPsql/iu);
  assert.match(source, /deleteMembershipBlocker\s*=\s*startPsql/iu);
  assert.match(source, /deleteMembershipFinalizer\s*=\s*startPsql/iu);
  assert.match(source, /beforeWrongRole[\s\S]*?afterWrongRole/iu);
  assert.match(source, /beforeDeleteMembership[\s\S]*?afterDeleteMembership/iu);
  assert.match(
    source,
    /assert\.deepEqual\(afterWrongRole, beforeWrongRole\)/iu,
  );
  assert.match(
    source,
    /assert\.deepEqual\(afterDeleteMembership, beforeDeleteMembership\)/iu,
  );
});

Deno.test("post-lock time and expiry are refreshed before consuming nonce or inserting binding", async () => {
  const source = await migrationSource();
  assert.match(
    source,
    /pg_advisory_xact_lock[\s\S]*?v_now\s*:=\s*pg_catalog\.clock_timestamp\(\)/iu,
  );
  assert.match(
    source,
    /v_now\s*:=\s*pg_catalog\.clock_timestamp\(\)[\s\S]*?nonce_expires_at\s*<=\s*v_now[\s\S]*?insert into integration\.drs_line_account_bindings/iu,
  );
});

Deno.test("stale reclaim rotates only the claim token and preserves the provider retry key", async () => {
  const source = await migrationSource();
  const reclaim =
    /if v_event\.claimed_at[\s\S]*?return pg_catalog\.jsonb_build_object\([\s\S]*?'provider_retry_key', v_event\.provider_retry_key[\s\S]*?\);/iu
      .exec(source)?.[0] ?? "";
  assert.ok(reclaim.length > 0, "stale reclaim block must exist");
  assert.match(reclaim, /set claim_token = v_claim_token/iu);
  assert.doesNotMatch(reclaim, /provider_retry_key\s*=/iu);
});

Deno.test("tracked W1 has one exact transactional legacy-to-target path", async () => {
  const source = await migrationSource();
  assert.match(source, /LEGACY_W1_EXACT/u);
  assert.match(source, /FRESH_TARGET/u);
  assert.match(source, /UNKNOWN_LINE_DRIFT/u);
  assert.match(
    source,
    /drop table integration\.drs_line_notification_outbox/iu,
  );
  assert.match(
    source,
    /drop function public\.drs_line_complete_account_link_v1\(jsonb\)/iu,
  );
  assert.doesNotMatch(source, /drop[^;]+cascade/iu);
});

Deno.test("digest, expiry, terminal-state, replay, and stale-lease invariants are database constraints", async () => {
  const source = await migrationSource();
  assert.match(source, /char_length\([^)]*digest[^)]*\) = 43/iu);
  assert.match(source, /create unique index[^;]*\(nonce_digest\)/iu);
  assert.match(source, /interval '15 minutes'/iu);
  assert.match(source, /interval '10 minutes'/iu);
  assert.match(source, /for update/iu);
  assert.match(source, /nonce_digest = null/iu);
  assert.match(source, /max_attempts[^\n]*12|attempt_count[^\n]*<= 12/iu);
  assert.match(source, /interval '2 minutes'/iu);
  assert.match(source, /on conflict \(webhook_digest\)/iu);
  assert.match(source, /check \([\s\S]*intent_state[\s\S]*consumed_at/iu);
  assert.match(source, /check \([\s\S]*processing_state[\s\S]*completed_at/iu);
});

Deno.test("audit is append-only and account unlink revokes rather than deletes", async () => {
  const source = await migrationSource();
  assert.match(source, /create trigger drs_line_binding_audit_append_only/iu);
  assert.match(
    source,
    /before update or delete on integration\.drs_line_binding_audit/iu,
  );
  assert.match(source, /raise exception[\s\S]*append.only/iu);
  assert.match(source, /binding_state = 'revoked'/iu);
  assert.match(source, /revoked_at =/iu);
  assert.doesNotMatch(
    source,
    /delete from integration\.drs_line_account_bindings/iu,
  );
});

async function lineSignature(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(body)),
  );
  return btoa(String.fromCharCode(...digest));
}

Deno.test("mixed user and group envelope fails closed before any durable or provider effect", async () => {
  const [{ createCanonicalLineWebhookHandler }, { createLineWebhookHandler }] =
    await Promise.all([
      import(
        "../../supabase/functions/_shared/drs-line-case-group/canonical-webhook.ts"
      ),
      import(
        "../../supabase/functions/_shared/drs-line-account-link/webhook.ts"
      ),
    ]);
  const secret = "exact3-test-channel-secret";
  let durableCalls = 0;
  let providerCalls = 0;
  let groupCalls = 0;
  const unavailable = (..._args: unknown[]) => {
    durableCalls += 1;
    return Promise.reject(new Error("must not run"));
  };
  const providerUnavailable = (..._args: unknown[]) => {
    providerCalls += 1;
    return Promise.reject(new Error("must not run"));
  };
  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(32).fill(19),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  const accountHandler = createLineWebhookHandler({
    channelSecret: secret,
    identityHmacKey: "exact3-test-identity-hmac-key",
    identityEncryptionKey: encryptionKey,
    identityEncryptionKeyVersion: "exact3-test-v1",
    publicOrigin: "https://laibe.example",
    repository: {
      claimEvent: unavailable,
      completeEvent: unavailable,
      completeAccountLinkEvent: unavailable,
      unlinkByLineIdentity: unavailable,
    },
    lineClient: {
      issueLinkToken: providerUnavailable,
      pushAccountLink: providerUnavailable,
      pushUnlinkConfirmation: providerUnavailable,
      pushCaseNotification: providerUnavailable,
    },
  });
  const canonical = createCanonicalLineWebhookHandler({
    accountLinkHandler: accountHandler,
    caseGroupHandler: () => {
      groupCalls += 1;
      return Promise.resolve(new Response("{}", { status: 200 }));
    },
  });
  const destination = "U0123456789abcdef0123456789abcdef";
  const body = JSON.stringify({
    destination,
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: 1789099200000,
        source: { type: "user", userId: destination },
        webhookEventId: "01HZZZZZZZZZZZZZZZZZZZZZZY",
        deliveryContext: { isRedelivery: false },
        replyToken: "exact3-user-reply-token",
        message: {
          id: "555001",
          type: "text",
          text: "綁定 LINE 案件通知",
        },
      },
      {
        type: "message",
        mode: "active",
        timestamp: 1789099200001,
        source: {
          type: "group",
          groupId: "C0123456789abcdef0123456789abcdef",
          userId: destination,
        },
        webhookEventId: "01HZZZZZZZZZZZZZZZZZZZZZZZ",
        deliveryContext: { isRedelivery: false },
        replyToken: "exact3-group-reply-token",
        message: {
          id: "555002",
          type: "text",
          text: "DRS案件綁定 " + "A".repeat(43),
        },
      },
    ],
  });
  const response = await canonical(
    new Request("https://laibe.example/functions/v1/drs-line-webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": await lineSignature(secret, body),
      },
      body,
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(durableCalls, 0);
  assert.equal(providerCalls, 0);
  assert.equal(groupCalls, 0);
});
