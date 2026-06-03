# Party Entry LINE Terminal Supervisor Handoff

## Handoff Target

- To: AI PCM 總監／後台總控 Agent
- From: 甲乙方入口與 LINE 終端 Agent
- Workstream: `pcm/party-entry-line-terminal`
- Status: `READY_FOR_SUPERVISOR_REVIEW`
- Automation: `pcm-party-entry-line-terminal-patrol / every 15 minutes`
- Shared truth boundary: GitHub PR #77 / latest PR head SHA
- Local workspace: `Z:\08-Jacky\laibe_pcm` as execution state only

## Review Ask

Please review and either accept closeout or request minimal fixes for:

- LINE terminal boundary
- owner entry contract
- contractor entry contract
- LINE sync contract
- message record schema
- question submission flow
- role permission draft
- forbidden scope policy
- validation checklist
- permission / boundary packet template
- evidence packet
- closeout checklist
- final completion report

## Acceptance Criteria

Closeout is safe only if AI PCM 總監／後台總控 Agent confirms:

- LINE is notice / input terminal only.
- Platform backend remains the official record.
- LINE records keep `formal_record_effect: none`.
- LINE cannot modify contracts.
- LINE cannot create change orders.
- LINE cannot trigger payment.
- LINE cannot verify identity.
- LINE cannot override platform records.
- Permission and boundary issues route to AI PCM 總監／後台總控 Agent.
- No direct user permission requests are made.
- GitHub PR / commit SHA remains shared truth.

## Stop Conditions

The heartbeat must continue until both are explicitly recorded by AI PCM 總監／後台總控 Agent:

- closeout acceptance: approved
- automation stop: approved

## Open Permission Items

| Item | Requested Decision | Current Safe Handling |
|---|---|---|
| Production/external scheduler beyond Codex heartbeat | Approve, reject, or keep blocked outside docs-only | Keep Codex heartbeat / documented-only; no production runtime |
| Final role names and authorization boundaries | Confirm before product implementation | Keep role model draft-only; no formal identity verification |
| PR / commit handling for local docs changes | Decide how to represent follow-up local docs changes in GitHub shared truth | Keep local files as execution state and route PR / commit handling through supervisor |

## Forbidden Scope Confirmation

- Production LINE API: not touched
- Real webhook: not touched
- DB / Supabase: not touched
- Payment / escrow / listing fee: not touched
- Production AI API: not touched
- Production runtime: not touched
- Formal identity verification: not created
- Formal legal decision: not created
- Formal quote / price: not created

## Next Patrol Action

Continue validating files, JSON examples, forbidden scope, source-of-truth wording, permission routing, and closeout state. Make only docs-only or placeholder-only fixes until supervisor closeout acceptance and automation stop approval.
