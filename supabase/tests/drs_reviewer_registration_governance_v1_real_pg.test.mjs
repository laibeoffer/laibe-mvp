import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const psql = process.env.DRS_AUTH_S5_PSQL,
  port = process.env.DRS_AUTH_S5_PG_PORT;
const database = "laibe_registration_governance_s5_disposable";
const enabled = process.env.DRS_AUTH_S5_ALLOW_DISPOSABLE === "1";
const id = (n) =>
  n.toString(16).padStart(8, "0") + "-1111-4111-8111-111111111111";
const quote = (x) =>
  x === null ? "null" : "'" + String(x).replaceAll("'", "''") + "'";
test(
  "S5 real PostgreSQL operation authority, identity atomicity, audit, lock expiry and concurrency",
  { skip: !psql || !port || !enabled ? "REAL_PG_PENDING" : false },
  async () => {
    assert.equal(
      await realpath(psql),
      await realpath(
        fileURLToPath(
          new URL(
            "../../.codex-auth-r2/postgresql/bin/psql.exe",
            import.meta.url,
          ),
        ),
      ),
    );
    assert.match(port, /^\d{4,5}$/u);
    const args = [
      "--host=127.0.0.1",
      "--port=" + port,
      "--dbname=" + database,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--quiet",
      "--tuples-only",
    ];
    const execute = (sql) =>
      spawnSync(psql, args, {
        input: sql,
        encoding: "utf8",
        windowsHide: true,
        timeout: 15000,
      });
    const query = (sql) => {
      const r = execute(sql);
      assert.ifError(r.error);
      assert.equal(r.status, 0, r.stderr);
      return r.stdout.trim();
    };
    const json = (sql) => JSON.parse(query(sql));
    const migration = await readFile(
      new URL(
        "../migrations/20260908091859_drs_reviewer_registration_governance_v1.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const selfMigration = await readFile(
      new URL(
        "../migrations/20260908083101_drs_reviewer_self_application_v1.sql",
        import.meta.url,
      ),
      "utf8",
    );
    query(
      "do $guard$ begin if current_database()<>" + quote(database) +
        " or exists(select 1 from pg_namespace where nspname='auth') then raise exception 'Empty disposable target required';end if;end;$guard$;" +
        "create role anon nologin;create role authenticated nologin;create role service_role nologin;" +
        "create schema auth;create schema drs_forward_private;create schema casework;" +
        "create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);" +
        "create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users(id),not_after timestamptz);" +
        "create table drs_forward_private.specialists(specialist_id uuid primary key,specialist_status text not null default 'active' check(specialist_status in ('active','suspended','retired')),specialist_version bigint not null default 1 check(specialist_version>=1),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());" +
        "create table drs_forward_private.auth_specialist_bindings(auth_binding_id uuid primary key,authenticated_user_id uuid not null references auth.users(id) on delete restrict,specialist_id uuid not null references drs_forward_private.specialists(specialist_id) on delete restrict,binding_status text not null default 'active' check(binding_status in ('active','revoked')),binding_version bigint not null default 1 check(binding_version>=1),valid_from timestamptz not null default clock_timestamp(),valid_until timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(authenticated_user_id,specialist_id,auth_binding_id),check(valid_until>valid_from and (revoked_at is null or revoked_at>=valid_from) and ((binding_status='active' and revoked_at is null) or binding_status='revoked')));" +
        "create table casework.case_members(id integer);create table drs_forward_private.case_mappings(id integer);create table drs_forward_private.reviewer_case_authorities(id integer);create table drs_forward_private.server_sessions(id integer);" +
        "insert into casework.case_members values(1);insert into drs_forward_private.case_mappings values(1);insert into drs_forward_private.reviewer_case_authorities values(1);insert into drs_forward_private.server_sessions values(1);" +
        selfMigration + migration,
    );
    let sequence = 1, checks = 0;
    const check = (actual, expected, label) => {
      assert.deepEqual(actual, expected, label);
      checks++;
    };
    const future = () => new Date(Date.now() + 3600000).toISOString();
    const until = () => new Date(Date.now() + 86400000).toISOString();
    function actor(grant = true) {
      const user = id(sequence++),
        session = id(sequence++),
        grantId = id(sequence++);
      query(
        "insert into auth.users(id,email,email_confirmed_at) values(" +
          quote(user) +
          ",'operator@example.invalid',clock_timestamp());insert into auth.sessions(id,user_id) values(" +
          quote(session) + "," + quote(user) + ");" +
          (grant
            ? "insert into drs_forward_private.reviewer_registration_operation_grants(grant_id,actor_user_id,operation,scope,status,valid_from,valid_until,granted_by,authority_basis) values(" +
              [
                grantId,
                user,
                "reviewer_registration_decide",
                "reviewer_registration",
                "active",
              ].map(quote).join(",") +
              ",clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day'," +
              quote(user) + ",'synthetic controlled fixture');"
            : ""),
      );
      return { user, session, grantId };
    }
    function application(user = null) {
      if (!user) {
        user = id(sequence++);
        query(
          "insert into auth.users(id,email,email_confirmed_at) values(" +
            quote(user) + ",'applicant@example.invalid',clock_timestamp());",
        );
      }
      const applicationId = id(sequence++);
      query(
        "insert into drs_forward_private.reviewer_self_applications(application_id,user_id,display_name,organization,phone) values(" +
          quote(applicationId) + "," + quote(user) +
          ",'Synthetic applicant','','');",
      );
      return { user, applicationId };
    }
    const decisionArgs = (
      a,
      b,
      o = {},
    ) => [
      a.user,
      a.session,
      o.jwt ?? future(),
      b.applicationId,
      o.version ?? 1,
      o.outcome ?? "approve",
      o.reason ?? "Checked synthetic application",
      o.key ?? id(sequence++),
      Object.hasOwn(o, "until") ? o.until : until(),
    ];
    const decisionSql = (a, b, o = {}) =>
      "set role service_role;select public.drs_reviewer_registration_decision_v1(" +
      decisionArgs(a, b, o).map(quote).join(",") + ");reset role;";
    const decide = (a, b, o = {}) => json(decisionSql(a, b, o));
    const queue = (a, c = null, jwt = future()) =>
      json(
        "set role service_role;select public.drs_reviewer_registration_queue_v1(" +
          [
            a.user,
            a.session,
            jwt,
            c?.submittedAt ?? null,
            c?.applicationId ?? null,
          ].map(quote).join(",") + ");reset role;",
      );
    const counts = () =>
      json(
        "select jsonb_build_object('specialists',(select count(*) from drs_forward_private.specialists),'bindings',(select count(*) from drs_forward_private.auth_specialist_bindings),'decisions',(select count(*) from drs_forward_private.reviewer_registration_decisions));",
      );
    const appState = (b) =>
      json(
        "select jsonb_build_object('status',status,'version',version) from drs_forward_private.reviewer_self_applications where application_id=" +
          quote(b.applicationId),
      );
    const beforeCases = query(
      "select (select count(*) from casework.case_members),(select count(*) from drs_forward_private.case_mappings),(select count(*) from drs_forward_private.reviewer_case_authorities),(select count(*) from drs_forward_private.server_sessions);",
    );
    const noGrant = actor(false), admin = actor(), applicant = application();
    check(
      queue(noGrant).state,
      "REGISTRATION_OPERATION_NOT_AUTHORIZED",
      "No grant cannot enumerate",
    );
    check(
      decide(noGrant, applicant).state,
      "REGISTRATION_OPERATION_NOT_AUTHORIZED",
      "No grant cannot decide",
    );
    check(
      counts(),
      { specialists: 0, bindings: 0, decisions: 0 },
      "No grant causes zero writes",
    );
    check(
      execute(
        "insert into drs_forward_private.reviewer_registration_operation_grants(actor_user_id,operation,scope,status,valid_from,valid_until,granted_by,authority_basis) values(" +
          quote(noGrant.user) +
          ",'wrong','reviewer_registration','active',clock_timestamp(),clock_timestamp()+interval '1 day'," +
          quote(noGrant.user) + ",'fixture');",
      ).status === 0,
      false,
      "Wrong operation cannot be granted",
    );
    const self = application(admin.user);
    for (const outcome of ["approve", "reject"]) {
      check(
        decide(admin, self, {
          outcome,
          until: outcome === "reject" ? null : until(),
        }).state,
        "SELF_APPROVAL_NOT_ALLOWED",
        "Self decision forbidden",
      );
    }
    const key = id(sequence++),
      expiry = until(),
      first = decide(admin, applicant, { key, until: expiry });
    check(first.state, "REGISTRATION_DECIDED", "Approve committed");
    check(first.caseAccessGranted, false, "Never grants case access");
    check(first.qualification.effect, "granted", "First qualification only");
    const repeated = decide(admin, applicant, { key, until: expiry });
    check(
      { ...repeated, replayed: false },
      first,
      "Same payload receipt stable",
    );
    check(repeated.replayed, true, "Idempotency replay");
    check(
      decide(admin, applicant, { key, until: expiry, reason: "different" })
        .state,
      "IDEMPOTENCY_CONFLICT",
      "Same key cannot change payload",
    );
    check(
      counts(),
      { specialists: 1, bindings: 1, decisions: 1 },
      "Replay creates no extra identity",
    );
    const rejected = application();
    check(
      decide(admin, rejected, { outcome: "reject", until: null }).qualification,
      { effect: "not_granted", validUntil: null },
      "Reject has no qualification",
    );
    for (
      const invalid of [
        null,
        "infinity",
        new Date(Date.now() - 1000).toISOString(),
        new Date(Date.now() + 366 * 86400000).toISOString(),
      ]
    ) {
      const a = application();
      check(
        decide(admin, a, { until: invalid }).state,
        "INVALID_REQUEST",
        "Bounded explicit binding deadline",
      );
      check(
        appState(a).status,
        "pending",
        "Invalid deadline has no transition",
      );
    }
    for (
      const field of [
        "email=null",
        "email_confirmed_at=null",
        "deleted_at=clock_timestamp()",
        "banned_until=clock_timestamp()+interval '1 day'",
      ]
    ) {
      const a = application();
      query("update auth.users set " + field + " where id=" + quote(a.user));
      check(
        decide(admin, a).state,
        "APPLICANT_NOT_ELIGIBLE",
        "Confirmed active Auth identity required",
      );
    }
    for (
      const lifecycle of [
        "active",
        "revoked",
        "expired",
        "suspended",
        "retired",
      ]
    ) {
      const a = application(), sp = id(sequence++), binding = id(sequence++);
      query(
        "insert into drs_forward_private.specialists(specialist_id,specialist_status) values(" +
          quote(sp) + "," +
          quote(
            ["suspended", "retired"].includes(lifecycle) ? lifecycle : "active",
          ) + ");" +
          "insert into drs_forward_private.auth_specialist_bindings(auth_binding_id,authenticated_user_id,specialist_id,binding_status,valid_from,valid_until,revoked_at) values(" +
          [binding, a.user, sp, lifecycle === "revoked" ? "revoked" : "active"]
            .map(quote).join(",") +
          ",clock_timestamp()-interval '2 days',clock_timestamp()" +
          (lifecycle === "expired"
            ? "-interval '1 day'"
            : "+interval '1 day'") +
          "," + (lifecycle === "revoked" ? "clock_timestamp()" : "null") + ");",
      );
      const before = counts(),
        old = query(
          "select row_to_json(b) from drs_forward_private.auth_specialist_bindings b where auth_binding_id=" +
            quote(binding),
        );
      check(
        decide(admin, a).state,
        "EXISTING_IDENTITY_REQUIRES_REVIEW",
        "Existing lifecycle " + lifecycle + " never reactivated",
      );
      check(counts(), before, "Existing identity counts unchanged");
      check(
        query(
          "select row_to_json(b) from drs_forward_private.auth_specialist_bindings b where auth_binding_id=" +
            quote(binding),
        ),
        old,
        "Existing binding bytes unchanged",
      );
    }
    async function concurrent(sql) {
      const child = spawn(psql, args, {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let out = "", err = "";
      child.stdout.on("data", (x) => out += x);
      child.stderr.on("data", (x) => err += x);
      const done = new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on(
          "close",
          (code) =>
            code === 0 ? resolve(JSON.parse(out.trim())) : reject(Error(err)),
        );
      });
      child.stdin.end(sql);
      return await done;
    }
    const contested = application(), other = actor();
    const race = await Promise.all([
      concurrent(decisionSql(admin, contested)),
      concurrent(
        decisionSql(other, contested, { outcome: "reject", until: null }),
      ),
    ]);
    check(race.map((x) => x.state).sort(), [
      "APPLICATION_CONFLICT",
      "REGISTRATION_DECIDED",
    ], "Concurrent approvals/rejections commit once");
    async function locked(sql, action) {
      const child = spawn(psql, args, {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let out = "", err = "";
      const done = new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on(
          "close",
          (code) => code === 0 ? resolve() : reject(Error(err)),
        );
      });
      const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Lock readiness timeout")),
          10000,
        );
        child.stdout.on("data", (x) => {
          out += x;
          if (out.includes("S5_LOCK_HELD")) {
            clearTimeout(timer);
            resolve();
          }
        });
        child.stderr.on("data", (x) => err += x);
        child.on("error", reject);
      });
      child.stdin.end(
        "begin;" + sql + "\n\\echo S5_LOCK_HELD\nselect pg_sleep(2);commit;",
      );
      await ready;
      try {
        return await action();
      } finally {
        await done;
      }
    }
    for (
      const mode of [
        "jwt",
        "grantExpired",
        "grantRevoked",
        "sessionExpired",
        "sessionDeleted",
        "applicantLock",
      ]
    ) {
      const a = actor(), b = application(), before = counts();
      let lock =
        "select grant_id from drs_forward_private.reviewer_registration_operation_grants where grant_id=" +
        quote(a.grantId) + " for update;";
      if (mode === "grantExpired") {
        lock +=
          "update drs_forward_private.reviewer_registration_operation_grants set version=version+1,valid_until=clock_timestamp()+interval '1 second' where grant_id=" +
          quote(a.grantId) + ";";
      }
      if (mode === "grantRevoked") {
        lock +=
          "update drs_forward_private.reviewer_registration_operation_grants set version=version+1,status='revoked',revoked_at=clock_timestamp() where grant_id=" +
          quote(a.grantId) + ";";
      }
      if (mode === "sessionExpired") {
        lock +=
          "update auth.sessions set not_after=clock_timestamp()+interval '1 second' where id=" +
          quote(a.session) + ";";
      }
      if (mode === "sessionDeleted") {
        lock += "delete from auth.sessions where id=" + quote(a.session) + ";";
      }
      if (mode === "applicantLock") {
        lock = "select id from auth.users where id=" + quote(b.user) +
          " for update;";
      }
      const result = await locked(
        lock,
        () =>
          decide(a, b, {
            jwt: ["jwt", "applicantLock"].includes(mode)
              ? new Date(Date.now() + 1000).toISOString()
              : future(),
          }),
      );
      check(
        result.state,
        ["grantExpired", "grantRevoked"].includes(mode)
          ? "REGISTRATION_OPERATION_NOT_AUTHORIZED"
          : "AUTH_REQUIRED",
        "Fresh after locks: " + mode,
      );
      check(counts(), before, "No partial identity after " + mode);
      check(appState(b).status, "pending", "No decision after " + mode);
    }

    const idemActor = actor(),
      idemApp = application(),
      idemKey = id(sequence++),
      idemUntil = until(),
      beforeIdem = counts();
    const idemRace = await Promise.all([
      concurrent(
        decisionSql(idemActor, idemApp, { key: idemKey, until: idemUntil }),
      ),
      concurrent(
        decisionSql(idemActor, idemApp, { key: idemKey, until: idemUntil }),
      ),
    ]);
    check(
      idemRace.map((x) => x.replayed).sort(),
      [false, true],
      "Concurrent idempotency returns one creation and one replay",
    );
    check(
      idemRace[0].decision.decisionId,
      idemRace[1].decision.decisionId,
      "Concurrent idempotency receipt stable",
    );
    check(counts(), {
      specialists: beforeIdem.specialists + 1,
      bindings: beforeIdem.bindings + 1,
      decisions: beforeIdem.decisions + 1,
    }, "Concurrent idempotency creates one identity");
    query(
      "update drs_forward_private.reviewer_registration_operation_grants set status='revoked',revoked_at=clock_timestamp(),version=version+1 where grant_id=" +
        quote(idemActor.grantId),
    );
    check(
      decide(idemActor, idemApp, { key: idemKey, until: idemUntil }).state,
      "REGISTRATION_OPERATION_NOT_AUTHORIZED",
      "Replay cannot bypass current operation revocation",
    );
    const futureActor = actor(),
      futureApp = application(),
      beforeFuture = counts();
    query(
      "update drs_forward_private.reviewer_registration_operation_grants set valid_from=clock_timestamp()+interval '1 hour',version=version+1 where grant_id=" +
        quote(futureActor.grantId),
    );
    check(
      queue(futureActor).state,
      "REGISTRATION_OPERATION_NOT_AUTHORIZED",
      "Future operation grant cannot list",
    );
    check(
      decide(futureActor, futureApp).state,
      "REGISTRATION_OPERATION_NOT_AUTHORIZED",
      "Future operation grant cannot decide",
    );
    const wrongSession = { ...admin, session: noGrant.session };
    check(
      decide(wrongSession, futureApp).state,
      "AUTH_REQUIRED",
      "Session/user pairing is exact inside SQL",
    );
    check(
      counts(),
      beforeFuture,
      "Future grant and wrong session create nothing",
    );
    const qa = actor();
    check(
      (await locked(
        "update drs_forward_private.reviewer_registration_operation_grants set version=version+1,status='revoked',revoked_at=clock_timestamp() where grant_id=" +
          quote(qa.grantId) + ";",
        () => queue(qa),
      )).state,
      "REGISTRATION_OPERATION_NOT_AUTHORIZED",
      "Queue checks grant revocation after lock",
    );
    const failApp = application(), beforeFailure = counts();
    query(
      "create function drs_forward_private.synthetic_fail_decision() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure';end;$$;create trigger synthetic_fail_decision before insert on drs_forward_private.reviewer_registration_decisions for each row execute function drs_forward_private.synthetic_fail_decision();",
    );
    check(
      execute(decisionSql(admin, failApp)).status === 0,
      false,
      "Late audit failure propagates",
    );
    query(
      "drop trigger synthetic_fail_decision on drs_forward_private.reviewer_registration_decisions;drop function drs_forward_private.synthetic_fail_decision();",
    );
    check(
      counts(),
      beforeFailure,
      "Late audit failure rolls back specialist and binding",
    );
    check(appState(failApp).status, "pending", "Application rollback too");
    for (
      const table of [
        "reviewer_registration_operation_grants",
        "reviewer_registration_decisions",
        "operation_grant_events",
      ]
    ) {
      check(
        query(
          "select relrowsecurity and relforcerowsecurity from pg_class where oid=" +
            quote("drs_forward_private." + table) + "::regclass",
        ),
        "t",
        "Forced RLS " + table,
      );
      for (const role of ["anon", "authenticated", "service_role"]) {
        check(
          query(
            "select has_table_privilege(" + quote(role) + "," +
              quote("drs_forward_private." + table) +
              ",'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')",
          ),
          "f",
          "No direct table privilege " + role,
        );
      }
    }
    for (
      const table of [
        "reviewer_registration_decisions",
        "operation_grant_events",
      ]
    ) {
      for (
        const command of [
          "update drs_forward_private." + table + " set " +
          (table === "operation_grant_events"
            ? "recorded_at=recorded_at"
            : "reason=reason"),
          "delete from drs_forward_private." + table,
          "truncate drs_forward_private." + table,
        ]
      ) {
        check(
          execute(command).status === 0,
          false,
          "Append-only history " + table,
        );
      }
    }
    check(
      query(
        "select count(*)>0 from drs_forward_private.operation_grant_events where event_type='revoked'",
      ),
      "t",
      "Grant revoke audit exists",
    );
    check(
      query(
        "select bool_and(actor_auth_session_id is not null and operation_grant_version>=1 and payload_digest ~ '^[0-9a-f]{64}$' and application_after_version=application_before_version+1) from drs_forward_private.reviewer_registration_decisions",
      ),
      "t",
      "Decision audit complete",
    );
    check(
      query(
        "select (select count(*) from casework.case_members),(select count(*) from drs_forward_private.case_mappings),(select count(*) from drs_forward_private.reviewer_case_authorities),(select count(*) from drs_forward_private.server_sessions);",
      ),
      beforeCases,
      "All four case/session tables unchanged",
    );
    for (let n = 0; n < 10; n++) application();
    const firstPage = queue(admin);
    check(firstPage.applications.length, 25, "Fixed page bound");
    assert(firstPage.nextCursor);
    const secondPage = queue(admin, firstPage.nextCursor);
    check(
      firstPage.applications.some((x) =>
        secondPage.applications.some((y) => x.applicationId === y.applicationId)
      ),
      false,
      "Stable keyset no overlap",
    );
    for (const role of ["anon", "authenticated"]) {
      check(
        execute(
          "set role " + role +
            ";select public.drs_reviewer_registration_queue_v1(" +
            [admin.user, admin.session, future(), null, null].map(quote).join(
              ",",
            ) + ");",
        ).status === 0,
        false,
        "RPC execute closed " + role,
      );
    }
    console.log(
      JSON.stringify({
        syntheticAssertions: checks,
        caseTableDelta: [0, 0, 0, 0],
        realSupabaseAuth: false,
      }),
    );
  },
);
