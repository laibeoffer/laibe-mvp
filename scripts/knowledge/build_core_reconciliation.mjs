import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  splitSqlStatements,
  unwrapOuterTransaction,
} from "./split_supabase_migration.mjs";

export const EXPECTED_MIGRATIONS = Object.freeze([
  "20260726000100_pcm_knowledge_foundation.sql",
  "20260727070737_pcm_knowledge_domain_rls_hardening.sql",
  "20260727072627_pcm_knowledge_active_session_hardening.sql",
  "20260727094259_knowledge_case_event_next_action.sql",
  "20260727161457_pcm_woodwork_candidates_staging.sql",
  "20260727193000_pcm_knowledge_rpc_surface_hardening.sql",
  "20260728050639_studio_traceability_a14_core_reconciliation.sql",
]);

const BUNDLE_ID = "a5.knowledge_foundation.core_readiness.v1";
const TARGET_PROJECT_REF = "zdwuyomhswjcbbpbhpcq";
const SCHEMA_MARKER = `${BUNDLE_ID};target=${TARGET_PROJECT_REF}`;

const PUBLIC_RPC_SIGNATURES = Object.freeze([
  "public.gateway_search_knowledge(text, text, integer)",
  "public.gateway_get_knowledge_entry(uuid)",
  "public.gateway_get_case_evidence(uuid)",
  "public.gateway_record_finding(uuid, jsonb)",
  "public.knowledge_ingest_batch(jsonb)",
  "public.knowledge_ingest_woodwork_batch(jsonb)",
  "public.knowledge_studio_list(text, text, integer)",
  "public.knowledge_studio_get(uuid)",
  "public.knowledge_studio_session_context()",
  "public.knowledge_studio_create_draft(jsonb)",
  "public.knowledge_studio_update_draft(uuid, uuid, jsonb)",
  "public.knowledge_studio_create_revision(uuid, jsonb, text)",
  "public.knowledge_studio_save_and_submit(uuid, uuid, jsonb, text)",
  "public.knowledge_submit_for_review(uuid, uuid, text)",
  "public.knowledge_return_to_draft(uuid, uuid, text)",
  "public.knowledge_publish_entry_version(uuid, uuid, text)",
  "public.knowledge_retire_entry(uuid, text)",
]);

const PUBLIC_RPC_NAMES = PUBLIC_RPC_SIGNATURES.map((signature) =>
  signature.slice("public.".length, signature.indexOf("("))
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeUtf8(path, content) {
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  writeFileSync(path, normalized, "utf8");
  return {
    path: relative(resolve(path, "..", ".."), path).replaceAll("\\", "/"),
    bytes: Buffer.byteLength(normalized),
    sha256: sha256(Buffer.from(normalized, "utf8")),
  };
}

export function validateMigrationSet(names) {
  if (
    names.length !== EXPECTED_MIGRATIONS.length ||
    names.some((name, index) => name !== EXPECTED_MIGRATIONS[index])
  ) {
    throw new Error(
      `Unexpected migration set. Expected: ${EXPECTED_MIGRATIONS.join(", ")}`,
    );
  }
}

function preflightSql() {
  const rpcNames = PUBLIC_RPC_NAMES.map((name) => `'${name}'`).join(",\n      ");
  return `-- Read-only collision gate for ${BUNDLE_ID}.
do $a5_preflight$
begin
  if to_regnamespace('knowledge_staging') is not null
    or to_regnamespace('knowledge') is not null
    or to_regnamespace('casework') is not null then
    raise exception
      'A5 schema collision detected; this create-only bundle cannot be applied twice';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        ${rpcNames}
      )
  ) then
    raise exception 'A5 public RPC collision detected';
  end if;

  if exists (
    select 1
    from storage.buckets
    where id in ('knowledge-source-private', 'case-documents-private')
  ) then
    raise exception 'A5 Storage bucket collision detected';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'knowledge_source_reviewer_read',
        'knowledge_source_reviewer_insert',
        'case_document_member_read',
        'case_document_member_insert',
        'a5_storage_read_guard',
        'a5_storage_insert_guard',
        'a5_storage_update_guard',
        'a5_storage_delete_guard'
      )
  ) then
    raise exception 'A5 Storage policy collision detected';
  end if;
end;
$a5_preflight$;`;
}

function bundleSql(components, preflight) {
  const body = components
    .map((component) => {
      const statements = unwrapOuterTransaction(
        splitSqlStatements(component.sql),
      );
      return [
        `-- Source: ${component.name}`,
        `-- SHA-256: ${component.sha256}`,
        statements.join("\n\n"),
      ].join("\n");
    })
    .join("\n\n");
  return `-- Generated ordered reconciliation bundle.
-- Target project reference: ${TARGET_PROJECT_REF}
-- This file has not been applied to any remote Supabase project.
begin;

-- 000_preflight.sql
${preflight}

${body}

comment on schema knowledge is '${SCHEMA_MARKER}';

commit;`;
}

function verificationSql() {
  const rpcNames = PUBLIC_RPC_NAMES.map((name) => `'${name}'`).join(",\n      ");
  return `-- Read-only post-apply verification for ${BUNDLE_ID}.
-- Running this file does not apply or modify the reconciliation bundle.
select
  obj_description(
    to_regnamespace('knowledge'),
    'pg_namespace'
  ) as reconciliation_marker;

select
  n.nspname as schema_name,
  count(*)::integer as table_count,
  count(*) filter (where c.relrowsecurity)::integer as rowsecurity_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('knowledge_staging', 'knowledge', 'casework')
  and c.relkind in ('r', 'p')
group by n.nspname
order by n.nspname;

select
  grantee,
  table_schema,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema in ('knowledge_staging', 'knowledge', 'casework')
  and grantee in ('anon', 'authenticated')
order by grantee, table_schema, table_name, privilege_type;

select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    ${rpcNames}
  )
order by routine_name;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    as authenticated_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('knowledge_staging', 'knowledge', 'casework', 'public')
  and (
    n.nspname <> 'public'
    or p.proname in (
      ${rpcNames}
    )
  )
order by n.nspname, p.proname, arguments;

select
  id,
  public
from storage.buckets
where id in ('knowledge-source-private', 'case-documents-private')
order by id;

select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'knowledge_source_reviewer_read',
    'knowledge_source_reviewer_insert',
    'case_document_member_read',
    'case_document_member_insert',
    'a5_storage_read_guard',
    'a5_storage_insert_guard',
    'a5_storage_update_guard',
    'a5_storage_delete_guard'
  )
order by policyname;`;
}

function rollbackSql() {
  const dropFunctions = [...PUBLIC_RPC_SIGNATURES]
    .reverse()
    .map((signature) => `drop function if exists ${signature};`)
    .join("\n");
  return `-- Guarded rollback for ${BUNDLE_ID}.
-- Do not run without a new A0/Owner approval and a verified backup.
begin;

do $a5_rollback_gate$
declare
  v_table record;
  v_has_rows boolean;
begin
  if to_regnamespace('knowledge_staging') is null
    or to_regnamespace('knowledge') is null
    or to_regnamespace('casework') is null then
    raise exception 'A5 schema set is incomplete; rollback stopped';
  end if;

  if obj_description(
    to_regnamespace('knowledge'),
    'pg_namespace'
  ) <> '${SCHEMA_MARKER}' then
    raise exception 'Matching A5 reconciliation marker is required';
  end if;

  for v_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('knowledge_staging', 'knowledge', 'casework')
      and c.relkind in ('r', 'p')
    order by n.nspname, c.relname
  loop
    execute format(
      'select exists (select 1 from %I.%I limit 1)',
      v_table.schema_name,
      v_table.table_name
    )
    into v_has_rows;
    if v_has_rows then
      raise exception
        'A5 table %.% contains data; rollback stopped',
        v_table.schema_name,
        v_table.table_name;
    end if;
  end loop;

  if exists (
    select 1
    from storage.objects
    where bucket_id in (
      'knowledge-source-private',
      'case-documents-private'
    )
  ) then
    raise exception
      'A5 Storage data exists; rollback stopped';
  end if;
end;
$a5_rollback_gate$;

drop policy if exists knowledge_source_reviewer_read on storage.objects;
drop policy if exists knowledge_source_reviewer_insert on storage.objects;
drop policy if exists case_document_member_read on storage.objects;
drop policy if exists case_document_member_insert on storage.objects;
drop policy if exists a5_storage_read_guard on storage.objects;
drop policy if exists a5_storage_insert_guard on storage.objects;
drop policy if exists a5_storage_update_guard on storage.objects;
drop policy if exists a5_storage_delete_guard on storage.objects;

delete from storage.buckets
where id in ('knowledge-source-private', 'case-documents-private');

${dropFunctions}

-- Remove A5-owned foreign keys and expression constraints before their helper
-- functions. Primary, unique and not-null constraints can leave with their
-- table. A foreign key owned by a non-A5 table is intentionally not touched
-- and makes a later DROP TABLE ... RESTRICT fail the whole transaction.
do $a5_drop_owned_constraints$
declare
  v_constraint record;
begin
  for v_constraint in
    select
      owner_namespace.nspname as schema_name,
      owner_table.relname as table_name,
      constraint_record.conname as constraint_name,
      constraint_record.contype as constraint_type
    from pg_constraint constraint_record
    join pg_class owner_table
      on owner_table.oid = constraint_record.conrelid
    join pg_namespace owner_namespace
      on owner_namespace.oid = owner_table.relnamespace
    where owner_namespace.nspname in (
        'knowledge_staging',
        'knowledge',
        'casework'
      )
      and constraint_record.contype in ('f', 'c', 'x')
    order by
      case when constraint_record.contype = 'f' then 0 else 1 end,
      owner_namespace.nspname, owner_table.relname,
      constraint_record.conname
  loop
    execute format(
      'alter table only %I.%I drop constraint %I',
      v_constraint.schema_name,
      v_constraint.table_name,
      v_constraint.constraint_name
    );
  end loop;
end;
$a5_drop_owned_constraints$;

do $a5_drop_schema_policies$
declare
  v_policy record;
begin
  for v_policy in
    select
      namespace_record.nspname as schema_name,
      class_record.relname as table_name,
      policy_record.polname as policy_name
    from pg_policy policy_record
    join pg_class class_record
      on class_record.oid = policy_record.polrelid
    join pg_namespace namespace_record
      on namespace_record.oid = class_record.relnamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
    order by namespace_record.nspname, class_record.relname,
      policy_record.polname
  loop
    execute format(
      'drop policy %I on %I.%I',
      v_policy.policy_name,
      v_policy.schema_name,
      v_policy.table_name
    );
  end loop;
end;
$a5_drop_schema_policies$;

do $a5_drop_schema_triggers$
declare
  v_trigger record;
begin
  for v_trigger in
    select
      namespace_record.nspname as schema_name,
      class_record.relname as table_name,
      trigger_record.tgname as trigger_name
    from pg_trigger trigger_record
    join pg_class class_record
      on class_record.oid = trigger_record.tgrelid
    join pg_namespace namespace_record
      on namespace_record.oid = class_record.relnamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
      and not trigger_record.tgisinternal
    order by namespace_record.nspname, class_record.relname,
      trigger_record.tgname
  loop
    execute format(
      'drop trigger %I on %I.%I',
      v_trigger.trigger_name,
      v_trigger.schema_name,
      v_trigger.table_name
    );
  end loop;
end;
$a5_drop_schema_triggers$;

do $a5_drop_schema_functions$
declare
  v_function record;
begin
  for v_function in
    select
      namespace_record.nspname as schema_name,
      procedure_record.proname as function_name,
      pg_get_function_identity_arguments(procedure_record.oid)
        as identity_arguments
    from pg_proc procedure_record
    join pg_namespace namespace_record
      on namespace_record.oid = procedure_record.pronamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
    order by procedure_record.oid desc
  loop
    execute format(
      'drop function %I.%I(%s)',
      v_function.schema_name,
      v_function.function_name,
      v_function.identity_arguments
    );
  end loop;
end;
$a5_drop_schema_functions$;

do $a5_drop_schema_views$
declare
  v_relation record;
begin
  for v_relation in
    select
      namespace_record.nspname as schema_name,
      class_record.relname as relation_name,
      class_record.relkind
    from pg_class class_record
    join pg_namespace namespace_record
      on namespace_record.oid = class_record.relnamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
      and class_record.relkind in ('v', 'm')
    order by class_record.oid desc
  loop
    if v_relation.relkind = 'm' then
      execute format(
        'drop materialized view %I.%I',
        v_relation.schema_name,
        v_relation.relation_name
      );
    else
      execute format(
        'drop view %I.%I',
        v_relation.schema_name,
        v_relation.relation_name
      );
    end if;
  end loop;
end;
$a5_drop_schema_views$;

do $a5_drop_schema_tables$
declare
  v_relation record;
begin
  for v_relation in
    select
      namespace_record.nspname as schema_name,
      class_record.relname as table_name
    from pg_class class_record
    join pg_namespace namespace_record
      on namespace_record.oid = class_record.relnamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
      and class_record.relkind in ('r', 'p', 'f')
    order by class_record.oid desc
  loop
    execute format(
      'drop table %I.%I',
      v_relation.schema_name,
      v_relation.table_name
    );
  end loop;
end;
$a5_drop_schema_tables$;

do $a5_drop_schema_sequences$
declare
  v_sequence record;
begin
  for v_sequence in
    select
      namespace_record.nspname as schema_name,
      class_record.relname as sequence_name
    from pg_class class_record
    join pg_namespace namespace_record
      on namespace_record.oid = class_record.relnamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
      and class_record.relkind = 'S'
    order by class_record.oid desc
  loop
    execute format(
      'drop sequence %I.%I',
      v_sequence.schema_name,
      v_sequence.sequence_name
    );
  end loop;
end;
$a5_drop_schema_sequences$;

do $a5_drop_schema_types$
declare
  v_type record;
begin
  for v_type in
    select
      namespace_record.nspname as schema_name,
      type_record.typname as type_name
    from pg_type type_record
    join pg_namespace namespace_record
      on namespace_record.oid = type_record.typnamespace
    where namespace_record.nspname in (
      'knowledge_staging',
      'knowledge',
      'casework'
    )
      and type_record.typtype in ('d', 'e', 'r')
    order by type_record.oid desc
  loop
    execute format(
      'drop type %I.%I',
      v_type.schema_name,
      v_type.type_name
    );
  end loop;
end;
$a5_drop_schema_types$;

drop schema casework;
drop schema knowledge_staging;
drop schema knowledge;

commit;`;
}

function readmeContent() {
  return `# A5 LaiBE Core Reconciliation Bundle

狀態：**尚未套用**。此目錄只提供本機審查與隔離測試，不代表 LaiBE Core 已接入 Knowledge Foundation。

目標專案 reference：\`${TARGET_PROJECT_REF}\`

## 邊界

- 套用前必須由 A0／Owner 再次明確核准。
- 不得以本套件修改、刪除或重新命名任何非 A5 schema、table、function、policy 或 Storage bucket。
- \`000_preflight.sql\` 只讀檢查 A5 schema、RPC 與 Storage 衝突；命中即停止。
- 重複套用會停止；本 bundle 是 create-only 基線，不得作為既有 A5 schema 的 upgrade。
- \`010_a5_knowledge_foundation.sql\` 以單一交易建立 A5 物件，失敗時整批回退。
- \`900_verify.sql\` 只讀確認物件數、RLS、table privilege、RPC grant 與 private Storage。
- \`990_rollback.sql\` 只允許 matching marker 且沒有知識發布、案件、staging 或 Storage 資料時執行；不使用 \`CASCADE\`，任何非 A5 外部依賴都會使整筆交易回退。

## A14 LINE Core adapter 邊界

- \`casework.document_versions\` 是 append-only 文件版本紀錄，不允許原地更新或刪除。
- \`casework.case_member_workstreams\` 是案件角色與工作流授權的唯一明確來源；不得從 \`casework.case_members\` 推測 design / construction workstream。
- jpeg / png 附件如何對齊目前 PDF-only 的父文件模型仍標記為 \`pending_a0_a14_confirmation\`；正式套用前必須由 A0 / A14 確認，不得自行放寬既有文件類型約束。

## 正式套用前

1. 重新取得 LaiBE Core schema inventory 與 migration history。
2. 執行 preflight 並保存結果。
3. 建立可還原備份，確認鎖表與短暫維護時段。
4. 由 A0／Owner 核准 apply window、執行人與 rollback 條件。
5. 套用 ordered bundle 後立即執行 verify。

## 風險

建立 28 張 A5 table、index、RLS policy 與 function 會取得 DDL lock；空白 A5 schema 的預估鎖定時間短，但實際時間必須在正式環境 preflight 後重新估算。bundle marker 僅寫入 A5 \`knowledge\` schema comment，不建立 \`public\` table。rollback 不是一般清理工具，只能在零業務資料且 marker 完整時使用。

本套件不包含 production consumer、LINE Bot、正式知識發布、付款、託管、代收代付或法律效力功能。
`;
}

export function buildCoreReconciliation({ repoRoot, outputDir }) {
  const root = resolve(repoRoot);
  const migrationRoot = join(root, "supabase", "migrations");
  const output = resolve(outputDir);
  const migrationNames = readdirSync(migrationRoot)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  validateMigrationSet(migrationNames);

  const components = migrationNames.map((name) => {
    const path = join(migrationRoot, name);
    const bytes = readFileSync(path);
    return {
      name,
      path: `supabase/migrations/${name}`,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      sql: bytes.toString("utf8"),
    };
  });
  const preflight = preflightSql();
  const artifacts = new Map([
    ["000_preflight.sql", preflight],
    [
      "010_a5_knowledge_foundation.sql",
      bundleSql(components, preflight),
    ],
    ["900_verify.sql", verificationSql()],
    ["990_rollback.sql", rollbackSql()],
    ["README.md", readmeContent()],
  ]);
  mkdirSync(output, { recursive: true });
  const artifactManifest = [];
  for (const [name, content] of artifacts) {
    const path = join(output, name);
    const normalized = content.endsWith("\n") ? content : `${content}\n`;
    writeFileSync(path, normalized, "utf8");
    artifactManifest.push({
      path: `supabase/core_reconciliation/${name}`,
      bytes: Buffer.byteLength(normalized),
      sha256: sha256(Buffer.from(normalized, "utf8")),
    });
  }

  const manifest = {
    schema_version: "a5.core_reconciliation.v1",
    bundle_id: BUNDLE_ID,
    target_project_ref: TARGET_PROJECT_REF,
    remote_applied: false,
    remote_verification: {
      checked_on: "2026-07-28",
      migrations: 0,
      a5_application_tables: 0,
      source: "read-only inventory",
    },
    a14_line_core_reconciliation: {
      remote_applied: false,
      tables: [
        "casework.document_versions",
        "casework.case_member_workstreams",
      ],
      workstream_source: "explicit_membership_only",
      image_attachment_parent_model: "pending_a0_a14_confirmation",
    },
    source_migrations: components.map(({ path, bytes, sha256: digest }) => ({
      path,
      bytes,
      sha256: digest,
    })),
    artifacts: artifactManifest,
  };
  writeFileSync(
    join(output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? "<end>"}`);
    }
    options[key.slice(2)] = value;
  }
  const scriptRoot = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(options.root || scriptRoot, options.root ? "" : "../..");
  return {
    repoRoot,
    outputDir: resolve(
      options.output ||
        join(repoRoot, "supabase", "core_reconciliation"),
    ),
  };
}

const isCli = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const manifest = buildCoreReconciliation(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}
