# Evidence Validation Checklist

## Purpose

This checklist is the patrol gate before any contract evidence record may move toward `verified`.

It is docs-only. It does not verify any project evidence by itself.

## Universal Gate

All evidence records must pass these checks before formal use is allowed:

| Check | Required Result |
|---|---|
| Evidence ID exists | true |
| Evidence type is in registry | true |
| Status is one of the seven allowed values | true |
| Source is traceable | true for `linked` and `verified` |
| GitHub main / PR / commit SHA is recorded | true for `verified` |
| Local-only state is marked as LOCAL_STATE only | true |
| No placeholder is used as verified | true |
| No LINE message is standalone contract authority | true |
| No voided evidence is used | true |
| No unavailable evidence enters adjudication | true |
| Disputed evidence is routed to human review | true |

## Status-Specific Checklist

### placeholder

- `formal_use_allowed` must be `false`.
- Missing source fields are allowed only as missing-data explanation.
- Must not be cited as contract fact.

### linked

- `formal_use_allowed` must be `false`.
- `source_uri` or equivalent trace reference must exist.
- Verification fields must remain incomplete until reviewed.
- May be used only to trace evidence chain.

### verified

- `formal_use_allowed` may be `true` only after all verified gates pass.
- GitHub source reference must be present.
- Version or timestamp must be identifiable.
- Party confirmation must be recorded when applicable.
- Evidence must not be disputed, superseded, voided, or unavailable.
- LINE message alone must not be the authority for contract change.

### disputed

- `formal_use_allowed` must be `false`.
- `dispute_reason` must be present.
- Human review route must be recorded.
- Must not be automatically resolved by this Agent.

### superseded

- `formal_use_allowed` must be `false`.
- `superseded_by` or replacement explanation must be present.
- Record is historical trace only.

### voided

- `formal_use_allowed` must be `false`.
- `void_reason` must be present.
- Record must not be used for formal or supporting adjudication.

### unavailable

- `formal_use_allowed` must be `false`.
- `unavailable_reason` must be present.
- Missing data must not be inferred.

## Forbidden Integration Checklist

The validation process must not:

- Connect DB or Supabase.
- Connect AI API.
- Connect LINE API.
- Connect payment, escrow, listing fee, or production webhook.
- Modify contract terms.
- Create legal decisions.
- Create formal quote or formal price.
- Treat local files as GitHub source of truth.

## Patrol Result Format

When logging a patrol result, use:

| Field | Value |
|---|---|
| `patrol_time` | ISO timestamp |
| `workstream` | `pcm/contract-evidence-admin` |
| `checked_files` | number |
| `json_examples_parse` | true / false |
| `verified_project_evidence_found` | true / false |
| `forbidden_scope_detected` | true / false |
| `safe_work_completed` | short note |
| `next_safe_action` | short note |

