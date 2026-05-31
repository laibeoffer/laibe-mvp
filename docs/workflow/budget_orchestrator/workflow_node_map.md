# Workflow Node Map

## Map Status

Status: `PLACEHOLDER_ONLY`

Runtime: `N8N_NOT_ENABLED`

Every node below is descriptive only. No runtime endpoint, credential, production automation, database, payment, AI API, renderer, or formal quote output is created.

## Node Sequence

| Order | node_id | node_name | Primary next node | Human review | Dry-run only |
| --- | --- | --- | --- | --- | --- |
| 1A | `trigger_manual_test` | Manual Test Trigger | `validate_input_package` | No | Yes |
| 1B | `trigger_webhook_placeholder` | Webhook Trigger Placeholder | `validate_input_package` | No | Yes |
| 1C | `trigger_file_upload_placeholder` | File Upload Trigger Placeholder | `validate_input_package` | No | Yes |
| 1D | `trigger_schedule_review_placeholder` | Schedule Review Trigger Placeholder | `validate_input_package` | Yes | Yes |
| 2 | `validate_input_package` | Validate Input Package | `quote_factory_export_package` | No | Yes |
| 3 | `quote_factory_export_package` | Quote Factory Export Package | `raw_candidate_intake` | Yes | Yes |
| 4 | `raw_candidate_intake` | Raw Candidate Intake | `raw_candidate_review_queue` | Yes | Yes |
| 5 | `raw_candidate_review_queue` | Raw Candidate Review Queue | `method_spec_review_gate` | Yes | Yes |
| 6 | `method_spec_review_gate` | MethodSpec Review Gate | `budget_engine_entry_picking` | Yes | Yes |
| 7 | `budget_engine_entry_picking` | Budget Engine Entry & Picking | `budget_engine_dry_run` | Yes | Yes |
| 8 | `budget_engine_dry_run` | Budget Engine Dry-run | `budget_output_snapshot` | Yes | Yes |
| 9 | `budget_output_snapshot` | BudgetOutputSnapshot | `output_documents_preview` | Yes | Yes |
| 10 | `output_documents_preview` | Output Documents Preview | `knowledge_vault_feedback` | Yes | Yes |
| 11 | `knowledge_vault_feedback` | Knowledge Vault Feedback | `blackboard_status_update` | Yes | Yes |
| 12 | `blackboard_status_update` | Blackboard Status Update | terminal | Yes | Yes |

## Diagram

```text
trigger_manual_test
trigger_webhook_placeholder
trigger_file_upload_placeholder
trigger_schedule_review_placeholder
        |
        v
validate_input_package
        |
        v
quote_factory_export_package
        |
        v
raw_candidate_intake
        |
        v
raw_candidate_review_queue
        |
        v
method_spec_review_gate
        |
        v
budget_engine_entry_picking
        |
        v
budget_engine_dry_run
        |
        v
budget_output_snapshot
        |
        v
output_documents_preview
        |
        v
knowledge_vault_feedback
        |
        v
blackboard_status_update
```

## Allowed Branches

The placeholder branch paths are:

- success path: trigger placeholder -> dry-run preview -> feedback -> blackboard
- review path: any review gate -> human review -> continue only if approved for dry-run
- failure path: any node -> failure status -> blackboard blocked update

## Forbidden Branches

No node may branch to:

- production webhook runtime
- upload backend
- API gateway
- API key or credential node
- DB or Supabase node
- payment node
- AI API node
- formal Budget Engine production run
- formal PricingRule creation
- formal BudgetEstimateLine creation
- formal renderer
- formal Excel or PDF writer
- customer notification
