begin;

do $preimage$
begin
  if to_regclass('casework.documents') is null
    or to_regclass('casework.document_versions') is null
    or to_regclass('casework.document_version_sources') is null
    or to_regclass('casework.document_upload_intents') is null
    or to_regclass('casework.document_operation_receipts') is null
    or to_regclass('casework.document_orphan_cleanup_work_items') is null
    or to_regclass('casework.drs_three_role_memberships') is null
    or to_regclass('casework.drs_three_role_case_authority') is null
    or to_regclass('integration.drs_three_role_auth_session_bindings') is null
    or to_regclass('integration.drs_three_role_server_sessions') is null
    or to_regprocedure(
      'public.server_document_operation_v1(uuid,uuid,text,uuid,bigint,text,text,text,text)'
    ) is null
    or to_regprocedure(
      'drs_case_command_private.lock_case_command_v1(uuid)'
    ) is null
    or to_regprocedure(
      'drs_case_command_private.apply_document_version_formalized_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid)'
    ) is null
  then
    raise exception 'DOCUMENT_FORMALIZE_RUNTIME_R1_PREIMAGE_MISMATCH';
  end if;

  if to_regnamespace('drs_document_storage_private') is not null
    or to_regclass('casework.document_audience_read_projections') is not null
    or to_regprocedure(
      'public.server_document_finalize_domain_command_v1(text,uuid,uuid,uuid,uuid,text,bigint,text,text,text,uuid,bigint,text,text,text,text,text,bigint,text)'
    ) is not null
  then
    raise exception 'DOCUMENT_FORMALIZE_RUNTIME_R1_ALREADY_EXISTS';
  end if;
end;
$preimage$;

alter table casework.document_upload_intents
  drop constraint document_upload_intents_document_kind_check;
alter table casework.document_upload_intents
  add constraint document_upload_intents_document_kind_check check (
    document_kind in (
      'drawing', 'quote', 'contract', 'photo', 'other_case_evidence',
      'drs_review'
    )
  );

create schema drs_document_storage_private;
revoke all on schema drs_document_storage_private
  from public, anon, authenticated, service_role;

create table casework.document_audience_read_projections (
  case_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  audience_role text not null
    check (audience_role in ('owner', 'vendor', 'drs')),
  receipt_id uuid not null,
  document_ref text not null check (document_ref ~ '^doc_[0-9a-z]{20,40}$'),
  version_ref text not null check (version_ref ~ '^dvr_[0-9a-z]{20,40}$'),
  receipt_ref text not null check (receipt_ref ~ '^rcp_[0-9a-z]{20,40}$'),
  document_kind text not null check (
    document_kind in (
      'drawing', 'quote', 'contract', 'photo', 'other_case_evidence',
      'drs_review'
    )
  ),
  visibility text not null check (visibility in ('PARTY_VISIBLE', 'DRS_INTERNAL')),
  source_role text not null check (source_role in ('OWNER', 'VENDOR', 'DRS')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  detected_mime text not null check (
    detected_mime in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  finalized_at timestamptz not null check (pg_catalog.isfinite(finalized_at)),
  primary key (case_id, document_id, version_id, audience_role),
  foreign key (case_id, document_id, version_id)
    references casework.document_versions(case_id, document_id, id)
    on delete restrict,
  foreign key (case_id, receipt_id)
    references casework.document_operation_receipts(case_id, id)
    on delete restrict,
  check (
    (visibility = 'PARTY_VISIBLE' and document_kind <> 'drs_review')
    or (
      visibility = 'DRS_INTERNAL'
      and document_kind = 'drs_review'
      and audience_role = 'drs'
    )
  )
);

create index document_audience_projection_role_case_idx
  on casework.document_audience_read_projections(
    audience_role, case_id, finalized_at
  );
create index document_audience_projection_receipt_idx
  on casework.document_audience_read_projections(case_id, receipt_id);

alter table casework.document_audience_read_projections enable row level security;
alter table casework.document_audience_read_projections force row level security;
revoke all on table casework.document_audience_read_projections
  from public, anon, authenticated, service_role;
grant select on table casework.document_audience_read_projections
  to authenticated;

create function drs_document_storage_private.reject_projection_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'DOCUMENT_AUDIENCE_PROJECTION_IMMUTABLE';
end;
$function$;

create trigger document_audience_projection_immutable
before update or delete on casework.document_audience_read_projections
for each row execute function
  drs_document_storage_private.reject_projection_mutation_v1();

create function drs_document_storage_private.can_read_projection_v1(
  p_case_id uuid,
  p_audience_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  with request_identity as (
    select
      (select auth.uid()) as user_id,
      case
        when coalesce((select auth.jwt()->>'session_id'), '') ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((select auth.jwt()->>'session_id'))::uuid
        else null::uuid
      end as auth_session_id
  )
  select exists (
    select 1
    from request_identity request_record
    join auth.sessions auth_session
      on auth_session.id = request_record.auth_session_id
      and auth_session.user_id = request_record.user_id
      and (
        auth_session.not_after is null
        or auth_session.not_after > pg_catalog.statement_timestamp()
      )
    join integration.drs_three_role_auth_session_bindings binding_record
      on binding_record.auth_session_id = auth_session.id
      and binding_record.user_id = request_record.user_id
    join integration.drs_three_role_server_sessions technical_session
      on technical_session.auth_session_id = binding_record.auth_session_id
      and technical_session.user_id = binding_record.user_id
      and technical_session.membership_id = binding_record.membership_id
      and technical_session.authority_version = binding_record.authority_version
      and technical_session.revoked_at is null
      and technical_session.expires_at > pg_catalog.statement_timestamp()
    join casework.drs_three_role_memberships membership_record
      on membership_record.membership_id = binding_record.membership_id
      and membership_record.user_id = binding_record.user_id
      and membership_record.authority_version = binding_record.authority_version
      and membership_record.status = 'active'
      and membership_record.revoked_at is null
      and membership_record.valid_from <= pg_catalog.statement_timestamp()
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
      and authority_record.authority_version = membership_record.authority_version
    join casework.case_members baseline_member
      on baseline_member.case_id = membership_record.case_id
      and baseline_member.user_id = membership_record.user_id
    where request_record.user_id is not null
      and membership_record.case_id = p_case_id
      and membership_record.role = p_audience_role
      and baseline_member.role::text = case membership_record.role
        when 'owner' then 'owner'
        when 'vendor' then 'pro'
        when 'drs' then 'pcm'
        else '__invalid__'
      end
  );
$function$;

alter function drs_document_storage_private.can_read_projection_v1(uuid,text)
  owner to postgres;
revoke all on function
  drs_document_storage_private.can_read_projection_v1(uuid,text)
  from public, anon, authenticated, service_role;
grant usage on schema drs_document_storage_private to authenticated;
grant execute on function
  drs_document_storage_private.can_read_projection_v1(uuid,text)
  to authenticated;

create policy document_audience_projection_authenticated_select
  on casework.document_audience_read_projections
  for select
  to authenticated
  using (
    (select drs_document_storage_private.can_read_projection_v1(
      case_id,
      audience_role
    ))
  );

create view public.drs_owner_document_read_v1
with (security_invoker = true)
as
select
  case_id,
  document_ref,
  version_ref,
  receipt_ref,
  document_kind,
  visibility,
  source_role,
  sha256,
  size_bytes,
  detected_mime,
  finalized_at
from casework.document_audience_read_projections
where audience_role = 'owner';

create view public.drs_vendor_document_read_v1
with (security_invoker = true)
as
select
  case_id,
  document_ref,
  version_ref,
  receipt_ref,
  document_kind,
  visibility,
  source_role,
  sha256,
  size_bytes,
  detected_mime,
  finalized_at
from casework.document_audience_read_projections
where audience_role = 'vendor';

create view public.drs_specialist_document_read_v1
with (security_invoker = true)
as
select
  case_id,
  document_ref,
  version_ref,
  receipt_ref,
  document_kind,
  visibility,
  source_role,
  sha256,
  size_bytes,
  detected_mime,
  finalized_at
from casework.document_audience_read_projections
where audience_role = 'drs';

revoke all on public.drs_owner_document_read_v1,
  public.drs_vendor_document_read_v1,
  public.drs_specialist_document_read_v1
  from public, anon, authenticated, service_role;
grant select on public.drs_owner_document_read_v1,
  public.drs_vendor_document_read_v1,
  public.drs_specialist_document_read_v1
  to authenticated;

alter function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) rename to server_document_operation_legacy_impl_v1;
alter function public.server_document_operation_legacy_impl_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) owner to postgres;
revoke all on function public.server_document_operation_legacy_impl_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) from public, anon, authenticated, service_role;

create function public.server_document_operation_v1(
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
volatile
security definer
set search_path = ''
as $function$
begin
  if p_operation = 'FINALIZE_UPLOAD' then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'DOCUMENT_FINALIZE_RUNTIME_V2_REQUIRED'
    );
  end if;
  return public.server_document_operation_legacy_impl_v1(
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
end;
$function$;

alter function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) owner to postgres;
revoke all on function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.server_document_operation_v1(
  uuid, uuid, text, uuid, bigint, text, text, text, text
) to service_role;

create function drs_document_storage_private.finalize_domain_command_v1(
  p_action text,
  p_actor_user_id uuid,
  p_actor_auth_session_id uuid,
  p_case_id uuid,
  p_actor_authority_membership_id uuid,
  p_actor_role text,
  p_authority_version bigint,
  p_next_actor text,
  p_intent_ref text,
  p_idempotency_key text,
  p_command_id uuid,
  p_expected_case_version bigint,
  p_finalize_request_payload_sha256 text,
  p_canonical_payload_sha256 text,
  p_records_bucket text,
  p_records_object_key text,
  p_verified_sha256 text,
  p_verified_size_bytes bigint,
  p_detected_mime text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_projection casework.case_state_projection%rowtype;
  v_intent casework.document_upload_intents%rowtype;
  v_document casework.documents%rowtype;
  v_current_version casework.document_versions%rowtype;
  v_existing_command casework.case_commands%rowtype;
  v_existing_event casework.case_events%rowtype;
  v_receipt casework.document_operation_receipts%rowtype;
  v_version_no bigint;
  v_receipt_id uuid;
  v_receipt_ref text;
  v_evidence jsonb;
  v_apply jsonb;
  v_request_canonical text;
  v_resource_canonical text;
  v_orphan_canonical text;
  v_source_role text;
  v_expected_visibility text;
  v_expected_projection_count integer;
  v_cleanup_work_item_id uuid;
begin
  if p_action not in ('AUTHORIZE', 'COMMIT', 'QUEUE_ORPHAN')
    or p_actor_user_id is null
    or p_actor_auth_session_id is null
    or p_case_id is null
    or p_actor_authority_membership_id is null
    or p_actor_role not in ('owner', 'vendor', 'drs')
    or p_authority_version is null
    or p_authority_version not between 1 and 9007199254740991
    or p_next_actor not in ('owner', 'vendor', 'drs')
    or p_intent_ref !~ '^int_[0-9a-z]{20,40}$'
    or p_idempotency_key is null
    or pg_catalog.length(p_idempotency_key) not between 16 and 128
    or p_idempotency_key ~ '[[:space:][:cntrl:]]'
    or p_finalize_request_payload_sha256 !~ '^[a-f0-9]{64}$'
  then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'INVALID_REQUEST', 'newEffects', 0
    );
  end if;

  if p_action in ('AUTHORIZE', 'COMMIT') then
    if p_command_id is null
      or p_expected_case_version is null
      or p_expected_case_version not between 1 and 9007199254740991
    then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'INVALID_REQUEST', 'newEffects', 0
      );
    end if;
    v_request_canonical :=
      'schemaVersion=laibe.drs-document-upload-finalize.request.v2' || pg_catalog.chr(10) ||
      'intentRef=' || p_intent_ref || pg_catalog.chr(10) ||
      'idempotencyKey=' || p_idempotency_key || pg_catalog.chr(10) ||
      'commandId=' || p_command_id::text || pg_catalog.chr(10) ||
      'expectedCaseVersion=' || p_expected_case_version::text;
    if p_finalize_request_payload_sha256 <> pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(v_request_canonical, 'UTF8'), 'sha256'),
      'hex'
    ) then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'INVALID_REQUEST', 'newEffects', 0
      );
    end if;
  end if;

  perform drs_case_command_private.lock_case_command_v1(p_case_id);

  select projection_record.* into v_projection
  from casework.case_state_projection projection_record
  where projection_record.case_id = p_case_id
  for update;
  if not found or v_projection.next_actor <> p_next_actor then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from auth.sessions auth_session
  where auth_session.id = p_actor_auth_session_id
    and auth_session.user_id = p_actor_user_id
    and (auth_session.not_after is null or auth_session.not_after > v_now)
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from integration.drs_three_role_auth_session_bindings binding_record
  where binding_record.auth_session_id = p_actor_auth_session_id
    and binding_record.user_id = p_actor_user_id
    and binding_record.membership_id = p_actor_authority_membership_id
    and binding_record.authority_version = p_authority_version
    and binding_record.bound_at <= v_now
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from integration.drs_three_role_server_sessions technical_session
  where technical_session.auth_session_id = p_actor_auth_session_id
    and technical_session.user_id = p_actor_user_id
    and technical_session.membership_id = p_actor_authority_membership_id
    and technical_session.authority_version = p_authority_version
    and technical_session.issued_at <= v_now
    and technical_session.expires_at > v_now
    and technical_session.revoked_at is null
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from casework.drs_three_role_case_authority authority_record
  where authority_record.case_id = p_case_id
    and authority_record.authority_version = p_authority_version
    and authority_record.next_actor = p_next_actor
  for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from casework.drs_three_role_memberships membership_record
  where membership_record.membership_id = p_actor_authority_membership_id
    and membership_record.case_id = p_case_id
    and membership_record.user_id = p_actor_user_id
    and membership_record.role = p_actor_role
    and membership_record.status = 'active'
    and membership_record.revoked_at is null
    and membership_record.valid_from <= v_now
    and membership_record.authority_version = p_authority_version
  for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from casework.case_members baseline_member
  where baseline_member.case_id = p_case_id
    and baseline_member.user_id = p_actor_user_id
    and baseline_member.role::text = case p_actor_role
      when 'owner' then 'owner'
      when 'vendor' then 'pro'
      when 'drs' then 'pcm'
    end
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  select intent_record.* into v_intent
  from casework.document_upload_intents intent_record
  where intent_record.case_id = p_case_id
    and intent_record.intent_ref = p_intent_ref
  for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'DOCUMENT_FINALIZE_NOT_AUTHORIZED', 'newEffects', 0
    );
  end if;

  select document_record.* into v_document
  from casework.documents document_record
  where document_record.case_id = p_case_id
    and document_record.id = v_intent.document_id
  for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'DOCUMENT_FINALIZE_CONFLICT', 'newEffects', 0
    );
  end if;

  if v_document.current_version_id is not null then
    select version_record.* into v_current_version
    from casework.document_versions version_record
    where version_record.case_id = p_case_id
      and version_record.document_id = v_document.id
      and version_record.id = v_document.current_version_id
    for update;
    if not found then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'DOCUMENT_FINALIZE_CONFLICT', 'newEffects', 0
      );
    end if;
  end if;

  if v_intent.created_by <> p_actor_user_id
    or v_intent.document_kind <> v_document.document_kind
  then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'DOCUMENT_FINALIZE_NOT_AUTHORIZED', 'newEffects', 0
    );
  end if;

  v_source_role := case p_actor_role
    when 'owner' then 'OWNER'
    when 'vendor' then 'VENDOR'
    when 'drs' then 'DRS'
  end;
  v_expected_visibility := case
    when v_document.document_kind = 'drs_review' then 'DRS_INTERNAL'
    else 'PARTY_VISIBLE'
  end;
  v_expected_projection_count := case
    when v_expected_visibility = 'PARTY_VISIBLE' then 3
    else 1
  end;
  if v_document.source_role <> v_source_role
    or v_document.visibility <> v_expected_visibility
    or v_document.document_kind not in (
      'drawing', 'quote', 'contract', 'photo', 'other_case_evidence',
      'drs_review'
    )
  then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'DOCUMENT_FINALIZE_NOT_AUTHORIZED', 'newEffects', 0
    );
  end if;

  if p_action = 'QUEUE_ORPHAN' then
    if p_command_id is not null
      or p_expected_case_version is not null
      or p_canonical_payload_sha256 is not null
      or p_verified_sha256 is not null
      or p_verified_size_bytes is not null
      or p_detected_mime is not null
      or p_records_bucket <> 'drs-case-records-private'
      or p_records_object_key <> v_intent.records_object_key
    then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'INVALID_REQUEST', 'newEffects', 0
      );
    end if;
    v_orphan_canonical :=
      'schemaVersion=laibe.drs-document-orphan-cleanup.internal.v1' || pg_catalog.chr(10) ||
      'intentRef=' || p_intent_ref || pg_catalog.chr(10) ||
      'recordsBucket=' || p_records_bucket || pg_catalog.chr(10) ||
      'recordsObjectKey=' || p_records_object_key;
    if p_finalize_request_payload_sha256 <> pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(v_orphan_canonical, 'UTF8'), 'sha256'),
      'hex'
    ) then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'INVALID_REQUEST', 'newEffects', 0
      );
    end if;
    insert into casework.document_orphan_cleanup_work_items(
      case_id, document_id, upload_intent_id, records_bucket,
      records_object_key, expected_payload_sha256, cleanup_state, queued_by
    ) values (
      p_case_id, v_document.id, v_intent.intent_id,
      'drs-case-records-private', p_records_object_key,
      p_finalize_request_payload_sha256, 'PENDING', p_actor_user_id
    ) on conflict (records_bucket, records_object_key) do nothing
    returning work_item_id into v_cleanup_work_item_id;
    if v_cleanup_work_item_id is null then
      select work_item.work_item_id into v_cleanup_work_item_id
      from casework.document_orphan_cleanup_work_items work_item
      where work_item.case_id = p_case_id
        and work_item.document_id = v_document.id
        and work_item.upload_intent_id = v_intent.intent_id
        and work_item.records_bucket = p_records_bucket
        and work_item.records_object_key = p_records_object_key
        and work_item.expected_payload_sha256 = p_finalize_request_payload_sha256;
      if not found then
        return pg_catalog.jsonb_build_object(
          'ok', false, 'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0
        );
      end if;
    end if;
    insert into casework.case_events(
      case_id, event_type, actor_user_id, idempotency_key,
      payload_sha256, payload, document_id, orphan_cleanup_work_item_id
    ) values (
      p_case_id, 'DOCUMENT_ORPHAN_CLEANUP_QUEUED', p_actor_user_id,
      p_idempotency_key, p_finalize_request_payload_sha256,
      pg_catalog.jsonb_build_object(
        'intentRef', p_intent_ref,
        'recordsBucket', p_records_bucket,
        'recordsObjectKey', p_records_object_key
      ),
      v_document.id, v_cleanup_work_item_id
    ) on conflict (actor_user_id, event_type, idempotency_key) do nothing;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'ORPHAN_CLEANUP_QUEUED',
      'work_item_id', v_cleanup_work_item_id
    );
  end if;

  select command_record.* into v_existing_command
  from casework.case_commands command_record
  where command_record.case_id = p_case_id
    and command_record.command_type = 'FORMALIZE_DOCUMENT_VERSION'
    and command_record.idempotency_key = p_idempotency_key;
  if found then
    select event_record.* into v_existing_event
    from casework.case_events event_record
    where event_record.case_id = p_case_id
      and event_record.event_id = v_existing_command.event_id;
    select receipt_record.* into v_receipt
    from casework.document_operation_receipts receipt_record
    where receipt_record.case_id = p_case_id
      and receipt_record.document_id = v_document.id
      and receipt_record.document_version_id = v_intent.planned_version_id
      and receipt_record.operation = 'FINALIZE_UPLOAD';
    if v_existing_command.command_id = p_command_id
      and v_existing_command.expected_case_version = p_expected_case_version
      and v_existing_command.actor_user_id = p_actor_user_id
      and v_existing_command.actor_auth_session_id = p_actor_auth_session_id
      and v_existing_command.actor_authority_membership_id =
        p_actor_authority_membership_id
      and v_existing_command.actor_role = p_actor_role
      and v_existing_command.authority_version = p_authority_version
      and v_existing_command.evidence_refs ->> 'finalizeRequestPayloadSha256' =
        p_finalize_request_payload_sha256
      and v_existing_event.document_id = v_document.id
      and v_existing_event.document_version_id = v_intent.planned_version_id
      and v_receipt.id is not null
      and (
        select pg_catalog.count(*)
        from casework.document_audience_read_projections audience_projection
        where audience_projection.case_id = p_case_id
          and audience_projection.document_id = v_document.id
          and audience_projection.version_id = v_intent.planned_version_id
      ) = v_expected_projection_count
      and not exists (
        select 1
        from casework.document_audience_read_projections audience_projection
        where audience_projection.case_id = p_case_id
          and audience_projection.document_id = v_document.id
          and audience_projection.version_id = v_intent.planned_version_id
          and audience_projection.audience_role not in (
            case when v_expected_projection_count = 1 then 'drs' else 'owner' end,
            case when v_expected_projection_count = 1 then 'drs' else 'vendor' end,
            'drs'
          )
      )
    then
      return pg_catalog.jsonb_build_object(
        'ok', true,
        'state', 'REPLAYED',
        'newEffects', 0,
        'document_ref', v_document.document_ref,
        'version_ref', v_intent.planned_version_ref,
        'receipt_ref', v_receipt.receipt_ref,
        'receipt', v_existing_command.receipt,
        'receiptCanonical', v_existing_command.receipt_canonical,
        'receiptSha256', v_existing_command.receipt_sha256
      );
    end if;
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0
    );
  end if;

  if exists (
    select 1 from casework.case_commands command_record
    where command_record.case_id = p_case_id
      and command_record.command_id = p_command_id
  ) then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'IDEMPOTENCY_CONFLICT', 'newEffects', 0
    );
  end if;

  if v_projection.case_version <> p_expected_case_version then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'CASE_VERSION_CONFLICT', 'newEffects', 0
    );
  end if;

  if v_intent.expires_at <= v_now
    or v_intent.intent_state not in ('INTENT_CREATED', 'VALIDATION_PENDING')
    or (
      v_intent.finalize_idempotency_key is not null
      and v_intent.finalize_idempotency_key <> p_idempotency_key
    )
    or (
      v_intent.finalize_request_payload_sha256 is not null
      and v_intent.finalize_request_payload_sha256 <>
        p_finalize_request_payload_sha256
    )
  then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'VERSION_CONFLICT', 'newEffects', 0
    );
  end if;

  if p_action = 'AUTHORIZE' then
    if p_canonical_payload_sha256 is not null
      or p_records_bucket is not null
      or p_records_object_key is not null
      or p_verified_sha256 is not null
      or p_verified_size_bytes is not null
      or p_detected_mime is not null
    then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'INVALID_REQUEST', 'newEffects', 0
      );
    end if;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'VALIDATION_REQUIRED',
      'newEffects', 0,
      'intake_bucket', v_intent.intake_bucket,
      'intake_object_key', v_intent.intake_object_key,
      'records_bucket', v_intent.records_bucket,
      'records_object_key', v_intent.records_object_key,
      'declared_mime', v_intent.declared_mime,
      'declared_size_bytes', v_intent.declared_size_bytes,
      'declared_sha256', v_intent.declared_sha256
    );
  end if;

  if p_canonical_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_records_bucket <> 'drs-case-records-private'
    or p_records_object_key <> v_intent.records_object_key
    or p_verified_sha256 <> v_intent.declared_sha256
    or p_verified_size_bytes <> v_intent.declared_size_bytes
    or p_detected_mime <> v_intent.declared_mime
  then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'VALIDATION_MISMATCH', 'newEffects', 0
    );
  end if;

  v_resource_canonical :=
    'schemaVersion=laibe.drs-document-finalize-domain-command.internal.v1' || pg_catalog.chr(10) ||
    'intentRef=' || p_intent_ref || pg_catalog.chr(10) ||
    'recordsBucket=' || p_records_bucket || pg_catalog.chr(10) ||
    'recordsObjectKey=' || p_records_object_key || pg_catalog.chr(10) ||
    'verifiedSha256=' || p_verified_sha256 || pg_catalog.chr(10) ||
    'verifiedSizeBytes=' || p_verified_size_bytes::text || pg_catalog.chr(10) ||
    'detectedMime=' || p_detected_mime || pg_catalog.chr(10) ||
    'requestPayloadSha256=' || p_finalize_request_payload_sha256;
  if p_canonical_payload_sha256 <> pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_resource_canonical, 'UTF8'), 'sha256'),
    'hex'
  ) then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'VALIDATION_MISMATCH', 'newEffects', 0
    );
  end if;

  if exists (
    select 1
    from casework.document_versions version_record
    where version_record.id = v_intent.planned_version_id
  ) or exists (
    select 1
    from casework.document_operation_receipts receipt_record
    where receipt_record.actor_user_id = p_actor_user_id
      and receipt_record.operation = 'FINALIZE_UPLOAD'
      and receipt_record.idempotency_key = p_idempotency_key
  ) or exists (
    select 1
    from casework.document_audience_read_projections audience_projection
    where audience_projection.case_id = p_case_id
      and audience_projection.document_id = v_document.id
      and audience_projection.version_id = v_intent.planned_version_id
  ) then
    return pg_catalog.jsonb_build_object(
      'ok', false, 'state', 'DOCUMENT_FINALIZE_CONFLICT', 'newEffects', 0
    );
  end if;

  select coalesce(pg_catalog.max(version_record.version_no), 0) + 1
  into v_version_no
  from casework.document_versions version_record
  where version_record.document_id = v_document.id;
  v_receipt_id := extensions.gen_random_uuid();
  v_receipt_ref := 'rcp_' || pg_catalog.replace(v_receipt_id::text, '-', '');

  begin
    insert into casework.document_versions(
      id, case_id, document_id, version_ref, version_no, previous_version_id,
      created_by, sha256, size_bytes, detected_mime, validation_state,
      lifecycle_state, idempotency_key, payload_sha256
    ) values (
      v_intent.planned_version_id, p_case_id, v_document.id,
      v_intent.planned_version_ref, v_version_no, v_document.current_version_id,
      p_actor_user_id, p_verified_sha256, p_verified_size_bytes,
      p_detected_mime, 'FORMAL', 'ACTIVE', p_idempotency_key,
      p_canonical_payload_sha256
    );

    insert into casework.document_version_sources(
      case_id, document_id, version_id, bucket_id, object_key, sha256,
      size_bytes, detected_mime, validation_state
    ) values (
      p_case_id, v_document.id, v_intent.planned_version_id,
      'drs-case-records-private', p_records_object_key, p_verified_sha256,
      p_verified_size_bytes, p_detected_mime, 'CLEAN'
    );

    insert into casework.document_operation_receipts(
      id, receipt_ref, case_id, operation, receipt_state, actor_user_id,
      idempotency_key, payload_sha256, document_id, document_version_id
    ) values (
      v_receipt_id, v_receipt_ref, p_case_id, 'FINALIZE_UPLOAD',
      'FORMAL_VERSION_CREATED', p_actor_user_id, p_idempotency_key,
      p_canonical_payload_sha256, v_document.id, v_intent.planned_version_id
    );

    update casework.documents set
      current_version_id = v_intent.planned_version_id,
      document_status = 'ACTIVE',
      updated_at = v_now
    where case_id = p_case_id and id = v_document.id;

    update casework.document_upload_intents set
      intent_state = 'FORMALIZED',
      finalize_idempotency_key = p_idempotency_key,
      finalize_request_payload_sha256 = p_finalize_request_payload_sha256,
      finalized_at = v_now
    where case_id = p_case_id and intent_id = v_intent.intent_id;

    v_evidence := pg_catalog.jsonb_build_object(
      'uploadIntentRef', v_intent.intent_ref,
      'documentRef', v_document.document_ref,
      'documentVersionRef', v_intent.planned_version_ref,
      'documentSha256', p_verified_sha256,
      'documentOperationReceiptRef', v_receipt_ref,
      'recordsObjectKey', p_records_object_key,
      'finalizeRequestPayloadSha256', p_finalize_request_payload_sha256
    );

    v_apply := drs_case_command_private.apply_document_version_formalized_v1(
      p_case_id,
      p_actor_user_id,
      p_actor_auth_session_id,
      p_actor_authority_membership_id,
      p_actor_role,
      p_authority_version,
      p_command_id,
      p_idempotency_key,
      p_expected_case_version,
      p_canonical_payload_sha256,
      v_evidence,
      v_intent.intent_id,
      v_document.id,
      v_intent.planned_version_id,
      v_receipt_id
    );
    if v_apply ->> 'state' <> 'APPLIED'
      or (v_apply ->> 'newEffects')::integer <> 1
    then
      raise exception 'DOCUMENT_FORMALIZE_DOMAIN_COMMAND_REJECTED';
    end if;

    if v_expected_visibility = 'PARTY_VISIBLE' then
      insert into casework.document_audience_read_projections(
        case_id, document_id, version_id, audience_role, receipt_id,
        document_ref, version_ref, receipt_ref, document_kind, visibility,
        source_role, sha256, size_bytes, detected_mime, finalized_at
      )
      select
        p_case_id, v_document.id, v_intent.planned_version_id,
        audience.role, v_receipt_id, v_document.document_ref,
        v_intent.planned_version_ref, v_receipt_ref, v_document.document_kind,
        v_expected_visibility, v_document.source_role, p_verified_sha256,
        p_verified_size_bytes, p_detected_mime, v_now
      from pg_catalog.unnest(array['owner', 'vendor', 'drs']) as audience(role);
    else
      insert into casework.document_audience_read_projections(
        case_id, document_id, version_id, audience_role, receipt_id,
        document_ref, version_ref, receipt_ref, document_kind, visibility,
        source_role, sha256, size_bytes, detected_mime, finalized_at
      ) values (
        p_case_id, v_document.id, v_intent.planned_version_id, 'drs',
        v_receipt_id, v_document.document_ref, v_intent.planned_version_ref,
        v_receipt_ref, v_document.document_kind, v_expected_visibility,
        v_document.source_role, p_verified_sha256, p_verified_size_bytes,
        p_detected_mime, v_now
      );
    end if;

    if (
      select pg_catalog.count(*)
      from casework.document_audience_read_projections audience_projection
      where audience_projection.case_id = p_case_id
        and audience_projection.document_id = v_document.id
        and audience_projection.version_id = v_intent.planned_version_id
    ) <> v_expected_projection_count then
      raise exception 'DOCUMENT_AUDIENCE_PROJECTION_COUNT_INVALID';
    end if;
  exception
    when others then
      return pg_catalog.jsonb_build_object(
        'ok', false, 'state', 'CONTEXT_UNAVAILABLE', 'newEffects', 0
      );
  end;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'state', 'APPLIED',
    'newEffects', 1,
    'document_ref', v_document.document_ref,
    'version_ref', v_intent.planned_version_ref,
    'receipt_ref', v_receipt_ref,
    'receipt', v_apply -> 'receipt',
    'receiptCanonical', v_apply ->> 'receiptCanonical',
    'receiptSha256', v_apply ->> 'receiptSha256'
  );
end;
$function$;

create function public.server_document_finalize_domain_command_v1(
  p_action text,
  p_actor_user_id uuid,
  p_actor_auth_session_id uuid,
  p_case_id uuid,
  p_actor_authority_membership_id uuid,
  p_actor_role text,
  p_authority_version bigint,
  p_next_actor text,
  p_intent_ref text,
  p_idempotency_key text,
  p_command_id uuid,
  p_expected_case_version bigint,
  p_finalize_request_payload_sha256 text,
  p_canonical_payload_sha256 text,
  p_records_bucket text,
  p_records_object_key text,
  p_verified_sha256 text,
  p_verified_size_bytes bigint,
  p_detected_mime text
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $function$
  select drs_document_storage_private.finalize_domain_command_v1(
    p_action,
    p_actor_user_id,
    p_actor_auth_session_id,
    p_case_id,
    p_actor_authority_membership_id,
    p_actor_role,
    p_authority_version,
    p_next_actor,
    p_intent_ref,
    p_idempotency_key,
    p_command_id,
    p_expected_case_version,
    p_finalize_request_payload_sha256,
    p_canonical_payload_sha256,
    p_records_bucket,
    p_records_object_key,
    p_verified_sha256,
    p_verified_size_bytes,
    p_detected_mime
  );
$function$;

alter function
  drs_document_storage_private.reject_projection_mutation_v1()
  owner to postgres;
alter function drs_document_storage_private.finalize_domain_command_v1(
  text, uuid, uuid, uuid, uuid, text, bigint, text, text, text, uuid,
  bigint, text, text, text, text, text, bigint, text
) owner to postgres;
alter function public.server_document_finalize_domain_command_v1(
  text, uuid, uuid, uuid, uuid, text, bigint, text, text, text, uuid,
  bigint, text, text, text, text, text, bigint, text
) owner to postgres;

revoke all on function
  drs_document_storage_private.reject_projection_mutation_v1()
  from public, anon, authenticated, service_role;
revoke all on function
  drs_document_storage_private.finalize_domain_command_v1(
    text, uuid, uuid, uuid, uuid, text, bigint, text, text, text, uuid,
    bigint, text, text, text, text, text, bigint, text
  ) from public, anon, authenticated, service_role;
revoke all on function public.server_document_finalize_domain_command_v1(
  text, uuid, uuid, uuid, uuid, text, bigint, text, text, text, uuid,
  bigint, text, text, text, text, text, bigint, text
) from public, anon, authenticated, service_role;
grant execute on function public.server_document_finalize_domain_command_v1(
  text, uuid, uuid, uuid, uuid, text, bigint, text, text, text, uuid,
  bigint, text, text, text, text, text, bigint, text
) to service_role;

commit;
