# Workflow Blackboard Update Contract

## Purpose

Define how Budget Workflow Orchestrator placeholder runs report status to `docs/WORKSTREAM_BLACKBOARD.md`.

This contract is documentation-only. It does not create automation.

## Required Short Format

Use this format for blackboard status updates:

```md
- Workstream: workflow/budget-orchestrator
- Branch / Repo: workflow/budget-orchestrator / laibeoffer/laibe-mvp
- Status:
- Changed:
- Files:
- PR / Commit:
- Blocked:
- Next:
- Need Commander:
- Need Reviewer:
```

## Status Values

Allowed workflow status values:

- `ACTIVE_INITIALIZATION`
- `N8N_PLACEHOLDER_ONLY`
- `DRY_RUN_SPEC_READY`
- `TRIGGER_PLACEHOLDER_READY`
- `NODE_MAP_READY`
- `REVIEW_GATE_READY`
- `BLACKBOARD_CONTRACT_READY`
- `KNOWLEDGE_FEEDBACK_CONTRACT_READY`
- `BLOCKED_BY_FORBIDDEN_RUNTIME_SCOPE`
- `BLOCKED_BY_REVIEW_GATE`
- `BLOCKED_BY_COMMANDER_DECISION`

## Required Evidence Fields

Every completion update should include:

- changed repo-relative files
- branch name
- commit SHA if available
- PR URL if available
- whether n8n runtime is enabled
- whether webhook runtime is enabled
- whether API key is included
- whether DB, payment, AI API, renderer, or formal output was touched
- whether placeholder-only policy remains true

## Failure Update

Use this form if a placeholder run is blocked:

```md
- Workstream: workflow/budget-orchestrator
- Branch / Repo: workflow/budget-orchestrator / laibeoffer/laibe-mvp
- Status: BLOCKED_BY_FORBIDDEN_RUNTIME_SCOPE
- Changed: placeholder docs only
- Files:
- PR / Commit:
- Blocked: real n8n/webhook/API/DB/payment/AI/formal output requested
- Next: wait for LAIBE_PATROL_INTEGRATION_OFFICER or Commander decision
- Need Commander: Yes if production runtime is requested
- Need Reviewer: Yes if production trigger, API, DB, payment, or formal output is being prepared
```

## No-Idle Update Rule

Before initialization is complete, the agent must not report:

`本 workstream 本輪無新指派`

If no response is received within 20 minutes after self-introduction, the next defined initialization task must proceed automatically.

After initialization is complete, the no-new-assignment report is allowed only when:

- no open Issue is assigned to this workstream
- no open PR is assigned to this workstream
- no Integration Officer instruction exists
- no initialization task remains

## Forbidden Blackboard Claims

Do not claim:

- n8n enabled
- webhook enabled
- production automation enabled
- API key configured
- DB connected
- payment connected
- AI API connected
- renderer activated
- formal budget generated
- formal Excel/PDF generated
