-- Run after the migration in a disposable Supabase database.
begin;

insert into auth.users (id)
values ('90000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values (
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now() + interval '15 minutes'
)
on conflict (id) do nothing;

do $contract$
declare
  v_missing text[];
begin
  select array_agg(expected_name)
  into v_missing
  from (
    values
      ('knowledge_staging'),
      ('knowledge'),
      ('casework')
  ) expected(expected_name)
  where not exists (
    select 1
    from pg_namespace n
    where n.nspname = expected.expected_name
  );

  if v_missing is not null then
    raise exception 'Missing schemas: %', v_missing;
  end if;
end;
$contract$;

do $contract$
declare
  v_rls_count integer;
begin
  select count(*)
  into v_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('knowledge_staging', 'knowledge', 'casework')
    and c.relkind = 'r'
    and c.relrowsecurity = true;

  if v_rls_count <> 26 then
    raise exception 'Expected 26 RLS tables, found %', v_rls_count;
  end if;
end;
$contract$;

do $contract$
begin
  begin
    insert into knowledge_staging.import_batches (
      schema_version,
      idempotency_key,
      correlation_key,
      source_kind,
      source_locator,
      source_sha256,
      lifecycle_state,
      publication_authorized
    )
    values (
      'knowledge_staging.v1',
      'contract-invalid-publication',
      'contract-invalid',
      'budget_master',
      'contract-test',
      '0000000000000000000000000000000000000000000000000000000000000000',
      'pending_review',
      true
    );
    raise exception 'Staging publication guard did not reject the row';
  exception
    when check_violation then
      null;
  end;
end;
$contract$;

do $contract$
declare
  v_batch_id uuid;
begin
  insert into knowledge_staging.import_batches (
    schema_version,
    idempotency_key,
    correlation_key,
    source_kind,
    source_locator,
    source_sha256,
    lifecycle_state
  )
  values (
    'knowledge_staging.v1',
    'contract-valid-price-batch',
    'contract-valid-price',
    'budget_master',
    'contract-test-valid-batch',
    '1111111111111111111111111111111111111111111111111111111111111111',
    'pending_review'
  )
  returning id into v_batch_id;

  begin
    insert into knowledge_staging.budget_staging_items (
      import_batch_id,
      source_item_uid,
      unified_item_name,
      direct_pricing_allowed
    )
    values (
      v_batch_id,
      'contract-test',
      'contract-test',
      true
    );
    raise exception 'Direct pricing guard did not reject the row';
  exception
    when check_violation then
      null;
  end;
end;
$contract$;

do $contract$
declare
  v_public_bucket_count integer;
begin
  select count(*)
  into v_public_bucket_count
  from storage.buckets
  where id in ('knowledge-source-private', 'case-documents-private')
    and public = true;

  if v_public_bucket_count <> 0 then
    raise exception 'A governed storage bucket is public';
  end if;
end;
$contract$;

do $contract$
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"a12"}}',
    true
  );
  if not knowledge.can_access_domain('drawing_review')
    or knowledge.can_access_domain('budget')
    or knowledge.can_access_domain('contract') then
    raise exception 'A12 domain isolation failed';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"budget"}}',
    true
  );
  if knowledge.can_access_domain('drawing_review')
    or not knowledge.can_access_domain('budget')
    or knowledge.can_access_domain('contract') then
    raise exception 'Budget client domain isolation failed';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"contract"}}',
    true
  );
  if knowledge.can_access_domain('drawing_review')
    or knowledge.can_access_domain('budget')
    or not knowledge.can_access_domain('contract') then
    raise exception 'Contract client domain isolation failed';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"owner","client_id":"web","allowed_knowledge_domains":["drawing_review"]}}',
    true
  );
  if not knowledge.can_access_domain('drawing_review')
    or knowledge.can_access_domain('budget')
    or knowledge.can_access_domain('contract') then
    raise exception 'Explicit owner domain isolation failed';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
    true
  );
  if not knowledge.can_access_domain('drawing_review')
    or not knowledge.can_access_domain('budget')
    or not knowledge.can_access_domain('contract') then
    raise exception 'Interactive PCM domain access failed';
  end if;
end;
$contract$;

do $contract$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'casework'
      and t.relname = 'documents'
      and pg_get_constraintdef(c.oid)
        ilike '%UNIQUE (case_id, source_document_id, vault_sha256)%'
  ) then
    raise exception 'Document source-version uniqueness is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'casework'
      and t.relname = 'pdf_sheets'
      and pg_get_constraintdef(c.oid)
        ilike '%UNIQUE (document_id, page_number, ingest_fingerprint)%'
  ) then
    raise exception 'Immutable PDF evidence uniqueness is missing';
  end if;
end;
$contract$;

do $contract$
declare
  v_source_id uuid;
  v_entry_one uuid;
  v_entry_two uuid;
  v_version_one uuid;
  v_version_two uuid;
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
    true
  );

  insert into knowledge.sources (
    source_type,
    title,
    source_location,
    source_sha256,
    lifecycle_state
  )
  values (
    'manual_reference',
    'shared-source-test',
    'contract://shared-source-test',
    '2222222222222222222222222222222222222222222222222222222222222222',
    'pending_review'
  )
  returning id into v_source_id;

  insert into knowledge.entries (
    domain,
    slug,
    title,
    summary,
    lifecycle_state
  )
  values (
    'drawing_review',
    'shared-source-entry-one',
    'shared-source-entry-one',
    '',
    'pending_review'
  )
  returning id into v_entry_one;

  insert into knowledge.entry_versions (
    entry_id,
    source_id,
    version_number,
    title,
    summary,
    lifecycle_state,
    content
  )
  values (
    v_entry_one,
    v_source_id,
    1,
    'shared-source-entry-one',
    '',
    'pending_review',
    '{}'::jsonb
  )
  returning id into v_version_one;

  insert into knowledge.drawing_rules (
    entry_version_id,
    rule_code,
    rule_kind,
    condition_definition,
    finding_template,
    supplement_template
  )
  values (
    v_version_one,
    'shared-source-rule-one',
    'sheet_completeness',
    '{}'::jsonb,
    'test',
    'test'
  );

  insert into knowledge.entries (
    domain,
    slug,
    title,
    summary,
    lifecycle_state
  )
  values (
    'drawing_review',
    'shared-source-entry-two',
    'shared-source-entry-two',
    '',
    'pending_review'
  )
  returning id into v_entry_two;

  insert into knowledge.entry_versions (
    entry_id,
    source_id,
    version_number,
    title,
    summary,
    lifecycle_state,
    content
  )
  values (
    v_entry_two,
    v_source_id,
    1,
    'shared-source-entry-two',
    '',
    'pending_review',
    '{}'::jsonb
  )
  returning id into v_version_two;

  insert into knowledge.drawing_rules (
    entry_version_id,
    rule_code,
    rule_kind,
    condition_definition,
    finding_template,
    supplement_template
  )
  values (
    v_version_two,
    'shared-source-rule-two',
    'sheet_completeness',
    '{}'::jsonb,
    'test',
    'test'
  );

  perform knowledge.publish_entry_version(
    v_entry_one,
    v_version_one,
    'first shared-source publication'
  );
  perform knowledge.publish_entry_version(
    v_entry_two,
    v_version_two,
    'second shared-source publication'
  );
end;
$contract$;

do $contract$
declare
  v_created jsonb;
  v_entry_id uuid;
  v_version_id uuid;
  v_list_record jsonb;
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"90000000-0000-4000-8000-000000000001","session_id":"90000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
    true
  );

  select public.knowledge_studio_create_draft(
    jsonb_build_object(
      'schema_version', 'knowledge_studio.v1',
      'domain', 'drawing_review',
      'slug', 'display-type-persistence-contract',
      'title', 'Display type persistence contract',
      'summary', '',
      'content', jsonb_build_object('displayType', '驗收依據'),
      'evidence_summary', '[]'::jsonb,
      'change_note', 'create display type contract fixture',
      'source', jsonb_build_object(
        'source_type', 'manual_reference',
        'title', 'display type source',
        'source_locator', 'contract://display-type-persistence',
        'source_sha256',
          '3333333333333333333333333333333333333333333333333333333333333333',
        'provenance', '{}'::jsonb
      ),
      'rule', jsonb_build_object(
        'ruleType', 'acceptance_rule',
        'ruleCode', 'display-type-acceptance-rule',
        'constructionStage', 'contract-test',
        'checkDefinition', '{}'::jsonb,
        'requiredEvidence', '[]'::jsonb,
        'findingTemplate', '待人工確認'
      )
    )
  )
  into v_created;

  v_entry_id := (v_created ->> 'entryId')::uuid;
  v_version_id := (v_created ->> 'versionId')::uuid;

  select listed
  into v_list_record
  from public.knowledge_studio_list(
    'draft',
    'drawing_review',
    500
  ) listed
  where listed ->> 'entryId' = v_entry_id::text;

  if v_list_record ->> 'displayType' <> '驗收依據' then
    raise exception 'Draft displayType was not returned by Studio list';
  end if;

  perform public.knowledge_studio_update_draft(
    v_entry_id,
    v_version_id,
    jsonb_build_object(
      'schema_version', 'knowledge_studio.v1',
      'title', 'Display type persistence contract',
      'summary', '',
      'content', jsonb_build_object('displayType', '驗收依據更新'),
      'evidence_summary', '[]'::jsonb,
      'change_note', 'update display type contract fixture',
      'rule', jsonb_build_object(
        'ruleType', 'acceptance_rule',
        'ruleCode', 'display-type-acceptance-rule',
        'constructionStage', 'contract-test',
        'checkDefinition', '{}'::jsonb,
        'requiredEvidence', '[]'::jsonb,
        'findingTemplate', '待人工確認'
      )
    )
  );

  select listed
  into v_list_record
  from public.knowledge_studio_list(
    'draft',
    'drawing_review',
    500
  ) listed
  where listed ->> 'entryId' = v_entry_id::text;

  if v_list_record ->> 'displayType' <> '驗收依據更新' then
    raise exception 'Updated displayType was not preserved by Studio list';
  end if;
end;
$contract$;

rollback;
