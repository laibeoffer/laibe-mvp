-- Read-only post-apply verification for a5.knowledge_foundation.core_readiness.v1.
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
    'gateway_search_knowledge',
      'gateway_get_knowledge_entry',
      'gateway_get_case_evidence',
      'gateway_record_finding',
      'knowledge_ingest_batch',
      'knowledge_ingest_woodwork_batch',
      'knowledge_studio_list',
      'knowledge_studio_get',
      'knowledge_studio_create_draft',
      'knowledge_studio_update_draft',
      'knowledge_studio_create_revision',
      'knowledge_studio_save_and_submit',
      'knowledge_submit_for_review',
      'knowledge_return_to_draft',
      'knowledge_publish_entry_version',
      'knowledge_retire_entry'
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
      'gateway_search_knowledge',
      'gateway_get_knowledge_entry',
      'gateway_get_case_evidence',
      'gateway_record_finding',
      'knowledge_ingest_batch',
      'knowledge_ingest_woodwork_batch',
      'knowledge_studio_list',
      'knowledge_studio_get',
      'knowledge_studio_create_draft',
      'knowledge_studio_update_draft',
      'knowledge_studio_create_revision',
      'knowledge_studio_save_and_submit',
      'knowledge_submit_for_review',
      'knowledge_return_to_draft',
      'knowledge_publish_entry_version',
      'knowledge_retire_entry'
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
order by policyname;
