-- Run against an isolated Supabase branch after all knowledge migrations.
begin;

insert into auth.users (id)
values ('79000000-0000-4000-8000-000000000001');

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values (
  '79000000-0000-4000-8000-000000000002',
  '79000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now() + interval '15 minutes'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000001","session_id":"79000000-0000-4000-8000-000000000002","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
  true
);

do $contract$
begin
  if not knowledge.is_interactive_reviewer()
    or not knowledge.can_access_domain('drawing_review') then
    raise exception 'Active reviewer session was not accepted';
  end if;
end;
$contract$;

reset role;
delete from auth.sessions
where id = '79000000-0000-4000-8000-000000000002';
set local role authenticated;

do $contract$
begin
  if knowledge.is_interactive_reviewer()
    or knowledge.can_access_domain('drawing_review') then
    raise exception 'Missing reviewer session was not rejected';
  end if;
end;
$contract$;

reset role;
rollback;
