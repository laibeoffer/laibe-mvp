# Workflow Failure And Review Gates

## Global Gates

All execution is placeholder and dry-run only.

The workflow must stop before any production boundary:

- n8n runtime
- webhook runtime
- upload backend
- API key or credential
- DB or Supabase
- payment
- AI API
- production automation
- Budget Engine production run
- formal PricingRule creation
- formal BudgetEstimateLine creation
- renderer activation
- formal Excel or PDF output
- customer notification

## Failure Status Taxonomy

| Failure status | Meaning | Required action |
| --- | --- | --- |
| `BLOCKED_MISSING_SAMPLE_PACKAGE` | Manual test package is absent. | Request or create a placeholder sample reference only. |
| `BLOCKED_REAL_WEBHOOK_REQUESTED` | A real webhook endpoint is requested. | Stop and mark Need Commander Yes. |
| `BLOCKED_REAL_UPLOAD_REQUESTED` | A real upload backend is requested. | Stop and mark Need Commander Yes. |
| `BLOCKED_REAL_SCHEDULE_REQUESTED` | A real scheduler or heartbeat runtime is requested. | Stop and mark Need Commander Yes. |
| `BLOCKED_FORBIDDEN_FIELD_PRESENT` | Package includes secrets, endpoints, credentials, or production fields. | Reject package and report blackboard blocked update. |
| `BLOCKED_FORMAL_PRICE_PRESENT` | Package includes formal price authority. | Reject and route to review. |
| `BLOCKED_PROVENANCE_MISSING` | Candidate lacks source traceability. | Send to Raw Candidate Review Queue. |
| `BLOCKED_RAW_REVIEW_NOT_COMPLETED` | Raw review gate was skipped. | Stop and require human review. |
| `BLOCKED_METHODSPEC_REVIEW_NOT_COMPLETED` | MethodSpec review gate was skipped. | Stop and require human review. |
| `BLOCKED_CONTEXT_UNVERIFIED` | Requirement or quantity windows are not linked or verified. | Continue only as context; do not run dry-run picking. |
| `BLOCKED_QUANTITY_PLACEHOLDER_ONLY` | Quantity facts are placeholders only. | Do not treat as production quantity. |
| `BLOCKED_DRY_RUN_GUARD_FAILED` | Dry-run guard was missing or false. | Stop and report blocked. |
| `BLOCKED_FORMAL_ARTIFACT_REQUESTED` | Formal output was requested. | Stop and mark Need Commander Yes. |
| `BLOCKED_DIRECT_RULE_MUTATION` | Knowledge feedback tries to directly change rules. | Convert to proposal only. |

## Human Review Gates

### Raw Candidate Review Queue

Required before candidate evidence may move to MethodSpec review.

Review must confirm:

- source provenance exists
- candidate is not formal price authority
- source quality flags are visible
- rejected or needs-more-info candidates do not continue

### MethodSpec Review Gate

Required before dry-run picking.

Review must confirm:

- MethodSpec refs are linked
- scope assumptions are visible
- inclusion/exclusion notes are not converted into prices
- no direct MethodSpec mutation is attempted

### Budget Engine Entry & Picking Gate

Required before dry-run.

Review must confirm:

- Requirement window is `linked` or `verified`
- Quantity facts window is `linked` or `verified`
- placeholder quantity is not treated as production quantity
- dry-run guard is true

### Output Documents Preview Gate

Required before preview handoff.

Review must confirm:

- preview is not formal output
- no `.xlsx` or `.pdf` is generated
- no customer notification is sent
- renderer remains inactive

### Knowledge Vault Feedback Gate

Required before any proposal leaves the workflow.

Review must confirm:

- feedback is proposal-only
- no direct rule mutation
- no DB write
- no AI API call
- no production automation

## Retry Policy

Retries are documentation-only and may only reprocess placeholder sample references.

Allowed retry cases:

- missing optional placeholder metadata
- incomplete sample package manifest
- review flags clarified by human reviewer
- dry-run trace regenerated from the same sample package

Forbidden retry cases:

- retrying a real webhook request
- retrying an upload backend request
- retrying with secrets or credentials
- retrying against DB, Supabase, payment, AI API, or production endpoints
- retrying formal Excel/PDF generation

## Dry-Run Only Gate

Every node must carry:

```json
{
  "dry_run_only": true,
  "runtime_enabled": false,
  "formal_output_allowed": false
}
```

If any node has `dry_run_only: false`, the workflow must stop with:

`BLOCKED_DRY_RUN_GUARD_FAILED`
