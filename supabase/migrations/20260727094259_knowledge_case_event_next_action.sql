begin;

alter table knowledge.publication_events
  add column if not exists next_action text
  not null default '由下一位處理者確認後續事項';

alter table casework.case_events
  add column if not exists next_action text
  not null default '由下一位處理者確認案件紀錄';

alter table knowledge.publication_events
  add constraint publication_events_next_action_nonempty
  check (
    length(btrim(next_action)) > 0
    and next_action !~ '[[:cntrl:]]'
  );

alter table casework.case_events
  add constraint case_events_next_action_nonempty
  check (
    length(btrim(next_action)) > 0
    and next_action !~ '[[:cntrl:]]'
  );

create or replace function knowledge.fill_publication_event_next_action()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.next_action), '') is null
    or new.next_action = '由下一位處理者確認後續事項' then
    new.next_action := case new.event_type
      when 'draft_created' then '補充內容與依據後送出覆核'
      when 'draft_updated' then '確認修改內容後送出覆核'
      when 'revision_created' then '完成新版內容後送出覆核'
      when 'submitted_for_review' then '由 PCM 覆核內容與依據'
      when 'returned_to_draft' then '依退回意見修正後重新送審'
      when 'published' then '依核准版本提供受控檢索'
      when 'retired' then '停止召回並保留版本紀錄'
      else '由下一位處理者確認後續事項'
    end;
  end if;
  return new;
end;
$$;

create or replace function casework.fill_case_event_next_action()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.next_action), '') is null
    or new.next_action = '由下一位處理者確認案件紀錄' then
    new.next_action := case
      when new.event_type in (
        'drawing_finding_recorded',
        'drawing_finding_reused'
      ) then '由 PCM 複核圖說差異與補件需求'
      else '由下一位處理者確認案件紀錄'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists publication_events_next_action
on knowledge.publication_events;

create trigger publication_events_next_action
before insert on knowledge.publication_events
for each row execute function knowledge.fill_publication_event_next_action();

drop trigger if exists case_events_next_action
on casework.case_events;

create trigger case_events_next_action
before insert on casework.case_events
for each row execute function casework.fill_case_event_next_action();

create or replace function public.knowledge_studio_list(
  p_lifecycle text default null,
  p_domain text default null,
  p_limit integer default 100
)
returns setof jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  if p_lifecycle is not null
    and p_lifecycle not in (
      'inbox',
      'draft',
      'pending_review',
      'approved',
      'retired'
    ) then
    raise exception 'Unsupported lifecycle filter';
  end if;

  if p_domain is not null
    and p_domain not in ('drawing_review', 'budget', 'contract') then
    raise exception 'Unsupported domain filter';
  end if;

  return query
  select jsonb_build_object(
    'entryId', e.id,
    'domain', e.domain,
    'slug', e.slug,
    'title', ev.title,
    'summary', ev.summary,
    'entryState', e.lifecycle_state,
    'versionId', ev.id,
    'version', ev.version_number,
    'lifecycleState', ev.lifecycle_state,
    'displayType', coalesce(
      nullif(ev.content ->> 'displayType', ''),
      case
        when exists (
          select 1
          from knowledge.acceptance_rules ar
          where ar.entry_version_id = ev.id
        ) then '驗收依據'
        when e.domain = 'drawing_review' then '圖說審查規則'
        when e.domain = 'budget' then '預算規則'
        when e.domain = 'contract' then '契約證據與比對'
        else '知識條目'
      end
    ),
    'rule', knowledge.approved_rule_payload(ev.id, e.domain),
    'source', jsonb_build_object(
      'sourceId', s.id,
      'title', s.title,
      'sourceType', s.source_type,
      'locator', s.source_location,
      'sha256', s.source_sha256,
      'lifecycleState', s.lifecycle_state
    ),
    'eventCount', (
      select count(*)
      from knowledge.publication_events pe
      where pe.entry_id = e.id
    ),
    'nextOwnerRole', coalesce(
      latest_event.next_owner_role,
      case ev.lifecycle_state
        when 'draft' then '規則整理人'
        when 'pending_review' then 'PCM 覆核人'
        else 'PCM 維護人'
      end
    ),
    'nextAction', coalesce(
      latest_event.next_action,
      case ev.lifecycle_state
        when 'draft' then '送出覆核'
        when 'pending_review' then '等待覆核決定'
        when 'approved' then '建立新版或停用'
        when 'retired' then '已停用'
        else '整理草稿'
      end
    ),
    'formalImpact', 'none'
  )
  from knowledge.entries e
  join lateral (
    select candidate.*
    from knowledge.entry_versions candidate
    where candidate.entry_id = e.id
    order by
      case candidate.lifecycle_state
        when 'pending_review' then 0
        when 'draft' then 1
        when 'approved' then 2
        else 3
      end,
      candidate.version_number desc
    limit 1
  ) ev on true
  join knowledge.sources s on s.id = ev.source_id
  left join lateral (
    select pe.next_owner_role, pe.next_action
    from knowledge.publication_events pe
    where pe.entry_id = e.id
    order by pe.occurred_at desc, pe.id desc
    limit 1
  ) latest_event on true
  where (p_lifecycle is null or ev.lifecycle_state::text = p_lifecycle)
    and (p_domain is null or e.domain::text = p_domain)
  order by ev.created_at desc, e.id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.knowledge_studio_get(
  p_entry_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
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
        'actorId', pe.actor_id,
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

commit;
