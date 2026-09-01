begin;

-- Forward-only bridge over the admitted remote exact-seven baseline.
do $$
declare
  v_actual_count bigint;
  v_actual_distinct_count bigint;
  v_expected_versions constant text[] := array[
    '20260820112418', '20260820112429', '20260820112430',
    '20260820112835', '20260824094039', '20260825065950',
    '20260826035856'
  ];
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'DRS_REMOTE_BASELINE_LEDGER_MISMATCH';
  end if;

  select count(*), count(distinct version::text)
  into v_actual_count, v_actual_distinct_count
  from supabase_migrations.schema_migrations;

  if v_actual_count <> 7
    or v_actual_distinct_count <> 7
    or exists (
      select expected_version from unnest(v_expected_versions) expected(expected_version)
      except
      select version::text from supabase_migrations.schema_migrations
    )
    or exists (
      select version::text from supabase_migrations.schema_migrations
      except
      select expected_version from unnest(v_expected_versions) expected(expected_version)
    )
  then
    raise exception 'DRS_REMOTE_BASELINE_LEDGER_MISMATCH';
  end if;

  if to_regclass('auth.users') is null
    or to_regtype('knowledge.case_role') is null
    or to_regclass('casework.cases') is null
    or to_regclass('casework.case_members') is null
    or to_regnamespace('integration') is null
    or to_regprocedure(
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'
    ) is null
    or to_regrole('postgres') is null
    or to_regrole('anon') is null
    or to_regrole('authenticated') is null
    or to_regrole('service_role') is null
    or to_regnamespace('extensions') is null
    or to_regprocedure('extensions.gen_random_uuid()') is null
    or not exists (
      select 1
      from pg_extension extension_record
      where extension_record.extname = 'pgcrypto'
        and extension_record.extnamespace = to_regnamespace('extensions')
    )
    or exists (
      select 1
      from pg_extension extension_record
      where extension_record.extname = 'btree_gist'
        and extension_record.extnamespace <> to_regnamespace('extensions')
    )
  then
    raise exception 'DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH';
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'casework' and table_name = 'cases') <> 7
    or (select count(*) from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_members') <> 5
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'cases'
        and column_name = 'id' and data_type = 'uuid' and is_nullable = 'NO'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'cases'
        and column_name = 'case_status' and data_type = 'text' and is_nullable = 'NO'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_members'
        and column_name = 'case_id' and data_type = 'uuid' and is_nullable = 'NO'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_members'
        and column_name = 'user_id' and data_type = 'uuid' and is_nullable = 'NO'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_members'
        and column_name = 'role' and udt_schema = 'knowledge'
        and udt_name = 'case_role' and is_nullable = 'NO'
    )
    or not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'casework' and c.relname = 'cases'
        and c.relrowsecurity and not c.relforcerowsecurity
    )
    or not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'casework' and c.relname = 'case_members'
        and c.relrowsecurity and not c.relforcerowsecurity
    )
    or has_function_privilege(
      'service_role',
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure,
      'execute'
    )
  then
    raise exception 'DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH';
  end if;

  if to_regnamespace('drs_private') is not null
    or to_regclass('public.drs_cases') is not null
    or to_regclass('public.drs_specialists') is not null
    or to_regclass('public.drs_case_line_group_links') is not null
    or to_regclass('public.drs_case_specialist_assignments') is not null
    or to_regclass('public.drs_case_line_group_link_terminations') is not null
    or to_regclass('public.drs_case_specialist_assignment_terminations') is not null
    or to_regclass('public.drs_case_audit_events') is not null
    or to_regclass('public.drs_review_work_items') is not null
    or to_regclass('public.drs_review_work_item_transitions') is not null
    or to_regclass('integration.drs_identity_provider_bindings') is not null
    or to_regclass('integration.drs_identity_link_states') is not null
    or to_regclass('integration.drs_identity_provider_events') is not null
    or to_regclass('integration.drs_auth_specialist_bindings') is not null
    or to_regclass('integration.drs_case_identity_bindings') is not null
    or to_regclass('integration.drs_server_sessions') is not null
    or to_regclass('integration.drs_line_account_link_intents') is not null
    or to_regclass('integration.drs_line_account_bindings') is not null
    or to_regclass('integration.drs_line_binding_audit') is not null
    or to_regclass('integration.drs_line_webhook_events') is not null
    or to_regclass('integration.drs_line_notification_outbox') is not null
    or to_regclass('integration.drs_line_delivery_receipts') is not null
    or to_regprocedure('public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz)') is not null
    or to_regprocedure('public.drs_server_session_verify_v1(uuid,text)') is not null
    or to_regprocedure('public.drs_server_session_revoke_v1(uuid,text)') is not null
    or to_regprocedure('public.drs_line_start_link_intent_v1(jsonb)') is not null
    or to_regprocedure('public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)') is not null
    or to_regprocedure('public.drs_identity_link_state_claim_v1(text,text,text,timestamptz)') is not null
    or to_regprocedure('public.drs_identity_link_state_fail_v1(uuid,timestamptz,text)') is not null
    or to_regprocedure('public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)') is not null
    or to_regprocedure('public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)') is not null
    or to_regprocedure('integration.drs_case_identity_binding_assert_casework_v1()') is not null
    or exists (
      select 1
      from pg_proc procedure_record
      join pg_namespace procedure_namespace
        on procedure_namespace.oid = procedure_record.pronamespace
      where procedure_namespace.nspname in ('public', 'integration')
        and procedure_record.proname = any(array[
          'drs_append_ai_review_event',
          'drs_append_audit_event',
          'drs_identity_authority_resolve_locked_v1',
          'drs_identity_callback_finalize_v1',
          'drs_identity_callback_prepare_v1',
          'drs_identity_link_state_claim_v1',
          'drs_identity_link_state_create_v1',
          'drs_identity_link_state_fail_v1',
          'drs_identity_provider_revoke_v1',
          'fail_identity_link_state_claim_v1',
          'drs_line_admit_case_notification_v1',
          'drs_line_assert_notification_claim_v1',
          'drs_line_cancel_link_intent_v1',
          'drs_line_claim_notification_v1',
          'drs_line_claim_webhook_v1',
          'drs_line_complete_account_link_event_v1',
          'drs_line_complete_account_link_v1',
          'drs_line_complete_notification_v1',
          'drs_line_complete_webhook_v1',
          'drs_line_prepare_nonce_v1',
          'drs_line_read_link_status_v1',
          'drs_line_start_link_intent_v1',
          'drs_line_unlink_account_v1',
          'drs_line_unlink_by_line_identity_v1',
          'drs_server_session_issue_v1',
          'drs_server_session_revoke_v1',
          'drs_server_session_verify_v1'
        ])
    )
  then
    raise exception 'DRS_REMOTE_BASELINE_PARTIAL_FOOTPRINT';
  end if;
end;
$$;

create temporary table drs_bridge_preimage_fingerprint on commit drop as
select
  'casework.cases'::regclass::oid as cases_oid,
  'casework.case_members'::regclass::oid as members_oid,
  (select relowner from pg_class where oid = 'casework.cases'::regclass) as cases_owner,
  (select relowner from pg_class where oid = 'casework.case_members'::regclass) as members_owner,
  coalesce((select relacl::text from pg_class where oid = 'casework.cases'::regclass), '') as cases_acl,
  coalesce((select relacl::text from pg_class where oid = 'casework.case_members'::regclass), '') as members_acl,
  (select relrowsecurity from pg_class where oid = 'casework.cases'::regclass) as cases_rls,
  (select relrowsecurity from pg_class where oid = 'casework.case_members'::regclass) as members_rls,
  (select relforcerowsecurity from pg_class where oid = 'casework.cases'::regclass) as cases_force_rls,
  (select relforcerowsecurity from pg_class where oid = 'casework.case_members'::regclass) as members_force_rls,
  (
    select md5(coalesce(string_agg(
      format('%s|%s|%s|%s', t.tgname, t.tgenabled, t.tgisinternal, pg_get_triggerdef(t.oid)),
      E'\n' order by t.tgname
    ), ''))
    from pg_trigger t where t.tgrelid = 'casework.cases'::regclass
  ) as cases_trigger_fingerprint,
  (
    select md5(coalesce(string_agg(
      format('%s|%s|%s|%s', t.tgname, t.tgenabled, t.tgisinternal, pg_get_triggerdef(t.oid)),
      E'\n' order by t.tgname
    ), ''))
    from pg_trigger t where t.tgrelid = 'casework.case_members'::regclass
  ) as members_trigger_fingerprint,
  (
    select md5(coalesce(string_agg(
      format('%s|%s|%s|%s|%s|%s', c.conname, c.contype, c.convalidated,
        c.condeferrable, c.condeferred, pg_get_constraintdef(c.oid)),
      E'\n' order by c.conname
    ), ''))
    from pg_constraint c where c.conrelid = 'casework.cases'::regclass
  ) as cases_constraint_fingerprint,
  (
    select md5(coalesce(string_agg(
      format('%s|%s|%s|%s|%s|%s', c.conname, c.contype, c.convalidated,
        c.condeferrable, c.condeferred, pg_get_constraintdef(c.oid)),
      E'\n' order by c.conname
    ), ''))
    from pg_constraint c where c.conrelid = 'casework.case_members'::regclass
  ) as members_constraint_fingerprint,
  (
    select md5(coalesce(string_agg(
      format('%s|%s|%s|%s|%s|%s', p.polname, p.polcmd, p.polpermissive,
        p.polroles::text, pg_get_expr(p.polqual, p.polrelid),
        pg_get_expr(p.polwithcheck, p.polrelid)),
      E'\n' order by p.polname
    ), ''))
    from pg_policy p where p.polrelid = 'casework.cases'::regclass
  ) as cases_policy_fingerprint,
  (
    select md5(coalesce(string_agg(
      format('%s|%s|%s|%s|%s|%s', p.polname, p.polcmd, p.polpermissive,
        p.polroles::text, pg_get_expr(p.polqual, p.polrelid),
        pg_get_expr(p.polwithcheck, p.polrelid)),
      E'\n' order by p.polname
    ), ''))
    from pg_policy p where p.polrelid = 'casework.case_members'::regclass
  ) as members_policy_fingerprint,
  pg_get_functiondef(
    'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
  ) as calendar_definition,
  (select proowner from pg_proc where oid =
    'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
  ) as calendar_owner,
  coalesce((select proacl::text from pg_proc where oid =
    'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
  ), '') as calendar_acl;

-- BRIDGE_PHASE_CORE
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists drs_private;

create table public.drs_cases (
  case_id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  owner_id uuid not null,
  case_state text not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drs_cases_state_check check (
    case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION', 'CLOSED')
  ),
  constraint drs_cases_closed_at_check check (
    closed_at is null or closed_at >= opened_at
  )
);

create table public.drs_specialists (
  specialist_id uuid primary key default gen_random_uuid(),
  display_name text not null,
  authority_state text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  constraint drs_specialists_authority_state_check check (
    authority_state in ('ACTIVE', 'SUSPENDED', 'RETIRED')
  )
);

create table public.drs_case_line_group_links (
  group_link_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  line_group_id text not null,
  group_kind text not null,
  linked_by_specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint drs_case_line_group_links_kind_check check (
    group_kind = 'DRS_CASE_GROUP'
  ),
  constraint drs_case_line_group_links_interval_check check (
    valid_until is null or valid_until > valid_from
  )
);

create table public.drs_case_specialist_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  assigned_by uuid not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint drs_case_specialist_assignments_interval_check check (
    valid_until is null or valid_until > valid_from
  )
);

create table public.drs_case_line_group_link_terminations (
  termination_id uuid primary key default gen_random_uuid(),
  group_link_id uuid not null unique references public.drs_case_line_group_links(group_link_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  line_group_id text not null,
  terminated_at timestamptz not null,
  terminated_by uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint drs_case_line_group_link_terminations_reason_check check (
    btrim(reason) <> ''
  )
);

create table public.drs_case_specialist_assignment_terminations (
  termination_id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  terminated_at timestamptz not null,
  terminated_by uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint drs_case_specialist_assignment_terminations_reason_check check (
    btrim(reason) <> ''
  )
);

create table public.drs_case_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  previous_event_id uuid references public.drs_case_audit_events(event_id) on delete restrict,
  event_type text not null,
  occurred_at timestamptz not null,
  actor_type text not null,
  actor_id text not null,
  source_surface text not null,
  group_link_id uuid references public.drs_case_line_group_links(group_link_id) on delete restrict,
  transport_message_id text,
  payload jsonb not null default '{}'::jsonb,
  recipient_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint drs_case_audit_events_type_check check (
    event_type in (
      'LINE_SENT_EVENT',
      'AI_REVIEW',
      'HUMAN_DECISION',
      'FINAL_MESSAGE',
      'RECEIPT',
      'WORK_ITEM_TRANSITION'
    )
  ),
  constraint drs_case_audit_events_source_check check (
    source_surface in ('LINE', 'DRS_WORKSPACE', 'SYSTEM')
  ),
  constraint drs_case_audit_events_no_self_previous_check check (
    previous_event_id is null or previous_event_id <> event_id
  ),
  constraint drs_case_audit_events_line_sent_payload_check check (
    event_type <> 'LINE_SENT_EVENT'
    or (
      source_surface = 'LINE'
      and group_link_id is not null
      and coalesce(btrim(transport_message_id), '') <> ''
      and payload->>'message_state' = 'SENT'
    )
  ),
  constraint drs_case_audit_events_final_message_payload_check check (
    event_type <> 'FINAL_MESSAGE'
    or (
      source_surface = 'DRS_WORKSPACE'
      and payload ? 'decision_event_id'
      and payload ? 'final_snapshot_id'
      and coalesce(payload->>'final_text', '') <> ''
      and payload->>'transport_status' = 'ACCEPTED_BY_TRANSPORT'
    )
  ),
  constraint drs_case_audit_events_transport_read_check check (
    event_type <> 'RECEIPT'
    or coalesce(payload->>'receipt_kind', '') <> 'TRANSPORT_ACCEPTED'
    or recipient_read = false
  )
);

create table public.drs_review_work_items (
  work_item_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  work_item_type text not null,
  subject_ref jsonb not null,
  state text not null,
  next_actor text not null,
  requested_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drs_review_work_items_type_check check (
    work_item_type in ('DOCUMENT_REVIEW', 'DRAWING_REVIEW')
  ),
  constraint drs_review_work_items_state_check check (
    state in (
      'WAITING_FOR_SPECIALIST_REVIEW',
      'WAITING_FOR_OWNER_DECISION',
      'CLOSED_RECORDED'
    )
  ),
  constraint drs_review_work_items_next_actor_check check (
    next_actor in ('DRS_SPECIALIST', 'OWNER', 'NONE')
  ),
  constraint drs_review_work_items_subject_ref_check check (
    (
      work_item_type = 'DOCUMENT_REVIEW'
      and jsonb_typeof(subject_ref) = 'object'
      and subject_ref ?& array['document_id', 'version']
      and subject_ref - array['document_id', 'version'] = '{}'::jsonb
      and jsonb_typeof(subject_ref->'document_id') = 'string'
      and subject_ref->>'document_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and jsonb_typeof(subject_ref->'version') = 'string'
      and coalesce(btrim(subject_ref->>'version'), '') <> ''
    )
    or (
      work_item_type = 'DRAWING_REVIEW'
      and jsonb_typeof(subject_ref) = 'object'
      and subject_ref ?& array['drawing_id', 'version']
      and subject_ref - array['drawing_id', 'version'] = '{}'::jsonb
      and jsonb_typeof(subject_ref->'drawing_id') = 'string'
      and subject_ref->>'drawing_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and jsonb_typeof(subject_ref->'version') = 'string'
      and coalesce(btrim(subject_ref->>'version'), '') <> ''
    )
  )
);

create table public.drs_review_work_item_transitions (
  transition_id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.drs_review_work_items(work_item_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  audit_event_id uuid not null references public.drs_case_audit_events(event_id) on delete restrict,
  from_state text not null,
  to_state text not null,
  next_actor text not null,
  action text not null,
  actor_type text not null,
  actor_id text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint drs_review_work_item_transitions_state_check check (
    from_state in (
      'WAITING_FOR_SPECIALIST_REVIEW',
      'WAITING_FOR_OWNER_DECISION',
      'CLOSED_RECORDED'
    )
    and to_state in (
      'WAITING_FOR_SPECIALIST_REVIEW',
      'WAITING_FOR_OWNER_DECISION',
      'CLOSED_RECORDED'
    )
    and next_actor in ('DRS_SPECIALIST', 'OWNER', 'NONE')
  )
);

create index if not exists drs_case_line_group_links_case_id_idx
  on public.drs_case_line_group_links(case_id);

create index if not exists drs_case_line_group_links_specialist_id_idx
  on public.drs_case_line_group_links(linked_by_specialist_id);

create index if not exists drs_case_line_group_link_terminations_case_id_idx
  on public.drs_case_line_group_link_terminations(case_id);

create index if not exists drs_case_line_group_link_terminations_line_group_id_idx
  on public.drs_case_line_group_link_terminations(line_group_id);

create index if not exists drs_case_specialist_assignments_case_id_idx
  on public.drs_case_specialist_assignments(case_id);

create index if not exists drs_case_specialist_assignments_specialist_id_idx
  on public.drs_case_specialist_assignments(specialist_id);

create index if not exists drs_case_specialist_assignment_terminations_case_id_idx
  on public.drs_case_specialist_assignment_terminations(case_id);

create index if not exists drs_case_specialist_assignment_terminations_specialist_id_idx
  on public.drs_case_specialist_assignment_terminations(specialist_id);

create index if not exists drs_case_audit_events_case_id_occurred_at_idx
  on public.drs_case_audit_events(case_id, occurred_at);

create unique index if not exists drs_case_audit_events_one_root_per_case
  on public.drs_case_audit_events(case_id)
  where previous_event_id is null;

create index if not exists drs_case_audit_events_previous_event_id_idx
  on public.drs_case_audit_events(previous_event_id);

create unique index if not exists drs_case_audit_events_previous_event_unique
  on public.drs_case_audit_events(previous_event_id)
  where previous_event_id is not null;

create unique index if not exists drs_case_audit_events_line_transport_identity_unique
  on public.drs_case_audit_events(group_link_id, transport_message_id)
  where event_type = 'LINE_SENT_EVENT'
    and source_surface = 'LINE'
    and group_link_id is not null
    and transport_message_id is not null;

create index if not exists drs_case_audit_events_group_link_id_idx
  on public.drs_case_audit_events(group_link_id);

create index if not exists drs_review_work_items_case_id_state_idx
  on public.drs_review_work_items(case_id, state);

create index if not exists drs_review_work_item_transitions_work_item_id_idx
  on public.drs_review_work_item_transitions(work_item_id);

create index if not exists drs_review_work_item_transitions_case_id_idx
  on public.drs_review_work_item_transitions(case_id);

create index if not exists drs_review_work_item_transitions_audit_event_id_idx
  on public.drs_review_work_item_transitions(audit_event_id);

create or replace function drs_private.is_authorized_case_specialist_at(
  target_case_id uuid,
  target_specialist_id uuid,
  checked_at timestamptz
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.drs_case_specialist_assignments active_assignment
    join public.drs_specialists specialist
      on specialist.specialist_id = active_assignment.specialist_id
    where active_assignment.case_id = target_case_id
      and active_assignment.specialist_id = target_specialist_id
      and specialist.authority_state = 'ACTIVE'
      and active_assignment.valid_from <= checked_at
      and least(
        coalesce(active_assignment.valid_until, 'infinity'::timestamptz),
        coalesce((
          select min(termination.terminated_at)
          from public.drs_case_specialist_assignment_terminations termination
          where termination.assignment_id = active_assignment.assignment_id
        ), 'infinity'::timestamptz)
      ) > checked_at
  );
$$;

create or replace function drs_private.is_current_actor_active_case_specialist(target_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_specialist_id uuid;
begin
  target_specialist_id := (select auth.uid());

  if target_specialist_id is null then
    return false;
  end if;

  return drs_private.is_authorized_case_specialist_at(target_case_id, target_specialist_id, now());
end;
$$;

alter function drs_private.is_authorized_case_specialist_at(uuid, uuid, timestamptz) owner to postgres;
alter function drs_private.is_current_actor_active_case_specialist(uuid) owner to postgres;

revoke all on schema drs_private from public;
grant usage on schema drs_private to authenticated;
revoke execute on function drs_private.is_authorized_case_specialist_at(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function drs_private.is_current_actor_active_case_specialist(uuid) from public, anon;
grant execute on function drs_private.is_current_actor_active_case_specialist(uuid) to authenticated;

create or replace function drs_private.jsonb_has_only_keys(target jsonb, allowed_keys text[])
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  entry record;
begin
  if target is null or jsonb_typeof(target) <> 'object' then
    return false;
  end if;

  for entry in select key from jsonb_each(target) loop
    if not entry.key = any(allowed_keys) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke execute on function drs_private.jsonb_has_only_keys(jsonb, text[]) from public, anon, authenticated;

create or replace function drs_private.resolve_pgcrypto_schema()
returns name
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  pgcrypto_schema name;
begin
  select namespace.nspname::name
    into pgcrypto_schema
    from pg_catalog.pg_extension extension
    join pg_catalog.pg_namespace namespace
      on namespace.oid = extension.extnamespace
   where extension.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'PGCRYPTO_EXTENSION_REQUIRED';
  end if;

  return pgcrypto_schema;
end;
$$;

alter function drs_private.resolve_pgcrypto_schema() owner to postgres;
revoke execute on function drs_private.resolve_pgcrypto_schema() from public, anon, authenticated;

create or replace function drs_private.sha256_utf8(input_text text)
returns text
language plpgsql
stable
strict
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  pgcrypto_schema name;
  digest_hex text;
begin
  pgcrypto_schema := drs_private.resolve_pgcrypto_schema();
  execute format('select encode(%I.digest(convert_to($1, ''UTF8''), ''sha256''), ''hex'')', pgcrypto_schema)
    into digest_hex
    using input_text;
  return digest_hex;
end;
$$;

alter function drs_private.sha256_utf8(text) owner to postgres;
revoke execute on function drs_private.sha256_utf8(text) from public, anon, authenticated;

create or replace function drs_private.parse_rfc3339_millis(input_text text)
returns timestamptz
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  match_parts text[];
  normalized_local text;
  normalized_utc text;
  local_roundtrip text;
  parsed_timestamp timestamptz;
  offset_minutes integer := 0;
  local_time_millis bigint;
begin
  if input_text is null
    or coalesce(btrim(input_text), '') = ''
    or input_text <> btrim(input_text) then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if input_text !~ '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,3}))?(Z|([+-])([0-9]{2}):([0-9]{2}))$' then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  match_parts := regexp_match(
    input_text,
    '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,3}))?(Z|([+-])([0-9]{2}):([0-9]{2}))$'
  );

  if match_parts[1] = '0000' then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[2]::integer not between 1 and 12 then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[3]::integer < 1
    or match_parts[3]::integer > extract(
      day from (
        make_date(match_parts[1]::integer, match_parts[2]::integer, 1)
        + interval '1 month - 1 day'
      )
    )::integer then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[4]::integer > 23
    or match_parts[5]::integer > 59
    or match_parts[6]::integer > 59 then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[8] <> 'Z' then
    if match_parts[10]::integer > 23
      or match_parts[11]::integer > 59 then
      raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
    end if;

    offset_minutes := (
      (match_parts[10]::integer * 60) + match_parts[11]::integer
    ) * case when match_parts[9] = '+' then 1 else -1 end;
  end if;

  if abs(offset_minutes) > 14 * 60 then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  normalized_local := format(
    '%s-%s-%sT%s:%s:%s.%s',
    match_parts[1],
    match_parts[2],
    match_parts[3],
    match_parts[4],
    match_parts[5],
    match_parts[6],
    rpad(coalesce(match_parts[7], ''), 3, '0')
  );

  local_time_millis := (
    (
      (
        (match_parts[4]::bigint * 60)
        + match_parts[5]::bigint
      ) * 60
      + match_parts[6]::bigint
    ) * 1000
  ) + rpad(coalesce(match_parts[7], ''), 3, '0')::bigint;

  if match_parts[1] = '0001'
    and match_parts[2]::integer = 1
    and match_parts[3]::integer = 1
    and offset_minutes > 0
    and local_time_millis < (offset_minutes::bigint * 60 * 1000) then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[1] = '9999'
    and match_parts[2]::integer = 12
    and match_parts[3]::integer = 31
    and offset_minutes < 0
    and local_time_millis > (86399999 + (offset_minutes::bigint * 60 * 1000)) then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  begin
    parsed_timestamp := input_text::timestamptz;
  exception when others then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end;

  parsed_timestamp := date_trunc('milliseconds', parsed_timestamp);
  local_roundtrip := to_char(
    (parsed_timestamp at time zone 'UTC') + make_interval(mins => offset_minutes),
    'YYYY-MM-DD"T"HH24:MI:SS.MS'
  );
  normalized_utc := to_char(parsed_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  if normalized_utc !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if local_roundtrip <> normalized_local
    or normalized_utc <> to_char(parsed_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  return parsed_timestamp;
end;
$$;

alter function drs_private.parse_rfc3339_millis(text) owner to postgres;
revoke execute on function drs_private.parse_rfc3339_millis(text) from public, anon, authenticated;

create or replace function drs_private.insert_drs_audit_event(
  input_event_id uuid,
  input_case_id uuid,
  input_previous_event_id uuid,
  input_event_type text,
  input_occurred_at timestamptz,
  input_actor_type text,
  input_actor_id text,
  input_source_surface text,
  input_group_link_id uuid,
  input_transport_message_id text,
  input_payload jsonb,
  input_recipient_read boolean,
  input_allow_ai_review boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_event public.drs_case_audit_events%rowtype;
  persisted_event_id uuid;
begin
  if input_event_type = 'AI_REVIEW'
    and input_allow_ai_review is not true then
    raise exception 'AI_REVIEW_REQUIRES_TRUSTED_APPEND_PATH';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(input_event_id::text, 0));

  select *
    into existing_event
    from public.drs_case_audit_events
    where event_id = input_event_id;

  if existing_event.event_id is not null then
    if existing_event.case_id is distinct from input_case_id
      or existing_event.previous_event_id is distinct from input_previous_event_id
      or existing_event.event_type is distinct from input_event_type
      or existing_event.occurred_at is distinct from input_occurred_at
      or existing_event.actor_type is distinct from input_actor_type
      or existing_event.actor_id is distinct from input_actor_id
      or existing_event.source_surface is distinct from input_source_surface
      or existing_event.group_link_id is distinct from input_group_link_id
      or existing_event.transport_message_id is distinct from input_transport_message_id
      or existing_event.payload is distinct from input_payload
      or existing_event.recipient_read is distinct from input_recipient_read then
      raise exception 'AUDIT_EVENT_IDENTITY_REUSE_CONFLICT';
    end if;

    return existing_event.event_id;
  end if;

  if input_event_type = 'LINE_SENT_EVENT' then
    if input_group_link_id is not null
      and coalesce(btrim(input_transport_message_id), '') <> '' then
      perform pg_advisory_xact_lock(hashtextextended('drs_line_transport:' || input_group_link_id::text || ':' || input_transport_message_id, 0));
    end if;

    select *
      into existing_event
      from public.drs_case_audit_events
      where event_type = 'LINE_SENT_EVENT'
        and source_surface = 'LINE'
        and group_link_id = input_group_link_id
        and transport_message_id = input_transport_message_id;

    if existing_event.event_id is not null then
      if existing_event.event_id is distinct from input_event_id
        or existing_event.case_id is distinct from input_case_id
        or existing_event.previous_event_id is distinct from input_previous_event_id
        or existing_event.occurred_at is distinct from input_occurred_at
        or existing_event.actor_type is distinct from input_actor_type
        or existing_event.actor_id is distinct from input_actor_id
        or existing_event.payload is distinct from input_payload
        or existing_event.recipient_read is distinct from input_recipient_read then
        raise exception 'LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT';
      end if;

      return existing_event.event_id;
    end if;
  end if;

  begin
    insert into public.drs_case_audit_events (
      event_id,
      case_id,
      previous_event_id,
      event_type,
      occurred_at,
      actor_type,
      actor_id,
      source_surface,
      group_link_id,
      transport_message_id,
      payload,
      recipient_read
    ) values (
      input_event_id,
      input_case_id,
      input_previous_event_id,
      input_event_type,
      input_occurred_at,
      input_actor_type,
      input_actor_id,
      input_source_surface,
      input_group_link_id,
      input_transport_message_id,
      input_payload,
      input_recipient_read
    )
    returning event_id into persisted_event_id;
  exception when unique_violation then
    select *
      into existing_event
      from public.drs_case_audit_events
      where event_id = input_event_id;

    if existing_event.event_id is not null then
      if existing_event.case_id is not distinct from input_case_id
        and existing_event.previous_event_id is not distinct from input_previous_event_id
        and existing_event.event_type is not distinct from input_event_type
        and existing_event.occurred_at is not distinct from input_occurred_at
        and existing_event.actor_type is not distinct from input_actor_type
        and existing_event.actor_id is not distinct from input_actor_id
        and existing_event.source_surface is not distinct from input_source_surface
        and existing_event.group_link_id is not distinct from input_group_link_id
        and existing_event.transport_message_id is not distinct from input_transport_message_id
        and existing_event.payload is not distinct from input_payload
        and existing_event.recipient_read is not distinct from input_recipient_read then
        return existing_event.event_id;
      end if;

      raise exception 'AUDIT_EVENT_IDENTITY_REUSE_CONFLICT';
    end if;

    if input_event_type = 'LINE_SENT_EVENT' then
      select *
        into existing_event
        from public.drs_case_audit_events
        where event_type = 'LINE_SENT_EVENT'
          and source_surface = 'LINE'
          and group_link_id = input_group_link_id
          and transport_message_id = input_transport_message_id;

      if existing_event.event_id is not null then
        if existing_event.event_id is not distinct from input_event_id
          and existing_event.case_id is not distinct from input_case_id
          and existing_event.previous_event_id is not distinct from input_previous_event_id
          and existing_event.occurred_at is not distinct from input_occurred_at
          and existing_event.actor_type is not distinct from input_actor_type
          and existing_event.actor_id is not distinct from input_actor_id
          and existing_event.payload is not distinct from input_payload
          and existing_event.recipient_read is not distinct from input_recipient_read then
          return existing_event.event_id;
        end if;

        raise exception 'LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT';
      end if;
    end if;

    if input_previous_event_id is null then
      raise exception 'AUDIT_CHAIN_ROOT_ALREADY_EXISTS';
    end if;

    if input_previous_event_id is not null then
      raise exception 'PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR';
    end if;

    raise exception 'AUDIT_EVENT_UNIQUE_CONFLICT';
  end;

  return persisted_event_id;
end;
$$;

alter function drs_private.insert_drs_audit_event(uuid, uuid, uuid, text, timestamptz, text, text, text, uuid, text, jsonb, boolean, boolean) owner to postgres;
revoke execute on function drs_private.insert_drs_audit_event(uuid, uuid, uuid, text, timestamptz, text, text, text, uuid, text, jsonb, boolean, boolean) from public, anon, authenticated;

create or replace function public.drs_append_audit_event(
  input_event_id uuid,
  input_case_id uuid,
  input_previous_event_id uuid,
  input_event_type text,
  input_occurred_at text,
  input_actor_type text,
  input_actor_id text,
  input_source_surface text,
  input_group_link_id uuid,
  input_transport_message_id text,
  input_payload jsonb,
  input_recipient_read boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parsed_occurred_at timestamptz;
begin
  parsed_occurred_at := drs_private.parse_rfc3339_millis(input_occurred_at);

  return drs_private.insert_drs_audit_event(
    input_event_id,
    input_case_id,
    input_previous_event_id,
    input_event_type,
    parsed_occurred_at,
    input_actor_type,
    input_actor_id,
    input_source_surface,
    input_group_link_id,
    input_transport_message_id,
    input_payload,
    input_recipient_read,
    false
  );
end;
$$;

alter function public.drs_append_audit_event(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean) owner to postgres;
revoke execute on function public.drs_append_audit_event(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.drs_append_audit_event(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean) to service_role;

create or replace function public.drs_append_ai_review_event(
  input_event_id uuid,
  input_case_id uuid,
  input_previous_event_id uuid,
  input_occurred_at text,
  input_review_id uuid,
  input_review_status text,
  input_reviewed_event_id uuid,
  input_flags jsonb,
  input_findings jsonb,
  input_submitted_snapshot_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  input_payload jsonb;
  parsed_occurred_at timestamptz;
begin
  if input_submitted_snapshot_body is null then
    raise exception 'AI_REVIEW_SUBMITTED_SNAPSHOT_BODY_REQUIRED';
  end if;

  parsed_occurred_at := drs_private.parse_rfc3339_millis(input_occurred_at);

  input_payload := jsonb_build_object(
    'review_id', input_review_id::text,
    'review_status', input_review_status,
    'submitted_snapshot_sha256', drs_private.sha256_utf8(input_submitted_snapshot_body),
    'reviewed_event_id', input_reviewed_event_id::text,
    'flags', coalesce(input_flags, '[]'::jsonb),
    'findings', coalesce(input_findings, '[]'::jsonb)
  );

  return drs_private.insert_drs_audit_event(
    input_event_id,
    input_case_id,
    input_previous_event_id,
    'AI_REVIEW',
    parsed_occurred_at,
    'ai_service',
    'drs-ai-review-service',
    'SYSTEM',
    null,
    null,
    input_payload,
    false,
    true
  );
end;
$$;

alter function public.drs_append_ai_review_event(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text) owner to postgres;
revoke execute on function public.drs_append_ai_review_event(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.drs_append_ai_review_event(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text) to service_role;

create or replace function drs_private.reject_drs_record_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'DRS_RECORD_IMMUTABLE';
end;
$$;

create or replace function drs_private.enforce_drs_line_group_link_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.line_group_id, 0));

  if exists (
    select 1
    from public.drs_case_line_group_links existing_link
    left join public.drs_case_line_group_link_terminations existing_termination
      on existing_termination.group_link_id = existing_link.group_link_id
    where existing_link.group_link_id <> new.group_link_id
      and existing_link.line_group_id = new.line_group_id
      and tstzrange(
        existing_link.valid_from,
        least(
          coalesce(existing_link.valid_until, 'infinity'::timestamptz),
          coalesce(existing_termination.terminated_at, 'infinity'::timestamptz)
        ),
        '[)'
      ) && tstzrange(new.valid_from, coalesce(new.valid_until, 'infinity'::timestamptz), '[)')
  ) then
    raise exception 'LINE_GROUP_LINK_INTERVAL_OVERLAP';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_line_group_link_termination_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_group public.drs_case_line_group_links%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.group_link_id::text, 0));

  select *
    into linked_group
    from public.drs_case_line_group_links
    where group_link_id = new.group_link_id
    for update;

  if linked_group.group_link_id is null then
    raise exception 'GROUP_LINK_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(linked_group.group_link_id::text, 0));

  if linked_group.case_id <> new.case_id
    or linked_group.line_group_id <> new.line_group_id then
    raise exception 'GROUP_LINK_TERMINATION_IDENTITY_MISMATCH';
  end if;

  if new.terminated_at <= linked_group.valid_from
    or (
      linked_group.valid_until is not null
      and new.terminated_at > linked_group.valid_until
    ) then
    raise exception 'GROUP_LINK_TERMINATION_TIME_INVALID';
  end if;

  if exists (
    select 1
    from public.drs_case_audit_events accepted_event
    where accepted_event.event_type = 'LINE_SENT_EVENT'
      and accepted_event.case_id = linked_group.case_id
      and accepted_event.group_link_id = linked_group.group_link_id
      and accepted_event.occurred_at >= new.terminated_at
  ) then
    raise exception 'GROUP_LINK_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_specialist_assignment_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.case_id::text, 0));

  if exists (
    select 1
    from public.drs_case_specialist_assignments existing_assignment
    left join public.drs_case_specialist_assignment_terminations existing_termination
      on existing_termination.assignment_id = existing_assignment.assignment_id
    where existing_assignment.assignment_id <> new.assignment_id
      and existing_assignment.case_id = new.case_id
      and tstzrange(
        existing_assignment.valid_from,
        least(
          coalesce(existing_assignment.valid_until, 'infinity'::timestamptz),
          coalesce(existing_termination.terminated_at, 'infinity'::timestamptz)
        ),
        '[)'
      ) && tstzrange(new.valid_from, coalesce(new.valid_until, 'infinity'::timestamptz), '[)')
  ) then
    raise exception 'SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_specialist_assignment_termination_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  assignment public.drs_case_specialist_assignments%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.assignment_id::text, 0));

  select *
    into assignment
    from public.drs_case_specialist_assignments
    where assignment_id = new.assignment_id
    for update;

  if assignment.assignment_id is null then
    raise exception 'SPECIALIST_ASSIGNMENT_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(assignment.assignment_id::text, 0));

  if assignment.case_id <> new.case_id
    or assignment.specialist_id <> new.specialist_id then
    raise exception 'SPECIALIST_ASSIGNMENT_TERMINATION_IDENTITY_MISMATCH';
  end if;

  if new.terminated_at <= assignment.valid_from
    or (
      assignment.valid_until is not null
      and new.terminated_at > assignment.valid_until
    ) then
    raise exception 'SPECIALIST_ASSIGNMENT_TERMINATION_TIME_INVALID';
  end if;

  if exists (
    select 1
    from public.drs_case_audit_events accepted_event
    where accepted_event.case_id = assignment.case_id
      and accepted_event.event_type in ('HUMAN_DECISION', 'FINAL_MESSAGE', 'WORK_ITEM_TRANSITION')
      and accepted_event.actor_type = 'drs_specialist'
      and accepted_event.actor_id = assignment.specialist_id::text
      and accepted_event.occurred_at >= new.terminated_at
  ) then
    raise exception 'ASSIGNMENT_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_audit_event_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  previous_event public.drs_case_audit_events%rowtype;
  decision_event public.drs_case_audit_events%rowtype;
  reviewed_source public.drs_case_audit_events%rowtype;
  ai_review_event public.drs_case_audit_events%rowtype;
  receipt_final public.drs_case_audit_events%rowtype;
  audit_work_item public.drs_review_work_items%rowtype;
  linked_group public.drs_case_line_group_links%rowtype;
  linked_group_effective_until timestamptz;
  receipt_accepted_at timestamptz;
  receipt_ingested_at timestamptz;
  active_assignment_id uuid;
begin
  if new.occurred_at = 'infinity'::timestamptz
    or new.occurred_at = '-infinity'::timestamptz then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if new.previous_event_id is not null then
    select *
      into previous_event
      from public.drs_case_audit_events
      where event_id = new.previous_event_id;

    if previous_event.event_id is null then
      raise exception 'PREVIOUS_EVENT_NOT_FOUND';
    end if;

    if previous_event.case_id <> new.case_id then
      raise exception 'PREVIOUS_EVENT_CASE_MISMATCH';
    end if;

    if previous_event.occurred_at > new.occurred_at then
      raise exception 'PREVIOUS_EVENT_CHRONOLOGY_INVALID';
    end if;
  elsif exists (
    select 1
    from public.drs_case_audit_events existing_root
    where existing_root.case_id = new.case_id
      and existing_root.previous_event_id is null
  ) then
    raise exception 'AUDIT_CHAIN_ROOT_ALREADY_EXISTS';
  end if;

  if new.event_type = 'LINE_SENT_EVENT' then
    if not drs_private.jsonb_has_only_keys(new.payload, array['message_state', 'message_kind', 'sent_text', 'attachment_refs'])
      or jsonb_typeof(new.payload->'message_state') is distinct from 'string'
      or jsonb_typeof(new.payload->'message_kind') is distinct from 'string'
      or jsonb_typeof(new.payload->'sent_text') is distinct from 'string'
      or jsonb_typeof(new.payload->'attachment_refs') is distinct from 'array' then
      raise exception 'LINE_SENT_PAYLOAD_SCHEMA_INVALID';
    end if;

    if new.payload->>'message_state' is distinct from 'SENT' then
      raise exception 'ONLY_SENT_LINE_EVENTS_CAN_BE_INGESTED';
    end if;

    if new.payload->>'message_kind' not in ('TEXT', 'ATTACHMENT', 'TEXT_AND_ATTACHMENT') then
      raise exception 'LINE_MESSAGE_KIND_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.payload->'attachment_refs') attachment_ref(value)
      where jsonb_typeof(attachment_ref.value) is distinct from 'object'
        or not drs_private.jsonb_has_only_keys(attachment_ref.value, array['attachment_id', 'attachment_kind', 'sha256'])
        or jsonb_typeof(attachment_ref.value->'attachment_id') is distinct from 'string'
        or coalesce(btrim(attachment_ref.value->>'attachment_id'), '') = ''
        or jsonb_typeof(attachment_ref.value->'attachment_kind') is distinct from 'string'
        or attachment_ref.value->>'attachment_kind' not in ('IMAGE', 'DOCUMENT', 'DRAWING', 'OTHER')
        or (
          attachment_ref.value ? 'sha256'
          and (
            jsonb_typeof(attachment_ref.value->'sha256') is distinct from 'string'
            or attachment_ref.value->>'sha256' !~* '^[0-9a-f]{64}$'
          )
        )
    ) then
      raise exception 'LINE_ATTACHMENT_REFS_INVALID';
    end if;

    if coalesce(btrim(new.transport_message_id), '') = '' then
      raise exception 'LINE_SENT_TRANSPORT_ID_REQUIRED';
    end if;

    if new.group_link_id is null then
      raise exception 'LINE_GROUP_NOT_FORMALLY_LINKED';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(new.group_link_id::text, 0));

    select *
      into linked_group
      from public.drs_case_line_group_links
      where group_link_id = new.group_link_id
      for update;

    select least(
        coalesce(drs_case_line_group_links.valid_until, 'infinity'::timestamptz),
        coalesce(linked_group_termination.terminated_at, 'infinity'::timestamptz)
      )
      into linked_group_effective_until
      from public.drs_case_line_group_links
      left join public.drs_case_line_group_link_terminations linked_group_termination
        on linked_group_termination.group_link_id = drs_case_line_group_links.group_link_id
      where drs_case_line_group_links.group_link_id = new.group_link_id;

    if linked_group.group_link_id is null then
      raise exception 'LINE_GROUP_NOT_FORMALLY_LINKED';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(linked_group.group_link_id::text, 0));

    if linked_group.case_id <> new.case_id then
      raise exception 'LINE_GROUP_CASE_MISMATCH';
    end if;

    if new.occurred_at < linked_group.valid_from
      or linked_group_effective_until <= new.occurred_at then
      raise exception 'LINE_GROUP_LINK_NOT_ACTIVE';
    end if;
  end if;

  if new.event_type = 'AI_REVIEW' then
    if coalesce(btrim(new.actor_type), '') <> 'ai_service'
      or coalesce(btrim(new.actor_id), '') = '' then
      raise exception 'AI_REVIEW_ACTOR_INVALID';
    end if;

    if coalesce(btrim(new.source_surface), '') <> 'SYSTEM' then
      raise exception 'AI_REVIEW_SOURCE_INVALID';
    end if;

    if not drs_private.jsonb_has_only_keys(
        new.payload,
        array['review_id', 'review_status', 'submitted_snapshot_sha256', 'reviewed_event_id', 'flags', 'findings']
      )
      or jsonb_typeof(new.payload->'review_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'review_status') is distinct from 'string'
      or jsonb_typeof(new.payload->'submitted_snapshot_sha256') is distinct from 'string'
      or jsonb_typeof(new.payload->'reviewed_event_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'flags') is distinct from 'array'
      or jsonb_typeof(new.payload->'findings') is distinct from 'array'
      or new.payload->>'review_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or new.payload->>'reviewed_event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or new.payload->>'submitted_snapshot_sha256' !~* '^[0-9a-f]{64}$'
      or new.payload->>'review_status' not in (
        'REVIEW_COMPLETED_NO_FLAG',
        'REVIEW_COMPLETED_ATTENTION',
        'REVIEW_SERVICE_UNAVAILABLE'
      ) then
      raise exception 'AI_REVIEW_PAYLOAD_SCHEMA_INVALID';
    end if;

    select *
      into reviewed_source
      from public.drs_case_audit_events
      where event_id = (new.payload->>'reviewed_event_id')::uuid;

    if reviewed_source.event_id is null then
      raise exception 'AI_REVIEW_TARGET_NOT_FOUND';
    end if;

    if reviewed_source.case_id <> new.case_id then
      raise exception 'AI_REVIEW_TARGET_CASE_MISMATCH';
    end if;

    if reviewed_source.event_type not in ('LINE_SENT_EVENT', 'WORK_ITEM_TRANSITION') then
      raise exception 'AI_REVIEW_TARGET_EVENT_TYPE_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.payload->'flags') review_flag(value)
      where jsonb_typeof(review_flag.value) is distinct from 'object'
        or not drs_private.jsonb_has_only_keys(review_flag.value, array['code', 'severity'])
        or jsonb_typeof(review_flag.value->'code') is distinct from 'string'
        or coalesce(btrim(review_flag.value->>'code'), '') = ''
        or jsonb_typeof(review_flag.value->'severity') is distinct from 'string'
        or coalesce(btrim(review_flag.value->>'severity'), '') = ''
    ) then
      raise exception 'AI_REVIEW_PAYLOAD_SCHEMA_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.payload->'findings') review_finding(value)
      where jsonb_typeof(review_finding.value) is distinct from 'object'
        or not drs_private.jsonb_has_only_keys(review_finding.value, array['finding_id', 'severity', 'summary'])
        or jsonb_typeof(review_finding.value->'finding_id') is distinct from 'string'
        or coalesce(btrim(review_finding.value->>'finding_id'), '') = ''
        or jsonb_typeof(review_finding.value->'severity') is distinct from 'string'
        or coalesce(btrim(review_finding.value->>'severity'), '') = ''
        or jsonb_typeof(review_finding.value->'summary') is distinct from 'string'
        or coalesce(btrim(review_finding.value->>'summary'), '') = ''
    ) then
      raise exception 'AI_REVIEW_PAYLOAD_SCHEMA_INVALID';
    end if;
  end if;

  if new.event_type = 'HUMAN_DECISION' then
    if new.source_surface <> 'DRS_WORKSPACE' then
      raise exception 'HUMAN_DECISION_SOURCE_INVALID';
    end if;

    if new.actor_type <> 'drs_specialist' then
      raise exception 'HUMAN_DECISION_ACTOR_MUST_BE_ASSIGNED_SPECIALIST';
    end if;

    if exists (
      select 1
      from public.drs_specialists specialist
      where specialist.specialist_id = new.actor_id::uuid
        and specialist.authority_state <> 'ACTIVE'
    ) then
      raise exception 'SPECIALIST_AUTHORITY_NOT_ACTIVE';
    end if;

    if not drs_private.jsonb_has_only_keys(
      new.payload,
      array['decision', 'reason', 'urgency', 'incident_id', 'ai_review_event_id', 'final_snapshot_id', 'result_difference', 'break_glass_result']
    )
      or jsonb_typeof(new.payload->'decision') is distinct from 'string'
      or jsonb_typeof(new.payload->'reason') is distinct from 'string'
      or jsonb_typeof(new.payload->'urgency') is distinct from 'string'
      or jsonb_typeof(new.payload->'final_snapshot_id') is distinct from 'string'
      or new.payload->>'final_snapshot_id' !~* '^[0-9a-f]{64}$'
      or not (new.payload ? 'incident_id')
      or jsonb_typeof(new.payload->'incident_id') not in ('string', 'null')
      or (
        new.payload ? 'ai_review_event_id'
        and jsonb_typeof(new.payload->'ai_review_event_id') not in ('string', 'null')
      )
      or (
        jsonb_typeof(new.payload->'ai_review_event_id') = 'string'
        and new.payload->>'ai_review_event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) then
      raise exception 'HUMAN_DECISION_PAYLOAD_SCHEMA_INVALID';
    end if;

    if coalesce(new.payload->>'final_snapshot_id', '') = '' then
      raise exception 'HUMAN_DECISION_FINAL_SNAPSHOT_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') not in (
      'EDIT_AND_SEND',
      'OVERRIDE_AND_SEND',
      'MANUAL_EXCEPTION_SEND',
      'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
    ) then
      raise exception 'HUMAN_DECISION_INVALID';
    end if;

    if coalesce(new.payload->>'decision', '') in ('EDIT_AND_SEND', 'OVERRIDE_AND_SEND', 'MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS')
      and coalesce(btrim(new.payload->>'reason'), '') = '' then
      raise exception 'HUMAN_DECISION_REASON_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') in ('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS')
      and coalesce(btrim(new.payload->>'urgency'), '') = '' then
      raise exception 'MANUAL_EXCEPTION_URGENCY_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') in ('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS')
      and coalesce(btrim(new.payload->>'incident_id'), '') = '' then
      raise exception 'MANUAL_EXCEPTION_INCIDENT_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') = 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS' then
      if jsonb_typeof(new.payload->'ai_review_event_id') = 'string' then
        raise exception 'BREAK_GLASS_AI_REVIEW_FORBIDDEN';
      end if;

      if new.payload ? 'result_difference' then
        raise exception 'BREAK_GLASS_RESULT_SCHEMA_INVALID';
      end if;

      if not (
        jsonb_typeof(new.payload->'break_glass_result') is not distinct from 'object'
        and drs_private.jsonb_has_only_keys(new.payload->'break_glass_result', array['ai_review_performed', 'final_snapshot_sha256'])
        and new.payload->'break_glass_result'->'ai_review_performed' is not distinct from 'false'::jsonb
        and jsonb_typeof(new.payload->'break_glass_result'->'final_snapshot_sha256') is not distinct from 'string'
        and new.payload->'break_glass_result'->>'final_snapshot_sha256' ~* '^[0-9a-f]{64}$'
      ) then
        raise exception 'BREAK_GLASS_RESULT_REQUIRED';
      end if;

      if new.payload->'break_glass_result'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
        raise exception 'BREAK_GLASS_RESULT_FINAL_SNAPSHOT_MISMATCH';
      end if;
    else
      if new.payload ? 'break_glass_result' then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED';
      end if;

      if not (new.payload ? 'result_difference') then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED';
      end if;

      if not (
        jsonb_typeof(new.payload->'result_difference') is not distinct from 'object'
        and drs_private.jsonb_has_only_keys(new.payload->'result_difference', array['submitted_snapshot_sha256', 'final_snapshot_sha256', 'content_changed'])
        and jsonb_typeof(new.payload->'result_difference'->'submitted_snapshot_sha256') is not distinct from 'string'
        and new.payload->'result_difference'->>'submitted_snapshot_sha256' ~* '^[0-9a-f]{64}$'
        and jsonb_typeof(new.payload->'result_difference'->'final_snapshot_sha256') is not distinct from 'string'
        and new.payload->'result_difference'->>'final_snapshot_sha256' ~* '^[0-9a-f]{64}$'
        and jsonb_typeof(new.payload->'result_difference'->'content_changed') is not distinct from 'boolean'
      ) then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_SCHEMA_INVALID';
      end if;

      if new.payload->'result_difference'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_FINAL_SNAPSHOT_MISMATCH';
      end if;

      if (new.payload->'result_difference'->>'content_changed')::boolean is distinct from (
        new.payload->'result_difference'->>'submitted_snapshot_sha256' is distinct from new.payload->'result_difference'->>'final_snapshot_sha256'
      ) then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_CHANGED_FLAG_MISMATCH';
      end if;

      if coalesce(new.payload->>'decision', '') = 'EDIT_AND_SEND'
        and (new.payload->'result_difference'->>'content_changed')::boolean is not true then
        raise exception 'EDIT_AND_SEND_REQUIRES_CONTENT_CHANGE';
      end if;
    end if;

    if coalesce(new.payload->>'decision', '') <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
      and (
        jsonb_typeof(new.payload->'ai_review_event_id') is distinct from 'string'
        or coalesce(new.payload->>'ai_review_event_id', '') = ''
      ) then
      raise exception 'HUMAN_DECISION_REQUIRES_AI_REVIEW';
    end if;

    if jsonb_typeof(new.payload->'ai_review_event_id') = 'string' then
      select *
        into ai_review_event
        from public.drs_case_audit_events
        where event_id = (new.payload->>'ai_review_event_id')::uuid;

      if ai_review_event.event_id is null
        or ai_review_event.event_type <> 'AI_REVIEW' then
        raise exception 'HUMAN_DECISION_REQUIRES_AI_REVIEW';
      end if;

      if ai_review_event.case_id <> new.case_id then
        raise exception 'HUMAN_DECISION_AI_REVIEW_CASE_MISMATCH';
      end if;

      if coalesce(new.payload->>'decision', '') <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
        and new.payload->'result_difference'->>'submitted_snapshot_sha256' is distinct from ai_review_event.payload->>'submitted_snapshot_sha256' then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_AI_SNAPSHOT_MISMATCH';
      end if;

      if coalesce(new.payload->>'decision', '') in ('EDIT_AND_SEND', 'OVERRIDE_AND_SEND')
        and ai_review_event.payload->>'review_status' = 'REVIEW_SERVICE_UNAVAILABLE' then
        raise exception 'HUMAN_DECISION_AI_REVIEW_STATUS_INVALID';
      end if;

      if coalesce(new.payload->>'decision', '') = 'MANUAL_EXCEPTION_SEND'
        and ai_review_event.payload->>'review_status' <> 'REVIEW_SERVICE_UNAVAILABLE' then
        raise exception 'HUMAN_DECISION_AI_REVIEW_STATUS_INVALID';
      end if;
    end if;

    select active_assignment.assignment_id
      into active_assignment_id
      from public.drs_case_specialist_assignments active_assignment
      where active_assignment.case_id = new.case_id
        and active_assignment.specialist_id = new.actor_id::uuid
        and active_assignment.valid_from <= new.occurred_at
      order by active_assignment.valid_from desc
      limit 1;

    if active_assignment_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
    end if;

    if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
      raise exception 'SPECIALIST_ASSIGNMENT_NOT_ACTIVE';
    end if;
  end if;

  if new.event_type = 'FINAL_MESSAGE' then
    if not drs_private.jsonb_has_only_keys(
      new.payload,
      array['decision_event_id', 'final_snapshot_id', 'final_text', 'transport_status']
    )
      or jsonb_typeof(new.payload->'decision_event_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'final_snapshot_id') is distinct from 'string'
      or new.payload->>'final_snapshot_id' !~* '^[0-9a-f]{64}$'
      or jsonb_typeof(new.payload->'final_text') is distinct from 'string'
      or coalesce(btrim(new.payload->>'final_text'), '') = ''
      or jsonb_typeof(new.payload->'transport_status') is distinct from 'string' then
      raise exception 'FINAL_MESSAGE_PAYLOAD_SCHEMA_INVALID';
    end if;

    if new.payload->>'final_snapshot_id' is distinct from drs_private.sha256_utf8(new.payload->>'final_text') then
      raise exception 'FINAL_MESSAGE_BODY_HASH_MISMATCH';
    end if;

    select *
      into decision_event
      from public.drs_case_audit_events
      where event_id = (new.payload->>'decision_event_id')::uuid;

    if decision_event.event_id is null
      or decision_event.case_id <> new.case_id
      or decision_event.event_type <> 'HUMAN_DECISION' then
      raise exception 'FINAL_MESSAGE_REQUIRES_HUMAN_DECISION';
    end if;

    if decision_event.actor_type <> 'drs_specialist' then
      raise exception 'FINAL_MESSAGE_REQUIRES_SPECIALIST_DECISION';
    end if;

    if coalesce(decision_event.payload->>'decision', '') not in (
      'EDIT_AND_SEND',
      'OVERRIDE_AND_SEND',
      'MANUAL_EXCEPTION_SEND',
      'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
    ) then
      raise exception 'FINAL_MESSAGE_REQUIRES_VALID_HUMAN_DECISION';
    end if;

    if coalesce(decision_event.payload->>'final_snapshot_id', '') = '' then
      raise exception 'FINAL_MESSAGE_DECISION_SNAPSHOT_REQUIRED';
    end if;

    if decision_event.payload->>'final_snapshot_id' is distinct from new.payload->>'final_snapshot_id' then
      raise exception 'FINAL_MESSAGE_SNAPSHOT_MISMATCH';
    end if;

    if coalesce(decision_event.payload->>'decision', '') = 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
      and decision_event.payload->'break_glass_result'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
      raise exception 'FINAL_MESSAGE_SNAPSHOT_MISMATCH';
    end if;

    if coalesce(decision_event.payload->>'decision', '') <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
      and decision_event.payload->'result_difference'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
      raise exception 'FINAL_MESSAGE_SNAPSHOT_MISMATCH';
    end if;

    if decision_event.occurred_at > new.occurred_at then
      raise exception 'FINAL_MESSAGE_DECISION_CHRONOLOGY_INVALID';
    end if;

    if not drs_private.is_authorized_case_specialist_at(
      new.case_id,
      decision_event.actor_id::uuid,
      decision_event.occurred_at
    ) then
      raise exception 'FINAL_MESSAGE_DECISION_SPECIALIST_NOT_ACTIVE';
    end if;

    if new.actor_type <> 'drs_specialist' then
      raise exception 'FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST';
    end if;

    if decision_event.actor_id <> new.actor_id then
      raise exception 'FINAL_MESSAGE_DECISION_SPECIALIST_MISMATCH';
    end if;

    select active_assignment.assignment_id
      into active_assignment_id
      from public.drs_case_specialist_assignments active_assignment
      where active_assignment.case_id = new.case_id
        and active_assignment.specialist_id = new.actor_id::uuid
        and active_assignment.valid_from <= new.occurred_at
      order by active_assignment.valid_from desc
      limit 1;

    if active_assignment_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
    end if;

    if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
      raise exception 'FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST';
    end if;
  end if;

  if new.event_type = 'RECEIPT' then
    if not drs_private.jsonb_has_only_keys(
        new.payload,
        array['final_message_event_id', 'receipt_kind', 'recipient_read', 'transport_message_id', 'accepted_at', 'ingested_at']
      )
      or jsonb_typeof(new.payload->'final_message_event_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'receipt_kind') is distinct from 'string'
      or jsonb_typeof(new.payload->'recipient_read') is distinct from 'boolean'
      or jsonb_typeof(new.payload->'transport_message_id') is distinct from 'string'
      or coalesce(btrim(new.payload->>'transport_message_id'), '') = ''
      or jsonb_typeof(new.payload->'accepted_at') is distinct from 'string'
      or jsonb_typeof(new.payload->'ingested_at') is distinct from 'string' then
      raise exception 'RECEIPT_PAYLOAD_SCHEMA_INVALID';
    end if;

    if new.payload->>'receipt_kind' <> 'TRANSPORT_ACCEPTED' then
      raise exception 'RECEIPT_KIND_INVALID';
    end if;

    if new.recipient_read is distinct from false
      or new.payload->'recipient_read' is distinct from to_jsonb(new.recipient_read) then
      raise exception 'TRANSPORT_ACCEPTED_IS_NOT_RECIPIENT_READ';
    end if;

    receipt_accepted_at := drs_private.parse_rfc3339_millis(new.payload->>'accepted_at');
    receipt_ingested_at := drs_private.parse_rfc3339_millis(new.payload->>'ingested_at');

    if receipt_accepted_at > receipt_ingested_at
      or receipt_ingested_at > new.occurred_at then
      raise exception 'RECEIPT_TRANSPORT_TIME_INVALID';
    end if;

    select *
      into receipt_final
      from public.drs_case_audit_events
      where event_id = (new.payload->>'final_message_event_id')::uuid;

    if receipt_final.event_id is null
      or receipt_final.event_type <> 'FINAL_MESSAGE' then
      raise exception 'RECEIPT_FINAL_MESSAGE_REQUIRED';
    end if;

    if receipt_final.case_id <> new.case_id then
      raise exception 'RECEIPT_FINAL_MESSAGE_CASE_MISMATCH';
    end if;
  end if;

  if new.event_type = 'WORK_ITEM_TRANSITION' then
    if not drs_private.jsonb_has_only_keys(new.payload, array['work_item_id', 'action', 'subject_ref'])
      or jsonb_typeof(new.payload->'work_item_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'action') is distinct from 'string'
      or jsonb_typeof(new.payload->'subject_ref') is distinct from 'object'
      or new.payload->>'work_item_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(btrim(new.payload->>'work_item_id'), '') = ''
      or coalesce(btrim(new.payload->>'action'), '') = ''
      or not (
        (
          drs_private.jsonb_has_only_keys(new.payload->'subject_ref', array['document_id', 'version'])
          and jsonb_typeof(new.payload->'subject_ref'->'document_id') is not distinct from 'string'
          and new.payload->'subject_ref'->>'document_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and coalesce(btrim(new.payload->'subject_ref'->>'document_id'), '') <> ''
          and jsonb_typeof(new.payload->'subject_ref'->'version') is not distinct from 'string'
          and coalesce(btrim(new.payload->'subject_ref'->>'version'), '') <> ''
        )
        or (
          drs_private.jsonb_has_only_keys(new.payload->'subject_ref', array['drawing_id', 'version'])
          and jsonb_typeof(new.payload->'subject_ref'->'drawing_id') is not distinct from 'string'
          and new.payload->'subject_ref'->>'drawing_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and coalesce(btrim(new.payload->'subject_ref'->>'drawing_id'), '') <> ''
          and jsonb_typeof(new.payload->'subject_ref'->'version') is not distinct from 'string'
          and coalesce(btrim(new.payload->'subject_ref'->>'version'), '') <> ''
        )
    ) then
      raise exception 'WORK_ITEM_TRANSITION_PAYLOAD_SCHEMA_INVALID';
    end if;

    select *
      into audit_work_item
      from public.drs_review_work_items
      where work_item_id = (new.payload->>'work_item_id')::uuid;

    if audit_work_item.work_item_id is null then
      raise exception 'WORK_ITEM_NOT_FOUND';
    end if;

    if audit_work_item.case_id <> new.case_id then
      raise exception 'WORK_ITEM_TRANSITION_CASE_MISMATCH';
    end if;

    if audit_work_item.subject_ref is distinct from new.payload->'subject_ref' then
      raise exception 'WORK_ITEM_TRANSITION_AUDIT_SUBJECT_MISMATCH';
    end if;

    if new.actor_type = 'drs_specialist' then
      select active_assignment.assignment_id
        into active_assignment_id
        from public.drs_case_specialist_assignments active_assignment
        where active_assignment.case_id = new.case_id
          and active_assignment.specialist_id = new.actor_id::uuid
          and active_assignment.valid_from <= new.occurred_at
        order by active_assignment.valid_from desc
        limit 1;

      if active_assignment_id is not null then
        perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
      end if;

      if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
        raise exception 'WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_work_item_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.drs_review_work_item_transitions guarded_transition
    where guarded_transition.work_item_id = new.work_item_id
      and guarded_transition.case_id = new.case_id
      and guarded_transition.from_state = old.state
      and guarded_transition.to_state = new.state
      and guarded_transition.next_actor = new.next_actor
      and guarded_transition.occurred_at = new.updated_at
  ) then
    raise exception 'WORK_ITEM_STATE_REQUIRES_TRANSITION_RECORD';
  end if;
  return new;
end;
$$;

create or replace function drs_private.enforce_drs_work_item_transition_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  work_item public.drs_review_work_items%rowtype;
  audit_event public.drs_case_audit_events%rowtype;
  case_record public.drs_cases%rowtype;
  active_assignment_id uuid;
  expected_to_state text;
  expected_next_actor text;
begin
  select *
    into work_item
    from public.drs_review_work_items
    where work_item_id = new.work_item_id
    for update;

  if work_item.work_item_id is null then
    raise exception 'WORK_ITEM_NOT_FOUND';
  end if;

  if work_item.case_id <> new.case_id then
    raise exception 'WORK_ITEM_TRANSITION_CASE_MISMATCH';
  end if;

  if new.occurred_at = 'infinity'::timestamptz
    or new.occurred_at = '-infinity'::timestamptz then
    raise exception 'WORK_ITEM_TRANSITION_OCCURRED_AT_INVALID';
  end if;

  select *
    into case_record
    from public.drs_cases
    where case_id = new.case_id;

  select *
    into audit_event
    from public.drs_case_audit_events
    where event_id = new.audit_event_id;

  if audit_event.event_id is null then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED';
  end if;

  if audit_event.case_id <> new.case_id then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_CASE_MISMATCH';
  end if;

  if audit_event.event_type <> 'WORK_ITEM_TRANSITION' then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_TYPE_INVALID';
  end if;

  if audit_event.actor_type <> new.actor_type
    or audit_event.actor_id <> new.actor_id then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_ACTOR_MISMATCH';
  end if;

  if audit_event.payload->>'work_item_id' is distinct from new.work_item_id::text then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED';
  end if;

  if audit_event.payload->>'action' is distinct from new.action then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_ACTION_MISMATCH';
  end if;

  if audit_event.payload->'subject_ref' is distinct from work_item.subject_ref then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_SUBJECT_MISMATCH';
  end if;

  if audit_event.occurred_at is distinct from new.occurred_at then
    raise exception 'WORK_ITEM_TRANSITION_EVIDENCE_TIME_MISMATCH';
  end if;

  if new.actor_type = 'owner'
    and new.actor_id <> case_record.owner_id::text then
    raise exception 'WORK_ITEM_TRANSITION_OWNER_REQUIRED';
  end if;

  if new.actor_type = 'drs_specialist' then
    select active_assignment.assignment_id
      into active_assignment_id
      from public.drs_case_specialist_assignments active_assignment
      where active_assignment.case_id = new.case_id
        and active_assignment.specialist_id = new.actor_id::uuid
        and active_assignment.valid_from <= new.occurred_at
      order by active_assignment.valid_from desc
      limit 1;

    if active_assignment_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
    end if;

    if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
      raise exception 'WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE';
    end if;
  end if;

  if new.from_state <> work_item.state then
    raise exception 'WORK_ITEM_TRANSITION_FROM_STATE_MISMATCH';
  end if;

  if new.from_state = 'WAITING_FOR_SPECIALIST_REVIEW'
    and new.action in ('MARK_REVIEW_COMPLETED_ATTENTION', 'MARK_REVIEW_COMPLETED_NO_FLAG')
    and new.actor_type = 'drs_specialist' then
    expected_to_state := 'WAITING_FOR_OWNER_DECISION';
    expected_next_actor := 'OWNER';
  elsif new.from_state = 'WAITING_FOR_OWNER_DECISION'
    and new.action = 'OWNER_CONFIRMED'
    and new.actor_type = 'owner' then
    expected_to_state := 'CLOSED_RECORDED';
    expected_next_actor := 'NONE';
  else
    raise exception 'WORK_ITEM_TRANSITION_INVALID';
  end if;

  if new.to_state <> expected_to_state or new.next_actor <> expected_next_actor then
    raise exception 'WORK_ITEM_TRANSITION_STATE_MISMATCH';
  end if;

  update public.drs_review_work_items
    set state = new.to_state,
        next_actor = new.next_actor,
        updated_at = new.occurred_at
    where work_item_id = new.work_item_id;

  return new;
end;
$$;

drop trigger if exists drs_case_audit_events_insert_guard on public.drs_case_audit_events;
create trigger drs_case_audit_events_insert_guard
  before insert on public.drs_case_audit_events
  for each row
  execute function drs_private.enforce_drs_audit_event_insert();

drop trigger if exists drs_case_audit_events_no_update on public.drs_case_audit_events;
create trigger drs_case_audit_events_no_update
  before update on public.drs_case_audit_events
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_audit_events_no_delete on public.drs_case_audit_events;
create trigger drs_case_audit_events_no_delete
  before delete on public.drs_case_audit_events
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_links_insert_guard on public.drs_case_line_group_links;
create trigger drs_case_line_group_links_insert_guard
  before insert on public.drs_case_line_group_links
  for each row
  execute function drs_private.enforce_drs_line_group_link_insert();

drop trigger if exists drs_case_line_group_links_no_update on public.drs_case_line_group_links;
create trigger drs_case_line_group_links_no_update
  before update on public.drs_case_line_group_links
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_links_no_delete on public.drs_case_line_group_links;
create trigger drs_case_line_group_links_no_delete
  before delete on public.drs_case_line_group_links
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_link_terminations_insert_guard on public.drs_case_line_group_link_terminations;
create trigger drs_case_line_group_link_terminations_insert_guard
  before insert on public.drs_case_line_group_link_terminations
  for each row
  execute function drs_private.enforce_drs_line_group_link_termination_insert();

drop trigger if exists drs_case_line_group_link_terminations_no_update on public.drs_case_line_group_link_terminations;
create trigger drs_case_line_group_link_terminations_no_update
  before update on public.drs_case_line_group_link_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_link_terminations_no_delete on public.drs_case_line_group_link_terminations;
create trigger drs_case_line_group_link_terminations_no_delete
  before delete on public.drs_case_line_group_link_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignments_insert_guard on public.drs_case_specialist_assignments;
create trigger drs_case_specialist_assignments_insert_guard
  before insert on public.drs_case_specialist_assignments
  for each row
  execute function drs_private.enforce_drs_specialist_assignment_insert();

drop trigger if exists drs_case_specialist_assignments_no_update on public.drs_case_specialist_assignments;
create trigger drs_case_specialist_assignments_no_update
  before update on public.drs_case_specialist_assignments
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignments_no_delete on public.drs_case_specialist_assignments;
create trigger drs_case_specialist_assignments_no_delete
  before delete on public.drs_case_specialist_assignments
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignment_terminations_insert_guard on public.drs_case_specialist_assignment_terminations;
create trigger drs_case_specialist_assignment_terminations_insert_guard
  before insert on public.drs_case_specialist_assignment_terminations
  for each row
  execute function drs_private.enforce_drs_specialist_assignment_termination_insert();

drop trigger if exists drs_case_specialist_assignment_terminations_no_update on public.drs_case_specialist_assignment_terminations;
create trigger drs_case_specialist_assignment_terminations_no_update
  before update on public.drs_case_specialist_assignment_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignment_terminations_no_delete on public.drs_case_specialist_assignment_terminations;
create trigger drs_case_specialist_assignment_terminations_no_delete
  before delete on public.drs_case_specialist_assignment_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_review_work_items_state_update_guard on public.drs_review_work_items;
create trigger drs_review_work_items_state_update_guard
  before update of state, next_actor on public.drs_review_work_items
  for each row
  execute function drs_private.enforce_drs_work_item_update();

drop trigger if exists drs_review_work_item_transitions_insert_guard on public.drs_review_work_item_transitions;
create trigger drs_review_work_item_transitions_insert_guard
  after insert on public.drs_review_work_item_transitions
  for each row
  execute function drs_private.enforce_drs_work_item_transition_insert();

drop trigger if exists drs_review_work_item_transitions_no_update on public.drs_review_work_item_transitions;
create trigger drs_review_work_item_transitions_no_update
  before update on public.drs_review_work_item_transitions
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_review_work_item_transitions_no_delete on public.drs_review_work_item_transitions;
create trigger drs_review_work_item_transitions_no_delete
  before delete on public.drs_review_work_item_transitions
  for each row
  execute function drs_private.reject_drs_record_mutation();

alter table public.drs_cases enable row level security;
alter table public.drs_cases force row level security;

alter table public.drs_specialists enable row level security;
alter table public.drs_specialists force row level security;

alter table public.drs_case_line_group_links enable row level security;
alter table public.drs_case_line_group_links force row level security;

alter table public.drs_case_line_group_link_terminations enable row level security;
alter table public.drs_case_line_group_link_terminations force row level security;

alter table public.drs_case_specialist_assignments enable row level security;
alter table public.drs_case_specialist_assignments force row level security;

alter table public.drs_case_specialist_assignment_terminations enable row level security;
alter table public.drs_case_specialist_assignment_terminations force row level security;

alter table public.drs_case_audit_events enable row level security;
alter table public.drs_case_audit_events force row level security;
revoke insert, update, delete on public.drs_case_audit_events from public, anon, authenticated, service_role;

alter table public.drs_review_work_items enable row level security;
alter table public.drs_review_work_items force row level security;

alter table public.drs_review_work_item_transitions enable row level security;
alter table public.drs_review_work_item_transitions force row level security;

drop policy if exists drs_cases_owner_or_assigned_specialist on public.drs_cases;
create policy drs_cases_owner_or_assigned_specialist
  on public.drs_cases
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_specialists_self_select on public.drs_specialists;
create policy drs_specialists_self_select
  on public.drs_specialists
  for select
  to authenticated
  using (
    specialist_id = (select auth.uid())
  );

drop policy if exists drs_case_line_group_links_case_participant_select on public.drs_case_line_group_links;
create policy drs_case_line_group_links_case_participant_select
  on public.drs_case_line_group_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_line_group_links.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_specialist_assignments_case_participant_select on public.drs_case_specialist_assignments;
create policy drs_case_specialist_assignments_case_participant_select
  on public.drs_case_specialist_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_specialist_assignments.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_line_group_link_terminations_case_participant_select on public.drs_case_line_group_link_terminations;
create policy drs_case_line_group_link_terminations_case_participant_select
  on public.drs_case_line_group_link_terminations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_line_group_link_terminations.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_specialist_assignment_terminations_case_participant_select on public.drs_case_specialist_assignment_terminations;
create policy drs_case_specialist_assignment_terminations_case_participant_select
  on public.drs_case_specialist_assignment_terminations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_specialist_assignment_terminations.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_audit_events_case_participant_select on public.drs_case_audit_events;
create policy drs_case_audit_events_case_participant_select
  on public.drs_case_audit_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_audit_events.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_review_work_items_case_participant_select on public.drs_review_work_items;
create policy drs_review_work_items_case_participant_select
  on public.drs_review_work_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_review_work_items.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_review_work_item_transitions_case_participant_select on public.drs_review_work_item_transitions;
create policy drs_review_work_item_transitions_case_participant_select
  on public.drs_review_work_item_transitions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_review_work_item_transitions.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

-- BRIDGE_PHASE_IDENTITY_FOUNDATION
create schema if not exists integration;
alter schema integration owner to postgres;
revoke all on schema integration from public, anon, authenticated, service_role;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('public.drs_specialists') is null
  then
    raise exception 'DRS_IDENTITY_PROVIDER_PREREQUISITE_MISSING';
  end if;
end;
$$;

create table integration.drs_identity_provider_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  provider_subject text not null,
  authenticated_user_id uuid not null,
  specialist_id uuid not null,
  authorization_subject text not null,
  verified_email text,
  binding_status text not null default 'active',
  verified_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  unique (provider, provider_subject),
  constraint drs_identity_provider_bindings_provider_check check (
    provider in ('google', 'line')
  ),
  constraint drs_identity_provider_bindings_subject_check check (
    btrim(provider_subject) <> ''
  ),
  constraint drs_identity_provider_bindings_authorization_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_identity_provider_bindings_status_check check (
    binding_status in ('active', 'revoked')
  ),
  constraint drs_identity_provider_bindings_revocation_check check (
    (binding_status = 'revoked' and revoked_at is not null)
    or (binding_status = 'active' and revoked_at is null)
  )
);

create unique index drs_identity_provider_bindings_active_user_idx
  on integration.drs_identity_provider_bindings (
    provider,
    authenticated_user_id
  )
  where binding_status = 'active' and revoked_at is null;

create unique index drs_identity_provider_bindings_active_specialist_idx
  on integration.drs_identity_provider_bindings (
    provider,
    specialist_id
  )
  where binding_status = 'active' and revoked_at is null;

create index drs_identity_provider_bindings_specialist_idx
  on integration.drs_identity_provider_bindings (specialist_id);

create table integration.drs_identity_link_states (
  state_id uuid primary key default extensions.gen_random_uuid(),
  state_digest text not null unique,
  nonce_digest text not null,
  pkce_verifier_ciphertext text not null,
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  provider text not null,
  intended_action text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claim_token uuid unique,
  provider_exchange_started_at timestamptz,
  consumed_at timestamptz,
  failed_at timestamptz,
  terminal_status text not null default 'pending',
  failure_state text,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  constraint drs_identity_link_states_provider_check check (
    provider in ('google', 'line')
  ),
  constraint drs_identity_link_states_action_check check (
    intended_action in ('login', 'bind')
  ),
  constraint drs_identity_link_states_context_check check (
    (
      intended_action = 'login'
      and authenticated_user_id is null
      and specialist_id is null
      and authorization_subject is null
    )
    or (
      intended_action = 'bind'
      and authenticated_user_id is not null
      and specialist_id is not null
      and authorization_subject =
        'drs-specialist:' || specialist_id::text
    )
  ),
  constraint drs_identity_link_states_ttl_check check (
    isfinite(created_at)
    and isfinite(expires_at)
    and expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  ),
  constraint drs_identity_link_states_terminal_status_check check (
    terminal_status in ('pending', 'claimed', 'consumed', 'failed')
  ),
  constraint drs_identity_link_states_terminal_fields_check check (
    (
      terminal_status = 'pending'
      and claimed_at is null
      and claim_token is null
      and provider_exchange_started_at is null
      and consumed_at is null
      and failed_at is null
    )
    or (
      terminal_status = 'claimed'
      and claimed_at is not null
      and claim_token is not null
      and provider_exchange_started_at is not null
      and consumed_at is null
      and failed_at is null
    )
    or (
      terminal_status = 'consumed'
      and claimed_at is not null
      and claim_token is not null
      and provider_exchange_started_at is not null
      and consumed_at is not null
      and failed_at is null
    )
    or (
      terminal_status = 'failed'
      and claimed_at is not null
      and claim_token is not null
      and provider_exchange_started_at is not null
      and consumed_at is null
      and failed_at is not null
    )
  )
);

create index drs_identity_link_states_authenticated_user_idx
  on integration.drs_identity_link_states (authenticated_user_id)
  where authenticated_user_id is not null;

create index drs_identity_link_states_specialist_idx
  on integration.drs_identity_link_states (specialist_id)
  where specialist_id is not null;

create table integration.drs_identity_provider_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  authenticated_user_id uuid,
  specialist_id uuid,
  provider text not null,
  event_type text not null,
  state_id uuid,
  occurred_at timestamptz not null,
  correlation_id uuid not null,
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  foreign key (state_id)
    references integration.drs_identity_link_states(state_id)
    on delete restrict,
  constraint drs_identity_provider_events_provider_check check (
    provider in ('google', 'line')
  ),
  constraint drs_identity_provider_events_type_check check (
    event_type in (
      'identity_binding_created',
      'identity_login',
      'identity_binding_revoked',
      'identity_callback_failed'
    )
  )
);

create index drs_identity_provider_events_authenticated_user_idx
  on integration.drs_identity_provider_events (
    authenticated_user_id,
    occurred_at desc
  );

create index drs_identity_provider_events_specialist_idx
  on integration.drs_identity_provider_events (
    specialist_id,
    occurred_at desc
  );

create index drs_identity_provider_events_state_idx
  on integration.drs_identity_provider_events (state_id);

alter table integration.drs_identity_provider_bindings owner to postgres;
alter table integration.drs_identity_link_states owner to postgres;
alter table integration.drs_identity_provider_events owner to postgres;

alter table integration.drs_identity_provider_bindings
  enable row level security;
alter table integration.drs_identity_provider_bindings
  force row level security;
alter table integration.drs_identity_link_states
  enable row level security;
alter table integration.drs_identity_link_states
  force row level security;
alter table integration.drs_identity_provider_events
  enable row level security;
alter table integration.drs_identity_provider_events
  force row level security;

create policy drs_identity_provider_bindings_deny_all
  on integration.drs_identity_provider_bindings
  for all to public using (false) with check (false);
create policy drs_identity_link_states_deny_all
  on integration.drs_identity_link_states
  for all to public using (false) with check (false);
create policy drs_identity_provider_events_deny_all
  on integration.drs_identity_provider_events
  for all to public using (false) with check (false);

revoke all on table integration.drs_identity_provider_bindings
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_identity_link_states
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_identity_provider_events
  from public, anon, authenticated, service_role;

create or replace function integration.drs_identity_link_state_create_v1(
  p_state_digest text,
  p_nonce_digest text,
  p_pkce_verifier_ciphertext text,
  p_authenticated_user_id uuid,
  p_specialist_id uuid,
  p_authorization_subject text,
  p_provider text,
  p_intended_action text,
  p_redirect_uri text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
begin
  if p_now is null or not isfinite(p_now)
    or p_expires_at is null or not isfinite(p_expires_at)
    or p_expires_at <= p_now
    or p_expires_at > p_now + interval '15 minutes'
    or nullif(btrim(p_state_digest), '') is null
    or nullif(btrim(p_nonce_digest), '') is null
    or nullif(btrim(p_pkce_verifier_ciphertext), '') is null
    or nullif(btrim(p_redirect_uri), '') is null
    or p_provider not in ('google', 'line')
    or p_intended_action not in ('login', 'bind')
  then
    raise exception using errcode = 'P0001', message = 'CONTEXT_UNAVAILABLE';
  end if;

  if p_intended_action = 'login' then
    if p_authenticated_user_id is not null
      or p_specialist_id is not null
      or p_authorization_subject is not null
    then
      raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
    end if;
  else
    if to_regprocedure(
      'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
    ) is null
    then
      raise exception using errcode = 'P0001', message = 'CONTEXT_UNAVAILABLE';
    end if;
    v_authority := integration.drs_identity_authority_resolve_locked_v1(
      p_authenticated_user_id,
      null,
      p_authorization_subject
    );
    if v_authority -> 'authorized' is distinct from 'true'::jsonb
      or v_authority ->> 'authenticated_user_id'
        is distinct from p_authenticated_user_id::text
      or v_authority ->> 'specialist_id'
        is distinct from p_specialist_id::text
      or v_authority ->> 'authorization_subject'
        is distinct from p_authorization_subject
      or v_authority ->> 'lock_status' is distinct from 'locked'
    then
      raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
    end if;
  end if;

  insert into integration.drs_identity_link_states (
    state_digest,
    nonce_digest,
    pkce_verifier_ciphertext,
    authenticated_user_id,
    specialist_id,
    authorization_subject,
    provider,
    intended_action,
    redirect_uri,
    expires_at,
    created_at
  ) values (
    p_state_digest,
    p_nonce_digest,
    p_pkce_verifier_ciphertext,
    p_authenticated_user_id,
    p_specialist_id,
    p_authorization_subject,
    p_provider,
    p_intended_action,
    p_redirect_uri,
    p_expires_at,
    p_now
  );
end;
$$;

create or replace function integration.drs_identity_link_state_claim_v1(
  p_state_digest text,
  p_provider text,
  p_redirect_uri text,
  p_now timestamptz
)
returns table (
  state_id uuid,
  nonce_digest text,
  pkce_verifier_ciphertext text,
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  intended_action text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.drs_identity_link_states%rowtype;
  v_claim_token uuid := extensions.gen_random_uuid();
begin
  select s.*
  into v_state
  from integration.drs_identity_link_states s
  where s.state_digest = p_state_digest
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_INVALID';
  elsif v_state.provider <> p_provider then
    raise exception using errcode = 'P0001', message = 'OAUTH_PROVIDER_MISMATCH';
  elsif v_state.redirect_uri <> p_redirect_uri then
    raise exception using errcode = 'P0001', message = 'OAUTH_REDIRECT_MISMATCH';
  elsif v_state.expires_at <= p_now then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_EXPIRED';
  elsif v_state.terminal_status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  update integration.drs_identity_link_states s
  set claimed_at = p_now,
      claim_token = v_claim_token,
      provider_exchange_started_at = p_now,
      terminal_status = 'claimed'
  where s.state_id = v_state.state_id
    and s.terminal_status = 'pending';

  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  return query
  select
    v_state.state_id,
    v_state.nonce_digest,
    v_state.pkce_verifier_ciphertext,
    v_state.authenticated_user_id,
    v_state.specialist_id,
    v_state.authorization_subject,
    v_state.intended_action,
    v_claim_token;
end;
$$;

create or replace function integration.fail_identity_link_state_claim_v1(
  p_claim_token uuid,
  p_now timestamptz,
  p_failure_state text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state_id uuid;
  v_provider text;
  v_authenticated_user_id uuid;
  v_specialist_id uuid;
begin
  update integration.drs_identity_link_states s
  set failed_at = p_now,
      failure_state = left(coalesce(p_failure_state, 'CONTEXT_UNAVAILABLE'), 128),
      terminal_status = 'failed'
  where s.claim_token = p_claim_token
    and s.terminal_status = 'claimed'
  returning
    s.state_id,
    s.provider,
    s.authenticated_user_id,
    s.specialist_id
  into
    v_state_id,
    v_provider,
    v_authenticated_user_id,
    v_specialist_id;

  if found then
    insert into integration.drs_identity_provider_events (
      authenticated_user_id,
      specialist_id,
      provider,
      event_type,
      state_id,
      occurred_at,
      correlation_id
    ) values (
      v_authenticated_user_id,
      v_specialist_id,
      v_provider,
      'identity_callback_failed',
      v_state_id,
      p_now,
      extensions.gen_random_uuid()
    );
  end if;
end;
$$;

create or replace function integration.drs_identity_callback_prepare_v1(
  p_claim_token uuid,
  p_provider text,
  p_provider_subject text,
  p_verified_email text,
  p_now timestamptz
)
returns table (
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  intended_action text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.drs_identity_link_states%rowtype;
  v_authenticated_user_id uuid;
  v_specialist_id uuid;
  v_authorization_subject text;
  v_authority jsonb;
begin
  select s.*
  into v_state
  from integration.drs_identity_link_states s
  where s.claim_token = p_claim_token
  for update;

  if not found or v_state.terminal_status <> 'claimed' then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  elsif v_state.provider <> p_provider then
    raise exception using errcode = 'P0001', message = 'OAUTH_PROVIDER_MISMATCH';
  elsif v_state.expires_at <= p_now then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_EXPIRED';
  elsif nullif(btrim(p_provider_subject), '') is null then
    raise exception using errcode = 'P0001', message = 'TOKEN_VERIFICATION_FAILED';
  end if;

  if v_state.intended_action = 'login' then
    select
      b.authenticated_user_id,
      b.specialist_id,
      b.authorization_subject
    into
      v_authenticated_user_id,
      v_specialist_id,
      v_authorization_subject
    from integration.drs_identity_provider_bindings b
    where b.provider = p_provider
      and b.provider_subject = p_provider_subject
      and b.binding_status = 'active'
      and b.revoked_at is null
    for update;
    if not found then
      raise exception using errcode = 'P0001', message =
        case
          when p_provider = 'google' then 'GOOGLE_IDENTITY_NOT_BOUND'
          else 'LINE_IDENTITY_NOT_BOUND'
        end;
    end if;
  else
    v_authenticated_user_id := v_state.authenticated_user_id;
    v_specialist_id := v_state.specialist_id;
    v_authorization_subject := v_state.authorization_subject;
    if exists (
      select 1
      from integration.drs_identity_provider_bindings b
      where b.provider = p_provider
        and b.provider_subject = p_provider_subject
        and (
          b.authenticated_user_id <> v_authenticated_user_id
          or b.specialist_id <> v_specialist_id
        )
    ) then
      raise exception using errcode = 'P0001', message = 'IDENTITY_CONFLICT';
    end if;
  end if;

  if to_regprocedure(
    'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
  ) is null
    or to_regclass('integration.drs_auth_specialist_bindings') is null
    or to_regclass('integration.drs_case_identity_bindings') is null
  then
    raise exception using errcode = 'P0001', message = 'CONTEXT_UNAVAILABLE';
  end if;

  if not exists (
    select 1
    from integration.drs_auth_specialist_bindings b
    where b.authenticated_user_id = v_authenticated_user_id
      and b.specialist_id = v_specialist_id
      and b.authorization_subject = v_authorization_subject
      and b.binding_status = 'active'
      and b.revoked_at is null
      and b.valid_from <= p_now
      and b.valid_until > p_now
    for update
  ) then
    raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    v_authenticated_user_id,
    null,
    v_authorization_subject
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id'
      is distinct from v_authenticated_user_id::text
    or v_authority ->> 'specialist_id'
      is distinct from v_specialist_id::text
    or v_authority ->> 'authorization_subject'
      is distinct from v_authorization_subject
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
  then
    raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
  end if;

  return query
  select
    v_authenticated_user_id,
    v_specialist_id,
    v_authorization_subject,
    v_state.intended_action;
end;
$$;

create or replace function integration.drs_identity_callback_finalize_v1(
  p_claim_token uuid,
  p_provider text,
  p_provider_subject text,
  p_verified_email text,
  p_expected_authenticated_user_id uuid,
  p_expected_specialist_id uuid,
  p_expected_authorization_subject text,
  p_expected_intended_action text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.drs_identity_link_states%rowtype;
  v_authenticated_user_id uuid;
  v_specialist_id uuid;
  v_authorization_subject text;
  v_intended_action text;
begin
  select
    prepared.authenticated_user_id,
    prepared.specialist_id,
    prepared.authorization_subject,
    prepared.intended_action
  into
    v_authenticated_user_id,
    v_specialist_id,
    v_authorization_subject,
    v_intended_action
  from integration.drs_identity_callback_prepare_v1(
    p_claim_token,
    p_provider,
    p_provider_subject,
    p_verified_email,
    p_now
  ) prepared;

  if not found
    or v_authenticated_user_id is distinct from
      p_expected_authenticated_user_id
    or v_specialist_id is distinct from p_expected_specialist_id
    or v_authorization_subject is distinct from
      p_expected_authorization_subject
    or v_intended_action is distinct from p_expected_intended_action
  then
    raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
  end if;

  select s.*
  into v_state
  from integration.drs_identity_link_states s
  where s.claim_token = p_claim_token
    and s.terminal_status = 'claimed'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  if v_intended_action = 'bind' then
    insert into integration.drs_identity_provider_bindings (
      provider,
      provider_subject,
      authenticated_user_id,
      specialist_id,
      authorization_subject,
      verified_email,
      binding_status,
      verified_at
    ) values (
      p_provider,
      p_provider_subject,
      v_authenticated_user_id,
      v_specialist_id,
      v_authorization_subject,
      case when p_provider = 'google' then p_verified_email else null end,
      'active',
      p_now
    )
    on conflict (provider, provider_subject) do update
      set verified_email = excluded.verified_email,
          binding_status = 'active',
          verified_at = excluded.verified_at,
          revoked_at = null,
          updated_at = p_now
      where integration.drs_identity_provider_bindings.authenticated_user_id =
          excluded.authenticated_user_id
        and integration.drs_identity_provider_bindings.specialist_id =
          excluded.specialist_id
        and integration.drs_identity_provider_bindings.authorization_subject =
          excluded.authorization_subject;
    if not found then
      raise exception using errcode = 'P0001', message = 'IDENTITY_CONFLICT';
    end if;
  end if;

  update integration.drs_identity_link_states s
  set consumed_at = p_now,
      terminal_status = 'consumed'
  where s.state_id = v_state.state_id
    and s.terminal_status = 'claimed';
  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  insert into integration.drs_identity_provider_events (
    authenticated_user_id,
    specialist_id,
    provider,
    event_type,
    state_id,
    occurred_at,
    correlation_id
  ) values (
    v_authenticated_user_id,
    v_specialist_id,
    p_provider,
    case
      when v_intended_action = 'bind' then 'identity_binding_created'
      else 'identity_login'
    end,
    v_state.state_id,
    p_now,
    p_correlation_id
  );
end;
$$;

create or replace function integration.drs_identity_provider_revoke_v1(
  p_authenticated_user_id uuid,
  p_provider text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_specialist_id uuid;
begin
  update integration.drs_identity_provider_bindings b
  set binding_status = 'revoked',
      revoked_at = p_now,
      updated_at = p_now
  where b.authenticated_user_id = p_authenticated_user_id
    and b.provider = p_provider
    and b.binding_status = 'active'
    and b.revoked_at is null
  returning b.specialist_id into v_specialist_id;

  if found then
    insert into integration.drs_identity_provider_events (
      authenticated_user_id,
      specialist_id,
      provider,
      event_type,
      occurred_at,
      correlation_id
    ) values (
      p_authenticated_user_id,
      v_specialist_id,
      p_provider,
      'identity_binding_revoked',
      p_now,
      p_correlation_id
    );
  end if;
end;
$$;

alter function integration.drs_identity_link_state_create_v1(
  text, text, text, uuid, uuid, text, text, text, text, timestamptz, timestamptz
) owner to postgres;
alter function integration.drs_identity_link_state_claim_v1(
  text, text, text, timestamptz
) owner to postgres;
alter function integration.fail_identity_link_state_claim_v1(
  uuid, timestamptz, text
) owner to postgres;
alter function integration.drs_identity_callback_prepare_v1(
  uuid, text, text, text, timestamptz
) owner to postgres;
alter function integration.drs_identity_callback_finalize_v1(
  uuid, text, text, text, uuid, uuid, text, text, timestamptz, uuid
) owner to postgres;
alter function integration.drs_identity_provider_revoke_v1(
  uuid, text, timestamptz, uuid
) owner to postgres;

revoke all on function integration.drs_identity_link_state_create_v1(
  text, text, text, uuid, uuid, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function integration.drs_identity_link_state_claim_v1(
  text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function integration.fail_identity_link_state_claim_v1(
  uuid, timestamptz, text
) from public, anon, authenticated, service_role;
revoke all on function integration.drs_identity_callback_prepare_v1(
  uuid, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function integration.drs_identity_callback_finalize_v1(
  uuid, text, text, text, uuid, uuid, text, text, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function integration.drs_identity_provider_revoke_v1(
  uuid, text, timestamptz, uuid
) from public, anon, authenticated, service_role;

-- BRIDGE_PHASE_IDENTITY_AUTHORITY
do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('casework.cases') is null
    or to_regclass('public.drs_cases') is null
    or to_regclass('public.drs_specialists') is null
    or to_regclass('public.drs_case_specialist_assignments') is null
    or to_regclass('public.drs_case_specialist_assignment_terminations') is null
    or to_regprocedure(
      'drs_private.is_current_actor_active_case_specialist(uuid)'
    ) is null
    or to_regprocedure(
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'
    ) is null
  then
    raise exception 'DRS_IDENTITY_AUTHORITY_PREREQUISITE_MISSING';
  end if;

  if to_regclass('integration.drs_auth_specialist_bindings') is not null
    or to_regclass('integration.drs_case_identity_bindings') is not null
  then
    raise exception 'DRS_IDENTITY_AUTHORITY_BRIDGE_ALREADY_EXISTS';
  end if;
end;
$$;

create table integration.drs_auth_specialist_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  authenticated_user_id uuid not null,
  specialist_id uuid not null,
  selected_assignment_id uuid,
  authorization_subject text not null,
  binding_status text not null default 'active',
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  foreign key (selected_assignment_id)
    references public.drs_case_specialist_assignments(assignment_id)
    on delete restrict,
  unique (authenticated_user_id),
  unique (specialist_id),
  unique (authorization_subject),
  constraint drs_auth_specialist_bindings_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_auth_specialist_bindings_status_check check (
    binding_status in ('active', 'suspended', 'revoked')
  ),
  constraint drs_auth_specialist_bindings_interval_check check (
    isfinite(valid_from)
    and isfinite(valid_until)
    and valid_until > valid_from
  ),
  constraint drs_auth_specialist_bindings_revocation_check check (
    (binding_status = 'revoked' and revoked_at is not null)
    or (binding_status <> 'revoked' and revoked_at is null)
  )
);

create index drs_auth_specialist_bindings_active_lookup_idx
  on integration.drs_auth_specialist_bindings (
    authenticated_user_id,
    specialist_id,
    selected_assignment_id
  )
  where binding_status = 'active' and revoked_at is null;

create index drs_auth_specialist_bindings_selected_assignment_idx
  on integration.drs_auth_specialist_bindings (selected_assignment_id)
  where selected_assignment_id is not null;

create table integration.drs_case_identity_bindings (
  case_identity_binding_id uuid primary key
    default extensions.gen_random_uuid(),
  drs_case_id uuid not null,
  casework_case_id uuid not null,
  mapping_status text not null default 'active',
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (drs_case_id)
    references public.drs_cases(case_id) on delete restrict,
  unique (drs_case_id),
  unique (casework_case_id),
  constraint drs_case_identity_bindings_status_check check (
    mapping_status in ('active', 'revoked')
  ),
  constraint drs_case_identity_bindings_interval_check check (
    isfinite(valid_from)
    and isfinite(valid_until)
    and valid_until > valid_from
  ),
  constraint drs_case_identity_bindings_revocation_check check (
    (mapping_status = 'revoked' and revoked_at is not null)
    or (mapping_status = 'active' and revoked_at is null)
  )
);

create function integration.drs_case_identity_binding_assert_casework_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from casework.cases protected_case
    where protected_case.id = new.casework_case_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'DRS_CASEWORK_CASE_REFERENCE_INVALID';
  end if;
  return new;
end;
$$;
alter function integration.drs_case_identity_binding_assert_casework_v1()
  owner to postgres;
revoke all on function integration.drs_case_identity_binding_assert_casework_v1()
  from public, anon, authenticated, service_role;

create trigger drs_case_identity_bindings_casework_reference
before insert or update of casework_case_id
on integration.drs_case_identity_bindings
for each row
execute function integration.drs_case_identity_binding_assert_casework_v1();

create index drs_case_identity_bindings_active_lookup_idx
  on integration.drs_case_identity_bindings (
    drs_case_id,
    casework_case_id
  )
  where mapping_status = 'active' and revoked_at is null;

alter table integration.drs_auth_specialist_bindings owner to postgres;
alter table integration.drs_case_identity_bindings owner to postgres;

alter table integration.drs_auth_specialist_bindings
  enable row level security;
alter table integration.drs_auth_specialist_bindings
  force row level security;
alter table integration.drs_case_identity_bindings
  enable row level security;
alter table integration.drs_case_identity_bindings
  force row level security;

create policy drs_auth_specialist_bindings_deny_all
  on integration.drs_auth_specialist_bindings
  for all
  to public
  using (false)
  with check (false);

create policy drs_case_identity_bindings_deny_all
  on integration.drs_case_identity_bindings
  for all
  to public
  using (false)
  with check (false);

revoke all on table integration.drs_auth_specialist_bindings
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_case_identity_bindings
  from public, anon, authenticated, service_role;

create or replace function drs_private.is_current_actor_active_specialist(
  target_specialist_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authenticated_user_id uuid := (select auth.uid());
begin
  if v_authenticated_user_id is null or target_specialist_id is null then
    return false;
  end if;

  return exists (
    select 1
    from integration.drs_auth_specialist_bindings b
    join public.drs_specialists s
      on s.specialist_id = b.specialist_id
    where b.authenticated_user_id = v_authenticated_user_id
      and b.specialist_id = target_specialist_id
      and b.authorization_subject =
        'drs-specialist:' || b.specialist_id::text
      and b.binding_status = 'active'
      and b.revoked_at is null
      and b.valid_from <= v_now
      and b.valid_until > v_now
      and s.authority_state = 'ACTIVE'
  );
end;
$$;

alter function drs_private.is_current_actor_active_specialist(uuid)
  owner to postgres;
revoke all on function drs_private.is_current_actor_active_specialist(uuid)
  from public, anon, authenticated, service_role;
grant execute on function drs_private.is_current_actor_active_specialist(uuid)
  to authenticated;

create or replace function drs_private.is_current_actor_active_case_specialist(
  target_case_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authenticated_user_id uuid := (select auth.uid());
begin
  if v_authenticated_user_id is null or target_case_id is null then
    return false;
  end if;

  return exists (
    select 1
    from integration.drs_auth_specialist_bindings b
    join public.drs_specialists s
      on s.specialist_id = b.specialist_id
    join public.drs_case_specialist_assignments a
      on b.selected_assignment_id = a.assignment_id
      and a.specialist_id = b.specialist_id
    join integration.drs_case_identity_bindings m
      on m.drs_case_id = a.case_id
    join casework.cases c
      on m.casework_case_id = c.id
    where b.authenticated_user_id = (select auth.uid())
      and b.authenticated_user_id = v_authenticated_user_id
      and b.selected_assignment_id is not null
      and b.authorization_subject =
        'drs-specialist:' || b.specialist_id::text
      and b.binding_status = 'active'
      and b.revoked_at is null
      and b.valid_from <= v_now
      and b.valid_until > v_now
      and s.authority_state = 'ACTIVE'
      and m.drs_case_id = target_case_id
      and m.mapping_status = 'active'
      and m.revoked_at is null
      and m.valid_from <= v_now
      and m.valid_until > v_now
      and a.valid_from <= v_now
      and (a.valid_until is null or a.valid_until > v_now)
      and c.case_status = 'active'
      and not exists (
        select 1
        from public.drs_case_specialist_assignment_terminations t
        where t.assignment_id = a.assignment_id
          and t.terminated_at <= v_now
      )
  );
end;
$$;

alter function drs_private.is_current_actor_active_case_specialist(uuid)
  owner to postgres;
revoke all on function drs_private.is_current_actor_active_case_specialist(uuid)
  from public, anon, authenticated, service_role;
grant execute on function drs_private.is_current_actor_active_case_specialist(uuid)
  to authenticated;

drop policy if exists drs_specialists_self_select on public.drs_specialists;
create policy drs_specialists_self_select
  on public.drs_specialists
  for select
  to authenticated
  using (
    drs_private.is_current_actor_active_specialist(specialist_id)
  );

create or replace function integration.drs_identity_authority_resolve_locked_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_verified_user_id uuid;
  v_specialist_id uuid;
  v_selected_assignment_id uuid;
  v_authorization_subject text;
  v_binding_status text;
  v_binding_valid_from timestamptz;
  v_binding_valid_until timestamptz;
  v_binding_revoked_at timestamptz;
  v_specialist_state text;
  v_candidate record;
  v_candidate_count integer := 0;
  v_assignment_id uuid;
  v_assignment_valid_from timestamptz;
  v_assignment_valid_until timestamptz;
  v_mapping_valid_from timestamptz;
  v_mapping_valid_until timestamptz;
  v_effective_valid_from timestamptz;
  v_effective_valid_until timestamptz;
  v_selected_case_id uuid;
  v_termination_at timestamptz;
begin
  if p_authenticated_user_id is null then
    return jsonb_build_object(
      'authorized', false,
      'state', 'AUTH_REQUIRED'
    );
  end if;

  select u.id
  into v_verified_user_id
  from auth.users u
  where u.id = p_authenticated_user_id
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= v_now)
  for update;

  if not found then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  select
    b.specialist_id,
    b.selected_assignment_id,
    b.authorization_subject,
    b.binding_status,
    b.valid_from,
    b.valid_until,
    b.revoked_at
  into
    v_specialist_id,
    v_selected_assignment_id,
    v_authorization_subject,
    v_binding_status,
    v_binding_valid_from,
    v_binding_valid_until,
    v_binding_revoked_at
  from integration.drs_auth_specialist_bindings b
  where b.authenticated_user_id = v_verified_user_id
  for update;

  if not found
    or v_binding_status <> 'active'
    or v_binding_revoked_at is not null
    or v_binding_valid_from > v_now
    or v_binding_valid_until <= v_now
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_authorization_subject <> 'drs-specialist:' || v_specialist_id::text
    or (
      p_authorization_subject is not null
      and p_authorization_subject <> v_authorization_subject
    )
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'IDENTITY_MISMATCH'
    );
  end if;

  select s.authority_state
  into v_specialist_state
  from public.drs_specialists s
  where s.specialist_id = v_specialist_id
  for update;

  if not found or v_specialist_state <> 'ACTIVE' then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_selected_assignment_id is null then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_SELECTION_REQUIRED'
    );
  end if;

  for v_candidate in
    select
      a.assignment_id,
      a.valid_from as assignment_valid_from,
      a.valid_until as assignment_valid_until,
      m.valid_from as mapping_valid_from,
      m.valid_until as mapping_valid_until,
      m.casework_case_id
    from public.drs_case_specialist_assignments a
    join integration.drs_case_identity_bindings m
      on m.drs_case_id = a.case_id
    join casework.cases c
      on c.id = m.casework_case_id
    where a.specialist_id = v_specialist_id
      and a.assignment_id = v_selected_assignment_id
      and a.valid_from <= v_now
      and (a.valid_until is null or a.valid_until > v_now)
      and m.mapping_status = 'active'
      and m.revoked_at is null
      and m.valid_from <= v_now
      and m.valid_until > v_now
      and c.case_status = 'active'
    order by a.assignment_id, m.case_identity_binding_id
    for update of a, m, c
  loop
    v_termination_at := null;
    select t.terminated_at
    into v_termination_at
    from public.drs_case_specialist_assignment_terminations t
    where t.assignment_id = v_candidate.assignment_id
    for update;

    if v_termination_at <= v_now then
      continue;
    end if;

    v_assignment_id := v_candidate.assignment_id;
    v_assignment_valid_from := v_candidate.assignment_valid_from;
    v_assignment_valid_until := v_candidate.assignment_valid_until;
    v_mapping_valid_from := v_candidate.mapping_valid_from;
    v_mapping_valid_until := v_candidate.mapping_valid_until;
    v_effective_valid_from := greatest(
      v_binding_valid_from,
      v_mapping_valid_from,
      v_assignment_valid_from
    );
    v_effective_valid_until := least(
      v_binding_valid_until,
      v_mapping_valid_until,
      coalesce(v_assignment_valid_until, 'infinity'::timestamptz),
      coalesce(v_termination_at, 'infinity'::timestamptz)
    );
    if v_effective_valid_from > v_now
      or v_effective_valid_until <= v_now
    then
      continue;
    end if;

    v_candidate_count := v_candidate_count + 1;
    v_selected_case_id := v_candidate.casework_case_id;
  end loop;

  if v_candidate_count = 0 then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_candidate_count <> 1
    or v_assignment_id <> v_selected_assignment_id
    or (
      p_expected_case_id is not null
      and v_selected_case_id <> p_expected_case_id
    )
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'authenticated_user_id', v_verified_user_id::text,
    'specialist_id', v_specialist_id::text,
    'assignment_id', v_assignment_id::text,
    'selected_case_id', v_selected_case_id::text,
    'account_role', 'drs',
    'authorization_subject', v_authorization_subject,
    'auth_binding_status', 'active',
    'specialist_status', 'active',
    'assignment_status', 'active',
    'valid_from', v_effective_valid_from,
    'valid_until', v_effective_valid_until,
    'terminated_at', null,
    'lock_status', 'locked'
  );
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CONTEXT_UNAVAILABLE'
    );
end;
$$;

alter function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) owner to postgres;

comment on function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) is
  'Private locked DRS authority resolver. It derives one mapped case from a verified auth-user binding, ACTIVE specialist, explicit DRS-to-casework mapping, active exact assignment, and no termination. It never treats auth.uid(), LINE identity, caller case values, or UUID equality as specialist authority.';

revoke all on function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) from public, anon, authenticated, service_role;

-- BRIDGE_PHASE_SECURE_SESSION
create table integration.drs_server_sessions (
  server_session_id uuid primary key,
  access_token_digest text not null
    check (access_token_digest ~ '^[A-Za-z0-9_-]{43}$'),
  authenticated_user_id uuid not null references auth.users(id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  authorization_subject text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (authorization_subject = 'drs-specialist:' || specialist_id::text),
  check (expires_at > issued_at),
  check (expires_at <= issued_at + interval '15 minutes'),
  check (revoked_at is null or revoked_at >= issued_at)
);

alter table integration.drs_server_sessions owner to postgres;
alter table integration.drs_server_sessions enable row level security;
alter table integration.drs_server_sessions force row level security;

revoke all on table integration.drs_server_sessions from public, anon, authenticated, service_role;

create index drs_server_sessions_authenticated_user_active_idx
  on integration.drs_server_sessions (authenticated_user_id, expires_at)
  where revoked_at is null;

create index drs_server_sessions_specialist_active_idx
  on integration.drs_server_sessions (specialist_id, expires_at)
  where revoked_at is null;

create index drs_server_sessions_active_expiry_idx
  on integration.drs_server_sessions (expires_at)
  where revoked_at is null;

create or replace function public.drs_server_session_issue_v1(
  p_server_session_id uuid,
  p_access_token_digest text,
  p_authenticated_user_id uuid,
  p_specialist_id uuid,
  p_authorization_subject text,
  p_issued_at timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_authority jsonb;
  v_inserted integer := 0;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_authenticated_user_id is null
    or p_specialist_id is null
    or p_authorization_subject is null
    or p_authorization_subject <> 'drs-specialist:' || p_specialist_id::text
    or p_issued_at is null
    or p_expires_at is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    p_authenticated_user_id,
    null,
    p_authorization_subject
  );

  v_now := clock_timestamp();

  if p_issued_at < v_now - interval '1 minute'
    or p_issued_at > v_now + interval '1 minute'
    or p_expires_at <= v_now
    or p_expires_at <= p_issued_at
    or p_expires_at > p_issued_at + interval '15 minutes'
    or p_expires_at > v_now + interval '15 minutes'
    or jsonb_typeof(v_authority) is distinct from 'object'
    or not (
      v_authority ?& array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ]
      and v_authority - array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ] = '{}'::jsonb
    )
    or v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id' is distinct from p_authenticated_user_id::text
    or v_authority ->> 'specialist_id' is distinct from p_specialist_id::text
    or v_authority ->> 'authorization_subject' is distinct from p_authorization_subject
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
    or v_authority -> 'terminated_at' is distinct from 'null'::jsonb
    or v_authority ->> 'assignment_id' is null
    or v_authority ->> 'selected_case_id' is null
    or v_authority ->> 'valid_from' is null
    or v_authority ->> 'valid_until' is null
    or (v_authority ->> 'valid_from')::timestamptz > v_now
    or (v_authority ->> 'valid_until')::timestamptz <= v_now
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
  end if;

  insert into integration.drs_server_sessions (
    server_session_id,
    access_token_digest,
    authenticated_user_id,
    specialist_id,
    authorization_subject,
    issued_at,
    expires_at,
    revoked_at
  ) values (
    p_server_session_id,
    p_access_token_digest,
    p_authenticated_user_id,
    p_specialist_id,
    p_authorization_subject,
    p_issued_at,
    p_expires_at,
    null
  )
  on conflict (server_session_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
  end if;

  return jsonb_build_object(
    'server_session_id', p_server_session_id::text,
    'expires_at', to_char(
      p_expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
end;
$$;

alter function public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz) owner to postgres;
revoke all on function public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz) to service_role;

create or replace function public.drs_server_session_verify_v1(
  p_server_session_id uuid,
  p_access_token_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_authority jsonb;
  v_session record;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_VERIFY_REJECTED';
  end if;

  select
    s.authenticated_user_id,
    s.specialist_id,
    s.authorization_subject,
    s.expires_at,
    s.revoked_at
  into strict v_session
  from integration.drs_server_sessions s
  where s.server_session_id = p_server_session_id
    and s.access_token_digest = p_access_token_digest
  for update;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    v_session.authenticated_user_id,
    null,
    v_session.authorization_subject
  );

  v_now := clock_timestamp();

  if v_session.revoked_at is not null
    or v_session.expires_at <= v_now
    or jsonb_typeof(v_authority) is distinct from 'object'
    or not (
      v_authority ?& array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ]
      and v_authority - array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ] = '{}'::jsonb
    )
    or v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id' is distinct from v_session.authenticated_user_id::text
    or v_authority ->> 'specialist_id' is distinct from v_session.specialist_id::text
    or v_authority ->> 'authorization_subject' is distinct from v_session.authorization_subject
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
    or v_authority -> 'terminated_at' is distinct from 'null'::jsonb
    or v_authority ->> 'assignment_id' is null
    or v_authority ->> 'selected_case_id' is null
    or v_authority ->> 'valid_from' is null
    or v_authority ->> 'valid_until' is null
    or (v_authority ->> 'valid_from')::timestamptz > v_now
    or (v_authority ->> 'valid_until')::timestamptz <= v_now
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_VERIFY_REJECTED';
  end if;

  return jsonb_build_object(
    'authenticated_user_id', v_session.authenticated_user_id::text,
    'specialist_id', v_session.specialist_id::text,
    'authorization_subject', v_session.authorization_subject,
    'expires_at', to_char(
      v_session.expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_VERIFY_REJECTED';
end;
$$;

alter function public.drs_server_session_verify_v1(uuid,text) owner to postgres;
revoke all on function public.drs_server_session_verify_v1(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.drs_server_session_verify_v1(uuid,text) to service_role;

create or replace function public.drs_server_session_revoke_v1(
  p_server_session_id uuid,
  p_access_token_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_session record;
  v_updated integer := 0;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
  then
    return jsonb_build_object('revoked', false);
  end if;

  select
    s.expires_at,
    s.revoked_at
  into strict v_session
  from integration.drs_server_sessions s
  where s.server_session_id = p_server_session_id
    and s.access_token_digest = p_access_token_digest
  for update;

  v_now := clock_timestamp();

  if v_session.revoked_at is not null
    or v_session.expires_at <= v_now
  then
    return jsonb_build_object('revoked', false);
  end if;

  update integration.drs_server_sessions
  set revoked_at = v_now
  where server_session_id = p_server_session_id
    and access_token_digest = p_access_token_digest
    and revoked_at is null
    and expires_at > v_now;

  get diagnostics v_updated = row_count;
  if v_updated = 1 then
    return jsonb_build_object('revoked', true);
  end if;
  return jsonb_build_object('revoked', false);
exception
  when others then
    return jsonb_build_object('revoked', false);
end;
$$;

alter function public.drs_server_session_revoke_v1(uuid,text) owner to postgres;
revoke all on function public.drs_server_session_revoke_v1(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.drs_server_session_revoke_v1(uuid,text) to service_role;

-- BRIDGE_PHASE_PRIVATE_LINE
do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('public.drs_cases') is null
    or to_regclass('public.drs_specialists') is null
    or to_regclass('public.drs_case_specialist_assignments') is null
    or to_regclass(
      'public.drs_case_specialist_assignment_terminations'
    ) is null
    or to_regclass('integration.drs_auth_specialist_bindings') is null
    or to_regprocedure(
      'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
    ) is null
  then
    raise exception 'DRS_LINE_PRIVATE_ROUTING_PREREQUISITE_MISSING';
  end if;

  if to_regclass('integration.drs_line_account_link_intents') is not null
    or to_regclass('integration.drs_line_account_bindings') is not null
    or to_regclass('integration.drs_line_binding_audit') is not null
    or to_regclass('integration.drs_line_webhook_events') is not null
    or to_regclass('integration.drs_line_notification_outbox') is not null
    or to_regclass('integration.drs_line_delivery_receipts') is not null
  then
    raise exception 'DRS_LINE_PRIVATE_ROUTING_ALREADY_EXISTS';
  end if;
end;
$$;

alter table public.drs_case_audit_events
  drop constraint drs_case_audit_events_type_check;
alter table public.drs_case_audit_events
  add constraint drs_case_audit_events_type_check check (
    event_type in (
      'LINE_SENT_EVENT', 'AI_REVIEW', 'HUMAN_DECISION', 'FINAL_MESSAGE',
      'RECEIPT', 'WORK_ITEM_TRANSITION', 'PRIVATE_LINE_NOTIFICATION'
    )
  );

create table integration.drs_line_account_link_intents (
  intent_id uuid primary key default extensions.gen_random_uuid(),
  authenticated_user_id uuid not null references auth.users(id)
    on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  assignment_id uuid not null references
    public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  selected_case_id uuid not null,
  authorization_subject text not null,
  provider_channel_id text not null,
  bot_launch_url text not null,
  intent_state text not null,
  nonce_digest text,
  nonce_expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  constraint drs_line_intents_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_line_intents_provider_check check (
    provider_channel_id ~ '^[0-9]{1,32}$'
  ),
  constraint drs_line_intents_bot_url_check check (
    bot_launch_url ~ '^https://([a-z0-9-]+\.)*line\.me/'
    and length(bot_launch_url) <= 512
  ),
  constraint drs_line_intents_state_check check (
    intent_state in (
      'pending', 'link_token_issued', 'nonce_ready', 'linked', 'expired',
      'cancelled', 'conflict_line_already_bound',
      'conflict_drs_already_bound', 'permission_denied',
      'specialist_inactive', 'temporarily_unavailable'
    )
  ),
  constraint drs_line_intents_interval_check check (
    isfinite(created_at) and isfinite(expires_at)
    and expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  ),
  constraint drs_line_intents_nonce_check check (
    (nonce_digest is null and nonce_expires_at is null)
    or (
      nonce_digest ~ '^[A-Za-z0-9_-]{43}$'
      and nonce_expires_at is not null
      and isfinite(nonce_expires_at)
      and nonce_expires_at > created_at
      and nonce_expires_at <= expires_at
    )
  ),
  constraint drs_line_intents_terminal_time_check check (
    (consumed_at is null or isfinite(consumed_at))
    and (cancelled_at is null or isfinite(cancelled_at))
    and (failed_at is null or isfinite(failed_at))
  )
);

create table integration.drs_line_account_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  binding_version bigint generated always as identity unique,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  provider_channel_id text not null,
  line_user_digest text not null,
  line_user_ciphertext text not null,
  line_user_iv text not null,
  encryption_key_version text not null,
  binding_state text not null default 'active',
  linked_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  constraint drs_line_bindings_provider_check check (
    provider_channel_id ~ '^[0-9]{1,32}$'
  ),
  constraint drs_line_bindings_digest_check check (
    line_user_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  constraint drs_line_bindings_envelope_check check (
    line_user_ciphertext ~ '^[A-Za-z0-9_-]+$'
    and length(line_user_ciphertext) between 24 and 1024
    and line_user_iv ~ '^[A-Za-z0-9_-]{16}$'
    and encryption_key_version ~ '^[A-Za-z0-9._-]{1,64}$'
  ),
  constraint drs_line_bindings_state_check check (
    binding_state in ('active', 'revoked')
  ),
  constraint drs_line_bindings_lifecycle_check check (
    isfinite(linked_at)
    and (
      (binding_state = 'active' and revoked_at is null)
      or (
        binding_state = 'revoked'
        and revoked_at is not null
        and isfinite(revoked_at)
        and revoked_at >= linked_at
      )
    )
  )
);

create table integration.drs_line_binding_audit (
  audit_id uuid primary key default extensions.gen_random_uuid(),
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  intent_id uuid references integration.drs_line_account_link_intents(intent_id)
    on delete restrict,
  binding_id uuid references integration.drs_line_account_bindings(binding_id)
    on delete restrict,
  event_type text not null,
  safe_outcome text not null,
  safe_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint drs_line_binding_audit_event_check check (
    event_type in (
      'start', 'link_token_issued', 'nonce_ready', 'linked', 'conflict',
      'expired', 'cancelled', 'unlink_requested', 'revoked', 'denied',
      'provider_unavailable'
    )
  ),
  constraint drs_line_binding_audit_outcome_check check (
    safe_outcome ~ '^[a-z0-9_]{1,64}$'
  ),
  constraint drs_line_binding_audit_payload_check check (
    jsonb_typeof(safe_payload) = 'object'
    and safe_payload - array[
      'state', 'reason_code', 'binding_version',
      'provider_status_class', 'correlation_digest'
    ] = '{}'::jsonb
  ),
  constraint drs_line_binding_audit_time_check check (isfinite(occurred_at))
);

create table integration.drs_line_webhook_events (
  webhook_event_digest text primary key,
  event_kind text not null,
  processing_state text not null default 'processing',
  safe_outcome text not null default 'pending',
  claim_token uuid not null default extensions.gen_random_uuid(),
  provider_retry_key uuid not null default extensions.gen_random_uuid(),
  attempt_count integer not null default 1,
  first_seen_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  constraint drs_line_webhook_digest_check check (
    webhook_event_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  constraint drs_line_webhook_kind_check check (
    event_kind in ('binding_action', 'unlink_action', 'account_link', 'verify')
  ),
  constraint drs_line_webhook_state_check check (
    processing_state in ('processing', 'completed')
  ),
  constraint drs_line_webhook_outcome_check check (
    safe_outcome in (
      'pending', 'verified', 'link_token_replied', 'linked', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'not_linked', 'revoked', 'ignored', 'failed',
      'temporarily_unavailable'
    )
  ),
  constraint drs_line_webhook_attempt_check check (
    attempt_count between 1 and 12
  ),
  constraint drs_line_webhook_time_check check (
    isfinite(first_seen_at) and isfinite(claimed_at)
    and claimed_at >= first_seen_at
    and (
      (processing_state = 'processing' and completed_at is null)
      or (
        processing_state = 'completed'
        and completed_at is not null
        and isfinite(completed_at)
        and completed_at >= claimed_at
      )
    )
  )
);

create table integration.drs_line_notification_outbox (
  outbox_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  assignment_id uuid not null references
    public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  auth_binding_id uuid not null references
    integration.drs_auth_specialist_bindings(binding_id) on delete restrict,
  binding_id uuid not null references
    integration.drs_line_account_bindings(binding_id) on delete restrict,
  binding_version bigint not null,
  provider_channel_id text not null,
  template_version text not null,
  idempotency_key text not null unique,
  case_label text not null,
  case_status text not null,
  next_action text not null,
  case_path text not null,
  delivery_state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default clock_timestamp(),
  claim_token uuid,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  constraint drs_line_outbox_provider_check check (
    provider_channel_id ~ '^[0-9]{1,32}$'
  ),
  constraint drs_line_outbox_template_check check (
    template_version ~ '^[A-Za-z0-9._-]{1,64}$'
    and idempotency_key ~ '^[A-Za-z0-9._:-]{16,160}$'
  ),
  constraint drs_line_outbox_safe_message_check check (
    length(case_label) between 1 and 80
    and length(case_status) between 1 and 120
    and length(next_action) between 1 and 160
    and case_label !~ '[\x00-\x1f\x7f]'
    and case_status !~ '[\x00-\x1f\x7f]'
    and next_action !~ '[\x00-\x1f\x7f]'
    and case_path ~ '^/pcm/console/case\?caseId=[0-9a-f-]{36}$'
    and length(case_path) <= 512
  ),
  constraint drs_line_outbox_state_check check (
    delivery_state in (
      'pending', 'claimed', 'retry', 'accepted',
      'permanent_failure', 'suppressed'
    )
  ),
  constraint drs_line_outbox_attempt_check check (
    attempt_count between 0 and 5
  ),
  constraint drs_line_outbox_claim_check check (
    (delivery_state in ('pending', 'retry') and claim_token is null and claimed_at is null)
    or (delivery_state = 'claimed' and claim_token is not null and claimed_at is not null)
    or (delivery_state in ('accepted', 'permanent_failure', 'suppressed') and claim_token is null)
  )
);

create table integration.drs_line_delivery_receipts (
  receipt_id uuid primary key default extensions.gen_random_uuid(),
  outbox_id uuid not null references
    integration.drs_line_notification_outbox(outbox_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  attempt_number integer not null,
  outcome text not null,
  http_status_class text not null,
  provider_request_id text,
  reason_code text not null,
  duration_ms integer not null,
  attempted_at timestamptz not null default clock_timestamp(),
  constraint drs_line_receipts_attempt_unique unique (
    outbox_id, attempt_number
  ),
  constraint drs_line_receipts_outcome_check check (
    outcome in ('accepted', 'retryable_failure', 'permanent_failure', 'suppressed')
  ),
  constraint drs_line_receipts_status_check check (
    http_status_class in ('2xx', '4xx', '5xx', 'none')
  ),
  constraint drs_line_receipts_provider_id_check check (
    provider_request_id is null
    or provider_request_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  constraint drs_line_receipts_reason_check check (
    reason_code ~ '^[a-z0-9_]{1,64}$'
  ),
  constraint drs_line_receipts_duration_check check (
    duration_ms between 0 and 120000
    and attempt_number between 1 and 5
    and isfinite(attempted_at)
  )
);

create unique index drs_line_intents_one_pending_specialist_idx
  on integration.drs_line_account_link_intents(
    provider_channel_id, specialist_id
  )
  where intent_state in ('pending', 'link_token_issued', 'nonce_ready');

create unique index drs_line_intents_one_nonce_digest_idx
  on integration.drs_line_account_link_intents(nonce_digest)
  where nonce_digest is not null;

create unique index drs_line_bindings_one_active_specialist_idx
  on integration.drs_line_account_bindings(provider_channel_id, specialist_id)
  where binding_state = 'active';

create unique index drs_line_bindings_one_active_line_identity_idx
  on integration.drs_line_account_bindings(provider_channel_id, line_user_digest)
  where binding_state = 'active';

create index drs_line_outbox_due_idx
  on integration.drs_line_notification_outbox(next_attempt_at, created_at)
  where delivery_state in ('pending', 'retry', 'claimed');

create index drs_line_outbox_auth_binding_state_idx
  on integration.drs_line_notification_outbox(auth_binding_id, delivery_state)
  where delivery_state in ('pending', 'retry', 'claimed');

create index drs_line_audit_specialist_time_idx
  on integration.drs_line_binding_audit(specialist_id, occurred_at);

create index drs_line_receipts_case_time_idx
  on integration.drs_line_delivery_receipts(case_id, attempted_at);

alter table integration.drs_line_account_link_intents owner to postgres;
alter table integration.drs_line_account_bindings owner to postgres;
alter table integration.drs_line_binding_audit owner to postgres;
alter table integration.drs_line_webhook_events owner to postgres;
alter table integration.drs_line_notification_outbox owner to postgres;
alter table integration.drs_line_delivery_receipts owner to postgres;

alter table integration.drs_line_account_link_intents enable row level security;
alter table integration.drs_line_account_link_intents force row level security;
alter table integration.drs_line_account_bindings enable row level security;
alter table integration.drs_line_account_bindings force row level security;
alter table integration.drs_line_binding_audit enable row level security;
alter table integration.drs_line_binding_audit force row level security;
alter table integration.drs_line_webhook_events enable row level security;
alter table integration.drs_line_webhook_events force row level security;
alter table integration.drs_line_notification_outbox enable row level security;
alter table integration.drs_line_notification_outbox force row level security;
alter table integration.drs_line_delivery_receipts enable row level security;
alter table integration.drs_line_delivery_receipts force row level security;

create policy drs_line_account_link_intents_deny_all
  on integration.drs_line_account_link_intents
  for all to public using (false) with check (false);
create policy drs_line_account_bindings_deny_all
  on integration.drs_line_account_bindings
  for all to public using (false) with check (false);
create policy drs_line_binding_audit_deny_all
  on integration.drs_line_binding_audit
  for all to public using (false) with check (false);
create policy drs_line_webhook_events_deny_all
  on integration.drs_line_webhook_events
  for all to public using (false) with check (false);
create policy drs_line_notification_outbox_deny_all
  on integration.drs_line_notification_outbox
  for all to public using (false) with check (false);
create policy drs_line_delivery_receipts_deny_all
  on integration.drs_line_delivery_receipts
  for all to public using (false) with check (false);

revoke all on table integration.drs_line_account_link_intents
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_account_bindings
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_binding_audit
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_webhook_events
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_notification_outbox
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_delivery_receipts
  from public, anon, authenticated, service_role;

revoke all on sequence integration.drs_line_account_bindings_binding_version_seq
  from public, anon, authenticated, service_role;

create or replace function integration.drs_line_append_only_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'DRS_LINE_APPEND_ONLY';
end;
$$;

alter function integration.drs_line_append_only_v1() owner to postgres;
revoke all on function integration.drs_line_append_only_v1()
  from public, anon, authenticated, service_role;

create trigger drs_line_binding_audit_append_only
  before update or delete
  on integration.drs_line_binding_audit
  for each row execute function integration.drs_line_append_only_v1();

create trigger drs_line_delivery_receipts_append_only
  before update or delete
  on integration.drs_line_delivery_receipts
  for each row execute function integration.drs_line_append_only_v1();

create or replace function drs_private.drs_line_exact_json_keys_v1(
  p_input jsonb,
  p_keys text[]
)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select jsonb_typeof(p_input) = 'object'
    and p_input ?& p_keys
    and not exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_input) as supplied(key)
      where not (supplied.key = any(p_keys))
    );
$$;

alter function drs_private.drs_line_exact_json_keys_v1(jsonb, text[])
  owner to postgres;
revoke all on function drs_private.drs_line_exact_json_keys_v1(jsonb, text[])
  from public, anon, authenticated, service_role;

create or replace function drs_private.drs_line_authority_matches_v1(
  p_input jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
begin
  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    (p_input ->> 'authenticated_user_id')::uuid,
    (p_input ->> 'selected_case_id')::uuid,
    p_input ->> 'authorization_subject'
  );
  return v_authority -> 'authorized' = 'true'::jsonb
    and v_authority ->> 'authenticated_user_id' =
      p_input ->> 'authenticated_user_id'
    and v_authority ->> 'specialist_id' = p_input ->> 'specialist_id'
    and v_authority ->> 'selected_case_id' = p_input ->> 'selected_case_id'
    and v_authority ->> 'authorization_subject' =
      p_input ->> 'authorization_subject';
exception
  when others then
    return false;
end;
$$;

alter function drs_private.drs_line_authority_matches_v1(jsonb)
  owner to postgres;
revoke all on function drs_private.drs_line_authority_matches_v1(jsonb)
  from public, anon, authenticated, service_role;

create or replace function drs_private.drs_line_start_link_intent_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authority jsonb;
  v_existing integration.drs_line_account_link_intents%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id', 'bot_launch_url'
    ]
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'bot_launch_url', '') !~
      '^https://([a-z0-9-]+\.)*line\.me/'
    or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    (p_input ->> 'authenticated_user_id')::uuid,
    (p_input ->> 'selected_case_id')::uuid,
    p_input ->> 'authorization_subject'
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;

  if found then
    return jsonb_build_object(
      'state', 'linked',
      'linked_at', v_binding.linked_at,
      'next_action', 'unlink'
    );
  end if;

  select * into v_existing
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'link_token_issued', 'nonce_ready')
  for update;

  if found and v_existing.expires_at <= v_now then
    update integration.drs_line_account_link_intents
    set intent_state = 'expired', failed_at = v_now
    where intent_id = v_existing.intent_id;
    v_existing.intent_id := null;
  end if;

  if v_existing.intent_id is null then
    insert into integration.drs_line_account_link_intents (
      authenticated_user_id, specialist_id, assignment_id, selected_case_id,
      authorization_subject, provider_channel_id, bot_launch_url,
      intent_state, created_at, expires_at
    ) values (
      (p_input ->> 'authenticated_user_id')::uuid,
      (p_input ->> 'specialist_id')::uuid,
      (v_authority ->> 'assignment_id')::uuid,
      (p_input ->> 'selected_case_id')::uuid,
      p_input ->> 'authorization_subject',
      p_input ->> 'provider_channel_id',
      p_input ->> 'bot_launch_url',
      'pending', v_now, v_now + interval '10 minutes'
    ) returning * into v_existing;

    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, event_type, safe_outcome, safe_payload,
      occurred_at
    ) values (
      v_existing.specialist_id, v_existing.intent_id, 'start',
      'awaiting_line_confirmation',
      jsonb_build_object('state', 'awaiting_line_confirmation'), v_now
    );
  end if;

  return jsonb_build_object(
    'state', 'awaiting_line_confirmation',
    'expires_at', v_existing.expires_at,
    'next_action', 'continue_in_line',
    'bot_launch_url', v_existing.bot_launch_url
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_read_link_status_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id'
    ]
  ) or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;
  if found then
    return jsonb_build_object(
      'state', 'linked', 'linked_at', v_binding.linked_at,
      'next_action', 'unlink'
    );
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  if v_intent.intent_state in ('pending', 'link_token_issued', 'nonce_ready')
    and v_intent.expires_at <= v_now
  then
    update integration.drs_line_account_link_intents
    set intent_state = 'expired', failed_at = v_now
    where intent_id = v_intent.intent_id;
    return jsonb_build_object('state', 'expired', 'next_action', 'relink');
  end if;
  if v_intent.intent_state in ('pending', 'link_token_issued', 'nonce_ready') then
    return jsonb_build_object(
      'state', 'awaiting_line_confirmation',
      'expires_at', v_intent.expires_at,
      'next_action', 'continue_in_line',
      'bot_launch_url', v_intent.bot_launch_url
    );
  end if;
  if v_intent.intent_state = 'cancelled' then
    return jsonb_build_object('state', 'cancelled', 'next_action', 'relink');
  end if;
  if v_intent.intent_state in (
    'conflict_line_already_bound', 'conflict_drs_already_bound'
  ) then
    return jsonb_build_object(
      'state', v_intent.intent_state, 'next_action', 'relink'
    );
  end if;
  return jsonb_build_object(
    'state', 'temporarily_unavailable', 'next_action', 'retry'
  );
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_unlink_by_line_identity_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['provider_channel_id', 'line_user_digest']
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'line_user_digest', '') !~
      '^[A-Za-z0-9_-]{43}$'
  then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and line_user_digest = p_input ->> 'line_user_digest'
    and binding_state = 'active'
  for update;
  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  perform 1
  from integration.drs_line_notification_outbox
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state = 'claimed'
  for update;
  if found then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  update integration.drs_line_account_bindings
  set binding_state = 'revoked', revoked_at = v_now
  where binding_id = v_binding.binding_id;
  update integration.drs_line_notification_outbox
  set delivery_state = 'suppressed', claim_token = null,
    claimed_at = null, completed_at = v_now
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state in ('pending', 'retry');
  insert into integration.drs_line_binding_audit (
    specialist_id, binding_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'revoked', 'revoked',
    jsonb_build_object(
      'state', 'revoked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return jsonb_build_object(
    'state', 'revoked', 'revoked_at', v_now, 'next_action', 'relink'
  );
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_cancel_link_intent_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id'
    ]
  ) or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'link_token_issued', 'nonce_ready')
  for update;
  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  update integration.drs_line_account_link_intents
  set intent_state = 'cancelled', cancelled_at = v_now,
    nonce_digest = null, nonce_expires_at = null
  where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit (
    specialist_id, intent_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'cancelled', 'cancelled',
    jsonb_build_object('state', 'cancelled'), v_now
  );
  return jsonb_build_object('state', 'cancelled', 'next_action', 'relink');
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_prepare_nonce_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_nonce_expires_at timestamptz;
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id', 'nonce_digest',
      'nonce_expires_at'
    ]
  ) or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('accepted', false, 'state', 'permission_denied');
  end if;
  v_nonce_expires_at := (p_input ->> 'nonce_expires_at')::timestamptz;
  if coalesce(p_input ->> 'nonce_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or not isfinite(v_nonce_expires_at)
    or v_nonce_expires_at <= v_now
    or v_nonce_expires_at > v_now + interval '10 minutes'
  then
    return jsonb_build_object('accepted', false, 'state', 'expired');
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'link_token_issued')
    and consumed_at is null
    and expires_at > v_now
  for update;
  if not found then
    return jsonb_build_object('accepted', false, 'state', 'expired');
  end if;
  if v_nonce_expires_at > v_intent.expires_at then
    v_nonce_expires_at := v_intent.expires_at;
  end if;

  update integration.drs_line_account_link_intents
  set intent_state = 'nonce_ready',
    nonce_digest = p_input ->> 'nonce_digest',
    nonce_expires_at = v_nonce_expires_at
  where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit (
    specialist_id, intent_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'nonce_ready',
    'awaiting_line_confirmation',
    jsonb_build_object('state', 'awaiting_line_confirmation'), v_now
  );
  return jsonb_build_object(
    'accepted', true, 'state', 'awaiting_line_confirmation'
  );
exception
  when unique_violation then
    return jsonb_build_object('accepted', false, 'state', 'expired');
  when others then
    return jsonb_build_object(
      'accepted', false, 'state', 'temporarily_unavailable'
    );
end;
$$;

create or replace function drs_private.drs_line_complete_account_link_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_intent integration.drs_line_account_link_intents%rowtype;
  v_existing_line integration.drs_line_account_bindings%rowtype;
  v_existing_specialist integration.drs_line_account_bindings%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority jsonb;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'provider_channel_id', 'nonce_digest', 'line_user_digest',
      'line_user_ciphertext', 'line_user_iv', 'encryption_key_version'
    ]
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'nonce_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_user_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_user_ciphertext', '') !~
      '^[A-Za-z0-9_-]+$'
    or length(coalesce(p_input ->> 'line_user_ciphertext', ''))
      not between 24 and 1024
    or coalesce(p_input ->> 'line_user_iv', '') !~ '^[A-Za-z0-9_-]{16}$'
    or coalesce(p_input ->> 'encryption_key_version', '') !~
      '^[A-Za-z0-9._-]{1,64}$'
  then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and nonce_digest = p_input ->> 'nonce_digest'
    and intent_state = 'nonce_ready'
    and consumed_at is null
    and nonce_expires_at > v_now
    and expires_at > v_now
  for update;

  if not found then
    return jsonb_build_object('state', 'expired', 'next_action', 'relink');
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    v_intent.authenticated_user_id,
    v_intent.selected_case_id,
    v_intent.authorization_subject
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'specialist_id' is distinct from
      v_intent.specialist_id::text
    or v_authority ->> 'assignment_id' is distinct from
      v_intent.assignment_id::text
  then
    update integration.drs_line_account_link_intents
    set intent_state = 'specialist_inactive', consumed_at = v_now,
      failed_at = v_now, nonce_digest = null, nonce_expires_at = null
    where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, event_type, safe_outcome, safe_payload,
      occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'denied',
      'specialist_inactive',
      jsonb_build_object('state', 'specialist_inactive'), v_now
    );
    return jsonb_build_object(
      'state', 'specialist_inactive', 'next_action', 'retry'
    );
  end if;

  select * into v_existing_line
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and line_user_digest = p_input ->> 'line_user_digest'
    and binding_state = 'active'
  for update;

  if found and v_existing_line.specialist_id <> v_intent.specialist_id then
    update integration.drs_line_account_link_intents
    set intent_state = 'conflict_line_already_bound', consumed_at = v_now,
      failed_at = v_now
    where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, event_type, safe_outcome, safe_payload,
      occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'conflict',
      'conflict_line_already_bound',
      jsonb_build_object('state', 'conflict_line_already_bound'), v_now
    );
    return jsonb_build_object(
      'state', 'conflict_line_already_bound', 'next_action', 'relink'
    );
  end if;

  select * into v_existing_specialist
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = v_intent.specialist_id
    and binding_state = 'active'
  for update;

  if found then
    update integration.drs_line_account_link_intents
    set intent_state = 'conflict_drs_already_bound', consumed_at = v_now,
      failed_at = v_now
    where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, binding_id, event_type, safe_outcome,
      safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id,
      v_existing_specialist.binding_id, 'conflict',
      'conflict_drs_already_bound',
      jsonb_build_object('state', 'conflict_drs_already_bound'), v_now
    );
    return jsonb_build_object(
      'state', 'conflict_drs_already_bound', 'next_action', 'relink'
    );
  end if;

  insert into integration.drs_line_account_bindings (
    specialist_id, provider_channel_id, line_user_digest,
    line_user_ciphertext, line_user_iv, encryption_key_version,
    binding_state, linked_at
  ) values (
    v_intent.specialist_id, p_input ->> 'provider_channel_id',
    p_input ->> 'line_user_digest', p_input ->> 'line_user_ciphertext',
    p_input ->> 'line_user_iv', p_input ->> 'encryption_key_version',
    'active', v_now
  ) returning * into v_binding;

  update integration.drs_line_account_link_intents
  set intent_state = 'linked', consumed_at = v_now,
    nonce_digest = null, nonce_expires_at = null
  where intent_id = v_intent.intent_id;

  insert into integration.drs_line_binding_audit (
    specialist_id, intent_id, binding_id, event_type, safe_outcome,
    safe_payload, occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, v_binding.binding_id,
    'linked', 'linked',
    jsonb_build_object(
      'state', 'linked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return jsonb_build_object(
    'state', 'linked', 'linked_at', v_binding.linked_at,
    'next_action', 'unlink'
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_unlink_account_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authorized boolean := false;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id'
    ]
  ) then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  v_authorized := drs_private.drs_line_authority_matches_v1(p_input);
  if not v_authorized then
    perform 1
    from integration.drs_auth_specialist_bindings
    where authenticated_user_id = (p_input ->> 'authenticated_user_id')::uuid
      and specialist_id = (p_input ->> 'specialist_id')::uuid
      and authorization_subject = p_input ->> 'authorization_subject'
      and binding_status = 'active'
      and revoked_at is null
      and valid_from <= v_now
      and valid_until > v_now
    for update;
    v_authorized := found;
  end if;

  if not v_authorized then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;

  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  perform 1
  from integration.drs_line_notification_outbox
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state = 'claimed'
  for update;
  if found then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  insert into integration.drs_line_binding_audit (
    specialist_id, binding_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'unlink_requested',
    'unlinking', jsonb_build_object('state', 'unlinking'), v_now
  );

  update integration.drs_line_account_bindings
  set binding_state = 'revoked', revoked_at = v_now
  where binding_id = v_binding.binding_id;

  update integration.drs_line_notification_outbox
  set delivery_state = 'suppressed', claim_token = null,
    completed_at = v_now
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state in ('pending', 'retry');

  insert into integration.drs_line_binding_audit (
    specialist_id, binding_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'revoked', 'revoked',
    jsonb_build_object(
      'state', 'revoked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return jsonb_build_object(
    'state', 'revoked', 'revoked_at', v_now, 'next_action', 'relink'
  );
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_claim_webhook_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
  v_claim_token uuid := extensions.gen_random_uuid();
  v_provider_retry_key uuid := extensions.gen_random_uuid();
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['webhook_event_digest', 'event_kind']
  )
    or coalesce(p_input ->> 'webhook_event_digest', '') !~
      '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'event_kind', '') not in (
      'binding_action', 'unlink_action', 'account_link', 'verify'
    )
  then
    return jsonb_build_object('admission', 'rejected');
  end if;

  select * into v_event
  from integration.drs_line_webhook_events
  where webhook_event_digest = p_input ->> 'webhook_event_digest'
  for update;

  if found then
    if v_event.processing_state = 'completed' then
      return jsonb_build_object(
        'admission', 'already_completed',
        'safe_outcome', v_event.safe_outcome
      );
    end if;
    if v_event.attempt_count >= 12 then
      update integration.drs_line_webhook_events
      set processing_state = 'completed',
        safe_outcome = 'temporarily_unavailable', completed_at = v_now
      where webhook_event_digest = v_event.webhook_event_digest;
      return jsonb_build_object(
        'admission', 'already_completed',
        'safe_outcome', 'temporarily_unavailable'
      );
    end if;
    if v_event.claimed_at > v_now - interval '2 minutes' then
      return jsonb_build_object('admission', 'in_progress');
    end if;
    v_provider_retry_key := v_event.provider_retry_key;
    update integration.drs_line_webhook_events
    set claim_token = v_claim_token, claimed_at = v_now,
      attempt_count = attempt_count + 1
    where webhook_event_digest = v_event.webhook_event_digest;
  else
    insert into integration.drs_line_webhook_events (
      webhook_event_digest, event_kind, processing_state, safe_outcome,
      claim_token, provider_retry_key, attempt_count, first_seen_at, claimed_at
    ) values (
      p_input ->> 'webhook_event_digest', p_input ->> 'event_kind',
      'processing', 'pending', v_claim_token, v_provider_retry_key,
      1, v_now, v_now
    );
  end if;

  return jsonb_build_object(
    'admission', 'claimed', 'claim_token', v_claim_token::text,
    'provider_retry_key', v_provider_retry_key::text
  );
exception
  when unique_violation then
    return jsonb_build_object('admission', 'in_progress');
  when others then
    return jsonb_build_object('admission', 'temporarily_unavailable');
end;
$$;

create or replace function drs_private.drs_line_complete_webhook_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['webhook_event_digest', 'claim_token', 'safe_outcome']
  )
    or coalesce(p_input ->> 'safe_outcome', '') not in (
      'verified', 'link_token_replied', 'linked', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'not_linked', 'revoked', 'ignored', 'failed',
      'temporarily_unavailable'
    )
  then
    return jsonb_build_object('completed', false);
  end if;

  select * into v_event
  from integration.drs_line_webhook_events
  where webhook_event_digest = p_input ->> 'webhook_event_digest'
  for update;
  if not found then
    return jsonb_build_object('completed', false);
  end if;
  if v_event.processing_state = 'completed' then
    return jsonb_build_object(
      'completed', true, 'safe_outcome', v_event.safe_outcome
    );
  end if;
  if v_event.claim_token <> (p_input ->> 'claim_token')::uuid then
    return jsonb_build_object('completed', false);
  end if;
  update integration.drs_line_webhook_events
  set processing_state = 'completed',
    safe_outcome = p_input ->> 'safe_outcome',
    completed_at = v_now
  where webhook_event_digest = v_event.webhook_event_digest;
  return jsonb_build_object(
    'completed', true, 'safe_outcome', p_input ->> 'safe_outcome'
  );
exception
  when others then
    return jsonb_build_object('completed', false);
end;
$$;

create or replace function drs_private.drs_line_complete_account_link_event_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link jsonb;
  v_completion jsonb;
  v_outcome text;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'webhook_event_digest', 'claim_token', 'provider_channel_id',
      'nonce_digest', 'line_user_digest', 'line_user_ciphertext',
      'line_user_iv', 'encryption_key_version'
    ]
  )
    or coalesce(p_input ->> 'webhook_event_digest', '') !~
      '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'claim_token', '') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return jsonb_build_object('completed', false);
  end if;

  v_link := drs_private.drs_line_complete_account_link_v1(
    jsonb_build_object(
      'provider_channel_id', p_input ->> 'provider_channel_id',
      'nonce_digest', p_input ->> 'nonce_digest',
      'line_user_digest', p_input ->> 'line_user_digest',
      'line_user_ciphertext', p_input ->> 'line_user_ciphertext',
      'line_user_iv', p_input ->> 'line_user_iv',
      'encryption_key_version', p_input ->> 'encryption_key_version'
    )
  );
  v_outcome := v_link ->> 'state';
  if coalesce(v_outcome, '') not in (
    'linked', 'expired', 'conflict_line_already_bound',
    'conflict_drs_already_bound', 'specialist_inactive'
  ) then
    raise exception 'DRS_LINE_ATOMIC_LINK';
  end if;

  v_completion := drs_private.drs_line_complete_webhook_v1(
    jsonb_build_object(
      'webhook_event_digest', p_input ->> 'webhook_event_digest',
      'claim_token', p_input ->> 'claim_token',
      'safe_outcome', v_outcome
    )
  );
  if v_completion -> 'completed' is distinct from 'true'::jsonb
    or v_completion ->> 'safe_outcome' is distinct from v_outcome
  then
    raise exception 'DRS_LINE_ATOMIC_LINK';
  end if;
  return v_completion;
exception
  when others then
    return jsonb_build_object('completed', false);
end;
$$;

create or replace function drs_private.drs_line_enqueue_assignment_v1(
  p_assignment_id uuid,
  p_provider_channel_id text,
  p_template_version text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_assignment public.drs_case_specialist_assignments%rowtype;
  v_case public.drs_cases%rowtype;
  v_auth_binding integration.drs_auth_specialist_bindings%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority_current boolean := false;
  v_count integer := 0;
begin
  if p_assignment_id is null
    or coalesce(p_provider_channel_id, '') !~ '^[0-9]{1,32}$'
    or coalesce(p_template_version, '') !~ '^[A-Za-z0-9._-]{1,64}$'
  then
    return 0;
  end if;

  select assignment_record.* into v_assignment
  from public.drs_case_specialist_assignments assignment_record
  join public.drs_specialists specialist_record
    on specialist_record.specialist_id = assignment_record.specialist_id
  join public.drs_cases case_record
    on case_record.case_id = assignment_record.case_id
  where assignment_record.assignment_id = p_assignment_id
    and assignment_record.valid_from <= v_now
    and (assignment_record.valid_until is null or assignment_record.valid_until > v_now)
    and specialist_record.authority_state = 'ACTIVE'
    and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations termination
      where termination.assignment_id = assignment_record.assignment_id
        and termination.terminated_at <= v_now
    )
  for update of assignment_record, specialist_record, case_record;
  if not found then
    return 0;
  end if;
  select * into strict v_case
  from public.drs_cases where case_id = v_assignment.case_id;

  select * into v_auth_binding
  from integration.drs_auth_specialist_bindings auth_binding
  where auth_binding.specialist_id = v_assignment.specialist_id
    and auth_binding.selected_assignment_id = v_assignment.assignment_id
    and auth_binding.authorization_subject =
      'drs-specialist:' || v_assignment.specialist_id::text
    and auth_binding.binding_status = 'active'
    and auth_binding.revoked_at is null
    and auth_binding.valid_from <= v_now
    and auth_binding.valid_until > v_now
  for update;
  if not found then
    return 0;
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings binding
  where binding.specialist_id = v_assignment.specialist_id
    and binding.provider_channel_id = p_provider_channel_id
    and binding.binding_state = 'active'
  for update;
  if not found then
    return 0;
  end if;

  -- Lock acquisition can wait. Refresh the decision clock after all required
  -- authority and delivery-binding rows are locked, then repeat the complete
  -- current-authority predicate before persisting any payload.
  v_now := clock_timestamp();
  select exists (
    select 1
    from public.drs_case_specialist_assignments assignment_record
    join public.drs_specialists specialist_record
      on specialist_record.specialist_id = assignment_record.specialist_id
    join public.drs_cases case_record
      on case_record.case_id = assignment_record.case_id
    join integration.drs_auth_specialist_bindings auth_binding_record
      on auth_binding_record.binding_id = v_auth_binding.binding_id
    where assignment_record.assignment_id = v_assignment.assignment_id
      and assignment_record.case_id = v_assignment.case_id
      and assignment_record.specialist_id = v_assignment.specialist_id
      and assignment_record.valid_from <= v_now
      and (
        assignment_record.valid_until is null
        or assignment_record.valid_until > v_now
      )
      and specialist_record.authority_state = 'ACTIVE'
      and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
      and auth_binding_record.specialist_id = v_assignment.specialist_id
      and auth_binding_record.selected_assignment_id = v_assignment.assignment_id
      and auth_binding_record.authorization_subject =
        'drs-specialist:' || v_assignment.specialist_id::text
      and auth_binding_record.binding_status = 'active'
      and auth_binding_record.revoked_at is null
      and auth_binding_record.valid_from <= v_now
      and auth_binding_record.valid_until > v_now
      and not exists (
        select 1
        from public.drs_case_specialist_assignment_terminations termination
        where termination.assignment_id = assignment_record.assignment_id
          and termination.terminated_at <= v_now
      )
  ) into v_authority_current;
  if not v_authority_current then
    return 0;
  end if;

  insert into integration.drs_line_notification_outbox (
    case_id, assignment_id, specialist_id, auth_binding_id, binding_id,
    binding_version, provider_channel_id, template_version, idempotency_key,
    case_label, case_status, next_action, case_path, delivery_state,
    attempt_count, next_attempt_at, created_at
  )
  values (
    v_assignment.case_id, v_assignment.assignment_id,
    v_assignment.specialist_id, v_auth_binding.binding_id, v_binding.binding_id,
    v_binding.binding_version, v_binding.provider_channel_id,
    p_template_version,
    'a:' || replace(v_assignment.assignment_id::text, '-', '') ||
      ':l:' || v_binding.binding_version::text ||
      ':u:' || replace(v_auth_binding.binding_id::text, '-', '') ||
      ':t:' || p_template_version,
    left('案件 ' || v_case.case_number, 80),
    case v_case.case_state
      when 'ACTIVE_REVIEW' then '審查進行中'
      else '施工追蹤中'
    end,
    '請開啟 DRS 收件匣檢視案件',
    '/pcm/console/case?caseId=' || v_assignment.case_id::text,
    'pending', 0, v_now, v_now
  )
  on conflict (idempotency_key) do nothing;

  select count(*)::integer into v_count
  from integration.drs_line_notification_outbox outbox
  where outbox.assignment_id = v_assignment.assignment_id
    and outbox.auth_binding_id = v_auth_binding.binding_id
    and outbox.provider_channel_id = p_provider_channel_id
    and outbox.template_version = p_template_version;
  return v_count;
end;
$$;

create or replace function drs_private.drs_line_assignment_producer_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_binding record;
begin
  for v_binding in
    select distinct provider_channel_id
    from integration.drs_line_account_bindings
    where specialist_id = new.specialist_id and binding_state = 'active'
  loop
    perform drs_private.drs_line_enqueue_assignment_v1(
      new.assignment_id, v_binding.provider_channel_id, 'assignment-v1'
    );
  end loop;
  return new;
end;
$$;

create or replace function drs_private.drs_line_binding_producer_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment record;
begin
  if new.binding_state <> 'active' then
    return new;
  end if;
  for v_assignment in
    select assignment_id
    from public.drs_case_specialist_assignments
    where specialist_id = new.specialist_id
  loop
    perform drs_private.drs_line_enqueue_assignment_v1(
      v_assignment.assignment_id, new.provider_channel_id, 'assignment-v1'
    );
  end loop;
  return new;
end;
$$;

create trigger drs_line_assignment_notification_producer
  after insert on public.drs_case_specialist_assignments
  for each row execute function drs_private.drs_line_assignment_producer_v1();

create trigger drs_line_binding_notification_producer
  after insert on integration.drs_line_account_bindings
  for each row execute function drs_private.drs_line_binding_producer_v1();

create or replace function drs_private.drs_line_delivery_fence_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid;
  v_claimed boolean := false;
  v_now timestamptz := clock_timestamp();
  v_suppressed integration.drs_line_notification_outbox%rowtype;
begin
  if tg_table_schema = 'integration'
    and tg_table_name = 'drs_auth_specialist_bindings'
    and tg_op = 'DELETE'
  then
    raise exception 'DRS_AUTH_BINDING_DELETE_FORBIDDEN';
  end if;

  if tg_table_schema = 'public'
    and tg_table_name = 'drs_case_specialist_assignment_terminations'
  then
    v_key := (to_jsonb(new) ->> 'assignment_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where assignment_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'public'
    and tg_table_name = 'drs_case_specialist_assignments'
  then
    v_key := (to_jsonb(old) ->> 'assignment_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where assignment_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'public' and tg_table_name = 'drs_specialists'
  then
    v_key := (to_jsonb(old) ->> 'specialist_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where specialist_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'public' and tg_table_name = 'drs_cases'
  then
    v_key := (to_jsonb(old) ->> 'case_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where case_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'integration'
    and tg_table_name = 'drs_auth_specialist_bindings'
  then
    v_key := (to_jsonb(old) ->> 'binding_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where auth_binding_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'integration'
    and tg_table_name = 'drs_line_account_bindings'
  then
    v_key := (to_jsonb(old) ->> 'binding_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where binding_id = v_key and delivery_state = 'claimed';
  else
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  v_claimed := found;
  if v_claimed then
    raise exception 'DRS_LINE_DELIVERY_IN_FLIGHT';
  end if;
  if tg_table_schema = 'integration'
    and tg_table_name = 'drs_auth_specialist_bindings'
  then
    for v_suppressed in
      update integration.drs_line_notification_outbox
      set delivery_state = 'suppressed', claim_token = null,
        claimed_at = null, completed_at = v_now
      where auth_binding_id = v_key
        and delivery_state in ('pending', 'retry')
      returning *
    loop
      insert into integration.drs_line_delivery_receipts (
        outbox_id, case_id, specialist_id, attempt_number, outcome,
        http_status_class, provider_request_id, reason_code, duration_ms,
        attempted_at
      ) values (
        v_suppressed.outbox_id, v_suppressed.case_id,
        v_suppressed.specialist_id,
        greatest(v_suppressed.attempt_count + 1, 1),
        'suppressed', 'none', null, 'suppressed_authority', 0, v_now
      );
      perform drs_private.drs_line_append_case_receipt_v1(
        v_suppressed.outbox_id, 'suppressed', 'suppressed_authority', v_now
      );
    end loop;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger drs_line_assignment_termination_delivery_fence
  before insert on public.drs_case_specialist_assignment_terminations
  for each row execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_assignment_update_delivery_fence
  before update of valid_until on public.drs_case_specialist_assignments
  for each row when (old.valid_until is distinct from new.valid_until)
  execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_specialist_delivery_fence
  before update of authority_state on public.drs_specialists
  for each row when (old.authority_state is distinct from new.authority_state)
  execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_case_delivery_fence
  before update of case_state on public.drs_cases
  for each row when (old.case_state is distinct from new.case_state)
  execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_auth_binding_delivery_fence
  before update or delete
  on integration.drs_auth_specialist_bindings
  for each row execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_binding_revoke_delivery_fence
  before update of binding_state on integration.drs_line_account_bindings
  for each row when (old.binding_state is distinct from new.binding_state)
  execute function drs_private.drs_line_delivery_fence_v1();

create or replace function drs_private.drs_line_admit_case_notification_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['assignment_id', 'provider_channel_id', 'template_version']
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'template_version', '') !~
      '^[A-Za-z0-9._-]{1,64}$'
  then
    return jsonb_build_object('admitted', false, 'state', 'permission_denied');
  end if;

  v_count := drs_private.drs_line_enqueue_assignment_v1(
    (p_input ->> 'assignment_id')::uuid,
    p_input ->> 'provider_channel_id',
    p_input ->> 'template_version'
  );
  return jsonb_build_object(
    'admitted', v_count > 0,
    'state', case when v_count > 0 then 'pending'
      else 'notification_pending_setup' end,
    'outbox_count', v_count
  );
exception
  when others then
    return jsonb_build_object(
      'admitted', false, 'state', 'temporarily_unavailable'
    );
end;
$$;

create or replace function drs_private.drs_line_append_case_receipt_v1(
  p_outbox_id uuid,
  p_outcome text,
  p_reason_code text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_previous_event_id uuid;
  v_event_id uuid := extensions.gen_random_uuid();
begin
  select * into strict v_outbox
  from integration.drs_line_notification_outbox
  where outbox_id = p_outbox_id;
  perform 1 from public.drs_cases
  where case_id = v_outbox.case_id for update;
  select event.event_id into v_previous_event_id
  from public.drs_case_audit_events event
  where event.case_id = v_outbox.case_id
    and not exists (
      select 1 from public.drs_case_audit_events successor
      where successor.previous_event_id = event.event_id
    )
  order by event.occurred_at desc, event.event_id desc
  limit 1
  for update;
  return drs_private.insert_drs_audit_event(
    v_event_id, v_outbox.case_id, v_previous_event_id,
    'PRIVATE_LINE_NOTIFICATION',
    p_occurred_at, 'SYSTEM', 'drs-line-private-notification', 'SYSTEM',
    null, null,
    jsonb_build_object(
      'receipt_kind', 'PRIVATE_LINE_NOTIFICATION',
      'outbox_id', v_outbox.outbox_id::text,
      'outcome', p_outcome,
      'reason_code', p_reason_code,
      'binding_version', v_outbox.binding_version::text
    ), false, false
  );
end;
$$;

create or replace function drs_private.drs_line_claim_notification_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_claim_token uuid := extensions.gen_random_uuid();
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority_current boolean := false;
  v_binding_current boolean := false;
begin
  if not drs_private.drs_line_exact_json_keys_v1(p_input, array[]::text[]) then
    return jsonb_build_object('admitted', false, 'state', 'permission_denied');
  end if;

  select * into v_outbox
  from integration.drs_line_notification_outbox
  where (
      delivery_state in ('pending', 'retry')
      and next_attempt_at <= v_now
      and attempt_count < 5
    ) or (
      delivery_state = 'claimed'
      and claimed_at <= v_now - interval '2 minutes'
    )
  order by next_attempt_at, created_at, outbox_id
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('admitted', false, 'state', 'empty');
  end if;

  if v_outbox.delivery_state = 'claimed' and v_outbox.attempt_count >= 5 then
    update integration.drs_line_notification_outbox
    set delivery_state = 'permanent_failure', claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
    insert into integration.drs_line_delivery_receipts (
      outbox_id, case_id, specialist_id, attempt_number, outcome,
      http_status_class, provider_request_id, reason_code, duration_ms,
      attempted_at
    ) values (
      v_outbox.outbox_id, v_outbox.case_id, v_outbox.specialist_id,
      v_outbox.attempt_count, 'permanent_failure', 'none', null,
      'dispatcher_claim_expired', 0, v_now
    );
    perform drs_private.drs_line_append_case_receipt_v1(
      v_outbox.outbox_id, 'permanent_failure',
      'dispatcher_claim_expired', v_now
    );
    return jsonb_build_object(
      'admitted', false, 'state', 'permanent_failure'
    );
  end if;

  perform 1
  from public.drs_case_specialist_assignments assignment_record
  join public.drs_specialists specialist_record
    on specialist_record.specialist_id = assignment_record.specialist_id
  join public.drs_cases case_record
    on case_record.case_id = assignment_record.case_id
  join integration.drs_auth_specialist_bindings auth_binding_record
    on auth_binding_record.binding_id = v_outbox.auth_binding_id
  where assignment_record.assignment_id = v_outbox.assignment_id
    and assignment_record.case_id = v_outbox.case_id
    and assignment_record.specialist_id = v_outbox.specialist_id
    and assignment_record.valid_from <= v_now
    and (assignment_record.valid_until is null or assignment_record.valid_until > v_now)
    and specialist_record.authority_state = 'ACTIVE'
    and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and auth_binding_record.specialist_id = v_outbox.specialist_id
    and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
    and auth_binding_record.authorization_subject =
      'drs-specialist:' || v_outbox.specialist_id::text
    and auth_binding_record.binding_status = 'active'
    and auth_binding_record.revoked_at is null
    and auth_binding_record.valid_from <= v_now
    and auth_binding_record.valid_until > v_now
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations termination
      where termination.assignment_id = assignment_record.assignment_id
        and termination.terminated_at <= v_now
    )
  for update of assignment_record, specialist_record, case_record,
    auth_binding_record;
  v_authority_current := found;

  select * into v_binding
  from integration.drs_line_account_bindings
  where binding_id = v_outbox.binding_id
    and specialist_id = v_outbox.specialist_id
    and provider_channel_id = v_outbox.provider_channel_id
    and binding_version = v_outbox.binding_version
    and binding_state = 'active'
  for update;
  v_binding_current := found;

  -- The required row locks may have waited past an authority deadline.
  -- Refresh the clock and recheck every current fact before exposing payload.
  v_now := clock_timestamp();
  if v_authority_current and v_binding_current then
    select exists (
      select 1
      from public.drs_case_specialist_assignments assignment_record
      join public.drs_specialists specialist_record
        on specialist_record.specialist_id = assignment_record.specialist_id
      join public.drs_cases case_record
        on case_record.case_id = assignment_record.case_id
      join integration.drs_auth_specialist_bindings auth_binding_record
        on auth_binding_record.binding_id = v_outbox.auth_binding_id
      where assignment_record.assignment_id = v_outbox.assignment_id
        and assignment_record.case_id = v_outbox.case_id
        and assignment_record.specialist_id = v_outbox.specialist_id
        and assignment_record.valid_from <= v_now
        and (
          assignment_record.valid_until is null
          or assignment_record.valid_until > v_now
        )
        and specialist_record.authority_state = 'ACTIVE'
        and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
        and auth_binding_record.specialist_id = v_outbox.specialist_id
        and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
        and auth_binding_record.authorization_subject =
          'drs-specialist:' || v_outbox.specialist_id::text
        and auth_binding_record.binding_status = 'active'
        and auth_binding_record.revoked_at is null
        and auth_binding_record.valid_from <= v_now
        and auth_binding_record.valid_until > v_now
        and not exists (
          select 1
          from public.drs_case_specialist_assignment_terminations termination
          where termination.assignment_id = assignment_record.assignment_id
            and termination.terminated_at <= v_now
        )
    ) into v_authority_current;
  end if;

  if not v_authority_current or not v_binding_current then
    update integration.drs_line_notification_outbox
    set delivery_state = 'suppressed', claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
    insert into integration.drs_line_delivery_receipts (
      outbox_id, case_id, specialist_id, attempt_number, outcome,
      http_status_class, provider_request_id, reason_code, duration_ms,
      attempted_at
    ) values (
      v_outbox.outbox_id, v_outbox.case_id, v_outbox.specialist_id,
      greatest(v_outbox.attempt_count + 1, 1), 'suppressed', 'none', null,
      'suppressed_authority', 0, v_now
    );
    perform drs_private.drs_line_append_case_receipt_v1(
      v_outbox.outbox_id, 'suppressed', 'suppressed_authority', v_now
    );
    return jsonb_build_object(
      'admitted', false,
      'state', 'suppressed_authority',
      'assignment_status', 'not_current'
    );
  end if;

  update integration.drs_line_notification_outbox
  set delivery_state = 'claimed', claim_token = v_claim_token,
    claimed_at = v_now, attempt_count = attempt_count + 1
  where outbox_id = v_outbox.outbox_id;

  return jsonb_build_object(
    'admitted', true,
    'outbox_id', v_outbox.outbox_id::text,
    'claim_token', v_claim_token::text,
    'binding_version', v_binding.binding_version::text,
    'line_user_ciphertext', v_binding.line_user_ciphertext,
    'line_user_iv', v_binding.line_user_iv,
    'encryption_key_version', v_binding.encryption_key_version,
    'case_label', v_outbox.case_label,
    'case_status', v_outbox.case_status,
    'next_action', v_outbox.next_action,
    'case_path', v_outbox.case_path
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'admitted', false, 'state', 'temporarily_unavailable'
    );
  when others then
    return jsonb_build_object(
      'admitted', false, 'state', 'temporarily_unavailable'
    );
end;
$$;

create or replace function drs_private.drs_line_assert_notification_claim_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_current boolean := false;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['outbox_id', 'claim_token']
  ) then
    return jsonb_build_object('current', false);
  end if;
  select * into v_outbox
  from integration.drs_line_notification_outbox
  where outbox_id = (p_input ->> 'outbox_id')::uuid
    and delivery_state = 'claimed'
    and claim_token = (p_input ->> 'claim_token')::uuid
  for update;
  if not found then
    return jsonb_build_object('current', false);
  end if;
  perform 1
  from public.drs_case_specialist_assignments assignment_record
  join public.drs_specialists specialist_record
    on specialist_record.specialist_id = assignment_record.specialist_id
  join public.drs_cases case_record
    on case_record.case_id = assignment_record.case_id
  join integration.drs_line_account_bindings binding
    on binding.binding_id = v_outbox.binding_id
  join integration.drs_auth_specialist_bindings auth_binding_record
    on auth_binding_record.binding_id = v_outbox.auth_binding_id
  where assignment_record.assignment_id = v_outbox.assignment_id
    and assignment_record.case_id = v_outbox.case_id
    and assignment_record.specialist_id = v_outbox.specialist_id
    and assignment_record.valid_from <= v_now
    and (assignment_record.valid_until is null or assignment_record.valid_until > v_now)
    and specialist_record.authority_state = 'ACTIVE'
    and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and binding.specialist_id = v_outbox.specialist_id
    and binding.provider_channel_id = v_outbox.provider_channel_id
    and binding.binding_version = v_outbox.binding_version
    and binding.binding_state = 'active'
    and auth_binding_record.specialist_id = v_outbox.specialist_id
    and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
    and auth_binding_record.authorization_subject =
      'drs-specialist:' || v_outbox.specialist_id::text
    and auth_binding_record.binding_status = 'active'
    and auth_binding_record.revoked_at is null
    and auth_binding_record.valid_from <= v_now
    and auth_binding_record.valid_until > v_now
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations termination
      where termination.assignment_id = assignment_record.assignment_id
        and termination.terminated_at <= v_now
    )
  for update of assignment_record, specialist_record, case_record, binding,
    auth_binding_record;
  v_current := found;
  if v_current then
    v_now := clock_timestamp();
    select exists (
      select 1
      from public.drs_case_specialist_assignments assignment_record
      join public.drs_specialists specialist_record
        on specialist_record.specialist_id = assignment_record.specialist_id
      join public.drs_cases case_record
        on case_record.case_id = assignment_record.case_id
      join integration.drs_line_account_bindings binding
        on binding.binding_id = v_outbox.binding_id
      join integration.drs_auth_specialist_bindings auth_binding_record
        on auth_binding_record.binding_id = v_outbox.auth_binding_id
      where assignment_record.assignment_id = v_outbox.assignment_id
        and assignment_record.case_id = v_outbox.case_id
        and assignment_record.specialist_id = v_outbox.specialist_id
        and assignment_record.valid_from <= v_now
        and (
          assignment_record.valid_until is null
          or assignment_record.valid_until > v_now
        )
        and specialist_record.authority_state = 'ACTIVE'
        and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
        and binding.specialist_id = v_outbox.specialist_id
        and binding.provider_channel_id = v_outbox.provider_channel_id
        and binding.binding_version = v_outbox.binding_version
        and binding.binding_state = 'active'
        and auth_binding_record.specialist_id = v_outbox.specialist_id
        and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
        and auth_binding_record.authorization_subject =
          'drs-specialist:' || v_outbox.specialist_id::text
        and auth_binding_record.binding_status = 'active'
        and auth_binding_record.revoked_at is null
        and auth_binding_record.valid_from <= v_now
        and auth_binding_record.valid_until > v_now
        and not exists (
          select 1
          from public.drs_case_specialist_assignment_terminations termination
          where termination.assignment_id = assignment_record.assignment_id
            and termination.terminated_at <= v_now
        )
    ) into v_current;
  end if;
  return jsonb_build_object('current', v_current);
exception
  when others then
    return jsonb_build_object('current', false);
end;
$$;

create or replace function drs_private.drs_line_complete_notification_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_retry_after integer;
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_next_state text;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'outbox_id', 'claim_token', 'outcome', 'http_status_class',
      'provider_request_id', 'reason_code', 'duration_ms',
      'retry_after_seconds'
    ]
  )
    or coalesce(p_input ->> 'outcome', '') not in (
      'accepted', 'retryable_failure', 'permanent_failure'
    )
    or coalesce(p_input ->> 'http_status_class', '') not in (
      '2xx', '4xx', '5xx', 'none'
    )
    or coalesce(p_input ->> 'reason_code', '') !~ '^[a-z0-9_]{1,64}$'
  then
    return jsonb_build_object('completed', false);
  end if;

  select * into v_outbox
  from integration.drs_line_notification_outbox
  where outbox_id = (p_input ->> 'outbox_id')::uuid
  for update;
  if not found or v_outbox.delivery_state <> 'claimed'
    or v_outbox.claim_token <> (p_input ->> 'claim_token')::uuid
  then
    return jsonb_build_object('completed', false);
  end if;

  insert into integration.drs_line_delivery_receipts (
    outbox_id, case_id, specialist_id, attempt_number, outcome,
    http_status_class, provider_request_id, reason_code, duration_ms,
    attempted_at
  ) values (
    v_outbox.outbox_id, v_outbox.case_id, v_outbox.specialist_id,
    v_outbox.attempt_count, p_input ->> 'outcome',
    p_input ->> 'http_status_class',
    nullif(p_input ->> 'provider_request_id', ''),
    p_input ->> 'reason_code', (p_input ->> 'duration_ms')::integer, v_now
  );

  if p_input ->> 'outcome' = 'accepted' then
    v_next_state := 'accepted';
    update integration.drs_line_notification_outbox
    set delivery_state = v_next_state, claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
  elsif p_input ->> 'outcome' = 'retryable_failure'
    and v_outbox.attempt_count < 5
  then
    v_retry_after := least(
      greatest((p_input ->> 'retry_after_seconds')::integer, 5), 3600
    );
    v_next_state := 'retry';
    update integration.drs_line_notification_outbox
    set delivery_state = v_next_state, claim_token = null,
      claimed_at = null,
      next_attempt_at = v_now + make_interval(secs => v_retry_after)
    where outbox_id = v_outbox.outbox_id;
  else
    v_next_state := 'permanent_failure';
    update integration.drs_line_notification_outbox
    set delivery_state = v_next_state, claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
  end if;

  perform drs_private.drs_line_append_case_receipt_v1(
    v_outbox.outbox_id, v_next_state, p_input ->> 'reason_code', v_now
  );
  return jsonb_build_object('completed', true, 'state', v_next_state);
exception
  when unique_violation then
    return jsonb_build_object('completed', false);
  when others then
    return jsonb_build_object('completed', false);
end;
$$;

alter function drs_private.drs_line_start_link_intent_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_read_link_status_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_cancel_link_intent_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_prepare_nonce_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_account_link_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_unlink_account_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_unlink_by_line_identity_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_claim_webhook_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_webhook_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_account_link_event_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_admit_case_notification_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_claim_notification_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_assert_notification_claim_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_notification_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_enqueue_assignment_v1(uuid,text,text)
  owner to postgres;
alter function drs_private.drs_line_assignment_producer_v1() owner to postgres;
alter function drs_private.drs_line_binding_producer_v1() owner to postgres;
alter function drs_private.drs_line_delivery_fence_v1() owner to postgres;
alter function drs_private.drs_line_append_case_receipt_v1(uuid,text,text,timestamptz)
  owner to postgres;

revoke all on function drs_private.drs_line_start_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_read_link_status_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_cancel_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_prepare_nonce_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_account_link_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_unlink_account_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_unlink_by_line_identity_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_claim_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_account_link_event_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_admit_case_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_claim_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_assert_notification_claim_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_enqueue_assignment_v1(uuid,text,text)
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_assignment_producer_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_binding_producer_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_delivery_fence_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_append_case_receipt_v1(uuid,text,text,timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function drs_private.drs_line_start_link_intent_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_read_link_status_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_cancel_link_intent_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_prepare_nonce_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_account_link_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_unlink_account_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_unlink_by_line_identity_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_claim_webhook_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_webhook_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_account_link_event_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_admit_case_notification_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_claim_notification_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_assert_notification_claim_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_notification_v1(jsonb)
  to service_role;

-- PostgREST only exposes functions in its configured API schemas. These
-- facades expose no table and no browser authority: service_role is the sole
-- caller and every operation remains implemented by the closed private RPC.
create or replace function public.drs_line_start_link_intent_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_start_link_intent_v1(p_input) $$;
create or replace function public.drs_line_read_link_status_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_read_link_status_v1(p_input) $$;
create or replace function public.drs_line_cancel_link_intent_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_cancel_link_intent_v1(p_input) $$;
create or replace function public.drs_line_prepare_nonce_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_prepare_nonce_v1(p_input) $$;
create or replace function public.drs_line_complete_account_link_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_account_link_v1(p_input) $$;
create or replace function public.drs_line_unlink_account_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_unlink_account_v1(p_input) $$;
create or replace function public.drs_line_unlink_by_line_identity_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_unlink_by_line_identity_v1(p_input) $$;
create or replace function public.drs_line_claim_webhook_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_claim_webhook_v1(p_input) $$;
create or replace function public.drs_line_complete_webhook_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_webhook_v1(p_input) $$;
create or replace function public.drs_line_complete_account_link_event_v1(
  p_input jsonb
)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_account_link_event_v1(p_input) $$;
create or replace function public.drs_line_admit_case_notification_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_admit_case_notification_v1(p_input) $$;
create or replace function public.drs_line_claim_notification_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_claim_notification_v1(p_input) $$;
create or replace function public.drs_line_assert_notification_claim_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_assert_notification_claim_v1(p_input) $$;
create or replace function public.drs_line_complete_notification_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_notification_v1(p_input) $$;

alter function public.drs_line_start_link_intent_v1(jsonb) owner to postgres;
alter function public.drs_line_read_link_status_v1(jsonb) owner to postgres;
alter function public.drs_line_cancel_link_intent_v1(jsonb) owner to postgres;
alter function public.drs_line_prepare_nonce_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_account_link_v1(jsonb) owner to postgres;
alter function public.drs_line_unlink_account_v1(jsonb) owner to postgres;
alter function public.drs_line_unlink_by_line_identity_v1(jsonb) owner to postgres;
alter function public.drs_line_claim_webhook_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_webhook_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_account_link_event_v1(jsonb)
  owner to postgres;
alter function public.drs_line_admit_case_notification_v1(jsonb) owner to postgres;
alter function public.drs_line_claim_notification_v1(jsonb) owner to postgres;
alter function public.drs_line_assert_notification_claim_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_notification_v1(jsonb) owner to postgres;

revoke all on function public.drs_line_start_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_read_link_status_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_cancel_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_prepare_nonce_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_account_link_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_unlink_account_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_unlink_by_line_identity_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_claim_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_account_link_event_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_admit_case_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_claim_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_assert_notification_claim_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_notification_v1(jsonb)
  from public, anon, authenticated;

grant execute on function public.drs_line_start_link_intent_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_read_link_status_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_cancel_link_intent_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_prepare_nonce_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_account_link_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_unlink_account_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_unlink_by_line_identity_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_claim_webhook_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_webhook_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_account_link_event_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_admit_case_notification_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_claim_notification_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_assert_notification_claim_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_notification_v1(jsonb)
  to service_role;

-- BRIDGE_PHASE_IDENTITY_STATE_PUBLIC_WRAPPERS
create function public.drs_identity_link_state_create_v1(
  p_state_digest text,
  p_nonce_digest text,
  p_pkce_verifier_ciphertext text,
  p_authenticated_user_id uuid,
  p_specialist_id uuid,
  p_authorization_subject text,
  p_provider text,
  p_intended_action text,
  p_redirect_uri text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  select integration.drs_identity_link_state_create_v1(
    p_state_digest, p_nonce_digest, p_pkce_verifier_ciphertext,
    p_authenticated_user_id, p_specialist_id, p_authorization_subject,
    p_provider, p_intended_action, p_redirect_uri, p_expires_at, p_now
  );
$$;

create function public.drs_identity_link_state_claim_v1(
  p_state_digest text,
  p_provider text,
  p_redirect_uri text,
  p_now timestamptz
)
returns table (
  state_id uuid,
  nonce_digest text,
  pkce_verifier_ciphertext text,
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  intended_action text,
  claim_token uuid
)
language sql
security definer
set search_path = ''
as $$
  select * from integration.drs_identity_link_state_claim_v1(
    p_state_digest, p_provider, p_redirect_uri, p_now
  );
$$;

create function public.drs_identity_link_state_fail_v1(
  p_claim_token uuid,
  p_now timestamptz,
  p_failure_state text
)
returns void
language sql
security definer
set search_path = ''
as $$
  select integration.fail_identity_link_state_claim_v1(
    p_claim_token, p_now, p_failure_state
  );
$$;

create function public.drs_identity_callback_prepare_v1(
  p_claim_token uuid,
  p_provider text,
  p_provider_subject text,
  p_verified_email text,
  p_now timestamptz
)
returns table (
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  intended_action text
)
language sql
security definer
set search_path = ''
as $$
  select * from integration.drs_identity_callback_prepare_v1(
    p_claim_token, p_provider, p_provider_subject, p_verified_email, p_now
  );
$$;

create function public.drs_identity_callback_finalize_v1(
  p_claim_token uuid,
  p_provider text,
  p_provider_subject text,
  p_verified_email text,
  p_expected_authenticated_user_id uuid,
  p_expected_specialist_id uuid,
  p_expected_authorization_subject text,
  p_expected_intended_action text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  select integration.drs_identity_callback_finalize_v1(
    p_claim_token, p_provider, p_provider_subject, p_verified_email,
    p_expected_authenticated_user_id, p_expected_specialist_id,
    p_expected_authorization_subject, p_expected_intended_action,
    p_now, p_correlation_id
  );
$$;

alter function public.drs_identity_link_state_create_v1(
  text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz
) owner to postgres;
alter function public.drs_identity_link_state_claim_v1(
  text,text,text,timestamptz
) owner to postgres;
alter function public.drs_identity_link_state_fail_v1(
  uuid,timestamptz,text
) owner to postgres;
alter function public.drs_identity_callback_prepare_v1(
  uuid,text,text,text,timestamptz
) owner to postgres;
alter function public.drs_identity_callback_finalize_v1(
  uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid
) owner to postgres;

revoke all on function public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.drs_identity_link_state_claim_v1(text,text,text,timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.drs_identity_link_state_fail_v1(uuid,timestamptz,text) from public, anon, authenticated, service_role;
revoke all on function public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid) from public, anon, authenticated, service_role;

grant execute on function public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.drs_identity_link_state_claim_v1(text,text,text,timestamptz) to service_role;
grant execute on function public.drs_identity_link_state_fail_v1(uuid,timestamptz,text) to service_role;
grant execute on function public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid) to service_role;

-- BRIDGE_FINAL_POLICY_BEGIN
create or replace function drs_private.is_current_actor_active_case_owner(
  target_case_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from integration.drs_case_identity_bindings mapping_record
    join casework.case_members member_record
      on member_record.case_id = mapping_record.casework_case_id
    where mapping_record.drs_case_id = target_case_id
      and mapping_record.mapping_status = 'active'
      and mapping_record.revoked_at is null
      and mapping_record.valid_from <= clock_timestamp()
      and mapping_record.valid_until > clock_timestamp()
      and member_record.user_id = (select auth.uid())
      and member_record.role = 'owner'
  );
$$;
alter function drs_private.is_current_actor_active_case_owner(uuid) owner to postgres;
revoke all on function drs_private.is_current_actor_active_case_owner(uuid) from public, anon, authenticated, service_role;
grant execute on function drs_private.is_current_actor_active_case_owner(uuid) to authenticated;

drop policy if exists drs_cases_owner_or_assigned_specialist on public.drs_cases;
create policy drs_cases_owner_or_assigned_specialist on public.drs_cases
  for select to authenticated
  using (
    drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_specialists_self_select on public.drs_specialists;
create policy drs_specialists_self_select on public.drs_specialists
  for select to authenticated
  using (drs_private.is_current_actor_active_specialist(specialist_id));

drop policy if exists drs_case_line_group_links_case_participant_select on public.drs_case_line_group_links;
create policy drs_case_line_group_links_case_participant_select on public.drs_case_line_group_links
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

drop policy if exists drs_case_specialist_assignments_case_participant_select on public.drs_case_specialist_assignments;
create policy drs_case_specialist_assignments_case_participant_select on public.drs_case_specialist_assignments
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

drop policy if exists drs_case_line_group_link_terminations_case_participant_select on public.drs_case_line_group_link_terminations;
create policy drs_case_line_group_link_terminations_case_participant_select on public.drs_case_line_group_link_terminations
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

drop policy if exists drs_case_specialist_assignment_terminations_case_participant_select on public.drs_case_specialist_assignment_terminations;
create policy drs_case_specialist_assignment_terminations_case_participant_select on public.drs_case_specialist_assignment_terminations
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

drop policy if exists drs_case_audit_events_case_participant_select on public.drs_case_audit_events;
create policy drs_case_audit_events_case_participant_select on public.drs_case_audit_events
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

drop policy if exists drs_review_work_items_case_participant_select on public.drs_review_work_items;
create policy drs_review_work_items_case_participant_select on public.drs_review_work_items
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

drop policy if exists drs_review_work_item_transitions_case_participant_select on public.drs_review_work_item_transitions;
create policy drs_review_work_item_transitions_case_participant_select on public.drs_review_work_item_transitions
  for select to authenticated
  using (drs_private.is_current_actor_active_case_owner(case_id)
    or drs_private.is_current_actor_active_case_specialist(case_id));

-- BRIDGE_PHASE_POSTCONDITION
do $$
declare
  v_fingerprint record;
  v_signature text;
  v_private_signature text;
begin
  select * into strict v_fingerprint from drs_bridge_preimage_fingerprint;
  if 'casework.cases'::regclass::oid <> v_fingerprint.cases_oid
    or 'casework.case_members'::regclass::oid <> v_fingerprint.members_oid
    or (select relowner from pg_class where oid = 'casework.cases'::regclass)
      <> v_fingerprint.cases_owner
    or (select relowner from pg_class where oid = 'casework.case_members'::regclass)
      <> v_fingerprint.members_owner
    or coalesce((select relacl::text from pg_class where oid = 'casework.cases'::regclass), '')
      <> v_fingerprint.cases_acl
    or coalesce((select relacl::text from pg_class where oid = 'casework.case_members'::regclass), '')
      <> v_fingerprint.members_acl
    or (select relrowsecurity from pg_class where oid = 'casework.cases'::regclass)
      <> v_fingerprint.cases_rls
    or (select relrowsecurity from pg_class where oid = 'casework.case_members'::regclass)
      <> v_fingerprint.members_rls
    or (select relforcerowsecurity from pg_class where oid = 'casework.cases'::regclass)
      <> v_fingerprint.cases_force_rls
    or (select relforcerowsecurity from pg_class where oid = 'casework.case_members'::regclass)
      <> v_fingerprint.members_force_rls
    or (
      select md5(coalesce(string_agg(
        format('%s|%s|%s|%s', t.tgname, t.tgenabled, t.tgisinternal, pg_get_triggerdef(t.oid)),
        E'\n' order by t.tgname
      ), ''))
      from pg_trigger t where t.tgrelid = 'casework.cases'::regclass
    ) <> v_fingerprint.cases_trigger_fingerprint
    or (
      select md5(coalesce(string_agg(
        format('%s|%s|%s|%s', t.tgname, t.tgenabled, t.tgisinternal, pg_get_triggerdef(t.oid)),
        E'\n' order by t.tgname
      ), ''))
      from pg_trigger t where t.tgrelid = 'casework.case_members'::regclass
    ) <> v_fingerprint.members_trigger_fingerprint
    or (
      select md5(coalesce(string_agg(
        format('%s|%s|%s|%s|%s|%s', c.conname, c.contype, c.convalidated,
          c.condeferrable, c.condeferred, pg_get_constraintdef(c.oid)),
        E'\n' order by c.conname
      ), ''))
      from pg_constraint c where c.conrelid = 'casework.cases'::regclass
    ) <> v_fingerprint.cases_constraint_fingerprint
    or (
      select md5(coalesce(string_agg(
        format('%s|%s|%s|%s|%s|%s', c.conname, c.contype, c.convalidated,
          c.condeferrable, c.condeferred, pg_get_constraintdef(c.oid)),
        E'\n' order by c.conname
      ), ''))
      from pg_constraint c where c.conrelid = 'casework.case_members'::regclass
    ) <> v_fingerprint.members_constraint_fingerprint
    or (
      select md5(coalesce(string_agg(
        format('%s|%s|%s|%s|%s|%s', p.polname, p.polcmd, p.polpermissive,
          p.polroles::text, pg_get_expr(p.polqual, p.polrelid),
          pg_get_expr(p.polwithcheck, p.polrelid)),
        E'\n' order by p.polname
      ), ''))
      from pg_policy p where p.polrelid = 'casework.cases'::regclass
    ) <> v_fingerprint.cases_policy_fingerprint
    or (
      select md5(coalesce(string_agg(
        format('%s|%s|%s|%s|%s|%s', p.polname, p.polcmd, p.polpermissive,
          p.polroles::text, pg_get_expr(p.polqual, p.polrelid),
          pg_get_expr(p.polwithcheck, p.polrelid)),
        E'\n' order by p.polname
      ), ''))
      from pg_policy p where p.polrelid = 'casework.case_members'::regclass
    ) <> v_fingerprint.members_policy_fingerprint
    or pg_get_functiondef(
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
    ) <> v_fingerprint.calendar_definition
    or (select proowner from pg_proc where oid =
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
    ) <> v_fingerprint.calendar_owner
    or coalesce((select proacl::text from pg_proc where oid =
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
    ), '') <> v_fingerprint.calendar_acl
  then
    raise exception 'DRS_REMOTE_BASELINE_POSTCONDITION_FAILED';
  end if;

  if to_regclass('public.drs_cases') is null
    or to_regclass('public.drs_specialists') is null
    or to_regclass('integration.drs_identity_provider_bindings') is null
    or to_regclass('integration.drs_identity_link_states') is null
    or to_regclass('integration.drs_auth_specialist_bindings') is null
    or to_regclass('integration.drs_case_identity_bindings') is null
    or to_regclass('integration.drs_server_sessions') is null
    or to_regclass('integration.drs_line_account_bindings') is null
    or to_regclass('integration.drs_line_notification_outbox') is null
    or to_regclass('integration.drs_line_delivery_receipts') is null
    or to_regprocedure('integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)') is null
  then
    raise exception 'DRS_REMOTE_BASELINE_POSTCONDITION_FAILED';
  end if;

  foreach v_signature in array array[
    'public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)',
    'public.drs_identity_link_state_claim_v1(text,text,text,timestamptz)',
    'public.drs_identity_link_state_fail_v1(uuid,timestamptz,text)',
    'public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)',
    'public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)'
  ] loop
    if to_regprocedure(v_signature) is null
      or not has_function_privilege('service_role', v_signature, 'execute')
      or has_function_privilege('anon', v_signature, 'execute')
      or has_function_privilege('authenticated', v_signature, 'execute')
    then
      raise exception 'DRS_REMOTE_BASELINE_POSTCONDITION_FAILED';
    end if;
  end loop;

  if has_schema_privilege('service_role', 'integration', 'usage') then
    raise exception 'DRS_REMOTE_BASELINE_POSTCONDITION_FAILED';
  end if;

  foreach v_private_signature in array array[
    'integration.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)',
    'integration.drs_identity_link_state_claim_v1(text,text,text,timestamptz)',
    'integration.fail_identity_link_state_claim_v1(uuid,timestamptz,text)',
    'integration.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)',
    'integration.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)',
    'integration.drs_identity_provider_revoke_v1(uuid,text,timestamptz,uuid)'
  ] loop
    if has_function_privilege('service_role', v_private_signature, 'execute') then
      raise exception 'DRS_REMOTE_BASELINE_POSTCONDITION_FAILED';
    end if;
  end loop;
end;
$$;

commit;
