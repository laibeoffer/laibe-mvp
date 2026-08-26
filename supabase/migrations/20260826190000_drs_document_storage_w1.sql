begin;

create table casework.documents (
  id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  document_ref text not null unique
    check (document_ref ~ '^doc_[0-9a-z]{20,40}$'),
  document_kind text not null check (
    document_kind in (
      'drawing', 'quote', 'contract', 'photo', 'drs_review',
      'other_case_evidence'
    )
  ),
  visibility text not null check (
    visibility in ('PARTY_VISIBLE', 'DRS_INTERNAL', 'REVIEWER_VISIBLE')
  ),
  source_role text not null check (
    source_role in ('OWNER', 'VENDOR', 'DRS', 'HIGHEST_REVIEWER')
  ),
  document_status text not null default 'DRAFT'
    check (document_status in ('DRAFT', 'ACTIVE', 'WITHDRAWN')),
  current_version_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  updated_at timestamptz not null default clock_timestamp()
    check (isfinite(updated_at)),
  unique (case_id, id),
  unique (case_id, document_ref)
);

create table casework.document_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null,
  document_id uuid not null,
  version_ref text not null unique
    check (version_ref ~ '^dvr_[0-9a-z]{20,40}$'),
  version_no bigint not null check (version_no >= 1),
  previous_version_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  detected_mime text not null check (
    detected_mime in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  validation_state text not null check (validation_state = 'FORMAL'),
  lifecycle_state text not null default 'ACTIVE'
    check (lifecycle_state in ('ACTIVE', 'WITHDRAWN', 'SUPERSEDED')),
  idempotency_key text not null
    check (length(idempotency_key) between 16 and 128)
    check (idempotency_key !~ '[[:space:][:cntrl:]]'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  unique (document_id, version_no),
  unique (case_id, document_id, id),
  unique (case_id, document_id, version_ref),
  foreign key (case_id, document_id)
    references casework.documents(case_id, id) on delete restrict,
  foreign key (case_id, document_id, previous_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

alter table casework.documents
  add constraint documents_current_version_same_case_document_fk
  foreign key (case_id, id, current_version_id)
  references casework.document_versions(case_id, document_id, id)
  on delete restrict
  deferrable initially deferred;

create table casework.document_version_sources (
  case_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  bucket_id text not null check (bucket_id = 'drs-case-records-private'),
  object_key text not null check (
    object_key ~ '^cases/[0-9a-f-]{36}/documents/[0-9a-f-]{36}/versions/[0-9a-f-]{36}/source\.(pdf|jpg|jpeg|png)$'
  ),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  detected_mime text not null check (
    detected_mime in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  validation_state text not null check (validation_state = 'CLEAN'),
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  primary key (case_id, document_id, version_id),
  unique (bucket_id, object_key),
  foreign key (case_id, document_id, version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

create table casework.document_artifacts (
  artifact_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  artifact_kind text not null check (
    artifact_kind in ('PREVIEW', 'THUMBNAIL', 'OCR', 'EXPORT')
  ),
  bucket_id text not null check (bucket_id = 'drs-case-records-private'),
  object_key text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint not null check (size_bytes >= 1),
  detected_mime text not null,
  validation_state text not null check (validation_state = 'CLEAN'),
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  check (artifact_kind <> 'SOURCE'),
  unique (bucket_id, object_key),
  foreign key (case_id, document_id, version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

create table casework.document_upload_intents (
  intent_id uuid primary key,
  intent_ref text not null unique
    check (intent_ref ~ '^int_[0-9a-z]{20,40}$'),
  case_id uuid not null,
  document_id uuid not null,
  planned_version_id uuid not null unique,
  planned_version_ref text not null unique
    check (planned_version_ref ~ '^dvr_[0-9a-z]{20,40}$'),
  mode text not null check (mode in ('NEW_DOCUMENT', 'NEW_VERSION')),
  document_kind text not null check (document_kind = 'drs_review'),
  original_filename text not null
    check (original_filename = btrim(original_filename))
    check (length(original_filename) between 1 and 240)
    check (original_filename !~ '[/\\[:cntrl:]]'),
  declared_mime text not null check (
    declared_mime in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  declared_size_bytes bigint not null
    check (declared_size_bytes between 1 and 26214400),
  declared_sha256 text not null check (declared_sha256 ~ '^[a-f0-9]{64}$'),
  intake_bucket text not null check (intake_bucket = 'drs-case-intake-private'),
  intake_object_key text not null unique check (
    intake_object_key ~ '^intents/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$'
  ),
  records_bucket text not null check (records_bucket = 'drs-case-records-private'),
  records_object_key text not null unique check (
    records_object_key ~ '^cases/[0-9a-f-]{36}/documents/[0-9a-f-]{36}/versions/[0-9a-f-]{36}/source\.(pdf|jpg|jpeg|png)$'
  ),
  intent_state text not null default 'INTENT_CREATED' check (
    intent_state in (
      'INTENT_CREATED', 'VALIDATION_PENDING', 'FORMALIZED', 'EXPIRED',
      'QUARANTINED'
    )
  ),
  expected_payload_sha256 text not null
    check (expected_payload_sha256 ~ '^[a-f0-9]{64}$'),
  finalize_idempotency_key text
    check (
      finalize_idempotency_key is null
      or (
        length(finalize_idempotency_key) between 16 and 128
        and finalize_idempotency_key !~ '[[:space:][:cntrl:]]'
      )
    ),
  finalize_request_payload_sha256 text
    check (
      finalize_request_payload_sha256 is null
      or finalize_request_payload_sha256 ~ '^[a-f0-9]{64}$'
    ),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  expires_at timestamptz not null check (isfinite(expires_at)),
  finalized_at timestamptz check (finalized_at is null or isfinite(finalized_at)),
  unique (case_id, intent_id),
  unique (case_id, document_id, intent_id),
  foreign key (case_id, document_id)
    references casework.documents(case_id, id) on delete restrict,
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '15 minutes'),
  check (
    (finalize_idempotency_key is null and finalize_request_payload_sha256 is null)
    or (
      finalize_idempotency_key is not null
      and finalize_request_payload_sha256 is not null
    )
  ),
  check (
    (intent_state = 'FORMALIZED' and finalized_at is not null)
    or (intent_state <> 'FORMALIZED' and finalized_at is null)
  )
);

create table casework.evidence_references (
  evidence_reference_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null,
  document_id uuid not null,
  document_version_id uuid not null,
  locator jsonb not null,
  revalidation_required boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  foreign key (case_id, document_id, document_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

create table casework.submission_snapshots (
  id uuid primary key default extensions.gen_random_uuid(),
  snapshot_ref text not null unique
    check (snapshot_ref ~ '^snp_[0-9a-z]{20,40}$'),
  case_id uuid not null references casework.cases(id) on delete restrict,
  purpose text not null check (
    purpose in ('REVIEW_SUBMISSION', 'DECISION_BASIS', 'FORMAL_RECEIPT')
  ),
  canonical_payload_sha256 text not null
    check (canonical_payload_sha256 ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null
    check (length(idempotency_key) between 16 and 128)
    check (idempotency_key !~ '[[:space:][:cntrl:]]'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  unique (case_id, id),
  unique (created_by, idempotency_key)
);

create table casework.document_snapshot_items (
  case_id uuid not null,
  snapshot_id uuid not null,
  document_id uuid not null,
  document_version_id uuid not null,
  ordinal integer not null check (ordinal between 1 and 10),
  primary key (case_id, snapshot_id, document_version_id),
  unique (case_id, snapshot_id, ordinal),
  foreign key (case_id, snapshot_id)
    references casework.submission_snapshots(case_id, id) on delete restrict,
  foreign key (case_id, document_id, document_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict
);

create table casework.document_operation_receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  receipt_ref text not null unique
    check (receipt_ref ~ '^rcp_[0-9a-z]{20,40}$'),
  case_id uuid not null references casework.cases(id) on delete restrict,
  operation text not null check (
    operation in ('FINALIZE_UPLOAD', 'CREATE_SNAPSHOT')
  ),
  receipt_state text not null check (
    receipt_state in ('FORMAL_VERSION_CREATED', 'SNAPSHOT_RECORDED')
  ),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null
    check (length(idempotency_key) between 16 and 128)
    check (idempotency_key !~ '[[:space:][:cntrl:]]'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  document_id uuid,
  document_version_id uuid,
  snapshot_id uuid,
  recorded_at timestamptz not null default clock_timestamp()
    check (isfinite(recorded_at)),
  unique (case_id, id),
  unique (actor_user_id, operation, idempotency_key),
  foreign key (case_id, document_id, document_version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict,
  foreign key (case_id, snapshot_id)
    references casework.submission_snapshots(case_id, id) on delete restrict
);

create table casework.document_orphan_cleanup_work_items (
  work_item_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null,
  document_id uuid not null,
  upload_intent_id uuid not null,
  records_bucket text not null check (records_bucket = 'drs-case-records-private'),
  records_object_key text not null,
  expected_payload_sha256 text not null
    check (expected_payload_sha256 ~ '^[a-f0-9]{64}$'),
  cleanup_state text not null default 'PENDING'
    check (cleanup_state in ('PENDING', 'CLAIMED', 'FAILED')),
  queued_by uuid not null references auth.users(id) on delete restrict,
  queued_at timestamptz not null default clock_timestamp()
    check (isfinite(queued_at)),
  last_error_code text,
  unique (records_bucket, records_object_key),
  unique (case_id, work_item_id),
  foreign key (case_id, document_id, upload_intent_id)
    references casework.document_upload_intents(case_id, document_id, intent_id)
    on delete restrict
);

create index documents_case_id_idx on casework.documents(case_id);
create index documents_created_by_idx on casework.documents(created_by);
create index documents_current_version_idx
  on casework.documents(current_version_id) where current_version_id is not null;
create index document_versions_case_document_idx
  on casework.document_versions(case_id, document_id, version_no);
create index document_versions_created_by_idx
  on casework.document_versions(created_by);
create index document_versions_previous_idx
  on casework.document_versions(previous_version_id)
  where previous_version_id is not null;
create index document_version_sources_version_idx
  on casework.document_version_sources(version_id);
create index document_artifacts_version_idx
  on casework.document_artifacts(case_id, document_id, version_id);
create index document_upload_intents_current_idx
  on casework.document_upload_intents(case_id, created_by, expires_at)
  where intent_state in ('INTENT_CREATED', 'VALIDATION_PENDING');
create index document_upload_intents_document_idx
  on casework.document_upload_intents(document_id);
create index evidence_references_version_idx
  on casework.evidence_references(case_id, document_id, document_version_id);
create index evidence_references_created_by_idx
  on casework.evidence_references(created_by);
create index submission_snapshots_case_idx
  on casework.submission_snapshots(case_id, created_at);
create index document_snapshot_items_version_idx
  on casework.document_snapshot_items(case_id, document_id, document_version_id);
create index document_operation_receipts_version_idx
  on casework.document_operation_receipts(case_id, document_id, document_version_id)
  where document_version_id is not null;
create index document_operation_receipts_snapshot_idx
  on casework.document_operation_receipts(case_id, snapshot_id)
  where snapshot_id is not null;
create index document_orphan_cleanup_pending_idx
  on casework.document_orphan_cleanup_work_items(case_id, queued_at)
  where cleanup_state = 'PENDING';
create index document_orphan_cleanup_intent_idx
  on casework.document_orphan_cleanup_work_items(
    case_id, document_id, upload_intent_id
  );

alter table casework.documents enable row level security;
alter table casework.documents force row level security;
alter table casework.document_versions enable row level security;
alter table casework.document_versions force row level security;
alter table casework.document_version_sources enable row level security;
alter table casework.document_version_sources force row level security;
alter table casework.document_artifacts enable row level security;
alter table casework.document_artifacts force row level security;
alter table casework.document_upload_intents enable row level security;
alter table casework.document_upload_intents force row level security;
alter table casework.evidence_references enable row level security;
alter table casework.evidence_references force row level security;
alter table casework.submission_snapshots enable row level security;
alter table casework.submission_snapshots force row level security;
alter table casework.document_snapshot_items enable row level security;
alter table casework.document_snapshot_items force row level security;
alter table casework.document_operation_receipts enable row level security;
alter table casework.document_operation_receipts force row level security;
alter table casework.document_orphan_cleanup_work_items enable row level security;
alter table casework.document_orphan_cleanup_work_items force row level security;

revoke all on table casework.documents from public, anon, authenticated, service_role;
revoke all on table casework.document_versions from public, anon, authenticated, service_role;
revoke all on table casework.document_version_sources from public, anon, authenticated, service_role;
revoke all on table casework.document_artifacts from public, anon, authenticated, service_role;
revoke all on table casework.document_upload_intents from public, anon, authenticated, service_role;
revoke all on table casework.evidence_references from public, anon, authenticated, service_role;
revoke all on table casework.submission_snapshots from public, anon, authenticated, service_role;
revoke all on table casework.document_snapshot_items from public, anon, authenticated, service_role;
revoke all on table casework.document_operation_receipts from public, anon, authenticated, service_role;
revoke all on table casework.document_orphan_cleanup_work_items from public, anon, authenticated, service_role;

create or replace function casework.document_storage_object_matches_v1(
  p_bucket_id text,
  p_object_key text,
  p_operation text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_operation
    when 'INTAKE_WRITE' then p_bucket_id = 'drs-case-intake-private'
      and exists (
        select 1
        from casework.document_upload_intents i
        where i.intake_bucket = p_bucket_id
          and i.intake_object_key = p_object_key
          and i.intent_state = 'INTENT_CREATED'
          and i.expires_at > statement_timestamp()
      )
    when 'INTAKE_READ' then p_bucket_id = 'drs-case-intake-private'
      and exists (
        select 1
        from casework.document_upload_intents i
        where i.intake_bucket = p_bucket_id
          and i.intake_object_key = p_object_key
          and i.intent_state in ('INTENT_CREATED', 'VALIDATION_PENDING')
          and i.expires_at > statement_timestamp()
      )
    when 'RECORDS_WRITE' then p_bucket_id = 'drs-case-records-private'
      and exists (
        select 1
        from casework.document_upload_intents i
        where i.records_bucket = p_bucket_id
          and i.records_object_key = p_object_key
          and i.intent_state = 'VALIDATION_PENDING'
      )
    when 'RECORDS_READ' then p_bucket_id = 'drs-case-records-private'
      and (
        exists (
          select 1
          from casework.document_version_sources s
          where s.bucket_id = p_bucket_id
            and s.object_key = p_object_key
            and s.validation_state = 'CLEAN'
        )
        or exists (
          select 1
          from casework.document_artifacts a
          where a.bucket_id = p_bucket_id
            and a.object_key = p_object_key
            and a.validation_state = 'CLEAN'
        )
        or exists (
          select 1
          from casework.document_upload_intents i
          where i.records_bucket = p_bucket_id
            and i.records_object_key = p_object_key
            and i.intent_state = 'VALIDATION_PENDING'
        )
      )
    else false
  end;
$$;

alter function casework.document_storage_object_matches_v1(text, text, text)
  owner to postgres;
revoke all on function casework.document_storage_object_matches_v1(
  text, text, text
) from public, anon, authenticated, service_role;
grant execute on function casework.document_storage_object_matches_v1(
  text, text, text
) to service_role;

-- Native signed upload verifies its capability and then bypasses Storage object RLS.
-- Service-role BFF operations also bypass RLS. Product authority therefore remains
-- the Mode A intent/grant chain and finalize recheck. These four policies make
-- direct browser roles explicitly fail closed; the helper remains a service-only
-- invariant check for exact server-owned bucket/key metadata.
create policy drs_document_intake_insert
  on storage.objects
  as restrictive
  for insert
  to anon, authenticated
  with check (false);
create policy drs_document_intake_select
  on storage.objects
  as restrictive
  for select
  to anon, authenticated
  using (false);
create policy drs_document_records_insert
  on storage.objects
  as restrictive
  for insert
  to anon, authenticated
  with check (false);
create policy drs_document_records_select
  on storage.objects
  as restrictive
  for select
  to anon, authenticated
  using (false);

create or replace function casework.document_append_only_enforce_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'DOCUMENT_APPEND_ONLY';
end;
$$;

alter function casework.document_append_only_enforce_v1() owner to postgres;
revoke all on function casework.document_append_only_enforce_v1()
  from public, anon, authenticated, service_role;

create trigger document_versions_append_only
before update or delete on casework.document_versions
for each row execute function casework.document_append_only_enforce_v1();
create trigger document_version_sources_append_only
before update or delete on casework.document_version_sources
for each row execute function casework.document_append_only_enforce_v1();
create trigger document_artifacts_append_only
before update or delete on casework.document_artifacts
for each row execute function casework.document_append_only_enforce_v1();
create trigger evidence_references_append_only
before update or delete on casework.evidence_references
for each row execute function casework.document_append_only_enforce_v1();
create trigger submission_snapshots_append_only
before update or delete on casework.submission_snapshots
for each row execute function casework.document_append_only_enforce_v1();
create trigger document_snapshot_items_append_only
before update or delete on casework.document_snapshot_items
for each row execute function casework.document_append_only_enforce_v1();
create trigger document_operation_receipts_append_only
before update or delete on casework.document_operation_receipts
for each row execute function casework.document_append_only_enforce_v1();

create or replace function casework.document_formal_source_count_enforce_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_version_id uuid;
  v_state text;
  v_source_count bigint;
begin
  v_version_id := coalesce(
    nullif(v_row ->> 'version_id', '')::uuid,
    nullif(v_row ->> 'id', '')::uuid
  );
  select v.validation_state
  into v_state
  from casework.document_versions v
  where v.id = v_version_id;
  if not found then return null; end if;
  select count(*)
  into v_source_count
  from casework.document_version_sources s
  where s.version_id = v_version_id;
  if v_state = 'FORMAL' and v_source_count <> 1 then
    raise exception 'FORMAL_VERSION_SOURCE_COUNT_INVALID';
  end if;
  return null;
end;
$$;

alter function casework.document_formal_source_count_enforce_v1()
  owner to postgres;
revoke all on function casework.document_formal_source_count_enforce_v1()
  from public, anon, authenticated, service_role;

create constraint trigger document_formal_source_count
after insert or update on casework.document_versions
deferrable initially deferred
for each row execute function casework.document_formal_source_count_enforce_v1();
create constraint trigger document_formal_source_count_from_source
after insert or update or delete on casework.document_version_sources
deferrable initially deferred
for each row execute function casework.document_formal_source_count_enforce_v1();

alter table casework.case_events
  drop constraint if exists case_events_event_type_check;
alter table casework.case_events
  add constraint case_events_event_type_check check (
    event_type in (
      'CASE_CREATED',
      'HIGHEST_REVIEWER_GRANTED',
      'HIGHEST_REVIEWER_REVOKED',
      'DOCUMENT_UPLOAD_INTENT_CREATED',
      'DOCUMENT_VERSION_FORMALIZED',
      'DOCUMENT_SNAPSHOT_RECORDED',
      'DOCUMENT_DOWNLOAD_ACCESSED',
      'DOCUMENT_WITHDRAWN',
      'DOCUMENT_ORPHAN_CLEANUP_QUEUED'
    )
  );
alter table casework.case_events add column document_id uuid;
alter table casework.case_events add column document_version_id uuid;
alter table casework.case_events add column snapshot_id uuid;
alter table casework.case_events add column receipt_id uuid;
alter table casework.case_events add column upload_intent_id uuid;
alter table casework.case_events add column orphan_cleanup_work_item_id uuid;
alter table casework.case_events
  add constraint case_events_document_fk
  foreign key (case_id, document_id)
  references casework.documents(case_id, id) on delete restrict;
alter table casework.case_events
  add constraint case_events_document_version_fk
  foreign key (case_id, document_id, document_version_id)
  references casework.document_versions(case_id, document_id, id)
  on delete restrict;
alter table casework.case_events
  add constraint case_events_snapshot_fk
  foreign key (case_id, snapshot_id)
  references casework.submission_snapshots(case_id, id) on delete restrict;
alter table casework.case_events
  add constraint case_events_receipt_fk
  foreign key (case_id, receipt_id)
  references casework.document_operation_receipts(case_id, id)
  on delete restrict;
alter table casework.case_events
  add constraint case_events_upload_intent_fk
  foreign key (case_id, document_id, upload_intent_id)
  references casework.document_upload_intents(case_id, document_id, intent_id)
  on delete restrict;
alter table casework.case_events
  add constraint case_events_orphan_cleanup_work_item_fk
  foreign key (case_id, orphan_cleanup_work_item_id)
  references casework.document_orphan_cleanup_work_items(case_id, work_item_id)
  on delete restrict;
create index case_events_document_idx
  on casework.case_events(case_id, document_id)
  where document_id is not null;
create index case_events_document_version_idx
  on casework.case_events(case_id, document_id, document_version_id)
  where document_version_id is not null;
create index case_events_snapshot_idx
  on casework.case_events(case_id, snapshot_id)
  where snapshot_id is not null;
create index case_events_receipt_idx
  on casework.case_events(case_id, receipt_id)
  where receipt_id is not null;
create index case_events_upload_intent_idx
  on casework.case_events(case_id, document_id, upload_intent_id)
  where upload_intent_id is not null;
create index case_events_orphan_cleanup_work_item_idx
  on casework.case_events(case_id, orphan_cleanup_work_item_id)
  where orphan_cleanup_work_item_id is not null;

create or replace function casework.case_event_document_refs_same_case_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type in (
    'CASE_CREATED', 'HIGHEST_REVIEWER_GRANTED', 'HIGHEST_REVIEWER_REVOKED'
  ) and (
    new.document_id is not null or new.document_version_id is not null
    or new.snapshot_id is not null or new.receipt_id is not null
    or new.upload_intent_id is not null
    or new.orphan_cleanup_work_item_id is not null
  ) then raise exception 'CASE_EVENT_DOCUMENT_REFS_INVALID'; end if;
  if new.event_type = 'DOCUMENT_UPLOAD_INTENT_CREATED' and (
    new.document_id is null or new.upload_intent_id is null
    or new.document_version_id is not null or new.snapshot_id is not null
    or new.receipt_id is not null
    or new.orphan_cleanup_work_item_id is not null
  ) then raise exception 'CASE_EVENT_DOCUMENT_REFS_INVALID'; end if;
  if new.event_type in (
    'DOCUMENT_VERSION_FORMALIZED', 'DOCUMENT_DOWNLOAD_ACCESSED',
    'DOCUMENT_WITHDRAWN'
  ) and (
    new.document_id is null or new.document_version_id is null
    or new.snapshot_id is not null or new.upload_intent_id is not null
    or new.orphan_cleanup_work_item_id is not null
    or (
      new.event_type = 'DOCUMENT_VERSION_FORMALIZED'
      and new.receipt_id is null
    )
    or (
      new.event_type <> 'DOCUMENT_VERSION_FORMALIZED'
      and new.receipt_id is not null
    )
  ) then raise exception 'CASE_EVENT_DOCUMENT_REFS_INVALID'; end if;
  if new.event_type = 'DOCUMENT_SNAPSHOT_RECORDED' and (
    new.snapshot_id is null or new.receipt_id is null
    or new.document_id is not null or new.document_version_id is not null
    or new.upload_intent_id is not null
    or new.orphan_cleanup_work_item_id is not null
  ) then raise exception 'CASE_EVENT_DOCUMENT_REFS_INVALID'; end if;
  if new.event_type = 'DOCUMENT_ORPHAN_CLEANUP_QUEUED' and (
    new.document_id is null or new.orphan_cleanup_work_item_id is null
    or new.document_version_id is not null or new.snapshot_id is not null
    or new.receipt_id is not null or new.upload_intent_id is not null
  ) then raise exception 'CASE_EVENT_DOCUMENT_REFS_INVALID'; end if;
  return new;
end;
$$;

alter function casework.case_event_document_refs_same_case_v1()
  owner to postgres;
revoke all on function casework.case_event_document_refs_same_case_v1()
  from public, anon, authenticated, service_role;
create trigger case_event_document_refs_same_case
before insert or update on casework.case_events
for each row execute function casework.case_event_document_refs_same_case_v1();

create or replace function casework.server_document_operation_locked_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text,
  p_grant_id uuid,
  p_grant_version bigint,
  p_operation text,
  p_resource_ref text,
  p_idempotency_key text,
  p_expected_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authority jsonb;
  v_resource jsonb;
  v_intent casework.document_upload_intents%rowtype;
  v_document casework.documents%rowtype;
  v_version casework.document_versions%rowtype;
  v_source casework.document_version_sources%rowtype;
  v_snapshot casework.submission_snapshots%rowtype;
  v_receipt casework.document_operation_receipts%rowtype;
  v_document_id uuid;
  v_document_ref text;
  v_intent_id uuid;
  v_planned_version_id uuid;
  v_planned_version_ref text;
  v_receipt_id uuid;
  v_receipt_ref text;
  v_snapshot_id uuid;
  v_snapshot_ref text;
  v_cleanup_work_item_id uuid;
  v_previous_version_id uuid;
  v_version_no bigint;
  v_extension text;
  v_count bigint;
  v_item jsonb;
  v_version_ref text;
  v_ordinal integer := 0;
begin
  if p_authenticated_user_id is null or p_expected_case_id is null
    or p_authorization_subject is null or p_grant_id is null
    or p_grant_version is null or p_grant_version < 1
    or p_operation not in (
      'CREATE_UPLOAD_INTENT', 'FINALIZE_UPLOAD', 'DOWNLOAD_VERSION',
      'CREATE_SNAPSHOT', 'QUEUE_ORPHAN_CLEANUP'
    )
    or p_resource_ref is null
    or pg_catalog.octet_length(p_resource_ref) not between 1 and 16384
    or p_idempotency_key is null
    or length(p_idempotency_key) not between 16 and 128
    or p_idempotency_key ~ '[[:space:][:cntrl:]]'
    or p_expected_payload_sha256 !~ '^[a-f0-9]{64}$'
  then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;

  v_authority := integration.drs_workspace_grant_assert_current_locked_v1(
    p_authenticated_user_id,
    p_expected_case_id,
    p_authorization_subject,
    p_grant_id,
    p_grant_version
  );
  v_now := clock_timestamp();
  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id' <> p_authenticated_user_id::text
    or v_authority ->> 'case_id' <> p_expected_case_id::text
    or v_authority ->> 'authorization_subject' <> p_authorization_subject
  then return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;

  if p_operation = 'CREATE_UPLOAD_INTENT' then
    if p_expected_payload_sha256 <> pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(p_resource_ref, 'UTF8'), 'sha256'),
      'hex'
    ) then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    v_resource := p_resource_ref::jsonb;
    if v_resource ->> 'schemaVersion' <> 'laibe.drs-document-upload-intent.internal.v1'
      or v_resource ->> 'documentKind' <> 'drs_review'
      or v_resource ->> 'declaredMime' not in (
        'application/pdf', 'image/jpeg', 'image/png'
      )
      or (v_resource ->> 'declaredSizeBytes')::bigint not between 1 and 26214400
      or v_resource ->> 'declaredSha256' !~ '^[a-f0-9]{64}$'
      or (v_resource ->> 'expiresAt')::timestamptz <= v_now
      or (v_resource ->> 'expiresAt')::timestamptz > v_now + interval '15 minutes'
    then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    v_intent_id := (v_resource ->> 'intentId')::uuid;
    v_planned_version_id := extensions.gen_random_uuid();
    v_planned_version_ref := 'dvr_' || replace(v_planned_version_id::text, '-', '');
    if v_resource ->> 'mode' = 'NEW_DOCUMENT' then
      v_document_id := extensions.gen_random_uuid();
      v_document_ref := 'doc_' || replace(v_document_id::text, '-', '');
      insert into casework.documents(
        id, case_id, document_ref, document_kind, visibility, source_role,
        document_status, created_by
      ) values (
        v_document_id, p_expected_case_id, v_document_ref, 'drs_review',
        'DRS_INTERNAL', 'DRS', 'DRAFT', p_authenticated_user_id
      );
    elsif v_resource ->> 'mode' = 'NEW_VERSION' then
      select d.* into v_document
      from casework.documents d
      where d.case_id = p_expected_case_id
        and d.document_ref = v_resource ->> 'documentRef'
        and d.source_role = 'DRS'
        and d.document_status <> 'WITHDRAWN'
      for update;
      if not found then return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;
      v_document_id := v_document.id;
      v_document_ref := v_document.document_ref;
    else return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    v_extension := substring(v_resource ->> 'objectKey' from '\.([a-z]+)$');
    insert into casework.document_upload_intents(
      intent_id, intent_ref, case_id, document_id, planned_version_id,
      planned_version_ref, mode, document_kind, original_filename,
      declared_mime, declared_size_bytes, declared_sha256, intake_bucket,
      intake_object_key, records_bucket, records_object_key, intent_state,
      expected_payload_sha256, created_by, expires_at
    ) values (
      v_intent_id, v_resource ->> 'intentRef', p_expected_case_id,
      v_document_id, v_planned_version_id, v_planned_version_ref,
      v_resource ->> 'mode', 'drs_review', v_resource ->> 'originalFilename',
      v_resource ->> 'declaredMime',
      (v_resource ->> 'declaredSizeBytes')::bigint,
      v_resource ->> 'declaredSha256', 'drs-case-intake-private',
      v_resource ->> 'objectKey', 'drs-case-records-private',
      'cases/' || p_expected_case_id::text || '/documents/' ||
      v_document_id::text || '/versions/' || v_planned_version_id::text ||
      '/source.' || v_extension,
      'INTENT_CREATED', p_expected_payload_sha256, p_authenticated_user_id,
      (v_resource ->> 'expiresAt')::timestamptz
    );
    insert into casework.case_events(
      case_id, event_type, actor_user_id, idempotency_key,
      payload_sha256, payload, document_id, upload_intent_id
    ) values (
      p_expected_case_id, 'DOCUMENT_UPLOAD_INTENT_CREATED',
      p_authenticated_user_id, v_resource ->> 'intentRef',
      p_expected_payload_sha256, v_resource, v_document_id, v_intent_id
    );
    return jsonb_build_object(
      'ok', true, 'state', 'UPLOAD_INTENT_CREATED',
      'intent_ref', v_resource ->> 'intentRef'
    );
  end if;

  if p_operation = 'FINALIZE_UPLOAD' and left(p_resource_ref, 1) <> '{' then
    select i.* into v_intent
    from casework.document_upload_intents i
    where i.case_id = p_expected_case_id and i.intent_ref = p_resource_ref
      and i.created_by = p_authenticated_user_id
    for update;
    if not found then return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;
    if v_intent.finalize_idempotency_key is not null
      and v_intent.finalize_idempotency_key <> p_idempotency_key
    then return jsonb_build_object('ok', false, 'state', 'VERSION_CONFLICT'); end if;
    if v_intent.finalize_request_payload_sha256 is not null
      and v_intent.finalize_request_payload_sha256 <> p_expected_payload_sha256
    then return jsonb_build_object('ok', false, 'state', 'IDEMPOTENCY_CONFLICT'); end if;
    if v_intent.intent_state = 'FORMALIZED' then
      select v.* into v_version from casework.document_versions v
      where v.id = v_intent.planned_version_id;
      select r.* into v_receipt from casework.document_operation_receipts r
      where r.case_id = p_expected_case_id
        and r.document_version_id = v_intent.planned_version_id
        and r.operation = 'FINALIZE_UPLOAD'
        and r.idempotency_key = v_intent.finalize_idempotency_key;
      if v_version.id is null or v_receipt.id is null
      then return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE'); end if;
      return jsonb_build_object(
        'ok', true, 'state', 'FORMAL_VERSION_CREATED',
        'document_ref', (select d.document_ref from casework.documents d where d.id = v_intent.document_id),
        'version_ref', v_version.version_ref,
        'receipt_ref', v_receipt.receipt_ref
      );
    end if;
    if v_intent.expires_at <= v_now then
      update casework.document_upload_intents set intent_state = 'EXPIRED'
      where intent_id = v_intent.intent_id;
      return jsonb_build_object('ok', false, 'state', 'UPLOAD_INTENT_EXPIRED');
    end if;
    if v_intent.intent_state not in ('INTENT_CREATED', 'VALIDATION_PENDING')
    then return jsonb_build_object('ok', false, 'state', 'VERSION_CONFLICT'); end if;
    update casework.document_upload_intents set
      intent_state = 'VALIDATION_PENDING',
      finalize_idempotency_key = coalesce(
        finalize_idempotency_key,
        p_idempotency_key
      ),
      finalize_request_payload_sha256 = coalesce(
        finalize_request_payload_sha256,
        p_expected_payload_sha256
      )
    where intent_id = v_intent.intent_id;
    return jsonb_build_object(
      'ok', true, 'state', 'VALIDATION_REQUIRED',
      'intake_bucket', v_intent.intake_bucket,
      'intake_object_key', v_intent.intake_object_key,
      'records_bucket', v_intent.records_bucket,
      'records_object_key', v_intent.records_object_key,
      'declared_mime', v_intent.declared_mime
    );
  end if;

  if p_operation = 'FINALIZE_UPLOAD' then
    if p_expected_payload_sha256 <> pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(p_resource_ref, 'UTF8'), 'sha256'),
      'hex'
    ) then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    v_resource := p_resource_ref::jsonb;
    if v_resource ->> 'schemaVersion' <> 'laibe.drs-document-finalize.internal.v1'
      or v_resource ->> 'recordsBucket' <> 'drs-case-records-private'
      or v_resource ->> 'requestPayloadSha256' !~ '^[a-f0-9]{64}$'
    then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    select i.* into v_intent
    from casework.document_upload_intents i
    where i.case_id = p_expected_case_id
      and i.intent_ref = v_resource ->> 'intentRef'
      and i.created_by = p_authenticated_user_id
    for update;
    if not found or v_intent.expires_at <= v_now
      or v_intent.intent_state <> 'VALIDATION_PENDING'
      or v_intent.finalize_idempotency_key <> p_idempotency_key
      or v_intent.finalize_request_payload_sha256 <>
        v_resource ->> 'requestPayloadSha256'
      or v_intent.records_object_key <> v_resource ->> 'recordsObjectKey'
      or v_intent.declared_sha256 <> v_resource ->> 'verifiedSha256'
      or v_intent.declared_size_bytes <> (v_resource ->> 'verifiedSizeBytes')::bigint
      or v_intent.declared_mime <> v_resource ->> 'detectedMime'
    then return jsonb_build_object('ok', false, 'state', 'VALIDATION_MISMATCH'); end if;
    select d.* into v_document from casework.documents d
    where d.case_id = p_expected_case_id and d.id = v_intent.document_id
    for update;
    v_previous_version_id := v_document.current_version_id;
    select coalesce(max(v.version_no), 0) + 1 into v_version_no
    from casework.document_versions v where v.document_id = v_document.id;
    insert into casework.document_versions(
      id, case_id, document_id, version_ref, version_no, previous_version_id,
      created_by, sha256, size_bytes, detected_mime, validation_state,
      lifecycle_state, idempotency_key, payload_sha256
    ) values (
      v_intent.planned_version_id, p_expected_case_id, v_document.id,
      v_intent.planned_version_ref, v_version_no, v_previous_version_id,
      p_authenticated_user_id, v_resource ->> 'verifiedSha256',
      (v_resource ->> 'verifiedSizeBytes')::bigint,
      v_resource ->> 'detectedMime', 'FORMAL', 'ACTIVE',
      p_idempotency_key, p_expected_payload_sha256
    );
    insert into casework.document_version_sources(
      case_id, document_id, version_id, bucket_id, object_key, sha256,
      size_bytes, detected_mime, validation_state
    ) values (
      p_expected_case_id, v_document.id, v_intent.planned_version_id,
      'drs-case-records-private', v_intent.records_object_key,
      v_resource ->> 'verifiedSha256',
      (v_resource ->> 'verifiedSizeBytes')::bigint,
      v_resource ->> 'detectedMime', 'CLEAN'
    );
    update casework.documents set
      current_version_id = v_intent.planned_version_id,
      document_status = 'ACTIVE', updated_at = v_now
    where id = v_document.id;
    v_receipt_id := extensions.gen_random_uuid();
    v_receipt_ref := 'rcp_' || replace(v_receipt_id::text, '-', '');
    insert into casework.document_operation_receipts(
      id, receipt_ref, case_id, operation, receipt_state, actor_user_id,
      idempotency_key, payload_sha256, document_id, document_version_id
    ) values (
      v_receipt_id, v_receipt_ref, p_expected_case_id, 'FINALIZE_UPLOAD',
      'FORMAL_VERSION_CREATED', p_authenticated_user_id, p_idempotency_key,
      p_expected_payload_sha256, v_document.id, v_intent.planned_version_id
    );
    insert into casework.case_events(
      case_id, event_type, actor_user_id, idempotency_key, payload_sha256,
      payload, document_id, document_version_id, receipt_id
    ) values (
      p_expected_case_id, 'DOCUMENT_VERSION_FORMALIZED',
      p_authenticated_user_id, p_idempotency_key, p_expected_payload_sha256,
      v_resource, v_document.id, v_intent.planned_version_id, v_receipt_id
    );
    update casework.document_upload_intents set
      intent_state = 'FORMALIZED', finalized_at = v_now
    where intent_id = v_intent.intent_id;
    return jsonb_build_object(
      'ok', true, 'state', 'FORMAL_VERSION_CREATED',
      'document_ref', v_document.document_ref,
      'version_ref', v_intent.planned_version_ref,
      'receipt_ref', v_receipt_ref
    );
  end if;

  if p_operation = 'DOWNLOAD_VERSION' then
    select v.* into v_version
    from casework.document_versions v
    join casework.documents d on d.case_id = v.case_id and d.id = v.document_id
    where v.case_id = p_expected_case_id and v.version_ref = p_resource_ref
      and v.validation_state = 'FORMAL' and v.lifecycle_state = 'ACTIVE'
      and d.document_status = 'ACTIVE'
    for share of v;
    if not found then return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;
    select s.* into v_source from casework.document_version_sources s
    where s.case_id = p_expected_case_id and s.document_id = v_version.document_id
      and s.version_id = v_version.id and s.validation_state = 'CLEAN';
    if not found then return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE'); end if;
    insert into casework.case_events(
      case_id, event_type, actor_user_id, idempotency_key, payload_sha256,
      payload, document_id, document_version_id
    ) values (
      p_expected_case_id, 'DOCUMENT_DOWNLOAD_ACCESSED', p_authenticated_user_id,
      p_idempotency_key, p_expected_payload_sha256,
      jsonb_build_object('version_ref', p_resource_ref),
      v_version.document_id, v_version.id
    ) on conflict (actor_user_id, event_type, idempotency_key) do nothing;
    return jsonb_build_object(
      'ok', true, 'state', 'DOWNLOAD_READY',
      'bucket_id', v_source.bucket_id, 'object_key', v_source.object_key
    );
  end if;

  if p_operation = 'CREATE_SNAPSHOT' then
    if p_expected_payload_sha256 <> pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(p_resource_ref, 'UTF8'), 'sha256'),
      'hex'
    ) then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    v_resource := p_resource_ref::jsonb;
    if v_resource ->> 'schemaVersion' <> 'laibe.drs-document-snapshot.request.v1'
      or v_resource ->> 'purpose' not in (
        'REVIEW_SUBMISSION', 'DECISION_BASIS', 'FORMAL_RECEIPT'
      ) or jsonb_typeof(v_resource -> 'versionRefs') <> 'array'
      or jsonb_array_length(v_resource -> 'versionRefs') not between 1 and 10
    then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    select s.* into v_snapshot from casework.submission_snapshots s
    where s.case_id = p_expected_case_id
      and s.created_by = p_authenticated_user_id
      and s.idempotency_key = p_idempotency_key;
    if found then
      if v_snapshot.canonical_payload_sha256 <> p_expected_payload_sha256
      then return jsonb_build_object('ok', false, 'state', 'IDEMPOTENCY_CONFLICT'); end if;
      select r.* into v_receipt from casework.document_operation_receipts r
      where r.snapshot_id = v_snapshot.id;
      return jsonb_build_object(
        'ok', true, 'state', 'SNAPSHOT_RECORDED',
        'snapshot_ref', v_snapshot.snapshot_ref,
        'receipt_ref', v_receipt.receipt_ref,
        'canonical_payload_sha256', v_snapshot.canonical_payload_sha256
      );
    end if;
    select count(*) into v_count
    from jsonb_array_elements_text(v_resource -> 'versionRefs') x(version_ref)
    join casework.document_versions v on v.version_ref = x.version_ref
    join casework.documents d on d.case_id = v.case_id and d.id = v.document_id
    where v.case_id = p_expected_case_id and v.validation_state = 'FORMAL'
      and v.lifecycle_state = 'ACTIVE' and d.document_status = 'ACTIVE';
    if v_count <> jsonb_array_length(v_resource -> 'versionRefs')
    then return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;
    v_snapshot_id := extensions.gen_random_uuid();
    v_snapshot_ref := 'snp_' || replace(v_snapshot_id::text, '-', '');
    insert into casework.submission_snapshots(
      id, snapshot_ref, case_id, purpose, canonical_payload_sha256,
      idempotency_key, created_by
    ) values (
      v_snapshot_id, v_snapshot_ref, p_expected_case_id,
      v_resource ->> 'purpose', p_expected_payload_sha256,
      p_idempotency_key, p_authenticated_user_id
    );
    for v_item in select value from jsonb_array_elements(v_resource -> 'versionRefs') loop
      v_ordinal := v_ordinal + 1;
      v_version_ref := trim(both '"' from v_item::text);
      select v.* into v_version from casework.document_versions v
      where v.case_id = p_expected_case_id and v.version_ref = v_version_ref;
      insert into casework.document_snapshot_items(
        case_id, snapshot_id, document_id, document_version_id, ordinal
      ) values (
        p_expected_case_id, v_snapshot_id, v_version.document_id,
        v_version.id, v_ordinal
      );
    end loop;
    v_receipt_id := extensions.gen_random_uuid();
    v_receipt_ref := 'rcp_' || replace(v_receipt_id::text, '-', '');
    insert into casework.document_operation_receipts(
      id, receipt_ref, case_id, operation, receipt_state, actor_user_id,
      idempotency_key, payload_sha256, snapshot_id
    ) values (
      v_receipt_id, v_receipt_ref, p_expected_case_id, 'CREATE_SNAPSHOT',
      'SNAPSHOT_RECORDED', p_authenticated_user_id, p_idempotency_key,
      p_expected_payload_sha256, v_snapshot_id
    );
    insert into casework.case_events(
      case_id, event_type, actor_user_id, idempotency_key, payload_sha256,
      payload, snapshot_id, receipt_id
    ) values (
      p_expected_case_id, 'DOCUMENT_SNAPSHOT_RECORDED',
      p_authenticated_user_id, p_idempotency_key, p_expected_payload_sha256,
      v_resource, v_snapshot_id, v_receipt_id
    );
    return jsonb_build_object(
      'ok', true, 'state', 'SNAPSHOT_RECORDED',
      'snapshot_ref', v_snapshot_ref, 'receipt_ref', v_receipt_ref,
      'canonical_payload_sha256', p_expected_payload_sha256
    );
  end if;

  if p_operation = 'QUEUE_ORPHAN_CLEANUP' then
    if p_expected_payload_sha256 <> pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(p_resource_ref, 'UTF8'), 'sha256'),
      'hex'
    ) then
      return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
    end if;
    v_resource := p_resource_ref::jsonb;
    if v_resource ->> 'schemaVersion' <> 'laibe.drs-document-orphan-cleanup.internal.v1'
      or v_resource ->> 'intentRef' !~ '^int_[0-9a-z]{20,40}$'
      or v_resource ->> 'recordsBucket' <> 'drs-case-records-private'
      or v_resource ->> 'recordsObjectKey' !~ '^cases/[0-9a-f-]{36}/documents/[0-9a-f-]{36}/versions/[0-9a-f-]{36}/source\.(pdf|jpg|jpeg|png)$'
    then return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST'); end if;
    select i.* into v_intent
    from casework.document_upload_intents i
    where i.case_id = p_expected_case_id
      and i.intent_ref = v_resource ->> 'intentRef'
      and i.created_by = p_authenticated_user_id
      and i.records_bucket = 'drs-case-records-private'
      and i.records_object_key = v_resource ->> 'recordsObjectKey'
      and i.intent_state in ('VALIDATION_PENDING', 'FORMALIZED')
    for update;
    if not found
    then return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;
    insert into casework.document_orphan_cleanup_work_items(
      case_id, document_id, upload_intent_id, records_bucket,
      records_object_key, expected_payload_sha256, cleanup_state, queued_by
    ) values (
      p_expected_case_id, v_intent.document_id, v_intent.intent_id,
      'drs-case-records-private',
      v_resource ->> 'recordsObjectKey', p_expected_payload_sha256,
      'PENDING', p_authenticated_user_id
    ) on conflict (records_bucket, records_object_key) do nothing
    returning work_item_id into v_cleanup_work_item_id;
    if v_cleanup_work_item_id is null then
      select w.work_item_id into v_cleanup_work_item_id
      from casework.document_orphan_cleanup_work_items w
      where w.case_id = p_expected_case_id
        and w.document_id = v_intent.document_id
        and w.upload_intent_id = v_intent.intent_id
        and w.records_bucket = 'drs-case-records-private'
        and w.records_object_key = v_intent.records_object_key
        and w.expected_payload_sha256 = p_expected_payload_sha256;
      if not found
      then return jsonb_build_object('ok', false, 'state', 'IDEMPOTENCY_CONFLICT'); end if;
    end if;
    insert into casework.case_events(
      case_id, event_type, actor_user_id, idempotency_key,
      payload_sha256, payload, document_id, orphan_cleanup_work_item_id
    ) values (
      p_expected_case_id, 'DOCUMENT_ORPHAN_CLEANUP_QUEUED',
      p_authenticated_user_id, p_idempotency_key,
      p_expected_payload_sha256, v_resource, v_intent.document_id,
      v_cleanup_work_item_id
    ) on conflict (actor_user_id, event_type, idempotency_key) do nothing;
    return jsonb_build_object(
      'ok', true, 'state', 'ORPHAN_CLEANUP_QUEUED',
      'work_item_id', v_cleanup_work_item_id
    );
  end if;

  return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'state', 'IDEMPOTENCY_CONFLICT');
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

alter function casework.server_document_operation_locked_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) owner to postgres;
revoke all on function casework.server_document_operation_locked_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function casework.server_document_operation_locked_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) to service_role;

create or replace function public.server_document_operation_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text,
  p_grant_id uuid,
  p_grant_version bigint,
  p_operation text,
  p_resource_ref text,
  p_idempotency_key text,
  p_expected_payload_sha256 text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select casework.server_document_operation_locked_v1(
    p_authenticated_user_id,
    p_expected_case_id,
    p_authorization_subject,
    p_grant_id,
    p_grant_version,
    p_operation,
    p_resource_ref,
    p_idempotency_key,
    p_expected_payload_sha256
  );
$$;

alter function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) owner to postgres;
revoke all on function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) to service_role;

commit;
