# LINE Terminal Permission / Boundary Packet Template

## Purpose

Use this template when the party-entry LINE terminal workstream encounters a permission, boundary, or high-risk question. The packet must be routed to AI PCM 總監／後台總控 Agent. This Agent must not ask the user directly.

## Packet Header

- packet_id: `line_terminal_permission_YYYYMMDD_NNN`
- workstream: `pcm/party-entry-line-terminal`
- reporting_agent: `甲乙方入口與 LINE 終端 Agent`
- route_to: `AI PCM 總監／後台總控 Agent`
- source_of_truth: GitHub main / PR / commit SHA
- current_shared_truth_boundary: GitHub draft PR #77 / latest PR head SHA
- local_workspace: `Z:\08-Jacky\laibe_pcm`
- local_state_only: true

## Trigger Categories

Create this packet for:

- production LINE API or webhook request
- DB / Supabase request
- payment / escrow / listing fee request
- production AI API request
- production runtime request
- formal identity verification request
- formal contract enforcement request
- formal legal wording or legal decision request
- formal tender launch request
- formal quote or price request
- request to let LINE override platform records
- request to let oral chat content override contract records

## Required Fields

| Field | Required | Notes |
|---|---:|---|
| `summary` | yes | One-line description of the boundary issue. |
| `requested_capability` | yes | What is being requested or implied. |
| `why_high_risk` | yes | Explain contract, payment, identity, production, or source-of-truth risk. |
| `current_safe_handling` | yes | State the docs-only / placeholder-only handling used now. |
| `forbidden_scope_check` | yes | Confirm no production or formal action was taken. |
| `recommended_supervisor_action` | yes | Ask supervisor to approve, reject, defer, or escalate. |
| `commander_needed` | yes | Default `no`; only supervisor can escalate. |

## Safe Current Handling

Until AI PCM 總監／後台總控 Agent decides:

- Keep LINE terminal-only.
- Create only pending review records.
- Keep `formal_record_effect: none`.
- Do not connect production services.
- Do not modify contracts.
- Do not trigger payments.
- Do not verify identity.
- Continue other safe docs-only tasks.

## Forbidden Direct Action

This Agent must not:

- ask the user for approval
- ask the user for credentials
- request production secrets
- implement integrations
- create payment instructions
- create legal conclusions
- change source-of-truth records outside approved PR / commit flow

## Example Packet

```yaml
packet_id: line_terminal_permission_20260603_001
workstream: pcm/party-entry-line-terminal
reporting_agent: 甲乙方入口與 LINE 終端 Agent
route_to: AI PCM 總監／後台總控 Agent
summary: Contractor asks whether LINE reply can approve an additional work item.
requested_capability: Treat LINE quick reply as change-order approval.
why_high_risk: This would let LINE alter contract scope and create a change order.
current_safe_handling: Record as pending platform review with formal_record_effect none and risk flag change_order_attempt.
forbidden_scope_check:
  production_line_api_touched: false
  db_touched: false
  payment_touched: false
  formal_contract_change_created: false
recommended_supervisor_action: Reject LINE-only approval; require platform formal workflow.
commander_needed: no
```
