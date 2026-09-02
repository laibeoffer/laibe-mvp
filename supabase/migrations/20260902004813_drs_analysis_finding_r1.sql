begin;

do $analysis_r1_precondition$
begin
  if to_regclass('casework.cases') is null
    or to_regclass('casework.drs_three_role_memberships') is null
    or to_regclass('casework.drs_three_role_case_authority') is null
    or to_regclass('casework.document_versions') is null
    or to_regclass('casework.document_operation_receipts') is null
    or to_regclass('integration.drs_three_role_auth_session_bindings') is null
    or to_regclass('integration.drs_three_role_server_sessions') is null
    or to_regclass('casework.case_events') is null
  then
    raise exception 'DRS_ANALYSIS_R1_PREDECESSOR_MISSING';
  end if;
  if to_regnamespace('drs_analysis_private') is not null
    or to_regclass('casework.drs_analysis_jobs') is not null
    or to_regclass('casework.drs_analysis_findings') is not null
  then
    raise exception 'DRS_ANALYSIS_R1_PARTIAL_FOOTPRINT';
  end if;
end;
$analysis_r1_precondition$;

create schema drs_analysis_private;
revoke all on schema drs_analysis_private from public, anon, authenticated;
grant usage on schema drs_analysis_private to service_role;

create table casework.drs_analysis_jobs (
  job_id uuid primary key default extensions.gen_random_uuid(),
  planned_run_id uuid not null unique default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  run_key_sha256 text not null unique check (run_key_sha256 ~ '^[a-f0-9]{64}$'),
  enqueue_payload_sha256 text not null
    check (enqueue_payload_sha256 ~ '^[a-f0-9]{64}$'),
  input_manifest_sha256 text not null
    check (input_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  prompt_version text not null check (length(prompt_version) between 1 and 128),
  prompt_sha256 text not null check (prompt_sha256 ~ '^[a-f0-9]{64}$'),
  model_adapter_version text not null
    check (length(model_adapter_version) between 1 and 128),
  model_profile_version text not null
    check (length(model_profile_version) between 1 and 128),
  rule_version text not null check (length(rule_version) between 1 and 128),
  rule_sha256 text not null check (rule_sha256 ~ '^[a-f0-9]{64}$'),
  output_schema_version text not null
    check (length(output_schema_version) between 1 and 128),
  output_schema_sha256 text not null
    check (output_schema_sha256 ~ '^[a-f0-9]{64}$'),
  provider_neutral boolean not null default true check (provider_neutral),
  human_review_required boolean not null default true check (human_review_required),
  formal_impact text not null default 'none' check (formal_impact = 'none'),
  job_state text not null default 'QUEUED'
    check (job_state in ('QUEUED', 'CLAIMED', 'COMPLETED', 'FAILED')),
  claimed_by uuid,
  claimed_at timestamptz,
  lease_until timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  output_sha256 text check (output_sha256 is null or output_sha256 ~ '^[a-f0-9]{64}$'),
  last_error_code text check (
    last_error_code is null
    or (length(last_error_code) between 1 and 128 and last_error_code !~ '[[:cntrl:]]')
  ),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  completed_at timestamptz,
  constraint drs_analysis_jobs_claim_lifecycle_check check (
    (job_state = 'QUEUED' and claimed_by is null and claimed_at is null and lease_until is null)
    or (job_state = 'CLAIMED' and claimed_by is not null and claimed_at is not null
      and lease_until is not null and lease_until > claimed_at)
    or (job_state in ('COMPLETED', 'FAILED'))
  )
);

create index drs_analysis_jobs_claimable_idx
  on casework.drs_analysis_jobs(job_state, lease_until, created_at, job_id)
  where job_state in ('QUEUED', 'CLAIMED');

create table casework.drs_analysis_job_documents (
  job_id uuid not null references casework.drs_analysis_jobs(job_id) on delete restrict,
  ordinal smallint not null check (ordinal between 1 and 24),
  case_id uuid not null,
  document_id uuid not null,
  document_version_id uuid not null,
  document_version_ref text not null check (document_version_ref ~ '^dvr_[0-9a-z]{20,40}$'),
  document_kind text not null check (document_kind in ('quote', 'drawing', 'contract')),
  document_sha256 text not null check (document_sha256 ~ '^[a-f0-9]{64}$'),
  primary key (job_id, ordinal),
  unique (job_id, document_version_id),
  foreign key (case_id, document_id, document_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

create table casework.drs_analysis_runs (
  analysis_run_id uuid primary key,
  job_id uuid not null unique references casework.drs_analysis_jobs(job_id) on delete restrict,
  case_id uuid not null references casework.cases(id) on delete restrict,
  run_key_sha256 text not null unique check (run_key_sha256 ~ '^[a-f0-9]{64}$'),
  input_manifest_sha256 text not null check (input_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  prompt_version text not null,
  prompt_sha256 text not null check (prompt_sha256 ~ '^[a-f0-9]{64}$'),
  model_adapter_version text not null,
  model_profile_version text not null,
  rule_version text not null,
  rule_sha256 text not null check (rule_sha256 ~ '^[a-f0-9]{64}$'),
  output_schema_version text not null,
  output_schema_sha256 text not null check (output_schema_sha256 ~ '^[a-f0-9]{64}$'),
  output_sha256 text not null check (output_sha256 ~ '^[a-f0-9]{64}$'),
  provider_neutral boolean not null check (provider_neutral),
  human_review_required boolean not null check (human_review_required),
  formal_impact text not null check (formal_impact = 'none'),
  completed_at timestamptz not null default pg_catalog.clock_timestamp()
);

create table casework.drs_analysis_run_documents (
  analysis_run_id uuid not null
    references casework.drs_analysis_runs(analysis_run_id) on delete restrict,
  ordinal smallint not null check (ordinal between 1 and 24),
  case_id uuid not null,
  document_id uuid not null,
  document_version_id uuid not null,
  document_version_ref text not null check (document_version_ref ~ '^dvr_[0-9a-z]{20,40}$'),
  document_kind text not null check (document_kind in ('quote', 'drawing', 'contract')),
  document_sha256 text not null check (document_sha256 ~ '^[a-f0-9]{64}$'),
  primary key (analysis_run_id, ordinal),
  unique (analysis_run_id, document_version_id),
  foreign key (case_id, document_id, document_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

create table casework.drs_analysis_findings (
  finding_id uuid not null,
  finding_version integer not null check (finding_version >= 1),
  analysis_run_id uuid not null
    references casework.drs_analysis_runs(analysis_run_id) on delete restrict,
  case_id uuid not null references casework.cases(id) on delete restrict,
  domain text not null check (domain in ('quote', 'drawing', 'contract')),
  code text not null check (code ~ '^[A-Z][A-Z0-9_]{2,127}$'),
  classification text not null
    check (classification in ('confirmed', 'conflict', 'unknown', 'risk')),
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  statement text not null check (length(statement) between 1 and 2000),
  rationale text not null check (length(rationale) between 1 and 2000),
  unknowns jsonb not null check (jsonb_typeof(unknowns) = 'array'),
  source_document_versions jsonb not null
    check (jsonb_typeof(source_document_versions) = 'array'),
  provider_neutral boolean not null check (provider_neutral),
  human_review_required boolean not null check (human_review_required),
  formal_impact text not null check (formal_impact = 'none'),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (finding_id, finding_version),
  unique (analysis_run_id, finding_id, finding_version)
);

create index drs_analysis_findings_case_run_idx
  on casework.drs_analysis_findings(case_id, analysis_run_id, finding_id);

create table casework.drs_analysis_finding_citations (
  citation_id uuid primary key default extensions.gen_random_uuid(),
  finding_id uuid not null,
  finding_version integer not null,
  ordinal smallint not null check (ordinal between 1 and 100),
  case_id uuid not null,
  document_id uuid not null,
  document_version_id uuid not null,
  document_sha256 text not null check (document_sha256 ~ '^[a-f0-9]{64}$'),
  citation_kind text not null check (
    citation_kind in ('quote_row', 'drawing_region', 'contract_region', 'document_manifest_gap')
  ),
  quote_page integer,
  quote_sheet text,
  quote_row integer,
  quote_cell_range text,
  drawing_set text,
  drawing_sheet text,
  drawing_page integer,
  drawing_scale_status text,
  drawing_scale_value text,
  coordinate_region jsonb,
  contract_clause text,
  contract_page integer,
  contract_text_region jsonb,
  manifest_gap_type text,
  manifest_missing_pages integer[],
  unique (finding_id, finding_version, ordinal),
  foreign key (finding_id, finding_version)
    references casework.drs_analysis_findings(finding_id, finding_version)
    on delete restrict,
  foreign key (case_id, document_id, document_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict,
  constraint drs_analysis_citation_discriminator_check check (
    (
      citation_kind = 'quote_row'
      and quote_row >= 1
      and ((quote_page >= 1 and quote_sheet is null and quote_cell_range is null)
        or (quote_page is null and quote_sheet is not null and quote_cell_range is not null))
      and drawing_set is null and drawing_sheet is null and drawing_page is null
      and drawing_scale_status is null and drawing_scale_value is null
      and coordinate_region is null and contract_clause is null
      and contract_page is null and contract_text_region is null
      and manifest_gap_type is null and manifest_missing_pages is null
    ) or (
      citation_kind = 'drawing_region'
      and quote_page is null and quote_sheet is null and quote_row is null
      and quote_cell_range is null and drawing_set is not null
      and drawing_sheet is not null and drawing_page >= 1
      and drawing_scale_status in ('confirmed', 'missing', 'unreadable', 'conflict')
      and coordinate_region is not null and jsonb_typeof(coordinate_region) = 'object'
      and contract_clause is null and contract_page is null
      and contract_text_region is null and manifest_gap_type is null
      and manifest_missing_pages is null
    ) or (
      citation_kind = 'contract_region'
      and quote_page is null and quote_sheet is null and quote_row is null
      and quote_cell_range is null and drawing_set is null and drawing_sheet is null
      and drawing_page is null and drawing_scale_status is null
      and drawing_scale_value is null and coordinate_region is null
      and contract_clause is not null and contract_page >= 1
      and contract_text_region is not null and jsonb_typeof(contract_text_region) = 'object'
      and manifest_gap_type is null and manifest_missing_pages is null
    ) or (
      citation_kind = 'document_manifest_gap'
      and quote_page is null and quote_sheet is null and quote_row is null
      and quote_cell_range is null and drawing_set is null and drawing_sheet is null
      and drawing_page is null and drawing_scale_status is null
      and drawing_scale_value is null and coordinate_region is null
      and contract_clause is null and contract_page is null
      and contract_text_region is null
      and manifest_gap_type in ('missing_page', 'whole_document_unreadable')
      and cardinality(manifest_missing_pages) >= 1
    )
  )
);

create table casework.drs_analysis_finding_lifecycle_events (
  lifecycle_event_id uuid primary key default extensions.gen_random_uuid(),
  finding_id uuid not null,
  finding_version integer not null,
  case_id uuid not null references casework.cases(id) on delete restrict,
  lifecycle text not null check (lifecycle in ('current', 'stale')),
  caused_by_document_version_id uuid,
  reason_code text not null check (
    reason_code in ('ANALYSIS_COMPLETED', 'SOURCE_DOCUMENT_SUPERSEDED')
  ),
  recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
  foreign key (finding_id, finding_version)
    references casework.drs_analysis_findings(finding_id, finding_version)
    on delete restrict,
  unique (finding_id, finding_version, lifecycle, caused_by_document_version_id)
);

create unique index drs_analysis_finding_one_initial_current
  on casework.drs_analysis_finding_lifecycle_events(finding_id, finding_version)
  where lifecycle = 'current';

create table casework.drs_analysis_review_decisions (
  review_decision_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  finding_id uuid not null,
  finding_version integer not null,
  disposition text not null check (disposition in ('ACCEPT', 'EDIT', 'REJECT')),
  edited_statement text,
  edited_rationale text,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_auth_session_id uuid not null,
  actor_authority_membership_id uuid not null,
  authority_version bigint not null check (authority_version >= 1),
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  case_state_transition boolean not null default false check (not case_state_transition),
  recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
  foreign key (finding_id, finding_version)
    references casework.drs_analysis_findings(finding_id, finding_version)
    on delete restrict,
  unique (case_id, idempotency_key),
  constraint drs_analysis_review_edit_shape_check check (
    (disposition = 'EDIT' and length(edited_statement) between 1 and 2000
      and length(edited_rationale) between 1 and 2000)
    or (disposition in ('ACCEPT', 'REJECT')
      and edited_statement is null and edited_rationale is null)
  )
);

create function drs_analysis_private.reject_immutable_change_v1()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'DRS_ANALYSIS_IMMUTABLE_RECORD';
end;
$function$;

create trigger drs_analysis_job_documents_immutable
before update or delete on casework.drs_analysis_job_documents
for each row execute function drs_analysis_private.reject_immutable_change_v1();
create trigger drs_analysis_runs_immutable
before update or delete on casework.drs_analysis_runs
for each row execute function drs_analysis_private.reject_immutable_change_v1();
create trigger drs_analysis_run_documents_immutable
before update or delete on casework.drs_analysis_run_documents
for each row execute function drs_analysis_private.reject_immutable_change_v1();
create trigger drs_analysis_findings_immutable
before update or delete on casework.drs_analysis_findings
for each row execute function drs_analysis_private.reject_immutable_change_v1();
create trigger drs_analysis_citations_immutable
before update or delete on casework.drs_analysis_finding_citations
for each row execute function drs_analysis_private.reject_immutable_change_v1();
create trigger drs_analysis_lifecycle_immutable
before update or delete on casework.drs_analysis_finding_lifecycle_events
for each row execute function drs_analysis_private.reject_immutable_change_v1();
create trigger drs_analysis_review_decisions_immutable
before update or delete on casework.drs_analysis_review_decisions
for each row execute function drs_analysis_private.reject_immutable_change_v1();

create function drs_analysis_private.authorized_drs_context_v1(
  p_actor_user_id uuid,
  p_actor_auth_session_id uuid,
  p_case_id uuid,
  p_actor_authority_membership_id uuid,
  p_actor_role text,
  p_authority_version bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_actor_role = 'drs'
    and exists (
      select 1
      from casework.drs_three_role_memberships membership_record
      join casework.drs_three_role_case_authority authority_record
        on authority_record.case_id = membership_record.case_id
       and authority_record.authority_version = membership_record.authority_version
      join integration.drs_three_role_auth_session_bindings binding_record
        on binding_record.membership_id = membership_record.membership_id
       and binding_record.user_id = membership_record.user_id
       and binding_record.authority_version = membership_record.authority_version
      join integration.drs_three_role_server_sessions session_record
        on session_record.auth_session_id = binding_record.auth_session_id
       and session_record.user_id = binding_record.user_id
       and session_record.membership_id = binding_record.membership_id
       and session_record.authority_version = binding_record.authority_version
      join auth.sessions auth_session
        on auth_session.id = binding_record.auth_session_id
       and auth_session.user_id = binding_record.user_id
      where membership_record.membership_id = p_actor_authority_membership_id
        and membership_record.case_id = p_case_id
        and membership_record.user_id = p_actor_user_id
        and membership_record.role = 'drs'
        and membership_record.status = 'active'
        and membership_record.valid_from <= pg_catalog.clock_timestamp()
        and membership_record.revoked_at is null
        and membership_record.authority_version = p_authority_version
        and binding_record.auth_session_id = p_actor_auth_session_id
        and session_record.revoked_at is null
        and session_record.expires_at > pg_catalog.clock_timestamp()
        and (auth_session.not_after is null
          or auth_session.not_after > pg_catalog.clock_timestamp())
    );
$function$;

create function drs_analysis_private.source_version_valid_v1(
  p_job_id uuid,
  p_source jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_typeof(p_source) = 'object'
    and (select count(*) from jsonb_object_keys(p_source)) = 3
    and p_source ?& array['documentId', 'documentVersionId', 'documentSha256']
    and exists (
      select 1 from casework.drs_analysis_job_documents source_document
      where source_document.job_id = p_job_id
        and source_document.document_id::text = p_source ->> 'documentId'
        and source_document.document_version_id::text = p_source ->> 'documentVersionId'
        and source_document.document_sha256 = p_source ->> 'documentSha256'
    );
$function$;

create function drs_analysis_private.citation_valid_v1(
  p_job_id uuid,
  p_case_id uuid,
  p_citation jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_kind text;
  v_region jsonb;
  v_page jsonb;
begin
  if jsonb_typeof(p_citation) <> 'object'
    or not p_citation ?& array[
      'kind', 'caseId', 'documentId', 'documentVersionId', 'documentSha256'
    ]
    or p_citation ->> 'caseId' <> p_case_id::text
    or not exists (
      select 1 from casework.drs_analysis_job_documents input_document
      where input_document.job_id = p_job_id
        and input_document.case_id = p_case_id
        and input_document.document_id::text = p_citation ->> 'documentId'
        and input_document.document_version_id::text = p_citation ->> 'documentVersionId'
        and input_document.document_sha256 = p_citation ->> 'documentSha256'
    )
  then
    return false;
  end if;
  v_kind := p_citation ->> 'kind';
  if v_kind = 'quote_row' then
    return (
      ((select count(*) from jsonb_object_keys(p_citation)) = 7
        and p_citation ?& array['page', 'row']
        and (p_citation ->> 'page') ~ '^[1-9][0-9]*$')
      or ((select count(*) from jsonb_object_keys(p_citation)) = 8
        and p_citation ?& array['sheet', 'row', 'cellRange']
        and length(p_citation ->> 'sheet') between 1 and 120
        and length(p_citation ->> 'cellRange') between 1 and 64)
    ) and (p_citation ->> 'row') ~ '^[1-9][0-9]*$';
  elsif v_kind = 'drawing_region' then
    v_region := p_citation -> 'coordinateRegion';
    return (select count(*) from jsonb_object_keys(p_citation)) = 11
      and p_citation ?& array[
        'setName', 'sheet', 'page', 'scaleStatus', 'scaleValue', 'coordinateRegion'
      ]
      and length(p_citation ->> 'setName') between 1 and 120
      and length(p_citation ->> 'sheet') between 1 and 120
      and (p_citation ->> 'page') ~ '^[1-9][0-9]*$'
      and p_citation ->> 'scaleStatus' in ('confirmed', 'missing', 'unreadable', 'conflict')
      and jsonb_typeof(v_region) = 'object'
      and (select count(*) from jsonb_object_keys(v_region)) = 4
      and v_region ?& array['x', 'y', 'width', 'height']
      and (v_region ->> 'x')::numeric between 0 and 1
      and (v_region ->> 'y')::numeric between 0 and 1
      and (v_region ->> 'width')::numeric > 0
      and (v_region ->> 'width')::numeric <= 1
      and (v_region ->> 'height')::numeric > 0
      and (v_region ->> 'height')::numeric <= 1;
  elsif v_kind = 'contract_region' then
    v_region := p_citation -> 'textRegion';
    return (select count(*) from jsonb_object_keys(p_citation)) = 8
      and p_citation ?& array['clause', 'page', 'textRegion']
      and length(p_citation ->> 'clause') between 1 and 200
      and (p_citation ->> 'page') ~ '^[1-9][0-9]*$'
      and jsonb_typeof(v_region) = 'object'
      and (select count(*) from jsonb_object_keys(v_region)) = 2
      and v_region ?& array['start', 'end']
      and (v_region ->> 'start') ~ '^[0-9]+$'
      and (v_region ->> 'end') ~ '^[1-9][0-9]*$'
      and (v_region ->> 'end')::integer > (v_region ->> 'start')::integer;
  elsif v_kind = 'document_manifest_gap' then
    v_page := p_citation -> 'missingPages';
    return (select count(*) from jsonb_object_keys(p_citation)) = 7
      and p_citation ?& array['gapType', 'missingPages']
      and p_citation ->> 'gapType' in ('missing_page', 'whole_document_unreadable')
      and jsonb_typeof(v_page) = 'array'
      and jsonb_array_length(v_page) >= 1
      and not exists (
        select 1 from jsonb_array_elements_text(v_page) page_value
        where page_value !~ '^[1-9][0-9]*$'
      );
  end if;
  return false;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return false;
end;
$function$;

create function public.server_drs_analysis_enqueue_v1(
  p_actor_user_id uuid,
  p_actor_auth_session_id uuid,
  p_case_id uuid,
  p_actor_authority_membership_id uuid,
  p_actor_role text,
  p_authority_version bigint,
  p_run_key_sha256 text,
  p_enqueue_payload_sha256 text,
  p_input_manifest_sha256 text,
  p_documents jsonb,
  p_prompt_version text,
  p_prompt_sha256 text,
  p_model_adapter_version text,
  p_model_profile_version text,
  p_rule_version text,
  p_rule_sha256 text,
  p_output_schema_version text,
  p_output_schema_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing casework.drs_analysis_jobs%rowtype;
  v_job_id uuid;
  v_document jsonb;
  v_ordinal integer := 0;
begin
  if not drs_analysis_private.authorized_drs_context_v1(
    p_actor_user_id, p_actor_auth_session_id, p_case_id,
    p_actor_authority_membership_id, p_actor_role, p_authority_version
  ) then
    return jsonb_build_object(
      'state', 'CONTEXT_UNAVAILABLE', 'newEffects', 0,
      'runKeySha256', p_run_key_sha256
    );
  end if;
  if p_run_key_sha256 !~ '^[a-f0-9]{64}$'
    or p_enqueue_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_input_manifest_sha256 !~ '^[a-f0-9]{64}$'
    or p_prompt_sha256 !~ '^[a-f0-9]{64}$'
    or p_rule_sha256 !~ '^[a-f0-9]{64}$'
    or p_output_schema_sha256 !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_documents) <> 'array'
    or jsonb_array_length(p_documents) not between 1 and 24
    or length(p_prompt_version) not between 1 and 128
    or length(p_model_adapter_version) not between 1 and 128
    or length(p_model_profile_version) not between 1 and 128
    or length(p_rule_version) not between 1 and 128
    or length(p_output_schema_version) not between 1 and 128
  then
    return jsonb_build_object(
      'state', 'INVALID_REQUEST', 'newEffects', 0,
      'runKeySha256', p_run_key_sha256
    );
  end if;

  select job_record.* into v_existing
  from casework.drs_analysis_jobs job_record
  where job_record.run_key_sha256 = p_run_key_sha256
  for update;
  if found then
    if v_existing.case_id = p_case_id
      and v_existing.enqueue_payload_sha256 = p_enqueue_payload_sha256
      and v_existing.input_manifest_sha256 = p_input_manifest_sha256
      and v_existing.prompt_version = p_prompt_version
      and v_existing.prompt_sha256 = p_prompt_sha256
      and v_existing.model_adapter_version = p_model_adapter_version
      and v_existing.model_profile_version = p_model_profile_version
      and v_existing.rule_version = p_rule_version
      and v_existing.rule_sha256 = p_rule_sha256
      and v_existing.output_schema_version = p_output_schema_version
      and v_existing.output_schema_sha256 = p_output_schema_sha256
      and (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ordinal', input_document.ordinal,
          'caseId', input_document.case_id,
          'documentId', input_document.document_id,
          'documentVersionId', input_document.document_version_id,
          'documentVersionRef', input_document.document_version_ref,
          'documentKind', input_document.document_kind,
          'sha256', input_document.document_sha256
        ) order by input_document.ordinal), '[]'::jsonb)
        from casework.drs_analysis_job_documents input_document
        where input_document.job_id = v_existing.job_id
      ) = p_documents
    then
      return jsonb_build_object(
        'state', 'REPLAYED', 'newEffects', 0,
        'jobId', v_existing.job_id,
        'runId', v_existing.planned_run_id,
        'runKeySha256', p_run_key_sha256
      );
    end if;
    return jsonb_build_object(
      'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0,
      'runKeySha256', p_run_key_sha256
    );
  end if;

  for v_document in select value from jsonb_array_elements(p_documents)
  loop
    v_ordinal := v_ordinal + 1;
    if jsonb_typeof(v_document) <> 'object'
      or (select count(*) from jsonb_object_keys(v_document)) <> 7
      or not v_document ?& array[
        'ordinal', 'caseId', 'documentId', 'documentVersionId',
        'documentVersionRef', 'documentKind', 'sha256'
      ]
      or (v_document ->> 'ordinal') !~ '^[1-9][0-9]*$'
      or (v_document ->> 'ordinal')::integer <> v_ordinal
      or v_document ->> 'caseId' <> p_case_id::text
      or v_document ->> 'documentKind' not in ('quote', 'drawing', 'contract')
      or (v_document ->> 'documentVersionRef') !~ '^dvr_[0-9a-z]{20,40}$'
      or (v_document ->> 'sha256') !~ '^[a-f0-9]{64}$'
      or not exists (
        select 1
        from casework.document_versions version_record
        join casework.documents document_record
          on document_record.case_id = version_record.case_id
         and document_record.id = version_record.document_id
        join casework.document_operation_receipts receipt_record
          on receipt_record.case_id = version_record.case_id
         and receipt_record.document_id = version_record.document_id
         and receipt_record.document_version_id = version_record.id
         and receipt_record.operation = 'FINALIZE_UPLOAD'
         and receipt_record.receipt_state = 'FORMAL_VERSION_CREATED'
        where version_record.case_id = p_case_id
          and version_record.document_id::text = v_document ->> 'documentId'
          and version_record.id::text = v_document ->> 'documentVersionId'
          and version_record.version_ref = v_document ->> 'documentVersionRef'
          and version_record.sha256 = v_document ->> 'sha256'
          and version_record.validation_state = 'FORMAL'
          and document_record.document_kind = v_document ->> 'documentKind'
          and document_record.current_version_id = version_record.id
      )
    then
      return jsonb_build_object(
        'state', 'INPUT_VERSION_INVALID', 'newEffects', 0,
        'runKeySha256', p_run_key_sha256
      );
    end if;
  end loop;

  v_job_id := extensions.gen_random_uuid();
  insert into casework.drs_analysis_jobs(
    job_id, case_id, run_key_sha256, enqueue_payload_sha256,
    input_manifest_sha256, prompt_version, prompt_sha256,
    model_adapter_version, model_profile_version, rule_version, rule_sha256,
    output_schema_version, output_schema_sha256,
    provider_neutral, human_review_required, formal_impact
  ) values (
    v_job_id, p_case_id, p_run_key_sha256, p_enqueue_payload_sha256,
    p_input_manifest_sha256, p_prompt_version, p_prompt_sha256,
    p_model_adapter_version, p_model_profile_version, p_rule_version,
    p_rule_sha256, p_output_schema_version, p_output_schema_sha256,
    true, true, 'none'
  );
  insert into casework.drs_analysis_job_documents(
    job_id, ordinal, case_id, document_id, document_version_id,
    document_version_ref, document_kind, document_sha256
  )
  select
    v_job_id,
    (document_value ->> 'ordinal')::smallint,
    (document_value ->> 'caseId')::uuid,
    (document_value ->> 'documentId')::uuid,
    (document_value ->> 'documentVersionId')::uuid,
    document_value ->> 'documentVersionRef',
    document_value ->> 'documentKind',
    document_value ->> 'sha256'
  from jsonb_array_elements(p_documents) document_value;
  return jsonb_build_object(
    'state', 'APPLIED', 'newEffects', 1,
    'jobId', v_job_id,
    'runId', (select planned_run_id from casework.drs_analysis_jobs where job_id = v_job_id),
    'runKeySha256', p_run_key_sha256,
    'providerNeutral', true,
    'humanReviewRequired', true,
    'formalImpact', 'none'
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0,
      'runKeySha256', p_run_key_sha256
    );
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object(
      'state', 'INVALID_REQUEST', 'newEffects', 0,
      'runKeySha256', p_run_key_sha256
    );
end;
$function$;

create function public.server_drs_analysis_claim_v1(
  p_worker_id uuid,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_job casework.drs_analysis_jobs%rowtype;
begin
  if p_worker_id is null or p_lease_seconds not between 30 and 900 then
    return jsonb_build_object('state', 'INVALID_REQUEST', 'newEffects', 0);
  end if;
  select job_record.* into v_job
  from casework.drs_analysis_jobs job_record
  where job_record.job_state = 'QUEUED'
    or (job_record.job_state = 'CLAIMED'
      and job_record.lease_until <= pg_catalog.clock_timestamp())
  order by job_record.created_at, job_record.job_id
  for update skip locked
  limit 1;
  if not found then
    return jsonb_build_object('state', 'IDLE', 'newEffects', 0);
  end if;
  update casework.drs_analysis_jobs set
    job_state = 'CLAIMED',
    claimed_by = p_worker_id,
    claimed_at = pg_catalog.clock_timestamp(),
    lease_until = pg_catalog.clock_timestamp()
      + pg_catalog.make_interval(secs => p_lease_seconds),
    attempt_count = attempt_count + 1,
    updated_at = pg_catalog.clock_timestamp()
  where job_id = v_job.job_id;
  return jsonb_build_object(
    'state', 'CLAIMED', 'newEffects', 1,
    'jobId', v_job.job_id,
    'runId', v_job.planned_run_id,
    'runKeySha256', v_job.run_key_sha256,
    'caseId', v_job.case_id,
    'inputManifestSha256', v_job.input_manifest_sha256,
    'prompt', jsonb_build_object('version', v_job.prompt_version, 'sha256', v_job.prompt_sha256),
    'model', jsonb_build_object(
      'adapterVersion', v_job.model_adapter_version,
      'profileVersion', v_job.model_profile_version
    ),
    'rule', jsonb_build_object('version', v_job.rule_version, 'sha256', v_job.rule_sha256),
    'outputSchema', jsonb_build_object(
      'version', v_job.output_schema_version,
      'sha256', v_job.output_schema_sha256
    ),
    'documents', (
      select jsonb_agg(jsonb_build_object(
        'ordinal', input_document.ordinal,
        'caseId', input_document.case_id,
        'documentId', input_document.document_id,
        'documentVersionId', input_document.document_version_id,
        'documentVersionRef', input_document.document_version_ref,
        'documentKind', input_document.document_kind,
        'sha256', input_document.document_sha256
      ) order by input_document.ordinal)
      from casework.drs_analysis_job_documents input_document
      where input_document.job_id = v_job.job_id
    )
  );
end;
$function$;

create function public.server_drs_analysis_complete_v1(
  p_worker_id uuid,
  p_job_id uuid,
  p_output_sha256 text,
  p_output jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_job casework.drs_analysis_jobs%rowtype;
  v_finding jsonb;
  v_citation jsonb;
  v_unknown jsonb;
  v_source jsonb;
  v_finding_ordinal integer;
  v_citation_ordinal integer;
  v_kind text;
begin
  select job_record.* into v_job
  from casework.drs_analysis_jobs job_record
  where job_record.job_id = p_job_id
  for update;
  if not found then
    return jsonb_build_object('state', 'CONTEXT_UNAVAILABLE', 'newEffects', 0);
  end if;
  if v_job.job_state = 'COMPLETED' then
    if v_job.claimed_by = p_worker_id
      and v_job.output_sha256 = p_output_sha256
      and exists (
        select 1 from casework.drs_analysis_runs run_record
        where run_record.job_id = p_job_id
          and run_record.output_sha256 = p_output_sha256
      )
    then
      return jsonb_build_object(
        'state', 'REPLAYED', 'newEffects', 0,
        'runId', v_job.planned_run_id,
        'runKeySha256', v_job.run_key_sha256
      );
    end if;
    return jsonb_build_object('state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0);
  end if;
  if v_job.job_state <> 'CLAIMED'
    or v_job.claimed_by is distinct from p_worker_id
    or v_job.lease_until <= pg_catalog.clock_timestamp()
    or p_output_sha256 !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_output) <> 'object'
    or not p_output ?& array[
      'schemaVersion', 'runId', 'runKeySha256', 'caseId',
      'providerNeutral', 'humanReviewRequired', 'formalImpact', 'findings'
    ]
    or exists (
      select 1 from jsonb_object_keys(p_output) output_key
      where output_key not in (
        'schemaVersion', 'runId', 'runKeySha256', 'caseId',
        'providerNeutral', 'humanReviewRequired', 'formalImpact',
        'findings', 'outputSha256'
      )
    )
    or p_output ->> 'schemaVersion' <> 'laibe.drs.analysis-output.v1'
    or p_output ->> 'runId' <> v_job.planned_run_id::text
    or p_output ->> 'runKeySha256' <> v_job.run_key_sha256
    or p_output ->> 'caseId' <> v_job.case_id::text
    or p_output -> 'providerNeutral' is distinct from 'true'::jsonb
    or p_output -> 'humanReviewRequired' is distinct from 'true'::jsonb
    or p_output ->> 'formalImpact' <> 'none'
    or (p_output ? 'outputSha256' and p_output ->> 'outputSha256' <> p_output_sha256)
    or jsonb_typeof(p_output -> 'findings') <> 'array'
    or jsonb_array_length(p_output -> 'findings') not between 1 and 200
  then
    return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
  end if;

  v_finding_ordinal := 0;
  for v_finding in select value from jsonb_array_elements(p_output -> 'findings')
  loop
    v_finding_ordinal := v_finding_ordinal + 1;
    if jsonb_typeof(v_finding) <> 'object'
      or (select count(*) from jsonb_object_keys(v_finding)) <> 19
      or not v_finding ?& array[
        'schemaVersion', 'findingId', 'findingVersion', 'runId',
        'runKeySha256', 'caseId', 'domain', 'code', 'classification',
        'severity', 'statement', 'rationale', 'citations', 'unknowns',
        'sourceDocumentVersions', 'providerNeutral', 'humanReviewRequired',
        'formalImpact', 'lifecycle'
      ]
      or v_finding ->> 'schemaVersion' <> 'laibe.drs.analysis-finding-draft.v1'
      or (v_finding ->> 'findingId') !~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (v_finding ->> 'findingVersion') !~ '^[1-9][0-9]*$'
      or v_finding ->> 'runId' <> v_job.planned_run_id::text
      or v_finding ->> 'runKeySha256' <> v_job.run_key_sha256
      or v_finding ->> 'caseId' <> v_job.case_id::text
      or v_finding ->> 'domain' not in ('quote', 'drawing', 'contract')
      or (v_finding ->> 'code') !~ '^[A-Z][A-Z0-9_]{2,127}$'
      or v_finding ->> 'classification' not in ('confirmed', 'conflict', 'unknown', 'risk')
      or v_finding ->> 'severity' not in ('info', 'low', 'medium', 'high', 'critical')
      or length(v_finding ->> 'statement') not between 1 and 2000
      or length(v_finding ->> 'rationale') not between 1 and 2000
      or v_finding -> 'providerNeutral' is distinct from 'true'::jsonb
      or v_finding -> 'humanReviewRequired' is distinct from 'true'::jsonb
      or v_finding ->> 'formalImpact' <> 'none'
      or v_finding ->> 'lifecycle' <> 'current'
      or jsonb_typeof(v_finding -> 'citations') <> 'array'
      or jsonb_typeof(v_finding -> 'unknowns') <> 'array'
      or jsonb_typeof(v_finding -> 'sourceDocumentVersions') <> 'array'
      or jsonb_array_length(v_finding -> 'sourceDocumentVersions') < 1
      or (v_finding ->> 'severity' in ('high', 'critical')
        and jsonb_array_length(v_finding -> 'citations') < 1)
      or (v_finding ->> 'classification' = 'unknown'
        and jsonb_array_length(v_finding -> 'unknowns') < 1)
    then
      return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
    end if;
    for v_source in
      select value from jsonb_array_elements(v_finding -> 'sourceDocumentVersions')
    loop
      if not drs_analysis_private.source_version_valid_v1(p_job_id, v_source) then
        return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
      end if;
    end loop;
    for v_citation in
      select value from jsonb_array_elements(v_finding -> 'citations')
    loop
      if not drs_analysis_private.citation_valid_v1(
        p_job_id, v_job.case_id, v_citation
      ) then
        return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
      end if;
    end loop;
    for v_unknown in
      select value from jsonb_array_elements(v_finding -> 'unknowns')
    loop
      if jsonb_typeof(v_unknown) <> 'object'
        or (select count(*) from jsonb_object_keys(v_unknown)) <> 5
        or not v_unknown ?& array[
          'code', 'requiredEvidence', 'sourceDocumentVersions', 'citations', 'nextActor'
        ]
        or (v_unknown ->> 'code') !~ '^[A-Z][A-Z0-9_]{2,127}$'
        or length(v_unknown ->> 'requiredEvidence') not between 1 and 1000
        or v_unknown ->> 'nextActor' not in (
          'owner', 'vendor', 'drs', 'external_professional'
        )
        or jsonb_typeof(v_unknown -> 'sourceDocumentVersions') <> 'array'
        or jsonb_array_length(v_unknown -> 'sourceDocumentVersions') < 1
        or jsonb_typeof(v_unknown -> 'citations') <> 'array'
        or jsonb_array_length(v_unknown -> 'citations') < 1
        or ((v_finding ->> 'code') ~
          '(STRUCTURAL|FIRE|CODE|MEP|WATERPROOF|SIGN_OFF)'
          and v_unknown ->> 'nextActor' <> 'external_professional')
      then
        return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
      end if;
      for v_source in
        select value from jsonb_array_elements(v_unknown -> 'sourceDocumentVersions')
      loop
        if not drs_analysis_private.source_version_valid_v1(p_job_id, v_source) then
          return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
        end if;
      end loop;
      for v_citation in
        select value from jsonb_array_elements(v_unknown -> 'citations')
      loop
        if not drs_analysis_private.citation_valid_v1(
          p_job_id, v_job.case_id, v_citation
        ) then
          return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
        end if;
      end loop;
    end loop;
  end loop;

  begin
    insert into casework.drs_analysis_runs(
      analysis_run_id, job_id, case_id, run_key_sha256,
      input_manifest_sha256, prompt_version, prompt_sha256,
      model_adapter_version, model_profile_version, rule_version, rule_sha256,
      output_schema_version, output_schema_sha256, output_sha256,
      provider_neutral, human_review_required, formal_impact
    ) values (
      v_job.planned_run_id, v_job.job_id, v_job.case_id, v_job.run_key_sha256,
      v_job.input_manifest_sha256, v_job.prompt_version, v_job.prompt_sha256,
      v_job.model_adapter_version, v_job.model_profile_version,
      v_job.rule_version, v_job.rule_sha256, v_job.output_schema_version,
      v_job.output_schema_sha256, p_output_sha256, true, true, 'none'
    );
    insert into casework.drs_analysis_run_documents(
      analysis_run_id, ordinal, case_id, document_id, document_version_id,
      document_version_ref, document_kind, document_sha256
    )
    select
      v_job.planned_run_id, input_document.ordinal, input_document.case_id,
      input_document.document_id, input_document.document_version_id,
      input_document.document_version_ref, input_document.document_kind,
      input_document.document_sha256
    from casework.drs_analysis_job_documents input_document
    where input_document.job_id = p_job_id;

    for v_finding in select value from jsonb_array_elements(p_output -> 'findings')
    loop
      insert into casework.drs_analysis_findings(
        finding_id, finding_version, analysis_run_id, case_id, domain, code,
        classification, severity, statement, rationale, unknowns,
        source_document_versions, provider_neutral, human_review_required,
        formal_impact
      ) values (
        (v_finding ->> 'findingId')::uuid,
        (v_finding ->> 'findingVersion')::integer,
        v_job.planned_run_id, v_job.case_id, v_finding ->> 'domain',
        v_finding ->> 'code', v_finding ->> 'classification',
        v_finding ->> 'severity', v_finding ->> 'statement',
        v_finding ->> 'rationale', v_finding -> 'unknowns',
        v_finding -> 'sourceDocumentVersions', true, true, 'none'
      );
      v_citation_ordinal := 0;
      for v_citation in
        select value from jsonb_array_elements(v_finding -> 'citations')
      loop
        v_citation_ordinal := v_citation_ordinal + 1;
        v_kind := v_citation ->> 'kind';
        insert into casework.drs_analysis_finding_citations(
          finding_id, finding_version, ordinal, case_id, document_id,
          document_version_id, document_sha256, citation_kind,
          quote_page, quote_sheet, quote_row, quote_cell_range,
          drawing_set, drawing_sheet, drawing_page, drawing_scale_status,
          drawing_scale_value, coordinate_region, contract_clause,
          contract_page, contract_text_region, manifest_gap_type,
          manifest_missing_pages
        ) values (
          (v_finding ->> 'findingId')::uuid,
          (v_finding ->> 'findingVersion')::integer,
          v_citation_ordinal, v_job.case_id,
          (v_citation ->> 'documentId')::uuid,
          (v_citation ->> 'documentVersionId')::uuid,
          v_citation ->> 'documentSha256', v_kind,
          case when v_kind = 'quote_row' and v_citation ? 'page'
            then (v_citation ->> 'page')::integer end,
          case when v_kind = 'quote_row' then v_citation ->> 'sheet' end,
          case when v_kind = 'quote_row' then (v_citation ->> 'row')::integer end,
          case when v_kind = 'quote_row' then v_citation ->> 'cellRange' end,
          case when v_kind = 'drawing_region' then v_citation ->> 'setName' end,
          case when v_kind = 'drawing_region' then v_citation ->> 'sheet' end,
          case when v_kind = 'drawing_region' then (v_citation ->> 'page')::integer end,
          case when v_kind = 'drawing_region' then v_citation ->> 'scaleStatus' end,
          case when v_kind = 'drawing_region' then v_citation ->> 'scaleValue' end,
          case when v_kind = 'drawing_region' then v_citation -> 'coordinateRegion' end,
          case when v_kind = 'contract_region' then v_citation ->> 'clause' end,
          case when v_kind = 'contract_region' then (v_citation ->> 'page')::integer end,
          case when v_kind = 'contract_region' then v_citation -> 'textRegion' end,
          case when v_kind = 'document_manifest_gap' then v_citation ->> 'gapType' end,
          case when v_kind = 'document_manifest_gap' then array(
            select page_value::integer
            from jsonb_array_elements_text(v_citation -> 'missingPages') page_value
          ) end
        );
      end loop;
      insert into casework.drs_analysis_finding_lifecycle_events(
        finding_id, finding_version, case_id, lifecycle, reason_code
      ) values (
        (v_finding ->> 'findingId')::uuid,
        (v_finding ->> 'findingVersion')::integer,
        v_job.case_id, 'current', 'ANALYSIS_COMPLETED'
      );
    end loop;
    update casework.drs_analysis_jobs set
      job_state = 'COMPLETED', output_sha256 = p_output_sha256,
      completed_at = pg_catalog.clock_timestamp(),
      updated_at = pg_catalog.clock_timestamp()
    where job_id = p_job_id;
  exception
    when unique_violation or foreign_key_violation or check_violation then
      return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
  end;
  return jsonb_build_object(
    'state', 'APPLIED', 'newEffects', 1,
    'runId', v_job.planned_run_id,
    'runKeySha256', v_job.run_key_sha256,
    'providerNeutral', true,
    'humanReviewRequired', true,
    'formalImpact', 'none',
    'caseStateTransition', false
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('state', 'INVALID_ANALYSIS_OUTPUT', 'newEffects', 0);
end;
$function$;

create function public.server_drs_analysis_fail_v1(
  p_worker_id uuid,
  p_job_id uuid,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_job casework.drs_analysis_jobs%rowtype;
begin
  select job_record.* into v_job
  from casework.drs_analysis_jobs job_record
  where job_record.job_id = p_job_id
  for update;
  if not found or v_job.job_state <> 'CLAIMED'
    or v_job.claimed_by is distinct from p_worker_id
    or length(p_error_code) not between 1 and 128
    or p_error_code ~ '[[:cntrl:]]'
  then
    return jsonb_build_object('state', 'CONTEXT_UNAVAILABLE', 'newEffects', 0);
  end if;
  update casework.drs_analysis_jobs set
    job_state = 'FAILED', last_error_code = p_error_code,
    updated_at = pg_catalog.clock_timestamp()
  where job_id = p_job_id;
  return jsonb_build_object('state', 'FAILED', 'newEffects', 1);
end;
$function$;

create function public.server_drs_analysis_disposition_v1(
  p_actor_user_id uuid,
  p_actor_auth_session_id uuid,
  p_case_id uuid,
  p_actor_authority_membership_id uuid,
  p_actor_role text,
  p_authority_version bigint,
  p_finding_id uuid,
  p_expected_finding_version integer,
  p_disposition text,
  p_idempotency_key text,
  p_payload_sha256 text,
  p_edited_statement text,
  p_edited_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing casework.drs_analysis_review_decisions%rowtype;
begin
  if not drs_analysis_private.authorized_drs_context_v1(
    p_actor_user_id, p_actor_auth_session_id, p_case_id,
    p_actor_authority_membership_id, p_actor_role, p_authority_version
  ) then
    return jsonb_build_object(
      'state', 'CONTEXT_UNAVAILABLE', 'newEffects', 0,
      'caseStateTransition', false
    );
  end if;
  if p_disposition not in ('ACCEPT', 'EDIT', 'REJECT')
    or length(p_idempotency_key) not between 16 and 128
    or p_idempotency_key ~ '[[:space:][:cntrl:]]'
    or p_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_expected_finding_version < 1
    or (p_disposition = 'EDIT' and (
      length(p_edited_statement) not between 1 and 2000
      or length(p_edited_rationale) not between 1 and 2000
    ))
    or (p_disposition in ('ACCEPT', 'REJECT') and (
      p_edited_statement is not null or p_edited_rationale is not null
    ))
  then
    return jsonb_build_object(
      'state', 'INVALID_REQUEST', 'newEffects', 0,
      'caseStateTransition', false
    );
  end if;
  select decision_record.* into v_existing
  from casework.drs_analysis_review_decisions decision_record
  where decision_record.case_id = p_case_id
    and decision_record.idempotency_key = p_idempotency_key
  for share;
  if found then
    if v_existing.finding_id = p_finding_id
      and v_existing.finding_version = p_expected_finding_version
      and v_existing.disposition = p_disposition
      and v_existing.payload_sha256 = p_payload_sha256
      and v_existing.actor_user_id = p_actor_user_id
      and v_existing.actor_auth_session_id = p_actor_auth_session_id
      and v_existing.actor_authority_membership_id = p_actor_authority_membership_id
      and v_existing.authority_version = p_authority_version
      and v_existing.edited_statement is not distinct from p_edited_statement
      and v_existing.edited_rationale is not distinct from p_edited_rationale
    then
      return jsonb_build_object(
        'state', 'REPLAYED', 'newEffects', 0,
        'reviewDecisionId', v_existing.review_decision_id,
        'caseStateTransition', false
      );
    end if;
    return jsonb_build_object(
      'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0,
      'caseStateTransition', false
    );
  end if;
  if not exists (
    select 1
    from casework.drs_analysis_findings finding_record
    where finding_record.finding_id = p_finding_id
      and finding_record.finding_version = p_expected_finding_version
      and finding_record.case_id = p_case_id
      and exists (
        select 1
        from casework.drs_analysis_finding_lifecycle_events lifecycle_record
        where lifecycle_record.finding_id = finding_record.finding_id
          and lifecycle_record.finding_version = finding_record.finding_version
          and lifecycle_record.lifecycle = 'current'
          and not exists (
            select 1
            from casework.drs_analysis_finding_lifecycle_events newer_lifecycle
            where newer_lifecycle.finding_id = lifecycle_record.finding_id
              and newer_lifecycle.finding_version = lifecycle_record.finding_version
              and (
                newer_lifecycle.recorded_at > lifecycle_record.recorded_at
                or (newer_lifecycle.recorded_at = lifecycle_record.recorded_at
                  and newer_lifecycle.lifecycle_event_id > lifecycle_record.lifecycle_event_id)
              )
          )
      )
  ) then
    return jsonb_build_object(
      'state', 'VERSION_CONFLICT', 'newEffects', 0,
      'caseStateTransition', false
    );
  end if;
  insert into casework.drs_analysis_review_decisions(
    case_id, finding_id, finding_version, disposition,
    edited_statement, edited_rationale, actor_user_id, actor_auth_session_id,
    actor_authority_membership_id, authority_version, idempotency_key,
    payload_sha256, case_state_transition
  ) values (
    p_case_id, p_finding_id, p_expected_finding_version, p_disposition,
    p_edited_statement, p_edited_rationale, p_actor_user_id,
    p_actor_auth_session_id, p_actor_authority_membership_id,
    p_authority_version, p_idempotency_key, p_payload_sha256, false
  ) returning review_decision_id into v_existing.review_decision_id;
  return jsonb_build_object(
    'state', 'APPLIED', 'newEffects', 1,
    'reviewDecisionId', v_existing.review_decision_id,
    'caseStateTransition', false
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0,
      'caseStateTransition', false
    );
end;
$function$;

create function drs_analysis_private.stale_findings_for_document_version_v1(
  p_new_document_version_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_new_version casework.document_versions%rowtype;
  v_effects integer := 0;
begin
  select version_record.* into v_new_version
  from casework.document_versions version_record
  where version_record.id = p_new_document_version_id;
  if not found or v_new_version.previous_version_id is null
    or not exists (
      select 1 from casework.document_operation_receipts receipt_record
      where receipt_record.case_id = v_new_version.case_id
        and receipt_record.document_id = v_new_version.document_id
        and receipt_record.document_version_id = v_new_version.id
        and receipt_record.operation = 'FINALIZE_UPLOAD'
        and receipt_record.receipt_state = 'FORMAL_VERSION_CREATED'
    )
  then
    return 0;
  end if;
  insert into casework.drs_analysis_finding_lifecycle_events(
    finding_id, finding_version, case_id, lifecycle,
    caused_by_document_version_id, reason_code
  )
  select distinct
    finding_record.finding_id, finding_record.finding_version,
    finding_record.case_id, 'stale', v_new_version.id,
    'SOURCE_DOCUMENT_SUPERSEDED'
  from casework.drs_analysis_findings finding_record
  join casework.drs_analysis_finding_citations citation_record
    on citation_record.finding_id = finding_record.finding_id
   and citation_record.finding_version = finding_record.finding_version
  where finding_record.case_id = v_new_version.case_id
    and citation_record.document_id = v_new_version.document_id
    and citation_record.document_version_id = v_new_version.previous_version_id
    and exists (
      select 1 from casework.drs_analysis_finding_lifecycle_events current_event
      where current_event.finding_id = finding_record.finding_id
        and current_event.finding_version = finding_record.finding_version
        and current_event.lifecycle = 'current'
        and not exists (
          select 1 from casework.drs_analysis_finding_lifecycle_events later_event
          where later_event.finding_id = current_event.finding_id
            and later_event.finding_version = current_event.finding_version
            and later_event.lifecycle = 'stale'
        )
    )
  on conflict (finding_id, finding_version, lifecycle, caused_by_document_version_id)
  do nothing;
  get diagnostics v_effects = row_count;
  return v_effects;
end;
$function$;

create function drs_analysis_private.document_receipt_stale_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform drs_analysis_private.stale_findings_for_document_version_v1(
    new.document_version_id
  );
  return new;
end;
$function$;

create constraint trigger drs_analysis_document_receipt_stale_findings
after insert on casework.document_operation_receipts
deferrable initially deferred
for each row
when (
  new.operation = 'FINALIZE_UPLOAD'
  and new.receipt_state = 'FORMAL_VERSION_CREATED'
  and new.document_version_id is not null
)
execute function drs_analysis_private.document_receipt_stale_trigger_v1();

create view casework.drs_analysis_finding_read_model
with (security_invoker = true)
as
select
  finding_record.*,
  lifecycle_record.lifecycle,
  lifecycle_record.reason_code as lifecycle_reason_code,
  lifecycle_record.caused_by_document_version_id,
  decision_record.review_decision_id,
  decision_record.disposition as drs_disposition,
  decision_record.edited_statement as drs_edited_statement,
  decision_record.edited_rationale as drs_edited_rationale,
  'AI_DRAFT'::text as finding_source,
  case when decision_record.review_decision_id is null
    then 'PENDING_DRS_REVIEW' else 'DRS_REVIEWED' end as review_state,
  null::jsonb as party_statement,
  null::jsonb as owner_decision
from casework.drs_analysis_findings finding_record
join lateral (
  select lifecycle_event.*
  from casework.drs_analysis_finding_lifecycle_events lifecycle_event
  where lifecycle_event.finding_id = finding_record.finding_id
    and lifecycle_event.finding_version = finding_record.finding_version
  order by lifecycle_event.recorded_at desc, lifecycle_event.lifecycle_event_id desc
  limit 1
) lifecycle_record on true
left join lateral (
  select review_record.*
  from casework.drs_analysis_review_decisions review_record
  where review_record.finding_id = finding_record.finding_id
    and review_record.finding_version = finding_record.finding_version
  order by review_record.recorded_at desc, review_record.review_decision_id desc
  limit 1
) decision_record on true;

create view casework.drs_analysis_current_findings
with (security_invoker = true)
as
select *
from casework.drs_analysis_finding_read_model
where lifecycle = 'current';

alter table casework.drs_analysis_jobs enable row level security;
alter table casework.drs_analysis_jobs force row level security;
alter table casework.drs_analysis_job_documents enable row level security;
alter table casework.drs_analysis_job_documents force row level security;
alter table casework.drs_analysis_runs enable row level security;
alter table casework.drs_analysis_runs force row level security;
alter table casework.drs_analysis_run_documents enable row level security;
alter table casework.drs_analysis_run_documents force row level security;
alter table casework.drs_analysis_findings enable row level security;
alter table casework.drs_analysis_findings force row level security;
alter table casework.drs_analysis_finding_citations enable row level security;
alter table casework.drs_analysis_finding_citations force row level security;
alter table casework.drs_analysis_finding_lifecycle_events enable row level security;
alter table casework.drs_analysis_finding_lifecycle_events force row level security;
alter table casework.drs_analysis_review_decisions enable row level security;
alter table casework.drs_analysis_review_decisions force row level security;

create policy drs_analysis_runs_select_active_drs
on casework.drs_analysis_runs for select to authenticated
using (
  exists (
    select 1 from casework.drs_three_role_memberships membership_record
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
     and authority_record.authority_version = membership_record.authority_version
    where membership_record.case_id = drs_analysis_runs.case_id
      and membership_record.user_id = (select auth.uid())
      and membership_record.role = 'drs'
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
  )
);
create policy drs_analysis_run_documents_select_active_drs
on casework.drs_analysis_run_documents for select to authenticated
using (
  exists (
    select 1 from casework.drs_three_role_memberships membership_record
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
     and authority_record.authority_version = membership_record.authority_version
    where membership_record.case_id = drs_analysis_run_documents.case_id
      and membership_record.user_id = (select auth.uid())
      and membership_record.role = 'drs'
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
  )
);
create policy drs_analysis_findings_select_active_drs
on casework.drs_analysis_findings for select to authenticated
using (
  exists (
    select 1 from casework.drs_three_role_memberships membership_record
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
     and authority_record.authority_version = membership_record.authority_version
    where membership_record.case_id = drs_analysis_findings.case_id
      and membership_record.user_id = (select auth.uid())
      and membership_record.role = 'drs'
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
  )
);
create policy drs_analysis_citations_select_active_drs
on casework.drs_analysis_finding_citations for select to authenticated
using (
  exists (
    select 1 from casework.drs_three_role_memberships membership_record
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
     and authority_record.authority_version = membership_record.authority_version
    where membership_record.case_id = drs_analysis_finding_citations.case_id
      and membership_record.user_id = (select auth.uid())
      and membership_record.role = 'drs'
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
  )
);
create policy drs_analysis_lifecycle_select_active_drs
on casework.drs_analysis_finding_lifecycle_events for select to authenticated
using (
  exists (
    select 1 from casework.drs_three_role_memberships membership_record
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
     and authority_record.authority_version = membership_record.authority_version
    where membership_record.case_id = drs_analysis_finding_lifecycle_events.case_id
      and membership_record.user_id = (select auth.uid())
      and membership_record.role = 'drs'
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
  )
);
create policy drs_analysis_reviews_select_active_drs
on casework.drs_analysis_review_decisions for select to authenticated
using (
  exists (
    select 1 from casework.drs_three_role_memberships membership_record
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
     and authority_record.authority_version = membership_record.authority_version
    where membership_record.case_id = drs_analysis_review_decisions.case_id
      and membership_record.user_id = (select auth.uid())
      and membership_record.role = 'drs'
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
  )
);

revoke all on table casework.drs_analysis_jobs from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_job_documents from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_runs from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_run_documents from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_findings from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_finding_citations from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_finding_lifecycle_events from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_review_decisions from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_finding_read_model from public, anon, authenticated, service_role;
revoke all on table casework.drs_analysis_current_findings from public, anon, authenticated, service_role;
grant select on table casework.drs_analysis_runs to authenticated;
grant select on table casework.drs_analysis_run_documents to authenticated;
grant select on table casework.drs_analysis_findings to authenticated;
grant select on table casework.drs_analysis_finding_citations to authenticated;
grant select on table casework.drs_analysis_finding_lifecycle_events to authenticated;
grant select on table casework.drs_analysis_review_decisions to authenticated;
grant select on table casework.drs_analysis_finding_read_model to authenticated;
grant select on table casework.drs_analysis_current_findings to authenticated;

revoke all on function public.server_drs_analysis_enqueue_v1(
  uuid, uuid, uuid, uuid, text, bigint, text, text, text, jsonb,
  text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.server_drs_analysis_claim_v1(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.server_drs_analysis_complete_v1(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.server_drs_analysis_fail_v1(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.server_drs_analysis_disposition_v1(
  uuid, uuid, uuid, uuid, text, bigint, uuid, integer, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.server_drs_analysis_enqueue_v1(
  uuid, uuid, uuid, uuid, text, bigint, text, text, text, jsonb,
  text, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.server_drs_analysis_claim_v1(uuid, integer)
  to service_role;
grant execute on function public.server_drs_analysis_complete_v1(uuid, uuid, text, jsonb)
  to service_role;
grant execute on function public.server_drs_analysis_fail_v1(uuid, uuid, text)
  to service_role;
grant execute on function public.server_drs_analysis_disposition_v1(
  uuid, uuid, uuid, uuid, text, bigint, uuid, integer, text, text, text, text, text
) to service_role;

revoke all on function drs_analysis_private.reject_immutable_change_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_analysis_private.authorized_drs_context_v1(
  uuid, uuid, uuid, uuid, text, bigint
) from public, anon, authenticated, service_role;
revoke all on function drs_analysis_private.source_version_valid_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function drs_analysis_private.citation_valid_v1(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function drs_analysis_private.stale_findings_for_document_version_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function drs_analysis_private.document_receipt_stale_trigger_v1()
  from public, anon, authenticated, service_role;

comment on table casework.drs_analysis_runs is
  'Immutable provider-neutral analysis identity. AI draft output has humanReviewRequired=true, formalImpact=none, and cannot create a case state transition.';
comment on table casework.drs_analysis_findings is
  'Immutable finding drafts. Current or stale lifecycle is append-only in drs_analysis_finding_lifecycle_events.';
comment on table casework.drs_analysis_review_decisions is
  'Append-only active-DRS accept/edit/reject review audit. case_state_transition is always false.';

commit;
