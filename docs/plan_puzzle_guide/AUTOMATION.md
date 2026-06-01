# Plan Puzzle Guide Automation

Automation name: `plan-puzzle-guide-agent-patrol`

Managed By: `EXECUTION_OFFICER`

Schedule: every 15 minutes

GitHub operating path acknowledged: Yes

## Patrol Scope

The patrol may:

- Continue initialization until the contract and runtime status are complete.
- Check GitHub blackboard, GitHub handoff, PR state, and plan-puzzle-guide docs.
- Move to the next safe initialization task after the 20-minute no-response window.
- Keep output status within `CONTRACT_ONLY`, `MOCK_READY`, `WEB_RUNTIME_PENDING`, `WEB_RUNTIME_VERIFIED`, or `BLOCKED`.

The patrol must not:

- Modify Plancraft core.
- Modify Budget Engine, Renderer, MethodSpec, Raw Candidate, or Output Documents.
- Touch payment, escrow, listing fee, DB, auth, webhook, `.env`, secrets, or real AI API.
- Add packages, frameworks, `package.json`, `node_modules`, or dependency setup.
- Treat mock facts, SVG, zone area, or wall length as formal quantity.
- Report "no new assignment" before initialization is complete.

## 20-Minute Auto-Progress Rule

If the blackboard self-introduction or progress report receives no response within 20 minutes, the agent should continue the next safe, same-scope initialization task:

1. Fill missing contract documents.
2. Clarify placeholder output fields.
3. Refresh GitHub and read-only runtime evidence.
4. Mark `WEB_RUNTIME_PENDING` when runtime modification is unsafe or unverified.
5. Update GitHub-tracked handoff or PR status with concise status.

## Local Automation Note

A local heartbeat may exist for patrol execution, but local automation state is not the source of truth for delivery. Delivery evidence must be published through GitHub branch / PR.
