# Budget Schema Registry Handoff Contract

Status: `SAFE_WORK_SUPPLEMENT_SUBMITTED`

Workstream: `budget/schema-registry`

Source of truth: GitHub `main` / PR / commit SHA only

Local workspace status: `LOCAL_STATE_NOT_AUTHORITATIVE`

## Sender

Budget Schema Registry Agent / `budget/schema-registry`

## Receivers

- Deputy Commander
- LAIBE_PATROL_INTEGRATION_OFFICER, only if registry docs are proposed for integration use
- downstream docs-only budget support agents
- future reviewer, only when the user explicitly triggers review

## Inputs

| Input | Source | Status | Notes |
|---|---|---|---|
| PR #61 | GitHub PR | `linked` | Original docs-only initialization. |
| PR #61 merge commit | `845938ac8bb1fcb871989089df27be88f05233dc` | `linked` | Original merge evidence. |
| Current main baseline | `e54aadfde9b3f0d90c50c24123db9bc910b231a5` | `linked` | Current source-of-truth baseline before this supplement branch. |
| AGENT_IDLE_VIOLATION notice | current thread instruction | `linked` | Requires safe-work supplement. |

## Outputs

| Output | Path | Status | Formal authority? |
|---|---|---|---|
| Evidence packet | `docs/budget_schema_registry/evidence_packet.md` | `linked` | No |
| Forbidden scope check | `docs/budget_schema_registry/forbidden_scope_check.md` | `linked` | No |
| Handoff contract | `docs/budget_schema_registry/handoff_contract.md` | `linked` | No |
| Closeout report | `docs/budget_schema_registry/closeout_report.md` | `linked` | No |
| Sync-ready manifest | `docs/budget_schema_registry/sync_ready_manifest.md` | `linked` | No |

## Receiver Rules

Receivers may use these docs for:

- closeout review
- docs-only synchronization
- forbidden-scope audit
- schema naming and contract trace review
- planning future integration review scope

Receivers must not use these docs for:

- runtime execution
- Budget Engine input
- renderer input
- `PricingRule` creation
- `BudgetEstimateLine` creation
- DB / Supabase migration
- payment or escrow workflow
- AI API call setup
- n8n workflow setup
- formal price
- formal quote

## Status Preservation Rule

If a downstream agent references this handoff, it must preserve the source status values and must not promote `linked` evidence to `verified` unless the owning reviewer or Deputy Commander explicitly records that decision.

## Branch Rule

This supplement uses branch:

`codex/budget-schema-registry-safe-work-20260602`

It must not write to the merged branch `budget/schema-registry`.

If any local workspace path, including `C:\laibe_project`, `Z:\laibe_project`, or a UNC path, differs from GitHub, report:

`LOCAL_STATE_STALE`

and use GitHub `main` / PR / commit SHA as the source of truth.

## Closeout Stop Rule

Do not stop or delete `budget-schema-registry-patrol` unless both signals are explicitly recorded:

- `AGENT_CLOSEOUT_ACCEPTED`
- `AUTOMATION_STOP_APPROVED`

Without both signals, status remains:

`BLOCKED_NEED_COMMANDER_DECISION`
