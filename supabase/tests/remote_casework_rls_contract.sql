-- Run against an isolated Supabase branch after all knowledge migrations.
begin;

insert into auth.users (id)
values
  ('74000000-0000-4000-8000-000000000001'),
  ('74000000-0000-4000-8000-000000000002'),
  ('74000000-0000-4000-8000-000000000003');

insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values
  (
    '74000000-0000-4000-8000-000000000011',
    '74000000-0000-4000-8000-000000000001',
    now(),
    now(),
    now() + interval '15 minutes'
  ),
  (
    '74000000-0000-4000-8000-000000000013',
    '74000000-0000-4000-8000-000000000003',
    now(),
    now(),
    now() + interval '15 minutes'
  );

insert into casework.cases (id, title, created_by)
values
  (
    '75000000-0000-4000-8000-000000000001',
    'case one',
    '74000000-0000-4000-8000-000000000001'
  ),
  (
    '75000000-0000-4000-8000-000000000002',
    'case two',
    '74000000-0000-4000-8000-000000000002'
  );

insert into casework.case_members (case_id, user_id, role)
values
  (
    '75000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    '75000000-0000-4000-8000-000000000002',
    '74000000-0000-4000-8000-000000000002',
    'owner'
  );

insert into casework.documents (
  id,
  case_id,
  source_document_id,
  title,
  vault_sha256
)
values
  (
    '76000000-0000-4000-8000-000000000001',
    '75000000-0000-4000-8000-000000000001',
    'case-one-document',
    'case one document',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  ),
  (
    '76000000-0000-4000-8000-000000000002',
    '75000000-0000-4000-8000-000000000002',
    'case-two-document',
    'case two document',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  );

insert into casework.evidence_links (
  id,
  case_id,
  evidence_type,
  source_fingerprint,
  source_document_id,
  source_ref,
  evidence_basis,
  created_by
)
values (
  '77000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  'source_document',
  '11111111111111111111111111111111',
  'case-one-document',
  '{}'::jsonb,
  '[]'::jsonb,
  '74000000-0000-4000-8000-000000000001'
);

insert into casework.human_decisions (
  id,
  case_id,
  decision_type,
  decision_status,
  decision_text,
  decided_by,
  decided_by_role
)
values (
  '78000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  'scope_confirmation',
  'confirmed',
  'test-only scope confirmation',
  '74000000-0000-4000-8000-000000000001',
  'owner'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001"}',
  true
);

insert into knowledge.unified_items (
  item_code,
  unified_item_name,
  trade_code,
  default_unit,
  created_by,
  updated_by
)
values (
  'TEST-BUDGET-ALLOW',
  'test-only unified item',
  'test',
  'item',
  '74000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","session_id":"74000000-0000-4000-8000-000000000011","app_metadata":{"role":"owner","client_id":"web","allowed_knowledge_domains":["drawing_review","budget","contract"]}}',
  true
);

do $contract$
declare
  v_cases integer;
  v_documents integer;
begin
  select count(*) into v_cases from casework.cases;
  select count(*) into v_documents from casework.documents;
  if v_cases <> 1 or v_documents <> 1 then
    raise exception 'Case member isolation failed: cases %, documents %',
      v_cases,
      v_documents;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000003","session_id":"74000000-0000-4000-8000-000000000013","app_metadata":{"role":"owner","client_id":"web","allowed_knowledge_domains":["drawing_review","budget","contract"]}}',
  true
);

do $contract$
declare
  v_cases integer;
  v_documents integer;
begin
  select count(*) into v_cases from casework.cases;
  select count(*) into v_documents from casework.documents;
  if v_cases <> 0 or v_documents <> 0 then
    raise exception 'Non-member case isolation failed: cases %, documents %',
      v_cases,
      v_documents;
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","session_id":"74000000-0000-4000-8000-000000000011","app_metadata":{"role":"pcm","client_id":"a12"}}',
  true
);

insert into casework.findings (
  case_id,
  domain,
  source_client_id,
  source_fingerprint,
  finding_type,
  candidate_risk_note
)
values (
  '75000000-0000-4000-8000-000000000001',
  'drawing_review',
  'a12',
  '22222222222222222222222222222222',
  'sheet_completeness',
  '待人工確認'
);

do $contract$
declare
  v_denied boolean;
begin
  v_denied := false;
  begin
    insert into casework.findings (
      case_id,
      domain,
      source_client_id,
      source_fingerprint,
      finding_type,
      candidate_risk_note
    )
    values (
      '75000000-0000-4000-8000-000000000001',
      'budget',
      'a12',
      '33333333333333333333333333333333',
      'scope_difference',
      'must be denied'
    );
  exception
    when insufficient_privilege or raise_exception then
      v_denied := true;
  end;
  if not v_denied then
    raise exception 'A12 budget finding was not denied';
  end if;

  v_denied := false;
  begin
    insert into casework.findings (
      case_id,
      domain,
      source_client_id,
      source_fingerprint,
      finding_type,
      candidate_risk_note
    )
    values (
      '75000000-0000-4000-8000-000000000001',
      'contract',
      'a12',
      '44444444444444444444444444444444',
      'contract_difference',
      'must be denied'
    );
  exception
    when insufficient_privilege or raise_exception then
      v_denied := true;
  end;
  if not v_denied then
    raise exception 'A12 contract finding was not denied';
  end if;

  v_denied := false;
  begin
    insert into casework.candidate_budget_lines (
      case_id,
      source_object_id,
      source_object_origin,
      object_status,
      scope_confirmed,
      human_decision_id,
      evidence_link_id,
      unified_item_code,
      unified_item_name
    )
    values (
      '75000000-0000-4000-8000-000000000001',
      'a12-illegal-budget-line',
      'user_created',
      'new',
      true,
      '78000000-0000-4000-8000-000000000001',
      '77000000-0000-4000-8000-000000000001',
      'TEST-A12-DENY',
      'must be denied'
    );
  exception
    when insufficient_privilege or raise_exception then
      v_denied := true;
  end;
  if not v_denied then
    raise exception 'A12 candidate budget write was not denied';
  end if;
end;
$contract$;

select set_config(
  'request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","session_id":"74000000-0000-4000-8000-000000000011","app_metadata":{"role":"owner","client_id":"budget"}}',
  true
);

insert into casework.candidate_budget_lines (
  case_id,
  source_object_id,
  source_object_origin,
  object_status,
  scope_confirmed,
  human_decision_id,
  evidence_link_id,
  unified_item_code,
  unified_item_name
)
values (
  '75000000-0000-4000-8000-000000000001',
  'budget-allowed-line',
  'user_created',
  'new',
  true,
  '78000000-0000-4000-8000-000000000001',
  '77000000-0000-4000-8000-000000000001',
  'TEST-BUDGET-ALLOW',
  'test-only candidate'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","session_id":"74000000-0000-4000-8000-000000000011","app_metadata":{"role":"owner","client_id":"contract"}}',
  true
);

do $contract$
declare
  v_denied boolean := false;
begin
  begin
    insert into casework.candidate_budget_lines (
      case_id,
      source_object_id,
      source_object_origin,
      object_status,
      scope_confirmed,
      human_decision_id,
      evidence_link_id,
      unified_item_code,
      unified_item_name
    )
    values (
      '75000000-0000-4000-8000-000000000001',
      'contract-illegal-budget-line',
      'user_created',
      'new',
      true,
      '78000000-0000-4000-8000-000000000001',
      '77000000-0000-4000-8000-000000000001',
      'TEST-CONTRACT-DENY',
      'must be denied'
    );
  exception
    when insufficient_privilege or raise_exception then
      v_denied := true;
  end;
  if not v_denied then
    raise exception 'Contract client candidate budget write was not denied';
  end if;
end;
$contract$;

reset role;
rollback;
