-- Run after all knowledge migrations in an isolated PostgreSQL test database.
begin;

insert into auth.users (id)
values ('79000000-0000-4000-8000-000000000001');

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values (
  '79000000-0000-4000-8000-000000000011',
  '79000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now() + interval '15 minutes'
);

do $contract$
declare
  v_rls_enabled boolean;
  v_rpc_security_definer boolean;
  v_bucket_constraint text;
  v_index_columns text[];
begin
  select c.relrowsecurity
  into v_rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'knowledge_staging'
    and c.relname = 'woodwork_candidates';

  if v_rls_enabled is distinct from true then
    raise exception 'woodwork_candidates RLS is missing';
  end if;

  select p.prosecdef
  into v_rpc_security_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'knowledge_ingest_woodwork_batch'
    and pg_get_function_identity_arguments(p.oid) = 'p_envelope jsonb';

  if v_rpc_security_definer is distinct from false then
    raise exception
      'knowledge_ingest_woodwork_batch must be SECURITY INVOKER';
  end if;

  select pg_get_constraintdef(c.oid)
  into v_bucket_constraint
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'knowledge_staging'
    and t.relname = 'woodwork_candidates'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%bucket%eligible_candidate_reference%';

  if v_bucket_constraint is null
    or v_bucket_constraint not ilike '%requires_image_or_quote_confirmation%'
    or v_bucket_constraint not ilike '%not_grade_applicable%'
    or v_bucket_constraint not ilike '%needs_manual_review%' then
    raise exception 'woodwork four-bucket check is incomplete';
  end if;

  select array_agg(distinct a.attname order by a.attname)
  into v_index_columns
  from pg_index i
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  join lateral unnest(i.indkey::smallint[]) key(attnum) on true
  join pg_attribute a
    on a.attrelid = i.indrelid
   and a.attnum = key.attnum
  where n.nspname = 'knowledge_staging'
    and t.relname = 'woodwork_candidates';

  if not (
    array['bucket', 'import_batch_id', 'mapping_id', 'source_row_identity']
      <@ coalesce(v_index_columns, array[]::text[])
  ) then
    raise exception 'woodwork candidate indexes are incomplete: %',
      v_index_columns;
  end if;
end;
$contract$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000001","session_id":"79000000-0000-4000-8000-000000000011","app_metadata":{"role":"pcm","client_id":"knowledge_import"}}',
  true
);

do $contract$
declare
  v_envelope jsonb;
  v_first jsonb;
  v_second jsonb;
  v_batch_id uuid;
  v_candidate_count integer;
  v_anomaly_count integer;
  v_source_link_count integer;
begin
  v_envelope := jsonb_build_object(
    'schema_version', 'knowledge_staging.v1',
    'idempotency_key', 'woodwork-contract-batch-001',
    'correlation_key', 'woodwork-contract-correlation-001',
    'source_manifest', jsonb_build_object(
      'source_kind', 'woodwork_mapping',
      'source_locator',
        'outputs/budget_woodwork_items_20260710/A1_woodwork_ingest_mapping_20260711.json',
      'source_sha256',
        'd4f3d30750894b4c788823e5155255dfe288f923c87b7fc4172332c94cae0f7a',
      'source_record_count', 58,
      'chunk_index', 1,
      'chunk_count', 1
    ),
    'records', (
      select jsonb_agg(
        jsonb_build_object(
          'source_key',
            'A1-WD-TEST-' || lpad(series.value::text, 5, '0'),
          'source_status', '待確認',
          'is_budget_candidate', false,
          'auto_trigger_allowed', false,
          'raw_payload', jsonb_build_object(
            'mapping_id',
              'A1-WD-TEST-' || lpad(series.value::text, 5, '0')
          )
        )
        order by series.value
      )
      from generate_series(1, 58) series(value)
    ),
    'budget_items', '[]'::jsonb,
    'quality_issues', (
      select jsonb_agg(
        jsonb_build_object(
          'source_record_key',
            'A1-WD-TEST-' || lpad(series.value::text, 5, '0'),
          'issue_code', 'demolition_candidate_conflict',
          'severity', 'warning',
          'description',
            'eligible candidate contains a demolition signal',
          'evidence', jsonb_build_object(
            'mapping_id',
              'A1-WD-TEST-' || lpad(series.value::text, 5, '0'),
            'quarantined', true
          ),
          'next_reviewer_role', 'pcm'
        )
        order by series.value
      )
      from generate_series(1, 57) series(value)
    ),
    'woodwork_candidates', (
      select jsonb_agg(
        jsonb_build_object(
          'source_record_key',
            'A1-WD-TEST-' || lpad(series.value::text, 5, '0'),
          'mapping_id',
            'A1-WD-TEST-' || lpad(series.value::text, 5, '0'),
          'bucket',
            case
              when series.value <= 57
                then 'eligible_candidate_reference'
              else 'requires_image_or_quote_confirmation'
            end,
          'pricing_trigger_policy', 'not_a_pricing_trigger',
          'source_ref', jsonb_build_object(
            'source_workbook', '03_木作工程.xlsx',
            'source_sheet', '預算單',
            'source_row_number', series.value,
            'source_trade', '木作工程',
            'row_identity',
              '03_木作工程.xlsx|預算單|row:' ||
              series.value::text || '|' ||
              case
                when series.value <= 57
                  then '木作櫃拆除'
                else '固定收納櫃'
              end
          ),
          'original_item', jsonb_build_object(
            'item_name',
              case
                when series.value <= 57
                  then '木作櫃拆除'
                else '固定收納櫃'
              end
          ),
          'candidate_evidence', jsonb_build_object(
            'woodwork_scope', '木作櫃體',
            'component_tags', jsonb_build_array('木作櫃')
          ),
          'grade_fields', jsonb_build_object(
            'public_grade_candidate', null,
            'grade_status', '未決定'
          ),
          'evidence_priority_used', 'item_name',
          'confidence_grade', 'D',
          'review_state_label', '待人工覆核',
          'review_reason', 'contract fixture',
          'missing_info_items', jsonb_build_array('人工確認'),
          'next_use', jsonb_build_object(
            'usable_for_later_matching', true,
            'usable_for_evidence_retrieval', true,
            'publication_authorized', false,
            'candidate_creation_authorized', false,
            'direct_pricing_allowed', false,
            'auto_trigger_allowed', false,
            'auto_select_allowed', false,
            'pricing_trigger_note', 'not a pricing trigger'
          )
        )
        order by series.value
      )
      from generate_series(1, 58) series(value)
    )
  );

  select public.knowledge_ingest_woodwork_batch(v_envelope)
  into v_first;
  select public.knowledge_ingest_woodwork_batch(v_envelope)
  into v_second;

  if coalesce((v_first ->> 'reused')::boolean, true) <> false
    or (v_first ->> 'sourceRecordCount')::integer <> 58
    or (v_first ->> 'woodworkCandidateCount')::integer <> 58
    or (v_first ->> 'qualityIssueCount')::integer <> 57
    or v_first ->> 'formalImpact' <> 'none' then
    raise exception 'First woodwork ingest result is invalid: %', v_first;
  end if;

  if coalesce((v_second ->> 'reused')::boolean, false) <> true
    or (v_second ->> 'sourceRecordCount')::integer <> 58
    or (v_second ->> 'woodworkCandidateCount')::integer <> 58
    or (v_second ->> 'qualityIssueCount')::integer <> 57 then
    raise exception 'Woodwork ingest is not idempotent: %', v_second;
  end if;

  v_batch_id := (v_first ->> 'batchId')::uuid;

  select count(*)
  into v_candidate_count
  from knowledge_staging.woodwork_candidates candidate
  join knowledge_staging.import_batches import_batch
    on import_batch.id = candidate.import_batch_id
  where candidate.import_batch_id = v_batch_id
    and candidate.source_record_id is not null
    and import_batch.source_kind = 'woodwork_mapping'
    and candidate.pricing_trigger_policy = 'not_a_pricing_trigger'
    and candidate.publication_authorized = false
    and candidate.candidate_creation_authorized = false
    and candidate.direct_pricing_allowed = false;

  if v_candidate_count <> 58 then
    raise exception 'Woodwork staging flags or row count are invalid: %',
      v_candidate_count;
  end if;

  select count(*)
  into v_source_link_count
  from knowledge_staging.woodwork_candidates candidate
  join knowledge_staging.source_records source
    on source.id = candidate.source_record_id
  where candidate.import_batch_id = v_batch_id
    and source.import_batch_id = v_batch_id
    and source.source_key = candidate.mapping_id;

  if v_source_link_count <> 58 then
    raise exception
      'source_record_key did not resolve to matching mapping_id: %',
      v_source_link_count;
  end if;

  select count(*)
  into v_anomaly_count
  from knowledge_staging.quality_issues
  where import_batch_id = v_batch_id
    and issue_code = 'demolition_candidate_conflict'
    and coalesce((evidence ->> 'quarantined')::boolean, false) = true;

  if v_anomaly_count <> 57 then
    raise exception
      'Eligible demolition conflicts were not queued exactly 57 times: %',
      v_anomaly_count;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000001","session_id":"79000000-0000-4000-8000-000000000011","app_metadata":{"role":"pcm","client_id":"a12"}}',
  true
);

do $contract$
declare
  v_visible integer;
  v_denied boolean := false;
begin
  select count(*)
  into v_visible
  from knowledge_staging.woodwork_candidates;

  if v_visible <> 0 then
    raise exception 'A12 can read woodwork staging rows: %', v_visible;
  end if;

  begin
    insert into knowledge_staging.woodwork_candidates (
      import_batch_id,
      source_record_id,
      mapping_id,
      source_record_key,
      source_row_identity,
      bucket,
      pricing_trigger_policy,
      source_workbook,
      source_sheet,
      source_row_number,
      original_item_name,
      woodwork_scope,
      grade_status,
      candidate_evidence,
      grade_fields,
      evidence_priority,
      confidence_grade,
      review_state_label,
      review_reason,
      usable_for_later_matching,
      usable_for_evidence_retrieval
    )
    values (
      '79000000-0000-4000-8000-000000000099',
      '79000000-0000-4000-8000-000000000098',
      'A1-WD-A12-DENY',
      'A1-WD-A12-DENY',
      'a12|must|not|write',
      'needs_manual_review',
      'not_a_pricing_trigger',
      'test.xlsx',
      'sheet',
      1,
      'must be denied',
      '木作櫃體',
      '未決定',
      '{"woodwork_scope":"木作櫃體","component_tags":[]}'::jsonb,
      '{"grade_status":"未決定"}'::jsonb,
      'item_name',
      'D',
      '待人工覆核',
      'must be denied',
      true,
      true
    );
  exception
    when insufficient_privilege or foreign_key_violation or
      not_null_violation or check_violation then
      v_denied := true;
  end;

  if not v_denied then
    raise exception 'A12 woodwork staging write was not denied';
  end if;
end;
$contract$;

reset role;
rollback;
