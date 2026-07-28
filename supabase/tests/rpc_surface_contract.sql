begin;

insert into auth.users (id)
values
  ('98000000-0000-4000-8000-000000000001'),
  ('98000000-0000-4000-8000-000000000002'),
  ('98000000-0000-4000-8000-000000000003'),
  ('98000000-0000-4000-8000-000000000004')
on conflict (id) do nothing;

insert into auth.sessions (
  id,
  user_id,
  created_at,
  updated_at,
  not_after
)
values
  (
    '98000000-0000-4000-8000-000000000011',
    '98000000-0000-4000-8000-000000000001',
    now(),
    now(),
    now() + interval '1 day'
  ),
  (
    '98000000-0000-4000-8000-000000000012',
    '98000000-0000-4000-8000-000000000002',
    now(),
    now(),
    now() + interval '1 day'
  ),
  (
    '98000000-0000-4000-8000-000000000014',
    '98000000-0000-4000-8000-000000000004',
    now(),
    now(),
    now() + interval '1 day'
  )
on conflict (id) do nothing;

insert into casework.cases (
  id,
  external_project_id,
  title,
  case_status,
  created_by
)
values
  (
    '98000000-0000-4000-8000-000000000101',
    'rpc-surface-contract',
    'RPC surface contract case',
    'active',
    '98000000-0000-4000-8000-000000000002'
  ),
  (
    '98000000-0000-4000-8000-000000000102',
    'rpc-surface-contract-other',
    'Other member case',
    'active',
    '98000000-0000-4000-8000-000000000001'
  );

insert into casework.case_members (
  case_id,
  user_id,
  role,
  added_by
)
values
  (
    '98000000-0000-4000-8000-000000000101',
    '98000000-0000-4000-8000-000000000002',
    'owner',
    '98000000-0000-4000-8000-000000000002'
  ),
  (
    '98000000-0000-4000-8000-000000000101',
    '98000000-0000-4000-8000-000000000004',
    'pcm',
    '98000000-0000-4000-8000-000000000002'
  );

insert into casework.documents (
  id,
  case_id,
  source_document_id,
  pdf_id,
  title,
  vault_sha256,
  uploaded_by
)
values (
  '98000000-0000-4000-8000-000000000151',
  '98000000-0000-4000-8000-000000000101',
  'drawing-document',
  'drawing-pdf',
  'Drawing review document',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '98000000-0000-4000-8000-000000000004'
);

insert into casework.pdf_sheets (
  id,
  case_id,
  document_id,
  leakage_group,
  pdf_id,
  source_document_id,
  vault_sha256,
  page_number,
  source_queue_identity,
  ingest_fingerprint,
  source_candidate_class,
  page_type_candidate,
  created_by
)
values (
  '98000000-0000-4000-8000-000000000161',
  '98000000-0000-4000-8000-000000000101',
  '98000000-0000-4000-8000-000000000151',
  'drawing-contract-fixture',
  'drawing-pdf',
  'drawing-document',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  1,
  'drawing-queue-identity',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'floor_plan',
  'floor_plan',
  '98000000-0000-4000-8000-000000000004'
);

insert into casework.findings (
  id,
  case_id,
  domain,
  source_client_id,
  source_fingerprint,
  finding_type,
  candidate_risk_note,
  created_by
)
values
  (
    '98000000-0000-4000-8000-000000000201',
    '98000000-0000-4000-8000-000000000101',
    'drawing_review',
    'a12',
    '11111111111111111111111111111111',
    'drawing_fixture',
    'Drawing review fixture',
    '98000000-0000-4000-8000-000000000004'
  ),
  (
    '98000000-0000-4000-8000-000000000202',
    '98000000-0000-4000-8000-000000000101',
    'budget',
    'budget',
    '22222222222222222222222222222222',
    'budget_fixture',
    'Budget fixture',
    '98000000-0000-4000-8000-000000000002'
  ),
  (
    '98000000-0000-4000-8000-000000000203',
    '98000000-0000-4000-8000-000000000101',
    'contract',
    'contract',
    '33333333333333333333333333333333',
    'contract_fixture',
    'Contract fixture',
    '98000000-0000-4000-8000-000000000002'
  );

insert into casework.evidence_links (
  id,
  case_id,
  finding_id,
  evidence_type,
  source_fingerprint,
  source_document_id,
  created_by
)
values
  (
    '98000000-0000-4000-8000-000000000301',
    '98000000-0000-4000-8000-000000000101',
    '98000000-0000-4000-8000-000000000201',
    'human_note',
    '44444444444444444444444444444444',
    'drawing-evidence',
    '98000000-0000-4000-8000-000000000004'
  ),
  (
    '98000000-0000-4000-8000-000000000302',
    '98000000-0000-4000-8000-000000000101',
    '98000000-0000-4000-8000-000000000202',
    'human_note',
    '55555555555555555555555555555555',
    'budget-evidence',
    '98000000-0000-4000-8000-000000000002'
  ),
  (
    '98000000-0000-4000-8000-000000000303',
    '98000000-0000-4000-8000-000000000101',
    '98000000-0000-4000-8000-000000000203',
    'human_note',
    '66666666666666666666666666666666',
    'contract-evidence',
    '98000000-0000-4000-8000-000000000002'
  );

insert into storage.objects (id, bucket_id, name, owner)
values
  (
    '98000000-0000-4000-8000-000000000401',
    'case-documents-private',
    '98000000-0000-4000-8000-000000000101/owned.pdf',
    '98000000-0000-4000-8000-000000000002'
  ),
  (
    '98000000-0000-4000-8000-000000000402',
    'case-documents-private',
    '98000000-0000-4000-8000-000000000102/other.pdf',
    '98000000-0000-4000-8000-000000000001'
  ),
  (
    '98000000-0000-4000-8000-000000000403',
    'knowledge-source-private',
    'internal/source.pdf',
    '98000000-0000-4000-8000-000000000001'
  );

grant usage on schema storage to anon;
grant select on storage.objects to authenticated, anon;
create policy contract_legacy_storage_read_all
on storage.objects
for select to public
using (true);

do $contract$
declare
  v_direct_table_grants integer;
  v_internal_execute integer;
  v_public_execute integer;
  v_anon_execute integer;
  v_expected_execute integer;
  v_execute_differences text;
  v_invalid_boundary integer;
begin
  select count(*)
  into v_direct_table_grants
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('knowledge', 'knowledge_staging', 'casework')
    and c.relkind in ('r', 'p', 'v', 'm')
    and (
      has_table_privilege('authenticated', c.oid, 'SELECT')
      or has_table_privilege('authenticated', c.oid, 'INSERT')
      or has_table_privilege('authenticated', c.oid, 'UPDATE')
      or has_table_privilege('authenticated', c.oid, 'DELETE')
      or has_table_privilege('anon', c.oid, 'SELECT')
      or has_table_privilege('anon', c.oid, 'INSERT')
      or has_table_privilege('anon', c.oid, 'UPDATE')
      or has_table_privilege('anon', c.oid, 'DELETE')
    );

  if v_direct_table_grants <> 0 then
    raise exception 'A5 direct table privileges remain: %',
      v_direct_table_grants;
  end if;

  select count(*)
  into v_internal_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('knowledge', 'knowledge_staging', 'casework')
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');

  if v_internal_execute <> 3 then
    raise exception 'Unexpected authenticated helper surface: %',
      v_internal_execute;
  end if;

  select count(*)
  into v_public_execute
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
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');

  if v_public_execute <> 17 then
    raise exception 'Unexpected authenticated public RPC surface: %',
      v_public_execute;
  end if;

  with expected(signature) as (
    values
      ('casework.can_access_case_document(text, boolean)'),
      ('casework.has_current_case_workstream(uuid, text)'),
      ('knowledge.is_interactive_reviewer()'),
      ('public.gateway_get_case_evidence(uuid)'),
      ('public.gateway_get_knowledge_entry(uuid)'),
      ('public.gateway_record_finding(uuid, jsonb)'),
      ('public.gateway_search_knowledge(text, text, integer)'),
      ('public.knowledge_ingest_batch(jsonb)'),
      ('public.knowledge_ingest_woodwork_batch(jsonb)'),
      ('public.knowledge_publish_entry_version(uuid, uuid, text)'),
      ('public.knowledge_retire_entry(uuid, text)'),
      ('public.knowledge_return_to_draft(uuid, uuid, text)'),
      ('public.knowledge_studio_create_draft(jsonb)'),
      ('public.knowledge_studio_create_revision(uuid, jsonb, text)'),
      ('public.knowledge_studio_get(uuid)'),
      ('public.knowledge_studio_list(text, text, integer)'),
      ('public.knowledge_studio_session_context()'),
      ('public.knowledge_studio_save_and_submit(uuid, uuid, jsonb, text)'),
      ('public.knowledge_studio_update_draft(uuid, uuid, jsonb)'),
      ('public.knowledge_submit_for_review(uuid, uuid, text)')
  ),
  actual as (
    select
      n.nspname || '.' || p.proname || '('
        || oidvectortypes(p.proargtypes) || ')' as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (
        n.nspname in ('knowledge', 'knowledge_staging', 'casework')
        or (
          n.nspname = 'public'
          and exists (
            select 1
            from expected e
            where e.signature like 'public.' || p.proname || '(%'
          )
        )
      )
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  differences as (
    (select signature from expected except select signature from actual)
    union all
    (select signature from actual except select signature from expected)
  )
  select
    count(*),
    string_agg(signature, ', ' order by signature)
  into v_expected_execute, v_execute_differences
  from differences;

  if v_expected_execute <> 0 then
    raise exception 'Authenticated execute allowlist differs: %',
      v_execute_differences;
  end if;

  select count(*)
  into v_invalid_boundary
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (
      n.nspname in ('knowledge', 'knowledge_staging', 'casework')
      or (
        n.nspname = 'public'
        and p.proname in (
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
    )
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and (
      pg_get_userbyid(p.proowner) <> 'postgres'
      or not p.prosecdef
      or coalesce(array_to_string(p.proconfig, ','), '')
        not like '%search_path=""%'
    );

  if v_invalid_boundary <> 0 then
    raise exception
      'Authenticated function owner, mode, or search_path is invalid: %',
      v_invalid_boundary;
  end if;

  select count(*)
  into v_anon_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (
      n.nspname in ('knowledge', 'knowledge_staging', 'casework')
      or (
        n.nspname = 'public'
        and p.proname in (
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
    )
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if v_anon_execute <> 0 then
    raise exception 'Anonymous A5 function execution remains: %',
      v_anon_execute;
  end if;
end;
$contract$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000001","session_id":"98000000-0000-4000-8000-000000000011","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
  true
);

do $contract$
declare
  v_created jsonb;
  v_submitted jsonb;
  v_entry_id uuid;
  v_version_id uuid;
  v_direct_select_denied boolean := false;
begin
  begin
    perform 1 from knowledge.entries limit 1;
  exception
    when insufficient_privilege then
      v_direct_select_denied := true;
  end;
  if not v_direct_select_denied then
    raise exception 'Authenticated direct SELECT was not denied';
  end if;

  v_created := public.knowledge_studio_create_draft(
    jsonb_build_object(
      'schema_version', 'knowledge_studio.v1',
      'domain', 'drawing_review',
      'slug', 'rpc-surface-atomic-submit',
      'title', 'Atomic submit draft',
      'summary', 'Initial draft summary',
      'content', jsonb_build_object(
        'displayType', '圖說檢查規則',
        'owner', 'PCM 圖說組',
        'criteria', 'Initial criteria',
        'nextOwner', 'PCM 覆核人'
      ),
      'evidence_summary', jsonb_build_array('圖說檢查基準／第 1 頁'),
      'change_note', 'create contract fixture',
      'source', jsonb_build_object(
        'source_type', 'manual_reference',
        'title', 'RPC surface source',
        'source_locator', 'contract://rpc-surface-source',
        'source_sha256',
          '9898989898989898989898989898989898989898989898989898989898989898',
        'provenance', '{}'::jsonb
      ),
      'rule', jsonb_build_object(
        'ruleType', 'drawing_rule',
        'ruleCode', 'rpc-surface-drawing-rule',
        'ruleKind', 'cross_sheet_consistency',
        'pageTypes', jsonb_build_array('pdf'),
        'conditions', jsonb_build_object('criteria', 'Initial criteria'),
        'findingTemplate', '列為待確認',
        'supplementTemplate', '請補充圖頁'
      )
    )
  );

  v_entry_id := (v_created ->> 'entryId')::uuid;
  v_version_id := (v_created ->> 'versionId')::uuid;

  v_submitted := public.knowledge_studio_save_and_submit(
    v_entry_id,
    v_version_id,
    jsonb_build_object(
      'schema_version', 'knowledge_studio.v1',
      'domain', 'drawing_review',
      'slug', 'rpc-surface-atomic-submit',
      'title', 'Atomic submit latest title',
      'summary', 'Latest complete summary',
      'content', jsonb_build_object(
        'displayType', '圖說檢查規則',
        'owner', 'PCM 圖說組',
        'criteria', 'Latest complete criteria',
        'nextOwner', 'PCM 覆核人'
      ),
      'evidence_summary', jsonb_build_array('圖說檢查基準／第 2 頁'),
      'change_note', 'save and submit contract fixture',
      'source', jsonb_build_object(
        'source_type', 'manual_reference',
        'title', 'RPC surface revised source',
        'source_locator', 'contract://rpc-surface-source-v2',
        'source_sha256',
          '9797979797979797979797979797979797979797979797979797979797979797',
        'provenance', '{"revision":2}'::jsonb
      ),
      'rule', jsonb_build_object(
        'ruleType', 'drawing_rule',
        'ruleCode', 'rpc-surface-drawing-rule',
        'ruleKind', 'cross_sheet_consistency',
        'pageTypes', jsonb_build_array('pdf'),
        'conditions', jsonb_build_object(
          'criteria',
          'Latest complete criteria'
        ),
        'findingTemplate', '列為待確認',
        'supplementTemplate', '請補充圖頁'
      )
    ),
    'atomic contract submission'
  );

  if v_submitted ->> 'lifecycleState' <> 'pending_review'
    or v_submitted ->> 'formalImpact' <> 'none' then
    raise exception 'Atomic submit contract failed: %', v_submitted;
  end if;

  if not exists (
    select 1
    from public.knowledge_studio_list(
      'pending_review',
      'drawing_review',
      100
    ) listed
    where listed ->> 'entryId' = v_entry_id::text
      and listed ->> 'title' = 'Atomic submit latest title'
  ) then
    raise exception 'Atomic submit did not persist the latest title';
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000002","session_id":"98000000-0000-4000-8000-000000000012","app_metadata":{"role":"owner","client_id":"web"}}',
  true
);

do $contract$
declare
  v_studio_denied boolean := false;
  v_visible_a5_objects integer;
begin
  begin
    perform listed
    from public.knowledge_studio_list(null, null, 10) listed;
  exception
    when others then
      v_studio_denied := true;
  end;
  if not v_studio_denied then
    raise exception 'Owner entered the Studio reviewer surface';
  end if;

  if not casework.can_access_case_document(
    '98000000-0000-4000-8000-000000000101/evidence.pdf',
    false
  ) then
    raise exception 'Case member lost private document read access';
  end if;

  if not casework.can_access_case_document(
    '98000000-0000-4000-8000-000000000101/evidence.pdf',
    true
  ) then
    raise exception 'Case owner lost private document write access';
  end if;

  if casework.can_access_case_document('not-a-case/evidence.pdf', false) then
    raise exception 'Malformed Storage path did not fail closed';
  end if;

  select count(*)
  into v_visible_a5_objects
  from storage.objects
  where bucket_id in (
    'knowledge-source-private',
    'case-documents-private'
  );
  if v_visible_a5_objects <> 1 then
    raise exception
      'Broad permissive Storage policy bypassed A5 guard: %',
      v_visible_a5_objects;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000002","session_id":"98000000-0000-4000-8000-000000000012","app_metadata":{"role":"owner","client_id":"budget"}}',
  true
);

do $contract$
declare
  v_payload jsonb;
begin
  v_payload := public.gateway_get_case_evidence(
    '98000000-0000-4000-8000-000000000101'
  );
  if jsonb_array_length(v_payload -> 'documents') <> 0
    or jsonb_array_length(v_payload -> 'sheets') <> 0
    or jsonb_array_length(v_payload -> 'findings') <> 1
    or v_payload -> 'findings' -> 0 ->> 'domain' <> 'budget'
    or jsonb_array_length(v_payload -> 'evidence') <> 1
    or v_payload -> 'evidence' -> 0 ->> 'findingId'
      <> '98000000-0000-4000-8000-000000000202' then
    raise exception 'Budget received drawing or cross-domain evidence: %',
      v_payload;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000004","session_id":"98000000-0000-4000-8000-000000000014","app_metadata":{"role":"pcm","client_id":"a12"}}',
  true
);

do $contract$
declare
  v_payload jsonb;
begin
  v_payload := public.gateway_get_case_evidence(
    '98000000-0000-4000-8000-000000000101'
  );
  if jsonb_array_length(v_payload -> 'documents') <> 1
    or jsonb_array_length(v_payload -> 'sheets') <> 1
    or jsonb_array_length(v_payload -> 'findings') <> 1
    or v_payload -> 'findings' -> 0 ->> 'domain' <> 'drawing_review'
    or jsonb_array_length(v_payload -> 'evidence') <> 1
    or v_payload -> 'evidence' -> 0 ->> 'findingId'
      <> '98000000-0000-4000-8000-000000000201' then
    raise exception 'A12 received cross-domain case evidence: %', v_payload;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000003","session_id":"98000000-0000-4000-8000-000000000099","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
  true
);

do $contract$
declare
  v_inactive_denied boolean := false;
begin
  begin
    perform listed
    from public.knowledge_studio_list(null, null, 10) listed;
  exception
    when others then
      v_inactive_denied := true;
  end;
  if not v_inactive_denied then
    raise exception 'Inactive PCM session entered the Studio reviewer surface';
  end if;
end;
$contract$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);

do $contract$
declare
  v_anon_denied boolean := false;
  v_anon_storage_count integer := -1;
begin
  begin
    perform listed
    from public.knowledge_studio_list(null, null, 10) listed;
  exception
    when insufficient_privilege then
      v_anon_denied := true;
  end;
  if not v_anon_denied then
    raise exception 'Anonymous Studio RPC execution was not denied';
  end if;

  begin
    select count(*)
    into v_anon_storage_count
    from storage.objects
    where bucket_id in (
      'knowledge-source-private',
      'case-documents-private'
    );
  exception
    when insufficient_privilege then
      v_anon_storage_count := 0;
  end;
  if v_anon_storage_count <> 0 then
    raise exception
      'Anonymous broad Storage policy bypassed A5 guard: %',
      v_anon_storage_count;
  end if;
end;
$contract$;

reset role;

do $contract$
declare
  v_public_bucket integer;
  v_storage_policies integer;
begin
  select count(*)
  into v_public_bucket
  from storage.buckets
  where id in ('knowledge-source-private', 'case-documents-private')
    and public;
  if v_public_bucket <> 0 then
    raise exception 'A5 private Storage bucket became public';
  end if;

  select count(*)
  into v_storage_policies
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'knowledge_source_reviewer_read',
      'knowledge_source_reviewer_insert',
      'case_document_member_read',
      'case_document_member_insert'
    );
  if v_storage_policies <> 4 then
    raise exception 'A5 Storage policy set is incomplete: %',
      v_storage_policies;
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'a5_storage_read_guard',
        'a5_storage_insert_guard',
        'a5_storage_update_guard',
        'a5_storage_delete_guard'
      )
      and permissive = 'RESTRICTIVE'
  ) <> 4 then
    raise exception 'A5 restrictive Storage guards are missing';
  end if;
end;
$contract$;

rollback;
