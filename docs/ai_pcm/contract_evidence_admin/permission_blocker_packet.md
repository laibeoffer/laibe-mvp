# Contract Evidence Admin Permission / Blocker Packet

## Purpose

This packet template routes all permission requests and blockers for `pcm/contract-evidence-admin` to AI PCM 總監／後台總控 Agent.

The Agent must not ask the user directly.

## Routing Rule

permission_requests_route_to:
AI PCM 總監／後台總控 Agent

agents_must_not_ask_user_directly:
true

safe_work_after_packet_submission:
true

## High-Risk Items Requiring Supervisor Routing

The Agent must not execute these directly:

- formal legal wording
- formal contract enforcement
- production LINE API
- production AI API
- DB / Supabase
- payment / escrow / listing fee
- production runtime
- formal tender launch
- formal quote
- formal price
- contract modification
- treating placeholder, LINE message, or local file as verified contract fact

## Packet Fields

| Field | Required | Description |
|---|---:|---|
| `packet_id` | Yes | Stable permission / blocker packet ID. |
| `created_at` | Yes | ISO timestamp. |
| `created_by` | Yes | Agent name. |
| `workstream` | Yes | `pcm/contract-evidence-admin`. |
| `packet_type` | Yes | `permission_request` or `blocker`. |
| `risk_level` | Yes | `low`, `medium`, `high`. |
| `blocked_action` | Yes | Action that cannot be performed safely. |
| `why_blocked` | Yes | Reason the action is blocked. |
| `self_solve_attempted` | Yes | What the Agent already checked or solved. |
| `safe_work_continued` | Yes | Safe docs-only work continued after packet creation. |
| `requested_supervisor_decision` | Yes | Specific decision requested from AI PCM Supervisor. |
| `user_contacted_directly` | Yes | Must be `false`. |

## Current Packet

packet_id:
`CE-PERMISSION-2026-06-03-001`

created_at:
`2026-06-03T05:33:49Z`

created_by:
合約資料與證據管理 Agent

workstream:
`pcm/contract-evidence-admin`

packet_type:
`blocker`

risk_level:
`medium`

blocked_action:
Treating local execution workspace files as shared truth without PR / commit SHA.

why_blocked:
Shared truth must be GitHub main / PR / commit SHA. Local workspace is execution state only.

self_solve_attempted:
Patrol verified local docs, JSON examples, evidence packet, closeout checklist, and final report.

safe_work_continued:
Created this permission / blocker packet template and linked it from the evidence packet, closeout checklist, final report, and patrol log.

requested_supervisor_decision:
Confirm the current GitHub PR / commit SHA for closeout review and decide whether the workstream can move from `PENDING_SUPERVISOR_REVIEW` to closeout accepted.

user_contacted_directly:
false

## Current Forbidden Scope Result

- production LINE API touched: false
- payment touched: false
- DB / Supabase touched: false
- AI API touched: false
- formal legal decision created: false
- formal quote / price created: false
- contract terms modified: false
- placeholder treated as verified: false
