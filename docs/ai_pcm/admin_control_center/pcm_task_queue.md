# PCM Task Queue

## Purpose

This queue tracks safe docs-only AI PCM department tasks. It is not a production task runner, database queue, or automation backend.

| Task | Owner | Status | Next |
|---|---|---|---|
| Maintain AI PCM blackboard as department single source surface | AI PCM 總監／後台總控 Agent | `active` | Keep all department status inside `docs/ai_pcm/AI_PCM_BLACKBOARD.md` |
| Review contract evidence packet | AI PCM 總監／後台總控 Agent | `ready_for_supervisor_review` | Confirm placeholder / linked / verified boundaries |
| Review issue routing packet | AI PCM 總監／後台總控 Agent | `ready_for_supervisor_review` | Confirm suggestions are not legal rulings |
| Review party entry / LINE terminal packet | AI PCM 總監／後台總控 Agent | `ready_for_supervisor_review` | Confirm LINE is terminal only and not contract authority |
| Review pre-tender readiness packet | AI PCM 總監／後台總控 Agent | `ready_for_supervisor_review` | Confirm no formal tender launch |
| Review payment ledger placeholder packet | AI PCM 總監／後台總控 Agent | `ready_for_supervisor_review` | Confirm no real payment / escrow / listing fee implication |
| Track runtime capacity for remaining agent launches | Deputy Commander / AI PCM Supervisor | `pending_runtime_capacity` | Retry only when capacity is available; docs-only patrol continues |

## No-Idle Rule

If any queue item cannot advance, the owner must document the blocker, route a Permission / Blocker Packet to the supervisor, and continue the next safe docs-only task.

