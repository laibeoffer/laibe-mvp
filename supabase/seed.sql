-- Local verification seed only. Do not run against the production project.
begin;

insert into knowledge_staging.import_batches (
  id,
  schema_version,
  idempotency_key,
  correlation_key,
  source_kind,
  source_locator,
  source_sha256,
  source_record_count,
  lifecycle_state,
  publication_authorized,
  candidate_creation_authorized,
  notes
)
values (
  '70000000-0000-4000-8000-000000000001',
  'knowledge_staging.v1',
  'budget-master-20260617-chunk-0001',
  'budget-master-20260617',
  'budget_master',
  'bugget/清單分類_20260605_0107/_AI_BUDGET_MASTER_INDEX_OUTPUT_20260617_132725/laibe_budget_ai_master_index.xlsx',
  'fdca0a5bb14f66f6d55529c322d3e298cba2a4d4fb202531600a6337cd6d64b4',
  19212,
  'pending_review',
  false,
  false,
  'Local gate fixture for the latest 19,212-row master index.'
)
on conflict (id) do nothing;

insert into knowledge_staging.source_records (
  id,
  import_batch_id,
  source_key,
  source_status,
  mapped_lifecycle,
  is_budget_candidate,
  auto_trigger_allowed,
  publication_authorized,
  candidate_creation_authorized,
  direct_pricing_allowed,
  raw_payload
)
values (
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  '01_standard_work_item_master:fixture',
  '已核准',
  'pending_review',
  true,
  true,
  false,
  false,
  false,
  jsonb_build_object(
    'is_budget_candidate', true,
    'auto_trigger_allowed', true,
    'publication_authorized', false,
    'candidate_creation_authorized', false,
    'direct_pricing_allowed', false,
    'fixturePurpose', 'verify source flags cannot bypass human review'
  )
)
on conflict (id) do nothing;

insert into knowledge_staging.budget_staging_items (
  id,
  import_batch_id,
  source_record_id,
  source_item_uid,
  unified_item_name,
  is_budget_candidate,
  auto_trigger_allowed,
  historical_price_low,
  historical_price_high,
  lifecycle_state,
  publication_authorized,
  candidate_creation_authorized,
  direct_pricing_allowed,
  raw_payload
)
values (
  '70000000-0000-4000-8000-000000000003',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000002',
  '__local_budget_gate_fixture__',
  '本機預算閘門測試資料',
  true,
  true,
  100,
  200,
  'pending_review',
  false,
  false,
  false,
  jsonb_build_object(
    'object_status', 'existing',
    'scope_confirmed', false,
    'expected', 'staging_only'
  )
)
on conflict (id) do nothing;

commit;
