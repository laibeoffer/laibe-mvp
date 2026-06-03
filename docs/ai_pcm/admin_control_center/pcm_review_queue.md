# PCM Review Queue

## Purpose

This queue helps the AI PCM Supervisor decide whether each workstream packet is ready for closeout. It is not LAIBE_REVIEWER review and does not replace user-triggered phase review.

| Workstream | Evidence | Review Status | Required Supervisor Action |
|---|---|---|---|
| `pcm/admin-control-center` | `docs/ai_pcm/admin_control_center/` | `ready_for_deputy_closeout` | Confirm supervisor deliverables and automation rules |
| `pcm/contract-evidence-admin` | `docs/ai_pcm/contract_evidence_admin/evidence_packet.md` | `pending_supervisor_review` | Check evidence status policy and verified matrix |
| `pcm/issue-routing-contract-decision` | `docs/ai_pcm/issue_routing_contract_decision/evidence_packet.md` | `pending_supervisor_review` | Check human-review escalation and no legal ruling |
| `pcm/party-entry-line-terminal` | `docs/ai_pcm/party_entry_line_terminal/evidence_packet.md` | `pending_supervisor_review` | Check LINE terminal-only boundary |
| `pcm/pre-tender-readiness` | `docs/ai_pcm/pre_tender_readiness/evidence_packet.md` | `pending_supervisor_review` | Check no formal tender launch |
| `pcm/payment-ledger-placeholder` | `docs/ai_pcm/payment_ledger_placeholder/evidence_packet.md` | `pending_supervisor_review` | Check no real payment / escrow / listing fee |

## Closeout Acceptance Requirements

Before accepting closeout, the supervisor must confirm:

- self-introduction exists
- work started after self-introduction
- `AUTOMATION.md` exists
- core docs exist
- final completion report exists
- permission requests are routed correctly
- forbidden scope is not touched
- automation stop has not been approved prematurely

