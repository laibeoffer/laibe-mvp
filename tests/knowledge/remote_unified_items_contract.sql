-- Run after all knowledge migrations in an isolated PostgreSQL test database.
begin;

insert into auth.users (id)
values
  ('7a000000-0000-4000-8000-000000000001'),
  ('7a000000-0000-4000-8000-000000000002');

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values
  (
    '7a000000-0000-4000-8000-000000000011',
    '7a000000-0000-4000-8000-000000000001',
    now(),
    now(),
    now() + interval '15 minutes'
  ),
  (
    '7a000000-0000-4000-8000-000000000012',
    '7a000000-0000-4000-8000-000000000002',
    now(),
    now(),
    now() - interval '1 minute'
  );

insert into knowledge.sources (
  id,
  source_type,
  title,
  source_location,
  lifecycle_state
)
values (
  '7a100000-0000-4000-8000-000000000001',
  'manual_reference',
  'unified item contract source',
  'contract://unified-item',
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
    '7a200000-0000-4000-8000-000000000001',
    'budget',
    'unified-item-current-budget',
    'current budget entry',
    'approved'
  ),
  (
    '7a200000-0000-4000-8000-000000000002',
    'budget',
    'unified-item-other-budget',
    'other budget entry',
    'approved'
  ),
  (
    '7a200000-0000-4000-8000-000000000003',
    'drawing_review',
    'unified-item-drawing',
    'drawing entry',
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
    '7a300000-0000-4000-8000-000000000001',
    '7a200000-0000-4000-8000-000000000001',
    '7a100000-0000-4000-8000-000000000001',
    1,
    'current budget version',
    'approved',
    '{}'::jsonb
  ),
  (
    '7a300000-0000-4000-8000-000000000002',
    '7a200000-0000-4000-8000-000000000002',
    '7a100000-0000-4000-8000-000000000001',
    1,
    'other budget version',
    'approved',
    '{}'::jsonb
  ),
  (
    '7a300000-0000-4000-8000-000000000003',
    '7a200000-0000-4000-8000-000000000003',
    '7a100000-0000-4000-8000-000000000001',
    1,
    'drawing version',
    'approved',
    '{}'::jsonb
  );

update knowledge.entries
set current_version_id = case id
  when '7a200000-0000-4000-8000-000000000001'::uuid
    then '7a300000-0000-4000-8000-000000000001'::uuid
  when '7a200000-0000-4000-8000-000000000002'::uuid
    then null
  when '7a200000-0000-4000-8000-000000000003'::uuid
    then '7a300000-0000-4000-8000-000000000003'::uuid
end
where id::text like '7a200000-%';

do $contract$
declare
  v_fk_tables text[];
  v_index_tables text[];
  v_rls_enabled boolean;
begin
  select array_agg(
    format('%I.%I', namespace.nspname, relation.relname)
    order by namespace.nspname, relation.relname
  )
  into v_fk_tables
  from pg_constraint constraint_row
  join pg_class relation on relation.oid = constraint_row.conrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  join pg_class target on target.oid = constraint_row.confrelid
  join pg_namespace target_namespace on target_namespace.oid = target.relnamespace
  where constraint_row.contype = 'f'
    and target_namespace.nspname = 'knowledge'
    and target.relname = 'unified_items'
    and pg_get_constraintdef(constraint_row.oid)
      ilike '%FOREIGN KEY (unified_item_code)%';

  if v_fk_tables is distinct from array[
    'casework.candidate_budget_lines',
    'knowledge.budget_rules',
    'knowledge.price_observations'
  ]::text[] then
    raise exception 'unified_item_code FK coverage is incomplete: %',
      v_fk_tables;
  end if;

  select array_agg(
    format('%I.%I', namespace.nspname, relation.relname)
    order by namespace.nspname, relation.relname
  )
  into v_index_tables
  from pg_index index_row
  join pg_class relation on relation.oid = index_row.indrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  join pg_attribute attribute
    on attribute.attrelid = index_row.indrelid
   and attribute.attnum = (index_row.indkey::smallint[])[0]
  where (
    namespace.nspname,
    relation.relname
  ) in (
    ('knowledge', 'budget_rules'),
    ('knowledge', 'price_observations'),
    ('casework', 'candidate_budget_lines')
  )
    and attribute.attname = 'unified_item_code';

  if v_index_tables is distinct from array[
    'casework.candidate_budget_lines',
    'knowledge.budget_rules',
    'knowledge.price_observations'
  ]::text[] then
    raise exception 'unified_item_code leading indexes are incomplete: %',
      v_index_tables;
  end if;

  select relation.relrowsecurity
  into v_rls_enabled
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'knowledge'
    and relation.relname = 'unified_items';

  if v_rls_enabled is distinct from true then
    raise exception 'unified_items RLS is not enabled';
  end if;
end;
$contract$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"7a000000-0000-4000-8000-000000000001","session_id":"7a000000-0000-4000-8000-000000000011","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
  true
);

insert into knowledge.unified_items (
  item_code,
  unified_item_name,
  trade_code,
  default_unit,
  effective_entry_version_id,
  lifecycle_state
)
values (
  'TEST-UNIFIED-APPROVED',
  'test approved unified item',
  'woodwork',
  'item',
  '7a300000-0000-4000-8000-000000000001',
  'approved'
);

do $contract$
declare
  v_denied boolean := false;
begin
  begin
    insert into knowledge.unified_items (
      item_code,
      unified_item_name,
      trade_code,
      default_unit,
      effective_entry_version_id,
      lifecycle_state
    )
    values (
      'TEST-UNIFIED-NONCURRENT',
      'must be denied',
      'woodwork',
      'item',
      '7a300000-0000-4000-8000-000000000002',
      'approved'
    );
  exception
    when raise_exception or check_violation then
      v_denied := true;
  end;

  if not v_denied then
    raise exception
      'Approved unified item accepted a non-current budget version';
  end if;

  v_denied := false;
  begin
    insert into knowledge.unified_items (
      item_code,
      unified_item_name,
      trade_code,
      default_unit,
      effective_entry_version_id,
      lifecycle_state
    )
    values (
      'TEST-UNIFIED-DRAWING',
      'must be denied',
      'woodwork',
      'item',
      '7a300000-0000-4000-8000-000000000003',
      'approved'
    );
  exception
    when raise_exception or check_violation then
      v_denied := true;
  end;

  if not v_denied then
    raise exception
      'Approved unified item accepted a drawing-review version';
  end if;

  v_denied := false;
  begin
    delete from knowledge.unified_items
    where item_code = 'TEST-UNIFIED-APPROVED';
  exception
    when insufficient_privilege then
      v_denied := true;
  end;

  if not v_denied then
    raise exception 'Authenticated reviewer can delete unified items';
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"7a000000-0000-4000-8000-000000000002","session_id":"7a000000-0000-4000-8000-000000000012","app_metadata":{"role":"pcm","client_id":"knowledge_studio"}}',
  true
);

do $contract$
declare
  v_visible integer;
  v_denied boolean := false;
begin
  select count(*) into v_visible from knowledge.unified_items;
  if v_visible <> 0 then
    raise exception 'Expired reviewer session can read unified items: %',
      v_visible;
  end if;

  begin
    insert into knowledge.unified_items (
      item_code,
      unified_item_name,
      trade_code,
      default_unit,
      lifecycle_state
    )
    values (
      'TEST-UNIFIED-EXPIRED',
      'must be denied',
      'woodwork',
      'item',
      'draft'
    );
  exception
    when insufficient_privilege or raise_exception then
      v_denied := true;
  end;

  if not v_denied then
    raise exception 'Expired reviewer session can insert unified items';
  end if;
end;
$contract$;

reset role;
set local role anon;

do $contract$
declare
  v_denied boolean := false;
begin
  begin
    perform count(*) from knowledge.unified_items;
  exception
    when insufficient_privilege then
      v_denied := true;
  end;

  if not v_denied then
    raise exception 'anon can read unified_items';
  end if;
end;
$contract$;

reset role;
rollback;
