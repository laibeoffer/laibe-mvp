# Escrow Placeholder Contract

## Purpose

`escrow_placeholder` reserves future data fields for escrow-related review without connecting to, simulating, or operating a real escrow service.

## Required Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| escrow_placeholder_id | string | yes | Stable placeholder ID. |
| project_id | string | yes | Project reference. |
| related_plan_id | string | yes | Milestone payment plan reference. |
| escrow_enabled | boolean | yes | Must be false in this phase. |
| provider_ref | string/null | yes | Must be null unless future approved scope adds a provider. |
| placeholder_amount | number | yes | Review-only amount. |
| currency | string | yes | Display currency. |
| release_condition_refs | array | yes | Release condition references. |
| review_status | string | yes | draft, pending_manual_review, approved_placeholder, rejected_placeholder, superseded. |
| manual_approval_required | boolean | yes | Must be true. |
| forbidden_real_escrow | boolean | yes | Must be true. |

## Rules

- `escrow_enabled` must remain `false`.
- `provider_ref` must remain `null`.
- No escrow account, wallet, custody account, external provider, webhook, API key, or transaction ID may be stored here.
- Escrow placeholder records can only support future planning and manual review.

