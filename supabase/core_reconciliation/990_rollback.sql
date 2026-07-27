-- Guarded rollback for a5.knowledge_foundation.core_readiness.v1.
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
  ) <> 'a5.knowledge_foundation.core_readiness.v1;target=zdwuyomhswjcbbpbhpcq' then
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

drop function if exists public.knowledge_retire_entry(uuid, text);
drop function if exists public.knowledge_publish_entry_version(uuid, uuid, text);
drop function if exists public.knowledge_return_to_draft(uuid, uuid, text);
drop function if exists public.knowledge_submit_for_review(uuid, uuid, text);
drop function if exists public.knowledge_studio_save_and_submit(uuid, uuid, jsonb, text);
drop function if exists public.knowledge_studio_create_revision(uuid, jsonb, text);
drop function if exists public.knowledge_studio_update_draft(uuid, uuid, jsonb);
drop function if exists public.knowledge_studio_create_draft(jsonb);
drop function if exists public.knowledge_studio_get(uuid);
drop function if exists public.knowledge_studio_list(text, text, integer);
drop function if exists public.knowledge_ingest_woodwork_batch(jsonb);
drop function if exists public.knowledge_ingest_batch(jsonb);
drop function if exists public.gateway_record_finding(uuid, jsonb);
drop function if exists public.gateway_get_case_evidence(uuid);
drop function if exists public.gateway_get_knowledge_entry(uuid);
drop function if exists public.gateway_search_knowledge(text, text, integer);

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

commit;
