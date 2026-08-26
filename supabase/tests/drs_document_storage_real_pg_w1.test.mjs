import assert from "node:assert/strict";

const MIGRATION_URL = new URL(
  "../migrations/20260826190000_drs_document_storage_w1.sql",
  import.meta.url,
);
const SELF_URL = new URL(import.meta.url);

const IDS = Object.freeze({
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  specialistA: "33333333-3333-4333-8333-333333333333",
  specialistB: "44444444-4444-4444-8444-444444444444",
  drsCaseA: "55555555-5555-4555-8555-555555555555",
  drsCaseB: "66666666-6666-4666-8666-666666666666",
  caseA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  caseB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  assignmentA: "77777777-7777-4777-8777-777777777777",
  assignmentB: "88888888-8888-4888-8888-888888888888",
  bindingA: "99999999-9999-4999-8999-999999999999",
  bindingB: "aaaaaaaa-9999-4999-8999-999999999999",
  mappingA: "bbbbbbbb-9999-4999-8999-999999999999",
  mappingB: "cccccccc-9999-4999-8999-999999999999",
  intent: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  object: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  zeroDocument: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  zeroVersion: "12121212-1212-4121-8121-121212121212",
});
const SUBJECT_A = `drs-specialist:${IDS.specialistA}`;
const INTENT_REF = "int_01j6a8k9m4q2w3e4r5t6y7u8i9";
const FINALIZE_KEY = "finalize-01j6a8k9m4q2w3e4";

async function optionalEnv(name) {
  try {
    const permission = await Deno.permissions.query({
      name: "env",
      variable: name,
    });
    return permission.state === "granted" ? Deno.env.get(name) : undefined;
  } catch {
    return undefined;
  }
}

const REAL_PG_CONFIRMED =
  (await optionalEnv("DRS_DOCUMENT_REAL_PG_CONFIRMED")) === "1";

async function runPsql(psql, databaseUrl, sql) {
  const password = await optionalEnv("DRS_DOCUMENT_REAL_PG_PASSWORD");
  const command = new Deno.Command(psql, {
    args: [
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--dbname",
      databaseUrl,
    ],
    clearEnv: true,
    env: {
      PGCONNECT_TIMEOUT: "5",
      ...(password ? { PGPASSWORD: password } : {}),
    },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(sql));
  await writer.close();
  const output = await child.output();
  return {
    success: output.success,
    stdout: new TextDecoder().decode(output.stdout).trim(),
  };
}

async function psql(psqlPath, databaseUrl, sql) {
  const output = await runPsql(psqlPath, databaseUrl, sql);
  assert.equal(output.success, true, "REAL_PG_ASSERTION_FAILED");
  return output.stdout;
}

function jsonFrom(output) {
  const line = output.split(/\r?\n/u).findLast((candidate) =>
    candidate.trimStart().startsWith("{")
  );
  assert.ok(line, "REAL_PG_JSON_RESULT_MISSING");
  return JSON.parse(line);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function operationSql(grant, operation, resourceRef, key, digest) {
  return `
    begin;
    set local role service_role;
    select public.server_document_operation_v1(
      '${IDS.userA}', '${IDS.caseA}', '${SUBJECT_A}',
      '${grant.grant_id}', ${grant.grant_version}::bigint,
      ${sqlLiteral(operation)}, ${sqlLiteral(resourceRef)},
      ${sqlLiteral(key)}, ${sqlLiteral(digest)}
    );
    commit;
  `;
}

const CLEANUP_SQL = `
  begin;
  set local session_replication_role = replica;
  delete from casework.document_snapshot_items
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.evidence_references
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.document_operation_receipts
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.case_events
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.document_artifacts
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.document_version_sources
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.document_orphan_cleanup_work_items
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.document_upload_intents
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.document_versions
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.submission_snapshots
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from casework.documents
    where case_id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from integration.drs_workspace_grants
    where binding_id in ('${IDS.bindingA}', '${IDS.bindingB}');
  delete from integration.drs_auth_specialist_bindings
    where binding_id in ('${IDS.bindingA}', '${IDS.bindingB}');
  delete from integration.drs_case_identity_bindings
    where case_identity_binding_id in ('${IDS.mappingA}', '${IDS.mappingB}');
  delete from public.drs_case_specialist_assignments
    where assignment_id in ('${IDS.assignmentA}', '${IDS.assignmentB}');
  delete from public.drs_specialists
    where specialist_id in ('${IDS.specialistA}', '${IDS.specialistB}');
  delete from public.drs_cases
    where case_id in ('${IDS.drsCaseA}', '${IDS.drsCaseB}');
  delete from casework.cases where id in ('${IDS.caseA}', '${IDS.caseB}');
  delete from auth.users where id in ('${IDS.userA}', '${IDS.userB}');
  set local session_replication_role = origin;
  commit;
`;

const SETUP_SQL = `
  ${CLEANUP_SQL}
  begin;
  insert into auth.users(id) values ('${IDS.userA}'), ('${IDS.userB}');
  insert into casework.cases(
    id, case_status, title, created_by, creation_idempotency_key,
    creation_payload_sha256
  ) values
    ('${IDS.caseA}', 'active', 'A15 disposable case A', '${IDS.userA}',
     'a15-document-real-case-a', repeat('a', 64)),
    ('${IDS.caseB}', 'active', 'A15 disposable case B', '${IDS.userB}',
     'a15-document-real-case-b', repeat('b', 64));
  insert into public.drs_cases(case_id, case_number, owner_id, case_state)
  values
    ('${IDS.drsCaseA}', 'A15-DOC-A', '${IDS.userA}', 'ACTIVE_REVIEW'),
    ('${IDS.drsCaseB}', 'A15-DOC-B', '${IDS.userB}', 'ACTIVE_REVIEW');
  insert into public.drs_specialists(specialist_id, display_name, authority_state)
  values
    ('${IDS.specialistA}', 'A15 disposable specialist A', 'ACTIVE'),
    ('${IDS.specialistB}', 'A15 disposable specialist B', 'ACTIVE');
  insert into public.drs_case_specialist_assignments(
    assignment_id, case_id, specialist_id, assigned_by, valid_from, valid_until
  ) values
    ('${IDS.assignmentA}', '${IDS.drsCaseA}', '${IDS.specialistA}', '${IDS.userA}',
     clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day'),
    ('${IDS.assignmentB}', '${IDS.drsCaseB}', '${IDS.specialistB}', '${IDS.userB}',
     clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day');
  insert into integration.drs_case_identity_bindings(
    case_identity_binding_id, drs_case_id, casework_case_id,
    mapping_status, valid_from, valid_until
  ) values
    ('${IDS.mappingA}', '${IDS.drsCaseA}', '${IDS.caseA}', 'active',
     clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day'),
    ('${IDS.mappingB}', '${IDS.drsCaseB}', '${IDS.caseB}', 'active',
     clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day');
  insert into integration.drs_auth_specialist_bindings(
    binding_id, authenticated_user_id, specialist_id, selected_assignment_id,
    authorization_subject, binding_status, valid_from, valid_until
  ) values
    ('${IDS.bindingA}', '${IDS.userA}', '${IDS.specialistA}', '${IDS.assignmentA}',
     '${SUBJECT_A}', 'active', clock_timestamp() - interval '1 hour',
     clock_timestamp() + interval '1 day'),
    ('${IDS.bindingB}', '${IDS.userB}', '${IDS.specialistB}', '${IDS.assignmentB}',
     'drs-specialist:${IDS.specialistB}', 'active',
     clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day');
  commit;
`;

Deno.test("real PostgreSQL harness registers without ambient env permission and is executable", async () => {
  const source = await Deno.readTextFile(SELF_URL);
  assert.doesNotMatch(source, /ignore:\s*Deno\.env\.get/u);
  assert.doesNotMatch(
    source,
    new RegExp(
      ["REAL", "PG", "HARNESS", "REQUIRES", "DISPOSABLE", "PROVIDER"].join("_"),
      "u",
    ),
  );
  assert.match(source, /Deno\.permissions\.query/u);
  assert.match(source, /new Deno\.Command\([^)]*psql/isu);
  assert.match(source, /begin;[\s\S]*rollback;/iu);
  assert.doesNotMatch(source, /future\s+confirmed\s+run/iu);
  assert.match(source, /public\.drs_workspace_grant_v2/iu);
  assert.match(source, /public\.server_document_operation_v1/iu);
  assert.match(source, /Promise\.all/iu);
  assert.match(source, /IDEMPOTENCY_CONFLICT/iu);
  assert.match(source, /VERSION_CONFLICT/iu);
  assert.match(source, /document_version_sources/iu);
  assert.match(source, /document_orphan_cleanup_work_items/iu);
  assert.match(source, /DRS_DOCUMENT_REAL_PG_PASSWORD/u);
  assert.match(source, /assert\.equal\(parsed\.username, "postgres"\)/u);
  assert.match(
    source,
    /finalize_idempotency_key[\s\S]*?server_document_operation_v1[\s\S]*?REAL_PG_SCHEMA_DRIFT/iu,
  );
  assert.match(
    source,
    new RegExp(["not p.pol", "permissive"].join(""), "iu"),
  );
  assert.match(
    source,
    new RegExp(["a15_adversarial_", "permissive_allow"].join(""), "iu"),
  );
  assert.match(
    source,
    new RegExp(["ex", "plain[\\s\\S]*?filter: false"].join(""), "iu"),
  );
});

Deno.test("focused RED 3: disposable PostgreSQL gate is bound to the P2 migration", async () => {
  const sql = await Deno.readTextFile(MIGRATION_URL);
  assert.match(sql, /server_document_operation_v1/u);
  assert.match(sql, /force row level security/iu);
});

Deno.test({
  name:
    "real PostgreSQL: two users and two cases enforce RLS, grants, idempotency and concurrency",
  ignore: !REAL_PG_CONFIRMED,
  async fn() {
    const psqlPath = await optionalEnv("DRS_DOCUMENT_REAL_PSQL");
    const rawUrl = await optionalEnv("DRS_DOCUMENT_REAL_PG_URL");
    const pgPassword = await optionalEnv("DRS_DOCUMENT_REAL_PG_PASSWORD");
    assert.ok(
      psqlPath && /^[A-Za-z]:\\[^\r\n]+\\psql(?:\.exe)?$/iu.test(psqlPath),
      "absolute psql path required",
    );
    assert.ok(rawUrl, "DRS_DOCUMENT_REAL_PG_URL is required");
    assert.ok(
      pgPassword && pgPassword.length >= 8 && !/[\r\n]/u.test(pgPassword),
      "local disposable PostgreSQL password is required",
    );
    const parsed = new URL(rawUrl);
    assert.ok(["postgres:", "postgresql:"].includes(parsed.protocol));
    assert.ok(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname));
    assert.equal(parsed.username, "postgres");
    assert.equal(parsed.password, "");
    assert.equal(parsed.search, "");
    assert.match(parsed.pathname, /^\/a15_drs_document_[a-z0-9_]+$/u);
    const databaseUrl = parsed.toString();
    const migration = await Deno.readTextFile(MIGRATION_URL);

    try {
      const schemaIdentity = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          `select jsonb_build_object(
           'documents', to_regclass('casework.documents') is not null,
           'finalize_idempotency_key', exists (
             select 1 from information_schema.columns
             where table_schema = 'casework'
               and table_name = 'document_upload_intents'
               and column_name = 'finalize_idempotency_key'
           ),
           'server_document_operation_v1',
             to_regprocedure(
               'public.server_document_operation_v1(uuid,uuid,text,uuid,bigint,text,text,text,text)'
             ) is not null,
           'rpc_identity', exists (
             select 1 from pg_proc p
             where p.oid = to_regprocedure(
               'public.server_document_operation_v1(uuid,uuid,text,uuid,bigint,text,text,text,text)'
             )
               and pg_get_userbyid(p.proowner) = 'postgres'
               and not p.prosecdef
               and p.proconfig = array['search_path=""']
               and not has_function_privilege('anon', p.oid, 'EXECUTE')
               and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
               and has_function_privilege('service_role', p.oid, 'EXECUTE')
           ),
           'private_guard_identity', exists (
             select 1 from pg_proc p
             where p.oid = to_regprocedure(
               'casework.server_document_operation_locked_v1(uuid,uuid,text,uuid,bigint,text,text,text,text)'
             )
               and pg_get_userbyid(p.proowner) = 'postgres'
               and p.prosecdef
               and p.proconfig = array['search_path=""']
               and pg_get_functiondef(p.oid) like
                 '%drs_workspace_grant_assert_current_locked_v1%'
               and pg_get_functiondef(p.oid) like '%QUEUE_ORPHAN_CLEANUP%'
               and pg_get_functiondef(p.oid) like
                 '%convert_to(p_resource_ref, ''UTF8'')%'
           ),
           'storage_policy_identity', (
             select count(*) = 4
             from pg_policy p
             join pg_class c on c.oid = p.polrelid
             join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'storage' and c.relname = 'objects'
               and p.polname in (
                 'drs_document_intake_insert', 'drs_document_intake_select',
                 'drs_document_records_insert', 'drs_document_records_select'
               )
               and not p.polpermissive
               and p.polroles @> array[
                 (select oid from pg_roles where rolname = 'anon'),
                 (select oid from pg_roles where rolname = 'authenticated')
               ]::oid[]
               and cardinality(p.polroles) = 2
               and (
                 (p.polname like '%_insert' and p.polcmd = 'a'
                   and p.polqual is null
                   and pg_get_expr(p.polwithcheck, p.polrelid) = 'false')
                 or
                 (p.polname like '%_select' and p.polcmd = 'r'
                   and pg_get_expr(p.polqual, p.polrelid) = 'false'
                   and p.polwithcheck is null)
               )
           ),
           'typed_orphan_fk', exists (
             select 1
             from pg_constraint k
             join pg_class c on c.oid = k.confrelid
             join pg_namespace n on n.oid = c.relnamespace
             where k.conname = 'case_events_orphan_cleanup_work_item_fk'
               and n.nspname = 'casework'
               and c.relname = 'document_orphan_cleanup_work_items'
               and pg_get_constraintdef(k.oid) like
                 '%FOREIGN KEY (case_id, orphan_cleanup_work_item_id)%'
               and pg_get_constraintdef(k.oid) like
                 '%REFERENCES casework.document_orphan_cleanup_work_items(case_id, work_item_id)%'
           )
         );`,
        ),
      );
      if (!schemaIdentity.documents) {
        await psql(psqlPath, databaseUrl, migration);
      } else if (
        !schemaIdentity.finalize_idempotency_key ||
        !schemaIdentity.server_document_operation_v1 ||
        !schemaIdentity.rpc_identity ||
        !schemaIdentity.private_guard_identity ||
        !schemaIdentity.storage_policy_identity ||
        !schemaIdentity.typed_orphan_fk
      ) {
        throw new Error("REAL_PG_SCHEMA_DRIFT");
      }
      await psql(psqlPath, databaseUrl, SETUP_SQL);

      const catalogFacts = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          `select jsonb_build_object(
             'owner', pg_get_userbyid(p.proowner),
             'search_path', p.proconfig,
             'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
             'authenticated_execute', has_function_privilege(
               'authenticated', p.oid, 'EXECUTE'
             ),
             'service_execute', has_function_privilege(
               'service_role', p.oid, 'EXECUTE'
             ),
             'documents_force_rls', c.relforcerowsecurity,
              'storage_policy_count', (
                select count(*) from pg_policies where schemaname = 'storage'
                  and tablename = 'objects'
                  and policyname like 'drs_document_%'
              ),
              'storage_restrictive_policy_count', (
                select count(*)
                from pg_policy p
                join pg_class c on c.oid = p.polrelid
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'storage' and c.relname = 'objects'
                  and p.polname like 'drs_document_%'
                  and not p.polpermissive
              ),
             'typed_orphan_fk', exists (
               select 1 from pg_constraint
               where conname = 'case_events_orphan_cleanup_work_item_fk'
             )
           )
           from pg_proc p
           join pg_class c on c.oid = 'casework.documents'::regclass
           where p.oid =
             'public.server_document_operation_v1(uuid,uuid,text,uuid,bigint,text,text,text,text)'::regprocedure;`,
        ),
      );
      assert.equal(catalogFacts.owner, "postgres");
      assert.deepEqual(catalogFacts.search_path, ['search_path=""']);
      assert.equal(catalogFacts.anon_execute, false);
      assert.equal(catalogFacts.authenticated_execute, false);
      assert.equal(catalogFacts.service_execute, true);
      assert.equal(catalogFacts.documents_force_rls, true);
      assert.equal(catalogFacts.storage_policy_count, 4);
      assert.equal(catalogFacts.storage_restrictive_policy_count, 4);
      assert.equal(catalogFacts.typed_orphan_fk, true);

      const restrictivePlan = await psql(
        psqlPath,
        databaseUrl,
        `begin;
         grant select on storage.objects to authenticated;
         create policy a15_adversarial_permissive_allow
           on storage.objects as permissive for select to authenticated
           using (true);
         set local role authenticated;
         explain (costs off)
           select 1 from storage.objects
           where bucket_id = 'drs-case-intake-private';
         rollback;`,
      );
      assert.match(restrictivePlan, /Filter: false/iu);

      const directDml = await runPsql(
        psqlPath,
        databaseUrl,
        `begin; set local role authenticated;
         insert into casework.documents(
           id, case_id, document_ref, document_kind, visibility, source_role,
           document_status, created_by
         ) values (
           gen_random_uuid(), '${IDS.caseA}',
           'doc_01j6a8k9m4q2w3e4r5t6y7u8i9', 'drs_review',
           'DRS_INTERNAL', 'DRS', 'DRAFT', '${IDS.userA}'
         ); rollback;`,
      );
      assert.equal(directDml.success, false, "direct DML must be denied");

      const issued = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          `begin; set local role service_role;
           select public.drs_workspace_grant_v2(
             '${IDS.userA}', '${IDS.caseA}', '${SUBJECT_A}'
           ); commit;`,
        ),
      );
      assert.equal(issued.authorized, true);
      assert.match(issued.grant_version, /^[1-9]\d*$/u);

      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const createResource = JSON.stringify({
        schemaVersion: "laibe.drs-document-upload-intent.internal.v1",
        mode: "NEW_DOCUMENT",
        intentId: IDS.intent,
        intentRef: INTENT_REF,
        documentKind: "drs_review",
        originalFilename: "a15-disposable.pdf",
        declaredMime: "application/pdf",
        declaredSizeBytes: 12,
        declaredSha256:
          "e04d44ae182d4e7c3a0068e1883119ad68adabc6263bee839a86dbba1b50d7ea",
        objectKey: `intents/${IDS.intent}/${IDS.object}.pdf`,
        expiresAt,
      });
      const createDigest = await sha256(createResource);
      const created = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          operationSql(
            issued,
            "CREATE_UPLOAD_INTENT",
            createResource,
            "create-intent-a15-20260826",
            createDigest,
          ),
        ),
      );
      assert.equal(created.state, "UPLOAD_INTENT_CREATED");

      const crossCase = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          operationSql(
            issued,
            "CREATE_UPLOAD_INTENT",
            createResource,
            "cross-case-a15-20260826",
            createDigest,
          ).replaceAll(`'${IDS.caseA}'`, `'${IDS.caseB}'`),
        ),
      );
      assert.equal(crossCase.ok, false);
      assert.equal(crossCase.state, "CASE_NOT_AUTHORIZED");

      const finalizeRequest = JSON.stringify({
        schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
        intentRef: INTENT_REF,
        idempotencyKey: FINALIZE_KEY,
      });
      const finalizeDigest = await sha256(finalizeRequest);
      const firstPhase = operationSql(
        issued,
        "FINALIZE_UPLOAD",
        INTENT_REF,
        FINALIZE_KEY,
        finalizeDigest,
      );
      const [phaseA, phaseB] = await Promise.all([
        psql(psqlPath, databaseUrl, firstPhase),
        psql(psqlPath, databaseUrl, firstPhase),
      ]);
      assert.deepEqual(
        [jsonFrom(phaseA).state, jsonFrom(phaseB).state].sort(),
        ["VALIDATION_REQUIRED", "VALIDATION_REQUIRED"],
      );

      const differentKey = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          operationSql(
            issued,
            "FINALIZE_UPLOAD",
            INTENT_REF,
            "different-finalize-key-a15",
            finalizeDigest,
          ),
        ),
      );
      assert.equal(differentKey.state, "VERSION_CONFLICT");
      const differentPayload = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          operationSql(
            issued,
            "FINALIZE_UPLOAD",
            INTENT_REF,
            FINALIZE_KEY,
            "f".repeat(64),
          ),
        ),
      );
      assert.equal(differentPayload.state, "IDEMPOTENCY_CONFLICT");

      const recordsObjectKey = jsonFrom(phaseA).records_object_key;
      const orphanResource = JSON.stringify({
        schemaVersion: "laibe.drs-document-orphan-cleanup.internal.v1",
        intentRef: INTENT_REF,
        recordsBucket: "drs-case-records-private",
        recordsObjectKey,
      });
      const orphan = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          operationSql(
            issued,
            "QUEUE_ORPHAN_CLEANUP",
            orphanResource,
            "queue-orphan-a15-20260826",
            await sha256(orphanResource),
          ),
        ),
      );
      assert.equal(orphan.state, "ORPHAN_CLEANUP_QUEUED");

      const formalResource = JSON.stringify({
        schemaVersion: "laibe.drs-document-finalize.internal.v1",
        intentRef: INTENT_REF,
        recordsBucket: "drs-case-records-private",
        recordsObjectKey,
        requestPayloadSha256: finalizeDigest,
        verifiedSha256:
          "e04d44ae182d4e7c3a0068e1883119ad68adabc6263bee839a86dbba1b50d7ea",
        verifiedSizeBytes: 12,
        detectedMime: "application/pdf",
      });
      const formalSql = operationSql(
        issued,
        "FINALIZE_UPLOAD",
        formalResource,
        FINALIZE_KEY,
        await sha256(formalResource),
      );
      const [winnerA, winnerB] = await Promise.all([
        psql(psqlPath, databaseUrl, formalSql),
        psql(psqlPath, databaseUrl, formalSql),
      ]);
      const winnerStates = [jsonFrom(winnerA).state, jsonFrom(winnerB).state];
      assert.equal(
        winnerStates.filter((state) => state === "FORMAL_VERSION_CREATED")
          .length,
        1,
        "concurrent finalize must have one winner",
      );
      assert.equal(
        winnerStates.filter((state) => state === "VALIDATION_MISMATCH").length,
        1,
      );

      const sourceFacts = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          `select jsonb_build_object(
             'source_count', (select count(*) from casework.document_version_sources
               where case_id = '${IDS.caseA}'),
             'typed_orphan_count', (select count(*) from casework.case_events
               where case_id = '${IDS.caseA}'
                 and event_type = 'DOCUMENT_ORPHAN_CLEANUP_QUEUED'
                 and orphan_cleanup_work_item_id is not null)
           );`,
        ),
      );
      assert.equal(sourceFacts.source_count, 1);
      assert.equal(sourceFacts.typed_orphan_count, 1);

      const secondSource = await runPsql(
        psqlPath,
        databaseUrl,
        `begin;
         insert into casework.document_version_sources(
           case_id, document_id, version_id, bucket_id, object_key, sha256,
           size_bytes, detected_mime, validation_state
         ) select case_id, document_id, version_id, bucket_id,
           object_key || '.duplicate', sha256, size_bytes, detected_mime,
           validation_state
         from casework.document_version_sources where case_id = '${IDS.caseA}';
         rollback;`,
      );
      assert.equal(
        secondSource.success,
        false,
        "second canonical source denied",
      );

      const zeroSource = await runPsql(
        psqlPath,
        databaseUrl,
        `begin;
         insert into casework.documents(
           id, case_id, document_ref, document_kind, visibility, source_role,
           document_status, created_by
         ) values (
           '${IDS.zeroDocument}', '${IDS.caseA}',
           'doc_01j6a8k9m4q2w3e4r5t6y7u8i0', 'drs_review',
           'DRS_INTERNAL', 'DRS', 'ACTIVE', '${IDS.userA}'
         );
         insert into casework.document_versions(
           id, case_id, document_id, version_ref, version_no, created_by,
           sha256, size_bytes, detected_mime, validation_state,
           lifecycle_state, idempotency_key, payload_sha256
         ) values (
           '${IDS.zeroVersion}', '${IDS.caseA}', '${IDS.zeroDocument}',
           'dvr_01j6a8k9m4q2w3e4r5t6y7u8i0', 1, '${IDS.userA}',
           repeat('0',64), 1, 'application/pdf', 'FORMAL', 'ACTIVE',
           'zero-source-a15-20260826', repeat('0',64)
         );
         set constraints all immediate;
         rollback;`,
      );
      assert.equal(zeroSource.success, false, "zero canonical source denied");

      await psql(
        psqlPath,
        databaseUrl,
        `update casework.cases set case_status = 'on_hold'
         where id = '${IDS.caseA}';`,
      );
      const stale = jsonFrom(
        await psql(
          psqlPath,
          databaseUrl,
          operationSql(
            issued,
            "DOWNLOAD_VERSION",
            "dvr_01j6a8k9m4q2w3e4r5t6y7u8i9",
            "stale-grant-a15-20260826",
            "0".repeat(64),
          ),
        ),
      );
      assert.equal(stale.ok, false, "stale grant denial");
      assert.equal(stale.state, "CASE_NOT_AUTHORIZED");
    } finally {
      await psql(psqlPath, databaseUrl, CLEANUP_SQL);
    }
  },
});
