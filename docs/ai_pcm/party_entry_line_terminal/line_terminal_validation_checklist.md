# LINE Terminal Validation Checklist

## Purpose

This checklist is used by `pcm-party-entry-line-terminal-patrol` every 15 minutes to verify that LINE remains a terminal and never becomes a contract source, payment trigger, identity verifier, or platform-record override.

## File Presence Checks

Required files:

- `AUTOMATION.md`
- `PARTY_ENTRY_LINE_TERMINAL_AGENT.md`
- `owner_entry_contract.md`
- `contractor_entry_contract.md`
- `line_terminal_sync_contract.md`
- `line_message_record_schema.md`
- `party_question_submission_flow.md`
- `role_permission_draft.md`
- `line_terminal_forbidden_scope.md`
- `line_terminal_validation_checklist.md`
- `line_terminal_permission_packet_template.md`
- `line_terminal_risk_register.md`
- `patrol_log.md`
- `supervisor_handoff.md`
- `closeout_checklist.md`
- `evidence_packet.md`
- `initialization_progress_report.md`
- `final_completion_report.md`
- `examples/line_message_record.sample.json`
- `examples/owner_question_submission.sample.json`
- `examples/contractor_question_submission.sample.json`

## JSON Checks

Each JSON example must:

- parse as valid JSON
- include `formal_record_effect: "none"` when the field is present
- keep `identity_verification_status` as non-formal terminal status
- keep attachments as metadata / unverified records
- avoid any payment, contract-change, or verified-evidence effect

## Terminal Boundary Checks

Confirm every patrol:

- LINE is notice / reminder / supplement / quick-reply / question-submission terminal only.
- Platform backend is the official record.
- LINE cannot alter contracts.
- LINE cannot create change orders.
- LINE cannot trigger payment.
- LINE cannot override platform records.
- LINE cannot verify identity.
- LINE cannot make oral messages superior to contract records.

## Forbidden Runtime Checks

Search for and reject any evidence of:

- production LINE API
- real LINE webhook
- API key or secret
- DB / Supabase connection
- payment / escrow / listing fee service
- production AI API
- production runtime
- formal identity verification
- formal legal decision
- formal quote or price

## Source Of Truth Checks

- GitHub main / PR / commit SHA remains authoritative.
- GitHub draft PR #77 / latest PR head SHA is the current shared-truth review boundary for this docs-only setup.
- `Z:\08-Jacky\laibe_pcm` remains local execution state only.
- Follow-up local docs changes must be routed through AI PCM 總監／後台總控 Agent for PR / commit handling.
- Permission or boundary issues must use `line_terminal_permission_packet_template.md` and route to AI PCM 總監／後台總控 Agent.
- Terminal risks must map to `line_terminal_risk_register.md` and preserve `formal_record_effect: "none"`.

## Closeout Checks

Continue patrol until both are true:

- AI PCM 總監／後台總控 Agent records closeout acceptance.
- AI PCM 總監／後台總控 Agent records automation stop approved.

If either is missing, continue only docs-only, mock-only, placeholder-only, contract-only, schema, checklist, handoff, policy, evidence, or report tightening.
