# Evidence Record Schema

## Purpose

This schema defines the minimum local documentation contract for AI PCM contract evidence records.

It is docs-only and does not create verified project evidence. A record may be used as formal basis only when `status` is `verified` and all verification fields are complete.

## Allowed Status Values

The `status` field must be exactly one of:

- `placeholder`
- `linked`
- `verified`
- `disputed`
- `superseded`
- `voided`
- `unavailable`

## Required Top-Level Fields

| Field | Type | Required | Rule |
|---|---|---:|---|
| `schema` | string | Yes | Use `laibe.ai_pcm.contract_evidence_record`. |
| `schema_version` | string | Yes | Semantic version for the record format. |
| `evidence_id` | string | Yes | Stable unique evidence ID. |
| `workstream` | string | Yes | Must be `pcm/contract-evidence-admin` for this agent. |
| `evidence_type` | string | Yes | Must match the evidence type registry. |
| `title` | string | Yes | Human-readable title. |
| `status` | enum | Yes | Must use one of the allowed status values. |
| `source_of_truth` | object | Yes | Must identify GitHub main / PR / commit SHA, or mark local state limitation. |
| `verification` | object | Yes | Must state whether formal use is allowed. |
| `restrictions` | object | Yes | Must preserve forbidden scope flags. |
| `audit` | object | Yes | Must record created / updated context. |

## Evidence Type Values

Allowed `evidence_type` values:

- `contract_main_text`
- `contract_attachment`
- `budget_sheet`
- `quotation`
- `work_item_detail`
- `material_spec`
- `method_scope`
- `exclusion`
- `assumption`
- `plan_svg_quantity`
- `site_photo`
- `change_order`
- `acceptance_record`
- `payment_milestone`
- `line_message`
- `platform_message`
- `bilateral_confirmation`

## Verification Object

| Field | Type | Required | Rule |
|---|---|---:|---|
| `verified_by` | string or null | Yes | Null unless status is `verified`. |
| `verified_at` | string or null | Yes | ISO timestamp or null. |
| `verification_summary` | string or null | Yes | Required when status is `verified`. |
| `formal_use_allowed` | boolean | Yes | Must be true only when status is `verified`. |

## Formal Use Gate

`formal_use_allowed` must be `false` unless all conditions are true:

1. `status` is `verified`.
2. `source_of_truth.github_commit_sha` or equivalent GitHub source reference is present.
3. Evidence is not disputed.
4. Evidence is not superseded.
5. Evidence is not voided.
6. Evidence is not unavailable.
7. Evidence does not rely on LINE message alone as contract authority.

## Restriction Object

| Field | Required Value |
|---|---|
| `line_message_standalone_contract_upgrade_allowed` | `false` |
| `placeholder_as_verified_allowed` | `false` |
| `ai_legal_decision_allowed` | `false` |
| `payment_creation_allowed` | `false` |
| `production_api_connection_allowed` | `false` |

## Transition Guard

Allowed transitions:

| From | To | Condition |
|---|---|---|
| `placeholder` | `linked` | Source is found and traceable. |
| `linked` | `verified` | Source, version, party confirmation, and applicability are verified. |
| `linked` | `disputed` | Source or content conflicts. |
| `verified` | `disputed` | New conflict or objection appears. |
| `verified` | `superseded` | Newer verified evidence replaces it. |
| any | `voided` | Evidence is voided, withdrawn, invalid, or forbidden. |
| any | `unavailable` | Source cannot be obtained. |

## Sample Files

Examples are in `docs/ai_pcm/contract_evidence_admin/examples/`.

Samples are placeholders only and must not be treated as verified project evidence.

