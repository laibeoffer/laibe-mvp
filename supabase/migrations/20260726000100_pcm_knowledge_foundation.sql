begin;

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

commit;
