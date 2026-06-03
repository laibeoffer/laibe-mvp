# Contract Evidence Admin Closeout Checklist

## Closeout State

workstream: `pcm/contract-evidence-admin`

agent: 合約資料與證據管理 Agent

managed_by: AI PCM 總監／後台總控 Agent

current_status: `SUBMITTED_TO_AI_PCM_SUPERVISOR_FOR_CLOSEOUT_ACCEPTANCE`

automation_status: `ACTIVE`

automation_stop_allowed: false

automation_stop_condition: AI PCM 總監／後台總控 Agent must explicitly declare `automation stop approved`.

## Required Completion Items

| Item | Status | Evidence |
|---|---|---|
| AI PCM blackboard self-introduction | `done` | `docs/ai_pcm/AI_PCM_BLACKBOARD.md` |
| AUTOMATION.md created | `done` | `docs/ai_pcm/contract_evidence_admin/AUTOMATION.md` |
| 15-minute patrol recorded | `done` | `AUTOMATION.md` and Codex app heartbeat |
| 20-minute auto-progress rule recorded | `done` | `AUTOMATION.md` |
| Agent charter created | `done` | `CONTRACT_EVIDENCE_ADMIN_AGENT.md` |
| Evidence status policy created | `done` | `evidence_status_policy.md` |
| Evidence record schema created | `done` | `evidence_record_schema.md` |
| Evidence priority order created | `done` | `evidence_priority_order.md` |
| Contract attachment registry created | `done` | `contract_attachment_registry.md` |
| Verified evidence matrix created | `done` | `verified_evidence_matrix.md` |
| Disputed evidence register created | `done` | `disputed_evidence_register.md` |
| Superseded / voided evidence log created | `done` | `superseded_voided_evidence_log.md` |
| Examples created | `done` | `examples/*.sample.json` |
| Evidence packet submitted | `done` | `evidence_packet.md` |
| Final completion report submitted | `done` | `final_completion_report.md` |
| AI PCM Supervisor closeout acceptance | `not_yet_recorded` | Supervisor action required |
| Automation stop approval | `not_yet_recorded` | Supervisor action required |

## Closeout Acceptance Criteria

- All required docs exist.
- No project-specific evidence is incorrectly marked `verified`.
- `placeholder` is not treated as formal basis.
- LINE messages are not upgraded to standalone contracts.
- No production LINE API, AI API, DB, Supabase, payment, escrow, listing fee, production runtime, formal quote, formal price, legal enforcement, or contract modification was introduced.
- Source-of-truth mismatch is marked `LOCAL_STATE_STALE`.
- Automation remains active until supervisor stop approval.

## Patrol After Submission

If no external response arrives within 20 minutes:

1. Re-check all required docs.
2. Re-check examples remain sample-only.
3. Re-check no forbidden scope drift exists.
4. Re-check no `verified` project evidence was added without source-of-truth confirmation.
5. Append only AI PCM blackboard-safe progress if materially useful.
