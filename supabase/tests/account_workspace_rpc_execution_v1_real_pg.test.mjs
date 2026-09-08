import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, realpath } from "node:fs/promises";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const psql = process.env.ACCOUNT_RPC_PSQL;
const port = process.env.ACCOUNT_RPC_PG_PORT;
const enabled = process.env.ACCOUNT_RPC_ALLOW_DISPOSABLE === "1";
const database = "laibe_account_rpc_disposable";
const id = (n) =>
  n.toString(16).padStart(8, "0") + "-1111-4111-8111-111111111111";

async function orderedMigrations() {
  const directory = new URL("../migrations/", import.meta.url);
  const names = (await readdir(directory)).filter((name) =>
    name.endsWith("_account_workspace_grant_compat_v1.sql") ||
    name.endsWith("_account_workspace_rpc_execution_v1.sql")
  ).sort();
  assert.deepEqual(names, [
    "20260908104000_account_workspace_grant_compat_v1.sql",
    "20260908104001_account_workspace_rpc_execution_v1.sql",
  ], "normal migration ordering must apply the dependency before the repair");
  return Promise.all(
    names.map((name) => readFile(new URL(name, directory), "utf8")),
  );
}

test("migration filenames order the compatibility dependency before the repair", async () => {
  await orderedMigrations();
});

test(
  "account RPC execution boundary preserves authority and exact function bodies in real PostgreSQL",
  {
    skip: !psql || !port || !enabled ? "REAL_PG_PENDING" : false,
  },
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
        input: "\\set VERBOSITY verbose\n" + sql,
        encoding: "utf8",
        timeout: 15000,
        windowsHide: true,
      });
    const query = (sql) => {
      const r = execute(sql);
      assert.ifError(r.error);
      assert.equal(r.status, 0, r.stderr);
      return r.stdout.trim();
    };
    const json = (sql) => JSON.parse(query(sql));
    let checks = 0;
    const check = (actual, expected, label) => {
      assert.deepEqual(actual, expected, label);
      checks++;
    };
    const denied = (sql, pattern) => {
      const r = execute(sql);
      assert.ifError(r.error);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, pattern);
      checks++;
    };
    const [compat, migration] = await orderedMigrations();
    check(
      createHash("sha256").update(compat).digest("hex").toUpperCase(),
      "A325CBDED57FC027750F82F6B48038E62FE8FFF4062255242E97FC7E869BA48F",
      "immutable compatibility fixture",
    );
    query(
      `
    do $guard$ begin
      if current_database() <> '${database}' or current_user <> 'postgres'
        or exists(select 1 from pg_namespace where nspname='casework')
        or exists(select 1 from pg_namespace where nspname='auth')
      then raise exception 'Empty disposable target required'; end if;
    end $guard$;
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create schema casework;
    create type casework.account_role as enum ('owner','pro','pcm','admin');
    create table auth.users(id uuid primary key, deleted_at timestamptz, banned_until timestamptz);
    create table casework.cases(id uuid primary key, title text, case_status text);
    create table casework.case_members(
      user_id uuid references auth.users(id),case_id uuid references casework.cases(id),role casework.account_role,
      membership_id uuid not null, membership_status text not null default 'active',
      valid_from timestamptz not null default now()-interval '1 day', valid_until timestamptz,
      revoked_at timestamptz, authority_version bigint not null default 1,
      primary key(user_id,case_id)
    );
    insert into auth.users(id) select x::uuid from unnest(array['${id(1)}','${
        id(2)
      }','${id(3)}','${id(4)}','${id(5)}']) x;
    insert into casework.cases values ('${
        id(11)
      }','Synthetic owner case','active'),('${
        id(12)
      }','Synthetic vendor case','active');
    insert into casework.case_members(user_id,case_id,role,membership_id,authority_version) values
      ('${id(1)}','${id(11)}','owner','${id(21)}',7),
      ('${id(2)}','${id(12)}','pro','${id(22)}',9),
      ('${id(4)}','${id(11)}','admin','${id(24)}',1),
      ('${id(5)}','${id(11)}','pcm','${id(25)}',1);
  ` + compat,
    );
    const metadataSql = `select jsonb_agg(jsonb_build_object(
    'name',p.oid::regprocedure::text,'body',p.prosrc,'md5',md5(p.prosrc),
    'owner',r.rolname,'config',p.proconfig,'acl',p.proacl::text,
    'language',l.lanname,'volatile',p.provolatile,'securityDefiner',p.prosecdef
  ) order by p.proname)
  from pg_proc p join pg_roles r on r.oid=p.proowner join pg_language l on l.oid=p.prolang
  where p.oid in ('public.owner_workspace_grant_v1(uuid)'::regprocedure,
    'public.vendor_workspace_grant_v1(uuid)'::regprocedure,
    'casework.account_workspace_grant_resolve_v1(uuid,text)'::regprocedure)`;
    const before = json(metadataSql);
    check(before.map((x) => x.md5), [
      "d6b2a70d680e3c86d767bbf9d58a055e",
      "a1b0cb85290c337d4e623ec118101e2e",
      "68b1156d82fb7cfe64a428a86275b1c4",
    ], "exact production prosrc including newlines");
    const rowSnapshot = () =>
      json(`select jsonb_build_object(
    'users',(select jsonb_agg(to_jsonb(u) order by id) from auth.users u),
    'cases',(select jsonb_agg(to_jsonb(c) order by id) from casework.cases c),
    'members',(select jsonb_agg(to_jsonb(m) order by user_id,case_id) from casework.case_members m))`);
    const rowsBefore = rowSnapshot();
    const callSql = (wrapper, user, role = "service_role") =>
      `begin; set local role ${role}; select public.${wrapper}_workspace_grant_v1('${user}'::uuid); rollback;`;
    for (const wrapper of ["owner", "vendor"]) {
      denied(
        callSql(wrapper, id(3)),
        /42501:.*permission denied for schema casework/u,
      );
    }
    check(
      json(
        "select to_jsonb(has_schema_privilege('service_role','casework','USAGE'))",
      ),
      false,
      "no schema privilege before",
    );
    query(migration);
    // This assertion is the focused RED while the new migration is still empty.
    const noCase = { authorized: false, state: "CASE_NOT_AUTHORIZED" };
    for (const wrapper of ["owner", "vendor"]) {
      check(
        JSON.parse(query(callSql(wrapper, id(3)))),
        noCase,
        "no case is a denial DTO, not 42501",
      );
    }
    const after = json(metadataSql);
    check(
      after.map((x) => ({
        ...x,
        securityDefiner: before.find((b) => b.name === x.name).securityDefiner,
      })),
      before,
      "body, owner, ACL, language and config unchanged",
    );
    check(
      after.map((x) => x.securityDefiner),
      [true, true, true],
      "only wrapper SECURITY DEFINER metadata changes",
    );
    check(
      json(
        "select to_jsonb(has_schema_privilege('service_role','casework','USAGE'))",
      ),
      false,
      "private schema still inaccessible",
    );

    for (
      const [wrapper, user, caseId, accountRole, grantId, version] of [
        ["owner", id(1), id(11), "owner", id(21), 7],
        ["vendor", id(2), id(12), "pro", id(22), 9],
      ]
    ) {
      const grant = JSON.parse(query(callSql(wrapper, user)));
      check(
        Object.keys(grant).sort(),
        [
          "authorized",
          "state",
          "case_id",
          "case_status",
          "case_title",
          "account_role",
          "grant_id",
          "grant_version",
          "grant_expires_at",
        ].sort(),
        "fixed existing DTO",
      );
      check([
        grant.authorized,
        grant.state,
        grant.case_id,
        grant.case_status,
        grant.account_role,
        grant.grant_id,
        grant.grant_version,
      ], [
        true,
        "AUTHORIZED_CASEWORK_WORKSPACE",
        caseId,
        "active",
        accountRole,
        grantId,
        version,
      ], "same-user role and case authority");
      assert.ok(Date.parse(grant.grant_expires_at) > Date.now());
      assert.ok(Date.parse(grant.grant_expires_at) <= Date.now() + 900000);
      checks++;
      for (const deniedRole of ["anon", "authenticated"]) {
        denied(
          callSql(wrapper, user, deniedRole),
          /42501:.*permission denied for function/u,
        );
      }
    }
    for (
      const [wrapper, user] of [
        ["owner", id(2)],
        ["vendor", id(1)],
        ["owner", id(4)],
        ["vendor", id(4)],
        ["owner", id(5)],
        ["vendor", id(5)],
      ]
    ) {
      check(
        JSON.parse(query(callSql(wrapper, user))),
        noCase,
        "cross-role does not obtain another case",
      );
    }
    denied(
      "begin; set local role service_role; select * from casework.case_members; rollback;",
      /42501:.*permission denied for schema casework/u,
    );
    const transactionCall = (change, wrapper = "owner", user = id(1)) =>
      JSON.parse(
        query(
          `begin; ${change}; set local role service_role; select public.${wrapper}_workspace_grant_v1('${user}'::uuid); rollback;`,
        ),
      );
    for (
      const change of [
        "update casework.case_members set membership_status='revoked',revoked_at=now()",
        "update casework.case_members set valid_until=now()-interval '1 second'",
        "update casework.case_members set valid_from=now()+interval '1 day'",
        "update casework.cases set case_status='closed'",
        "update auth.users set deleted_at=now()",
        "update auth.users set banned_until=now()+interval '1 day'",
      ]
    ) {
      check(
        transactionCall(change),
        noCase,
        "existing lifecycle condition preserved",
      );
    }
    check(
      transactionCall(
        `insert into casework.case_members(user_id,case_id,role,membership_id) values ('${
          id(1)
        }','${id(12)}','owner','${id(26)}')`,
      ),
      { authorized: false, state: "CASE_SELECTION_REQUIRED" },
      "multiple authorized cases remain a separate denial",
    );
    check(
      rowSnapshot(),
      rowsBefore,
      "migration and resolver calls mutate no users/cases/members",
    );

    const invokerBaseline =
      "alter function public.owner_workspace_grant_v1(uuid) security invoker; alter function public.vendor_workspace_grant_v1(uuid) security invoker;";
    const driftCases = [
      [
        "alter function public.owner_workspace_grant_v1(uuid) set search_path=public",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "grant execute on function public.owner_workspace_grant_v1(uuid) to authenticated",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "grant execute on function public.vendor_workspace_grant_v1(uuid) to public",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "alter function public.vendor_workspace_grant_v1(uuid) owner to service_role",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "alter function public.owner_workspace_grant_v1(uuid) stable",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "alter function casework.account_workspace_grant_resolve_v1(uuid,text) security invoker",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "grant usage on schema casework to service_role",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "drop function public.vendor_workspace_grant_v1(uuid)",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
      [
        "create or replace function public.owner_workspace_grant_v1(p_authenticated_user_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select '{}'::jsonb$$",
        /ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT/u,
      ],
    ];
    for (const [drift, pattern] of driftCases) {
      denied("begin;" + invokerBaseline + drift + ";" + migration, pattern);
      check(
        json(metadataSql),
        after,
        "failed drift migration leaves no partial metadata change",
      );
    }
    check(
      rowSnapshot(),
      rowsBefore,
      "all negative tests leave protected synthetic data unchanged",
    );
    console.log(
      JSON.stringify({
        realPostgreSQL: true,
        checks,
        exactProductionBodies: true,
        directSchemaUsage: false,
        caseAuthMemberDelta: 0,
      }),
    );
  },
);
