\set ON_ERROR_STOP 1

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end;
$$;

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select case
    when coalesce(current_setting('request.jwt.claim.sub', true), '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then current_setting('request.jwt.claim.sub', true)::uuid
    else null
  end
$$;

revoke all on schema auth from public;
grant usage on schema auth to postgres, anon, authenticated, service_role;
revoke all on function auth.uid() from public;
grant execute on function auth.uid() to postgres, anon, authenticated, service_role;
