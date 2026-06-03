# Party Entry LINE Terminal Closeout Checklist

## Closeout Authority

Only AI PCM 總監／後台總控 Agent can accept closeout for this workstream.

Automation can stop only after AI PCM 總監／後台總控 Agent explicitly declares:

- closeout acceptance: approved
- automation stop: approved

## Required Evidence

| Evidence | Status |
|---|---|
| Blackboard self-introduction | complete |
| `AUTOMATION.md` | complete |
| Main agent document | complete |
| Owner entry contract | complete |
| Contractor entry contract | complete |
| LINE terminal sync contract | complete |
| LINE message record schema | complete |
| Party question submission flow | complete |
| Role permission draft | complete |
| Forbidden scope policy | complete |
| Evidence packet | complete |
| JSON examples | complete |
| Initialization progress report | complete |
| Final completion report | complete |

## Acceptance Checks

- LINE is terminal only.
- Platform backend remains the official record.
- `formal_record_effect` remains `none` for LINE terminal records.
- LINE cannot change contracts.
- LINE cannot create change orders.
- LINE cannot trigger payment.
- LINE cannot override platform records.
- LINE cannot elevate oral messages above contract records.
- Attachments remain unverified until evidence review.
- Questions route to platform review, not automatic decisions.
- Permission requests route to AI PCM 總監／後台總控 Agent.
- No user-direct permission requests are made.

## Forbidden Runtime Checks

- production LINE API touched: no
- real LINE webhook touched: no
- DB / Supabase touched: no
- payment / escrow / listing fee touched: no
- production AI API touched: no
- production runtime touched: no
- formal identity verification created: no
- formal legal decision created: no
- formal quote / price created: no

## Source Of Truth Check

- GitHub main / PR / commit SHA remains authoritative.
- GitHub draft PR #77 is the current shared-truth review boundary for this docs-only setup.
- Local workspace remains LOCAL_STATE only.
- Earlier local Git metadata uncertainty was reconciled by Deputy Commander for docs-only initialization.
- Local documents remain execution workspace state until represented in GitHub PR / commit SHA.

## Next Safe Action Before Acceptance

Continue 15-minute patrol and only perform docs-only, mock-only, placeholder-only, contract-only, schema, checklist, handoff, policy, evidence, or report tightening.
