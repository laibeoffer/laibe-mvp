-- Generated ordered reconciliation bundle.
-- Target project reference: zdwuyomhswjcbbpbhpcq
-- This file has not been applied to any remote Supabase project.
begin;

-- 000_preflight.sql
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

-- Source: 20260726000100_pcm_knowledge_foundation.sql
-- SHA-256: 62b0c01a28480c31d663663e9c7cb99dd0d57957dd901f9c02b62fdeab58b7f2
create schema if not exists knowledge_staging;

create schema if not exists knowledge;

create schema if not exists casework;

revoke all on schema knowledge_staging from public, anon;

revoke all on schema knowledge from public, anon;

revoke all on schema casework from public, anon;

grant usage on schema knowledge_staging to authenticated;

grant usage on schema knowledge to authenticated;

grant usage on schema casework to authenticated;

create type knowledge.lifecycle_state as enum (
  'inbox',
  'draft',
  'pending_review',
  'approved',
  'retired'
);

create type knowledge.knowledge_domain as enum (
  'drawing_review',
  'budget',
  'contract'
);

create type knowledge.case_role as enum (
  'owner',
  'pro',
  'pcm',
  'admin'
);

create type knowledge.pdf_page_type as enum (
  'floor_plan',
  'layout_plan',
  'reflected_ceiling_plan',
  'finish_floor_plan',
  'elevation',
  'detail',
  'section',
  'schedule_or_legend',
  'index_or_toc',
  'electrical_single_line_or_load_schedule',
  'non_drawing',
  'unknown'
);

create or replace function knowledge.current_app_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function knowledge.current_client_id()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'client_id', '');
$$;

create or replace function knowledge.is_interactive_reviewer()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    knowledge.current_app_role() in ('pcm', 'admin')
    and knowledge.current_client_id() not in ('a12', 'budget', 'contract');
$$;

create or replace function knowledge.can_access_domain(
  p_domain knowledge.knowledge_domain
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_role text := knowledge.current_app_role();
  v_client_id text := knowledge.current_client_id();
  v_allowed_domains jsonb :=
    auth.jwt() -> 'app_metadata' -> 'allowed_knowledge_domains';
begin
  if v_client_id = 'a12' then
    return v_role = 'pcm' and p_domain = 'drawing_review';
  end if;

  if v_client_id = 'budget' then
    return
      v_role in ('owner', 'pro', 'pcm', 'admin')
      and p_domain = 'budget';
  end if;

  if v_client_id = 'contract' then
    return
      v_role in ('owner', 'pro', 'pcm', 'admin')
      and p_domain = 'contract';
  end if;

  if v_role in ('pcm', 'admin') then
    return true;
  end if;

  if v_role in ('owner', 'pro') then
    return coalesce(v_allowed_domains ? p_domain::text, false);
  end if;

  return false;
end;
$$;

create or replace function knowledge.map_source_status(p_status text)
returns knowledge.lifecycle_state
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_status
    when '收件箱' then 'inbox'::knowledge.lifecycle_state
    when '待整理' then 'draft'::knowledge.lifecycle_state
    when '待確認' then 'pending_review'::knowledge.lifecycle_state
    when '已核准' then 'pending_review'::knowledge.lifecycle_state
    when '已停用' then 'retired'::knowledge.lifecycle_state
    else 'inbox'::knowledge.lifecycle_state
  end;
$$;

create table knowledge_staging.import_batches (
  id uuid primary key default gen_random_uuid(),
  schema_version text not null default 'knowledge_staging.v1'
    check (schema_version = 'knowledge_staging.v1'),
  idempotency_key text not null unique
    check (idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  correlation_key text not null
    check (correlation_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  source_kind text not null check (
    source_kind in ('obsidian', 'budget_master', 'a12_pdf_queue', 'manual')
  ),
  source_locator text not null check (
    length(source_locator) between 1 and 2048
    and source_locator !~ '[[:cntrl:]]'
  ),
  source_sha256 text check (
    source_sha256 ~ '^[A-Fa-f0-9]{64}$'
  ),
  source_record_count integer not null default 0 check (source_record_count >= 0),
  chunk_index integer not null default 1 check (chunk_index > 0),
  chunk_count integer not null default 1 check (chunk_count > 0),
  source_manifest jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_manifest) = 'object'),
  lifecycle_state knowledge.lifecycle_state not null default 'inbox'
    check (lifecycle_state <> 'approved'),
  publication_authorized boolean not null default false check (publication_authorized = false),
  candidate_creation_authorized boolean not null default false check (candidate_creation_authorized = false),
  notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  check (chunk_index <= chunk_count)
);

create table knowledge_staging.source_records (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references knowledge_staging.import_batches(id),
  source_key text not null,
  source_status text not null default '收件箱',
  mapped_lifecycle knowledge.lifecycle_state not null default 'inbox',
  is_budget_candidate boolean not null default false,
  auto_trigger_allowed boolean not null default false,
  publication_authorized boolean not null default false check (publication_authorized = false),
  candidate_creation_authorized boolean not null default false check (candidate_creation_authorized = false),
  direct_pricing_allowed boolean not null default false check (direct_pricing_allowed = false),
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_key),
  check (mapped_lifecycle = knowledge.map_source_status(source_status)),
  check (mapped_lifecycle <> 'approved')
);

create table knowledge_staging.budget_staging_items (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references knowledge_staging.import_batches(id),
  source_record_id uuid references knowledge_staging.source_records(id),
  source_item_uid text not null,
  unified_item_name text not null,
  category_code text,
  unit text,
  is_budget_candidate boolean not null default false,
  auto_trigger_allowed boolean not null default false,
  historical_price_low numeric check (historical_price_low is null or historical_price_low >= 0),
  historical_price_high numeric check (historical_price_high is null or historical_price_high >= 0),
  price_currency text not null default 'TWD',
  lifecycle_state knowledge.lifecycle_state not null default 'pending_review'
    check (lifecycle_state in ('inbox', 'draft', 'pending_review', 'retired')),
  publication_authorized boolean not null default false check (publication_authorized = false),
  candidate_creation_authorized boolean not null default false check (candidate_creation_authorized = false),
  direct_pricing_allowed boolean not null default false check (direct_pricing_allowed = false),
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_item_uid),
  check (
    historical_price_low is null
    or historical_price_high is null
    or historical_price_high >= historical_price_low
  )
);

create table knowledge_staging.quality_issues (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references knowledge_staging.import_batches(id),
  source_record_id uuid references knowledge_staging.source_records(id),
  issue_code text not null,
  severity text not null check (severity in ('info', 'warning', 'error')),
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  review_state knowledge.lifecycle_state not null default 'pending_review'
    check (review_state in ('inbox', 'draft', 'pending_review', 'retired')),
  next_reviewer_role knowledge.case_role not null default 'pcm',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table knowledge.sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (
    source_type in ('obsidian_note', 'budget_master', 'pdf_evidence', 'manual_reference')
  ),
  title text not null,
  source_location text not null,
  source_sha256 text check (
    source_sha256 is null or source_sha256 ~ '^[A-Fa-f0-9]{64}$'
  ),
  lifecycle_state knowledge.lifecycle_state not null default 'inbox',
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  published_by uuid,
  published_at timestamptz,
  retired_by uuid,
  retired_at timestamptz
);

create table knowledge.entries (
  id uuid primary key default gen_random_uuid(),
  domain knowledge.knowledge_domain not null,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  lifecycle_state knowledge.lifecycle_state not null default 'draft',
  current_version_id uuid,
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_by uuid,
  retired_at timestamptz
);

create table knowledge.entry_versions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references knowledge.entries(id),
  source_id uuid not null references knowledge.sources(id),
  version_number integer not null check (version_number > 0),
  title text not null,
  summary text not null default '',
  lifecycle_state knowledge.lifecycle_state not null default 'draft',
  content jsonb not null,
  evidence_summary jsonb not null default '[]'::jsonb,
  change_note text not null default '',
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  submitted_by uuid,
  submitted_at timestamptz,
  published_by uuid,
  published_at timestamptz,
  unique (entry_id, version_number)
);

alter table knowledge.entries
  add constraint entries_current_version_fk
  foreign key (current_version_id)
  references knowledge.entry_versions(id)
  deferrable initially deferred;

create table knowledge.drawing_rules (
  id uuid primary key default gen_random_uuid(),
  entry_version_id uuid not null unique references knowledge.entry_versions(id),
  rule_code text not null,
  rule_kind text not null check (
    rule_kind in (
      'sheet_completeness',
      'required_elevation',
      'cross_sheet_consistency',
      'dimension_logic',
      'material_logic',
      'supplement_request'
    )
  ),
  applicable_page_types text[] not null default '{}',
  condition_definition jsonb not null,
  finding_template text not null,
  supplement_template text not null,
  human_review_required boolean not null default true
    check (human_review_required = true),
  formal_impact text not null default 'none'
    check (formal_impact = 'none')
);

create table knowledge.budget_rules (
  id uuid primary key default gen_random_uuid(),
  entry_version_id uuid not null unique references knowledge.entry_versions(id),
  rule_code text not null,
  rule_kind text not null check (
    rule_kind in ('trigger', 'bundle', 'dependency', 'quantity', 'scope_difference')
  ),
  unified_item_code text,
  condition_definition jsonb not null,
  output_definition jsonb not null,
  requires_user_created_object boolean not null default true
    check (requires_user_created_object = true),
  requires_scope_confirmation boolean not null default true
    check (requires_scope_confirmation = true),
  requires_human_decision boolean not null default true
    check (requires_human_decision = true),
  direct_pricing_allowed boolean not null default false
    check (direct_pricing_allowed = false),
  formal_impact text not null default 'none'
    check (formal_impact = 'none')
);

create table knowledge.acceptance_rules (
  id uuid primary key default gen_random_uuid(),
  entry_version_id uuid not null unique references knowledge.entry_versions(id),
  rule_code text not null,
  construction_stage text not null,
  check_definition jsonb not null,
  required_evidence jsonb not null default '[]'::jsonb,
  finding_template text not null,
  human_review_required boolean not null default true
    check (human_review_required = true),
  formal_impact text not null default 'none'
    check (formal_impact = 'none')
);

create table knowledge.contract_evidence_rules (
  id uuid primary key default gen_random_uuid(),
  entry_version_id uuid not null unique references knowledge.entry_versions(id),
  rule_code text not null,
  allowed_output_kind text not null check (
    allowed_output_kind in (
      'evidence',
      'comparison',
      'missing_information',
      'risk_note'
    )
  ),
  clause_topic text not null,
  evidence_requirements jsonb not null default '[]'::jsonb,
  comparison_fields jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true
    check (human_review_required = true),
  formal_impact text not null default 'none'
    check (formal_impact = 'none')
);

create table knowledge.price_observations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references knowledge.sources(id),
  unified_item_code text not null,
  observed_low numeric check (observed_low is null or observed_low >= 0),
  observed_high numeric check (observed_high is null or observed_high >= 0),
  sample_count integer check (sample_count is null or sample_count >= 0),
  currency text not null default 'TWD',
  observation_context jsonb not null default '{}'::jsonb,
  lifecycle_state knowledge.lifecycle_state not null default 'pending_review',
  direct_pricing_allowed boolean not null default false
    check (direct_pricing_allowed = false),
  created_at timestamptz not null default now(),
  check (
    observed_low is null
    or observed_high is null
    or observed_high >= observed_low
  )
);

create table knowledge.relations (
  id uuid primary key default gen_random_uuid(),
  from_entry_id uuid not null references knowledge.entries(id),
  to_entry_id uuid not null references knowledge.entries(id),
  relation_type text not null check (
    relation_type in (
      'supports',
      'requires',
      'conflicts_with',
      'applies_to',
      'supersedes',
      'references'
    )
  ),
  lifecycle_state knowledge.lifecycle_state not null default 'pending_review',
  rationale text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (from_entry_id, to_entry_id, relation_type),
  check (from_entry_id <> to_entry_id)
);

create table knowledge.publication_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references knowledge.entries(id),
  version_id uuid not null references knowledge.entry_versions(id),
  event_type text not null check (
    event_type in (
      'draft_created',
      'draft_updated',
      'revision_created',
      'submitted_for_review',
      'returned_to_draft',
      'published',
      'retired'
    )
  ),
  actor_id uuid not null default auth.uid(),
  actor_role text not null,
  source_id uuid not null references knowledge.sources(id),
  before_state knowledge.lifecycle_state,
  after_state knowledge.lifecycle_state not null,
  event_note text not null default '',
  next_owner_role text,
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  occurred_at timestamptz not null default now()
);

create table casework.cases (
  id uuid primary key default gen_random_uuid(),
  external_project_id text,
  title text not null,
  case_status text not null default 'active'
    check (case_status in ('active', 'on_hold', 'closed')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table casework.case_members (
  case_id uuid not null references casework.cases(id),
  user_id uuid not null references auth.users(id),
  role knowledge.case_role not null,
  added_by uuid default auth.uid(),
  added_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create table casework.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  source_document_id text not null,
  pdf_id text,
  file_type text not null default 'pdf'
    check (file_type = 'pdf'),
  title text not null default '',
  storage_object_path text,
  vault_sha256 text not null check (vault_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  revision text,
  source_metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, source_document_id, vault_sha256)
);

create table casework.pdf_sheets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  document_id uuid not null references casework.documents(id),
  record_schema_version text not null default 'a12.drawing_review_queue.v1'
    check (record_schema_version = 'a12.drawing_review_queue.v1'),
  leakage_group text not null,
  pdf_id text not null,
  source_document_id text not null,
  vault_sha256 text not null check (vault_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  page_number integer not null check (page_number > 0),
  source_queue_identity text not null,
  ingest_fingerprint text not null
    check (ingest_fingerprint ~ '^[A-Fa-f0-9]{32}$'),
  source_candidate_class knowledge.pdf_page_type not null,
  page_type_candidate knowledge.pdf_page_type not null,
  applicable_rule_id text,
  drawing_identity jsonb not null default '{}'::jsonb,
  review_checks jsonb not null default '{}'::jsonb,
  sheet_completeness_candidate text not null default 'pending_human_review',
  cross_sheet_consistency_status text not null default 'not_compared'
    check (
      cross_sheet_consistency_status in (
        'not_compared',
        'pending_comparison',
        'candidate_conflict'
      )
    ),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  priority text not null default 'P2' check (priority in ('P0', 'P1', 'P2')),
  review_state text not null default 'candidate_pending_human_review',
  reviewer_class text,
  reviewer_id text,
  reviewed_at timestamptz,
  review_authorizations jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true
    check (human_review_required = true),
  trainable boolean not null default false,
  exclusion_reason text not null default '',
  decision_provenance jsonb,
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, page_number, ingest_fingerprint),
  check (jsonb_typeof(drawing_identity) = 'object'),
  check (jsonb_typeof(review_checks) = 'object'),
  check (jsonb_typeof(review_authorizations) = 'array'),
  check (
    trainable = false
    or review_state = 'dual_review_approved_trainable'
  )
);

create table casework.findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  pdf_sheet_id uuid references casework.pdf_sheets(id),
  domain knowledge.knowledge_domain not null,
  source_client_id text not null default '',
  source_fingerprint text not null
    check (source_fingerprint ~ '^[A-Fa-f0-9]{32}$'),
  finding_type text not null,
  candidate_risk_note text not null check (length(trim(candidate_risk_note)) > 0),
  requested_supplement_candidate text not null default '',
  evidence_basis jsonb not null default '[]'::jsonb,
  evidence_review_status text not null default 'not_manually_reviewed',
  confidence numeric not null default 0 check (confidence between 0 and 1),
  priority text not null default 'P2' check (priority in ('P0', 'P1', 'P2')),
  next_reviewer_role text not null default 'pcm_or_drawing_data_quality_reviewer',
  review_state text not null default 'candidate_pending_human_review',
  applicable_rule_version_id uuid references knowledge.entry_versions(id),
  human_review_required boolean not null default true
    check (human_review_required = true),
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (case_id, source_fingerprint),
  check (jsonb_typeof(evidence_basis) = 'array')
);

create table casework.missing_info_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  finding_id uuid references casework.findings(id),
  item_type text not null,
  description text not null,
  requested_from_role knowledge.case_role not null,
  status text not null default 'pending'
    check (status in ('pending', 'provided', 'needs_confirmation', 'closed')),
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table casework.evidence_links (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  finding_id uuid references casework.findings(id),
  pdf_sheet_id uuid references casework.pdf_sheets(id),
  evidence_type text not null check (
    evidence_type in ('pdf_page', 'pdf_region', 'source_document', 'human_note')
  ),
  source_fingerprint text not null
    check (source_fingerprint ~ '^[A-Fa-f0-9]{32}$'),
  source_document_id text not null,
  page_number integer check (page_number is null or page_number > 0),
  source_ref jsonb not null default '{}'::jsonb,
  evidence_basis jsonb not null default '[]'::jsonb,
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (case_id, source_fingerprint),
  check (jsonb_typeof(evidence_basis) = 'array')
);

create table casework.human_decisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  finding_id uuid references casework.findings(id),
  decision_type text not null,
  decision_status text not null check (
    decision_status in ('confirmed', 'rejected', 'deferred', 'needs_more_information')
  ),
  decision_text text not null,
  evidence_summary jsonb not null default '[]'::jsonb,
  decided_by uuid not null default auth.uid(),
  decided_by_role knowledge.case_role not null,
  decided_at timestamptz not null default now(),
  formal_impact text not null default 'none'
    check (formal_impact = 'none')
);

create table casework.candidate_budget_lines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  source_object_id text not null,
  source_object_origin text not null,
  object_status text not null,
  scope_confirmed boolean not null default false,
  human_decision_id uuid not null references casework.human_decisions(id),
  evidence_link_id uuid not null references casework.evidence_links(id),
  unified_item_code text not null,
  unified_item_name text not null,
  quantity numeric,
  unit text,
  lifecycle_state knowledge.lifecycle_state not null default 'pending_review'
    check (lifecycle_state in ('draft', 'pending_review', 'retired')),
  direct_pricing_allowed boolean not null default false
    check (direct_pricing_allowed = false),
  source_client_id text not null default '',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (case_id, source_object_id, unified_item_code),
  check (
    source_object_origin = 'user_created'
    and object_status = 'new'
    and scope_confirmed = true
    and human_decision_id is not null
    and evidence_link_id is not null
    and direct_pricing_allowed = false
  )
);

create table casework.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references casework.cases(id),
  event_type text not null,
  actor_id uuid not null default auth.uid(),
  actor_role text not null,
  source_document_id text,
  source_version text,
  source_queue_identity text,
  action_summary text not null,
  before_state jsonb,
  after_state jsonb,
  next_owner_role text,
  formal_impact text not null default 'none'
    check (formal_impact = 'none'),
  occurred_at timestamptz not null default now()
);

create index source_records_batch_idx
  on knowledge_staging.source_records(import_batch_id);

create index budget_staging_item_uid_idx
  on knowledge_staging.budget_staging_items(source_item_uid);

create index budget_staging_source_record_idx
  on knowledge_staging.budget_staging_items(source_record_id);

create index quality_issues_batch_idx
  on knowledge_staging.quality_issues(import_batch_id);

create index quality_issues_source_record_idx
  on knowledge_staging.quality_issues(source_record_id);

create index entries_domain_state_idx
  on knowledge.entries(domain, lifecycle_state);

create index entries_current_version_idx
  on knowledge.entries(current_version_id);

create index entry_versions_entry_state_idx
  on knowledge.entry_versions(entry_id, lifecycle_state);

create index entry_versions_source_idx
  on knowledge.entry_versions(source_id);

create index price_observations_item_idx
  on knowledge.price_observations(unified_item_code, lifecycle_state);

create index price_observations_source_idx
  on knowledge.price_observations(source_id);

create index relations_to_entry_idx
  on knowledge.relations(to_entry_id);

create index publication_events_entry_idx
  on knowledge.publication_events(entry_id);

create index publication_events_version_idx
  on knowledge.publication_events(version_id);

create index publication_events_source_idx
  on knowledge.publication_events(source_id);

create index case_members_user_idx
  on casework.case_members(user_id);

create index documents_case_idx
  on casework.documents(case_id);

create index pdf_sheets_case_page_idx
  on casework.pdf_sheets(case_id, page_number);

create index findings_case_domain_idx
  on casework.findings(case_id, domain, created_at desc);

create index findings_pdf_sheet_idx
  on casework.findings(pdf_sheet_id);

create index findings_rule_version_idx
  on casework.findings(applicable_rule_version_id);

create index missing_info_case_idx
  on casework.missing_info_items(case_id);

create index missing_info_finding_idx
  on casework.missing_info_items(finding_id);

create index evidence_links_finding_idx
  on casework.evidence_links(finding_id);

create index evidence_links_pdf_sheet_idx
  on casework.evidence_links(pdf_sheet_id);

create index human_decisions_case_idx
  on casework.human_decisions(case_id);

create index human_decisions_finding_idx
  on casework.human_decisions(finding_id);

create index candidate_budget_decision_idx
  on casework.candidate_budget_lines(human_decision_id);

create index candidate_budget_evidence_idx
  on casework.candidate_budget_lines(evidence_link_id);

create index case_events_case_time_idx
  on casework.case_events(case_id, occurred_at desc);

create or replace function knowledge.guard_lifecycle_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.lifecycle_state = old.lifecycle_state then
    return new;
  end if;

  if not (
    (old.lifecycle_state = 'inbox' and new.lifecycle_state in ('draft', 'retired'))
    or (old.lifecycle_state = 'draft' and new.lifecycle_state in ('pending_review', 'retired'))
    or (
      old.lifecycle_state = 'pending_review'
      and new.lifecycle_state in ('draft', 'approved', 'retired')
    )
    or (old.lifecycle_state = 'approved' and new.lifecycle_state = 'retired')
  ) then
    raise exception 'Unsupported lifecycle transition';
  end if;

  return new;
end;
$$;

create or replace function knowledge.guard_published_version_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.lifecycle_state = 'approved' or old.published_at is not null then
    raise exception 'Published knowledge versions are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function knowledge.guard_append_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Audit events are append-only';
end;
$$;

create or replace function casework.guard_candidate_budget_line()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if knowledge.current_client_id() = 'a12' then
    raise exception 'This client cannot create budget candidates';
  end if;

  if not (
    new.source_object_origin = 'user_created'
    and new.object_status = 'new'
    and new.scope_confirmed = true
    and new.human_decision_id is not null
    and new.evidence_link_id is not null
    and new.direct_pricing_allowed = false
  ) then
    raise exception 'Budget candidate gate requirements are not satisfied';
  end if;

  if not exists (
    select 1
    from casework.human_decisions d
    where d.id = new.human_decision_id
      and d.case_id = new.case_id
      and d.decision_status = 'confirmed'
  ) then
    raise exception 'A confirmed case decision is required';
  end if;

  if not exists (
    select 1
    from casework.evidence_links e
    where e.id = new.evidence_link_id
      and e.case_id = new.case_id
  ) then
    raise exception 'Case-scoped evidence is required';
  end if;

  return new;
end;
$$;

create or replace function casework.guard_finding_client_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if knowledge.current_client_id() = 'a12'
    and new.domain <> 'drawing_review'::knowledge.knowledge_domain then
    raise exception 'This client is limited to drawing review findings';
  end if;
  return new;
end;
$$;

create trigger sources_lifecycle_guard
before update of lifecycle_state on knowledge.sources
for each row execute function knowledge.guard_lifecycle_transition();

create trigger entries_lifecycle_guard
before update of lifecycle_state on knowledge.entries
for each row execute function knowledge.guard_lifecycle_transition();

create trigger versions_lifecycle_guard
before update of lifecycle_state on knowledge.entry_versions
for each row execute function knowledge.guard_lifecycle_transition();

create trigger published_version_immutable
before update or delete on knowledge.entry_versions
for each row execute function knowledge.guard_published_version_immutable();

create trigger publication_events_append_only
before update or delete on knowledge.publication_events
for each row execute function knowledge.guard_append_only();

create trigger case_events_append_only
before update or delete on casework.case_events
for each row execute function knowledge.guard_append_only();

create trigger candidate_budget_line_gate
before insert or update on casework.candidate_budget_lines
for each row execute function casework.guard_candidate_budget_line();

create trigger finding_client_scope
before insert or update on casework.findings
for each row execute function casework.guard_finding_client_scope();

create or replace function casework.is_case_member(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.current_app_role() = 'admin'
    or exists (
      select 1
      from casework.case_members m
      where m.case_id = p_case_id
        and m.user_id = auth.uid()
    )
    or exists (
      select 1
      from casework.cases c
      where c.id = p_case_id
        and c.created_by = auth.uid()
    );
$$;

create or replace function casework.has_case_role(
  p_case_id uuid,
  p_roles knowledge.case_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.current_app_role() = 'admin'
    or exists (
      select 1
      from casework.case_members m
      where m.case_id = p_case_id
        and m.user_id = auth.uid()
        and m.role = any(p_roles)
    )
    or (
      'owner'::knowledge.case_role = any(p_roles)
      and exists (
        select 1
        from casework.cases c
        where c.id = p_case_id
          and c.created_by = auth.uid()
      )
    );
$$;

alter function casework.is_case_member(uuid) owner to postgres;

alter function casework.has_case_role(uuid, knowledge.case_role[]) owner to postgres;

alter table knowledge_staging.import_batches enable row level security;

alter table knowledge_staging.source_records enable row level security;

alter table knowledge_staging.budget_staging_items enable row level security;

alter table knowledge_staging.quality_issues enable row level security;

alter table knowledge.sources enable row level security;

alter table knowledge.entries enable row level security;

alter table knowledge.entry_versions enable row level security;

alter table knowledge.drawing_rules enable row level security;

alter table knowledge.budget_rules enable row level security;

alter table knowledge.acceptance_rules enable row level security;

alter table knowledge.contract_evidence_rules enable row level security;

alter table knowledge.price_observations enable row level security;

alter table knowledge.relations enable row level security;

alter table knowledge.publication_events enable row level security;

alter table casework.cases enable row level security;

alter table casework.case_members enable row level security;

alter table casework.documents enable row level security;

alter table casework.pdf_sheets enable row level security;

alter table casework.findings enable row level security;

alter table casework.missing_info_items enable row level security;

alter table casework.evidence_links enable row level security;

alter table casework.human_decisions enable row level security;

alter table casework.candidate_budget_lines enable row level security;

alter table casework.case_events enable row level security;

create policy staging_reviewer_read_batches
on knowledge_staging.import_batches
for select to authenticated
using (knowledge.is_interactive_reviewer());

create policy staging_reviewer_write_batches
on knowledge_staging.import_batches
for all to authenticated
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

create policy staging_reviewer_read_source_records
on knowledge_staging.source_records
for select to authenticated
using (knowledge.is_interactive_reviewer());

create policy staging_reviewer_write_source_records
on knowledge_staging.source_records
for all to authenticated
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

create policy staging_reviewer_read_budget_items
on knowledge_staging.budget_staging_items
for select to authenticated
using (knowledge.is_interactive_reviewer());

create policy staging_reviewer_write_budget_items
on knowledge_staging.budget_staging_items
for all to authenticated
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

create policy staging_reviewer_read_quality_issues
on knowledge_staging.quality_issues
for select to authenticated
using (knowledge.is_interactive_reviewer());

create policy staging_reviewer_write_quality_issues
on knowledge_staging.quality_issues
for all to authenticated
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

create policy source_approved_or_reviewer_read
on knowledge.sources
for select to authenticated
using (
  lifecycle_state = 'approved'
  or knowledge.current_app_role() in ('pcm', 'admin')
);

create policy source_reviewer_insert
on knowledge.sources
for insert to authenticated
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy source_reviewer_update
on knowledge.sources
for update to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy entry_approved_or_reviewer_read
on knowledge.entries
for select to authenticated
using (
  lifecycle_state = 'approved'
  or knowledge.current_app_role() in ('pcm', 'admin')
);

create policy entry_reviewer_insert
on knowledge.entries
for insert to authenticated
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy entry_reviewer_update
on knowledge.entries
for update to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy version_approved_or_reviewer_read
on knowledge.entry_versions
for select to authenticated
using (
  lifecycle_state = 'approved'
  or knowledge.current_app_role() in ('pcm', 'admin')
);

create policy version_reviewer_insert
on knowledge.entry_versions
for insert to authenticated
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy version_reviewer_update
on knowledge.entry_versions
for update to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy drawing_rule_approved_or_reviewer_read
on knowledge.drawing_rules
for select to authenticated
using (
  knowledge.current_app_role() in ('pcm', 'admin')
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = drawing_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
  )
);

create policy drawing_rule_reviewer_write
on knowledge.drawing_rules
for all to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy budget_rule_approved_or_reviewer_read
on knowledge.budget_rules
for select to authenticated
using (
  knowledge.current_app_role() in ('pcm', 'admin')
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = budget_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
  )
);

create policy budget_rule_reviewer_write
on knowledge.budget_rules
for all to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy acceptance_rule_approved_or_reviewer_read
on knowledge.acceptance_rules
for select to authenticated
using (
  knowledge.current_app_role() in ('pcm', 'admin')
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = acceptance_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
  )
);

create policy acceptance_rule_reviewer_write
on knowledge.acceptance_rules
for all to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy contract_rule_approved_or_reviewer_read
on knowledge.contract_evidence_rules
for select to authenticated
using (
  knowledge.current_app_role() in ('pcm', 'admin')
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = contract_evidence_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
  )
);

create policy contract_rule_reviewer_write
on knowledge.contract_evidence_rules
for all to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy price_observation_approved_or_reviewer_read
on knowledge.price_observations
for select to authenticated
using (
  lifecycle_state = 'approved'
  or knowledge.current_app_role() in ('pcm', 'admin')
);

create policy price_observation_reviewer_write
on knowledge.price_observations
for all to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy relation_approved_or_reviewer_read
on knowledge.relations
for select to authenticated
using (
  lifecycle_state = 'approved'
  or knowledge.current_app_role() in ('pcm', 'admin')
);

create policy relation_reviewer_write
on knowledge.relations
for all to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'))
with check (knowledge.current_app_role() in ('pcm', 'admin'));

create policy publication_event_reviewer_read
on knowledge.publication_events
for select to authenticated
using (knowledge.current_app_role() in ('pcm', 'admin'));

create policy publication_event_reviewer_insert
on knowledge.publication_events
for insert to authenticated
with check (
  knowledge.current_app_role() in ('pcm', 'admin')
  and actor_id = (select auth.uid())
);

create policy case_member_read
on casework.cases
for select to authenticated
using (casework.is_case_member(id));

create policy case_authenticated_create
on casework.cases
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and knowledge.current_app_role() in ('owner', 'pro', 'pcm', 'admin')
);

create policy case_owner_or_pcm_update
on casework.cases
for update to authenticated
using (
  casework.has_case_role(id, array['owner', 'pcm']::knowledge.case_role[])
)
with check (
  casework.has_case_role(id, array['owner', 'pcm']::knowledge.case_role[])
);

create policy case_members_case_read
on casework.case_members
for select to authenticated
using (casework.is_case_member(case_id));

create policy case_members_owner_or_pcm_insert
on casework.case_members
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
);

create policy case_members_owner_or_pcm_update
on casework.case_members
for update to authenticated
using (
  casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
)
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
);

create policy document_member_read
on casework.documents
for select to authenticated
using (casework.is_case_member(case_id));

create policy document_member_insert
on casework.documents
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
);

create policy pdf_sheet_member_read
on casework.pdf_sheets
for select to authenticated
using (casework.is_case_member(case_id));

create policy pdf_sheet_member_insert
on casework.pdf_sheets
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
);

create policy finding_member_read
on casework.findings
for select to authenticated
using (casework.is_case_member(case_id));

create policy finding_member_insert
on casework.findings
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
);

create policy missing_info_member_read
on casework.missing_info_items
for select to authenticated
using (casework.is_case_member(case_id));

create policy missing_info_member_insert
on casework.missing_info_items
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
);

create policy missing_info_owner_or_pcm_update
on casework.missing_info_items
for update to authenticated
using (
  casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
)
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
);

create policy evidence_member_read
on casework.evidence_links
for select to authenticated
using (casework.is_case_member(case_id));

create policy evidence_member_insert
on casework.evidence_links
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
);

create policy decision_member_read
on casework.human_decisions
for select to authenticated
using (casework.is_case_member(case_id));

create policy decision_owner_or_pcm_insert
on casework.human_decisions
for insert to authenticated
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
  and decided_by = (select auth.uid())
);

create policy candidate_budget_member_read
on casework.candidate_budget_lines
for select to authenticated
using (casework.is_case_member(case_id));

create policy candidate_budget_owner_or_pcm_insert
on casework.candidate_budget_lines
for insert to authenticated
with check (
  knowledge.current_client_id() <> 'a12'
  and casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
);

create policy case_event_member_read
on casework.case_events
for select to authenticated
using (casework.is_case_member(case_id));

create policy case_event_member_insert
on casework.case_events
for insert to authenticated
with check (
  casework.is_case_member(case_id)
  and actor_id = (select auth.uid())
);

revoke all on all tables in schema knowledge_staging from public, anon, authenticated;

revoke all on all tables in schema knowledge from public, anon, authenticated;

revoke all on all tables in schema casework from public, anon, authenticated;

grant select, insert, update
on all tables in schema knowledge_staging
to authenticated;

grant select
on all tables in schema knowledge
to authenticated;

grant insert, update
on knowledge.sources,
   knowledge.entries,
   knowledge.entry_versions,
   knowledge.drawing_rules,
   knowledge.budget_rules,
   knowledge.acceptance_rules,
   knowledge.contract_evidence_rules,
   knowledge.price_observations,
   knowledge.relations
to authenticated;

grant insert
on knowledge.publication_events
to authenticated;

grant select, insert, update
on all tables in schema casework
to authenticated;

revoke update on knowledge.publication_events from authenticated;

revoke update on casework.case_events from authenticated;

revoke update on casework.documents from authenticated;

revoke update on casework.pdf_sheets from authenticated;

revoke update on casework.findings from authenticated;

revoke update on casework.evidence_links from authenticated;

revoke update on casework.human_decisions from authenticated;

revoke update on casework.candidate_budget_lines from authenticated;

revoke execute on all functions in schema knowledge from public, anon, authenticated;

revoke execute on all functions in schema casework from public, anon, authenticated;

grant execute on all functions in schema knowledge to authenticated;

grant execute on all functions in schema casework to authenticated;

create or replace function knowledge.submit_entry_version_for_review(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Reviewer role required';
  end if;

  select source_id
  into v_source_id
  from knowledge.entry_versions
  where id = p_version_id
    and entry_id = p_entry_id
    and lifecycle_state = 'draft'
  for update;

  if v_source_id is null then
    raise exception 'Draft version not found';
  end if;

  update knowledge.sources
  set lifecycle_state = case
      when lifecycle_state = 'inbox' then 'draft'::knowledge.lifecycle_state
      else lifecycle_state
    end
  where id = v_source_id;

  update knowledge.sources
  set lifecycle_state = 'pending_review'
  where id = v_source_id
    and lifecycle_state = 'draft';

  update knowledge.entry_versions
  set lifecycle_state = 'pending_review',
      submitted_by = auth.uid(),
      submitted_at = now()
  where id = p_version_id;

  update knowledge.entries
  set lifecycle_state = 'pending_review',
      updated_at = now()
  where id = p_entry_id
    and lifecycle_state = 'draft';

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    p_entry_id,
    p_version_id,
    'submitted_for_review',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    'draft',
    'pending_review',
    coalesce(p_note, ''),
    'pcm'
  );

  return p_version_id;
end;
$$;

create or replace function knowledge.publish_entry_version(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_id uuid;
  v_domain knowledge.knowledge_domain;
  v_source_state knowledge.lifecycle_state;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Reviewer role required';
  end if;

  select ev.source_id, e.domain, s.lifecycle_state
  into v_source_id, v_domain, v_source_state
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  join knowledge.sources s on s.id = ev.source_id
  where ev.id = p_version_id
    and ev.entry_id = p_entry_id
    and ev.lifecycle_state = 'pending_review'
    and e.lifecycle_state in ('pending_review', 'approved')
  for update of ev, e, s;

  if v_source_id is null then
    raise exception 'Reviewable version not found';
  end if;

  if v_source_state not in ('pending_review', 'approved') then
    raise exception 'Source must be pending review';
  end if;

  if v_domain = 'drawing_review'
    and not exists (
      select 1 from knowledge.drawing_rules r
      where r.entry_version_id = p_version_id
    )
    and not exists (
      select 1 from knowledge.acceptance_rules r
      where r.entry_version_id = p_version_id
    ) then
    raise exception 'Drawing rule payload is required';
  end if;

  if v_domain = 'budget'
    and not exists (
      select 1 from knowledge.budget_rules r
      where r.entry_version_id = p_version_id
    ) then
    raise exception 'Budget rule payload is required';
  end if;

  if v_domain = 'contract'
    and not exists (
      select 1 from knowledge.contract_evidence_rules r
      where r.entry_version_id = p_version_id
    ) then
    raise exception 'Contract evidence rule payload is required';
  end if;

  update knowledge.sources
  set lifecycle_state = 'approved',
      published_by = auth.uid(),
      published_at = now()
  where id = v_source_id
    and lifecycle_state = 'pending_review';

  update knowledge.entry_versions
  set lifecycle_state = 'approved',
      published_by = auth.uid(),
      published_at = now()
  where id = p_version_id;

  update knowledge.entries
  set lifecycle_state = 'approved',
      current_version_id = p_version_id,
      title = ev.title,
      summary = ev.summary,
      updated_at = now()
  from knowledge.entry_versions ev
  where knowledge.entries.id = p_entry_id
    and ev.id = p_version_id;

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note
  )
  values (
    p_entry_id,
    p_version_id,
    'published',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    'pending_review',
    'approved',
    coalesce(p_note, '')
  );

  return p_version_id;
end;
$$;

create or replace function knowledge.retire_entry(
  p_entry_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_source_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Reviewer role required';
  end if;

  select e.current_version_id, ev.source_id
  into v_version_id, v_source_id
  from knowledge.entries e
  join knowledge.entry_versions ev on ev.id = e.current_version_id
  where e.id = p_entry_id
    and e.lifecycle_state = 'approved'
  for update of e;

  if v_version_id is null then
    raise exception 'Published entry not found';
  end if;

  update knowledge.entries
  set lifecycle_state = 'retired',
      retired_by = auth.uid(),
      retired_at = now(),
      updated_at = now()
  where id = p_entry_id;

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note
  )
  values (
    p_entry_id,
    v_version_id,
    'retired',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    'approved',
    'retired',
    coalesce(p_note, '')
  );

  return p_entry_id;
end;
$$;

create or replace function knowledge.create_typed_rule(
  p_version_id uuid,
  p_domain knowledge.knowledge_domain,
  p_rule jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_rule_type text;
begin
  if not knowledge.is_interactive_reviewer()
    or jsonb_typeof(p_rule) <> 'object' then
    raise exception 'Valid reviewer rule payload required';
  end if;

  if not exists (
    select 1
    from knowledge.entry_versions ev
    where ev.id = p_version_id
      and ev.lifecycle_state = 'draft'
  ) then
    raise exception 'Typed rules can only be added to a draft version';
  end if;

  v_rule_type := p_rule ->> 'ruleType';

  if p_domain = 'drawing_review' and v_rule_type = 'drawing_rule' then
    insert into knowledge.drawing_rules (
      entry_version_id,
      rule_code,
      rule_kind,
      applicable_page_types,
      condition_definition,
      finding_template,
      supplement_template,
      human_review_required,
      formal_impact
    )
    values (
      p_version_id,
      p_rule ->> 'ruleCode',
      p_rule ->> 'ruleKind',
      array(
        select jsonb_array_elements_text(
          coalesce(p_rule -> 'pageTypes', '[]'::jsonb)
        )
      ),
      coalesce(p_rule -> 'conditions', '{}'::jsonb),
      p_rule ->> 'findingTemplate',
      p_rule ->> 'supplementTemplate',
      true,
      'none'
    );
    return;
  end if;

  if p_domain = 'drawing_review' and v_rule_type = 'acceptance_rule' then
    insert into knowledge.acceptance_rules (
      entry_version_id,
      rule_code,
      construction_stage,
      check_definition,
      required_evidence,
      finding_template,
      human_review_required,
      formal_impact
    )
    values (
      p_version_id,
      p_rule ->> 'ruleCode',
      p_rule ->> 'constructionStage',
      coalesce(p_rule -> 'checkDefinition', '{}'::jsonb),
      coalesce(p_rule -> 'requiredEvidence', '[]'::jsonb),
      p_rule ->> 'findingTemplate',
      true,
      'none'
    );
    return;
  end if;

  if p_domain = 'budget' and v_rule_type = 'budget_rule' then
    insert into knowledge.budget_rules (
      entry_version_id,
      rule_code,
      rule_kind,
      unified_item_code,
      condition_definition,
      output_definition,
      requires_user_created_object,
      requires_scope_confirmation,
      requires_human_decision,
      direct_pricing_allowed,
      formal_impact
    )
    values (
      p_version_id,
      p_rule ->> 'ruleCode',
      p_rule ->> 'ruleKind',
      nullif(p_rule ->> 'unifiedItemCode', ''),
      coalesce(p_rule -> 'conditions', '{}'::jsonb),
      coalesce(p_rule -> 'output', '{}'::jsonb),
      true,
      true,
      true,
      false,
      'none'
    );
    return;
  end if;

  if p_domain = 'contract'
    and v_rule_type = 'contract_evidence_rule' then
    insert into knowledge.contract_evidence_rules (
      entry_version_id,
      rule_code,
      allowed_output_kind,
      clause_topic,
      evidence_requirements,
      comparison_fields,
      human_review_required,
      formal_impact
    )
    values (
      p_version_id,
      p_rule ->> 'ruleCode',
      p_rule ->> 'allowedOutputKind',
      p_rule ->> 'clauseTopic',
      coalesce(p_rule -> 'evidenceRequirements', '[]'::jsonb),
      coalesce(p_rule -> 'comparisonFields', '[]'::jsonb),
      true,
      'none'
    );
    return;
  end if;

  raise exception 'Rule type does not match the knowledge domain';
end;
$$;

create or replace function knowledge.update_typed_rule(
  p_version_id uuid,
  p_domain knowledge.knowledge_domain,
  p_rule jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_rule_type text;
  v_updated integer;
begin
  if not knowledge.is_interactive_reviewer()
    or jsonb_typeof(p_rule) <> 'object' then
    raise exception 'Valid reviewer rule payload required';
  end if;

  if not exists (
    select 1
    from knowledge.entry_versions ev
    where ev.id = p_version_id
      and ev.lifecycle_state = 'draft'
  ) then
    raise exception 'Only draft rule payloads can be updated';
  end if;

  v_rule_type := p_rule ->> 'ruleType';

  if p_domain = 'drawing_review' and v_rule_type = 'drawing_rule' then
    update knowledge.drawing_rules
    set rule_code = p_rule ->> 'ruleCode',
        rule_kind = p_rule ->> 'ruleKind',
        applicable_page_types = array(
          select jsonb_array_elements_text(
            coalesce(p_rule -> 'pageTypes', '[]'::jsonb)
          )
        ),
        condition_definition = coalesce(p_rule -> 'conditions', '{}'::jsonb),
        finding_template = p_rule ->> 'findingTemplate',
        supplement_template = p_rule ->> 'supplementTemplate',
        human_review_required = true,
        formal_impact = 'none'
    where entry_version_id = p_version_id;
    get diagnostics v_updated = row_count;
  elsif p_domain = 'drawing_review' and v_rule_type = 'acceptance_rule' then
    update knowledge.acceptance_rules
    set rule_code = p_rule ->> 'ruleCode',
        construction_stage = p_rule ->> 'constructionStage',
        check_definition = coalesce(
          p_rule -> 'checkDefinition',
          '{}'::jsonb
        ),
        required_evidence = coalesce(
          p_rule -> 'requiredEvidence',
          '[]'::jsonb
        ),
        finding_template = p_rule ->> 'findingTemplate',
        human_review_required = true,
        formal_impact = 'none'
    where entry_version_id = p_version_id;
    get diagnostics v_updated = row_count;
  elsif p_domain = 'budget' and v_rule_type = 'budget_rule' then
    update knowledge.budget_rules
    set rule_code = p_rule ->> 'ruleCode',
        rule_kind = p_rule ->> 'ruleKind',
        unified_item_code = nullif(p_rule ->> 'unifiedItemCode', ''),
        condition_definition = coalesce(
          p_rule -> 'conditions',
          '{}'::jsonb
        ),
        output_definition = coalesce(p_rule -> 'output', '{}'::jsonb),
        requires_user_created_object = true,
        requires_scope_confirmation = true,
        requires_human_decision = true,
        direct_pricing_allowed = false,
        formal_impact = 'none'
    where entry_version_id = p_version_id;
    get diagnostics v_updated = row_count;
  elsif p_domain = 'contract'
    and v_rule_type = 'contract_evidence_rule' then
    update knowledge.contract_evidence_rules
    set rule_code = p_rule ->> 'ruleCode',
        allowed_output_kind = p_rule ->> 'allowedOutputKind',
        clause_topic = p_rule ->> 'clauseTopic',
        evidence_requirements = coalesce(
          p_rule -> 'evidenceRequirements',
          '[]'::jsonb
        ),
        comparison_fields = coalesce(
          p_rule -> 'comparisonFields',
          '[]'::jsonb
        ),
        human_review_required = true,
        formal_impact = 'none'
    where entry_version_id = p_version_id;
    get diagnostics v_updated = row_count;
  else
    raise exception 'Rule type does not match the knowledge domain';
  end if;

  if coalesce(v_updated, 0) <> 1 then
    raise exception 'Draft rule payload was not found';
  end if;
end;
$$;

create or replace function knowledge.approved_rule_payload(
  p_version_id uuid,
  p_domain knowledge.knowledge_domain
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case when not knowledge.can_access_domain(p_domain) then null else
  case p_domain
    when 'drawing_review'::knowledge.knowledge_domain then coalesce(
      (
        select jsonb_build_object(
          'ruleType', 'drawing_rule',
          'ruleCode', r.rule_code,
          'ruleKind', r.rule_kind,
          'pageTypes', r.applicable_page_types,
          'conditions', r.condition_definition,
          'findingTemplate', r.finding_template,
          'supplementTemplate', r.supplement_template,
          'humanReviewRequired', r.human_review_required
        )
        from knowledge.drawing_rules r
        where r.entry_version_id = p_version_id
      ),
      (
        select jsonb_build_object(
          'ruleType', 'acceptance_rule',
          'ruleCode', r.rule_code,
          'constructionStage', r.construction_stage,
          'checkDefinition', r.check_definition,
          'requiredEvidence', r.required_evidence,
          'findingTemplate', r.finding_template,
          'humanReviewRequired', r.human_review_required
        )
        from knowledge.acceptance_rules r
        where r.entry_version_id = p_version_id
      )
    )
    when 'budget'::knowledge.knowledge_domain then (
      select jsonb_build_object(
        'ruleType', 'budget_rule',
        'ruleCode', r.rule_code,
        'ruleKind', r.rule_kind,
        'unifiedItemCode', r.unified_item_code,
        'conditions', r.condition_definition,
        'output', r.output_definition,
        'requiresUserCreatedObject', r.requires_user_created_object,
        'requiresScopeConfirmation', r.requires_scope_confirmation,
        'requiresHumanDecision', r.requires_human_decision,
        'directPricingAllowed', r.direct_pricing_allowed
      )
      from knowledge.budget_rules r
      where r.entry_version_id = p_version_id
    )
    when 'contract'::knowledge.knowledge_domain then (
      select jsonb_build_object(
        'ruleType', 'contract_evidence_rule',
        'ruleCode', r.rule_code,
        'allowedOutputKind', r.allowed_output_kind,
        'clauseTopic', r.clause_topic,
        'evidenceRequirements', r.evidence_requirements,
        'comparisonFields', r.comparison_fields,
        'humanReviewRequired', r.human_review_required
      )
      from knowledge.contract_evidence_rules r
      where r.entry_version_id = p_version_id
    )
  end end;
$$;

create or replace function public.knowledge_ingest_batch(
  p_envelope jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid;
  v_existing_correlation text;
  v_existing_sha256 text;
  v_existing_locator text;
  v_idempotency_key text;
  v_correlation_key text;
  v_manifest jsonb;
  v_source_kind text;
  v_source_locator text;
  v_source_sha256 text;
  v_source_status text;
  v_record jsonb;
  v_budget_item jsonb;
  v_issue jsonb;
  v_source_record_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if jsonb_typeof(p_envelope) <> 'object'
    or p_envelope ->> 'schema_version' <> 'knowledge_staging.v1' then
    raise exception 'Unsupported staging envelope';
  end if;

  if jsonb_typeof(p_envelope -> 'source_manifest') <> 'object'
    or jsonb_typeof(p_envelope -> 'records') <> 'array'
    or jsonb_typeof(p_envelope -> 'budget_items') <> 'array'
    or jsonb_typeof(p_envelope -> 'quality_issues') <> 'array' then
    raise exception 'Staging envelope collections are invalid';
  end if;

  if jsonb_array_length(p_envelope -> 'records') > 1000
    or jsonb_array_length(p_envelope -> 'budget_items') > 1000
    or jsonb_array_length(p_envelope -> 'quality_issues') > 500 then
    raise exception 'Staging chunk exceeds the accepted size';
  end if;

  v_idempotency_key := nullif(p_envelope ->> 'idempotency_key', '');
  v_correlation_key := nullif(p_envelope ->> 'correlation_key', '');
  v_manifest := p_envelope -> 'source_manifest';
  v_source_kind := nullif(v_manifest ->> 'source_kind', '');
  v_source_locator := nullif(v_manifest ->> 'source_locator', '');
  v_source_sha256 := nullif(v_manifest ->> 'source_sha256', '');

  if v_idempotency_key is null
    or v_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    or v_correlation_key is null
    or v_correlation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then
    raise exception 'Invalid idempotency or correlation key';
  end if;

  if v_source_kind not in (
    'obsidian',
    'budget_master',
    'a12_pdf_queue',
    'manual'
  ) then
    raise exception 'Unsupported staging source kind';
  end if;

  if v_source_locator is null
    or length(v_source_locator) > 2048
    or v_source_locator ~ '[[:cntrl:]]'
    or v_source_sha256 is null
    or v_source_sha256 !~ '^[A-Fa-f0-9]{64}$' then
    raise exception 'Invalid source locator or SHA';
  end if;

  select
    b.id,
    b.correlation_key,
    b.source_sha256,
    b.source_locator
  into
    v_batch_id,
    v_existing_correlation,
    v_existing_sha256,
    v_existing_locator
  from knowledge_staging.import_batches b
  where b.idempotency_key = v_idempotency_key;

  if v_batch_id is not null then
    if v_existing_correlation <> v_correlation_key
      or v_existing_sha256 <> v_source_sha256
      or v_existing_locator <> v_source_locator then
      raise exception 'Idempotency key conflicts with another source batch';
    end if;

    return jsonb_build_object(
      'batchId', v_batch_id,
      'correlationKey', v_correlation_key,
      'reused', true,
      'recordCount', (
        select count(*)
        from knowledge_staging.source_records r
        where r.import_batch_id = v_batch_id
      ),
      'budgetItemCount', (
        select count(*)
        from knowledge_staging.budget_staging_items b
        where b.import_batch_id = v_batch_id
      ),
      'qualityIssueCount', (
        select count(*)
        from knowledge_staging.quality_issues q
        where q.import_batch_id = v_batch_id
      ),
      'lifecycleState', 'pending_review',
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
    v_source_kind,
    v_source_locator,
    v_source_sha256,
    coalesce((v_manifest ->> 'source_record_count')::integer, 0),
    coalesce((v_manifest ->> 'chunk_index')::integer, 1),
    coalesce((v_manifest ->> 'chunk_count')::integer, 1),
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
    select b.id
    into v_batch_id
    from knowledge_staging.import_batches b
    where b.idempotency_key = v_idempotency_key
      and b.correlation_key = v_correlation_key
      and b.source_sha256 = v_source_sha256
      and b.source_locator = v_source_locator;

    if v_batch_id is null then
      raise exception 'Concurrent staging batch conflict';
    end if;
  end if;

  for v_record in
    select value from jsonb_array_elements(p_envelope -> 'records')
  loop
    v_source_status := coalesce(v_record ->> 'source_status', '收件箱');
    if v_source_status not in (
      '收件箱',
      '待整理',
      '待確認',
      '已核准',
      '已停用'
    ) then
      raise exception 'Unsupported source lifecycle label';
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
      v_record ->> 'source_key',
      v_source_status,
      knowledge.map_source_status(v_source_status),
      coalesce((v_record ->> 'is_budget_candidate')::boolean, false),
      coalesce((v_record ->> 'auto_trigger_allowed')::boolean, false),
      false,
      false,
      false,
      coalesce(v_record -> 'raw_payload', '{}'::jsonb)
    )
    on conflict (import_batch_id, source_key)
    do nothing;
  end loop;

  for v_budget_item in
    select value from jsonb_array_elements(p_envelope -> 'budget_items')
  loop
    v_source_record_id := null;
    if nullif(v_budget_item ->> 'source_record_key', '') is not null then
      select r.id
      into v_source_record_id
      from knowledge_staging.source_records r
      where r.import_batch_id = v_batch_id
        and r.source_key = v_budget_item ->> 'source_record_key';
    end if;

    insert into knowledge_staging.budget_staging_items (
      import_batch_id,
      source_record_id,
      source_item_uid,
      unified_item_name,
      category_code,
      unit,
      is_budget_candidate,
      auto_trigger_allowed,
      historical_price_low,
      historical_price_high,
      price_currency,
      lifecycle_state,
      publication_authorized,
      candidate_creation_authorized,
      direct_pricing_allowed,
      raw_payload
    )
    values (
      v_batch_id,
      v_source_record_id,
      v_budget_item ->> 'source_item_uid',
      v_budget_item ->> 'unified_item_name',
      nullif(v_budget_item ->> 'category_code', ''),
      nullif(v_budget_item ->> 'unit', ''),
      coalesce((v_budget_item ->> 'is_budget_candidate')::boolean, false),
      coalesce((v_budget_item ->> 'auto_trigger_allowed')::boolean, false),
      nullif(v_budget_item ->> 'historical_price_low', '')::numeric,
      nullif(v_budget_item ->> 'historical_price_high', '')::numeric,
      coalesce(nullif(v_budget_item ->> 'price_currency', ''), 'TWD'),
      'pending_review',
      false,
      false,
      false,
      coalesce(v_budget_item -> 'raw_payload', '{}'::jsonb)
    )
    on conflict (import_batch_id, source_item_uid)
    do nothing;
  end loop;

  for v_issue in
    select value from jsonb_array_elements(p_envelope -> 'quality_issues')
  loop
    v_source_record_id := null;
    if nullif(v_issue ->> 'source_record_key', '') is not null then
      select r.id
      into v_source_record_id
      from knowledge_staging.source_records r
      where r.import_batch_id = v_batch_id
        and r.source_key = v_issue ->> 'source_record_key';
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
      coalesce(
        nullif(v_issue ->> 'next_reviewer_role', ''),
        'pcm'
      )::knowledge.case_role
    );
  end loop;

  update knowledge_staging.import_batches
  set completed_at = now()
  where id = v_batch_id;

  return jsonb_build_object(
    'batchId', v_batch_id,
    'correlationKey', v_correlation_key,
    'reused', false,
    'recordCount', jsonb_array_length(p_envelope -> 'records'),
    'budgetItemCount', jsonb_array_length(p_envelope -> 'budget_items'),
    'qualityIssueCount', jsonb_array_length(p_envelope -> 'quality_issues'),
    'lifecycleState', 'pending_review',
    'publicationAuthorized', false,
    'candidateCreationAuthorized', false,
    'directPricingAllowed', false,
    'formalImpact', 'none'
  );
end;
$$;

create or replace function knowledge.create_studio_source(
  p_source jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_source_id uuid;
  v_source_type text;
  v_source_locator text;
  v_source_sha256 text;
begin
  if not knowledge.is_interactive_reviewer()
    or jsonb_typeof(p_source) <> 'object' then
    raise exception 'Valid reviewer source payload required';
  end if;

  v_source_type := p_source ->> 'source_type';
  v_source_locator := nullif(p_source ->> 'source_locator', '');
  v_source_sha256 := nullif(p_source ->> 'source_sha256', '');

  if v_source_type not in (
    'obsidian_note',
    'budget_master',
    'pdf_evidence',
    'manual_reference'
  )
    or v_source_locator is null
    or length(v_source_locator) > 2048
    or v_source_locator ~ '[[:cntrl:]]'
    or v_source_sha256 is null
    or v_source_sha256 !~ '^[A-Fa-f0-9]{64}$' then
    raise exception 'Invalid Studio source identity';
  end if;

  insert into knowledge.sources (
    source_type,
    title,
    source_location,
    source_sha256,
    lifecycle_state,
    provenance
  )
  values (
    v_source_type,
    p_source ->> 'title',
    v_source_locator,
    v_source_sha256,
    'draft',
    coalesce(p_source -> 'provenance', '{}'::jsonb)
  )
  returning id into v_source_id;

  return v_source_id;
end;
$$;

create or replace function public.knowledge_studio_create_draft(
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_domain knowledge.knowledge_domain;
  v_entry_id uuid;
  v_version_id uuid;
  v_source_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'schema_version' <> 'knowledge_studio.v1'
    or jsonb_typeof(p_payload -> 'content') <> 'object'
    or jsonb_typeof(p_payload -> 'evidence_summary') <> 'array'
    or jsonb_typeof(p_payload -> 'source') <> 'object'
    or jsonb_typeof(p_payload -> 'rule') <> 'object' then
    raise exception 'Invalid Studio draft payload';
  end if;

  if p_payload ->> 'domain' not in (
    'drawing_review',
    'budget',
    'contract'
  ) then
    raise exception 'Unsupported knowledge domain';
  end if;

  if p_payload ->> 'slug'
    !~ '^[a-z0-9][a-z0-9._-]{2,127}$'
    or length(trim(coalesce(p_payload ->> 'title', ''))) = 0 then
    raise exception 'Draft identity is incomplete';
  end if;

  v_domain := (p_payload ->> 'domain')::knowledge.knowledge_domain;
  v_source_id := knowledge.create_studio_source(p_payload -> 'source');

  insert into knowledge.entries (
    domain,
    slug,
    title,
    summary,
    lifecycle_state,
    formal_impact
  )
  values (
    v_domain,
    p_payload ->> 'slug',
    p_payload ->> 'title',
    coalesce(p_payload ->> 'summary', ''),
    'draft',
    'none'
  )
  returning id into v_entry_id;

  insert into knowledge.entry_versions (
    entry_id,
    source_id,
    version_number,
    title,
    summary,
    lifecycle_state,
    content,
    evidence_summary,
    change_note,
    formal_impact
  )
  values (
    v_entry_id,
    v_source_id,
    1,
    p_payload ->> 'title',
    coalesce(p_payload ->> 'summary', ''),
    'draft',
    p_payload -> 'content',
    p_payload -> 'evidence_summary',
    coalesce(p_payload ->> 'change_note', ''),
    'none'
  )
  returning id into v_version_id;

  perform knowledge.create_typed_rule(
    v_version_id,
    v_domain,
    p_payload -> 'rule'
  );

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    v_entry_id,
    v_version_id,
    'draft_created',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    null,
    'draft',
    coalesce(p_payload ->> 'change_note', ''),
    'pcm'
  );

  return jsonb_build_object(
    'entryId', v_entry_id,
    'versionId', v_version_id,
    'sourceId', v_source_id,
    'version', 1,
    'lifecycleState', 'draft',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_studio_update_draft(
  p_entry_id uuid,
  p_version_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_domain knowledge.knowledge_domain;
  v_source_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'schema_version' <> 'knowledge_studio.v1'
    or jsonb_typeof(p_payload -> 'content') <> 'object'
    or jsonb_typeof(p_payload -> 'evidence_summary') <> 'array'
    or jsonb_typeof(p_payload -> 'rule') <> 'object'
    or length(trim(coalesce(p_payload ->> 'title', ''))) = 0 then
    raise exception 'Invalid Studio draft update';
  end if;

  select e.domain, ev.source_id
  into v_domain, v_source_id
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  where ev.id = p_version_id
    and ev.entry_id = p_entry_id
    and ev.lifecycle_state = 'draft'
  for update of ev;

  if v_source_id is null then
    raise exception 'Editable draft was not found';
  end if;

  update knowledge.entry_versions
  set title = p_payload ->> 'title',
      summary = coalesce(p_payload ->> 'summary', ''),
      content = p_payload -> 'content',
      evidence_summary = p_payload -> 'evidence_summary',
      change_note = coalesce(p_payload ->> 'change_note', '')
  where id = p_version_id;

  perform knowledge.update_typed_rule(
    p_version_id,
    v_domain,
    p_payload -> 'rule'
  );

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    p_entry_id,
    p_version_id,
    'draft_updated',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    'draft',
    'draft',
    coalesce(p_payload ->> 'change_note', ''),
    'pcm'
  );

  return jsonb_build_object(
    'entryId', p_entry_id,
    'versionId', p_version_id,
    'lifecycleState', 'draft',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_studio_create_revision(
  p_entry_id uuid,
  p_source jsonb,
  p_change_note text default ''
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_domain knowledge.knowledge_domain;
  v_current_version_id uuid;
  v_new_version_id uuid;
  v_source_id uuid;
  v_next_version integer;
  v_title text;
  v_summary text;
  v_content jsonb;
  v_evidence_summary jsonb;
  v_rule jsonb;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select
    e.domain,
    e.current_version_id,
    ev.title,
    ev.summary,
    ev.content,
    ev.evidence_summary
  into
    v_domain,
    v_current_version_id,
    v_title,
    v_summary,
    v_content,
    v_evidence_summary
  from knowledge.entries e
  join knowledge.entry_versions ev on ev.id = e.current_version_id
  where e.id = p_entry_id
    and e.lifecycle_state = 'approved'
    and ev.lifecycle_state = 'approved'
  for update of e;

  if v_current_version_id is null then
    raise exception 'Published entry was not found';
  end if;

  if exists (
    select 1
    from knowledge.entry_versions ev
    where ev.entry_id = p_entry_id
      and ev.lifecycle_state in ('draft', 'pending_review')
  ) then
    raise exception 'This entry already has an active revision';
  end if;

  select coalesce(max(ev.version_number), 0) + 1
  into v_next_version
  from knowledge.entry_versions ev
  where ev.entry_id = p_entry_id;

  v_source_id := knowledge.create_studio_source(p_source);

  insert into knowledge.entry_versions (
    entry_id,
    source_id,
    version_number,
    title,
    summary,
    lifecycle_state,
    content,
    evidence_summary,
    change_note,
    formal_impact
  )
  values (
    p_entry_id,
    v_source_id,
    v_next_version,
    v_title,
    v_summary,
    'draft',
    v_content,
    v_evidence_summary,
    coalesce(p_change_note, ''),
    'none'
  )
  returning id into v_new_version_id;

  v_rule := knowledge.approved_rule_payload(
    v_current_version_id,
    v_domain
  );
  perform knowledge.create_typed_rule(
    v_new_version_id,
    v_domain,
    v_rule
  );

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    p_entry_id,
    v_new_version_id,
    'revision_created',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    'approved',
    'draft',
    coalesce(p_change_note, ''),
    'pcm'
  );

  return jsonb_build_object(
    'entryId', p_entry_id,
    'versionId', v_new_version_id,
    'sourceId', v_source_id,
    'version', v_next_version,
    'lifecycleState', 'draft',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function knowledge.return_entry_version_to_draft(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_source_id uuid;
  v_current_version_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select ev.source_id, e.current_version_id
  into v_source_id, v_current_version_id
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  where ev.id = p_version_id
    and ev.entry_id = p_entry_id
    and ev.lifecycle_state = 'pending_review'
  for update of ev, e;

  if v_source_id is null then
    raise exception 'Review version was not found';
  end if;

  update knowledge.sources
  set lifecycle_state = 'draft'
  where id = v_source_id
    and lifecycle_state = 'pending_review';

  update knowledge.entry_versions
  set lifecycle_state = 'draft',
      submitted_by = null,
      submitted_at = null
  where id = p_version_id;

  update knowledge.entries
  set lifecycle_state = 'draft',
      updated_at = now()
  where id = p_entry_id
    and current_version_id is null
    and lifecycle_state = 'pending_review';

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    p_entry_id,
    p_version_id,
    'returned_to_draft',
    auth.uid(),
    knowledge.current_app_role(),
    v_source_id,
    'pending_review',
    'draft',
    coalesce(p_note, ''),
    'pcm'
  );

  return p_version_id;
end;
$$;

create or replace function public.knowledge_studio_list(
  p_lifecycle text default null,
  p_domain text default null,
  p_limit integer default 100
)
returns setof jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if p_lifecycle is not null
    and p_lifecycle not in (
      'inbox',
      'draft',
      'pending_review',
      'approved',
      'retired'
    ) then
    raise exception 'Unsupported lifecycle filter';
  end if;

  if p_domain is not null
    and p_domain not in ('drawing_review', 'budget', 'contract') then
    raise exception 'Unsupported domain filter';
  end if;

  return query
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'entryState', e.lifecycle_state,
    'versionId', ev.id,
    'version', ev.version_number,
    'lifecycleState', ev.lifecycle_state,
    'displayType', coalesce(
      nullif(ev.content ->> 'displayType', ''),
      case
        when exists (
          select 1
          from knowledge.acceptance_rules ar
          where ar.entry_version_id = ev.id
        ) then '驗收依據'
        when e.domain = 'drawing_review' then '圖說審查規則'
        when e.domain = 'budget' then '預算規則'
        when e.domain = 'contract' then '契約證據與比對'
        else '知識條目'
      end
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'sourceType', s.source_type,
      'locator', s.source_location,
      'sha256', s.source_sha256,
      'lifecycleState', s.lifecycle_state
    ),
    'eventCount', (
      select count(*)
      from knowledge.publication_events pe
      where pe.entry_id = e.id
    ),
    'nextAction', case ev.lifecycle_state
      when 'draft' then '送出覆核'
      when 'pending_review' then '等待覆核決定'
      when 'approved' then '建立新版或停用'
      when 'retired' then '已停用'
      else '整理草稿'
    end,
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join lateral (
    select candidate.*
    from knowledge.entry_versions candidate
    where candidate.entry_id = e.id
    order by
      case candidate.lifecycle_state
        when 'pending_review' then 0
        when 'draft' then 1
        when 'approved' then 2
        else 3
      end,
      candidate.version_number desc
    limit 1
  ) ev on true
  join knowledge.sources s on s.id = ev.source_id
  where (p_lifecycle is null or ev.lifecycle_state::text = p_lifecycle)
    and (p_domain is null or e.domain::text = p_domain)
  order by ev.created_at desc, e.id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.knowledge_studio_get(
  p_entry_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'entryState', e.lifecycle_state,
    'currentVersionId', e.current_version_id,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'versionId', ev.id,
        'version', ev.version_number,
        'title', ev.title,
        'summary', ev.summary,
        'lifecycleState', ev.lifecycle_state,
        'content', ev.content,
        'evidenceSummary', ev.evidence_summary,
        'changeNote', ev.change_note,
        'createdAt', ev.created_at,
        'submittedAt', ev.submitted_at,
        'publishedAt', ev.published_at,
        'source', jsonb_build_object(
          'sourceId', s.id,
          'sourceType', s.source_type,
          'title', s.title,
          'locator', s.source_location,
          'sha256', s.source_sha256,
          'lifecycleState', s.lifecycle_state,
          'provenance', s.provenance
        ),
        'rule', knowledge.approved_rule_payload(ev.id, e.domain),
        'formalImpact', 'none'
      ) order by ev.version_number desc)
      from knowledge.entry_versions ev
      join knowledge.sources s on s.id = ev.source_id
      where ev.entry_id = e.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', pe.id,
        'eventType', pe.event_type,
        'versionId', pe.version_id,
        'actorId', pe.actor_id,
        'actorRole', pe.actor_role,
        'beforeState', pe.before_state,
        'afterState', pe.after_state,
        'note', pe.event_note,
        'nextOwnerRole', pe.next_owner_role,
        'occurredAt', pe.occurred_at,
        'formalImpact', 'none'
      ) order by pe.occurred_at, pe.id)
      from knowledge.publication_events pe
      where pe.entry_id = e.id
    ), '[]'::jsonb),
    'formalImpact', 'none'
  )
  into v_result
  from knowledge.entries e
  where e.id = p_entry_id;

  if v_result is null then
    raise exception 'Knowledge entry was not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.gateway_search_knowledge(
  p_domain text,
  p_query text default null,
  p_limit integer default 20
)
returns setof jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'versionId', ev.id,
    'version', ev.version_number,
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'location', s.source_location,
      'sha256', s.source_sha256
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join knowledge.entry_versions ev on ev.id = e.current_version_id
  join knowledge.sources s on s.id = ev.source_id
  where e.domain = p_domain::knowledge.knowledge_domain
    and knowledge.can_access_domain(e.domain)
    and e.lifecycle_state = 'approved'
    and ev.lifecycle_state = 'approved'
    and s.lifecycle_state = 'approved'
    and (
      nullif(trim(coalesce(p_query, '')), '') is null
      or ev.title ilike '%' || trim(p_query) || '%'
      or ev.summary ilike '%' || trim(p_query) || '%'
      or ev.content::text ilike '%' || trim(p_query) || '%'
    )
    and knowledge.approved_rule_payload(ev.id, e.domain) is not null
  order by e.updated_at desc, e.id
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

create or replace function public.gateway_get_knowledge_entry(
  p_entry_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'versionId', ev.id,
    'version', ev.version_number,
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'location', s.source_location,
      'sha256', s.source_sha256
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join knowledge.entry_versions ev on ev.id = e.current_version_id
  join knowledge.sources s on s.id = ev.source_id
  where e.id = p_entry_id
    and knowledge.can_access_domain(e.domain)
    and e.lifecycle_state = 'approved'
    and ev.lifecycle_state = 'approved'
    and s.lifecycle_state = 'approved'
    and knowledge.approved_rule_payload(ev.id, e.domain) is not null;
$$;

create or replace function public.gateway_get_case_evidence(
  p_case_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not casework.is_case_member(p_case_id) then
    raise exception 'Case access denied';
  end if;

  return jsonb_build_object(
    'caseId', p_case_id,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'documentId', d.id,
        'sourceDocumentId', d.source_document_id,
        'pdfId', d.pdf_id,
        'title', d.title,
        'sha256', d.vault_sha256,
        'revision', d.revision
      ) order by d.uploaded_at, d.id)
      from casework.documents d
      where d.case_id = p_case_id
    ), '[]'::jsonb),
    'sheets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sheetId', s.id,
        'documentId', s.document_id,
        'schemaVersion', s.record_schema_version,
        'leakageGroup', s.leakage_group,
        'pdfId', s.pdf_id,
        'sourceDocumentId', s.source_document_id,
        'pageNumber', s.page_number,
        'sourceCandidateClass', s.source_candidate_class,
        'pageTypeCandidate', s.page_type_candidate,
        'applicableRuleId', s.applicable_rule_id,
        'drawingIdentity', s.drawing_identity,
        'reviewChecks', s.review_checks,
        'sheetCompletenessCandidate', s.sheet_completeness_candidate,
        'crossSheetConsistencyStatus', s.cross_sheet_consistency_status,
        'confidence', s.confidence,
        'priority', s.priority,
        'reviewState', s.review_state,
        'reviewerClass', s.reviewer_class,
        'reviewerId', s.reviewer_id,
        'reviewedAt', s.reviewed_at,
        'reviewAuthorizations', s.review_authorizations,
        'humanReviewRequired', s.human_review_required,
        'trainable', s.trainable,
        'exclusionReason', s.exclusion_reason,
        'decisionProvenance', s.decision_provenance,
        'formalImpact', 'none'
      ) order by s.source_document_id, s.page_number)
      from casework.pdf_sheets s
      where s.case_id = p_case_id
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'findingId', f.id,
        'sheetId', f.pdf_sheet_id,
        'domain', f.domain,
        'findingType', f.finding_type,
        'candidateRiskNote', f.candidate_risk_note,
        'requestedSupplementCandidate', f.requested_supplement_candidate,
        'evidenceBasis', f.evidence_basis,
        'evidenceReviewStatus', f.evidence_review_status,
        'confidence', f.confidence,
        'priority', f.priority,
        'nextReviewerRole', f.next_reviewer_role,
        'reviewState', f.review_state,
        'humanReviewRequired', f.human_review_required,
        'formalImpact', 'none'
      ) order by f.created_at, f.id)
      from casework.findings f
      where f.case_id = p_case_id
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'evidenceId', e.id,
        'findingId', e.finding_id,
        'sheetId', e.pdf_sheet_id,
        'type', e.evidence_type,
        'sourceDocumentId', e.source_document_id,
        'pageNumber', e.page_number,
        'sourceRef', e.source_ref,
        'evidenceBasis', e.evidence_basis,
        'formalImpact', 'none'
      ) order by e.created_at, e.id)
      from casework.evidence_links e
      where e.case_id = p_case_id
    ), '[]'::jsonb),
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.gateway_record_finding(
  p_case_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_sheet_id uuid;
  v_finding_id uuid;
  v_evidence_id uuid;
  v_previous_sheet_id uuid;
  v_previous_fingerprint text;
  v_previous_sha256 text;
  v_source_document_id text;
  v_pdf_id text;
  v_sha256 text;
  v_page_number integer;
  v_source_queue_identity text;
  v_ingest_fingerprint text;
  v_sheet_reused boolean := false;
begin
  if knowledge.current_client_id() <> 'a12'
    or knowledge.current_app_role() <> 'pcm' then
    raise exception 'This operation is reserved for the A12 drawing client';
  end if;

  if not casework.has_case_role(
    p_case_id,
    array['pcm']::knowledge.case_role[]
  ) then
    raise exception 'Case write access denied';
  end if;

  if p_payload ->> 'schema_version' <> 'a12.drawing_review_queue.v1' then
    raise exception 'Unsupported drawing review record version';
  end if;

  if p_payload ->> 'formalImpact' <> 'none' then
    raise exception 'Finding must remain non-formal';
  end if;

  v_source_document_id := nullif(p_payload ->> 'source_document_id', '');
  v_pdf_id := nullif(p_payload ->> 'pdf_id', '');
  v_sha256 := nullif(p_payload ->> 'vault_sha256', '');
  v_page_number := nullif(p_payload ->> 'page_number', '')::integer;

  if v_source_document_id is null
    or v_pdf_id is null
    or v_sha256 is null
    or v_sha256 !~ '^[A-Fa-f0-9]{64}$'
    or v_page_number is null
    or v_page_number < 1 then
    raise exception 'PDF evidence identity is incomplete';
  end if;

  v_source_queue_identity := concat_ws(
    ':',
    p_payload ->> 'schema_version',
    p_payload ->> 'leakage_group',
    v_pdf_id,
    v_source_document_id,
    v_page_number::text
  );
  v_ingest_fingerprint := md5(p_payload::text);

  select s.id, s.ingest_fingerprint, s.vault_sha256
  into v_previous_sheet_id, v_previous_fingerprint, v_previous_sha256
  from casework.pdf_sheets s
  where s.case_id = p_case_id
    and s.source_document_id = v_source_document_id
    and s.page_number = v_page_number
  order by s.created_at desc, s.id desc
  limit 1;

  insert into casework.documents (
    case_id,
    source_document_id,
    pdf_id,
    file_type,
    title,
    vault_sha256,
    revision,
    source_metadata
  )
  values (
    p_case_id,
    v_source_document_id,
    v_pdf_id,
    'pdf',
    coalesce(p_payload #>> '{drawing_identity,title,value}', ''),
    v_sha256,
    nullif(p_payload #>> '{drawing_identity,revision,value}', ''),
    jsonb_build_object(
      'schemaVersion', p_payload ->> 'schema_version',
      'leakageGroup', p_payload ->> 'leakage_group'
    )
  )
  on conflict (case_id, source_document_id, vault_sha256)
  do nothing
  returning id into v_document_id;

  if v_document_id is null then
    select d.id
    into v_document_id
    from casework.documents d
    where d.case_id = p_case_id
      and d.source_document_id = v_source_document_id
      and d.vault_sha256 = v_sha256;
  end if;

  insert into casework.pdf_sheets (
    case_id,
    document_id,
    record_schema_version,
    leakage_group,
    pdf_id,
    source_document_id,
    vault_sha256,
    page_number,
    source_queue_identity,
    ingest_fingerprint,
    source_candidate_class,
    page_type_candidate,
    applicable_rule_id,
    drawing_identity,
    review_checks,
    sheet_completeness_candidate,
    cross_sheet_consistency_status,
    confidence,
    priority,
    review_state,
    reviewer_class,
    reviewer_id,
    reviewed_at,
    review_authorizations,
    human_review_required,
    trainable,
    exclusion_reason,
    decision_provenance,
    formal_impact
  )
  values (
    p_case_id,
    v_document_id,
    p_payload ->> 'schema_version',
    p_payload ->> 'leakage_group',
    v_pdf_id,
    v_source_document_id,
    v_sha256,
    v_page_number,
    v_source_queue_identity,
    v_ingest_fingerprint,
    (p_payload ->> 'source_candidate_class')::knowledge.pdf_page_type,
    (p_payload ->> 'page_type_candidate')::knowledge.pdf_page_type,
    p_payload ->> 'applicable_rule_id',
    coalesce(p_payload -> 'drawing_identity', '{}'::jsonb),
    coalesce(p_payload -> 'review_checks', '{}'::jsonb),
    coalesce(p_payload ->> 'sheet_completeness_candidate', 'pending_human_review'),
    coalesce(p_payload ->> 'cross_sheet_consistency_status', 'not_compared'),
    coalesce((p_payload ->> 'confidence')::numeric, 0),
    coalesce(p_payload ->> 'priority', 'P2'),
    coalesce(p_payload ->> 'review_state', 'candidate_pending_human_review'),
    nullif(p_payload ->> 'reviewer_class', ''),
    nullif(p_payload ->> 'reviewer_id', ''),
    nullif(p_payload ->> 'reviewed_at', '')::timestamptz,
    coalesce(p_payload -> 'review_authorizations', '[]'::jsonb),
    true,
    coalesce((p_payload ->> 'trainable')::boolean, false),
    coalesce(
      nullif(p_payload ->> 'exclusion_reason', ''),
      'awaiting_human_review'
    ),
    p_payload -> 'decision_provenance',
    'none'
  )
  on conflict (document_id, page_number, ingest_fingerprint)
  do nothing
  returning id into v_sheet_id;

  if v_sheet_id is null then
    v_sheet_reused := true;
    select s.id
    into v_sheet_id
    from casework.pdf_sheets s
    where s.document_id = v_document_id
      and s.page_number = v_page_number
      and s.ingest_fingerprint = v_ingest_fingerprint;
  end if;

  insert into casework.findings (
    case_id,
    pdf_sheet_id,
    domain,
    source_client_id,
    source_fingerprint,
    finding_type,
    candidate_risk_note,
    requested_supplement_candidate,
    evidence_basis,
    evidence_review_status,
    confidence,
    priority,
    next_reviewer_role,
    review_state,
    human_review_required,
    formal_impact
  )
  values (
    p_case_id,
    v_sheet_id,
    'drawing_review',
    knowledge.current_client_id(),
    v_ingest_fingerprint,
    coalesce(p_payload ->> 'page_type_candidate', 'unknown'),
    coalesce(p_payload ->> 'candidate_risk_note', '待人工確認圖面內容'),
    coalesce(
      nullif(p_payload ->> 'requested_supplement_candidate', ''),
      '請人工確認所需補件。'
    ),
    coalesce(p_payload -> 'evidence_basis', '[]'::jsonb),
    coalesce(p_payload ->> 'evidence_review_status', 'not_manually_reviewed'),
    coalesce((p_payload ->> 'confidence')::numeric, 0),
    coalesce(p_payload ->> 'priority', 'P2'),
    coalesce(
      p_payload ->> 'next_reviewer_role',
      'pcm_or_drawing_data_quality_reviewer'
    ),
    coalesce(p_payload ->> 'review_state', 'candidate_pending_human_review'),
    true,
    'none'
  )
  on conflict (case_id, source_fingerprint)
  do nothing
  returning id into v_finding_id;

  if v_finding_id is null then
    select f.id
    into v_finding_id
    from casework.findings f
    where f.case_id = p_case_id
      and f.source_fingerprint = v_ingest_fingerprint;
  end if;

  insert into casework.evidence_links (
    case_id,
    finding_id,
    pdf_sheet_id,
    evidence_type,
    source_fingerprint,
    source_document_id,
    page_number,
    source_ref,
    evidence_basis,
    formal_impact
  )
  values (
    p_case_id,
    v_finding_id,
    v_sheet_id,
    'pdf_page',
    v_ingest_fingerprint,
    v_source_document_id,
    v_page_number,
    jsonb_build_object(
      'pdfId', v_pdf_id,
      'sha256', v_sha256,
      'pageNumber', v_page_number
    ),
    coalesce(p_payload -> 'evidence_basis', '[]'::jsonb),
    'none'
  )
  on conflict (case_id, source_fingerprint)
  do nothing
  returning id into v_evidence_id;

  if v_evidence_id is null then
    select e.id
    into v_evidence_id
    from casework.evidence_links e
    where e.case_id = p_case_id
      and e.source_fingerprint = v_ingest_fingerprint;
  end if;

  insert into casework.case_events (
    case_id,
    event_type,
    actor_id,
    actor_role,
    source_document_id,
    source_version,
    source_queue_identity,
    action_summary,
    before_state,
    after_state,
    next_owner_role,
    formal_impact
  )
  values (
    p_case_id,
    case
      when v_sheet_reused then 'drawing_finding_reused'
      else 'drawing_finding_recorded'
    end,
    auth.uid(),
    knowledge.current_app_role(),
    v_source_document_id,
    v_sha256,
    v_source_queue_identity,
    case
      when v_sheet_reused then '已比對相同圖面紀錄並追加查詢留痕'
      else '已建立圖面待確認事項與證據留痕'
    end,
    case
      when v_previous_sheet_id is null then null
      else jsonb_build_object(
        'sheetId', v_previous_sheet_id,
        'fingerprint', v_previous_fingerprint,
        'sha256', v_previous_sha256
      )
    end,
    jsonb_build_object(
      'findingId', v_finding_id,
      'sheetId', v_sheet_id,
      'evidenceId', v_evidence_id,
      'fingerprint', v_ingest_fingerprint,
      'sha256', v_sha256,
      'sourceQueueIdentity', v_source_queue_identity,
      'reviewState', coalesce(
        p_payload ->> 'review_state',
        'candidate_pending_human_review'
      )
    ),
    coalesce(
      p_payload ->> 'next_reviewer_role',
      'pcm_or_drawing_data_quality_reviewer'
    ),
    'none'
  );

  return jsonb_build_object(
    'findingId', v_finding_id,
    'sheetId', v_sheet_id,
    'evidenceId', v_evidence_id,
    'sourceQueueIdentity', v_source_queue_identity,
    'fingerprint', v_ingest_fingerprint,
    'reused', v_sheet_reused,
    'reviewState', coalesce(
      p_payload ->> 'review_state',
      'candidate_pending_human_review'
    ),
    'humanReviewRequired', true,
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_submit_for_review(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select knowledge.submit_entry_version_for_review(
    p_entry_id,
    p_version_id,
    p_note
  );
$$;

create or replace function public.knowledge_return_to_draft(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select knowledge.return_entry_version_to_draft(
    p_entry_id,
    p_version_id,
    p_note
  );
$$;

create or replace function public.knowledge_publish_entry_version(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select knowledge.publish_entry_version(
    p_entry_id,
    p_version_id,
    p_note
  );
$$;

create or replace function public.knowledge_retire_entry(
  p_entry_id uuid,
  p_note text default ''
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select knowledge.retire_entry(p_entry_id, p_note);
$$;

revoke all on function public.gateway_search_knowledge(text, text, integer)
from public, anon;

revoke all on function public.gateway_get_knowledge_entry(uuid)
from public, anon;

revoke all on function public.gateway_get_case_evidence(uuid)
from public, anon;

revoke all on function public.gateway_record_finding(uuid, jsonb)
from public, anon;

revoke all on function public.knowledge_ingest_batch(jsonb)
from public, anon;

revoke all on function public.knowledge_studio_list(text, text, integer)
from public, anon;

revoke all on function public.knowledge_studio_get(uuid)
from public, anon;

revoke all on function public.knowledge_studio_create_draft(jsonb)
from public, anon;

revoke all on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
from public, anon;

revoke all on function public.knowledge_studio_create_revision(uuid, jsonb, text)
from public, anon;

revoke all on function public.knowledge_submit_for_review(uuid, uuid, text)
from public, anon;

revoke all on function public.knowledge_return_to_draft(uuid, uuid, text)
from public, anon;

revoke all on function public.knowledge_publish_entry_version(uuid, uuid, text)
from public, anon;

revoke all on function public.knowledge_retire_entry(uuid, text)
from public, anon;

grant execute on function public.gateway_search_knowledge(text, text, integer)
to authenticated;

grant execute on function public.gateway_get_knowledge_entry(uuid)
to authenticated;

grant execute on function public.gateway_get_case_evidence(uuid)
to authenticated;

grant execute on function public.gateway_record_finding(uuid, jsonb)
to authenticated;

grant execute on function public.knowledge_ingest_batch(jsonb)
to authenticated;

grant execute on function public.knowledge_studio_list(text, text, integer)
to authenticated;

grant execute on function public.knowledge_studio_get(uuid)
to authenticated;

grant execute on function public.knowledge_studio_create_draft(jsonb)
to authenticated;

grant execute on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
to authenticated;

grant execute on function public.knowledge_studio_create_revision(uuid, jsonb, text)
to authenticated;

grant execute on function public.knowledge_submit_for_review(uuid, uuid, text)
to authenticated;

grant execute on function public.knowledge_return_to_draft(uuid, uuid, text)
to authenticated;

grant execute on function public.knowledge_publish_entry_version(uuid, uuid, text)
to authenticated;

grant execute on function public.knowledge_retire_entry(uuid, text)
to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'knowledge-source-private',
    'knowledge-source-private',
    false,
    52428800,
    array[
      'application/pdf',
      'application/json',
      'text/markdown',
      'text/plain'
    ]
  ),
  (
    'case-documents-private',
    'case-documents-private',
    false,
    104857600,
    array['application/pdf']
  )
on conflict (id)
do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy knowledge_source_reviewer_read
on storage.objects
for select to authenticated
using (
  bucket_id = 'knowledge-source-private'
  and knowledge.current_app_role() in ('pcm', 'admin')
);

create policy knowledge_source_reviewer_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'knowledge-source-private'
  and knowledge.current_app_role() in ('pcm', 'admin')
);

create policy case_document_member_read
on storage.objects
for select to authenticated
using (
  bucket_id = 'case-documents-private'
  and exists (
    select 1
    from casework.cases c
    where c.id::text = (storage.foldername(name))[1]
      and casework.is_case_member(c.id)
  )
);

create policy case_document_member_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'case-documents-private'
  and exists (
    select 1
    from casework.case_members m
    where m.case_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'pro', 'pcm')
  )
);

-- Source: 20260727070737_pcm_knowledge_domain_rls_hardening.sql
-- SHA-256: 3eb5b6cde410daf947eb876cbad65bad398bbf2c73bd06809227b95726e3b3f6
alter policy source_approved_or_reviewer_read
on knowledge.sources
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and (
      exists (
        select 1
        from knowledge.entry_versions ev
        join knowledge.entries e on e.id = ev.entry_id
        where ev.source_id = sources.id
          and ev.lifecycle_state = 'approved'
          and e.lifecycle_state = 'approved'
          and knowledge.can_access_domain(e.domain)
      )
      or (
        knowledge.can_access_domain('budget')
        and exists (
          select 1
          from knowledge.price_observations po
          where po.source_id = sources.id
            and po.lifecycle_state = 'approved'
        )
      )
    )
  )
);

alter policy source_reviewer_insert
on knowledge.sources
with check (knowledge.is_interactive_reviewer());

alter policy source_reviewer_update
on knowledge.sources
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy entry_approved_or_reviewer_read
on knowledge.entries
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and knowledge.can_access_domain(domain)
  )
);

alter policy entry_reviewer_insert
on knowledge.entries
with check (knowledge.is_interactive_reviewer());

alter policy entry_reviewer_update
on knowledge.entries
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy version_approved_or_reviewer_read
on knowledge.entry_versions
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and exists (
      select 1
      from knowledge.entries e
      where e.id = entry_versions.entry_id
        and e.lifecycle_state = 'approved'
        and knowledge.can_access_domain(e.domain)
    )
  )
);

alter policy version_reviewer_insert
on knowledge.entry_versions
with check (knowledge.is_interactive_reviewer());

alter policy version_reviewer_update
on knowledge.entry_versions
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy drawing_rule_approved_or_reviewer_read
on knowledge.drawing_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = drawing_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy drawing_rule_reviewer_write
on knowledge.drawing_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy budget_rule_approved_or_reviewer_read
on knowledge.budget_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = budget_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy budget_rule_reviewer_write
on knowledge.budget_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy acceptance_rule_approved_or_reviewer_read
on knowledge.acceptance_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = acceptance_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy acceptance_rule_reviewer_write
on knowledge.acceptance_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy contract_rule_approved_or_reviewer_read
on knowledge.contract_evidence_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = contract_evidence_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy contract_rule_reviewer_write
on knowledge.contract_evidence_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy price_observation_approved_or_reviewer_read
on knowledge.price_observations
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and knowledge.can_access_domain('budget')
  )
);

alter policy price_observation_reviewer_write
on knowledge.price_observations
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy relation_approved_or_reviewer_read
on knowledge.relations
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and exists (
      select 1
      from knowledge.entries source_entry
      join knowledge.entries target_entry
        on target_entry.id = relations.to_entry_id
      where source_entry.id = relations.from_entry_id
        and source_entry.lifecycle_state = 'approved'
        and target_entry.lifecycle_state = 'approved'
        and knowledge.can_access_domain(source_entry.domain)
        and knowledge.can_access_domain(target_entry.domain)
    )
  )
);

alter policy relation_reviewer_write
on knowledge.relations
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy publication_event_reviewer_read
on knowledge.publication_events
using (knowledge.is_interactive_reviewer());

alter policy publication_event_reviewer_insert
on knowledge.publication_events
with check (
  knowledge.is_interactive_reviewer()
  and actor_id = (select auth.uid())
);

alter policy finding_member_read
on casework.findings
using (
  casework.is_case_member(case_id)
  and knowledge.can_access_domain(domain)
);

alter policy finding_member_insert
on casework.findings
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
  and knowledge.can_access_domain(domain)
);

alter policy candidate_budget_owner_or_pcm_insert
on casework.candidate_budget_lines
with check (
  knowledge.current_client_id() not in ('a12', 'contract')
  and casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
);

-- Source: 20260727072627_pcm_knowledge_active_session_hardening.sql
-- SHA-256: b5c0e65780367f7528a92b98c084351e9ebcb87c6407951718091ec7a5cb7463
create or replace function knowledge.has_active_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    join auth.users u on u.id = s.user_id
    where s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and s.user_id::text = coalesce(auth.jwt() ->> 'sub', '')
      and (s.not_after is null or s.not_after > now())
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

alter function knowledge.has_active_session() owner to postgres;

revoke all on function knowledge.has_active_session()
from public, anon, authenticated;

grant execute on function knowledge.has_active_session()
to authenticated;

create or replace function knowledge.is_interactive_reviewer()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and knowledge.current_app_role() in ('pcm', 'admin')
    and knowledge.current_client_id() not in ('a12', 'budget', 'contract');
$$;

create or replace function knowledge.can_access_domain(
  p_domain knowledge.knowledge_domain
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_role text := knowledge.current_app_role();
  v_client_id text := knowledge.current_client_id();
  v_allowed_domains jsonb :=
    auth.jwt() -> 'app_metadata' -> 'allowed_knowledge_domains';
begin
  if not knowledge.has_active_session() then
    return false;
  end if;

  if v_client_id = 'a12' then
    return v_role = 'pcm' and p_domain = 'drawing_review';
  end if;

  if v_client_id = 'budget' then
    return
      v_role in ('owner', 'pro', 'pcm', 'admin')
      and p_domain = 'budget';
  end if;

  if v_client_id = 'contract' then
    return
      v_role in ('owner', 'pro', 'pcm', 'admin')
      and p_domain = 'contract';
  end if;

  if v_role in ('pcm', 'admin') then
    return true;
  end if;

  if v_role in ('owner', 'pro') then
    return coalesce(v_allowed_domains ? p_domain::text, false);
  end if;

  return false;
end;
$$;

create or replace function casework.is_case_member(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and (
      knowledge.current_app_role() = 'admin'
      or exists (
        select 1
        from casework.case_members m
        where m.case_id = p_case_id
          and m.user_id = auth.uid()
      )
      or exists (
        select 1
        from casework.cases c
        where c.id = p_case_id
          and c.created_by = auth.uid()
      )
    );
$$;

create or replace function casework.has_case_role(
  p_case_id uuid,
  p_roles knowledge.case_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and (
      knowledge.current_app_role() = 'admin'
      or exists (
        select 1
        from casework.case_members m
        where m.case_id = p_case_id
          and m.user_id = auth.uid()
          and m.role = any(p_roles)
      )
      or (
        'owner'::knowledge.case_role = any(p_roles)
        and exists (
          select 1
          from casework.cases c
          where c.id = p_case_id
            and c.created_by = auth.uid()
        )
      )
    );
$$;

alter policy case_authenticated_create
on casework.cases
with check (
  knowledge.has_active_session()
  and (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and knowledge.current_app_role() in ('owner', 'pro', 'pcm', 'admin')
);

alter policy knowledge_source_reviewer_read
on storage.objects
using (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

alter policy knowledge_source_reviewer_insert
on storage.objects
with check (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

-- Source: 20260727094259_knowledge_case_event_next_action.sql
-- SHA-256: abcad932045bb44063bd1299dc3685468de5a3259caf5b0ec7bc497bfe7bdfca
alter table knowledge.publication_events
  add column if not exists next_action text
  not null default '由下一位處理者確認後續事項';

alter table casework.case_events
  add column if not exists next_action text
  not null default '由下一位處理者確認案件紀錄';

alter table knowledge.publication_events
  add constraint publication_events_next_action_nonempty
  check (
    length(btrim(next_action)) > 0
    and next_action !~ '[[:cntrl:]]'
  );

alter table casework.case_events
  add constraint case_events_next_action_nonempty
  check (
    length(btrim(next_action)) > 0
    and next_action !~ '[[:cntrl:]]'
  );

create or replace function knowledge.fill_publication_event_next_action()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.next_action), '') is null
    or new.next_action = '由下一位處理者確認後續事項' then
    new.next_action := case new.event_type
      when 'draft_created' then '補充內容與依據後送出覆核'
      when 'draft_updated' then '確認修改內容後送出覆核'
      when 'revision_created' then '完成新版內容後送出覆核'
      when 'submitted_for_review' then '由 PCM 覆核內容與依據'
      when 'returned_to_draft' then '依退回意見修正後重新送審'
      when 'published' then '依核准版本提供受控檢索'
      when 'retired' then '停止召回並保留版本紀錄'
      else '由下一位處理者確認後續事項'
    end;
  end if;
  return new;
end;
$$;

create or replace function casework.fill_case_event_next_action()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.next_action), '') is null
    or new.next_action = '由下一位處理者確認案件紀錄' then
    new.next_action := case
      when new.event_type in (
        'drawing_finding_recorded',
        'drawing_finding_reused'
      ) then '由 PCM 複核圖說差異與補件需求'
      else '由下一位處理者確認案件紀錄'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists publication_events_next_action
on knowledge.publication_events;

create trigger publication_events_next_action
before insert on knowledge.publication_events
for each row execute function knowledge.fill_publication_event_next_action();

drop trigger if exists case_events_next_action
on casework.case_events;

create trigger case_events_next_action
before insert on casework.case_events
for each row execute function casework.fill_case_event_next_action();

create or replace function public.knowledge_studio_list(
  p_lifecycle text default null,
  p_domain text default null,
  p_limit integer default 100
)
returns setof jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if p_lifecycle is not null
    and p_lifecycle not in (
      'inbox',
      'draft',
      'pending_review',
      'approved',
      'retired'
    ) then
    raise exception 'Unsupported lifecycle filter';
  end if;

  if p_domain is not null
    and p_domain not in ('drawing_review', 'budget', 'contract') then
    raise exception 'Unsupported domain filter';
  end if;

  return query
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'entryState', e.lifecycle_state,
    'versionId', ev.id,
    'version', ev.version_number,
    'lifecycleState', ev.lifecycle_state,
    'displayType', coalesce(
      nullif(ev.content ->> 'displayType', ''),
      case
        when exists (
          select 1
          from knowledge.acceptance_rules ar
          where ar.entry_version_id = ev.id
        ) then '驗收依據'
        when e.domain = 'drawing_review' then '圖說審查規則'
        when e.domain = 'budget' then '預算規則'
        when e.domain = 'contract' then '契約證據與比對'
        else '知識條目'
      end
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'sourceType', s.source_type,
      'locator', s.source_location,
      'sha256', s.source_sha256,
      'lifecycleState', s.lifecycle_state
    ),
    'eventCount', (
      select count(*)
      from knowledge.publication_events pe
      where pe.entry_id = e.id
    ),
    'nextOwnerRole', coalesce(
      latest_event.next_owner_role,
      case ev.lifecycle_state
        when 'draft' then '規則整理人'
        when 'pending_review' then 'PCM 覆核人'
        else 'PCM 維護人'
      end
    ),
    'nextAction', coalesce(
      latest_event.next_action,
      case ev.lifecycle_state
        when 'draft' then '送出覆核'
        when 'pending_review' then '等待覆核決定'
        when 'approved' then '建立新版或停用'
        when 'retired' then '已停用'
        else '整理草稿'
      end
    ),
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join lateral (
    select candidate.*
    from knowledge.entry_versions candidate
    where candidate.entry_id = e.id
    order by
      case candidate.lifecycle_state
        when 'pending_review' then 0
        when 'draft' then 1
        when 'approved' then 2
        else 3
      end,
      candidate.version_number desc
    limit 1
  ) ev on true
  join knowledge.sources s on s.id = ev.source_id
  left join lateral (
    select pe.next_owner_role, pe.next_action
    from knowledge.publication_events pe
    where pe.entry_id = e.id
    order by pe.occurred_at desc, pe.id desc
    limit 1
  ) latest_event on true
  where (p_lifecycle is null or ev.lifecycle_state::text = p_lifecycle)
    and (p_domain is null or e.domain::text = p_domain)
  order by ev.created_at desc, e.id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.knowledge_studio_get(
  p_entry_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'entryState', e.lifecycle_state,
    'currentVersionId', e.current_version_id,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'versionId', ev.id,
        'version', ev.version_number,
        'title', ev.title,
        'summary', ev.summary,
        'lifecycleState', ev.lifecycle_state,
        'content', ev.content,
        'evidenceSummary', ev.evidence_summary,
        'changeNote', ev.change_note,
        'createdAt', ev.created_at,
        'submittedAt', ev.submitted_at,
        'publishedAt', ev.published_at,
        'source', jsonb_build_object(
          'sourceId', s.id,
          'sourceType', s.source_type,
          'title', s.title,
          'locator', s.source_location,
          'sha256', s.source_sha256,
          'lifecycleState', s.lifecycle_state,
          'provenance', s.provenance
        ),
        'rule', knowledge.approved_rule_payload(ev.id, e.domain),
        'formalImpact', 'none'
      ) order by ev.version_number desc)
      from knowledge.entry_versions ev
      join knowledge.sources s on s.id = ev.source_id
      where ev.entry_id = e.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', pe.id,
        'eventType', pe.event_type,
        'versionId', pe.version_id,
        'actorId', pe.actor_id,
        'actorRole', pe.actor_role,
        'beforeState', pe.before_state,
        'afterState', pe.after_state,
        'note', pe.event_note,
        'nextOwnerRole', pe.next_owner_role,
        'nextAction', pe.next_action,
        'occurredAt', pe.occurred_at,
        'formalImpact', 'none'
      ) order by pe.occurred_at, pe.id)
      from knowledge.publication_events pe
      where pe.entry_id = e.id
    ), '[]'::jsonb),
    'formalImpact', 'none'
  )
  into v_result
  from knowledge.entries e
  where e.id = p_entry_id;

  if v_result is null then
    raise exception 'Knowledge entry was not found';
  end if;

  return v_result;
end;
$$;

-- Source: 20260727161457_pcm_woodwork_candidates_staging.sql
-- SHA-256: 3223abd6e97b47e55307f8864b6b896068db833d197c1fb6f186aa04a4a1c2b7
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

-- Source: 20260727193000_pcm_knowledge_rpc_surface_hardening.sql
-- SHA-256: 9830e1fa64559617ce3b350db196f0f5f251f7a029d5d5e734040b7933d16e20
-- Knowledge Studio and Gateway are RPC-only client surfaces. Browser roles do
-- not receive direct table or sequence access in the A5 schemas.
revoke all privileges on all tables in schema knowledge
from public, anon, authenticated;

revoke all privileges on all sequences in schema knowledge
from public, anon, authenticated;

revoke all privileges on all tables in schema knowledge_staging
from public, anon, authenticated;

revoke all privileges on all sequences in schema knowledge_staging
from public, anon, authenticated;

revoke all privileges on all tables in schema casework
from public, anon, authenticated;

revoke all privileges on all sequences in schema casework
from public, anon, authenticated;

alter default privileges in schema knowledge
revoke all on tables from public, anon, authenticated;

alter default privileges in schema knowledge
revoke all on sequences from public, anon, authenticated;

alter default privileges in schema knowledge_staging
revoke all on tables from public, anon, authenticated;

alter default privileges in schema knowledge_staging
revoke all on sequences from public, anon, authenticated;

alter default privileges in schema casework
revoke all on tables from public, anon, authenticated;

alter default privileges in schema casework
revoke all on sequences from public, anon, authenticated;

-- PostgreSQL grants PUBLIC function execution globally by default; a
-- schema-scoped default revoke cannot override that global default. Every A5
-- function is therefore revoked and granted by exact signature below.

revoke all on schema knowledge from public, anon, authenticated;

revoke all on schema knowledge_staging from public, anon, authenticated;

revoke all on schema casework from public, anon, authenticated;

-- These two schemas are visible only so authenticated Storage policies can
-- resolve their reviewed helper functions. No table privileges accompany use.
grant usage on schema knowledge to authenticated;

grant usage on schema casework to authenticated;

create or replace function knowledge.assert_studio_payload_complete(
  p_payload jsonb
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_missing text[] := array[]::text[];
begin
  if jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'schema_version' <> 'knowledge_studio.v1'
    or jsonb_typeof(p_payload -> 'content') <> 'object' then
    raise exception 'Studio payload is not valid';
  end if;

  if length(btrim(coalesce(p_payload ->> 'title', ''))) = 0 then
    v_missing := array_append(v_missing, 'title');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'displayType', ''))) = 0
  then
    v_missing := array_append(v_missing, 'displayType');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'owner', ''))) = 0 then
    v_missing := array_append(v_missing, 'owner');
  end if;
  if length(btrim(coalesce(p_payload ->> 'summary', ''))) = 0 then
    v_missing := array_append(v_missing, 'summary');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'criteria', ''))) = 0
  then
    v_missing := array_append(v_missing, 'criteria');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'nextOwner', ''))) = 0
  then
    v_missing := array_append(v_missing, 'nextOwner');
  end if;
  if jsonb_typeof(p_payload -> 'evidence_summary') <> 'array'
    or jsonb_array_length(p_payload -> 'evidence_summary') = 0
    or not exists (
      select 1
      from jsonb_array_elements_text(p_payload -> 'evidence_summary') item
      where length(btrim(item)) > 0
    ) then
    v_missing := array_append(v_missing, 'evidence_summary');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Studio required fields are incomplete: %',
      array_to_string(v_missing, ', ');
  end if;
end;
$$;

create or replace function knowledge.assert_studio_version_complete(
  p_entry_id uuid,
  p_version_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  select jsonb_build_object(
    'schema_version', 'knowledge_studio.v1',
    'title', ev.title,
    'summary', ev.summary,
    'content', ev.content,
    'evidence_summary', ev.evidence_summary
  )
  into v_payload
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  join knowledge.sources s on s.id = ev.source_id
  where ev.entry_id = p_entry_id
    and ev.id = p_version_id
    and e.id = p_entry_id;

  if v_payload is null then
    raise exception 'Studio version was not found';
  end if;

  perform knowledge.assert_studio_payload_complete(v_payload);
end;
$$;

create or replace function public.knowledge_studio_save_and_submit(
  p_entry_id uuid,
  p_version_id uuid,
  p_payload jsonb,
  p_note text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_saved jsonb;
  v_event_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  perform knowledge.assert_studio_payload_complete(p_payload);

  v_saved := public.knowledge_studio_update_draft(
    p_entry_id,
    p_version_id,
    p_payload
  );

  perform knowledge.assert_studio_version_complete(
    p_entry_id,
    p_version_id
  );

  v_event_id := knowledge.submit_entry_version_for_review(
    p_entry_id,
    p_version_id,
    p_note
  );

  return v_saved || jsonb_build_object(
    'eventId', v_event_id,
    'lifecycleState', 'pending_review',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_submit_for_review(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  perform knowledge.assert_studio_version_complete(
    p_entry_id,
    p_version_id
  );
  return knowledge.submit_entry_version_for_review(
    p_entry_id,
    p_version_id,
    p_note
  );
end;
$$;

create or replace function public.knowledge_publish_entry_version(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  perform knowledge.assert_studio_version_complete(
    p_entry_id,
    p_version_id
  );
  return knowledge.publish_entry_version(
    p_entry_id,
    p_version_id,
    p_note
  );
end;
$$;

-- A case member may use more than one A5 client, but each client can read only
-- the finding domains allowed by its active-session JWT. Evidence is returned
-- only when it is linked to a finding in an allowed domain.
create or replace function public.gateway_get_case_evidence(
  p_case_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not casework.is_case_member(p_case_id) then
    raise exception 'Case access denied';
  end if;

  return jsonb_build_object(
    'caseId', p_case_id,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'documentId', d.id,
        'sourceDocumentId', d.source_document_id,
        'pdfId', d.pdf_id,
        'title', d.title,
        'sha256', d.vault_sha256,
        'revision', d.revision
      ) order by d.uploaded_at, d.id)
      from casework.documents d
      where d.case_id = p_case_id
        and knowledge.can_access_domain('drawing_review')
    ), '[]'::jsonb),
    'sheets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sheetId', s.id,
        'documentId', s.document_id,
        'schemaVersion', s.record_schema_version,
        'leakageGroup', s.leakage_group,
        'pdfId', s.pdf_id,
        'sourceDocumentId', s.source_document_id,
        'pageNumber', s.page_number,
        'sourceCandidateClass', s.source_candidate_class,
        'pageTypeCandidate', s.page_type_candidate,
        'applicableRuleId', s.applicable_rule_id,
        'drawingIdentity', s.drawing_identity,
        'reviewChecks', s.review_checks,
        'sheetCompletenessCandidate', s.sheet_completeness_candidate,
        'crossSheetConsistencyStatus', s.cross_sheet_consistency_status,
        'confidence', s.confidence,
        'priority', s.priority,
        'reviewState', s.review_state,
        'reviewerClass', s.reviewer_class,
        'reviewerId', s.reviewer_id,
        'reviewedAt', s.reviewed_at,
        'reviewAuthorizations', s.review_authorizations,
        'humanReviewRequired', s.human_review_required,
        'trainable', s.trainable,
        'exclusionReason', s.exclusion_reason,
        'decisionProvenance', s.decision_provenance,
        'formalImpact', 'none'
      ) order by s.source_document_id, s.page_number)
      from casework.pdf_sheets s
      where s.case_id = p_case_id
        and knowledge.can_access_domain('drawing_review')
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'findingId', f.id,
        'sheetId', f.pdf_sheet_id,
        'domain', f.domain,
        'findingType', f.finding_type,
        'candidateRiskNote', f.candidate_risk_note,
        'requestedSupplementCandidate', f.requested_supplement_candidate,
        'evidenceBasis', f.evidence_basis,
        'evidenceReviewStatus', f.evidence_review_status,
        'confidence', f.confidence,
        'priority', f.priority,
        'nextReviewerRole', f.next_reviewer_role,
        'reviewState', f.review_state,
        'humanReviewRequired', f.human_review_required,
        'formalImpact', 'none'
      ) order by f.created_at, f.id)
      from casework.findings f
      where f.case_id = p_case_id
        and knowledge.can_access_domain(f.domain)
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'evidenceId', e.id,
        'findingId', e.finding_id,
        'sheetId', e.pdf_sheet_id,
        'type', e.evidence_type,
        'sourceDocumentId', e.source_document_id,
        'pageNumber', e.page_number,
        'sourceRef', e.source_ref,
        'evidenceBasis', e.evidence_basis,
        'formalImpact', 'none'
      ) order by e.created_at, e.id)
      from casework.evidence_links e
      join casework.findings f
        on f.id = e.finding_id
       and f.case_id = e.case_id
      where e.case_id = p_case_id
        and knowledge.can_access_domain(f.domain)
    ), '[]'::jsonb),
    'formalImpact', 'none'
  );
end;
$$;

-- Storage policies cannot depend on direct SELECT privileges in casework.
-- The helper parses the case folder, checks an active session, and fails
-- closed for malformed paths.
create or replace function casework.can_access_case_document(
  p_object_name text,
  p_write boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_case_id uuid;
  v_folder text;
begin
  v_folder := (storage.foldername(p_object_name))[1];
  if v_folder is null then
    return false;
  end if;

  begin
    v_case_id := v_folder::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  if p_write then
    return casework.has_case_role(
      v_case_id,
      array['owner', 'pro', 'pcm']::knowledge.case_role[]
    );
  end if;
  return casework.is_case_member(v_case_id);
end;
$$;

alter policy knowledge_source_reviewer_read
on storage.objects
using (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

alter policy knowledge_source_reviewer_insert
on storage.objects
with check (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

alter policy case_document_member_read
on storage.objects
using (
  bucket_id = 'case-documents-private'
  and casework.can_access_case_document(name, false)
);

alter policy case_document_member_insert
on storage.objects
with check (
  bucket_id = 'case-documents-private'
  and casework.can_access_case_document(name, true)
);

-- Restrictive guards are AND-combined with every permissive policy on the
-- shared Storage table. They prevent a legacy broad policy from exposing or
-- mutating either A5 private bucket.
create policy a5_storage_read_guard
on storage.objects
as restrictive
for select to public
using (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, false)
  )
);

create policy a5_storage_insert_guard
on storage.objects
as restrictive
for insert to public
with check (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
);

create policy a5_storage_update_guard
on storage.objects
as restrictive
for update to public
using (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
)
with check (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
);

create policy a5_storage_delete_guard
on storage.objects
as restrictive
for delete to public
using (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
);

-- Internal functions are unavailable by default. Only the two helpers used by
-- Storage RLS are callable by authenticated users.
revoke execute on all functions in schema knowledge
from public, anon, authenticated;

revoke execute on all functions in schema knowledge_staging
from public, anon, authenticated;

revoke execute on all functions in schema casework
from public, anon, authenticated;

alter function knowledge.is_interactive_reviewer() owner to postgres;

alter function knowledge.is_interactive_reviewer() security definer;

alter function knowledge.is_interactive_reviewer() set search_path = '';

revoke all on function knowledge.is_interactive_reviewer()
from public, anon, authenticated;

grant execute on function knowledge.is_interactive_reviewer()
to authenticated;

alter function casework.can_access_case_document(text, boolean)
owner to postgres;

alter function casework.can_access_case_document(text, boolean)
security definer;

alter function casework.can_access_case_document(text, boolean)
set search_path = '';

revoke all on function casework.can_access_case_document(text, boolean)
from public, anon, authenticated;

grant execute on function casework.can_access_case_document(text, boolean)
to authenticated;

alter function knowledge.assert_studio_payload_complete(jsonb)
owner to postgres;

alter function knowledge.assert_studio_version_complete(uuid, uuid)
owner to postgres;

revoke all on function knowledge.assert_studio_payload_complete(jsonb)
from public, anon, authenticated;

revoke all on function knowledge.assert_studio_version_complete(uuid, uuid)
from public, anon, authenticated;

-- Every public A5 RPC is a reviewed authorization boundary. Each function
-- retains a fixed empty search_path and performs its own role/domain/case gate.
alter function public.gateway_search_knowledge(text, text, integer)
security definer;

alter function public.gateway_search_knowledge(text, text, integer)
set search_path = '';

alter function public.gateway_get_knowledge_entry(uuid)
security definer;

alter function public.gateway_get_knowledge_entry(uuid)
set search_path = '';

alter function public.gateway_get_case_evidence(uuid)
security definer;

alter function public.gateway_get_case_evidence(uuid)
set search_path = '';

alter function public.gateway_record_finding(uuid, jsonb)
security definer;

alter function public.gateway_record_finding(uuid, jsonb)
set search_path = '';

alter function public.knowledge_ingest_batch(jsonb)
security definer;

alter function public.knowledge_ingest_batch(jsonb)
set search_path = '';

alter function public.knowledge_ingest_woodwork_batch(jsonb)
security definer;

alter function public.knowledge_ingest_woodwork_batch(jsonb)
set search_path = '';

alter function public.knowledge_studio_list(text, text, integer)
security definer;

alter function public.knowledge_studio_list(text, text, integer)
set search_path = '';

alter function public.knowledge_studio_get(uuid)
security definer;

alter function public.knowledge_studio_get(uuid)
set search_path = '';

alter function public.knowledge_studio_create_draft(jsonb)
security definer;

alter function public.knowledge_studio_create_draft(jsonb)
set search_path = '';

alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
security definer;

alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
set search_path = '';

alter function public.knowledge_studio_create_revision(uuid, jsonb, text)
security definer;

alter function public.knowledge_studio_create_revision(uuid, jsonb, text)
set search_path = '';

alter function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
security definer;

alter function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
set search_path = '';

alter function public.knowledge_submit_for_review(uuid, uuid, text)
security definer;

alter function public.knowledge_submit_for_review(uuid, uuid, text)
set search_path = '';

alter function public.knowledge_return_to_draft(uuid, uuid, text)
security definer;

alter function public.knowledge_return_to_draft(uuid, uuid, text)
set search_path = '';

alter function public.knowledge_publish_entry_version(uuid, uuid, text)
security definer;

alter function public.knowledge_publish_entry_version(uuid, uuid, text)
set search_path = '';

alter function public.knowledge_retire_entry(uuid, text)
security definer;

alter function public.knowledge_retire_entry(uuid, text)
set search_path = '';

alter function public.gateway_search_knowledge(text, text, integer)
owner to postgres;

alter function public.gateway_get_knowledge_entry(uuid)
owner to postgres;

alter function public.gateway_get_case_evidence(uuid)
owner to postgres;

alter function public.gateway_record_finding(uuid, jsonb)
owner to postgres;

alter function public.knowledge_ingest_batch(jsonb)
owner to postgres;

alter function public.knowledge_ingest_woodwork_batch(jsonb)
owner to postgres;

alter function public.knowledge_studio_list(text, text, integer)
owner to postgres;

alter function public.knowledge_studio_get(uuid)
owner to postgres;

alter function public.knowledge_studio_create_draft(jsonb)
owner to postgres;

alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
owner to postgres;

alter function public.knowledge_studio_create_revision(uuid, jsonb, text)
owner to postgres;

alter function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
owner to postgres;

alter function public.knowledge_submit_for_review(uuid, uuid, text)
owner to postgres;

alter function public.knowledge_return_to_draft(uuid, uuid, text)
owner to postgres;

alter function public.knowledge_publish_entry_version(uuid, uuid, text)
owner to postgres;

alter function public.knowledge_retire_entry(uuid, text)
owner to postgres;

revoke all on function public.gateway_search_knowledge(text, text, integer)
from public, anon, authenticated;

revoke all on function public.gateway_get_knowledge_entry(uuid)
from public, anon, authenticated;

revoke all on function public.gateway_get_case_evidence(uuid)
from public, anon, authenticated;

revoke all on function public.gateway_record_finding(uuid, jsonb)
from public, anon, authenticated;

revoke all on function public.knowledge_ingest_batch(jsonb)
from public, anon, authenticated;

revoke all on function public.knowledge_ingest_woodwork_batch(jsonb)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_list(text, text, integer)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_get(uuid)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_create_draft(jsonb)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_create_revision(uuid, jsonb, text)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
from public, anon, authenticated;

revoke all on function public.knowledge_submit_for_review(uuid, uuid, text)
from public, anon, authenticated;

revoke all on function public.knowledge_return_to_draft(uuid, uuid, text)
from public, anon, authenticated;

revoke all on function public.knowledge_publish_entry_version(uuid, uuid, text)
from public, anon, authenticated;

revoke all on function public.knowledge_retire_entry(uuid, text)
from public, anon, authenticated;

grant execute on function public.gateway_search_knowledge(text, text, integer)
to authenticated;

grant execute on function public.gateway_get_knowledge_entry(uuid)
to authenticated;

grant execute on function public.gateway_get_case_evidence(uuid)
to authenticated;

grant execute on function public.gateway_record_finding(uuid, jsonb)
to authenticated;

grant execute on function public.knowledge_ingest_batch(jsonb)
to authenticated;

grant execute on function public.knowledge_ingest_woodwork_batch(jsonb)
to authenticated;

grant execute on function public.knowledge_studio_list(text, text, integer)
to authenticated;

grant execute on function public.knowledge_studio_get(uuid)
to authenticated;

grant execute on function public.knowledge_studio_create_draft(jsonb)
to authenticated;

grant execute on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
to authenticated;

grant execute on function public.knowledge_studio_create_revision(
  uuid,
  jsonb,
  text
)
to authenticated;

grant execute on function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
to authenticated;

grant execute on function public.knowledge_submit_for_review(uuid, uuid, text)
to authenticated;

grant execute on function public.knowledge_return_to_draft(uuid, uuid, text)
to authenticated;

grant execute on function public.knowledge_publish_entry_version(
  uuid,
  uuid,
  text
)
to authenticated;

grant execute on function public.knowledge_retire_entry(uuid, text)
to authenticated;

-- Source: 20260728050639_studio_traceability_a14_core_reconciliation.sql
-- SHA-256: d302a0ffec9b6d1d0f7044d52d2469ac08f43acc375be975049726e863759fd6
-- A5 additive reconciliation only. remote_applied=false.
-- A14 image attachment parent semantics remain pending A0/A14 confirmation;
-- this migration does not relax the existing PDF-only casework.documents rule.

create or replace function knowledge.resolve_studio_source_revision(
  p_current_source_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source jsonb;
  v_matches boolean;
begin
  v_source := p_payload -> 'source';
  if coalesce(jsonb_typeof(v_source), 'null') <> 'object' then
    raise exception 'Valid reviewer source payload required';
  end if;

  select
    s.source_type = v_source ->> 'source_type'
    and s.title = v_source ->> 'title'
    and s.source_location = v_source ->> 'source_locator'
    and coalesce(s.source_sha256, '') =
      coalesce(v_source ->> 'source_sha256', '')
    and s.provenance = coalesce(v_source -> 'provenance', '{}'::jsonb)
  into v_matches
  from knowledge.sources s
  where s.id = p_current_source_id;

  if v_matches then
    return p_current_source_id;
  end if;

  return knowledge.create_studio_source(p_payload -> 'source');
end;
$$;

create or replace function public.knowledge_studio_update_draft(
  p_entry_id uuid,
  p_version_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_domain knowledge.knowledge_domain;
  v_source_id uuid;
  v_next_source_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if coalesce(jsonb_typeof(p_payload), 'null') <> 'object'
    or p_payload ->> 'schema_version' <> 'knowledge_studio.v1'
    or coalesce(jsonb_typeof(p_payload -> 'content'), 'null') <> 'object'
    or coalesce(jsonb_typeof(p_payload -> 'evidence_summary'), 'null')
      <> 'array'
    or coalesce(jsonb_typeof(p_payload -> 'source'), 'null') <> 'object'
    or coalesce(jsonb_typeof(p_payload -> 'rule'), 'null') <> 'object'
    or length(trim(coalesce(p_payload ->> 'title', ''))) = 0 then
    raise exception 'Invalid Studio draft update';
  end if;

  select e.domain, ev.source_id
  into v_domain, v_source_id
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  where ev.id = p_version_id
    and ev.entry_id = p_entry_id
    and ev.lifecycle_state = 'draft'
  for update of ev;

  if v_source_id is null then
    raise exception 'Editable draft was not found';
  end if;

  v_next_source_id := knowledge.resolve_studio_source_revision(
    v_source_id,
    p_payload
  );

  update knowledge.entry_versions
  set source_id = v_next_source_id,
      title = p_payload ->> 'title',
      summary = coalesce(p_payload ->> 'summary', ''),
      content = p_payload -> 'content',
      evidence_summary = p_payload -> 'evidence_summary',
      change_note = coalesce(p_payload ->> 'change_note', '')
  where id = p_version_id;

  update knowledge.entries
  set title = p_payload ->> 'title',
      summary = coalesce(p_payload ->> 'summary', ''),
      updated_at = now()
  where id = p_entry_id;

  perform knowledge.update_typed_rule(
    p_version_id,
    v_domain,
    p_payload -> 'rule'
  );

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    p_entry_id,
    p_version_id,
    'draft_updated',
    auth.uid(),
    knowledge.current_app_role(),
    v_next_source_id,
    'draft',
    'draft',
    coalesce(p_payload ->> 'change_note', ''),
    'pcm'
  );

  return jsonb_build_object(
    'entryId', p_entry_id,
    'versionId', p_version_id,
    'sourceId', v_next_source_id,
    'lifecycleState', 'draft',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_studio_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := knowledge.current_app_role();
  v_display_name text;
  v_actor_label text;
begin
  if not knowledge.has_active_session()
    or not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select nullif(btrim(u.raw_app_meta_data ->> 'display_name'), '')
  into v_display_name
  from auth.users u
  where u.id = v_actor_id;

  if v_display_name is not null
    and v_display_name !~ '@'
    and v_display_name !~
      '^[0-9A-Fa-f]{8}-[0-9A-Fa-f-]{27}$' then
    v_actor_label := v_display_name;
  else
    v_actor_label := case
      when v_actor_role = 'admin' then 'ADM-'
      else 'PCM-'
    end || upper(substr(md5(v_actor_id::text), 1, 8));
  end if;

  return jsonb_build_object(
    'actorId', v_actor_id,
    'actorLabel', v_actor_label,
    'actorRole', v_actor_role,
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_studio_get(
  p_entry_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'entryState', e.lifecycle_state,
    'currentVersionId', e.current_version_id,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'versionId', ev.id,
        'version', ev.version_number,
        'title', ev.title,
        'summary', ev.summary,
        'lifecycleState', ev.lifecycle_state,
        'content', ev.content,
        'evidenceSummary', ev.evidence_summary,
        'changeNote', ev.change_note,
        'createdAt', ev.created_at,
        'submittedAt', ev.submitted_at,
        'publishedAt', ev.published_at,
        'source', jsonb_build_object(
          'sourceId', s.id,
          'sourceType', s.source_type,
          'title', s.title,
          'locator', s.source_location,
          'sha256', s.source_sha256,
          'lifecycleState', s.lifecycle_state,
          'provenance', s.provenance
        ),
        'rule', knowledge.approved_rule_payload(ev.id, e.domain),
        'formalImpact', 'none'
      ) order by ev.version_number desc)
      from knowledge.entry_versions ev
      join knowledge.sources s on s.id = ev.source_id
      where ev.entry_id = e.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', pe.id,
        'eventType', pe.event_type,
        'versionId', pe.version_id,
        'sourceId', pe.source_id,
        'sourceDocument', event_source.source_location,
        'actorId', pe.actor_id,
        'actorLabel', case
          when nullif(
            btrim(au.raw_app_meta_data ->> 'display_name'),
            ''
          ) is not null
            and au.raw_app_meta_data ->> 'display_name' !~ '@'
            and au.raw_app_meta_data ->> 'display_name' !~
              '^[0-9A-Fa-f]{8}-[0-9A-Fa-f-]{27}$'
          then btrim(au.raw_app_meta_data ->> 'display_name')
          else case
            when pe.actor_role = 'admin' then 'ADM-'
            when pe.actor_role = 'pcm' then 'PCM-'
            else 'USR-'
          end || upper(substr(md5(pe.actor_id::text), 1, 8))
        end,
        'actorRole', pe.actor_role,
        'beforeState', pe.before_state,
        'afterState', pe.after_state,
        'note', pe.event_note,
        'nextOwnerRole', pe.next_owner_role,
        'nextAction', pe.next_action,
        'occurredAt', pe.occurred_at,
        'formalImpact', 'none'
      ) order by pe.occurred_at, pe.id)
      from knowledge.publication_events pe
      left join auth.users au on au.id = pe.actor_id
      join knowledge.sources event_source on event_source.id = pe.source_id
      where pe.entry_id = e.id
    ), '[]'::jsonb),
    'formalImpact', 'none'
  )
  into v_result
  from knowledge.entries e
  where e.id = p_entry_id;

  if v_result is null then
    raise exception 'Knowledge entry was not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.gateway_get_knowledge_entry(
  p_entry_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'versionId', ev.id,
    'version', ev.version_number,
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'location', s.source_location,
      'sha256', s.source_sha256
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join knowledge.entry_versions ev on ev.id = e.current_version_id
  join knowledge.sources s on s.id = ev.source_id
  where e.id = p_entry_id
    and knowledge.can_access_domain(e.domain)
    and e.lifecycle_state = 'approved'
    and ev.lifecycle_state = 'approved'
    and s.lifecycle_state = 'approved'
    and knowledge.approved_rule_payload(ev.id, e.domain) is not null;
$$;

create table if not exists casework.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null
    references casework.documents(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  storage_object_path text not null check (
    length(storage_object_path) between 1 and 2048
    and storage_object_path !~ '[[:cntrl:]]'
  ),
  sha256 text not null check (sha256 ~ '^[A-Fa-f0-9]{64}$'),
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  size_bytes bigint not null check (size_bytes >= 0),
  revision_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(revision_metadata) = 'object'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  formal_impact text not null default 'none' check (formal_impact = 'none'),
  unique (document_id, version_number),
  unique (document_id, sha256, storage_object_path)
);

create table if not exists casework.case_member_workstreams (
  case_id uuid not null,
  user_id uuid not null,
  workstream_type text not null
    check (workstream_type in ('design', 'construction')),
  granted_by uuid not null default auth.uid(),
  granted_at timestamptz not null default now(),
  primary key (case_id, user_id, workstream_type),
  foreign key (case_id, user_id)
    references casework.case_members(case_id, user_id)
    on delete cascade
);

do $$
begin
  if not (
    select count(*) = 11
      and bool_and(
        case column_name
          when 'id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'document_id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'version_number'
            then data_type = 'integer' and is_nullable = 'NO'
          when 'storage_object_path'
            then data_type = 'text' and is_nullable = 'NO'
          when 'sha256' then data_type = 'text' and is_nullable = 'NO'
          when 'mime_type' then data_type = 'text' and is_nullable = 'NO'
          when 'size_bytes' then data_type = 'bigint' and is_nullable = 'NO'
          when 'revision_metadata'
            then data_type = 'jsonb' and is_nullable = 'NO'
          when 'created_by' then data_type = 'uuid' and is_nullable = 'NO'
          when 'created_at'
            then data_type = 'timestamp with time zone'
              and is_nullable = 'NO'
          when 'formal_impact'
            then data_type = 'text' and is_nullable = 'NO'
          else false
        end
      )
    from information_schema.columns
    where table_schema = 'casework'
      and table_name = 'document_versions'
  ) then
    raise exception
      'Incompatible casework.document_versions column contract collision';
  end if;
  if not (
    select count(*) = 11
      and bool_and(
        case conname
          when 'document_versions_pkey' then contype = 'p'
          when 'document_versions_document_id_fkey' then contype = 'f'
          when 'document_versions_document_id_version_number_key'
            then contype = 'u'
          when 'document_versions_document_id_sha256_storage_object_path_key'
            then contype = 'u'
          when 'document_versions_version_number_check' then contype = 'c'
          when 'document_versions_storage_object_path_check' then contype = 'c'
          when 'document_versions_sha256_check' then contype = 'c'
          when 'document_versions_mime_type_check' then contype = 'c'
          when 'document_versions_size_bytes_check' then contype = 'c'
          when 'document_versions_revision_metadata_check' then contype = 'c'
          when 'document_versions_formal_impact_check' then contype = 'c'
          else false
        end
      )
    from pg_constraint
    where conrelid = 'casework.document_versions'::regclass
      and contype <> 'n'
  ) then
    raise exception
      'Incompatible casework.document_versions constraint contract collision: %',
      (
        select string_agg(
          conname || ':' || contype::text,
          ',' order by conname
        )
        from pg_constraint
        where conrelid = 'casework.document_versions'::regclass
          and contype <> 'n'
      );
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'casework.document_versions'::regclass
      and conname = 'document_versions_document_id_fkey'
      and confrelid = 'casework.documents'::regclass
      and confdeltype = 'r'
  ) then
    raise exception
      'Incompatible casework.document_versions foreign key collision';
  end if;
  if not (
    select count(*) = 5
      and bool_and(
        case column_name
          when 'case_id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'user_id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'workstream_type'
            then data_type = 'text' and is_nullable = 'NO'
          when 'granted_by' then data_type = 'uuid' and is_nullable = 'NO'
          when 'granted_at'
            then data_type = 'timestamp with time zone'
              and is_nullable = 'NO'
          else false
        end
      )
    from information_schema.columns
    where table_schema = 'casework'
      and table_name = 'case_member_workstreams'
  ) then
    raise exception
      'Incompatible casework.case_member_workstreams column contract collision';
  end if;
  if not (
    select count(*) = 3
      and bool_and(
        case conname
          when 'case_member_workstreams_pkey' then contype = 'p'
          when 'case_member_workstreams_case_id_user_id_fkey'
            then contype = 'f'
          when 'case_member_workstreams_workstream_type_check'
            then contype = 'c'
          else false
        end
      )
    from pg_constraint
    where conrelid = 'casework.case_member_workstreams'::regclass
      and contype <> 'n'
  ) then
    raise exception
      'Incompatible casework.case_member_workstreams constraint collision: %',
      (
        select string_agg(
          conname || ':' || contype::text,
          ',' order by conname
        )
        from pg_constraint
        where conrelid = 'casework.case_member_workstreams'::regclass
          and contype <> 'n'
      );
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'casework.case_member_workstreams'::regclass
      and conname = 'case_member_workstreams_case_id_user_id_fkey'
      and confrelid = 'casework.case_members'::regclass
      and confdeltype = 'c'
  ) then
    raise exception
      'Incompatible casework.case_member_workstreams foreign key collision';
  end if;
end;
$$;

create index if not exists document_versions_document_created_idx
  on casework.document_versions(document_id, created_at desc);

create index if not exists document_versions_sha256_idx
  on casework.document_versions(sha256);

create index if not exists case_member_workstreams_user_idx
  on casework.case_member_workstreams(user_id, workstream_type, case_id);

create index if not exists case_member_workstreams_case_idx
  on casework.case_member_workstreams(case_id, workstream_type, user_id);

create or replace function casework.guard_document_versions_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Document versions are append-only';
end;
$$;

drop trigger if exists guard_document_versions_immutable
on casework.document_versions;

create trigger guard_document_versions_immutable
before update or delete on casework.document_versions
for each row execute function casework.guard_document_versions_immutable();

create or replace function casework.has_current_case_workstream(
  p_case_id uuid,
  p_workstream_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and p_workstream_type in ('design', 'construction')
    and exists (
      select 1
      from casework.case_members m
      join casework.case_member_workstreams w
        on w.case_id = m.case_id
       and w.user_id = m.user_id
      where m.case_id = p_case_id
        and m.user_id = auth.uid()
        and w.workstream_type = p_workstream_type
    );
$$;

alter table casework.document_versions enable row level security;

alter table casework.case_member_workstreams enable row level security;

drop policy if exists document_versions_member_read
on casework.document_versions;

create policy document_versions_member_read
on casework.document_versions
for select to authenticated
using (
  exists (
    select 1
    from casework.documents d
    where d.id = document_id
      and casework.is_case_member(d.case_id)
  )
);

drop policy if exists document_versions_workstream_insert
on casework.document_versions;

create policy document_versions_workstream_insert
on casework.document_versions
for insert to authenticated
with check (
  knowledge.current_app_role() in ('pcm', 'admin')
  and exists (
    select 1
    from casework.documents d
    where d.id = document_id
      and (
        casework.has_current_case_workstream(d.case_id, 'design')
        or casework.has_current_case_workstream(d.case_id, 'construction')
      )
  )
);

drop policy if exists case_member_workstreams_member_read
on casework.case_member_workstreams;

create policy case_member_workstreams_member_read
on casework.case_member_workstreams
for select to authenticated
using (casework.is_case_member(case_id));

drop policy if exists case_member_workstreams_reviewer_manage
on casework.case_member_workstreams;

create policy case_member_workstreams_reviewer_manage
on casework.case_member_workstreams
for all to authenticated
using (
  casework.has_case_role(
    case_id,
    array['pcm'::knowledge.case_role, 'admin'::knowledge.case_role]
  )
)
with check (
  casework.has_case_role(
    case_id,
    array['pcm'::knowledge.case_role, 'admin'::knowledge.case_role]
  )
);

revoke all privileges on casework.document_versions
from public, anon, authenticated;

revoke all privileges on casework.case_member_workstreams
from public, anon, authenticated;

alter function knowledge.resolve_studio_source_revision(uuid, jsonb)
owner to postgres;

alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
owner to postgres;

alter function public.knowledge_studio_session_context()
owner to postgres;

alter function public.knowledge_studio_get(uuid)
owner to postgres;

alter function public.gateway_get_knowledge_entry(uuid)
owner to postgres;

alter function casework.guard_document_versions_immutable()
owner to postgres;

alter function casework.has_current_case_workstream(uuid, text)
owner to postgres;

revoke all on function knowledge.resolve_studio_source_revision(uuid, jsonb)
from public, anon, authenticated;

revoke all on function casework.guard_document_versions_immutable()
from public, anon, authenticated;

revoke all on function casework.has_current_case_workstream(uuid, text)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_session_context()
from public, anon, authenticated;

revoke all on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
from public, anon, authenticated;

revoke all on function public.knowledge_studio_get(uuid)
from public, anon, authenticated;

revoke all on function public.gateway_get_knowledge_entry(uuid)
from public, anon, authenticated;

grant execute on function casework.has_current_case_workstream(uuid, text)
to authenticated;

grant execute on function public.knowledge_studio_session_context()
to authenticated;

grant execute on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
to authenticated;

grant execute on function public.knowledge_studio_get(uuid)
to authenticated;

grant execute on function public.gateway_get_knowledge_entry(uuid)
to authenticated;

comment on schema knowledge is 'a5.knowledge_foundation.core_readiness.v1;target=zdwuyomhswjcbbpbhpcq';

commit;
