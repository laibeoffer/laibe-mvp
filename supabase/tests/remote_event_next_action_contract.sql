-- Run against an isolated Supabase branch after all knowledge migrations.
begin;

insert into auth.users (id)
values ('7a000000-0000-4000-8000-000000000001');

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values (
  '7a000000-0000-4000-8000-000000000002',
  '7a000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now() + interval '15 minutes'
);

insert into knowledge.sources (
  id,
  source_type,
  title,
  source_location,
  lifecycle_state,
  created_by
)
values (
  '7a000000-0000-4000-8000-000000000010',
  'manual_reference',
  'next action contract fixture',
  'transaction://next-action-contract',
  'pending_review',
  '7a000000-0000-4000-8000-000000000001'
);

insert into knowledge.entries (
  id,
  domain,
  slug,
  title,
  summary,
  lifecycle_state,
  created_by
)
values (
  '7a000000-0000-4000-8000-000000000011',
  'drawing_review',
  'next-action-contract-fixture',
  'next action contract fixture',
  '',
  'pending_review',
  '7a000000-0000-4000-8000-000000000001'
);

insert into knowledge.entry_versions (
  id,
  entry_id,
  source_id,
  version_number,
  title,
  summary,
  lifecycle_state,
  content,
  created_by
)
values (
  '7a000000-0000-4000-8000-000000000012',
  '7a000000-0000-4000-8000-000000000011',
  '7a000000-0000-4000-8000-000000000010',
  1,
  'next action contract fixture',
  '',
  'pending_review',
  '{}'::jsonb,
  '7a000000-0000-4000-8000-000000000001'
);

update knowledge.entries
set current_version_id = '7a000000-0000-4000-8000-000000000012'
where id = '7a000000-0000-4000-8000-000000000011';

insert into knowledge.publication_events (
  id,
  entry_id,
  version_id,
  event_type,
  actor_id,
  actor_role,
  source_id,
  before_state,
  after_state,
  next_owner_role
)
values (
  '7a000000-0000-4000-8000-000000000013',
  '7a000000-0000-4000-8000-000000000011',
  '7a000000-0000-4000-8000-000000000012',
  'submitted_for_review',
  '7a000000-0000-4000-8000-000000000001',
  'pcm',
  '7a000000-0000-4000-8000-000000000010',
  'draft',
  'pending_review',
  'PCM 覆核人'
);

insert into casework.cases (
  id,
  title,
  created_by
)
values (
  '7a000000-0000-4000-8000-000000000020',
  'next action contract fixture',
  '7a000000-0000-4000-8000-000000000001'
);

insert into casework.case_events (
  id,
  case_id,
  event_type,
  actor_id,
  actor_role,
  source_document_id,
  action_summary,
  after_state,
  next_owner_role
)
values (
  '7a000000-0000-4000-8000-000000000021',
  '7a000000-0000-4000-8000-000000000020',
  'drawing_finding_recorded',
  '7a000000-0000-4000-8000-000000000001',
  'pcm',
  'fixture.pdf',
  'record drawing review finding',
  '{"status":"candidate"}'::jsonb,
  'pcm'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"7a000000-0000-4000-8000-000000000001","session_id":"7a000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"knowledge_studio","allowed_knowledge_domains":["drawing_review"]}}',
  true
);

do $contract$
declare
  v_summary jsonb;
  v_detail jsonb;
  v_publication_next_action text;
  v_case_next_action text;
begin
  select pe.next_action
  into v_publication_next_action
  from knowledge.publication_events pe
  where pe.id = '7a000000-0000-4000-8000-000000000013';

  if v_publication_next_action <> '由 PCM 覆核內容與依據' then
    raise exception 'Publication event next action was not derived';
  end if;

  select ce.next_action
  into v_case_next_action
  from casework.case_events ce
  where ce.id = '7a000000-0000-4000-8000-000000000021';

  if v_case_next_action <> '由 PCM 複核圖說差異與補件需求' then
    raise exception 'Case event next action was not derived';
  end if;

  select item
  into v_summary
  from public.knowledge_studio_list(
    'pending_review',
    'drawing_review',
    10
  ) item
  where item ->> 'entryId' =
    '7a000000-0000-4000-8000-000000000011';

  if v_summary ->> 'nextOwnerRole' <> 'PCM 覆核人'
    or v_summary ->> 'nextAction' <> '由 PCM 覆核內容與依據' then
    raise exception 'Studio summary conflated next owner and next action';
  end if;

  v_detail := public.knowledge_studio_get(
    '7a000000-0000-4000-8000-000000000011'
  );

  if v_detail #>> '{events,0,nextOwnerRole}' <> 'PCM 覆核人'
    or v_detail #>> '{events,0,nextAction}' <> '由 PCM 覆核內容與依據' then
    raise exception 'Studio detail omitted next-owner or next-action evidence';
  end if;
end;
$contract$;

reset role;
rollback;
