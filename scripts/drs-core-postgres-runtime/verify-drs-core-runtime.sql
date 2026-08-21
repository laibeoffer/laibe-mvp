\set ON_ERROR_STOP 1
\set case_id 11111111-1111-4111-8111-111111111111
\set owner_id 22222222-2222-4222-8222-222222222222
\set specialist_id 33333333-3333-4333-8333-333333333333
\set outsider_id 44444444-4444-4444-8444-444444444444
\set line_group_id LINE-GROUP-001
\set group_link_id 55555555-5555-4555-8555-555555555555
\set assignment_id 66666666-6666-4666-8666-666666666666
\set line_event_id 77777777-7777-4777-8777-777777777777
\set ai_review_event_id 88888888-8888-4888-8888-888888888888
\set ai_unavailable_event_id 88888888-8888-4888-8888-000000000007
\set human_decision_event_id 99999999-9999-4999-8999-999999999999
\set final_message_event_id aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
\set receipt_event_id bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
\set review_id 12345678-1234-4234-8234-123456789abc
\set unavailable_review_id 12345678-1234-4234-8234-000000000007
\set submitted_sha d997a727e0f817f2c1af6fd6af86f95d594eb8a38cf996deea82f4b670d3c3c3
\set final_sha 4ee0d57d8bf7626493ef67c295a3f3724ad2e9f7d6994ebd924f4b8f8de80d10

begin;

create schema if not exists drs_runtime;

create or replace function drs_runtime.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception '%', message;
  end if;
end;
$$;

create or replace function drs_runtime.expect_message(sql_text text, expected_fragment text)
returns void
language plpgsql
as $$
begin
  begin
    execute sql_text;
    raise exception using
      errcode = 'PDR01',
      message = format('EXPECTED_FAILURE_NOT_RAISED: %s', expected_fragment);
  exception
    when others then
      if sqlstate = 'PDR01' or position(expected_fragment in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$$;

revoke all on schema drs_runtime from public;
grant usage on schema drs_runtime to authenticated, service_role;
revoke all on function drs_runtime.assert_true(boolean, text) from public;
revoke all on function drs_runtime.expect_message(text, text) from public;
grant execute on function drs_runtime.assert_true(boolean, text) to authenticated, service_role;
grant execute on function drs_runtime.expect_message(text, text) to authenticated, service_role;
grant select on public.drs_cases, public.drs_case_audit_events to authenticated;

do $$
begin
  begin
    perform drs_runtime.expect_message($sql$select 1$sql$, 'permission denied');
    raise exception 'EXPECT_MESSAGE_SWALLOWED_EXPECTED_FAILURE_NOT_RAISED';
  exception
    when sqlstate 'PDR01' then
      null;
  end;
end;
$$;

-- schema and grants
select drs_runtime.assert_true(
  exists (
    select 1
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    join pg_roles owner_role on owner_role.oid = proc.proowner
    where namespace.nspname = 'public'
      and proc.proname = 'drs_append_audit_event'
      and owner_role.rolname = 'postgres'
  ),
  'public.drs_append_audit_event must be owned by postgres'
);

select drs_runtime.assert_true(
  exists (
    select 1
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = 'drs_append_ai_review_event'
  ),
  'public.drs_append_ai_review_event must exist'
);

select drs_runtime.assert_true(
  has_schema_privilege('authenticated', 'drs_runtime', 'USAGE'),
  'authenticated must have usage on drs_runtime helper schema'
);

select drs_runtime.assert_true(
  has_function_privilege('authenticated', 'drs_runtime.assert_true(boolean, text)', 'EXECUTE'),
  'authenticated must execute drs_runtime.assert_true'
);

select drs_runtime.assert_true(
  has_function_privilege('authenticated', 'drs_runtime.expect_message(text, text)', 'EXECUTE'),
  'authenticated must execute drs_runtime.expect_message'
);

select drs_runtime.assert_true(
  has_function_privilege('service_role', 'drs_runtime.expect_message(text, text)', 'EXECUTE'),
  'service_role must execute drs_runtime.expect_message'
);

select drs_runtime.assert_true(
  has_table_privilege('authenticated', 'public.drs_cases', 'SELECT'),
  'authenticated must select drs_cases for disposable runtime assertions'
);

select drs_runtime.assert_true(
  has_table_privilege('authenticated', 'public.drs_case_audit_events', 'SELECT'),
  'authenticated must select drs_case_audit_events for disposable runtime assertions'
);

select drs_runtime.assert_true(
  not has_table_privilege('service_role', 'public.drs_case_audit_events', 'INSERT'),
  'service_role must not hold direct audit insert privilege'
);

select drs_runtime.assert_true(
  not has_table_privilege('service_role', 'public.drs_case_audit_events', 'UPDATE'),
  'service_role must not hold direct audit update privilege'
);

select drs_runtime.assert_true(
  not has_table_privilege('service_role', 'public.drs_case_audit_events', 'DELETE'),
  'service_role must not hold direct audit delete privilege'
);
\echo DRS_RUNTIME_PROOF|schema-and-grants|PASS

-- force row level security
select drs_runtime.assert_true(
  exists (
    select 1
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'drs_case_audit_events'
      and class.relrowsecurity
      and class.relforcerowsecurity
  ),
  'drs_case_audit_events must enable and force row level security'
);

-- seed immutable specialist identity and same-case assignment data
insert into public.drs_cases(case_id, case_number, owner_id, case_state, opened_at)
values (:'case_id'::uuid, 'DRS-CASE-20260821-001', :'owner_id'::uuid, 'ACTIVE_REVIEW', '2026-08-20T01:00:00.000Z');

insert into public.drs_specialists(specialist_id, display_name, authority_state)
values (:'specialist_id'::uuid, 'DRS Runtime Specialist', 'ACTIVE');

insert into public.drs_case_specialist_assignments(
  assignment_id, case_id, specialist_id, assigned_by, valid_from, valid_until
)
values (
  :'assignment_id'::uuid,
  :'case_id'::uuid,
  :'specialist_id'::uuid,
  :'owner_id'::uuid,
  '2026-08-20T01:20:00.000Z',
  null
);

insert into public.drs_case_line_group_links(
  group_link_id, case_id, line_group_id, group_kind, linked_by_specialist_id, valid_from, valid_until
)
values (
  :'group_link_id'::uuid,
  :'case_id'::uuid,
  :'line_group_id',
  'DRS_CASE_GROUP',
  :'specialist_id'::uuid,
  '2026-08-20T01:30:00.000Z',
  null
);

-- direct audit DML denied
set role service_role;
do $$
begin
  begin
    insert into public.drs_case_audit_events(
      event_id, case_id, previous_event_id, event_type, occurred_at, actor_type, actor_id, source_surface, group_link_id, transport_message_id, payload, recipient_read
    )
    values (
      'aaaaaaaa-1111-4111-8111-111111111111'::uuid,
      :'case_id'::uuid,
      null,
      'LINE_SENT_EVENT',
      '2026-08-20T02:00:00.000Z'::timestamptz,
      'owner',
      :'owner_id',
      'LINE',
      :'group_link_id'::uuid,
      'LINE-DIRECT-001',
      jsonb_build_object('message_state', 'SENT', 'message_kind', 'TEXT', 'sent_text', 'forbidden direct DML', 'attachment_refs', '[]'::jsonb),
      false
    );
    raise exception 'EXPECTED_DIRECT_AUDIT_DML_DENIAL';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;
reset role;

-- RLS and FORCE RLS with owner and specialist authenticated subjects
set role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', false);
select drs_runtime.assert_true(
  row_security_active('public.drs_cases'::regclass),
  'owner authenticated subject must execute with row security active on drs_cases'
);
select drs_runtime.assert_true(
  (select count(*) from public.drs_cases where case_id = :'case_id'::uuid) = 1,
  'owner authenticated subject must see same-case row'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :'specialist_id', false);
select drs_runtime.assert_true(
  row_security_active('public.drs_cases'::regclass),
  'assigned specialist authenticated subject must execute with row security active on drs_cases'
);
select drs_runtime.assert_true(
  (select count(*) from public.drs_cases where case_id = :'case_id'::uuid) = 1,
  'assigned specialist authenticated subject must see same-case row'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :'outsider_id', false);
select drs_runtime.assert_true(
  row_security_active('public.drs_cases'::regclass),
  'outsider authenticated subject must execute with row security active on drs_cases'
);
select drs_runtime.assert_true(
  (select count(*) from public.drs_cases where case_id = :'case_id'::uuid) = 0,
  'outsider authenticated subject must not see the case under FORCE ROW LEVEL SECURITY'
);
reset role;

-- formally linked DRS group ingestion only
set role service_role;
select public.drs_append_audit_event(
  :'line_event_id'::uuid,
  :'case_id'::uuid,
  null,
  'LINE_SENT_EVENT',
  '2026-08-20T02:00:00.000Z',
  'owner',
  :'owner_id',
  'LINE',
  :'group_link_id'::uuid,
  'LINE-MSG-001',
  jsonb_build_object(
    'message_state', 'SENT',
    'message_kind', 'TEXT',
    'sent_text', '請協助確認這版平面圖。',
    'attachment_refs', '[]'::jsonb
  ),
  false
) as line_event_id \gset

select
  event_id::text as persisted_line_event_id,
  transport_message_id as persisted_line_transport_message_id
from public.drs_case_audit_events
where event_id = :'line_event_id'::uuid \gset

select drs_runtime.assert_true(
  :'persisted_line_event_id'::uuid = :'line_event_id'::uuid,
  'guarded append must persist and return the requested LINE event id'
);

select drs_runtime.assert_true(
  :'persisted_line_transport_message_id' = 'LINE-MSG-001',
  'guarded append must persist the transport identity used for the LINE event'
);

select drs_runtime.expect_message(
  $sql$
    select public.drs_append_audit_event(
      '77777777-7777-4777-8777-000000000001'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      null,
      'LINE_SENT_EVENT',
      '2026-08-20T02:00:01.000Z',
      'owner',
      '22222222-2222-4222-8222-222222222222',
      'LINE',
      null,
      'LINE-MSG-NO-LINK',
      jsonb_build_object(
        'message_state', 'SENT',
        'message_kind', 'TEXT',
        'sent_text', 'missing formal link',
        'attachment_refs', '[]'::jsonb
      ),
      false
    )
  $sql$,
  'LINE_SENT_EVENT_REQUIRES_FORMAL_GROUP_LINK'
);
\echo DRS_RUNTIME_PROOF|formal-group-ingestion-only|PASS

do $$
begin
  begin
    update public.drs_case_audit_events
       set recipient_read = true
     where event_id = :'line_event_id'::uuid;
    raise exception 'EXPECTED_DIRECT_AUDIT_UPDATE_DENIAL';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    delete from public.drs_case_audit_events
     where event_id = :'line_event_id'::uuid;
    raise exception 'EXPECTED_DIRECT_AUDIT_DELETE_DENIAL';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;
reset role;
\echo DRS_RUNTIME_PROOF|audit-dml-denied|PASS

set role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', false);
select drs_runtime.assert_true(
  row_security_active('public.drs_case_audit_events'::regclass),
  'owner authenticated subject must execute with row security active on drs_case_audit_events'
);
select drs_runtime.assert_true(
  (select count(*) from public.drs_case_audit_events where case_id = :'case_id'::uuid) = 1,
  'owner authenticated subject must see same-case audit rows'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :'specialist_id', false);
select drs_runtime.assert_true(
  row_security_active('public.drs_case_audit_events'::regclass),
  'assigned specialist authenticated subject must execute with row security active on drs_case_audit_events'
);
select drs_runtime.assert_true(
  (select count(*) from public.drs_case_audit_events where case_id = :'case_id'::uuid) = 1,
  'assigned specialist authenticated subject must see same-case audit rows'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :'outsider_id', false);
select drs_runtime.assert_true(
  row_security_active('public.drs_case_audit_events'::regclass),
  'outsider authenticated subject must execute with row security active on drs_case_audit_events'
);
select drs_runtime.assert_true(
  (select count(*) from public.drs_case_audit_events where case_id = :'case_id'::uuid) = 0,
  'outsider authenticated subject must not see audit rows under FORCE ROW LEVEL SECURITY'
);
reset role;
\echo DRS_RUNTIME_PROOF|rls-force-rls-two-subjects|PASS

-- append, replay, chronology, and chain
set role service_role;
select public.drs_append_audit_event(
  :'line_event_id'::uuid,
  :'case_id'::uuid,
  null,
  'LINE_SENT_EVENT',
  '2026-08-20T10:00:00.000+08:00',
  'owner',
  :'owner_id',
  'LINE',
  :'group_link_id'::uuid,
  'LINE-MSG-001',
  jsonb_build_object(
    'message_state', 'SENT',
    'message_kind', 'TEXT',
    'sent_text', '請協助確認這版平面圖。',
    'attachment_refs', '[]'::jsonb
  ),
  false
) as replay_line_event_id \gset

select
  event_id::text as replayed_line_event_id,
  count(*)::text as replayed_line_event_row_count
from public.drs_case_audit_events
where event_id = :'line_event_id'::uuid
group by event_id \gset

select drs_runtime.assert_true(
  :'replay_line_event_id'::uuid = :'line_event_id'::uuid,
  'equivalent replay must return the persisted line event id'
);

select drs_runtime.assert_true(
  :'replayed_line_event_id'::uuid = :'line_event_id'::uuid and :'replayed_line_event_row_count'::int = 1,
  'equivalent replay must preserve one persisted LINE audit row'
);

select drs_runtime.expect_message(
  $sql$
    select public.drs_append_audit_event(
      '77777777-7777-4777-8777-000000000002'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '77777777-7777-4777-8777-777777777777'::uuid,
      'FINAL_MESSAGE',
      '2026-08-20T01:59:59.000Z',
      'drs_specialist',
      '33333333-3333-4333-8333-333333333333',
      'DRS_WORKSPACE',
      null,
      null,
      jsonb_build_object(
        'decision_event_id', '99999999-9999-4999-8999-999999999999',
        'final_snapshot_id', '4ee0d57d8bf7626493ef67c295a3f3724ad2e9f7d6994ebd924f4b8f8de80d10',
        'final_text', 'too early',
        'transport_status', 'ACCEPTED_BY_TRANSPORT'
      ),
      false
    )
  $sql$,
  'PREVIOUS_EVENT_CHRONOLOGY_INVALID'
);
\echo DRS_RUNTIME_PROOF|audit-append-replay-chronology-chain|PASS

-- trusted AI review append and advisory-status bounds
select public.drs_append_ai_review_event(
  :'ai_review_event_id'::uuid,
  :'case_id'::uuid,
  :'line_event_id'::uuid,
  '2026-08-20T02:01:00.000Z',
  :'review_id'::uuid,
  'REVIEW_COMPLETED_ATTENTION',
  :'line_event_id'::uuid,
  '[{"code":"MISSING_ATTACHMENT_CONTEXT","severity":"attention"}]'::jsonb,
  '[]'::jsonb,
  'AI 送審快照內容。'
) as ai_review_event_id \gset

select
  event_id::text as persisted_ai_review_event_id,
  actor_type as persisted_ai_review_actor_type,
  source_surface as persisted_ai_review_source_surface
from public.drs_case_audit_events
where event_id = :'ai_review_event_id'::uuid \gset

select drs_runtime.assert_true(
  :'persisted_ai_review_event_id'::uuid = :'ai_review_event_id'::uuid,
  'trusted AI append must persist and return the requested AI review id'
);

select drs_runtime.assert_true(
  :'persisted_ai_review_actor_type' = 'ai_service' and :'persisted_ai_review_source_surface' = 'SYSTEM',
  'trusted AI append must persist fixed AI provenance'
);

select public.drs_append_ai_review_event(
  :'ai_unavailable_event_id'::uuid,
  :'case_id'::uuid,
  :'line_event_id'::uuid,
  '2026-08-20T02:01:30.000Z',
  :'unavailable_review_id'::uuid,
  'REVIEW_SERVICE_UNAVAILABLE',
  :'line_event_id'::uuid,
  '[]'::jsonb,
  '[]'::jsonb,
  'AI 送審快照內容。'
) as unavailable_review_event_id \gset

select drs_runtime.expect_message(
  $sql$
    select public.drs_append_ai_review_event(
      '88888888-8888-4888-8888-000000000099'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '77777777-7777-4777-8777-777777777777'::uuid,
      '2026-08-20T02:01:31.000Z',
      '12345678-1234-4234-8234-000000000099'::uuid,
      'REVIEW_COMPLETED_FATAL',
      '77777777-7777-4777-8777-777777777777'::uuid,
      '[]'::jsonb,
      '[]'::jsonb,
      'AI 送審快照內容。'
    )
  $sql$,
  'AI_REVIEW_STATUS_INVALID'
);
\echo DRS_RUNTIME_PROOF|ai-advisory-statuses-only|PASS

-- human authority, unavailable review handling, and break-glass
select public.drs_append_audit_event(
  :'human_decision_event_id'::uuid,
  :'case_id'::uuid,
  :'ai_review_event_id'::uuid,
  'HUMAN_DECISION',
  '2026-08-20T02:02:00.000Z',
  'drs_specialist',
  :'specialist_id',
  'DRS_WORKSPACE',
  null,
  null,
  jsonb_build_object(
    'decision', 'OVERRIDE_AND_SEND',
    'reason', '依現場紀錄補充說明後送出。',
    'urgency', 'NORMAL',
    'incident_id', null,
    'ai_review_event_id', :'ai_review_event_id',
    'final_snapshot_id', :'final_sha',
    'result_difference', jsonb_build_object(
      'submitted_snapshot_sha256', :'submitted_sha',
      'final_snapshot_sha256', :'final_sha',
      'content_changed', true
    )
  ),
  false
) as human_decision_event_id \gset

select drs_runtime.expect_message(
  $sql$
    select public.drs_append_audit_event(
      '99999999-9999-4999-8999-000000000111'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '88888888-8888-4888-8888-000000000007'::uuid,
      'HUMAN_DECISION',
      '2026-08-20T02:02:10.000Z',
      'drs_specialist',
      '33333333-3333-4333-8333-333333333333',
      'DRS_WORKSPACE',
      null,
      null,
      jsonb_build_object(
        'decision', 'EDIT_AND_SEND',
        'reason', 'ordinary edit on unavailable review',
        'urgency', 'NORMAL',
        'incident_id', null,
        'ai_review_event_id', '88888888-8888-4888-8888-000000000007',
        'final_snapshot_id', '4ee0d57d8bf7626493ef67c295a3f3724ad2e9f7d6994ebd924f4b8f8de80d10',
        'result_difference', jsonb_build_object(
          'submitted_snapshot_sha256', 'd997a727e0f817f2c1af6fd6af86f95d594eb8a38cf996deea82f4b670d3c3c3',
          'final_snapshot_sha256', '4ee0d57d8bf7626493ef67c295a3f3724ad2e9f7d6994ebd924f4b8f8de80d10',
          'content_changed', true
        )
      ),
      false
    )
  $sql$,
  'HUMAN_DECISION_UNAVAILABLE_REVIEW_REQUIRES_MANUAL_EXCEPTION_SEND'
);

select drs_runtime.expect_message(
  $sql$
    select public.drs_append_audit_event(
      '99999999-9999-4999-8999-000000000112'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '77777777-7777-4777-8777-777777777777'::uuid,
      'HUMAN_DECISION',
      '2026-08-20T02:03:00.000Z',
      'drs_specialist',
      '33333333-3333-4333-8333-333333333333',
      'DRS_WORKSPACE',
      null,
      null,
      jsonb_build_object(
        'decision', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS',
        'reason', 'Immediate documented incident.',
        'urgency', 'CRITICAL',
        'incident_id', 'INC-DRS-BG-001',
        'ai_review_event_id', '88888888-8888-4888-8888-888888888888',
        'final_snapshot_id', '4ee0d57d8bf7626493ef67c295a3f3724ad2e9f7d6994ebd924f4b8f8de80d10',
        'break_glass_result', jsonb_build_object(
          'ai_review_performed', false,
          'final_snapshot_sha256', '4ee0d57d8bf7626493ef67c295a3f3724ad2e9f7d6994ebd924f4b8f8de80d10'
        )
      ),
      false
    )
  $sql$,
  'BREAK_GLASS_AI_REVIEW_FORBIDDEN'
);
\echo DRS_RUNTIME_PROOF|human-final-authority-and-break-glass|PASS

-- final message versus transport receipt
select public.drs_append_audit_event(
  :'final_message_event_id'::uuid,
  :'case_id'::uuid,
  :'human_decision_event_id'::uuid,
  'FINAL_MESSAGE',
  '2026-08-20T02:03:00.000Z',
  'drs_specialist',
  :'specialist_id',
  'DRS_WORKSPACE',
  null,
  null,
  jsonb_build_object(
    'decision_event_id', :'human_decision_event_id',
    'final_snapshot_id', :'final_sha',
    'final_text', '已依現場紀錄補充，請業主與廠商確認。',
    'transport_status', 'ACCEPTED_BY_TRANSPORT'
  ),
  false
) as final_message_event_id \gset

select event_id::text as persisted_final_message_event_id
from public.drs_case_audit_events
where event_id = :'final_message_event_id'::uuid \gset

select public.drs_append_audit_event(
  :'receipt_event_id'::uuid,
  :'case_id'::uuid,
  :'final_message_event_id'::uuid,
  'RECEIPT',
  '2026-08-20T02:04:00.000Z',
  'system',
  'DRS-AUDIT',
  'SYSTEM',
  null,
  null,
  jsonb_build_object(
    'final_message_event_id', :'final_message_event_id',
    'receipt_kind', 'TRANSPORT_ACCEPTED',
    'recipient_read', false,
    'transport_message_id', 'LINE-MSG-FINAL-001',
    'accepted_at', '2026-08-20T02:03:30.000Z',
    'ingested_at', '2026-08-20T02:04:00.000Z'
  ),
  false
) as receipt_event_id \gset

select
  event_id::text as persisted_receipt_event_id,
  payload->>'final_message_event_id' as persisted_receipt_final_message_event_id,
  payload->>'recipient_read' as persisted_receipt_recipient_read
from public.drs_case_audit_events
where event_id = :'receipt_event_id'::uuid \gset

select drs_runtime.assert_true(
  :'persisted_final_message_event_id'::uuid = :'final_message_event_id'::uuid,
  'final message must persist at the requested audit event id'
);

select drs_runtime.assert_true(
  :'persisted_receipt_event_id'::uuid = :'receipt_event_id'::uuid
  and :'persisted_receipt_final_message_event_id'::uuid = :'final_message_event_id'::uuid
  and :'persisted_receipt_recipient_read' = 'false',
  'receipt must persist as transport acceptance only for the same-case final message'
);

select drs_runtime.expect_message(
  $sql$
    select public.drs_append_audit_event(
      'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'RECEIPT',
      '2026-08-20T02:04:01.000Z',
      'system',
      'DRS-AUDIT',
      'SYSTEM',
      null,
      null,
      jsonb_build_object(
        'final_message_event_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'receipt_kind', 'TRANSPORT_ACCEPTED',
        'recipient_read', true,
        'transport_message_id', 'LINE-MSG-FINAL-002',
        'accepted_at', '2026-08-20T02:03:31.000Z',
        'ingested_at', '2026-08-20T02:04:01.000Z'
      ),
      false
    )
  $sql$,
  'TRANSPORT_ACCEPTED_IS_NOT_RECIPIENT_READ'
);
\echo DRS_RUNTIME_PROOF|final-message-vs-receipt|PASS

-- invalid timestamp and interval cases
select drs_runtime.expect_message(
  $sql$
    select public.drs_append_audit_event(
      '77777777-7777-4777-8777-000000000003'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      null,
      'LINE_SENT_EVENT',
      '0001-01-01T00:30:00+14:00',
      'owner',
      '22222222-2222-4222-8222-222222222222',
      'LINE',
      '55555555-5555-4555-8555-555555555555'::uuid,
      'LINE-MSG-SPILL',
      jsonb_build_object(
        'message_state', 'SENT',
        'message_kind', 'TEXT',
        'sent_text', 'utc spill must fail',
        'attachment_refs', '[]'::jsonb
      ),
      false
    )
  $sql$,
  'AUDIT_EVENT_OCCURRED_AT_INVALID'
);

select drs_runtime.expect_message(
  $sql$
    insert into public.drs_case_specialist_assignments(
      assignment_id, case_id, specialist_id, assigned_by, valid_from, valid_until
    )
    values (
      '66666666-6666-4666-8666-000000000001'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '2026-08-20T01:10:00.000Z',
      '2026-08-20T02:30:00.000Z'
    )
  $sql$,
  'SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP'
);

select drs_runtime.expect_message(
  $sql$
    update public.drs_specialists
       set display_name = 'tampered runtime specialist'
     where specialist_id = '33333333-3333-4333-8333-333333333333'::uuid
  $sql$,
  'DRS_RECORD_IMMUTABLE'
);

select drs_runtime.expect_message(
  $sql$
    update public.drs_case_specialist_assignments
       set valid_until = '2026-08-20T03:30:00.000Z'
     where assignment_id = '66666666-6666-4666-8666-666666666666'::uuid
  $sql$,
  'DRS_RECORD_IMMUTABLE'
);

select drs_runtime.expect_message(
  $sql$
    update public.drs_case_line_group_links
       set valid_until = '2026-08-20T03:30:00.000Z'
     where group_link_id = '55555555-5555-4555-8555-555555555555'::uuid
  $sql$,
  'DRS_RECORD_IMMUTABLE'
);
\echo DRS_RUNTIME_PROOF|specialist-identity-and-assignment|PASS
\echo DRS_RUNTIME_PROOF|invalid-timestamp-and-interval|PASS

-- cleanup determinism: all runtime seed data is scoped to this transaction and force row level security remains enabled.
rollback;
