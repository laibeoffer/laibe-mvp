begin;

do $preimage$
begin
  if to_regclass('casework.case_events') is null
    or to_regclass('casework.documents') is null
    or to_regclass('casework.document_versions') is null
    or to_regclass('casework.drs_three_role_memberships') is null
    or to_regclass('casework.drs_three_role_case_authority') is null
    or to_regprocedure(
      'public.drs_three_role_server_session_verify_v1(uuid,text,uuid,uuid)'
    ) is null
    or to_regprocedure('casework.case_event_immutable_v1()') is null
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_events'
        and column_name = 'payload_sha256' and data_type = 'text'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_events'
        and column_name = 'payload' and data_type = 'jsonb'
    )
  then
    raise exception 'TASK3_PREDECESSOR_PREIMAGE_MISMATCH';
  end if;
end;
$preimage$;

lock table casework.case_events in access exclusive mode;

create schema drs_case_command_private;
revoke all on schema drs_case_command_private from public, anon, authenticated, service_role;

create table casework.case_transition_catalog (
  ordinal smallint primary key check (ordinal between 1 and 22),
  step text not null,
  from_state text not null,
  command_type text not null,
  event_type text not null,
  allowed_roles text[] not null,
  to_state text not null,
  next_actor_rule text not null,
  required_evidence_refs text[] not null,
  effects0_denial_sets text[] not null,
  boundary text not null,
  schema_version text not null check (
    schema_version = 'laibe.drs.a4-transition-catalog.pre-ready.v1'
  ),
  catalog_hash text not null check (
    catalog_hash = '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'
  ),
  unique (from_state, command_type),
  check (cardinality(allowed_roles) >= 1),
  check (allowed_roles <@ array['owner', 'vendor', 'drs']::text[]),
  check (cardinality(required_evidence_refs) >= 1)
);

insert into casework.case_transition_catalog(
  ordinal, step, from_state, command_type, event_type, allowed_roles,
  to_state, next_actor_rule, required_evidence_refs, effects0_denial_sets,
  boundary, schema_version, catalog_hash
) values
  (1,'1','CASE_PREPARATION','RECORD_QUOTE_HEALTHCHECK_OUTCOME','QUOTE_HEALTHCHECK_OUTCOME_RECORDED',array['drs'],'QUOTE_HEALTHCHECK_RECORDED','DRS_IF_DRAWING_INPUT_READY_ELSE_OWNER',array['analysisRunRef','citationSetRef','quoteDocumentVersionRef','quoteSha256','reviewDecisionRef'],array['D0','D1'],'PROVISIONAL_TASK5_6','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (2,'2','QUOTE_HEALTHCHECK_RECORDED','RECORD_DRAWING_HEALTHCHECK_OUTCOME','DRAWING_HEALTHCHECK_OUTCOME_RECORDED',array['drs'],'DRAWING_HEALTHCHECK_RECORDED','DRS_IF_CONTRACT_INPUT_READY_ELSE_OWNER',array['analysisRunRef','citationSetRef','drawingDocumentVersionRef','drawingSha256','reviewDecisionRef'],array['D0','D1'],'PROVISIONAL_TASK5_6','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (3,'3','DRAWING_HEALTHCHECK_RECORDED','RECORD_CONTRACT_HEALTHCHECK_OUTCOME','CONTRACT_HEALTHCHECK_OUTCOME_RECORDED',array['drs'],'CONTRACT_HEALTHCHECK_RECORDED','owner',array['analysisRunRef','citationSetRef','contractDocumentVersionRef','contractSha256','reviewDecisionRef','rulesetRef'],array['D0','D1'],'PROVISIONAL_TASK5_6_HUMAN_RULESET','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (4,'4','CONTRACT_HEALTHCHECK_RECORDED','SUBMIT_SERVICE_CONTRACT_INTENT','SERVICE_CONTRACT_INTENT_SUBMITTED',array['owner'],'SERVICE_CONTRACT_COUNTERSIGN_PENDING','drs',array['attachmentManifestSha256','ownerIntentReceiptRef','previewReceiptRef','serviceContractSha256','serviceContractVersionRef'],array['D0','D2'],'PROVISIONAL_TASK7_HUMAN_PROVIDER','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (5,'5','SERVICE_CONTRACT_COUNTERSIGN_PENDING','RECORD_SERVICE_CONTRACT_COUNTERSIGN_INTENT','SERVICE_CONTRACT_COUNTERSIGN_INTENT_RECORDED',array['drs'],'SERVICE_CONTRACT_INTENTS_RECORDED','drs',array['attachmentManifestSha256','drsIntentReceiptRef','drsSignerAuthorityRef','ownerIntentReceiptRef','serviceContractSha256','serviceContractVersionRef'],array['D0','D2'],'PROVISIONAL_TASK7_HUMAN_PROVIDER','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (6,'6','SERVICE_CONTRACT_INTENTS_RECORDED','CONFIRM_LINE_CASE_CHANNEL','LINE_CASE_CHANNEL_CONFIRMED',array['drs'],'LINE_CASE_CHANNEL_CONFIRMED','vendor',array['lineAccountBindingRefs','lineGroupBindingRef','threePartyConsentRefs'],array['D0','D3'],'PROVISIONAL_TASK8_HUMAN_POLICY','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (7,'7','LINE_CASE_CHANNEL_CONFIRMED','SUBMIT_VENDOR_BUNDLE','VENDOR_BUNDLE_SUBMITTED',array['vendor'],'VENDOR_BUNDLE_SUBMITTED','OWNER_OR_VENDOR_UNFULFILLED_SIGNER',array['bundleManifestSha256','calendarEventLinkRefs','documentVersionRefs','submissionBundleRef'],array['D0','D4'],'PROVISIONAL_TASK9_10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (8,'8','VENDOR_BUNDLE_SUBMITTED','RECORD_OWNER_VENDOR_SIGNATURE_INTENT','OWNER_VENDOR_SIGNATURE_INTENT_RECORDED',array['owner','vendor'],'OWNER_VENDOR_COUNTERSIGN_PENDING','REMAINING_REQUIRED_SIGNER',array['attachmentManifestSha256','contractSha256','ownerVendorContractVersionRef','signerIntentReceiptRef'],array['D0','D5'],'PROVISIONAL_TASK7_HUMAN_PROVIDER','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (9,'8','OWNER_VENDOR_COUNTERSIGN_PENDING','RECORD_OWNER_VENDOR_SIGNATURE_INTENT','OWNER_VENDOR_SIGNATURE_INTENT_RECORDED',array['owner','vendor'],'OWNER_VENDOR_INTENTS_RECORDED','owner',array['attachmentManifestSha256','contractSha256','ownerVendorContractVersionRef','priorSignerIntentReceiptRef','signerIntentReceiptRef'],array['D0','D5'],'PROVISIONAL_TASK7_HUMAN_PROVIDER','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (10,'9','OWNER_VENDOR_INTENTS_RECORDED','RECORD_EXTERNAL_PAYMENT_EVIDENCE','EXTERNAL_PAYMENT_EVIDENCE_RECORDED',array['owner'],'PAYMENT_EVIDENCE_REVIEW_PENDING','drs',array['ownerStatementRef','paymentEvidenceSha256','paymentEvidenceVersionRef'],array['D0','D6'],'PROVISIONAL_TASK10_HUMAN_PAYMENT_POLICY','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (11,'9','PAYMENT_EVIDENCE_REVIEW_PENDING','RECORD_PAYMENT_EVIDENCE_REVIEW','PAYMENT_EVIDENCE_REVIEW_RECORDED',array['drs'],'PAYMENT_EVIDENCE_REVIEWED','vendor',array['ownerStatementRef','paymentEvidenceReviewRef','paymentEvidenceSha256','paymentEvidenceVersionRef'],array['D0','D6'],'PROVISIONAL_TASK10_HUMAN_PAYMENT_POLICY','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (12,'10','PAYMENT_EVIDENCE_REVIEWED','SUBMIT_MOBILIZATION_EVIDENCE','MOBILIZATION_EVIDENCE_SUBMITTED',array['vendor'],'MOBILIZATION_OWNER_CONFIRMATION_PENDING','owner',array['calendarEventReceiptRef','mobilizationEvidenceSha256','mobilizationEvidenceVersionRef','paymentEvidenceReviewRef'],array['D0','D7'],'PROVISIONAL_TASK9_10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (13,'10','MOBILIZATION_OWNER_CONFIRMATION_PENDING','RECORD_OWNER_MOBILIZATION_CONFIRMATION','OWNER_MOBILIZATION_CONFIRMATION_RECORDED',array['owner'],'MOBILIZATION_DRS_CONFIRMATION_PENDING','drs',array['calendarEventReceiptRef','mobilizationEvidenceSha256','mobilizationEvidenceVersionRef','ownerConfirmationRef','vendorMobilizationReceiptRef'],array['D0','D7'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (14,'10','MOBILIZATION_DRS_CONFIRMATION_PENDING','RECORD_DRS_MOBILIZATION_CONFIRMATION','DRS_MOBILIZATION_CONFIRMATION_RECORDED',array['drs'],'MOBILIZATION_RECORDED','vendor',array['calendarEventReceiptRef','drsConfirmationRef','mobilizationEvidenceSha256','mobilizationEvidenceVersionRef','ownerConfirmationRef','vendorMobilizationReceiptRef'],array['D0','D7'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (15,'11','MOBILIZATION_RECORDED','SUBMIT_FIRST_MILESTONE_EVIDENCE','FIRST_MILESTONE_EVIDENCE_SUBMITTED',array['vendor'],'FIRST_MILESTONE_REVIEW_PENDING','drs',array['milestoneEvidenceManifestSha256','milestoneEvidenceVersionRefs','milestoneRef','submissionReceiptRef'],array['D0','D8'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (16,'11','FIRST_MILESTONE_REVIEW_PENDING','RECORD_FIRST_MILESTONE_WRITTEN_REVIEW','FIRST_MILESTONE_WRITTEN_REVIEW_RECORDED',array['drs'],'FIRST_MILESTONE_REVIEW_RECORDED','owner',array['citationSetRef','firstMilestoneSubmissionRef','reviewDecisionRef','writtenOutcomeRef'],array['D0','D8'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (17,'11A','FIRST_MILESTONE_REVIEW_RECORDED','RECORD_OWNER_MILESTONE_DECISION','OWNER_MILESTONE_DECISION_RECORDED',array['owner'],'SECOND_MILESTONE_EVIDENCE_PENDING','vendor',array['firstMilestoneReviewRef','ownerDecisionRef'],array['D0','D8'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (18,'12','SECOND_MILESTONE_EVIDENCE_PENDING','SUBMIT_SECOND_MILESTONE_EVIDENCE','SECOND_MILESTONE_EVIDENCE_SUBMITTED',array['vendor'],'SECOND_MILESTONE_REVIEW_PENDING','drs',array['milestoneEvidenceManifestSha256','milestoneEvidenceVersionRefs','secondMilestoneRef','submissionReceiptRef'],array['D0','D8'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (19,'12','SECOND_MILESTONE_REVIEW_PENDING','REQUEST_SUPPLEMENT','SUPPLEMENT_REQUEST_RECORDED',array['drs'],'SUPPLEMENT_REQUESTED','vendor',array['dueTime','missingItemRefs','priorReviewRef','secondMilestoneSubmissionRef','supplementRequestRef'],array['D0','D9'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (20,'13','SUPPLEMENT_REQUESTED','SUBMIT_SUPPLEMENT_VERSION','SUPPLEMENT_VERSION_SUBMITTED',array['vendor'],'SUPPLEMENT_REVIEW_PENDING','drs',array['priorReviewRef','supplementRequestRef','supplementSha256','supplementSubmissionReceiptRef','supplementVersionRef'],array['D0','D10'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (21,'13','SUPPLEMENT_REVIEW_PENDING','RECORD_SUCCESSOR_REVIEW_OUTCOME','SUCCESSOR_REVIEW_OUTCOME_RECORDED',array['drs'],'SUCCESSOR_REVIEW_RECORDED','owner',array['citationSetRef','priorReviewRef','successorReviewRef','supplementRequestRef','supplementSha256','supplementVersionRef','writtenOutcomeRef'],array['D0','D10'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'),
  (22,'13','SUPPLEMENT_REVIEW_PENDING','REQUEST_FURTHER_SUPPLEMENT','FURTHER_SUPPLEMENT_REQUEST_RECORDED',array['drs'],'SUPPLEMENT_REQUESTED','vendor',array['citationSetRef','dueTime','missingItemRefs','newSupplementRequestRef','priorReviewRef','supplementRequestRef','supplementSha256','supplementVersionRef'],array['D0','D10'],'PROVISIONAL_TASK10','laibe.drs.a4-transition-catalog.pre-ready.v1','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e');

alter table casework.case_events drop constraint if exists case_events_event_type_check;
alter table casework.case_events add constraint case_events_event_type_check check (
  event_type in (
    'CASE_CREATED','HIGHEST_REVIEWER_GRANTED','HIGHEST_REVIEWER_REVOKED',
    'DOCUMENT_UPLOAD_INTENT_CREATED','DOCUMENT_VERSION_FORMALIZED',
    'DOCUMENT_SNAPSHOT_RECORDED','DOCUMENT_DOWNLOAD_ACCESSED',
    'DOCUMENT_WITHDRAWN','DOCUMENT_ORPHAN_CLEANUP_QUEUED',
    'QUOTE_HEALTHCHECK_OUTCOME_RECORDED','DRAWING_HEALTHCHECK_OUTCOME_RECORDED',
    'CONTRACT_HEALTHCHECK_OUTCOME_RECORDED','SERVICE_CONTRACT_INTENT_SUBMITTED',
    'SERVICE_CONTRACT_COUNTERSIGN_INTENT_RECORDED','LINE_CASE_CHANNEL_CONFIRMED',
    'VENDOR_BUNDLE_SUBMITTED','OWNER_VENDOR_SIGNATURE_INTENT_RECORDED',
    'EXTERNAL_PAYMENT_EVIDENCE_RECORDED','PAYMENT_EVIDENCE_REVIEW_RECORDED',
    'MOBILIZATION_EVIDENCE_SUBMITTED','OWNER_MOBILIZATION_CONFIRMATION_RECORDED',
    'DRS_MOBILIZATION_CONFIRMATION_RECORDED','FIRST_MILESTONE_EVIDENCE_SUBMITTED',
    'FIRST_MILESTONE_WRITTEN_REVIEW_RECORDED','OWNER_MILESTONE_DECISION_RECORDED',
    'SECOND_MILESTONE_EVIDENCE_SUBMITTED','SUPPLEMENT_REQUEST_RECORDED',
    'SUPPLEMENT_VERSION_SUBMITTED','SUCCESSOR_REVIEW_OUTCOME_RECORDED',
    'FURTHER_SUPPLEMENT_REQUEST_RECORDED','CASE_EVENT_CORRECTION_RECORDED',
    'CASE_AUTHORITY_CONTEXT_RECORDED'
  )
);

alter table casework.case_events
  add column sequence_no bigint,
  add column case_version bigint,
  add column journey_state_impact text not null default 'NONE',
  add column command_id uuid,
  add column command_type text,
  add column catalog_ordinal smallint,
  add column catalog_schema_version text,
  add column catalog_hash text,
  add column actor_auth_session_id uuid,
  add column actor_authority_membership_id uuid,
  add column actor_role text,
  add column authority_version bigint,
  add column from_state text,
  add column to_state text,
  add column next_actor text,
  add column due_time timestamptz,
  add column evidence_refs jsonb,
  add column corrects_event_id uuid,
  add column root_event_id uuid;

alter table casework.case_events disable trigger case_events_immutable_v1;
with numbered as (
  select event_id,
    row_number() over (partition by case_id order by occurred_at, event_id) as n
  from casework.case_events
)
update casework.case_events event_record
set sequence_no = numbered.n,
    case_version = numbered.n,
    journey_state_impact = case when event_record.event_type = 'CASE_CREATED'
      then 'STATE' else 'NONE' end,
    from_state = null,
    to_state = case when event_record.event_type = 'CASE_CREATED'
      then 'CASE_PREPARATION' else null end,
    next_actor = (
      select authority_record.next_actor
      from casework.drs_three_role_case_authority authority_record
      where authority_record.case_id = event_record.case_id
    )
from numbered
where event_record.event_id = numbered.event_id;
alter table casework.case_events enable trigger case_events_immutable_v1;

alter table casework.case_events
  alter column sequence_no set not null,
  alter column case_version set not null,
  add constraint case_events_sequence_positive check (sequence_no >= 1),
  add constraint case_events_case_version_positive check (case_version >= 1),
  add constraint case_events_journey_state_impact_check
    check (journey_state_impact in ('STATE','NONE')),
  add constraint case_events_actor_role_check
    check (actor_role is null or actor_role in ('owner','vendor','drs')),
  add constraint case_events_next_actor_check
    check (next_actor is null or next_actor in ('owner','vendor','drs')),
  add constraint case_events_payload_evidence_object_check
    check (evidence_refs is null or jsonb_typeof(evidence_refs) = 'object'),
  add constraint case_events_case_sequence_unique unique (case_id, sequence_no),
  add constraint case_events_case_command_unique unique (case_id, command_id),
  add constraint case_events_correction_target_fk
    foreign key (case_id, corrects_event_id)
    references casework.case_events(case_id, event_id) on delete restrict,
  add constraint case_events_correction_root_fk
    foreign key (case_id, root_event_id)
    references casework.case_events(case_id, event_id) on delete restrict;

create table casework.case_commands (
  command_record_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  command_id uuid not null,
  command_type text not null,
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  expected_case_version bigint not null check (expected_case_version >= 1),
  canonical_payload_sha256 text not null check (canonical_payload_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_refs jsonb not null check (jsonb_typeof(evidence_refs) = 'object'),
  due_time timestamptz,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_auth_session_id uuid not null,
  actor_authority_membership_id uuid not null,
  actor_role text not null check (actor_role in ('owner','vendor','drs')),
  authority_version bigint not null check (authority_version >= 1),
  event_id uuid not null,
  receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
  receipt_canonical text not null,
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default clock_timestamp(),
  unique (case_id, command_type, idempotency_key),
  unique (case_id, command_id),
  foreign key (case_id, event_id)
    references casework.case_events(case_id, event_id) on delete restrict
);

create table casework.case_state_projection (
  case_id uuid primary key references casework.cases(id) on delete restrict,
  case_version bigint not null check (case_version >= 1),
  current_state text not null,
  next_actor text not null check (next_actor in ('owner','vendor','drs')),
  due_time timestamptz,
  last_event_id uuid not null,
  last_sequence_no bigint not null check (last_sequence_no >= 1),
  catalog_schema_version text not null,
  catalog_hash text not null,
  canonical_projection text not null,
  projection_sha256 text not null check (projection_sha256 ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (case_id, last_event_id)
    references casework.case_events(case_id, event_id) on delete restrict
);

create index case_commands_event_idx on casework.case_commands(case_id, event_id);
create index case_commands_actor_idx on casework.case_commands(actor_user_id, case_id);
create index case_events_correction_target_idx on casework.case_events(case_id, corrects_event_id)
  where corrects_event_id is not null;

create function drs_case_command_private.projection_canonical_v1(
  p_case_id uuid, p_case_version bigint, p_current_state text,
  p_next_actor text, p_due_time timestamptz, p_last_event_id uuid,
  p_last_sequence_no bigint
) returns text
language sql immutable set search_path = '' as $function$
  select 'caseId=' || p_case_id::text || E'\ncaseVersion=' || p_case_version::text ||
    E'\ncurrentState=' || p_current_state || E'\nnextActor=' || p_next_actor ||
    E'\ndueTime=' || coalesce(to_char(p_due_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'') ||
    E'\nlastEventId=' || p_last_event_id::text || E'\nlastSequenceNo=' || p_last_sequence_no::text ||
    E'\ncatalogSchemaVersion=laibe.drs.a4-transition-catalog.pre-ready.v1' ||
    E'\ncatalogHash=804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e';
$function$;

create function drs_case_command_private.sha256_hex_v1(p_value text)
returns text language sql immutable set search_path = '' as $function$
  select encode(extensions.digest(convert_to(p_value, 'UTF8'), 'sha256'), 'hex');
$function$;

create function drs_case_command_private.command_receipt_canonical_v1(
  p_command_id uuid, p_case_id uuid, p_event_id uuid,
  p_sequence_no bigint, p_case_version bigint, p_from_state text,
  p_to_state text, p_next_actor text, p_recorded_at timestamptz,
  p_catalog_schema_version text, p_catalog_hash text
) returns text
language sql immutable set search_path = '' as $function$
  select 'schemaVersion=laibe.drs.command-receipt.v1' ||
    E'\ncommandId=' || p_command_id::text ||
    E'\ncaseId=' || p_case_id::text ||
    E'\neventId=' || p_event_id::text ||
    E'\nsequenceNo=' || p_sequence_no::text ||
    E'\ncaseVersion=' || p_case_version::text ||
    E'\nfromState=' || p_from_state ||
    E'\ntoState=' || p_to_state ||
    E'\nnextActor=' || p_next_actor ||
    E'\nrecordedAt=' || to_char(
      p_recorded_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ) ||
    E'\ncatalogSchemaVersion=' || coalesce(p_catalog_schema_version, '') ||
    E'\ncatalogHash=' || coalesce(p_catalog_hash, '');
$function$;

with last_events as (
  select distinct on (event_record.case_id)
    event_record.case_id, event_record.event_id, event_record.sequence_no,
    event_record.case_version, coalesce(event_record.next_actor, authority_record.next_actor) as next_actor
  from casework.case_events event_record
  join casework.drs_three_role_case_authority authority_record
    on authority_record.case_id = event_record.case_id
  order by event_record.case_id, event_record.sequence_no desc
), initial as (
  select last_events.*,
    drs_case_command_private.projection_canonical_v1(
      last_events.case_id, last_events.case_version, 'CASE_PREPARATION',
      last_events.next_actor, null, last_events.event_id, last_events.sequence_no
    ) as canonical_projection
  from last_events
)
insert into casework.case_state_projection(
  case_id, case_version, current_state, next_actor, due_time, last_event_id,
  last_sequence_no, catalog_schema_version, catalog_hash,
  canonical_projection, projection_sha256
)
select case_id, case_version, 'CASE_PREPARATION', next_actor, null, event_id,
  sequence_no, 'laibe.drs.a4-transition-catalog.pre-ready.v1',
  '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e',
  canonical_projection,
  drs_case_command_private.sha256_hex_v1(canonical_projection)
from initial;

create function casework.case_event_sequence_assign_v1()
returns trigger
language plpgsql security definer set search_path = '' as $function$
declare
  expected_sequence bigint;
  expected_version bigint;
  projected_next_actor text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.case_id::text, 901120260902)
  );
  select coalesce(max(sequence_no),0)+1, coalesce(max(case_version),0)+1
  into expected_sequence, expected_version
  from casework.case_events where case_id=new.case_id;
  if new.sequence_no is null then new.sequence_no := expected_sequence;
  elsif new.sequence_no <> expected_sequence then raise exception 'CASE_EVENT_SEQUENCE_CONFLICT';
  end if;
  if new.case_version is null then new.case_version := expected_version;
  elsif new.case_version <> expected_version then raise exception 'CASE_EVENT_VERSION_CONFLICT';
  end if;
  if new.event_type='CASE_CREATED' and new.command_id is null then
    new.journey_state_impact := 'STATE';
    new.to_state := 'CASE_PREPARATION';
  end if;
  if new.next_actor is null then
    select next_actor into projected_next_actor
    from casework.case_state_projection where case_id=new.case_id;
    if projected_next_actor is null then
      select next_actor into projected_next_actor
      from casework.drs_three_role_case_authority where case_id=new.case_id;
    end if;
    new.next_actor := projected_next_actor;
  end if;
  return new;
end;
$function$;

create function casework.case_event_projection_sync_v1()
returns trigger
language plpgsql security definer set search_path = '' as $function$
declare
  existing_projection casework.case_state_projection%rowtype;
  state_value text;
  next_actor_value text;
  due_time_value timestamptz;
  canonical_value text;
begin
  select * into existing_projection
  from casework.case_state_projection where case_id=new.case_id for update;
  if not found then
    select next_actor into next_actor_value
    from casework.drs_three_role_case_authority where case_id=new.case_id;
    if not found then return new; end if;
    select state_event.to_state, state_event.due_time
    into state_value, due_time_value
    from casework.case_events state_event
    where state_event.case_id=new.case_id
      and state_event.journey_state_impact='STATE'
      and state_event.to_state is not null
    order by state_event.sequence_no desc limit 1;
    state_value := coalesce(state_value,'CASE_PREPARATION');
    canonical_value := drs_case_command_private.projection_canonical_v1(
      new.case_id,new.case_version,state_value,next_actor_value,due_time_value,
      new.event_id,new.sequence_no
    );
    insert into casework.case_state_projection(
      case_id,case_version,current_state,next_actor,due_time,last_event_id,
      last_sequence_no,catalog_schema_version,catalog_hash,
      canonical_projection,projection_sha256
    ) values (
      new.case_id,new.case_version,state_value,next_actor_value,due_time_value,
      new.event_id,new.sequence_no,
      'laibe.drs.a4-transition-catalog.pre-ready.v1',
      '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e',
      canonical_value,drs_case_command_private.sha256_hex_v1(canonical_value)
    );
    return new;
  end if;
  state_value := case
    when new.journey_state_impact='STATE' and new.to_state is not null
      then new.to_state else existing_projection.current_state end;
  next_actor_value := coalesce(new.next_actor,existing_projection.next_actor);
  due_time_value := case when new.journey_state_impact='STATE'
    then new.due_time else existing_projection.due_time end;
  canonical_value := drs_case_command_private.projection_canonical_v1(
    new.case_id,new.case_version,state_value,next_actor_value,due_time_value,
    new.event_id,new.sequence_no
  );
  update casework.case_state_projection set
    case_version=new.case_version,current_state=state_value,
    next_actor=next_actor_value,due_time=due_time_value,last_event_id=new.event_id,
    last_sequence_no=new.sequence_no,canonical_projection=canonical_value,
    projection_sha256=drs_case_command_private.sha256_hex_v1(canonical_value),
    updated_at=clock_timestamp()
  where case_id=new.case_id;
  return new;
end;
$function$;

create function casework.case_authority_projection_initialize_v1()
returns trigger
language plpgsql security definer set search_path = '' as $function$
declare
  existing_projection casework.case_state_projection%rowtype;
  context_payload jsonb;
  context_idempotency_key text;
  has_case_event boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.case_id::text, 901120260902)
  );
  select * into existing_projection from casework.case_state_projection
  where case_id=new.case_id for update;
  if found and existing_projection.next_actor is not distinct from new.next_actor then
    return new;
  end if;
  select exists(
    select 1 from casework.case_events where case_id=new.case_id
  ) into has_case_event;
  if not has_case_event then return new; end if;
  context_payload := jsonb_build_object(
    'authorityBasis',new.authority_basis,
    'authorityVersion',new.authority_version,
    'nextActor',new.next_actor
  );
  context_idempotency_key := 'task3-authority-context-' ||
    new.authority_version::text || '-' || new.next_actor || '-' || new.case_id::text;
  insert into casework.case_events(
    case_id,event_type,actor_user_id,idempotency_key,payload_sha256,payload,
    journey_state_impact,next_actor,authority_version
  ) values (
    new.case_id,'CASE_AUTHORITY_CONTEXT_RECORDED',new.updated_by,
    context_idempotency_key,
    drs_case_command_private.sha256_hex_v1(context_payload::text),context_payload,
    'NONE',new.next_actor,new.authority_version
  );
  return new;
end;
$function$;

create trigger case_events_sequence_assign_v1
before insert on casework.case_events
for each row execute function casework.case_event_sequence_assign_v1();
create trigger case_events_projection_sync_v1
after insert on casework.case_events
for each row execute function casework.case_event_projection_sync_v1();
create trigger case_authority_projection_initialize_v1
after insert or update of next_actor, authority_version
on casework.drs_three_role_case_authority
for each row execute function casework.case_authority_projection_initialize_v1();

create function drs_case_command_private.evidence_value_present_v1(p_value jsonb)
returns boolean language sql immutable set search_path = '' as $function$
  select case jsonb_typeof(p_value)
    when 'string' then length(btrim(p_value #>> '{}')) > 0
    when 'array' then jsonb_array_length(p_value) > 0
    when 'object' then p_value <> '{}'::jsonb
    when 'number' then true
    when 'boolean' then true
    else false end;
$function$;

create function drs_case_command_private.document_ref_valid_v1(
  p_case_id uuid, p_version_ref text, p_sha256 text default null
) returns boolean
language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1
    from casework.document_versions version_record
    join casework.documents document_record
      on document_record.case_id = version_record.case_id
      and document_record.id = version_record.document_id
      and document_record.current_version_id = version_record.id
    join casework.document_version_sources source_record
      on source_record.case_id = version_record.case_id
      and source_record.document_id = version_record.document_id
      and source_record.version_id = version_record.id
    where version_record.case_id = p_case_id
      and version_record.version_ref = p_version_ref
      and version_record.validation_state = 'FORMAL'
      and version_record.lifecycle_state = 'ACTIVE'
      and document_record.document_status = 'ACTIVE'
      and source_record.validation_state = 'CLEAN'
      and (p_sha256 is null or version_record.sha256 = p_sha256)
  );
$function$;

create function drs_case_command_private.evidence_valid_v1(
  p_case_id uuid, p_required text[], p_evidence jsonb, p_due_time timestamptz
) returns boolean
language plpgsql stable security definer set search_path = '' as $function$
declare
  required_key text;
  item jsonb;
  version_ref text;
  sha_key text;
  sha_value text;
begin
  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' then return false; end if;
  foreach required_key in array p_required loop
    if not (p_evidence ? required_key)
      or not drs_case_command_private.evidence_value_present_v1(p_evidence -> required_key)
    then return false; end if;
    if required_key ilike '%Sha256'
      and (p_evidence ->> required_key) !~ '^[a-f0-9]{64}$'
    then return false; end if;
  end loop;
  if 'dueTime' = any(p_required) then
    if p_due_time is null or not isfinite(p_due_time)
      or (p_evidence ->> 'dueTime')::timestamptz <> p_due_time
    then return false; end if;
  elsif p_due_time is not null then return false;
  end if;

  foreach required_key in array array[
    'quoteDocumentVersionRef','drawingDocumentVersionRef','contractDocumentVersionRef',
    'serviceContractVersionRef','ownerVendorContractVersionRef',
    'paymentEvidenceVersionRef','mobilizationEvidenceVersionRef','supplementVersionRef'
  ] loop
    if p_evidence ? required_key then
      version_ref := p_evidence ->> required_key;
      sha_key := case required_key
        when 'quoteDocumentVersionRef' then 'quoteSha256'
        when 'drawingDocumentVersionRef' then 'drawingSha256'
        when 'contractDocumentVersionRef' then 'contractSha256'
        when 'serviceContractVersionRef' then 'serviceContractSha256'
        when 'ownerVendorContractVersionRef' then 'contractSha256'
        when 'paymentEvidenceVersionRef' then 'paymentEvidenceSha256'
        when 'mobilizationEvidenceVersionRef' then 'mobilizationEvidenceSha256'
        when 'supplementVersionRef' then 'supplementSha256'
      end;
      sha_value := case when p_evidence ? sha_key then p_evidence ->> sha_key else null end;
      if not drs_case_command_private.document_ref_valid_v1(p_case_id, version_ref, sha_value)
      then return false; end if;
    end if;
  end loop;
  foreach required_key in array array['documentVersionRefs','milestoneEvidenceVersionRefs'] loop
    if p_evidence ? required_key then
      if jsonb_typeof(p_evidence -> required_key) <> 'array' then return false; end if;
      for item in select value from jsonb_array_elements(p_evidence -> required_key) loop
        if jsonb_typeof(item) <> 'string'
          or not drs_case_command_private.document_ref_valid_v1(p_case_id, item #>> '{}', null)
        then return false; end if;
      end loop;
    end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$function$;

create function drs_case_command_private.correction_actor_authorized_v1(
  p_actor_role text, p_actor_user_id uuid, p_target_actor_role text,
  p_target_actor_user_id uuid, p_target_event_type text
) returns boolean
language sql immutable set search_path = '' as $function$
  select (
    p_actor_user_id = p_target_actor_user_id
    and p_target_event_type = any(array[
      'SERVICE_CONTRACT_INTENT_SUBMITTED',
      'OWNER_VENDOR_SIGNATURE_INTENT_RECORDED',
      'EXTERNAL_PAYMENT_EVIDENCE_RECORDED',
      'VENDOR_BUNDLE_SUBMITTED',
      'MOBILIZATION_EVIDENCE_SUBMITTED',
      'OWNER_MOBILIZATION_CONFIRMATION_RECORDED',
      'FIRST_MILESTONE_EVIDENCE_SUBMITTED',
      'OWNER_MILESTONE_DECISION_RECORDED',
      'SECOND_MILESTONE_EVIDENCE_SUBMITTED',
      'SUPPLEMENT_VERSION_SUBMITTED'
    ]::text[])
  ) or (
    p_actor_role = 'drs' and p_target_actor_role = 'drs'
    and p_target_event_type = any(array[
      'QUOTE_HEALTHCHECK_OUTCOME_RECORDED',
      'DRAWING_HEALTHCHECK_OUTCOME_RECORDED',
      'CONTRACT_HEALTHCHECK_OUTCOME_RECORDED',
      'SERVICE_CONTRACT_COUNTERSIGN_INTENT_RECORDED',
      'LINE_CASE_CHANNEL_CONFIRMED',
      'PAYMENT_EVIDENCE_REVIEW_RECORDED',
      'DRS_MOBILIZATION_CONFIRMATION_RECORDED',
      'FIRST_MILESTONE_WRITTEN_REVIEW_RECORDED',
      'SUPPLEMENT_REQUEST_RECORDED',
      'FURTHER_SUPPLEMENT_REQUEST_RECORDED',
      'SUCCESSOR_REVIEW_OUTCOME_RECORDED'
    ]::text[])
  );
$function$;

create function drs_case_command_private.correction_reason_valid_v1(
  p_actor_role text, p_target_actor_role text, p_target_event_type text,
  p_reason_code text, p_replacement_evidence_ref text
) returns boolean
language sql immutable set search_path = '' as $function$
  select p_replacement_evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{7,255}$'
    and case
      when p_actor_role = 'drs' and p_target_actor_role = 'drs'
        and p_target_event_type = any(array[
          'QUOTE_HEALTHCHECK_OUTCOME_RECORDED',
          'DRAWING_HEALTHCHECK_OUTCOME_RECORDED',
          'CONTRACT_HEALTHCHECK_OUTCOME_RECORDED',
          'SERVICE_CONTRACT_COUNTERSIGN_INTENT_RECORDED',
          'LINE_CASE_CHANNEL_CONFIRMED',
          'PAYMENT_EVIDENCE_REVIEW_RECORDED',
          'DRS_MOBILIZATION_CONFIRMATION_RECORDED',
          'FIRST_MILESTONE_WRITTEN_REVIEW_RECORDED',
          'SUPPLEMENT_REQUEST_RECORDED',
          'FURTHER_SUPPLEMENT_REQUEST_RECORDED',
          'SUCCESSOR_REVIEW_OUTCOME_RECORDED'
        ]::text[])
      then p_reason_code in ('DRS_RECORDING_ERROR','SYSTEM_RECORDING_ERROR')
      else p_reason_code in (
        'FACTUAL_EVIDENCE_REFERENCE_WRONG','FACTUAL_EVIDENCE_HASH_WRONG'
      )
    end;
$function$;

create function drs_case_command_private.next_actor_v1(
  p_case_id uuid, p_rule text, p_actor_role text
) returns text
language plpgsql stable security definer set search_path = '' as $function$
begin
  if p_rule in ('owner','vendor','drs') then return p_rule; end if;
  if p_rule = 'DRS_IF_DRAWING_INPUT_READY_ELSE_OWNER' then
    if exists (
      select 1 from casework.documents d join casework.document_versions v
        on v.case_id=d.case_id and v.document_id=d.id and v.id=d.current_version_id
      where d.case_id=p_case_id and d.document_kind='drawing'
        and d.document_status='ACTIVE' and v.validation_state='FORMAL'
        and v.lifecycle_state='ACTIVE'
    ) then return 'drs'; else return 'owner'; end if;
  end if;
  if p_rule = 'DRS_IF_CONTRACT_INPUT_READY_ELSE_OWNER' then
    if exists (
      select 1 from casework.documents d join casework.document_versions v
        on v.case_id=d.case_id and v.document_id=d.id and v.id=d.current_version_id
      where d.case_id=p_case_id and d.document_kind='contract'
        and d.document_status='ACTIVE' and v.validation_state='FORMAL'
        and v.lifecycle_state='ACTIVE'
    ) then return 'drs'; else return 'owner'; end if;
  end if;
  if p_rule = 'OWNER_OR_VENDOR_UNFULFILLED_SIGNER' then
    if not exists (
      select 1 from casework.case_commands
      where case_id=p_case_id and command_type='RECORD_OWNER_VENDOR_SIGNATURE_INTENT'
        and actor_role='owner'
    ) then return 'owner'; end if;
    if not exists (
      select 1 from casework.case_commands
      where case_id=p_case_id and command_type='RECORD_OWNER_VENDOR_SIGNATURE_INTENT'
        and actor_role='vendor'
    ) then return 'vendor'; end if;
    raise exception 'WRONG_ACTOR_CHAIN';
  end if;
  if p_rule = 'REMAINING_REQUIRED_SIGNER' then
    if p_actor_role = 'owner' then return 'vendor'; end if;
    if p_actor_role = 'vendor' then return 'owner'; end if;
    raise exception 'WRONG_ACTOR_CHAIN';
  end if;
  raise exception 'WRONG_ACTOR_CHAIN';
end;
$function$;

create function casework.drs_case_projection_replay_v1(p_case_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $function$
declare
  gap_count bigint;
  invalid_count bigint;
  projection record;
  canonical text;
begin
  select count(*) filter (where sequence_no <> expected_sequence)
  into gap_count
  from (
    select sequence_no, row_number() over (order by sequence_no) as expected_sequence
    from casework.case_events where case_id=p_case_id
  ) ordered;
  if gap_count <> 0 then raise exception 'CASE_EVENT_SEQUENCE_GAP'; end if;
  select count(*) into invalid_count
  from casework.case_events event_record
  left join casework.case_transition_catalog catalog_record
    on catalog_record.ordinal=event_record.catalog_ordinal
  where event_record.case_id=p_case_id and (
    event_record.case_version <> event_record.sequence_no
    or (
      event_record.catalog_ordinal is not null and (
        event_record.catalog_schema_version <> 'laibe.drs.a4-transition-catalog.pre-ready.v1'
        or event_record.catalog_hash <> '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e'
        or event_record.command_type <> catalog_record.command_type
        or event_record.event_type <> catalog_record.event_type
        or event_record.from_state <> catalog_record.from_state
        or event_record.to_state <> catalog_record.to_state
        or event_record.journey_state_impact <> 'STATE'
      )
    )
    or (
      event_record.event_type='CASE_EVENT_CORRECTION_RECORDED' and (
        event_record.catalog_ordinal is not null
        or event_record.journey_state_impact <> 'NONE'
        or event_record.corrects_event_id is null
        or event_record.root_event_id is null
      )
    )
  );
  if invalid_count <> 0 then raise exception 'CASE_EVENT_REPLAY_CONTRACT_INVALID'; end if;
  select event_record.case_version,
    coalesce(
      (select state_event.to_state from casework.case_events state_event
       where state_event.case_id=p_case_id and state_event.journey_state_impact='STATE'
         and state_event.to_state is not null
       order by state_event.sequence_no desc limit 1),
      'CASE_PREPARATION'
    ) as current_state,
    event_record.next_actor,
    (select state_event.due_time from casework.case_events state_event
     where state_event.case_id=p_case_id
       and state_event.journey_state_impact='STATE'
     order by state_event.sequence_no desc limit 1) as due_time,
    event_record.event_id,
    event_record.sequence_no
  into strict projection
  from casework.case_events event_record
  where event_record.case_id=p_case_id
  order by event_record.sequence_no desc limit 1;
  canonical := drs_case_command_private.projection_canonical_v1(
    p_case_id, projection.case_version, projection.current_state,
    projection.next_actor, projection.due_time, projection.event_id,
    projection.sequence_no
  );
  return jsonb_build_object(
    'caseId',p_case_id::text,'caseVersion',projection.case_version,
    'currentState',projection.current_state,'nextActor',projection.next_actor,
    'dueTime',projection.due_time,'lastEventId',projection.event_id::text,
    'lastSequenceNo',projection.sequence_no,
    'catalogSchemaVersion','laibe.drs.a4-transition-catalog.pre-ready.v1',
    'catalogHash','804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e',
    'canonicalProjection',canonical,
    'projectionSha256',drs_case_command_private.sha256_hex_v1(canonical)
  );
exception when no_data_found or too_many_rows then
  raise exception 'CASE_PROJECTION_REPLAY_INVALID';
end;
$function$;

create function public.drs_case_command_apply_v1(
  p_server_session_id uuid,
  p_access_token_digest text,
  p_expected_user_id uuid,
  p_expected_auth_session_id uuid,
  p_command_id uuid,
  p_command_type text,
  p_idempotency_key text,
  p_expected_case_version bigint,
  p_canonical_payload_sha256 text,
  p_evidence_refs jsonb,
  p_due_time timestamptz
) returns jsonb
language plpgsql security definer set search_path = '' as $function$
declare
  session_projection jsonb;
  case_id_value uuid;
  membership_id_value uuid;
  authority_version_value bigint;
  actor_role_value text;
  projection casework.case_state_projection%rowtype;
  transition casework.case_transition_catalog%rowtype;
  existing_command casework.case_commands%rowtype;
  event_id_value uuid := extensions.gen_random_uuid();
  sequence_value bigint;
  version_value bigint;
  next_actor_value text;
  canonical_value text;
  projection_hash_value text;
  receipt_value jsonb;
  receipt_canonical_value text;
  receipt_hash_value text;
  recorded_at_value timestamptz;
  effective_due_time timestamptz;
  target_event_value uuid;
  root_event_value uuid;
  target_event_record casework.case_events%rowtype;
  root_event_record casework.case_events%rowtype;
begin
  if p_command_id is null or p_command_type is null
    or p_idempotency_key is null or length(p_idempotency_key) not between 16 and 128
    or p_expected_case_version is null or p_expected_case_version < 1
    or p_canonical_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_evidence_refs is null or jsonb_typeof(p_evidence_refs) <> 'object'
  then return jsonb_build_object('state','INVALID_REQUEST','newEffects',0); end if;
  begin
    session_projection := public.drs_three_role_server_session_verify_v1(
      p_server_session_id,p_access_token_digest,p_expected_user_id,
      p_expected_auth_session_id
    );
  exception when others then
    return jsonb_build_object('state','AUTH_SESSION_OR_CASE_AUTHORITY_INVALID','newEffects',0);
  end;
  case_id_value := (session_projection ->> 'case_id')::uuid;
  membership_id_value := (session_projection ->> 'membership_id')::uuid;
  authority_version_value := (session_projection ->> 'authority_version')::bigint;
  actor_role_value := session_projection ->> 'role';

  if p_command_type = 'SUBMIT_SUPPLEMENT_VERSION_AND_RECORD_SUCCESSOR_REVIEW_OUTCOME' then
    return jsonb_build_object('state','WRONG_ACTOR_CHAIN','newEffects',0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(case_id_value::text, 901120260902)
  );
  select * into strict projection from casework.case_state_projection
  where case_id=case_id_value for update;

  select * into existing_command from casework.case_commands
  where case_id=case_id_value and command_type=p_command_type
    and idempotency_key=p_idempotency_key;
  if found then
    if existing_command.command_id=p_command_id
      and existing_command.expected_case_version=p_expected_case_version
      and existing_command.canonical_payload_sha256=p_canonical_payload_sha256
      and existing_command.evidence_refs=p_evidence_refs
      and existing_command.due_time is not distinct from p_due_time
      and existing_command.actor_user_id=p_expected_user_id
      and existing_command.actor_auth_session_id=p_expected_auth_session_id
    then return jsonb_build_object(
      'state','REPLAYED','newEffects',0,
      'receipt',existing_command.receipt,
      'receiptCanonical',existing_command.receipt_canonical,
      'receiptSha256',existing_command.receipt_sha256
    );
    else return jsonb_build_object('state','IDEMPOTENCY_CONFLICT','newEffects',0); end if;
  end if;
  if exists (
    select 1 from casework.case_commands
    where case_id=case_id_value and command_id=p_command_id
  ) then return jsonb_build_object('state','IDEMPOTENCY_CONFLICT','newEffects',0); end if;
  if projection.case_version <> p_expected_case_version then
    return jsonb_build_object('state','CASE_VERSION_CONFLICT','newEffects',0);
  end if;
  perform 1 from casework.drs_three_role_case_authority
  where case_id=case_id_value and authority_version=authority_version_value
    and next_actor=(session_projection ->> 'next_actor')
  for update;
  if not found then
    return jsonb_build_object('state','AUTH_SESSION_OR_CASE_AUTHORITY_INVALID','newEffects',0);
  end if;
  perform 1 from casework.drs_three_role_memberships
  where membership_id=membership_id_value and case_id=case_id_value
    and user_id=p_expected_user_id and role=actor_role_value
    and status='active' and revoked_at is null
    and valid_from <= clock_timestamp()
    and authority_version=authority_version_value
  for update;
  if not found then
    return jsonb_build_object('state','AUTH_SESSION_OR_CASE_AUTHORITY_INVALID','newEffects',0);
  end if;
  if p_command_type <> 'RECORD_CASE_EVENT_CORRECTION' and (
    (session_projection ->> 'next_actor') <> actor_role_value
    or projection.next_actor <> actor_role_value
  )
  then return jsonb_build_object('state','CASE_TRANSITION_NOT_AUTHORIZED','newEffects',0); end if;

  if p_command_type = 'RECORD_CASE_EVENT_CORRECTION' then
    if not (
      p_evidence_refs ?& array[
        'correctsEventId','rootEventId','reasonCode','replacementEvidenceRef'
      ]
    ) then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_TARGET_INVALID','newEffects',0
      );
    end if;
    begin
      target_event_value := btrim(p_evidence_refs ->> 'correctsEventId','''')::uuid;
      root_event_value := btrim(p_evidence_refs ->> 'rootEventId','''')::uuid;
    exception when others then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_TARGET_INVALID','newEffects',0
      );
    end;
    if p_due_time is not null
      or not drs_case_command_private.evidence_value_present_v1(
        p_evidence_refs -> 'reasonCode'
      )
      or not drs_case_command_private.evidence_value_present_v1(
        p_evidence_refs -> 'replacementEvidenceRef'
      )
    then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_VALUE_INVALID','newEffects',0
      );
    end if;

    perform 1
    from casework.case_events
    where case_id=case_id_value
      and event_id=any(array[target_event_value,root_event_value])
    order by event_id
    for share;

    select * into target_event_record
    from casework.case_events
    where case_id=case_id_value and event_id=target_event_value;
    if not found or target_event_record.sequence_no >= projection.last_sequence_no + 1 then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_TARGET_INVALID','newEffects',0
      );
    end if;

    select * into root_event_record
    from casework.case_events
    where case_id=case_id_value and event_id=root_event_value;
    if not found then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_LINEAGE_INVALID','newEffects',0
      );
    end if;
    if target_event_record.corrects_event_id is null
      and target_event_record.root_event_id is null
    then
      if root_event_value <> target_event_value then
        return jsonb_build_object(
          'state','CASE_EVENT_CORRECTION_LINEAGE_INVALID','newEffects',0
        );
      end if;
    elsif target_event_record.corrects_event_id is not null
      and target_event_record.root_event_id is not null
    then
      if root_event_value <> target_event_record.root_event_id
        or root_event_record.corrects_event_id is not null
        or root_event_record.root_event_id is not null
        or root_event_record.sequence_no >= target_event_record.sequence_no
      then
        return jsonb_build_object(
          'state','CASE_EVENT_CORRECTION_LINEAGE_INVALID','newEffects',0
        );
      end if;
    else
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_LINEAGE_INVALID','newEffects',0
      );
    end if;

    if not drs_case_command_private.correction_actor_authorized_v1(
      actor_role_value,p_expected_user_id,root_event_record.actor_role,
      root_event_record.actor_user_id,root_event_record.event_type
    ) then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_NOT_AUTHORIZED','newEffects',0
      );
    end if;
    if not drs_case_command_private.correction_reason_valid_v1(
      actor_role_value,root_event_record.actor_role,root_event_record.event_type,
      p_evidence_refs ->> 'reasonCode',
      p_evidence_refs ->> 'replacementEvidenceRef'
    ) then
      return jsonb_build_object(
        'state','CASE_EVENT_CORRECTION_VALUE_INVALID','newEffects',0
      );
    end if;
    transition.ordinal := null;
    transition.event_type := 'CASE_EVENT_CORRECTION_RECORDED';
    transition.to_state := projection.current_state;
    transition.next_actor_rule := projection.next_actor;
  else
    select * into transition from casework.case_transition_catalog
    where from_state=projection.current_state and command_type=p_command_type;
    if not found then return jsonb_build_object('state','WRONG_ACTOR_CHAIN','newEffects',0); end if;
    if not actor_role_value=any(transition.allowed_roles) then
      return jsonb_build_object('state','CASE_TRANSITION_NOT_AUTHORIZED','newEffects',0);
    end if;
    if not drs_case_command_private.evidence_valid_v1(
      case_id_value,transition.required_evidence_refs,p_evidence_refs,p_due_time
    ) then return jsonb_build_object(
      'state','EVIDENCE_REF_INVALID','newEffects',0,
      'denialSet',transition.effects0_denial_sets[2]
    ); end if;
  end if;

  begin
    next_actor_value := case when p_command_type='RECORD_CASE_EVENT_CORRECTION'
      then projection.next_actor
      else drs_case_command_private.next_actor_v1(
        case_id_value,transition.next_actor_rule,actor_role_value
      ) end;
  exception when others then
    return jsonb_build_object('state','WRONG_ACTOR_CHAIN','newEffects',0);
  end;
  if transition.ordinal=9 and exists (
    select 1 from casework.case_commands
    where case_id=case_id_value
      and command_type='RECORD_OWNER_VENDOR_SIGNATURE_INTENT'
      and actor_role=actor_role_value
  ) then return jsonb_build_object('state','WRONG_ACTOR_CHAIN','newEffects',0); end if;

  effective_due_time := case
    when p_command_type='RECORD_CASE_EVENT_CORRECTION' then projection.due_time
    else p_due_time
  end;
  sequence_value := projection.last_sequence_no + 1;
  version_value := projection.case_version + 1;
  insert into casework.case_events(
    event_id,case_id,event_type,actor_user_id,idempotency_key,payload_sha256,
    payload,sequence_no,case_version,journey_state_impact,command_id,
    command_type,catalog_ordinal,catalog_schema_version,catalog_hash,
    actor_auth_session_id,actor_authority_membership_id,actor_role,
    authority_version,from_state,to_state,next_actor,due_time,evidence_refs,
    corrects_event_id,root_event_id
  ) values (
    event_id_value,case_id_value,transition.event_type,p_expected_user_id,
    p_idempotency_key,p_canonical_payload_sha256,p_evidence_refs,
    sequence_value,version_value,
    case when p_command_type='RECORD_CASE_EVENT_CORRECTION' then 'NONE' else 'STATE' end,
    p_command_id,p_command_type,transition.ordinal,
    case when transition.ordinal is null then null else 'laibe.drs.a4-transition-catalog.pre-ready.v1' end,
    case when transition.ordinal is null then null else '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e' end,
    p_expected_auth_session_id,membership_id_value,actor_role_value,
    authority_version_value,projection.current_state,transition.to_state,
    next_actor_value,effective_due_time,p_evidence_refs,target_event_value,root_event_value
  );

  canonical_value := drs_case_command_private.projection_canonical_v1(
    case_id_value,version_value,transition.to_state,next_actor_value,effective_due_time,
    event_id_value,sequence_value
  );
  projection_hash_value := drs_case_command_private.sha256_hex_v1(canonical_value);
  update casework.case_state_projection set
    case_version=version_value,current_state=transition.to_state,
    next_actor=next_actor_value,due_time=effective_due_time,last_event_id=event_id_value,
    last_sequence_no=sequence_value,canonical_projection=canonical_value,
    projection_sha256=projection_hash_value,updated_at=clock_timestamp()
  where case_id=case_id_value;
  if p_command_type <> 'RECORD_CASE_EVENT_CORRECTION' then
    update casework.drs_three_role_case_authority set
      next_actor=next_actor_value,updated_by=p_expected_user_id,
      updated_at=clock_timestamp(),authority_basis='case_event_ledger_r1'
    where case_id=case_id_value and authority_version=authority_version_value;
    if not found then raise exception 'AUTHORITY_CHANGED_DURING_COMMAND'; end if;
  end if;

  recorded_at_value := clock_timestamp();
  receipt_value := jsonb_build_object(
    'schemaVersion','laibe.drs.command-receipt.v1',
    'commandId',p_command_id::text,
    'caseId',case_id_value::text,'eventId',event_id_value::text,
    'sequenceNo',sequence_value,'caseVersion',version_value,
    'fromState',projection.current_state,'toState',transition.to_state,
    'nextActor',next_actor_value,
    'recordedAt',to_char(
      recorded_at_value at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ),
    'catalogSchemaVersion',case when transition.ordinal is null then null else 'laibe.drs.a4-transition-catalog.pre-ready.v1' end,
    'catalogHash',case when transition.ordinal is null then null else '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e' end
  );
  receipt_canonical_value := drs_case_command_private.command_receipt_canonical_v1(
    p_command_id,case_id_value,event_id_value,sequence_value,version_value,
    projection.current_state,transition.to_state,next_actor_value,
    recorded_at_value,
    case when transition.ordinal is null then null else 'laibe.drs.a4-transition-catalog.pre-ready.v1' end,
    case when transition.ordinal is null then null else '804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e' end
  );
  receipt_hash_value := drs_case_command_private.sha256_hex_v1(
    receipt_canonical_value
  );
  insert into casework.case_commands(
    case_id,command_id,command_type,idempotency_key,expected_case_version,
    canonical_payload_sha256,evidence_refs,due_time,actor_user_id,
    actor_auth_session_id,actor_authority_membership_id,actor_role,
    authority_version,event_id,receipt,receipt_canonical,receipt_sha256,
    recorded_at
  ) values (
    case_id_value,p_command_id,p_command_type,p_idempotency_key,
    p_expected_case_version,p_canonical_payload_sha256,p_evidence_refs,p_due_time,
    p_expected_user_id,p_expected_auth_session_id,membership_id_value,
    actor_role_value,authority_version_value,event_id_value,receipt_value,
    receipt_canonical_value,receipt_hash_value,recorded_at_value
  );
  return jsonb_build_object(
    'state','APPLIED','newEffects',1,
    'receipt',receipt_value,
    'receiptCanonical',receipt_canonical_value,
    'receiptSha256',receipt_hash_value
  );
exception
  when no_data_found or too_many_rows then
    return jsonb_build_object('state','AUTH_SESSION_OR_CASE_AUTHORITY_INVALID','newEffects',0);
end;
$function$;

create function casework.case_command_immutable_v1()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin raise exception 'CASE_COMMAND_IMMUTABLE'; end;
$function$;
create trigger case_commands_immutable_v1 before update or delete on casework.case_commands
for each row execute function casework.case_command_immutable_v1();
create trigger case_transition_catalog_immutable_v1 before update or delete on casework.case_transition_catalog
for each row execute function casework.case_command_immutable_v1();

alter table casework.case_transition_catalog enable row level security;
alter table casework.case_transition_catalog force row level security;
alter table casework.case_commands enable row level security;
alter table casework.case_commands force row level security;
alter table casework.case_state_projection enable row level security;
alter table casework.case_state_projection force row level security;

create policy case_events_three_role_select on casework.case_events
for select to authenticated using (
  drs_auth_private.drs_three_role_has_active_case_membership_v1(case_id)
);
create policy case_state_projection_three_role_select on casework.case_state_projection
for select to authenticated using (
  drs_auth_private.drs_three_role_has_active_case_membership_v1(case_id)
);
create policy case_commands_three_role_select on casework.case_commands
for select to authenticated using (
  drs_auth_private.drs_three_role_has_active_case_membership_v1(case_id)
);
create policy case_transition_catalog_read on casework.case_transition_catalog
for select to authenticated using (true);

revoke all on table casework.case_transition_catalog from public, anon, authenticated, service_role;
revoke all on table casework.case_commands from public, anon, authenticated, service_role;
revoke all on table casework.case_state_projection from public, anon, authenticated, service_role;
grant select on table casework.case_transition_catalog to authenticated;
grant select on table casework.case_commands to authenticated;
grant select on table casework.case_state_projection to authenticated;
grant select on table casework.case_events to authenticated;

alter function drs_case_command_private.projection_canonical_v1(uuid,bigint,text,text,timestamptz,uuid,bigint) owner to postgres;
alter function drs_case_command_private.sha256_hex_v1(text) owner to postgres;
alter function drs_case_command_private.command_receipt_canonical_v1(uuid,uuid,uuid,bigint,bigint,text,text,text,timestamptz,text,text) owner to postgres;
alter function casework.case_event_sequence_assign_v1() owner to postgres;
alter function casework.case_event_projection_sync_v1() owner to postgres;
alter function casework.case_authority_projection_initialize_v1() owner to postgres;
alter function drs_case_command_private.evidence_value_present_v1(jsonb) owner to postgres;
alter function drs_case_command_private.document_ref_valid_v1(uuid,text,text) owner to postgres;
alter function drs_case_command_private.evidence_valid_v1(uuid,text[],jsonb,timestamptz) owner to postgres;
alter function drs_case_command_private.correction_actor_authorized_v1(text,uuid,text,uuid,text) owner to postgres;
alter function drs_case_command_private.correction_reason_valid_v1(text,text,text,text,text) owner to postgres;
alter function drs_case_command_private.next_actor_v1(uuid,text,text) owner to postgres;
alter function casework.drs_case_projection_replay_v1(uuid) owner to postgres;
alter function public.drs_case_command_apply_v1(uuid,text,uuid,uuid,uuid,text,text,bigint,text,jsonb,timestamptz) owner to postgres;
alter function casework.case_command_immutable_v1() owner to postgres;

revoke all on function drs_case_command_private.projection_canonical_v1(uuid,bigint,text,text,timestamptz,uuid,bigint) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.sha256_hex_v1(text) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.command_receipt_canonical_v1(uuid,uuid,uuid,bigint,bigint,text,text,text,timestamptz,text,text) from public, anon, authenticated, service_role;
revoke all on function casework.case_event_sequence_assign_v1() from public, anon, authenticated, service_role;
revoke all on function casework.case_event_projection_sync_v1() from public, anon, authenticated, service_role;
revoke all on function casework.case_authority_projection_initialize_v1() from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.evidence_value_present_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.document_ref_valid_v1(uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.evidence_valid_v1(uuid,text[],jsonb,timestamptz) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.correction_actor_authorized_v1(text,uuid,text,uuid,text) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.correction_reason_valid_v1(text,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function drs_case_command_private.next_actor_v1(uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function casework.drs_case_projection_replay_v1(uuid) from public, anon, authenticated, service_role;
revoke all on function casework.case_command_immutable_v1() from public, anon, authenticated, service_role;
revoke all on function public.drs_case_command_apply_v1(uuid,text,uuid,uuid,uuid,text,text,bigint,text,jsonb,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.drs_case_command_apply_v1(uuid,text,uuid,uuid,uuid,text,text,bigint,text,jsonb,timestamptz) to service_role;

commit;
