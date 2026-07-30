import { PGlite } from "npm:@electric-sql/pglite@0.5.4";
import { assertEquals } from "jsr:@std/assert@1.0.14";

type SqlBundle = {
  repo_root: string;
  migrations: Array<{
    name: string;
    sql: string;
  }>;
  contracts: {
    deployment_contract: string;
    remote_domain_rls_contract: string;
    remote_casework_rls_contract: string;
    remote_active_session_contract: string;
    remote_event_next_action_contract: string;
    remote_woodwork_contract: string;
    remote_unified_items_contract: string;
    rpc_surface_contract: string;
    core_preflight: string;
    core_bundle: string;
    core_verify: string;
    core_rollback: string;
  };
};

async function readSqlBundle(): Promise<SqlBundle> {
  const serialized = await new Response(Deno.stdin.readable).text();
  if (!serialized.trim()) {
    throw new Error(
      "SQL bundle is required on stdin; use run_pglite_unc_safe.ps1",
    );
  }

  const migrations: SqlBundle["migrations"] = [];
  const contracts: Partial<SqlBundle["contracts"]> = {};
  let repoRoot = "";
  let sawEnd = false;
  const contractNames = new Set<keyof SqlBundle["contracts"]>([
    "deployment_contract",
    "remote_domain_rls_contract",
    "remote_casework_rls_contract",
    "remote_active_session_contract",
    "remote_event_next_action_contract",
    "remote_woodwork_contract",
    "remote_unified_items_contract",
    "rpc_surface_contract",
    "core_preflight",
    "core_bundle",
    "core_verify",
    "core_rollback",
  ]);

  for (const line of serialized.split(/\r?\n/)) {
    if (!line) continue;
    if (line === "END") {
      sawEnd = true;
      continue;
    }

    const fields = line.split("\t");
    if (fields[0] === "ROOT" && fields.length === 2) {
      repoRoot = fields[1];
      continue;
    }
    if (
      (fields[0] === "M" || fields[0] === "C") &&
      fields.length === 3
    ) {
      const binary = atob(fields[2]);
      const bytes = Uint8Array.from(
        binary,
        (character) => character.charCodeAt(0),
      );
      const sql = new TextDecoder().decode(bytes);
      if (fields[0] === "M") {
        migrations.push({ name: fields[1], sql });
      } else {
        const contractName = fields[1] as keyof SqlBundle["contracts"];
        if (!contractNames.has(contractName) || contractName in contracts) {
          throw new Error(`Unknown or duplicate SQL contract: ${fields[1]}`);
        }
        contracts[contractName] = sql;
      }
      continue;
    }
    throw new Error("Malformed SQL bundle line");
  }

  const missingContracts = [...contractNames].filter((name) =>
    !(name in contracts)
  );
  const bundle = {
    repo_root: repoRoot,
    migrations,
    contracts: contracts as SqlBundle["contracts"],
  };
  if (
    !sawEnd ||
    !/^[A-Za-z]:\\/.test(bundle.repo_root) ||
    bundle.repo_root.startsWith("\\\\") ||
    !Array.isArray(bundle.migrations) ||
    bundle.migrations.length === 0 ||
    missingContracts.length > 0
  ) {
    throw new Error("SQL bundle root or migration list is invalid");
  }
  return bundle;
}

const supabasePrelude = `
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  banned_until timestamptz
);
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz,
  updated_at timestamptz,
  not_after timestamptz
);
create function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;
create function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.jwt() to authenticated;
grant execute on function auth.uid() to authenticated;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner uuid
);
create function storage.foldername(text)
returns text[]
language sql
immutable
as $$ select string_to_array($1, '/') $$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
`;

const sqlBundle = await readSqlBundle();

Deno.test("PCM knowledge migration executes in isolated PostgreSQL", async () => {
  const bundle = sqlBundle;
  const database = new PGlite();
  try {
    await database.exec(supabasePrelude);
    const migrations = [...bundle.migrations].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const hardeningName =
      "20260727193000_pcm_knowledge_rpc_surface_hardening.sql";
    const hardening = migrations.find((item) => item.name === hardeningName);
    if (!hardening) {
      throw new Error(`Missing migration: ${hardeningName}`);
    }
    for (
      const migration of migrations.filter(
        (item) => item.name < hardeningName,
      )
    ) {
      await database.exec(migration.sql);
    }

    // Preserve the original direct-table RLS regression suite before the final
    // RPC-only migration removes all browser-role table privileges.
    await database.exec(bundle.contracts.deployment_contract);
    await database.exec(bundle.contracts.remote_domain_rls_contract);
    await database.exec(bundle.contracts.remote_casework_rls_contract);
    await database.exec(bundle.contracts.remote_active_session_contract);
    await database.exec(bundle.contracts.remote_event_next_action_contract);
    await database.exec(bundle.contracts.remote_woodwork_contract);
    await database.exec(bundle.contracts.remote_unified_items_contract);

    await database.exec(hardening.sql);
    for (
      const migration of migrations.filter(
        (item) => item.name > hardeningName,
      )
    ) {
      await database.exec(migration.sql);
    }

    const result = await database.query<{
      schema_name: string;
      table_count: number;
    }>(`
      select
        n.nspname as schema_name,
        count(*)::integer as table_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('knowledge_staging', 'knowledge', 'casework')
        and c.relkind = 'r'
      group by n.nspname
      order by n.nspname
    `);

    assertEquals(result.rows, [
      { schema_name: "casework", table_count: 12 },
      { schema_name: "knowledge", table_count: 11 },
      { schema_name: "knowledge_staging", table_count: 5 },
    ]);

    await database.exec(bundle.contracts.rpc_surface_contract);

    const actorId = "99000000-0000-4000-8000-000000000001";
    const sessionId = "99000000-0000-4000-8000-000000000011";
    await database.exec(`
      insert into auth.users (id, raw_app_meta_data)
      values (
        '${actorId}',
        '{"display_name":"林覆核"}'::jsonb
      );
      insert into auth.sessions (
        id,
        user_id,
        created_at,
        updated_at,
        not_after
      )
      values (
        '${sessionId}',
        '${actorId}',
        now(),
        now(),
        now() + interval '1 day'
      );
      select set_config(
        'request.jwt.claims',
        '{"sub":"${actorId}","session_id":"${sessionId}","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
        false
      );
    `);

    const initialPayload = {
      schema_version: "knowledge_studio.v1",
      domain: "drawing_review",
      slug: "source-revision-flow",
      title: "圖說來源追溯",
      summary: "",
      content: {
        displayType: "圖說檢查規則",
        owner: "PCM 圖說組",
        criteria: "",
        nextOwner: "PCM 覆核人",
      },
      evidence_summary: [],
      source: {
        source_type: "manual_reference",
        title: "圖說來源追溯",
        source_locator: "knowledge-studio:圖說來源追溯",
        source_sha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        provenance: { enteredFrom: "knowledge_studio" },
      },
      rule: {
        ruleType: "drawing_rule",
        ruleCode: "drawing-source-revision",
        ruleKind: "cross_sheet_consistency",
        pageTypes: ["pdf"],
        conditions: { criteria: "" },
        findingTemplate: "列為待確認並指出圖頁位置。",
        supplementTemplate: "請補充可核對的圖頁或說明。",
      },
      change_note: "",
    };
    let created;
    try {
      created = await database.query<{
        result: {
          entryId: string;
          versionId: string;
          sourceId: string;
        };
      }>(
        "select public.knowledge_studio_create_draft($1::jsonb) as result",
        [JSON.stringify(initialPayload)],
      );
    } catch (error) {
      throw new Error(
        `create draft source fixture failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const draft = created.rows[0].result;

    const completedPayload = {
      ...initialPayload,
      summary: "核對圖號、版次與來源頁面。",
      content: {
        ...initialPayload.content,
        criteria: "每項檢查都要保留圖號、版次與頁面定位。",
      },
      evidence_summary: ["乙方施工圖 A-101，第 3 頁"],
      source: {
        source_type: "pdf_evidence",
        title: "乙方施工圖 A-101",
        source_locator: "case/CASE-001/A-101/page-3",
        source_sha256:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        provenance: {
          enteredFrom: "knowledge_studio",
          pageNumber: 3,
        },
      },
      rule: {
        ...initialPayload.rule,
        conditions: {
          criteria: "每項檢查都要保留圖號、版次與頁面定位。",
        },
      },
      change_note: "補齊乙方圖說來源",
    };
    let submitted;
    try {
      submitted = await database.query<{
        result: { lifecycleState: string; sourceId: string };
      }>(
        `select public.knowledge_studio_save_and_submit(
          $1::uuid,
          $2::uuid,
          $3::jsonb,
          '送交來源覆核'
        ) as result`,
        [draft.entryId, draft.versionId, JSON.stringify(completedPayload)],
      );
    } catch (error) {
      throw new Error(
        `submit revised source fixture failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    assertEquals(submitted.rows[0].result.lifecycleState, "pending_review");
    if (submitted.rows[0].result.sourceId === draft.sourceId) {
      throw new Error("Draft version did not bind a new immutable source");
    }

    await database.query(
      `select public.knowledge_publish_entry_version(
        $1::uuid,
        $2::uuid,
        '人工確認來源後發布'
      )`,
      [draft.entryId, draft.versionId],
    );

    const sourceTrace = await database.query<{
      source_count: number;
      bound_locator: string;
      old_source_preserved: boolean;
    }>(
      `select
        (select count(*)::integer from knowledge.sources) as source_count,
        s.source_location as bound_locator,
        exists (
          select 1
          from knowledge.sources old_source
          where old_source.id = $3::uuid
            and old_source.source_location =
              'knowledge-studio:圖說來源追溯'
        ) as old_source_preserved
      from knowledge.entry_versions ev
      join knowledge.sources s on s.id = ev.source_id
      where ev.entry_id = $1::uuid
        and ev.id = $2::uuid`,
      [draft.entryId, draft.versionId, draft.sourceId],
    );
    assertEquals(sourceTrace.rows, [{
      source_count: 2,
      bound_locator: "case/CASE-001/A-101/page-3",
      old_source_preserved: true,
    }]);

    const gateway = await database.query<{
      result: {
        source: { sourceId: string; location: string };
      };
    }>(
      "select public.gateway_get_knowledge_entry($1::uuid) as result",
      [draft.entryId],
    );
    assertEquals(
      gateway.rows[0].result.source.sourceId,
      submitted.rows[0].result.sourceId,
    );
    assertEquals(
      gateway.rows[0].result.source.location,
      "case/CASE-001/A-101/page-3",
    );

    const studio = await database.query<{
      result: {
        events: Array<{
          actorId: string;
          actorLabel: string;
          actorRole: string;
          eventType: string;
          sourceDocument: string;
        }>;
      };
    }>(
      "select public.knowledge_studio_get($1::uuid) as result",
      [draft.entryId],
    );
    assertEquals(
      studio.rows[0].result.events.every((event) =>
        event.actorId === actorId &&
        event.actorLabel === "林覆核" &&
        event.actorRole === "pcm"
      ),
      true,
    );
    assertEquals(
      studio.rows[0].result.events.find((event) =>
        event.eventType === "draft_created"
      )?.sourceDocument,
      "knowledge-studio:圖說來源追溯",
    );
    assertEquals(
      studio.rows[0].result.events.find((event) =>
        event.eventType === "draft_updated"
      )?.sourceDocument,
      "case/CASE-001/A-101/page-3",
    );
    const identity = await database.query<{
      result: {
        actorId: string;
        actorLabel: string;
        actorRole: string;
        formalImpact: string;
      };
    }>(
      "select public.knowledge_studio_session_context() as result",
    );
    assertEquals(identity.rows, [{
      result: {
        actorId,
        actorLabel: "林覆核",
        actorRole: "pcm",
        formalImpact: "none",
      },
    }]);

    const caseId = "99000000-0000-4000-8000-000000000101";
    const documentId = "99000000-0000-4000-8000-000000000151";
    const documentVersionId = "99000000-0000-4000-8000-000000000161";
    await database.exec(`
      insert into casework.cases (id, title, created_by)
      values ('${caseId}', 'A14 adapter contract fixture', '${actorId}');
      insert into casework.case_members (case_id, user_id, role, added_by)
      values ('${caseId}', '${actorId}', 'pcm', '${actorId}');
      insert into casework.case_member_workstreams (
        case_id,
        user_id,
        workstream_type,
        granted_by
      )
      values ('${caseId}', '${actorId}', 'design', '${actorId}');
      insert into casework.documents (
        id,
        case_id,
        source_document_id,
        title,
        vault_sha256,
        uploaded_by
      )
      values (
        '${documentId}',
        '${caseId}',
        'A14-PDF-001',
        '乙方施工圖',
        'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        '${actorId}'
      );
      insert into casework.document_versions (
        id,
        document_id,
        version_number,
        storage_object_path,
        sha256,
        mime_type,
        size_bytes,
        created_by
      )
      values (
        '${documentVersionId}',
        '${documentId}',
        1,
        '${caseId}/drawing/A14-PDF-001/v1.pdf',
        'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        'application/pdf',
        2048,
        '${actorId}'
      );
    `);

    const workstreams = await database.query<{
      design: boolean;
      construction: boolean;
    }>(
      `select
        casework.has_current_case_workstream($1::uuid, 'design') as design,
        casework.has_current_case_workstream($1::uuid, 'construction')
          as construction`,
      [caseId],
    );
    assertEquals(workstreams.rows, [{
      design: true,
      construction: false,
    }]);

    let immutableUpdateRejected = false;
    try {
      await database.query(
        `update casework.document_versions
        set size_bytes = 4096
        where id = $1::uuid`,
        [documentVersionId],
      );
    } catch {
      immutableUpdateRejected = true;
    }
    assertEquals(immutableUpdateRejected, true);

    const reconciliation = migrations.find((item) =>
      item.name.endsWith("_studio_traceability_a14_core_reconciliation.sql")
    );
    if (!reconciliation) {
      throw new Error("Missing A14 traceability reconciliation migration");
    }
    await database.exec(reconciliation.sql);
    const rerunState = await database.query<{
      version_count: number;
      workstream_count: number;
    }>(`
      select
        (select count(*)::integer from casework.document_versions)
          as version_count,
        (select count(*)::integer from casework.case_member_workstreams)
          as workstream_count
    `);
    assertEquals(rerunState.rows, [{
      version_count: 1,
      workstream_count: 1,
    }]);

    const unindexedForeignKeys = await database.query<{
      schema_name: string;
      table_name: string;
      column_name: string;
    }>(`
      select
        n.nspname as schema_name,
        t.relname as table_name,
        a.attname as column_name
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = c.conkey[1]
      where c.contype = 'f'
        and n.nspname in ('knowledge_staging', 'knowledge', 'casework')
        and not exists (
          select 1
          from pg_index i
          where i.indrelid = c.conrelid
            and i.indisvalid
            and i.indisready
            and (i.indkey::smallint[])[0] = c.conkey[1]
        )
      order by n.nspname, t.relname, a.attname
    `);

    assertEquals(unindexedForeignKeys.rows, []);
  } finally {
    await database.close();
  }
});

Deno.test("LaiBE Core reconciliation is collision-safe and reversible", async () => {
  const bundle = sqlBundle;

  const collisionDatabase = new PGlite();
  try {
    await collisionDatabase.exec(supabasePrelude);
    await collisionDatabase.exec(`
      create table public.core_non_a5_sentinel (
        id integer primary key,
        note text not null
      );
      insert into public.core_non_a5_sentinel values (1, 'preserve');
      create schema knowledge;
    `);

    let collisionRejected = false;
    try {
      await collisionDatabase.exec(bundle.contracts.core_bundle);
    } catch {
      collisionRejected = true;
      await collisionDatabase.exec("rollback;");
    }
    assertEquals(collisionRejected, true);

    const collisionState = await collisionDatabase.query<{
      knowledge_exists: boolean;
      staging_exists: boolean;
      casework_exists: boolean;
      marker_exists: boolean;
      sentinel_note: string;
    }>(`
      select
        to_regnamespace('knowledge') is not null as knowledge_exists,
        to_regnamespace('knowledge_staging') is not null as staging_exists,
        to_regnamespace('casework') is not null as casework_exists,
        to_regclass('public.a5_knowledge_reconciliation_marker') is not null
          as marker_exists,
        (select note from public.core_non_a5_sentinel where id = 1)
          as sentinel_note
    `);
    assertEquals(collisionState.rows, [{
      knowledge_exists: true,
      staging_exists: false,
      casework_exists: false,
      marker_exists: false,
      sentinel_note: "preserve",
    }]);
  } finally {
    await collisionDatabase.close();
  }

  const applyDatabase = new PGlite();
  try {
    await applyDatabase.exec(supabasePrelude);
    await applyDatabase.exec(`
      create table public.core_non_a5_sentinel (
        id integer primary key,
        note text not null
      );
      insert into public.core_non_a5_sentinel values (1, 'preserve');
    `);
    await applyDatabase.exec(bundle.contracts.core_preflight);
    await applyDatabase.exec(bundle.contracts.core_bundle);
    await applyDatabase.exec(bundle.contracts.core_verify);

    const markerState = await applyDatabase.query<{
      schema_marker: string;
      public_marker_exists: boolean;
    }>(`
      select
        obj_description(
          to_regnamespace('knowledge'),
          'pg_namespace'
        ) as schema_marker,
        to_regclass('public.a5_knowledge_reconciliation_marker') is not null
          as public_marker_exists
    `);
    assertEquals(markerState.rows, [{
      schema_marker:
        "a5.knowledge_foundation.core_readiness.v1;target=zdwuyomhswjcbbpbhpcq",
      public_marker_exists: false,
    }]);

    const appliedState = await applyDatabase.query<{
      schema_name: string;
      table_count: number;
    }>(`
      select
        n.nspname as schema_name,
        count(*)::integer as table_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('knowledge_staging', 'knowledge', 'casework')
        and c.relkind = 'r'
      group by n.nspname
      order by n.nspname
    `);
    assertEquals(appliedState.rows, [
      { schema_name: "casework", table_count: 12 },
      { schema_name: "knowledge", table_count: 11 },
      { schema_name: "knowledge_staging", table_count: 5 },
    ]);

    let repeatApplyRejected = false;
    try {
      await applyDatabase.exec(bundle.contracts.core_preflight);
    } catch {
      repeatApplyRejected = true;
    }
    assertEquals(repeatApplyRejected, true);

    const repeatApplyState = await applyDatabase.query<{
      schema_marker: string;
      sentinel_note: string;
    }>(`
      select
        obj_description(
          to_regnamespace('knowledge'),
          'pg_namespace'
        ) as schema_marker,
        (select note from public.core_non_a5_sentinel where id = 1)
          as sentinel_note
    `);
    assertEquals(repeatApplyState.rows, [{
      schema_marker:
        "a5.knowledge_foundation.core_readiness.v1;target=zdwuyomhswjcbbpbhpcq",
      sentinel_note: "preserve",
    }]);

    await applyDatabase.exec(`
      create view public.a5_external_dependency as
      select count(*)::bigint as entry_count
      from knowledge.entries;
    `);
    let dependencyRollbackRejected = false;
    try {
      await applyDatabase.exec(bundle.contracts.core_rollback);
    } catch {
      dependencyRollbackRejected = true;
      await applyDatabase.exec("rollback;");
    }
    assertEquals(dependencyRollbackRejected, true);

    const dependencyState = await applyDatabase.query<{
      knowledge_exists: boolean;
      external_view_exists: boolean;
      sentinel_note: string;
    }>(`
      select
        to_regnamespace('knowledge') is not null as knowledge_exists,
        to_regclass('public.a5_external_dependency') is not null
          as external_view_exists,
        (select note from public.core_non_a5_sentinel where id = 1)
          as sentinel_note
    `);
    assertEquals(dependencyState.rows, [{
      knowledge_exists: true,
      external_view_exists: true,
      sentinel_note: "preserve",
    }]);

    await applyDatabase.exec("drop view public.a5_external_dependency;");
    await applyDatabase.exec(bundle.contracts.core_rollback);
    const rolledBackState = await applyDatabase.query<{
      knowledge_exists: boolean;
      staging_exists: boolean;
      casework_exists: boolean;
      marker_exists: boolean;
      sentinel_note: string;
    }>(`
      select
        to_regnamespace('knowledge') is not null as knowledge_exists,
        to_regnamespace('knowledge_staging') is not null as staging_exists,
        to_regnamespace('casework') is not null as casework_exists,
        to_regclass('public.a5_knowledge_reconciliation_marker') is not null
          as marker_exists,
        (select note from public.core_non_a5_sentinel where id = 1)
          as sentinel_note
    `);
    assertEquals(rolledBackState.rows, [{
      knowledge_exists: false,
      staging_exists: false,
      casework_exists: false,
      marker_exists: false,
      sentinel_note: "preserve",
    }]);
  } finally {
    await applyDatabase.close();
  }
});

Deno.test(
  "A14 reconciliation rejects compatible-looking tables without constraints",
  async () => {
    const database = new PGlite();
    try {
      await database.exec(supabasePrelude);
      const migrations = [...sqlBundle.migrations].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      const reconciliationIndex = migrations.findIndex((migration) =>
        migration.name ===
          "20260728050639_studio_traceability_a14_core_reconciliation.sql"
      );
      assertEquals(reconciliationIndex > 0, true);

      for (const migration of migrations.slice(0, reconciliationIndex)) {
        await database.exec(migration.sql);
      }

      await database.exec(`
        create table casework.document_versions (
          id uuid,
          document_id uuid,
          version_number integer,
          storage_object_path text,
          sha256 text,
          mime_type text,
          size_bytes bigint,
          revision_metadata jsonb,
          created_by uuid,
          created_at timestamptz,
          formal_impact text
        );
        create table casework.case_member_workstreams (
          case_id uuid,
          user_id uuid,
          workstream_type text,
          granted_by uuid,
          granted_at timestamptz
        );
      `);

      let rejected = false;
      try {
        await database.exec(migrations[reconciliationIndex].sql);
      } catch {
        rejected = true;
      }
      assertEquals(rejected, true);
    } finally {
      await database.close();
    }
  },
);
