-- Run against an isolated Supabase branch after the foundation migration.
begin;

insert into auth.users (id)
values
  ('72000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002'),
  ('72000000-0000-4000-8000-000000000003');

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values
  (
    '72000000-0000-4000-8000-000000000011',
    '72000000-0000-4000-8000-000000000001',
    now(),
    now(),
    now() + interval '15 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000012',
    '72000000-0000-4000-8000-000000000002',
    now(),
    now(),
    now() + interval '15 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000013',
    '72000000-0000-4000-8000-000000000003',
    now(),
    now(),
    now() + interval '15 minutes'
  );

insert into knowledge.sources (
  id,
  source_type,
  title,
  source_location,
  lifecycle_state
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'manual_reference',
    'drawing source',
    'contract://remote-domain-rls-drawing',
    'approved'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    'manual_reference',
    'budget source',
    'contract://remote-domain-rls-budget',
    'approved'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    'manual_reference',
    'contract source',
    'contract://remote-domain-rls-contract',
    'approved'
  );

insert into knowledge.entries (
  id,
  domain,
  slug,
  title,
  lifecycle_state
)
values
  (
    '71000000-0000-4000-8000-000000000001',
    'drawing_review',
    'remote-domain-rls-drawing',
    'drawing',
    'approved'
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    'budget',
    'remote-domain-rls-budget',
    'budget',
    'approved'
  ),
  (
    '71000000-0000-4000-8000-000000000003',
    'contract',
    'remote-domain-rls-contract',
    'contract',
    'approved'
  );

insert into knowledge.entry_versions (
  id,
  entry_id,
  source_id,
  version_number,
  title,
  lifecycle_state,
  content
)
values
  (
    '73000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    1,
    'drawing',
    'approved',
    '{}'::jsonb
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    1,
    'budget',
    'approved',
    '{}'::jsonb
  ),
  (
    '73000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000003',
    '70000000-0000-4000-8000-000000000003',
    1,
    'contract',
    'approved',
    '{}'::jsonb
  );

update knowledge.entries
set current_version_id = case domain
  when 'drawing_review' then '73000000-0000-4000-8000-000000000001'::uuid
  when 'budget' then '73000000-0000-4000-8000-000000000002'::uuid
  when 'contract' then '73000000-0000-4000-8000-000000000003'::uuid
end
where slug like 'remote-domain-rls-%';

insert into knowledge.drawing_rules (
  entry_version_id,
  rule_code,
  rule_kind,
  condition_definition,
  finding_template,
  supplement_template
)
values (
  '73000000-0000-4000-8000-000000000001',
  'remote-domain-drawing',
  'sheet_completeness',
  '{}'::jsonb,
  '待確認',
  '請補件'
);

insert into knowledge.budget_rules (
  entry_version_id,
  rule_code,
  rule_kind,
  condition_definition,
  output_definition
)
values (
  '73000000-0000-4000-8000-000000000002',
  'remote-domain-budget',
  'trigger',
  '{}'::jsonb,
  '{}'::jsonb
);

insert into knowledge.contract_evidence_rules (
  entry_version_id,
  rule_code,
  allowed_output_kind,
  clause_topic
)
values (
  '73000000-0000-4000-8000-000000000003',
  'remote-domain-contract',
  'risk_note',
  '文件待確認'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000001","session_id":"72000000-0000-4000-8000-000000000011","app_metadata":{"role":"pcm","client_id":"a12"}}',
  true
);

do $contract$
declare
  v_visible_domains text[];
  v_visible_sources integer;
  v_visible_versions integer;
  v_visible_drawing_rules integer;
  v_visible_budget_rules integer;
  v_visible_contract_rules integer;
begin
  select array_agg(domain::text order by domain::text)
  into v_visible_domains
  from knowledge.entries
  where slug like 'remote-domain-rls-%';

  if v_visible_domains is distinct from array['drawing_review']::text[] then
    raise exception 'A12 direct-table domain isolation failed: %',
      v_visible_domains;
  end if;

  select count(*) into v_visible_sources
  from knowledge.sources
  where source_location like 'contract://remote-domain-rls-%';
  select count(*) into v_visible_versions
  from knowledge.entry_versions
  where id::text like '73000000-%';
  select count(*) into v_visible_drawing_rules
  from knowledge.drawing_rules
  where rule_code = 'remote-domain-drawing';
  select count(*) into v_visible_budget_rules
  from knowledge.budget_rules
  where rule_code = 'remote-domain-budget';
  select count(*) into v_visible_contract_rules
  from knowledge.contract_evidence_rules
  where rule_code = 'remote-domain-contract';

  if v_visible_sources <> 1
    or v_visible_versions <> 1
    or v_visible_drawing_rules <> 1
    or v_visible_budget_rules <> 0
    or v_visible_contract_rules <> 0 then
    raise exception
      'A12 related-table isolation failed: sources %, versions %, drawing %, budget %, contract %',
      v_visible_sources,
      v_visible_versions,
      v_visible_drawing_rules,
      v_visible_budget_rules,
      v_visible_contract_rules;
  end if;

  begin
    insert into knowledge.entries (
      domain,
      slug,
      title,
      lifecycle_state
    )
    values (
      'drawing_review',
      'remote-domain-a12-illegal-write',
      'must be denied',
      'draft'
    );
    raise exception 'A12 direct-table knowledge write was not denied';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000002","session_id":"72000000-0000-4000-8000-000000000012","app_metadata":{"role":"owner","client_id":"web","allowed_knowledge_domains":["budget"]}}',
  true
);

do $contract$
declare
  v_visible_domains text[];
  v_visible_sources integer;
  v_visible_versions integer;
  v_visible_drawing_rules integer;
  v_visible_budget_rules integer;
  v_visible_contract_rules integer;
begin
  select array_agg(domain::text order by domain::text)
  into v_visible_domains
  from knowledge.entries
  where slug like 'remote-domain-rls-%';

  if v_visible_domains is distinct from array['budget']::text[] then
    raise exception 'Owner direct-table domain isolation failed: %',
      v_visible_domains;
  end if;

  select count(*) into v_visible_sources
  from knowledge.sources
  where source_location like 'contract://remote-domain-rls-%';
  select count(*) into v_visible_versions
  from knowledge.entry_versions
  where id::text like '73000000-%';
  select count(*) into v_visible_drawing_rules
  from knowledge.drawing_rules
  where rule_code = 'remote-domain-drawing';
  select count(*) into v_visible_budget_rules
  from knowledge.budget_rules
  where rule_code = 'remote-domain-budget';
  select count(*) into v_visible_contract_rules
  from knowledge.contract_evidence_rules
  where rule_code = 'remote-domain-contract';

  if v_visible_sources <> 1
    or v_visible_versions <> 1
    or v_visible_drawing_rules <> 0
    or v_visible_budget_rules <> 1
    or v_visible_contract_rules <> 0 then
    raise exception
      'Owner related-table isolation failed: sources %, versions %, drawing %, budget %, contract %',
      v_visible_sources,
      v_visible_versions,
      v_visible_drawing_rules,
      v_visible_budget_rules,
      v_visible_contract_rules;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000003","session_id":"72000000-0000-4000-8000-000000000013","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
  true
);

do $contract$
declare
  v_visible_entries integer;
begin
  select count(*)
  into v_visible_entries
  from knowledge.entries
  where slug like 'remote-domain-rls-%';

  if v_visible_entries <> 3 then
    raise exception 'Interactive reviewer access failed: %',
      v_visible_entries;
  end if;
end;
$contract$;

reset role;
rollback;
