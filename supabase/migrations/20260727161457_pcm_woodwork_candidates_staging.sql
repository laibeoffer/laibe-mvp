begin;

alter table knowledge_staging.import_batches
drop constraint if exists import_batches_source_kind_check;

alter table knowledge_staging.import_batches
add constraint import_batches_source_kind_check
check (
  source_kind in (
    'obsidian',
    'budget_master',
    'a12_pdf_queue',
    'manual',
    'woodwork_mapping'
  )
);

create table knowledge_staging.woodwork_candidates (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null
    references knowledge_staging.import_batches(id),
  source_record_id uuid not null
    references knowledge_staging.source_records(id),
  source_record_key text not null
    check (
      length(source_record_key) between 1 and 256
      and source_record_key !~ '[[:cntrl:]]'
    ),
  source_kind text not null default 'woodwork_mapping'
    check (source_kind = 'woodwork_mapping'),
  mapping_id text not null
    check (
      length(mapping_id) between 1 and 128
      and mapping_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    ),
  bucket text not null
    check (
      bucket in (
        'eligible_candidate_reference',
        'requires_image_or_quote_confirmation',
        'not_grade_applicable',
        'needs_manual_review'
      )
    ),
  source_workbook text not null
    check (length(source_workbook) between 1 and 512),
  source_sheet text not null
    check (length(source_sheet) between 1 and 512),
  source_row_number integer not null
    check (source_row_number > 0),
  source_row_identity text not null
    check (
      length(source_row_identity) between 1 and 2048
      and source_row_identity !~ '[[:cntrl:]]'
    ),
  source_trade text not null
    check (length(source_trade) between 1 and 512),
  original_item_name text not null
    check (length(original_item_name) between 1 and 2048),
  original_spec_text text,
  original_unit text,
  woodwork_scope text not null
    check (length(woodwork_scope) between 1 and 512),
  component_tags text[] not null default '{}'::text[]
    check (array_position(component_tags, null) is null),
  public_grade_candidate text
    check (
      public_grade_candidate is null
      or public_grade_candidate in ('中級', '高級')
    ),
  grade_status text not null
    check (length(grade_status) between 1 and 128),
  candidate_evidence jsonb not null
    check (jsonb_typeof(candidate_evidence) = 'object'),
  grade_fields jsonb not null
    check (jsonb_typeof(grade_fields) = 'object'),
  evidence_priority text not null
    check (
      evidence_priority in (
        'human_confirmation',
        'quote',
        'catalog',
        'photo_or_image',
        'detail_drawing',
        'corpus',
        'demand_preference',
        'item_name'
      )
    ),
  confidence_grade text not null
    check (confidence_grade in ('A', 'B', 'C', 'D', 'X')),
  review_state_label text not null
    check (length(review_state_label) between 1 and 512),
  review_reason text not null
    check (length(review_reason) between 1 and 4096),
  missing_info_items text[] not null default '{}'::text[]
    check (array_position(missing_info_items, null) is null),
  usable_for_later_matching boolean not null,
  usable_for_evidence_retrieval boolean not null,
  pricing_trigger_policy text not null default 'not_a_pricing_trigger'
    check (pricing_trigger_policy = 'not_a_pricing_trigger'),
  lifecycle_state knowledge.lifecycle_state not null default 'pending_review'
    check (lifecycle_state = 'pending_review'),
  is_budget_candidate boolean not null default false
    check (is_budget_candidate = false),
  auto_trigger_allowed boolean not null default false
    check (auto_trigger_allowed = false),
  embedding_allowed boolean not null default false
    check (embedding_allowed = false),
  publication_authorized boolean not null default false
    check (publication_authorized = false),
  candidate_creation_authorized boolean not null default false
    check (candidate_creation_authorized = false),
  direct_pricing_allowed boolean not null default false
    check (direct_pricing_allowed = false),
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  raw_payload jsonb not null
    check (jsonb_typeof(raw_payload) = 'object'),
  imported_at timestamptz not null default now(),
  check (source_record_key = mapping_id),
  unique (import_batch_id, mapping_id),
  unique (import_batch_id, source_record_key),
  unique (import_batch_id, source_row_identity)
);

create index woodwork_candidates_import_batch_idx
on knowledge_staging.woodwork_candidates(import_batch_id);

create index woodwork_candidates_source_record_idx
on knowledge_staging.woodwork_candidates(source_record_id);

create index woodwork_candidates_mapping_lookup_idx
on knowledge_staging.woodwork_candidates(mapping_id);

create index woodwork_candidates_row_identity_lookup_idx
on knowledge_staging.woodwork_candidates(source_row_identity);

create index woodwork_candidates_trade_lookup_idx
on knowledge_staging.woodwork_candidates(source_trade);

create index woodwork_candidates_bucket_review_idx
on knowledge_staging.woodwork_candidates(bucket, review_state_label);

create index woodwork_candidates_component_tags_gin
on knowledge_staging.woodwork_candidates
using gin (component_tags);

alter table knowledge_staging.woodwork_candidates
enable row level security;

alter table knowledge_staging.woodwork_candidates
force row level security;

create policy woodwork_candidates_reviewer_select
on knowledge_staging.woodwork_candidates
for select
to authenticated
using (knowledge.is_interactive_reviewer());

create policy woodwork_candidates_reviewer_insert
on knowledge_staging.woodwork_candidates
for insert
to authenticated
with check (
  knowledge.is_interactive_reviewer()
  and exists (
    select 1
    from knowledge_staging.source_records source_record
    where source_record.id = woodwork_candidates.source_record_id
      and source_record.import_batch_id =
        woodwork_candidates.import_batch_id
      and source_record.source_key =
        woodwork_candidates.source_record_key
  )
);

revoke all
on knowledge_staging.woodwork_candidates
from public, anon, authenticated;

grant select, insert
on knowledge_staging.woodwork_candidates
to authenticated;

create table knowledge.unified_items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique
    check (
      length(item_code) between 3 and 128
      and item_code ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    ),
  unified_item_name text not null
    check (length(unified_item_name) between 1 and 512),
  trade_code text not null
    check (
      length(trade_code) between 1 and 128
      and trade_code ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    ),
  default_unit text not null
    check (length(default_unit) between 1 and 64),
  effective_entry_version_id uuid
    references knowledge.entry_versions(id),
  lifecycle_state knowledge.lifecycle_state not null default 'draft',
  direct_pricing_allowed boolean not null default false
    check (direct_pricing_allowed = false),
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid(),
  check (
    lifecycle_state <> 'approved'
    or effective_entry_version_id is not null
  )
);

create index unified_items_effective_version_idx
on knowledge.unified_items(effective_entry_version_id);

create index unified_items_trade_lifecycle_idx
on knowledge.unified_items(trade_code, lifecycle_state);

alter table knowledge.budget_rules
add constraint budget_rules_unified_item_code_fkey
foreign key (unified_item_code)
references knowledge.unified_items(item_code);

alter table knowledge.price_observations
add constraint price_observations_unified_item_code_fkey
foreign key (unified_item_code)
references knowledge.unified_items(item_code);

alter table casework.candidate_budget_lines
add constraint candidate_budget_lines_unified_item_code_fkey
foreign key (unified_item_code)
references knowledge.unified_items(item_code);

create index budget_rules_unified_item_code_idx
on knowledge.budget_rules(unified_item_code);

create index candidate_budget_lines_unified_item_code_idx
on casework.candidate_budget_lines(unified_item_code);

create or replace function knowledge.prepare_unified_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();

  if new.effective_entry_version_id is not null
    and not exists (
      select 1
      from knowledge.entry_versions version
      join knowledge.entries entry
        on entry.id = version.entry_id
      where version.id = new.effective_entry_version_id
        and entry.domain = 'budget'
    ) then
    raise exception 'Unified item effective version must belong to budget knowledge';
  end if;

  if new.lifecycle_state = 'approved'
    and not exists (
      select 1
      from knowledge.entry_versions version
      join knowledge.entries entry
        on entry.id = version.entry_id
      where version.id = new.effective_entry_version_id
        and version.lifecycle_state = 'approved'
        and entry.lifecycle_state = 'approved'
        and entry.current_version_id = version.id
        and entry.domain = 'budget'
    ) then
    raise exception 'Approved unified item requires the current approved budget version';
  end if;

  return new;
end;
$$;

create trigger unified_items_prepare
before insert or update on knowledge.unified_items
for each row execute function knowledge.prepare_unified_item();

create trigger unified_items_lifecycle_guard
before update of lifecycle_state on knowledge.unified_items
for each row execute function knowledge.guard_lifecycle_transition();

alter table knowledge.unified_items
enable row level security;

alter table knowledge.unified_items
force row level security;

create policy unified_items_approved_or_reviewer_select
on knowledge.unified_items
for select
to authenticated
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and knowledge.can_access_domain('budget')
  )
);

create policy unified_items_reviewer_insert
on knowledge.unified_items
for insert
to authenticated
with check (knowledge.is_interactive_reviewer());

create policy unified_items_reviewer_update
on knowledge.unified_items
for update
to authenticated
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

revoke all
on knowledge.unified_items
from public, anon, authenticated;

grant select, insert, update
on knowledge.unified_items
to authenticated;

create or replace function public.knowledge_ingest_woodwork_batch(
  p_envelope jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_manifest jsonb;
  v_records jsonb;
  v_candidates jsonb;
  v_budget_items jsonb;
  v_quality_issues jsonb;
  v_record jsonb;
  v_candidate jsonb;
  v_issue jsonb;
  v_source_ref jsonb;
  v_original_item jsonb;
  v_candidate_evidence jsonb;
  v_grade_fields jsonb;
  v_next_use jsonb;
  v_component_tags jsonb;
  v_missing_info_items jsonb;
  v_idempotency_key text;
  v_correlation_key text;
  v_source_locator text;
  v_source_sha256 text;
  v_existing_correlation text;
  v_existing_locator text;
  v_existing_sha256 text;
  v_existing_source_kind text;
  v_mapping_id text;
  v_source_key text;
  v_issue_source_record_key text;
  v_source_record_id uuid;
  v_batch_id uuid;
  v_candidate_count integer;
  v_record_count integer;
  v_quality_issue_count integer;
  v_source_record_count integer;
  v_chunk_index integer;
  v_chunk_count integer;
  v_candidate_index integer;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Active interactive PCM or admin reviewer required';
  end if;

  if coalesce(jsonb_typeof(p_envelope), '') <> 'object'
    or coalesce(
      p_envelope ->> 'schema_version',
      ''
    ) <> 'knowledge_staging.v1' then
    raise exception 'Unsupported woodwork staging envelope';
  end if;

  v_manifest := p_envelope -> 'source_manifest';
  v_records := p_envelope -> 'records';
  v_candidates := p_envelope -> 'woodwork_candidates';
  v_budget_items := p_envelope -> 'budget_items';
  v_quality_issues := p_envelope -> 'quality_issues';

  if jsonb_typeof(v_manifest) <> 'object'
    or jsonb_typeof(v_records) <> 'array'
    or jsonb_typeof(v_candidates) <> 'array'
    or jsonb_typeof(v_budget_items) <> 'array'
    or jsonb_typeof(v_quality_issues) <> 'array' then
    raise exception 'Woodwork staging collections are invalid';
  end if;

  v_record_count := jsonb_array_length(v_records);
  v_candidate_count := jsonb_array_length(v_candidates);
  v_quality_issue_count := jsonb_array_length(v_quality_issues);
  if v_candidate_count < 1
    or v_candidate_count > 1000
    or v_record_count <> v_candidate_count
    or jsonb_array_length(v_budget_items) <> 0
    or v_quality_issue_count > 500 then
    raise exception 'Woodwork staging chunk exceeds the accepted size';
  end if;

  v_idempotency_key := nullif(p_envelope ->> 'idempotency_key', '');
  v_correlation_key := nullif(p_envelope ->> 'correlation_key', '');
  v_source_locator := nullif(v_manifest ->> 'source_locator', '');
  v_source_sha256 := nullif(v_manifest ->> 'source_sha256', '');

  if v_idempotency_key is null
    or v_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    or v_correlation_key is null
    or v_correlation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then
    raise exception 'Invalid woodwork idempotency or correlation key';
  end if;

  if coalesce(v_manifest ->> 'source_kind', '') <> 'woodwork_mapping'
    or v_source_locator is null
    or length(v_source_locator) > 2048
    or v_source_locator ~ '[[:cntrl:]]'
    or v_source_sha256 is null
    or v_source_sha256 !~ '^[A-Fa-f0-9]{64}$' then
    raise exception 'Invalid woodwork source manifest';
  end if;

  if coalesce(v_manifest ->> 'source_record_count', '') !~ '^[0-9]+$'
    or coalesce(v_manifest ->> 'chunk_index', '') !~ '^[0-9]+$'
    or coalesce(v_manifest ->> 'chunk_count', '') !~ '^[0-9]+$' then
    raise exception 'Invalid woodwork source counts';
  end if;

  v_source_record_count := (v_manifest ->> 'source_record_count')::integer;
  v_chunk_index := (v_manifest ->> 'chunk_index')::integer;
  v_chunk_count := (v_manifest ->> 'chunk_count')::integer;

  if v_source_record_count < v_candidate_count
    or v_chunk_index < 1
    or v_chunk_count < 1
    or v_chunk_index > v_chunk_count then
    raise exception 'Invalid woodwork source chunk';
  end if;

  select
    import_batch.id,
    import_batch.correlation_key,
    import_batch.source_locator,
    import_batch.source_sha256,
    import_batch.source_kind
  into
    v_batch_id,
    v_existing_correlation,
    v_existing_locator,
    v_existing_sha256,
    v_existing_source_kind
  from knowledge_staging.import_batches import_batch
  where import_batch.idempotency_key = v_idempotency_key;

  if v_batch_id is not null then
    if v_existing_correlation <> v_correlation_key
      or v_existing_locator <> v_source_locator
      or v_existing_sha256 <> v_source_sha256
      or v_existing_source_kind <> 'woodwork_mapping' then
      raise exception 'Woodwork idempotency key conflicts with another batch';
    end if;

    return jsonb_build_object(
      'batchId', v_batch_id,
      'correlationKey', v_correlation_key,
      'reused', true,
      'sourceRecordCount', (
        select count(*)
        from knowledge_staging.source_records source_record
        where source_record.import_batch_id = v_batch_id
      ),
      'woodworkCandidateCount', (
        select count(*)
        from knowledge_staging.woodwork_candidates candidate
        where candidate.import_batch_id = v_batch_id
      ),
      'qualityIssueCount', (
        select count(*)
        from knowledge_staging.quality_issues issue
        where issue.import_batch_id = v_batch_id
      ),
      'lifecycleState', 'pending_review',
      'publicationAuthorized', false,
      'candidateCreationAuthorized', false,
      'directPricingAllowed', false,
      'formalImpact', 'none'
    );
  end if;

  insert into knowledge_staging.import_batches (
    schema_version,
    idempotency_key,
    correlation_key,
    source_kind,
    source_locator,
    source_sha256,
    source_record_count,
    chunk_index,
    chunk_count,
    source_manifest,
    lifecycle_state,
    publication_authorized,
    candidate_creation_authorized,
    notes
  )
  values (
    'knowledge_staging.v1',
    v_idempotency_key,
    v_correlation_key,
    'woodwork_mapping',
    v_source_locator,
    v_source_sha256,
    v_source_record_count,
    v_chunk_index,
    v_chunk_count,
    v_manifest,
    'pending_review',
    false,
    false,
    coalesce(v_manifest ->> 'notes', '')
  )
  on conflict (idempotency_key)
  do nothing
  returning id into v_batch_id;

  if v_batch_id is null then
    select import_batch.id
    into v_batch_id
    from knowledge_staging.import_batches import_batch
    where import_batch.idempotency_key = v_idempotency_key
      and import_batch.correlation_key = v_correlation_key
      and import_batch.source_kind = 'woodwork_mapping'
      and import_batch.source_locator = v_source_locator
      and import_batch.source_sha256 = v_source_sha256;

    if v_batch_id is null then
      raise exception 'Concurrent woodwork staging batch conflict';
    end if;

    return jsonb_build_object(
      'batchId', v_batch_id,
      'correlationKey', v_correlation_key,
      'reused', true,
      'sourceRecordCount', (
        select count(*)
        from knowledge_staging.source_records source_record
        where source_record.import_batch_id = v_batch_id
      ),
      'woodworkCandidateCount', (
        select count(*)
        from knowledge_staging.woodwork_candidates candidate
        where candidate.import_batch_id = v_batch_id
      ),
      'qualityIssueCount', (
        select count(*)
        from knowledge_staging.quality_issues issue
        where issue.import_batch_id = v_batch_id
      ),
      'lifecycleState', 'pending_review',
      'publicationAuthorized', false,
      'candidateCreationAuthorized', false,
      'directPricingAllowed', false,
      'formalImpact', 'none'
    );
  end if;

  for v_candidate, v_candidate_index in
    select value, ordinality::integer
    from jsonb_array_elements(v_candidates) with ordinality
  loop
    v_record := v_records -> (v_candidate_index - 1);
    if jsonb_typeof(v_candidate) <> 'object' then
      raise exception 'Woodwork candidate must be an object';
    end if;

    v_mapping_id := nullif(btrim(v_candidate ->> 'mapping_id'), '');
    v_source_key := nullif(btrim(v_candidate ->> 'source_record_key'), '');
    v_source_ref := v_candidate -> 'source_ref';
    v_original_item := v_candidate -> 'original_item';
    v_candidate_evidence := v_candidate -> 'candidate_evidence';
    v_grade_fields := v_candidate -> 'grade_fields';
    v_next_use := v_candidate -> 'next_use';
    v_component_tags := v_candidate_evidence -> 'component_tags';
    v_missing_info_items := v_candidate -> 'missing_info_items';

    if v_mapping_id is null
      or v_source_key is null
      or v_source_key <> v_mapping_id
      or jsonb_typeof(v_record) <> 'object'
      or coalesce(v_record ->> 'source_key', '') <> v_source_key
      or coalesce(v_record ->> 'source_status', '') <> '待確認'
      or jsonb_typeof(v_record -> 'raw_payload') <> 'object'
      or coalesce(
        v_record -> 'raw_payload' ->> 'mapping_id',
        ''
      ) <> v_source_key
      or coalesce(
        v_record -> 'is_budget_candidate',
        'null'::jsonb
      ) <> 'false'::jsonb
      or coalesce(
        v_record -> 'auto_trigger_allowed',
        'null'::jsonb
      ) <> 'false'::jsonb
      or jsonb_typeof(v_source_ref) <> 'object'
      or jsonb_typeof(v_original_item) <> 'object'
      or jsonb_typeof(v_candidate_evidence) <> 'object'
      or jsonb_typeof(v_grade_fields) <> 'object'
      or jsonb_typeof(v_next_use) <> 'object'
      or jsonb_typeof(v_component_tags) <> 'array'
      or jsonb_typeof(v_missing_info_items) <> 'array' then
      raise exception 'Woodwork candidate structure is invalid';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_component_tags) tag
      where jsonb_typeof(tag) <> 'string'
    ) or exists (
      select 1
      from jsonb_array_elements(v_missing_info_items) item
      where jsonb_typeof(item) <> 'string'
    ) then
      raise exception 'Woodwork candidate arrays must contain strings';
    end if;

    if coalesce(v_source_ref ->> 'source_row_number', '') !~ '^[1-9][0-9]*$'
      or jsonb_typeof(v_next_use -> 'usable_for_later_matching') <> 'boolean'
      or jsonb_typeof(v_next_use -> 'usable_for_evidence_retrieval') <> 'boolean'
      or coalesce(
        v_next_use -> 'publication_authorized',
        'null'::jsonb
      ) <> 'false'::jsonb
      or coalesce(
        v_next_use -> 'candidate_creation_authorized',
        'null'::jsonb
      ) <> 'false'::jsonb
      or coalesce(
        v_next_use -> 'direct_pricing_allowed',
        'null'::jsonb
      ) <> 'false'::jsonb
      or coalesce(
        v_next_use -> 'auto_trigger_allowed',
        'null'::jsonb
      ) <> 'false'::jsonb
      or coalesce(
        v_next_use -> 'auto_select_allowed',
        'null'::jsonb
      ) <> 'false'::jsonb
      or nullif(
        btrim(v_next_use ->> 'pricing_trigger_note'),
        ''
      ) is null
      or nullif(btrim(v_source_ref ->> 'source_workbook'), '') is null
      or nullif(btrim(v_source_ref ->> 'source_sheet'), '') is null
      or nullif(btrim(v_source_ref ->> 'row_identity'), '') is null
      or nullif(btrim(v_source_ref ->> 'source_trade'), '') is null
      or nullif(btrim(v_original_item ->> 'item_name'), '') is null
      or nullif(btrim(v_candidate_evidence ->> 'woodwork_scope'), '') is null
      or nullif(btrim(v_grade_fields ->> 'grade_status'), '') is null
      or coalesce(
        v_candidate ->> 'pricing_trigger_policy',
        ''
      ) <> 'not_a_pricing_trigger'
      or nullif(btrim(v_candidate ->> 'review_state_label'), '') is null
      or nullif(btrim(v_candidate ->> 'review_reason'), '') is null then
      raise exception 'Woodwork candidate required fields are invalid';
    end if;

    insert into knowledge_staging.source_records (
      import_batch_id,
      source_key,
      source_status,
      mapped_lifecycle,
      is_budget_candidate,
      auto_trigger_allowed,
      publication_authorized,
      candidate_creation_authorized,
      direct_pricing_allowed,
      raw_payload
    )
    values (
      v_batch_id,
      v_source_key,
      '待確認',
      'pending_review',
      false,
      false,
      false,
      false,
      false,
      v_record -> 'raw_payload'
    )
    returning id into v_source_record_id;

    insert into knowledge_staging.woodwork_candidates (
      import_batch_id,
      source_record_id,
      source_record_key,
      source_kind,
      mapping_id,
      bucket,
      source_workbook,
      source_sheet,
      source_row_number,
      source_row_identity,
      source_trade,
      original_item_name,
      original_spec_text,
      original_unit,
      woodwork_scope,
      component_tags,
      public_grade_candidate,
      grade_status,
      candidate_evidence,
      grade_fields,
      evidence_priority,
      confidence_grade,
      review_state_label,
      review_reason,
      missing_info_items,
      usable_for_later_matching,
      usable_for_evidence_retrieval,
      pricing_trigger_policy,
      lifecycle_state,
      is_budget_candidate,
      auto_trigger_allowed,
      embedding_allowed,
      publication_authorized,
      candidate_creation_authorized,
      direct_pricing_allowed,
      formal_impact,
      raw_payload
    )
    values (
      v_batch_id,
      v_source_record_id,
      v_source_key,
      'woodwork_mapping',
      v_mapping_id,
      v_candidate ->> 'bucket',
      v_source_ref ->> 'source_workbook',
      v_source_ref ->> 'source_sheet',
      (v_source_ref ->> 'source_row_number')::integer,
      v_source_ref ->> 'row_identity',
      v_source_ref ->> 'source_trade',
      v_original_item ->> 'item_name',
      nullif(v_original_item ->> 'spec_text', ''),
      nullif(v_original_item ->> 'unit', ''),
      v_candidate_evidence ->> 'woodwork_scope',
      array(
        select jsonb_array_elements_text(v_component_tags)
      ),
      nullif(v_grade_fields ->> 'public_grade_candidate', ''),
      v_grade_fields ->> 'grade_status',
      v_candidate_evidence,
      v_grade_fields,
      coalesce(
        nullif(v_candidate ->> 'evidence_priority', ''),
        v_candidate ->> 'evidence_priority_used'
      ),
      v_candidate ->> 'confidence_grade',
      v_candidate ->> 'review_state_label',
      v_candidate ->> 'review_reason',
      array(
        select jsonb_array_elements_text(v_missing_info_items)
      ),
      (v_next_use ->> 'usable_for_later_matching')::boolean,
      (v_next_use ->> 'usable_for_evidence_retrieval')::boolean,
      'not_a_pricing_trigger',
      'pending_review',
      false,
      false,
      false,
      false,
      false,
      false,
      'none',
      v_candidate
    );
  end loop;

  for v_issue in
    select value
    from jsonb_array_elements(v_quality_issues)
  loop
    if jsonb_typeof(v_issue) <> 'object'
      or coalesce(
        v_issue ->> 'issue_code',
        ''
      ) <> 'demolition_candidate_conflict'
      or nullif(btrim(v_issue ->> 'description'), '') is null
      or coalesce(v_issue ->> 'severity', '') <> 'warning'
      or jsonb_typeof(coalesce(v_issue -> 'evidence', '{}'::jsonb)) <> 'object'
      or nullif(btrim(v_issue ->> 'source_record_key'), '') is null
      or coalesce(v_issue ->> 'next_reviewer_role', '') <> 'pcm' then
      raise exception 'Woodwork quality issue structure is invalid';
    end if;

    v_issue_source_record_key := nullif(
      btrim(v_issue ->> 'source_record_key'),
      ''
    );
    v_source_record_id := null;
    select candidate.source_record_id
    into v_source_record_id
    from knowledge_staging.woodwork_candidates candidate
    where candidate.import_batch_id = v_batch_id
      and candidate.source_record_key = v_issue_source_record_key;

    if v_source_record_id is null then
      raise exception 'Woodwork quality issue references an unknown source record';
    end if;

    if coalesce(
      v_issue -> 'evidence' -> 'quarantined',
      'null'::jsonb
    ) <> 'true'::jsonb
      or coalesce(
        v_issue -> 'evidence' ->> 'mapping_id',
        ''
      ) <> v_issue_source_record_key
      or not exists (
        select 1
        from knowledge_staging.woodwork_candidates candidate
        where candidate.import_batch_id = v_batch_id
          and candidate.source_record_key = v_issue_source_record_key
          and candidate.bucket = 'eligible_candidate_reference'
      ) then
      raise exception 'Demolition candidate conflict evidence is malformed';
    end if;

    insert into knowledge_staging.quality_issues (
      import_batch_id,
      source_record_id,
      issue_code,
      severity,
      description,
      evidence,
      review_state,
      next_reviewer_role
    )
    values (
      v_batch_id,
      v_source_record_id,
      v_issue ->> 'issue_code',
      v_issue ->> 'severity',
      v_issue ->> 'description',
      coalesce(v_issue -> 'evidence', '{}'::jsonb),
      'pending_review',
      'pcm'
    );
  end loop;

  update knowledge_staging.import_batches
  set completed_at = now()
  where id = v_batch_id;

  return jsonb_build_object(
    'batchId', v_batch_id,
    'correlationKey', v_correlation_key,
    'reused', false,
    'sourceRecordCount', v_candidate_count,
    'woodworkCandidateCount', v_candidate_count,
    'qualityIssueCount', v_quality_issue_count,
    'lifecycleState', 'pending_review',
    'publicationAuthorized', false,
    'candidateCreationAuthorized', false,
    'directPricingAllowed', false,
    'formalImpact', 'none'
  );
end;
$$;

revoke all
on function public.knowledge_ingest_woodwork_batch(jsonb)
from public, anon, authenticated;

grant execute
on function public.knowledge_ingest_woodwork_batch(jsonb)
to authenticated;

commit;
