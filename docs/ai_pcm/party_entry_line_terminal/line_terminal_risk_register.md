# LINE Terminal Risk Register

## Purpose

This risk register maps recurring LINE terminal risks to safe handling, risk flags, and escalation routes. It is docs-only guidance for `pcm-party-entry-line-terminal-patrol`.

## Risk Register

| Risk ID | Scenario | Risk Flags | Safe Handling | Escalation |
|---|---|---|---|---|
| `LTR-001` | Party asks to approve or change contract through LINE. | `contract_change_attempt`, `oral_message_over_contract_risk` | Create pending platform review record with `formal_record_effect: none`. | AI PCM 總監／後台總控 Agent if formal change is requested. |
| `LTR-002` | Party asks to create change order through LINE reply. | `change_order_attempt` | Route to formal platform workflow; LINE quick reply is not approval. | AI PCM 總監／後台總控 Agent. |
| `LTR-003` | Contractor asks for payment or says work is complete in LINE. | `payment_trigger_attempt` | Record as payment-related question only; no payment instruction. | AI PCM 總監／後台總控 Agent; payment placeholder agent if needed. |
| `LTR-004` | Party submits photo/file as proof. | `attachment_not_verified` | Keep attachment metadata unverified; route to evidence review. | 合約資料與證據管理 Agent if evidence review is needed. |
| `LTR-005` | LINE message conflicts with platform record. | `conflict_with_platform_record` | Platform record controls; create conflict note. | AI PCM 總監／後台總控 Agent. |
| `LTR-006` | Party claims LINE chat should override contract. | `oral_message_over_contract_risk` | Reject terminal-only authority; route to platform review. | AI PCM 總監／後台總控 Agent. |
| `LTR-007` | Identity or authorization is asserted via LINE name. | `identity_not_verified` | Treat as display-name only; no formal identity verification. | AI PCM 總監／後台總控 Agent for authorization boundary. |
| `LTR-008` | Production LINE webhook / API is requested. | `production_line_api_request` | Do not implement; create permission packet. | AI PCM 總監／後台總控 Agent. |
| `LTR-009` | DB / Supabase write is requested for terminal records. | `production_db_request` | Keep docs-only schema; no DB connection. | AI PCM 總監／後台總控 Agent. |
| `LTR-010` | Production AI reply automation is requested. | `production_ai_api_request` | Keep AI response as draft concept only; no production AI API. | AI PCM 總監／後台總控 Agent. |

## Default Safe Response

For any risk above:

1. Keep LINE terminal-only.
2. Record or model the input as pending review only.
3. Keep `formal_record_effect: none`.
4. Do not connect production services.
5. Route permission / boundary issues through `line_terminal_permission_packet_template.md`.
6. Continue other safe docs-only work.

## Patrol Check

Every patrol should confirm:

- no risk is marked as formally resolved by LINE alone
- no risk creates contract, payment, identity, legal, tender, or quote effect
- all high-risk categories have an escalation route to AI PCM 總監／後台總控 Agent
