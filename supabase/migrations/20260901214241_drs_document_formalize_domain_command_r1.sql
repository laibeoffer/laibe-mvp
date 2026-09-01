begin;

do $preimage$
begin
  if to_regnamespace('drs_case_command_private') is null
    or to_regclass('casework.case_commands') is null
    or to_regclass('casework.case_events') is null
    or to_regclass('casework.case_state_projection') is null
    or to_regclass('casework.drs_three_role_case_authority') is null
    or to_regclass('casework.drs_three_role_memberships') is null
    or to_regclass('casework.documents') is null
    or to_regclass('casework.document_versions') is null
    or to_regclass('casework.document_version_sources') is null
    or to_regclass('casework.document_upload_intents') is null
    or to_regclass('casework.document_operation_receipts') is null
    or to_regclass('integration.drs_three_role_auth_session_bindings') is null
    or to_regclass('integration.drs_three_role_server_sessions') is null
    or to_regprocedure(
      'drs_case_command_private.projection_canonical_v1(uuid,bigint,text,text,timestamptz,uuid,bigint)'
    ) is null
    or to_regprocedure(
      'drs_case_command_private.command_receipt_canonical_v1(uuid,uuid,uuid,bigint,bigint,text,text,text,timestamptz,text,text)'
    ) is null
    or to_regprocedure(
      'drs_case_command_private.sha256_hex_v1(text)'
    ) is null
  then
    raise exception 'DOCUMENT_FORMALIZE_DOMAIN_COMMAND_PREIMAGE_MISMATCH';
  end if;

  if to_regprocedure(
    'drs_case_command_private.lock_case_command_v1(uuid)'
  ) is not null
    or to_regprocedure(
      'drs_case_command_private.apply_document_version_formalized_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid)'
    ) is not null
  then
    raise exception 'DOCUMENT_FORMALIZE_DOMAIN_COMMAND_ALREADY_EXISTS';
  end if;
end;
$preimage$;

create function drs_case_command_private.lock_case_command_v1(
  p_case_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_case_id::text, 901120260902)
  );

  perform 1
  from casework.case_state_projection projection_record
  where projection_record.case_id = p_case_id
  for update;
end;
$function$;

create function drs_case_command_private.apply_document_version_formalized_v1(
  p_case_id uuid,
  p_actor_user_id uuid,
  p_actor_auth_session_id uuid,
  p_actor_authority_membership_id uuid,
  p_actor_role text,
  p_authority_version bigint,
  p_command_id uuid,
  p_idempotency_key text,
  p_expected_case_version bigint,
  p_canonical_payload_sha256 text,
  p_evidence_refs jsonb,
  p_upload_intent_id uuid,
  p_document_id uuid,
  p_document_version_id uuid,
  p_document_receipt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_projection casework.case_state_projection%rowtype;
  v_projection_after casework.case_state_projection%rowtype;
  v_existing_command casework.case_commands%rowtype;
  v_existing_event casework.case_events%rowtype;
  v_intent casework.document_upload_intents%rowtype;
  v_document casework.documents%rowtype;
  v_version casework.document_versions%rowtype;
  v_source casework.document_version_sources%rowtype;
  v_document_receipt casework.document_operation_receipts%rowtype;
  v_event casework.case_events%rowtype;
  v_event_id uuid := extensions.gen_random_uuid();
  v_receipt jsonb;
  v_receipt_canonical text;
  v_receipt_sha256 text;
  v_baseline_role text;
begin
  if p_case_id is null
    or p_actor_user_id is null
    or p_actor_auth_session_id is null
    or p_actor_authority_membership_id is null
    or p_actor_role not in ('owner', 'vendor', 'drs')
    or p_authority_version is null
    or p_authority_version < 1
    or p_command_id is null
    or p_idempotency_key is null
    or pg_catalog.length(p_idempotency_key) not between 16 and 128
    or p_idempotency_key ~ '[[:space:][:cntrl:]]'
    or p_expected_case_version is null
    or p_expected_case_version < 1
    or p_canonical_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_evidence_refs is null
    or pg_catalog.jsonb_typeof(p_evidence_refs) <> 'object'
    or p_upload_intent_id is null
    or p_document_id is null
    or p_document_version_id is null
    or p_document_receipt_id is null
  then
    return pg_catalog.jsonb_build_object(
      'state', 'INVALID_REQUEST',
      'newEffects', 0
    );
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.jsonb_object_keys(p_evidence_refs)
  ) <> 7
    or not (
      p_evidence_refs ?& array[
        'uploadIntentRef',
        'documentRef',
        'documentVersionRef',
        'documentSha256',
        'documentOperationReceiptRef',
        'recordsObjectKey',
        'finalizeRequestPayloadSha256'
      ]
    )
    or exists (
    select 1
    from pg_catalog.jsonb_each(p_evidence_refs) evidence_entry
    where pg_catalog.jsonb_typeof(evidence_entry.value) <> 'string'
      or pg_catalog.length(pg_catalog.btrim(evidence_entry.value #>> '{}')) = 0
  )
    or p_evidence_refs ->> 'documentSha256' !~ '^[a-f0-9]{64}$'
    or p_evidence_refs ->> 'finalizeRequestPayloadSha256'
      !~ '^[a-f0-9]{64}$'
  then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  perform drs_case_command_private.lock_case_command_v1(p_case_id);

  select projection_record.*
  into v_projection
  from casework.case_state_projection projection_record
  where projection_record.case_id = p_case_id
  for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from auth.sessions auth_session
  where auth_session.id = p_actor_auth_session_id
    and auth_session.user_id = p_actor_user_id
    and (
      auth_session.not_after is null
      or auth_session.not_after > v_now
    )
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from integration.drs_three_role_auth_session_bindings binding_record
  where binding_record.auth_session_id = p_actor_auth_session_id
    and binding_record.user_id = p_actor_user_id
    and binding_record.membership_id =
      p_actor_authority_membership_id
    and binding_record.authority_version = p_authority_version
    and binding_record.bound_at <= v_now
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from integration.drs_three_role_server_sessions server_session
  where server_session.auth_session_id = p_actor_auth_session_id
    and server_session.user_id = p_actor_user_id
    and server_session.membership_id =
      p_actor_authority_membership_id
    and server_session.authority_version = p_authority_version
    and server_session.issued_at <= v_now
    and server_session.expires_at > v_now
    and server_session.revoked_at is null
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from casework.drs_three_role_case_authority authority_record
  where authority_record.case_id = p_case_id
    and authority_record.authority_version = p_authority_version
    and authority_record.next_actor = v_projection.next_actor
  for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  perform 1
  from casework.drs_three_role_memberships membership_record
  where membership_record.membership_id =
      p_actor_authority_membership_id
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
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  v_baseline_role := case p_actor_role
    when 'owner' then 'owner'
    when 'vendor' then 'pro'
    when 'drs' then 'pcm'
  end;
  perform 1
  from casework.case_members baseline_membership
  where baseline_membership.case_id = p_case_id
    and baseline_membership.user_id = p_actor_user_id
    and baseline_membership.role::text = v_baseline_role
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID',
      'newEffects', 0
    );
  end if;

  select command_record.*
  into v_existing_command
  from casework.case_commands command_record
  where command_record.case_id = p_case_id
    and command_record.command_type = 'FORMALIZE_DOCUMENT_VERSION'
    and command_record.idempotency_key = p_idempotency_key;
  if found then
    select event_record.*
    into v_existing_event
    from casework.case_events event_record
    where event_record.case_id = p_case_id
      and event_record.event_id = v_existing_command.event_id;

    if v_existing_command.command_id = p_command_id
      and v_existing_command.expected_case_version =
        p_expected_case_version
      and v_existing_command.canonical_payload_sha256 =
        p_canonical_payload_sha256
      and v_existing_command.evidence_refs = p_evidence_refs
      and v_existing_command.actor_user_id = p_actor_user_id
      and v_existing_command.actor_auth_session_id =
        p_actor_auth_session_id
      and v_existing_command.actor_authority_membership_id =
        p_actor_authority_membership_id
      and v_existing_command.actor_role = p_actor_role
      and v_existing_command.authority_version = p_authority_version
      and v_existing_event.document_id = p_document_id
      and v_existing_event.document_version_id = p_document_version_id
      and v_existing_event.receipt_id = p_document_receipt_id
    then
      return pg_catalog.jsonb_build_object(
        'state', 'REPLAYED',
        'newEffects', 0,
        'receipt', v_existing_command.receipt,
        'receiptCanonical', v_existing_command.receipt_canonical,
        'receiptSha256', v_existing_command.receipt_sha256
      );
    end if;

    return pg_catalog.jsonb_build_object(
      'state', 'IDEMPOTENCY_CONFLICT',
      'newEffects', 0
    );
  end if;

  if exists (
    select 1
    from casework.case_commands command_record
    where command_record.case_id = p_case_id
      and command_record.command_id = p_command_id
  ) then
    return pg_catalog.jsonb_build_object(
      'state', 'IDEMPOTENCY_CONFLICT',
      'newEffects', 0
    );
  end if;

  if v_projection.case_version <> p_expected_case_version then
    return pg_catalog.jsonb_build_object(
      'state', 'CASE_VERSION_CONFLICT',
      'newEffects', 0
    );
  end if;

  select intent_record.*
  into v_intent
  from casework.document_upload_intents intent_record
  where intent_record.case_id = p_case_id
    and intent_record.intent_id = p_upload_intent_id
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  select document_record.*
  into v_document
  from casework.documents document_record
  where document_record.case_id = p_case_id
    and document_record.id = p_document_id
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  select version_record.*
  into v_version
  from casework.document_versions version_record
  where version_record.case_id = p_case_id
    and version_record.document_id = p_document_id
    and version_record.id = p_document_version_id
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  select source_record.*
  into v_source
  from casework.document_version_sources source_record
  where source_record.case_id = p_case_id
    and source_record.document_id = p_document_id
    and source_record.version_id = p_document_version_id
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  select receipt_record.*
  into v_document_receipt
  from casework.document_operation_receipts receipt_record
  where receipt_record.case_id = p_case_id
    and receipt_record.id = p_document_receipt_id
  for share;
  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  if v_intent.created_by <> p_actor_user_id
    or v_version.created_by <> p_actor_user_id
    or v_document_receipt.actor_user_id <> p_actor_user_id
  then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_NOT_AUTHORIZED',
      'newEffects', 0
    );
  end if;

  if v_intent.intent_ref <> p_evidence_refs ->> 'uploadIntentRef'
    or v_intent.document_id <> p_document_id
    or v_intent.planned_version_id <> p_document_version_id
    or v_intent.planned_version_ref <> v_version.version_ref
    or v_document.document_ref <> p_evidence_refs ->> 'documentRef'
    or v_version.version_ref <>
      p_evidence_refs ->> 'documentVersionRef'
    or v_version.sha256 <> p_evidence_refs ->> 'documentSha256'
    or v_intent.declared_sha256 <> v_version.sha256
    or v_source.sha256 <> v_version.sha256
    or v_document_receipt.receipt_ref <>
      p_evidence_refs ->> 'documentOperationReceiptRef'
    or v_intent.records_object_key <>
      p_evidence_refs ->> 'recordsObjectKey'
    or v_source.object_key <> v_intent.records_object_key
    or v_intent.finalize_request_payload_sha256 <>
      p_evidence_refs ->> 'finalizeRequestPayloadSha256'
    or v_document_receipt.document_id <> p_document_id
    or v_document_receipt.document_version_id <>
      p_document_version_id
    or v_intent.finalize_idempotency_key <> p_idempotency_key
    or v_version.idempotency_key <> p_idempotency_key
    or v_document_receipt.idempotency_key <> p_idempotency_key
    or v_version.payload_sha256 <> p_canonical_payload_sha256
    or v_document_receipt.payload_sha256 <>
      p_canonical_payload_sha256
  then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_EVIDENCE_INVALID',
      'newEffects', 0
    );
  end if;

  if v_intent.intent_state <> 'FORMALIZED'
    or v_intent.finalized_at is null
    or v_document.document_status <> 'ACTIVE'
    or v_document.current_version_id is distinct from
      p_document_version_id
    or v_version.validation_state <> 'FORMAL'
    or v_version.lifecycle_state <> 'ACTIVE'
    or v_source.validation_state <> 'CLEAN'
    or v_source.bucket_id <> 'drs-case-records-private'
    or v_source.size_bytes <> v_version.size_bytes
    or v_source.detected_mime <> v_version.detected_mime
    or v_document_receipt.operation <> 'FINALIZE_UPLOAD'
    or v_document_receipt.receipt_state <>
      'FORMAL_VERSION_CREATED'
    or exists (
      select 1
      from casework.case_events legacy_event
      where legacy_event.case_id = p_case_id
        and legacy_event.event_type = 'DOCUMENT_VERSION_FORMALIZED'
        and legacy_event.document_id = p_document_id
        and legacy_event.document_version_id = p_document_version_id
        and legacy_event.command_id is null
    )
  then
    return pg_catalog.jsonb_build_object(
      'state', 'DOCUMENT_FINALIZE_CONFLICT',
      'newEffects', 0
    );
  end if;

  begin
    insert into casework.case_events(
      event_id,
      case_id,
      event_type,
      actor_user_id,
      idempotency_key,
      payload_sha256,
      payload,
      document_id,
      document_version_id,
      receipt_id,
      journey_state_impact,
      command_id,
      command_type,
      catalog_ordinal,
      catalog_schema_version,
      catalog_hash,
      actor_auth_session_id,
      actor_authority_membership_id,
      actor_role,
      authority_version,
      from_state,
      to_state,
      next_actor,
      due_time,
      evidence_refs
    ) values (
      v_event_id,
      p_case_id,
      'DOCUMENT_VERSION_FORMALIZED',
      p_actor_user_id,
      p_idempotency_key,
      p_canonical_payload_sha256,
      p_evidence_refs,
      p_document_id,
      p_document_version_id,
      p_document_receipt_id,
      'NONE',
      p_command_id,
      'FORMALIZE_DOCUMENT_VERSION',
      null,
      null,
      null,
      p_actor_auth_session_id,
      p_actor_authority_membership_id,
      p_actor_role,
      p_authority_version,
      v_projection.current_state,
      v_projection.current_state,
      v_projection.next_actor,
      v_projection.due_time,
      p_evidence_refs
    )
    returning * into v_event;

    select projection_record.*
    into strict v_projection_after
    from casework.case_state_projection projection_record
    where projection_record.case_id = p_case_id;

    if v_projection_after.case_version <>
        v_projection.case_version + 1
      or v_projection_after.last_sequence_no <>
        v_projection.last_sequence_no + 1
      or v_projection_after.current_state <>
        v_projection.current_state
      or v_projection_after.next_actor <> v_projection.next_actor
      or v_projection_after.due_time is distinct from
        v_projection.due_time
      or v_projection_after.catalog_schema_version <>
        v_projection.catalog_schema_version
      or v_projection_after.catalog_hash <> v_projection.catalog_hash
    then
      raise exception 'DOCUMENT_FORMALIZE_PROJECTION_DRIFT';
    end if;

    v_receipt := pg_catalog.jsonb_build_object(
      'schemaVersion', 'laibe.drs.command-receipt.v1',
      'commandId', p_command_id::text,
      'caseId', p_case_id::text,
      'eventId', v_event.event_id::text,
      'sequenceNo', v_event.sequence_no,
      'caseVersion', v_event.case_version,
      'fromState', v_projection.current_state,
      'toState', v_projection.current_state,
      'nextActor', v_projection.next_actor,
      'recordedAt', pg_catalog.to_char(
        v_event.occurred_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ),
      'catalogSchemaVersion', null,
      'catalogHash', null
    );
    v_receipt_canonical :=
      drs_case_command_private.command_receipt_canonical_v1(
        p_command_id,
        p_case_id,
        v_event.event_id,
        v_event.sequence_no,
        v_event.case_version,
        v_projection.current_state,
        v_projection.current_state,
        v_projection.next_actor,
        v_event.occurred_at,
        null,
        null
      );
    v_receipt_sha256 :=
      drs_case_command_private.sha256_hex_v1(v_receipt_canonical);

    insert into casework.case_commands(
      case_id,
      command_id,
      command_type,
      idempotency_key,
      expected_case_version,
      canonical_payload_sha256,
      evidence_refs,
      due_time,
      actor_user_id,
      actor_auth_session_id,
      actor_authority_membership_id,
      actor_role,
      authority_version,
      event_id,
      receipt,
      receipt_canonical,
      receipt_sha256,
      recorded_at
    ) values (
      p_case_id,
      p_command_id,
      'FORMALIZE_DOCUMENT_VERSION',
      p_idempotency_key,
      p_expected_case_version,
      p_canonical_payload_sha256,
      p_evidence_refs,
      v_projection.due_time,
      p_actor_user_id,
      p_actor_auth_session_id,
      p_actor_authority_membership_id,
      p_actor_role,
      p_authority_version,
      v_event.event_id,
      v_receipt,
      v_receipt_canonical,
      v_receipt_sha256,
      v_event.occurred_at
    );
  exception
    when unique_violation then
      return pg_catalog.jsonb_build_object(
        'state', 'DOCUMENT_FINALIZE_CONFLICT',
        'newEffects', 0
      );
  end;

  return pg_catalog.jsonb_build_object(
    'state', 'APPLIED',
    'newEffects', 1,
    'receipt', v_receipt,
    'receiptCanonical', v_receipt_canonical,
    'receiptSha256', v_receipt_sha256
  );
end;
$function$;

alter function drs_case_command_private.lock_case_command_v1(uuid)
  owner to postgres;
alter function drs_case_command_private.apply_document_version_formalized_v1(
  uuid, uuid, uuid, uuid, text, bigint, uuid, text, bigint, text, jsonb,
  uuid, uuid, uuid, uuid
) owner to postgres;

revoke all on function
  drs_case_command_private.lock_case_command_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function
  drs_case_command_private.apply_document_version_formalized_v1(
    uuid, uuid, uuid, uuid, text, bigint, uuid, text, bigint, text, jsonb,
    uuid, uuid, uuid, uuid
  )
  from public, anon, authenticated, service_role;

commit;
