begin;

-- A5 additive reconciliation only. remote_applied=false.
-- A14 image attachment parent semantics remain pending A0/A14 confirmation;
-- this migration does not relax the existing PDF-only casework.documents rule.

create or replace function knowledge.resolve_studio_source_revision(
  p_current_source_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source jsonb;
  v_matches boolean;
begin
  v_source := p_payload -> 'source';
  if coalesce(jsonb_typeof(v_source), 'null') <> 'object' then
    raise exception 'Valid reviewer source payload required';
  end if;

  select
    s.source_type = v_source ->> 'source_type'
    and s.title = v_source ->> 'title'
    and s.source_location = v_source ->> 'source_locator'
    and coalesce(s.source_sha256, '') =
      coalesce(v_source ->> 'source_sha256', '')
    and s.provenance = coalesce(v_source -> 'provenance', '{}'::jsonb)
  into v_matches
  from knowledge.sources s
  where s.id = p_current_source_id;

  if v_matches then
    return p_current_source_id;
  end if;

  return knowledge.create_studio_source(p_payload -> 'source');
end;
$$;

create or replace function public.knowledge_studio_update_draft(
  p_entry_id uuid,
  p_version_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_domain knowledge.knowledge_domain;
  v_source_id uuid;
  v_next_source_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if coalesce(jsonb_typeof(p_payload), 'null') <> 'object'
    or p_payload ->> 'schema_version' <> 'knowledge_studio.v1'
    or coalesce(jsonb_typeof(p_payload -> 'content'), 'null') <> 'object'
    or coalesce(jsonb_typeof(p_payload -> 'evidence_summary'), 'null')
      <> 'array'
    or coalesce(jsonb_typeof(p_payload -> 'source'), 'null') <> 'object'
    or coalesce(jsonb_typeof(p_payload -> 'rule'), 'null') <> 'object'
    or length(trim(coalesce(p_payload ->> 'title', ''))) = 0 then
    raise exception 'Invalid Studio draft update';
  end if;

  select e.domain, ev.source_id
  into v_domain, v_source_id
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  where ev.id = p_version_id
    and ev.entry_id = p_entry_id
    and ev.lifecycle_state = 'draft'
  for update of ev;

  if v_source_id is null then
    raise exception 'Editable draft was not found';
  end if;

  v_next_source_id := knowledge.resolve_studio_source_revision(
    v_source_id,
    p_payload
  );

  update knowledge.entry_versions
  set source_id = v_next_source_id,
      title = p_payload ->> 'title',
      summary = coalesce(p_payload ->> 'summary', ''),
      content = p_payload -> 'content',
      evidence_summary = p_payload -> 'evidence_summary',
      change_note = coalesce(p_payload ->> 'change_note', '')
  where id = p_version_id;

  update knowledge.entries
  set title = p_payload ->> 'title',
      summary = coalesce(p_payload ->> 'summary', ''),
      updated_at = now()
  where id = p_entry_id;

  perform knowledge.update_typed_rule(
    p_version_id,
    v_domain,
    p_payload -> 'rule'
  );

  insert into knowledge.publication_events (
    entry_id,
    version_id,
    event_type,
    actor_id,
    actor_role,
    source_id,
    before_state,
    after_state,
    event_note,
    next_owner_role
  )
  values (
    p_entry_id,
    p_version_id,
    'draft_updated',
    auth.uid(),
    knowledge.current_app_role(),
    v_next_source_id,
    'draft',
    'draft',
    coalesce(p_payload ->> 'change_note', ''),
    'pcm'
  );

  return jsonb_build_object(
    'entryId', p_entry_id,
    'versionId', p_version_id,
    'sourceId', v_next_source_id,
    'lifecycleState', 'draft',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_studio_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := knowledge.current_app_role();
  v_display_name text;
  v_actor_label text;
begin
  if not knowledge.has_active_session()
    or not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select nullif(btrim(u.raw_app_meta_data ->> 'display_name'), '')
  into v_display_name
  from auth.users u
  where u.id = v_actor_id;

  if v_display_name is not null
    and v_display_name !~ '@'
    and v_display_name !~
      '^[0-9A-Fa-f]{8}-[0-9A-Fa-f-]{27}$' then
    v_actor_label := v_display_name;
  else
    v_actor_label := case
      when v_actor_role = 'admin' then 'ADM-'
      else 'PCM-'
    end || upper(substr(md5(v_actor_id::text), 1, 8));
  end if;

  return jsonb_build_object(
    'actorId', v_actor_id,
    'actorLabel', v_actor_label,
    'actorRole', v_actor_role,
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_studio_get(
  p_entry_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'entryState', e.lifecycle_state,
    'currentVersionId', e.current_version_id,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'versionId', ev.id,
        'version', ev.version_number,
        'title', ev.title,
        'summary', ev.summary,
        'lifecycleState', ev.lifecycle_state,
        'content', ev.content,
        'evidenceSummary', ev.evidence_summary,
        'changeNote', ev.change_note,
        'createdAt', ev.created_at,
        'submittedAt', ev.submitted_at,
        'publishedAt', ev.published_at,
        'source', jsonb_build_object(
          'sourceId', s.id,
          'sourceType', s.source_type,
          'title', s.title,
          'locator', s.source_location,
          'sha256', s.source_sha256,
          'lifecycleState', s.lifecycle_state,
          'provenance', s.provenance
        ),
        'rule', knowledge.approved_rule_payload(ev.id, e.domain),
        'formalImpact', 'none'
      ) order by ev.version_number desc)
      from knowledge.entry_versions ev
      join knowledge.sources s on s.id = ev.source_id
      where ev.entry_id = e.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', pe.id,
        'eventType', pe.event_type,
        'versionId', pe.version_id,
        'sourceId', pe.source_id,
        'sourceDocument', event_source.source_location,
        'actorId', pe.actor_id,
        'actorLabel', case
          when nullif(
            btrim(au.raw_app_meta_data ->> 'display_name'),
            ''
          ) is not null
            and au.raw_app_meta_data ->> 'display_name' !~ '@'
            and au.raw_app_meta_data ->> 'display_name' !~
              '^[0-9A-Fa-f]{8}-[0-9A-Fa-f-]{27}$'
          then btrim(au.raw_app_meta_data ->> 'display_name')
          else case
            when pe.actor_role = 'admin' then 'ADM-'
            when pe.actor_role = 'pcm' then 'PCM-'
            else 'USR-'
          end || upper(substr(md5(pe.actor_id::text), 1, 8))
        end,
        'actorRole', pe.actor_role,
        'beforeState', pe.before_state,
        'afterState', pe.after_state,
        'note', pe.event_note,
        'nextOwnerRole', pe.next_owner_role,
        'nextAction', pe.next_action,
        'occurredAt', pe.occurred_at,
        'formalImpact', 'none'
      ) order by pe.occurred_at, pe.id)
      from knowledge.publication_events pe
      left join auth.users au on au.id = pe.actor_id
      join knowledge.sources event_source on event_source.id = pe.source_id
      where pe.entry_id = e.id
    ), '[]'::jsonb),
    'formalImpact', 'none'
  )
  into v_result
  from knowledge.entries e
  where e.id = p_entry_id;

  if v_result is null then
    raise exception 'Knowledge entry was not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.gateway_get_knowledge_entry(
  p_entry_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'versionId', ev.id,
    'version', ev.version_number,
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'location', s.source_location,
      'sha256', s.source_sha256
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join knowledge.entry_versions ev on ev.id = e.current_version_id
  join knowledge.sources s on s.id = ev.source_id
  where e.id = p_entry_id
    and knowledge.can_access_domain(e.domain)
    and e.lifecycle_state = 'approved'
    and ev.lifecycle_state = 'approved'
    and s.lifecycle_state = 'approved'
    and knowledge.approved_rule_payload(ev.id, e.domain) is not null;
$$;

create table if not exists casework.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null
    references casework.documents(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  storage_object_path text not null check (
    length(storage_object_path) between 1 and 2048
    and storage_object_path !~ '[[:cntrl:]]'
  ),
  sha256 text not null check (sha256 ~ '^[A-Fa-f0-9]{64}$'),
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  size_bytes bigint not null check (size_bytes >= 0),
  revision_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(revision_metadata) = 'object'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  formal_impact text not null default 'none' check (formal_impact = 'none'),
  unique (document_id, version_number),
  unique (document_id, sha256, storage_object_path)
);

create table if not exists casework.case_member_workstreams (
  case_id uuid not null,
  user_id uuid not null,
  workstream_type text not null
    check (workstream_type in ('design', 'construction')),
  granted_by uuid not null default auth.uid(),
  granted_at timestamptz not null default now(),
  primary key (case_id, user_id, workstream_type),
  foreign key (case_id, user_id)
    references casework.case_members(case_id, user_id)
    on delete cascade
);

do $$
begin
  if not (
    select count(*) = 11
      and bool_and(
        case column_name
          when 'id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'document_id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'version_number'
            then data_type = 'integer' and is_nullable = 'NO'
          when 'storage_object_path'
            then data_type = 'text' and is_nullable = 'NO'
          when 'sha256' then data_type = 'text' and is_nullable = 'NO'
          when 'mime_type' then data_type = 'text' and is_nullable = 'NO'
          when 'size_bytes' then data_type = 'bigint' and is_nullable = 'NO'
          when 'revision_metadata'
            then data_type = 'jsonb' and is_nullable = 'NO'
          when 'created_by' then data_type = 'uuid' and is_nullable = 'NO'
          when 'created_at'
            then data_type = 'timestamp with time zone'
              and is_nullable = 'NO'
          when 'formal_impact'
            then data_type = 'text' and is_nullable = 'NO'
          else false
        end
      )
    from information_schema.columns
    where table_schema = 'casework'
      and table_name = 'document_versions'
  ) then
    raise exception
      'Incompatible casework.document_versions column contract collision';
  end if;
  if not (
    select count(*) = 11
      and bool_and(
        case conname
          when 'document_versions_pkey' then contype = 'p'
          when 'document_versions_document_id_fkey' then contype = 'f'
          when 'document_versions_document_id_version_number_key'
            then contype = 'u'
          when 'document_versions_document_id_sha256_storage_object_path_key'
            then contype = 'u'
          when 'document_versions_version_number_check' then contype = 'c'
          when 'document_versions_storage_object_path_check' then contype = 'c'
          when 'document_versions_sha256_check' then contype = 'c'
          when 'document_versions_mime_type_check' then contype = 'c'
          when 'document_versions_size_bytes_check' then contype = 'c'
          when 'document_versions_revision_metadata_check' then contype = 'c'
          when 'document_versions_formal_impact_check' then contype = 'c'
          else false
        end
      )
    from pg_constraint
    where conrelid = 'casework.document_versions'::regclass
      and contype <> 'n'
  ) then
    raise exception
      'Incompatible casework.document_versions constraint contract collision: %',
      (
        select string_agg(
          conname || ':' || contype::text,
          ',' order by conname
        )
        from pg_constraint
        where conrelid = 'casework.document_versions'::regclass
          and contype <> 'n'
      );
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'casework.document_versions'::regclass
      and conname = 'document_versions_document_id_fkey'
      and confrelid = 'casework.documents'::regclass
      and confdeltype = 'r'
  ) then
    raise exception
      'Incompatible casework.document_versions foreign key collision';
  end if;
  if not (
    select count(*) = 5
      and bool_and(
        case column_name
          when 'case_id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'user_id' then data_type = 'uuid' and is_nullable = 'NO'
          when 'workstream_type'
            then data_type = 'text' and is_nullable = 'NO'
          when 'granted_by' then data_type = 'uuid' and is_nullable = 'NO'
          when 'granted_at'
            then data_type = 'timestamp with time zone'
              and is_nullable = 'NO'
          else false
        end
      )
    from information_schema.columns
    where table_schema = 'casework'
      and table_name = 'case_member_workstreams'
  ) then
    raise exception
      'Incompatible casework.case_member_workstreams column contract collision';
  end if;
  if not (
    select count(*) = 3
      and bool_and(
        case conname
          when 'case_member_workstreams_pkey' then contype = 'p'
          when 'case_member_workstreams_case_id_user_id_fkey'
            then contype = 'f'
          when 'case_member_workstreams_workstream_type_check'
            then contype = 'c'
          else false
        end
      )
    from pg_constraint
    where conrelid = 'casework.case_member_workstreams'::regclass
      and contype <> 'n'
  ) then
    raise exception
      'Incompatible casework.case_member_workstreams constraint collision: %',
      (
        select string_agg(
          conname || ':' || contype::text,
          ',' order by conname
        )
        from pg_constraint
        where conrelid = 'casework.case_member_workstreams'::regclass
          and contype <> 'n'
      );
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'casework.case_member_workstreams'::regclass
      and conname = 'case_member_workstreams_case_id_user_id_fkey'
      and confrelid = 'casework.case_members'::regclass
      and confdeltype = 'c'
  ) then
    raise exception
      'Incompatible casework.case_member_workstreams foreign key collision';
  end if;
end;
$$;

create index if not exists document_versions_document_created_idx
  on casework.document_versions(document_id, created_at desc);
create index if not exists document_versions_sha256_idx
  on casework.document_versions(sha256);
create index if not exists case_member_workstreams_user_idx
  on casework.case_member_workstreams(user_id, workstream_type, case_id);
create index if not exists case_member_workstreams_case_idx
  on casework.case_member_workstreams(case_id, workstream_type, user_id);

create or replace function casework.guard_document_versions_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Document versions are append-only';
end;
$$;

drop trigger if exists guard_document_versions_immutable
on casework.document_versions;
create trigger guard_document_versions_immutable
before update or delete on casework.document_versions
for each row execute function casework.guard_document_versions_immutable();

create or replace function casework.has_current_case_workstream(
  p_case_id uuid,
  p_workstream_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    knowledge.has_active_session()
    and p_workstream_type in ('design', 'construction')
    and exists (
      select 1
      from casework.case_members m
      join casework.case_member_workstreams w
        on w.case_id = m.case_id
       and w.user_id = m.user_id
      where m.case_id = p_case_id
        and m.user_id = auth.uid()
        and w.workstream_type = p_workstream_type
    );
$$;

alter table casework.document_versions enable row level security;
alter table casework.case_member_workstreams enable row level security;

drop policy if exists document_versions_member_read
on casework.document_versions;
create policy document_versions_member_read
on casework.document_versions
for select to authenticated
using (
  exists (
    select 1
    from casework.documents d
    where d.id = document_id
      and casework.is_case_member(d.case_id)
  )
);

drop policy if exists document_versions_workstream_insert
on casework.document_versions;
create policy document_versions_workstream_insert
on casework.document_versions
for insert to authenticated
with check (
  knowledge.current_app_role() in ('pcm', 'admin')
  and exists (
    select 1
    from casework.documents d
    where d.id = document_id
      and (
        casework.has_current_case_workstream(d.case_id, 'design')
        or casework.has_current_case_workstream(d.case_id, 'construction')
      )
  )
);

drop policy if exists case_member_workstreams_member_read
on casework.case_member_workstreams;
create policy case_member_workstreams_member_read
on casework.case_member_workstreams
for select to authenticated
using (casework.is_case_member(case_id));

drop policy if exists case_member_workstreams_reviewer_manage
on casework.case_member_workstreams;
create policy case_member_workstreams_reviewer_manage
on casework.case_member_workstreams
for all to authenticated
using (
  casework.has_case_role(
    case_id,
    array['pcm'::knowledge.case_role, 'admin'::knowledge.case_role]
  )
)
with check (
  casework.has_case_role(
    case_id,
    array['pcm'::knowledge.case_role, 'admin'::knowledge.case_role]
  )
);

revoke all privileges on casework.document_versions
from public, anon, authenticated;
revoke all privileges on casework.case_member_workstreams
from public, anon, authenticated;

alter function knowledge.resolve_studio_source_revision(uuid, jsonb)
owner to postgres;
alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
owner to postgres;
alter function public.knowledge_studio_session_context()
owner to postgres;
alter function public.knowledge_studio_get(uuid)
owner to postgres;
alter function public.gateway_get_knowledge_entry(uuid)
owner to postgres;
alter function casework.guard_document_versions_immutable()
owner to postgres;
alter function casework.has_current_case_workstream(uuid, text)
owner to postgres;

revoke all on function knowledge.resolve_studio_source_revision(uuid, jsonb)
from public, anon, authenticated;
revoke all on function casework.guard_document_versions_immutable()
from public, anon, authenticated;
revoke all on function casework.has_current_case_workstream(uuid, text)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_session_context()
from public, anon, authenticated;
revoke all on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_get(uuid)
from public, anon, authenticated;
revoke all on function public.gateway_get_knowledge_entry(uuid)
from public, anon, authenticated;

grant execute on function casework.has_current_case_workstream(uuid, text)
to authenticated;
grant execute on function public.knowledge_studio_session_context()
to authenticated;
grant execute on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
to authenticated;
grant execute on function public.knowledge_studio_get(uuid)
to authenticated;
grant execute on function public.gateway_get_knowledge_entry(uuid)
to authenticated;

commit;
