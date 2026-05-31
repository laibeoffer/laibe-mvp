# Workflow Trigger Contract

## Trigger Policy

All triggers are placeholder only. They define future intent and sample package boundaries. They do not create runtime endpoints.

Global trigger status:

- `placeholder_only: true`
- `dry_run_only: true`
- `n8n_runtime_enabled: false`
- `webhook_runtime_enabled: false`
- `upload_backend_enabled: false`
- `schedule_runtime_enabled: false`

## Manual Test Trigger

node_id:
`trigger_manual_test`

Purpose:
Allow Codex or `LAIBE_PATROL_INTEGRATION_OFFICER` to test a sample package.

Status:
`placeholder only`

Allowed input:

- local sample package metadata
- dry-run trace request
- Requirement Form window status
- Plan Puzzle Quantity Facts window status

Forbidden:

- production customer request
- formal quote request
- real upload
- real webhook
- API key
- DB write
- payment

## Webhook Trigger Placeholder

node_id:
`trigger_webhook_placeholder`

Purpose:
Future website budget page "generate budget" button placeholder.

Status:
`placeholder only`

Forbidden:

- real webhook endpoint
- webhook runtime
- public URL
- API gateway
- production automation
- customer notification
- formal quote output

## File Upload Trigger Placeholder

node_id:
`trigger_file_upload_placeholder`

Purpose:
Future quote upload trigger for Quote Factory intake.

Status:
`placeholder only`

Forbidden:

- real upload backend
- file storage
- parser runtime
- DB write
- Supabase write
- credential
- production import

## Schedule Review Trigger Placeholder

node_id:
`trigger_schedule_review_placeholder`

Purpose:
Future periodic Knowledge Vault hygiene and proposal review.

Status:
`placeholder only`

Forbidden:

- cron runtime
- n8n schedule runtime
- direct formal rule modification
- direct PricingRule mutation
- direct MethodSpec mutation
- DB write
- production automation

## Trigger Output Contract

All triggers may emit only a placeholder event envelope:

```json
{
  "workflow_run_id": "placeholder-run-id",
  "trigger_source": "manual_test | webhook_placeholder | file_upload_placeholder | schedule_review_placeholder",
  "trigger_status": "placeholder",
  "dry_run_only": true,
  "input_package_ref": "sample-or-linked-package-ref",
  "runtime_enabled": false,
  "requires_validation": true
}
```

The envelope must not contain secrets, credentials, production endpoints, customer notification payloads, or formal quote artifacts.
