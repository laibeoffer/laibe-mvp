-- Read-only collision gate for a5.knowledge_foundation.core_readiness.v1.
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
        'gateway_search_knowledge',
      'gateway_get_knowledge_entry',
      'gateway_get_case_evidence',
      'gateway_record_finding',
      'knowledge_ingest_batch',
      'knowledge_ingest_woodwork_batch',
      'knowledge_studio_list',
      'knowledge_studio_get',
      'knowledge_studio_session_context',
      'knowledge_studio_create_draft',
      'knowledge_studio_update_draft',
      'knowledge_studio_create_revision',
      'knowledge_studio_save_and_submit',
      'knowledge_submit_for_review',
      'knowledge_return_to_draft',
      'knowledge_publish_entry_version',
      'knowledge_retire_entry'
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
$a5_preflight$;
