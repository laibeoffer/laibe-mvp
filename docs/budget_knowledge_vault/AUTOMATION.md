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
