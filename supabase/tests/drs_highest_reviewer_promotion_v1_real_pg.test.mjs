import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

const database = "laibe_highest_reviewer_promotion_disposable";
const marker = "drs-highest-reviewer-promotion-v1-disposable";
const schema = "laibe.drs-highest-reviewer-governance.v1";
const privateSchema = "drs_forward_private";
const grants = `${privateSchema}.reviewer_registration_operation_grants`;
const owners = `${privateSchema}.governance_owner_grants`;
const decisions = `${privateSchema}.highest_reviewer_role_decisions`;
const bindings = `${privateSchema}.auth_specialist_bindings`;
const quote = (value) => value == null ? "null" : "'" + String(value).replaceAll("'", "''") + "'";
const future = () => new Date(Date.now() + 3_600_000).toISOString();
const migrationRoot = new URL("../migrations/", import.meta.url);
const suffixes = ["identity_expand_v1", "legacy_reconciliation_v1", "promotion_enforce_v1"];

test("highest reviewer authority on a task-owned real PostgreSQL database", { timeout: 240_000 }, async (t) => {
  const harness = await openDatabase();
  t.after(() => { harness.close(); t.diagnostic("DISPOSABLE_FIXTURE_CLEANUP_CONFIRMED"); });
  const { query, execute, json } = harness;
  const selfMigration = await readFile(new URL("20260908083101_drs_reviewer_self_application_v1.sql", migrationRoot), "utf8");
  const governanceMigration = await readFile(new URL("20260908091859_drs_reviewer_registration_governance_v1.sql", migrationRoot), "utf8");
  const foundation = () => query(dependencyFixture + selfMigration + governanceMigration);

  await t.test("harness identity, minimal tracked dependencies and pgcrypto are usable before feature detection", () => {
    foundation();
    assert.equal(query("select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto'"), "extensions");
    assert.equal(query(`select count(*) from ${grants}`), "0");
    assert.equal(query("select count(*) from auth.sessions"), "0");
    assert.equal(query("select has_function_privilege('service_role','public.drs_reviewer_registration_queue_v1(uuid,uuid,timestamptz,timestamptz,uuid)','EXECUTE')"), "t");
    t.diagnostic("REAL_PG_FOUNDATION_READY: " + query("select version()"));
  });

  const files = await readdir(migrationRoot);
  const matches = suffixes.map((suffix) => files.filter((name) => name.endsWith(`_drs_highest_reviewer_${suffix}.sql`)));
  assert.deepEqual(matches.map((found) => found.length), [1, 1, 1],
    `MISSING_ORDERED_HIGHEST_REVIEWER_MIGRATIONS: ${suffixes.filter((_, i) => matches[i].length !== 1).join(", ")}; real PostgreSQL and existing governance fixture succeeded`);
  const names = matches.map(([name]) => name);
  assert.deepEqual(names, [...names].sort(), "expand -> reconciliation gate -> enforce must be lexical migration order");
  const migrations = await Promise.all(names.map((name) => readFile(new URL(name, migrationRoot), "utf8")));
  query(migrations.join("\n"));
  const reset = () => { harness.reset(); foundation(); };
  const initialDeadlocks = query("select deadlocks from pg_stat_database where datname=current_database()");
  const runAsService = (sql) => `set role service_role;${sql};reset role;`;
  const candidatesSql = (actor, cursor = null) => `select public.drs_highest_reviewer_candidates_v1(${[
    actor.user, actor.session, actor.expiry ?? future(), cursor?.sortKey ?? null, cursor?.candidateKey ?? null,
  ].map(quote).join(",")})`;
  const candidates = (actor, cursor) => json(runAsService(candidatesSql(actor, cursor)));
  const decisionSql = (actor, subject, options = {}) => `select public.drs_highest_reviewer_role_decision_v1(${[
    actor.user, actor.session, actor.expiry ?? future(), subject.authBindingId, subject.bindingVersion,
    subject.grantId ?? null, subject.expectedGrantVersion ?? null, options.decision ?? "grant",
    options.reason ?? "Synthetic reviewed qualification", options.key ?? randomUUID(),
  ].map(quote).join(",")})`;
  const decide = (actor, subject, options) => json(runAsService(decisionSql(actor, subject, options)));
  const denied = (result, state) => assert.deepEqual(result, { schemaVersion: schema, state });
  const receipt = (result, state = "HIGHEST_REVIEWER_GRANTED") => {
    assert.equal(result.schemaVersion, schema);
    assert.equal(result.state, state);
    assert.equal(result.caseAccessChanged, false);
    assert.equal(result.decision.outcome, state === "HIGHEST_REVIEWER_GRANTED" ? "grant" : "revoke");
    assert.ok(Number.isFinite(Date.parse(result.decision.decidedAt)));
    assert.match(result.decision.decisionId, /^[0-9a-f-]{36}$/u);
    return result;
  };
  const subjectOf = (result) => ({ ...result.subject, expectedGrantVersion: result.subject.grantVersion });
  const stateOf = (user) => json(`select to_jsonb(g) from ${grants} g where actor_user_id=${quote(user)}`);
  const snapshot = () => query(`select jsonb_build_object(
    'members',(select jsonb_agg(to_jsonb(m) order by id) from casework.case_members m),
    'assignments',(select jsonb_agg(to_jsonb(a) order by id) from ${privateSchema}.reviewer_case_authorities a),
    'mappings',(select jsonb_agg(to_jsonb(m) order by id) from ${privateSchema}.case_mappings m),
    'sessions',(select jsonb_agg(to_jsonb(s) order by id) from ${privateSchema}.server_sessions s))::text`);
  function user() {
    const result = { user: randomUUID(), session: randomUUID() };
    query(`insert into auth.users(id,email,email_confirmed_at) values(${quote(result.user)},${quote(result.user + "@example.invalid")},clock_timestamp());
      insert into auth.sessions(id,user_id,not_after) values(${quote(result.session)},${quote(result.user)},clock_timestamp()+interval '1 day');`);
    return result;
  }
  function reviewer(existing = user()) {
    const result = { ...existing, specialist: randomUUID(), authBindingId: randomUUID(), bindingVersion: 1, grantId: null, expectedGrantVersion: null };
    query(`insert into ${privateSchema}.specialists(specialist_id) values(${quote(result.specialist)});
      insert into ${bindings}(auth_binding_id,authenticated_user_id,specialist_id,valid_from,valid_until)
      values(${quote(result.authBindingId)},${quote(result.user)},${quote(result.specialist)},clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days');
      insert into ${privateSchema}.reviewer_self_applications(user_id,display_name,organization,phone,status)
      values(${quote(result.user)},'Synthetic reviewer','','','approved') on conflict(user_id) do nothing;`);
    return result;
  }
  function owner(existing = user()) {
    const result = { ...existing, ownerGrant: randomUUID() };
    query(`insert into ${owners}(owner_grant_id,owner_user_id,status,version,valid_from,valid_until,provisioned_by,authority_basis)
      values(${quote(result.ownerGrant)},${quote(result.user)},'active',1,clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days',${quote(result.user)},'Synthetic database-admin fixture');`);
    return result;
  }
  const governanceSnapshotSql = "select jsonb_build_object(" + [
    grants, owners, `${privateSchema}.governance_owner_grant_events`,
    `${privateSchema}.operation_grant_events`, decisions,
  ].map((table) => `${quote(table)},(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from ${table} r)`).join(",") + ")";
  const inChange = (change, sql) => {
    const rows = query(`begin;${change};${governanceSnapshotSql};${runAsService(sql)}${governanceSnapshotSql};rollback;`)
      .split(/\r?\n/u).filter(Boolean).map((row) => JSON.parse(row));
    assert.equal(rows.length, 3, "transaction must return before state, RPC result and pre-rollback after state");
    assert.deepEqual(rows[2], rows[0], "rejected RPC cannot write grants, owner grants or any governance audit before rollback");
    return rows[1];
  };
  const admin = owner();
  const caseReviewerOne = reviewer(), caseReviewerTwo = reviewer();
  for (const [index, actor] of [caseReviewerOne, caseReviewerTwo].entries()) {
    const caseId = randomUUID(), rowId = index + 2;
    query(`insert into casework.case_members values(${rowId},${quote(caseId)},${quote(actor.user)},'reviewer');
      insert into ${privateSchema}.reviewer_case_authorities values(${rowId},${quote(caseId)},${quote(actor.specialist)},'{"read":true,"edit":false}');
      insert into ${privateSchema}.case_mappings values(${rowId},${quote(caseId)},jsonb_build_object('subjectUserId',${quote(actor.user)},'specialistId',${quote(actor.specialist)}));
      insert into ${privateSchema}.server_sessions values(${rowId},${quote(caseId)},'existing reviewer case scope');`);
  }
  const caseBefore = snapshot();

  await t.test("validated reviewer identity shapes, force RLS and least-privilege RPC/table boundary", () => {
    const columns = json(`select jsonb_object_agg(column_name,is_nullable) from information_schema.columns where table_schema='${privateSchema}' and table_name='reviewer_registration_operation_grants' and column_name in ('specialist_id','auth_binding_id','auth_binding_version','legacy_identity_unresolved')`);
    assert.deepEqual(columns, { specialist_id: "YES", auth_binding_id: "YES", auth_binding_version: "YES", legacy_identity_unresolved: "NO" });
    assert.equal(query(`select count(*) from pg_constraint where conrelid='${grants}'::regclass and contype='c' and convalidated and pg_get_constraintdef(oid) like '%legacy_identity_unresolved%'`), "1");
    const tables = [grants, owners, `${privateSchema}.governance_owner_grant_events`, `${privateSchema}.operation_grant_events`, decisions];
    for (const table of tables) {
      assert.equal(query(`select relrowsecurity and relforcerowsecurity from pg_class where oid='${table}'::regclass`), "t", table);
      assert.equal(query(`select count(*) from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='${table}'::regclass and a.grantee=0`), "0", "PUBLIC table grant");
      for (const role of ["anon", "authenticated", "service_role"]) {
        assert.equal(query(`select has_table_privilege('${role}','${table}','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')`), "f", role + " direct table access");
        const blocked = execute(`set role ${role};delete from ${table} where false;`);
        assert.notEqual(blocked.status, 0);
        assert.match(blocked.stderr, /permission denied/iu);
      }
    }
    for (const name of ["drs_highest_reviewer_candidates_v1", "drs_highest_reviewer_role_decision_v1"]) {
      const catalog = json(`select jsonb_build_object('definer',prosecdef,'config',proconfig,'publicExecute',exists(select 1 from aclexplode(coalesce(proacl,acldefault('f',proowner))) a where a.grantee=0 and privilege_type='EXECUTE')) from pg_proc where pronamespace='public'::regnamespace and proname='${name}'`);
      assert.equal(catalog.definer, true);
      assert.ok(catalog.config.some((value) => /^search_path=(""|)$/u.test(value)));
      assert.equal(catalog.publicExecute, false);
      for (const role of ["anon", "authenticated", "service_role"]) {
        assert.equal(query(`select has_function_privilege('${role}',oid,'EXECUTE') from pg_proc where pronamespace='public'::regnamespace and proname='${name}'`), role === "service_role" ? "t" : "f");
      }
    }
    assert.equal(query(`select count(*) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p','v','m','f')`), "0", "no public owner table or view path");
    assert.equal(query(`select count(*) from pg_proc where pronamespace='public'::regnamespace and prosrc ~* '(insert[[:space:]]+into|update)[[:space:]]+(drs_forward_private[.])?governance_owner_grants'`), "0", "no public owner creation RPC");
    const noOwner = user();
    denied(candidates(noOwner), "GOVERNANCE_OWNER_NOT_AUTHORIZED");
    assert.equal(query(`select count(*) from ${owners} where owner_user_id=${quote(noOwner.user)}`), "0");
  });

  await t.test("live owner can enumerate; every owner/session denial also rejects decisions without writes", () => {
    const target = reviewer();
    assert.equal(candidates(admin).state, "HIGHEST_REVIEWER_CANDIDATES_READY");
    assert.ok(candidates(admin).candidates.some((candidate) => candidate.subject.authBindingId === target.authBindingId));
    const cases = [
      ["revoked grant", `update ${owners} set status='revoked',revoked_at=clock_timestamp(),version=version+1 where owner_grant_id=${quote(admin.ownerGrant)}`, "GOVERNANCE_OWNER_NOT_AUTHORIZED"],
      ["expired grant", `update ${owners} set valid_until=clock_timestamp()-interval '1 second',version=version+1 where owner_grant_id=${quote(admin.ownerGrant)}`, "GOVERNANCE_OWNER_NOT_AUTHORIZED"],
      ["future grant", `update ${owners} set valid_from=clock_timestamp()+interval '1 day',version=version+1 where owner_grant_id=${quote(admin.ownerGrant)}`, "GOVERNANCE_OWNER_NOT_AUTHORIZED"],
      ["deleted owner", `update auth.users set deleted_at=clock_timestamp() where id=${quote(admin.user)}`, "AUTH_REQUIRED"],
      ["suspended owner", `update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=${quote(admin.user)}`, "AUTH_REQUIRED"],
      ["unconfirmed owner", `update auth.users set email_confirmed_at=null where id=${quote(admin.user)}`, "AUTH_REQUIRED"],
      ["expired session", `update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${quote(admin.session)}`, "AUTH_REQUIRED"],
      ["deleted session", `delete from auth.sessions where id=${quote(admin.session)}`, "AUTH_REQUIRED"],
      ["mismatched session", `update auth.sessions set user_id=${quote(target.user)} where id=${quote(admin.session)}`, "AUTH_REQUIRED"],
    ];
    const before = query(`select count(*) from ${decisions}`);
    for (const [label, change, state] of cases) {
      denied(inChange(change, candidatesSql(admin)), state);
      denied(inChange(change, decisionSql(admin, target)), state);
      assert.equal(query(`select count(*) from ${decisions}`), before, label);
    }
    const absent = user();
    denied(candidates(absent), "GOVERNANCE_OWNER_NOT_AUTHORIZED");
    denied(decide(absent, target), "GOVERNANCE_OWNER_NOT_AUTHORIZED");
    denied(candidates({ ...admin, expiry: new Date(0).toISOString() }), "AUTH_REQUIRED");
    denied(decide({ ...admin, expiry: new Date(0).toISOString() }, target), "AUTH_REQUIRED");
  });

  await t.test("reviewer-first rejects Email/Auth/application-only and every invalid live identity", () => {
    const authOnly = user();
    for (const kind of ["email-only", "auth-only", "pending"]) {
      if (kind === "pending") query(`insert into ${privateSchema}.reviewer_self_applications(user_id,display_name,organization,phone) values(${quote(authOnly.user)},'Pending synthetic','','')`);
      denied(decide(admin, { authBindingId: randomUUID(), bindingVersion: 1 }), "REVIEWER_QUALIFICATION_CONFLICT");
      assert.ok(!candidates(admin).candidates.some((candidate) => candidate.accountEmail === authOnly.user + "@example.invalid"));
    }
    const target = reviewer();
    const other = reviewer();
    const invalid = [
      `update auth.users set deleted_at=clock_timestamp() where id=${quote(target.user)}`,
      `update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=${quote(target.user)}`,
      `update auth.users set email_confirmed_at=null where id=${quote(target.user)}`,
      `update ${privateSchema}.specialists set specialist_status='suspended' where specialist_id=${quote(target.specialist)}`,
      `update ${bindings} set binding_status='revoked',revoked_at=clock_timestamp() where auth_binding_id=${quote(target.authBindingId)}`,
      `update ${bindings} set valid_until=clock_timestamp()-interval '1 second' where auth_binding_id=${quote(target.authBindingId)}`,
      `update ${bindings} set valid_from=clock_timestamp()+interval '1 day' where auth_binding_id=${quote(target.authBindingId)}`,
    ];
    for (const change of invalid) denied(inChange(change, decisionSql(admin, target)), "REVIEWER_QUALIFICATION_CONFLICT");
    const granted = receipt(decide(admin, target));
    const forged = execute(`begin;update ${grants} set specialist_id=${quote(other.specialist)},version=version+1 where grant_id=${quote(granted.subject.grantId)};rollback;`);
    assert.notEqual(forged.status, 0, "a different specialist cannot be stored against this actor/binding");
    assert.match(forged.stderr, /foreign key|identity|constraint/iu);
    const forgedUser = execute(`begin;update ${grants} set auth_binding_id=${quote(other.authBindingId)},specialist_id=${quote(other.specialist)},version=version+1 where grant_id=${quote(granted.subject.grantId)};rollback;`);
    assert.notEqual(forgedUser.status, 0, "binding belongs to another Auth user");
    assert.match(forgedUser.stderr, /foreign key|identity|constraint/iu);
  });

  await t.test("eligible owner self-grant requires a reason, writes immutable audit and never changes case access", () => {
    const eligible = owner(reviewer());
    for (const reason of ["", "   ", "x".repeat(501)]) denied(decide(eligible, eligible, { reason }), "INVALID_REQUEST");
    const result = receipt(decide(eligible, eligible, { reason: "  Owner reviewer self-grant  " }));
    assert.equal(query(`select reason from ${decisions} where decision_id=${quote(result.decision.decisionId)}`), "Owner reviewer self-grant");
    assert.equal(query(`select count(*) from ${privateSchema}.operation_grant_events where grant_id=${quote(result.subject.grantId)}`), "1");
    denied(inChange(`update ${bindings} set binding_status='revoked',revoked_at=clock_timestamp() where auth_binding_id=${quote(eligible.authBindingId)}`,
      decisionSql(eligible, subjectOf(result))), "REVIEWER_QUALIFICATION_CONFLICT");
    denied(decide(admin, { authBindingId: randomUUID(), bindingVersion: 1 }), "REVIEWER_QUALIFICATION_CONFLICT");
    assert.equal(snapshot(), caseBefore);
  });

  await t.test("stored reviewer identity and binding version are checked on every registration authority use", () => {
    const target = reviewer();
    const result = receipt(decide(admin, target));
    const actorSql = `select coalesce(${privateSchema}.registration_actor_check_v1(${[target.user, target.session, future(), result.subject.grantId].map(quote).join(",")}), 'AUTHORIZED')`;
    assert.equal(query(actorSql), "AUTHORIZED");
    const invalid = [
      `update auth.users set deleted_at=clock_timestamp() where id=${quote(target.user)}`,
      `update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=${quote(target.user)}`,
      `update auth.users set email_confirmed_at=null where id=${quote(target.user)}`,
      `update ${privateSchema}.specialists set specialist_status='retired' where specialist_id=${quote(target.specialist)}`,
      `update ${bindings} set binding_status='revoked',revoked_at=clock_timestamp() where auth_binding_id=${quote(target.authBindingId)}`,
      `update ${bindings} set valid_until=clock_timestamp()-interval '1 second' where auth_binding_id=${quote(target.authBindingId)}`,
      `update ${bindings} set binding_version=binding_version+1 where auth_binding_id=${quote(target.authBindingId)}`,
    ];
    for (const change of invalid) {
      assert.notEqual(query(`begin;${change};${actorSql};rollback;`), "AUTHORIZED");
      const queue = inChange(change, `select public.drs_reviewer_registration_queue_v1(${[target.user, target.session, future()].map(quote).join(",")})`);
      assert.ok(["AUTH_REQUIRED", "REGISTRATION_OPERATION_NOT_AUTHORIZED"].includes(queue.state));
    }
    const alternate = randomUUID();
    query(`update ${bindings} set binding_status='revoked',revoked_at=clock_timestamp() where auth_binding_id=${quote(target.authBindingId)};
      insert into ${bindings}(auth_binding_id,authenticated_user_id,specialist_id,valid_from,valid_until) values(${quote(alternate)},${quote(target.user)},${quote(target.specialist)},clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day');`);
    assert.notEqual(query(actorSql), "AUTHORIZED", "a replacement active binding cannot silently repair stored identity");
  });

  await t.test("multiple seats are independent and a repeat active grant cannot extend expiration", () => {
    const one = caseReviewerOne, two = caseReviewerTwo;
    const first = receipt(decide(admin, one));
    assert.equal(snapshot(), caseBefore, "first reviewer grant preserves both reviewers' existing case rows");
    assert.equal(Date.parse(first.governanceGrant.validUntil), Date.parse(query(`select valid_until from ${bindings} where auth_binding_id=${quote(one.authBindingId)}`)));
    const firstRow = stateOf(one.user);
    const second = receipt(decide(admin, two));
    assert.equal(snapshot(), caseBefore, "second reviewer grant preserves both reviewers' existing case rows");
    assert.deepEqual(stateOf(one.user), firstRow, "second seat leaves the first row unchanged");
    const secondRow = stateOf(two.user);
    assert.equal(query(`select count(*) from ${grants} where actor_user_id in (${quote(one.user)},${quote(two.user)}) and status='active'`), "2");
    receipt(decide(admin, subjectOf(first)));
    assert.deepEqual(stateOf(one.user), firstRow, "active repeat is not a renewal or second grant");
    assert.equal(snapshot(), caseBefore, "active repeat preserves both reviewers' existing case rows");
    const revoked = receipt(decide(admin, subjectOf(first), { decision: "revoke" }), "HIGHEST_REVIEWER_REVOKED");
    assert.deepEqual(stateOf(two.user), secondRow);
    assert.equal(snapshot(), caseBefore, "revoke preserves both reviewers' existing case rows");
    const regranted = receipt(decide(admin, subjectOf(revoked)));
    assert.deepEqual(stateOf(two.user), secondRow);
    assert.equal(snapshot(), caseBefore, "regrant preserves both reviewers' existing case rows");
    receipt(decide(admin, subjectOf(regranted), { decision: "revoke" }), "HIGHEST_REVIEWER_REVOKED");
    assert.deepEqual(stateOf(two.user), secondRow);
    assert.equal(second.subject.grantVersion, 1);
    assert.equal(snapshot(), caseBefore, "case membership and assignment bytes stay unchanged");
  });

  await t.test("first grant, regrant and revoke enforce the relevant identity and expected versions", () => {
    const target = reviewer();
    denied(decide(admin, { ...target, expectedGrantVersion: 1 }), "INVALID_REQUEST");
    denied(decide(admin, { ...target, grantId: randomUUID() }), "INVALID_REQUEST");
    denied(decide(admin, { ...target, bindingVersion: 2 }), "REVIEWER_QUALIFICATION_CONFLICT");
    const first = receipt(decide(admin, target));
    denied(decide(admin, target), "HIGHEST_REVIEWER_GRANT_CONFLICT");
    denied(decide(admin, { ...subjectOf(first), expectedGrantVersion: 0 }, { decision: "revoke" }), "HIGHEST_REVIEWER_GRANT_CONFLICT");
    const revoked = receipt(decide(admin, subjectOf(first), { decision: "revoke" }), "HIGHEST_REVIEWER_REVOKED");
    query(`update ${bindings} set binding_version=2 where auth_binding_id=${quote(target.authBindingId)}`);
    denied(decide(admin, subjectOf(revoked)), "REVIEWER_QUALIFICATION_CONFLICT");
    const regranted = receipt(decide(admin, { ...subjectOf(revoked), bindingVersion: 2 }));
    assert.equal(regranted.subject.grantId, first.subject.grantId);
    assert.ok(regranted.subject.grantVersion > revoked.subject.grantVersion);
    for (const mode of ["revoked", "expired", "replaced"]) {
      const candidate = reviewer();
      const granted = receipt(decide(admin, candidate));
      query(mode === "expired"
        ? `update ${bindings} set valid_until=clock_timestamp()-interval '1 second' where auth_binding_id=${quote(candidate.authBindingId)}`
        : `update ${bindings} set binding_status='revoked',revoked_at=clock_timestamp(),binding_version=binding_version+1 where auth_binding_id=${quote(candidate.authBindingId)}`);
      if (mode === "replaced") query(`insert into ${bindings}(auth_binding_id,authenticated_user_id,specialist_id,valid_from,valid_until) values(${quote(randomUUID())},${quote(candidate.user)},${quote(candidate.specialist)},clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day')`);
      receipt(decide(admin, subjectOf(granted), { decision: "revoke" }), "HIGHEST_REVIEWER_REVOKED");
    }
  });

  await t.test("canonical payload replay and digest cover every command field and trimmed reason", () => {
    const target = reviewer();
    const key = randomUUID();
    const first = receipt(decide(admin, target, { key, reason: "  Audited reason  " }));
    const replay = receipt(decide(admin, target, { key, reason: "Audited reason" }));
    assert.deepEqual({ ...replay, replayed: false }, first);
    assert.equal(replay.replayed, true);
    const variants = [
      [{ ...target, authBindingId: randomUUID() }, {}],
      [{ ...target, bindingVersion: 2 }, {}],
      [subjectOf(first), {}],
      [{ ...subjectOf(first), expectedGrantVersion: 2 }, {}],
      [subjectOf(first), { decision: "revoke" }],
      [target, { reason: "Different reason" }],
    ];
    for (const [subject, options] of variants) denied(decide(admin, subject, { key, reason: "Audited reason", ...options }), "IDEMPOTENCY_CONFLICT");
    const existingKey = randomUUID(), existingSubject = subjectOf(first);
    receipt(decide(admin, existingSubject, { key: existingKey }));
    for (const [subject, options] of [
      [{ ...existingSubject, grantId: randomUUID() }, {}],
      [{ ...existingSubject, expectedGrantVersion: 2 }, {}],
      [existingSubject, { decision: "revoke" }],
    ]) denied(decide(admin, subject, { key: existingKey, ...options }), "IDEMPOTENCY_CONFLICT");
    assert.equal(query(`select count(*) from ${decisions} where owner_user_id=${quote(admin.user)} and idempotency_key=${quote(key)}`), "1");
    const audit = json(`select to_jsonb(d) from ${decisions} d where decision_id=${quote(first.decision.decisionId)}`);
    assert.equal(audit.owner_user_id, admin.user);
    assert.equal(audit.subject_user_id, target.user);
    assert.equal(audit.specialist_id, target.specialist);
    assert.equal(audit.auth_binding_id, target.authBindingId);
    assert.equal(audit.auth_binding_version, 1);
    assert.equal(audit.reason, "Audited reason");
    assert.equal(audit.grant_before_version, null);
    assert.equal(audit.grant_after_version, 1);
    assert.ok(Number.isFinite(Date.parse(audit.decided_at)));
    assert.match(audit.payload_digest, /^[0-9a-f]{64}$/u);
    const event = json(`select to_jsonb(e) from ${privateSchema}.operation_grant_events e where grant_id=${quote(first.subject.grantId)}`);
    assert.equal(event.granted_by, admin.user);
    assert.equal(event.after_value.actor_user_id, target.user);
    assert.equal(event.after_value.authority_basis, "Audited reason");
    assert.equal(event.before_value, null);
    assert.equal(event.grant_version, 1);
    assert.ok(Number.isFinite(Date.parse(event.recorded_at)));
  });

  await t.test("a fresh-key repeated revoke preserves the grant and grant events while recording only its immutable receipt", () => {
    const target = reviewer();
    const granted = receipt(decide(admin, target));
    const revoked = receipt(decide(admin, subjectOf(granted), { decision: "revoke" }), "HIGHEST_REVIEWER_REVOKED");
    const subject = subjectOf(revoked), key = randomUUID();
    const before = json(governanceSnapshotSql);
    const repeated = receipt(decide(admin, subject, { decision: "revoke", key, reason: "Confirm existing revocation" }), "HIGHEST_REVIEWER_REVOKED");
    const after = json(governanceSnapshotSql);
    assert.deepEqual(after[grants], before[grants], "repeat revoke must preserve every grant field including its original audit attribution");
    assert.deepEqual({ ...after, [decisions]: before[decisions] }, before, "repeat revoke changes only the decision receipt ledger");
    assert.equal(after[decisions].length, before[decisions].length + 1);
    const decision = after[decisions].find((row) => row.decision_id === repeated.decision.decisionId);
    assert.equal(decision.grant_before_version, revoked.subject.grantVersion);
    assert.equal(decision.grant_after_version, revoked.subject.grantVersion);
    const replay = receipt(decide(admin, subject, { decision: "revoke", key, reason: "Confirm existing revocation" }), "HIGHEST_REVIEWER_REVOKED");
    assert.deepEqual({ ...replay, replayed: false }, repeated);
    assert.equal(replay.replayed, true);
    assert.deepEqual(json(governanceSnapshotSql), after, "same-key replay writes nothing");
    denied(decide(admin, subject, { decision: "revoke", key, reason: "Different revocation reason" }), "IDEMPOTENCY_CONFLICT");
    assert.deepEqual(json(governanceSnapshotSql), after, "conflicting replay writes nothing");
  });

  await t.test("separate real sessions serialize duplicate first requests into one receipt", async () => {
    const target = reviewer(), key = randomUUID();
    const sql = decisionSql(admin, target, { key });
    const [first, second] = await harness.race(sql, sql, { sameKey: true });
    receipt(first); receipt(second);
    assert.deepEqual({ ...second, replayed: false }, first);
    assert.equal(second.replayed, true);
    assert.equal(query(`select count(*) from ${decisions} where idempotency_key=${quote(key)}`), "1");
    assert.equal(query(`select count(*) from ${privateSchema}.operation_grant_events where grant_id=${quote(first.subject.grantId)}`), "1");
  });

  await t.test("grant/revoke locks idempotency before the subject and stale concurrent commands cannot overwrite", async () => {
    const anotherOwner = owner();
    const target = reviewer();
    const first = receipt(decide(admin, target));
    const revoked = receipt(decide(admin, subjectOf(first), { decision: "revoke" }), "HIGHEST_REVIEWER_REVOKED");
    const [grant, staleRevoke] = await harness.race(
      decisionSql(admin, subjectOf(revoked)),
      decisionSql(anotherOwner, subjectOf(revoked), { decision: "revoke" }),
    );
    receipt(grant); denied(staleRevoke, "HIGHEST_REVIEWER_GRANT_CONFLICT");
    assert.equal(stateOf(target.user).version, grant.subject.grantVersion);
    assert.equal(stateOf(target.user).status, "active");
    assert.equal(query("select deadlocks from pg_stat_database where datname=current_database()"), initialDeadlocks);
  });

  await t.test("new binding grant and old grant revoke share the subject user lock domain in either order", async () => {
    const anotherOwner = owner();
    for (const grantFirst of [true, false]) {
      const target = reviewer();
      const old = receipt(decide(admin, target));
      const replacement = randomUUID();
      query(`update ${bindings} set binding_status='revoked',revoked_at=clock_timestamp() where auth_binding_id=${quote(target.authBindingId)};
        update ${grants} set valid_until=clock_timestamp()-interval '1 second',valid_from=clock_timestamp()-interval '1 day',version=version+1 where grant_id=${quote(old.subject.grantId)};
        insert into ${bindings}(auth_binding_id,authenticated_user_id,specialist_id,valid_from,valid_until) values(${quote(replacement)},${quote(target.user)},${quote(target.specialist)},clock_timestamp()-interval '1 minute',clock_timestamp()+interval '2 days');`);
      const stored = { ...subjectOf(old), expectedGrantVersion: 2 };
      const newSubject = { ...stored, authBindingId: replacement, bindingVersion: 1 };
      const grantSql = decisionSql(admin, newSubject);
      const revokeSql = decisionSql(anotherOwner, stored, { decision: "revoke" });
      const [winner, stale] = await harness.race(grantFirst ? grantSql : revokeSql, grantFirst ? revokeSql : grantSql);
      receipt(winner, grantFirst ? "HIGHEST_REVIEWER_GRANTED" : "HIGHEST_REVIEWER_REVOKED");
      denied(stale, "HIGHEST_REVIEWER_GRANT_CONFLICT");
      assert.equal(stateOf(target.user).version, winner.subject.grantVersion);
      assert.equal(stateOf(target.user).status, grantFirst ? "active" : "revoked");
    }
  });

  await t.test("all owner, operation and decision audits reject update, delete and truncate even for database admin", () => {
    for (const table of [`${privateSchema}.governance_owner_grant_events`, `${privateSchema}.operation_grant_events`, decisions]) {
      assert.notEqual(query(`select count(*) from ${table}`), "0");
      for (const sql of [`update ${table} set ${table === decisions ? "reason=reason" : "event_type=event_type"}`, `delete from ${table}`, `truncate ${table}`]) {
        const result = execute(`begin;${sql};rollback;`);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /append.only|immutable/iu);
      }
    }
    const ownerEvent = json(`select to_jsonb(e) from ${privateSchema}.governance_owner_grant_events e where owner_grant_id=${quote(admin.ownerGrant)}`);
    assert.equal(ownerEvent.provisioned_by, admin.user);
    assert.equal(ownerEvent.grant_version, 1);
    assert.equal(ownerEvent.after_value.owner_user_id, admin.user);
    assert.ok(Number.isFinite(Date.parse(ownerEvent.recorded_at)));
    assert.equal(snapshot(), caseBefore);
  });

  await t.test("registration reviewer A deciding applicant owner B cannot deadlock with B revoking A", async () => {
    const reviewerA = reviewer(), ownerB = owner(), applicationId = randomUUID();
    const granted = receipt(decide(admin, reviewerA));
    query(`insert into ${privateSchema}.reviewer_self_applications(application_id,user_id,display_name,organization,phone)
      values(${quote(applicationId)},${quote(ownerB.user)},'Synthetic applicant owner','','')`);
    const registrationKey = randomUUID(), revokeKey = randomUUID();
    const registrationSql = `select public.drs_reviewer_registration_decision_v1(${[
      reviewerA.user, reviewerA.session, future(), applicationId, 1, "approve", "Review owner application",
      registrationKey, new Date(Date.now() + 86_400_000).toISOString(),
    ].map(quote).join(",")})`;
    const beforeDeadlocks = query("select deadlocks from pg_stat_database where datname=current_database()");
    const [registration, revoke] = await harness.crossRace(granted.subject.grantId, registrationSql,
      decisionSql(ownerB, subjectOf(granted), { decision: "revoke", key: revokeKey }));
    assert.equal(registration.state, "REGISTRATION_DECIDED");
    assert.equal(registration.caseAccessGranted, false);
    assert.equal(registration.application.status, "approved");
    assert.equal(registration.application.version, 2);
    receipt(revoke, "HIGHEST_REVIEWER_REVOKED");
    assert.equal(stateOf(reviewerA.user).status, "revoked");
    assert.equal(stateOf(reviewerA.user).version, granted.subject.grantVersion + 1);
    assert.equal(query(`select count(*) from ${privateSchema}.reviewer_registration_decisions where idempotency_key=${quote(registrationKey)}`), "1");
    assert.equal(query(`select count(*) from ${decisions} where idempotency_key=${quote(revokeKey)}`), "1");
    assert.equal(query("select deadlocks from pg_stat_database where datname=current_database()"), beforeDeadlocks);
    assert.equal(snapshot(), caseBefore);
  });

  await t.test("registration approval replay for B cannot deadlock with B's first highest-reviewer grant", async () => {
    const reviewerA = reviewer(), subjectB = user(), applicationId = randomUUID();
    const actorGrant = receipt(decide(admin, reviewerA));
    query(`insert into ${privateSchema}.reviewer_self_applications(application_id,user_id,display_name,organization,phone)
      values(${quote(applicationId)},${quote(subjectB.user)},'Synthetic reviewer applicant','','')`);
    const registrationKey = randomUUID(), highestKey = randomUUID();
    const registrationSql = `select public.drs_reviewer_registration_decision_v1(${[
      reviewerA.user, reviewerA.session, future(), applicationId, 1, "approve", "Approve synthetic reviewer",
      registrationKey, new Date(Date.now() + 86_400_000).toISOString(),
    ].map(quote).join(",")})`;
    const original = json(runAsService(registrationSql));
    assert.equal(original.state, "REGISTRATION_DECIDED");
    assert.equal(original.application.status, "approved");
    const identity = json(`select jsonb_build_object('authBindingId',auth_binding_id,'bindingVersion',binding_version)
      from ${bindings} where authenticated_user_id=${quote(subjectB.user)}`);
    const beforeDeadlocks = query("select deadlocks from pg_stat_database where datname=current_database()");
    const [registrationReplay, highest] = await harness.crossRace(actorGrant.subject.grantId, registrationSql,
      decisionSql(admin, identity, { key: highestKey }), subjectB.user);
    assert.deepEqual({ ...registrationReplay, replayed: false }, original);
    assert.equal(registrationReplay.replayed, true);
    receipt(highest);
    assert.equal(stateOf(subjectB.user).status, "active");
    assert.equal(stateOf(subjectB.user).version, 1);
    assert.equal(query(`select count(*) from ${privateSchema}.reviewer_registration_decisions where idempotency_key=${quote(registrationKey)}`), "1");
    assert.equal(query(`select count(*) from ${decisions} where idempotency_key=${quote(highestKey)}`), "1");
    assert.equal(query(`select count(*) from ${privateSchema}.operation_grant_events where grant_id=${quote(highest.subject.grantId)}`), "1");
    assert.equal(query("select deadlocks from pg_stat_database where datname=current_database()"), beforeDeadlocks);
    assert.equal(snapshot(), caseBefore);
  });

  await t.test("legacy gate covers active, revoked and expired rows before enforcement", () => {
    for (const status of ["active", "revoked", "expired"]) {
      reset();
      const actor = user(), grantId = randomUUID();
      query(`insert into ${grants}(grant_id,actor_user_id,operation,scope,status,valid_from,valid_until,revoked_at,granted_by,authority_basis)
        values(${quote(grantId)},${quote(actor.user)},'reviewer_registration_decide','reviewer_registration',${quote(status === "revoked" ? "revoked" : "active")},clock_timestamp()-interval '2 days',clock_timestamp()+interval '${status === "expired" ? "-1 second" : "1 day"}',${status === "revoked" ? "clock_timestamp()" : "null"},${quote(actor.user)},'Synthetic legacy row');`);
      query(migrations[0]);
      assert.deepEqual(json(`select jsonb_build_array(specialist_id,auth_binding_id,auth_binding_version,legacy_identity_unresolved) from ${grants} where grant_id=${quote(grantId)}`), [null, null, null, false]);
      assert.equal(query(`select count(*) from pg_proc where proname='drs_highest_reviewer_role_decision_v1'`), "0", "expand cannot expose enforcement RPC");
      const blocked = execute(migrations[1] + "\n" + migrations[2]);
      assert.notEqual(blocked.status, 0);
      assert.match(blocked.stderr, /legacy|reconciliation/iu);
      assert.equal(query(`select count(*) from pg_proc where proname='drs_highest_reviewer_role_decision_v1'`), "0");
      assert.deepEqual(json(`select jsonb_build_array(specialist_id,auth_binding_id,auth_binding_version,legacy_identity_unresolved) from ${grants} where grant_id=${quote(grantId)}`), [null, null, null, false], "gate cannot silently repair or discard a legacy row");
      const enforce = execute(migrations[2]);
      assert.notEqual(enforce.status, 0, "enforcement alone cannot bypass unresolved legacy rows");
      assert.match(enforce.stderr, /legacy|identity|constraint|check/iu);
    }
  });

  await t.test("enforcement refuses unresolved historical identity without a matching audit event", () => {
    reset();
    const actor = user(), grantId = randomUUID();
    query(migrations[0]);
    query(`alter table ${grants} disable trigger registration_operation_grant_event;
      insert into ${grants}(grant_id,actor_user_id,operation,scope,status,valid_from,valid_until,revoked_at,granted_by,authority_basis,legacy_identity_unresolved)
      values(${quote(grantId)},${quote(actor.user)},'reviewer_registration_decide','reviewer_registration','revoked',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',clock_timestamp(),${quote(actor.user)},'Synthetic unaudited historical row',true);
      alter table ${grants} enable trigger registration_operation_grant_event;`);
    const blocked = execute(migrations[2]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /audit|legacy|identity|reconciliation/iu);
    assert.equal(query(`select count(*) from pg_proc where proname='drs_highest_reviewer_role_decision_v1'`), "0");
  });

  await t.test("audited revoked unresolved shape is inert and explicit same-row reconciliation allows later regrant", () => {
    reset();
    const actor = user(), grantId = randomUUID();
    query(`insert into ${grants}(grant_id,actor_user_id,operation,scope,status,valid_from,valid_until,granted_by,authority_basis)
      values(${quote(grantId)},${quote(actor.user)},'reviewer_registration_decide','reviewer_registration','active',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',${quote(actor.user)},'Synthetic legacy fixture');`);
    query(migrations[0]);
    query(`update ${grants} set status='revoked',revoked_at=clock_timestamp(),version=version+1,legacy_identity_unresolved=true where grant_id=${quote(grantId)}`);
    assert.equal(query(`select count(*) from ${privateSchema}.operation_grant_events where grant_id=${quote(grantId)} and grant_version=2 and after_value->>'legacy_identity_unresolved'='true'`), "1");
    query(migrations[2]);
    const localOwner = owner(), eligible = reviewer(actor);
    const unresolved = candidates(localOwner).candidates.find((candidate) => candidate.subject.grantId === grantId);
    assert.deepEqual(unresolved, { candidateKey: grantId, displayName: null, accountEmail: null,
      subject: { authBindingId: null, bindingVersion: null, grantId, grantVersion: 2 },
      qualification: { state: "unresolved", validUntil: null }, governanceGrant: { state: "legacy_identity_unresolved", validUntil: null },
      effectiveHighestReviewer: false, availableAction: "reconciliation_required" });
    denied(decide(localOwner, { ...eligible, grantId, expectedGrantVersion: 2 }), "LEGACY_GRANT_RECONCILIATION_REQUIRED");
    assert.notEqual(query(`select coalesce(${privateSchema}.registration_actor_check_v1(${[actor.user, actor.session, future(), grantId].map(quote).join(",")}), 'AUTHORIZED')`), "AUTHORIZED");
    for (const change of ["status='active',revoked_at=null", "revoked_at=null", `specialist_id=${quote(eligible.specialist)}`, "legacy_identity_unresolved=false"]) {
      const blocked = execute(`begin;update ${grants} set ${change},version=version+1 where grant_id=${quote(grantId)};rollback;`);
      assert.notEqual(blocked.status, 0);
      assert.match(blocked.stderr, /constraint|identity|legacy|revoked/iu);
    }
    query(`update ${grants} set specialist_id=${quote(eligible.specialist)},auth_binding_id=${quote(eligible.authBindingId)},auth_binding_version=1,legacy_identity_unresolved=false,version=version+1,authority_basis='Synthetic separately authorized identity reconciliation' where grant_id=${quote(grantId)}`);
    assert.equal(query(`select count(*) from ${privateSchema}.operation_grant_events where grant_id=${quote(grantId)} and grant_version=3 and before_value->>'legacy_identity_unresolved'='true' and after_value->>'legacy_identity_unresolved'='false'`), "1");
    const regrant = receipt(decide(localOwner, { ...eligible, grantId, expectedGrantVersion: 3 }));
    assert.equal(regrant.subject.grantId, grantId);
    assert.equal(regrant.subject.grantVersion, 4);
    assert.equal(query(`select count(*) from ${grants} where actor_user_id=${quote(actor.user)}`), "1");
  });
});

async function openDatabase() {
  const port = process.env.DRS_HIGHEST_REVIEWER_PG_PORT;
  assert.match(port ?? "", /^\d{4,5}$/u, "A dedicated disposable port is required");
  assert.ok(Number(port) <= 65535);
  const psql = process.env.DRS_HIGHEST_REVIEWER_PSQL;
  assert.equal(process.env.DRS_HIGHEST_REVIEWER_ALLOW_DISPOSABLE, "1", "Explicit disposable authorization is required");
  const container = psql ? null : "drs-highest-reviewer-" + randomUUID();
  let owned = false;
  const dockerResult = (args) => spawnSync("docker", args, { encoding: "utf8", windowsHide: true, timeout: 60_000 });
  const docker = (args) => {
    const result = dockerResult(args);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const args = ["--host=127.0.0.1", `--port=${psql ? port : "5432"}`, "--username=postgres", `--dbname=${database}`,
    "--no-password", "--no-psqlrc", "--set=ON_ERROR_STOP=1", "--quiet", "--tuples-only", "--no-align"];
  const command = psql ?? "docker";
  const commandArgs = psql ? args : ["exec", "-i", container, "psql", ...args];
  const execute = (sql) => spawnSync(command, commandArgs, { input: sql, encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 2_000_000 });
  const query = (sql) => {
    const result = execute(sql);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const json = (sql) => JSON.parse(query(sql));
  const guard = `do $guard$ begin if current_database()<>${quote(database)} or (select shobj_description(oid,'pg_database') from pg_database where datname=current_database()) is distinct from ${quote(marker)} then raise exception 'DISPOSABLE_MARKER_REQUIRED'; end if; end $guard$;`;
  const reset = () => query(guard + "drop schema if exists drs_forward_private cascade;drop schema if exists auth cascade;drop schema if exists casework cascade;drop schema public cascade;create schema public;");
  const close = () => {
    if (container) {
      const inspected = dockerResult(["inspect", "--type", "container", "--format", '{{index .Config.Labels "drs.highest-reviewer.owner"}}', container]);
      assert.ifError(inspected.error);
      if (inspected.status !== 0 && new RegExp(`No such (object|container): ${container}(?:\\s|$)`, "u").test(inspected.stderr)) return;
      assert.equal(inspected.status, 0, "Container cleanup ownership is unknown: " + inspected.stderr);
      assert.equal(inspected.stdout.trim(), container, "Refuse cleanup of a container without the exact task ownership label");
      docker(["rm", "--force", "--volumes", container]);
      assert.equal(docker(["ps", "--all", "--quiet", "--filter", `name=^/${container}$`]), "");
    } else if (owned) {
      reset();
      query(guard + "drop extension if exists pgcrypto;drop schema if exists extensions;");
      assert.equal(query("select count(*) from pg_namespace where nspname in ('auth','drs_forward_private','casework','extensions')"), "0");
    }
  };
  try {
    if (container) {
      docker(["run", "--detach", "--name", container, "--label", `drs.highest-reviewer.owner=${container}`,
        "--publish", `127.0.0.1:${port}:5432`, "--mount", "type=tmpfs,destination=/var/lib/postgresql/data",
        "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--env", `POSTGRES_DB=${database}`, "postgres:17-alpine"]);
      const deadline = Date.now() + 30_000;
      while (execute("select 1").status !== 0) {
        assert.ok(Date.now() < deadline, "Disposable PostgreSQL startup timed out");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    assert.equal(query("select current_database()"), database);
    const priorMarker = query("select coalesce(shobj_description(oid,'pg_database'),'') from pg_database where datname=current_database()");
    assert.ok(priorMarker === "" || priorMarker === marker, "Database belongs to a different test");
    if (priorMarker === marker) {
      owned = true;
      close();
    }
    assert.equal(query("select count(*) from pg_namespace where nspname in ('auth','drs_forward_private','casework','extensions')"), "0", "Refuse to reset a nonempty supplied database");
    assert.equal(query("select count(*) from pg_class where relnamespace='public'::regnamespace"), "0");
    assert.equal(query("select count(*) from pg_proc where pronamespace='public'::regnamespace"), "0");
    query(`comment on database ${database} is ${quote(marker)};`);
    owned = true;
    return { execute, query, json, reset, close, race: makeRace(command, commandArgs, query, json),
      crossRace: makeCrossRace(command, commandArgs, query) };
  } catch (error) {
    if (container || owned) {
      try { close(); } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Database startup failed and exact task cleanup could not be verified");
      }
    }
    throw error;
  }
}

function makeCrossRace(command, args, query) {
  return async (grantId, registrationSql, highestSql, subjectUserId = null) => {
    const names = ["hr-registration-" + randomUUID(), "hr-highest-" + randomUUID()];
    const sessions = names.map((name) => {
      const child = spawn(command, args, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      const done = new Promise((resolve, reject) => {
        child.on("error", reject);
        child.stdout.on("data", (data) => { stdout += data; });
        child.stderr.on("data", (data) => { stderr += data; });
        child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `psql exited ${code}`)));
      });
      done.catch(() => {});
      child.stdin.write(`set application_name=${quote(name)};set statement_timeout='8s';begin;`);
      return { child, done, output: () => stdout };
    });
    async function until(check, message) {
      const deadline = Date.now() + 5000;
      while (!check()) {
        assert.ok(Date.now() < deadline, message);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    try {
      // Hold the old RPC's grant, and optionally its applicant Auth row, before the new RPC contends.
      const userLock = subjectUserId === null ? "" : `select id from auth.users where id=${quote(subjectUserId)} for update;`;
      sessions[0].child.stdin.write(`select grant_id from ${grants} where grant_id=${quote(grantId)} for update;${userLock}\n\\echo REGISTRATION_ROWS_HELD\n`);
      await until(() => sessions[0].output().includes("REGISTRATION_ROWS_HELD"), "registration hold point was not reached");
      sessions[1].child.stdin.end(`set local role service_role;${highestSql};commit;`);
      await until(() => query(`select count(*) from pg_stat_activity waiting join pg_stat_activity holder
        on holder.pid=any(pg_blocking_pids(waiting.pid)) where waiting.application_name=${quote(names[1])}
        and holder.application_name=${quote(names[0])}`) === "1", "highest-reviewer command did not contend for the held registration resource");
      sessions[0].child.stdin.end(`set local role service_role;${registrationSql};commit;`);
      const outputs = await Promise.all(sessions.map((session) => session.done));
      return outputs.map((output) => JSON.parse(output.split(/\r?\n/u).find((line) => line.trim().startsWith("{"))));
    } finally {
      for (const session of sessions) if (!session.child.stdin.writableEnded) session.child.stdin.end("rollback;");
      await Promise.allSettled(sessions.map((session) => session.done));
    }
  };
}

function makeRace(command, args, query, json) {
  return async (firstSql, secondSql, { sameKey = false } = {}) => {
    const firstName = "hr-first-" + randomUUID();
    const secondName = "hr-second-" + randomUUID();
    function session(name) {
      const child = spawn(command, args, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      const done = new Promise((resolve, reject) => {
        child.on("error", reject);
        child.stdout.on("data", (data) => { stdout += data; });
        child.stderr.on("data", (data) => { stderr += data; });
        child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `psql exited ${code}`)));
      });
      done.catch(() => {});
      child.stdin.write(`set application_name=${quote(name)};set statement_timeout='10s';begin;set local role service_role;`);
      return { child, done, output: () => stdout };
    }
    async function until(check, label) {
      const deadline = Date.now() + 7000;
      while (!check()) {
        assert.ok(Date.now() < deadline, label);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    const first = session(firstName);
    let second;
    try {
      first.child.stdin.write(`${firstSql};\n\\echo FIRST_COMMAND_HELD\n`);
      await until(() => first.output().includes("FIRST_COMMAND_HELD"), "first transaction did not reach its hold point");
      second = session(secondName);
      second.child.stdin.end(`${secondSql};commit;`);
      await until(() => query(`select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name=${quote(secondName)} and l.locktype='advisory' and not l.granted`) === "1", "second command did not wait in an advisory lock domain");
      const locks = json(`select jsonb_agg(jsonb_build_object('name',a.application_name,'key',jsonb_build_array(l.classid,l.objid,l.objsubid),'granted',l.granted)) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name in (${quote(firstName)},${quote(secondName)}) and l.locktype='advisory'`);
      const held = locks.filter((lock) => lock.name === firstName && lock.granted);
      const waiting = locks.find((lock) => lock.name === secondName && !lock.granted);
      assert.equal(held.length, 2, "first transaction holds owner/idempotency and subject locks");
      assert.equal(locks.filter((lock) => lock.name === secondName && lock.granted).length, sameKey ? 0 : 1,
        "idempotency is acquired before subject; different owners hold their own idempotency lock while awaiting the same subject");
      assert.ok(held.some((lock) => JSON.stringify(lock.key) === JSON.stringify(waiting.key)), "same subject user uses the same lock domain");
      first.child.stdin.end("commit;");
      const [one, two] = await Promise.all([first.done, second.done]);
      return [one, two].map((output) => JSON.parse(output.split(/\r?\n/u).find((line) => line.trim().startsWith("{"))));
    } finally {
      if (!first.child.stdin.writableEnded) first.child.stdin.end("rollback;");
      await Promise.allSettled([first.done, second?.done]);
    }
  };
}

const dependencyFixture = `
do $roles$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $roles$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema auth;
create schema drs_forward_private;
create schema casework;
create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users(id),not_after timestamptz);
create table drs_forward_private.specialists(
  specialist_id uuid primary key,specialist_status text not null default 'active' check(specialist_status in ('active','suspended','retired')),
  specialist_version bigint not null default 1 check(specialist_version>=1),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table drs_forward_private.auth_specialist_bindings(
  auth_binding_id uuid primary key,authenticated_user_id uuid not null references auth.users(id) on delete restrict,
  specialist_id uuid not null references drs_forward_private.specialists(specialist_id) on delete restrict,
  binding_status text not null default 'active' check(binding_status in ('active','revoked')),binding_version bigint not null default 1 check(binding_version>=1),
  valid_from timestamptz not null default clock_timestamp(),valid_until timestamptz not null,revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
  unique(authenticated_user_id,specialist_id,auth_binding_id),
  check(valid_until>valid_from and (revoked_at is null or revoked_at>=valid_from) and ((binding_status='active' and revoked_at is null) or binding_status='revoked')));
create table casework.case_members(id integer primary key,case_id uuid,member_user_id uuid,role text);
create table drs_forward_private.case_mappings(id integer primary key,case_id uuid,mapping jsonb);
create table drs_forward_private.reviewer_case_authorities(id integer primary key,case_id uuid,specialist_id uuid,permissions jsonb);
create table drs_forward_private.server_sessions(id integer primary key,case_id uuid,scope text);
insert into casework.case_members values(1,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','owner');
insert into drs_forward_private.case_mappings values(1,'11111111-1111-4111-8111-111111111111','{"fixture":"preserve"}');
insert into drs_forward_private.reviewer_case_authorities values(1,'11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','{"read":true}');
insert into drs_forward_private.server_sessions values(1,'11111111-1111-4111-8111-111111111111','existing case scope');
`;
