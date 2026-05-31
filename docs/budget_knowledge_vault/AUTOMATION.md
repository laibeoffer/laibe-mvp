# Budget Knowledge Vault Automation

automation_name: budget-knowledge-vault-patrol
frequency: every 12 minutes
managed_by: LAIBE_REVIEWER_INTEGRATION_OFFICER
workstream: knowledge/budget-vault
status: active heartbeat created in Codex app

## Scope

- `docs/WORKSTREAM_BLACKBOARD.md` knowledge/budget-vault section
- assigned GitHub Issue for this agent, if present
- assigned GitHub PR for this agent, if present
- four core budget agent completion reports / final packets
- Integration Officer instructions

## No Change Response

本 workstream 本輪無新指派。

## No Change Response Gate

The no-change response may be used only after initialization is complete and all of the following are true:

- no open Issue assigned to this agent
- no open PR assigned to this agent that needs action
- no blackboard task assigned to `knowledge/budget-vault`
- no Integration Officer instruction needs action
- no known todo remains in this vault
- no initialization task remains incomplete

If any item above is false, the patrol must report the active work item instead of using the no-change response.

## No-Idle Patrol Rule

When no new instruction is present, the patrol must autonomously advance the first safe item in this order:

1. Refresh the active PR / Issue status snapshot for `knowledge/budget-vault`.
2. Update decision logs with explicit decision signals or explicit non-decision signals.
3. Update the integration gap register when a support gap is found or resolved.
4. Update the readiness matrix patrol timestamp and evidence status when scoped evidence changes.
5. Refine proposal registers only as non-binding proposals, never as formal rules or prices.
6. Refine Requirement Form / Plan Puzzle SVG context windows only as trace metadata, never as estimate authority.

A patrol must not wait for a new instruction when a safe documentation backlog item exists.

## Active Work Queue

| Item | Status | Allowed Vault Action | Forbidden Action |
|---|---|---|---|
| PR #31 boundary PR | Open / review signal pending | Track review usage-limit and Commander conditional input as non-decision signals. | Do not merge, close, approve, reject, or dispatch. |
| PR #32 initialization PR | Open / mergeable | Keep PR current, keep support docs accurate, track comments and Integration Officer instructions. | Do not merge without authority and do not change implementation files. |
| Four core evidence summaries | Evidence pending for unresolved core lines | Update summaries only from scoped reports, final packets, PR comments, or Integration Officer instructions. | Do not patrol unrelated project areas or replace core agent completion packets. |
| Requirement / SVG context windows | Placeholder until linked / verified evidence exists | Maintain status labels and trace fields. | Do not convert requirements, SVG, or candidate quantities into formal price, estimate line, renderer input, or quote. |

## Forbidden

- Do not patrol the whole project.
- Do not manage other agents.
- Do not start the integration harness.
- Do not modify implementation code.
- Do not produce formal prices.
- Do not change `PricingRule`.
- Do not change `MaterialSpec`.
- Do not change `LaborRule`.
- Do not create `BudgetEstimateLine`.
- Do not create `BudgetOutputSnapshot`.
- Do not create customer quotes.

## Runtime Note

The Codex app heartbeat automation was created for this thread with a 12-minute cadence. This Markdown file records the same patrol contract for repo visibility.
