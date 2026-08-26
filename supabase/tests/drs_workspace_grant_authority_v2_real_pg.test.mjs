import assert from "node:assert/strict";

const DATABASE_URL = Deno.env.get("DRS_REAL_PG_URL") ?? "";
const DISPOSABLE_CONFIRMED =
  Deno.env.get("DRS_REAL_PG_DISPOSABLE_CONFIRMED") === "YES";

const USER_A = "11000000-0000-4000-8000-000000000001";
const USER_B = "11000000-0000-4000-8000-000000000002";
const SPECIALIST_A = "22000000-0000-4000-8000-000000000001";
const SPECIALIST_B = "22000000-0000-4000-8000-000000000002";
const DRS_CASE_A = "33000000-0000-4000-8000-000000000001";
const DRS_CASE_B = "33000000-0000-4000-8000-000000000002";
const CASE_A = "44000000-0000-4000-8000-000000000001";
const CASE_B = "44000000-0000-4000-8000-000000000002";
const ASSIGNMENT_A = "55000000-0000-4000-8000-000000000001";
const ASSIGNMENT_B = "55000000-0000-4000-8000-000000000002";
const BINDING_A = "66000000-0000-4000-8000-000000000001";
const BINDING_B = "66000000-0000-4000-8000-000000000002";
const MAPPING_A = "77000000-0000-4000-8000-000000000001";
const MAPPING_B = "77000000-0000-4000-8000-000000000002";
const TERMINATION_A = "88000000-0000-4000-8000-000000000001";
const SUBJECT_A = `drs-specialist:${SPECIALIST_A}`;

async function runPsql(sql) {
  const command = new Deno.Command("psql", {
    args: [
      "--no-psqlrc",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--dbname",
      DATABASE_URL,
      "--command",
      sql,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  return await command.output();
}

async function psql(sql) {
  const output = await runPsql(sql);
  assert.equal(
    output.success,
    true,
    new TextDecoder().decode(output.stderr),
  );
  return new TextDecoder().decode(output.stdout).trim();
}

function jsonFrom(output) {
  const line = output.split(/\r?\n/u).findLast((candidate) =>
    candidate.trimStart().startsWith("{")
  );
  assert.ok(line, output);
  return JSON.parse(line);
}

function assertDenied(payload, label) {
  assert.equal(payload.authorized, false, label);
  assert.match(
    payload.state,
    /^(?:AUTH_REQUIRED|CASE_NOT_AUTHORIZED|CASE_SELECTION_REQUIRED|IDENTITY_MISMATCH|CONTEXT_UNAVAILABLE)$/u,
    label,
  );
}

async function assertMutationDenied(sql, label, expected) {
  const outcome = await runPsql(sql);
  assert.equal(outcome.success, false, label);
  assert.match(new TextDecoder().decode(outcome.stderr), expected, label);
}

const CLEANUP_SQL = `
  set session_replication_role = replica;
  delete from integration.drs_workspace_grants
    where binding_id in ('${BINDING_A}', '${BINDING_B}');
  delete from public.drs_case_specialist_assignment_terminations
    where assignment_id in ('${ASSIGNMENT_A}', '${ASSIGNMENT_B}');
  delete from integration.drs_auth_specialist_bindings
    where binding_id in ('${BINDING_A}', '${BINDING_B}');
  delete from integration.drs_case_identity_bindings
    where case_identity_binding_id in ('${MAPPING_A}', '${MAPPING_B}');
  delete from public.drs_case_specialist_assignments
    where assignment_id in ('${ASSIGNMENT_A}', '${ASSIGNMENT_B}');
  delete from public.drs_specialists
    where specialist_id in ('${SPECIALIST_A}', '${SPECIALIST_B}');
  delete from public.drs_cases
    where case_id in ('${DRS_CASE_A}', '${DRS_CASE_B}');
  delete from casework.cases where id in ('${CASE_A}', '${CASE_B}');
  delete from auth.users where id in ('${USER_A}', '${USER_B}');
  set session_replication_role = origin;
`;

const SETUP_SQL = `
  begin;
  ${CLEANUP_SQL}
  insert into auth.users (id) values ('${USER_A}'), ('${USER_B}');
  insert into casework.cases (
    id, case_status, title, created_by,
    creation_idempotency_key, creation_payload_sha256
  ) values
    (
      '${CASE_A}', 'active', 'Disposable authority case A', '${USER_A}',
      'drs-v2-real-pg-case-a', repeat('a', 64)
    ),
    (
      '${CASE_B}', 'active', 'Disposable authority case B', '${USER_B}',
      'drs-v2-real-pg-case-b', repeat('b', 64)
    );
  insert into public.drs_cases (
    case_id, case_number, owner_id, case_state
  ) values
    ('${DRS_CASE_A}', 'DRS-V2-REAL-PG-A', '${USER_A}', 'ACTIVE_REVIEW'),
    ('${DRS_CASE_B}', 'DRS-V2-REAL-PG-B', '${USER_B}', 'ACTIVE_REVIEW');
  insert into public.drs_specialists (
    specialist_id, display_name, authority_state
  ) values
    ('${SPECIALIST_A}', 'Disposable specialist A', 'ACTIVE'),
    ('${SPECIALIST_B}', 'Disposable specialist B', 'ACTIVE');
  insert into public.drs_case_specialist_assignments (
    assignment_id, case_id, specialist_id, assigned_by,
    valid_from, valid_until
  ) values
    (
      '${ASSIGNMENT_A}', '${DRS_CASE_A}', '${SPECIALIST_A}', '${USER_A}',
      clock_timestamp() - interval '1 hour',
      clock_timestamp() + interval '1 day'
    ),
    (
      '${ASSIGNMENT_B}', '${DRS_CASE_B}', '${SPECIALIST_B}', '${USER_B}',
      clock_timestamp() - interval '1 hour',
      clock_timestamp() + interval '1 day'
    );
  insert into integration.drs_case_identity_bindings (
    case_identity_binding_id, drs_case_id, casework_case_id,
    mapping_status, valid_from, valid_until
  ) values
    (
      '${MAPPING_A}', '${DRS_CASE_A}', '${CASE_A}', 'active',
      clock_timestamp() - interval '1 hour',
      clock_timestamp() + interval '1 day'
    ),
    (
      '${MAPPING_B}', '${DRS_CASE_B}', '${CASE_B}', 'active',
      clock_timestamp() - interval '1 hour',
      clock_timestamp() + interval '1 day'
    );
  insert into integration.drs_auth_specialist_bindings (
    binding_id, authenticated_user_id, specialist_id,
    selected_assignment_id, authorization_subject, binding_status,
    valid_from, valid_until
  ) values
    (
      '${BINDING_A}', '${USER_A}', '${SPECIALIST_A}', '${ASSIGNMENT_A}',
      '${SUBJECT_A}', 'active', clock_timestamp() - interval '1 hour',
      clock_timestamp() + interval '1 day'
    ),
    (
      '${BINDING_B}', '${USER_B}', '${SPECIALIST_B}', '${ASSIGNMENT_B}',
      'drs-specialist:${SPECIALIST_B}', 'active',
      clock_timestamp() - interval '1 hour',
      clock_timestamp() + interval '1 day'
    );
  commit;
`;

function serviceIssueSql(caseId = CASE_A) {
  return `
    begin;
    set local role service_role;
    select public.drs_workspace_grant_v2(
      '${USER_A}', '${caseId}', '${SUBJECT_A}'
    );
    commit;
  `;
}

function privateAssertSql(
  grant,
  prefix = "",
  {
    userId = USER_A,
    caseId = CASE_A,
    subject = SUBJECT_A,
  } = {},
) {
  return `
    ${prefix}
    select integration.drs_workspace_grant_assert_current_locked_v1(
      '${userId}', '${caseId}', '${subject}',
      '${grant.grant_id}', ${grant.grant_version}::bigint
    );
  `;
}

Deno.test({
  name:
    "real PostgreSQL: two users and two cases enforce current versioned DRS authority",
  ignore: !DATABASE_URL || !DISPOSABLE_CONFIRMED,
  async fn() {
    // The accepted prerequisite is a disposable local database with every
    // migration through this candidate already applied. It always removes its
    // fixed fixture IDs and must never point at shared or remote state.
    try {
      await psql(SETUP_SQL);

      const catalog = jsonFrom(
        await psql(`
        select jsonb_build_object(
          'table', to_regclass('integration.drs_workspace_grants')::text,
          'version_identity', a.attidentity,
          'version_type', format_type(a.atttypid, a.atttypmod),
          'rls', c.relrowsecurity,
          'force_rls', c.relforcerowsecurity,
          'issue_owner', pg_get_userbyid(issue.proowner),
          'issue_security_definer', issue.prosecdef,
          'issue_search_path', issue.proconfig,
          'assert_owner', pg_get_userbyid(assert_current.proowner),
          'assert_security_definer', assert_current.prosecdef,
          'assert_search_path', assert_current.proconfig,
          'guard_owner', pg_get_userbyid(guard.proowner),
          'guard_security_definer', guard.prosecdef,
          'guard_search_path', guard.proconfig,
          'guard_proacl', guard.proacl,
          'service_can_execute_guard', has_function_privilege(
            'service_role',
            'integration.drs_workspace_grant_enforce_immutable_v1()',
            'EXECUTE'
          ),
          'authenticated_can_execute_guard', has_function_privilege(
            'authenticated',
            'integration.drs_workspace_grant_enforce_immutable_v1()',
            'EXECUTE'
          ),
          'guard_trigger_enabled', exists (
            select 1
            from pg_trigger trigger_row
            where trigger_row.tgrelid = c.oid
              and trigger_row.tgname = 'drs_workspace_grants_enforce_immutable'
              and trigger_row.tgenabled = 'O'
              and not trigger_row.tgisinternal
          ),
          'wrapper_security_definer', wrapper.prosecdef,
          'proacl', issue.proacl,
          'service_can_issue', has_function_privilege(
            'service_role',
            'public.drs_workspace_grant_v2(uuid,uuid,text)', 'EXECUTE'
          ),
          'anon_can_issue', has_function_privilege(
            'anon', 'public.drs_workspace_grant_v2(uuid,uuid,text)', 'EXECUTE'
          ),
          'service_can_assert_private', has_function_privilege(
            'service_role',
            'integration.drs_workspace_grant_assert_current_locked_v1(uuid,uuid,text,uuid,bigint)',
            'EXECUTE'
          ),
          'service_can_select_table', has_table_privilege(
            'service_role', 'integration.drs_workspace_grants', 'SELECT'
          ),
          'authenticated_can_select_table', has_table_privilege(
            'authenticated', 'integration.drs_workspace_grants', 'SELECT'
          ),
          'service_can_use_version_sequence', has_sequence_privilege(
            'service_role',
            'integration.drs_workspace_grants_grant_version_seq', 'USAGE'
          ),
          'authenticated_can_use_version_sequence', has_sequence_privilege(
            'authenticated',
            'integration.drs_workspace_grants_grant_version_seq', 'USAGE'
          )
        )
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid
          and a.attname = 'grant_version'
        cross join pg_proc issue
        cross join pg_proc assert_current
        cross join pg_proc guard
        cross join pg_proc wrapper
        where n.nspname = 'integration'
          and c.relname = 'drs_workspace_grants'
          and issue.oid =
            'integration.drs_workspace_grant_issue_locked_v2(uuid,uuid,text)'::regprocedure
          and assert_current.oid =
            'integration.drs_workspace_grant_assert_current_locked_v1(uuid,uuid,text,uuid,bigint)'::regprocedure
          and guard.oid =
            'integration.drs_workspace_grant_enforce_immutable_v1()'::regprocedure
          and wrapper.oid =
            'public.drs_workspace_grant_v2(uuid,uuid,text)'::regprocedure;
      `),
      );
      assert.equal(catalog.table, "integration.drs_workspace_grants");
      assert.equal(catalog.version_identity, "a");
      assert.equal(catalog.version_type, "bigint");
      assert.equal(catalog.rls, true);
      assert.equal(catalog.force_rls, true);
      assert.equal(catalog.issue_owner, "postgres");
      assert.equal(catalog.issue_security_definer, true);
      assert.deepEqual(catalog.issue_search_path, ['search_path=""']);
      assert.equal(catalog.assert_owner, "postgres");
      assert.equal(catalog.assert_security_definer, true);
      assert.deepEqual(catalog.assert_search_path, ['search_path=""']);
      assert.equal(catalog.guard_owner, "postgres");
      assert.equal(catalog.guard_security_definer, true);
      assert.deepEqual(catalog.guard_search_path, ['search_path=""']);
      assert.ok(catalog.guard_proacl);
      assert.equal(catalog.service_can_execute_guard, false);
      assert.equal(catalog.authenticated_can_execute_guard, false);
      assert.equal(catalog.guard_trigger_enabled, true);
      assert.equal(catalog.wrapper_security_definer, false);
      assert.equal(catalog.service_can_issue, true);
      assert.equal(catalog.anon_can_issue, false);
      assert.equal(catalog.service_can_assert_private, false);
      assert.equal(catalog.service_can_select_table, false);
      assert.equal(catalog.authenticated_can_select_table, false);
      assert.equal(catalog.service_can_use_version_sequence, false);
      assert.equal(catalog.authenticated_can_use_version_sequence, false);
      assert.ok(catalog.proacl);

      const [first, second] = await Promise.all([
        psql(serviceIssueSql()),
        psql(serviceIssueSql()),
      ]);
      const grantA = jsonFrom(first);
      const grantB = jsonFrom(second);
      assert.equal(grantA.authorized, true);
      assert.equal(grantA.grant_id, grantB.grant_id);
      assert.equal(grantA.grant_version, grantB.grant_version);
      assert.match(grantA.grant_version, /^[1-9]\d*$/u);

      const current = jsonFrom(await psql(privateAssertSql(grantA)));
      assert.equal(current.authorized, true);

      // Required matrix: normal invalidation is the only allowed table UPDATE.
      const normalInvalidation = await psql(`
        begin;
        set local role postgres;
        update integration.drs_workspace_grants
          set invalidated_at = clock_timestamp(),
              invalidation_reason = 'DISPOSABLE_NORMAL_INVALIDATION'
          where grant_id = '${grantA.grant_id}';
        select count(*)
          from integration.drs_workspace_grants
          where grant_id = '${grantA.grant_id}'
            and invalidated_at is not null
            and invalidation_reason = 'DISPOSABLE_NORMAL_INVALIDATION';
        rollback;
      `);
      assert.equal(normalInvalidation, "1", "normal invalidation");

      // Required matrix: even postgres/the table owner cannot reactivate,
      // rewrite an invalidation, mutate immutable facts, or DELETE a grant.
      await assertMutationDenied(
        `begin;
         set local role postgres;
         update integration.drs_workspace_grants
           set invalidated_at = clock_timestamp(),
               invalidation_reason = 'DISPOSABLE_FIRST_INVALIDATION'
           where grant_id = '${grantA.grant_id}';
         update integration.drs_workspace_grants
           set invalidated_at = null, invalidation_reason = null
           where grant_id = '${grantA.grant_id}';
         rollback;`,
        "owner reactivation denial",
        /DRS_WORKSPACE_GRANT_ALREADY_INVALIDATED/u,
      );
      await assertMutationDenied(
        `begin;
         set local role postgres;
         update integration.drs_workspace_grants
           set invalidated_at = clock_timestamp(),
               invalidation_reason = 'DISPOSABLE_FIRST_INVALIDATION'
           where grant_id = '${grantA.grant_id}';
         update integration.drs_workspace_grants
           set invalidation_reason = 'DISPOSABLE_REWRITE'
           where grant_id = '${grantA.grant_id}';
         rollback;`,
        "invalidation rewrite denial",
        /DRS_WORKSPACE_GRANT_ALREADY_INVALIDATED/u,
      );
      await assertMutationDenied(
        `begin;
         set local role postgres;
         update integration.drs_workspace_grants
           set expires_at = expires_at - interval '1 second'
           where grant_id = '${grantA.grant_id}';
         rollback;`,
        "immutable fact mutation denial",
        /DRS_WORKSPACE_GRANT_IMMUTABLE_FACT_DENIED/u,
      );
      await assertMutationDenied(
        `begin;
         set local role postgres;
         delete from integration.drs_workspace_grants
           where grant_id = '${grantA.grant_id}';
         rollback;`,
        "DELETE denial",
        /DRS_WORKSPACE_GRANT_DELETE_DENIED/u,
      );

      // Required matrix: cross-case denial.
      assertDenied(
        jsonFrom(await psql(serviceIssueSql(CASE_B))),
        "cross-case denial",
      );

      // Required matrix: stale version denial.
      const stale = {
        ...grantA,
        grant_version: (BigInt(grantA.grant_version) + 1n).toString(),
      };
      assertDenied(
        jsonFrom(await psql(privateAssertSql(stale))),
        "stale version denial",
      );

      // Required matrix: grant expiry without mutating immutable issue facts.
      const expiredGrant = jsonFrom(
        await psql(`
          insert into integration.drs_workspace_grants (
            binding_id,
            authenticated_user_id,
            specialist_id,
            assignment_id,
            drs_case_id,
            casework_case_id,
            authorization_subject,
            issued_at,
            expires_at
          ) values (
            '${BINDING_B}',
            '${USER_B}',
            '${SPECIALIST_B}',
            '${ASSIGNMENT_B}',
            '${DRS_CASE_B}',
            '${CASE_B}',
            'drs-specialist:${SPECIALIST_B}',
            clock_timestamp() - interval '10 minutes',
            clock_timestamp() - interval '1 second'
          )
          returning jsonb_build_object(
            'grant_id', grant_id::text,
            'grant_version', grant_version::text
          );
        `),
      );
      assertDenied(
        jsonFrom(
          await psql(
            privateAssertSql(expiredGrant, "", {
              userId: USER_B,
              caseId: CASE_B,
              subject: `drs-specialist:${SPECIALIST_B}`,
            }),
          ),
        ),
        "grant expiry",
      );

      const scenarios = [
        [
          "specialist suspension",
          `update public.drs_specialists set authority_state = 'SUSPENDED'
             where specialist_id = '${SPECIALIST_A}';`,
        ],
        [
          "assignment termination",
          `insert into public.drs_case_specialist_assignment_terminations (
             termination_id, assignment_id, case_id, specialist_id,
             terminated_at, terminated_by, reason
           ) values (
             '${TERMINATION_A}', '${ASSIGNMENT_A}', '${DRS_CASE_A}',
             '${SPECIALIST_A}', clock_timestamp(), '${USER_A}',
             'Disposable authority regression'
           );`,
        ],
        [
          "case mapping revocation",
          `update integration.drs_case_identity_bindings
             set mapping_status = 'revoked', revoked_at = clock_timestamp()
             where case_identity_binding_id = '${MAPPING_A}';`,
        ],
        [
          "case closure",
          `update public.drs_cases
             set case_state = 'CLOSED', closed_at = clock_timestamp()
             where case_id = '${DRS_CASE_A}';`,
        ],
        [
          "casework closure",
          `update casework.cases set case_status = 'closed'
             where id = '${CASE_A}';`,
        ],
        [
          "binding revocation",
          `update integration.drs_auth_specialist_bindings
             set binding_status = 'revoked', revoked_at = clock_timestamp()
             where binding_id = '${BINDING_A}';`,
        ],
        [
          "Auth user ban",
          `update auth.users set banned_until = clock_timestamp() + interval '1 hour'
             where id = '${USER_A}';`,
        ],
      ];
      for (const [label, mutation] of scenarios) {
        const denied = jsonFrom(
          await psql(`
          begin;
          ${mutation}
          ${privateAssertSql(grantA)}
          rollback;
        `),
        );
        assertDenied(denied, label);
      }

      // Direct service/browser reads and the future private P2 assert remain
      // closed even though service_role may call the public issuer.
      for (
        const deniedSql of [
          `begin; set local role authenticated;
           select * from integration.drs_workspace_grants; rollback;`,
          `begin; set local role service_role;
           select * from integration.drs_workspace_grants; rollback;`,
          `begin; set local role service_role;
           ${privateAssertSql(grantA)} rollback;`,
        ]
      ) {
        const outcome = await runPsql(deniedSql);
        assert.equal(outcome.success, false);
        assert.match(
          new TextDecoder().decode(outcome.stderr),
          /permission denied/u,
        );
      }

      // Required matrix: concurrent issue convergence (proved above).
      // One-way invalidation survives source restoration and rotates to a
      // strictly greater database-owned version without reset or reuse.
      await psql(`
        begin;
        update integration.drs_auth_specialist_bindings
          set binding_status = 'suspended'
          where binding_id = '${BINDING_A}';
        update integration.drs_auth_specialist_bindings
          set binding_status = 'active'
          where binding_id = '${BINDING_A}';
        commit;
      `);
      const rotated = jsonFrom(await psql(serviceIssueSql()));
      assert.equal(rotated.authorized, true);
      assert.notEqual(rotated.grant_id, grantA.grant_id);
      assert.ok(BigInt(rotated.grant_version) > BigInt(grantA.grant_version));
    } finally {
      // Exact cleanup is mandatory; rollback is used inside each adversarial
      // scenario, and this final cleanup covers setup/commit paths.
      await psql(CLEANUP_SQL);
    }
  },
});
