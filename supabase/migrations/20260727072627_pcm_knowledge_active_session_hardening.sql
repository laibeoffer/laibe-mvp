begin;

create or replace function knowledge.has_active_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    join auth.users u on u.id = s.user_id
    where s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and s.user_id::text = coalesce(auth.jwt() ->> 'sub', '')
      and (s.not_after is null or s.not_after > now())
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

alter function knowledge.has_active_session() owner to postgres;
revoke all on function knowledge.has_active_session()
from public, anon, authenticated;
grant execute on function knowledge.has_active_session()
to authenticated;

create or replace function knowledge.is_interactive_reviewer()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and knowledge.current_app_role() in ('pcm', 'admin')
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
  if not knowledge.has_active_session() then
    return false;
  end if;

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

create or replace function casework.is_case_member(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and (
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
      )
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
    knowledge.has_active_session()
    and (
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
      )
    );
$$;

alter policy case_authenticated_create
on casework.cases
with check (
  knowledge.has_active_session()
  and (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and knowledge.current_app_role() in ('owner', 'pro', 'pcm', 'admin')
);

alter policy knowledge_source_reviewer_read
on storage.objects
using (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

alter policy knowledge_source_reviewer_insert
on storage.objects
with check (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

commit;
